/**
 * SharePoint Online Integration
 *
 * Implements the IIntegration interface for SharePoint Online via Microsoft Graph API.
 * Provides site management, list CRUD, document library operations, and file management.
 */

import { logger } from '../../logger';
import {
    IIntegration,
    IntegrationType,
    IntegrationState,
    SyncOptions,
    SyncResult
} from '../integrationManager';
import { SharePointClient } from './sharepointClient';
import { SharePointConfig } from './types';

export class SharePointIntegration implements IIntegration {
    private client: SharePointClient | null = null;
    private config: SharePointConfig;
    private state: IntegrationState = {
        status: 'disconnected',
        syncing: false
    };

    constructor(config: SharePointConfig) {
        this.config = config;
    }

    /** Get integration type identifier */
    getType(): IntegrationType {
        return 'sharepoint';
    }

    /** Get display name */
    getName(): string {
        return 'SharePoint Online';
    }

    /** Get description */
    getDescription(): string {
        return 'SharePoint Online integration for site management, lists, and document libraries via Microsoft Graph API.';
    }

    /** Get icon name */
    getIcon(): string {
        return 'file-directory';
    }

    /**
     * Initialize the SharePoint integration
     */
    async initialize(): Promise<boolean> {
        try {
            if (!this.config.enabled) {
                logger.info('SharePoint integration disabled', { component: 'SharePointIntegration' });
                this.state.status = 'disabled';
                return false;
            }

            if (!this.config.tenantId || !this.config.clientId) {
                logger.warn('Incomplete SharePoint configuration', { component: 'SharePointIntegration' });
                this.state.status = 'error';
                this.state.lastError = 'Missing required configuration: tenantId or clientId';
                return false;
            }

            this.client = SharePointClient.getInstance(this.config);

            const testResult = await this.client.testConnection();
            if (!testResult.success) {
                logger.error('SharePoint connection test failed', {
                    component: 'SharePointIntegration',
                    message: testResult.message
                });
                this.state.status = 'error';
                this.state.lastError = testResult.message;
                return false;
            }

            this.state.status = 'connected';
            this.state.lastConnected = new Date();

            logger.info('SharePoint integration initialized', {
                component: 'SharePointIntegration',
                message: testResult.message
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to initialize SharePoint integration', {
                component: 'SharePointIntegration',
                error: error.message
            });
            this.state.status = 'error';
            this.state.lastError = error.message;
            return false;
        }
    }

    /**
     * Test connection to Microsoft Graph for SharePoint
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.client) {
            return { success: false, message: 'SharePoint client not initialized' };
        }
        return this.client.testConnection();
    }

    /** Get current integration state */
    getState(): IntegrationState {
        return { ...this.state };
    }

    /**
     * Sync list items (can be extended to sync with PLAN.json)
     */
    async sync(options: SyncOptions): Promise<SyncResult> {
        const startTime = Date.now();

        if (!this.client) {
            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: 0,
                errors: ['SharePoint client not initialized'],
                duration: 0,
                timestamp: new Date()
            };
        }

        try {
            this.state.syncing = true;

            logger.info('Starting SharePoint sync', {
                component: 'SharePointIntegration',
                direction: options.direction,
                force: options.force
            });

            // If a default site is configured, sync its lists
            const siteId = this.config.defaultSiteId;
            let itemsSynced = 0;

            if (siteId) {
                const lists = await this.client.listLists(siteId);
                itemsSynced = lists.length;
            }

            this.state.syncing = false;
            this.state.lastSync = new Date();

            logger.info('SharePoint sync completed', {
                component: 'SharePointIntegration',
                itemsSynced
            });

            return {
                success: true,
                itemsSynced,
                itemsFailed: 0,
                errors: [],
                duration: Date.now() - startTime,
                timestamp: new Date()
            };
        } catch (error: any) {
            this.state.syncing = false;

            logger.error('SharePoint sync failed', {
                component: 'SharePointIntegration',
                error: error.message
            });

            return {
                success: false,
                itemsSynced: 0,
                itemsFailed: 0,
                errors: [error.message],
                duration: Date.now() - startTime,
                timestamp: new Date()
            };
        }
    }

    /**
     * Execute a SharePoint action
     * @param action - Action name from getAvailableActions()
     * @param params - Action parameters
     */
    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        if (!this.client) {
            throw new Error('SharePoint client not initialized. Call initialize() first.');
        }

        const siteId = params.siteId || this.config.defaultSiteId;

        logger.info('Executing SharePoint action', {
            component: 'SharePointIntegration',
            action
        });

        switch (action) {
            case 'getSite':
                return this.client.getSite(siteId);

            case 'searchSites':
                return this.client.searchSites(params.query);

            case 'listLists':
                return this.client.listLists(siteId);

            case 'createList':
                return this.client.createList(
                    siteId,
                    params.displayName,
                    params.template
                );

            case 'getListItems':
                return this.client.getListItems(siteId, params.listId);

            case 'createListItem':
                return this.client.createListItem(
                    siteId,
                    params.listId,
                    params.fields
                );

            case 'updateListItem':
                return this.client.updateListItem(
                    siteId,
                    params.listId,
                    params.itemId,
                    params.fields
                );

            case 'deleteListItem':
                return this.client.deleteListItem(
                    siteId,
                    params.listId,
                    params.itemId
                );

            case 'uploadFile':
                return this.client.uploadFile(
                    siteId,
                    params.driveId,
                    params.folderPath,
                    params.fileName,
                    params.content
                );

            case 'downloadFile':
                return this.client.downloadFile(
                    siteId,
                    params.driveId,
                    params.itemId
                );

            case 'listDriveItems':
                return this.client.listDriveItems(
                    siteId,
                    params.driveId,
                    params.folderPath
                );

            default:
                throw new Error(`Unknown SharePoint action: ${action}`);
        }
    }

    /**
     * Get list of available actions
     */
    getAvailableActions(): string[] {
        return [
            'getSite',
            'searchSites',
            'listLists',
            'createList',
            'getListItems',
            'createListItem',
            'updateListItem',
            'deleteListItem',
            'uploadFile',
            'downloadFile',
            'listDriveItems'
        ];
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        logger.info('Disposing SharePoint integration', { component: 'SharePointIntegration' });
        SharePointClient.resetInstance();
        this.client = null;
        this.state.status = 'disconnected';
    }
}
