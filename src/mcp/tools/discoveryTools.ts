/**
 * MCP Resource Discovery Tools
 *
 * Provides meta-tools for introspecting available MCP tools, resources,
 * prompts, agents, skills, personas, and instructions within the workspace.
 *
 * Task IDs:
 *   AICC-0308 — discover_resources meta-tool
 *   AICC-0309 — get_agent_info, get_skill_info
 *   AICC-0310 — list_personas, list_instructions
 *   AICC-0311 — response caching with TTL
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PlanningManager } from '../../planning/planningManager';
import type { McpToolDefinition, McpToolResult } from './planningCrudTools';

// ---------------------------------------------------------------------------
// AICC-0311 — Simple in-memory cache with TTL
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class DiscoveryCache {
    private store = new Map<string, CacheEntry<unknown>>();
    private readonly ttlMs: number;

    constructor(ttlMs: number = 30_000) {
        this.ttlMs = ttlMs;
    }

    get<T>(key: string): T | null {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > this.ttlMs) {
            this.store.delete(key);
            return null;
        }
        return entry.data as T;
    }

    set<T>(key: string, data: T): void {
        this.store.set(key, { data, timestamp: Date.now() });
    }

    invalidate(key?: string): void {
        if (key) {
            this.store.delete(key);
        } else {
            this.store.clear();
        }
    }
}

const cache = new DiscoveryCache(30_000); // 30-second TTL

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
// Filesystem helpers
// ---------------------------------------------------------------------------

/**
 * Recursively find markdown files under a directory.
 */
async function findMarkdownFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const nested = await findMarkdownFiles(fullPath);
                results.push(...nested);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                results.push(fullPath);
            }
        }
    } catch {
        // Directory doesn't exist — fine, return empty
    }
    return results;
}

/**
 * Extract YAML frontmatter from a markdown file (simple extraction).
 */
function extractFrontmatter(content: string): Record<string, string> {
    const fm: Record<string, string> = {};
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return fm;
    const lines = match[1].split(/\r?\n/);
    for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
            const key = line.substring(0, colonIdx).trim();
            const value = line.substring(colonIdx + 1).trim();
            fm[key] = value;
        }
    }
    return fm;
}

/**
 * Read a markdown file and return a summary object.
 */
