/**
 * Planning CRUD MCP Tools
 *
 * Full CRUD tool handlers for story, task, and bug items.
 * Each handler validates inputs, delegates to PlanningManager, and returns
 * a standardised AiccMsg envelope.
 *
 * Task IDs:
 *   AICC-0301 — create_story with full validation
 *   AICC-0302 — create_task, create_bug with full validation
 *   AICC-0303 — request validation & schema compliance
 *   AICC-0304 — AiccMsg response envelope
 */

import type { PlanningManager } from '../../planning/planningManager';
import {
    Priority,
    StoryStatus,
    TaskStatus,
    ItemType,
} from '../../planning/types';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface McpToolDefinition {
    name: string;
    description: string;
    inputSchema: object;
    handler: (
        args: Record<string, unknown>,
        planningManager: PlanningManager,
    ) => Promise<McpToolResult>;
}

export interface McpToolResult {
    success: boolean;
    data: unknown;
    errors?: string[];
    meta: {
        toolName: string;
        duration: number;
        timestamp: string;
    };
}

// ---------------------------------------------------------------------------
// Validation helpers  (AICC-0303)
// ---------------------------------------------------------------------------

const VALID_PRIORITIES = Object.values(Priority) as string[];
const VALID_STORY_STATUSES = Object.values(StoryStatus) as string[];
const VALID_TASK_STATUSES = Object.values(TaskStatus) as string[];

function requireString(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null || val === '') {
        errors.push(`Missing required field: ${field}`);
        return undefined;
    }
    if (typeof val !== 'string') {
        errors.push(`Field '${field}' must be a string`);
        return undefined;
    }
    return val;
}

function optionalString(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (typeof val !== 'string') {
        errors.push(`Field '${field}' must be a string`);
        return undefined;
    }
    return val;
}

function optionalNumber(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): number | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (typeof val !== 'number' || Number.isNaN(val)) {
        errors.push(`Field '${field}' must be a number`);
        return undefined;
    }
    return val;
}

function optionalEnum(
    args: Record<string, unknown>,
    field: string,
    allowed: string[],
    errors: string[],
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (typeof val !== 'string') {
        errors.push(`Field '${field}' must be a string`);
        return undefined;
    }
    if (!allowed.includes(val)) {
        errors.push(
            `Field '${field}' must be one of: ${allowed.join(', ')}`,
        );
        return undefined;
    }
    return val;
}

function optionalStringArray(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): string[] | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (!Array.isArray(val)) {
        errors.push(`Field '${field}' must be an array of strings`);
        return undefined;
    }
    for (let i = 0; i < val.length; i++) {
        if (typeof val[i] !== 'string') {
            errors.push(`Field '${field}[${i}]' must be a string`);
            return undefined;
        }
    }
    return val as string[];
}

// ---------------------------------------------------------------------------
// Response envelope helper  (AICC-0304)
// ---------------------------------------------------------------------------

function envelope(
    toolName: string,
    startTime: number,
    data: unknown,
    errors?: string[],
): McpToolResult {
    return {
        success: !errors || errors.length === 0,
        data,
        ...(errors && errors.length > 0 ? { errors } : {}),
        meta: {
            toolName,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        },
    };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/**
 * create_story_full — AICC-0301
 *
 * Creates a story under an epic with full validation of every field.
 */
const createStoryTool: McpToolDefinition = {
    name: 'create_story_full',
    description:
        'Create a new story under an epic with full field validation (title, description, priority, status, estimatedHours, assignee, tags, acceptanceCriteria).',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            title: { type: 'string', description: 'Story title' },
            description: { type: 'string', description: 'Story description' },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'Priority level',
            },
            status: {
                type: 'string',
                enum: VALID_STORY_STATUSES,
                description: 'Initial status (defaults to todo)',
            },
            estimatedHours: {
                type: 'number',
                description: 'Estimated hours',
            },
            assignee: { type: 'string', description: 'Assignee name' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags for categorisation',
            },
            acceptanceCriteria: {
                type: 'array',
                items: { type: 'string' },
                description: 'Acceptance criteria list',
            },
        },
        required: ['epicId', 'title', 'description'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const title = requireString(args, 'title', errors);
        const description = requireString(args, 'description', errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors) as Priority | undefined;
        const _status = optionalEnum(args, 'status', VALID_STORY_STATUSES, errors);
        const estimatedHours = optionalNumber(args, 'estimatedHours', errors);
        const assignee = optionalString(args, 'assignee', errors);
        const _tags = optionalStringArray(args, 'tags', errors);
        const _acceptanceCriteria = optionalStringArray(args, 'acceptanceCriteria', errors);

        if (errors.length > 0 || !epicId || !title || !description) {
            return envelope('create_story_full', start, null, errors);
        }

        try {
            // Verify epic exists
            const epic = await planningManager.getEpic(epicId);
            if (!epic) {
                return envelope('create_story_full', start, null, [
                    `Epic not found: ${epicId}`,
                ]);
            }

            const story = await planningManager.createStory(epicId, {
                title,
                description,
                priority,
                estimatedHours,
            });

            // Apply additional fields via update if provided
            const updates: Record<string, unknown> = {};
            if (assignee) {
                updates.assignee = assignee;
            }
            if (_status) {
                updates.status = _status;
            }
            if (_tags) {
                updates.tags = _tags;
            }
            if (_acceptanceCriteria) {
                updates.acceptanceCriteria = _acceptanceCriteria;
            }

            let result: unknown = story;
            if (Object.keys(updates).length > 0) {
                const updated = await planningManager.updateStory(epicId, story.id, updates as any);
                if (updated) {
                    result = updated;
                }
            }

            return envelope('create_story_full', start, result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('create_story_full', start, null, [message]);
        }
    },
};

