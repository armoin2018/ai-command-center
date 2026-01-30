/**
 * Configuration migration utilities for AI Command Center.
 * 
 * Handles version migrations, backward compatibility, and configuration
 * schema upgrades across different extension versions.
 */

import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import { Logger } from '../logger';
import { SystemError } from '../errors/customErrors';

/**
 * Configuration version history.
 */
interface ConfigVersion {
    version: string;
    description: string;
    releaseDate: string;
    breakingChanges: string[];
}

/**
 * Migration script interface.
 */
interface MigrationScript {
    fromVersion: string;
    toVersion: string;
    migrate: (config: any) => any;
    rollback?: (config: any) => any;
}

/**
 * Configuration migration manager.
 */
export class ConfigMigration {
    private logger: Logger;
    private versionHistory: ConfigVersion[];
    private migrations: Map<string, MigrationScript>;

    constructor(logger: Logger) {
        this.logger = logger;
        this.versionHistory = this.initializeVersionHistory();
        this.migrations = this.initializeMigrations();
    }

    /**
     * Initialize version history.
     */
    private initializeVersionHistory(): ConfigVersion[] {
        return [
            {
                version: '0.1.0',
                description: 'Initial configuration schema',
                releaseDate: '2024-01-01',
                breakingChanges: []
            },
            {
                version: '0.2.0',
                description: 'Added MCP configuration',
                releaseDate: '2024-02-01',
                breakingChanges: ['Moved server settings to mcp section']
            },
            {
                version: '0.3.0',
                description: 'Enhanced integration configuration',
                releaseDate: '2024-03-01',
                breakingChanges: ['Renamed integration fields for consistency']
            }
        ];
    }

    /**
     * Initialize migration scripts.
     */
    private initializeMigrations(): Map<string, MigrationScript> {
        const migrations = new Map<string, MigrationScript>();

        // Migration from 0.1.0 to 0.2.0
        migrations.set('0.1.0-0.2.0', {
            fromVersion: '0.1.0',
            toVersion: '0.2.0',
            migrate: (config: any) => {
                // Move server settings to mcp section
                if (config.server) {
                    config.mcp = {
                        enabled: config.server.enabled || false,
                        port: config.server.port || 3000,
                        protocol: config.server.protocol || 'stdio'
                    };
                    delete config.server;
                }
                return config;
            },
            rollback: (config: any) => {
                // Move mcp settings back to server section
                if (config.mcp) {
                    config.server = {
                        enabled: config.mcp.enabled,
                        port: config.mcp.port,
                        protocol: config.mcp.protocol
                    };
                    delete config.mcp;
                }
                return config;
            }
        });

        // Migration from 0.2.0 to 0.3.0
        migrations.set('0.2.0-0.3.0', {
            fromVersion: '0.2.0',
            toVersion: '0.3.0',
            migrate: (config: any) => {
                // Rename integration fields
                if (config.integrations?.jira?.username) {
                    config.integrations.jira.email = config.integrations.jira.username;
                    delete config.integrations.jira.username;
                }
                if (config.integrations?.jira?.serverUrl) {
                    config.integrations.jira.baseUrl = config.integrations.jira.serverUrl;
                    delete config.integrations.jira.serverUrl;
                }
                if (config.integrations?.confluence?.serverUrl) {
                    config.integrations.confluence.baseUrl = config.integrations.confluence.serverUrl;
                    delete config.integrations.confluence.serverUrl;
                }
                return config;
            }
        });

        // Migration from 0.3.0 to 1.0.0 (rename protocol to transport)
        migrations.set('0.3.0-1.0.0', {
            fromVersion: '0.3.0',
            toVersion: '1.0.0',
            migrate: (config: any) => {
                // Rename mcp.protocol to mcp.transport
                if (config.mcp?.protocol && !config.mcp?.transport) {
                    config.mcp.transport = config.mcp.protocol;
                    delete config.mcp.protocol;
                }
                // Add default MCP sub-configs if missing
                if (config.mcp) {
                    config.mcp.logging = config.mcp.logging || { enabled: true, level: 'info' };
                    config.mcp.tools = config.mcp.tools || { enabled: true, timeout: 30000 };
                    config.mcp.resources = config.mcp.resources || { enabled: true, cacheSize: 100 };
                    config.mcp.prompts = config.mcp.prompts || { enabled: true };
                }
                return config;
            },
            rollback: (config: any) => {
                // Rename mcp.transport back to mcp.protocol
                if (config.mcp?.transport && !config.mcp?.protocol) {
                    config.mcp.protocol = config.mcp.transport;
                    delete config.mcp.transport;
                }
                return config;
            }
        });

        return migrations;
    }

    /**
     * Check if migration is needed for a configuration.
     */
    async needsMigration(configPath: string): Promise<boolean> {
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content) as any;
            
            const configVersion = config.version || '0.1.0';
            const currentVersion = this.getCurrentVersion();

