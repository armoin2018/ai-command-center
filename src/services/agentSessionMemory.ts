/**
 * Agent Session Memory
 *
 * Persistent memory store for agent sessions with context-based
 * retrieval, relevance scoring, age-based pruning, and export
 * capabilities. Persists to `.project/AGENT-MEMORY.json`.
 *
 * Part of AICC-0153: Agent Session Memory
 *   - AICC-0154: Agent memory store & retrieval
 *     - AICC-0411: Implement memory file service
 *     - AICC-0412: Build context-based retrieval
 *     - AICC-0413: Implement pruning by age/relevance
 *     - AICC-0414: Add schema validation for memory entries
 *   - AICC-0155: Orchestrator integration & memory export
 *     - AICC-0415: Create memory API (MCP tools)
 *     - AICC-0416: Implement export to markdown/JSON
 *
 * REQ-ASM-001 to REQ-ASM-006
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';
import { EventBus } from './eventBus';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single memory entry stored by an agent during a session.
 */
export interface MemoryEntry {
    /** Unique entry identifier (UUID) */
    id: string;
    /** Name of the agent that created this memory */
    agentName: string;
    /** Session identifier for grouping related memories */
    sessionId: string;
    /** Classification of the memory content */
    type: 'decision' | 'context' | 'pattern' | 'error' | 'preference';
    /** The memory content (free-form text) */
    content: string;
    /** Tags for categorisation and retrieval */
    tags: string[];
    /** Relevance score (0–100) for prioritisation */
    relevanceScore: number;
    /** ISO 8601 timestamp when the entry was created */
    createdAt: string;
    /** ISO 8601 timestamp of last retrieval */
    lastAccessedAt: string;
    /** Number of times this entry has been accessed */
    accessCount: number;
    /** Optional structured metadata */
    metadata?: Record<string, any>;
}

/**
 * Query parameters for context-based memory retrieval.
 */
export interface MemoryQuery {
    /** Filter by agent name */
    agentName?: string;
    /** Filter by session ID */
    sessionId?: string;
    /** Filter by memory type */
    type?: MemoryEntry['type'];
    /** Filter by tag inclusion (any match) */
    tags?: string[];
    /** Minimum relevance score threshold */
    minRelevance?: number;
    /** Maximum number of results */
    limit?: number;
    /** Only return entries created after this ISO date */
    since?: string;
}

/**
 * Export structure for memory data.
 */
export interface MemoryExport {
    /** ISO 8601 timestamp of the export */
    exportedAt: string;
    /** Total number of entries in the export */
    entryCount: number;
    /** The exported entries */
    entries: MemoryEntry[];
}

/**
 * Configuration for memory pruning.
 */
export interface MemoryConfig {
    /** Maximum number of entries to retain */
    maxEntries: number;
    /** Remove entries older than this many days */
    pruneAgeDays: number;
    /** Remove entries below this relevance score */
    pruneMinRelevance: number;
    /** Whether to auto-save after mutations */
    autoSave: boolean;
}

// ─── Persistence Shape ───────────────────────────────────────────────

/**
 * On-disk structure stored in `.project/AGENT-MEMORY.json`.
 */
interface MemoryStore {
    /** Schema version for future migration */
    version: number;
    /** All memory entries */
    entries: MemoryEntry[];
    /** ISO 8601 timestamp of last modification */
    lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const COMPONENT = 'AgentSessionMemory';
const MEMORY_DIR = '.project';
const MEMORY_FILE = 'AGENT-MEMORY.json';
const STORE_VERSION = 1;

/** Valid memory entry types */
const VALID_TYPES: MemoryEntry['type'][] = [
    'decision',
    'context',
    'pattern',
    'error',
    'preference',
];

/** Default pruning configuration */
const DEFAULT_CONFIG: MemoryConfig = {
    maxEntries: 5000,
    pruneAgeDays: 90,
    pruneMinRelevance: 10,
    autoSave: true,
};

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton service for persistent agent session memory with
 * context-based retrieval, relevance scoring, and pruning.
 *
 * @example
 * ```ts
 * import { AgentSessionMemory } from '../services/agentSessionMemory';
 *
 * const memory = AgentSessionMemory.getInstance('/workspace');
 *
 * const entry = memory.store({
 *     agentName: 'architect',
 *     sessionId: 'sess-123',
 *     type: 'decision',
 *     content: 'Chose microservices over monolith',
 *     tags: ['architecture', 'design'],
 *     relevanceScore: 85,
 * });
 *
 * const results = memory.recall({ agentName: 'architect', tags: ['design'] });
 * ```
 */
export class AgentSessionMemory {
    // ── Singleton ────────────────────────────────────────────────
    private static instances = new Map<string, AgentSessionMemory>();

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly filePath: string;
    private readonly config: MemoryConfig;
    private entries: MemoryEntry[];

