/**
 * Velocity MCP Tools
 *
 * Exposes sprint velocity, burndown, and forecast data as MCP tool
 * definitions for use by AI agents and the MCP bridge.
 *
 * Part of AICC-0133: Planning Velocity Engine
 *   - AICC-0369: Create MCP resource for velocity data
 */

import type { PlanningManager } from '../../planning/planningManager';
import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { VelocityEngine } from '../../services/velocityEngine';

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

function requireNumber(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): number | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        errors.push(`Missing required field: ${field}`);
        return undefined;
    }
    if (typeof val !== 'number' || isNaN(val)) {
        errors.push(`Field '${field}' must be a number`);
        return undefined;
    }
    return val;
}

function optionalNumber(
    args: Record<string, unknown>,
    field: string,
): number | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    return typeof val === 'number' ? val : undefined;
}

// ---------------------------------------------------------------------------
// get_velocity_metrics
// ---------------------------------------------------------------------------

/**
 * Return VelocityMetrics for all recorded sprints.
 */
const getVelocityMetricsTool: McpToolDefinition = {
    name: 'get_velocity_metrics',
    description:
        'Get aggregated sprint velocity metrics including average velocity, ' +
        'story point averages, velocity trend, cycle time, and throughput. ' +
        'Data is computed from .project/PLAN-HISTORY.json.',
    inputSchema: {
        type: 'object',
        properties: {
            lastN: {
                type: 'number',
                description:
                    'Only consider the last N sprints (default: all)',
            },
        },
        required: [],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();

        try {
            const engine = VelocityEngine.getInstance();
            let snapshots = await engine.loadHistory();

            if (snapshots.length === 0) {
                return envelope('get_velocity_metrics', start, {
                    message:
                        'No sprint history found. Record sprints using the record_sprint tool or tag items with sprint:<N> in PLAN.json.',
                    metrics: null,
                });
            }

            // Optionally limit to last N sprints
            const lastN = optionalNumber(args, 'lastN');
            if (lastN && lastN > 0 && lastN < snapshots.length) {
                snapshots = snapshots.slice(-lastN);
            }

            const metrics = engine.computeVelocity(snapshots);

            return envelope('get_velocity_metrics', start, {
                sprintCount: metrics.sprints.length,
                averageVelocity: metrics.averageVelocity,
                averageStoryPoints: metrics.averageStoryPoints,
                velocityTrend: metrics.velocityTrend,
                cycleTimeAvgDays: metrics.cycleTimeAvg,
                throughputPerDay: metrics.throughputAvg,
                sprints: metrics.sprints.map((s) => ({
                    sprint: s.sprint,
                    planned: s.itemsPlanned,
                    completed: s.itemsCompleted,
                    storyPointsPlanned: s.storyPointsPlanned,
                    storyPointsCompleted: s.storyPointsCompleted,
                    startDate: s.startDate,
                    endDate: s.endDate,
                })),
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_velocity_metrics', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// get_burndown
// ---------------------------------------------------------------------------

/**
 * Return BurndownData for a specific sprint.
 */
const getBurndownTool: McpToolDefinition = {
    name: 'get_burndown',
    description:
        'Get burndown data for a specific sprint including daily remaining ' +
        'items with actual vs ideal burndown lines.',
    inputSchema: {
        type: 'object',
        properties: {
            sprint: {
                type: 'number',
                description: 'Sprint number to get burndown for',
            },
        },
        required: ['sprint'],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();
        const errors: string[] = [];

        const sprint = requireNumber(args, 'sprint', errors);
        if (errors.length > 0) {
            return envelope('get_burndown', start, null, errors);
        }

        try {
            const engine = VelocityEngine.getInstance();
            const burndown = await engine.generateBurndown(sprint!);

            if (burndown.dailyRemaining.length === 0) {
                return envelope('get_burndown', start, {
                    message: `No data found for sprint ${sprint}. Ensure the sprint has been recorded.`,
                    burndown: null,
                });
            }

            return envelope('get_burndown', start, {
                sprint: burndown.sprint,
                totalItems: burndown.totalItems,
                daysInSprint: burndown.dailyRemaining.length,
                dailyRemaining: burndown.dailyRemaining,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_burndown', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// forecast_completion
// ---------------------------------------------------------------------------

/**
 * Predict project completion using velocity data.
 */
const forecastCompletionTool: McpToolDefinition = {
    name: 'forecast_completion',
    description:
        'Forecast project completion based on sprint velocity. Returns estimated ' +
        'sprints to completion, estimated date, confidence level, and best/worst ' +
        'case scenarios.',
    inputSchema: {
        type: 'object',
        properties: {
            remainingItems: {
                type: 'number',
                description:
                    'Number of remaining items to complete. If omitted, counts items with non-done status from PLAN.json.',
            },
        },
        required: [],
    },
    handler: async (
        args: Record<string, unknown>,
        planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();

        try {
            const engine = VelocityEngine.getInstance();
            const snapshots = await engine.loadHistory();

            if (snapshots.length === 0) {
                return envelope('forecast_completion', start, {
                    message:
                        'No sprint history available for forecasting. Record sprints first.',
                    forecast: null,
                });
            }

            const metrics = engine.computeVelocity(snapshots);

            // Determine remaining items
            let remainingItems = optionalNumber(args, 'remainingItems');

            if (remainingItems === undefined) {
                // Count non-done items from planning manager tree
                try {
                    const stats = await planningManager.getTreeStatistics();
                    const total =
                        (stats as Record<string, number>).totalItems ?? 0;
                    const done =
                        (stats as Record<string, number>).doneItems ?? 0;
                    remainingItems = Math.max(0, total - done);
                } catch {
                    return envelope(
                        'forecast_completion',
                        start,
                        null,
                        [
                            'Could not determine remaining items. Provide remainingItems parameter explicitly.',
                        ],
                    );
                }
            }

            const forecast = engine.forecastCompletion(
                remainingItems,
                metrics,
            );

            return envelope('forecast_completion', start, {
                remainingItems: forecast.remainingItems,
                estimatedSprints: forecast.estimatedSprints,
                estimatedCompletionDate:
                    forecast.estimatedCompletionDate,
                confidence: forecast.confidence,
                scenarioBest: forecast.scenarioBest,
                scenarioWorst: forecast.scenarioWorst,
                velocityUsed: metrics.averageVelocity,
                sprintsAnalysed: metrics.sprints.length,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('forecast_completion', start, null, [
                message,
            ]);
        }
    },
};

// ---------------------------------------------------------------------------
// record_sprint
// ---------------------------------------------------------------------------

/**
 * Record a sprint snapshot from the current PLAN.json state.
 */
const recordSprintTool: McpToolDefinition = {
    name: 'record_sprint',
    description:
        'Record a sprint snapshot by scanning items tagged with sprint:<N> in ' +
        'PLAN.json. Captures planned/completed counts and story points. ' +
        'Overwrites any existing snapshot for the same sprint number.',
    inputSchema: {
        type: 'object',
        properties: {
            sprint: {
                type: 'number',
                description: 'Sprint number to record (e.g. 1, 2, 3)',
            },
        },
        required: ['sprint'],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();
        const errors: string[] = [];

        const sprint = requireNumber(args, 'sprint', errors);
        if (errors.length > 0) {
            return envelope('record_sprint', start, null, errors);
        }

        try {
            const engine = VelocityEngine.getInstance();
            const snapshot = await engine.recordCurrentSprint(sprint!);

            return envelope('record_sprint', start, {
                recorded: true,
                sprint: snapshot.sprint,
                startDate: snapshot.startDate,
                endDate: snapshot.endDate,
                itemsPlanned: snapshot.itemsPlanned,
                itemsCompleted: snapshot.itemsCompleted,
                storyPointsPlanned: snapshot.storyPointsPlanned,
                storyPointsCompleted: snapshot.storyPointsCompleted,
                itemCount: snapshot.itemIds.length,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('record_sprint', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all velocity MCP tool definitions for registration in mcpServer.
 */
export function getVelocityTools(): McpToolDefinition[] {
    return [
        getVelocityMetricsTool,
        getBurndownTool,
        forecastCompletionTool,
        recordSprintTool,
    ];
}