/**
 * update_story_full
 *
 * Update an existing story with validated fields.
 */
const updateStoryTool: McpToolDefinition = {
    name: 'update_story_full',
    description:
        'Update an existing story with validated fields (title, description, status, priority, assignee, estimatedHours, tags).',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Story ID to update' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            status: {
                type: 'string',
                enum: VALID_STORY_STATUSES,
                description: 'New status',
            },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'New priority',
            },
            assignee: { type: 'string', description: 'New assignee' },
            estimatedHours: { type: 'number', description: 'Estimated hours' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags',
            },
        },
        required: ['epicId', 'storyId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);
        const title = optionalString(args, 'title', errors);
        const description = optionalString(args, 'description', errors);
        const status = optionalEnum(args, 'status', VALID_STORY_STATUSES, errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors);
        const assignee = optionalString(args, 'assignee', errors);
        const estimatedHours = optionalNumber(args, 'estimatedHours', errors);
        const tags = optionalStringArray(args, 'tags', errors);

        if (errors.length > 0 || !epicId || !storyId) {
            return envelope('update_story_full', start, null, errors);
        }

        try {
            const updates: Record<string, unknown> = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (status !== undefined) updates.status = status;
            if (priority !== undefined) updates.priority = priority;
            if (assignee !== undefined) updates.assignee = assignee;
            if (estimatedHours !== undefined) updates.estimatedHours = estimatedHours;
            if (tags !== undefined) updates.tags = tags;

            if (Object.keys(updates).length === 0) {
                return envelope('update_story_full', start, null, [
                    'No update fields provided',
                ]);
            }

            const result = await planningManager.updateStory(epicId, storyId, updates as any);
            if (!result) {
                return envelope('update_story_full', start, null, [
                    `Story not found: ${storyId} in epic ${epicId}`,
                ]);
            }
            return envelope('update_story_full', start, result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('update_story_full', start, null, [message]);
        }
    },
};

/**
 * delete_story — delete a story and its children.
 */
const deleteStoryTool: McpToolDefinition = {
    name: 'delete_story',
    description: 'Delete a story and all its child tasks from an epic.',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Story ID to delete' },
        },
        required: ['epicId', 'storyId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);

        if (errors.length > 0 || !epicId || !storyId) {
            return envelope('delete_story', start, null, errors);
        }

        try {
            const deleted = await planningManager.deleteStory(epicId, storyId);
            if (!deleted) {
                return envelope('delete_story', start, null, [
                    `Story not found: ${storyId} in epic ${epicId}`,
                ]);
            }
            return envelope('delete_story', start, { deleted: true, storyId });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('delete_story', start, null, [message]);
        }
    },
};

/**
 * list_stories — list stories under an epic.
 */
