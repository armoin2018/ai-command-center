import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../logger';

/**
 * Configuration Migration Service
 * 
 * Handles schema versioning, migration scripts, and config upgrades
 */

interface MigrationScript {
    fromVersion: string;
    toVersion: string;
    description: string;
    migrate: (config: any) => Promise<any>;
}

interface MigrationHistory {
    timestamp: string;
    fromVersion: string;
    toVersion: string;
    success: boolean;
    backupPath?: string;
}

export class ConfigMigration {
    private static readonly CURRENT_VERSION = '2.0.0';
    private static readonly VERSION_KEY = 'schemaVersion';
    private migrations: MigrationScript[] = [];
    private history: MigrationHistory[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.registerMigrations();
        this.loadHistory();
    }

    /**
     * Register all migration scripts
     */
    private registerMigrations(): void {
        // Migration from 1.0.0 to 1.1.0
        this.migrations.push({
            fromVersion: '1.0.0',
            toVersion: '1.1.0',
            description: 'Add priority field to items',
            migrate: async (config: any) => {
                if (config.items) {
                    config.items.forEach((item: any) => {
                        if (!item.priority) {
                            item.priority = 'medium';
                        }
                    });
                }
                return config;
            }
        });

        // Migration from 1.1.0 to 1.2.0
        this.migrations.push({
            fromVersion: '1.1.0',
            toVersion: '1.2.0',
            description: 'Add story points field',
            migrate: async (config: any) => {
                if (config.items) {
                    config.items.forEach((item: any) => {
                        if (item.type === 'story' || item.type === 'task') {
                            if (!item.storyPoints) {
                                item.storyPoints = item.type === 'story' ? 5 : 1;
                            }
                        }
                    });
                }
                return config;
            }
        });

        // Migration from 1.2.0 to 2.0.0
        this.migrations.push({
            fromVersion: '1.2.0',
            toVersion: '2.0.0',
            description: 'Restructure config to hierarchical tree',
            migrate: async (config: any) => {
                // Convert flat structure to tree
                if (config.items && !config.tree) {
                    const epics = config.items.filter((item: any) => item.type === 'epic');
                    const stories = config.items.filter((item: any) => item.type === 'story');
                    const tasks = config.items.filter((item: any) => item.type === 'task');

                    config.tree = epics.map((epic: any) => ({
                        ...epic,
                        children: stories
                            .filter((s: any) => s.epicId === epic.id)
                            .map((story: any) => ({
                                ...story,
                                children: tasks.filter((t: any) => t.storyId === story.id)
                            }))
                    }));

                    delete config.items;
                }
                return config;
            }
        });
    }

