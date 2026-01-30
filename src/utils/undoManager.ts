/**
 * Undo Manager
 * 
 * Manages undo/redo operations for file changes using FileProtection backups
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { FileProtection, FileOperationLog } from './fileProtection';

export interface UndoOperation {
    id: string;
    timestamp: string;
    description: string;
    operations: FileOperationLog[];
    canUndo: boolean;
}

export interface UndoResult {
    success: boolean;
    message: string;
    restoredFiles: string[];
    errors: string[];
}

export class UndoManager {
    private logger: Logger;
    private fileProtection: FileProtection;
    private maxHistorySize: number = 100;

    constructor(fileProtection: FileProtection, logger: Logger) {
        this.fileProtection = fileProtection;
        this.logger = logger;
    }

    /**
     * Get available undo operations
     */
    async getUndoHistory(limit: number = 50): Promise<UndoOperation[]> {
        const logs = await this.fileProtection.getOperationLogs(this.maxHistorySize);
        
        // Group operations by timestamp proximity (within 5 seconds = same transaction)
        const transactions: Map<string, FileOperationLog[]> = new Map();
        
        for (const log of logs) {
            const timestamp = new Date(log.timestamp);
            const transactionKey = this.getTransactionKey(timestamp);
            
            if (!transactions.has(transactionKey)) {
                transactions.set(transactionKey, []);
            }
            transactions.get(transactionKey)!.push(log);
        }

        // Convert to undo operations
        const undoOps: UndoOperation[] = [];
        let opId = 1;

        for (const [_key, ops] of Array.from(transactions.entries()).reverse()) {
            const firstOp = ops[0];
            const canUndo = ops.some(op => op.backupPath && op.status === 'Success');
            
            undoOps.push({
                id: `undo-${opId++}`,
                timestamp: firstOp.timestamp,
                description: this.generateDescription(ops),
                operations: ops,
                canUndo
            });
        }

        return undoOps.slice(0, limit);
    }

    /**
     * Undo a single operation
     */
    async undoOperation(operationId: string): Promise<UndoResult> {
        const history = await this.getUndoHistory();
        const operation = history.find(op => op.id === operationId);

        if (!operation) {
            return {
                success: false,
                message: 'Operation not found',
                restoredFiles: [],
                errors: ['Operation not found in history']
            };
        }

        if (!operation.canUndo) {
            return {
                success: false,
                message: 'Cannot undo this operation (no backups available)',
                restoredFiles: [],
                errors: ['No backups available for this operation']
            };
        }

        return await this.undoOperations(operation.operations);
    }

    /**
     * Undo the last N operations
     */
    async undoLast(count: number = 1): Promise<UndoResult> {
        const history = await this.getUndoHistory(count);
        
        if (history.length === 0) {
            return {
                success: false,
                message: 'No operations to undo',
                restoredFiles: [],
                errors: ['No operations in history']
            };
        }

        const toUndo = history.slice(0, count);
        const allOps = toUndo.flatMap(op => op.operations);

        return await this.undoOperations(allOps);
    }

    /**
     * Undo all operations since a specific timestamp
     */
    async undoSince(timestamp: Date): Promise<UndoResult> {
        const history = await this.getUndoHistory();
        const toUndo = history.filter(op => new Date(op.timestamp) >= timestamp);

        if (toUndo.length === 0) {
            return {
                success: false,
                message: 'No operations found since specified time',
                restoredFiles: [],
                errors: ['No operations found']
            };
        }

        const allOps = toUndo.flatMap(op => op.operations);
        return await this.undoOperations(allOps);
    }

    /**
     * Undo multiple operations
     */
    private async undoOperations(operations: FileOperationLog[]): Promise<UndoResult> {
        const restoredFiles: string[] = [];
        const errors: string[] = [];

        // Filter operations with backups
        const restorableOps = operations.filter(op => 
            op.backupPath && op.status === 'Success' && 
            (op.action === 'UPDATE' || op.action === 'DELETE' || op.action === 'MOVE')
        );

        if (restorableOps.length === 0) {
            return {
                success: false,
                message: 'No restorable operations found',
                restoredFiles: [],
                errors: ['No operations with backups available']
            };
        }

        // Restore in reverse order (most recent first)
        for (const op of restorableOps.reverse()) {
            try {
                await this.fileProtection.restoreFromBackup(op.backupPath!);
                restoredFiles.push(op.filePath);
                this.logger.info(`Undone operation: ${op.action} ${op.filePath}`);
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                errors.push(`Failed to restore ${op.filePath}: ${errorMsg}`);
                this.logger.error(`Undo failed for ${op.filePath}`, { error });
            }
        }

        const success = restoredFiles.length > 0;
        const message = success
            ? `Successfully restored ${restoredFiles.length} file(s)`
            : 'Failed to restore any files';

        return {
            success,
            message,
            restoredFiles,
            errors
        };
    }

    /**
     * Show interactive undo UI
     */
    async showUndoUI(_context: vscode.ExtensionContext): Promise<void> {
        const history = await this.getUndoHistory(20);

        if (history.length === 0) {
            vscode.window.showInformationMessage('No operations to undo');
            return;
        }

        // Create quick pick items
        const items = history.map(op => ({
            label: this.formatOperationLabel(op),
            description: new Date(op.timestamp).toLocaleString(),
            detail: op.description,
            operation: op,
            iconPath: op.canUndo 
                ? new vscode.ThemeIcon('debug-reverse-continue')
                : new vscode.ThemeIcon('circle-slash')
        }));

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select an operation to undo',
            title: 'Undo File Operations',
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selected) {
            return;
        }

        if (!selected.operation.canUndo) {
            vscode.window.showWarningMessage('This operation cannot be undone (no backups available)');
            return;
        }

        // Confirm undo
        const fileCount = selected.operation.operations.filter(op => op.backupPath).length;
        const confirm = await vscode.window.showWarningMessage(
            `Undo ${fileCount} file operation(s)?`,
            { modal: true },
            'Undo', 'Cancel'
        );

        if (confirm !== 'Undo') {
            return;
        }

        // Perform undo
        const result = await this.undoOperation(selected.operation.id);

        if (result.success) {
            vscode.window.showInformationMessage(result.message);
            
            // Show details if needed
            if (result.restoredFiles.length > 0) {
                this.logger.info('Files restored:', { files: result.restoredFiles });
            }
        } else {
            vscode.window.showErrorMessage(result.message);
            
            if (result.errors.length > 0) {
                this.logger.error('Undo errors:', { errors: result.errors });
            }
        }
    }

    /**
     * Show undo panel in webview
     */
    async showUndoPanel(_context: vscode.ExtensionContext): Promise<void> {
        const history = await this.getUndoHistory(50);

        const panel = vscode.window.createWebviewPanel(
            'aiccUndoPanel',
            'File Operations History',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this.getUndoPanelHTML(history);

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'undo':
                    const result = await this.undoOperation(message.operationId);
                    panel.webview.postMessage({
                        command: 'undoResult',
                        result
                    });
                    
                    if (result.success) {
                        // Refresh history
                        const updatedHistory = await this.getUndoHistory(50);
                        panel.webview.postMessage({
                            command: 'updateHistory',
                            history: updatedHistory
                        });
                    }
                    break;

                case 'refresh':
                    const refreshedHistory = await this.getUndoHistory(50);
                    panel.webview.postMessage({
                        command: 'updateHistory',
                        history: refreshedHistory
                    });
                    break;
            }
        });
    }

    /**
     * Generate transaction key for grouping operations
     */
    private getTransactionKey(timestamp: Date): string {
        const roundedTime = Math.floor(timestamp.getTime() / 5000) * 5000;
        return new Date(roundedTime).toISOString();
    }

    /**
     * Generate description for grouped operations
     */
    private generateDescription(operations: FileOperationLog[]): string {
        if (operations.length === 1) {
            const op = operations[0];
            return `${op.action} ${op.filePath}`;
        }

        const actions = new Map<string, number>();
        for (const op of operations) {
            actions.set(op.action, (actions.get(op.action) || 0) + 1);
        }

        const parts: string[] = [];
        for (const [action, count] of actions) {
            parts.push(`${count} ${action.toLowerCase()}`);
        }

        return parts.join(', ');
    }

    /**
     * Format operation label for quick pick
     */
    private formatOperationLabel(operation: UndoOperation): string {
        const status = operation.canUndo ? '$(check)' : '$(circle-slash)';
        const fileCount = operation.operations.length;
        return `${status} ${operation.description} (${fileCount} file${fileCount > 1 ? 's' : ''})`;
    }

    /**
     * Get HTML for undo panel
     */
    private getUndoPanelHTML(history: UndoOperation[]): string {
        const historyHTML = history.map(op => {
            const canUndo = op.canUndo ? 'can-undo' : 'cannot-undo';
            const icon = op.canUndo ? '✓' : '✗';
            const files = op.operations.map(o => o.filePath).join('<br>');
            
            return `
                <div class="operation ${canUndo}" data-id="${op.id}">
                    <div class="operation-header">
                        <span class="status">${icon}</span>
                        <span class="description">${op.description}</span>
                        <span class="timestamp">${new Date(op.timestamp).toLocaleString()}</span>
                        ${op.canUndo ? `<button class="undo-btn" onclick="undoOperation('${op.id}')">Undo</button>` : ''}
                    </div>
                    <div class="operation-files">${files}</div>
                </div>
            `;
        }).join('');

        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Operations History</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        h1 {
            margin-top: 0;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .toolbar {
            margin-bottom: 20px;
        }
        .toolbar button {
            padding: 6px 12px;
            margin-right: 10px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
        }
        .toolbar button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .operation {
            border: 1px solid var(--vscode-panel-border);
            margin-bottom: 10px;
            padding: 10px;
            border-radius: 4px;
        }
        .operation.can-undo {
            background: var(--vscode-editor-background);
        }
        .operation.cannot-undo {
            opacity: 0.6;
            background: var(--vscode-input-background);
        }
        .operation-header {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status {
            font-weight: bold;
            font-size: 16px;
        }
        .description {
            flex: 1;
            font-weight: 500;
        }
        .timestamp {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
        .undo-btn {
            padding: 4px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            border-radius: 3px;
        }
        .undo-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .operation-files {
            margin-top: 8px;
            padding-left: 30px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h1>File Operations History</h1>
    <div class="toolbar">
        <button onclick="refreshHistory()">Refresh</button>
        <button onclick="undoLast()">Undo Last</button>
    </div>
    <div id="history">
        ${historyHTML}
    </div>
    <script>
        const vscode = acquireVsCodeApi();

        function undoOperation(id) {
            vscode.postMessage({ command: 'undo', operationId: id });
        }

        function refreshHistory() {
            vscode.postMessage({ command: 'refresh' });
        }

        function undoLast() {
            const operations = document.querySelectorAll('.operation.can-undo');
            if (operations.length > 0) {
                const firstId = operations[0].getAttribute('data-id');
                undoOperation(firstId);
            }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'undoResult':
                    if (message.result.success) {
                        alert(message.result.message);
                    } else {
                        alert('Undo failed: ' + message.result.message);
                    }
                    break;
                    
                case 'updateHistory':
                    location.reload();
                    break;
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Set maximum history size
     */
    setMaxHistorySize(size: number): void {
        this.maxHistorySize = Math.max(10, Math.min(500, size));
        this.logger.info('Undo history size updated', { size: this.maxHistorySize });
    }

    /**
     * Get undo statistics
     */
    async getStatistics(): Promise<{
        totalOperations: number;
        undoableOperations: number;
        operationsByType: Map<string, number>;
        oldestOperation: string | null;
        newestOperation: string | null;
    }> {
        const logs = await this.fileProtection.getOperationLogs();
        
        const operationsByType = new Map<string, number>();
        let undoableCount = 0;

        for (const log of logs) {
            operationsByType.set(log.action, (operationsByType.get(log.action) || 0) + 1);
            if (log.backupPath && log.status === 'Success') {
                undoableCount++;
            }
        }

        return {
            totalOperations: logs.length,
            undoableOperations: undoableCount,
            operationsByType,
            oldestOperation: logs.length > 0 ? logs[0].timestamp : null,
            newestOperation: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        };
    }
}
