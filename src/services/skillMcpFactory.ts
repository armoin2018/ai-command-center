/**
 * Skill-to-MCP Factory Service
 *
 * Generates MCP tool definitions and REST endpoints from discovered skills.
 * Manages registration lifecycle and emits events on the EventBus.
 *
 * Part of AICC-0125: Skill-to-MCP Factory & REST Endpoints
 *   - AICC-0347: Implement MCP tool generation
 *   - AICC-0348: Add registration lifecycle management
 *   - AICC-0349: Create mcp.json entry builder
 *   - AICC-0350: Build stdio server wrapper
 *   - AICC-0351: Implement ai-ley category key formatting
 *   - AICC-0352: Implement dynamic REST endpoint registration
 *   - AICC-0353: Build request/response handling with AiccMsg
 *   - AICC-0354: Add endpoint lifecycle management
 */

import { Logger } from '../logger';
import { EventBus } from './eventBus';
import { EventChannels } from '../types/events';
import type { McpToolDefinition, McpToolResult } from '../mcp/tools/planningCrudTools';
import type { DiscoveredSkill, SkillAction } from './skillIntrospector';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A skill that has been registered with the MCP factory.
 */
export interface RegisteredSkillEntry {
    /** The original discovered skill */
    skill: DiscoveredSkill;
    /** Generated MCP tool definitions */
    tools: McpToolDefinition[];
    /** Registered REST endpoints */
    endpoints: RegisteredEndpoint[];
    /** When the skill was registered (ISO timestamp) */
    registeredAt: string;
}

/**
 * A REST endpoint registered for a skill action.
 */
export interface RegisteredEndpoint {
    /** HTTP method (always POST for skill actions) */
    method: 'POST';
    /** Route path, e.g. /api/skills/ailey-tools-image/convert */
    path: string;
    /** Skill ID that owns this endpoint */
    skillId: string;
    /** Action name this endpoint invokes */
    actionName: string;
    /** Human-readable description */
    description: string;
}

/**
 * An entry suitable for inclusion in `.vscode/mcp.json` servers section.
 */
export interface McpJsonEntry {
    /** Server key, e.g. "ailey-tools-image" */
    key: string;
    /** Server configuration */
    config: {
        type: 'stdio';
        command: string;
        args: string[];
        env?: Record<string, string>;
    };
}

/**
 * AiccMsg envelope for REST responses.
 */
export interface AiccMsg<T = unknown> {
    success: boolean;
    data: T;
    errors?: string[];
    meta: {
        skillId: string;
        action: string;
        duration: number;
        timestamp: string;
    };
}

// ─── SkillMcpFactory ─────────────────────────────────────────────────

/**
 * Singleton factory that converts {@link DiscoveredSkill} entries into
 * MCP tool definitions and REST endpoints.
 *
 * Responsibilities:
 *  - Generate {@link McpToolDefinition} per skill action
 *  - Manage registration / un-registration lifecycle
 *  - Emit `skill.registered` events via the {@link EventBus}
 *  - Build `mcp.json` stdio entries
 *  - Register / remove REST POST endpoints
 */
