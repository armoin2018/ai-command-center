/**
 * Pipeline MCP Tools
 *
 * Exposes pipeline operations as MCP tool definitions for use by
 * AI agents and the MCP bridge.
 *
 * Part of AICC-0132: Pipeline scheduling, events & MCP tool
 *   - AICC-0364: Build MCP tool for pipeline execution
 */

import type { PlanningManager } from '../../planning/planningManager';
import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { PipelineEngine } from '../../services/pipelineEngine';

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

function optionalObject(
    args: Record<string, unknown>,
    field: string,
): Record<string, unknown> | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    return typeof val === 'object' && !Array.isArray(val)
        ? (val as Record<string, unknown>)
        : undefined;
}

// ---------------------------------------------------------------------------
// AICC-0364 — run_pipeline
// ---------------------------------------------------------------------------

/**
 * Execute a named pipeline with optional runtime variables.
 */
const runPipelineTool: McpToolDefinition = {
    name: 'run_pipeline',
    description:
        'Execute a named skill pipeline with optional runtime variables. ' +
        'Returns the pipeline run result including status and step outcomes.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description:
                    'The name of the pipeline to execute (must be loaded from .github/ai-ley/pipelines/)',
            },
            variables: {
                type: 'object',
                description:
                    'Optional runtime variable overrides as key-value pairs',
                additionalProperties: true,
            },
        },
        required: ['name'],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();
        const errors: string[] = [];

        const name = requireString(args, 'name', errors);
        if (errors.length > 0 || !name) {
            return envelope('run_pipeline', start, null, errors);
        }

        const variables = optionalObject(args, 'variables');

        try {
            const engine = PipelineEngine.getInstance();

            // Ensure pipelines are loaded
            if (!engine.getPipeline(name)) {
                await engine.loadAllPipelines();
            }

            if (!engine.getPipeline(name)) {
                return envelope('run_pipeline', start, null, [
                    `Pipeline "${name}" not found. Available pipelines: ${engine
                        .listPipelines()
                        .map((p) => p.name)
                        .join(', ') || '(none)'}`,
                ]);
            }

            const result = await engine.executePipeline(
                name,
                variables,
                'mcp-tool',
            );

            return envelope('run_pipeline', start, {
                runId: result.runId,
                pipelineId: result.pipelineId,
                status: result.status,
                startedAt: result.startedAt,
                completedAt: result.completedAt,
                stepCount: result.stepResults.length,
                stepResults: result.stepResults.map((sr) => ({
                    stepId: sr.stepId,
                    status: sr.status,
                    duration: sr.duration,
                    error: sr.error,
                })),
                variables: result.variables,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('run_pipeline', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// list_pipelines
// ---------------------------------------------------------------------------

/**
 * List all available pipeline definitions.
 */
const listPipelinesTool: McpToolDefinition = {
    name: 'list_pipelines',
    description:
        'List all available skill pipelines from .github/ai-ley/pipelines/. ' +
        'Returns name, description, step count, and trigger information for each pipeline.',
    inputSchema: {
        type: 'object',
        properties: {
            reload: {
                type: 'boolean',
                description:
                    'If true, re-scan the pipeline directory before listing (default: false)',
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
            const engine = PipelineEngine.getInstance();

            if (args['reload'] === true) {
                await engine.loadAllPipelines();
            }

            // If no pipelines loaded yet, try loading
            if (engine.listPipelines().length === 0) {
                await engine.loadAllPipelines();
            }

            const pipelines = engine.listPipelines().map((p) => ({
                name: p.name,
                description: p.description ?? '',
                version: p.version ?? '',
                stepCount: p.steps.length,
                steps: p.steps.map((s) => ({
                    id: s.id,
                    name: s.name,
                    skill: s.skill,
                    action: s.action,
                })),
                triggers: p.triggers?.map((t) => ({
                    type: t.type,
                    config: t.config,
                })) ?? [],
                variableCount: p.variables?.length ?? 0,
            }));

            return envelope('list_pipelines', start, {
                count: pipelines.length,
                pipelines,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('list_pipelines', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// get_pipeline_run
// ---------------------------------------------------------------------------

/**
 * Get the status and result of a specific pipeline run.
 */
const getPipelineRunTool: McpToolDefinition = {
    name: 'get_pipeline_run',
    description:
        'Get the status and result of a specific pipeline run by run ID. ' +
        'Can also list recent runs for a given pipeline.',
    inputSchema: {
        type: 'object',
        properties: {
            runId: {
                type: 'string',
                description: 'The unique run ID to retrieve',
            },
            pipelineId: {
                type: 'string',
                description:
                    'If provided without runId, lists recent runs for this pipeline',
            },
            limit: {
                type: 'number',
                description:
                    'Maximum number of runs to return when listing (default: 10)',
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
            const engine = PipelineEngine.getInstance();

            const runId = optionalString(args, 'runId');
            const pipelineId = optionalString(args, 'pipelineId');
            const limit =
                typeof args['limit'] === 'number' ? args['limit'] : 10;

            // Single run lookup
            if (runId) {
                const run = engine.getPipelineRun(runId);
                if (!run) {
                    return envelope('get_pipeline_run', start, null, [
                        `Pipeline run "${runId}" not found`,
                    ]);
                }
                return envelope('get_pipeline_run', start, run);
            }

            // List runs for a pipeline
            const runs = engine.listPipelineRuns(pipelineId).slice(0, limit);
            return envelope('get_pipeline_run', start, {
                count: runs.length,
                runs: runs.map((r) => ({
                    runId: r.runId,
                    pipelineId: r.pipelineId,
                    status: r.status,
                    startedAt: r.startedAt,
                    completedAt: r.completedAt,
                    triggeredBy: r.triggeredBy,
                    stepCount: r.stepResults.length,
                })),
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_pipeline_run', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// get_pipeline_definition
// ---------------------------------------------------------------------------

/**
 * Get the full definition of a named pipeline.
 */
const getPipelineDefinitionTool: McpToolDefinition = {
    name: 'get_pipeline_definition',
    description:
        'Get the full YAML definition of a named pipeline, including steps, ' +
        'triggers, variables, and conditions.',
    inputSchema: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'The name of the pipeline to retrieve',
            },
        },
        required: ['name'],
    },
    handler: async (
        args: Record<string, unknown>,
        _planningManager: PlanningManager,
    ): Promise<McpToolResult> => {
        const start = Date.now();
        const errors: string[] = [];

        const name = requireString(args, 'name', errors);
        if (errors.length > 0 || !name) {
            return envelope('get_pipeline_definition', start, null, errors);
        }

        try {
            const engine = PipelineEngine.getInstance();

            // Ensure pipelines are loaded
            if (!engine.getPipeline(name)) {
                await engine.loadAllPipelines();
            }

            const pipeline = engine.getPipeline(name);
            if (!pipeline) {
                return envelope('get_pipeline_definition', start, null, [
                    `Pipeline "${name}" not found. Available: ${engine
                        .listPipelines()
                        .map((p) => p.name)
                        .join(', ') || '(none)'}`,
                ]);
            }

            return envelope('get_pipeline_definition', start, pipeline);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_pipeline_definition', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all pipeline MCP tool definitions for registration in mcpServer.
 */
export function getPipelineTools(): McpToolDefinition[] {
    return [
        runPipelineTool,
        listPipelinesTool,
        getPipelineRunTool,
        getPipelineDefinitionTool,
    ];
}
