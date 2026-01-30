import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../logger';

/**
 * Real-time Update System
 * 
 * File watcher for config changes, auto-refresh WebView,
 * conflict detection for concurrent edits
 */

interface FileChange {
    uri: vscode.Uri;
    type: vscode.FileChangeType;
    timestamp: number;
}

interface ConflictState {
    localVersion: string;
    externalVersion: string;
    timestamp: number;
}

export class RealTimeUpdateSystem {
    private fileWatcher: vscode.FileSystemWatcher | null = null;
    private webviewPanel: vscode.WebviewPanel | null = null;
    private lastKnownContent: string = '';
    private conflictState: ConflictState | null = null;
    private changeBuffer: FileChange[] = [];
    private debounceTimer: NodeJS.Timeout | null = null;
    private readonly debounceDelay = 500; // ms

    constructor(_context: vscode.ExtensionContext) {
        // Context available for future expansion
    }

    /**
     * Start watching a config file
     */
    startWatching(configPath: string, webviewPanel?: vscode.WebviewPanel): void {
        this.stopWatching();

        const pattern = new vscode.RelativePattern(
            path.dirname(configPath),
            path.basename(configPath)
        );

        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
        this.webviewPanel = webviewPanel || null;

        // Read initial content
        this.updateLastKnownContent(configPath);

        // Watch for changes
        this.fileWatcher.onDidChange((uri) => {
            this.handleFileChange(uri, vscode.FileChangeType.Changed);
        });

        this.fileWatcher.onDidCreate((uri) => {
            this.handleFileChange(uri, vscode.FileChangeType.Created);
        });

        this.fileWatcher.onDidDelete((uri) => {
            this.handleFileChange(uri, vscode.FileChangeType.Deleted);
        });

        logger.info(`Started watching config file: ${configPath}`);
    }

    /**
     * Stop watching
     */
    stopWatching(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        this.changeBuffer = [];
        this.conflictState = null;
        logger.info('Stopped watching config file');
    }