    /**
     * Check if config needs migration
     */
    async needsMigration(configPath: string): Promise<boolean> {
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content);
            const currentVersion = config[ConfigMigration.VERSION_KEY] || '1.0.0';
            return currentVersion !== ConfigMigration.CURRENT_VERSION;
        } catch (error) {
            logger.error('Error checking migration need:', { error });
            return false;
        }
    }

    /**
     * Detect schema version from config
     */
    async detectVersion(configPath: string): Promise<string> {
        try {
            const content = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(content);
            return config[ConfigMigration.VERSION_KEY] || '1.0.0';
        } catch (error) {
            logger.error('Error detecting version:', { error });
            return '1.0.0';
        }
    }

    /**
     * Migrate config to latest version
     */
    async migrate(configPath: string, options?: { createBackup?: boolean }): Promise<boolean> {
        const createBackup = options?.createBackup !== false;

        try {
            // Detect current version
            const currentVersion = await this.detectVersion(configPath);

            if (currentVersion === ConfigMigration.CURRENT_VERSION) {
                logger.info('Config is already at latest version');
                return true;
            }

            // Create backup
            let backupPath: string | undefined;
            if (createBackup) {
                backupPath = await this.createBackup(configPath);
                logger.info(`Created backup at: ${backupPath}`);
            }

            // Load config
            const content = await fs.readFile(configPath, 'utf-8');
            let config = JSON.parse(content);

            // Apply migrations in sequence
            let version = currentVersion;
            const appliedMigrations: MigrationScript[] = [];

            while (version !== ConfigMigration.CURRENT_VERSION) {
                const migration = this.migrations.find(m => m.fromVersion === version);
                
                if (!migration) {
                    throw new Error(`No migration path found from version ${version}`);
                }

                logger.info(`Applying migration: ${migration.description} (${migration.fromVersion} -> ${migration.toVersion})`);
                config = await migration.migrate(config);
                config[ConfigMigration.VERSION_KEY] = migration.toVersion;
                version = migration.toVersion;
                appliedMigrations.push(migration);
            }

            // Save migrated config
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
            logger.info(`Migration completed successfully. Applied ${appliedMigrations.length} migrations.`);

            // Record history
            this.recordMigration(currentVersion, ConfigMigration.CURRENT_VERSION, true, backupPath);

            // Show success message
            vscode.window.showInformationMessage(
                `Config migrated from v${currentVersion} to v${ConfigMigration.CURRENT_VERSION}. ${appliedMigrations.length} migration(s) applied.`
            );

            return true;
        } catch (error: any) {
            logger.error('Migration failed:', { error });
            this.recordMigration(await this.detectVersion(configPath), ConfigMigration.CURRENT_VERSION, false);
            
            vscode.window.showErrorMessage(
                `Config migration failed: ${error.message}. Use "Rollback Migration" to restore from backup.`
            );

            return false;
        }
    }

    /**
     * Create backup of config file
     */
    private async createBackup(configPath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const dirname = path.dirname(configPath);
        const basename = path.basename(configPath, '.json');
        const backupPath = path.join(dirname, `${basename}.backup.${timestamp}.json`);

        await fs.copyFile(configPath, backupPath);
        return backupPath;
    }

    /**
     * Rollback to backup
     */
    async rollback(configPath: string, backupPath?: string): Promise<boolean> {
        try {
            // If no backup path provided, find latest backup
            if (!backupPath) {
                const latestBackup = await this.findLatestBackup(configPath);
                if (!latestBackup) {
                    vscode.window.showErrorMessage('No backup found to rollback to');
                    return false;
                }
                backupPath = latestBackup;
            }

            // Confirm rollback
            const confirm = await vscode.window.showWarningMessage(
                `Rollback to backup from ${path.basename(backupPath)}? This will overwrite the current config.`,
                'Rollback',
                'Cancel'
            );

            if (confirm !== 'Rollback') {
                return false;
            }

            // Create backup of current state before rollback
            const preRollbackBackup = await this.createBackup(configPath);

            // Restore from backup
            await fs.copyFile(backupPath, configPath);
            logger.info(`Rolled back to: ${backupPath}`);

            vscode.window.showInformationMessage(
                `Successfully rolled back to ${path.basename(backupPath)}. Previous state saved to ${path.basename(preRollbackBackup)}.`
            );

            return true;
        } catch (error: any) {
            logger.error('Rollback failed:', { error });
            vscode.window.showErrorMessage(`Rollback failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Find latest backup file
     */
    private async findLatestBackup(configPath: string): Promise<string | null> {
        try {
            const dirname = path.dirname(configPath);
            const basename = path.basename(configPath, '.json');
            const files = await fs.readdir(dirname);

            const backups = files
                .filter(f => f.startsWith(`${basename}.backup.`) && f.endsWith('.json'))
                .map(f => path.join(dirname, f))
                .sort()
                .reverse();

            return backups.length > 0 ? backups[0] : null;
        } catch (error) {
            logger.error('Error finding backup:', { error });
            return null;
        }
    }

    /**
     * List all available backups
     */
    async listBackups(configPath: string): Promise<string[]> {
        try {
            const dirname = path.dirname(configPath);
            const basename = path.basename(configPath, '.json');
            const files = await fs.readdir(dirname);

            return files
                .filter(f => f.startsWith(`${basename}.backup.`) && f.endsWith('.json'))
                .map(f => path.join(dirname, f))
                .sort()
                .reverse();
        } catch (error) {
            logger.error('Error listing backups:', { error });
            return [];
        }
    }

    /**
     * Clean old backups (keep last N)
     */
    async cleanOldBackups(configPath: string, keepCount: number = 5): Promise<number> {
        try {
            const backups = await this.listBackups(configPath);
            const toDelete = backups.slice(keepCount);

            for (const backup of toDelete) {
                await fs.unlink(backup);
                logger.info(`Deleted old backup: ${backup}`);
            }

            return toDelete.length;
        } catch (error) {
            logger.error('Error cleaning backups:', { error });
            return 0;
        }
    }

    /**
     * Record migration in history
     */
    private recordMigration(fromVersion: string, toVersion: string, success: boolean, backupPath?: string): void {
        this.history.push({
            timestamp: new Date().toISOString(),
            fromVersion,
            toVersion,
            success,
            backupPath
        });

        this.saveHistory();
    }

    /**
     * Load migration history from global state
     */
    private loadHistory(): void {
        const stored = this.context.globalState.get<MigrationHistory[]>('migrationHistory', []);
        this.history = stored;
    }

    /**
     * Save migration history to global state
     */
    private saveHistory(): void {
        this.context.globalState.update('migrationHistory', this.history);
    }

    /**
     * Get migration history
     */
    getHistory(): MigrationHistory[] {
        return [...this.history];
    }

    /**
     * Show migration UI
     */
    async showMigrationUI(configPath: string): Promise<void> {
        const currentVersion = await this.detectVersion(configPath);
        const needsMigration = currentVersion !== ConfigMigration.CURRENT_VERSION;

        const options: vscode.QuickPickItem[] = [];

        if (needsMigration) {
            options.push({
                label: '$(sync) Migrate to Latest',
                description: `Upgrade from v${currentVersion} to v${ConfigMigration.CURRENT_VERSION}`,
                detail: 'Apply all pending migrations'
            });
        }

        options.push(
            {
                label: '$(history) View History',
                description: 'View migration history',
                detail: `${this.history.length} migration(s) recorded`
            },
            {
                label: '$(folder) List Backups',
                description: 'View available backups',
                detail: 'Show all backup files'
            },
            {
                label: '$(discard) Rollback',
                description: 'Restore from backup',
                detail: 'Rollback to a previous backup'
            },
            {
                label: '$(trash) Clean Old Backups',
                description: 'Remove old backup files',
                detail: 'Keep only recent backups'
            }
        );

        const selection = await vscode.window.showQuickPick(options, {
            placeHolder: `Config Migration (Current: v${currentVersion})`
        });

        if (!selection) {
            return;
        }

        if (selection.label.includes('Migrate')) {
            await this.migrate(configPath);
        } else if (selection.label.includes('History')) {
            this.showHistory();
        } else if (selection.label.includes('List Backups')) {
            await this.showBackups(configPath);
        } else if (selection.label.includes('Rollback')) {
            await this.rollback(configPath);
        } else if (selection.label.includes('Clean')) {
            const deleted = await this.cleanOldBackups(configPath);
            vscode.window.showInformationMessage(`Deleted ${deleted} old backup(s)`);
        }
    }

    /**
     * Show migration history
     */
    private showHistory(): void {
        const panel = vscode.window.createOutputChannel('Migration History');
        panel.clear();
        panel.appendLine('=== Migration History ===\n');

        if (this.history.length === 0) {
            panel.appendLine('No migrations recorded');
        } else {
            this.history.forEach((entry, index) => {
                panel.appendLine(`${index + 1}. ${entry.timestamp}`);
                panel.appendLine(`   ${entry.fromVersion} -> ${entry.toVersion}`);
                panel.appendLine(`   Status: ${entry.success ? '✓ Success' : '✗ Failed'}`);
                if (entry.backupPath) {
                    panel.appendLine(`   Backup: ${entry.backupPath}`);
                }
                panel.appendLine('');
            });
        }

        panel.show();
    }

    /**
     * Show available backups
     */
    private async showBackups(configPath: string): Promise<void> {
        const backups = await this.listBackups(configPath);

        if (backups.length === 0) {
            vscode.window.showInformationMessage('No backups found');
            return;
        }

        const items = backups.map(backup => ({
            label: path.basename(backup),
            description: backup,
            backup
        }));

        const selection = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a backup to view details'
        });

        if (selection) {
            const stats = await fs.stat(selection.backup);
            vscode.window.showInformationMessage(
                `Backup: ${selection.label}\nSize: ${(stats.size / 1024).toFixed(2)} KB\nCreated: ${stats.mtime.toLocaleString()}`
            );
        }
    }
}
