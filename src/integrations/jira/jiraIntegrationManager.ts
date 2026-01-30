/**
 * Jira Integration Manager
 * 
 * Main integration controller managing Jira sync, webhooks, and configuration
 */

import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { ConfigManager } from '../../configManager';
import { PlanningManager } from '../../planning/planningManager';
import { WorkspaceManager } from '../../planning/workspaceManager';
import { JiraClient } from './jiraClient';
import { SyncEngine } from './syncEngine';
import { WebhookHandler } from './webhookHandler';
import { logger } from '../../logger';
import {
    JiraConfig,
    SyncOptions,
    SyncResult,
    SyncState
} from './types';

export class JiraIntegrationManager extends EventEmitter {
    private static instance: JiraIntegrationManager;
    private configManager: ConfigManager;
    private planningManager: PlanningManager;
    private workspaceManager: WorkspaceManager;
    private jiraClient: JiraClient | null = null;
    private syncEngine: SyncEngine | null = null;
    private webhookHandler: WebhookHandler | null = null;
    private autoSyncTimer: NodeJS.Timeout | null = null;
    private isInitialized: boolean = false;

    private constructor(
        configManager: ConfigManager,
        planningManager: PlanningManager,
        workspaceManager: WorkspaceManager
    ) {
        super();
        this.configManager = configManager;
        this.planningManager = planningManager;
        this.workspaceManager = workspaceManager;

        logger.info('JiraIntegrationManager created', { component: 'JiraIntegrationManager' });
    }

    public static getInstance(
        configManager?: ConfigManager,
        planningManager?: PlanningManager,
        workspaceManager?: WorkspaceManager
    ): JiraIntegrationManager {
        if (!JiraIntegrationManager.instance && configManager && planningManager && workspaceManager) {
            JiraIntegrationManager.instance = new JiraIntegrationManager(
                configManager,
                planningManager,
                workspaceManager
            );
        } else if (!JiraIntegrationManager.instance) {
            throw new Error('JiraIntegrationManager not initialized. Provide dependencies on first call.');
        }
        return JiraIntegrationManager.instance;
    }

    /**
     * Initialize Jira integration with config
     */
    async initialize(): Promise<boolean> {
        try {
            const config = this.configManager.getConfig();
            const jiraConfig = config.integrations.jira;

            if (!jiraConfig || !jiraConfig.enabled) {
                logger.info('Jira integration disabled', { component: 'JiraIntegrationManager' });
                return false;
            }

            // Validate config
            if (!jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken || !jiraConfig.projectKey) {
                logger.warn('Incomplete Jira configuration', { component: 'JiraIntegrationManager' });
                return false;
            }

            // Initialize Jira client
            this.jiraClient = JiraClient.getInstance(jiraConfig);

            // Test connection
            const testResult = await this.jiraClient.testConnection();
            if (!testResult.success) {
                logger.error('Jira connection test failed', {
                    component: 'JiraIntegrationManager',
                    message: testResult.message
                });
                return false;
            }

            logger.info('Jira connection successful', {
                component: 'JiraIntegrationManager',
                message: testResult.message
            });

            // Initialize sync engine
            this.syncEngine = SyncEngine.getInstance(
                this.planningManager,
                this.jiraClient,
                this.workspaceManager
            );

            // Setup sync event listeners
            this.syncEngine.on('sync:started', (options) => {
                this.emit('sync:started', options);
            });

            this.syncEngine.on('sync:completed', (result) => {
                this.emit('sync:completed', result);
            });

            this.syncEngine.on('sync:failed', (error) => {
                this.emit('sync:failed', error);
            });

            // Initialize webhook handler if enabled
            if (jiraConfig.webhookEnabled) {
                this.webhookHandler = new WebhookHandler(
                    jiraConfig.webhookSecret || '',
                    this.syncEngine
                );
                await this.webhookHandler.start();
            }

            // Start auto-sync if enabled
            if (jiraConfig.autoSync) {
                this.startAutoSync(jiraConfig.syncInterval);
            }

            this.isInitialized = true;
            this.emit('initialized');

            logger.info('Jira integration initialized', { component: 'JiraIntegrationManager' });
            return true;
        } catch (error: any) {
            logger.error('Failed to initialize Jira integration', {
                component: 'JiraIntegrationManager',
                error: error.message
            });
            return false;
        }
    }

    /**
     * Perform manual sync
     */
    async sync(options?: Partial<SyncOptions>): Promise<SyncResult> {
        if (!this.isInitialized || !this.syncEngine) {
            throw new Error('Jira integration not initialized');
        }

        const config = this.configManager.getConfig().integrations.jira;
        const syncOptions: SyncOptions = {
            strategy: options?.strategy || config.syncStrategy || 'bidirectional',
            conflictResolution: options?.conflictResolution || config.conflictResolution || 'manual',
            dryRun: options?.dryRun || false,
            itemTypes: options?.itemTypes,
            forceSync: options?.forceSync || false
        };

        return await this.syncEngine.sync(syncOptions);
    }

