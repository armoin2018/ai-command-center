/**
 * HTTP Transport for MCP Server
 * 
 * Provides HTTP/HTTPS transport alongside stdio for remote access
 * Includes authentication, CORS, and request validation
 */

import * as http from 'http';
import * as https from 'https';
import { Logger } from '../logger';

// MCP request/response types (simplified for HTTP transport)
export interface MCPRequest {
    method: string;
    params?: any;
}

export interface MCPResponse {
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}

export interface HttpTransportConfig {
    port: number;
    host?: string;
    https?: {
        key: string;
        cert: string;
    };
    cors?: {
        origin: string | string[];
        credentials?: boolean;
    };
    auth?: {
        type: 'bearer' | 'apikey';
        validateToken: (token: string) => Promise<boolean>;
    };
    maxRequestSize?: number;
}

export class HttpTransport {
    private server: http.Server | https.Server | null = null;
    private config: HttpTransportConfig;
    private requestHandler: (request: MCPRequest) => Promise<MCPResponse>;

    constructor(
        config: HttpTransportConfig,
        requestHandler: (request: MCPRequest) => Promise<MCPResponse>
    ) {
        this.config = {
            host: 'localhost',
            maxRequestSize: 1024 * 1024, // 1MB default
            ...config
        };
        this.requestHandler = requestHandler;
    }

    /**
     * Start the HTTP/HTTPS server
     */
    async start(): Promise<void> {
        const handler = this.createRequestHandler();

        if (this.config.https) {
            this.server = https.createServer(this.config.https, handler);
        } else {
            this.server = http.createServer(handler);
        }

        return new Promise((resolve, reject) => {
            this.server!.listen(this.config.port, this.config.host, () => {
                const protocol = this.config.https ? 'https' : 'http';
                Logger.getInstance().info(`MCP HTTP server listening on ${protocol}://${this.config.host}:${this.config.port}`);
                resolve();
            });

            this.server!.on('error', reject);
        });
    }

    /**
     * Stop the server
     */
    async stop(): Promise<void> {
        if (!this.server) return;

        return new Promise((resolve, reject) => {
            this.server!.close((err) => {
                if (err) reject(err);
                else {
                    this.server = null;
                    resolve();
                }
            });
        });
    }

    /**
     * Create the HTTP request handler
     */
    private createRequestHandler(): (req: http.IncomingMessage, res: http.ServerResponse) => void {
        return async (req, res) => {
            try {
                // Handle CORS preflight
                if (req.method === 'OPTIONS') {
                    this.handleCORS(req, res);
                    res.writeHead(204);
                    res.end();
                    return;
                }

                // Set CORS headers
                this.handleCORS(req, res);

                // Only allow POST requests
                if (req.method !== 'POST') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Method not allowed' }));
                    return;
                }

                // Validate authentication
                if (this.config.auth) {
                    const isValid = await this.validateAuth(req);
                    if (!isValid) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Unauthorized' }));
                        return;
                    }
                }

                // Parse request body
                const body = await this.parseBody(req);
                const mcpRequest = JSON.parse(body) as MCPRequest;

                // Validate MCP request structure
                if (!this.isValidMCPRequest(mcpRequest)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid MCP request format' }));
                    return;
                }

                // Process MCP request
                const mcpResponse = await this.requestHandler(mcpRequest);

                // Send response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(mcpResponse));

            } catch (error) {
                Logger.getInstance().error('HTTP transport error', error instanceof Error ? error : new Error(String(error)));
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                }));
            }
        };
    }

    /**
     * Check if an origin is a localhost address
     */
    private isLocalhostOrigin(origin: string): boolean {
        return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    }

    /**
     * Handle CORS headers
     * Defaults to localhost-only when no cors config is provided
     */
    private handleCORS(req: http.IncomingMessage, res: http.ServerResponse): void {
        const requestOrigin = req.headers.origin || '';

        // If no CORS config, default to localhost-only
        if (!this.config.cors) {
            const isAllowed = this.isLocalhostOrigin(requestOrigin);
            res.setHeader('Access-Control-Allow-Origin', isAllowed ? requestOrigin : '');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Vary', 'Origin');
            return;
        }

        const { origin, credentials = false } = this.config.cors;

        // Check if origin is allowed
        const isAllowed = Array.isArray(origin)
            ? origin.includes(requestOrigin)
            : origin === '*' || origin === requestOrigin;

        if (isAllowed) {
            res.setHeader('Access-Control-Allow-Origin', requestOrigin || origin);
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            if (credentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
        }

        res.setHeader('Vary', 'Origin');
    }

    /**
     * Validate authentication
     */
    private async validateAuth(req: http.IncomingMessage): Promise<boolean> {
        if (!this.config.auth) return true;

        const authHeader = req.headers.authorization;
        if (!authHeader) return false;

        let token: string | undefined;

        if (this.config.auth.type === 'bearer') {
            const match = authHeader.match(/^Bearer\s+(.+)$/i);
            token = match?.[1];
        } else if (this.config.auth.type === 'apikey') {
            token = authHeader;
        }

        if (!token) return false;

        return await this.config.auth.validateToken(token);
    }

    /**
     * Parse request body
     */
    private parseBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            const chunks: Buffer[] = [];
            let totalSize = 0;

            req.on('data', (chunk: Buffer) => {
                totalSize += chunk.length;
                
                if (totalSize > this.config.maxRequestSize!) {
                    reject(new Error('Request body too large'));
                    return;
                }
                
                chunks.push(chunk);
            });

            req.on('end', () => {
                resolve(Buffer.concat(chunks).toString('utf8'));
            });

            req.on('error', reject);
        });
    }

    /**
     * Validate MCP request structure
     */
    private isValidMCPRequest(request: any): request is MCPRequest {
        return (
            request &&
            typeof request === 'object' &&
            typeof request.method === 'string' &&
            (request.params === undefined || typeof request.params === 'object')
        );
    }

    /**
     * Get server address
     */
    getAddress(): { host: string; port: number; protocol: string } | null {
        if (!this.server) return null;

        return {
            host: this.config.host || 'localhost',
            port: this.config.port,
            protocol: this.config.https ? 'https' : 'http'
        };
    }
}

/**
 * Create an HTTP transport instance
 */
export function createHttpTransport(
    config: HttpTransportConfig,
    requestHandler: (request: MCPRequest) => Promise<MCPResponse>
): HttpTransport {
    return new HttpTransport(config, requestHandler);
}
