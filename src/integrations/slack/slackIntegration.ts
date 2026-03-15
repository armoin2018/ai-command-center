/**
 * Slack Integration
 *
 * Implements the IIntegration interface for Slack via the Slack Web API.
 * Provides channel management, messaging, reactions, and slash command support.
 */

import { logger } from '../../logger';
import {
    IIntegration,
    IntegrationType,
    IntegrationState,
    SyncOptions,
    SyncResult
} from '../integrationManager';
import { SlackClient } from './slackClient';
import { SlackConfig } from './types';

export class SlackIntegration implements IIntegration {
    private client: SlackClient | null = null;
    private config: SlackConfig;
    private state: IntegrationState = {
        status: 'disconnected',
        syncing: false
    };

    constructor(config: SlackConfig) {
        this.config = config;
    }

    /** Get integration type identifier */
    getType(): IntegrationType {
        return 'slack';
    }

    /** Get display name */
    getName(): string {
        return 'Slack';
    }

    /** Get description */
    getDescription(): string {
        return 'Slack integration for channel management, messaging, reactions, and slash commands via Slack Web API.';
    }

    /** Get icon name */
    getIcon(): string {
        return 'comment';
    }

    /**
     * Initialize the Slack integration
     */
    async initialize(): Promise<boolean> {
        try {
            if (!this.config.enabled) {
                logger.info('Slack integration disabled', { component: 'SlackIntegration' });
                this.state.status = 'disabled';
                return false;
            }

            if (!this.config.botToken) {
                logger.warn('Incomplete Slack configuration', { component: 'SlackIntegration' });
                this.state.status = 'error';
                this.state.lastError = 'Missing required configuration: botToken';
                return false;
            }

            this.client = SlackClient.getInstance(this.config);

            const testResult = await this.client.testConnection();
            if (!testResult.success) {
                logger.error('Slack connection test failed', {
                    component: 'SlackIntegration',
                    message: testResult.message
                });
                this.state.status = 'error';
                this.state.lastError = testResult.message;
                return false;
            }

            this.state.status = 'connected';
            this.state.lastConnected = new Date();

            logger.info('Slack integration initialized', {
                component: 'SlackIntegration',
                message: testResult.message
            });

            return true;
        } catch (error: any) {
            logger.error('Failed to initialize Slack integration', {
                component: 'SlackIntegration',
                error: error.message
            });
            this.state.status = 'error';
            this.state.lastError = error.message;
            return false;
        }
    }

    /**
     * Test connection by calling Slack auth.test
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        if (!this.client) {
            return { success: false, message: 'Slack client not initialized' };
        }
        return this.client.testConnection();
    }

    /** Get current integration state */
    getState(): IntegrationState {
        return { ...this.state };
    }

    /**
     * Sync is a no-op for Slack (messaging integration, not data sync)
     */
    async sync(_options: SyncOptions): Promise<SyncResult> {
        logger.info('Slack sync is a no-op (messaging integration)', {
            component: 'SlackIntegration'
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
     * Execute a Slack action
     * @param action - Action name from getAvailableActions()
     * @param params - Action parameters
     */
    async executeAction(action: string, params: Record<string, any>): Promise<any> {
        if (!this.client) {
            throw new Error('Slack client not initialized. Call initialize() first.');
        }

        const channel = params.channel || this.config.defaultChannelId;

        logger.info('Executing Slack action', {
            component: 'SlackIntegration',
            action
        });

        switch (action) {
            case 'sendMessage':
                return this.client.sendMessage(
                    channel,
                    params.text,
                    params.blocks
                );

            case 'listChannels':
                return this.client.listChannels(
                    params.types,
                    params.limit
                );

            case 'createChannel':
                return this.client.createChannel(
                    params.name,
                    params.isPrivate
                );

            case 'updateMessage':
                return this.client.updateMessage(
                    channel,
                    params.ts,
                    params.text
                );

            case 'deleteMessage':
                return this.client.deleteMessage(
                    channel,
                    params.ts
                );

            case 'getHistory':
                return this.client.getChannelHistory(
                    channel,
                    params.limit
                );

            case 'addReaction':
                return this.client.addReaction(
                    channel,
                    params.timestamp,
                    params.name
                );

            case 'getUserInfo':
                return this.client.getUserInfo(params.userId);

            default:
                throw new Error(`Unknown Slack action: ${action}`);
        }
    }

    /**
     * Get list of available actions
     */
    getAvailableActions(): string[] {
        return [
            'sendMessage',
            'listChannels',
            'createChannel',
            'updateMessage',
            'deleteMessage',
            'getHistory',
            'addReaction'
        ];
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        logger.info('Disposing Slack integration', { component: 'SlackIntegration' });
        SlackClient.resetInstance();
        this.client = null;
        this.state.status = 'disconnected';
    }
}
