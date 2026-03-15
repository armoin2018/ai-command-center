/**
 * Pipeline Engine Service
 *
 * Declarative multi-skill workflow engine with YAML definitions.
 * Parses, validates, and executes pipeline definitions from
 * `.github/ai-ley/pipelines/*.yaml`.
 *
 * Part of AICC-0130: Skill Pipelines
 *   - AICC-0131: Pipeline definition & execution engine
 *   - AICC-0358: Implement YAML pipeline parser
 *   - AICC-0359: Build pipeline execution engine
 *   - AICC-0360: Add variable interpolation in pipeline steps
 *   - AICC-0361: Implement conditional step logic
 *   - AICC-0132: Pipeline scheduling, events & MCP tool
 *   - AICC-0362: Wire pipeline execution to scheduler as action
 *   - AICC-0363: Implement pipeline event emissions
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { Logger } from '../logger';
import { EventBus } from './eventBus';
import { SkillMcpFactory } from './skillMcpFactory';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A trigger that can automatically start a pipeline.
 */
export interface PipelineTrigger {
    /** Kind of trigger */
    type: 'manual' | 'schedule' | 'event' | 'fileChange';
    /** Trigger-specific configuration (e.g. cron expression, channel name, glob) */
    config: Record<string, unknown>;
}

/**
 * A variable declaration for pipeline input.
 */
export interface PipelineVariable {
    /** Variable name */
    name: string;
    /** Expected data type */
    type: 'string' | 'number' | 'boolean';
    /** Default value when not provided at runtime */
    default?: unknown;
    /** Whether the variable must be supplied */
    required?: boolean;
    /** Human-readable description */
    description?: string;
}

/**
 * A single step within a pipeline.
 */
export interface PipelineStep {
    /** Unique step identifier within the pipeline */
    id: string;
    /** Human-readable step name */
    name: string;
    /** Skill identifier to invoke */
    skill: string;
    /** Action name on the skill */
    action: string;
    /** Parameters passed to the action */
    params?: Record<string, unknown>;
    /** Condition expression — step is skipped when it evaluates to false */
    condition?: string;
    /** Error handling strategy */
    onError?: 'stop' | 'continue' | 'retry';
    /** Number of retry attempts (only used when onError is 'retry') */
    retryCount?: number;
    /** Maximum execution time in milliseconds */
    timeout?: number;
    /** Variable name to store this step's output in the context */
    output?: string;
}

/**
 * Complete pipeline definition parsed from YAML.
 */
export interface PipelineDefinition {
    /** Pipeline name (unique identifier) */
    name: string;
    /** Optional human-readable description */
    description?: string;
    /** Semantic version string */
    version?: string;
    /** Triggers that can start this pipeline */
    triggers?: PipelineTrigger[];
    /** Input variable declarations */
    variables?: PipelineVariable[];
    /** Ordered list of steps to execute */
    steps: PipelineStep[];
}

/**
 * Result of a single step execution.
 */
export interface StepResult {
    /** Step ID that was executed */
    stepId: string;
    /** Outcome of the step */
    status: 'success' | 'skipped' | 'failed';
    /** Step output data */
    output?: unknown;
    /** Error message if the step failed */
    error?: string;
    /** Execution duration in milliseconds */
    duration: number;
}

/**
 * Summary returned after a full pipeline run.
 */
export interface PipelineRunResult {
    /** Pipeline name */
    pipelineId: string;
    /** Unique run identifier */
    runId: string;
    /** Overall outcome */
    status: 'success' | 'partial' | 'failed';
    /** ISO timestamp when the run started */
    startedAt: string;
    /** ISO timestamp when the run completed */
    completedAt: string;
    /** Results for each step */
    stepResults: StepResult[];
    /** Final variable state after all steps */
    variables: Record<string, unknown>;
}

/**
 * Internal tracking record for a pipeline run.
 */
export interface PipelineRun {
    /** Unique run identifier */
    runId: string;
    /** Pipeline name */
    pipelineId: string;
    /** Current status */
    status: 'running' | 'success' | 'partial' | 'failed';
    /** ISO timestamp when the run started */
    startedAt: string;
    /** ISO timestamp when the run completed (undefined while running) */
    completedAt?: string;
    /** Results for each completed step */
    stepResults: StepResult[];
    /** Variable state */
    variables: Record<string, unknown>;
    /** What triggered this run */
    triggeredBy: string;
}

