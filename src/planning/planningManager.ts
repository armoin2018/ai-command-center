import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { ErrorHandler } from '../errorHandler';
import { EpicManager } from './epicManager';
import { StoryManager } from './storyManager';
import { TaskManager } from './taskManager';
import { WorkspaceManager } from './workspaceManager';
import { TreeBuilder } from './treeBuilder/treeBuilder';
import { PlanningTree } from './treeBuilder/planningTree';
import { TreeTraversal } from './treeBuilder/treeTraversal';
import { EvolutionTracker } from './evolutionTracker';
import { CollaborativeEditingService } from '../services/collaborativeEditing';
import { Epic } from './entities/epic';
import { Story } from './entities/story';
import { Task } from './entities/task';
import { Priority, ItemType, LinkType, IItemLink, PlanningItem, IEpic, IStory, ITask } from './types';

/**
 * PlanningManager - Unified interface for all planning operations.
 * Coordinates Epic, Story, Task managers and provides high-level operations.
 */
export class PlanningManager {
    private logger: Logger;
    private epicManager: EpicManager;
    private storyManager: StoryManager;
    private taskManager: TaskManager;
    private workspaceManager: WorkspaceManager;
    private treeBuilder: TreeBuilder;
    private evolutionTracker: EvolutionTracker;
    private collaborativeEditing: CollaborativeEditingService;
    private cachedTree: PlanningTree | null = null;
    private autoSaveTimer: NodeJS.Timeout | null = null;

    constructor(workspaceRoot: string, logger: Logger) {
        this.logger = logger;

        // Initialize all managers
        this.epicManager = new EpicManager(workspaceRoot, logger);
        this.storyManager = new StoryManager(workspaceRoot, logger);
        this.taskManager = new TaskManager(workspaceRoot, logger);
        this.workspaceManager = new WorkspaceManager(workspaceRoot, logger);
        this.treeBuilder = new TreeBuilder(this.workspaceManager, logger);
        this.evolutionTracker = new EvolutionTracker(this.workspaceManager, logger);
        this.collaborativeEditing = new CollaborativeEditingService(logger);

        this.logger.info('PlanningManager initialized with Evolution Tracker and Collaborative Editing', {
            component: 'PlanningManager',
            workspaceRoot
        });
    }

    // ========== INITIALIZATION ==========

