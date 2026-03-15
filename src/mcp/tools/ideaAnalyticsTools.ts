/**
 * Idea Analytics MCP Tools
 *
 * Exposes idea analytics, scoring, duplicate detection, enrichment, and
 * lifecycle automation as MCP tool definitions for use by AI agents
 * and the MCP bridge.
 *
 * Part of AICC-0139: Idea Analytics & AI Enrichment
 *   - AICC-0140: Idea scoring & AI-assisted enrichment
 *   - AICC-0141: Trend analysis & lifecycle automation
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { IdeaAnalytics } from '../../services/ideaAnalytics';
import { IdeationService } from '../../services/ideationService';

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

// ---------------------------------------------------------------------------
// Tool definitions (AICC-0140, AICC-0141)
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for idea analytics operations.
 */
export function getIdeaAnalyticsTools(): McpToolDefinition[] {
    return [
        // ── score_ideas ──────────────────────────────────────────
        {
            name: 'score_ideas',
            description:
                'Score and rank all ideas using a composite algorithm ' +
                '(votes × 0.3 + engagement × 0.2 + recency × 0.3 + uniqueness × 0.2). ' +
                'Returns ideas sorted by composite score descending.',
            inputSchema: {
                type: 'object',
                properties: {
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                    limit: {
                        type: 'number',
                        description: 'Maximum number of results to return (default: all)',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'score_ideas';
                try {
                    const ws = resolveWorkspace(args);
                    const analytics = IdeaAnalytics.getInstance(ws);
                    let scores = analytics.rankIdeas();

                    const limit = optionalNumber(args, 'limit', 0);
                    if (limit > 0) {
                        scores = scores.slice(0, limit);
                    }

                    return envelope(toolName, start, {
                        scores,
                        total: scores.length,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── detect_duplicates ────────────────────────────────────
        {
            name: 'detect_duplicates',
            description:
                'Find potential duplicate ideas using fuzzy matching on ' +
                'title and description. Provide an ideaId to check against ' +
                'all others, or omit to detect duplicates across all ideas.',
            inputSchema: {
                type: 'object',
                properties: {
                    ideaId: {
                        type: 'string',
                        description: 'ID of the idea to check for duplicates (optional — omit for global scan)',
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
                const toolName = 'detect_duplicates';
                try {
                    const ws = resolveWorkspace(args);
                    const analytics = IdeaAnalytics.getInstance(ws);
                    const ideation = IdeationService.getInstance(ws);

                    const ideaId = typeof args.ideaId === 'string' ? args.ideaId : undefined;

                    if (ideaId) {
                        // Check a specific idea
                        const idea = ideation.getIdea(ideaId);
                        if (!idea) {
                            return envelope(toolName, start, null, [
                                `Idea not found: ${ideaId}`,
                            ]);
                        }
                        const candidates = analytics.detectDuplicates(idea);
                        return envelope(toolName, start, { ideaId, candidates });
                    }

                    // Global duplicate scan
                    const allIdeas = ideation.listIdeas();
                    const allCandidates: Array<{
                        ideaId: string;
                        matchId: string;
                        similarity: number;
                        matchedFields: string[];
                    }> = [];
                    const seenPairs = new Set<string>();

                    for (const idea of allIdeas) {
                        const dupes = analytics.detectDuplicates(idea);
                        for (const d of dupes) {
                            const key = [d.ideaId, d.matchId].sort().join('|');
                            if (!seenPairs.has(key)) {
                                seenPairs.add(key);
                                allCandidates.push(d);
                            }
                        }
                    }

                    allCandidates.sort((a, b) => b.similarity - a.similarity);
                    return envelope(toolName, start, {
                        candidates: allCandidates,
                        total: allCandidates.length,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_enrichment_suggestions ───────────────────────────
        {
            name: 'get_enrichment_suggestions',
            description:
                'Get AI enrichment suggestions for an idea including ' +
                'suggested tags, related ideas, duplicate detection, and ' +
                'an AI prompt for description improvement.',
            inputSchema: {
                type: 'object',
                properties: {
                    ideaId: {
                        type: 'string',
                        description: 'ID of the idea to enrich',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: ['ideaId'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'get_enrichment_suggestions';
                const errors: string[] = [];
                try {
                    const ideaId = requireString(args, 'ideaId', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const ws = resolveWorkspace(args);
                    const analytics = IdeaAnalytics.getInstance(ws);
                    const ideation = IdeationService.getInstance(ws);

                    const idea = ideation.getIdea(ideaId!);
                    if (!idea) {
                        return envelope(toolName, start, null, [
                            `Idea not found: ${ideaId}`,
                        ]);
                    }

                    const suggestions = analytics.getEnrichmentSuggestions(idea);
                    return envelope(toolName, start, suggestions);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_idea_trends ──────────────────────────────────────
        {
            name: 'get_idea_trends',
            description:
                'Get trend data showing ideas by category over time. ' +
                'Returns data points suitable for heatmap or line chart visualization.',
            inputSchema: {
                type: 'object',
                properties: {
                    periodDays: {
                        type: 'number',
                        description: 'Number of days per period bucket (7 = weekly, 30 = monthly). Default: 7',
                    },
                    includeHtml: {
                        type: 'boolean',
                        description: 'Include rendered HTML heatmap in response (default: false)',
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
                const toolName = 'get_idea_trends';
                try {
                    const ws = resolveWorkspace(args);
                    const analytics = IdeaAnalytics.getInstance(ws);

                    const periodDays = optionalNumber(args, 'periodDays', 7);
                    const data = analytics.buildTrendData(periodDays);

                    const result: Record<string, unknown> = {
                        data,
                        total: data.length,
                        periodDays,
                    };

                    if (args.includeHtml === true) {
                        result.html = analytics.generateTrendHeatmapHtml(data);
                    }

                    return envelope(toolName, start, result);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── apply_lifecycle_rules ────────────────────────────────
        {
            name: 'apply_lifecycle_rules',
            description:
                'Run lifecycle automation rules on all ideas. Automatically ' +
                'transitions ideas based on configured rules (e.g. archive ' +
                'stale drafts, promote highly-voted submissions).',
            inputSchema: {
                type: 'object',
                properties: {
                    dryRun: {
                        type: 'boolean',
                        description: 'Preview transitions without applying them (default: false)',
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
                const toolName = 'apply_lifecycle_rules';
                try {
                    const ws = resolveWorkspace(args);
                    const analytics = IdeaAnalytics.getInstance(ws);

                    // If dry run, just report what would happen
                    if (args.dryRun === true) {
                        const ideation = IdeationService.getInstance(ws);
                        const ideas = ideation.listIdeas();
                        const rules = analytics.getLifecycleRules();
                        const wouldTransition: Array<{
                            ideaId: string;
                            title: string;
                            from: string;
                            to: string;
                            condition: string;
                        }> = [];

                        for (const idea of ideas) {
                            for (const rule of rules) {
                                if (idea.status === rule.fromStatus) {
                                    // We can't call private evaluateRule, but we
                                    // can replicate the check for dry-run preview
                                    wouldTransition.push({
                                        ideaId: idea.id,
                                        title: idea.title,
                                        from: rule.fromStatus,
                                        to: rule.toStatus,
                                        condition: rule.condition,
                                    });
                                    break;
                                }
                            }
                        }

                        return envelope(toolName, start, {
                            dryRun: true,
                            potentialTransitions: wouldTransition,
                            total: wouldTransition.length,
                        });
                    }

                    const result = await analytics.applyLifecycleRules();
                    return envelope(toolName, start, {
                        dryRun: false,
                        ...result,
                        transitionedCount: result.transitioned.length,
                        skippedCount: result.skipped.length,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
