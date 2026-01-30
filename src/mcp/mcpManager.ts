/**
 * MCP Manager
 * 
 * Manages MCP server lifecycle and integration with extension
 */

import * as vscode from 'vscode';
import { MCPServer, TransportType } from './mcpServer';
import { PlanningManager } from '../planning/planningManager';
import { Logger } from '../logger';
import { SecurityManager } from './securityManager';

export class MCPManager {
    private server: MCPServer | null = null;
    private logger: Logger;
    private planningManager: PlanningManager;
    private securityManager: SecurityManager;
    private extensionPath: string;

    constructor(planningManager: PlanningManager, logger: Logger, extensionPath: string) {
        this.planningManager = planningManager;
        this.logger = logger;
        this.extensionPath = extensionPath;
        this.securityManager = new SecurityManager(logger, extensionPath);
    }

    async initialize(): Promise<void> {
        const config = vscode.workspace.getConfiguration('aicc.mcp');
        const enabled = config.get<boolean>('enabled', true);

        // Initialize security manager
        await this.securityManager.initialize();

        if (enabled) {
            await this.start();
        } else {
            this.logger.info('MCP Server disabled in configuration');
        }
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
                    extensionPath: this.extensionPath
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

    dispose(): void {
        if (this.server) {
            this.stop().catch((error) => {
                this.logger.error('Error disposing MCP Server', error);
            });
        }
    }
}
