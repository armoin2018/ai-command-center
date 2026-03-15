/**
 * Tool-related command registration.
 * Extracted from extension.ts to reduce monolith size.
 *
 * Registers commands for:
 * - Init Toolset (execute, create example, validate, undo, show log)
 * - File Protection (show logs, list backups, restore, configure)
 * - Undo Manager (show history, undo last, undo panel, undo since)
 * - Mermaid Panel (preview, preview selection)
 * - Diagram Converter (convert PlantUML, convert selection)
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { COMMAND_IDS } from '../commands/commandIds';
import { Logger } from '../logger';

/**
 * Register Init Toolset commands.
 *
 * Provides commands to discover, execute, validate, and undo operations
 * defined in an `init/map.yaml` workspace file.
 *
 * @param context - The extension context for subscription management.
 * @param workspaceRoot - Absolute path to the workspace root folder.
 * @param logger - Logger instance for structured error reporting.
 */
export async function registerInitToolsetCommands(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    logger: Logger
): Promise<void> {
    const { InitManager } = await import('../init/initManager');
    const initManager = new InitManager(workspaceRoot, logger);

    // --- Execute init map ---
    const initExecuteCommand = vscode.commands.registerCommand(COMMAND_IDS.INIT_EXECUTE, async () => {
        try {
            const mapPath = await initManager.findInitMap();
            if (!mapPath) {
                const choice = await vscode.window.showInformationMessage(
                    'No init/map.yaml found. Would you like to create an example?',
                    'Create Example', 'Cancel'
                );
                if (choice === 'Create Example') {
                    vscode.commands.executeCommand(COMMAND_IDS.INIT_CREATE_EXAMPLE);
                }
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Execute operations from ${path.relative(workspaceRoot, mapPath)}?`,
                { modal: true },
                'Execute', 'Cancel'
            );
            if (confirm !== 'Execute') {
                return;
            }

            const summary = await initManager.executeFromFile(mapPath);

            const output = vscode.window.createOutputChannel('AICC Init Toolset');
            output.clear();
            output.appendLine(initManager.formatSummary(summary));
            output.show();

            await initManager.saveLog();

            if (summary.failed > 0) {
                vscode.window.showWarningMessage(`Init operations completed with ${summary.failed} error(s)`);
            } else {
                vscode.window.showInformationMessage(`Init operations completed: ${summary.successful} successful, ${summary.skipped} skipped`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Init execution failed: ${message}`);
            vscode.window.showErrorMessage(`Init execution failed: ${message}`);
        }
    });

    // --- Create example init map ---
    const initCreateExampleCommand = vscode.commands.registerCommand(COMMAND_IDS.INIT_CREATE_EXAMPLE, async () => {
        try {
            await initManager.createExampleMap();
            vscode.window.showInformationMessage('Created example init/map.yaml');

            const uri = vscode.Uri.file(path.join(workspaceRoot, 'init/map.yaml'));
            const document = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to create example: ${message}`);
            vscode.window.showErrorMessage(`Failed to create example: ${message}`);
        }
    });

    // --- Validate init map ---
    const initValidateCommand = vscode.commands.registerCommand(COMMAND_IDS.INIT_VALIDATE, async () => {
        try {
            const mapPath = await initManager.findInitMap();
            if (!mapPath) {
                vscode.window.showInformationMessage('No init/map.yaml found');
                return;
            }

            const validation = await initManager.validateMap(mapPath);

            if (validation.valid) {
                vscode.window.showInformationMessage('Init map is valid');
            } else {
                vscode.window.showErrorMessage(`Init map validation failed:\n${validation.errors.join('\n')}`);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Validation failed: ${message}`);
            vscode.window.showErrorMessage(`Validation failed: ${message}`);
        }
    });

    // --- Undo last init operation ---
    const initUndoCommand = vscode.commands.registerCommand(COMMAND_IDS.INIT_UNDO, async () => {
        try {
            const result = await initManager.undoLast();

            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showWarningMessage(result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Undo failed: ${message}`);
            vscode.window.showErrorMessage(`Undo failed: ${message}`);
        }
    });

    // --- Show init operations log ---
    const initShowLogCommand = vscode.commands.registerCommand(COMMAND_IDS.INIT_SHOW_LOG, async () => {
        try {
            const log = initManager.getLog();

            if (log.length === 0) {
                vscode.window.showInformationMessage('No operations logged yet');
                return;
            }

            const output = vscode.window.createOutputChannel('AICC Init Log');
            output.clear();
            output.appendLine('=== INIT OPERATIONS LOG ===\n');

            log.forEach((entry, index) => {
                const status = entry.success ? '✓' : '✗';
                output.appendLine(`${index + 1}. ${status} [${entry.timestamp}] ${entry.action.toUpperCase()}: ${entry.target}`);
                if (entry.error) {
                    output.appendLine(`   Error: ${entry.error}`);
                }
            });

            output.show();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to show log: ${message}`);
            vscode.window.showErrorMessage(`Failed to show log: ${message}`);
        }
    });

    context.subscriptions.push(
        initExecuteCommand,
        initCreateExampleCommand,
        initValidateCommand,
        initUndoCommand,
        initShowLogCommand
    );
}

