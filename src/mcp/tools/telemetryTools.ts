/**
 * Telemetry MCP Tools
 *
 * Exposes workspace telemetry data as MCP tool definitions for use by
 * AI agents and the MCP bridge.
 *
 * Part of AICC-0138: Telemetry dashboard tab & MCP resource
 *   - AICC-0377: Build MCP resource for telemetry data
 */

import type { PlanningManager } from '../../planning/planningManager';
import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { TelemetryCollector } from '../../services/telemetryCollector';

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
): number | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    return typeof val === 'number' ? val : undefined;
}

// ---------------------------------------------------------------------------
// get_telemetry_summary
// ---------------------------------------------------------------------------

/**
 * Get aggregated telemetry dashboard data for a configurable time window.
 */
const getTelemetrySummaryTool: McpToolDefinition = {
    name: 'get_telemetry_summary',
    description:
        'Get aggregated workspace telemetry dashboard data including summary statistics, ' +
        'daily trends, top commands, and success rates. All data is local-only.',
    inputSchema: {
        type: 'object',
        properties: {
            days: {
                type: 'number',
                description:
                    'Number of days to include in the summary (default: 7)',
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
            const collector = TelemetryCollector.getInstance();

            if (!collector.isEnabled()) {
                return envelope('get_telemetry_summary', start, null, [
                    'Telemetry is disabled. Enable it via the "aicc.telemetry.enabled" setting.',
                ]);
            }

            const days = optionalNumber(args, 'days') ?? 7;
            const data = collector.getDashboardData(days);

            return envelope('get_telemetry_summary', start, {
                enabled: true,
                config: collector.getConfig(),
                summary: data.summary,
                daily: data.daily,
                topCommands: data.topCommands,
                recentEventCount: data.recentEvents.length,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_telemetry_summary', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// get_telemetry_events
// ---------------------------------------------------------------------------

/**
 * Query recent telemetry events with optional type and name filters.
 */
const getTelemetryEventsTool: McpToolDefinition = {
    name: 'get_telemetry_events',
    description:
        'Query recent workspace telemetry events with optional filters by event type ' +
        '(command, tool, skill, mcp, pipeline, query) and/or name. Returns matching events ' +
        'sorted by most recent first.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: [
                    'command',
                    'tool',
                    'skill',
                    'mcp',
                    'pipeline',
                    'query',
                ],
                description: 'Filter events by type',
            },
            name: {
                type: 'string',
                description:
                    'Filter events by name (exact match or substring)',
            },
            days: {
                type: 'number',
                description:
                    'Number of days to look back (default: 7)',
            },
            limit: {
                type: 'number',
                description:
                    'Maximum number of events to return (default: 50)',
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
            const collector = TelemetryCollector.getInstance();

            if (!collector.isEnabled()) {
                return envelope('get_telemetry_events', start, null, [
                    'Telemetry is disabled. Enable it via the "aicc.telemetry.enabled" setting.',
                ]);
            }

            const typeFilter = optionalString(args, 'type');
            const nameFilter = optionalString(args, 'name');
            const days = optionalNumber(args, 'days') ?? 7;
            const limit = optionalNumber(args, 'limit') ?? 50;

            const dashboardData = collector.getDashboardData(days);
            let events = dashboardData.recentEvents;

            // Apply type filter
            if (typeFilter) {
                events = events.filter((e) => e.type === typeFilter);
            }

            // Apply name filter (substring match)
            if (nameFilter) {
                const lowerFilter = nameFilter.toLowerCase();
                events = events.filter((e) =>
                    e.name.toLowerCase().includes(lowerFilter),
                );
            }

            // Apply limit
            events = events.slice(0, limit);

            return envelope('get_telemetry_events', start, {
                count: events.length,
                filters: {
                    type: typeFilter ?? null,
                    name: nameFilter ?? null,
                    days,
                    limit,
                },
                events: events.map((e) => ({
                    id: e.id,
                    type: e.type,
                    name: e.name,
                    timestamp: e.timestamp,
                    duration: e.duration,
                    success: e.success,
                    metadata: e.metadata,
                })),
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_telemetry_events', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// track_event
// ---------------------------------------------------------------------------

/**
 * Manually track a telemetry event (for external tool reporting).
 */
const trackEventTool: McpToolDefinition = {
    name: 'track_event',
    description:
        'Manually record a telemetry event for external tool reporting. ' +
        'Requires telemetry to be enabled via the "aicc.telemetry.enabled" setting.',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                enum: [
                    'command',
                    'tool',
                    'skill',
                    'mcp',
                    'pipeline',
                    'query',
                ],
                description: 'The type/category of the event',
            },
            name: {
                type: 'string',
                description: 'The name of the command, tool, or skill',
            },
            duration: {
                type: 'number',
                description: 'Execution duration in milliseconds',
            },
            success: {
                type: 'boolean',
                description:
                    'Whether the invocation succeeded (default: true)',
            },
            metadata: {
                type: 'object',
                description: 'Optional additional context as key-value pairs',
                additionalProperties: true,
            },
        },
        required: ['type', 'name'],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();
        const errors: string[] = [];

        const type = optionalString(args, 'type');
        const name = optionalString(args, 'name');

        if (!type) {
            errors.push('Missing required field: type');
        }
        if (!name) {
            errors.push('Missing required field: name');
        }
        if (errors.length > 0) {
            return envelope('track_event', start, null, errors);
        }

        try {
            const collector = TelemetryCollector.getInstance();

            if (!collector.isEnabled()) {
                return envelope('track_event', start, null, [
                    'Telemetry is disabled. Enable it via the "aicc.telemetry.enabled" setting.',
                ]);
            }

            const validTypes = [
                'command',
                'tool',
                'skill',
                'mcp',
                'pipeline',
                'query',
            ];
            if (!validTypes.includes(type!)) {
                return envelope('track_event', start, null, [
                    `Invalid event type "${type}". Must be one of: ${validTypes.join(', ')}`,
                ]);
            }

            const duration = optionalNumber(args, 'duration');
            const success =
                typeof args['success'] === 'boolean'
                    ? args['success']
                    : true;
            const metadata =
                args['metadata'] &&
                typeof args['metadata'] === 'object' &&
                !Array.isArray(args['metadata'])
                    ? (args['metadata'] as Record<string, unknown>)
                    : undefined;

            collector.track({
                type: type as 'command' | 'tool' | 'skill' | 'mcp' | 'pipeline' | 'query',
                name: name!,
                duration,
                success,
                metadata,
            });

            return envelope('track_event', start, {
                tracked: true,
                type,
                name,
                duration,
                success,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('track_event', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all telemetry MCP tool definitions for registration in mcpServer.
 */
export function getTelemetryTools(): McpToolDefinition[] {
    return [
        getTelemetrySummaryTool,
        getTelemetryEventsTool,
        trackEventTool,
    ];
}