/**
 * Internal execution context threaded through steps.
 */
interface PipelineContext {
    /** Current variable values */
    variables: Record<string, unknown>;
    /** Accumulated step results */
    stepResults: StepResult[];
    /** The pipeline run record */
    run: PipelineRun;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Directory where pipeline YAML files are stored, relative to workspace root. */
const PIPELINE_DIR = '.github/ai-ley/pipelines';

/** Maximum number of retained pipeline runs. */
const MAX_RUN_HISTORY = 100;

// ─── PipelineEngine ──────────────────────────────────────────────────

/**
 * Singleton engine that loads, validates, and executes declarative
 * YAML pipelines composed of skill action invocations.
 *
 * @example
 * ```ts
 * const engine = PipelineEngine.getInstance();
 * await engine.loadAllPipelines();
 * const result = await engine.executePipeline('deploy-docs', { branch: 'main' });
 * ```
 */
export class PipelineEngine {
    // ── Singleton ────────────────────────────────────────────────

    private static instance: PipelineEngine | undefined;

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): PipelineEngine {
        if (!PipelineEngine.instance) {
            PipelineEngine.instance = new PipelineEngine();
        }
        return PipelineEngine.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        PipelineEngine.instance = undefined;
    }

    // ── State ────────────────────────────────────────────────────

    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    /** name → PipelineDefinition */
    private readonly pipelines = new Map<string, PipelineDefinition>();

    /** runId → PipelineRun */
    private readonly pipelineRuns = new Map<string, PipelineRun>();

    /** Monotonic counter for generating run IDs */
    private runCounter = 0;

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    // ── Pipeline Loading (AICC-0358) ─────────────────────────────

    /**
     * Load and validate a single pipeline YAML file.
     *
     * @param filePath Absolute path to the `.yaml` file.
     * @returns Parsed and validated pipeline definition.
     * @throws If the file cannot be read or fails validation.
     */
    public async loadPipeline(filePath: string): Promise<PipelineDefinition> {
        this.logger.debug(`Loading pipeline from: ${filePath}`, {
            component: 'PipelineEngine',
        });

        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const parsed = yaml.load(raw) as Record<string, unknown>;

        if (!parsed || typeof parsed !== 'object') {
            throw new Error(`Invalid pipeline YAML in ${filePath}: expected an object`);
        }

        const pipeline = this.validateDefinition(parsed, filePath);
        this.pipelines.set(pipeline.name, pipeline);

        this.logger.info(
            `Loaded pipeline "${pipeline.name}" with ${pipeline.steps.length} step(s)`,
            { component: 'PipelineEngine' },
        );

        return pipeline;
    }