/**
 * Register File Protection commands.
 *
 * Provides commands to view operation logs, list / restore backups, and
 * configure the backup retention policy.
 *
 * @param context - The extension context for subscription management.
 * @param workspaceRoot - Absolute path to the workspace root folder.
 * @param logger - Logger instance for structured error reporting.
 */
export async function registerFileProtectionCommands(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    logger: Logger
): Promise<void> {
    const { FileProtection } = await import('../utils/fileProtection');
    const fileProtection = new FileProtection(workspaceRoot, logger);

    // --- Show file operation logs ---
    const fileProtectionShowLogsCommand = vscode.commands.registerCommand(COMMAND_IDS.FILE_PROTECTION_SHOW_LOGS, async () => {
        try {
            const logs = await fileProtection.getOperationLogs(100); // Last 100 operations

            if (logs.length === 0) {
                vscode.window.showInformationMessage('No file operations logged yet');
                return;
            }

            const output = vscode.window.createOutputChannel('AICC File Operations');
            output.clear();
            output.appendLine('=== FILE OPERATIONS LOG ===\n');

            logs.forEach((log, index) => {
                const status = log.status === 'Success' ? '✓' : '✗';
                output.appendLine(`${index + 1}. ${status} [${log.timestamp}] ${log.action}: ${log.filePath}`);
                if (log.backupPath) {
                    output.appendLine(`   Backup: ${log.backupPath}`);
                }
                if (log.error) {
                    output.appendLine(`   Error: ${log.error}`);
                }
            });

            output.show();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to show file operation logs: ${message}`);
            vscode.window.showErrorMessage(`Failed to show file operation logs: ${message}`);
        }
    });

    // --- List backups for a specific file ---
    const fileProtectionListBackupsCommand = vscode.commands.registerCommand(COMMAND_IDS.FILE_PROTECTION_LIST_BACKUPS, async () => {
        try {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                defaultUri: vscode.Uri.file(workspaceRoot),
                title: 'Select file to list backups'
            });

            if (!fileUri || fileUri.length === 0) {
                return;
            }

            const filePath = fileUri[0].fsPath;
            const backups = await fileProtection.getFileBackups(filePath);

            if (backups.length === 0) {
                vscode.window.showInformationMessage('No backups found for this file');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                backups.map(backup => ({
                    label: path.basename(backup),
                    description: path.dirname(backup),
                    detail: backup
                })),
                {
                    placeHolder: 'Select a backup to view or restore',
                    title: `Backups for ${path.basename(filePath)}`
                }
            );

            if (selected) {
                const action = await vscode.window.showQuickPick(
                    ['View Backup', 'Restore from Backup'],
                    { placeHolder: 'What would you like to do?' }
                );

                if (action === 'View Backup') {
                    const uri = vscode.Uri.file(path.join(workspaceRoot, selected.detail!));
                    const document = await vscode.workspace.openTextDocument(uri);
                    await vscode.window.showTextDocument(document);
                } else if (action === 'Restore from Backup') {
                    const confirm = await vscode.window.showWarningMessage(
                        `Restore ${path.basename(filePath)} from backup ${selected.label}?`,
                        { modal: true },
                        'Restore', 'Cancel'
                    );

                    if (confirm === 'Restore') {
                        await fileProtection.restoreFromBackup(selected.detail!);
                        vscode.window.showInformationMessage('File restored successfully');
                    }
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to list backups: ${message}`);
            vscode.window.showErrorMessage(`Failed to list backups: ${message}`);
        }
    });

    // --- Restore from a recent backup ---
    const fileProtectionRestoreBackupCommand = vscode.commands.registerCommand(COMMAND_IDS.FILE_PROTECTION_RESTORE_BACKUP, async () => {
        try {
            const logs = await fileProtection.getOperationLogs(50);
            const logsWithBackup = logs.filter(log => log.backupPath);

            if (logsWithBackup.length === 0) {
                vscode.window.showInformationMessage('No backups available');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                logsWithBackup.reverse().map(log => ({
                    label: `${log.action}: ${path.basename(log.filePath)}`,
                    description: new Date(log.timestamp).toLocaleString(),
                    detail: `Backup: ${log.backupPath}`,
                    backup: log.backupPath!
                })),
                {
                    placeHolder: 'Select an operation to restore',
                    title: 'Restore from Backup'
                }
            );

            if (selected) {
                const confirm = await vscode.window.showWarningMessage(
                    `Restore file from backup?`,
                    { modal: true },
                    'Restore', 'Cancel'
                );

                if (confirm === 'Restore') {
                    await fileProtection.restoreFromBackup(selected.backup);
                    vscode.window.showInformationMessage('File restored successfully');
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to restore backup: ${message}`);
            vscode.window.showErrorMessage(`Failed to restore backup: ${message}`);
        }
    });

    // --- Configure retention policy ---
    const fileProtectionConfigureCommand = vscode.commands.registerCommand(COMMAND_IDS.FILE_PROTECTION_CONFIGURE, async () => {
        try {
            const policy = fileProtection.getRetentionPolicy();

            const maxAge = await vscode.window.showInputBox({
                prompt: 'Maximum backup age (days)',
                value: String(policy.maxAge),
                validateInput: (value) => {
                    const num = parseInt(value);
                    return isNaN(num) || num <= 0 ? 'Must be a positive number' : null;
                }
            });

            if (!maxAge) {
                return;
            }

            const maxBackups = await vscode.window.showInputBox({
                prompt: 'Maximum backups per file',
                value: String(policy.maxBackups),
                validateInput: (value) => {
                    const num = parseInt(value);
                    return isNaN(num) || num <= 0 ? 'Must be a positive number' : null;
                }
            });

            if (!maxBackups) {
                return;
            }

            fileProtection.setRetentionPolicy({
                maxAge: parseInt(maxAge),
                maxBackups: parseInt(maxBackups)
            });

            vscode.window.showInformationMessage('File protection policy updated');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to configure file protection: ${message}`);
            vscode.window.showErrorMessage(`Failed to configure file protection: ${message}`);
        }
    });

    context.subscriptions.push(
        fileProtectionShowLogsCommand,
        fileProtectionListBackupsCommand,
        fileProtectionRestoreBackupCommand,
        fileProtectionConfigureCommand
    );
}