const listStoriesTool: McpToolDefinition = {
    name: 'list_stories',
    description: 'List all stories under an epic, with optional status/priority filters.',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            status: {
                type: 'string',
                enum: VALID_STORY_STATUSES,
                description: 'Filter by status',
            },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'Filter by priority',
            },
        },
        required: ['epicId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const status = optionalEnum(args, 'status', VALID_STORY_STATUSES, errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors);

        if (errors.length > 0 || !epicId) {
            return envelope('list_stories', start, null, errors);
        }

        try {
            let stories = await planningManager.listStories(epicId);

            if (status) {
                stories = stories.filter(s => s.status === status);
            }
            if (priority) {
                stories = stories.filter(s => s.priority === priority);
            }

            return envelope('list_stories', start, {
                epicId,
                count: stories.length,
                stories,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('list_stories', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Task & Bug tools  (AICC-0302)
// ---------------------------------------------------------------------------

/**
 * create_task_full — AICC-0302
 */
const createTaskTool: McpToolDefinition = {
    name: 'create_task_full',
    description:
        'Create a new task under a story with full validation (title, description, priority, assignee, estimatedHours, tags).',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Parent story ID' },
            title: { type: 'string', description: 'Task title' },
            description: { type: 'string', description: 'Task description' },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'Priority level',
            },
            status: {
                type: 'string',
                enum: VALID_TASK_STATUSES,
                description: 'Initial status (defaults to todo)',
            },
            assignee: { type: 'string', description: 'Assignee name' },
            estimatedHours: { type: 'number', description: 'Estimated hours' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags',
            },
        },
        required: ['epicId', 'storyId', 'title', 'description'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);
        const title = requireString(args, 'title', errors);
        const description = requireString(args, 'description', errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors) as Priority | undefined;
        const _status = optionalEnum(args, 'status', VALID_TASK_STATUSES, errors);
        const assignee = optionalString(args, 'assignee', errors);
        const estimatedHours = optionalNumber(args, 'estimatedHours', errors);
        const _tags = optionalStringArray(args, 'tags', errors);

        if (errors.length > 0 || !epicId || !storyId || !title || !description) {
            return envelope('create_task_full', start, null, errors);
        }

        try {
            const task = await planningManager.createTask(epicId, storyId, {
                title,
                description,
                priority,
                assignee,
            });

            // Apply additional fields via update if provided
            const updates: Record<string, unknown> = {};
            if (_status) updates.status = _status;
            if (estimatedHours !== undefined) updates.estimatedHours = estimatedHours;
            if (_tags) updates.tags = _tags;

            let result: unknown = task;
            if (Object.keys(updates).length > 0) {
                const updated = await planningManager.updateTask(epicId, storyId, task.id, updates as any);
                if (updated) {
                    result = updated;
                }
            }

            return envelope('create_task_full', start, result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('create_task_full', start, null, [message]);
        }
    },
};

/**
 * create_bug — AICC-0302
 *
 * Creates a bug item. Bugs use TaskStatus and are stored as type=bug.
 * PlanningManager.createTask is re-used since bugs share the same shape,
 * but we tag them with type override metadata.
 */
const createBugTool: McpToolDefinition = {
    name: 'create_bug',
    description:
        'Create a new bug item under a story (uses task structure with type=bug). Includes severity, repro steps, and acceptance criteria.',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Parent story ID' },
            title: { type: 'string', description: 'Bug title' },
            description: {
                type: 'string',
                description: 'Bug description including repro steps',
            },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'Severity / priority',
            },
            assignee: { type: 'string', description: 'Assignee name' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags (e.g. severity labels)',
            },
            acceptanceCriteria: {
                type: 'array',
                items: { type: 'string' },
                description: 'Fix verification criteria',
            },
        },
        required: ['epicId', 'storyId', 'title', 'description'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);
        const title = requireString(args, 'title', errors);
        const description = requireString(args, 'description', errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors) as Priority | undefined;
        const assignee = optionalString(args, 'assignee', errors);
        const tags = optionalStringArray(args, 'tags', errors);
        const acceptanceCriteria = optionalStringArray(args, 'acceptanceCriteria', errors);

        if (errors.length > 0 || !epicId || !storyId || !title || !description) {
            return envelope('create_bug', start, null, errors);
        }

        try {
            // Create the item as a task, then update to mark as bug
            const task = await planningManager.createTask(epicId, storyId, {
                title: `[BUG] ${title}`,
                description,
                priority,
                assignee,
            });

            // Apply bug-specific metadata via update
            const updates: Record<string, unknown> = {
                type: ItemType.Bug,
            };
            if (tags) updates.tags = ['bug', ...tags];
            else updates.tags = ['bug'];
            if (acceptanceCriteria) updates.acceptanceCriteria = acceptanceCriteria;

            const updated = await planningManager.updateTask(epicId, storyId, task.id, updates as any);
            return envelope('create_bug', start, updated ?? task);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('create_bug', start, null, [message]);
        }
    },
};

/**
 * update_task_full — update a task with validated fields.
 */
