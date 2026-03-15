/**
 * Agent Session Memory MCP Tools
 *
 * Exposes memory store, recall, export, pruning, and summary
 * as MCP tool definitions for use by AI agents and the MCP bridge.
 *
 * Part of AICC-0153: Agent Session Memory
 *   - AICC-0154: Agent memory store & retrieval
 *   - AICC-0155: Orchestrator integration & memory export
 *     - AICC-0415: Create memory API (MCP tools)
 *     - AICC-0416: Implement export to markdown/JSON
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { AgentSessionMemory } from '../../services/agentSessionMemory';
import type { MemoryQuery, MemoryEntry } from '../../services/agentSessionMemory';

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

function optionalString(
    args: Record<string, unknown>,
    field: string,
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    return typeof val === 'string' ? val : undefined;
}

function optionalNumber(
    args: Record<string, unknown>,
    field: string,
    defaultVal: number,
): number {
    const val = args[field];
    if (val === undefined || val === null) {
        return defaultVal;
    }
    const num = Number(val);
    return Number.isFinite(num) ? num : defaultVal;
}

function resolveWorkspace(args: Record<string, unknown>): string {
    return typeof args.workspacePath === 'string' && args.workspacePath
        ? args.workspacePath
        : process.cwd();
}

const VALID_TYPES = ['decision', 'context', 'pattern', 'error', 'preference'] as const;

// ---------------------------------------------------------------------------
// Tool definitions (AICC-0415, AICC-0416)
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for agent session memory operations.
 */
