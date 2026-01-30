/**
 * Jira Webhook Handler
 * 
 * Handles incoming webhooks from Jira for real-time sync
 */

import * as http from 'http';
import * as crypto from 'crypto';
import { logger } from '../../logger';
import { SyncEngine } from './syncEngine';
import { WebhookPayload } from './types';

export class WebhookHandler {
    private server: http.Server | null = null;
    private port: number = 3000;
    private webhookSecret: string;
    private syncEngine: SyncEngine;
    private isRunning: boolean = false;

    constructor(webhookSecret: string, syncEngine: SyncEngine, port?: number) {
        this.webhookSecret = webhookSecret;
        this.syncEngine = syncEngine;
        if (port) {
            this.port = port;
        }
    }

    /**
     * Start webhook server
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('Webhook server already running', { component: 'WebhookHandler' });
            return;
        }

        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        return new Promise((resolve, reject) => {
            this.server!.listen(this.port, () => {
                this.isRunning = true;
                logger.info('Webhook server started', {
                    component: 'WebhookHandler',
                    port: this.port,
                    url: this.getWebhookUrl()
                });
                resolve();
            });

            this.server!.on('error', (error: any) => {
                logger.error('Webhook server error', {
                    component: 'WebhookHandler',
                    error: error.message
                });
                reject(error);
            });
        });
    }

    /**
     * Stop webhook server
     */
    async stop(): Promise<void> {
        if (!this.isRunning || !this.server) {
            return;
        }

        return new Promise((resolve) => {
            this.server!.close(() => {
                this.isRunning = false;
                this.server = null;
                logger.info('Webhook server stopped', { component: 'WebhookHandler' });
                resolve();
            });
        });
    }

    /**
     * Handle incoming webhook request
     */
    private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        // Only accept POST requests to /webhook
        if (req.method !== 'POST' || req.url !== '/webhook') {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }

        try {
            // Read request body
            const body = await this.readBody(req);

            // Verify signature if secret is set
            if (this.webhookSecret) {
                const signature = req.headers['x-hub-signature'] as string;
                if (!this.verifySignature(body, signature)) {
                    logger.warn('Invalid webhook signature', { component: 'WebhookHandler' });
                    res.writeHead(401);
                    res.end('Unauthorized');
                    return;
                }
            }

            // Parse payload
            const payload: WebhookPayload = JSON.parse(body);

            logger.info('Received webhook', {
                component: 'WebhookHandler',
                event: payload.webhookEvent,
                issueKey: payload.issue?.key
            });

            // Process webhook
            await this.processWebhook(payload);

            res.writeHead(200);
            res.end('OK');
        } catch (error: any) {
            logger.error('Webhook processing error', {
                component: 'WebhookHandler',
                error: error.message
            });
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    }

    /**
     * Read request body
     */
    private readBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Verify webhook signature
     */
    private verifySignature(body: string, signature: string): boolean {
        if (!signature) {
            return false;
        }

        const expectedSignature = crypto
            .createHmac('sha256', this.webhookSecret)
            .update(body)
            .digest('hex');

        return signature === `sha256=${expectedSignature}`;
    }

    /**
     * Process webhook payload
     */
    private async processWebhook(payload: WebhookPayload): Promise<void> {
        const eventType = payload.webhookEvent;

        logger.debug('Processing webhook event', {
            component: 'WebhookHandler',
            event: eventType,
            issueKey: payload.issue?.key
        });

        // Handle different event types
        switch (eventType) {
            case 'jira:issue_created':
            case 'jira:issue_updated':
            case 'jira:issue_deleted':
                // Trigger sync for this specific issue
                await this.syncSingleIssue(payload.issue);
                break;

            case 'comment_created':
            case 'comment_updated':
                // Handle comment events if needed
                logger.debug('Comment event received', {
                    component: 'WebhookHandler',
                    issueKey: payload.issue?.key
                });
                break;

            default:
                logger.debug('Unhandled webhook event', {
                    component: 'WebhookHandler',
                    event: eventType
                });
        }
    }

    /**
     * Sync single issue from webhook
     */
    private async syncSingleIssue(issue: any): Promise<void> {
        try {
            // Trigger a targeted pull sync for this issue
            // This is a simplified approach - in a real implementation,
            // you would update just this specific issue
            logger.info('Webhook-triggered sync', {
                component: 'WebhookHandler',
                issueKey: issue.key
            });

            // For now, trigger a full pull sync
            // Could be optimized to sync just this issue
            await this.syncEngine.sync({
                strategy: 'pull',
                conflictResolution: 'remote-wins',
                forceSync: true
            });
        } catch (error: any) {
            logger.error('Webhook sync failed', {
                component: 'WebhookHandler',
                issueKey: issue.key,
                error: error.message
            });
        }
    }

    /**
     * Get webhook URL
     */
    getWebhookUrl(): string {
        return `http://localhost:${this.port}/webhook`;
    }

    /**
     * Check if server is running
     */
    isServerRunning(): boolean {
        return this.isRunning;
    }
}
