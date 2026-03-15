/**
 * MCP and Instruction Source command registration.
 * Extracted from extension.ts to reduce monolith size.
 */
import * as vscode from 'vscode';
import { COMMAND_IDS } from '../commands/commandIds';
import { MCPManager } from '../mcp/mcpManager';
import { VersionOverrideSystem } from '../services/versionOverrideSystem';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/**
 * Register MCP server control commands.
 */
export function registerMcpCommands(
    context: vscode.ExtensionContext,
    mcpManager: MCPManager | undefined
): void {
    const mcpStartCommand = vscode.commands.registerCommand(COMMAND_IDS.MCP_START, async () => {
        try {
            await mcpManager?.start();
            vscode.window.showInformationMessage('MCP server started successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to start MCP server: ${message}`);
            vscode.window.showErrorMessage(`Failed to start MCP server: ${message}`);
        }
    });

    const mcpStopCommand = vscode.commands.registerCommand(COMMAND_IDS.MCP_STOP, async () => {
        try {
            mcpManager?.stop();
            vscode.window.showInformationMessage('MCP server stopped');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to stop MCP server: ${message}`);
            vscode.window.showErrorMessage(`Failed to stop MCP server: ${message}`);
        }
    });

    const mcpRestartCommand = vscode.commands.registerCommand(COMMAND_IDS.MCP_RESTART, async () => {
        try {
            await mcpManager?.restart();
            vscode.window.showInformationMessage('MCP server restarted successfully');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to restart MCP server: ${message}`);
            vscode.window.showErrorMessage(`Failed to restart MCP server: ${message}`);
        }
    });

    const mcpGenerateSSLCommand = vscode.commands.registerCommand(COMMAND_IDS.MCP_GENERATE_SSL, async () => {
        try {
            await mcpManager?.generateSSLCertificate();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to generate SSL certificate: ${message}`);
            vscode.window.showErrorMessage(`Failed to generate SSL certificate: ${message}`);
        }
    });

    const mcpExportConfigCommand = vscode.commands.registerCommand(COMMAND_IDS.MCP_EXPORT_CONFIG, async () => {
        try {
            const { MCPConfigExporter } = await import('../mcp/mcpConfigExporter');
            const configExporter = new MCPConfigExporter(logger);
            await configExporter.showExportDialog();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to export MCP configuration: ${message}`);
            vscode.window.showErrorMessage(`Failed to export MCP configuration: ${message}`);
        }
    });

    context.subscriptions.push(
        mcpStartCommand,
        mcpStopCommand,
        mcpRestartCommand,
        mcpGenerateSSLCommand,
        mcpExportConfigCommand
    );
}

/**
 * Register instruction source management commands.
 */
export function registerInstructionSourceCommands(
    context: vscode.ExtensionContext,
    versionOverrideSystem: VersionOverrideSystem | undefined,
    updateStatusBar: () => void
): void {
    const showSourcesCommand = vscode.commands.registerCommand('aicc.showInstructionSources', async () => {
        try {
            if (!versionOverrideSystem) { return; }

            const sources = versionOverrideSystem.listSources();
            const mergedSet = versionOverrideSystem.getMergedInstructions();

            const items = sources.map(s => ({
                label: s.enabled ? `✓ ${s.name}` : `○ ${s.name}`,
                description: `Priority: ${s.priority} | ${s.type}`,
                detail: s.location,
                source: s
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: mergedSet
                    ? `Active: ${mergedSet.files.length} instructions (${sources.filter(s => s.enabled).length} sources)`
                    : 'No active instruction sources'
            });

            if (selected) {
                await versionOverrideSystem.refreshSource(selected.source.id);
                updateStatusBar();
                vscode.window.showInformationMessage(`Refreshed: ${selected.source.name}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to show instruction sources: ${message}`);
            vscode.window.showErrorMessage(`Failed to show instruction sources: ${message}`);
        }
    });

    const refreshInstructionsCommand = vscode.commands.registerCommand('aicc.refreshInstructions', async () => {
        try {
            if (!versionOverrideSystem) { return; }

            await versionOverrideSystem.refreshAllSources();
            updateStatusBar();
            vscode.window.showInformationMessage('All instruction sources refreshed');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to refresh instructions: ${message}`);
            vscode.window.showErrorMessage(`Failed to refresh instructions: ${message}`);
        }
    });

    context.subscriptions.push(
        showSourcesCommand,
        refreshInstructionsCommand
    );
}