/**
 * Register Undo Manager commands.
 *
 * Provides commands to view undo history, undo a number of recent
 * operations, open the undo panel, and undo everything since a timestamp.
 *
 * @param context - The extension context for subscription management.
 * @param workspaceRoot - Absolute path to the workspace root folder.
 * @param logger - Logger instance for structured error reporting.
 */
export async function registerUndoManagerCommands(
    context: vscode.ExtensionContext,
    workspaceRoot: string,
    logger: Logger
): Promise<void> {
    const { FileProtection } = await import('../utils/fileProtection');
    const fileProtection = new FileProtection(workspaceRoot, logger);

    const { UndoManager } = await import('../utils/undoManager');
    const undoManager = new UndoManager(fileProtection, logger);

    // --- Show interactive undo history UI ---
    const undoShowHistoryCommand = vscode.commands.registerCommand(COMMAND_IDS.UNDO_SHOW_HISTORY, async () => {
        try {
            await undoManager.showUndoUI(context);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to show undo history: ${message}`);
            vscode.window.showErrorMessage(`Failed to show undo history: ${message}`);
        }
    });

    // --- Undo N most recent operations ---
    const undoLastCommand = vscode.commands.registerCommand(COMMAND_IDS.UNDO_LAST, async () => {
        try {
            const countStr = await vscode.window.showInputBox({
                prompt: 'How many operations to undo?',
                value: '1',
                validateInput: (value) => {
                    const num = parseInt(value);
                    return isNaN(num) || num <= 0 ? 'Must be a positive number' : null;
                }
            });

            if (!countStr) {
                return;
            }

            const count = parseInt(countStr);
            const result = await undoManager.undoLast(count);

            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showWarningMessage(result.message);
            }

            if (result.errors.length > 0) {
                logger.error('Undo errors', { errors: result.errors });
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Undo failed: ${message}`);
            vscode.window.showErrorMessage(`Undo failed: ${message}`);
        }
    });

    // --- Open webview undo panel ---
    const undoPanelCommand = vscode.commands.registerCommand(COMMAND_IDS.UNDO_PANEL, async () => {
        try {
            await undoManager.showUndoPanel(context);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to open undo panel: ${message}`);
            vscode.window.showErrorMessage(`Failed to open undo panel: ${message}`);
        }
    });

    // --- Undo all operations since a selected timestamp ---
    const undoSinceCommand = vscode.commands.registerCommand(COMMAND_IDS.UNDO_SINCE, async () => {
        try {
            const history = await undoManager.getUndoHistory(20);

            if (history.length === 0) {
                vscode.window.showInformationMessage('No operations to undo');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                history.map(op => ({
                    label: new Date(op.timestamp).toLocaleString(),
                    description: op.description,
                    timestamp: op.timestamp
                })),
                {
                    placeHolder: 'Undo all operations since...',
                    title: 'Select Timestamp'
                }
            );

            if (!selected) {
                return;
            }

            const confirm = await vscode.window.showWarningMessage(
                `Undo all operations since ${selected.label}?`,
                { modal: true },
                'Undo', 'Cancel'
            );

            if (confirm !== 'Undo') {
                return;
            }

            const result = await undoManager.undoSince(new Date(selected.timestamp));

            if (result.success) {
                vscode.window.showInformationMessage(result.message);
            } else {
                vscode.window.showWarningMessage(result.message);
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Undo failed: ${message}`);
            vscode.window.showErrorMessage(`Undo failed: ${message}`);
        }
    });

    context.subscriptions.push(
        undoShowHistoryCommand,
        undoLastCommand,
        undoPanelCommand,
        undoSinceCommand
    );
}

