/**
 * Planning Commands
 * 
 * Provides VS Code commands for planning operations:
 * - Create, update, delete epics/stories/tasks
 * - View planning tree
 * - Search planning items
 * - Export to Jira
 */

import * as vscode from 'vscode';
import { PlanningManager } from './planningManager';
import { Logger } from '../logger';
import { UserError } from '../errors/customErrors';
import { Priority } from './types';

export class PlanningCommands {
    private manager: PlanningManager;
    private logger: Logger;

    constructor(manager: PlanningManager, logger: Logger) {
        this.manager = manager;
        this.logger = logger;
    }

    /**
     * Register all planning commands
     */
    public register(context: vscode.ExtensionContext): void {
        const commands = [
            vscode.commands.registerCommand('aicc.createEpic', () => this.createEpic()),
            vscode.commands.registerCommand('aicc.createStory', () => this.createStory()),
            vscode.commands.registerCommand('aicc.createTask', () => this.createTask()),
            vscode.commands.registerCommand('aicc.viewPlanningTree', () => this.viewPlanningTree()),
            vscode.commands.registerCommand('aicc.searchPlanning', () => this.searchPlanning()),
            vscode.commands.registerCommand('aicc.updatePlanningItem', () => this.updatePlanningItem()),
            vscode.commands.registerCommand('aicc.deletePlanningItem', () => this.deletePlanningItem()),
            vscode.commands.registerCommand('aicc.showBlockedItems', () => this.showBlockedItems()),
            vscode.commands.registerCommand('aicc.showPlanningStats', () => this.showPlanningStats()),
        ];

        commands.forEach(cmd => context.subscriptions.push(cmd));
        this.logger.info('Planning commands registered', { count: commands.length });
    }