    // ── Construction ─────────────────────────────────────────────

    private constructor(workspacePath: string, config?: Partial<MemoryConfig>) {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.filePath = path.join(workspacePath, MEMORY_DIR, MEMORY_FILE);
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.entries = this.loadMemorySync();
        this.logger.info(
            `AgentSessionMemory initialized (${this.entries.length} entries)`,
            { component: COMPONENT },
        );
    }

    /**
     * Retrieve (or create) the AgentSessionMemory singleton for a workspace.
     *
     * @param workspacePath Root path of the workspace
     * @param config Optional configuration overrides
     * @returns The AgentSessionMemory instance
     */
    public static getInstance(
        workspacePath: string,
        config?: Partial<MemoryConfig>,
    ): AgentSessionMemory {
        const key = path.resolve(workspacePath);
        let instance = AgentSessionMemory.instances.get(key);
        if (!instance) {
            instance = new AgentSessionMemory(workspacePath, config);
            AgentSessionMemory.instances.set(key, instance);
        }
        return instance;
    }

    /**
     * Reset all singleton instances. Primarily for tests.
     */
    public static resetInstances(): void {
        AgentSessionMemory.instances.clear();
    }

    // ── Store (AICC-0411) ────────────────────────────────────────

    /**
     * Store a new memory entry.
     *
     * Auto-generates the `id`, `createdAt`, `lastAccessedAt`, and
     * `accessCount` fields. Persists to disk and emits an event.
     *
     * @param entry Memory entry data (without auto-generated fields)
     * @returns The complete stored memory entry
     */
    public store(
        entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>,
    ): MemoryEntry {
        try {
            const now = new Date().toISOString();
            const record: MemoryEntry = {
                id: crypto.randomUUID(),
                ...entry,
                createdAt: now,
                lastAccessedAt: now,
                accessCount: 0,
            };

            if (!this.validateEntry(record)) {
                throw new Error('Invalid memory entry: schema validation failed');
            }

            this.entries.push(record);

            // Auto-prune if over limit
            if (this.entries.length > this.config.maxEntries) {
                this.logger.info(
                    `Entry count (${this.entries.length}) exceeds max (${this.config.maxEntries}), auto-pruning`,
                    { component: COMPONENT },
                );
                this.prune();
            }

            if (this.config.autoSave) {
                this.saveMemorySync();
            }

            this.eventBus.emit('memory.entry.stored', {
                timestamp: Date.now(),
                source: COMPONENT,
                entryId: record.id,
                agentName: record.agentName,
                type: record.type,
            });

            this.logger.info(
                `Stored memory: ${record.type} by ${record.agentName} (${record.id})`,
                { component: COMPONENT },
            );
            return record;
        } catch (err) {
            this.logger.error('Failed to store memory entry', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Recall (AICC-0412) ───────────────────────────────────────

    /**
     * Retrieve memory entries matching the given query.
     *
     * Filters by agent name, session ID, type, tags, minimum relevance,
     * and recency. Results are sorted by relevance score (descending),
     * then by last-accessed date (most recent first).
     *
     * Accessing an entry increments its `accessCount` and updates
     * `lastAccessedAt`.
     *
     * @param query Retrieval query parameters
     * @returns Matching memory entries, sorted by relevance
     */
    public recall(query: MemoryQuery): MemoryEntry[] {
        try {
            let results = [...this.entries];

            // Filter by agent name
            if (query.agentName) {
                results = results.filter(
                    (e) => e.agentName === query.agentName,
                );
            }

            // Filter by session ID
            if (query.sessionId) {
                results = results.filter(
                    (e) => e.sessionId === query.sessionId,
                );
            }

            // Filter by type
            if (query.type) {
                results = results.filter((e) => e.type === query.type);
            }

            // Filter by tags (any match)
            if (query.tags && query.tags.length > 0) {
                const queryTags = new Set(
                    query.tags.map((t) => t.toLowerCase()),
                );
                results = results.filter((e) =>
                    e.tags.some((t) => queryTags.has(t.toLowerCase())),
                );
            }

            // Filter by minimum relevance
            if (query.minRelevance !== undefined) {
                results = results.filter(
                    (e) => e.relevanceScore >= query.minRelevance!,
                );
            }

            // Filter by date (since)
            if (query.since) {
                const sinceDate = new Date(query.since).getTime();
                results = results.filter(
                    (e) => new Date(e.createdAt).getTime() >= sinceDate,
                );
            }

            // Sort: relevance desc, then lastAccessedAt desc
            results.sort((a, b) => {
                const relDiff = b.relevanceScore - a.relevanceScore;
                if (relDiff !== 0) {
                    return relDiff;
                }
                return (
                    new Date(b.lastAccessedAt).getTime() -
                    new Date(a.lastAccessedAt).getTime()
                );
            });

            // Apply limit
            if (query.limit && query.limit > 0) {
                results = results.slice(0, query.limit);
            }

            // Update access tracking
            const now = new Date().toISOString();
            for (const result of results) {
                const original = this.entries.find((e) => e.id === result.id);
                if (original) {
                    original.accessCount++;
                    original.lastAccessedAt = now;
                }
            }

            if (results.length > 0 && this.config.autoSave) {
                this.saveMemorySync();
            }

            this.logger.debug(
                `Recalled ${results.length} entries for query`,
                { component: COMPONENT },
            );

            return results;
        } catch (err) {
            this.logger.error('Failed to recall memory entries', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    /**
     * Get a single memory entry by ID.
     *
     * @param id The entry ID
     * @returns The entry, or `undefined` if not found
     */
    public getEntry(id: string): MemoryEntry | undefined {
        return this.entries.find((e) => e.id === id);
    }

    // ── Relevance (AICC-0412) ────────────────────────────────────

    /**
     * Adjust the relevance score of a memory entry by a delta.
     *
     * The score is clamped to the range [0, 100].
     *
     * @param id The entry ID
     * @param delta Positive or negative adjustment
     */
    public updateRelevance(id: string, delta: number): void {
        try {
            const entry = this.entries.find((e) => e.id === id);
            if (!entry) {
                throw new Error(`Memory entry not found: ${id}`);
            }

            entry.relevanceScore = Math.max(
                0,
                Math.min(100, entry.relevanceScore + delta),
            );

            if (this.config.autoSave) {
                this.saveMemorySync();
            }

            this.logger.debug(
                `Updated relevance for ${id}: ${entry.relevanceScore} (delta=${delta})`,
                { component: COMPONENT },
            );
        } catch (err) {
            this.logger.error(`Failed to update relevance for ${id}`, {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Pruning (AICC-0413) ──────────────────────────────────────

    /**
     * Remove old or low-relevance memory entries.
     *
     * Pruning criteria (configurable):
     * - Entries older than `pruneAgeDays`
     * - Entries with relevance below `pruneMinRelevance`
     * - Excess entries beyond `maxEntries` (lowest relevance first)
     *
     * @param config Optional configuration overrides for this prune
     * @returns Number of entries pruned
     */
    public prune(config?: Partial<MemoryConfig>): number {
        try {
            const cfg = { ...this.config, ...config };
            const before = this.entries.length;
            const now = Date.now();
            const maxAgeMs = cfg.pruneAgeDays * 24 * 60 * 60 * 1000;

            // Remove by age
            this.entries = this.entries.filter((e) => {
                const ageMs = now - new Date(e.createdAt).getTime();
                return ageMs < maxAgeMs;
            });

            // Remove by min relevance
            this.entries = this.entries.filter(
                (e) => e.relevanceScore >= cfg.pruneMinRelevance,
            );

            // Enforce max entries (keep highest relevance)
            if (this.entries.length > cfg.maxEntries) {
                this.entries.sort(
                    (a, b) => b.relevanceScore - a.relevanceScore,
                );
                this.entries = this.entries.slice(0, cfg.maxEntries);
            }

            const pruned = before - this.entries.length;

            if (pruned > 0) {
                this.saveMemorySync();

                this.eventBus.emit('memory.pruned', {
                    timestamp: Date.now(),
                    source: COMPONENT,
                    prunedCount: pruned,
                    remaining: this.entries.length,
                });

                this.logger.info(
                    `Pruned ${pruned} memory entries (${this.entries.length} remaining)`,
                    { component: COMPONENT },
                );
            }

            return pruned;
        } catch (err) {
            this.logger.error('Failed to prune memory', {
                component: COMPONENT,
                error: err,
            });
            return 0;
        }
    }

    // ── Export (AICC-0416) ────────────────────────────────────────

    /**
     * Export all memory entries as a JSON structure.
     *
     * @returns Export object with metadata and entries
     */
    public exportToJson(): MemoryExport {
        return {
            exportedAt: new Date().toISOString(),
            entryCount: this.entries.length,
            entries: [...this.entries],
        };
    }

    /**
     * Export memory entries as formatted Markdown, grouped by agent
     * and session.
     *
     * @returns Markdown string
     */
    public exportToMarkdown(): string {
        const lines: string[] = [
            '# Agent Session Memory Export',
            '',
            `> Exported at ${new Date().toISOString()}`,
            `> Total entries: ${this.entries.length}`,
            '',
        ];

        // Group by agent
        const byAgent = new Map<string, MemoryEntry[]>();
        for (const entry of this.entries) {
            const agent = entry.agentName;
            if (!byAgent.has(agent)) {
                byAgent.set(agent, []);
            }
            byAgent.get(agent)!.push(entry);
        }

        for (const [agentName, agentEntries] of byAgent) {
            lines.push(`## Agent: ${agentName}`);
            lines.push('');

            // Group by session within agent
            const bySession = new Map<string, MemoryEntry[]>();
            for (const entry of agentEntries) {
                const sid = entry.sessionId;
                if (!bySession.has(sid)) {
                    bySession.set(sid, []);
                }
                bySession.get(sid)!.push(entry);
            }

            for (const [sessionId, sessionEntries] of bySession) {
                lines.push(`### Session: ${sessionId}`);
                lines.push('');

                // Sort by creation time
                sessionEntries.sort(
                    (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                );

                for (const entry of sessionEntries) {
                    const typeEmoji = this.typeEmoji(entry.type);
                    lines.push(
                        `- ${typeEmoji} **[${entry.type}]** (relevance: ${entry.relevanceScore}) — ${entry.content}`,
                    );
                    if (entry.tags.length > 0) {
                        lines.push(
                            `  - Tags: ${entry.tags.map((t) => '`' + t + '`').join(', ')}`,
                        );
                    }
                    lines.push(
                        `  - Created: ${entry.createdAt} | Accessed: ${entry.accessCount} times`,
                    );
                    lines.push('');
                }
            }
        }

        return lines.join('\n');
    }

    /**
     * Import memory entries from a JSON export.
     *
     * Skips entries whose IDs already exist. Validates each entry
     * before import.
     *
     * @param data The export data to import
     * @returns Number of entries successfully imported
     */
    public importFromJson(data: MemoryExport): number {
        try {
            if (!data || !Array.isArray(data.entries)) {
                throw new Error('Invalid import data: missing entries array');
            }

            const existingIds = new Set(this.entries.map((e) => e.id));
            let imported = 0;

            for (const entry of data.entries) {
                if (existingIds.has(entry.id)) {
                    continue; // Skip duplicates
                }
                if (!this.validateEntry(entry)) {
                    this.logger.warn(
                        `Skipping invalid import entry: ${entry.id}`,
                        { component: COMPONENT },
                    );
                    continue;
                }
                this.entries.push(entry);
                imported++;
            }

            if (imported > 0) {
                this.saveMemorySync();
                this.logger.info(
                    `Imported ${imported} memory entries`,
                    { component: COMPONENT },
                );
            }

            return imported;
        } catch (err) {
            this.logger.error('Failed to import memory entries', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Validation (AICC-0414) ───────────────────────────────────

    /**
     * Validate a memory entry against the expected schema.
     *
     * Checks required fields, types, and value constraints.
     *
     * @param entry The entry to validate
     * @returns `true` if the entry is valid
     */
    public validateEntry(entry: any): boolean {
        if (!entry || typeof entry !== 'object') {
            return false;
        }

        // Required string fields
        const stringFields = ['id', 'agentName', 'sessionId', 'content', 'createdAt', 'lastAccessedAt'];
        for (const field of stringFields) {
            if (typeof entry[field] !== 'string' || entry[field] === '') {
                return false;
            }
        }

        // Type must be valid
        if (!VALID_TYPES.includes(entry.type)) {
            return false;
        }

        // Tags must be string array
        if (!Array.isArray(entry.tags) || !entry.tags.every((t: any) => typeof t === 'string')) {
            return false;
        }

        // Relevance score must be a number 0–100
        if (
            typeof entry.relevanceScore !== 'number' ||
            entry.relevanceScore < 0 ||
            entry.relevanceScore > 100
        ) {
            return false;
        }

        // Access count must be a non-negative number
        if (typeof entry.accessCount !== 'number' || entry.accessCount < 0) {
            return false;
        }

        // Metadata, if present, must be an object
        if (entry.metadata !== undefined && (typeof entry.metadata !== 'object' || entry.metadata === null)) {
            return false;
        }

        return true;
    }

    // ── Summaries ────────────────────────────────────────────────

    /**
     * Get a summary of a specific session.
     *
     * @param sessionId The session ID to summarise
     * @returns Summary with entry count, types, agents, and top tags
     */
    public getSessionSummary(sessionId: string): {
        entryCount: number;
        types: Record<string, number>;
        agents: string[];
        topTags: Array<{ tag: string; count: number }>;
    } {
        const sessionEntries = this.entries.filter(
            (e) => e.sessionId === sessionId,
        );

        const types: Record<string, number> = {};
        const agentSet = new Set<string>();
        const tagCounts = new Map<string, number>();

        for (const entry of sessionEntries) {
            types[entry.type] = (types[entry.type] || 0) + 1;
            agentSet.add(entry.agentName);
            for (const tag of entry.tags) {
                tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            }
        }

        const topTags = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));

        return {
            entryCount: sessionEntries.length,
            types,
            agents: [...agentSet],
            topTags,
        };
    }

    /**
     * Get a global summary of all memory entries.
     *
     * @returns Summary with totals, agent list, session count, and avg relevance
     */
    public getSummary(): {
        totalEntries: number;
        agents: string[];
        sessions: number;
        avgRelevance: number;
    } {
        const agentSet = new Set<string>();
        const sessionSet = new Set<string>();
        let relevanceSum = 0;

        for (const entry of this.entries) {
            agentSet.add(entry.agentName);
            sessionSet.add(entry.sessionId);
            relevanceSum += entry.relevanceScore;
        }

        return {
            totalEntries: this.entries.length,
            agents: [...agentSet],
            sessions: sessionSet.size,
            avgRelevance:
                this.entries.length > 0
                    ? Math.round((relevanceSum / this.entries.length) * 100) / 100
                    : 0,
        };
    }

    // ── Private: Persistence (AICC-0411) ─────────────────────────

    /**
     * Load memory entries from `.project/AGENT-MEMORY.json`.
     * Returns an empty array if the file does not exist or is malformed.
     */
    private loadMemorySync(): MemoryEntry[] {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed: unknown = JSON.parse(raw);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    Array.isArray((parsed as MemoryStore).entries)
                ) {
                    this.logger.info(
                        `Loaded ${(parsed as MemoryStore).entries.length} memory entries`,
                        { component: COMPONENT },
                    );
                    return (parsed as MemoryStore).entries;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(
                `Failed to load AGENT-MEMORY.json, starting fresh: ${msg}`,
                { component: COMPONENT },
            );
        }
        return [];
    }

    /**
     * Persist memory entries atomically via temp-file + rename.
     */
    private saveMemorySync(): void {
        const dir = path.dirname(this.filePath);

        const store: MemoryStore = {
            version: STORE_VERSION,
            entries: this.entries,
            lastUpdated: new Date().toISOString(),
        };

        const data = JSON.stringify(store, null, 2);
        const tmpPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;

        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(tmpPath, data, 'utf-8');
            fs.renameSync(tmpPath, this.filePath);
        } catch (err) {
            this.logger.error('Failed to save agent session memory', {
                component: COMPONENT,
                error: err instanceof Error ? err.message : String(err),
            });
            try {
                if (fs.existsSync(tmpPath)) {
                    fs.unlinkSync(tmpPath);
                }
            } catch {
                // Ignore cleanup failure
            }
        }
    }

    // ── Private: Helpers ─────────────────────────────────────────

    /**
     * Map memory type to an emoji for markdown export.
     */
    private typeEmoji(type: MemoryEntry['type']): string {
        switch (type) {
            case 'decision':
                return '🔷';
            case 'context':
                return '📋';
            case 'pattern':
                return '🔄';
            case 'error':
                return '❌';
            case 'preference':
                return '⭐';
            default:
                return '📝';
        }
    }
}