/**
 * Register Mermaid Panel commands.
 *
 * Provides commands to preview Mermaid diagrams from the active editor
 * or from the current text selection.
 *
 * @param context - The extension context for subscription management.
 * @param logger - Logger instance for structured error reporting.
 */
export async function registerMermaidCommands(
    context: vscode.ExtensionContext,
    logger: Logger
): Promise<void> {
    const { MermaidPanelProvider } = await import('../panels/mermaidPanel');

    // --- Preview entire document as Mermaid diagram ---
    const mermaidPreviewCommand = vscode.commands.registerCommand(COMMAND_IDS.MERMAID_PREVIEW, async () => {
        try {
            await MermaidPanelProvider.renderFromActiveEditor(context.extensionUri, logger);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to preview Mermaid diagram: ${message}`);
            vscode.window.showErrorMessage(`Failed to preview Mermaid diagram: ${message}`);
        }
    });

    // --- Preview selected text as Mermaid diagram ---
    const mermaidPreviewSelectionCommand = vscode.commands.registerCommand(COMMAND_IDS.MERMAID_PREVIEW_SELECTION, async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText) {
                vscode.window.showErrorMessage('No text selected');
                return;
            }

            MermaidPanelProvider.render(
                context.extensionUri,
                logger,
                {
                    source: selectedText,
                    title: 'Selected Mermaid Code'
                }
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to preview selection: ${message}`);
            vscode.window.showErrorMessage(`Failed to preview selection: ${message}`);
        }
    });

    context.subscriptions.push(
        mermaidPreviewCommand,
        mermaidPreviewSelectionCommand
    );
}

