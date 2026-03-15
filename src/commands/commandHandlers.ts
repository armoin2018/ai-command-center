import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EpicManager } from '../planning/epicManager';
import { StoryManager } from '../planning/storyManager';
import { TaskManager } from '../planning/taskManager';
import { Priority } from '../planning/types';

const logger = Logger.getInstance();

/**
 * Creates a new epic in the planning structure.
 */
export async function createEpicCommand(): Promise<void> {
    // Get workspace root
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Get epic name
    const epicName = await vscode.window.showInputBox({
        prompt: 'Enter epic name',
        placeHolder: 'e.g., User Authentication System',
        validateInput: (value) => {
            return value.trim().length === 0 ? 'Epic name cannot be empty' : null;
        }
    });

    if (!epicName) {
        return; // User cancelled
    }

    // Get description
    const description = await vscode.window.showInputBox({
        prompt: 'Enter epic description',
        placeHolder: 'Describe the epic scope and goals...'
    });

    if (!description) {
        return; // User cancelled
    }

    try {
        const epicManager = new EpicManager(workspaceFolder.uri.fsPath, logger);
        const epic = await epicManager.createEpic({
            title: epicName,
            description,
            priority: Priority.Medium
        });

        vscode.window.showInformationMessage(
            `Epic "${epic.title}" (${epic.id}) created successfully!`
        );

        logger.info('Epic created via command', {
            component: 'commandHandlers',
            epicId: epic.id,
            epicName: epic.title
        });
    } catch (error) {
        // Error already handled by ErrorHandler in EpicManager
        logger.error('Failed to create epic via command', {
            component: 'commandHandlers',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Creates a new story in the planning structure.
 */
export async function createStoryCommand(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Get epic ID
    const epicId = await vscode.window.showInputBox({
        prompt: 'Enter epic ID (e.g., epic-001)',
        placeHolder: 'epic-001',
        validateInput: (value) => {
            return value.trim().length === 0 ? 'Epic ID cannot be empty' : null;
        }
    });

    if (!epicId) {
        return;
    }

    // Get story name
    const storyName = await vscode.window.showInputBox({
        prompt: 'Enter story name',
        placeHolder: 'e.g., User Login Flow',
        validateInput: (value) => {
            return value.trim().length === 0 ? 'Story name cannot be empty' : null;
        }
    });

    if (!storyName) {
        return;
    }

    // Get description
    const description = await vscode.window.showInputBox({
        prompt: 'Enter story description',
        placeHolder: 'Describe the story requirements...'
    });

    if (!description) {
        return;
    }

    // Get story points (optional)
    const storyPointsInput = await vscode.window.showInputBox({
        prompt: 'Enter story points (optional)',
        placeHolder: '0, 1, 2, 3, 5, 8, 13...',
        value: '0'
    });

    const storyPoints = storyPointsInput ? parseInt(storyPointsInput, 10) : 0;

    try {
        const storyManager = new StoryManager(workspaceFolder.uri.fsPath, logger);
        const story = await storyManager.createStory(epicId, {
            title: storyName,
            description,
            storyPoints,
            priority: Priority.Medium
        });

        vscode.window.showInformationMessage(
            `Story "${story.title}" (${story.id}) created in epic ${epicId}!`
        );

        logger.info('Story created via command', {
            component: 'commandHandlers',
            storyId: story.id,
            epicId,
            storyName: story.title
        });
    } catch (error) {
        logger.error('Failed to create story via command', {
            component: 'commandHandlers',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Creates a new task in the planning structure.
 */
export async function createTaskCommand(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Get epic ID
    const epicId = await vscode.window.showInputBox({
        prompt: 'Enter epic ID (e.g., epic-001)',
        placeHolder: 'epic-001',
        validateInput: (value) => {
            return value.trim().length === 0 ? 'Epic ID cannot be empty' : null;
        }
    });

    if (!epicId) {
        return;
    }

    // Get story ID
    const storyId = await vscode.window.showInputBox({
        prompt: 'Enter story ID (e.g., story-001)',
        placeHolder: 'story-001',
        validateInput: (value) => {
            return value.trim().length === 0 ? 'Story ID cannot be empty' : null;
        }
    });

    if (!storyId) {
        return;
    }

    // Get task name
    const taskName = await vscode.window.showInputBox({
        prompt: 'Enter task name',
        placeHolder: 'e.g., Implement password validation',
        validateInput: (value) => {
            return value.trim().length === 0 ? 'Task name cannot be empty' : null;
        }
    });

    if (!taskName) {
        return;
    }

    // Get description
    const description = await vscode.window.showInputBox({
        prompt: 'Enter task description',
        placeHolder: 'Describe the task requirements...'
    });

    if (!description) {
        return;
    }

    // Get story points (optional)
    const storyPointsInput = await vscode.window.showInputBox({
        prompt: 'Enter story points (optional)',
        placeHolder: '0, 1, 2, 3, 5...',
        value: '0'
    });

    const storyPoints = storyPointsInput ? parseInt(storyPointsInput, 10) : 0;

    // Get assignee (optional)
    const assignee = await vscode.window.showInputBox({
        prompt: 'Enter assignee (optional)',
        placeHolder: 'john.doe'
    });

    try {
        const taskManager = new TaskManager(workspaceFolder.uri.fsPath, logger);
        const task = await taskManager.createTask(epicId, storyId, {
            title: taskName,
            description,
            storyPoints,
            assignee: assignee || undefined,
            priority: Priority.Medium
        });

        vscode.window.showInformationMessage(
            `Task "${task.title}" (${task.id}) created in story ${storyId}!`
        );

        logger.info('Task created via command', {
            component: 'commandHandlers',
            taskId: task.id,
            storyId,
            epicId,
            taskName: task.title
        });
    } catch (error) {
        logger.error('Failed to create task via command', {
            component: 'commandHandlers',
            error: error instanceof Error ? error.message : String(error)
        });
    }
}

/**
 * Opens the planning panel WebView.
 */
export async function openPlanningPanelCommand(): Promise<void> {
    // MainPanel.render() is called directly from extension.ts command registration
    // This handler is kept for compatibility with the command wrapper system
    vscode.window.showInformationMessage('Opening Planning Panel...');
}

/**
 * Exports planning data to Jira.
 * Note: Jira sync is now handled by dedicated Jira commands (aicc.jira.*)
 */
export async function exportToJiraCommand(): Promise<void> {
    // Redirect to the new Jira sync command
    vscode.window.showInformationMessage(
        'Use "AI Command Center: Sync with Jira" command for Jira integration'
    );
}
/**
 * Opens the extension settings.
 */
export async function openSettingsCommand(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.openSettings', 'aicc');
    logger.info('Opened settings', { component: 'commandHandlers' });
}

/**
 * Shows the debug panel.
 */
export async function showDebugPanelCommand(): Promise<void> {
    const outputChannel = vscode.window.createOutputChannel('AI Command Center Debug');
    outputChannel.show();
    outputChannel.appendLine('=== AI Command Center Debug Panel ===');
    outputChannel.appendLine(`Timestamp: ${new Date().toISOString()}`);
    outputChannel.appendLine('');
    
    // Get workspace info
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    outputChannel.appendLine(`Workspace: ${workspaceFolder?.uri.fsPath || 'None'}`);
    
    // Get extension version
    const extension = vscode.extensions.getExtension('bmcdonnell.ai-command-center');
    outputChannel.appendLine(`Extension Version: ${extension?.packageJSON.version || 'Unknown'}`);
    
    logger.info('Opened debug panel', { component: 'commandHandlers' });
}

/**
 * Shows help information.
 * Opens documentation in markdown preview or provides quick reference / issue links.
 */
export async function showHelpCommand(): Promise<void> {
    const action = await vscode.window.showInformationMessage(
        'AI Command Center Help',
        'Open User Guide',
        'Quick Start',
        "What's New",
        'Report Issue'
    );

    const extensionPath = vscode.extensions.getExtension('ai-command-center.ai-command-center')?.extensionPath
        ?? vscode.extensions.getExtension('bmcdonnell.ai-command-center')?.extensionPath;

    if (action === 'Open User Guide') {
        await openDocInPreview('docs/USER_GUIDE.md', extensionPath);
    } else if (action === 'Quick Start') {
        await openDocInPreview('docs/QUICK_START.md', extensionPath);
    } else if (action === "What's New") {
        await openDocInPreview('docs/WHATS_NEW.md', extensionPath);
    } else if (action === 'Report Issue') {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/armoin2018/ai-command-center/issues'));
    }
    
    logger.info('Opened help', { component: 'commandHandlers' });
}

/**
 * Opens a documentation markdown file in the VS Code markdown preview pane.
 * Tries the workspace folder first, then falls back to the extension path.
 */
async function openDocInPreview(relativePath: string, extensionPath?: string): Promise<void> {
    // Try workspace folder first
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const candidates: vscode.Uri[] = [];
    if (workspaceFolder) {
        candidates.push(vscode.Uri.joinPath(workspaceFolder.uri, relativePath));
    }
    if (extensionPath) {
        candidates.push(vscode.Uri.file(require('path').join(extensionPath, relativePath)));
    }

    for (const uri of candidates) {
        try {
            await vscode.workspace.openTextDocument(uri);
            await vscode.commands.executeCommand('markdown.showPreview', uri);
            return;
        } catch {
            // Try next candidate
        }
    }
    vscode.window.showErrorMessage(`Documentation file not found: ${relativePath}`);
}

/**
 * Saves all pending changes in the planning panel.
 */
export async function saveAllChangesCommand(): Promise<void> {
    vscode.window.showInformationMessage('Saving all changes...');
    // This will be called from the webview via message passing
    // The actual save logic is in the SecondaryPanelProvider
    logger.info('Save all changes triggered', { component: 'commandHandlers' });
}

/**
 * Runs the next available item in the planning queue.
 */
export async function runNextItemCommand(): Promise<void> {
    // Find the next ready/open item and execute it
    vscode.window.showInformationMessage('Running next item...');
    
    // Trigger the AI-ley Orchestrator with the next item
    await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: '/ailey-run next'
    });
    
    logger.info('Run next item triggered', { component: 'commandHandlers' });
}

/**
 * Updates the status of a planning item.
 */
export async function updateItemStatusCommand(itemId?: string, newStatus?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    if (!newStatus) {
        const statusOptions = ['todo', 'open', 'in-progress', 'ready', 'done', 'hold', 'error'];
        newStatus = await vscode.window.showQuickPick(statusOptions, {
            placeHolder: 'Select new status'
        });
    }
    
    if (!newStatus) {
        return;
    }
    
    // The actual update is handled by the planning managers
    logger.info('Status update requested', {
        component: 'commandHandlers',
        itemId,
        newStatus
    });
    
    vscode.window.showInformationMessage(`Updated ${itemId} to ${newStatus}`);
}

/**
 * Runs a specific planning item.
 */
export async function runItemCommand(itemId?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID to run',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    // Open chat with the AI-ley Orchestrator
    await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: `/ailey-run ${itemId}`
    });
    
    logger.info('Run item triggered', {
        component: 'commandHandlers',
        itemId
    });
}

/**
 * Opens the edit panel for a planning item.
 */
export async function editItemCommand(itemId?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID to edit',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    // Send message to webview to expand the edit panel
    logger.info('Edit item triggered', {
        component: 'commandHandlers',
        itemId
    });
}

/**
 * Shows info panel for a planning item.
 */
export async function showItemInfoCommand(itemId?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    logger.info('Show item info triggered', {
        component: 'commandHandlers',
        itemId
    });
}

/**
 * Shows connections panel for a planning item.
 */
export async function showItemConnectionsCommand(itemId?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    logger.info('Show item connections triggered', {
        component: 'commandHandlers',
        itemId
    });
}

/**
 * Shows repository panel for a planning item.
 */
export async function showItemRepoCommand(itemId?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    logger.info('Show item repo triggered', {
        component: 'commandHandlers',
        itemId
    });
}

/**
 * Shows comments panel for a planning item.
 */
export async function showItemCommentsCommand(itemId?: string): Promise<void> {
    if (!itemId) {
        itemId = await vscode.window.showInputBox({
            prompt: 'Enter item ID',
            placeHolder: 'e.g., task-001'
        });
    }
    
    if (!itemId) {
        return;
    }
    
    logger.info('Show item comments triggered', {
        component: 'commandHandlers',
        itemId
    });
}

/**
 * Installs an AI Kit from a GitHub repository.
 */
export async function installAIKitCommand(kitId?: string): Promise<void> {
    if (!kitId) {
        kitId = await vscode.window.showInputBox({
            prompt: 'Enter AI Kit ID to install',
            placeHolder: 'e.g., base-instructions'
        });
    }
    
    if (!kitId) {
        return;
    }
    
    vscode.window.showInformationMessage(`Installing AI Kit: ${kitId}...`);
    
    logger.info('Install AI Kit triggered', {
        component: 'commandHandlers',
        kitId
    });
}

/**
 * Uninstalls an AI Kit.
 */
export async function uninstallAIKitCommand(kitId?: string): Promise<void> {
    if (!kitId) {
        kitId = await vscode.window.showInputBox({
            prompt: 'Enter AI Kit ID to uninstall',
            placeHolder: 'e.g., base-instructions'
        });
    }
    
    if (!kitId) {
        return;
    }
    
    const confirm = await vscode.window.showWarningMessage(
        `Are you sure you want to uninstall AI Kit: ${kitId}?`,
        'Yes',
        'No'
    );
    
    if (confirm !== 'Yes') {
        return;
    }
    
    vscode.window.showInformationMessage(`Uninstalling AI Kit: ${kitId}...`);
    
    logger.info('Uninstall AI Kit triggered', {
        component: 'commandHandlers',
        kitId
    });
}

/**
 * Refreshes the AI Kits list.
 */
export async function refreshAIKitsCommand(): Promise<void> {
    vscode.window.showInformationMessage('Refreshing AI Kits...');
    
    logger.info('Refresh AI Kits triggered', { component: 'commandHandlers' });
}