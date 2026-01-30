/**
 * Configuration Backup and Restore Utility
 * Handles exporting and importing configuration settings
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

export interface ConfigBackup {
    version: string;
    timestamp: string;
    settings: {
        [key: string]: any;
    };
    metadata: {
        vsCodeVersion: string;
        platform: string;
        exported: string;
    };
}

export class ConfigBackupService {
    private static readonly BACKUP_FOLDER = '.aicc-backups';
    private static readonly MAX_BACKUPS = 10;

    /**
     * Export current configuration to JSON file
     */
    static async exportConfig(logger: Logger): Promise<string | null> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('No workspace folder open');
                return null;
            }

            // Get all AI Command Center settings
            const config = vscode.workspace.getConfiguration('aicc');
            const settings: { [key: string]: any } = {};

            // Extract all settings
            for (const key of Object.keys(config)) {
                const value = config.get(key);
                if (value !== undefined) {
                    settings[key] = value;
                }
            }

            // Create backup object
            const backup: ConfigBackup = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                settings,
                metadata: {
                    vsCodeVersion: vscode.version,
                    platform: process.platform,
                    exported: new Date().toLocaleString()
                }
            };

            // Prompt user for save location
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(
                    path.join(workspaceFolder.uri.fsPath, `aicc-config-${Date.now()}.json`)
                ),
                filters: {
                    'JSON': ['json'],
                    'All Files': ['*']
                },
                saveLabel: 'Export Configuration'
            });

            if (!uri) {
                return null; // User cancelled
            }

            // Write backup file
            const content = JSON.stringify(backup, null, 2);
            await fs.promises.writeFile(uri.fsPath, content, 'utf8');

            logger.info('Configuration exported', {
                component: 'ConfigBackupService',
                path: uri.fsPath
            });

            vscode.window.showInformationMessage(`Configuration exported to ${path.basename(uri.fsPath)}`);
            return uri.fsPath;
        } catch (error) {
            logger.error('Failed to export configuration', {
                component: 'ConfigBackupService',
                error
            });
            vscode.window.showErrorMessage(`Failed to export configuration: ${error}`);
            return null;
        }
    }

    /**
     * Import configuration from JSON file
     */
    static async importConfig(logger: Logger): Promise<boolean> {
        try {
            // Prompt user to select backup file
            const uris = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: {
                    'JSON': ['json'],
                    'All Files': ['*']
                },
                openLabel: 'Import Configuration'
            });

            if (!uris || uris.length === 0) {
                return false; // User cancelled
            }

            // Read backup file
            const content = await fs.promises.readFile(uris[0].fsPath, 'utf8');
            const backup: ConfigBackup = JSON.parse(content);

            // Validate backup structure
            if (!backup.settings || !backup.version) {
                throw new Error('Invalid backup file format');
            }

            // Confirm with user
            const confirm = await vscode.window.showWarningMessage(
                `Import configuration from ${backup.metadata.exported}? This will overwrite current settings.`,
                { modal: true },
                'Import',
                'Cancel'
            );

            if (confirm !== 'Import') {
                return false;
            }

            // Create backup of current config before importing
            await this.createAutomaticBackup(logger);

            // Apply settings
            const config = vscode.workspace.getConfiguration('aicc');
            let imported = 0;
            let failed = 0;

            for (const [key, value] of Object.entries(backup.settings)) {
                try {
                    await config.update(key, value, vscode.ConfigurationTarget.Workspace);
                    imported++;
                } catch (error) {
                    logger.error(`Failed to import setting: ${key}`, {
                        component: 'ConfigBackupService',
                        error
                    });
                    failed++;
                }
            }

            logger.info('Configuration imported', {
                component: 'ConfigBackupService',
                imported,
                failed
            });

            vscode.window.showInformationMessage(
                `Configuration imported: ${imported} settings applied${failed > 0 ? `, ${failed} failed` : ''}`
            );

            return true;
        } catch (error) {
            logger.error('Failed to import configuration', {
                component: 'ConfigBackupService',
                error
            });
            vscode.window.showErrorMessage(`Failed to import configuration: ${error}`);
            return false;
        }
    }

    /**
     * Create automatic backup before major changes
     */
    static async createAutomaticBackup(logger: Logger): Promise<string | null> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return null;
            }

            // Create backup folder
            const backupFolder = path.join(workspaceFolder.uri.fsPath, this.BACKUP_FOLDER);
            await fs.promises.mkdir(backupFolder, { recursive: true });

            // Get current settings
            const config = vscode.workspace.getConfiguration('aicc');
            const settings: { [key: string]: any } = {};

            for (const key of Object.keys(config)) {
                const value = config.get(key);
                if (value !== undefined) {
                    settings[key] = value;
                }
            }

            const backup: ConfigBackup = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                settings,
                metadata: {
                    vsCodeVersion: vscode.version,
                    platform: process.platform,
                    exported: new Date().toLocaleString()
                }
            };

            // Save backup
            const filename = `auto-backup-${Date.now()}.json`;
            const filepath = path.join(backupFolder, filename);
            await fs.promises.writeFile(filepath, JSON.stringify(backup, null, 2), 'utf8');

            logger.info('Automatic backup created', {
                component: 'ConfigBackupService',
                path: filepath
            });

            // Clean old backups
            await this.cleanOldBackups(backupFolder, logger);

            return filepath;
        } catch (error) {
            logger.error('Failed to create automatic backup', {
                component: 'ConfigBackupService',
                error
            });
            return null;
        }
    }

    /**
     * Clean old automatic backups, keeping only the most recent ones
     */
    private static async cleanOldBackups(backupFolder: string, logger: Logger): Promise<void> {
        try {
            const files = await fs.promises.readdir(backupFolder);
            const backupFiles = files
                .filter(f => f.startsWith('auto-backup-') && f.endsWith('.json'))
                .map(f => ({
                    name: f,
                    path: path.join(backupFolder, f),
                    mtime: fs.statSync(path.join(backupFolder, f)).mtime.getTime()
                }))
                .sort((a, b) => b.mtime - a.mtime); // Sort by newest first

            // Delete oldest backups if we exceed max
            if (backupFiles.length > this.MAX_BACKUPS) {
                const toDelete = backupFiles.slice(this.MAX_BACKUPS);
                for (const file of toDelete) {
                    await fs.promises.unlink(file.path);
                    logger.info('Deleted old backup', {
                        component: 'ConfigBackupService',
                        file: file.name
                    });
                }
            }
        } catch (error) {
            logger.error('Failed to clean old backups', {
                component: 'ConfigBackupService',
                error
            });
        }
    }

    /**
     * List all automatic backups
     */
    static async listBackups(logger: Logger): Promise<Array<{ path: string; date: Date }>> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return [];
            }

            const backupFolder = path.join(workspaceFolder.uri.fsPath, this.BACKUP_FOLDER);
            
            try {
                const files = await fs.promises.readdir(backupFolder);
                return files
                    .filter(f => f.startsWith('auto-backup-') && f.endsWith('.json'))
                    .map(f => ({
                        path: path.join(backupFolder, f),
                        date: new Date(fs.statSync(path.join(backupFolder, f)).mtime)
                    }))
                    .sort((a, b) => b.date.getTime() - a.date.getTime());
            } catch (error) {
                // Backup folder doesn't exist yet
                return [];
            }
        } catch (error) {
            logger.error('Failed to list backups', {
                component: 'ConfigBackupService',
                error
            });
            return [];
        }
    }
}
