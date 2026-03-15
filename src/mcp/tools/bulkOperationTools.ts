/**
 * Bulk Operation MCP Tools
 *
 * Handles bulk status updates, re-parenting (move story/task), and
 * cascade status propagation.
 *
 * Task IDs:
 *   AICC-0305 — bulk status update handler
 *   AICC-0306 — re-parenting logic (move story → epic, task → story)
 *   AICC-0307 — cascade status option
 */

import type { PlanningManager as _PlanningManager } from '../../planning/planningManager';
import {
    EpicStatus,
    StoryStatus,
    TaskStatus,
    ItemType,
} from '../../planning/types';
import type { McpToolDefinition, McpToolResult } from './planningCrudTools';

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const ALL_STATUSES = [
    ...new Set([
        ...Object.values(EpicStatus),
        ...Object.values(StoryStatus),
        ...Object.values(TaskStatus),
    ]),
] as string[];

const VALID_ITEM_TYPES = Object.values(ItemType) as string[];

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

function requireEnum(
    args: Record<string, unknown>,
    field: string,
    allowed: string[],
    errors: string[],
): string | undefined {
    const val = requireString(args, field, errors);
    if (val === undefined) return undefined;
    if (!allowed.includes(val)) {
        errors.push(`Field '${field}' must be one of: ${allowed.join(', ')}`);
        return undefined;
    }
    return val;
}

function optionalBoolean(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): boolean | undefined {
    const val = args[field];
    if (val === undefined || val === null) return undefined;
    if (typeof val !== 'boolean') {
        errors.push(`Field '${field}' must be a boolean`);
        return undefined;
    }
    return val;
}

// ---------------------------------------------------------------------------
// AiccMsg envelope
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
// Status mapping helper — maps a generic status string to the correct enum
// ---------------------------------------------------------------------------

function toEpicStatus(status: string): EpicStatus {
    return status as EpicStatus;
}

function toStoryStatus(status: string): StoryStatus {
    return status as StoryStatus;
}

function toTaskStatus(status: string): TaskStatus {
    return status as TaskStatus;
}

// ---------------------------------------------------------------------------
// AICC-0305 — Bulk status update
// ---------------------------------------------------------------------------

interface BulkUpdateItem {
    type: string;
    id: string;
    epicId?: string;
    storyId?: string;
    status: string;
}

