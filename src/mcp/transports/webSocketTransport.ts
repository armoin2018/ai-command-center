import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import WebSocket from 'ws';
import { logger } from '../../logger';

/**
 * WebSocket Transport for MCP Server
 * 
 * Provides WebSocket communication for the MCP server,
 * enabling bidirectional real-time communication.
 */
export class WebSocketTransport {
    // @ts-ignore - Server instance kept for future use
    private _server: Server;
    private wsServer: WebSocket.Server | null = null;
    private clients: Set<WebSocket> = new Set();
    private subscriptions: Map<string, Set<WebSocket>> = new Map();
    private readonly port: number;

    constructor(server: Server, port: number = 3000) {
        this._server = server;
        this.port = port;
    }

    /**
     * Start the WebSocket server
     */
    async start(): Promise<void> {
        this.wsServer = new WebSocket.Server({ port: this.port });

        this.wsServer.on('connection', (ws: WebSocket) => {
            logger.info(`WebSocket client connected. Total clients: ${this.clients.size + 1}`);
            this.clients.add(ws);

            ws.on('message', async (data: WebSocket.Data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                } catch (error) {
                    logger.error('Error handling WebSocket message:', { error });
                    this.sendError(ws, 'Invalid message format');
                }
            });

            ws.on('close', () => {
                logger.info(`WebSocket client disconnected. Total clients: ${this.clients.size - 1}`);
                this.clients.delete(ws);
                this.removeClientSubscriptions(ws);
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error:', error);
            });

            // Send welcome message
            this.send(ws, {
                type: 'connected',
                message: 'Connected to AI Command Center MCP Server',
                timestamp: new Date().toISOString()
            });
        });

        logger.info(`WebSocket MCP transport started on port ${this.port}`);
    }

    /**
     * Stop the WebSocket server
     */
    async stop(): Promise<void> {
        if (this.wsServer) {
            // Close all client connections
            this.clients.forEach(client => {
                client.close();
            });
            this.clients.clear();
            this.subscriptions.clear();

            // Close server
            await new Promise<void>((resolve) => {
                this.wsServer!.close(() => {
                    logger.info('WebSocket MCP transport stopped');
                    resolve();
                });
            });

            this.wsServer = null;
        }
    }

    /**
     * Handle incoming WebSocket message
     */
    private async handleMessage(ws: WebSocket, message: any): Promise<void> {
        const { type, id, method, params } = message;

        switch (type) {
            case 'request':
                await this.handleRequest(ws, id, method, params);
                break;

            case 'subscribe':
                this.handleSubscribe(ws, params?.resource);
                break;

            case 'unsubscribe':
                this.handleUnsubscribe(ws, params?.resource);
                break;

            case 'ping':
                this.send(ws, { type: 'pong', id, timestamp: new Date().toISOString() });
                break;

            default:
                this.sendError(ws, `Unknown message type: ${type}`);
        }
    }

    /**
     * Handle MCP request
     * 
     * Note: This is a simplified WebSocket handler. 
     * For full MCP protocol support, implement proper request routing.
     */
    private async handleRequest(ws: WebSocket, id: string, method: string, _params: any): Promise<void> {
        try {
            // For now, return not implemented
            // Full implementation would route to MCP server handlers
            throw new Error(`Method ${method} not yet implemented in WebSocket transport`);

            // Future implementation:
            // result = await this.server.handleRequest(method, params);

            // this.send(ws, {
            //     type: 'response',
            //     id,
            //     result
            // });
        } catch (error: any) {
            this.send(ws, {
                type: 'error',
                id,
                error: {
                    code: -32603,
                    message: error.message || 'Internal error'
                }
            });
        }
    }

    /**
     * Handle resource subscription
     */
    private handleSubscribe(ws: WebSocket, resource: string): void {
        if (!resource) {
            this.sendError(ws, 'Resource URI required for subscription');
            return;
        }

        if (!this.subscriptions.has(resource)) {
            this.subscriptions.set(resource, new Set());
        }

        this.subscriptions.get(resource)!.add(ws);
        logger.info(`Client subscribed to resource: ${resource}`);

        this.send(ws, {
            type: 'subscribed',
            resource,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Handle resource unsubscription
     */
    private handleUnsubscribe(ws: WebSocket, resource: string): void {
        if (!resource) {
            this.sendError(ws, 'Resource URI required for unsubscription');
            return;
        }

        const subscribers = this.subscriptions.get(resource);
        if (subscribers) {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
                this.subscriptions.delete(resource);
            }
        }

        logger.info(`Client unsubscribed from resource: ${resource}`);

        this.send(ws, {
            type: 'unsubscribed',
            resource,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Remove all subscriptions for a client
     */
    private removeClientSubscriptions(ws: WebSocket): void {
        this.subscriptions.forEach((subscribers, resource) => {
            subscribers.delete(ws);
            if (subscribers.size === 0) {
                this.subscriptions.delete(resource);
            }
        });
    }

    /**
     * Broadcast update to subscribed clients
     */
    public broadcastUpdate(resource: string, data: any): void {
        const subscribers = this.subscriptions.get(resource);
        if (subscribers && subscribers.size > 0) {
            const message = {
                type: 'update',
                resource,
                data,
                timestamp: new Date().toISOString()
            };

            subscribers.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    this.send(client, message);
                }
            });

            logger.debug(`Broadcast update for resource ${resource} to ${subscribers.size} clients`);
        }
    }

    /**
     * Broadcast message to all connected clients
     */
    public broadcast(message: any): void {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                this.send(client, message);
            }
        });
    }

    /**
     * Send message to specific client
     */
    private send(ws: WebSocket, message: any): void {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }

    /**
     * Send error to specific client
     */
    private sendError(ws: WebSocket, errorMessage: string): void {
        this.send(ws, {
            type: 'error',
            error: {
                code: -32600,
                message: errorMessage
            },
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get number of connected clients
     */
    public getClientCount(): number {
        return this.clients.size;
    }

    /**
     * Get subscription statistics
     */
    public getSubscriptionStats(): { resource: string; subscribers: number }[] {
        const stats: { resource: string; subscribers: number }[] = [];
        this.subscriptions.forEach((subscribers, resource) => {
            stats.push({ resource, subscribers: subscribers.size });
        });
        return stats;
    }
}
