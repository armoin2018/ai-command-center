/**
 * Planning Tree View Context Menu Commands
 * 
 * Handles right-click context menu actions for the planning tree view
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';
import { COMMAND_IDS } from '../commands/commandIds';
import { PlanningTreeItem, PlanningTreeViewProvider } from './planningTreeView';

export interface TreeCommandContext {
    planningManager: PlanningManager;
    logger: Logger;
    treeViewProvider: PlanningTreeViewProvider;
}

/**
 * Register all planning tree context menu commands
 */
export function registerPlanningTreeCommands(
    _context: vscode.ExtensionContext,
    commandContext: TreeCommandContext
): vscode.Disposable[] {
    const { planningManager, logger, treeViewProvider } = commandContext;
    const disposables: vscode.Disposable[] = [];

    // Refresh command
    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_REFRESH, () => {
            logger.info('Refreshing planning tree view');
            treeViewProvider.refresh();
            vscode.window.showInformationMessage('Planning tree refreshed');
        })
    );

    // Edit command
    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_EDIT, async (item: PlanningTreeItem) => {
            if (!item || item.type === 'empty') {
                return;
            }

            logger.info('Edit item requested', { id: item.id, type: item.type });

            try {
                const newTitle = await vscode.window.showInputBox({
                    prompt: `Edit ${item.type} title`,
                    value: item.label as string,
                    validateInput: (value) => {
                        if (!value || value.trim().length === 0) {
                            return 'Title cannot be empty';
                        }
                        return null;
                    }
                });

                if (newTitle && newTitle !== item.label) {
                    await updateItemTitle(planningManager, item, newTitle);
                    treeViewProvider.refresh();
                    vscode.window.showInformationMessage(`Updated ${item.type}: ${newTitle}`);
                }
            } catch (error: any) {
                logger.error('Failed to edit item', { error: error.message, id: item.id });
                vscode.window.showErrorMessage(`Failed to edit ${item.type}: ${error.message}`);
            }
        })
    );

    // Delete command
    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_DELETE, async (item: PlanningTreeItem) => {
            if (!item || item.type === 'empty') {
                return;
            }

            logger.info('Delete item requested', { id: item.id, type: item.type });

            const confirm = await vscode.window.showWarningMessage(
                `Are you sure you want to delete ${item.type} "${item.label}"?`,
                { modal: true },
                'Delete'
            );

            if (confirm === 'Delete') {
                try {
                    await deleteItem(planningManager, item);
                    treeViewProvider.refresh();
                    vscode.window.showInformationMessage(`Deleted ${item.type}: ${item.label}`);
                } catch (error: any) {
                    logger.error('Failed to delete item', { error: error.message, id: item.id });
                    vscode.window.showErrorMessage(`Failed to delete ${item.type}: ${error.message}`);
                }
            }
        })
    );

    // Copy ID command
    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_COPY_ID, async (item: PlanningTreeItem) => {
            if (!item || item.type === 'empty') {
                return;
            }

            await vscode.env.clipboard.writeText(item.id);
            vscode.window.showInformationMessage(`Copied ${item.type} ID: ${item.id}`);
        })
    );

    // Copy as Markdown command
    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_COPY_MARKDOWN, async (item: PlanningTreeItem) => {
            if (!item || item.type === 'empty') {
                return;
            }

            const markdown = generateMarkdown(item);
            await vscode.env.clipboard.writeText(markdown);
            vscode.window.showInformationMessage(`Copied ${item.type} as Markdown`);
        })
    );

    // Status change commands
    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_SET_STATUS_NOT_STARTED, async (item: PlanningTreeItem) => {
            await changeStatus(planningManager, item, 'not-started', logger, treeViewProvider);
        })
    );

    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_SET_STATUS_IN_PROGRESS, async (item: PlanningTreeItem) => {
            await changeStatus(planningManager, item, 'in-progress', logger, treeViewProvider);
        })
    );

    disposables.push(
        vscode.commands.registerCommand(COMMAND_IDS.PLANNING_SET_STATUS_DONE, async (item: PlanningTreeItem) => {
            await changeStatus(planningManager, item, 'done', logger, treeViewProvider);
        })
    );

    logger.info('Planning tree context menu commands registered', { count: disposables.length });

    return disposables;
}

/**
 * Update item title based on type
 */
