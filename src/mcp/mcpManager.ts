/**
 * MCP Manager
 * 
 * Manages MCP server lifecycle and integration with extension
 */

import * as vscode from 'vscode';
import * as http from 'http';
import { EventEmitter } from 'events';
import { MCPServer, TransportType } from './mcpServer';
import { PlanningManager } from '../planning/planningManager';
import { Logger } from '../logger';
import { SecurityManager } from './securityManager';
import { LeaderElection, LeaderRole, WorkspaceRegistration } from './leaderElection';
import { MCPInventoryManager } from './mcpInventory';
import { ConnectionManager, ConnectionState } from './connectionManager';

export class MCPManager extends EventEmitter {
    private server: MCPServer | null = null;
    private logger: Logger;
    private planningManager: PlanningManager;
    private securityManager: SecurityManager;
    private extensionPath: string;
    private extensionVersion: string;
    private leaderElection: LeaderElection | null = null;
    private inventoryManager: MCPInventoryManager | null = null;
    private connectionManager: ConnectionManager | null = null;
    private globalStoragePath: string | undefined;

    constructor(
        planningManager: PlanningManager,
        logger: Logger,
        extensionPath: string,
        globalStoragePath?: string,
        extensionVersion?: string,
    ) {
        super();
        this.planningManager = planningManager;
        this.logger = logger;
        this.extensionPath = extensionPath;
        this.extensionVersion = extensionVersion ?? '0.0.0';
        this.globalStoragePath = globalStoragePath;
        this.securityManager = new SecurityManager(logger, extensionPath);
    }

    async initialize(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aicc.mcp');
        const enabled = config.get<boolean>('enabled', true);

        // Initialize security manager
        await this.securityManager.initialize();

        if (!enabled) {
            this.logger.info('MCP Server disabled in configuration');
            return;
        }

        const transport = config.get<TransportType>('transport', 'stdio');

        // Leader election only applies to network transports
        if (transport === 'stdio') {
            this.logger.info('stdio transport – skipping leader election', {
                component: 'MCPManager',
            });
            await this.start();

            // Register self in inventory so the MCP tab shows this workspace even in stdio mode
            this.inventoryManager = new MCPInventoryManager(this.logger, this.globalStoragePath);
            await this.inventoryManager.load();
            const ws = this.createSelfRegistration(undefined);
            this.inventoryManager.registerWorkspace(ws);

            return;
        }

        // ── Multi-workspace leader election (AICC-0190) ──
        const portRangeStart = config.get<number>('portRangeStart', 3100);
        const portRangeEnd = config.get<number>('portRangeEnd', 3110);

        this.leaderElection = new LeaderElection(this.logger, {
            portRangeStart,
            portRangeEnd,
            version: this.extensionVersion,
        });

        // Inventory manager (AICC-0194)
        this.inventoryManager = new MCPInventoryManager(this.logger, this.globalStoragePath);
        await this.inventoryManager.load();

        // ── Connection Manager (AICC-0198 / AICC-0200) ──
        this.connectionManager = new ConnectionManager(this.logger);

        // Set reconnect function: attempt re-registration with leader
        this.connectionManager.setConnectFunction(async () => {
            const leaderPort = this.leaderElection?.getLeaderPort();
            if (!leaderPort || !this.leaderElection) {
                return false;
            }
            return this.attemptLeaderRegistration(leaderPort);
        });

        // Log connection state transitions
        this.connectionManager.on('stateChanged', (event: { previousState: ConnectionState; newState: ConnectionState; attempts: number }) => {
            this.logger.info('MCP connection state transition', {
                component: 'MCPManager',
                previousState: event.previousState,
                newState: event.newState,
                attempts: event.attempts,
            });
        });

        // Wire re-election on leader failure (AICC-0193)
        this.leaderElection.on('leaderFailed', () => {
            this.logger.warn('Leader failed – attempting re-election', {
                component: 'MCPManager',
            });
            // Trigger reconnection cycle (AICC-0200)
            this.connectionManager?.startReconnecting();
        });

        this.leaderElection.on('elected', async (event: { role: LeaderRole; port?: number; leaderPort?: number }) => {
            try {
                if (event.role === 'leader') {
                    await this.start();
                    // Leader is inherently connected (AICC-0200)
                    this.connectionManager?.markConnected();

                    // Register self in inventory as leader.
                    // Use the actual MCP server config port (not the election port)
                    // so health checks probe the correct HTTP endpoint.
                    if (this.inventoryManager && this.leaderElection) {
                        const mcpCfg = vscode.workspace.getConfiguration('aicc.mcp');
                        const serverPort = mcpCfg.get<number>('port', 3000);
                        const ws = this.createSelfRegistration(serverPort);
                        this.inventoryManager.setLeader(this.leaderElection.getWorkspaceId(), serverPort);
                        this.inventoryManager.registerWorkspace(ws);
                        this.inventoryManager.startHealthScanning();
                        this.inventoryManager.startWatching(() => {
                            this.logger.info('Inventory changed on disk', { component: 'MCPManager' });
                        });
                    }
                } else if (event.role === 'follower') {
                    this.logger.info('Running as follower – MCP server not started locally', {
                        component: 'MCPManager',
                        leaderPort: event.leaderPort,
                    });

                    // Register self with the leader via HTTP POST
                    if (event.leaderPort && this.leaderElection) {
                        const ws = this.createSelfRegistration(undefined);
                        this.registerWithLeader(event.leaderPort, ws);
                        // Follower successfully connected to leader (AICC-0200)
                        this.connectionManager?.markConnected();

                        if (this.inventoryManager) {
                            this.inventoryManager.registerWorkspace(ws);
                            this.inventoryManager.startWatching(() => {
                                this.logger.info('Inventory changed on disk', { component: 'MCPManager' });
                            });
                        }
                    }
                }
                // standalone → start server normally
                if (event.role === 'standalone') {
                    await this.start();

                    // Register self in inventory so the MCP tab shows this workspace
                    if (this.inventoryManager && this.leaderElection) {
                        const mcpCfg = vscode.workspace.getConfiguration('aicc.mcp');
                        const serverPort = mcpCfg.get<number>('port', 3000);
                        const ws = this.createSelfRegistration(serverPort);
                        this.inventoryManager.registerWorkspace(ws);
                        this.inventoryManager.startHealthScanning();
                    }

                    // Standalone has no leader relationship (AICC-0200)
                    this.connectionManager?.markDisconnected();
                }
            } catch (err: any) {
                this.logger.error('Post-election setup failed', err);
            }
        });

        await this.leaderElection.elect();
    }

