/**
 * Microsoft Teams API Client
 *
 * Microsoft Graph API client for Teams operations with rate limiting,
 * retry logic, and structured error handling.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../logger';
import { ExternalError } from '../../errors/customErrors';
import {
    TeamsConfig,
    TeamsChannel,
    TeamsMessage,
    TeamsChatMessage,
    TeamsWebhookSubscription
} from './types';

interface RateLimiter {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

export class TeamsClient {
    private static instance: TeamsClient;
    private axiosInstance: AxiosInstance;
    private rateLimiter: RateLimiter;
    private config: TeamsConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY_MS = 1000;
    private readonly RATE_LIMIT = 120; // requests per minute

    private constructor(config: TeamsConfig) {
        this.config = config;

        this.rateLimiter = {
            tokens: this.RATE_LIMIT,
            lastRefill: Date.now(),
            maxTokens: this.RATE_LIMIT,
            refillRate: this.RATE_LIMIT / 60
        };

        this.axiosInstance = axios.create({
            baseURL: 'https://graph.microsoft.com/v1.0',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        this.setupInterceptors();

        logger.info('TeamsClient initialized', {
            component: 'TeamsClient',
            tenantId: config.tenantId
        });
    }

    /**
     * Get singleton instance of TeamsClient
     * @param config - Teams configuration (required on first call)
     */
    public static getInstance(config?: TeamsConfig): TeamsClient {
        if (!TeamsClient.instance && config) {
            TeamsClient.instance = new TeamsClient(config);
        } else if (!TeamsClient.instance) {
            throw new Error('TeamsClient not initialized. Provide config on first call.');
        }
        return TeamsClient.instance;
    }

    /** Reset singleton instance (for testing) */
    public static resetInstance(): void {
        TeamsClient.instance = null as any;
    }

    // ========================================================================
    // Auth
    // ========================================================================

    /**
     * Acquire an OAuth2 access token via client credentials flow
     */
    private async acquireAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

            const params = new URLSearchParams();
            params.append('client_id', this.config.clientId);
            params.append('client_secret', this.config.clientSecret);
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('grant_type', 'client_credentials');

            const response = await axios.post(tokenUrl, params, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            this.accessToken = response.data.access_token;
            // Expire 5 minutes early to avoid edge cases
            this.tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

            logger.info('Teams OAuth token acquired', { component: 'TeamsClient' });
            return this.accessToken!;
        } catch (error: any) {
            logger.error('Failed to acquire Teams OAuth token', {
                component: 'TeamsClient',
                error: error.message
            });
            throw new ExternalError('Failed to acquire OAuth token', 'Teams', 401);
        }
    }

    // ========================================================================
    // Interceptors & Error Handling
    // ========================================================================

    private setupInterceptors(): void {
        this.axiosInstance.interceptors.request.use(
            async (requestConfig) => {
                await this.acquireRateLimitToken();
                const token = await this.acquireAccessToken();
                requestConfig.headers.Authorization = `Bearer ${token}`;

                logger.debug('Teams API request', {
                    component: 'TeamsClient',
                    method: requestConfig.method,
                    url: requestConfig.url
                });

                return requestConfig;
            },
            (error) => {
                logger.error('Request interceptor error', {
                    component: 'TeamsClient',
                    error: error.message
                });
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.debug('Teams API response', {
                    component: 'TeamsClient',
                    status: response.status,
                    url: response.config.url
                });
                return response;
            },
            (error: AxiosError) => {
                return this.handleError(error);
            }
        );
    }

    // ========================================================================
    // Rate Limiting
    // ========================================================================

    private async acquireRateLimitToken(): Promise<void> {
        const now = Date.now();
        const timeSinceRefill = (now - this.rateLimiter.lastRefill) / 1000;
        const tokensToAdd = timeSinceRefill * this.rateLimiter.refillRate;

        this.rateLimiter.tokens = Math.min(
            this.rateLimiter.maxTokens,
            this.rateLimiter.tokens + tokensToAdd
        );
        this.rateLimiter.lastRefill = now;

        if (this.rateLimiter.tokens < 1) {
            const waitTime = (1 - this.rateLimiter.tokens) / this.rateLimiter.refillRate * 1000;
            logger.debug('Rate limit wait', {
                component: 'TeamsClient',
                waitTime: `${Math.round(waitTime)}ms`
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.rateLimiter.tokens = 1;
        }

        this.rateLimiter.tokens -= 1;
    }

    // ========================================================================
    // Retry Logic
    // ========================================================================

    private async retryRequest<T>(
        request: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await request();
        } catch (error: any) {
            if (attempt >= this.MAX_RETRIES) {
                throw error;
            }
            if (error.response?.status === 429 || error.response?.status >= 500) {
                const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                logger.info('Retrying Teams request', {
                    component: 'TeamsClient',
                    attempt,
                    maxRetries: this.MAX_RETRIES,
                    delay: `${delay}ms`
                });
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryRequest(request, attempt + 1);
            }
            throw error;
        }
    }

    // ========================================================================
    // Error Handling
    // ========================================================================

    private handleError(error: AxiosError): Promise<never> {
        const status = error.response?.status;
        const data: any = error.response?.data;

        let message = 'Microsoft Teams API error';

        if (status === 401) {
            message = 'Authentication failed. Check your tenant ID, client ID, and client secret.';
        } else if (status === 403) {
            message = 'Permission denied. Ensure the app has the required Microsoft Graph permissions.';
        } else if (status === 404) {
            message = 'Resource not found.';
        } else if (status === 429) {
            message = 'Rate limit exceeded. Please try again later.';
        } else if (data?.error?.message) {
            message = data.error.message;
        } else if (error.request && !error.response) {
            message = 'No response from Microsoft Graph. Check your network connection.';
        }

        logger.error('Teams API error', {
            component: 'TeamsClient',
            status,
            message,
            url: error.config?.url
        });

        return Promise.reject(new ExternalError(message, 'Teams', status));
    }

    // ========================================================================
    // Connection Test
    // ========================================================================

    /**
     * Test connection to Microsoft Graph API
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await this.retryRequest(() =>
                this.axiosInstance.get('/me')
            );

            logger.info('Teams connection successful', {
                component: 'TeamsClient',
                user: response.data.displayName
            });

            return {
                success: true,
                message: `Connected as ${response.data.displayName}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    // ========================================================================
    // Channel Operations
    // ========================================================================

    /**
     * List channels in a team
     * @param teamId - The team ID
     */
    async listChannels(teamId: string): Promise<TeamsChannel[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(`/teams/${teamId}/channels`)
        );

        logger.info('Listed Teams channels', {
            component: 'TeamsClient',
            teamId,
            count: response.data.value?.length ?? 0
        });

        return response.data.value || [];
    }

    /**
     * Create a new channel in a team
     * @param teamId - The team ID
     * @param displayName - Channel display name
     * @param description - Optional channel description
     */
    async createChannel(
        teamId: string,
        displayName: string,
        description?: string
    ): Promise<TeamsChannel> {
        const payload: Record<string, any> = {
            displayName,
            membershipType: 'standard'
        };

        if (description) {
            payload.description = description;
        }

        const response = await this.retryRequest(() =>
            this.axiosInstance.post(`/teams/${teamId}/channels`, payload)
        );

        logger.info('Created Teams channel', {
            component: 'TeamsClient',
            teamId,
            channelId: response.data.id,
            displayName
        });

        return response.data;
    }

    // ========================================================================
    // Channel Message Operations
    // ========================================================================

    /**
     * Send a message to a channel
     * @param teamId - The team ID
     * @param channelId - The channel ID
     * @param content - Message content (HTML supported)
     */
    async sendChannelMessage(
        teamId: string,
        channelId: string,
        content: string
    ): Promise<TeamsMessage> {
        const payload = {
            body: {
                content,
                contentType: 'html'
            }
        };

        const response = await this.retryRequest(() =>
            this.axiosInstance.post(
                `/teams/${teamId}/channels/${channelId}/messages`,
                payload
            )
        );

        logger.info('Sent Teams channel message', {
            component: 'TeamsClient',
            teamId,
            channelId,
            messageId: response.data.id
        });

        return response.data;
    }

    /**
     * List messages in a channel
     * @param teamId - The team ID
     * @param channelId - The channel ID
     * @param top - Maximum number of messages to return (default 20)
     */
    async listChannelMessages(
        teamId: string,
        channelId: string,
        top: number = 20
    ): Promise<TeamsMessage[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(
                `/teams/${teamId}/channels/${channelId}/messages`,
                { params: { $top: top } }
            )
        );

        logger.info('Listed Teams channel messages', {
            component: 'TeamsClient',
            teamId,
            channelId,
            count: response.data.value?.length ?? 0
        });

        return response.data.value || [];
    }

    // ========================================================================
    // Chat Message Operations
    // ========================================================================

    /**
     * Send a message in a 1:1 or group chat
     * @param chatId - The chat ID
     * @param content - Message content (HTML supported)
     */
    async sendChatMessage(chatId: string, content: string): Promise<TeamsChatMessage> {
        const payload = {
            body: {
                content,
                contentType: 'html'
            }
        };

        const response = await this.retryRequest(() =>
            this.axiosInstance.post(`/chats/${chatId}/messages`, payload)
        );

        logger.info('Sent Teams chat message', {
            component: 'TeamsClient',
            chatId,
            messageId: response.data.id
        });

        return { ...response.data, chatId };
    }

    // ========================================================================
    // Webhook Subscription Operations
    // ========================================================================

    /**
     * Create a webhook subscription for change notifications
     * @param resource - Microsoft Graph resource path to subscribe to
     * @param changeType - Comma-separated change types (created, updated, deleted)
     * @param notificationUrl - HTTPS URL that will receive notifications
     */
    async createWebhookSubscription(
        resource: string,
        changeType: string,
        notificationUrl: string
    ): Promise<TeamsWebhookSubscription> {
        // Subscriptions expire after max 60 minutes for Teams resources
        const expiration = new Date(Date.now() + 60 * 60 * 1000).toISOString();

        const payload = {
            changeType,
            notificationUrl,
            resource,
            expirationDateTime: expiration
        };

        const response = await this.retryRequest(() =>
            this.axiosInstance.post('/subscriptions', payload)
        );

        logger.info('Created Teams webhook subscription', {
            component: 'TeamsClient',
            subscriptionId: response.data.id,
            resource,
            changeType
        });

        return response.data;
    }

    /**
     * Delete a webhook subscription
     * @param subscriptionId - The subscription ID to delete
     */
    async deleteWebhookSubscription(subscriptionId: string): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.delete(`/subscriptions/${subscriptionId}`)
        );

        logger.info('Deleted Teams webhook subscription', {
            component: 'TeamsClient',
            subscriptionId
        });
    }
}
