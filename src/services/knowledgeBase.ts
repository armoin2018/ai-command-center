/**
 * Cross-Workspace Knowledge Base
 *
 * Global knowledge store persisted at `~/.aicc/knowledge/` for sharing
 * patterns, solutions, gotchas, configs, and references across all
 * workspaces. Includes fuzzy search, tag-based filtering, deduplication,
 * and AI extraction prompt generation.
 *
 * Part of AICC-0156: Cross-Workspace Knowledge Base
 *   - AICC-0157: Knowledge store & extraction
 *     - AICC-0417: Implement global knowledge file service
 *     - AICC-0418: Build extraction prompts for knowledge capture
 *     - AICC-0419: Add Version Override integration
 *   - AICC-0158: Knowledge search & deduplication
 *     - AICC-0420: Implement search service (fuzzy + tag-based)
 *     - AICC-0421: Build deduplication logic
 *
 * REQ-CWKB-001 to REQ-CWKB-006
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';
import { getPlatformInfo } from '../utils/platformInfo';
import { EventBus } from './eventBus';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single knowledge entry in the global knowledge base.
 */
export interface KnowledgeEntry {
    /** Unique entry identifier (UUID) */
    id: string;
    /** Short descriptive title */
    title: string;
    /** The knowledge content (free-form text / markdown) */
    content: string;
    /** Where this knowledge originated (e.g. file path, URL, agent) */
    source: string;
    /** Workspace path where this knowledge was captured */
    sourceWorkspace?: string;
    /** Classification category */
    category: 'pattern' | 'solution' | 'gotcha' | 'config' | 'reference';
    /** Tags for categorisation and search */
    tags: string[];
    /** Confidence score (0–100) indicating reliability */
    confidence: number;
    /** ISO 8601 timestamp when the entry was created */
    createdAt: string;
    /** ISO 8601 timestamp of the last update */
    updatedAt: string;
    /** Number of times this entry has been used / referenced */
    usageCount: number;
    /** Version number, incremented on each update */
    version: number;
}

/**
 * Query parameters for knowledge search.
 */
export interface KnowledgeQuery {
    /** Free-text search (fuzzy matched against title and content) */
    text?: string;
    /** Filter by category */
    category?: KnowledgeEntry['category'];
    /** Filter by tags (any match) */
    tags?: string[];
    /** Minimum confidence threshold */
    minConfidence?: number;
    /** Maximum number of results */
    limit?: number;
}

/**
 * Represents a detected duplicate pair.
 */
export interface KnowledgeDuplicate {
    /** ID of the existing entry */
    entryId: string;
    /** ID of the potential duplicate */
    duplicateId: string;
    /** Similarity score (0–1) */
    similarity: number;
}

// ─── Persistence Shape ───────────────────────────────────────────────

/**
 * On-disk structure stored in `~/.aicc/knowledge/knowledge.json`.
 */
interface KnowledgeStore {
    /** Schema version for future migration */
    version: number;
    /** All knowledge entries */
    entries: KnowledgeEntry[];
    /** ISO 8601 timestamp of last modification */
    lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const COMPONENT = 'KnowledgeBase';
const KNOWLEDGE_DIR_NAME = '.aicc/knowledge';
const KNOWLEDGE_FILE = 'knowledge.json';
const STORE_VERSION = 1;

/** Valid knowledge categories */
const VALID_CATEGORIES: KnowledgeEntry['category'][] = [
    'pattern',
    'solution',
    'gotcha',
    'config',
    'reference',
];

/** Minimum similarity score to flag as duplicate */
const DUPLICATE_THRESHOLD = 0.7;

/** N-gram size for fuzzy matching */
const NGRAM_SIZE = 3;

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton global knowledge base that persists patterns, solutions,
 * and references at `~/.aicc/knowledge/` for cross-workspace sharing.
 *
 * @example
 * ```ts
 * import { KnowledgeBase } from '../services/knowledgeBase';
 *
 * const kb = KnowledgeBase.getInstance();
 *
 * const entry = kb.store({
 *     title: 'Atomic file writes in Node.js',
 *     content: 'Use temp file + rename for atomic writes...',
 *     source: 'architect-agent',
 *     category: 'pattern',
 *     tags: ['node', 'filesystem', 'atomic'],
 *     confidence: 90,
 * });
 *
 * const results = kb.search({ text: 'atomic write', tags: ['node'] });
 * ```
 */
export class KnowledgeBase {
    // ── Singleton ────────────────────────────────────────────────
    private static instance: KnowledgeBase | undefined;

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly knowledgeDir: string;
    private readonly filePath: string;
    private entries: KnowledgeEntry[];