export class SkillMcpFactory {
    private static instance: SkillMcpFactory | undefined;

    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    /** skillId → RegisteredSkillEntry */
    private readonly registry = new Map<string, RegisteredSkillEntry>();

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): SkillMcpFactory {
        if (!SkillMcpFactory.instance) {
            SkillMcpFactory.instance = new SkillMcpFactory();
        }
        return SkillMcpFactory.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        SkillMcpFactory.instance = undefined;
    }

    // ── MCP Tool Generation (AICC-0347) ─────────────────────────

    /**
     * Generate MCP tool definitions from a discovered skill's actions.
     *
     * Each action becomes one {@link McpToolDefinition} with:
     * - Name: `{skillKey}_{actionName}` (snake_case)
     * - Input schema derived from action parameters
     * - Handler that logs execution, emits events, and returns an AiccMsg envelope
     */
    public generateToolsFromSkill(
        skill: DiscoveredSkill,
    ): McpToolDefinition[] {
        const skillKey = this.formatSkillKey(skill);
        const tools: McpToolDefinition[] = [];

        for (const action of skill.actions) {
            const toolName = `${skillKey}_${action.name}`.replace(/-/g, '_');
            const tool = this.buildToolDefinition(skill, action, toolName);
            tools.push(tool);
        }

        this.logger.debug(
            `Generated ${tools.length} MCP tool(s) for skill "${skill.name}"`,
            { component: 'SkillMcpFactory', skillId: skill.id },
        );

        return tools;
    }

    // ── Registration Lifecycle (AICC-0348) ──────────────────────

    /**
     * Register all tools and endpoints for a skill.
     * Emits `skill.registered` on the EventBus.
     */
    public registerSkill(skill: DiscoveredSkill): void {
        if (this.registry.has(skill.id)) {
            this.logger.warn(
                `Skill "${skill.name}" already registered — re-registering`,
                { component: 'SkillMcpFactory', skillId: skill.id },
            );
            this.unregisterSkill(skill.id);
        }

        const tools = this.generateToolsFromSkill(skill);
        const endpoints = this.generateEndpoints(skill);

        const entry: RegisteredSkillEntry = {
            skill,
            tools,
            endpoints,
            registeredAt: new Date().toISOString(),
        };

        this.registry.set(skill.id, entry);

        this.logger.info(
            `Registered skill "${skill.name}" — ${tools.length} tool(s), ${endpoints.length} endpoint(s)`,
            { component: 'SkillMcpFactory', skillId: skill.id },
        );

        // Emit event (fire-and-forget)
        this.eventBus
            .emit(EventChannels.Skill.Registered, {
                timestamp: Date.now(),
                source: 'SkillMcpFactory',
                skillId: skill.id,
                name: skill.name,
                action: 'registered',
            })
            .catch(() => {
                /* swallow — best-effort */
            });
    }

    /**
     * Remove all tools and endpoints for a skill.
     * Emits `skill.registered` with action `unregistered`.
     */
    public unregisterSkill(skillId: string): void {
        const entry = this.registry.get(skillId);
        if (!entry) {
            this.logger.warn(
                `Cannot unregister unknown skill "${skillId}"`,
                { component: 'SkillMcpFactory' },
            );
            return;
        }

        this.registry.delete(skillId);

        this.logger.info(`Unregistered skill "${entry.skill.name}"`, {
            component: 'SkillMcpFactory',
            skillId,
        });

        this.eventBus
            .emit(EventChannels.Skill.Registered, {
                timestamp: Date.now(),
                source: 'SkillMcpFactory',
                skillId,
                name: entry.skill.name,
                action: 'unregistered',
            })
            .catch(() => {
                /* swallow */
            });
    }

    /**
     * Return the full registry of registered skills.
     */
    public getRegisteredSkills(): Map<string, RegisteredSkillEntry> {
        return new Map(this.registry);
    }

    // ── mcp.json Entry Builder (AICC-0349 / AICC-0350) ──────────

    /**
     * Generate a valid `mcp.json` stdio server entry for a skill.
     *
     * The entry wraps the skill directory's `npm run` or `tsx` entry-point
     * in stdio transport so MCP clients can launch it as a sub-process.
     */
    public generateMcpJsonEntry(skill: DiscoveredSkill): McpJsonEntry {
        const key = this.formatSkillKey(skill);

        return {
            key,
            config: {
                type: 'stdio',
                command: 'npx',
                args: [
                    '-y',
                    'tsx',
                    `${skill.path}/scripts/index.ts`,
                    '--stdio',
                ],
                env: {
                    SKILL_ID: skill.id,
                    SKILL_NAME: skill.name,
                },
            },
        };
    }

    // ── Key Formatting (AICC-0351) ──────────────────────────────

    /**
     * Format a skill name as `ailey-{category}-{name}`.
     *
     * If the skill name already follows the convention it is returned as-is.
     * Otherwise the category and trailing segments are assembled.
     *
     * @example formatSkillKey({ name: 'ailey-tools-image', category: 'tools', … }) → 'ailey-tools-image'
     */
    public formatSkillKey(skill: DiscoveredSkill): string {
        const name = skill.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        if (name.startsWith('ailey-')) {
            return name;
        }
        const category = skill.category.toLowerCase().replace(/[^a-z0-9]/g, '');
        return `ailey-${category}-${name}`;
    }

    // ── REST Endpoint Management (AICC-0352 / AICC-0353 / AICC-0354) ──

    /**
     * Register a single REST endpoint for a skill action.
     * Returns the {@link RegisteredEndpoint} that was created.
     */
    public registerEndpoint(
        skill: DiscoveredSkill,
        action: SkillAction,
    ): RegisteredEndpoint {
        const endpoint: RegisteredEndpoint = {
            method: 'POST',
            path: `/api/skills/${encodeURIComponent(skill.name)}/${encodeURIComponent(action.name)}`,
            skillId: skill.id,
            actionName: action.name,
            description: action.description,
        };

        // Attach to existing registry entry if present
        const entry = this.registry.get(skill.id);
        if (entry) {
            const exists = entry.endpoints.some(
                (e) => e.path === endpoint.path,
            );
            if (!exists) {
                entry.endpoints.push(endpoint);
            }
        }

        this.logger.debug(
            `Registered endpoint POST ${endpoint.path}`,
            { component: 'SkillMcpFactory', skillId: skill.id },
        );

        return endpoint;
    }

    /**
     * Remove all REST endpoints for a given skill.
     */
    public removeEndpoints(skillId: string): void {
        const entry = this.registry.get(skillId);
        if (entry) {
            const count = entry.endpoints.length;
            entry.endpoints.length = 0;
            this.logger.debug(
                `Removed ${count} endpoint(s) for skill "${skillId}"`,
                { component: 'SkillMcpFactory' },
            );
        }
    }

    /**
     * Return all currently registered endpoints across all skills.
     */
    public getRegisteredEndpoints(): RegisteredEndpoint[] {
        const all: RegisteredEndpoint[] = [];
        for (const entry of this.registry.values()) {
            all.push(...entry.endpoints);
        }
        return all;
    }

    // ── REST Request Handler (AICC-0353) ────────────────────────

    /**
     * Handle an incoming REST request for a skill action.
     *
     * Validates that the skill and action exist, executes the action,
     * and returns a standardised {@link AiccMsg} envelope.
     */
    public async handleRequest(
        skillName: string,
        actionName: string,
        body: Record<string, unknown>,
    ): Promise<AiccMsg> {
        const start = Date.now();
        const entry = this.findEntryByName(skillName);

        if (!entry) {
            return {
                success: false,
                data: null,
                errors: [`Skill "${skillName}" is not registered`],
                meta: {
                    skillId: skillName,
                    action: actionName,
                    duration: Date.now() - start,
                    timestamp: new Date().toISOString(),
                },
            };
        }

        const action = entry.skill.actions.find((a) => a.name === actionName);
        if (!action) {
            return {
                success: false,
                data: null,
                errors: [
                    `Action "${actionName}" not found on skill "${skillName}"`,
                ],
                meta: {
                    skillId: entry.skill.id,
                    action: actionName,
                    duration: Date.now() - start,
                    timestamp: new Date().toISOString(),
                },
            };
        }

        // Emit start event
        await this.eventBus
            .emit(EventChannels.Skill.Execution.Started, {
                timestamp: Date.now(),
                source: 'SkillMcpFactory',
                skillId: entry.skill.id,
                input: body,
            })
            .catch(() => {});

        try {
            // Validate required parameters
            const errors = this.validateParameters(action, body);
            if (errors.length > 0) {
                return {
                    success: false,
                    data: null,
                    errors,
                    meta: {
                        skillId: entry.skill.id,
                        action: actionName,
                        duration: Date.now() - start,
                        timestamp: new Date().toISOString(),
                    },
                };
            }

            // Placeholder: actual skill execution would delegate to
            // skill runtime. For now return acknowledgment.
            const result = {
                message: `Action "${actionName}" on skill "${entry.skill.name}" accepted`,
                parameters: body,
            };

            const duration = Date.now() - start;

            // Emit completion event
            await this.eventBus
                .emit(EventChannels.Skill.Execution.Completed, {
                    timestamp: Date.now(),
                    source: 'SkillMcpFactory',
                    skillId: entry.skill.id,
                    input: body,
                    output: result,
                    duration,
                    success: true,
                })
                .catch(() => {});

            return {
                success: true,
                data: result,
                meta: {
                    skillId: entry.skill.id,
                    action: actionName,
                    duration,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (err) {
            const errorMsg =
                err instanceof Error ? err.message : String(err);
            const duration = Date.now() - start;

            // Emit error event
            await this.eventBus
                .emit(EventChannels.Skill.Execution.Error, {
                    timestamp: Date.now(),
                    source: 'SkillMcpFactory',
                    skillId: entry.skill.id,
                    error: errorMsg,
                    stack:
                        err instanceof Error ? err.stack : undefined,
                })
                .catch(() => {});

            return {
                success: false,
                data: null,
                errors: [errorMsg],
                meta: {
                    skillId: entry.skill.id,
                    action: actionName,
                    duration,
                    timestamp: new Date().toISOString(),
                },
            };
        }
    }

    // ── Private helpers ──────────────────────────────────────────

    /**
     * Build a single {@link McpToolDefinition} for a skill action.
     */
    private buildToolDefinition(
        skill: DiscoveredSkill,
        action: SkillAction,
        toolName: string,
    ): McpToolDefinition {
        const properties: Record<string, object> = {};
        const required: string[] = [];

        for (const param of action.parameters) {
            properties[param.name] = {
                type: mapToJsonSchemaType(param.type),
                description: param.description,
                ...(param.default !== undefined
                    ? { default: param.default }
                    : {}),
            };
            if (param.required) {
                required.push(param.name);
            }
        }

        const inputSchema: Record<string, unknown> = {
            type: 'object' as const,
            properties,
            ...(required.length > 0 ? { required } : {}),
            additionalProperties: false,
        };

        const factory = this; // capture for closure

        return {
            name: toolName,
            description: `[${skill.name}] ${action.description}`,
            inputSchema,
            handler: async (
                args: Record<string, unknown>,
                _planningManager,
            ): Promise<McpToolResult> => {
                const start = Date.now();

                factory.logger.info(
                    `Executing MCP tool "${toolName}"`,
                    {
                        component: 'SkillMcpFactory',
                        skillId: skill.id,
                        action: action.name,
                    },
                );

                // Emit start event
                await factory.eventBus
                    .emit(EventChannels.Skill.Execution.Started, {
                        timestamp: Date.now(),
                        source: 'SkillMcpFactory',
                        skillId: skill.id,
                        input: args,
                    })
                    .catch(() => {});

                try {
                    // Placeholder execution — real implementation would
                    // invoke the skill's runtime.
                    const data = {
                        message: `Tool "${toolName}" executed`,
                        skillId: skill.id,
                        action: action.name,
                        input: args,
                    };

                    const duration = Date.now() - start;

                    await factory.eventBus
                        .emit(
                            EventChannels.Skill.Execution.Completed,
                            {
                                timestamp: Date.now(),
                                source: 'SkillMcpFactory',
                                skillId: skill.id,
                                input: args,
                                output: data,
                                duration,
                                success: true,
                            },
                        )
                        .catch(() => {});

                    return {
                        success: true,
                        data,
                        meta: {
                            toolName,
                            duration,
                            timestamp: new Date().toISOString(),
                        },
                    };
                } catch (err) {
                    const errorMsg =
                        err instanceof Error
                            ? err.message
                            : String(err);
                    const duration = Date.now() - start;

                    await factory.eventBus
                        .emit(EventChannels.Skill.Execution.Error, {
                            timestamp: Date.now(),
                            source: 'SkillMcpFactory',
                            skillId: skill.id,
                            error: errorMsg,
                            stack:
                                err instanceof Error
                                    ? err.stack
                                    : undefined,
                        })
                        .catch(() => {});

                    return {
                        success: false,
                        data: null,
                        errors: [errorMsg],
                        meta: {
                            toolName,
                            duration,
                            timestamp: new Date().toISOString(),
                        },
                    };
                }
            },
        };
    }

    /**
     * Generate REST endpoints for every action in a skill.
     */
    private generateEndpoints(
        skill: DiscoveredSkill,
    ): RegisteredEndpoint[] {
        return skill.actions.map((action) => ({
            method: 'POST' as const,
            path: `/api/skills/${encodeURIComponent(skill.name)}/${encodeURIComponent(action.name)}`,
            skillId: skill.id,
            actionName: action.name,
            description: action.description,
        }));
    }

    /**
     * Find a registered entry by skill name (case-insensitive).
     */
    private findEntryByName(name: string): RegisteredSkillEntry | undefined {
        const lower = name.toLowerCase();
        for (const entry of this.registry.values()) {
            if (entry.skill.name.toLowerCase() === lower) {
                return entry;
            }
        }
        return undefined;
    }

    /**
     * Validate that all required parameters for an action are present.
     */
    private validateParameters(
        action: SkillAction,
        body: Record<string, unknown>,
    ): string[] {
        const errors: string[] = [];
        for (const param of action.parameters) {
            if (
                param.required &&
                (body[param.name] === undefined ||
                    body[param.name] === null)
            ) {
                errors.push(
                    `Missing required parameter: ${param.name}`,
                );
            }
        }
        return errors;
    }
}

// ─── Utility ─────────────────────────────────────────────────────────

/**
 * Map a skill parameter type string to a JSON Schema type.
 */
function mapToJsonSchemaType(
    paramType: string,
): string {
    switch (paramType.toLowerCase()) {
        case 'number':
        case 'integer':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'object':
            return 'object';
        case 'array':
            return 'array';
        default:
            return 'string';
    }
}
