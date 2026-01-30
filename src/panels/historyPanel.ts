/**
 * History Panel - Evolution Tracker WebView Panel
 * 
 * Displays item change history with timeline visualization
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';
import { ItemHistory, EvolutionEvent } from '../planning/evolutionTracker';

export class HistoryPanel {
    public static currentPanel: HistoryPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private readonly logger: Logger;
    private readonly planningManager: PlanningManager;
    private disposables: vscode.Disposable[] = [];
    private currentItemId: string | null = null;

    public static show(
        context: vscode.ExtensionContext,
        planningManager: PlanningManager,
        logger: Logger,
        itemId?: string
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (HistoryPanel.currentPanel) {
            HistoryPanel.currentPanel.panel.reveal(column);
            if (itemId) {
                HistoryPanel.currentPanel.showHistory(itemId);
            }
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'aiccHistory',
            'Item History',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        HistoryPanel.currentPanel = new HistoryPanel(
            panel,
            context.extensionUri,
            planningManager,
            logger
        );

        if (itemId) {
            HistoryPanel.currentPanel.showHistory(itemId);
        }
    }

    private constructor(
        panel: vscode.WebviewPanel,
        _extensionUri: vscode.Uri,
        planningManager: PlanningManager,
        logger: Logger
    ) {
        this.panel = panel;
        this.planningManager = planningManager;
        this.logger = logger;

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'loadHistory':
                        await this.showHistory(message.itemId);
                        break;
                    case 'filterEvents':
                        await this.filterEvents(message.eventType);
                        break;
                }
            },
            null,
            this.disposables
        );

        this.updateContent(null);
    }

    private async showHistory(itemId: string): Promise<void> {
        this.currentItemId = itemId;
        const tracker = this.planningManager.getEvolutionTracker();
        const history = await tracker.getItemHistory(itemId);
        
        this.updateContent(history);
        
        this.logger.info('History loaded', {
            component: 'HistoryPanel',
            itemId,
            eventCount: history?.events.length || 0
        });
    }

    private async filterEvents(eventType: string): Promise<void> {
        if (!this.currentItemId) return;
        
        const tracker = this.planningManager.getEvolutionTracker();
        const history = await tracker.getItemHistory(this.currentItemId);
        
        if (history && eventType !== 'all') {
            history.events = history.events.filter(e => e.eventType === eventType);
        }
        
        this.updateContent(history);
    }

    private updateContent(history: ItemHistory | null): void {
        this.panel.webview.html = this.getHtmlContent(history);
    }

    private getHtmlContent(history: ItemHistory | null): string {
        const eventTypes = ['all', 'created', 'updated', 'deleted', 'status_changed', 'priority_changed', 'assigned', 'moved'];
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Item History</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-item {
            background: var(--vscode-input-background);
            padding: 10px 15px;
            border-radius: 4px;
        }
        .stat-label {
            font-size: 0.9em;
            opacity: 0.8;
        }
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
        }
        .filters {
            margin-bottom: 20px;
        }
        .filter-select {
            padding: 6px 12px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            font-size: 14px;
        }
        .timeline {
            position: relative;
            padding-left: 30px;
        }
        .timeline::before {
            content: '';
            position: absolute;
            left: 10px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: var(--vscode-widget-border);
        }
        .event {
            position: relative;
            margin-bottom: 20px;
            padding: 15px;
            background: var(--vscode-input-background);
            border-radius: 4px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .event::before {
            content: '';
            position: absolute;
            left: -24px;
            top: 20px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--vscode-textLink-foreground);
            border: 2px solid var(--vscode-editor-background);
        }
        .event-created::before { background: var(--vscode-terminal-ansiGreen); }
        .event-updated::before { background: var(--vscode-terminal-ansiBlue); }
        .event-deleted::before { background: var(--vscode-terminal-ansiRed); }
        .event-status_changed::before { background: var(--vscode-terminal-ansiYellow); }
        .event-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .event-type {
            font-weight: bold;
            text-transform: capitalize;
        }
        .event-time {
            opacity: 0.7;
            font-size: 0.9em;
        }
        .event-changes {
            margin-top: 10px;
        }
        .change-item {
            margin: 5px 0;
            padding: 5px 10px;
            background: var(--vscode-editor-background);
            border-radius: 3px;
            font-family: monospace;
            font-size: 0.9em;
        }
        .change-field {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        .change-old {
            color: var(--vscode-terminal-ansiRed);
        }
        .change-new {
            color: var(--vscode-terminal-ansiGreen);
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    ${history ? this.renderHistory(history, eventTypes) : this.renderEmptyState()}
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function filterEvents(eventType) {
            vscode.postMessage({
                type: 'filterEvents',
                eventType: eventType
            });
        }
    </script>
</body>
</html>`;
    }

    private renderHistory(history: ItemHistory, eventTypes: string[]): string {
        return `
<div class="header">
    <h2>History: ${history.itemType} - ${history.itemId}</h2>
</div>

<div class="stats">
    <div class="stat-item">
        <div class="stat-label">Total Changes</div>
        <div class="stat-value">${history.totalChanges}</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Created</div>
        <div class="stat-value">${new Date(history.createdAt).toLocaleDateString()}</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Last Modified</div>
        <div class="stat-value">${new Date(history.lastModified).toLocaleDateString()}</div>
    </div>
</div>

<div class="filters">
    <label>Filter by type: </label>
    <select class="filter-select" onchange="filterEvents(this.value)">
        ${eventTypes.map(type => `<option value="${type}">${type.replace('_', ' ')}</option>`).join('')}
    </select>
</div>

<div class="timeline">
    ${history.events.length > 0 ? history.events.map(event => this.renderEvent(event)).join('') : '<div class="empty-state">No events found</div>'}
</div>`;
    }

    private renderEvent(event: EvolutionEvent): string {
        const timeStr = new Date(event.timestamp).toLocaleString();
        const changes = event.changes.map(change => `
            <div class="change-item">
                <span class="change-field">${change.field}:</span>
                <span class="change-old">${JSON.stringify(change.oldValue)}</span> → 
                <span class="change-new">${JSON.stringify(change.newValue)}</span>
            </div>
        `).join('');

        return `
<div class="event event-${event.eventType}">
    <div class="event-header">
        <span class="event-type">${event.eventType.replace('_', ' ')}</span>
        <span class="event-time">${timeStr}</span>
    </div>
    ${event.userId ? `<div>User: ${event.userId}</div>` : ''}
    ${event.changes.length > 0 ? `<div class="event-changes">${changes}</div>` : ''}
</div>`;
    }

    private renderEmptyState(): string {
        return `
<div class="empty-state">
    <h3>No Item Selected</h3>
    <p>Select an item from the planning tree to view its history</p>
</div>`;
    }

    public dispose(): void {
        HistoryPanel.currentPanel = undefined;
        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
