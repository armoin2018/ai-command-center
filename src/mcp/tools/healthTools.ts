/**
 * Health MCP Tools
 *
 * Exposes skill health monitoring data as MCP tool definitions for use
 * by AI agents and the MCP bridge.
 *
 * Part of AICC-0145: Skill Health Monitor
 *   - AICC-0397: Create Orchestrator health API endpoint
 */

import type { PlanningManager } from '../../planning/planningManager';
import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { SkillHealthMonitor } from '../../services/skillHealthMonitor';

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

// ---------------------------------------------------------------------------
// get_skill_health
// ---------------------------------------------------------------------------

/**
 * Get health state for one or all skills.
 */
const getSkillHealthTool: McpToolDefinition = {
    name: 'get_skill_health',
    description:
        'Get the current health state of one or all monitored skills. ' +
        'Returns status, latency, credential validity, rate limits, and ' +
        'error information.',
    inputSchema: {
        type: 'object',
        properties: {
            skillName: {
                type: 'string',
                description:
                    'Name of a specific skill to check. Omit to get all skills.',
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
            const monitor = SkillHealthMonitor.getInstance();
            const cfg = monitor.getConfig();

            if (!cfg.enabled) {
                return envelope('get_skill_health', start, null, [
                    'Skill health monitoring is disabled. Enable it via "aicc.skillHealth.enabled".',
                ]);
            }

            const skillName = optionalString(args, 'skillName');

            if (skillName) {
                // Single skill
                const state = monitor.getHealthState(skillName);
                if (!state) {
                    return envelope('get_skill_health', start, null, [
                        `Skill '${skillName}' is not registered for health monitoring.`,
                    ]);
                }

                return envelope('get_skill_health', start, {
                    skill: {
                        name: state.skillName,
                        status: state.status,
                        latencyMs: state.latencyMs,
                        credentialValid: state.credentialValid,
                        consecutiveFailures: state.consecutiveFailures,
                        rateLimitRemaining: state.rateLimitRemaining ?? null,
                        rateLimitReset: state.rateLimitReset ?? null,
                        lastCheck: state.lastCheck || null,
                        lastHealthy: state.lastHealthy || null,
                        errorMessage: state.errorMessage ?? null,
                    },
                });
            }

            // All skills
            const allStates = monitor.getAllHealthStates();
            const skills = Array.from(allStates.values()).map((s) => ({
                name: s.skillName,
                status: s.status,
                latencyMs: s.latencyMs,
                credentialValid: s.credentialValid,
                consecutiveFailures: s.consecutiveFailures,
                rateLimitRemaining: s.rateLimitRemaining ?? null,
                lastCheck: s.lastCheck || null,
                errorMessage: s.errorMessage ?? null,
            }));

            return envelope('get_skill_health', start, {
                count: skills.length,
                skills,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_skill_health', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// probe_skill
// ---------------------------------------------------------------------------

/**
 * Manually trigger a health probe for a specific skill.
 */
const probeSkillTool: McpToolDefinition = {
    name: 'probe_skill',
    description:
        'Manually trigger a health probe for a specific skill. Returns ' +
        'reachability, latency, status code, rate limit info, and credential ' +
        'validity. Updates the skill\'s health state.',
    inputSchema: {
        type: 'object',
        properties: {
            skillName: {
                type: 'string',
                description: 'Name of the skill to probe',
            },
        },
        required: ['skillName'],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();

        const skillName = optionalString(args, 'skillName');
        if (!skillName) {
            return envelope('probe_skill', start, null, [
                'Missing required field: skillName',
            ]);
        }

        try {
            const monitor = SkillHealthMonitor.getInstance();

            const result = await monitor.probeSkill(skillName);

            // Update state machine with probe result
            const updatedState = monitor.updateHealthState(
                skillName,
                result,
            );

            return envelope('probe_skill', start, {
                probeResult: {
                    skillName: result.skillName,
                    reachable: result.reachable,
                    latencyMs: result.latencyMs,
                    statusCode: result.statusCode ?? null,
                    credentialValid: result.credentialValid,
                    rateLimitRemaining:
                        result.rateLimitInfo?.remaining ?? null,
                    rateLimitLimit:
                        result.rateLimitInfo?.limit ?? null,
                    rateLimitReset:
                        result.rateLimitInfo?.resetAt ?? null,
                    error: result.error ?? null,
                },
                currentState: {
                    status: updatedState.status,
                    consecutiveFailures:
                        updatedState.consecutiveFailures,
                    lastCheck: updatedState.lastCheck,
                    lastHealthy: updatedState.lastHealthy || null,
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('probe_skill', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// get_health_summary
// ---------------------------------------------------------------------------

/**
 * Get summary counts of skill health statuses.
 */
const getHealthSummaryTool: McpToolDefinition = {
    name: 'get_health_summary',
    description:
        'Get a summary of skill health across all monitored skills. Returns ' +
        'counts of healthy, degraded, unreachable, and unknown skills.',
    inputSchema: {
        type: 'object',
        properties: {},
        required: [],
    },
    handler: async (
        _args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();

        try {
            const monitor = SkillHealthMonitor.getInstance();
            const cfg = monitor.getConfig();

            if (!cfg.enabled) {
                return envelope('get_health_summary', start, null, [
                    'Skill health monitoring is disabled. Enable it via "aicc.skillHealth.enabled".',
                ]);
            }

            const summary = monitor.getHealthSummary();

            return envelope('get_health_summary', start, {
                total: summary.total,
                healthy: summary.healthy,
                degraded: summary.degraded,
                unreachable: summary.unreachable,
                unknown: summary.unknown,
                healthPercentage:
                    summary.total > 0
                        ? Math.round(
                              (summary.healthy / summary.total) * 100,
                          )
                        : 0,
                config: {
                    enabled: cfg.enabled,
                    intervalMs: cfg.intervalMs,
                    timeoutMs: cfg.timeoutMs,
                    degradedThreshold: cfg.degradedThreshold,
                    unreachableThreshold: cfg.unreachableThreshold,
                },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_health_summary', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all health MCP tool definitions for registration in mcpServer.
 */
export function getHealthTools(): McpToolDefinition[] {
    return [
        getSkillHealthTool,
        probeSkillTool,
        getHealthSummaryTool,
    ];
}
