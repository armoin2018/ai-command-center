import { Epic } from '../entities/epic';
import { Story } from '../entities/story';
import { Task } from '../entities/task';
import { EpicStatus, StoryStatus, TaskStatus, IEpic, IStory, ITask, IBug } from '../types';

/**
 * Planning Tree Node - Base interface for tree nodes.
 */
export interface IPlanningNode {
    id: string;
    name: string;
    type: 'epic' | 'story' | 'task';
    status: EpicStatus | StoryStatus | TaskStatus;
    storyPoints: number;
    children: IPlanningNode[];
    parent: IPlanningNode | null;
    depth: number;
}

/**
 * Epic Node - Root level planning node.
 */
export class EpicNode implements IPlanningNode {
    public readonly type = 'epic' as const;
    public children: StoryNode[] = [];
    public parent: null = null;
    public readonly depth = 0;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly status: EpicStatus,
        public readonly storyPoints: number,
        public readonly data: Epic | IEpic
    ) {}

    /**
     * Add a story to this epic.
     */
    public addStory(story: StoryNode): void {
        story.parent = this;
        this.children.push(story);
    }

    /**
     * Remove a story from this epic.
     */
    public removeStory(storyId: string): boolean {
        const index = this.children.findIndex(s => s.id === storyId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all stories in this epic.
     */
    public getStories(): StoryNode[] {
        return [...this.children];
    }

    /**
     * Get all tasks in this epic (from all stories).
     */
    public getAllTasks(): TaskNode[] {
        return this.children.flatMap(story => story.getTasks());
    }

    /**
     * Calculate total story points for this epic.
     */
    public getTotalStoryPoints(): number {
        return this.children.reduce((sum, story) => sum + story.getTotalStoryPoints(), 0);
    }

    /**
     * Get completion percentage for this epic.
     */
    public getCompletionPercentage(): number {
        const totalStories = this.children.length;
        if (totalStories === 0) return 0;

        const completedStories = this.children.filter(s => s.status === 'done').length;
        return Math.round((completedStories / totalStories) * 100);
    }

    /**
     * Get story count by status.
     */
    public getStoryCountByStatus(): Record<StoryStatus, number> {
        const counts: Record<StoryStatus, number> = {
            'todo': 0,
            'ready': 0,
            'pending': 0,
            'in-progress': 0,
            'review': 0,
            'done': 0
        };

        for (const story of this.children) {
            counts[story.status]++;
        }

        return counts;
    }
}

/**
 * Story Node - Mid-level planning node.
 */
export class StoryNode implements IPlanningNode {
    public readonly type = 'story' as const;
    public children: TaskNode[] = [];
    public parent: EpicNode | null = null;
    public readonly depth = 1;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly status: StoryStatus,
        public readonly storyPoints: number,
        public readonly data: Story | IStory
    ) {}

    /**
     * Add a task to this story.
     */
    public addTask(task: TaskNode): void {
        task.parent = this;
        this.children.push(task);
    }

    /**
     * Remove a task from this story.
     */
    public removeTask(taskId: string): boolean {
        const index = this.children.findIndex(t => t.id === taskId);
        if (index !== -1) {
            this.children.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get all tasks in this story.
     */
    public getTasks(): TaskNode[] {
        return [...this.children];
    }

    /**
     * Calculate total story points for this story.
     */
    public getTotalStoryPoints(): number {
        return this.children.reduce((sum, task) => sum + task.storyPoints, 0);
    }

    /**
     * Get completion percentage for this story.
     */
    public getCompletionPercentage(): number {
        const totalTasks = this.children.length;
        if (totalTasks === 0) return 0;

        const completedTasks = this.children.filter(t => t.status === 'done').length;
        return Math.round((completedTasks / totalTasks) * 100);
    }

    /**
     * Get task count by status.
     */
    public getTaskCountByStatus(): Record<TaskStatus, number> {
        const counts: Record<TaskStatus, number> = {
            'todo': 0,
            'ready': 0,
            'pending': 0,
            'in-progress': 0,
            'review': 0,
            'done': 0
        };

        for (const task of this.children) {
            counts[task.status]++;
        }

        return counts;
    }
}

/**
 * Task Node - Leaf-level planning node.
 */
export class TaskNode implements IPlanningNode {
    public readonly type = 'task' as const;
    public readonly children: never[] = [];
    public parent: StoryNode | null = null;
    public readonly depth = 2;

    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly status: TaskStatus,
        public readonly storyPoints: number,
        public readonly data: Task | ITask | IBug
    ) {}
}

/**
 * Planning Tree - Complete hierarchical structure.
 */
export class PlanningTree {
    private epics: Map<string, EpicNode> = new Map();

    /**
     * Add an epic to the tree.
     */
    public addEpic(epic: EpicNode): void {
        this.epics.set(epic.id, epic);
    }

    /**
     * Remove an epic from the tree.
     */
    public removeEpic(epicId: string): boolean {
        return this.epics.delete(epicId);
    }

    /**
     * Get an epic by ID.
     */
    public getEpic(epicId: string): EpicNode | undefined {
        return this.epics.get(epicId);
    }

    /**
     * Get all epics.
     */
    public getAllEpics(): EpicNode[] {
        return Array.from(this.epics.values());
    }

    /**
     * Find a story by ID (searches all epics).
     */
    public findStory(storyId: string): StoryNode | undefined {
        for (const epic of this.epics.values()) {
            const story = epic.getStories().find(s => s.id === storyId);
            if (story) return story;
        }
        return undefined;
    }

    /**
     * Find a task by ID (searches all epics and stories).
     */
    public findTask(taskId: string): TaskNode | undefined {
        for (const epic of this.epics.values()) {
            for (const story of epic.getStories()) {
                const task = story.getTasks().find(t => t.id === taskId);
                if (task) return task;
            }
        }
        return undefined;
    }

    /**
     * Get total story points across all epics.
     */
    public getTotalStoryPoints(): number {
        return Array.from(this.epics.values()).reduce(
            (sum, epic) => sum + epic.getTotalStoryPoints(),
            0
        );
    }

    /**
     * Get overall completion percentage.
     */
    public getCompletionPercentage(): number {
        const epics = Array.from(this.epics.values());
        if (epics.length === 0) return 0;

        const totalCompletion = epics.reduce(
            (sum, epic) => sum + epic.getCompletionPercentage(),
            0
        );

        return Math.round(totalCompletion / epics.length);
    }

    /**
     * Get epic count by status.
     */
    public getEpicCountByStatus(): Record<EpicStatus, number> {
        const counts: Record<EpicStatus, number> = {
            'todo': 0,
            'ready': 0,
            'pending': 0,
            'in-progress': 0,
            'review': 0,
            'done': 0
        };

        for (const epic of this.epics.values()) {
            counts[epic.status]++;
        }

        return counts;
    }

    /**
     * Get all stories across all epics.
     */
    public getAllStories(): StoryNode[] {
        return Array.from(this.epics.values()).flatMap(epic => epic.getStories());
    }

    /**
     * Get all tasks across all epics and stories.
     */
    public getAllTasks(): TaskNode[] {
        return Array.from(this.epics.values()).flatMap(epic => epic.getAllTasks());
    }

    /**
     * Get tree size (total node count).
     */
    public getSize(): number {
        const epicCount = this.epics.size;
        const storyCount = this.getAllStories().length;
        const taskCount = this.getAllTasks().length;
        return epicCount + storyCount + taskCount;
    }

    /**
     * Clear all epics from the tree.
     */
    public clear(): void {
        this.epics.clear();
    }
}