    /**
     * Get sync state
     */
    getSyncState(): SyncState | null {
        if (!this.syncEngine) {
            return null;
        }
        return this.syncEngine.getSyncState();
    }

    /**
     * Test Jira connection
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.jiraClient) {
            const config = this.configManager.getConfig().integrations.jira;
            if (!config || !config.enabled) {
                return {
                    success: false,
                    message: 'Jira integration is disabled'
                };
            }

            this.jiraClient = JiraClient.getInstance(config);
        }

        return await this.jiraClient.testConnection();
    }

    /**
     * Start auto-sync
     */
    private startAutoSync(intervalMinutes: number): void {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
        }

        const intervalMs = intervalMinutes * 60 * 1000;
        this.autoSyncTimer = setInterval(async () => {
            logger.info('Auto-sync triggered', { component: 'JiraIntegrationManager' });
            try {
                await this.sync();
            } catch (error: any) {
                logger.error('Auto-sync failed', {
                    component: 'JiraIntegrationManager',
                    error: error.message
                });
            }
        }, intervalMs);

        logger.info('Auto-sync started', {
            component: 'JiraIntegrationManager',
            interval: `${intervalMinutes} minutes`
        });
    }

    /**
     * Stop auto-sync
     */
    stopAutoSync(): void {
        if (this.autoSyncTimer) {
            clearInterval(this.autoSyncTimer);
            this.autoSyncTimer = null;
            logger.info('Auto-sync stopped', { component: 'JiraIntegrationManager' });
        }
    }

    /**
     * Update Jira configuration
     */
    async updateConfig(jiraConfig: Partial<JiraConfig>): Promise<boolean> {
        try {
            const currentConfig = this.configManager.getConfig();
            const updatedConfig = {
                ...currentConfig,
                integrations: {
                    ...currentConfig.integrations,
                    jira: {
                        ...currentConfig.integrations.jira,
                        ...jiraConfig
                    }
                }
            };

            // Save to workspace settings
            await this.saveConfigToWorkspace(updatedConfig.integrations.jira);

            // Re-initialize if enabled
            if (jiraConfig.enabled !== false) {
                await this.dispose();
                this.configManager.reload();
                await this.initialize();
            } else {
                await this.dispose();
            }

            return true;
        } catch (error: any) {
            logger.error('Failed to update Jira config', {
                component: 'JiraIntegrationManager',
                error: error.message
            });
            return false;
        }
    }

    /**
     * Save Jira config to workspace settings
     */
    private async saveConfigToWorkspace(jiraConfig: JiraConfig): Promise<void> {
        const config = vscode.workspace.getConfiguration('aicc');
        await config.update('jira.enabled', jiraConfig.enabled, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.baseUrl', jiraConfig.baseUrl, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.email', jiraConfig.email, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.apiToken', jiraConfig.apiToken, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.projectKey', jiraConfig.projectKey, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.syncStrategy', jiraConfig.syncStrategy, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.conflictResolution', jiraConfig.conflictResolution, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.autoSync', jiraConfig.autoSync, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.syncInterval', jiraConfig.syncInterval, vscode.ConfigurationTarget.Workspace);
        await config.update('jira.webhookEnabled', jiraConfig.webhookEnabled, vscode.ConfigurationTarget.Workspace);
    }

    /**
     * Get Jira projects
     */
    async getProjects(): Promise<any[]> {
        if (!this.jiraClient) {
            throw new Error('Jira client not initialized');
        }
        return await this.jiraClient.getProjects();
    }

    /**
     * Get issue types for project
     */
    async getIssueTypes(projectKey?: string): Promise<any[]> {
        if (!this.jiraClient) {
            throw new Error('Jira client not initialized');
        }
        return await this.jiraClient.getIssueTypes(projectKey);
    }

    /**
     * Export sync mappings
     */
    exportMappings(): any[] {
        if (!this.syncEngine) {
            return [];
        }
        return this.syncEngine.getMappings();
    }

    /**
     * Get webhook URL
     */
    getWebhookUrl(): string | null {
        if (!this.webhookHandler) {
            return null;
        }
        return this.webhookHandler.getWebhookUrl();
    }

    /**
     * Dispose and cleanup
     */
    async dispose(): Promise<void> {
        logger.info('Disposing Jira integration', { component: 'JiraIntegrationManager' });

        this.stopAutoSync();

        if (this.webhookHandler) {
            await this.webhookHandler.stop();
            this.webhookHandler = null;
        }

        if (this.syncEngine) {
            this.syncEngine.dispose();
            this.syncEngine = null;
        }

        if (this.jiraClient) {
            JiraClient.resetInstance();
            this.jiraClient = null;
        }

        this.isInitialized = false;
        this.removeAllListeners();

        logger.info('Jira integration disposed', { component: 'JiraIntegrationManager' });
    }
}
