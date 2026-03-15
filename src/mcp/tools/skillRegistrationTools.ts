/**
 * Skill Registration MCP Tools
 *
 * Exposes skill discovery, registration lifecycle, and index
 * operations as MCP tool definitions for use by AI agents.
 *
 * Part of AICC-0035: Skills Development Program
 *   - AICC-0342: Auto-discover and register skills
 *   - AICC-0344: Registration lifecycle (register/unregister/list)
 *   - AICC-0429: Skill index generation
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { SkillRegistrationManager } from '../../services/skillRegistrationManager';

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

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

/**
 * Returns MCP tool definitions for skill registration operations.
 */
export function getSkillRegistrationTools(): McpToolDefinition[] {
    return [
        // ── auto_discover_skills ─────────────────────────────────
        {
            name: 'auto_discover_skills',
            description:
                'Auto-discover all skills in the workspace, generate MCP tool ' +
                'wrappers, generate Swagger/OpenAPI specs, and register each skill. ' +
                'Also creates platform adapter stubs (Slack, Teams, dev tools) and ' +
                'generates the skill index.',
            inputSchema: {
                type: 'object',
                properties: {
                    includeAdapters: {
                        type: 'boolean',
                        description:
                            'Whether to create platform adapter stubs (Slack, Teams, dev tools). Default: true.',
                    },
                    saveIndex: {
                        type: 'boolean',
                        description:
                            'Whether to persist the skill index to .project/SKILL-INDEX.json. Default: true.',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'auto_discover_skills';

                try {
                    const manager = SkillRegistrationManager.getInstance();

                    // 1. Auto-discover and register
                    const registrations = await manager.autoDiscoverAndRegister();

                    // 2. Optionally create adapter stubs
                    const includeAdapters = args.includeAdapters !== false;
                    if (includeAdapters) {
                        manager.createSlackAdapter();
                        manager.createTeamsAdapter();
                        manager.createDevToolsAdapters();
                    }

                    // 3. Generate and optionally save index
                    const index = manager.generateSkillIndex();
                    const saveIndex = args.saveIndex !== false;
                    if (saveIndex) {
                        await manager.saveSkillIndex(index);
                    }

                    // 4. Get summary
                    const summary = manager.getLifecycleSummary();

                    return envelope(toolName, start, {
                        registrations: registrations.map((r) => ({
                            skillName: r.skillName,
                            status: r.status,
                            mcpToolCount: r.mcpToolCount,
                            swaggerGenerated: r.swaggerGenerated,
                        })),
                        summary,
                        indexEntries: index.length,
                        indexSaved: saveIndex,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── register_skill ───────────────────────────────────────
        {
            name: 'register_skill',
            description:
                'Register a specific skill by name. Generates MCP tool wrappers ' +
                'and Swagger/OpenAPI spec for the skill.',
            inputSchema: {
                type: 'object',
                properties: {
                    skillName: {
                        type: 'string',
                        description: 'The name of the skill to register (e.g. "ailey-tools-image")',
                    },
                },
                required: ['skillName'],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'register_skill';
                const errors: string[] = [];

                try {
                    const skillName = requireString(args, 'skillName', errors);
                    if (errors.length > 0) {
                        return envelope(toolName, start, null, errors);
                    }

                    const manager = SkillRegistrationManager.getInstance();
                    const registration = await manager.registerSkill(skillName!);

                    return envelope(toolName, start, {
                        skillName: registration.skillName,
                        status: registration.status,
                        mcpToolCount: registration.mcpToolCount,
                        swaggerGenerated: registration.swaggerGenerated,
                        registeredAt: registration.registeredAt,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── list_skill_registrations ─────────────────────────────
        {
            name: 'list_skill_registrations',
            description:
                'List all registered skills with their status, MCP tool count, ' +
                'and Swagger generation status.',
            inputSchema: {
                type: 'object',
                properties: {
                    statusFilter: {
                        type: 'string',
                        enum: ['active', 'inactive', 'error'],
                        description: 'Optional filter by registration status',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'list_skill_registrations';

                try {
                    const manager = SkillRegistrationManager.getInstance();
                    let registrations = manager.listRegistrations();

                    // Apply optional status filter
                    const statusFilter = args.statusFilter as string | undefined;
                    if (statusFilter && ['active', 'inactive', 'error'].includes(statusFilter)) {
                        registrations = registrations.filter(
                            (r) => r.status === statusFilter,
                        );
                    }

                    const summary = manager.getLifecycleSummary();

                    return envelope(toolName, start, {
                        registrations: registrations.map((r) => ({
                            skillName: r.skillName,
                            status: r.status,
                            mcpToolCount: r.mcpToolCount,
                            swaggerGenerated: r.swaggerGenerated,
                            registeredAt: r.registeredAt,
                            lastHealthCheck: r.lastHealthCheck ?? null,
                        })),
                        summary,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },

        // ── get_skill_index ──────────────────────────────────────
        {
            name: 'get_skill_index',
            description:
                'Get the full skill index with names, descriptions, capabilities, ' +
                'MCP tools, and status for all registered and adapter-defined skills.',
            inputSchema: {
                type: 'object',
                properties: {
                    platformFilter: {
                        type: 'string',
                        description:
                            'Optional filter by platform (e.g. "tools", "com", "soc", "media")',
                    },
                    saveToFile: {
                        type: 'boolean',
                        description:
                            'Whether to persist the index to .project/SKILL-INDEX.json. Default: false.',
                    },
                },
                required: [],
            },
            handler: async (args) => {
                const start = Date.now();
                const toolName = 'get_skill_index';

                try {
                    const manager = SkillRegistrationManager.getInstance();
                    let entries = manager.generateSkillIndex();

                    // Apply optional platform filter
                    const platformFilter = args.platformFilter as string | undefined;
                    if (platformFilter) {
                        entries = entries.filter(
                            (e) => e.platform === platformFilter.toLowerCase(),
                        );
                    }

                    // Optionally save
                    if (args.saveToFile === true) {
                        await manager.saveSkillIndex(entries);
                    }

                    return envelope(toolName, start, {
                        totalEntries: entries.length,
                        entries: entries.map((e) => ({
                            name: e.name,
                            description: e.description,
                            version: e.version,
                            platform: e.platform,
                            capabilities: e.capabilities,
                            mcpTools: e.mcpTools,
                            status: e.status,
                        })),
                        savedToFile: args.saveToFile === true,
                    });
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    return envelope(toolName, start, null, [msg]);
                }
            },
        },
    ];
}