    /**
     * Initialize planning structure in workspace.
     */
    public async initialize(): Promise<void> {
        try {
            await this.workspaceManager.initializePlanningStructure();

            // Initialize evolution tracker
            await this.evolutionTracker.initialize();

            const config = ConfigManager.getInstance().getConfig();
            if (config.planning.autoSaveInterval > 0) {
                this.startAutoSave(config.planning.autoSaveInterval);
            }

            this.logger.info('Planning structure initialized', {
                component: 'PlanningManager'
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'PlanningManager.initialize'
            );
            throw error;
        }
    }

    // ========== LINK HELPER METHODS ==========

    /**
     * Get parent ID from an item's links array.
     * @param item The planning item to check
     * @returns The parent ID if found, undefined otherwise
     */
    public getParentId(item: PlanningItem): string | undefined {
        const parentLink = item.links?.find(
            (link: IItemLink) => link.type === LinkType.Parent
        );
        return parentLink?.targetId;
    }

    /**
     * Check if an item has a specific parent.
     * Checks both legacy fields (epicId, storyId) and links array.
     * @param item The planning item to check
     * @param parentId The parent ID to look for
     * @returns true if the item has the specified parent
     */
    public hasParent(item: PlanningItem, parentId: string): boolean {
        // Check legacy fields
        if (item.epicId === parentId) {
            return true;
        }
        if ((item as any).storyId === parentId) {
            return true;
        }
        // Check links array
        return item.links?.some(
            (link: IItemLink) => link.type === LinkType.Parent && link.targetId === parentId
        ) ?? false;
    }

    /**
     * Create a parent link for an item.
     * @param parentId The ID of the parent item
     * @param description Optional description for the link
     * @returns An IItemLink object representing the parent relationship
     */
    public createParentLink(parentId: string, description?: string): IItemLink {
        return {
            type: LinkType.Parent,
            targetId: parentId,
            description
        };
    }

    /**
     * Add or update a parent link in a links array.
     * @param links Existing links array (can be undefined)
     * @param parentId The parent ID to link to
     * @returns Updated links array with the parent link
     */
    public setParentLink(links: IItemLink[] | undefined, parentId: string): IItemLink[] {
        const existingLinks = links ?? [];
        // Remove any existing parent links
        const filteredLinks = existingLinks.filter(
            (link: IItemLink) => link.type !== LinkType.Parent
        );
        // Add the new parent link
        return [...filteredLinks, this.createParentLink(parentId)];
    }

    /**
     * Get all items with a specific parent.
     * @param items Array of planning items
     * @param parentId The parent ID to filter by
     * @returns Filtered array of items that have the specified parent
     */
    public getChildItems(items: PlanningItem[], parentId: string): PlanningItem[] {
        return items.filter(item => this.hasParent(item, parentId));
    }

    // ========== EPIC OPERATIONS ==========

    public async createEpic(data: {
        title: string;
        description: string;
        priority?: Priority;
    }): Promise<Epic> {
        // Load current plan data
        let planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            // Initialize if doesn't exist
            planData = {
                metadata: {
                    projectName: 'AI Command Center',
                    projectId: 'aicc',
                    version: '1.0.0',
                    schemaVersion: '3.0',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                items: []
            };
        }

        // Create epic using EpicManager to maintain compatibility
        const epic = await this.epicManager.createEpic(data);
        
        // Add to plan data
        planData.items.push({
            type: ItemType.Epic,
            id: epic.id,
            title: epic.title,
            description: epic.description,
            status: epic.status,
            priority: epic.priority,
            epicId: null,
            order: planData.items.filter(i => i.type === ItemType.Epic).length,
            links: [],
            createdOn: epic.createdOn,
            lastUpdatedOn: epic.lastUpdatedOn
        });

        // Save plan data
        await this.workspaceManager.savePlanData(planData);
        await this.evolutionTracker.trackCreated('epic', epic.id, epic);
        this.invalidateCache();
        return epic;
    }

    public async getEpic(epicId: string): Promise<Epic | null> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return null;
        }
        
        const epicData = planData.items.find(item => item.type === ItemType.Epic && item.id === epicId);
        if (!epicData || epicData.type !== ItemType.Epic) {
            return null;
        }