const updateTaskTool: McpToolDefinition = {
    name: 'update_task_full',
    description:
        'Update an existing task with validated fields (title, description, status, priority, assignee, estimatedHours, tags).',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Parent story ID' },
            taskId: { type: 'string', description: 'Task ID to update' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            status: {
                type: 'string',
                enum: VALID_TASK_STATUSES,
                description: 'New status',
            },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'New priority',
            },
            assignee: { type: 'string', description: 'New assignee' },
            estimatedHours: { type: 'number', description: 'Estimated hours' },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Tags',
            },
        },
        required: ['epicId', 'storyId', 'taskId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);
        const taskId = requireString(args, 'taskId', errors);
        const title = optionalString(args, 'title', errors);
        const description = optionalString(args, 'description', errors);
        const status = optionalEnum(args, 'status', VALID_TASK_STATUSES, errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors);
        const assignee = optionalString(args, 'assignee', errors);
        const estimatedHours = optionalNumber(args, 'estimatedHours', errors);
        const tags = optionalStringArray(args, 'tags', errors);

        if (errors.length > 0 || !epicId || !storyId || !taskId) {
            return envelope('update_task_full', start, null, errors);
        }

        try {
            const updates: Record<string, unknown> = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (status !== undefined) updates.status = status;
            if (priority !== undefined) updates.priority = priority;
            if (assignee !== undefined) updates.assignee = assignee;
            if (estimatedHours !== undefined) updates.estimatedHours = estimatedHours;
            if (tags !== undefined) updates.tags = tags;

            if (Object.keys(updates).length === 0) {
                return envelope('update_task_full', start, null, [
                    'No update fields provided',
                ]);
            }

            const result = await planningManager.updateTask(epicId, storyId, taskId, updates as any);
            if (!result) {
                return envelope('update_task_full', start, null, [
                    `Task not found: ${taskId} in story ${storyId}`,
                ]);
            }
            return envelope('update_task_full', start, result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('update_task_full', start, null, [message]);
        }
    },
};

/**
 * delete_task — delete a task.
 */
const deleteTaskTool: McpToolDefinition = {
    name: 'delete_task',
    description: 'Delete a task from a story.',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Parent story ID' },
            taskId: { type: 'string', description: 'Task ID to delete' },
        },
        required: ['epicId', 'storyId', 'taskId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);
        const taskId = requireString(args, 'taskId', errors);

        if (errors.length > 0 || !epicId || !storyId || !taskId) {
            return envelope('delete_task', start, null, errors);
        }

        try {
            const deleted = await planningManager.deleteTask(epicId, storyId, taskId);
            if (!deleted) {
                return envelope('delete_task', start, null, [
                    `Task not found: ${taskId}`,
                ]);
            }
            return envelope('delete_task', start, { deleted: true, taskId });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('delete_task', start, null, [message]);
        }
    },
};

/**
 * list_tasks — list tasks under a story.
 */
const listTasksTool: McpToolDefinition = {
    name: 'list_tasks',
    description: 'List all tasks under a story, with optional status/priority filters.',
    inputSchema: {
        type: 'object',
        properties: {
            epicId: { type: 'string', description: 'Parent epic ID' },
            storyId: { type: 'string', description: 'Parent story ID' },
            status: {
                type: 'string',
                enum: VALID_TASK_STATUSES,
                description: 'Filter by status',
            },
            priority: {
                type: 'string',
                enum: VALID_PRIORITIES,
                description: 'Filter by priority',
            },
        },
        required: ['epicId', 'storyId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const epicId = requireString(args, 'epicId', errors);
        const storyId = requireString(args, 'storyId', errors);
        const status = optionalEnum(args, 'status', VALID_TASK_STATUSES, errors);
        const priority = optionalEnum(args, 'priority', VALID_PRIORITIES, errors);

        if (errors.length > 0 || !epicId || !storyId) {
            return envelope('list_tasks', start, null, errors);
        }

        try {
            let tasks = await planningManager.listTasks(epicId, storyId);

            if (status) {
                tasks = tasks.filter(t => t.status === status);
            }
            if (priority) {
                tasks = tasks.filter(t => t.priority === priority);
            }

            return envelope('list_tasks', start, {
                epicId,
                storyId,
                count: tasks.length,
                tasks,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('list_tasks', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all planning CRUD tool definitions for registration in mcpServer.
 */
export function getTools(): McpToolDefinition[] {
    return [
        createStoryTool,
        updateStoryTool,
        deleteStoryTool,
        listStoriesTool,
        createTaskTool,
        createBugTool,
        updateTaskTool,
        deleteTaskTool,
        listTasksTool,
    ];
}