    // ── Construction ─────────────────────────────────────────────

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.knowledgeDir = path.join(getPlatformInfo().homeDir, KNOWLEDGE_DIR_NAME);
        this.filePath = path.join(this.knowledgeDir, KNOWLEDGE_FILE);
        this.entries = this.loadEntriesSync();
        this.logger.info(
            `KnowledgeBase initialized (${this.entries.length} entries) at ${this.knowledgeDir}`,
            { component: COMPONENT },
        );
    }

    /**
     * Retrieve (or create) the global KnowledgeBase singleton.
     *
     * @returns The KnowledgeBase instance
     */
    public static getInstance(): KnowledgeBase {
        if (!KnowledgeBase.instance) {
            KnowledgeBase.instance = new KnowledgeBase();
        }
        return KnowledgeBase.instance;
    }

    /**
     * Reset the singleton instance. Primarily for tests.
     */
    public static resetInstance(): void {
        KnowledgeBase.instance = undefined;
    }

    // ── Store (AICC-0417) ────────────────────────────────────────

    /**
     * Store a new knowledge entry.
     *
     * Auto-generates `id`, `createdAt`, `updatedAt`, `usageCount`,
     * and `version` fields. Persists to disk and emits an event.
     *
     * @param entry Entry data (without auto-generated fields)
     * @returns The complete stored knowledge entry
     */
    public store(
        entry: Omit<KnowledgeEntry, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'version'>,
    ): KnowledgeEntry {
        try {
            if (!VALID_CATEGORIES.includes(entry.category)) {
                throw new Error(
                    `Invalid category: ${entry.category}. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
                );
            }

            const now = new Date().toISOString();
            const record: KnowledgeEntry = {
                id: crypto.randomUUID(),
                ...entry,
                createdAt: now,
                updatedAt: now,
                usageCount: 0,
                version: 1,
            };

            this.entries.push(record);
            this.saveEntriesSync();

            this.eventBus.emit('knowledge.entry.stored', {
                timestamp: Date.now(),
                source: COMPONENT,
                entryId: record.id,
                title: record.title,
                category: record.category,
            });

            this.logger.info(
                `Stored knowledge: "${record.title}" [${record.category}] (${record.id})`,
                { component: COMPONENT },
            );
            return record;
        } catch (err) {
            this.logger.error('Failed to store knowledge entry', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Search (AICC-0420) ───────────────────────────────────────

    /**
     * Search the knowledge base with fuzzy text matching and
     * tag-based filtering.
     *
     * Results are scored by a combination of text similarity,
     * tag overlap, and confidence. Sorted by score descending.
     *
     * @param query Search parameters
     * @returns Matching entries sorted by relevance
     */
    public search(query: KnowledgeQuery): KnowledgeEntry[] {
        try {
            let results = [...this.entries];

            // Filter by category
            if (query.category) {
                results = results.filter(
                    (e) => e.category === query.category,
                );
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

            // Filter by minimum confidence
            if (query.minConfidence !== undefined) {
                results = results.filter(
                    (e) => e.confidence >= query.minConfidence!,
                );
            }

            // Fuzzy text search and scoring
            if (query.text && query.text.trim().length > 0) {
                const searchText = query.text.toLowerCase().trim();

                const scored = results.map((entry) => {
                    const titleSim = this.fuzzyMatch(
                        entry.title.toLowerCase(),
                        searchText,
                    );
                    const contentSim = this.fuzzyMatch(
                        entry.content.toLowerCase(),
                        searchText,
                    );
                    // Title matches weighted more heavily
                    const textScore = titleSim * 0.6 + contentSim * 0.4;
                    // Tag overlap bonus
                    const tagBonus = query.tags
                        ? this.tagOverlapScore(entry.tags, query.tags) * 0.2
                        : 0;
                    // Confidence factor
                    const confFactor = entry.confidence / 100;

                    const score = textScore * 0.7 + tagBonus + confFactor * 0.1;
                    return { entry, score };
                });

                // Filter out very low scores
                const filtered = scored.filter((s) => s.score > 0.05);

                // Sort by score descending
                filtered.sort((a, b) => b.score - a.score);

                results = filtered.map((s) => s.entry);
            } else {
                // No text query — sort by confidence then recency
                results.sort((a, b) => {
                    const confDiff = b.confidence - a.confidence;
                    if (confDiff !== 0) {
                        return confDiff;
                    }
                    return (
                        new Date(b.updatedAt).getTime() -
                        new Date(a.updatedAt).getTime()
                    );
                });
            }

            // Apply limit
            if (query.limit && query.limit > 0) {
                results = results.slice(0, query.limit);
            }

            // Update usage counts for returned results
            for (const result of results) {
                const original = this.entries.find(
                    (e) => e.id === result.id,
                );
                if (original) {
                    original.usageCount++;
                }
            }

            if (results.length > 0) {
                this.saveEntriesSync();
            }

            this.logger.debug(
                `Search returned ${results.length} results`,
                { component: COMPONENT },
            );

            return results;
        } catch (err) {
            this.logger.error('Knowledge search failed', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    /**
     * Get a single knowledge entry by ID.
     *
     * @param id The entry ID
     * @returns The entry, or `undefined` if not found
     */
    public getEntry(id: string): KnowledgeEntry | undefined {
        return this.entries.find((e) => e.id === id);
    }

    // ── Update (AICC-0419) ───────────────────────────────────────

    /**
     * Update an existing knowledge entry with versioning.
     *
     * Increments the version number and updates the `updatedAt` timestamp.
     *
     * @param id The entry ID to update
     * @param updates Partial entry data to merge
     * @returns The updated entry
     * @throws Error if the entry is not found
     */
    public updateEntry(
        id: string,
        updates: Partial<KnowledgeEntry>,
    ): KnowledgeEntry {
        try {
            const entry = this.entries.find((e) => e.id === id);
            if (!entry) {
                throw new Error(`Knowledge entry not found: ${id}`);
            }

            // Apply updates (excluding immutable fields)
            const { id: _id, createdAt: _ca, ...safeUpdates } = updates;

            if (safeUpdates.category && !VALID_CATEGORIES.includes(safeUpdates.category)) {
                throw new Error(
                    `Invalid category: ${safeUpdates.category}`,
                );
            }

            Object.assign(entry, safeUpdates);
            entry.version++;
            entry.updatedAt = new Date().toISOString();

            this.saveEntriesSync();

            this.eventBus.emit('knowledge.entry.updated', {
                timestamp: Date.now(),
                source: COMPONENT,
                entryId: entry.id,
                version: entry.version,
            });

            this.logger.info(
                `Updated knowledge: "${entry.title}" (v${entry.version})`,
                { component: COMPONENT },
            );
            return entry;
        } catch (err) {
            this.logger.error(`Failed to update knowledge entry ${id}`, {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    /**
     * Delete a knowledge entry by ID.
     *
     * @param id The entry ID to delete
     * @returns `true` if the entry was found and deleted
     */
    public deleteEntry(id: string): boolean {
        const idx = this.entries.findIndex((e) => e.id === id);
        if (idx === -1) {
            return false;
        }

        const removed = this.entries.splice(idx, 1)[0];
        this.saveEntriesSync();

        this.eventBus.emit('knowledge.entry.deleted', {
            timestamp: Date.now(),
            source: COMPONENT,
            entryId: removed.id,
            title: removed.title,
        });

        this.logger.info(
            `Deleted knowledge: "${removed.title}" (${removed.id})`,
            { component: COMPONENT },
        );
        return true;
    }

    // ── Deduplication (AICC-0421) ────────────────────────────────

    /**
     * Detect potential duplicates of a given entry in the knowledge base.
     *
     * Uses n-gram–based fuzzy matching on title and content to find
     * entries with similarity above the threshold.
     *
     * @param entry The entry to check for duplicates
     * @returns Array of duplicate pairs with similarity scores
     */
    public detectDuplicates(entry: KnowledgeEntry): KnowledgeDuplicate[] {
        try {
            const duplicates: KnowledgeDuplicate[] = [];
            const entryText = `${entry.title} ${entry.content}`.toLowerCase();

            for (const existing of this.entries) {
                if (existing.id === entry.id) {
                    continue;
                }

                const existingText = `${existing.title} ${existing.content}`.toLowerCase();
                const similarity = this.fuzzyMatch(entryText, existingText);

                if (similarity >= DUPLICATE_THRESHOLD) {
                    duplicates.push({
                        entryId: existing.id,
                        duplicateId: entry.id,
                        similarity: Math.round(similarity * 1000) / 1000,
                    });
                }
            }

            // Sort by similarity descending
            duplicates.sort((a, b) => b.similarity - a.similarity);

            if (duplicates.length > 0) {
                this.logger.info(
                    `Found ${duplicates.length} potential duplicates for "${entry.title}"`,
                    { component: COMPONENT },
                );
            }

            return duplicates;
        } catch (err) {
            this.logger.error('Duplicate detection failed', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── Extraction Prompts (AICC-0418) ───────────────────────────

    /**
     * Generate an AI prompt for extracting knowledge from a given context.
     *
     * The prompt instructs the AI to identify patterns, solutions,
     * gotchas, configs, and references from the provided text.
     *
     * @param context The source text to extract knowledge from
     * @returns A formatted extraction prompt
     */
    public generateExtractionPrompt(context: string): string {
        return `You are a knowledge extraction specialist. Analyze the following context and extract reusable knowledge entries.

For each piece of knowledge identified, provide a JSON object with these fields:
- title: A short, descriptive title (max 100 chars)
- content: The knowledge content in clear, reusable markdown
- category: One of "pattern", "solution", "gotcha", "config", "reference"
- tags: An array of relevant tags (lowercase, 3-8 tags)
- confidence: A score from 0-100 indicating reliability

Rules:
1. Focus on reusable, cross-project knowledge
2. Avoid context-specific details that won't transfer
3. Prefer actionable patterns over observations
4. Include code examples where helpful
5. Flag potential gotchas or anti-patterns
6. Confidence > 80 for well-established patterns
7. Confidence 50-80 for situational knowledge
8. Confidence < 50 for experimental or unverified tips

Return a JSON array of knowledge entries.

---

CONTEXT:
${context}

---

Extract knowledge entries as a JSON array:`;
    }

    // ── Merge (AICC-0421) ────────────────────────────────────────

    /**
     * Merge two duplicate entries into one.
     *
     * Combines content, tags, and metadata from the secondary entry
     * into the primary. The secondary entry is deleted.
     *
     * @param primaryId ID of the entry to keep
     * @param secondaryId ID of the entry to merge into primary
     * @returns The merged primary entry
     * @throws Error if either entry is not found
     */
    public mergeEntries(
        primaryId: string,
        secondaryId: string,
    ): KnowledgeEntry {
        try {
            const primary = this.entries.find((e) => e.id === primaryId);
            const secondary = this.entries.find((e) => e.id === secondaryId);

            if (!primary) {
                throw new Error(`Primary entry not found: ${primaryId}`);
            }
            if (!secondary) {
                throw new Error(`Secondary entry not found: ${secondaryId}`);
            }

            // Merge content (append secondary if different)
            if (!primary.content.includes(secondary.content)) {
                primary.content += `\n\n---\n\n_Merged from: ${secondary.title}_\n\n${secondary.content}`;
            }

            // Merge tags (union)
            const tagSet = new Set([
                ...primary.tags.map((t) => t.toLowerCase()),
            ]);
            for (const tag of secondary.tags) {
                const lower = tag.toLowerCase();
                if (!tagSet.has(lower)) {
                    primary.tags.push(tag);
                    tagSet.add(lower);
                }
            }

            // Take the higher confidence
            primary.confidence = Math.max(
                primary.confidence,
                secondary.confidence,
            );

            // Sum usage counts
            primary.usageCount += secondary.usageCount;

            // Increment version
            primary.version++;
            primary.updatedAt = new Date().toISOString();

            // Remove secondary
            this.entries = this.entries.filter((e) => e.id !== secondaryId);
            this.saveEntriesSync();

            this.eventBus.emit('knowledge.entries.merged', {
                timestamp: Date.now(),
                source: COMPONENT,
                primaryId: primary.id,
                secondaryId,
            });

            this.logger.info(
                `Merged knowledge entries: ${primaryId} ← ${secondaryId}`,
                { component: COMPONENT },
            );
            return primary;
        } catch (err) {
            this.logger.error('Failed to merge knowledge entries', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Export / Import ──────────────────────────────────────────

    /**
     * Export all knowledge entries.
     *
     * @returns Array of all entries
     */
    public exportAll(): KnowledgeEntry[] {
        return [...this.entries];
    }

    /**
     * Import knowledge entries, skipping duplicates.
     *
     * Uses fuzzy matching to detect duplicates. Entries that are
     * too similar to existing ones are counted but not imported.
     *
     * @param entries The entries to import
     * @returns Count of imported and duplicate entries
     */
    public importEntries(
        entries: KnowledgeEntry[],
    ): { imported: number; duplicates: number } {
        try {
            let imported = 0;
            let duplicates = 0;
            const existingIds = new Set(this.entries.map((e) => e.id));

            for (const entry of entries) {
                // Skip by ID
                if (existingIds.has(entry.id)) {
                    duplicates++;
                    continue;
                }

                // Check for content duplicates
                const dupes = this.detectDuplicates(entry);
                if (dupes.length > 0 && dupes[0].similarity > 0.85) {
                    duplicates++;
                    this.logger.debug(
                        `Skipping duplicate import: "${entry.title}" (similarity=${dupes[0].similarity})`,
                        { component: COMPONENT },
                    );
                    continue;
                }

                // Assign new ID to avoid collisions
                const importEntry: KnowledgeEntry = {
                    ...entry,
                    id: crypto.randomUUID(),
                    updatedAt: new Date().toISOString(),
                };

                this.entries.push(importEntry);
                existingIds.add(importEntry.id);
                imported++;
            }

            if (imported > 0) {
                this.saveEntriesSync();
            }

            this.logger.info(
                `Imported ${imported} knowledge entries (${duplicates} duplicates skipped)`,
                { component: COMPONENT },
            );

            return { imported, duplicates };
        } catch (err) {
            this.logger.error('Failed to import knowledge entries', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Summary ──────────────────────────────────────────────────

    /**
     * Get aggregate statistics about the knowledge base.
     *
     * @returns Summary with totals, category breakdown, top tags,
     *          and average confidence
     */
    public getSummary(): {
        total: number;
        byCategory: Record<string, number>;
        topTags: Array<{ tag: string; count: number }>;
        avgConfidence: number;
    } {
        const byCategory: Record<string, number> = {};
        const tagCounts = new Map<string, number>();
        let confidenceSum = 0;

        for (const entry of this.entries) {
            byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
            confidenceSum += entry.confidence;
            for (const tag of entry.tags) {
                const lower = tag.toLowerCase();
                tagCounts.set(lower, (tagCounts.get(lower) || 0) + 1);
            }
        }

        const topTags = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([tag, count]) => ({ tag, count }));

        return {
            total: this.entries.length,
            byCategory,
            topTags,
            avgConfidence:
                this.entries.length > 0
                    ? Math.round((confidenceSum / this.entries.length) * 100) / 100
                    : 0,
        };
    }

    // ── Private: Persistence (AICC-0417) ─────────────────────────

    /**
     * Load entries from `~/.aicc/knowledge/knowledge.json`.
     * Returns an empty array if the file does not exist or is malformed.
     */
    private loadEntriesSync(): KnowledgeEntry[] {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed: unknown = JSON.parse(raw);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    Array.isArray((parsed as KnowledgeStore).entries)
                ) {
                    this.logger.info(
                        `Loaded ${(parsed as KnowledgeStore).entries.length} knowledge entries`,
                        { component: COMPONENT },
                    );
                    return (parsed as KnowledgeStore).entries;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(
                `Failed to load knowledge.json, starting fresh: ${msg}`,
                { component: COMPONENT },
            );
        }
        return [];
    }

    /**
     * Persist entries atomically via temp-file + rename.
     */
    private saveEntriesSync(): void {
        const store: KnowledgeStore = {
            version: STORE_VERSION,
            entries: this.entries,
            lastUpdated: new Date().toISOString(),
        };

        const data = JSON.stringify(store, null, 2);
        const tmpPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;

        try {
            if (!fs.existsSync(this.knowledgeDir)) {
                fs.mkdirSync(this.knowledgeDir, { recursive: true });
            }
            fs.writeFileSync(tmpPath, data, 'utf-8');
            fs.renameSync(tmpPath, this.filePath);
        } catch (err) {
            this.logger.error('Failed to save knowledge base entries', {
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

    // ── Private: Fuzzy Matching (AICC-0420) ──────────────────────

    /**
     * Compute similarity between two strings using n-gram overlap.
     *
     * Uses trigram (3-gram) Jaccard similarity for fuzzy matching.
     *
     * @param text The text to compare
     * @param query The query to match against
     * @returns Similarity score (0–1)
     */
    private fuzzyMatch(text: string, query: string): number {
        if (!text || !query) {
            return 0;
        }

        // Check for exact substring match first
        if (text.includes(query)) {
            return 1.0;
        }

        // Generate n-grams
        const textGrams = this.ngrams(text, NGRAM_SIZE);
        const queryGrams = this.ngrams(query, NGRAM_SIZE);

        if (textGrams.size === 0 || queryGrams.size === 0) {
            return 0;
        }

        // Jaccard similarity
        let intersection = 0;
        for (const gram of queryGrams) {
            if (textGrams.has(gram)) {
                intersection++;
            }
        }

        const union = textGrams.size + queryGrams.size - intersection;
        return union > 0 ? intersection / union : 0;
    }

    /**
     * Generate n-grams from a string.
     *
     * @param text Input text
     * @param n Gram size
     * @returns Set of n-gram strings
     */
    private ngrams(text: string, n: number): Set<string> {
        const grams = new Set<string>();
        const clean = text.replace(/\s+/g, ' ').trim();
        for (let i = 0; i <= clean.length - n; i++) {
            grams.add(clean.substring(i, i + n));
        }
        return grams;
    }

    /**
     * Compute tag overlap score between two tag arrays.
     *
     * @param entryTags Tags from the entry
     * @param queryTags Tags from the query
     * @returns Overlap score (0–1)
     */
    private tagOverlapScore(entryTags: string[], queryTags: string[]): number {
        if (queryTags.length === 0) {
            return 0;
        }
        const entrySet = new Set(entryTags.map((t) => t.toLowerCase()));
        let matches = 0;
        for (const tag of queryTags) {
            if (entrySet.has(tag.toLowerCase())) {
                matches++;
            }
        }
        return matches / queryTags.length;
    }
}