async function readResourceFile(
    filePath: string,
    workspaceRoot: string,
): Promise<{ name: string; relativePath: string; description: string; frontmatter: Record<string, string> }> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const relativePath = path.relative(workspaceRoot, filePath);
    const frontmatter = extractFrontmatter(content);

    // Extract first heading as name fallback
    const headingMatch = content.match(/^#\s+(.+)/m);
    const name =
        frontmatter.name ||
        frontmatter.title ||
        (headingMatch ? headingMatch[1].trim() : path.basename(filePath, '.md'));

    // Extract first non-empty paragraph after heading as description
    const descMatch = content.match(/^#.*\r?\n\r?\n(.+)/m);
    const description =
        frontmatter.description ||
        (descMatch ? descMatch[1].trim().substring(0, 200) : '');

    return { name, relativePath, description, frontmatter };
}

/**
 * Resolve the workspace root from the PlanningManager.
 * Falls back to cwd if workspaceManager is not accessible.
 */
function getWorkspaceRoot(planningManager: PlanningManager): string {
    // PlanningManager exposes workspaceManager; workspaceManager holds the root
    const wm = planningManager.getWorkspaceManager();
    // WorkspaceManager stores workspace root — access via public getter or property
    return (wm as any).workspaceRoot ?? (wm as any).root ?? process.cwd();
}

// ---------------------------------------------------------------------------
// AICC-0308 — discover_resources
// ---------------------------------------------------------------------------

const discoverResourcesTool: McpToolDefinition = {
    name: 'discover_resources',
    description:
        'Meta-tool that lists all available MCP tools, resources, prompts, agents, skills, personas, and instructions in the workspace.',
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                enum: [
                    'all',
                    'tools',
                    'agents',
                    'skills',
                    'personas',
                    'instructions',
                ],
                description: 'Category to discover (default: all)',
            },
        },
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const category = (args.category as string) ?? 'all';
        const cacheKey = `discover_resources:${category}`;

        const cached = cache.get<unknown>(cacheKey);
        if (cached) {
            return envelope('discover_resources', start, cached);
        }

        try {
            const workspaceRoot = getWorkspaceRoot(planningManager);
            const result: Record<string, unknown> = {};

            // Tools — import the tool registries
            if (category === 'all' || category === 'tools') {
                const { getTools: getCrudTools } = await import('./planningCrudTools');
                const { getTools: getBulkTools } = await import('./bulkOperationTools');
                const discoveryToolDefs = getTools(); // self-reference

                const allTools = [
                    ...getCrudTools(),
                    ...getBulkTools(),
                    ...discoveryToolDefs,
                ];

                result.tools = allTools.map(t => ({
                    name: t.name,
                    description: t.description,
                }));
            }

            // Agents
            if (category === 'all' || category === 'agents') {
                const agentDir = path.join(workspaceRoot, '.github', 'agents');
                const files = await findMarkdownFiles(agentDir);
                const agents = await Promise.all(
                    files.map(f => readResourceFile(f, workspaceRoot)),
                );
                result.agents = agents;
            }

            // Skills
            if (category === 'all' || category === 'skills') {
                const skillDirs = [
                    path.join(workspaceRoot, '.github', 'skills'),
                    path.join(workspaceRoot, '.github', 'ai-ley', 'skills'),
                ];
                const allFiles: string[] = [];
                for (const dir of skillDirs) {
                    const files = await findMarkdownFiles(dir);
                    allFiles.push(...files);
                }
                // Deduplicate by filename
                const seen = new Set<string>();
                const skills = [];
                for (const f of allFiles) {
                    const base = path.basename(f);
                    if (!seen.has(base)) {
                        seen.add(base);
                        skills.push(await readResourceFile(f, workspaceRoot));
                    }
                }
                result.skills = skills;
            }

            // Personas
            if (category === 'all' || category === 'personas') {
                const personaDir = path.join(
                    workspaceRoot,
                    '.github',
                    'ai-ley',
                    'personas',
                );
                const files = await findMarkdownFiles(personaDir);
                const personas = await Promise.all(
                    files.map(f => readResourceFile(f, workspaceRoot)),
                );
                result.personas = {
                    count: personas.length,
                    items: personas,
                };
            }

            // Instructions
            if (category === 'all' || category === 'instructions') {
                const instrDir = path.join(
                    workspaceRoot,
                    '.github',
                    'ai-ley',
                    'instructions',
                );
                const files = await findMarkdownFiles(instrDir);
                const instructions = await Promise.all(
                    files.map(f => readResourceFile(f, workspaceRoot)),
                );
                result.instructions = {
                    count: instructions.length,
                    items: instructions,
                };
            }

            cache.set(cacheKey, result);
            return envelope('discover_resources', start, result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('discover_resources', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// AICC-0309 — get_agent_info
// ---------------------------------------------------------------------------

const getAgentInfoTool: McpToolDefinition = {
    name: 'get_agent_info',
    description:
        'Introspect a specific agent definition from .github/agents/. Returns the full content and parsed frontmatter.',
    inputSchema: {
        type: 'object',
        properties: {
            agentName: {
                type: 'string',
                description:
                    'Agent filename (e.g. "ailey-architect.agent.md") or partial name to match.',
            },
        },
        required: ['agentName'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];
        const agentName = requireString(args, 'agentName', errors);
        if (errors.length > 0 || !agentName) {
            return envelope('get_agent_info', start, null, errors);
        }

        const cacheKey = `agent_info:${agentName}`;
        const cached = cache.get<unknown>(cacheKey);
        if (cached) {
            return envelope('get_agent_info', start, cached);
        }

        try {
            const workspaceRoot = getWorkspaceRoot(planningManager);
            const agentDir = path.join(workspaceRoot, '.github', 'agents');
            const files = await findMarkdownFiles(agentDir);

            const match = files.find(f => {
                const base = path.basename(f);
                return (
                    base === agentName ||
                    base.includes(agentName.replace('.md', ''))
                );
            });

            if (!match) {
                return envelope('get_agent_info', start, null, [
                    `Agent not found matching: ${agentName}`,
                ]);
            }

            const content = await fs.promises.readFile(match, 'utf-8');
            const frontmatter = extractFrontmatter(content);
            const relativePath = path.relative(workspaceRoot, match);

            const data = {
                name: path.basename(match, '.md'),
                relativePath,
                frontmatter,
                content,
            };

            cache.set(cacheKey, data);
            return envelope('get_agent_info', start, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_agent_info', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// AICC-0309 — get_skill_info
// ---------------------------------------------------------------------------

const getSkillInfoTool: McpToolDefinition = {
    name: 'get_skill_info',
    description:
        'Introspect a specific skill definition from .github/skills/. Returns the SKILL.md content and parsed frontmatter.',
    inputSchema: {
        type: 'object',
        properties: {
            skillName: {
                type: 'string',
                description:
                    'Skill folder name (e.g. "ailey-atl-jira") or partial name to match.',
            },
        },
        required: ['skillName'],
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const errors: string[] = [];
        const skillName = requireString(args, 'skillName', errors);
        if (errors.length > 0 || !skillName) {
            return envelope('get_skill_info', start, null, errors);
        }

        const cacheKey = `skill_info:${skillName}`;
        const cached = cache.get<unknown>(cacheKey);
        if (cached) {
            return envelope('get_skill_info', start, cached);
        }

        try {
            const workspaceRoot = getWorkspaceRoot(planningManager);
            const skillDirs = [
                path.join(workspaceRoot, '.github', 'skills'),
                path.join(workspaceRoot, '.github', 'ai-ley', 'skills'),
            ];

            let matchedPath: string | null = null;

            for (const baseDir of skillDirs) {
                try {
                    const entries = await fs.promises.readdir(baseDir, {
                        withFileTypes: true,
                    });
                    for (const entry of entries) {
                        if (!entry.isDirectory()) continue;
                        if (
                            entry.name === skillName ||
                            entry.name.includes(skillName)
                        ) {
                            const skillFile = path.join(
                                baseDir,
                                entry.name,
                                'SKILL.md',
                            );
                            try {
                                await fs.promises.access(skillFile);
                                matchedPath = skillFile;
                                break;
                            } catch {
                                // No SKILL.md — look for README.md or any .md
                                const mdFiles = await findMarkdownFiles(
                                    path.join(baseDir, entry.name),
                                );
                                if (mdFiles.length > 0) {
                                    matchedPath = mdFiles[0];
                                    break;
                                }
                            }
                        }
                    }
                } catch {
                    // directory doesn't exist
                }
                if (matchedPath) break;
            }

            if (!matchedPath) {
                return envelope('get_skill_info', start, null, [
                    `Skill not found matching: ${skillName}`,
                ]);
            }

            const content = await fs.promises.readFile(matchedPath, 'utf-8');
            const frontmatter = extractFrontmatter(content);
            const relativePath = path.relative(workspaceRoot, matchedPath);

            const data = {
                name: skillName,
                relativePath,
                frontmatter,
                contentPreview: content.substring(0, 2000),
                contentLength: content.length,
            };

            cache.set(cacheKey, data);
            return envelope('get_skill_info', start, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('get_skill_info', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// AICC-0310 — list_personas
// ---------------------------------------------------------------------------

const listPersonasTool: McpToolDefinition = {
    name: 'list_personas',
    description:
        'List all available personas from .github/ai-ley/personas/. Returns name, path, and description for each.',
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description:
                    'Filter by sub-folder category (e.g. "architect", "developer"). Optional.',
            },
        },
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const category = (args.category as string) ?? undefined;
        const cacheKey = `list_personas:${category ?? 'all'}`;

        const cached = cache.get<unknown>(cacheKey);
        if (cached) {
            return envelope('list_personas', start, cached);
        }

        try {
            const workspaceRoot = getWorkspaceRoot(planningManager);
            let searchDir = path.join(
                workspaceRoot,
                '.github',
                'ai-ley',
                'personas',
            );
            if (category) {
                searchDir = path.join(searchDir, category);
            }

            const files = await findMarkdownFiles(searchDir);
            const personas = await Promise.all(
                files.map(f => readResourceFile(f, workspaceRoot)),
            );

            // Group by category (first folder under personas/)
            const personaRoot = path.join(
                workspaceRoot,
                '.github',
                'ai-ley',
                'personas',
            );
            const grouped: Record<string, typeof personas> = {};
            for (const p of personas) {
                const absPath = path.join(workspaceRoot, p.relativePath);
                const relFromPersonas = path.relative(personaRoot, absPath);
                const cat = relFromPersonas.split(path.sep)[0] ?? 'uncategorized';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(p);
            }

            const data = {
                total: personas.length,
                categories: Object.keys(grouped).sort(),
                grouped,
            };

            cache.set(cacheKey, data);
            return envelope('list_personas', start, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('list_personas', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// AICC-0310 — list_instructions
// ---------------------------------------------------------------------------

const listInstructionsTool: McpToolDefinition = {
    name: 'list_instructions',
    description:
        'List all available instructions from .github/ai-ley/instructions/. Returns name, path, and description for each.',
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description:
                    'Filter by sub-folder category (e.g. "development", "frameworks"). Optional.',
            },
        },
    },
    handler: async (args, planningManager) => {
        const start = Date.now();
        const category = (args.category as string) ?? undefined;
        const cacheKey = `list_instructions:${category ?? 'all'}`;

        const cached = cache.get<unknown>(cacheKey);
        if (cached) {
            return envelope('list_instructions', start, cached);
        }

        try {
            const workspaceRoot = getWorkspaceRoot(planningManager);
            let searchDir = path.join(
                workspaceRoot,
                '.github',
                'ai-ley',
                'instructions',
            );
            if (category) {
                searchDir = path.join(searchDir, category);
            }

            const files = await findMarkdownFiles(searchDir);
            const instructions = await Promise.all(
                files.map(f => readResourceFile(f, workspaceRoot)),
            );

            // Group by category
            const instrRoot = path.join(
                workspaceRoot,
                '.github',
                'ai-ley',
                'instructions',
            );
            const grouped: Record<string, typeof instructions> = {};
            for (const inst of instructions) {
                const absPath = path.join(workspaceRoot, inst.relativePath);
                const relFromInstr = path.relative(instrRoot, absPath);
                const cat = relFromInstr.split(path.sep)[0] ?? 'uncategorized';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(inst);
            }

            const data = {
                total: instructions.length,
                categories: Object.keys(grouped).sort(),
                grouped,
            };

            cache.set(cacheKey, data);
            return envelope('list_instructions', start, data);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return envelope('list_instructions', start, null, [message]);
        }
    },
};

// ---------------------------------------------------------------------------
// Registry export
// ---------------------------------------------------------------------------

/**
 * Return all discovery tool definitions for registration in mcpServer.
 */
export function getTools(): McpToolDefinition[] {
    return [
        discoverResourcesTool,
        getAgentInfoTool,
        getSkillInfoTool,
        listPersonasTool,
        listInstructionsTool,
    ];
}
