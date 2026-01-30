/**
 * Planning Tree View Provider
 * 
 * Provides a tree view in the Activity Bar sidebar showing the planning hierarchy
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';

export class PlanningTreeViewProvider implements vscode.TreeDataProvider<PlanningTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PlanningTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<PlanningTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PlanningTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    constructor(
        private planningManager: PlanningManager,
        private logger: Logger
    ) {}

    /**
     * Refresh the tree view
     */
    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    /**
     * Get tree item representation
     */
    getTreeItem(element: PlanningTreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Get children of a tree item
     */
    async getChildren(element?: PlanningTreeItem): Promise<PlanningTreeItem[]> {
        if (!element) {
            // Root level - return all epics
            return this.getEpics();
        }

        // Return children based on element type
        switch (element.type) {
            case 'epic':
                return this.getStoriesForEpic(element.id);
            case 'story':
                return this.getTasksForStory(element.id);
            default:
                return [];
        }
    }

    /**
     * Get all epics as tree items
     */
    private async getEpics(): Promise<PlanningTreeItem[]> {
        try {
            const epics = await this.planningManager.listEpics();
            
            if (epics.length === 0) {
                return [new PlanningTreeItem(
                    'No epics yet',
                    '',
                    'empty',
                    vscode.TreeItemCollapsibleState.None,
                    'Click "+" to create your first epic'
                )];
            }

            return epics.map(epic => {
                // Get stories count for this epic
                return new PlanningTreeItem(
                    epic.title,
                    epic.id,
                    'epic',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    epic.description,
                    epic.status
                );
            });
        } catch (error) {
            this.logger.error('Failed to get epics for tree view', { error });
            return [];
        }
    }

    /**
     * Get stories for an epic
     */
    private async getStoriesForEpic(epicId: string): Promise<PlanningTreeItem[]> {
        try {
            const stories = await this.planningManager.listStories(epicId);
            
            if (stories.length === 0) {
                return [];
            }

            return stories.map(story => {
                return new PlanningTreeItem(
                    story.title,
                    story.id,
                    'story',
                    vscode.TreeItemCollapsibleState.Collapsed,
                    story.description,
                    story.status,
                    story.estimatedHours
                );
            });
        } catch (error) {
            this.logger.error(`Failed to get stories for epic ${epicId}`, { error });
            return [];
        }
    }

    /**
     * Get tasks for a story
     */
    private async getTasksForStory(storyId: string): Promise<PlanningTreeItem[]> {
        try {
            // Need to get the epic ID for the story first
            const epics = await this.planningManager.listEpics();
            let epicId = '';
            
            for (const epic of epics) {
                const stories = await this.planningManager.listStories(epic.id);
                if (stories.find(s => s.id === storyId)) {
                    epicId = epic.id;
                    break;
                }
            }
            
            if (!epicId) {
                return [];
            }
            
            const tasks = await this.planningManager.listTasks(epicId, storyId);
            
            if (tasks.length === 0) {
                return [];
            }

            return tasks.map(task => {
                return new PlanningTreeItem(
                    task.title,
                    task.id,
                    'task',
                    vscode.TreeItemCollapsibleState.None,
                    task.description,
                    task.status
                );
            });
        } catch (error) {
            this.logger.error(`Failed to get tasks for story ${storyId}`, { error });
            return [];
        }
    }
}

/**
 * Tree item representing an Epic, Story, or Task
 */
export class PlanningTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly type: 'epic' | 'story' | 'task' | 'empty',
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly description?: string,
        public readonly status?: string,
        public readonly storyPoints?: number
    ) {
        super(label, collapsibleState);

        this.tooltip = description || label;
        this.contextValue = type;

        // Set icon based on type and status
        this.iconPath = this.getIcon();

        // Add status and story points to description if available
        const parts: string[] = [];
        if (status) {
            parts.push(status);
        }
        if (storyPoints) {
            parts.push(`${storyPoints} pts`);
        }
        if (parts.length > 0) {
            this.description = parts.join(' • ');
        }

        // Make items clickable to open in panel
        if (type !== 'empty') {
            this.command = {
                command: 'aicc.openPlanningPanel',
                title: 'Open Planning Panel',
                arguments: [id]
            };
        }
    }

    /**
     * Get icon for the tree item based on type and status
     * Uses VS Code's built-in simple line Codicons for consistent appearance
     */
    private getIcon(): vscode.ThemeIcon {
        if (this.type === 'empty') {
            return new vscode.ThemeIcon('info', new vscode.ThemeColor('descriptionForeground'));
        }

        // Status-based color coding for all types
        const statusNormalized = this.status?.toLowerCase();
        
        // Completed/Done - Green checkmark
        if (statusNormalized === 'done' || statusNormalized === 'done') {
            return new vscode.ThemeIcon(
                'check',
                new vscode.ThemeColor('testing.iconPassed')
            );
        }
        
        // In Progress - Blue play icon
        if (statusNormalized === 'in-progress' || statusNormalized === 'active') {
            return new vscode.ThemeIcon(
                'play-circle',
                new vscode.ThemeColor('notificationsInfoIcon.foreground')
            );
        }
        
        // Blocked/Pending - Yellow clock
        if (statusNormalized === 'pending') {
            return new vscode.ThemeIcon(
                'clock',
                new vscode.ThemeColor('notificationsWarningIcon.foreground')
            );
        }
        
        // Not Started - Default with type-specific icon and color
        switch (this.type) {
            case 'epic':
                return new vscode.ThemeIcon(
                    'layers',
                    new vscode.ThemeColor('symbolIcon.classForeground')
                );
            case 'story':
                return new vscode.ThemeIcon(
                    'bookmark',
                    new vscode.ThemeColor('symbolIcon.methodForeground')
                );
            case 'task':
                return new vscode.ThemeIcon(
                    'circle-outline',
                    new vscode.ThemeColor('descriptionForeground')
                );
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}
