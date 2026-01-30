/**
 * Global Search
 * 
 * Search across all planning entities (epics, stories, tasks)
 */

import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';
import { Epic } from '../planning/entities/epic';
import { Story } from '../planning/entities/story';
import { Task } from '../planning/entities/task';
import { Priority, EpicStatus, StoryStatus, TaskStatus } from '../planning/types';

export type SearchEntityType = 'epic' | 'story' | 'task' | 'all';
export type SearchStatus = EpicStatus | StoryStatus | TaskStatus | 'all';

export interface SearchFilters {
    query?: string;
    type?: SearchEntityType;
    status?: SearchStatus;
    priority?: Priority | 'all';
    assignee?: string;
}

export interface SearchResult {
    type: 'epic' | 'story' | 'task';
    id: string;
    epicId?: string;
    storyId?: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    assignee?: string;
    score: number; // Relevance score
    matches: SearchMatch[];
}

export interface SearchMatch {
    field: 'name' | 'description' | 'id';
    snippet: string;
    startIndex: number;
    endIndex: number;
}

export class GlobalSearch {
    private logger: Logger;
    private planningManager: PlanningManager;

    constructor(planningManager: PlanningManager, logger: Logger) {
        this.planningManager = planningManager;
        this.logger = logger;
    }

    /**
     * Search across all planning entities
     */
    async search(filters: SearchFilters): Promise<SearchResult[]> {
        const startTime = performance.now();
        const results: SearchResult[] = [];

        try {
            // Get all entities
            const epics = await this.planningManager.listEpics();

            // Search epics
            if (!filters.type || filters.type === 'all' || filters.type === 'epic') {
                for (const epic of epics) {
                    const epicResults = this.searchEpic(epic, filters);
                    results.push(...epicResults);
                }
            }

            // Search stories and tasks
            if (!filters.type || filters.type === 'all' || filters.type === 'story' || filters.type === 'task') {
                for (const epic of epics) {
                    const stories = await this.planningManager.listStories(epic.id);

                    // Search stories
                    if (!filters.type || filters.type === 'all' || filters.type === 'story') {
                        for (const story of stories) {
                            const storyResults = this.searchStory(story, epic.id, filters);
                            results.push(...storyResults);
                        }
                    }

                    // Search tasks
                    if (!filters.type || filters.type === 'all' || filters.type === 'task') {
                        for (const story of stories) {
                            const tasks = await this.planningManager.listTasks(epic.id, story.id);
                            for (const task of tasks) {
                                const taskResults = this.searchTask(task, epic.id, story.id, filters);
                                results.push(...taskResults);
                            }
                        }
                    }
                }
            }

            // Sort by relevance score (descending)
            results.sort((a, b) => b.score - a.score);

            const duration = performance.now() - startTime;
            this.logger.info('Global search completed', {
                query: filters.query,
                filters,
                resultsCount: results.length,
                durationMs: Math.round(duration)
            });

            return results;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Global search failed', { error: message, filters });
            throw error;
        }
    }

    /**
     * Search within an epic
     */
    private searchEpic(epic: Epic, filters: SearchFilters): SearchResult[] {
        // Apply filters
        if (filters.status && filters.status !== 'all' && epic.status !== filters.status) {
            return [];
        }
        if (filters.priority && filters.priority !== 'all' && epic.priority !== filters.priority) {
            return [];
        }

        // Calculate relevance score and matches
        const { score, matches } = this.calculateRelevance(
            filters.query,
            epic.title,
            epic.description,
            epic.id
        );

        // Return empty if no query match (when query is provided)
        if (filters.query && score === 0) {
            return [];
        }

        return [{
            type: 'epic',
            id: epic.id,
            name: epic.title,
            description: epic.description,
            status: epic.status,
            priority: epic.priority || 'medium',
            score,
            matches
        }];
    }

    /**
     * Search within a story
     */
    private searchStory(story: Story, epicId: string, filters: SearchFilters): SearchResult[] {
        // Apply filters
        if (filters.status && filters.status !== 'all' && story.status !== filters.status) {
            return [];
        }
        if (filters.priority && filters.priority !== 'all' && story.priority !== filters.priority) {
            return [];
        }

        // Calculate relevance score and matches
        const { score, matches } = this.calculateRelevance(
            filters.query,
            story.title,
            story.description,
            story.id
        );

        // Return empty if no query match (when query is provided)
        if (filters.query && score === 0) {
            return [];
        }

        return [{
            type: 'story',
            id: story.id,
            epicId,
            name: story.title,
            description: story.description,
            status: story.status,
            priority: story.priority || 'medium',
            score,
            matches
        }];
    }

