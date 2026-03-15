/**
 * Prompt Effectiveness MCP Tools
 *
 * Exposes prompt usage tracking, outcome correlation, effectiveness
 * scoring, and leaderboard generation as MCP tool definitions for use
 * by AI agents and the MCP bridge.
 *
 * Part of AICC-0148: Prompt Effectiveness Scoring
 *   - AICC-0149: Prompt tracking & effectiveness scoring
 *     - AICC-0400: Implement prompt usage tracker
 *     - AICC-0401: Build outcome correlation engine
 *     - AICC-0402: Create effectiveness score 0-100 algorithm
 *     - AICC-0403: Build leaderboard UI
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { PromptEffectivenessTracker } from '../../services/promptEffectivenessTracker';
import type { PromptUsage } from '../../services/promptEffectivenessTracker';

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

const VALID_OUTCOMES = ['success', 'partial', 'failure', 'pending'] as const;

// ---------------------------------------------------------------------------
// Tool definitions (AICC-0400 – AICC-0403)
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for prompt effectiveness operations.
 */
export function getPromptTools(): McpToolDefinition[] {
    return [
        // ── track_prompt_usage ───────────────────────────────────
        {
            name: 'track_prompt_usage',
            description:
                'Record a prompt usage event. Tracks the prompt name, text, ' +
                'duration, outcome, and contextual metadata. Persists to ' +
                '.project/PROMPT-HISTORY.json.',
            inputSchema: {
                type: 'object',
                properties: {
                    promptName: {
                        type: 'string',
                        description: 'Human-readable name of the prompt',
                    },
                    promptText: {
                        type: 'string',
                        description: 'The full prompt text that was sent',
                    },
                    durationMs: {
                        type: 'number',
                        description: 'Duration in milliseconds from prompt send to response',
                    },
                    outcome: {
                        type: 'string',
                        enum: ['success', 'partial', 'failure', 'pending'],
                        description: 'Outcome of the prompt usage',
                    },
                    resultSummary: {
                        type: 'string',
                        description: 'Optional summary of the result',
                    },
                    tags: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Tags for categorisation (default: [])',
                    },
                    agentName: {
                        type: 'string',
                        description: 'Name of the agent that used the prompt',
                    },
                    taskType: {
                        type: 'string',
                        description: 'Type of task the prompt was used for',
                    },
                    fileCount: {
                        type: 'number',
                        description: 'Number of files involved',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: ['promptName', 'promptText', 'durationMs', 'outcome'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'track_prompt_usage';
                const errors: string[] = [];

                try {
                    const promptName = requireString(args, 'promptName', errors);
                    const promptText = requireString(args, 'promptText', errors);

                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const durationMs = optionalNumber(args, 'durationMs', 0);
                    const outcome = (typeof args.outcome === 'string' &&
                        VALID_OUTCOMES.includes(args.outcome as PromptUsage['outcome']))
                        ? (args.outcome as PromptUsage['outcome'])
                        : 'pending';

                    const tags = Array.isArray(args.tags)
                        ? args.tags.filter((t): t is string => typeof t === 'string')
                        : [];

                    const ws = resolveWorkspace(args);
                    const tracker = PromptEffectivenessTracker.getInstance(ws);

                    const usage = tracker.trackUsage({
                        promptName: promptName!,
                        promptText: promptText!,
                        timestamp: new Date().toISOString(),
                        durationMs,
                        outcome,
                        resultSummary: optionalString(args, 'resultSummary'),
                        tags,
                        context: {
                            agentName: optionalString(args, 'agentName'),
                            taskType: optionalString(args, 'taskType'),
                            fileCount: args.fileCount !== undefined
                                ? optionalNumber(args, 'fileCount', 0)
                                : undefined,
                        },
                    });

                    return envelope(toolName, start, {
                        id: usage.id,
                        promptName: usage.promptName,
                        outcome: usage.outcome,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── update_prompt_outcome ────────────────────────────────
        {
            name: 'update_prompt_outcome',
            description:
                'Update the outcome of a previously tracked prompt usage. ' +
                'Use this after evaluating the result of a prompt.',
            inputSchema: {
                type: 'object',
                properties: {
                    usageId: {
                        type: 'string',
                        description: 'The unique ID of the usage to update',
                    },
                    outcome: {
                        type: 'string',
                        enum: ['success', 'partial', 'failure', 'pending'],
                        description: 'The updated outcome',
                    },
                    resultSummary: {
                        type: 'string',
                        description: 'Optional summary of the result',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: ['usageId', 'outcome'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'update_prompt_outcome';
                const errors: string[] = [];

                try {
                    const usageId = requireString(args, 'usageId', errors);
                    const outcome = requireString(args, 'outcome', errors);

                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    if (!VALID_OUTCOMES.includes(outcome as PromptUsage['outcome'])) {
                        return envelope(toolName, start, null, [
                            `Invalid outcome: ${outcome}. Must be one of: ${VALID_OUTCOMES.join(', ')}`,
                        ]);
                    }

                    const ws = resolveWorkspace(args);
                    const tracker = PromptEffectivenessTracker.getInstance(ws);

                    tracker.updateOutcome(
                        usageId!,
                        outcome as PromptUsage['outcome'],
                        optionalString(args, 'resultSummary'),
                    );

                    return envelope(toolName, start, {
                        usageId,
                        outcome,
                        updated: true,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_prompt_effectiveness ─────────────────────────────
        {
            name: 'get_prompt_effectiveness',
            description:
                'Get the effectiveness score (0-100) for a specific prompt. ' +
                'Score is based on success rate, usage frequency, speed, and trend.',
            inputSchema: {
                type: 'object',
                properties: {
                    promptName: {
                        type: 'string',
                        description: 'Name of the prompt to score',
                    },
                    includeHistory: {
                        type: 'boolean',
                        description: 'Include recent usage history in the response (default: false)',
                    },
                    includeChart: {
                        type: 'boolean',
                        description: 'Include HTML effectiveness chart (default: false)',
                    },
                    workspacePath: {
                        type: 'string',
                        description: 'Workspace root path (defaults to cwd)',
                    },
                },
                required: ['promptName'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'get_prompt_effectiveness';
                const errors: string[] = [];

                try {
                    const promptName = requireString(args, 'promptName', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const ws = resolveWorkspace(args);
                    const tracker = PromptEffectivenessTracker.getInstance(ws);

                    const score = tracker.computeEffectiveness(promptName!);

                    const result: Record<string, unknown> = { ...score };

                    if (args.includeHistory === true) {
                        result.recentHistory = tracker.getUsageHistory(
                            promptName!,
                            10,
                        );
                    }

                    if (args.includeChart === true) {
                        result.chartHtml =
                            tracker.generateEffectivenessChartHtml(promptName!);
                    }

                    return envelope(toolName, start, result);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_prompt_leaderboard ───────────────────────────────
        {
            name: 'get_prompt_leaderboard',
            description:
                'Get a ranked leaderboard of all tracked prompts sorted by ' +
                'effectiveness score. Optionally includes HTML visualization.',
            inputSchema: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: 'Maximum number of entries to return (default: all)',
                    },
                    includeHtml: {
                        type: 'boolean',
                        description: 'Include HTML leaderboard table (default: false)',
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
                const toolName = 'get_prompt_leaderboard';

                try {
                    const ws = resolveWorkspace(args);
                    const tracker = PromptEffectivenessTracker.getInstance(ws);

                    const limit = optionalNumber(args, 'limit', 0);
                    const entries = tracker.getLeaderboard(
                        limit > 0 ? limit : undefined,
                    );

                    const result: Record<string, unknown> = {
                        entries,
                        total: entries.length,
                    };

                    if (args.includeHtml === true) {
                        result.html = tracker.generateLeaderboardHtml();
                    }

                    return envelope(toolName, start, result);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
