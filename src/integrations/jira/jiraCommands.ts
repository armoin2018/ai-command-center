/**
 * Jira Integration Commands
 * 
 * VS Code commands for Jira integration features
 */

import * as vscode from 'vscode';
import { JiraIntegrationManager } from './jiraIntegrationManager';
import { logger } from '../../logger';

export class JiraCommands {
    private jiraManager: JiraIntegrationManager;

    constructor(jiraManager: JiraIntegrationManager) {
        this.jiraManager = jiraManager;
    }

    /**
     * Register all Jira commands
     */
    registerCommands(context: vscode.ExtensionContext): void {
        context.subscriptions.push(
            vscode.commands.registerCommand('aicc.jira.initialize', () => this.initializeJira()),
            vscode.commands.registerCommand('aicc.jira.testConnection', () => this.testConnection()),
            vscode.commands.registerCommand('aicc.jira.sync', () => this.sync()),
            vscode.commands.registerCommand('aicc.jira.syncPush', () => this.syncPush()),
            vscode.commands.registerCommand('aicc.jira.syncPull', () => this.syncPull()),
            vscode.commands.registerCommand('aicc.jira.configure', () => this.configure()),
            vscode.commands.registerCommand('aicc.jira.viewSyncStatus', () => this.viewSyncStatus()),
            vscode.commands.registerCommand('aicc.jira.viewMappings', () => this.viewMappings()),
            vscode.commands.registerCommand('aicc.jira.resolveConflicts', () => this.resolveConflicts()),
            vscode.commands.registerCommand('aicc.jira.disable', () => this.disable())
        );

        logger.info('Jira commands registered', { component: 'JiraCommands' });
    }