    /**
     * Search within a task
     */
    private searchTask(task: Task, epicId: string, storyId: string, filters: SearchFilters): SearchResult[] {
        // Apply filters
        if (filters.status && filters.status !== 'all' && task.status !== filters.status) {
            return [];
        }
        if (filters.priority && filters.priority !== 'all' && task.priority !== filters.priority) {
            return [];
        }
        if (filters.assignee && task.assignee !== filters.assignee) {
            return [];
        }

        // Calculate relevance score and matches
        const { score, matches } = this.calculateRelevance(
            filters.query,
            task.title,
            task.description || '',
            task.id
        );

        // Return empty if no query match (when query is provided)
        if (filters.query && score === 0) {
            return [];
        }

        return [{
            type: 'task',
            id: task.id,
            epicId,
            storyId,
            name: task.title,
            description: task.description || '',
            status: task.status,
            priority: task.priority || 'medium',
            assignee: task.assignee,
            score,
            matches
        }];
    }

    /**
     * Calculate relevance score and find matches
     */
    private calculateRelevance(
        query: string | undefined,
        name: string,
        description: string,
        id: string
    ): { score: number; matches: SearchMatch[] } {
        if (!query) {
            return { score: 1, matches: [] };
        }

        const queryLower = query.toLowerCase();
        const nameLower = name.toLowerCase();
        const descLower = description.toLowerCase();
        const idLower = id.toLowerCase();

        let score = 0;
        const matches: SearchMatch[] = [];

        // Exact match in name (highest score)
        if (nameLower === queryLower) {
            score += 100;
            matches.push({
                field: 'name',
                snippet: name,
                startIndex: 0,
                endIndex: name.length
            });
        }
        // Name contains query
        else if (nameLower.includes(queryLower)) {
            score += 50;
            const startIndex = nameLower.indexOf(queryLower);
            matches.push({
                field: 'name',
                snippet: this.createSnippet(name, startIndex, query.length),
                startIndex,
                endIndex: startIndex + query.length
            });
        }

        // ID match
        if (idLower.includes(queryLower)) {
            score += 30;
            const startIndex = idLower.indexOf(queryLower);
            matches.push({
                field: 'id',
                snippet: this.createSnippet(id, startIndex, query.length),
                startIndex,
                endIndex: startIndex + query.length
            });
        }

        // Description contains query
        if (descLower.includes(queryLower)) {
            score += 20;
            const startIndex = descLower.indexOf(queryLower);
            matches.push({
                field: 'description',
                snippet: this.createSnippet(description, startIndex, query.length, 100),
                startIndex,
                endIndex: startIndex + query.length
            });
        }

        // Word match bonus (query words appear in name or description)
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
        for (const word of queryWords) {
            if (nameLower.includes(word)) {
                score += 10;
            }
            if (descLower.includes(word)) {
                score += 5;
            }
        }

        return { score, matches };
    }

    /**
     * Create snippet with context around match
     */
    private createSnippet(
        text: string,
        matchIndex: number,
        matchLength: number,
        maxLength: number = 150
    ): string {
        const contextBefore = 50;
        const contextAfter = maxLength - contextBefore - matchLength;

        let start = Math.max(0, matchIndex - contextBefore);
        let end = Math.min(text.length, matchIndex + matchLength + contextAfter);

        // Adjust to word boundaries
        if (start > 0) {
            const spaceIndex = text.lastIndexOf(' ', start + 10);
            if (spaceIndex > start) {
                start = spaceIndex + 1;
            }
        }
        if (end < text.length) {
            const spaceIndex = text.indexOf(' ', end - 10);
            if (spaceIndex > 0 && spaceIndex < end + 10) {
                end = spaceIndex;
            }
        }

        let snippet = text.substring(start, end);
        if (start > 0) {
            snippet = '...' + snippet;
        }
        if (end < text.length) {
            snippet = snippet + '...';
        }

        return snippet;
    }

    /**
     * Get quick stats about search space
     */
    async getSearchStats(): Promise<{
        epicsCount: number;
        storiesCount: number;
        tasksCount: number;
        totalCount: number;
    }> {
        try {
            const epics = await this.planningManager.listEpics();
            let storiesCount = 0;
            let tasksCount = 0;

            for (const epic of epics) {
                const stories = await this.planningManager.listStories(epic.id);
                storiesCount += stories.length;

                for (const story of stories) {
                    const tasks = await this.planningManager.listTasks(epic.id, story.id);
                    tasksCount += tasks.length;
                }
            }

            return {
                epicsCount: epics.length,
                storiesCount,
                tasksCount,
                totalCount: epics.length + storiesCount + tasksCount
            };
        } catch (error) {
            this.logger.error('Failed to get search stats', { error });
            return { epicsCount: 0, storiesCount: 0, tasksCount: 0, totalCount: 0 };
        }
    }
}
