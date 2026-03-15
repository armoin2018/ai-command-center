/**
 * Skill Introspector Service
 *
 * Scans workspace for skill directories, parses SKILL.md metadata,
 * and discovers exported actions, parameters, and return types.
 *
 * Part of AICC-0126: Skill introspection & dynamic MCP registration
 *   - AICC-0345: Implement skill scanner
 *   - AICC-0346: Build export discovery
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single parameter accepted by a skill action.
 */
export interface SkillParameter {
    /** Parameter name */
    name: string;
    /** Data type (string, number, boolean, object, array, etc.) */
    type: string;
    /** Whether the parameter is required */
    required: boolean;
    /** Human-readable description */
    description: string;
    /** Default value if any */
    default?: string;
}

/**
 * An action (command / tool) exposed by a skill.
 */
export interface SkillAction {
    /** Action name (e.g. "convert", "send-message") */
    name: string;
    /** Human-readable description */
    description: string;
    /** Parameters accepted by the action */
    parameters: SkillParameter[];
    /** Return type hint (optional) */
    returnType?: string;
}

/**
 * Metadata extracted from SKILL.md frontmatter.
 */
export interface SkillMetadata {
    /** Unique identifier from frontmatter `id` */
    id: string;
    /** Human-readable name from frontmatter `name` */
    name: string;
    /** Short description from frontmatter `description` */
    description: string;
    /** Keywords for discovery */
    keywords: string[];
    /** External tool/library dependencies */
    tools: string[];
}

/**
 * A fully-introspected skill ready for MCP registration.
 */
export interface DiscoveredSkill {
    /** Unique identifier */
    id: string;
    /** Human-readable name */
    name: string;
    /** Category derived from name (e.g. "tools", "com", "soc") */
    category: string;
    /** Short description */
    description: string;
    /** Absolute path to the skill directory */
    path: string;
    /** Discovered actions */
    actions: SkillAction[];
}

// ─── Internal helpers ────────────────────────────────────────────────

/** Well-known directories where skills may live, relative to workspace root. */
const SKILL_SEARCH_DIRS = [
    '.github/skills',
    '.github/ai-ley/skills',
];

/**
 * Extract YAML frontmatter from a markdown string.
 * Returns raw key-value pairs between the opening and closing `---`.
 */
