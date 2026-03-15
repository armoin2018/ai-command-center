/**
 * Dashboard command handlers for AI Command Center (AICC-0471–0477).
 *
 * Registers webview-based dashboard commands for velocity charts,
 * health monitoring, prompt leaderboards, knowledge search, queue
 * status, agent memory export, and Confluence push/pull.
 *
 * All service dependencies are lazily imported so the extension
 * activation path stays lightweight.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../logger';
import { COMMAND_IDS } from './commandIds';

// ── Status Bar Types ─────────────────────────────────────────────

interface QueueStatusBarState {
    item: vscode.StatusBarItem;
    timer: ReturnType<typeof setInterval>;
}

// ── Class ────────────────────────────────────────────────────────

export class DashboardCommands implements vscode.Disposable {
    private readonly logger: Logger;
    private readonly disposables: vscode.Disposable[] = [];
    private statusBar: QueueStatusBarState | undefined;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    // ── Registration ─────────────────────────────────────────────

    /**
     * Register all dashboard commands and the queue status bar item.
     *
     * @param context Extension context for subscription management
     */
    public register(context: vscode.ExtensionContext): void {
        this.registerCommand(context, COMMAND_IDS.SHOW_VELOCITY_CHART, () =>
            this.showVelocityChart(),
        );

        this.registerCommand(context, COMMAND_IDS.SHOW_HEALTH_DASHBOARD, () =>
            this.showHealthDashboard(),
        );

        this.registerCommand(context, COMMAND_IDS.SHOW_PROMPT_LEADERBOARD, () =>
            this.showPromptLeaderboard(),
        );

        this.registerCommand(context, COMMAND_IDS.SEARCH_KNOWLEDGE_BASE, () =>
            this.searchKnowledgeBase(),
        );

        this.registerCommand(context, COMMAND_IDS.SHOW_QUEUE_STATUS, () =>
            this.showQueueStatus(),
        );

        this.registerCommand(context, COMMAND_IDS.EXPORT_AGENT_MEMORY, () =>
            this.exportAgentMemory(),
        );

        this.registerCommand(context, COMMAND_IDS.CONFLUENCE_PUSH, () =>
            this.confluencePush(),
        );

        this.registerCommand(context, COMMAND_IDS.CONFLUENCE_PULL, () =>
            this.confluencePull(),
        );

        // Initialise the queue status bar (Part 4)
        this.initQueueStatusBar();

        this.logger.info('Dashboard commands registered', {
            component: 'DashboardCommands',
            commandCount: 8,
        });
    }

    // ── Helpers ──────────────────────────────────────────────────

    /**
     * Register a single command and track its disposable.
     */
    private registerCommand(
        context: vscode.ExtensionContext,
        commandId: string,
        handler: () => Promise<void>,
    ): void {
        const disposable = vscode.commands.registerCommand(commandId, handler);
        context.subscriptions.push(disposable);
        this.disposables.push(disposable);
    }

    /**
     * Get the workspace root path, showing an error if none is open.
     */
    private getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder is open.');
            return undefined;
        }
        return folders[0].uri.fsPath;
    }

    // ── 1. Velocity Chart (AICC-0471) ────────────────────────────

    private async showVelocityChart(): Promise<void> {
        try {
            this.logger.info('Opening velocity chart', {
                component: 'DashboardCommands',
            });

            const { VelocityEngine } = await import('../services/velocityEngine');
            const engine = VelocityEngine.getInstance();

            const snapshots = await engine.loadHistory();
            const metrics = engine.computeVelocity(snapshots);
            const html = engine.generateVelocityChartHtml(metrics);

            const panel = vscode.window.createWebviewPanel(
                'aicc.velocityChart',
                'Velocity Chart',
                vscode.ViewColumn.One,
                { enableScripts: true },
            );
            panel.webview.html = html;
        } catch (err) {
            this.handleError('showVelocityChart', err);
        }
    }

    // ── 2. Health Dashboard (AICC-0472) ──────────────────────────

    private async showHealthDashboard(): Promise<void> {
        try {
            this.logger.info('Opening health dashboard', {
                component: 'DashboardCommands',
            });

            const { SkillHealthMonitor } = await import(
                '../services/skillHealthMonitor'
            );
            const monitor = SkillHealthMonitor.getInstance();
            const html = monitor.generateHealthDashboardHtml();

            const panel = vscode.window.createWebviewPanel(
                'aicc.healthDashboard',
                'Skill Health Dashboard',
                vscode.ViewColumn.One,
                { enableScripts: true },
            );
            panel.webview.html = html;
        } catch (err) {
            this.handleError('showHealthDashboard', err);
        }
    }

    // ── 3. Prompt Leaderboard (AICC-0473) ────────────────────────

    private async showPromptLeaderboard(): Promise<void> {
        try {
            this.logger.info('Opening prompt leaderboard', {
                component: 'DashboardCommands',
            });

            const root = this.getWorkspaceRoot();
            if (!root) {
                return;
            }

            const { PromptEffectivenessTracker } = await import(
                '../services/promptEffectivenessTracker'
            );
            const tracker = PromptEffectivenessTracker.getInstance(root);
            const html = tracker.generateLeaderboardHtml();

            const panel = vscode.window.createWebviewPanel(
                'aicc.promptLeaderboard',
                'Prompt Leaderboard',
                vscode.ViewColumn.One,
                { enableScripts: true },
            );
            panel.webview.html = html;
        } catch (err) {
            this.handleError('showPromptLeaderboard', err);
        }
    }

    // ── 4. Knowledge Base Search (AICC-0474) ─────────────────────

    private async searchKnowledgeBase(): Promise<void> {
        try {
            const query = await vscode.window.showInputBox({
                prompt: 'Search the Knowledge Base',
                placeHolder: 'Enter search terms…',
                ignoreFocusOut: true,
            });

            if (!query) {
                return; // cancelled
            }

            this.logger.info(`Searching knowledge base: "${query}"`, {
                component: 'DashboardCommands',
            });

            const { KnowledgeBase } = await import('../services/knowledgeBase');
            const kb = KnowledgeBase.getInstance();
            const results = kb.search({ text: query });

            if (results.length === 0) {
                vscode.window.showInformationMessage(
                    `No knowledge base entries found for "${query}".`,
                );
                return;
            }

            // Show quick-pick with results
            const items: vscode.QuickPickItem[] = results.map((entry) => ({
                label: entry.title,
                description: entry.category,
                detail: entry.content.substring(0, 120),
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `${results.length} result(s) for "${query}"`,
                matchOnDescription: true,
                matchOnDetail: true,
            });

            if (selected) {
                const match = results.find((e) => e.title === selected.label);
                if (match) {
                    // Open content in a new untitled editor
                    const doc = await vscode.workspace.openTextDocument({
                        content: `# ${match.title}\n\n**Category:** ${match.category}\n**Tags:** ${(match.tags ?? []).join(', ')}\n\n---\n\n${match.content}`,
                        language: 'markdown',
                    });
                    await vscode.window.showTextDocument(doc);
                }
            }
        } catch (err) {
            this.handleError('searchKnowledgeBase', err);
        }
    }

    // ── 5. Queue Status (AICC-0475) ──────────────────────────────

    private async showQueueStatus(): Promise<void> {
        try {
            this.logger.info('Opening queue status panel', {
                component: 'DashboardCommands',
            });

            const root = this.getWorkspaceRoot();
            if (!root) {
                return;
            }

            const { OfflineQueue } = await import('../services/offlineQueue');
            const queue = OfflineQueue.getInstance(root);
            const html = queue.generateDeadLetterReviewHtml();

            const panel = vscode.window.createWebviewPanel(
                'aicc.queueStatus',
                'Queue Status',
                vscode.ViewColumn.One,
                { enableScripts: true },
            );
            panel.webview.html = this.wrapQueueStatusHtml(queue, html);
        } catch (err) {
            this.handleError('showQueueStatus', err);
        }
    }

    /**
     * Wrap the dead-letter table with queue statistics header.
     */
    private wrapQueueStatusHtml(
        queue: ReturnType<typeof import('../services/offlineQueue').OfflineQueue.getInstance>,
        deadLetterHtml: string,
    ): string {
        const stats = queue.getStats();
        const online = queue.isOnline();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Queue Status</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 24px; }
        .stat-card { padding: 12px 16px; border-radius: 6px; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); }
        .stat-card .label { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
        .stat-card .value { font-size: 1.5em; font-weight: 600; margin-top: 4px; }
        .online { color: var(--vscode-testing-iconPassed); }
        .offline { color: var(--vscode-testing-iconFailed); }
        h2 { margin-top: 0; }
    </style>
</head>
<body>
    <h2>Offline Queue Status</h2>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="label">Network</div>
            <div class="value ${online ? 'online' : 'offline'}">${online ? '● Online' : '○ Offline'}</div>
        </div>
        <div class="stat-card">
            <div class="label">Pending</div>
            <div class="value">${stats.pending}</div>
        </div>
        <div class="stat-card">
            <div class="label">Processing</div>
            <div class="value">${stats.processing}</div>
        </div>
        <div class="stat-card">
            <div class="label">Dead Letters</div>
            <div class="value">${stats.deadLetter}</div>
        </div>
        <div class="stat-card">
            <div class="label">Total Processed</div>
            <div class="value">${stats.totalProcessed}</div>
        </div>
        <div class="stat-card">
            <div class="label">Total Failed</div>
            <div class="value">${stats.totalFailed}</div>
        </div>
    </div>
    <h3>Dead-Letter Items</h3>
    ${deadLetterHtml}
</body>
</html>`;
    }

    // ── 6. Export Agent Memory (AICC-0476) ────────────────────────

    private async exportAgentMemory(): Promise<void> {
        try {
            this.logger.info('Exporting agent memory', {
                component: 'DashboardCommands',
            });

            const root = this.getWorkspaceRoot();
            if (!root) {
                return;
            }

            const { AgentSessionMemory } = await import(
                '../services/agentSessionMemory'
            );
            const memory = AgentSessionMemory.getInstance(root);
            const markdown = memory.exportToMarkdown();

            const doc = await vscode.workspace.openTextDocument({
                content: markdown,
                language: 'markdown',
            });
            await vscode.window.showTextDocument(doc);

            vscode.window.showInformationMessage(
                'Agent session memory exported to editor.',
            );
        } catch (err) {
            this.handleError('exportAgentMemory', err);
        }
    }

    // ── 7. Confluence Push (AICC-0477a) ──────────────────────────

    private async confluencePush(): Promise<void> {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage(
                    'No active editor. Open a file to push to Confluence.',
                );
                return;
            }

            const filePath = editor.document.uri.fsPath;

            this.logger.info(`Pushing to Confluence: ${filePath}`, {
                component: 'DashboardCommands',
            });

            const { ConfluenceClient } = await import(
                '../integrations/confluenceClient'
            );
            const client = ConfluenceClient.getInstance();

            if (!client.isConfigured()) {
                vscode.window.showErrorMessage(
                    'Confluence is not configured. Set credentials in settings (aicc.confluence.*).',
                );
                return;
            }

            const spaceKey = await vscode.window.showInputBox({
                prompt: 'Confluence Space Key',
                placeHolder: 'e.g., DEV',
                ignoreFocusOut: true,
            });

            if (!spaceKey) {
                return; // cancelled
            }

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pushing to Confluence…',
                    cancellable: false,
                },
                async () => {
                    const result = await client.pushDocument(
                        filePath,
                        spaceKey,
                    );

                    if (result.errors.length > 0) {
                        vscode.window.showErrorMessage(
                            `Push errors: ${result.errors.join('; ')}`,
                        );
                    } else {
                        vscode.window.showInformationMessage(
                            `Successfully pushed ${result.pushed} page(s) to Confluence.`,
                        );
                    }
                },
            );
        } catch (err) {
            this.handleError('confluencePush', err);
        }
    }

    // ── 8. Confluence Pull (AICC-0477b) ──────────────────────────

    private async confluencePull(): Promise<void> {
        try {
            const { ConfluenceClient } = await import(
                '../integrations/confluenceClient'
            );
            const client = ConfluenceClient.getInstance();

            if (!client.isConfigured()) {
                vscode.window.showErrorMessage(
                    'Confluence is not configured. Set credentials in settings (aicc.confluence.*).',
                );
                return;
            }

            const pageId = await vscode.window.showInputBox({
                prompt: 'Confluence Page ID',
                placeHolder: 'e.g., 123456',
                ignoreFocusOut: true,
                validateInput: (value) =>
                    value.trim().length === 0
                        ? 'Page ID is required'
                        : null,
            });

            if (!pageId) {
                return; // cancelled
            }

            const root = this.getWorkspaceRoot();
            if (!root) {
                return;
            }

            const defaultPath = path.join(root, 'docs', `confluence-${pageId}.md`);

            const targetUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(defaultPath),
                filters: { Markdown: ['md'] },
                title: 'Save Confluence page as…',
            });

            if (!targetUri) {
                return; // cancelled
            }

            this.logger.info(
                `Pulling Confluence page ${pageId} → ${targetUri.fsPath}`,
                { component: 'DashboardCommands' },
            );

            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: 'Pulling from Confluence…',
                    cancellable: false,
                },
                async () => {
                    const result = await client.pullDocument(
                        pageId,
                        targetUri.fsPath,
                    );

                    if (result.errors.length > 0) {
                        vscode.window.showErrorMessage(
                            `Pull errors: ${result.errors.join('; ')}`,
                        );
                    } else {
                        const doc = await vscode.workspace.openTextDocument(
                            targetUri,
                        );
                        await vscode.window.showTextDocument(doc);
                        vscode.window.showInformationMessage(
                            `Pulled Confluence page ${pageId} successfully.`,
                        );
                    }
                },
            );
        } catch (err) {
            this.handleError('confluencePull', err);
        }
    }

    // ── Status Bar (Part 4 – AICC-0476) ──────────────────────────

    /**
     * Create a status bar item that shows the offline queue state and
     * refresh it every 30 seconds.
     */
    private initQueueStatusBar(): void {
        const statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            48,
        );
        statusBarItem.command = COMMAND_IDS.SHOW_QUEUE_STATUS;
        statusBarItem.tooltip = 'AICC Offline Queue Status';

        // Initial update
        this.updateQueueStatusBar(statusBarItem);

        // Periodic refresh every 30 s
        const timer = setInterval(() => {
            this.updateQueueStatusBar(statusBarItem);
        }, 30_000);

        statusBarItem.show();

        this.statusBar = { item: statusBarItem, timer };
        this.disposables.push(statusBarItem);
    }

    /**
     * Refresh the status bar text based on current queue state.
     */
    private updateQueueStatusBar(item: vscode.StatusBarItem): void {
        try {
            const root = this.getWorkspaceRootSilent();
            if (!root) {
                item.text = '$(cloud) Online';
                return;
            }

            // Synchronous require to avoid async in interval callback
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { OfflineQueue } = require('../services/offlineQueue') as typeof import('../services/offlineQueue');
            const queue = OfflineQueue.getInstance(root);
            const stats = queue.getStats();

            if (stats.deadLetter > 0) {
                item.text = `$(alert) ${stats.deadLetter} dead`;
                item.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.errorBackground',
                );
            } else if (stats.pending > 0) {
                item.text = `$(cloud-download) ${stats.pending} queued`;
                item.backgroundColor = new vscode.ThemeColor(
                    'statusBarItem.warningBackground',
                );
            } else {
                item.text = '$(cloud) Online';
                item.backgroundColor = undefined;
            }
        } catch {
            item.text = '$(cloud) Online';
            item.backgroundColor = undefined;
        }
    }

    /**
     * Get workspace root without showing an error (for status bar updates).
     */
    private getWorkspaceRootSilent(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }

    // ── Error Handling ───────────────────────────────────────────

    private handleError(command: string, err: unknown): void {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`DashboardCommands.${command} failed: ${message}`, {
            component: 'DashboardCommands',
            error: err,
        });
        vscode.window.showErrorMessage(`Command failed: ${message}`);
    }

    // ── Disposal ─────────────────────────────────────────────────

    public dispose(): void {
        if (this.statusBar) {
            clearInterval(this.statusBar.timer);
            this.statusBar.item.dispose();
        }
        this.disposables.forEach((d) => d.dispose());
        this.disposables.length = 0;
    }
}