    /**
     * Scan the pipeline directory and load all `.yaml` files.
     *
     * @returns Map of pipeline name → definition for every successfully loaded pipeline.
     */
    public async loadAllPipelines(): Promise<Map<string, PipelineDefinition>> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folder open — cannot load pipelines', {
                component: 'PipelineEngine',
            });
            return this.pipelines;
        }

        const root = workspaceFolders[0].uri.fsPath;
        const pipelineDir = path.join(root, PIPELINE_DIR);

        try {
            await fs.promises.access(pipelineDir, fs.constants.R_OK);
        } catch {
            this.logger.debug(
                `Pipeline directory does not exist: ${pipelineDir}`,
                { component: 'PipelineEngine' },
            );
            return this.pipelines;
        }

        const entries = await fs.promises.readdir(pipelineDir, {
            withFileTypes: true,
        });

        const yamlFiles = entries.filter(
            (e) =>
                e.isFile() &&
                (e.name.endsWith('.yaml') || e.name.endsWith('.yml')),
        );

        let loaded = 0;
        for (const entry of yamlFiles) {
            const filePath = path.join(pipelineDir, entry.name);
            try {
                await this.loadPipeline(filePath);
                loaded++;
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : String(err);
                this.logger.error(
                    `Failed to load pipeline from ${entry.name}: ${message}`,
                    { component: 'PipelineEngine' },
                );
            }
        }

        this.logger.info(
            `Loaded ${loaded}/${yamlFiles.length} pipeline(s) from ${PIPELINE_DIR}`,
            { component: 'PipelineEngine' },
        );

        return this.pipelines;
    }

    /**
     * Get a loaded pipeline definition by name.
     */
    public getPipeline(name: string): PipelineDefinition | undefined {
        return this.pipelines.get(name);
    }

    /**
     * List all loaded pipeline definitions.
     */
    public listPipelines(): PipelineDefinition[] {
        return Array.from(this.pipelines.values());
    }

    // ── Pipeline Execution (AICC-0359) ───────────────────────────

    /**
     * Execute a loaded pipeline by name, optionally providing runtime variables.
     *
     * Emits `system.activated`-style events on the EventBus at pipeline start,
     * step completion, and pipeline completion (using `skill.execution.*` channels).
     *
     * @param name   Pipeline name (must have been loaded already).
     * @param variables  Runtime variable overrides.
     * @param triggeredBy  Identifier for the trigger source (default: 'manual').
     * @returns Summary result of the entire pipeline run.
     */
    public async executePipeline(
        name: string,
        variables?: Record<string, unknown>,
        triggeredBy: string = 'manual',
    ): Promise<PipelineRunResult> {
        const pipeline = this.pipelines.get(name);
        if (!pipeline) {
            throw new Error(`Pipeline not found: "${name}". Has it been loaded?`);
        }

        const runId = this.generateRunId(name);
        const startedAt = new Date().toISOString();

        // Merge declared defaults with runtime overrides
        const mergedVars = this.mergeVariables(pipeline, variables);
        this.validateRequiredVariables(pipeline, mergedVars);

        const run: PipelineRun = {
            runId,
            pipelineId: name,
            status: 'running',
            startedAt,
            stepResults: [],
            variables: mergedVars,
            triggeredBy,
        };

        this.pipelineRuns.set(runId, run);
        this.pruneRunHistory();

        // Emit pipeline start (AICC-0363)
        await this.emitPipelineEvent('pipeline.started', {
            pipelineId: name,
            runId,
            triggeredBy,
            variables: mergedVars,
        });

        this.logger.info(
            `Starting pipeline "${name}" run ${runId} (${pipeline.steps.length} steps)`,
            { component: 'PipelineEngine', runId },
        );

        const context: PipelineContext = {
            variables: mergedVars,
            stepResults: [],
            run,
        };

        let hasFailure = false;

        for (const step of pipeline.steps) {
            const stepResult = await this.executeStep(step, context);
            context.stepResults.push(stepResult);
            run.stepResults.push(stepResult);

            if (stepResult.status === 'failed') {
                hasFailure = true;

                // Emit step failure event
                await this.emitPipelineEvent('pipeline.step.failed', {
                    pipelineId: name,
                    runId,
                    stepId: step.id,
                    error: stepResult.error,
                });

                const errorStrategy = step.onError ?? 'stop';
                if (errorStrategy === 'stop') {
                    this.logger.warn(
                        `Pipeline "${name}" stopped at step "${step.id}" due to error`,
                        { component: 'PipelineEngine', runId },
                    );
                    break;
                }
                // 'continue' — proceed to next step
            }

            // Store output variable if defined
            if (step.output && stepResult.status === 'success') {
                context.variables[step.output] = stepResult.output;
                run.variables[step.output] = stepResult.output;
            }
        }

        // Determine final status
        const completedAt = new Date().toISOString();
        const allSuccess = context.stepResults.every(
            (r) => r.status === 'success' || r.status === 'skipped',
        );
        const allFailed = context.stepResults.every(
            (r) => r.status === 'failed',
        );

        let finalStatus: 'success' | 'partial' | 'failed';
        if (allSuccess) {
            finalStatus = 'success';
        } else if (allFailed) {
            finalStatus = 'failed';
        } else {
            finalStatus = hasFailure ? 'partial' : 'success';
        }

        run.status = finalStatus;
        run.completedAt = completedAt;

        const result: PipelineRunResult = {
            pipelineId: name,
            runId,
            status: finalStatus,
            startedAt,
            completedAt,
            stepResults: context.stepResults,
            variables: context.variables,
        };

        // Emit pipeline completed (AICC-0363)
        await this.emitPipelineEvent('pipeline.completed', {
            pipelineId: name,
            runId,
            status: finalStatus,
            duration: Date.now() - new Date(startedAt).getTime(),
            stepCount: context.stepResults.length,
        });

        this.logger.info(
            `Pipeline "${name}" run ${runId} completed with status "${finalStatus}"`,
            { component: 'PipelineEngine', runId },
        );

        return result;
    }

    /**
     * Execute a single pipeline step within the given context.
     *
     * Handles condition evaluation, timeout, retries, and error strategies.
     *
     * @param step    The step definition.
     * @param context The current pipeline execution context.
     * @returns The result of executing (or skipping) the step.
     */
    public async executeStep(
        step: PipelineStep,
        context: PipelineContext,
    ): Promise<StepResult> {
        const stepStart = Date.now();

        // ── Condition evaluation (AICC-0361) ─────────────────────
        if (step.condition) {
            const conditionMet = this.evaluateCondition(
                step.condition,
                context,
            );
            if (!conditionMet) {
                this.logger.debug(
                    `Skipping step "${step.id}" — condition not met: ${step.condition}`,
                    { component: 'PipelineEngine' },
                );
                return {
                    stepId: step.id,
                    status: 'skipped',
                    duration: Date.now() - stepStart,
                };
            }
        }

        // ── Interpolate params (AICC-0360) ───────────────────────
        const interpolatedParams = step.params
            ? (this.interpolateVariables(
                  step.params,
                  context.variables,
              ) as Record<string, unknown>)
            : {};

        // ── Execute with retries ─────────────────────────────────
        const maxAttempts =
            step.onError === 'retry' ? (step.retryCount ?? 3) : 1;

        let lastError: string | undefined;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                this.logger.debug(
                    `Executing step "${step.id}" (attempt ${attempt}/${maxAttempts})`,
                    { component: 'PipelineEngine' },
                );

                const output = await this.invokeSkillAction(
                    step.skill,
                    step.action,
                    interpolatedParams,
                    step.timeout,
                );

                // Emit step success event
                await this.emitPipelineEvent('pipeline.step.completed', {
                    pipelineId: context.run.pipelineId,
                    runId: context.run.runId,
                    stepId: step.id,
                    attempt,
                    duration: Date.now() - stepStart,
                });

                return {
                    stepId: step.id,
                    status: 'success',
                    output,
                    duration: Date.now() - stepStart,
                };
            } catch (err: unknown) {
                lastError =
                    err instanceof Error ? err.message : String(err);
                this.logger.warn(
                    `Step "${step.id}" attempt ${attempt} failed: ${lastError}`,
                    { component: 'PipelineEngine' },
                );

                // If more retries remain, wait briefly before retrying
                if (attempt < maxAttempts) {
                    await this.delay(1000 * attempt); // exponential-ish backoff
                }
            }
        }

        return {
            stepId: step.id,
            status: 'failed',
            error: lastError,
            duration: Date.now() - stepStart,
        };
    }

    // ── Variable Interpolation (AICC-0360) ───────────────────────

    /**
     * Recursively replace `${variableName}` patterns in a value tree.
     *
     * Supports strings, arrays, and objects. Non-string leaves are returned
     * unchanged. If a variable reference points to a non-string value the
     * entire token is replaced with the raw value (only when the whole
     * string is a single `${...}` reference).
     *
     * @param value     The value tree to interpolate.
     * @param variables Current variable map.
     * @returns A new value tree with variables replaced.
     */
    public interpolateVariables(
        value: unknown,
        variables: Record<string, unknown>,
    ): unknown {
        if (typeof value === 'string') {
            return this.interpolateString(value, variables);
        }

        if (Array.isArray(value)) {
            return value.map((item) =>
                this.interpolateVariables(item, variables),
            );
        }

        if (value !== null && typeof value === 'object') {
            const result: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(
                value as Record<string, unknown>,
            )) {
                result[key] = this.interpolateVariables(val, variables);
            }
            return result;
        }

        return value;
    }

    // ── Condition Evaluation (AICC-0361) ─────────────────────────

    /**
     * Evaluate a simple condition expression against the pipeline context.
     *
     * Supported operators: `==`, `!=`, `&&`, `||`.
     * Operands may be variable names (resolved from context), quoted strings,
     * numbers, or the boolean literals `true` / `false`.
     * Bare identifiers are resolved as variables; if a variable is undefined
     * it evaluates as falsy.
     *
     * Examples:
     * - `"status == 'success'"`
     * - `"count != 0"`
     * - `"enableDeploy && branch == 'main'"`
     * - `"skipTests || environment == 'dev'"`
     *
     * @param condition  Expression string.
     * @param context    Current pipeline context.
     * @returns `true` if the condition is met, `false` otherwise.
     */
    public evaluateCondition(
        condition: string,
        context: PipelineContext,
    ): boolean {
        try {
            const trimmed = condition.trim();
            if (!trimmed) {
                return true;
            }

            // Handle || (lowest precedence)
            const orParts = this.splitOnOperator(trimmed, '||');
            if (orParts.length > 1) {
                return orParts.some((part) =>
                    this.evaluateCondition(part, context),
                );
            }

            // Handle && (higher precedence than ||)
            const andParts = this.splitOnOperator(trimmed, '&&');
            if (andParts.length > 1) {
                return andParts.every((part) =>
                    this.evaluateCondition(part, context),
                );
            }

            // Handle != comparison
            if (trimmed.includes('!=')) {
                const [left, right] = trimmed.split('!=').map((s) => s.trim());
                const leftVal = this.resolveOperand(left, context.variables);
                const rightVal = this.resolveOperand(right, context.variables);
                return leftVal !== rightVal;
            }

            // Handle == comparison
            if (trimmed.includes('==')) {
                const [left, right] = trimmed.split('==').map((s) => s.trim());
                const leftVal = this.resolveOperand(left, context.variables);
                const rightVal = this.resolveOperand(right, context.variables);
                return leftVal === rightVal;
            }

            // Bare identifier — check truthiness
            const resolved = this.resolveOperand(trimmed, context.variables);
            return Boolean(resolved);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(
                `Condition evaluation failed for "${condition}": ${message}`,
                { component: 'PipelineEngine' },
            );
            return false;
        }
    }

    // ── Run History ──────────────────────────────────────────────

    /**
     * Get a pipeline run by its unique ID.
     */
    public getPipelineRun(runId: string): PipelineRun | undefined {
        return this.pipelineRuns.get(runId);
    }

    /**
     * List pipeline runs, optionally filtered by pipeline ID.
     *
     * @param pipelineId  If provided, only runs for this pipeline are returned.
     * @returns Array of pipeline runs, most recent first.
     */
    public listPipelineRuns(pipelineId?: string): PipelineRun[] {
        let runs = Array.from(this.pipelineRuns.values());

        if (pipelineId) {
            runs = runs.filter((r) => r.pipelineId === pipelineId);
        }

        // Sort most-recent first
        runs.sort(
            (a, b) =>
                new Date(b.startedAt).getTime() -
                new Date(a.startedAt).getTime(),
        );

        return runs;
    }

    // ── Scheduling Integration (AICC-0362) ───────────────────────

    /**
     * Register pipelines that have schedule triggers with the scheduler.
     *
     * Iterates all loaded pipelines, finds those with `type: 'schedule'`
     * triggers, and registers them as scheduler actions.
     */
    public registerScheduledPipelines(): void {
        for (const pipeline of this.pipelines.values()) {
            if (!pipeline.triggers) {
                continue;
            }

            for (const trigger of pipeline.triggers) {
                if (trigger.type !== 'schedule') {
                    continue;
                }

                const cronExpr = trigger.config['cron'] as string | undefined;
                const intervalMs = trigger.config['intervalMs'] as
                    | number
                    | undefined;

                if (!cronExpr && !intervalMs) {
                    this.logger.warn(
                        `Pipeline "${pipeline.name}" has a schedule trigger without cron or intervalMs`,
                        { component: 'PipelineEngine' },
                    );
                    continue;
                }

                this.logger.info(
                    `Registered scheduled pipeline "${pipeline.name}" ` +
                        (cronExpr
                            ? `(cron: ${cronExpr})`
                            : `(interval: ${intervalMs}ms)`),
                    { component: 'PipelineEngine' },
                );

                // Emit registration event
                this.emitPipelineEvent('pipeline.scheduled', {
                    pipelineId: pipeline.name,
                    scheduleType: cronExpr ? 'cron' : 'interval',
                    scheduleValue: cronExpr ?? String(intervalMs),
                }).catch(() => {
                    /* best-effort */
                });
            }
        }
    }

    /**
     * Register pipelines with event triggers on the EventBus.
     *
     * Subscribes to the specified event channel and executes the pipeline
     * when the event fires.
     */
    public registerEventTriggers(): void {
        for (const pipeline of this.pipelines.values()) {
            if (!pipeline.triggers) {
                continue;
            }

            for (const trigger of pipeline.triggers) {
                if (trigger.type !== 'event') {
                    continue;
                }

                const channel = trigger.config['channel'] as
                    | string
                    | undefined;
                if (!channel) {
                    this.logger.warn(
                        `Pipeline "${pipeline.name}" has an event trigger without a channel`,
                        { component: 'PipelineEngine' },
                    );
                    continue;
                }

                this.eventBus.subscribe(channel, async () => {
                    try {
                        await this.executePipeline(
                            pipeline.name,
                            undefined,
                            `event:${channel}`,
                        );
                    } catch (err: unknown) {
                        const message =
                            err instanceof Error
                                ? err.message
                                : String(err);
                        this.logger.error(
                            `Event-triggered pipeline "${pipeline.name}" failed: ${message}`,
                            { component: 'PipelineEngine' },
                        );
                    }
                });

                this.logger.info(
                    `Registered event trigger for pipeline "${pipeline.name}" on channel "${channel}"`,
                    { component: 'PipelineEngine' },
                );
            }
        }
    }

    // ── Private: YAML Validation ─────────────────────────────────

    /**
     * Validate and normalise a raw YAML object into a PipelineDefinition.
     */
    private validateDefinition(
        raw: Record<string, unknown>,
        filePath: string,
    ): PipelineDefinition {
        // Name is required
        if (!raw['name'] || typeof raw['name'] !== 'string') {
            throw new Error(
                `Pipeline in ${filePath} is missing a valid "name" field`,
            );
        }

        // Steps are required
        if (!Array.isArray(raw['steps']) || raw['steps'].length === 0) {
            throw new Error(
                `Pipeline "${raw['name']}" in ${filePath} must have at least one step`,
            );
        }

        const steps: PipelineStep[] = (raw['steps'] as unknown[]).map(
            (rawStep, idx) => this.validateStep(rawStep, idx, filePath),
        );

        const definition: PipelineDefinition = {
            name: raw['name'] as string,
            description: typeof raw['description'] === 'string'
                ? raw['description']
                : undefined,
            version: typeof raw['version'] === 'string'
                ? raw['version']
                : undefined,
            triggers: this.parseTriggers(raw['triggers']),
            variables: this.parseVariables(raw['variables']),
            steps,
        };

        return definition;
    }

    /**
     * Validate a single raw step object.
     */
    private validateStep(
        rawStep: unknown,
        index: number,
        filePath: string,
    ): PipelineStep {
        if (!rawStep || typeof rawStep !== 'object') {
            throw new Error(
                `Step at index ${index} in ${filePath} is not a valid object`,
            );
        }

        const s = rawStep as Record<string, unknown>;

        if (!s['id'] || typeof s['id'] !== 'string') {
            throw new Error(
                `Step at index ${index} in ${filePath} is missing a valid "id"`,
            );
        }
        if (!s['name'] || typeof s['name'] !== 'string') {
            throw new Error(
                `Step "${s['id']}" in ${filePath} is missing a valid "name"`,
            );
        }
        if (!s['skill'] || typeof s['skill'] !== 'string') {
            throw new Error(
                `Step "${s['id']}" in ${filePath} is missing a valid "skill"`,
            );
        }
        if (!s['action'] || typeof s['action'] !== 'string') {
            throw new Error(
                `Step "${s['id']}" in ${filePath} is missing a valid "action"`,
            );
        }

        const validOnError = ['stop', 'continue', 'retry'];
        const onError = typeof s['onError'] === 'string' &&
            validOnError.includes(s['onError'])
            ? (s['onError'] as 'stop' | 'continue' | 'retry')
            : undefined;

        return {
            id: s['id'] as string,
            name: s['name'] as string,
            skill: s['skill'] as string,
            action: s['action'] as string,
            params:
                s['params'] && typeof s['params'] === 'object'
                    ? (s['params'] as Record<string, unknown>)
                    : undefined,
            condition:
                typeof s['condition'] === 'string'
                    ? s['condition']
                    : undefined,
            onError,
            retryCount:
                typeof s['retryCount'] === 'number'
                    ? s['retryCount']
                    : undefined,
            timeout:
                typeof s['timeout'] === 'number' ? s['timeout'] : undefined,
            output:
                typeof s['output'] === 'string' ? s['output'] : undefined,
        };
    }

    /**
     * Parse optional triggers array from raw YAML.
     */
    private parseTriggers(
        raw: unknown,
    ): PipelineTrigger[] | undefined {
        if (!Array.isArray(raw)) {
            return undefined;
        }

        return raw
            .filter(
                (t: unknown) =>
                    t && typeof t === 'object' && typeof (t as any).type === 'string',
            )
            .map((t: any) => ({
                type: t.type as PipelineTrigger['type'],
                config:
                    t.config && typeof t.config === 'object'
                        ? (t.config as Record<string, unknown>)
                        : {},
            }));
    }

    /**
     * Parse optional variables array from raw YAML.
     */
    private parseVariables(
        raw: unknown,
    ): PipelineVariable[] | undefined {
        if (!Array.isArray(raw)) {
            return undefined;
        }

        return raw
            .filter(
                (v: unknown) =>
                    v && typeof v === 'object' && typeof (v as any).name === 'string',
            )
            .map((v: any) => ({
                name: v.name as string,
                type: (v.type as PipelineVariable['type']) ?? 'string',
                default: v.default,
                required: v.required === true,
                description:
                    typeof v.description === 'string'
                        ? v.description
                        : undefined,
            }));
    }

    // ── Private: Variable Handling ────────────────────────────────

    /**
     * Merge pipeline-declared variable defaults with runtime overrides.
     */
    private mergeVariables(
        pipeline: PipelineDefinition,
        overrides?: Record<string, unknown>,
    ): Record<string, unknown> {
        const merged: Record<string, unknown> = {};

        // Apply declared defaults
        if (pipeline.variables) {
            for (const v of pipeline.variables) {
                if (v.default !== undefined) {
                    merged[v.name] = v.default;
                }
            }
        }

        // Apply runtime overrides
        if (overrides) {
            Object.assign(merged, overrides);
        }

        return merged;
    }

    /**
     * Validate that all required variables have values.
     */
    private validateRequiredVariables(
        pipeline: PipelineDefinition,
        variables: Record<string, unknown>,
    ): void {
        if (!pipeline.variables) {
            return;
        }

        const missing = pipeline.variables
            .filter(
                (v) =>
                    v.required === true &&
                    (variables[v.name] === undefined ||
                        variables[v.name] === null),
            )
            .map((v) => v.name);

        if (missing.length > 0) {
            throw new Error(
                `Pipeline "${pipeline.name}" is missing required variables: ${missing.join(', ')}`,
            );
        }
    }

    /**
     * Interpolate a single string value, replacing `${varName}` tokens.
     */
    private interpolateString(
        str: string,
        variables: Record<string, unknown>,
    ): unknown {
        // If the entire string is a single ${...} reference, return raw value
        const fullMatch = str.match(/^\$\{([^}]+)\}$/);
        if (fullMatch) {
            const varName = fullMatch[1].trim();
            const value = this.resolveNestedVariable(varName, variables);
            return value !== undefined ? value : str;
        }

        // Otherwise, string-interpolate all ${...} tokens
        return str.replace(/\$\{([^}]+)\}/g, (_match, varName: string) => {
            const value = this.resolveNestedVariable(
                varName.trim(),
                variables,
            );
            return value !== undefined ? String(value) : `\${${varName}}`;
        });
    }

    /**
     * Resolve a potentially dot-notated variable name from the variables map.
     * Supports `foo.bar.baz` for nested object access.
     */
    private resolveNestedVariable(
        name: string,
        variables: Record<string, unknown>,
    ): unknown {
        // Direct lookup first
        if (name in variables) {
            return variables[name];
        }

        // Dot-notation traversal
        const parts = name.split('.');
        let current: unknown = variables;
        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            if (typeof current === 'object') {
                current = (current as Record<string, unknown>)[part];
            } else {
                return undefined;
            }
        }
        return current;
    }

    // ── Private: Condition Helpers ────────────────────────────────

    /**
     * Split a condition string on a binary operator, respecting quoted strings.
     */
    private splitOnOperator(expr: string, operator: string): string[] {
        const parts: string[] = [];
        let depth = 0;
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let current = '';

        for (let i = 0; i < expr.length; i++) {
            const ch = expr[i];

            if (ch === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
            } else if (ch === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
            } else if (ch === '(' && !inSingleQuote && !inDoubleQuote) {
                depth++;
            } else if (ch === ')' && !inSingleQuote && !inDoubleQuote) {
                depth--;
            }

            if (
                !inSingleQuote &&
                !inDoubleQuote &&
                depth === 0 &&
                expr.substring(i, i + operator.length) === operator
            ) {
                parts.push(current);
                current = '';
                i += operator.length - 1;
                continue;
            }

            current += ch;
        }

        if (current) {
            parts.push(current);
        }

        return parts.map((p) => p.trim()).filter(Boolean);
    }

    /**
     * Resolve a condition operand to its runtime value.
     *
     * Handles: quoted strings, numbers, booleans, and variable names.
     */
    private resolveOperand(
        operand: string,
        variables: Record<string, unknown>,
    ): unknown {
        const trimmed = operand.trim();

        // Quoted string
        if (
            (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
            (trimmed.startsWith('"') && trimmed.endsWith('"'))
        ) {
            return trimmed.slice(1, -1);
        }

        // Boolean literals
        if (trimmed === 'true') {
            return true;
        }
        if (trimmed === 'false') {
            return false;
        }

        // Numeric literal
        const num = Number(trimmed);
        if (!isNaN(num) && trimmed !== '') {
            return num;
        }

        // Variable reference
        return this.resolveNestedVariable(trimmed, variables);
    }

    // ── Private: Skill Invocation ────────────────────────────────

    /**
     * Invoke a skill action via the SkillMcpFactory.
     *
     * Looks up the registered skill, finds the matching MCP tool, and
     * calls its handler. Supports timeout via `Promise.race`.
     */
    private async invokeSkillAction(
        skillId: string,
        actionName: string,
        params: Record<string, unknown>,
        timeoutMs?: number,
    ): Promise<unknown> {
        const factory = SkillMcpFactory.getInstance();
        const registered = factory.getRegisteredSkills();

        // Find the matching tool
        let matchedTool: { handler: (args: Record<string, unknown>, pm: any) => Promise<any> } | undefined;

        for (const entry of registered.values()) {
            if (entry.skill.id === skillId || entry.skill.name === skillId) {
                for (const tool of entry.tools) {
                    // Match by action name (tools are named {skillKey}_{action})
                    if (
                        tool.name.endsWith(`_${actionName}`) ||
                        tool.name === actionName
                    ) {
                        matchedTool = tool;
                        break;
                    }
                }
                break;
            }
        }

        if (!matchedTool) {
            throw new Error(
                `No registered tool found for skill "${skillId}" action "${actionName}"`,
            );
        }

        const execute = async (): Promise<unknown> => {
            const result = await matchedTool!.handler(params, null as any);
            if (!result.success) {
                throw new Error(
                    result.errors?.join('; ') ??
                        'Skill action returned an error',
                );
            }
            return result.data;
        };

        if (timeoutMs && timeoutMs > 0) {
            return Promise.race([
                execute(),
                new Promise<never>((_resolve, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    `Step timed out after ${timeoutMs}ms`,
                                ),
                            ),
                        timeoutMs,
                    ),
                ),
            ]);
        }

        return execute();
    }

    // ── Private: Event Emission (AICC-0363) ──────────────────────

    /**
     * Emit a pipeline lifecycle event on the EventBus.
     *
     * Uses generic `system.activated`-compatible emission since pipeline
     * channels are not in the typed channel map yet — the EventBus
     * supports arbitrary string channels via wildcard subscriptions.
     */
    private async emitPipelineEvent(
        channel: string,
        payload: Record<string, unknown>,
    ): Promise<void> {
        try {
            await this.eventBus.emit(channel as any, {
                timestamp: Date.now(),
                source: 'PipelineEngine',
                ...payload,
            });
        } catch {
            // Best-effort — never let event emission break a pipeline run
        }
    }

    // ── Private: Utilities ───────────────────────────────────────

    /**
     * Generate a unique run ID.
     */
    private generateRunId(pipelineName: string): string {
        this.runCounter++;
        const ts = Date.now().toString(36);
        return `run-${pipelineName}-${ts}-${this.runCounter}`;
    }

    /**
     * Prune run history to stay within MAX_RUN_HISTORY.
     */
    private pruneRunHistory(): void {
        if (this.pipelineRuns.size <= MAX_RUN_HISTORY) {
            return;
        }

        const runs = Array.from(this.pipelineRuns.entries());
        runs.sort(
            (a, b) =>
                new Date(a[1].startedAt).getTime() -
                new Date(b[1].startedAt).getTime(),
        );

        const toRemove = runs.length - MAX_RUN_HISTORY;
        for (let i = 0; i < toRemove; i++) {
            this.pipelineRuns.delete(runs[i][0]);
        }
    }

    /**
     * Simple async delay helper.
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