export function getMemoryTools(): McpToolDefinition[] {
    return [
        // ── store_memory ─────────────────────────────────────────
        {
            name: 'store_memory',
            description:
                'Store a memory entry for an agent session. Records decisions, ' +
                'context, patterns, errors, or preferences with tags and relevance.',
            inputSchema: {
                type: 'object',
                properties: {
                    agentName: {
                        type: 'string',
                        description: 'Name of the agent storing the memory',
                    },
                    sessionId: {
                        type: 'string',
                        description: 'Session identifier for grouping related memories',
                    },
                    type: {
                        type: 'string',
                        enum: ['decision', 'context', 'pattern', 'error', 'preference'],
                        description: 'Classification of the memory content',
                    },
                    content: {
                        type: 'string',
                        description: 'The memory content (free-form text)',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags for categorisation (default: [])',
                    },
                    relevanceScore: {
                        type: 'number',
                        description: 'Relevance score 0-100 (default: 50)',
                    },
                    metadata: {
                        type: 'object',
                        description: 'Optional structured metadata',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: ['agentName', 'sessionId', 'type', 'content'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'store_memory';
                const errors: string[] = [];

                try {
                    const agentName = requireString(args, 'agentName', errors);
                    const sessionId = requireString(args, 'sessionId', errors);
                    const content = requireString(args, 'content', errors);
                    const typeStr = requireString(args, 'type', errors);

                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    if (!VALID_TYPES.includes(typeStr as MemoryEntry['type'])) {
                        return envelope(toolName, start, null, [
                            `Invalid type: ${typeStr}. Must be one of: ${VALID_TYPES.join(', ')}`,
                        ]);
                    }

                    const tags = Array.isArray(args.tags)
                        ? args.tags.filter((t): t is string => typeof t === 'string')
                        : [];

                    const relevanceScore = optionalNumber(args, 'relevanceScore', 50);
                    const metadata = args.metadata && typeof args.metadata === 'object'
                        ? (args.metadata as Record<string, any>)
                        : undefined;

                    const ws = resolveWorkspace(args);
                    const memory = AgentSessionMemory.getInstance(ws);

                    const entry = memory.store({
                        agentName: agentName!,
                        sessionId: sessionId!,
                        type: typeStr as MemoryEntry['type'],
                        content: content!,
                        tags,
                        relevanceScore: Math.max(0, Math.min(100, relevanceScore)),
                        ...(metadata ? { metadata } : {}),
                    });

                    return envelope(toolName, start, {
                        id: entry.id,
                        agentName: entry.agentName,
                        type: entry.type,
                        relevanceScore: entry.relevanceScore,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── recall_memory ────────────────────────────────────────
        {
            name: 'recall_memory',
            description:
                'Query agent session memory with filters. Returns entries ' +
                'sorted by relevance score and recency.',
            inputSchema: {
                type: 'object',
                properties: {
                    agentName: {
                        type: 'string',
                        description: 'Filter by agent name',
                    },
                    sessionId: {
                        type: 'string',
                        description: 'Filter by session ID',
                    },
                    type: {
                        type: 'string',
                        enum: ['decision', 'context', 'pattern', 'error', 'preference'],
                        description: 'Filter by memory type',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Filter by tags (any match)',
                    },
                    minRelevance: {
                        type: 'number',
                        description: 'Minimum relevance score (0-100)',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of results (default: 20)',
                    },
                    since: {
                        type: 'string',
                        description: 'Only return entries after this ISO date',
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
                const toolName = 'recall_memory';

                try {
                    const query: MemoryQuery = {};

                    const agentName = optionalString(args, 'agentName');
                    if (agentName) { query.agentName = agentName; }

                    const sessionId = optionalString(args, 'sessionId');
                    if (sessionId) { query.sessionId = sessionId; }

                    const typeStr = optionalString(args, 'type');
                    if (typeStr && VALID_TYPES.includes(typeStr as MemoryEntry['type'])) {
                        query.type = typeStr as MemoryEntry['type'];
                    }

                    if (Array.isArray(args.tags)) {
                        query.tags = args.tags.filter(
                            (t): t is string => typeof t === 'string',
                        );
                    }

                    if (args.minRelevance !== undefined) {
                        query.minRelevance = optionalNumber(args, 'minRelevance', 0);
                    }

                    query.limit = optionalNumber(args, 'limit', 20);

                    const since = optionalString(args, 'since');
                    if (since) { query.since = since; }

                    const ws = resolveWorkspace(args);
                    const memory = AgentSessionMemory.getInstance(ws);
                    const entries = memory.recall(query);

                    return envelope(toolName, start, {
                        entries,
                        count: entries.length,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── export_memory ────────────────────────────────────────
        {
            name: 'export_memory',
            description:
                'Export agent session memory to JSON or Markdown format.',
            inputSchema: {
                type: 'object',
                properties: {
                    format: {
                        type: 'string',
                        enum: ['json', 'markdown'],
                        description: 'Export format (default: json)',
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
                const toolName = 'export_memory';

                try {
                    const ws = resolveWorkspace(args);
                    const memory = AgentSessionMemory.getInstance(ws);
                    const format = optionalString(args, 'format') || 'json';

                    if (format === 'markdown') {
                        const markdown = memory.exportToMarkdown();
                        return envelope(toolName, start, {
                            format: 'markdown',
                            content: markdown,
                        });
                    }

                    const data = memory.exportToJson();
                    return envelope(toolName, start, {
                        format: 'json',
                        ...data,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── prune_memory ─────────────────────────────────────────
        {
            name: 'prune_memory',
            description:
                'Remove old or low-relevance memory entries. Configurable ' +
                'thresholds for age, relevance, and max entries.',
            inputSchema: {
                type: 'object',
                properties: {
                    pruneAgeDays: {
                        type: 'number',
                        description: 'Remove entries older than this many days (default: 90)',
                    },
                    pruneMinRelevance: {
                        type: 'number',
                        description: 'Remove entries below this relevance score (default: 10)',
                    },
                    maxEntries: {
                        type: 'number',
                        description: 'Maximum entries to retain (default: 5000)',
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
                const toolName = 'prune_memory';

                try {
                    const ws = resolveWorkspace(args);
                    const memory = AgentSessionMemory.getInstance(ws);

                    const config: Record<string, number> = {};
                    if (args.pruneAgeDays !== undefined) {
                        config.pruneAgeDays = optionalNumber(args, 'pruneAgeDays', 90);
                    }
                    if (args.pruneMinRelevance !== undefined) {
                        config.pruneMinRelevance = optionalNumber(args, 'pruneMinRelevance', 10);
                    }
                    if (args.maxEntries !== undefined) {
                        config.maxEntries = optionalNumber(args, 'maxEntries', 5000);
                    }

                    const pruned = memory.prune(config);
                    const summary = memory.getSummary();

                    return envelope(toolName, start, {
                        pruned,
                        remaining: summary.totalEntries,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_memory_summary ───────────────────────────────────
        {
            name: 'get_memory_summary',
            description:
                'Get aggregate statistics about agent session memory, ' +
                'including total entries, agents, sessions, and average relevance.',
            inputSchema: {
                type: 'object',
                properties: {
                    sessionId: {
                        type: 'string',
                        description: 'Optional session ID for session-specific summary',
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
                const toolName = 'get_memory_summary';

                try {
                    const ws = resolveWorkspace(args);
                    const memory = AgentSessionMemory.getInstance(ws);

                    const sessionId = optionalString(args, 'sessionId');
                    if (sessionId) {
                        const sessionSummary = memory.getSessionSummary(sessionId);
                        return envelope(toolName, start, {
                            scope: 'session',
                            sessionId,
                            ...sessionSummary,
                        });
                    }

                    const summary = memory.getSummary();
                    return envelope(toolName, start, {
                        scope: 'global',
                        ...summary,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
