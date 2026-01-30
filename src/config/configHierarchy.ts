/**
 * Configuration Hierarchy Manager
 * 
 * Implements 4-level configuration cascade with deep merge:
 * 1. .my/{repo}/config.json (highest priority - user/workspace specific)
 * 2. .project/config.json (project-specific defaults)
 * 3. .github/{repo}/config.json (repository team defaults)
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

export interface ConfigSource {
    level: 'my' | 'project' | 'github' | 'global';
    path: string;
    exists: boolean;
    loaded: boolean;
    data: any;
}

export interface ConfigOverride {
    path: string;
    value: any;
    source: ConfigSource['level'];
}

export class ConfigHierarchy {
    private logger: Logger;
    private workspacePath: string;
    private repoName: string;
    private sources: Map<string, ConfigSource> = new Map();
    private overrides: ConfigOverride[] = [];

    constructor(workspacePath: string, logger: Logger) {
        this.logger = logger;
        this.workspacePath = workspacePath;
        this.repoName = this.extractRepoName(workspacePath);
    }

    /**
     * Load configuration from all 4 levels and merge with precedence
     */
    async loadHierarchy(): Promise<any> {
        // Define config paths in precedence order (highest to lowest)
        const configPaths = [
            {
                level: 'my' as const,
                path: path.join(this.workspacePath, '.my', this.repoName, 'config.json')
            },
            {
                level: 'project' as const,
                path: path.join(this.workspacePath, '.project', 'config.json')
            },
            {
                level: 'github' as const,
                path: path.join(this.workspacePath, '.github', this.repoName, 'config.json')
            },
            {
                level: 'global' as const,
                path: path.join(this.workspacePath, '.github', 'ai-ley', 'shared', 'global.json')
            }
        ];

        // Load all config files
        const configs: Array<{ level: ConfigSource['level']; data: any }> = [];
        
        for (const { level, path: configPath } of configPaths) {
            const source: ConfigSource = {
                level,
                path: configPath,
                exists: fs.existsSync(configPath),
                loaded: false,
                data: null
            };

            if (source.exists) {
                try {
                    const content = await fs.promises.readFile(configPath, 'utf-8');
                    source.data = JSON.parse(content);
                    source.loaded = true;
                    configs.push({ level, data: source.data });
                    
                    this.logger.debug(`Loaded config from ${level} level`, {
                        component: 'ConfigHierarchy',
                        path: configPath
                    });
                } catch (error) {
                    this.logger.warn(`Failed to load config from ${level} level`, {
                        component: 'ConfigHierarchy',
                        path: configPath,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }

            this.sources.set(level, source);
        }

        // Merge configs from lowest to highest priority
        // Start with global (lowest), then github, then project, then my (highest)
        const merged = this.deepMerge(
            configs.reverse() // Reverse to go from global -> my
        );

        this.logger.info('Configuration hierarchy loaded', {
            component: 'ConfigHierarchy',
            levels: configs.map(c => c.level),
            overrideCount: this.overrides.length
        });

        return merged;
    }

    /**
     * Deep merge configuration objects with override tracking
     */
    private deepMerge(configs: Array<{ level: ConfigSource['level']; data: any }>): any {
        if (configs.length === 0) {
            return {};
        }

        let result = {};
        
        for (const { level, data } of configs) {
            if (!data) continue;
            result = this.mergeObjects(result, data, level, '');
        }

        return result;
    }

    /**
     * Recursively merge two objects, tracking overrides
     */
    private mergeObjects(target: any, source: any, sourceLevel: ConfigSource['level'], currentPath: string): any {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            // Track override
            if (currentPath) {
                this.overrides.push({
                    path: currentPath,
                    value: source,
                    source: sourceLevel
                });
            }
            return source;
        }

        const result = { ...target };

        for (const key in source) {
            const newPath = currentPath ? `${currentPath}.${key}` : key;
            
            if (!(key in result)) {
                // New key from source
                result[key] = source[key];
                this.trackOverride(newPath, source[key], sourceLevel);
            } else if (typeof source[key] === 'object' && !Array.isArray(source[key]) && 
                       typeof result[key] === 'object' && !Array.isArray(result[key])) {
                // Both are objects, merge recursively
                result[key] = this.mergeObjects(result[key], source[key], sourceLevel, newPath);
            } else {
                // Override with source value
                result[key] = source[key];
                this.trackOverride(newPath, source[key], sourceLevel);
            }
        }

        return result;
    }

    /**
     * Track a configuration override
     */
    private trackOverride(path: string, value: any, source: ConfigSource['level']): void {
        // Remove any existing override for this path
        this.overrides = this.overrides.filter(o => o.path !== path);
        
        // Add new override
        this.overrides.push({ path, value, source });
    }

    /**
     * Get all configuration sources
     */
    getSources(): ConfigSource[] {
        return Array.from(this.sources.values());
    }

    /**
     * Get configuration overrides
     */
    getOverrides(): ConfigOverride[] {
        return this.overrides;
    }

    /**
     * Get overrides for a specific path
     */
    getOverridesForPath(searchPath: string): ConfigOverride[] {
        return this.overrides.filter(o => 
            o.path === searchPath || o.path.startsWith(searchPath + '.')
        );
    }

    /**
     * Get the source level for a specific configuration path
     */
    getSourceLevel(configPath: string): ConfigSource['level'] | null {
        const override = this.overrides.find(o => o.path === configPath);
        return override ? override.source : null;
    }

    /**
     * Save configuration to a specific level
     */
    async saveToLevel(level: ConfigSource['level'], config: any): Promise<void> {
        const source = this.sources.get(level);
        if (!source) {
            throw new Error(`Unknown config level: ${level}`);
        }

        // Ensure directory exists
        const dir = path.dirname(source.path);
        await fs.promises.mkdir(dir, { recursive: true });

        // Write JSON
        const jsonContent = JSON.stringify(config, null, 2);
        await fs.promises.writeFile(source.path, jsonContent, 'utf-8');

        this.logger.info(`Configuration saved to ${level} level`, {
            component: 'ConfigHierarchy',
            path: source.path
        });

        // Update source
        source.exists = true;
        source.loaded = true;
        source.data = config;
    }

    /**
     * Migrate from old single .my/aicc.yaml to new hierarchy
     */
    async migrateOldConfig(oldConfigPath: string): Promise<boolean> {
        if (!fs.existsSync(oldConfigPath)) {
            return false;
        }

        try {
            this.logger.info('Migrating old configuration', {
                component: 'ConfigHierarchy',
                from: oldConfigPath
            });

            // Read old config
            const content = await fs.promises.readFile(oldConfigPath, 'utf-8');
            const oldConfig = JSON.parse(content);

            // Ensure sources are initialized before saving
            if (!this.sources.has('my')) {
                const newConfigPath = path.join(this.workspacePath, '.my', this.repoName, 'config.json');
                this.sources.set('my', {
                    level: 'my',
                    path: newConfigPath,
                    exists: false,
                    loaded: false,
                    data: null
                });
            }

            // Save to new location (.my/{repo}/config.yaml)
            await this.saveToLevel('my', oldConfig);

            // Rename old file as backup
            const backupPath = `${oldConfigPath}.backup.${Date.now()}`;
            await fs.promises.rename(oldConfigPath, backupPath);

            this.logger.info('Configuration migrated successfully', {
                component: 'ConfigHierarchy',
                backup: backupPath
            });

            return true;
        } catch (error) {
            this.logger.error('Configuration migration failed', {
                component: 'ConfigHierarchy',
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    /**
     * Get diagnostic information about the configuration hierarchy
     */
    getDiagnostics(): {
        workspace: string;
        repo: string;
        sources: Array<{
            level: string;
            path: string;
            exists: boolean;
            loaded: boolean;
        }>;
        overrideCount: number;
        topOverrides: Array<{ path: string; source: string }>;
    } {
        return {
            workspace: this.workspacePath,
            repo: this.repoName,
            sources: Array.from(this.sources.values()).map(s => ({
                level: s.level,
                path: s.path,
                exists: s.exists,
                loaded: s.loaded
            })),
            overrideCount: this.overrides.length,
            topOverrides: this.overrides.slice(0, 10).map(o => ({
                path: o.path,
                source: o.source
            }))
        };
    }

    /**
     * Extract repository name from workspace path
     */
    private extractRepoName(workspacePath: string): string {
        // Get the last segment of the path
        const segments = workspacePath.split(path.sep).filter(s => s.length > 0);
        return segments[segments.length - 1] || 'default';
    }

    /**
     * Check if configuration hierarchy is set up
     */
    isHierarchySetup(): boolean {
        // Consider setup if at least one config file exists
        return Array.from(this.sources.values()).some(s => s.exists);
    }

    /**
     * Create default configuration structure
     */
    async initializeHierarchy(): Promise<void> {
        // Create project-level config with defaults
        const projectConfig = {
            planning: {
                planPath: '.project/plan',
                autoSaveInterval: 30
            },
            logging: {
                level: 'info',
                fileLoggingEnabled: true
            }
        };

        await this.saveToLevel('project', projectConfig);

        this.logger.info('Configuration hierarchy initialized', {
            component: 'ConfigHierarchy'
        });
    }
}
