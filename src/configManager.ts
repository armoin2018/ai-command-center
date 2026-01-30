import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';
import { AICommandCenterConfig } from './types/config';
import { ConfigValidator } from './config/configValidator';
import { ConfigPresets } from './config/configPresets';
import { ConfigMigration } from './config/configMigration';
import { ConfigHierarchy } from './config/configHierarchy';

/**
 * Configuration manager for AI Command Center.
 * Implements 4-level configuration cascade:
 * 1. .my/{repo}/config.json (highest priority)
 * 2. .project/config.json
 * 3. .github/{repo}/config.json
 * 4. Default aicc.json (fallback)
 * 5. VS Code workspace settings (final override)
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private config: AICommandCenterConfig | null = null;
    private defaultConfigPath: string;
    private logger: Logger;
    private validator: ConfigValidator;
    private presets: ConfigPresets;
    private migration: ConfigMigration;
    private hierarchy: ConfigHierarchy | null = null;
    // @ts-ignore - stored for future use
    private _extensionPath: string;

    private constructor(extensionPath: string, logger: Logger) {
        this.logger = logger;
        this._extensionPath = extensionPath;
        // Try multiple locations for config file (handles both dev and packaged scenarios)
        const possiblePaths = [
            path.join(extensionPath, 'out', 'defaults', 'aicc.json'), // Production (compiled)
            path.join(extensionPath, 'src', 'defaults', 'aicc.json'), // Development
            path.join(extensionPath, 'defaults', 'aicc.json')          // Alternative packaging
        ];
        
        this.defaultConfigPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
        
        // Initialize configuration utilities
        this.validator = new ConfigValidator(logger);
        this.presets = new ConfigPresets(logger);
        this.migration = new ConfigMigration(logger);
    }

    /**
     * Get or create the ConfigManager singleton instance.
     * 
     * @param extensionPath - Extension context path (required for first call)
     * @param logger - Logger instance (required for first call)
     * @returns ConfigManager instance
     */
    public static getInstance(extensionPath?: string, logger?: Logger): ConfigManager {
        if (!ConfigManager.instance) {
            if (!extensionPath || !logger) {
                throw new Error('Extension path and logger required for first initialization');
            }
            ConfigManager.instance = new ConfigManager(extensionPath, logger);
        }
        return ConfigManager.instance;
    }

    /**
     * Get configuration with 4-level hierarchy cascade:
     * 1. Load from .my/{repo}/config.json (user/workspace)
     * 2. Merge with .project/config.json (project)
     * 3. Merge with .github/{repo}/config.json (repository)
     * 5. Merge with defaults from aicc.json (fallback)
     * 6. Override with VS Code workspace settings (final)
     */
    public getConfig(): AICommandCenterConfig {
        if (this.config) {
            return this.config;
        }

        // Initialize hierarchy if workspace is available
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            
            if (!this.hierarchy) {
                this.hierarchy = new ConfigHierarchy(workspacePath, this.logger);
            }

            // Check for old .my/aicc.json and migrate
            const oldConfigPath = path.join(workspacePath, '.my', 'aicc.json');
            if (fs.existsSync(oldConfigPath)) {
                this.hierarchy.migrateOldConfig(oldConfigPath).catch(error => {
                    this.logger.error('Failed to migrate old configuration', {
                        component: 'ConfigManager',
                        error: error instanceof Error ? error.message : String(error)
                    });
                });
            }
        }

        // Load configuration from hierarchy
        let hierarchyConfig = {};
        if (this.hierarchy) {
            try {
                // Load synchronously for now (can be optimized to async later)
                hierarchyConfig = this.loadHierarchySync();
            } catch (error) {
                this.logger.warn('Failed to load configuration hierarchy', {
                    component: 'ConfigManager',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Load defaults from YAML
        const defaults = this.loadDefaultConfig();
        
        // Merge: defaults → hierarchy → workspace settings
        let merged = { ...defaults, ...hierarchyConfig };
        merged = this.mergeWithWorkspaceSettings(merged);
        
        // Validate configuration
        const validationResult = this.validator.validate(merged);
        if (!validationResult.isValid) {
            this.logger.warn('Configuration validation failed', {
                component: 'ConfigManager',
                errors: validationResult.errors,
                warnings: validationResult.warnings
            });
        }
        
        this.config = merged;
        this.logger.info('Configuration loaded with hierarchy', {
            component: 'ConfigManager',
            planPath: merged.planning.planPath,
            logLevel: merged.logging.level,
            healthScore: this.validator.getHealthScore(merged),
            hierarchySources: this.hierarchy ? this.hierarchy.getSources().filter(s => s.loaded).map(s => s.level) : []
        });
        
        return this.config;
    }

    /**
     * Load configuration hierarchy synchronously
     */
    private loadHierarchySync(): any {
        if (!this.hierarchy) {
            return {};
        }

        // Use sync version for compatibility
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {};
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const repoName = path.basename(workspacePath);

        // Define config paths in precedence order (highest to lowest)
        const configPaths = [
            path.join(workspacePath, '.my', repoName, 'config.json'),
            path.join(workspacePath, '.project', 'config.json'),
            path.join(workspacePath, '.github', repoName, 'config.json'),
            path.join(workspacePath, '.github', 'ai-ley', 'shared', 'global.json')
        ];

        let result: any = {};

        // Load and merge from lowest to highest priority
        for (const configPath of configPaths.reverse()) {
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const config = JSON.parse(content);
                    result = this.deepMerge(result, config);
                    
                    this.logger.debug('Loaded config file', {
                        component: 'ConfigManager',
                        path: configPath
                    });
                } catch (error) {
                    this.logger.warn('Failed to load config file', {
                        component: 'ConfigManager',
                        path: configPath,
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }

        return result;
    }

    /**
     * Deep merge two objects
     */
    private deepMerge(target: any, source: any): any {
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            return source;
        }

        const result = { ...target };

        for (const key in source) {
            if (!(key in result)) {
                result[key] = source[key];
            } else if (typeof source[key] === 'object' && !Array.isArray(source[key]) && 
                       typeof result[key] === 'object' && !Array.isArray(result[key])) {
                result[key] = this.deepMerge(result[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }

        return result;
    }

    /**
     * Reload configuration (useful after settings changes).
     */
    public reload(): void {
        this.config = null;
        this.getConfig();
        this.logger.info('Configuration reloaded', { component: 'ConfigManager' });
    }

    /**
     * Get the primary configuration file path for file watching.
     * Returns the first existing config path in the hierarchy order.
     */
    public getConfigPath(): string {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            const configPaths = [
                path.join(workspacePath, '.my', 'aicc', 'config.json'),
                path.join(workspacePath, '.project', 'config.json'),
                path.join(workspacePath, '.github', 'aicc', 'config.json'),
                path.join(workspacePath, '.ai-ley', 'shared', 'global.json')
            ];
            
            // Return first existing path, or default to .project/config.json
            return configPaths.find(p => fs.existsSync(p)) || configPaths[1];
        }
        
        return this.defaultConfigPath;
    }

    /**
     * Validate current configuration.
     */
    public validate(): { isValid: boolean; errors: string[]; warnings: string[] } {
        const config = this.getConfig();
        return this.validator.validate(config);
    }

    /**
     * Get configuration health score (0-100).
     */
    public getHealthScore(): number {
        const config = this.getConfig();
        return this.validator.getHealthScore(config);
    }

    /**
     * Get configuration recommendations.
     */
    public getRecommendations(): string[] {
        const config = this.getConfig();
        return this.validator.getRecommendations(config);
    }

    /**
     * Apply a preset configuration.
     */
    public async applyPreset(presetName: 'minimal' | 'development' | 'production' | 'enterprise'): Promise<void> {
        const preset = this.presets.getPreset(presetName);
        
        // Validate preset
        const validationResult = this.validator.validate(preset);
        if (!validationResult.isValid) {
            throw new Error(`Invalid preset configuration: ${validationResult.errors.join(', ')}`);
        }
        
        // Save to workspace settings
        await this.saveToWorkspaceSettings(preset);
        
        // Reload
        this.reload();
        
        this.logger.info('Preset applied', {
            component: 'ConfigManager',
            preset: presetName
        });
    }

    /**
     * Save configuration to workspace settings.
     */
    private async saveToWorkspaceSettings(config: AICommandCenterConfig): Promise<void> {
        const workspaceConfig = vscode.workspace.getConfiguration('aicc');
        
        await workspaceConfig.update('planPath', config.planning.planPath, vscode.ConfigurationTarget.Workspace);
        await workspaceConfig.update('autoSaveInterval', config.planning.autoSaveInterval, vscode.ConfigurationTarget.Workspace);
        await workspaceConfig.update('storyPointScale', config.planning.storyPointScale, vscode.ConfigurationTarget.Workspace);
        await workspaceConfig.update('sprintDurationWeeks', config.planning.sprintDurationWeeks, vscode.ConfigurationTarget.Workspace);
        
        await workspaceConfig.update('logLevel', config.logging.level, vscode.ConfigurationTarget.Workspace);
        await workspaceConfig.update('fileLoggingEnabled', config.logging.fileLoggingEnabled, vscode.ConfigurationTarget.Workspace);
        await workspaceConfig.update('retentionDays', config.logging.retentionDays, vscode.ConfigurationTarget.Workspace);
        await workspaceConfig.update('maxFileSizeMB', config.logging.maxFileSizeMB, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Save current configuration to file.
     */
    public async saveConfiguration(filePath: string): Promise<void> {
        const config = this.getConfig();
        const jsonContent = JSON.stringify(config, null, 2);
        
        await fs.promises.writeFile(filePath, jsonContent, 'utf-8');
        
        this.logger.info('Configuration saved', {
            component: 'ConfigManager',
            path: filePath
        });
    }

    /**
     * Check if configuration migration is needed.
     */
    public async needsMigration(configPath: string): Promise<boolean> {
        return this.migration.needsMigration(configPath);
    }

    /**
     * Migrate configuration to latest version.
     */
    public async migrateConfiguration(configPath: string, createBackup: boolean = true): Promise<void> {
        await this.migration.migrate(configPath, createBackup);
        this.reload();
    }

    /**
     * Get configuration version history.
     */
    public getVersionHistory() {
        return this.migration.getVersionHistory();
    }

    /**
     * Get a specific configuration value by path.
     * Example: get('planning.planPath')
     */
    public get<T>(path: string): T | undefined {
        const config = this.getConfig();
        const parts = path.split('.');
        let value: any = config;
        
        for (const part of parts) {
            if (value && typeof value === 'object' && part in value) {
                value = value[part];
            } else {
                return undefined;
            }
        }
        
        return value as T;
    }

    /**
     * Get configuration hierarchy diagnostics
     */
    public getHierarchyDiagnostics() {
        if (!this.hierarchy) {
            return null;
        }
        return this.hierarchy.getDiagnostics();
    }

    /**
     * Get configuration sources
     */
    public getConfigSources() {
        if (!this.hierarchy) {
            return [];
        }
        return this.hierarchy.getSources();
    }

    /**
     * Get configuration overrides
     */
    public getConfigOverrides() {
        if (!this.hierarchy) {
            return [];
        }
        return this.hierarchy.getOverrides();
    }

    /**
     * Save configuration to a specific hierarchy level
     */
    public async saveToLevel(level: 'my' | 'project' | 'github' | 'global', config: Partial<AICommandCenterConfig>): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        if (!this.hierarchy) {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            this.hierarchy = new ConfigHierarchy(workspacePath, this.logger);
        }

        await this.hierarchy.saveToLevel(level, config);
        this.reload();
    }

    /**
     * Initialize configuration hierarchy in workspace
     */
    public async initializeHierarchy(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        if (!this.hierarchy) {
            const workspacePath = workspaceFolders[0].uri.fsPath;
            this.hierarchy = new ConfigHierarchy(workspacePath, this.logger);
        }

        await this.hierarchy.initializeHierarchy();
        this.reload();
    }

    private loadDefaultConfig(): AICommandCenterConfig {
        try {
            if (!fs.existsSync(this.defaultConfigPath)) {
                this.logger.warn('Default config file not found, using fallback', {
                    component: 'ConfigManager',
                    path: this.defaultConfigPath
                });
                return this.getFallbackConfig();
            }

            const jsonContent = fs.readFileSync(this.defaultConfigPath, 'utf8');
            const config = JSON.parse(jsonContent) as AICommandCenterConfig;
            
            this.logger.debug('Default configuration loaded', {
                component: 'ConfigManager',
                path: this.defaultConfigPath
            });
            
            return config;
        } catch (error) {
            this.logger.error('Failed to load default configuration', {
                component: 'ConfigManager',
                error: error instanceof Error ? error.message : String(error),
                path: this.defaultConfigPath
            });
            
            // Return hardcoded fallback
            return this.getFallbackConfig();
        }
    }

    private mergeWithWorkspaceSettings(defaults: AICommandCenterConfig): AICommandCenterConfig {
        const workspaceConfig = vscode.workspace.getConfiguration('aicc');
        
        // Deep merge: workspace settings override defaults
        return {
            planning: {
                planPath: workspaceConfig.get('planPath', defaults.planning.planPath),
                autoSaveInterval: workspaceConfig.get('autoSaveInterval', defaults.planning.autoSaveInterval),
                storyPointScale: workspaceConfig.get('storyPointScale', defaults.planning.storyPointScale),
                sprintDurationWeeks: workspaceConfig.get('sprintDurationWeeks', defaults.planning.sprintDurationWeeks)
            },
            logging: {
                level: workspaceConfig.get('logLevel', defaults.logging.level),
                fileLoggingEnabled: workspaceConfig.get('fileLoggingEnabled', defaults.logging.fileLoggingEnabled),
                retentionDays: workspaceConfig.get('retentionDays', defaults.logging.retentionDays),
                maxFileSizeMB: workspaceConfig.get('maxFileSizeMB', defaults.logging.maxFileSizeMB)
            },
            integrations: {
                jira: {
                    enabled: workspaceConfig.get('jira.enabled', defaults.integrations.jira.enabled),
                    baseUrl: workspaceConfig.get('jira.baseUrl', defaults.integrations.jira.baseUrl),
                    email: workspaceConfig.get('jira.email', defaults.integrations.jira.email),
                    apiToken: workspaceConfig.get('jira.apiToken', defaults.integrations.jira.apiToken),
                    projectKey: workspaceConfig.get('jira.projectKey', defaults.integrations.jira.projectKey),
                    syncStrategy: workspaceConfig.get('jira.syncStrategy', defaults.integrations.jira.syncStrategy),
                    conflictResolution: workspaceConfig.get('jira.conflictResolution', defaults.integrations.jira.conflictResolution),
                    autoSync: workspaceConfig.get('jira.autoSync', defaults.integrations.jira.autoSync),
                    syncInterval: workspaceConfig.get('jira.syncInterval', defaults.integrations.jira.syncInterval),
                    webhookEnabled: workspaceConfig.get('jira.webhookEnabled', defaults.integrations.jira.webhookEnabled),
                    webhookSecret: workspaceConfig.get('jira.webhookSecret', defaults.integrations.jira.webhookSecret)
                },
                confluence: defaults.integrations.confluence,
                gamma: defaults.integrations.gamma
            },
            mcp: defaults.mcp, // Epic 5 will handle MCP settings
            ui: defaults.ui,
            performance: defaults.performance
        };
    }

    private getFallbackConfig(): AICommandCenterConfig {
        // Hardcoded fallback if JSON fails to load
        return {
            planning: {
                planPath: '.project/plan',
                autoSaveInterval: 30,
                storyPointScale: 'fibonacci',
                sprintDurationWeeks: 2
            },
            logging: {
                level: 'info',
                fileLoggingEnabled: true,
                retentionDays: 7,
                maxFileSizeMB: 5
            },
            integrations: {
                jira: {
                    enabled: false,
                    baseUrl: '',
                    email: '',
                    apiToken: '',
                    projectKey: '',
                    syncStrategy: 'bidirectional' as const,
                    conflictResolution: 'manual' as const,
                    autoSync: false,
                    syncInterval: 15,
                    webhookEnabled: false
                },
                confluence: { enabled: false, baseUrl: '' },
                gamma: { enabled: false, apiKey: '' }
            },
            mcp: {
                enabled: true,
                transport: 'http' as const,
                port: 3000,
                logging: {
                    enabled: true,
                    level: 'info' as const
                },
                tools: {
                    enabled: true,
                    timeout: 30000
                },
                resources: {
                    enabled: true,
                    cacheSize: 100
                },
                prompts: {
                    enabled: true
                }
            },
            ui: {
                showWelcomeMessage: true,
                theme: 'auto',
                confirmDelete: true
            },
            performance: {
                activationTimeoutMs: 5000,
                apiTimeoutMs: 30000,
                trackPerformance: true
            }
        };
    }
}