const bulkStatusUpdateTool: McpToolDefinition = {
    name: 'bulk_status_update',
    description:
        'Update the status of multiple items in one call. Each item requires type, id, and the new status. For stories provide epicId; for tasks provide epicId and storyId.',
    inputSchema: {
        type: 'object',
        properties: {
            items: {
                type: 'array',
                description: 'Array of items to update',
                items: {
                    type: 'object',
                    properties: {
                        type: {
                            type: 'string',
                            enum: VALID_ITEM_TYPES,
                            description: 'Item type',
                        },
                        id: { type: 'string', description: 'Item ID' },
                        epicId: {
                            type: 'string',
                            description: 'Parent epic ID (required for stories and tasks)',
                        },
                        storyId: {
                            type: 'string',
                            description: 'Parent story ID (required for tasks/bugs)',
                        },
                        status: {
                            type: 'string',
                            enum: ALL_STATUSES,
                            description: 'New status',
                        },
                    },
                    required: ['type', 'id', 'status'],
                },
            },
        },
        required: ['items'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();

        const rawItems = args.items;
        if (!Array.isArray(rawItems) || rawItems.length === 0) {
            return envelope('bulk_status_update', start, null, [
                'Field "items" must be a non-empty array',
            ]);
        }

        const results: Array<{ id: string; success: boolean; error?: string }> = [];
        const globalErrors: string[] = [];

        for (let i = 0; i < rawItems.length; i++) {
            const item = rawItems[i] as BulkUpdateItem;

            if (!item.type || !VALID_ITEM_TYPES.includes(item.type)) {
                results.push({
                    id: item.id ?? `index-${i}`,
                    success: false,
                    error: `Invalid or missing type at index ${i}`,
                });
                continue;
            }
            if (!item.id) {
                results.push({
                    id: `index-${i}`,
                    success: false,
                    error: `Missing id at index ${i}`,
                });
                continue;
            }
            if (!item.status || !ALL_STATUSES.includes(item.status)) {
                results.push({
                    id: item.id,
                    success: false,
                    error: `Invalid or missing status for ${item.id}`,
                });
                continue;
            }

            try {
                switch (item.type) {
                    case ItemType.Epic: {
                        const updated = await planningManager.updateEpic(item.id, {
                            status: toEpicStatus(item.status),
                        } as any);
                        results.push({
                            id: item.id,
                            success: !!updated,
                            error: updated ? undefined : 'Epic not found',
                        });
                        break;
                    }
                    case ItemType.Story: {
                        if (!item.epicId) {
                            results.push({
                                id: item.id,
                                success: false,
                                error: 'epicId required for story updates',
                            });
                            break;
                        }
                        const updatedStory = await planningManager.updateStory(
                            item.epicId,
                            item.id,
                            { status: toStoryStatus(item.status) } as any,
                        );
                        results.push({
                            id: item.id,
                            success: !!updatedStory,
                            error: updatedStory ? undefined : 'Story not found',
                        });
                        break;
                    }
                    case ItemType.Task:
                    case ItemType.Bug: {
                        if (!item.epicId || !item.storyId) {
                            results.push({
                                id: item.id,
                                success: false,
                                error: 'epicId and storyId required for task/bug updates',
                            });
                            break;
                        }
                        const updatedTask = await planningManager.updateTask(
                            item.epicId,
                            item.storyId,
                            item.id,
                            { status: toTaskStatus(item.status) } as any,
                        );
                        results.push({
                            id: item.id,
                            success: !!updatedTask,
                            error: updatedTask ? undefined : 'Task/bug not found',
                        });
                        break;
                    }
                    default:
                        results.push({
                            id: item.id,
                            success: false,
                            error: `Unknown item type: ${item.type}`,
                        });
                }
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                results.push({ id: item.id, success: false, error: message });
            }
        }

        const succeeded = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        if (failed > 0) {
            for (const r of results) {
                if (!r.success && r.error) {
                    globalErrors.push(`${r.id}: ${r.error}`);
                }
            }
        }

        return envelope(
            'bulk_status_update',
            start,
            { total: results.length, succeeded, failed, results },
            globalErrors.length > 0 ? globalErrors : undefined,
        );
    },
};

// ---------------------------------------------------------------------------
// AICC-0306 — Re-parenting
// ---------------------------------------------------------------------------

const reparentStoryTool: McpToolDefinition = {
    name: 'reparent_story',
    description:
        'Move a story from one epic to another. Updates parent links and legacy epicId field.',
    inputSchema: {
        type: 'object',
        properties: {
            storyId: { type: 'string', description: 'Story ID to move' },
            sourceEpicId: { type: 'string', description: 'Current parent epic ID' },
            targetEpicId: { type: 'string', description: 'New parent epic ID' },
        },
        required: ['storyId', 'sourceEpicId', 'targetEpicId'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const storyId = requireString(args, 'storyId', errors);
        const sourceEpicId = requireString(args, 'sourceEpicId', errors);
        const targetEpicId = requireString(args, 'targetEpicId', errors);

        if (errors.length > 0 || !storyId || !sourceEpicId || !targetEpicId) {
            return envelope('reparent_story', start, null, errors);
        }

        if (sourceEpicId === targetEpicId) {
            return envelope('reparent_story', start, null, [
                'Source and target epic are the same',
            ]);
        }

        try {
            // Verify source story exists
            const story = await planningManager.getStory(sourceEpicId, storyId);
            if (!story) {
                return envelope('reparent_story', start, null, [
                    `Story ${storyId} not found in epic ${sourceEpicId}`,
                ]);
            }

            // Verify target epic exists
            const targetEpic = await planningManager.getEpic(targetEpicId);
            if (!targetEpic) {
                return envelope('reparent_story', start, null, [
                    `Target epic not found: ${targetEpicId}`,
                ]);
            }

            // Re-parent: update the epicId and links
            const newLinks = planningManager.setParentLink(story.links, targetEpicId);
            const updated = await planningManager.updateStory(sourceEpicId, storyId, {
                epicId: targetEpicId,
                links: newLinks,
            } as any);

            if (!updated) {
                return envelope('reparent_story', start, null, [
                    'Failed to update story parent',
                ]);
            }

            return envelope('reparent_story', start, {
                storyId,
                previousEpicId: sourceEpicId,
                newEpicId: targetEpicId,
                story: updated,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('reparent_story', start, null, [message]);
        }
    },
};

const reparentTaskTool: McpToolDefinition = {
    name: 'reparent_task',
    description:
        'Move a task from one story to another (possibly in a different epic). Updates parent links and legacy fields.',
    inputSchema: {
        type: 'object',
        properties: {
            taskId: { type: 'string', description: 'Task ID to move' },
            sourceEpicId: { type: 'string', description: 'Current parent epic ID' },
            sourceStoryId: { type: 'string', description: 'Current parent story ID' },
            targetEpicId: { type: 'string', description: 'New parent epic ID' },
            targetStoryId: { type: 'string', description: 'New parent story ID' },
        },
        required: [
            'taskId',
            'sourceEpicId',
            'sourceStoryId',
            'targetEpicId',
            'targetStoryId',
        ],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const taskId = requireString(args, 'taskId', errors);
        const sourceEpicId = requireString(args, 'sourceEpicId', errors);
        const sourceStoryId = requireString(args, 'sourceStoryId', errors);
        const targetEpicId = requireString(args, 'targetEpicId', errors);
        const targetStoryId = requireString(args, 'targetStoryId', errors);

        if (
            errors.length > 0 ||
            !taskId ||
            !sourceEpicId ||
            !sourceStoryId ||
            !targetEpicId ||
            !targetStoryId
        ) {
            return envelope('reparent_task', start, null, errors);
        }

        if (sourceStoryId === targetStoryId && sourceEpicId === targetEpicId) {
            return envelope('reparent_task', start, null, [
                'Source and target story are the same',
            ]);
        }

        try {
            // Verify task exists
            const task = await planningManager.getTask(sourceEpicId, sourceStoryId, taskId);
            if (!task) {
                return envelope('reparent_task', start, null, [
                    `Task ${taskId} not found in story ${sourceStoryId}`,
                ]);
            }

            // Verify target story exists
            const targetStory = await planningManager.getStory(targetEpicId, targetStoryId);
            if (!targetStory) {
                return envelope('reparent_task', start, null, [
                    `Target story not found: ${targetStoryId} in epic ${targetEpicId}`,
                ]);
            }

            // Update parent link to point at new story
            const newLinks = planningManager.setParentLink(task.links, targetStoryId);
            const updated = await planningManager.updateTask(
                sourceEpicId,
                sourceStoryId,
                taskId,
                {
                    epicId: targetEpicId,
                    links: newLinks,
                } as any,
            );

            if (!updated) {
                return envelope('reparent_task', start, null, [
                    'Failed to update task parent',
                ]);
            }

            return envelope('reparent_task', start, {
                taskId,
                previousParent: { epicId: sourceEpicId, storyId: sourceStoryId },
                newParent: { epicId: targetEpicId, storyId: targetStoryId },
                task: updated,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('reparent_task', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// AICC-0307 — Cascade status
// ---------------------------------------------------------------------------

const cascadeStatusTool: McpToolDefinition = {
    name: 'cascade_status',
    description:
        'Update the status of a parent item and optionally cascade the same status to all children. For an epic, cascades to stories and tasks. For a story, cascades to tasks.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: ['epic', 'story'],
                description: 'Parent item type',
            },
            id: { type: 'string', description: 'Parent item ID' },
            epicId: {
                type: 'string',
                description: 'Epic ID (required when type=story)',
            },
            status: {
                type: 'string',
                enum: ALL_STATUSES,
                description: 'New status to apply',
            },
            cascade: {
                type: 'boolean',
                description: 'Whether to cascade status to children (default true)',
            },
        },
        required: ['type', 'id', 'status'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const type = requireEnum(args, 'type', ['epic', 'story'], errors);
        const id = requireString(args, 'id', errors);
        const status = requireEnum(args, 'status', ALL_STATUSES, errors);
        const epicId = args.epicId as string | undefined;
        const cascade = optionalBoolean(args, 'cascade', errors) ?? true;

        if (errors.length > 0 || !type || !id || !status) {
            return envelope('cascade_status', start, null, errors);
        }

        try {
            const affected: Array<{ type: string; id: string; status: string }> = [];

            if (type === 'epic') {
                // Update the epic itself
                const updatedEpic = await planningManager.updateEpic(id, {
                    status: toEpicStatus(status),
                } as any);
                if (!updatedEpic) {
                    return envelope('cascade_status', start, null, [
                        `Epic not found: ${id}`,
                    ]);
                }
                affected.push({ type: 'epic', id, status });

                if (cascade) {
                    // Cascade to stories
                    const stories = await planningManager.listStories(id);
                    for (const story of stories) {
                        await planningManager.updateStory(id, story.id, {
                            status: toStoryStatus(status),
                        } as any);
                        affected.push({ type: 'story', id: story.id, status });

                        // Cascade to tasks under each story
                        const tasks = await planningManager.listTasks(id, story.id);
                        for (const task of tasks) {
                            await planningManager.updateTask(id, story.id, task.id, {
                                status: toTaskStatus(status),
                            } as any);
                            affected.push({ type: 'task', id: task.id, status });
                        }
                    }
                }
            } else if (type === 'story') {
                if (!epicId) {
                    return envelope('cascade_status', start, null, [
                        'epicId is required when type=story',
                    ]);
                }

                const updatedStory = await planningManager.updateStory(epicId, id, {
                    status: toStoryStatus(status),
                } as any);
                if (!updatedStory) {
                    return envelope('cascade_status', start, null, [
                        `Story not found: ${id} in epic ${epicId}`,
                    ]);
                }
                affected.push({ type: 'story', id, status });

                if (cascade) {
                    const tasks = await planningManager.listTasks(epicId, id);
                    for (const task of tasks) {
                        await planningManager.updateTask(epicId, id, task.id, {
                            status: toTaskStatus(status),
                        } as any);
                        affected.push({ type: 'task', id: task.id, status });
                    }
                }
            }

            return envelope('cascade_status', start, {
                cascaded: cascade,
                totalAffected: affected.length,
                affected,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('cascade_status', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all bulk-operation tool definitions for registration in mcpServer.
 */
export function getTools(): McpToolDefinition[] {
    return [
        bulkStatusUpdateTool,
        reparentStoryTool,
        reparentTaskTool,
        cascadeStatusTool,
    ];
}
