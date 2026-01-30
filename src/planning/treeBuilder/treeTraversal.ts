import { PlanningTree, TaskNode, IPlanningNode } from './planningTree';
import { EpicStatus, StoryStatus, TaskStatus } from '../types';

/**
 * TreeTraversal - Utilities for traversing and querying planning trees.
 */
export class TreeTraversal {
    /**
     * Traverse tree depth-first, visiting each node.
     */
    public static depthFirstTraversal(
        tree: PlanningTree,
        visitor: (node: IPlanningNode) => void
    ): void {
        for (const epic of tree.getAllEpics()) {
            visitor(epic);

            for (const story of epic.getStories()) {
                visitor(story);

                for (const task of story.getTasks()) {
                    visitor(task);
                }
            }
        }
    }

    /**
     * Traverse tree breadth-first, visiting each level.
     */
    public static breadthFirstTraversal(
        tree: PlanningTree,
        visitor: (node: IPlanningNode) => void
    ): void {
        const epics = tree.getAllEpics();
        const stories = tree.getAllStories();
        const tasks = tree.getAllTasks();

        // Visit by depth level
        epics.forEach(visitor);
        stories.forEach(visitor);
        tasks.forEach(visitor);
    }

    /**
     * Filter nodes by predicate.
     */
    public static filter(
        tree: PlanningTree,
        predicate: (node: IPlanningNode) => boolean
    ): IPlanningNode[] {
        const results: IPlanningNode[] = [];

        TreeTraversal.depthFirstTraversal(tree, (node) => {
            if (predicate(node)) {
                results.push(node);
            }
        });

        return results;
    }

    /**
     * Find first node matching predicate.
     */
    public static find(
        tree: PlanningTree,
        predicate: (node: IPlanningNode) => boolean
    ): IPlanningNode | undefined {
        let found: IPlanningNode | undefined;

        for (const epic of tree.getAllEpics()) {
            if (predicate(epic)) {
                return epic;
            }

            for (const story of epic.getStories()) {
                if (predicate(story)) {
                    return story;
                }

                for (const task of story.getTasks()) {
                    if (predicate(task)) {
                        return task;
                    }
                }
            }
        }

        return found;
    }

    /**
     * Get nodes by status.
     */
    public static getNodesByStatus(
        tree: PlanningTree,
        status: EpicStatus | StoryStatus | TaskStatus
    ): IPlanningNode[] {
        return TreeTraversal.filter(tree, node => node.status === status);
    }

    /**
     * Get nodes by type.
     */
    public static getNodesByType(
        tree: PlanningTree,
        type: 'epic' | 'story' | 'task'
    ): IPlanningNode[] {
        return TreeTraversal.filter(tree, node => node.type === type);
    }

    /**
     * Get blocked items across the tree.
     */
    public static getBlockedItems(tree: PlanningTree): IPlanningNode[] {
        return TreeTraversal.filter(tree, node => node.status === 'pending');
    }

    /**
     * Get in-progress items across the tree.
     */
    public static getInProgressItems(tree: PlanningTree): IPlanningNode[] {
        return TreeTraversal.filter(tree, node => node.status === 'in-progress');
    }

    /**
     * Get completed items across the tree.
     */
    public static getCompletedItems(tree: PlanningTree): IPlanningNode[] {
        return TreeTraversal.filter(tree, node => node.status === 'done');
    }

    /**
     * Get path from root to node (returns array of ancestor IDs).
     */
    public static getPath(node: IPlanningNode): string[] {
        const path: string[] = [node.id];
        let current: IPlanningNode | null = node;

        while (current.parent) {
            path.unshift(current.parent.id);
            current = current.parent;
        }

        return path;
    }

    /**
     * Map nodes to a different structure.
     */
    public static map<T>(
        tree: PlanningTree,
        mapper: (node: IPlanningNode) => T
    ): T[] {
        const results: T[] = [];

        TreeTraversal.depthFirstTraversal(tree, (node) => {
            results.push(mapper(node));
        });

        return results;
    }

    /**
     * Reduce tree to a single value.
     */
    public static reduce<T>(
        tree: PlanningTree,
        reducer: (accumulator: T, node: IPlanningNode) => T,
        initialValue: T
    ): T {
        let result = initialValue;

        TreeTraversal.depthFirstTraversal(tree, (node) => {
            result = reducer(result, node);
        });

        return result;
    }

    /**
     * Get tree statistics.
     */
    public static getStatistics(tree: PlanningTree): {
        totalNodes: number;
        epicCount: number;
        storyCount: number;
        taskCount: number;
        totalStoryPoints: number;
        completionPercentage: number;
        blockedCount: number;
        inProgressCount: number;
        completedCount: number;
        notStartedCount: number;
    } {
        const epics = tree.getAllEpics();
        const stories = tree.getAllStories();
        const tasks = tree.getAllTasks();

        const allNodes = [...epics, ...stories, ...tasks];

        return {
            totalNodes: allNodes.length,
            epicCount: epics.length,
            storyCount: stories.length,
            taskCount: tasks.length,
            totalStoryPoints: tree.getTotalStoryPoints(),
            completionPercentage: tree.getCompletionPercentage(),
            blockedCount: allNodes.filter(n => n.status === 'pending').length,
            inProgressCount: allNodes.filter(n => n.status === 'in-progress').length,
            completedCount: allNodes.filter(n => n.status === 'done').length,
            notStartedCount: allNodes.filter(n => n.status === 'todo').length
        };
    }

    /**
     * Convert tree to flat array.
     */
    public static flatten(tree: PlanningTree): IPlanningNode[] {
        const nodes: IPlanningNode[] = [];

        TreeTraversal.depthFirstTraversal(tree, (node) => {
            nodes.push(node);
        });

        return nodes;
    }

    /**
     * Search tree by name (case-insensitive).
     */
    public static searchByName(tree: PlanningTree, query: string): IPlanningNode[] {
        const lowerQuery = query.toLowerCase();

        return TreeTraversal.filter(tree, node =>
            node.name.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get nodes at specific depth level.
     */
    public static getNodesByDepth(tree: PlanningTree, depth: number): IPlanningNode[] {
        return TreeTraversal.filter(tree, node => node.depth === depth);
    }

    /**
     * Check if tree has any blocked items.
     */
    public static hasBlockedItems(tree: PlanningTree): boolean {
        return TreeTraversal.getBlockedItems(tree).length > 0;
    }

    /**
     * Get leaf nodes (tasks only).
     */
    public static getLeafNodes(tree: PlanningTree): TaskNode[] {
        return tree.getAllTasks();
    }
}
