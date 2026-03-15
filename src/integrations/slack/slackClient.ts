/**
 * Slack Web API Client
 *
 * Slack Web API client with rate limiting, retry logic, and structured error handling.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../logger';
import { ExternalError } from '../../errors/customErrors';
import {
    SlackConfig,
    SlackChannel,
    SlackMessage,
    SlackUser
} from './types';

interface RateLimiter {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

export class SlackClient {
    private static instance: SlackClient;
    private axiosInstance: AxiosInstance;
    private rateLimiter: RateLimiter;
    private config: SlackConfig;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY_MS = 1000;
    private readonly RATE_LIMIT = 50; // Slack Tier 3: ~50 req/min for most methods

    /**
     * Get the current Slack configuration
     */
    public getConfig(): SlackConfig {
        return this.config;
    }

    private constructor(config: SlackConfig) {
        this.config = config;

        this.rateLimiter = {
            tokens: this.RATE_LIMIT,
            lastRefill: Date.now(),
            maxTokens: this.RATE_LIMIT,
            refillRate: this.RATE_LIMIT / 60
        };

        this.axiosInstance = axios.create({
            baseURL: 'https://slack.com/api',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Bearer ${config.botToken}`
            }
        });

        this.setupInterceptors();

        logger.info('SlackClient initialized', {
            component: 'SlackClient'
        });
    }

    /**
     * Get singleton instance of SlackClient
     * @param config - Slack configuration (required on first call)
     */
    public static getInstance(config?: SlackConfig): SlackClient {
        if (!SlackClient.instance && config) {
            SlackClient.instance = new SlackClient(config);
        } else if (!SlackClient.instance) {
            throw new Error('SlackClient not initialized. Provide config on first call.');
        }
        return SlackClient.instance;
    }

    /** Reset singleton instance (for testing) */
    public static resetInstance(): void {
        SlackClient.instance = null as any;
    }

    // ========================================================================
    // Interceptors & Error Handling
    // ========================================================================

    private setupInterceptors(): void {
        this.axiosInstance.interceptors.request.use(
            async (requestConfig) => {
                await this.acquireRateLimitToken();

                logger.debug('Slack API request', {
                    component: 'SlackClient',
                    method: requestConfig.method,
                    url: requestConfig.url
                });

                return requestConfig;
            },
            (error) => {
                logger.error('Request interceptor error', {
                    component: 'SlackClient',
                    error: error.message
                });
                return Promise.reject(error);
            }
        );

        this.axiosInstance.interceptors.response.use(
            (response) => {
                // Slack always returns 200; errors are in the body
                if (response.data && response.data.ok === false) {
                    const errorCode = response.data.error || 'unknown_error';
                    logger.error('Slack API error in response body', {
                        component: 'SlackClient',
                        errorCode,
                        url: response.config.url
                    });
                    return Promise.reject(
                        new ExternalError(
                            `Slack API error: ${errorCode}`,
                            'Slack'
                        )
                    );
                }

                logger.debug('Slack API response', {
                    component: 'SlackClient',
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
                component: 'SlackClient',
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
            // Retry on HTTP-level errors (429, 5xx) — Slack uses Retry-After headers
            const isRetryable =
                error.response?.status === 429 ||
                (error.response?.status >= 500) ||
                error.message?.includes('ratelimited');

            if (isRetryable) {
                const retryAfter = error.response?.headers?.['retry-after'];
                const delay = retryAfter
                    ? parseInt(retryAfter, 10) * 1000
                    : this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);

                logger.info('Retrying Slack request', {
                    component: 'SlackClient',
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

        let message = 'Slack API error';

        if (status === 401 || data?.error === 'invalid_auth') {
            message = 'Authentication failed. Check your bot token.';
        } else if (status === 403 || data?.error === 'not_authed') {
            message = 'Not authorized. Ensure the bot has the required scopes.';
        } else if (status === 429) {
            message = 'Rate limit exceeded. Please try again later.';
        } else if (data?.error) {
            message = `Slack API error: ${data.error}`;
        } else if (error.request && !error.response) {
            message = 'No response from Slack API. Check your network connection.';
        }

        logger.error('Slack API error', {
            component: 'SlackClient',
            status,
            message,
            url: error.config?.url
        });

        return Promise.reject(new ExternalError(message, 'Slack', status));
    }

    // ========================================================================
    // Connection Test
    // ========================================================================

    /**
     * Test connection by calling auth.test
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await this.retryRequest(() =>
                this.axiosInstance.post('/auth.test')
            );

            logger.info('Slack connection successful', {
                component: 'SlackClient',
                team: response.data.team,
                user: response.data.user
            });

            return {
                success: true,
                message: `Connected as ${response.data.user} in workspace ${response.data.team}`
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
     * List conversations (channels)
     * @param types - Comma-separated channel types (default: 'public_channel,private_channel')
     * @param limit - Maximum number of channels to return (default 100)
     */
    async listChannels(
        types: string = 'public_channel,private_channel',
        limit: number = 100
    ): Promise<SlackChannel[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get('/conversations.list', {
                params: { types, limit }
            })
        );

        logger.info('Listed Slack channels', {
            component: 'SlackClient',
            count: response.data.channels?.length ?? 0
        });

        return response.data.channels || [];
    }

    /**
     * Create a new channel
     * @param name - Channel name (lowercase, no spaces)
     * @param isPrivate - Whether the channel is private (default false)
     */
    async createChannel(
        name: string,
        isPrivate: boolean = false
    ): Promise<SlackChannel> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.post('/conversations.create', {
                name,
                is_private: isPrivate
            })
        );

        logger.info('Created Slack channel', {
            component: 'SlackClient',
            channelId: response.data.channel?.id,
            name
        });

        return response.data.channel;
    }

    // ========================================================================
    // Message Operations
    // ========================================================================

    /**
     * Send a message to a channel
     * @param channel - Channel ID
     * @param text - Message text (fallback for blocks)
     * @param blocks - Optional Block Kit blocks
     */
    async sendMessage(
        channel: string,
        text: string,
        blocks?: any[]
    ): Promise<SlackMessage> {
        const payload: Record<string, any> = { channel, text };
        if (blocks) {
            payload.blocks = blocks;
        }

        const response = await this.retryRequest(() =>
            this.axiosInstance.post('/chat.postMessage', payload)
        );

        logger.info('Sent Slack message', {
            component: 'SlackClient',
            channel,
            ts: response.data.ts
        });

        return response.data.message || { ts: response.data.ts, text, channel };
    }

    /**
     * Update an existing message
     * @param channel - Channel ID
     * @param ts - Timestamp of the message to update
     * @param text - New message text
     */
    async updateMessage(
        channel: string,
        ts: string,
        text: string
    ): Promise<SlackMessage> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.post('/chat.update', { channel, ts, text })
        );

        logger.info('Updated Slack message', {
            component: 'SlackClient',
            channel,
            ts
        });

        return response.data.message || { ts, text, channel };
    }

    /**
     * Delete a message
     * @param channel - Channel ID
     * @param ts - Timestamp of the message to delete
     */
    async deleteMessage(channel: string, ts: string): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.post('/chat.delete', { channel, ts })
        );

        logger.info('Deleted Slack message', {
            component: 'SlackClient',
            channel,
            ts
        });
    }

    /**
     * Get channel message history
     * @param channel - Channel ID
     * @param limit - Maximum number of messages to return (default 20)
     */
    async getChannelHistory(
        channel: string,
        limit: number = 20
    ): Promise<SlackMessage[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get('/conversations.history', {
                params: { channel, limit }
            })
        );

        logger.info('Retrieved Slack channel history', {
            component: 'SlackClient',
            channel,
            count: response.data.messages?.length ?? 0
        });

        return response.data.messages || [];
    }

    // ========================================================================
    // Reaction Operations
    // ========================================================================

    /**
     * Add a reaction (emoji) to a message
     * @param channel - Channel ID
     * @param timestamp - Message timestamp
     * @param name - Emoji name (without colons)
     */
    async addReaction(
        channel: string,
        timestamp: string,
        name: string
    ): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.post('/reactions.add', {
                channel,
                timestamp,
                name
            })
        );

        logger.info('Added Slack reaction', {
            component: 'SlackClient',
            channel,
            timestamp,
            emoji: name
        });
    }

    // ========================================================================
    // User Operations
    // ========================================================================

    /**
     * Get user information
     * @param userId - Slack user ID
     */
    async getUserInfo(userId: string): Promise<SlackUser> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get('/users.info', {
                params: { user: userId }
            })
        );

        logger.info('Retrieved Slack user info', {
            component: 'SlackClient',
            userId,
            name: response.data.user?.name
        });

        return response.data.user;
    }
}
