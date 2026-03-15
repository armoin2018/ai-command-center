/**
 * Confluence MCP Tools
 *
 * Exposes Confluence integration operations as MCP tool definitions
 * for use by AI agents and the MCP bridge.
 *
 * Part of AICC-0159: Confluence Integration
 *   - AICC-0422: Get/search pages
 *   - AICC-0424: Push/pull/sync documents
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { ConfluenceClient } from '../../integrations/confluenceClient';
import type { SyncMapping } from '../../integrations/confluenceClient';

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

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for Confluence integration operations.
 */
export function getConfluenceTools(): McpToolDefinition[] {
    return [
        // ── confluence_get_page ──────────────────────────────────
        {
            name: 'confluence_get_page',
            description:
                'Get a Confluence page by ID. Returns the page title, body ' +
                '(converted to Markdown), version, and status.',
            inputSchema: {
                type: 'object',
                properties: {
                    pageId: {
                        type: 'string',
                        description: 'The Confluence page ID to retrieve',
                    },
                },
                required: ['pageId'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'confluence_get_page';
                const errors: string[] = [];

                try {
                    const pageId = requireString(args, 'pageId', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const client = ConfluenceClient.getInstance();
                    if (!client.isConfigured()) {
                        return envelope(toolName, start, null, [
                            'Confluence is not configured. Use the Confluence auth settings to configure.',
                        ]);
                    }

                    const page = await client.getPage(pageId!);
                    const markdown = client.confluenceToMarkdown(page.body);

                    return envelope(toolName, start, {
                        id: page.id,
                        title: page.title,
                        spaceKey: page.spaceKey,
                        version: page.version,
                        status: page.status,
                        body: markdown,
                        webUrl: page._links?.webui ?? null,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── confluence_search ────────────────────────────────────
        {
            name: 'confluence_search',
            description:
                'Search Confluence pages using text or CQL query. Returns ' +
                'matching page titles, IDs, and space keys.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Search query text or CQL expression',
                    },
                    spaceKey: {
                        type: 'string',
                        description: 'Optional space key to narrow search scope',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum results to return (default: 25, max: 100)',
                    },
                },
                required: ['query'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'confluence_search';
                const errors: string[] = [];

                try {
                    const query = requireString(args, 'query', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const client = ConfluenceClient.getInstance();
                    if (!client.isConfigured()) {
                        return envelope(toolName, start, null, [
                            'Confluence is not configured. Use the Confluence auth settings to configure.',
                        ]);
                    }

                    const spaceKey = optionalString(args, 'spaceKey');
                    const limit = optionalNumber(args, 'limit', 25);

                    const result = await client.searchPages(query!, spaceKey, limit);

                    return envelope(toolName, start, {
                        totalSize: result.totalSize,
                        start: result.start,
                        limit: result.limit,
                        results: result.results.map((p) => ({
                            id: p.id,
                            title: p.title,
                            spaceKey: p.spaceKey,
                            status: p.status,
                            webUrl: p._links?.webui ?? null,
                        })),
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── confluence_push ──────────────────────────────────────
        {
            name: 'confluence_push',
            description:
                'Push a local Markdown document to Confluence. Creates a new ' +
                'page or updates an existing one based on sync mappings.',
            inputSchema: {
                type: 'object',
                properties: {
                    localPath: {
                        type: 'string',
                        description: 'Absolute path to the local Markdown file to push',
                    },
                    spaceKey: {
                        type: 'string',
                        description: 'Confluence space key (uses default if omitted)',
                    },
                    parentId: {
                        type: 'string',
                        description: 'Optional parent page ID for new pages',
                    },
                },
                required: ['localPath'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'confluence_push';
                const errors: string[] = [];

                try {
                    const localPath = requireString(args, 'localPath', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const client = ConfluenceClient.getInstance();
                    if (!client.isConfigured()) {
                        return envelope(toolName, start, null, [
                            'Confluence is not configured. Use the Confluence auth settings to configure.',
                        ]);
                    }

                    const spaceKey = optionalString(args, 'spaceKey') ?? '';
                    const parentId = optionalString(args, 'parentId');

                    const result = await client.pushDocument(localPath!, spaceKey, parentId);

                    return envelope(
                        toolName,
                        start,
                        {
                            pushed: result.pushed,
                            conflicts: result.conflicts,
                            errors: result.errors,
                        },
                        result.errors.length > 0 ? result.errors : undefined,
                    );
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── confluence_pull ──────────────────────────────────────
        {
            name: 'confluence_pull',
            description:
                'Pull a Confluence page and save it as a local Markdown file.',
            inputSchema: {
                type: 'object',
                properties: {
                    pageId: {
                        type: 'string',
                        description: 'Confluence page ID to pull',
                    },
                    localPath: {
                        type: 'string',
                        description: 'Absolute path where the Markdown file will be saved',
                    },
                },
                required: ['pageId', 'localPath'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'confluence_pull';
                const errors: string[] = [];

                try {
                    const pageId = requireString(args, 'pageId', errors);
                    const localPath = requireString(args, 'localPath', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const client = ConfluenceClient.getInstance();
                    if (!client.isConfigured()) {
                        return envelope(toolName, start, null, [
                            'Confluence is not configured. Use the Confluence auth settings to configure.',
                        ]);
                    }

                    const result = await client.pullDocument(pageId!, localPath!);

                    return envelope(
                        toolName,
                        start,
                        {
                            pulled: result.pulled,
                            localPath: localPath!,
                            errors: result.errors,
                        },
                        result.errors.length > 0 ? result.errors : undefined,
                    );
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── confluence_sync ──────────────────────────────────────
        {
            name: 'confluence_sync',
            description:
                'Synchronise all mapped documents between local workspace and ' +
                'Confluence. Uses stored sync mappings to determine direction ' +
                'and detect conflicts.',
            inputSchema: {
                type: 'object',
                properties: {
                    mappings: {
                        type: 'array',
                        description:
                            'Optional array of sync mappings to process. If omitted, ' +
                            'uses stored mappings from .project/confluence-sync.json.',
                        items: {
                            type: 'object',
                            properties: {
                                localPath: { type: 'string' },
                                confluenceId: { type: 'string' },
                                lastSyncedAt: { type: 'string' },
                                lastLocalHash: { type: 'string' },
                                direction: {
                                    type: 'string',
                                    enum: ['push', 'pull', 'bidirectional'],
                                },
                            },
                            required: ['localPath', 'confluenceId', 'direction'],
                        },
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'confluence_sync';

                try {
                    const client = ConfluenceClient.getInstance();
                    if (!client.isConfigured()) {
                        return envelope(toolName, start, null, [
                            'Confluence is not configured. Use the Confluence auth settings to configure.',
                        ]);
                    }

                    // Use provided mappings or load from disk
                    let mappings: SyncMapping[];
                    if (Array.isArray(args.mappings)) {
                        mappings = args.mappings as SyncMapping[];
                    } else {
                        // Load stored mappings via the client's internal method
                        // We access through syncAll which handles loading internally
                        mappings = [];
                    }

                    const result = await client.syncAll(mappings);

                    return envelope(
                        toolName,
                        start,
                        {
                            pushed: result.pushed,
                            pulled: result.pulled,
                            conflicts: result.conflicts,
                            totalMappings: mappings.length,
                            errors: result.errors,
                        },
                        result.errors.length > 0 ? result.errors : undefined,
                    );
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