/**
 * Register Diagram Converter commands.
 *
 * Provides commands to convert PlantUML diagrams to Mermaid syntax,
 * either from the entire active document or from the current selection.
 *
 * @param context - The extension context for subscription management.
 * @param logger - Logger instance for structured error reporting.
 */
export async function registerDiagramConverterCommands(
    context: vscode.ExtensionContext,
    logger: Logger
): Promise<void> {
    const { DiagramConverter } = await import('../diagramConverter');
    const diagramConverter = new DiagramConverter(logger);

    // --- Convert entire document from PlantUML to Mermaid ---
    const convertPlantUMLCommand = vscode.commands.registerCommand(COMMAND_IDS.CONVERT_PLANTUML, async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const document = editor.document;
            const plantUMLCode = document.getText();

            if (!plantUMLCode.trim()) {
                vscode.window.showErrorMessage('Document is empty');
                return;
            }

            const result = diagramConverter.convert(plantUMLCode);

            if (!result.success) {
                vscode.window.showErrorMessage(`Conversion failed: ${result.errors.join(', ')}`);
                return;
            }

            if (result.warnings.length > 0) {
                vscode.window.showWarningMessage(`Conversion completed with warnings: ${result.warnings.join(', ')}`);
            }

            const newDoc = await vscode.workspace.openTextDocument({
                language: 'mermaid',
                content: result.mermaidCode
            });
            await vscode.window.showTextDocument(newDoc);

            vscode.window.showInformationMessage(`Successfully converted ${result.diagramType} diagram to Mermaid`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to convert PlantUML: ${message}`);
            vscode.window.showErrorMessage(`Failed to convert PlantUML: ${message}`);
        }
    });

    // --- Convert selected text from PlantUML to Mermaid (in-place) ---
    const convertPlantUMLSelectionCommand = vscode.commands.registerCommand(COMMAND_IDS.CONVERT_PLANTUML_SELECTION, async () => {
        try {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No active editor');
                return;
            }

            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            if (!selectedText.trim()) {
                vscode.window.showErrorMessage('No text selected');
                return;
            }

            const result = diagramConverter.convert(selectedText);

            if (!result.success) {
                vscode.window.showErrorMessage(`Conversion failed: ${result.errors.join(', ')}`);
                return;
            }

            if (result.warnings.length > 0) {
                vscode.window.showWarningMessage(`Conversion completed with warnings: ${result.warnings.join(', ')}`);
            }

            await editor.edit(editBuilder => {
                editBuilder.replace(selection, result.mermaidCode);
            });

            vscode.window.showInformationMessage(`Successfully converted ${result.diagramType} diagram to Mermaid`);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`Failed to convert PlantUML: ${message}`);
            vscode.window.showErrorMessage(`Failed to convert PlantUML: ${message}`);
        }
    });

    context.subscriptions.push(
        convertPlantUMLCommand,
        convertPlantUMLSelectionCommand
    );
}