    /**
     * Initialize Jira integration
     */
    private async initializeJira(): Promise<void> {
        try {
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Initializing Jira integration...',
                    cancellable: false
                },
                async () => {
                    const success = await this.jiraManager.initialize();
                    if (success) {
                        vscode.window.showInformationMessage('Jira integration initialized successfully');
                    } else {
                        vscode.window.showWarningMessage('Failed to initialize Jira integration. Check configuration.');
                    }
                }
            );
        } catch (error: any) {
            vscode.window.showErrorMessage(`Jira initialization failed: ${error.message}`);
        }
    }

    /**
     * Test Jira connection
     */
    private async testConnection(): Promise<void> {
        try {
            const result = await this.jiraManager.testConnection();
            if (result.success) {
                vscode.window.showInformationMessage(`Jira connection successful: ${result.message}`);
            } else {
                vscode.window.showErrorMessage(`Jira connection failed: ${result.message}`);
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Connection test error: ${error.message}`);
        }
    }

    /**
     * Perform bidirectional sync
     */
    private async sync(): Promise<void> {
        try {
            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Syncing with Jira...',
                    cancellable: false
                },
                async () => {
                    return await this.jiraManager.sync();
                }
            );

            this.showSyncResult(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Sync failed: ${error.message}`);
        }
    }

    /**
     * Push to Jira
     */
    private async syncPush(): Promise<void> {
        try {
            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pushing to Jira...',
                    cancellable: false
                },
                async () => {
                    return await this.jiraManager.sync({ strategy: 'push' });
                }
            );

            this.showSyncResult(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Push failed: ${error.message}`);
        }
    }

    /**
     * Pull from Jira
     */
    private async syncPull(): Promise<void> {
        try {
            const result = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pulling from Jira...',
                    cancellable: false
                },
                async () => {
                    return await this.jiraManager.sync({ strategy: 'pull' });
                }
            );

            this.showSyncResult(result);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Pull failed: ${error.message}`);
        }
    }

    /**
     * Configure Jira integration
     */
    private async configure(): Promise<void> {
        const baseUrl = await vscode.window.showInputBox({
            prompt: 'Enter Jira base URL',
            placeHolder: 'https://your-domain.atlassian.net',
            ignoreFocusOut: true
        });

        if (!baseUrl) return;

        const email = await vscode.window.showInputBox({
            prompt: 'Enter your Jira email',
            placeHolder: 'user@example.com',
            ignoreFocusOut: true
        });

        if (!email) return;

        const apiToken = await vscode.window.showInputBox({
            prompt: 'Enter your Jira API token',
            password: true,
            ignoreFocusOut: true
        });

        if (!apiToken) return;

        const projectKey = await vscode.window.showInputBox({
            prompt: 'Enter Jira project key',
            placeHolder: 'PROJ',
            ignoreFocusOut: true
        });

        if (!projectKey) return;

        const syncStrategy = await vscode.window.showQuickPick(
            ['bidirectional', 'push', 'pull'],
            {
                placeHolder: 'Select sync strategy',
                ignoreFocusOut: true
            }
        );

        if (!syncStrategy) return;

        try {
            const success = await this.jiraManager.updateConfig({
                enabled: true,
                baseUrl,
                email,
                apiToken,
                projectKey,
                syncStrategy: syncStrategy as any,
                conflictResolution: 'manual',
                autoSync: false,
                syncInterval: 15,
                webhookEnabled: false
            });

            if (success) {
                vscode.window.showInformationMessage('Jira configuration saved successfully');
            } else {
                vscode.window.showErrorMessage('Failed to save Jira configuration');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Configuration error: ${error.message}`);
        }
    }

    /**
     * View sync status
     */
    private async viewSyncStatus(): Promise<void> {
        const state = this.jiraManager.getSyncState();
        if (!state) {
            vscode.window.showInformationMessage('Jira integration not initialized');
            return;
        }

        const lastSync = state.lastSyncTime > 0
            ? new Date(state.lastSyncTime).toLocaleString()
            : 'Never';

        const message = [
            `Last Sync: ${lastSync}`,
            `Status: ${state.inProgress ? 'In Progress' : 'Idle'}`,
            `Pending Conflicts: ${state.pendingConflicts.length}`
        ].join('\n');

        vscode.window.showInformationMessage(message);

        if (state.lastSyncResult) {
            const result = state.lastSyncResult;
            const details = [
                `Items Processed: ${result.itemsProcessed}`,
                `Items Synced: ${result.itemsSynced}`,
                `Conflicts: ${result.conflicts.length}`,
                `Errors: ${result.errors.length}`,
                `Duration: ${result.duration}ms`
            ].join('\n');

            vscode.window.showInformationMessage(details);
        }
    }

    /**
     * View sync mappings
     */
    private async viewMappings(): Promise<void> {
        const mappings = this.jiraManager.exportMappings();
        
        if (mappings.length === 0) {
            vscode.window.showInformationMessage('No sync mappings found');
            return;
        }

        const items = mappings.map(m => ({
            label: m.jiraKey,
            description: m.itemType,
            detail: `AICC ID: ${m.aiccId} | Last Synced: ${new Date(m.lastSyncedAt).toLocaleString()}`
        }));

        await vscode.window.showQuickPick(items, {
            placeHolder: 'Sync Mappings',
            ignoreFocusOut: true
        });
    }

    /**
     * Resolve conflicts
     */
    private async resolveConflicts(): Promise<void> {
        const state = this.jiraManager.getSyncState();
        if (!state || state.pendingConflicts.length === 0) {
            vscode.window.showInformationMessage('No pending conflicts');
            return;
        }

        const conflict = state.pendingConflicts[0];
        const resolution = await vscode.window.showQuickPick(
            [
                { label: 'Keep Local', value: 'local-wins' },
                { label: 'Keep Remote', value: 'remote-wins' }
            ],
            {
                placeHolder: `Resolve conflict for ${conflict.itemId}`,
                ignoreFocusOut: true
            }
        );

        if (!resolution) return;

        try {
            // Sync with the chosen resolution
            await this.jiraManager.sync({
                conflictResolution: resolution.value as any
            });

            vscode.window.showInformationMessage('Conflict resolved');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to resolve conflict: ${error.message}`);
        }
    }

    /**
     * Disable Jira integration
     */
    private async disable(): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'Disable Jira integration?',
            { modal: true },
            'Yes'
        );

        if (confirm !== 'Yes') return;

        try {
            await this.jiraManager.updateConfig({ enabled: false });
            vscode.window.showInformationMessage('Jira integration disabled');
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to disable: ${error.message}`);
        }
    }

    /**
     * Show sync result
     */
    private showSyncResult(result: any): void {
        if (result.success) {
            vscode.window.showInformationMessage(
                `Sync completed: ${result.itemsSynced} items synced, ${result.conflicts.length} conflicts`
            );
        } else {
            vscode.window.showErrorMessage(
                `Sync failed: ${result.errors.length} errors`
            );
        }

        if (result.errors.length > 0) {
            const error = result.errors[0];
            vscode.window.showErrorMessage(`Error: ${error.error}`);
        }
    }
}