    /**
     * Create a new epic
     */
    private async createEpic(): Promise<void> {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter epic name',
                placeHolder: 'User Authentication System',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Epic name is required';
                    }
                    if (value.length > 200) {
                        return 'Epic name must be 200 characters or less';
                    }
                    return null;
                }
            });

            if (!name) {
                return; // User cancelled
            }

            const description = await vscode.window.showInputBox({
                prompt: 'Enter epic description',
                placeHolder: 'Implement complete user authentication with OAuth',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Description is required';
                    }
                    return null;
                }
            });

            if (!description) {
                return;
            }

            const priority = await vscode.window.showQuickPick(
                ['low', 'medium', 'high', 'critical'],
                { placeHolder: 'Select priority' }
            );

            if (!priority) {
                return;
            }

            const epic = await this.manager.createEpic({
                title: name.trim(),
                description: description.trim(),
                priority: priority as Priority
            });

            vscode.window.showInformationMessage(`Epic created: ${epic.title} (${epic.id})`);
            this.logger.info('Epic created via command', { epicId: epic.id, title: epic.title });

        } catch (error) {
            this.handleError('Failed to create epic', error);
        }
    }

    /**
     * Create a new story
     */
    private async createStory(): Promise<void> {
        try {
            // Get epics for selection
            const epics = await this.manager.listEpics();
            if (epics.length === 0) {
                vscode.window.showWarningMessage('No epics found. Create an epic first.');
                return;
            }

            const epicItems = epics.map(epic => ({
                label: epic.title,
                description: epic.id,
                epic
            }));

            const selectedEpic = await vscode.window.showQuickPick(epicItems, {
                placeHolder: 'Select parent epic'
            });

            if (!selectedEpic) {
                return;
            }

            const name = await vscode.window.showInputBox({
                prompt: 'Enter story name',
                placeHolder: 'User Login Page',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Story name is required';
                    }
                    return null;
                }
            });

            if (!name) {
                return;
            }

            const description = await vscode.window.showInputBox({
                prompt: 'Enter story description',
                placeHolder: 'As a user, I want to log in so that...',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Description is required';
                    }
                    return null;
                }
            });

            if (!description) {
                return;
            }

            const storyPointsStr = await vscode.window.showQuickPick(
                ['1', '2', '3', '5', '8', '13', '21'],
                { placeHolder: 'Select story points' }
            );

            if (!storyPointsStr) {
                return;
            }

            const story = await this.manager.createStory(selectedEpic.epic.id, {
                title: name.trim(),
                description: description.trim(),
                storyPoints: parseInt(storyPointsStr),
                priority: Priority.Medium
            });

            vscode.window.showInformationMessage(`Story created: ${story.title} (${story.id})`);
            this.logger.info('Story created via command', { storyId: story.id, epicId: selectedEpic.epic.id });

        } catch (error) {
            this.handleError('Failed to create story', error);
        }
    }

    /**
     * Create a new task
     */
    private async createTask(): Promise<void> {
        try {
            // Get all epics first to get all stories
            const epics = await this.manager.listEpics();
            if (epics.length === 0) {
                vscode.window.showWarningMessage('No epics found. Create an epic first.');
                return;
            }

            // Collect all stories from all epics
            const allStories: Array<{ epicId: string; story: any }> = [];
            for (const epic of epics) {
                const stories = await this.manager.listStories(epic.id);
                stories.forEach(story => allStories.push({ epicId: epic.id, story }));
            }

            if (allStories.length === 0) {
                vscode.window.showWarningMessage('No stories found. Create a story first.');
                return;
            }

            const storyItems = allStories.map(({ epicId, story }) => ({
                label: story.title,
                description: `${story.id} (${story.estimatedHours} pts)`,
                epicId,
                story
            }));

            const selectedStory = await vscode.window.showQuickPick(storyItems, {
                placeHolder: 'Select parent story'
            });

            if (!selectedStory) {
                return;
            }

            const name = await vscode.window.showInputBox({
                prompt: 'Enter task name',
                placeHolder: 'Create login form component',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Task name is required';
                    }
                    return null;
                }
            });

            if (!name) {
                return;
            }

            const description = await vscode.window.showInputBox({
                prompt: 'Enter task description',
                placeHolder: 'Build React component with email/password inputs',
                validateInput: (value) => {
                    if (!value || value.trim().length === 0) {
                        return 'Description is required';
                    }
                    return null;
                }
            });

            if (!description) {
                return;
            }

            const estimatedHoursStr = await vscode.window.showInputBox({
                prompt: 'Estimated hours (optional)',
                placeHolder: '4',
                validateInput: (value) => {
                    if (value && isNaN(Number(value))) {
                        return 'Must be a number';
                    }
                    return null;
                }
            });

            const task = await this.manager.createTask(selectedStory.epicId, selectedStory.story.id, {
                title: name.trim(),
                description: description.trim(),
                priority: Priority.Medium,
                storyPoints: estimatedHoursStr ? parseFloat(estimatedHoursStr) : undefined
            });

            vscode.window.showInformationMessage(`Task created: ${task.title} (${task.id})`);
            this.logger.info('Task created via command', { taskId: task.id, storyId: selectedStory.story.id, epicId: selectedStory.epicId });

        } catch (error) {
            this.handleError('Failed to create task', error);
        }
    }

    /**
     * View planning tree statistics
     */
    private async viewPlanningTree(): Promise<void> {
        try {
            const tree = await this.manager.getTree();
            const stats = await this.manager.getTreeStatistics();

            const panel = vscode.window.createOutputChannel('AI Command Center - Planning Tree');
            panel.show();

            panel.appendLine('=== Planning Tree ===\n');
            panel.appendLine(`Total Epics: ${stats.epicCount}`);
            panel.appendLine(`Total Stories: ${stats.storyCount}`);
            panel.appendLine(`Total Tasks: ${stats.taskCount}`);
            panel.appendLine(`\nStory Points:`);
            panel.appendLine(`  Total: ${stats.totalStoryPoints}`);
            panel.appendLine(`  Completion: ${stats.completionPercentage.toFixed(1)}%`);
            panel.appendLine(`\nStatus Distribution:`);
            panel.appendLine(`  Blocked: ${stats.blockedCount}`);
            panel.appendLine(`  In Progress: ${stats.inProgressCount}`);
            panel.appendLine(`  Completed: ${stats.completedCount}`);
            panel.appendLine(`  Not Started: ${stats.notStartedCount}`);

            // Show tree structure
            panel.appendLine('\n=== Tree Structure ===\n');
            this.renderTree(panel, tree);

            this.logger.info('Planning tree viewed', { stats });

        } catch (error) {
            this.handleError('Failed to view planning tree', error);
        }
    }

    /**
     * Render tree in output channel
     */
    private renderTree(panel: vscode.OutputChannel, node: any, indent: string = ''): void {
        const statusIcon = this.getStatusIcon(node.status);
        panel.appendLine(`${indent}${statusIcon} ${node.name} (${node.type})`);

        if (node.children && node.children.length > 0) {
            node.children.forEach((child: any) => {
                this.renderTree(panel, child, indent + '  ');
            });
        }
    }

    /**
     * Get status icon
     */
    private getStatusIcon(status: string): string {
        const icons: Record<string, string> = {
            'planning': '📋',
            'todo': '⏳',
            'in-progress': '🔄',
            'done': '✅',
            'pending': '🚫'
        };
        return icons[status] || '❓';
    }

    /**
     * Search planning items
     */
    private async searchPlanning(): Promise<void> {
        try {
            const query = await vscode.window.showInputBox({
                prompt: 'Enter search query',
                placeHolder: 'authentication'
            });

            if (!query) {
                return;
            }

            const results = await this.manager.searchByName(query);

            if (results.length === 0) {
                vscode.window.showInformationMessage(`No results found for "${query}"`);
                return;
            }

            const items = results.map(node => ({
                label: node.name,
                description: `${node.type} - ${node.status}`,
                detail: node.id,
                node
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `${results.length} result(s) found`,
                matchOnDescription: true,
                matchOnDetail: true
            });

            if (selected) {
                vscode.window.showInformationMessage(`Selected: ${selected.node.name} (${selected.node.id})`);
            }

        } catch (error) {
            this.handleError('Failed to search planning', error);
        }
    }

    /**
     * Update a planning item
     */
    private async updatePlanningItem(): Promise<void> {
        try {
            const itemType = await vscode.window.showQuickPick(
                ['Epic', 'Story', 'Task'],
                { placeHolder: 'Select item type to update' }
            );

            if (!itemType) {
                return;
            }

            // Implementation depends on item type
            vscode.window.showInformationMessage('Update functionality coming soon');

        } catch (error) {
            this.handleError('Failed to update planning item', error);
        }
    }

    /**
     * Delete a planning item
     */
    private async deletePlanningItem(): Promise<void> {
        try {
            const itemType = await vscode.window.showQuickPick(
                ['Epic', 'Story', 'Task'],
                { placeHolder: 'Select item type to delete' }
            );

            if (!itemType) {
                return;
            }

            // Implementation depends on item type
            vscode.window.showInformationMessage('Delete functionality coming soon');

        } catch (error) {
            this.handleError('Failed to delete planning item', error);
        }
    }

    /**
     * Show blocked items
     */
    private async showBlockedItems(): Promise<void> {
        try {
            const blockedItems = await this.manager.getBlockedItems();

            if (blockedItems.length === 0) {
                vscode.window.showInformationMessage('No blocked items found');
                return;
            }

            const panel = vscode.window.createOutputChannel('AI Command Center - Blocked Items');
            panel.show();

            panel.appendLine('=== Blocked Items ===\n');
            blockedItems.forEach(item => {
                panel.appendLine(`🚫 ${item.name} (${item.type})`);
                panel.appendLine(`   ID: ${item.id}`);
                panel.appendLine(`   Status: ${item.status}`);
                panel.appendLine('');
            });

            this.logger.info('Blocked items shown', { count: blockedItems.length });

        } catch (error) {
            this.handleError('Failed to show blocked items', error);
        }
    }

    /**
     * Show planning statistics
     */
    private async showPlanningStats(): Promise<void> {
        try {
            const stats = await this.manager.getTreeStatistics();

            const message = `Planning Stats:\n` +
                `Epics: ${stats.epicCount}\n` +
                `Stories: ${stats.storyCount}\n` +
                `Tasks: ${stats.taskCount}\n` +
                `Story Points: ${stats.totalStoryPoints}\n` +
                `Completion: ${stats.completionPercentage.toFixed(1)}%`;

            vscode.window.showInformationMessage(message, { modal: false });
            this.logger.info('Planning stats shown', { stats });

        } catch (error) {
            this.handleError('Failed to show planning stats', error);
        }
    }

    /**
     * Handle errors consistently
     */
    private handleError(message: string, error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (error instanceof UserError) {
            vscode.window.showWarningMessage(`${message}: ${errorMessage}`);
        } else {
            vscode.window.showErrorMessage(`${message}: ${errorMessage}`);
        }

        this.logger.error(message, { error });
    }
}