        // Convert to Epic class instance using object constructor
        return new Epic(epicData as IEpic);
    }

    public async updateEpic(epicId: string, updates: Partial<Epic>): Promise<Epic | null> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return null;
        }

        const epicIndex = planData.items.findIndex(item => item.type === ItemType.Epic && item.id === epicId);
        if (epicIndex === -1) {
            return null;
        }

        const oldEpic = await this.getEpic(epicId);
        const epicData = planData.items[epicIndex];
        
        if (epicData.type === ItemType.Epic) {
            // Update fields
            if (updates.title !== undefined) epicData.title = updates.title;
            if (updates.description !== undefined) epicData.description = updates.description;
            if (updates.status !== undefined) epicData.status = updates.status;
            if (updates.priority !== undefined) epicData.priority = updates.priority;
            epicData.lastUpdatedOn = new Date().toISOString();

            // Save plan data
            await this.workspaceManager.savePlanData(planData);

            // Also update via EpicManager for compatibility
            await this.epicManager.updateEpic(epicId, updates);

            const updatedEpic = await this.getEpic(epicId);
            if (oldEpic && updatedEpic) {
                await this.evolutionTracker.trackUpdated('epic', epicId, oldEpic, updatedEpic);
            }
            this.invalidateCache();
            return updatedEpic;
        }

        return null;
    }

    public async deleteEpic(epicId: string): Promise<boolean> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return false;
        }

        const epic = await this.getEpic(epicId);
        
        // Remove epic and all its children (stories and tasks)
        // Check both epicId field (legacy) and links array (new model)
        planData.items = planData.items.filter(item => {
            if (item.type === ItemType.Epic && item.id === epicId) {
                return false;
            }
            // Check legacy epicId field or parent link
            const hasParentLink = item.links?.some(
                (link: IItemLink) => link.type === LinkType.Parent && link.targetId === epicId
            );
            if ((item.type === ItemType.Story || item.type === ItemType.Task) && 
                (item.epicId === epicId || hasParentLink)) {
                return false;
            }
            return true;
        });

        // Save plan data
        await this.workspaceManager.savePlanData(planData);

        // Also delete via EpicManager for compatibility
        await this.epicManager.deleteEpic(epicId);

        if (epic) {
            await this.evolutionTracker.trackDeleted('epic', epicId, epic);
        }
        this.invalidateCache();
        return true;
    }

    public async listEpics(): Promise<Epic[]> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return [];
        }

        return planData.items
            .filter(item => item.type === ItemType.Epic)
            .map(item => {
                if (item.type === ItemType.Epic) {
                    return new Epic(item as IEpic);
                }
                return null;
            })
            .filter((epic): epic is Epic => epic !== null);
    }

    // ========== STORY OPERATIONS ==========

    public async createStory(epicId: string, data: {
        title: string;
        description: string;
        storyPoints?: number;
        sprint?: string;
        priority?: Priority;
        estimatedHours?: number;
    }): Promise<Story> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            throw new Error('Plan data not found');
        }

        // Create story using StoryManager to maintain compatibility
        const story = await this.storyManager.createStory(epicId, data);
        
        // Build parent link for epic relationship
        const parentLinks: IItemLink[] = epicId ? 
            [{ type: LinkType.Parent, targetId: epicId }] : [];
        
        // Add to plan data with links-based parent relationship
        planData.items.push({
            type: ItemType.Story,
            id: story.id,
            epicId: epicId, // Legacy field for compatibility
            title: story.title,
            description: story.description,
            status: story.status,
            priority: story.priority,
            order: planData.items.filter(i => i.type === ItemType.Story && i.epicId === epicId).length,
            links: parentLinks,
            createdOn: story.createdOn,
            lastUpdatedOn: story.lastUpdatedOn
        });

        // Save plan data
        await this.workspaceManager.savePlanData(planData);
        this.invalidateCache();
        return story;
    }

    public async getStory(epicId: string, storyId: string): Promise<Story | null> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return null;
        }
        
        // Find story by ID and parent (check both legacy epicId and links)
        const storyData = planData.items.find(
            item => item.type === ItemType.Story && item.id === storyId && (
                item.epicId === epicId || 
                item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === epicId)
            )
        );
        
        if (!storyData || storyData.type !== ItemType.Story) {
            return null;
        }

        // Use object constructor pattern
        return new Story(storyData as IStory);
    }

    public async updateStory(epicId: string, storyId: string, updates: Partial<Story>): Promise<Story | null> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return null;
        }

        const storyIndex = planData.items.findIndex(
            item => item.type === ItemType.Story && item.id === storyId && (
                item.epicId === epicId || 
                item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === epicId)
            )
        );
        
        if (storyIndex === -1) {
            return null;
        }

        const storyData = planData.items[storyIndex];
        
        if (storyData.type === ItemType.Story) {
            // Update fields
            if (updates.title !== undefined) storyData.title = updates.title;
            if (updates.description !== undefined) storyData.description = updates.description;
            if (updates.status !== undefined) storyData.status = updates.status;
            if (updates.priority !== undefined) storyData.priority = updates.priority;
            storyData.lastUpdatedOn = new Date().toISOString();

            // Save plan data
            await this.workspaceManager.savePlanData(planData);

            // Also update via StoryManager for compatibility
            await this.storyManager.updateStory(epicId, storyId, updates);

            this.invalidateCache();
            return await this.getStory(epicId, storyId);
        }

        return null;
    }

    public async deleteStory(epicId: string, storyId: string): Promise<boolean> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return false;
        }

        // Remove story and all its tasks (check both legacy fields and links)
        planData.items = planData.items.filter(item => {
            // Remove the story itself
            if (item.type === ItemType.Story && item.id === storyId && (
                item.epicId === epicId || 
                item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === epicId)
            )) {
                return false;
            }
            // Remove child tasks (check parent link to story)
            if (item.type === ItemType.Task && (
                (item as any).storyId === storyId ||
                item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === storyId)
            )) {
                return false;
            }
            return true;
        });

        // Save plan data
        await this.workspaceManager.savePlanData(planData);

        // Also delete via StoryManager for compatibility
        await this.storyManager.deleteStory(epicId, storyId);

        this.invalidateCache();
        return true;
    }

    public async listStories(epicId: string): Promise<Story[]> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return [];
        }

        // Find stories by parent (check both legacy epicId and links)
        return planData.items
            .filter(item => item.type === ItemType.Story && (
                item.epicId === epicId ||
                item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === epicId)
            ))
            .map(item => {
                if (item.type === ItemType.Story) {
                    return new Story(item as IStory);
                }
                return null;
            })
            .filter((story): story is Story => story !== null);
    }

    // ========== TASK OPERATIONS ==========

    public async createTask(epicId: string, storyId: string, data: {
        title: string;
        description: string;
        storyPoints?: number;
        assignee?: string;
        priority?: Priority;
    }): Promise<Task> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            throw new Error('Plan data not found');
        }

        // Create task using TaskManager to maintain compatibility
        const task = await this.taskManager.createTask(epicId, storyId, data);
        
        // Build parent link for story relationship (primary parent)
        const parentLinks: IItemLink[] = storyId ? 
            [{ type: LinkType.Parent, targetId: storyId }] : 
            (epicId ? [{ type: LinkType.Parent, targetId: epicId }] : []);
        
        // Add to plan data with links-based parent relationship
        planData.items.push({
            type: ItemType.Task,
            id: task.id,
            epicId: epicId, // Legacy field for compatibility
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            assignee: task.assignee,
            order: planData.items.filter(
                i => i.type === ItemType.Task && 
                    (i.links?.some((l: IItemLink) => l.type === LinkType.Parent && l.targetId === storyId) ||
                     (i as any).storyId === storyId)
            ).length,
            links: parentLinks,
            createdOn: task.createdOn,
            lastUpdatedOn: task.lastUpdatedOn
        });

        // Save plan data
        await this.workspaceManager.savePlanData(planData);
        this.invalidateCache();
        return task;
    }

    public async getTask(epicId: string, storyId: string, taskId: string): Promise<Task | null> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return null;
        }
        
        // Find task by ID and parent (check both legacy fields and links)
        const taskData = planData.items.find(
            item => item.type === ItemType.Task && 
                   item.id === taskId && 
                   (
                       ((item as any).storyId === storyId && item.epicId === epicId) ||
                       item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === storyId)
                   )
        );
        
        if (!taskData || taskData.type !== ItemType.Task) {
            return null;
        }

        // Use object constructor pattern
        return new Task(taskData as ITask);
    }

    public async updateTask(epicId: string, storyId: string, taskId: string, updates: Partial<Task>): Promise<Task | null> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return null;
        }

        const taskIndex = planData.items.findIndex(
            item => item.type === ItemType.Task && 
                   item.id === taskId && 
                   (
                       ((item as any).storyId === storyId && item.epicId === epicId) ||
                       item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === storyId)
                   )
        );
        
        if (taskIndex === -1) {
            return null;
        }

        const taskData = planData.items[taskIndex];
        
        if (taskData.type === ItemType.Task) {
            // Update fields
            if (updates.title !== undefined) taskData.title = updates.title;
            if (updates.description !== undefined) taskData.description = updates.description;
            if (updates.status !== undefined) taskData.status = updates.status;
            if (updates.priority !== undefined) taskData.priority = updates.priority;
            if ((updates as any).storyPoints !== undefined) (taskData as any).storyPoints = (updates as any).storyPoints;
            if (updates.assignee !== undefined) taskData.assignee = updates.assignee;
            taskData.lastUpdatedOn = new Date().toISOString();

            // Save plan data
            await this.workspaceManager.savePlanData(planData);

            // Also update via TaskManager for compatibility
            await this.taskManager.updateTask(epicId, storyId, taskId, updates);

            this.invalidateCache();
            return await this.getTask(epicId, storyId, taskId);
        }

        return null;
    }

    public async deleteTask(epicId: string, storyId: string, taskId: string): Promise<boolean> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return false;
        }

        // Remove task (check both legacy fields and links)
        planData.items = planData.items.filter(
            item => !(item.type === ItemType.Task && 
                     item.id === taskId && 
                     (
                         ((item as any).storyId === storyId && item.epicId === epicId) ||
                         item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === storyId)
                     ))
        );

        // Save plan data
        await this.workspaceManager.savePlanData(planData);

        // Also delete via TaskManager for compatibility
        await this.taskManager.deleteTask(epicId, storyId, taskId);

        this.invalidateCache();
        return true;
    }

    public async listTasks(epicId: string, storyId: string): Promise<Task[]> {
        const planData = await this.workspaceManager.loadPlanData();
        if (!planData) {
            return [];
        }

        // Find tasks by parent (check both legacy fields and links)
        return planData.items
            .filter(item => item.type === ItemType.Task && 
                          (
                              ((item as any).storyId === storyId && item.epicId === epicId) ||
                              item.links?.some((link: IItemLink) => link.type === LinkType.Parent && link.targetId === storyId)
                          ))
            .map(item => {
                if (item.type === ItemType.Task) {
                    return new Task(item as ITask);
                }
                return null;
            })
            .filter((task): task is Task => task !== null);
    }

    // ========== TREE OPERATIONS ==========

    /**
     * Get planning tree (cached).
     */
    public async getTree(): Promise<PlanningTree> {
        if (!this.cachedTree) {
            this.cachedTree = await this.treeBuilder.buildTree();
        }
        return this.cachedTree;
    }

    /**
     * Rebuild planning tree (refreshes cache).
     */
    public async rebuildTree(): Promise<PlanningTree> {
        this.cachedTree = await this.treeBuilder.buildTree();
        return this.cachedTree;
    }

    /**
     * Get tree statistics.
     */
    public async getTreeStatistics() {
        const tree = await this.getTree();
        return TreeTraversal.getStatistics(tree);
    }

    /**
     * Search planning tree by name.
     */
    public async searchByName(query: string) {
        const tree = await this.getTree();
        return TreeTraversal.searchByName(tree, query);
    }

    /**
     * Get blocked items.
     */
    public async getBlockedItems() {
        const tree = await this.getTree();
        return TreeTraversal.getBlockedItems(tree);
    }

    /**
     * Get in-progress items.
     */
    public async getInProgressItems() {
        const tree = await this.getTree();
        return TreeTraversal.getInProgressItems(tree);
    }

    // ========== WORKSPACE OPERATIONS ==========

    /**
     * Get workspace manager for advanced file operations.
     */
    public getWorkspaceManager(): WorkspaceManager {
        return this.workspaceManager;
    }

    /**
     * Start file watching for auto-refresh.
     */
    public startFileWatching(): void {
        this.workspaceManager.startFileWatcher((uri: any, changeType: any) => {
            this.logger.debug('Planning file changed', {
                component: 'PlanningManager',
                uri: uri.fsPath,
                changeType
            });

            // Invalidate cache on file changes
            this.invalidateCache();
        });
    }

    /**
     * Stop file watching.
     */
    public stopFileWatching(): void {
        this.workspaceManager.stopFileWatcher();
    }

    // ========== AUTO-SAVE ==========

    /**
     * Start auto-save timer.
     */
    private startAutoSave(intervalMs: number): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }

        this.autoSaveTimer = setInterval(() => {
            this.logger.debug('Auto-save triggered', {
                component: 'PlanningManager'
            });
            // Auto-save logic would go here if needed
        }, intervalMs);

        this.logger.info('Auto-save started', {
            component: 'PlanningManager',
            intervalMs
        });
    }

    /**
     * Stop auto-save timer.
     */
    private stopAutoSave(): void {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;

            this.logger.info('Auto-save stopped', {
                component: 'PlanningManager'
            });
        }
    }

    // ========== CACHE MANAGEMENT ==========

    /**
     * Invalidate cached tree.
     */
    private invalidateCache(): void {
        this.cachedTree = null;
        this.logger.debug('Tree cache invalidated', {
            component: 'PlanningManager'
        });
    }

    // ========== CLEANUP ==========

    /**
     * Get Evolution Tracker instance for direct access to history
     */
    public getEvolutionTracker(): EvolutionTracker {
        return this.evolutionTracker;
    }

    // ========== COLLABORATIVE EDITING ==========

    /**
     * Start an edit session for an item
     */
    public startEditSession(itemId: string, itemType: 'epic' | 'story' | 'task', userId: string, userName?: string) {
        return this.collaborativeEditing.startEditSession(itemId, itemType, userId, userName);
    }

    /**
     * End an edit session
     */
    public endEditSession(itemId: string, userId: string): void {
        this.collaborativeEditing.endEditSession(itemId, userId);
    }

    /**
     * Update activity timestamp for an edit session
     */
    public updateEditActivity(itemId: string, userId: string): void {
        this.collaborativeEditing.updateActivity(itemId, userId);
    }

    /**
     * Get active sessions for an item
     */
    public getActiveEditSessions(itemId: string) {
        return this.collaborativeEditing.getActiveSessions(itemId);
    }

    /**
     * Check if item has multiple concurrent editors
     */
    public hasMultipleEditors(itemId: string): boolean {
        return this.collaborativeEditing.hasMultipleEditors(itemId);
    }

    /**
     * Acquire edit lock for an item
     */
    public async acquireEditLock(itemId: string, userId: string): Promise<boolean> {
        return this.collaborativeEditing.acquireLock(itemId, userId);
    }

    /**
     * Release edit lock
     */
    public releaseEditLock(itemId: string, userId: string): boolean {
        return this.collaborativeEditing.releaseLock(itemId, userId);
    }

    /**
     * Check if item is locked
     */
    public isItemLocked(itemId: string): boolean {
        return this.collaborativeEditing.isLocked(itemId);
    }

    /**
     * Get lock owner for an item
     */
    public getItemLockOwner(itemId: string): string | undefined {
        return this.collaborativeEditing.getLockOwner(itemId);
    }

    /**
     * Get editing indicator for UI display
     */
    public getEditingIndicator(itemId: string): string | null {
        return this.collaborativeEditing.getEditingIndicator(itemId);
    }

    /**
     * Detect editing conflicts
     */
    public detectEditConflict(itemId: string, userId: string) {
        return this.collaborativeEditing.detectConflict(itemId, userId);
    }

    /**
     * Show conflict warning dialog
     */
    public async showEditConflictWarning(itemId: string, userId: string): Promise<'continue' | 'cancel' | 'view'> {
        const conflict = this.collaborativeEditing.detectConflict(itemId, userId);
        if (!conflict) {
            return 'continue';
        }
        return this.collaborativeEditing.showConflictWarning(conflict);
    }

    /**
     * Get collaborative editing statistics
     */
    public getCollaborativeEditingStats() {
        return this.collaborativeEditing.getStats();
    }

    /**
     * Dispose and cleanup resources.
     */
    public async dispose(): Promise<void> {
        this.stopAutoSave();
        this.stopFileWatching();
        await this.evolutionTracker.dispose();
        this.collaborativeEditing.dispose();
        this.workspaceManager.dispose();

        this.logger.info('PlanningManager disposed', {
            component: 'PlanningManager'
        });
    }
}