async function updateItemTitle(planningManager: PlanningManager, item: PlanningTreeItem, newTitle: string): Promise<void> {
    switch (item.type) {
        case 'epic':
            await planningManager.updateEpic(item.id, { title: newTitle });
            break;
        case 'story':
            // Need to find the epic ID for the story
            const epicForStory = await findEpicForStory(planningManager, item.id);
            if (epicForStory) {
                await planningManager.updateStory(epicForStory.id, item.id, { title: newTitle });
            }
            break;
        case 'task':
            // Need to find epic and story IDs for the task
            const taskParents = await findParentsForTask(planningManager, item.id);
            if (taskParents) {
                await planningManager.updateTask(taskParents.epicId, taskParents.storyId, item.id, { title: newTitle });
            }
            break;
    }
}

/**
 * Delete item based on type
 */
async function deleteItem(planningManager: PlanningManager, item: PlanningTreeItem): Promise<void> {
    switch (item.type) {
        case 'epic':
            await planningManager.deleteEpic(item.id);
            break;
        case 'story':
            const epicForStory = await findEpicForStory(planningManager, item.id);
            if (epicForStory) {
                await planningManager.deleteStory(epicForStory.id, item.id);
            }
            break;
        case 'task':
            const taskParents = await findParentsForTask(planningManager, item.id);
            if (taskParents) {
                await planningManager.deleteTask(taskParents.epicId, taskParents.storyId, item.id);
            }
            break;
    }
}

/**
 * Change item status
 */
async function changeStatus(
    planningManager: PlanningManager,
    item: PlanningTreeItem,
    status: string,
    logger: Logger,
    treeViewProvider: PlanningTreeViewProvider
): Promise<void> {
    if (!item || item.type === 'empty') {
        return;
    }

    logger.info('Change status requested', { id: item.id, type: item.type, status });

    try {
        switch (item.type) {
            case 'epic':
                await planningManager.updateEpic(item.id, { status: status as any });
                break;
            case 'story':
                const epicForStory = await findEpicForStory(planningManager, item.id);
                if (epicForStory) {
                    await planningManager.updateStory(epicForStory.id, item.id, { status: status as any });
                }
                break;
            case 'task':
                const taskParents = await findParentsForTask(planningManager, item.id);
                if (taskParents) {
                    await planningManager.updateTask(taskParents.epicId, taskParents.storyId, item.id, { status: status as any });
                }
                break;
        }

        treeViewProvider.refresh();
        vscode.window.showInformationMessage(`Updated ${item.type} status to: ${status}`);
    } catch (error: any) {
        logger.error('Failed to change status', { error: error.message, id: item.id });
        vscode.window.showErrorMessage(`Failed to change status: ${error.message}`);
    }
}

/**
 * Find the epic that contains a story
 */
async function findEpicForStory(planningManager: PlanningManager, storyId: string): Promise<{ id: string } | null> {
    const epics = await planningManager.listEpics();
    for (const epic of epics) {
        const stories = await planningManager.listStories(epic.id);
        if (stories.find(s => s.id === storyId)) {
            return epic;
        }
    }
    return null;
}

/**
 * Find the epic and story that contain a task
 */
async function findParentsForTask(planningManager: PlanningManager, taskId: string): Promise<{ epicId: string; storyId: string } | null> {
    const epics = await planningManager.listEpics();
    for (const epic of epics) {
        const stories = await planningManager.listStories(epic.id);
        for (const story of stories) {
            const tasks = await planningManager.listTasks(epic.id, story.id);
            if (tasks.find(t => t.id === taskId)) {
                return { epicId: epic.id, storyId: story.id };
            }
        }
    }
    return null;
}

/**
 * Generate Markdown representation of a tree item
 */
function generateMarkdown(item: PlanningTreeItem): string {
    const typeIcon = item.type === 'epic' ? '🎯' : item.type === 'story' ? '📖' : '✅';
    const statusIcon = getStatusIcon(item.status);
    
    let md = `## ${typeIcon} ${item.label}\n\n`;
    md += `**ID:** \`${item.id}\`\n`;
    md += `**Type:** ${item.type}\n`;
    
    if (item.status) {
        md += `**Status:** ${statusIcon} ${item.status}\n`;
    }
    
    if (item.storyPoints) {
        md += `**Story Points:** ${item.storyPoints}\n`;
    }
    
    if (item.description) {
        md += `\n### Description\n${item.description}\n`;
    }
    
    return md;
}

/**
 * Get status emoji icon
 */
function getStatusIcon(status?: string): string {
    switch (status?.toLowerCase()) {
        case 'done':
            return '✅';
        case 'in-progress':
            return '🔄';
        case 'not-started':
            return '⬜';
        case 'pending':
            return '⏳';
        default:
            return '📋';
    }
}
