/**
 * Skill Registration Manager
 *
 * Orchestrates skill auto-discovery, MCP registration, Swagger generation,
 * platform adapter stubs, and skill index management.
 *
 * Part of AICC-0035: Skills Development Program
 *   - AICC-0342: Generate MCP tool wrappers for discovered skills
 *   - AICC-0343: Generate Swagger/OpenAPI files per skill
 *   - AICC-0344: Build skill registration lifecycle
 *   - AICC-0426: Create Slack skill adapter stub
 *   - AICC-0427: Create Teams/SharePoint skill adapter stub
 *   - AICC-0428: Create remaining dev tools skill stubs
 *   - AICC-0429: Generate skill index entries
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EventBus } from './eventBus';
import { EventChannels } from '../types/events';
import { SkillIntrospector } from './skillIntrospector';
import { SkillMcpFactory } from './skillMcpFactory';
import { SkillSwaggerGenerator } from './skillSwaggerGenerator';
import type { DiscoveredSkill } from './skillIntrospector';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Represents a skill that has been registered through the lifecycle.
 */
export interface SkillRegistration {
    /** Unique skill name identifier */
    skillName: string;
    /** ISO timestamp of registration */
    registeredAt: string;
    /** Current status */
    status: 'active' | 'inactive' | 'error';
    /** Number of MCP tools generated for this skill */
    mcpToolCount: number;
    /** Whether a Swagger/OpenAPI spec was generated */
    swaggerGenerated: boolean;
    /** ISO timestamp of last health check */
    lastHealthCheck?: string;
}

/**
 * Platform adapter definition for a skill.
 */
export interface SkillAdapter {
    /** Skill name this adapter wraps */
    skillName: string;
    /** Target platform */
    platform: 'slack' | 'teams' | 'sharepoint' | 'devtools';
    /** Whether this is a full implementation or a stub */
    adapterType: 'full' | 'stub';
    /** Capabilities exposed through this adapter */
    capabilities: string[];
}

/**
 * An entry in the skill index for discovery and cataloging.
 */
export interface SkillIndexEntry {
    /** Skill name */
    name: string;
    /** Human-readable description */
    description: string;
    /** Version string */
    version: string;
    /** Platform category (e.g. "tools", "com", "soc") */
    platform: string;
    /** List of capabilities */
    capabilities: string[];
    /** Generated MCP tool names */
    mcpTools: string[];
    /** Current status */
    status: string;
}

/**
 * Summary of the lifecycle state.
 */
export interface LifecycleSummary {
    /** Total registrations (all statuses) */
    total: number;
    /** Active registrations */
    active: number;
    /** Inactive registrations */
    inactive: number;
    /** Error registrations */
    error: number;
    /** Number of adapters created */
    adapters: number;
    /** Number of index entries generated */
    indexEntries: number;
}

// ─── SkillRegistrationManager ────────────────────────────────────────

/**
 * Singleton manager that orchestrates the full skill registration
 * lifecycle: discovery → MCP tool generation → Swagger generation →
 * adapter creation → index persistence.
 */
export class SkillRegistrationManager {
    private static instance: SkillRegistrationManager | undefined;

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly introspector: SkillIntrospector;
    private readonly mcpFactory: SkillMcpFactory;
    private readonly swaggerGenerator: SkillSwaggerGenerator;

    /** skillName → SkillRegistration */
    private readonly registrations = new Map<string, SkillRegistration>();

    /** Platform adapters created in this session */
    private readonly adapters: SkillAdapter[] = [];