    /**
     * Handle file change event
     */
    private handleFileChange(uri: vscode.Uri, type: vscode.FileChangeType): void {
        // Add to buffer
        this.changeBuffer.push({
            uri,
            type,
            timestamp: Date.now()
        });

        // Debounce processing
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.processChanges();
        }, this.debounceDelay);
    }

    /**
     * Process buffered changes
     */
    private async processChanges(): Promise<void> {
        if (this.changeBuffer.length === 0) {
            return;
        }

        const changes = [...this.changeBuffer];
        this.changeBuffer = [];

        // Process latest change
        const latestChange = changes[changes.length - 1];

        try {
            if (latestChange.type === vscode.FileChangeType.Deleted) {
                this.handleFileDeleted(latestChange.uri);
            } else {
                await this.handleFileUpdated(latestChange.uri);
            }
        } catch (error) {
            logger.error('Error processing file changes:', { error });
        }
    }

    /**
     * Handle file update
     */
    private async handleFileUpdated(uri: vscode.Uri): Promise<void> {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf-8');

            // Detect conflict
            if (this.hasLocalChanges() && content !== this.lastKnownContent) {
                this.conflictState = {
                    localVersion: this.lastKnownContent,
                    externalVersion: content,
                    timestamp: Date.now()
                };

                await this.handleConflict(uri);
                return;
            }

            // No conflict - update content and refresh
            this.lastKnownContent = content;
            this.refreshWebView(content);

            logger.info(`Config file updated externally: ${uri.fsPath}`);
        } catch (error) {
            logger.error('Error reading updated file:', { error });
        }
    }

    /**
     * Handle file deletion
     */
    private handleFileDeleted(uri: vscode.Uri): void {
        vscode.window.showWarningMessage(
            `Config file was deleted: ${path.basename(uri.fsPath)}. The file will be recreated when you save.`
        );

        this.lastKnownContent = '';
        
        if (this.webviewPanel) {
            this.webviewPanel.webview.postMessage({
                type: 'fileDeleted',
                message: 'The config file was deleted externally'
            });
        }
    }

    /**
     * Check if there are local changes in WebView
     */
    private hasLocalChanges(): boolean {
        // This would be set by the WebView when user makes changes
        // For now, return false - can be enhanced with dirty flag tracking
        return false;
    }

    /**
     * Handle conflict between local and external changes
     */
    private async handleConflict(uri: vscode.Uri): Promise<void> {
        const choice = await vscode.window.showWarningMessage(
            'Config file was modified externally while you have unsaved changes. What would you like to do?',
            'Use External Version',
            'Keep Local Version',
            'Show Diff'
        );

        if (choice === 'Use External Version' && this.conflictState) {
            this.lastKnownContent = this.conflictState.externalVersion;
            this.refreshWebView(this.conflictState.externalVersion);
            this.conflictState = null;
        } else if (choice === 'Keep Local Version') {
            // Keep local version - user will save it
            this.conflictState = null;
        } else if (choice === 'Show Diff' && this.conflictState) {
            await this.showDiff(uri);
        }
    }

    /**
     * Show diff between local and external versions
     */
    private async showDiff(_uri: vscode.Uri): Promise<void> {
        if (!this.conflictState) {
            return;
        }

        try {
            // Create temp files for diff
            const localUri = vscode.Uri.parse(`untitled:Local Changes`);
            const externalUri = vscode.Uri.parse(`untitled:External Changes`);

            // Open diff editor
            await vscode.commands.executeCommand(
                'vscode.diff',
                localUri,
                externalUri,
                'Config Conflict: Local ↔ External'
            );

            // Write content to diff editors
            await vscode.workspace.openTextDocument(localUri);
            const localEdit = new vscode.WorkspaceEdit();
            localEdit.insert(localUri, new vscode.Position(0, 0), this.conflictState.localVersion);
            await vscode.workspace.applyEdit(localEdit);

            await vscode.workspace.openTextDocument(externalUri);
            const externalEdit = new vscode.WorkspaceEdit();
            externalEdit.insert(externalUri, new vscode.Position(0, 0), this.conflictState.externalVersion);
            await vscode.workspace.applyEdit(externalEdit);

        } catch (error) {
            logger.error('Error showing diff:', { error });
            vscode.window.showErrorMessage('Failed to show diff view');
        }
    }

    /**
     * Refresh WebView with new content
     */
    private refreshWebView(content: string): void {
        if (this.webviewPanel) {
            try {
                const data = JSON.parse(content);
                this.webviewPanel.webview.postMessage({
                    type: 'refresh',
                    data
                });
                logger.debug('WebView refreshed with external changes');
            } catch (error) {
                logger.error('Error parsing config for refresh:', { error });
            }
        }
    }

    /**
     * Update last known content
     */
    private async updateLastKnownContent(configPath: string): Promise<void> {
        try {
            this.lastKnownContent = await fs.promises.readFile(configPath, 'utf-8');
        } catch (error: any) {
            // Only log error if it's not a file-not-found error (ENOENT)
            // Missing config files are expected when using defaults
            if (error.code !== 'ENOENT') {
                logger.error('Error reading initial content:', { error });
            }
            this.lastKnownContent = '';
        }
    }

    /**
     * Set WebView panel
     */
    setWebViewPanel(panel: vscode.WebviewPanel): void {
        this.webviewPanel = panel;
    }

    /**
     * Notify of save from WebView
     */
    notifySave(content: string): void {
        this.lastKnownContent = content;
        this.conflictState = null;
    }

    /**
     * Get conflict state
     */
    getConflictState(): ConflictState | null {
        return this.conflictState;
    }

    /**
     * Clear conflict
     */
    clearConflict(): void {
        this.conflictState = null;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.stopWatching();
    }
}
