/**
 * Configuration file watcher for AI Command Center.
 * 
 * Monitors configuration files and VS Code settings for changes,
 * automatically reloading configuration when modifications are detected.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';
import { ConfigManager } from '../configManager';

/**
 * Configuration change event.
 */
export interface ConfigChangeEvent {
    source: 'file' | 'vscode' | 'workspace';
    timestamp: Date;
    affectedKeys?: string[];
}

/**
 * Configuration watcher manager.
 */
export class ConfigWatcher {
    private logger: Logger;
    private configManager: ConfigManager;
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private settingsWatcher: vscode.Disposable | null = null;
    private changeEmitter: vscode.EventEmitter<ConfigChangeEvent>;
    private configPaths: Set<string> = new Set();
    private debounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelay = 500; // ms

    public readonly onConfigChange: vscode.Event<ConfigChangeEvent>;

    constructor(logger: Logger, configManager: ConfigManager) {
        this.logger = logger;
        this.configManager = configManager;
        this.changeEmitter = new vscode.EventEmitter<ConfigChangeEvent>();
        this.onConfigChange = this.changeEmitter.event;
    }

    /**
     * Start watching configuration changes.
     */
    public start(extensionPath: string): void {
        // Watch default config file
        const defaultConfigPath = path.join(extensionPath, 'src', 'defaults', 'aicc.json');
        this.addConfigPath(defaultConfigPath);

        // Watch workspace config files
        if (vscode.workspace.workspaceFolders) {
            for (const folder of vscode.workspace.workspaceFolders) {
                const workspaceConfigPath = path.join(folder.uri.fsPath, '.aicc', 'config.json');
                if (fs.existsSync(workspaceConfigPath)) {
                    this.addConfigPath(workspaceConfigPath);
                }
            }
        }

        // Start file system watcher
        this.startFileWatcher();

        // Start VS Code settings watcher
        this.startSettingsWatcher();

        this.logger.info('Configuration watcher started', {
            component: 'ConfigWatcher',
            watchedPaths: Array.from(this.configPaths)
        });
    }

    /**
     * Stop watching configuration changes.
     */
    public stop(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }

        if (this.settingsWatcher) {
            this.settingsWatcher.dispose();
            this.settingsWatcher = null;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        this.configPaths.clear();

        this.logger.info('Configuration watcher stopped', {
            component: 'ConfigWatcher'
        });
    }

    /**
     * Add a configuration file path to watch.
     */
    public addConfigPath(filePath: string): void {
        if (!fs.existsSync(filePath)) {
            this.logger.warn('Configuration path does not exist', {
                component: 'ConfigWatcher',
                path: filePath
            });
            return;
        }

        this.configPaths.add(filePath);
        
        this.logger.debug('Configuration path added', {
            component: 'ConfigWatcher',
            path: filePath
        });
    }

    /**
     * Remove a configuration file path from watch list.
     */
    public removeConfigPath(filePath: string): void {
        this.configPaths.delete(filePath);
        
        this.logger.debug('Configuration path removed', {
            component: 'ConfigWatcher',
            path: filePath
        });
    }

    /**
     * Start file system watcher for config files.
     */
    private startFileWatcher(): void {
        // Create file system watcher for JSON files
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            '**/{aicc.json,config.json,.aicc/config.json}',
            false, // ignoreCreateEvents
            false, // ignoreChangeEvents
            false  // ignoreDeleteEvents
        );

        // Handle file changes
        this.fileWatcher.onDidChange(uri => {
            this.handleFileChange(uri, 'change');
        });

        this.fileWatcher.onDidCreate(uri => {
            this.handleFileChange(uri, 'create');
        });

        this.fileWatcher.onDidDelete(uri => {
            this.handleFileChange(uri, 'delete');
        });

        this.logger.debug('File system watcher started', {
            component: 'ConfigWatcher'
        });
    }

    /**
     * Start VS Code settings watcher.
     */
    private startSettingsWatcher(): void {
        this.settingsWatcher = vscode.workspace.onDidChangeConfiguration(event => {
            // Check if AICC settings changed
            if (event.affectsConfiguration('aicc')) {
                this.handleSettingsChange(event);
            }
        });

        this.logger.debug('Settings watcher started', {
            component: 'ConfigWatcher'
        });
    }

    /**
     * Handle file system change events.
     */
    private handleFileChange(uri: vscode.Uri, changeType: 'create' | 'change' | 'delete'): void {
        const filePath = uri.fsPath;

        // Check if this is a watched config file
        if (!this.isWatchedPath(filePath)) {
            return;
        }

        this.logger.info('Configuration file changed', {
            component: 'ConfigWatcher',
            path: filePath,
            changeType
        });

        // Debounce reload
        this.debounceReload(() => {
            this.configManager.reload();
            
            this.changeEmitter.fire({
                source: 'file',
                timestamp: new Date()
            });

            vscode.window.showInformationMessage(
                'Configuration file updated - settings reloaded'
            );
        });
    }

    /**
     * Handle VS Code settings change events.
     */
    private handleSettingsChange(event: vscode.ConfigurationChangeEvent): void {
        const affectedKeys: string[] = [];

        // Check which AICC settings changed
        const settingKeys = [
            'planPath',
            'autoSaveInterval',
            'storyPointScale',
            'sprintDurationWeeks',
            'logLevel',
            'fileLoggingEnabled',
            'retentionDays',
            'maxFileSizeMB'
        ];

        for (const key of settingKeys) {
            if (event.affectsConfiguration(`aicc.${key}`)) {
                affectedKeys.push(key);
            }
        }

        if (affectedKeys.length === 0) {
            return;
        }

        this.logger.info('VS Code settings changed', {
            component: 'ConfigWatcher',
            affectedKeys
        });

        // Debounce reload
        this.debounceReload(() => {
            this.configManager.reload();
            
            this.changeEmitter.fire({
                source: 'vscode',
                timestamp: new Date(),
                affectedKeys
            });

            vscode.window.showInformationMessage(
                `Configuration updated - ${affectedKeys.length} setting(s) changed`
            );
        });
    }

    /**
     * Check if a path is being watched.
     */
    private isWatchedPath(filePath: string): boolean {
        // Direct match
        if (this.configPaths.has(filePath)) {
            return true;
        }

        // Check if path matches any watched directory
        const normalizedPath = path.normalize(filePath);
        const fileName = path.basename(normalizedPath);
        
        // Watch for common config file names
        if (fileName === 'aicc.json' || fileName === 'config.json') {
            return true;
        }

        return false;
    }

    /**
     * Debounce reload to avoid multiple rapid reloads.
     */
    private debounceReload(callback: () => void): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            callback();
            this.debounceTimer = null;
        }, this.debounceDelay);
    }

    /**
     * Dispose of all watchers.
     */
    public dispose(): void {
        this.stop();
        this.changeEmitter.dispose();
    }
}