    async start(): Promise<void> {
        if (this.server) {
            this.logger.warn('MCP Server already running');
            return;
        }

        try {
            const config = vscode.workspace.getConfiguration('aicc.mcp');
            const transport = config.get<TransportType>('transport', 'stdio');
            const port = config.get<number>('port', 3000);
            const host = config.get<string>('host', 'localhost');

            this.server = new MCPServer(
                this.planningManager,
                this.logger,
                {
                    transport,
                    port,
                    host,
                    securityManager: this.securityManager,
                    extensionPath: this.extensionPath,
                    version: this.extensionVersion,
                }
            );

            await this.server.start();
            this.logger.info('MCP Server started successfully', {
                component: 'MCPManager',
                transport,
                port: transport !== 'stdio' ? port : undefined,
                host: transport !== 'stdio' ? host : undefined
            });

            // Show info message for HTTP/HTTPS transports
            if (transport === 'http') {
                vscode.window.showInformationMessage(
                    `MCP Server running at http://${host}:${port} - Connect any MCP-compatible client`
                );
            } else if (transport === 'https') {
                vscode.window.showInformationMessage(
                    `MCP Server running at https://${host}:${port} (SSL/TLS) - Connect any MCP-compatible client`
                );
            } else if (transport === 'websocket') {
                vscode.window.showInformationMessage(
                    `MCP Server running at ws://${host}:${port} (WebSocket) - Connect any MCP-compatible client`
                );
            } else if (transport === 'stdio') {
                vscode.window.showInformationMessage(
                    `MCP Server running in stdio mode - Use "Export MCP Configuration" to connect clients`
                );
            }
        } catch (error: any) {
            this.logger.error('Failed to start MCP Server', error);
            vscode.window.showErrorMessage(`Failed to start MCP Server: ${error.message}`);
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.server) {
            this.logger.warn('MCP Server not running');
            return;
        }

        try {
            // Unregister self from inventory
            if (this.inventoryManager && this.leaderElection) {
                this.inventoryManager.unregisterWorkspace(this.leaderElection.getWorkspaceId());
            }

            await this.server.stop();
            this.server = null;
            this.logger.info('MCP Server stopped successfully');
        } catch (error: any) {
            this.logger.error('Failed to stop MCP Server', error);
            throw error;
        }
    }

    async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    isRunning(): boolean {
        return this.server !== null;
    }