            return configVersion !== currentVersion;
        } catch (error) {
            this.logger.error('Failed to check migration status', { error, configPath });
            return false;
        }
    }

    /**
     * Migrate configuration to latest version.
     */
    async migrate(configPath: string, createBackup: boolean = true): Promise<void> {
        this.logger.info('Starting configuration migration', { configPath });

        try {
            // Read current configuration
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content) as any;
            
            const configVersion = config.version || '0.1.0';
            const currentVersion = this.getCurrentVersion();

            if (configVersion === currentVersion) {
                this.logger.info('Configuration already at latest version', { version: currentVersion });
                return;
            }

            // Create backup if requested
            if (createBackup) {
                await this.createBackup(configPath, configVersion);
            }

            // Apply migrations in sequence
            let migratedConfig = { ...config };
            const migrationPath = this.getMigrationPath(configVersion, currentVersion);

            for (const version of migrationPath) {
                const migration = this.migrations.get(version);
                if (migration) {
                    this.logger.info('Applying migration', { migration: version });
                    migratedConfig = migration.migrate(migratedConfig);
                }
            }

            // Update version
            migratedConfig.version = currentVersion;

            // Write migrated configuration
            const jsonContent = JSON.stringify(migratedConfig, null, 2);
            await fs.writeFile(configPath, jsonContent, 'utf-8');

            this.logger.info('Configuration migration completed', {
                from: configVersion,
                to: currentVersion
            });

            // Notify user
            vscode.window.showInformationMessage(
                `Configuration migrated from v${configVersion} to v${currentVersion}`
            );
        } catch (error) {
            this.logger.error('Configuration migration failed', { error, configPath });
            throw new SystemError('Configuration migration failed', error as Error);
        }
    }

    /**
     * Rollback configuration to previous version.
     */
    async rollback(configPath: string, targetVersion: string): Promise<void> {
        this.logger.info('Starting configuration rollback', { configPath, targetVersion });

        try {
            // Read current configuration
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content) as any;
            
            const configVersion = config.version || '0.1.0';

            if (configVersion === targetVersion) {
                this.logger.info('Configuration already at target version', { version: targetVersion });
                return;
            }

            // Apply rollback migrations
            let rolledBackConfig = { ...config };
            const migrationPath = this.getMigrationPath(configVersion, targetVersion);

            for (const version of migrationPath.reverse()) {
                const migration = this.migrations.get(version);
                if (migration?.rollback) {
                    this.logger.info('Applying rollback', { migration: version });
                    rolledBackConfig = migration.rollback(rolledBackConfig);
                }
            }

            // Update version
            rolledBackConfig.version = targetVersion;

            // Write rolled back configuration
            const jsonContent = JSON.stringify(rolledBackConfig, null, 2);
            await fs.writeFile(configPath, jsonContent, 'utf-8');

            this.logger.info('Configuration rollback completed', {
                from: configVersion,
                to: targetVersion
            });
        } catch (error) {
            this.logger.error('Configuration rollback failed', { error, configPath, targetVersion });
            throw new SystemError('Configuration rollback failed', error as Error);
        }
    }

    /**
     * Create backup of current configuration.
     */
    private async createBackup(configPath: string, version: string): Promise<void> {
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupPath = `${configPath}.backup-v${version}-${timestamp}`;

        try {
            const content = await fs.readFile(configPath, 'utf-8');
            await fs.writeFile(backupPath, content, 'utf-8');
            
            this.logger.info('Configuration backup created', { backupPath });
        } catch (error) {
            this.logger.error('Failed to create backup', { error, configPath });
            throw new SystemError('Failed to create configuration backup', error as Error);
        }
    }

    /**
     * Get migration path between two versions.
     */
    private getMigrationPath(fromVersion: string, toVersion: string): string[] {
        const versions = this.versionHistory.map(v => v.version);
        const fromIndex = versions.indexOf(fromVersion);
        const toIndex = versions.indexOf(toVersion);

        if (fromIndex === -1 || toIndex === -1) {
            throw new Error(`Invalid version: ${fromVersion} or ${toVersion}`);
        }

        const path: string[] = [];
        const direction = fromIndex < toIndex ? 1 : -1;

        for (let i = fromIndex; i !== toIndex; i += direction) {
            const from = versions[i];
            const to = versions[i + direction];
            path.push(`${from}-${to}`);
        }

        return path;
    }

    /**
     * Get current configuration version.
     */
    private getCurrentVersion(): string {
        return this.versionHistory[this.versionHistory.length - 1].version;
    }

    /**
     * Get version history.
     */
    getVersionHistory(): ConfigVersion[] {
        return [...this.versionHistory];
    }

    /**
     * Validate configuration compatibility.
     */
    async validateCompatibility(config: any): Promise<{
        compatible: boolean;
        warnings: string[];
        suggestedActions: string[];
    }> {
        const warnings: string[] = [];
        const suggestedActions: string[] = [];
        let compatible = true;

        const configVersion = config.version || '0.1.0';
        const currentVersion = this.getCurrentVersion();

        if (configVersion !== currentVersion) {
            warnings.push(`Configuration is at version ${configVersion}, current is ${currentVersion}`);
            suggestedActions.push('Run configuration migration to update to latest version');
        }

        // Check for deprecated fields
        if (config.server) {
            warnings.push('Field "server" is deprecated, use "mcp" instead');
            suggestedActions.push('Migrate configuration to use "mcp" section');
            compatible = false;
        }

        if (config.integrations?.jira?.username) {
            warnings.push('Field "integrations.jira.username" is deprecated, use "email" instead');
            suggestedActions.push('Migrate configuration to use "integrations.jira.email"');
        }

        return {
            compatible,
            warnings,
            suggestedActions
        };
    }
}
