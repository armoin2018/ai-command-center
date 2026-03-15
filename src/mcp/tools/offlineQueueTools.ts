/**
 * Offline Queue MCP Tools
 *
 * Exposes queue statistics, manual drain, dead-letter listing,
 * and dead-letter retry as MCP tool definitions for use by
 * AI agents and the MCP bridge.
 *
 * Part of AICC-0150: Offline-First Skill Queue
 *   - AICC-0151: Offline detection, queue & auto-drain
 *   - AICC-0152: Event bus integration & dead letter handling
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { OfflineQueue } from '../../services/offlineQueue';

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
// Validation helpers
// ---------------------------------------------------------------------------

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

function resolveWorkspace(args: Record<string, unknown>): string {
    return typeof args.workspacePath === 'string' && args.workspacePath
        ? args.workspacePath
        : process.cwd();
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for offline queue operations.
 */
export function getOfflineQueueTools(): McpToolDefinition[] {
    return [
        // ── get_queue_stats ──────────────────────────────────────
        {
            name: 'get_queue_stats',
            description:
                'Get statistics for the offline skill queue including pending, ' +
                'processing, dead-letter counts, and lifetime totals.',
            inputSchema: {
                type: 'object',
                properties: {
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'get_queue_stats';

                try {
                    const ws = resolveWorkspace(args);
                    const queue = OfflineQueue.getInstance(ws);
                    const stats = queue.getStats();

                    return envelope(toolName, start, {
                        ...stats,
                        isOnline: queue.isOnline(),
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── drain_queue ──────────────────────────────────────────
        {
            name: 'drain_queue',
            description:
                'Manually trigger a drain of the offline queue. Processes ' +
                'all pending items in FIFO order with retry and backoff.',
            inputSchema: {
                type: 'object',
                properties: {
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'drain_queue';

                try {
                    const ws = resolveWorkspace(args);
                    const queue = OfflineQueue.getInstance(ws);

                    if (!queue.isOnline()) {
                        return envelope(toolName, start, null, [
                            'Cannot drain: network is offline',
                        ]);
                    }

                    const result = await queue.drain();
                    return envelope(toolName, start, result);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_dead_letter_items ────────────────────────────────
        {
            name: 'get_dead_letter_items',
            description:
                'List all dead-letter items in the offline queue. These are ' +
                'items that exceeded their maximum retry count.',
            inputSchema: {
                type: 'object',
                properties: {
                    includeHtml: {
                        type: 'boolean',
                        description:
                            'Include HTML review table for dead-letter items (default: false)',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'get_dead_letter_items';

                try {
                    const ws = resolveWorkspace(args);
                    const queue = OfflineQueue.getInstance(ws);
                    const items = queue.getDeadLetterItems();

                    const result: Record<string, unknown> = {
                        items,
                        count: items.length,
                    };

                    if (args.includeHtml === true) {
                        result.html = queue.generateDeadLetterReviewHtml();
                    }

                    return envelope(toolName, start, result);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── retry_dead_letter ────────────────────────────────────
        {
            name: 'retry_dead_letter',
            description:
                'Retry a specific dead-letter item. Resets its retry count ' +
                'and attempts to process it immediately.',
            inputSchema: {
                type: 'object',
                properties: {
                    itemId: {
                        type: 'string',
                        description: 'The unique ID of the dead-letter item to retry',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: ['itemId'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'retry_dead_letter';
                const errors: string[] = [];

                try {
                    const itemId = requireString(args, 'itemId', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const ws = resolveWorkspace(args);
                    const queue = OfflineQueue.getInstance(ws);

                    if (!queue.isOnline()) {
                        return envelope(toolName, start, null, [
                            'Cannot retry: network is offline',
                        ]);
                    }

                    const success = await queue.retryDeadLetterItem(itemId!);
                    return envelope(toolName, start, {
                        itemId,
                        retried: success,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