    async generateSSLCertificate(): Promise<void> {
        try {
            this.logger.info('Generating SSL certificate', { component: 'MCPManager' });

            const certificate = await this.securityManager.generateSelfSignedCertificate();

            vscode.window.showInformationMessage(
                `SSL certificate generated successfully!\n\n` +
                `Certificate: ${certificate.certPath}\n` +
                `Private Key: ${certificate.keyPath}\n\n` +
                `To use HTTPS, set the transport to 'https' in settings.`,
                'View Trust Instructions',
                'Open Settings'
            ).then(choice => {
                if (choice === 'View Trust Instructions') {
                    this.securityManager.promptCertificateTrust(certificate.certPath);
                } else if (choice === 'Open Settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'aicc.mcp');
                }
            });

            this.logger.info('SSL certificate generated', {
                component: 'MCPManager',
                certPath: certificate.certPath
            });
        } catch (error: any) {
            this.logger.error('Failed to generate SSL certificate', error);
            vscode.window.showErrorMessage(`Failed to generate SSL certificate: ${error.message}`);
            throw error;
        }
    }

    getSecurityManager(): SecurityManager {
        return this.securityManager;
    }

    /**
     * Broadcast update to WebSocket clients
     * Used to notify clients of planning tree changes in real-time
     */
    broadcastUpdate(resource: string, data: any): void {
        if (this.server) {
            this.server.broadcastUpdate(resource, data);
        }
    }

    /**
     * Get the MCP server instance
     */
    getServer(): MCPServer | null {
        return this.server;
    }

    /**
     * Get the inventory manager instance (AICC-0085)
     */
    getInventoryManager(): MCPInventoryManager | null {
        return this.inventoryManager;
    }

    /**
     * Get the connection manager instance (AICC-0085)
     */
    getConnectionManager(): ConnectionManager | null {
        return this.connectionManager;
    }

    /**
     * Get the leader election instance (AICC-0085)
     */
    getLeaderElection(): LeaderElection | null {
        return this.leaderElection;
    }

    /**
     * Get comprehensive server status for the MCP panel (AICC-0085)
     */
    getServerStatus(): {
        isRunning: boolean;
        port: number | undefined;
        host: string;
        transport: string;
        pid: number;
        role: string;
        isLeader: boolean;
        connectedWorkspaces: number;
        startedAt: string | null;
    } {
        const config = vscode.workspace.getConfiguration('aicc.mcp');
        const role = this.leaderElection?.getRole() ?? 'standalone';
        const leader = this.inventoryManager?.getLeader();
        return {
            isRunning: this.isRunning(),
            port: config.get<number>('port', 3000),
            host: config.get<string>('host', 'localhost'),
            transport: config.get<string>('transport', 'stdio'),
            pid: process.pid,
            role,
            isLeader: role === 'leader',
            connectedWorkspaces: this.inventoryManager?.getWorkspaces().length ?? 0,
            startedAt: leader?.startedAt ?? null,
        };
    }

    dispose(): void {
        // Unregister workspace from local inventory
        if (this.inventoryManager && this.leaderElection) {
            this.inventoryManager.unregisterWorkspace(this.leaderElection.getWorkspaceId());
        }

        // If follower, notify leader of departure
        if (this.leaderElection?.getRole() === 'follower') {
            const leaderPort = this.leaderElection.getLeaderPort();
            if (leaderPort) {
                this.unregisterFromLeader(leaderPort, this.leaderElection.getWorkspaceId());
            }
        }

        // Stop health scanning
        if (this.inventoryManager) {
            this.inventoryManager.stopHealthScanning();
        }

        // Dispose connection manager
        if (this.connectionManager) {
            this.connectionManager.dispose();
            this.connectionManager = null;
        }

        if (this.server) {
            this.stop().catch((error) => {
                this.logger.error('Error disposing MCP Server', error);
            });
        }

        if (this.leaderElection) {
            this.leaderElection.dispose();
            this.leaderElection = null;
        }

        if (this.inventoryManager) {
            this.inventoryManager.dispose();
            this.inventoryManager = null;
        }
    }

    /**
     * Graceful shutdown (AICC-0199).
     *
     * Performs an orderly teardown:
     *   1. Unregisters from leader (followers only)
     *   2. Stops the MCP server
     *   3. Saves inventory state
     *   4. Disposes all sub-components
     *   5. Emits 'shutdown' event
     */
    async gracefulShutdown(): Promise<void> {
        this.logger.info('Graceful shutdown initiated', { component: 'MCPManager' });

        // 1. Mark connection as disconnected
        this.connectionManager?.markDisconnected();

        // 2. Unregister from leader if follower
        if (this.leaderElection?.getRole() === 'follower') {
            const leaderPort = this.leaderElection.getLeaderPort();
            if (leaderPort) {
                await this.unregisterFromLeaderAsync(leaderPort, this.leaderElection.getWorkspaceId());
            }
        }

        // 3. Stop MCP server
        if (this.server) {
            try {
                await this.stop();
            } catch (err: any) {
                this.logger.error('Error stopping MCP server during shutdown', err);
            }
        }

        // 4. Save inventory state
        if (this.inventoryManager) {
            if (this.leaderElection) {
                this.inventoryManager.unregisterWorkspace(this.leaderElection.getWorkspaceId());
            }
            await this.inventoryManager.save();
        }

        // 5. Dispose sub-components
        if (this.connectionManager) {
            this.connectionManager.dispose();
            this.connectionManager = null;
        }

        if (this.leaderElection) {
            this.leaderElection.dispose();
            this.leaderElection = null;
        }

        if (this.inventoryManager) {
            this.inventoryManager.dispose();
            this.inventoryManager = null;
        }

        // 6. Emit shutdown event
        this.emit('shutdown');
        this.removeAllListeners();

        this.logger.info('Graceful shutdown complete', { component: 'MCPManager' });
    }

