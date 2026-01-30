import { Logger } from '../../logger';
import { WorkspaceManager } from '../workspaceManager';
import { PlanningTree, EpicNode, StoryNode, TaskNode } from './planningTree';
import { ErrorHandler } from '../../errorHandler';
import { IEpic, IStory, ITask, IBug, ItemType } from '../types';

/**
 * TreeBuilder - Constructs planning trees from .project/PLAN.json data.
 */
export class TreeBuilder {
    private logger: Logger;
    private workspaceManager: WorkspaceManager;

    constructor(
        workspaceManager: WorkspaceManager,
        logger: Logger
    ) {
        this.logger = logger;
        this.workspaceManager = workspaceManager;
    }

    /**
     * Build complete planning tree from .project/PLAN.json.
     */
    public async buildTree(): Promise<PlanningTree> {
        const startTime = performance.now();
        const tree = new PlanningTree();

        try {
            // Load plan data from .project/PLAN.json
            const planData = await this.workspaceManager.loadPlanData();
            if (!planData) {
                this.logger.warn('No plan data found, returning empty tree', {
                    component: 'TreeBuilder'
                });
                return tree;
            }

            // Separate items by type
            const epics = planData.items.filter(item => item.type === ItemType.Epic) as IEpic[];
            const stories = planData.items.filter(item => item.type === ItemType.Story) as IStory[];
            const tasks = planData.items.filter(item => item.type === ItemType.Task || item.type === ItemType.Bug) as (ITask | IBug)[];

            // Build tree structure
            for (const epic of epics) {
                // Create epic node
                const epicNode = new EpicNode(
                    epic.id,
                    epic.title,
                    epic.status,
                    epic.estimatedHours || 0,
                    epic
                );

                // Find stories belonging to this epic
                const epicStories = stories.filter(story => story.epicId === epic.id);

                for (const story of epicStories) {
                    // Create story node
                    const storyNode = new StoryNode(
                        story.id,
                        story.title,
                        story.status,
                        story.estimatedHours || 0,
                        story
                    );

                    // Find tasks belonging to this story
                    // Tasks use links array with type "parent" to point to their parent story
                    const storyTasks = tasks.filter(task => {
                        // Check if task has a parent link pointing to this story
                        if (task.links && task.links.length > 0) {
                            return task.links.some(link => 
                                link.type === 'parent' && link.targetId === story.id
                            );
                        }
                        // Fallback: some tasks might not have links properly set
                        return false;
                    });

                    for (const task of storyTasks) {
                        // Create task node
                        const taskNode = new TaskNode(
                            task.id,
                            task.title,
                            task.status,
                            task.estimatedHours || 0,
                            task
                        );

                        // Add task to story
                        storyNode.addTask(taskNode);
                    }

                    // Add story to epic
                    epicNode.addStory(storyNode);
                }

                // Add epic to tree
                tree.addEpic(epicNode);
            }

            const duration = performance.now() - startTime;
            this.logger.info('Planning tree built from PLAN.json', {
                component: 'TreeBuilder',
                epicCount: tree.getAllEpics().length,
                storyCount: tree.getAllStories().length,
                taskCount: tree.getAllTasks().length,
                totalNodes: tree.getSize(),
                duration
            });

            return tree;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'TreeBuilder.buildTree'
            );
            throw error;
        }
    }

    /**
     * Rebuild tree (useful after file system changes).
     */
    public async rebuildTree(): Promise<PlanningTree> {
        this.logger.debug('Rebuilding planning tree', { component: 'TreeBuilder' });
        return this.buildTree();
    }
}