function parseFrontmatter(content: string): Record<string, string | string[]> {
    const fm: Record<string, string | string[]> = {};
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        return fm;
    }

    const block = match[1];
    let currentKey = '';
    let collectingList = false;
    const listItems: string[] = [];

    for (const rawLine of block.split(/\r?\n/)) {
        // List item under a key (e.g. "  - value")
        const listMatch = rawLine.match(/^\s+-\s+(.+)/);
        if (listMatch && collectingList) {
            listItems.push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
            continue;
        }

        // Flush any pending list
        if (collectingList && currentKey) {
            fm[currentKey] = [...listItems];
            listItems.length = 0;
            collectingList = false;
        }

        // Key: value
        const kvMatch = rawLine.match(/^(\w[\w-]*)\s*:\s*(.*)/);
        if (kvMatch) {
            currentKey = kvMatch[1].trim();
            const value = kvMatch[2].trim();
            if (value === '' || value === '|' || value === '>') {
                // Possibly a list or multi-line block follows
                collectingList = true;
                continue;
            }
            fm[currentKey] = value.replace(/^["']|["']$/g, '');
        }
    }

    // Flush trailing list
    if (collectingList && currentKey && listItems.length > 0) {
        fm[currentKey] = [...listItems];
    }

    return fm;
}

/**
 * Derive the category segment from a skill name.
 * E.g. "ailey-tools-image" → "tools", "ailey-com-slack" → "com"
 */
function extractCategory(name: string): string {
    const parts = name.replace(/^ailey-/, '').split('-');
    return parts.length > 0 ? parts[0] : 'general';
}

/**
 * Parse action entries from the body of a SKILL.md.
 *
 * Strategy:
 *  1. Look for `## Commands Reference`, `## Commands`, `## Actions`,
 *     `## Tools` sections — each `### <Heading>` underneath becomes an action.
 *  2. Within each sub-section, detect CLI-style `--<param>` flags from
 *     code blocks to build a parameter list.
 *  3. Fall back to bash code blocks (`tsx scripts/…`) at top-level as
 *     individual actions if no section-based actions are found.
 */
function parseActions(content: string): SkillAction[] {
    const actions: SkillAction[] = [];
    const seen = new Set<string>();

    // ── Strategy 1: section-based parsing ────────────────────────
    const sectionHeaderRe =
        /^##\s+(Commands\s+Reference|Commands|Actions|Tools)\s*$/im;
    const sectionMatch = sectionHeaderRe.exec(content);

    if (sectionMatch) {
        // Slice from the matched ## heading to the next ## heading of the
        // same level (or end of file).
        const startIdx = sectionMatch.index + sectionMatch[0].length;
        const rest = content.slice(startIdx);
        // Split by ### sub-headings
        const subSections = rest.split(/^###\s+/m).slice(1); // first chunk is before any ###

        for (const sub of subSections) {
            // Stop if we hit a new ## section
            if (/^##\s+/m.test(sub)) {
                const trimmed = sub.slice(0, sub.search(/^##\s+/m));
                processSubSection(trimmed, actions, seen);
                break;
            }
            processSubSection(sub, actions, seen);
        }
    }

    // ── Strategy 2: top-level code-block fallback ────────────────
    if (actions.length === 0) {
        const codeBlockRe = /```(?:bash|sh)\s*\n([\s\S]*?)```/g;
        let cbMatch: RegExpExecArray | null;
        while ((cbMatch = codeBlockRe.exec(content)) !== null) {
            const block = cbMatch[1];
            // Look for `tsx scripts/<tool>.ts <action>`
            const cmdMatch = block.match(
                /tsx\s+scripts\/[\w-]+\.ts\s+([\w-]+)/,
            );
            if (cmdMatch) {
                const actionName = normalizeActionName(cmdMatch[1]);
                if (!seen.has(actionName)) {
                    seen.add(actionName);
                    actions.push({
                        name: actionName,
                        description: `Execute ${cmdMatch[1]} action`,
                        parameters: extractParametersFromBlock(block),
                    });
                }
            }

            // Also match `npm run <action>`
            const npmMatch = block.match(/npm\s+run\s+([\w-]+)/);
            if (npmMatch) {
                const actionName = normalizeActionName(npmMatch[1]);
                if (!seen.has(actionName)) {
                    seen.add(actionName);
                    actions.push({
                        name: actionName,
                        description: `Execute ${npmMatch[1]} action`,
                        parameters: extractParametersFromBlock(block),
                    });
                }
            }
        }
    }

    return actions;
}

/**
 * Process a single ### sub-section into an action entry.
 */
function processSubSection(
    text: string,
    actions: SkillAction[],
    seen: Set<string>,
): void {
    const lines = text.split(/\r?\n/);
    const headingLine = lines[0] ?? '';
    const actionName = normalizeActionName(
        headingLine.replace(/\s*\(.*\)/, '').trim(),
    );
    if (!actionName || seen.has(actionName)) {
        return;
    }
    seen.add(actionName);

    // Gather description: first non-empty, non-code line after heading
    let description = '';
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('```') || line === '') {
            continue;
        }
        if (line.startsWith('#')) {
            break;
        }
        description = line;
        break;
    }

    // Extract parameters from code blocks in this sub-section
    const codeBlockRe = /```(?:bash|sh|json)?\s*\n([\s\S]*?)```/g;
    const params: SkillParameter[] = [];
    const paramSeen = new Set<string>();
    let cbMatch: RegExpExecArray | null;
    while ((cbMatch = codeBlockRe.exec(text)) !== null) {
        for (const p of extractParametersFromBlock(cbMatch[1])) {
            if (!paramSeen.has(p.name)) {
                paramSeen.add(p.name);
                params.push(p);
            }
        }
    }

    actions.push({
        name: actionName,
        description: description || `Execute ${actionName}`,
        parameters: params,
    });
}

/**
 * Extract CLI-style `--param <value>` flags from a code block.
 */
function extractParametersFromBlock(block: string): SkillParameter[] {
    const params: SkillParameter[] = [];
    const seen = new Set<string>();
    const flagRe = /--(\w[\w-]*)\s*(?:(\S+))?/g;
    let m: RegExpExecArray | null;
    while ((m = flagRe.exec(block)) !== null) {
        const rawName = m[1];
        const paramName = normalizeActionName(rawName);
        if (seen.has(paramName)) {
            continue;
        }
        seen.add(paramName);

        const sampleValue = m[2] ?? '';
        params.push({
            name: paramName,
            type: inferType(sampleValue),
            required: false,
            description: `The ${rawName.replace(/-/g, ' ')} parameter`,
            ...(sampleValue && !sampleValue.startsWith('-')
                ? { default: sampleValue }
                : {}),
        });
    }
    return params;
}

/**
 * Convert a kebab-case or space-separated name into camelCase.
 */
function normalizeActionName(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/ ([a-z])/g, (_, c: string) => c.toUpperCase());
}

/**
 * Naive type inference from a sample value string.
 */
function inferType(sample: string): string {
    if (!sample || sample.startsWith('-')) {
        return 'string';
    }
    if (sample === 'true' || sample === 'false') {
        return 'boolean';
    }
    if (/^\d+$/.test(sample)) {
        return 'number';
    }
    if (sample.startsWith('{') || sample.startsWith('[')) {
        return 'object';
    }
    return 'string';
}

// ─── SkillIntrospector ───────────────────────────────────────────────

/**
 * Singleton service that discovers and introspects AI-ley skills
 * from the workspace filesystem.
 */
export class SkillIntrospector {
    private static instance: SkillIntrospector | undefined;

    private readonly logger: Logger;

    private constructor() {
        this.logger = Logger.getInstance();
    }

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): SkillIntrospector {
        if (!SkillIntrospector.instance) {
            SkillIntrospector.instance = new SkillIntrospector();
        }
        return SkillIntrospector.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        SkillIntrospector.instance = undefined;
    }

    // ── Public API ───────────────────────────────────────────────

    /**
     * Scan the workspace for skill directories containing SKILL.md.
     *
     * @param workspacePath - Absolute path to the workspace root.
     * @returns An array of fully-introspected {@link DiscoveredSkill} entries.
     */
    public async scanWorkspace(
        workspacePath: string,
    ): Promise<DiscoveredSkill[]> {
        this.logger.info('Scanning workspace for skills', {
            component: 'SkillIntrospector',
            workspacePath,
        });

        const discovered: DiscoveredSkill[] = [];

        for (const relDir of SKILL_SEARCH_DIRS) {
            const skillsRoot = path.join(workspacePath, relDir);
            const exists = await this.pathExists(skillsRoot);
            if (!exists) {
                continue;
            }

            const entries = await fs.promises.readdir(skillsRoot, {
                withFileTypes: true,
            });

            for (const entry of entries) {
                if (!entry.isDirectory()) {
                    continue;
                }
                const skillDir = path.join(skillsRoot, entry.name);
                const skillMdPath = path.join(skillDir, 'SKILL.md');
                const hasMd = await this.pathExists(skillMdPath);
                if (!hasMd) {
                    continue;
                }

                try {
                    const skill = await this.introspectSkill(skillMdPath);
                    discovered.push(skill);
                } catch (err) {
                    this.logger.warn(
                        `Failed to introspect skill at ${skillMdPath}`,
                        {
                            component: 'SkillIntrospector',
                            error: err instanceof Error ? err.message : String(err),
                        },
                    );
                }
            }
        }

        this.logger.info(
            `Discovered ${discovered.length} skill(s)`,
            { component: 'SkillIntrospector' },
        );
        return discovered;
    }

    /**
     * Parse a single SKILL.md file and return a {@link DiscoveredSkill}.
     *
     * @param skillPath - Absolute path to the SKILL.md file.
     */
    public async introspectSkill(skillPath: string): Promise<DiscoveredSkill> {
        const content = await fs.promises.readFile(skillPath, 'utf-8');
        const metadata = this.extractMetadata(content, skillPath);
        const actions = parseActions(content);

        const skillDir = path.dirname(skillPath);

        this.logger.debug(
            `Introspected skill "${metadata.name}" — ${actions.length} action(s)`,
            { component: 'SkillIntrospector', skillId: metadata.id },
        );

        return {
            id: metadata.id,
            name: metadata.name,
            category: extractCategory(metadata.name),
            description: metadata.description,
            path: skillDir,
            actions,
        };
    }

    // ── Private helpers ──────────────────────────────────────────

    /**
     * Extract {@link SkillMetadata} from SKILL.md frontmatter + heading.
     */
    private extractMetadata(
        content: string,
        filePath: string,
    ): SkillMetadata {
        const fm = parseFrontmatter(content);

        const rawName =
            (typeof fm['name'] === 'string' ? fm['name'] : undefined) ??
            path.basename(path.dirname(filePath));

        const rawId =
            (typeof fm['id'] === 'string' && fm['id'] !== ''
                ? fm['id']
                : undefined) ?? rawName;

        const description =
            (typeof fm['description'] === 'string'
                ? fm['description']
                : undefined) ?? '';

        const keywords = Array.isArray(fm['keywords'])
            ? fm['keywords']
            : [];

        const tools = Array.isArray(fm['tools']) ? fm['tools'] : [];

        return {
            id: rawId,
            name: rawName,
            description,
            keywords,
            tools,
        };
    }

    /**
     * Check whether a path exists on disk.
     */
    private async pathExists(p: string): Promise<boolean> {
        try {
            await fs.promises.access(p);
            return true;
        } catch {
            return false;
        }
    }
}