    // ── Private helpers ──

    /**
     * Build a WorkspaceRegistration for the current VS Code window.
     */
    private createSelfRegistration(port?: number): WorkspaceRegistration {
        const wsId = this.leaderElection?.getWorkspaceId() ?? `ws-${process.pid}-${Date.now()}`;
        const folders = vscode.workspace.workspaceFolders;
        const name = folders?.[0]?.name ?? 'unknown';
        const now = new Date().toISOString();

        return {
            id: wsId,
            name,
            pid: process.pid,
            port,
            version: this.extensionVersion,
            skills: [],
            health: 'healthy',
            registeredAt: now,
            lastSeen: now,
        };
    }

    /**
     * Fire-and-forget DELETE to leader to unregister this workspace.
     */
    private unregisterFromLeader(leaderPort: number, workspaceId: string): void {
        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: leaderPort,
                path: `/workspaces/${encodeURIComponent(workspaceId)}`,
                method: 'DELETE',
                timeout: 3000,
            },
            (res) => {
                res.resume(); // drain
                this.logger.info('Unregistered from leader', {
                    component: 'MCPManager',
                    leaderPort,
                    statusCode: res.statusCode,
                });
            },
        );

        req.on('error', (err) => {
            this.logger.warn('Failed to unregister from leader', {
                component: 'MCPManager',
                leaderPort,
                error: err.message,
            });
        });

        req.end();
    }

    /**
     * Async version of leader unregistration for graceful shutdown.
     */
    private unregisterFromLeaderAsync(leaderPort: number, workspaceId: string): Promise<void> {
        return new Promise((resolve) => {
            const req = http.request(
                {
                    hostname: '127.0.0.1',
                    port: leaderPort,
                    path: `/workspaces/${encodeURIComponent(workspaceId)}`,
                    method: 'DELETE',
                    timeout: 3000,
                },
                (res) => {
                    res.resume();
                    this.logger.info('Unregistered from leader (async)', {
                        component: 'MCPManager',
                        leaderPort,
                        statusCode: res.statusCode,
                    });
                    resolve();
                },
            );

            req.on('error', (err) => {
                this.logger.warn('Failed to unregister from leader (async)', {
                    component: 'MCPManager',
                    leaderPort,
                    error: err.message,
                });
                resolve(); // resolve anyway – best-effort
            });

            req.end();
        });
    }

    /**
     * Attempt to re-register with the leader.
     * Returns `true` if the HTTP POST succeeds (status 2xx), `false` otherwise.
     * Used as the `connectFn` for the ConnectionManager.
     */
    private attemptLeaderRegistration(leaderPort: number): Promise<boolean> {
        return new Promise((resolve) => {
            const ws = this.createSelfRegistration(undefined);
            const payload = JSON.stringify(ws);

            const req = http.request(
                {
                    hostname: '127.0.0.1',
                    port: leaderPort,
                    path: '/workspaces/register',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload),
                    },
                    timeout: 3000,
                },
                (res) => {
                    res.resume();
                    resolve(res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300);
                },
            );

            req.on('error', () => resolve(false));
            req.write(payload);
            req.end();
        });
    }

    /**
     * POST self-registration to the leader's `/workspaces/register` endpoint.
     */
    private registerWithLeader(leaderPort: number, ws: WorkspaceRegistration): void {
        const payload = JSON.stringify(ws);

        const req = http.request(
            {
                hostname: '127.0.0.1',
                port: leaderPort,
                path: '/workspaces/register',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 3000,
            },
            (res) => {
                let body = '';
                res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                res.on('end', () => {
                    this.logger.info('Registered with leader', {
                        component: 'MCPManager',
                        leaderPort,
                        statusCode: res.statusCode,
                    });
                });
            },
        );

        req.on('error', (err) => {
            this.logger.warn('Failed to register with leader', {
                component: 'MCPManager',
                leaderPort,
                error: err.message,
            });
        });

        req.write(payload);
        req.end();
    }
}
