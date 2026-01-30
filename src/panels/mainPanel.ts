/**
 * Main Panel - WebView Panel Provider
 * 
 * Manages the planning tree WebView panel lifecycle and messaging
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';
import { WebViewMessage } from '../types/webview';
import { RealTimeUpdateSystem } from '../services/realTimeUpdateSystem';

export class MainPanel {
    public static currentPanel: MainPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private logger: Logger;
    private planningManager: PlanningManager;
    private realTimeUpdateSystem?: RealTimeUpdateSystem;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        logger: Logger,
        planningManager: PlanningManager,
        realTimeUpdateSystem?: RealTimeUpdateSystem,
        configPath?: string
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this.logger = logger;
        this.planningManager = planningManager;
        this.realTimeUpdateSystem = realTimeUpdateSystem;

        // Set the webview's initial html content
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, this._extensionUri);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            (message: WebViewMessage) => this._handleWebViewMessage(message),
            null,
            this._disposables
        );

        // Start watching config file if real-time update system is available
        if (realTimeUpdateSystem && configPath) {
            this.realTimeUpdateSystem = realTimeUpdateSystem;
            this.realTimeUpdateSystem.startWatching(configPath, this._panel);
            this.logger.info('Started watching config file for changes', { path: configPath });
        }

        // Listen for configuration changes to update component references toggle
        this._disposables.push(
            vscode.workspace.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('aicc.ui.showComponentReferences')) {
                    this._sendSettingsUpdate();
                }
            })
        );

        // Send initial data
        this._sendTreeData();
        
        // Send initial settings
        this._sendSettingsUpdate();
    }

    /**
     * Parse a composite ID to extract epic, story, and task IDs
     * Format: epic-001-story-001-task-001 or epic-001-story-001 or epic-001
     */
    private parseCompositeId(compositeId: string): { epicId: string; storyId?: string; taskId?: string } {
        const parts = compositeId.split('-');
        
        // Epic ID is always first two parts: epic-001
        const epicId = `${parts[0]}-${parts[1]}`;
        
        // Story ID is next two parts if present: story-001
        let storyId: string | undefined;
        let taskId: string | undefined;
        
        if (parts.length >= 4 && parts[2] === 'story') {
            storyId = `${parts[2]}-${parts[3]}`;
        }
        
        // Task ID is last two parts if present: task-001
        if (parts.length >= 6 && parts[4] === 'task') {
            taskId = `${parts[4]}-${parts[5]}`;
        }
        
        return { epicId, storyId, taskId };
    }

    /**
     * Create or show the main panel
     */
    public static render(
        extensionUri: vscode.Uri,
        logger: Logger,
        planningManager: PlanningManager,
        realTimeUpdateSystem?: RealTimeUpdateSystem,
        configPath?: string
    ): MainPanel {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (MainPanel.currentPanel) {
            MainPanel.currentPanel._panel.reveal(column);
            MainPanel.currentPanel._sendTreeData();
            return MainPanel.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'aiccPlanningPanel',
            'AI Command Center',
            column || vscode.ViewColumn.One,
            {
                // Enable javascript in the webview
                enableScripts: true,

                // Restrict the webview to only load resources from specific directories
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'webview')
                ],

                // Persist state when hidden
                retainContextWhenHidden: true
            }
        );

        MainPanel.currentPanel = new MainPanel(
            panel,
            extensionUri,
            logger,
            planningManager,
            realTimeUpdateSystem,
            configPath
        );
        return MainPanel.currentPanel;
    }

    /**
     * Post message to webview
     */
    public postMessage(message: any): void {
        this._panel.webview.postMessage(message);
    }

    /**
     * Clean up and dispose of webview resources
     */
    public dispose(): void {
        MainPanel.currentPanel = undefined;

        // Stop watching config file
        if (this.realTimeUpdateSystem) {
            this.realTimeUpdateSystem.stopWatching();
        }

        // Dispose of the current webview panel
        this._panel.dispose();

        // Dispose of all disposables
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Handle messages from webview
     */
    private async _handleWebViewMessage(message: WebViewMessage): Promise<void> {
        try {
            switch (message.type) {
                case 'log':
                    const logLevel = message.payload.level as 'info' | 'warn' | 'error';
                    const logMessage = message.payload.message;
                    if (logLevel === 'info') {
                        this.logger.info(`WebView: ${logMessage}`, message.payload.data);
                    } else if (logLevel === 'warn') {
                        this.logger.warn(`WebView: ${logMessage}`, message.payload.data);
                    } else {
                        this.logger.error(`WebView: ${logMessage}`, message.payload.data);
                    }
                    break;

                case 'createEpic':
                    const epic = await this.planningManager.createEpic({
                        title: message.payload.title,
                        description: message.payload.description,
                        priority: message.payload.priority as any
                    });
                    this.logger.info('Epic created from WebView', { epicId: epic.id });
                    this._sendTreeData();
                    vscode.window.showInformationMessage(`Epic created: ${epic.title}`);
                    break;

                case 'createStory':
                    const story = await this.planningManager.createStory(
                        message.payload.epicId,
                        {
                            title: message.payload.title,
                            description: message.payload.description,
                            storyPoints: message.payload.estimatedHours,
                            sprint: message.payload.sprint,
                            priority: message.payload.priority as any
                        }
                    );
                    this.logger.info('Story created from WebView', { storyId: story.id });
                    this._sendTreeData();
                    vscode.window.showInformationMessage(`Story created: ${story.title}`);
                    break;

                case 'createTask':
                    const task = await this.planningManager.createTask(
                        message.payload.epicId,
                        message.payload.storyId,
                        {
                            title: message.payload.title,
                            description: message.payload.description,
                            storyPoints: message.payload.estimatedHours,
                            assignee: message.payload.assignee,
                            priority: message.payload.priority as any
                        }
                    );
                    this.logger.info('Task created from WebView', { taskId: task.id });
                    this._sendTreeData();
                    vscode.window.showInformationMessage(`Task created: ${task.title}`);
                    break;

                case 'updateItem':
                    const itemType = message.payload.itemType;
                    const itemId = message.payload.id;
                    const updates = message.payload.updates;
                    
                    // Parse composite ID to get actual IDs
                    const { epicId: updateEpicId, storyId: updateStoryId, taskId: updateTaskId } = this.parseCompositeId(itemId);
                    
                    if (itemType === 'epic') {
                        await this.planningManager.updateEpic(updateEpicId, updates);
                        this.logger.info('Epic updated from WebView', { id: updateEpicId });
                        vscode.window.showInformationMessage('Epic updated successfully');
                    } else if (itemType === 'story' && updateStoryId) {
                        await this.planningManager.updateStory(updateEpicId, updateStoryId, updates);
                        this.logger.info('Story updated from WebView', { id: updateStoryId });
                        vscode.window.showInformationMessage('Story updated successfully');
                    } else if (itemType === 'task' && updateStoryId && updateTaskId) {
                        await this.planningManager.updateTask(updateEpicId, updateStoryId, updateTaskId, updates);
                        this.logger.info('Task updated from WebView', { id: updateTaskId });
                        vscode.window.showInformationMessage('Task updated successfully');
                    }
                    
                    this._sendTreeData();
                    break;

                case 'deleteItem':
                    const deleteType = message.payload.itemType;
                    const deleteId = message.payload.id;
                    
                    // Parse composite ID to get actual IDs
                    const { epicId: deleteEpicId, storyId: deleteStoryId, taskId: deleteTaskId } = this.parseCompositeId(deleteId);
                    
                    if (deleteType === 'epic') {
                        await this.planningManager.deleteEpic(deleteEpicId);
                        this.logger.info('Epic deleted from WebView', { id: deleteEpicId });
                        vscode.window.showInformationMessage('Epic deleted successfully');
                    } else if (deleteType === 'story' && deleteStoryId) {
                        await this.planningManager.deleteStory(deleteEpicId, deleteStoryId);
                        this.logger.info('Story deleted from WebView', { id: deleteStoryId });
                        vscode.window.showInformationMessage('Story deleted successfully');
                    } else if (deleteType === 'task' && deleteStoryId && deleteTaskId) {
                        await this.planningManager.deleteTask(deleteEpicId, deleteStoryId, deleteTaskId);
                        this.logger.info('Task deleted from WebView', { id: deleteTaskId });
                        vscode.window.showInformationMessage('Task deleted successfully');
                    }
                    
                    this._sendTreeData();
                    break;

                case 'startEditSession':
                    const session = this.planningManager.startEditSession(
                        message.payload.itemId,
                        message.payload.itemType,
                        message.payload.userId,
                        message.payload.userName
                    );
                    this.logger.info('Edit session started', { itemId: message.payload.itemId });
                    this.postMessage({
                        type: 'editSessionStarted',
                        payload: { session }
                    });
                    break;

                case 'endEditSession':
                    this.planningManager.endEditSession(
                        message.payload.itemId,
                        message.payload.userId
                    );
                    this.logger.info('Edit session ended', { itemId: message.payload.itemId });
                    this.postMessage({
                        type: 'editSessionEnded',
                        payload: { itemId: message.payload.itemId }
                    });
                    break;

                case 'updateEditActivity':
                    this.planningManager.updateEditActivity(
                        message.payload.itemId,
                        message.payload.userId
                    );
                    break;

                case 'acquireLock':
                    const lockAcquired = await this.planningManager.acquireEditLock(
                        message.payload.itemId,
                        message.payload.userId
                    );
                    this.postMessage({
                        type: 'lockAcquired',
                        payload: {
                            itemId: message.payload.itemId,
                            success: lockAcquired,
                            lockOwner: lockAcquired ? message.payload.userId : this.planningManager.getItemLockOwner(message.payload.itemId)
                        }
                    });
                    break;

                case 'releaseLock':
                    const lockReleased = this.planningManager.releaseEditLock(
                        message.payload.itemId,
                        message.payload.userId
                    );
                    this.postMessage({
                        type: 'lockReleased',
                        payload: {
                            itemId: message.payload.itemId,
                            success: lockReleased
                        }
                    });
                    break;

                case 'checkConflict':
                    const conflict = this.planningManager.detectEditConflict(
                        message.payload.itemId,
                        message.payload.userId
                    );
                    if (conflict) {
                        const action = await this.planningManager.showEditConflictWarning(
                            message.payload.itemId,
                            message.payload.userId
                        );
                        this.postMessage({
                            type: 'conflictResolution',
                            payload: { itemId: message.payload.itemId, action }
                        });
                    }
                    break;

                default:
                    this.logger.warn('Unknown WebView message type', { type: message.type });
            }
        } catch (error) {
            this.logger.error('Error handling WebView message', { error, message });
            this.postMessage({
                type: 'error',
                payload: {
                    message: error instanceof Error ? error.message : String(error)
                }
            });
        }
    }

    /**
     * Send tree data to webview
     */
    private async _sendTreeData(): Promise<void> {
        try {
            const tree = await this.planningManager.getTree();
            const now = new Date().toISOString();

            // Build hierarchical tree structure with editing indicators
            const treeData = tree.getAllEpics().map(epicNode => ({
                id: epicNode.id,
                title: epicNode.name,
                type: 'epic' as const,
                status: epicNode.status,
                storyPoints: epicNode.storyPoints,
                order: (epicNode.data as any)?.order || 0,
                createdOn: (epicNode.data as any)?.createdOn || now,
                lastUpdatedOn: (epicNode.data as any)?.lastUpdatedOn || now,
                editingIndicator: this.planningManager.getEditingIndicator(epicNode.id),
                isLocked: this.planningManager.isItemLocked(epicNode.id),
                lockOwner: this.planningManager.getItemLockOwner(epicNode.id),
                children: epicNode.children.map(storyNode => ({
                    id: storyNode.id,
                    title: storyNode.name,
                    type: 'story' as const,
                    status: storyNode.status,
                    storyPoints: storyNode.storyPoints,
                    order: (storyNode.data as any)?.order || 0,
                    createdOn: (storyNode.data as any)?.createdOn || now,
                    lastUpdatedOn: (storyNode.data as any)?.lastUpdatedOn || now,
                    editingIndicator: this.planningManager.getEditingIndicator(storyNode.id),
                    isLocked: this.planningManager.isItemLocked(storyNode.id),
                    lockOwner: this.planningManager.getItemLockOwner(storyNode.id),
                    children: storyNode.children.map(taskNode => ({
                        id: taskNode.id,
                        title: taskNode.name,
                        type: 'task' as const,
                        status: taskNode.status,
                        storyPoints: 0,
                        order: (taskNode.data as any)?.order || 0,
                        createdOn: (taskNode.data as any)?.createdOn || now,
                        lastUpdatedOn: (taskNode.data as any)?.lastUpdatedOn || now,
                        editingIndicator: this.planningManager.getEditingIndicator(taskNode.id),
                        isLocked: this.planningManager.isItemLocked(taskNode.id),
                        lockOwner: this.planningManager.getItemLockOwner(taskNode.id),
                        children: []
                    }))
                }))
            }));

            this.postMessage({
                type: 'treeData',
                payload: {
                    tree: treeData
                }
            });
        } catch (error) {
            this.logger.error('Error sending tree data to WebView', { error });
            this.postMessage({
                type: 'error',
                payload: {
                    message: 'Failed to load planning tree'
                }
            });
        }
    }

    /**
     * Send settings update to webview
     */
    private _sendSettingsUpdate(): void {
        const config = vscode.workspace.getConfiguration('aicc');
        const showComponentReferences = config.get<boolean>('ui.showComponentReferences', false);
        
        this.postMessage({
            type: 'settingsUpdate',
            payload: {
                showComponentReferences
            }
        });
    }

    /**
     * Get webview HTML content
     */
    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        // All bundle scripts that need to be loaded (order matters - dependencies first)
        const bundles = [
            'bootstrap.bundle.js',
            'charts.bundle.js',
            'tabulator.bundle.js',
            'tagify.bundle.js',
            'utils.bundle.js',
            'vendor.bundle.js',
            'main.bundle.js'
        ];

        const scriptUris = bundles.map(bundle => 
            webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview', bundle))
        );

        // Use a nonce to whitelist which scripts can be run
        const nonce = this._getNonce();

        // Generate script tags for all bundles
        const scriptTags = scriptUris.map(uri => 
            `<script nonce="${nonce}" src="${uri}" defer></script>`
        ).join('\n    ');

        this.logger.debug('Loading WebView with bundles', { bundles, nonce });

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data: blob:; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource} data:; script-src 'nonce-${nonce}' 'unsafe-eval'; connect-src ${webview.cspSource} https:; worker-src blob:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Command Center</title>
</head>
<body>
    <div id="root"></div>
    ${scriptTags}
</body>
</html>`;
    }

    /**
     * Generate nonce for CSP
     */
    private _getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
