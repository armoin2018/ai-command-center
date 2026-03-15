/**
 * Microsoft Teams Integration
 *
 * Implements the IIntegration interface for Microsoft Teams via Microsoft Graph API.
 * Provides channel management, messaging, and webhook subscription operations.
 */

import { logger } from '../../logger';
import {
    IIntegration,
    IntegrationType,
    IntegrationState,
    SyncOptions,
    SyncResult
} from '../integrationManager';
import { TeamsClient } from './teamsClient';
import { TeamsConfig } from './types';

export class TeamsIntegration implements IIntegration {
    private client: TeamsClient | null = null;
    private config: TeamsConfig;
    private state: IntegrationState = {
        status: 'disconnected',
        syncing: false
    };

    constructor(config: TeamsConfig) {
        this.config = config;
    }

    /** Get integration type identifier */
    getType(): IntegrationType {
        return 'teams';
    }

    /** Get display name */
    getName(): string {
        return 'Microsoft Teams';
    }

    /** Get description */
    getDescription(): string {
        return 'Microsoft Teams integration for channel management, messaging, and webhooks via Microsoft Graph API.';
    }

    /** Get icon name */
    getIcon(): string {
        return 'comment-discussion';
    }

    /**
     * Initialize the Teams integration
     */
    async initialize(): Promise<boolean> {
        try {
            if (!this.config.enabled) {
                logger.info('Teams integration disabled', { component: 'TeamsIntegration' });
                this.state.status = 'disabled';
                return false;
            }

            if (!this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
                logger.warn('Incomplete Teams configuration', { component: 'TeamsIntegration' });
                this.state.status = 'error';
                this.state.lastError = 'Missing required configuration: tenantId, clientId, or clientSecret';
                return false;
            }

            this.client = TeamsClient.getInstance(this.config);

            const testResult = await this.client.testConnection();
            if (!testResult.success) {
                logger.error('Teams connection test failed', {
                    component: 'TeamsIntegration',
                    message: testResult.message
                });
                this.state.status = 'error';
                this.state.lastError = testResult.message;
                return false;
            }

            this.state.status = 'connected';
            this.state.lastConnected = new Date();

            logger.info('Teams integration initialized', {
                component: 'TeamsIntegration',
                message: testResult.message
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to initialize Teams integration', {
                component: 'TeamsIntegration',
                error: error.message
            });
            this.state.status = 'error';
            this.state.lastError = error.message;
            return false;
        }
    }

    /**
     * Test connection to Microsoft Graph
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.client) {
            return { success: false, message: 'Teams client not initialized' };
        }
        return this.client.testConnection();
    }

    /** Get current integration state */
    getState(): IntegrationState {
        return { ...this.state };
    }

    /**
     * Sync is a no-op for Teams (messaging integration, not data sync)
     */
    async sync(_options: SyncOptions): Promise<SyncResult> {
        logger.info('Teams sync is a no-op (messaging integration)', {
            component: 'TeamsIntegration'
        });

        return {
            success: true,
            itemsSynced: 0,
            itemsFailed: 0,
            errors: [],
            duration: 0,
            timestamp: new Date()
        };
    }

    /**
     * Execute a Teams action
     * @param action - Action name from getAvailableActions()
     * @param params - Action parameters
     */
    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        if (!this.client) {
            throw new Error('Teams client not initialized. Call initialize() first.');
        }

        logger.info('Executing Teams action', {
            component: 'TeamsIntegration',
            action
        });

        switch (action) {
            case 'listChannels':
                return this.client.listChannels(
                    params.teamId || this.config.defaultTeamId!
                );

            case 'createChannel':
                return this.client.createChannel(
                    params.teamId || this.config.defaultTeamId!,
                    params.displayName,
                    params.description
                );

            case 'sendChannelMessage':
                return this.client.sendChannelMessage(
                    params.teamId || this.config.defaultTeamId!,
                    params.channelId,
                    params.content
                );

            case 'listChannelMessages':
                return this.client.listChannelMessages(
                    params.teamId || this.config.defaultTeamId!,
                    params.channelId,
                    params.top
                );

            case 'sendChatMessage':
                return this.client.sendChatMessage(
                    params.chatId,
                    params.content
                );

            case 'createWebhook':
                return this.client.createWebhookSubscription(
                    params.resource,
                    params.changeType,
                    params.notificationUrl
                );

            case 'deleteWebhook':
                return this.client.deleteWebhookSubscription(
                    params.subscriptionId
                );

            default:
                throw new Error(`Unknown Teams action: ${action}`);
        }
    }

    /**
     * Get list of available actions
     */
    getAvailableActions(): string[] {
        return [
            'sendChannelMessage',
            'listChannels',
            'createChannel',
            'listChannelMessages',
            'sendChatMessage',
            'createWebhook',
            'deleteWebhook'
        ];
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        logger.info('Disposing Teams integration', { component: 'TeamsIntegration' });
        TeamsClient.resetInstance();
        this.client = null;
        this.state.status = 'disconnected';
    }
}
