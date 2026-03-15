/**
 * Knowledge Base MCP Tools
 *
 * Exposes knowledge storage, search, deduplication, summary,
 * and export as MCP tool definitions for use by AI agents
 * and the MCP bridge.
 *
 * Part of AICC-0156: Cross-Workspace Knowledge Base
 *   - AICC-0157: Knowledge store & extraction
 *   - AICC-0158: Knowledge search & deduplication
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { KnowledgeBase } from '../../services/knowledgeBase';
import type { KnowledgeQuery, KnowledgeEntry } from '../../services/knowledgeBase';

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

const VALID_CATEGORIES = ['pattern', 'solution', 'gotcha', 'config', 'reference'] as const;

// ---------------------------------------------------------------------------
// Tool definitions (AICC-0417 – AICC-0421)
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for cross-workspace knowledge base operations.
 */
export function getKnowledgeTools(): McpToolDefinition[] {
    return [
        // ── store_knowledge ──────────────────────────────────────
        {
            name: 'store_knowledge',
            description:
                'Store a knowledge entry in the cross-workspace knowledge base. ' +
                'Persists patterns, solutions, gotchas, configs, and references ' +
                'at ~/.aicc/knowledge/ for global access.',
            inputSchema: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        description: 'Short descriptive title for the knowledge entry',
                    },
                    content: {
                        type: 'string',
                        description: 'The knowledge content (markdown supported)',
                    },
                    source: {
                        type: 'string',
                        description: 'Where this knowledge originated',
                    },
                    sourceWorkspace: {
                        type: 'string',
                        description: 'Workspace path where this was captured',
                    },
                    category: {
                        type: 'string',
                        enum: ['pattern', 'solution', 'gotcha', 'config', 'reference'],
                        description: 'Classification category',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags for categorisation (default: [])',
                    },
                    confidence: {
                        type: 'number',
                        description: 'Confidence score 0-100 (default: 50)',
                    },
                },
                required: ['title', 'content', 'source', 'category'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'store_knowledge';
                const errors: string[] = [];

                try {
                    const title = requireString(args, 'title', errors);
                    const content = requireString(args, 'content', errors);
                    const source = requireString(args, 'source', errors);
                    const categoryStr = requireString(args, 'category', errors);

                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    if (!VALID_CATEGORIES.includes(categoryStr as KnowledgeEntry['category'])) {
                        return envelope(toolName, start, null, [
                            `Invalid category: ${categoryStr}. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
                        ]);
                    }

                    const tags = Array.isArray(args.tags)
                        ? args.tags.filter((t): t is string => typeof t === 'string')
                        : [];

                    const confidence = optionalNumber(args, 'confidence', 50);
                    const sourceWorkspace = optionalString(args, 'sourceWorkspace');

                    const kb = KnowledgeBase.getInstance();

                    const entry = kb.store({
                        title: title!,
                        content: content!,
                        source: source!,
                        category: categoryStr as KnowledgeEntry['category'],
                        tags,
                        confidence: Math.max(0, Math.min(100, confidence)),
                        ...(sourceWorkspace ? { sourceWorkspace } : {}),
                    });

                    // Auto-detect duplicates
                    const duplicates = kb.detectDuplicates(entry);

                    return envelope(toolName, start, {
                        id: entry.id,
                        title: entry.title,
                        category: entry.category,
                        confidence: entry.confidence,
                        duplicatesFound: duplicates.length,
                        ...(duplicates.length > 0
                            ? { duplicates: duplicates.slice(0, 3) }
                            : {}),
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── search_knowledge ─────────────────────────────────────
        {
            name: 'search_knowledge',
            description:
                'Search the cross-workspace knowledge base with fuzzy text ' +
                'matching and tag-based filtering. Returns entries sorted by relevance.',
            inputSchema: {
                type: 'object',
                properties: {
                    text: {
                        type: 'string',
                        description: 'Free-text search query (fuzzy matched)',
                    },
                    category: {
                        type: 'string',
                        enum: ['pattern', 'solution', 'gotcha', 'config', 'reference'],
                        description: 'Filter by category',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Filter by tags (any match)',
                    },
                    minConfidence: {
                        type: 'number',
                        description: 'Minimum confidence threshold (0-100)',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of results (default: 20)',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'search_knowledge';

                try {
                    const query: KnowledgeQuery = {};

                    const text = optionalString(args, 'text');
                    if (text) { query.text = text; }

                    const categoryStr = optionalString(args, 'category');
                    if (categoryStr && VALID_CATEGORIES.includes(categoryStr as KnowledgeEntry['category'])) {
                        query.category = categoryStr as KnowledgeEntry['category'];
                    }

                    if (Array.isArray(args.tags)) {
                        query.tags = args.tags.filter(
                            (t): t is string => typeof t === 'string',
                        );
                    }

                    if (args.minConfidence !== undefined) {
                        query.minConfidence = optionalNumber(args, 'minConfidence', 0);
                    }

                    query.limit = optionalNumber(args, 'limit', 20);

                    const kb = KnowledgeBase.getInstance();
                    const entries = kb.search(query);

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

        // ── detect_knowledge_duplicates ──────────────────────────
        {
            name: 'detect_knowledge_duplicates',
            description:
                'Find potential duplicate entries in the knowledge base for ' +
                'a given entry ID. Uses fuzzy matching on title and content.',
            inputSchema: {
                type: 'object',
                properties: {
                    entryId: {
                        type: 'string',
                        description: 'ID of the knowledge entry to check for duplicates',
                    },
                },
                required: ['entryId'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'detect_knowledge_duplicates';
                const errors: string[] = [];

                try {
                    const entryId = requireString(args, 'entryId', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const kb = KnowledgeBase.getInstance();
                    const entry = kb.getEntry(entryId!);

                    if (!entry) {
                        return envelope(toolName, start, null, [
                            `Knowledge entry not found: ${entryId}`,
                        ]);
                    }

                    const duplicates = kb.detectDuplicates(entry);

                    return envelope(toolName, start, {
                        entryId,
                        title: entry.title,
                        duplicates,
                        count: duplicates.length,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_knowledge_summary ────────────────────────────────
        {
            name: 'get_knowledge_summary',
            description:
                'Get aggregate statistics about the cross-workspace knowledge base, ' +
                'including totals, category breakdown, top tags, and average confidence.',
            inputSchema: {
                type: 'object',
                properties: {},
                required: [],
            },
            handler: async () => {
                const start = Date.now();
                const toolName = 'get_knowledge_summary';

                try {
                    const kb = KnowledgeBase.getInstance();
                    const summary = kb.getSummary();

                    return envelope(toolName, start, summary);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── export_knowledge ─────────────────────────────────────
        {
            name: 'export_knowledge',
            description:
                'Export all entries from the cross-workspace knowledge base as JSON.',
            inputSchema: {
                type: 'object',
                properties: {},
                required: [],
            },
            handler: async () => {
                const start = Date.now();
                const toolName = 'export_knowledge';

                try {
                    const kb = KnowledgeBase.getInstance();
                    const entries = kb.exportAll();

                    return envelope(toolName, start, {
                        entries,
                        count: entries.length,
                        exportedAt: new Date().toISOString(),
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