    /** Path to the skill index file (relative to workspace root) */
    private static readonly INDEX_FILE = '.project/SKILL-INDEX.json';

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.introspector = SkillIntrospector.getInstance();
        this.mcpFactory = SkillMcpFactory.getInstance();
        this.swaggerGenerator = SkillSwaggerGenerator.getInstance();
    }

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): SkillRegistrationManager {
        if (!SkillRegistrationManager.instance) {
            SkillRegistrationManager.instance = new SkillRegistrationManager();
        }
        return SkillRegistrationManager.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        SkillRegistrationManager.instance = undefined;
    }

    // ── Auto-Discovery & Registration (AICC-0342) ───────────────

    /**
     * Scan the workspace for skills, generate MCP tool wrappers,
     * generate Swagger specs, and register each skill.
     *
     * @returns Array of registrations for all discovered skills
     */
    public async autoDiscoverAndRegister(): Promise<SkillRegistration[]> {
        this.logger.info('Starting auto-discovery and registration of skills', {
            component: 'SkillRegistrationManager',
        });

        const results: SkillRegistration[] = [];

        try {
            // 1. Discover skills via introspector
            const workspacePath = this.getWorkspacePath();
            if (!workspacePath) {
                this.logger.warn('No workspace folder available for skill discovery', {
                    component: 'SkillRegistrationManager',
                });
                return results;
            }
            const discovered = await this.introspector.scanWorkspace(workspacePath);

            this.logger.info(`Discovered ${discovered.length} skill(s)`, {
                component: 'SkillRegistrationManager',
            });

            // 2. Register each skill
            for (const skill of discovered) {
                try {
                    const registration = await this.registerSkill(skill.name, skill);
                    results.push(registration);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    this.logger.error(`Failed to register skill "${skill.name}": ${msg}`, {
                        component: 'SkillRegistrationManager',
                        skillName: skill.name,
                        error: msg,
                    });

                    const failedReg: SkillRegistration = {
                        skillName: skill.name,
                        registeredAt: new Date().toISOString(),
                        status: 'error',
                        mcpToolCount: 0,
                        swaggerGenerated: false,
                    };
                    this.registrations.set(skill.name, failedReg);
                    results.push(failedReg);
                }
            }

            this.logger.info(
                `Auto-registration complete: ${results.filter((r) => r.status === 'active').length}/${results.length} active`,
                { component: 'SkillRegistrationManager' },
            );
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Auto-discovery failed: ${msg}`, {
                component: 'SkillRegistrationManager',
                error: msg,
            });
        }

        return results;
    }

    // ── Individual Registration (AICC-0344) ─────────────────────

    /**
     * Register a single skill by name.
     *
     * Performs:
     * 1. Metadata lookup via introspector
     * 2. MCP tool wrapper generation via factory
     * 3. Swagger/OpenAPI spec generation
     * 4. EventBus notification
     *
     * @param skillName - The skill name to register
     * @param discoveredSkill - Optional pre-discovered skill (avoids re-scan)
     * @returns The created registration
     */
    public async registerSkill(
        skillName: string,
        discoveredSkill?: DiscoveredSkill,
    ): Promise<SkillRegistration> {
        this.logger.info(`Registering skill "${skillName}"`, {
            component: 'SkillRegistrationManager',
            skillName,
        });

        // 1. Resolve the discovered skill
        let skill = discoveredSkill;
        if (!skill) {
            const workspacePath = this.getWorkspacePath();
            if (!workspacePath) {
                throw new Error('No workspace folder available for skill discovery');
            }

            const all = await this.introspector.scanWorkspace(workspacePath);
            skill = all.find((s) => s.name === skillName);
            if (!skill) {
                throw new Error(`Skill "${skillName}" not found in workspace`);
            }
        }

        // 2. Generate MCP tool wrappers (AICC-0342)
        let mcpToolCount = 0;
        try {
            const tools = this.mcpFactory.generateToolsFromSkill(skill);
            this.mcpFactory.registerSkill(skill);
            mcpToolCount = tools.length;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`MCP tool generation failed for "${skillName}": ${msg}`, {
                component: 'SkillRegistrationManager',
                skillName,
            });
        }

        // 3. Generate Swagger/OpenAPI spec (AICC-0343)
        let swaggerGenerated = false;
        try {
            this.swaggerGenerator.generateSkillSpec(skill);
            swaggerGenerated = true;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Swagger generation failed for "${skillName}": ${msg}`, {
                component: 'SkillRegistrationManager',
                skillName,
            });
        }

        // 4. Create registration record
        const registration: SkillRegistration = {
            skillName,
            registeredAt: new Date().toISOString(),
            status: 'active',
            mcpToolCount,
            swaggerGenerated,
            lastHealthCheck: new Date().toISOString(),
        };

        this.registrations.set(skillName, registration);

        // 5. Emit event
        this.eventBus
            .emit(EventChannels.Skill.Registered, {
                timestamp: Date.now(),
                source: 'SkillRegistrationManager',
                skillId: skill.id,
                name: skillName,
                action: 'registered',
            })
            .catch(() => { /* best-effort */ });

        this.logger.info(
            `Skill "${skillName}" registered — ${mcpToolCount} MCP tool(s), swagger=${swaggerGenerated}`,
            { component: 'SkillRegistrationManager', skillName },
        );

        return registration;
    }

    /**
     * Unregister a skill by name.
     *
     * Removes the skill from the MCP factory and local registry.
     *
     * @param skillName - The skill name to unregister
     * @returns true if the skill was found and unregistered
     */
    public unregisterSkill(skillName: string): boolean {
        const registration = this.registrations.get(skillName);
        if (!registration) {
            this.logger.warn(`Cannot unregister unknown skill "${skillName}"`, {
                component: 'SkillRegistrationManager',
            });
            return false;
        }

        // Remove from MCP factory
        try {
            this.mcpFactory.unregisterSkill(skillName);
        } catch {
            // May not exist in factory — that's ok
        }

        this.registrations.delete(skillName);

        // Emit event
        this.eventBus
            .emit(EventChannels.Skill.Registered, {
                timestamp: Date.now(),
                source: 'SkillRegistrationManager',
                skillId: skillName,
                name: skillName,
                action: 'unregistered',
            })
            .catch(() => { /* best-effort */ });

        this.logger.info(`Skill "${skillName}" unregistered`, {
            component: 'SkillRegistrationManager',
            skillName,
        });

        return true;
    }

    /**
     * List all current skill registrations.
     *
     * @returns Array of all registrations (active, inactive, error)
     */
    public listRegistrations(): SkillRegistration[] {
        return Array.from(this.registrations.values());
    }

    /**
     * Get a specific skill registration by name.
     *
     * @param skillName - The skill name to look up
     * @returns The registration, or undefined if not found
     */
    public getRegistration(skillName: string): SkillRegistration | undefined {
        return this.registrations.get(skillName);
    }

    // ── Platform Adapters (AICC-0426 / 0427 / 0428) ─────────────

    /**
     * Create a Slack skill adapter stub.
     *
     * Defines the integration surface between AI-ley skills and
     * Slack's Bot/User token APIs (channels, messaging, files, events).
     *
     * @returns The created Slack adapter stub
     */
    public createSlackAdapter(): SkillAdapter {
        const adapter: SkillAdapter = {
            skillName: 'ailey-com-slack',
            platform: 'slack',
            adapterType: 'stub',
            capabilities: [
                'send-message',
                'read-channel',
                'list-channels',
                'upload-file',
                'create-channel',
                'set-topic',
                'add-reaction',
                'schedule-message',
                'manage-webhooks',
                'slash-commands',
                'interactive-modals',
                'event-subscriptions',
                'workflow-automation',
            ],
        };

        this.adapters.push(adapter);

        this.logger.info('Created Slack adapter stub', {
            component: 'SkillRegistrationManager',
            platform: 'slack',
            capabilities: adapter.capabilities.length,
        });

        return adapter;
    }

    /**
     * Create a Teams/SharePoint skill adapter stub.
     *
     * Defines the integration surface between AI-ley skills and
     * Microsoft Teams (messaging, meetings) and SharePoint (documents, lists).
     *
     * @returns The created Teams/SharePoint adapter stub
     */
    public createTeamsAdapter(): SkillAdapter {
        const adapter: SkillAdapter = {
            skillName: 'ailey-com-teams',
            platform: 'teams',
            adapterType: 'stub',
            capabilities: [
                'send-message',
                'read-channel',
                'list-teams',
                'list-channels',
                'create-channel',
                'schedule-meeting',
                'upload-file',
                'adaptive-cards',
                'sharepoint-list-items',
                'sharepoint-upload-document',
                'sharepoint-search',
                'sharepoint-create-page',
                'sharepoint-site-provisioning',
            ],
        };

        this.adapters.push(adapter);

        this.logger.info('Created Teams/SharePoint adapter stub', {
            component: 'SkillRegistrationManager',
            platform: 'teams',
            capabilities: adapter.capabilities.length,
        });

        return adapter;
    }

    /**
     * Create adapter stubs for remaining dev tools skills.
     *
     * Generates stubs for: audio, video, image, translator, data-converter.
     *
     * @returns Array of created dev tools adapter stubs
     */
    public createDevToolsAdapters(): SkillAdapter[] {
        const devToolsDefinitions: Array<{
            skillName: string;
            capabilities: string[];
        }> = [
            {
                skillName: 'ailey-tools-audio',
                capabilities: [
                    'convert-format',
                    'transcribe',
                    'extract-from-video',
                    'slice-silence',
                    'adjust-volume',
                    'merge-tracks',
                    'trim',
                    'metadata-extract',
                ],
            },
            {
                skillName: 'ailey-tools-video',
                capabilities: [
                    'convert-format',
                    'adjust-speed',
                    'add-captions',
                    'crop-resize',
                    'split-join',
                    'extract-frames',
                    'mux-demux-audio',
                    'apply-filters',
                    'batch-process',
                    'stream-record',
                ],
            },
            {
                skillName: 'ailey-tools-image',
                capabilities: [
                    'convert-format',
                    'rotate-crop-resize',
                    'watermark',
                    'color-swap',
                    'metadata-extract',
                    'ocr-extract',
                    'create-animation',
                    'svg-template',
                    'batch-process',
                    'web-scrape',
                ],
            },
            {
                skillName: 'ailey-tools-translator',
                capabilities: [
                    'translate-text',
                    'translate-file',
                    'batch-translate',
                    'detect-language',
                    'list-pairs',
                    'format-preservation',
                ],
            },
            {
                skillName: 'ailey-tools-data-converter',
                capabilities: [
                    'convert-format',
                    'generate-schema',
                    'validate-schema',
                    'crud-operations',
                    'jq-query',
                    'compress-decompress',
                    'stream-process',
                    'chunk-large-files',
                ],
            },
        ];

        const created: SkillAdapter[] = [];

        for (const def of devToolsDefinitions) {
            const adapter: SkillAdapter = {
                skillName: def.skillName,
                platform: 'devtools',
                adapterType: 'stub',
                capabilities: def.capabilities,
            };

            this.adapters.push(adapter);
            created.push(adapter);
        }

        this.logger.info(`Created ${created.length} dev tools adapter stubs`, {
            component: 'SkillRegistrationManager',
            skills: created.map((a) => a.skillName),
        });

        return created;
    }

    // ── Skill Index (AICC-0429) ─────────────────────────────────

    /**
     * Generate an index of all registered skills.
     *
     * Combines registration data, adapter capabilities, and MCP tool
     * names into a flat array suitable for catalog/search use.
     *
     * @returns Array of skill index entries
     */
    public generateSkillIndex(): SkillIndexEntry[] {
        const entries: SkillIndexEntry[] = [];
        const registeredSkills = this.mcpFactory.getRegisteredSkills();

        for (const [_key, registration] of this.registrations) {
            const skillName = registration.skillName;
            const registeredEntry = registeredSkills.get(skillName);

            // Gather capabilities from adapters
            const adapter = this.adapters.find((a) => a.skillName === skillName);
            const capabilities = adapter?.capabilities ?? [];

            // Gather MCP tool names
            const mcpTools = registeredEntry
                ? registeredEntry.tools.map((t) => t.name)
                : [];

            // Extract category/platform from name
            const platform = this.extractPlatform(skillName);

            // Get description from registered entry or fallback
            const description = registeredEntry?.skill.description ?? `${skillName} integration`;

            entries.push({
                name: skillName,
                description,
                version: '1.0.0',
                platform,
                capabilities,
                mcpTools,
                status: registration.status,
            });
        }

        // Also include adapters that aren't in registrations
        for (const adapter of this.adapters) {
            if (!entries.find((e) => e.name === adapter.skillName)) {
                entries.push({
                    name: adapter.skillName,
                    description: `${adapter.skillName} ${adapter.platform} adapter (${adapter.adapterType})`,
                    version: '1.0.0',
                    platform: adapter.platform,
                    capabilities: adapter.capabilities,
                    mcpTools: [],
                    status: adapter.adapterType === 'stub' ? 'stub' : 'active',
                });
            }
        }

        this.logger.info(`Generated skill index with ${entries.length} entries`, {
            component: 'SkillRegistrationManager',
        });

        return entries;
    }

    /**
     * Persist the skill index to `.project/SKILL-INDEX.json`.
     *
     * Uses atomic write (write to temp then rename) for safety.
     *
     * @param entries - Array of skill index entries to persist
     */
    public async saveSkillIndex(entries: SkillIndexEntry[]): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folder — cannot save skill index', {
                component: 'SkillRegistrationManager',
            });
            return;
        }

        const dir = path.join(workspaceFolders[0].uri.fsPath, '.project');
        await fs.promises.mkdir(dir, { recursive: true });

        const filePath = path.join(
            workspaceFolders[0].uri.fsPath,
            SkillRegistrationManager.INDEX_FILE,
        );

        const indexDocument = {
            $schema: 'aicc-skill-index-v1',
            generatedAt: new Date().toISOString(),
            totalSkills: entries.length,
            entries,
        };

        // Atomic write
        const tmpPath = `${filePath}.tmp`;
        await fs.promises.writeFile(
            tmpPath,
            JSON.stringify(indexDocument, null, 2),
            'utf8',
        );
        await fs.promises.rename(tmpPath, filePath);

        this.logger.info(`Saved skill index (${entries.length} entries) to ${SkillRegistrationManager.INDEX_FILE}`, {
            component: 'SkillRegistrationManager',
        });
    }

    // ── Lifecycle Summary ────────────────────────────────────────

    /**
     * Get a summary of the current lifecycle state.
     *
     * @returns Object with counts for total, active, inactive, error,
     *          adapters, and index entries
     */
    public getLifecycleSummary(): LifecycleSummary {
        const all = Array.from(this.registrations.values());
        const index = this.generateSkillIndex();

        return {
            total: all.length,
            active: all.filter((r) => r.status === 'active').length,
            inactive: all.filter((r) => r.status === 'inactive').length,
            error: all.filter((r) => r.status === 'error').length,
            adapters: this.adapters.length,
            indexEntries: index.length,
        };
    }

    // ── Private Helpers ──────────────────────────────────────────

    /**
     * Get the workspace root path from VS Code.
     */
    private getWorkspacePath(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return undefined;
        }
        return workspaceFolders[0].uri.fsPath;
    }

    /**
     * Extract the platform/category segment from a skill name.
     *
     * @example "ailey-tools-image" → "tools"
     * @example "ailey-com-slack" → "com"
     * @example "ailey-soc-twitter" → "soc"
     */
    private extractPlatform(skillName: string): string {
        const match = skillName.match(/^ailey-(\w+)-/);
        if (match) {
            return match[1];
        }

        // Try to infer from known patterns
        if (skillName.includes('tools')) { return 'tools'; }
        if (skillName.includes('com')) { return 'com'; }
        if (skillName.includes('soc')) { return 'soc'; }
        if (skillName.includes('media')) { return 'media'; }
        if (skillName.includes('data')) { return 'data'; }
        if (skillName.includes('admin')) { return 'admin'; }

        return 'general';
    }
}
