/**
 * MCP Configuration Exporter
 * 
 * Exports MCP server connection details for various AI agents and clients
 * Supports: Claude Desktop, OpenAI Assistants, Custom MCP Clients, etc.
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { Logger } from '../logger';
import { getPlatformInfo, getPlatformPaths } from '../utils/platformInfo';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);

export type MCPClientType = 'claude-desktop' | 'openai' | 'custom-json' | 'env-vars' | 'cli-args';

export interface MCPConnectionConfig {
    transport: string;
    host?: string;
    port?: number;
    protocol?: string;
    url?: string;
}

export interface ClaudeDesktopConfig {
    mcpServers: {
        [key: string]: {
            command: string;
            args?: string[];
            env?: { [key: string]: string };
        };
    };
}

export interface GenericMCPConfig {
    serverName: string;
    version: string;
    connection: {
        type: 'stdio' | 'http' | 'https' | 'websocket';
        endpoint?: string;
        host?: string;
        port?: number;
    };
    authentication?: {
        type: 'none' | 'bearer' | 'api-key';
        token?: string;
    };
    capabilities: string[];
}

export class MCPConfigExporter {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Get MCP server connection configuration
     */
    private getConnectionConfig(): MCPConnectionConfig {
        const mcpConfig = vscode.workspace.getConfiguration('aicc.mcp');
        const transport = mcpConfig.get<string>('transport', 'stdio');
        const port = mcpConfig.get<number>('port', 3000);
        const host = mcpConfig.get<string>('host', 'localhost');

        const config: MCPConnectionConfig = {
            transport,
            host,
            port
        };

        if (transport === 'http') {
            config.protocol = 'http';
            config.url = `http://${host}:${port}`;
        } else if (transport === 'https') {
            config.protocol = 'https';
            config.url = `https://${host}:${port}`;
        } else if (transport === 'websocket') {
            config.protocol = 'ws';
            config.url = `ws://${host}:${port}`;
        }

        return config;
    }

    /**
     * Export configuration for Claude Desktop
     */
    async exportForClaudeDesktop(): Promise<{ path: string; content: string }> {
        const connection = this.getConnectionConfig();
        const { appDataDir } = getPlatformPaths();

        const configDir = path.join(appDataDir, 'Claude');

        const configPath = path.join(configDir, 'claude_desktop_config.json');

        // Read existing config or create new one
        let config: ClaudeDesktopConfig = { mcpServers: {} };
        try {
            if (await existsAsync(configPath)) {
                const content = await fs.promises.readFile(configPath, 'utf8');
                config = JSON.parse(content);
            }
        } catch (error: any) {
            this.logger.warn('Could not read existing Claude config, creating new', { error: error.message });
        }

        // Add AI Command Center MCP server
        if (connection.transport === 'stdio') {
            config.mcpServers['ai-command-center'] = {
                command: 'npx',
                args: [
                    '-y',
                    '@modelcontextprotocol/cli',
                    'stdio',
                    'ai-command-center-mcp'
                ]
            };
        } else if (connection.url) {
            config.mcpServers['ai-command-center'] = {
                command: 'npx',
                args: [
                    '-y',
                    '@modelcontextprotocol/cli',
                    'connect',
                    connection.url
                ]
            };
        }

        const content = JSON.stringify(config, null, 2);

        // Ensure directory exists
        if (!await existsAsync(configDir)) {
            await mkdirAsync(configDir, { recursive: true });
        }

        // Write config
        await writeFileAsync(configPath, content, 'utf8');

        this.logger.info('Claude Desktop config exported', {
            component: 'MCPConfigExporter',
            path: configPath
        });

        return { path: configPath, content };
    }

    /**
     * Export generic JSON configuration
     */
    async exportGenericJSON(): Promise<{ path: string; content: string }> {
        const connection = this.getConnectionConfig();
        
        const config: GenericMCPConfig = {
            serverName: 'ai-command-center',
            version: '1.0.0',
            connection: {
                type: connection.transport as any,
                endpoint: connection.url,
                host: connection.host,
                port: connection.port
            },
            authentication: {
                type: 'none'
            },
            capabilities: [
                'resources',
                'tools',
                'prompts'
            ]
        };

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const outputPath = workspaceFolder 
            ? path.join(workspaceFolder.uri.fsPath, 'mcp-config.json')
            : path.join(getPlatformInfo().homeDir, 'mcp-config.json');

        const content = JSON.stringify(config, null, 2);
        await writeFileAsync(outputPath, content, 'utf8');

        this.logger.info('Generic JSON config exported', {
            component: 'MCPConfigExporter',
            path: outputPath
        });

        return { path: outputPath, content };
    }

    /**
     * Export environment variables format
     */
    exportEnvironmentVariables(): string {
        const connection = this.getConnectionConfig();
        
        const lines: string[] = [
            '# AI Command Center MCP Server Configuration',
            '# Add these to your shell profile (.bashrc, .zshrc, etc.)',
            '',
            'export MCP_SERVER_NAME="ai-command-center"',
            `export MCP_SERVER_TRANSPORT="${connection.transport}"`,
        ];

        if (connection.host) {
            lines.push(`export MCP_SERVER_HOST="${connection.host}"`);
        }
        if (connection.port) {
            lines.push(`export MCP_SERVER_PORT="${connection.port}"`);
        }
        if (connection.url) {
            lines.push(`export MCP_SERVER_URL="${connection.url}"`);
        }

        lines.push('');
        lines.push('# Example usage with MCP CLI:');
        
        if (connection.transport === 'stdio') {
            lines.push('# npx @modelcontextprotocol/cli stdio ai-command-center-mcp');
        } else if (connection.url) {
            lines.push(`# npx @modelcontextprotocol/cli connect ${connection.url}`);
        }

        const content = lines.join('\n');

        this.logger.info('Environment variables exported', {
            component: 'MCPConfigExporter'
        });

        return content;
    }

    /**
     * Export CLI arguments format
     */
    exportCLIArgs(): string {
        const connection = this.getConnectionConfig();
        
        const lines: string[] = [
            '# AI Command Center MCP Server - CLI Connection Examples',
            '',
            '## Using @modelcontextprotocol/cli:',
            ''
        ];

        if (connection.transport === 'stdio') {
            lines.push('npx @modelcontextprotocol/cli stdio ai-command-center-mcp');
        } else if (connection.url) {
            lines.push(`npx @modelcontextprotocol/cli connect ${connection.url}`);
        } else if (connection.host && connection.port) {
            lines.push(`npx @modelcontextprotocol/cli connect ${connection.protocol}://${connection.host}:${connection.port}`);
        }

        lines.push('');
        lines.push('## Using curl (for HTTP/HTTPS):');
        if (connection.url && connection.transport !== 'stdio') {
            lines.push(`curl ${connection.url}/health`);
            lines.push(`curl ${connection.url}/mcp/resources`);
        }

        lines.push('');
        lines.push('## Python example:');
        lines.push('```python');
        lines.push('from mcp import Client');
        lines.push('');
        if (connection.transport === 'stdio') {
            lines.push('client = Client.stdio("ai-command-center-mcp")');
        } else if (connection.url) {
            lines.push(`client = Client.connect("${connection.url}")`);
        }
        lines.push('resources = client.list_resources()');
        lines.push('```');

        const content = lines.join('\n');

        this.logger.info('CLI args exported', {
            component: 'MCPConfigExporter'
        });

        return content;
    }

    /**
     * Export OpenAI Assistants format
     */
    async exportForOpenAI(): Promise<{ path: string; content: string }> {
        const connection = this.getConnectionConfig();
        
        if (connection.transport === 'stdio') {
            throw new Error('OpenAI Assistants require HTTP/HTTPS transport. Change MCP transport in settings.');
        }

        const config = {
            name: 'AI Command Center MCP',
            description: 'Model Context Protocol server for AI-powered project planning and management',
            type: 'custom',
            endpoint: connection.url,
            authentication: {
                type: 'none'
            },
            capabilities: {
                resources: true,
                tools: true,
                prompts: true
            },
            documentation: {
                resources: `${connection.url}/swagger`,
                tools: `${connection.url}/swagger`,
                prompts: `${connection.url}/mcp/prompts`
            }
        };

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        const outputPath = workspaceFolder 
            ? path.join(workspaceFolder.uri.fsPath, 'openai-mcp-config.json')
            : path.join(getPlatformInfo().homeDir, 'openai-mcp-config.json');

        const content = JSON.stringify(config, null, 2);
        await writeFileAsync(outputPath, content, 'utf8');

        this.logger.info('OpenAI config exported', {
            component: 'MCPConfigExporter',
            path: outputPath
        });

        return { path: outputPath, content };
    }

    /**
     * Show export options dialog
     */
    async showExportDialog(): Promise<void> {
        const options = [
            { label: 'Claude Desktop', description: 'Auto-configure Claude Desktop app', value: 'claude-desktop' },
            { label: 'Generic JSON', description: 'Standard JSON config file', value: 'custom-json' },
            { label: 'Environment Variables', description: 'Shell environment variables', value: 'env-vars' },
            { label: 'CLI Arguments', description: 'Command-line examples', value: 'cli-args' },
            { label: 'OpenAI Assistants', description: 'Configuration for OpenAI', value: 'openai' }
        ];

        const selected = await vscode.window.showQuickPick(options, {
            placeHolder: 'Select MCP client configuration format'
        });

        if (!selected) {
            return;
        }

        try {
            let result: { path?: string; content: string } | undefined;

            switch (selected.value) {
                case 'claude-desktop':
                    result = await this.exportForClaudeDesktop();
                    vscode.window.showInformationMessage(
                        `Claude Desktop configuration saved to: ${result.path}. Restart Claude Desktop to apply changes.`
                    );
                    break;

                case 'custom-json':
                    result = await this.exportGenericJSON();
                    vscode.window.showInformationMessage(
                        `MCP configuration saved to: ${result.path}`
                    );
                    // Open the file
                    const doc = await vscode.workspace.openTextDocument(result.path!);
                    await vscode.window.showTextDocument(doc);
                    break;

                case 'env-vars':
                    result = { content: this.exportEnvironmentVariables() };
                    // Show in new untitled document
                    const envDoc = await vscode.workspace.openTextDocument({
                        content: result.content,
                        language: 'shellscript'
                    });
                    await vscode.window.showTextDocument(envDoc);
                    vscode.window.showInformationMessage(
                        'Environment variables displayed. Copy to your shell profile.'
                    );
                    break;

                case 'cli-args':
                    result = { content: this.exportCLIArgs() };
                    // Show in new untitled document
                    const cliDoc = await vscode.workspace.openTextDocument({
                        content: result.content,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(cliDoc);
                    vscode.window.showInformationMessage(
                        'CLI examples displayed. Use these commands to connect.'
                    );
                    break;

                case 'openai':
                    result = await this.exportForOpenAI();
                    vscode.window.showInformationMessage(
                        `OpenAI configuration saved to: ${result.path}`
                    );
                    // Open the file
                    const openaiDoc = await vscode.workspace.openTextDocument(result.path!);
                    await vscode.window.showTextDocument(openaiDoc);
                    break;
            }

        } catch (error: any) {
            this.logger.error('Failed to export MCP config', error);
            vscode.window.showErrorMessage(`Failed to export configuration: ${error.message}`);
        }
    }
}
