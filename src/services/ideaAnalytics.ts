/**
 * Idea Analytics & AI Enrichment Service
 *
 * Composite scoring engine, AI-assisted enrichment prompt generation,
 * trend analysis, duplicate detection, and lifecycle automation for the
 * Ideation subsystem.
 *
 * Part of AICC-0139: Idea Analytics & AI Enrichment
 *   - AICC-0140: Idea scoring & AI-assisted enrichment
 *     - AICC-0378: Implement composite scoring algorithm
 *     - AICC-0379: Build AI enrichment prompt generator
 *     - AICC-0380: Add auto-tag suggestions based on content analysis
 *     - AICC-0381: Implement duplicate detection using fuzzy matching
 *   - AICC-0141: Trend analysis & lifecycle automation
 *     - AICC-0382: Create trend heatmap data
 *     - AICC-0383: Build stale idea detection
 *     - AICC-0384: Implement auto-archive rules
 *     - AICC-0385: Create lifecycle state machine
 *
 * REQ-IDAE-001 to REQ-IDAE-008
 */

import { Logger } from '../logger';
import { EventBus } from './eventBus';
import { IdeationService } from './ideationService';
import type {
    Idea,
    IdeaStatus,
    IdeaCategory,
} from '../types/ideation';
import {
    VALID_IDEA_CATEGORIES,
} from '../types/ideation';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Composite score breakdown for a single idea.
 */
export interface IdeaScore {
    /** The idea being scored */
    ideaId: string;
    /** Weighted composite score (0–100) */
    composite: number;
    /** Score contribution from votes (0–100) */
    voteScore: number;
    /** Score contribution from comment engagement (0–100) */
    engagementScore: number;
    /** Score contribution from recency (0–100) */
    recencyScore: number;
    /** Score contribution from uniqueness (0–100) */
    uniquenessScore: number;
}

/**
 * A single data point for trend visualization.
 */
export interface TrendDataPoint {
    /** Time period label (e.g. "2026-W08", "2026-02") */
    period: string;
    /** Idea category */
    category: IdeaCategory;
    /** Number of ideas in this category during this period */
    count: number;
}

/**
 * A candidate duplicate pair detected by fuzzy matching.
 */
export interface DuplicateCandidate {
    /** The source idea ID */
    ideaId: string;
    /** The potential duplicate idea ID */
    matchId: string;
    /** Similarity score (0–1, where 1 is identical) */
    similarity: number;
    /** Which fields matched */
    matchedFields: string[];
}

/**
 * A lifecycle transition rule for automated state changes.
 */
export interface LifecycleRule {
    /** Status to transition from */
    fromStatus: IdeaStatus;
    /** Status to transition to */
    toStatus: IdeaStatus;
    /** Condition that triggers the transition */
    condition: 'stale' | 'voted' | 'promoted' | 'manual';
    /** Number of days for time-based conditions */
    thresholdDays?: number;
    /** Minimum vote count for vote-based conditions */
    minVotes?: number;
}

/**
 * AI enrichment suggestions for a single idea.
 */
export interface EnrichmentSuggestion {
    /** The idea being enriched */
    ideaId: string;
    /** Suggested tags based on content analysis */
    suggestedTags: string[];
    /** Suggested description improvements */
    suggestedDescription?: string;
    /** IDs of related ideas */
    relatedIdeaIds: string[];
    /** If this idea appears to be a duplicate, the original idea ID */
    duplicateOf?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const COMPONENT = 'IdeaAnalytics';

/** Scoring weights (must sum to 1.0) */
const WEIGHT_VOTES = 0.3;
const WEIGHT_ENGAGEMENT = 0.2;
const WEIGHT_RECENCY = 0.3;
const WEIGHT_UNIQUENESS = 0.2;

/** Duplicate detection similarity threshold */
const DUPLICATE_THRESHOLD = 0.6;

/** Default stale idea threshold in days */
const DEFAULT_STALE_DAYS = 30;

/** Stop words excluded from keyword extraction */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
    'this', 'that', 'these', 'those', 'has', 'have', 'had', 'will', 'can',
    'could', 'should', 'would', 'do', 'does', 'did', 'not', 'no', 'so',
    'if', 'then', 'else', 'when', 'up', 'out', 'about', 'into', 'over',
    'after', 'before', 'between', 'under', 'above', 'more', 'most', 'some',
    'such', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
    'we', 'i', 'you', 'he', 'she', 'they', 'me', 'us', 'my', 'your',
    'its', 'our', 'their', 'all', 'each', 'every', 'both', 'few', 'many',
    'any', 'other', 'new', 'old', 'get', 'make', 'use', 'add', 'need',
]);

/** Default lifecycle rules */
const DEFAULT_LIFECYCLE_RULES: LifecycleRule[] = [
    {
        fromStatus: 'draft',
        toStatus: 'archived',
        condition: 'stale',
        thresholdDays: 60,
    },
    {
        fromStatus: 'submitted',
        toStatus: 'archived',
        condition: 'stale',
        thresholdDays: 90,
    },
    {
        fromStatus: 'submitted',
        toStatus: 'under-review',
        condition: 'voted',
        minVotes: 5,
    },
    {
        fromStatus: 'approved',
        toStatus: 'promoted',
        condition: 'promoted',
    },
];

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton analytics service for the Ideation subsystem.
 *
 * Provides composite scoring, duplicate detection, AI enrichment prompt
 * generation, trend analysis, stale-idea detection, and lifecycle
 * automation.
 */
export class IdeaAnalytics {
    // ── Singleton ────────────────────────────────────────────────
    private static instances = new Map<string, IdeaAnalytics>();

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly ideation: IdeationService;
    private lifecycleRules: LifecycleRule[];

    // ── Construction ─────────────────────────────────────────────

    private constructor(workspacePath: string) {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.ideation = IdeationService.getInstance(workspacePath);
        this.lifecycleRules = [...DEFAULT_LIFECYCLE_RULES];
        this.logger.info('IdeaAnalytics initialized', { component: COMPONENT });
    }

    /**
     * Retrieve (or create) the IdeaAnalytics singleton for a workspace.
     */
    public static getInstance(workspacePath: string): IdeaAnalytics {
        const key = require('path').resolve(workspacePath);
        let instance = IdeaAnalytics.instances.get(key);
        if (!instance) {
            instance = new IdeaAnalytics(workspacePath);
            IdeaAnalytics.instances.set(key, instance);
        }
        return instance;
    }

    /**
     * Reset all singleton instances. Primarily for tests.
     */
    public static resetInstances(): void {
        IdeaAnalytics.instances.clear();
    }

    // ── Scoring (AICC-0378) ──────────────────────────────────────

    /**
     * Compute a composite score for a single idea.
     *
     * Weights:
     *   - votes      × 0.3
     *   - engagement  × 0.2  (comment count)
     *   - recency     × 0.3  (days since last update)
     *   - uniqueness  × 0.2  (inverse duplicate similarity)
     *
     * Each sub-score is normalised to 0–100 before weighting.
     */
    public computeScore(idea: Idea): IdeaScore {
        try {
            const voteScore = this.computeVoteScore(idea);
            const engagementScore = this.computeEngagementScore(idea);
            const recencyScore = this.computeRecencyScore(idea);
            const uniquenessScore = this.computeUniquenessScore(idea);

            const composite = Math.round(
                voteScore * WEIGHT_VOTES +
                engagementScore * WEIGHT_ENGAGEMENT +
                recencyScore * WEIGHT_RECENCY +
                uniquenessScore * WEIGHT_UNIQUENESS,
            );

            return {
                ideaId: idea.id,
                composite: Math.min(100, Math.max(0, composite)),
                voteScore: Math.round(voteScore),
                engagementScore: Math.round(engagementScore),
                recencyScore: Math.round(recencyScore),
                uniquenessScore: Math.round(uniquenessScore),
            };
        } catch (err) {
            this.logger.error(`Failed to compute score for idea ${idea.id}`, {
                component: COMPONENT,
                error: err,
            });
            return {
                ideaId: idea.id,
                composite: 0,
                voteScore: 0,
                engagementScore: 0,
                recencyScore: 0,
                uniquenessScore: 0,
            };
        }
    }

    /**
     * Score and rank all ideas by composite score (descending).
     */
    public rankIdeas(): IdeaScore[] {
        try {
            const ideas = this.ideation.listIdeas();
            const scores = ideas.map((idea) => this.computeScore(idea));
            scores.sort((a, b) => b.composite - a.composite);
            this.logger.info(`Ranked ${scores.length} ideas`, { component: COMPONENT });
            return scores;
        } catch (err) {
            this.logger.error('Failed to rank ideas', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── Duplicate Detection (AICC-0381) ──────────────────────────

    /**
     * Detect potential duplicates for a given idea using fuzzy matching
     * on title and description fields.
     *
     * @param idea The idea to check for duplicates
     * @returns Array of duplicate candidates above the similarity threshold
     */
    public detectDuplicates(idea: Idea): DuplicateCandidate[] {
        try {
            const allIdeas = this.ideation.listIdeas();
            const candidates: DuplicateCandidate[] = [];

            for (const other of allIdeas) {
                if (other.id === idea.id) {
                    continue;
                }

                const titleSim = this.computeSimilarity(
                    idea.title.toLowerCase(),
                    other.title.toLowerCase(),
                );
                const descSim = this.computeSimilarity(
                    idea.description.toLowerCase(),
                    other.description.toLowerCase(),
                );

                // Weighted similarity: title matters more
                const combined = titleSim * 0.6 + descSim * 0.4;

                if (combined >= DUPLICATE_THRESHOLD) {
                    const matchedFields: string[] = [];
                    if (titleSim >= DUPLICATE_THRESHOLD) {
                        matchedFields.push('title');
                    }
                    if (descSim >= DUPLICATE_THRESHOLD) {
                        matchedFields.push('description');
                    }

                    candidates.push({
                        ideaId: idea.id,
                        matchId: other.id,
                        similarity: Math.round(combined * 100) / 100,
                        matchedFields,
                    });
                }
            }

            candidates.sort((a, b) => b.similarity - a.similarity);
            this.logger.info(
                `Found ${candidates.length} duplicate candidates for idea ${idea.id}`,
                { component: COMPONENT },
            );
            return candidates;
        } catch (err) {
            this.logger.error(`Duplicate detection failed for idea ${idea.id}`, {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── Tag Suggestions (AICC-0380) ──────────────────────────────

    /**
     * Suggest tags for an idea by extracting keywords from its title and
     * description and comparing against the existing tag vocabulary.
     *
     * @param idea The idea to generate tag suggestions for
     * @returns Array of suggested tag strings
     */
    public suggestTags(idea: Idea): string[] {
        try {
            const keywords = this.extractKeywords(
                `${idea.title} ${idea.description}`,
            );

            // Build vocabulary from all existing idea tags
            const vocabulary = new Set<string>();
            const allIdeas = this.ideation.listIdeas();
            for (const other of allIdeas) {
                for (const tag of other.tags) {
                    vocabulary.add(tag.toLowerCase());
                }
            }

            const suggestions = new Set<string>();

            // Match keywords against existing vocabulary
            for (const keyword of keywords) {
                const lower = keyword.toLowerCase();
                if (vocabulary.has(lower) && !idea.tags.includes(lower)) {
                    suggestions.add(lower);
                }
            }

            // Also suggest keywords that appear frequently across ideas
            const keywordFreq = new Map<string, number>();
            for (const other of allIdeas) {
                if (other.id === idea.id) {
                    continue;
                }
                const otherKeywords = this.extractKeywords(
                    `${other.title} ${other.description}`,
                );
                for (const kw of otherKeywords) {
                    if (keywords.includes(kw)) {
                        keywordFreq.set(kw, (keywordFreq.get(kw) || 0) + 1);
                    }
                }
            }

            // Add high-frequency shared keywords as tag suggestions
            for (const [kw, freq] of keywordFreq.entries()) {
                if (freq >= 2 && !idea.tags.includes(kw)) {
                    suggestions.add(kw);
                }
            }

            const result = Array.from(suggestions).slice(0, 10);
            this.logger.info(
                `Suggested ${result.length} tags for idea ${idea.id}`,
                { component: COMPONENT },
            );
            return result;
        } catch (err) {
            this.logger.error(`Tag suggestion failed for idea ${idea.id}`, {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── AI Enrichment (AICC-0379) ────────────────────────────────

    /**
     * Generate an AI prompt for enriching an idea's description.
     *
     * The returned string is a self-contained prompt that can be sent to
     * an LLM to produce an improved description and related suggestions.
     *
     * @param idea The idea to generate an enrichment prompt for
     * @returns A structured prompt string
     */
    public generateEnrichmentPrompt(idea: Idea): string {
        const relatedIdeas = this.findRelatedIdeas(idea, 5);
        const relatedContext = relatedIdeas.length > 0
            ? `\n\nRelated ideas in the backlog:\n${relatedIdeas.map(
                  (r) => `- "${r.title}" (${r.category}, ${r.status})`,
              ).join('\n')}`
            : '';

        return [
            'You are an expert product analyst. Given the following idea, improve its description',
            'to be clearer, more actionable, and better structured. Also suggest related ideas',
            'that could be combined or that this idea depends on.',
            '',
            `**Idea Title:** ${idea.title}`,
            `**Category:** ${idea.category}`,
            `**Current Status:** ${idea.status}`,
            `**Tags:** ${idea.tags.join(', ') || 'none'}`,
            `**Current Description:**`,
            idea.description,
            relatedContext,
            '',
            'Please provide:',
            '1. An improved description (2-3 paragraphs, actionable)',
            '2. Suggested additional tags',
            '3. Any related ideas or dependencies',
            '4. Potential risks or considerations',
        ].join('\n');
    }

    /**
     * Combine tag suggestions, duplicate detection, and related ideas into
     * a single enrichment suggestion object.
     *
     * @param idea The idea to enrich
     * @returns Combined enrichment suggestions
     */
    public getEnrichmentSuggestions(idea: Idea): EnrichmentSuggestion {
        try {
            const suggestedTags = this.suggestTags(idea);
            const duplicates = this.detectDuplicates(idea);
            const relatedIdeas = this.findRelatedIdeas(idea, 5);
            const prompt = this.generateEnrichmentPrompt(idea);

            const suggestion: EnrichmentSuggestion = {
                ideaId: idea.id,
                suggestedTags,
                suggestedDescription: prompt,
                relatedIdeaIds: relatedIdeas.map((r) => r.id),
            };

            // If a very high similarity duplicate exists, flag it
            if (duplicates.length > 0 && duplicates[0].similarity >= 0.8) {
                suggestion.duplicateOf = duplicates[0].matchId;
            }

            this.logger.info(
                `Generated enrichment suggestions for idea ${idea.id}`,
                { component: COMPONENT },
            );
            return suggestion;
        } catch (err) {
            this.logger.error(
                `Enrichment suggestion failed for idea ${idea.id}`,
                { component: COMPONENT, error: err },
            );
            return {
                ideaId: idea.id,
                suggestedTags: [],
                relatedIdeaIds: [],
            };
        }
    }

    // ── Trend Analysis (AICC-0382) ───────────────────────────────

    /**
     * Build trend data aggregating ideas by category and time period.
     *
     * @param periodDays Number of days per period bucket (7 = weekly, 30 = monthly)
     * @returns Array of trend data points
     */
    public buildTrendData(periodDays: number = 7): TrendDataPoint[] {
        try {
            const ideas = this.ideation.listIdeas();
            if (ideas.length === 0) {
                return [];
            }

            const now = Date.now();
            const bucketMs = periodDays * 24 * 60 * 60 * 1000;

            // Determine the earliest creation date
            let earliest = now;
            for (const idea of ideas) {
                const ts = new Date(idea.createdAt).getTime();
                if (ts < earliest) {
                    earliest = ts;
                }
            }

            // Build period-category buckets
            const data: TrendDataPoint[] = [];
            const periods = Math.ceil((now - earliest) / bucketMs) + 1;

            for (let p = 0; p < periods; p++) {
                const periodStart = earliest + p * bucketMs;
                const periodEnd = periodStart + bucketMs;
                const periodLabel = this.formatPeriodLabel(
                    new Date(periodStart),
                    periodDays,
                );

                for (const category of VALID_IDEA_CATEGORIES) {
                    const count = ideas.filter((idea) => {
                        const ts = new Date(idea.createdAt).getTime();
                        return (
                            idea.category === category &&
                            ts >= periodStart &&
                            ts < periodEnd
                        );
                    }).length;

                    if (count > 0) {
                        data.push({ period: periodLabel, category, count });
                    }
                }
            }

            this.logger.info(
                `Built ${data.length} trend data points over ${periods} periods`,
                { component: COMPONENT },
            );
            return data;
        } catch (err) {
            this.logger.error('Failed to build trend data', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── Stale Idea Detection (AICC-0383) ─────────────────────────

    /**
     * Find ideas with no activity (no updates) for more than the
     * specified number of days.
     *
     * @param thresholdDays Number of days of inactivity before an idea is stale
     * @returns Array of stale ideas
     */
    public detectStaleIdeas(thresholdDays: number = DEFAULT_STALE_DAYS): Idea[] {
        try {
            const ideas = this.ideation.listIdeas();
            const cutoff = Date.now() - thresholdDays * 24 * 60 * 60 * 1000;

            const stale = ideas.filter((idea) => {
                // Skip already-archived or promoted ideas
                if (idea.status === 'archived' || idea.status === 'promoted') {
                    return false;
                }
                const lastActivity = this.getLastActivityTimestamp(idea);
                return lastActivity < cutoff;
            });

            this.logger.info(
                `Detected ${stale.length} stale ideas (threshold: ${thresholdDays} days)`,
                { component: COMPONENT },
            );
            return stale;
        } catch (err) {
            this.logger.error('Failed to detect stale ideas', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── Lifecycle Automation (AICC-0384, AICC-0385) ──────────────

    /**
     * Set custom lifecycle rules, replacing the defaults.
     *
     * @param rules Array of lifecycle transition rules
     */
    public setLifecycleRules(rules: LifecycleRule[]): void {
        this.lifecycleRules = [...rules];
        this.logger.info(`Updated lifecycle rules (${rules.length} rules)`, {
            component: COMPONENT,
        });
    }

    /**
     * Get the current lifecycle rules.
     */
    public getLifecycleRules(): LifecycleRule[] {
        return [...this.lifecycleRules];
    }

    /**
     * Apply all configured lifecycle rules to all ideas, transitioning
     * matching ideas to their target status.
     *
     * State machine: draft → submitted → under-review → approved → promoted → archived
     *
     * @returns Object with arrays of transitioned and skipped idea IDs
     */
    public async applyLifecycleRules(): Promise<{
        transitioned: string[];
        skipped: string[];
    }> {
        const transitioned: string[] = [];
        const skipped: string[] = [];

        try {
            const ideas = this.ideation.listIdeas();

            for (const idea of ideas) {
                for (const rule of this.lifecycleRules) {
                    if (idea.status !== rule.fromStatus) {
                        continue;
                    }

                    const shouldTransition = this.evaluateRule(idea, rule);
                    if (shouldTransition) {
                        try {
                            this.ideation.updateIdea(idea.id, {
                                status: rule.toStatus,
                            });
                            transitioned.push(idea.id);
                            this.logger.info(
                                `Lifecycle: transitioned idea ${idea.id} ` +
                                `from ${rule.fromStatus} to ${rule.toStatus} ` +
                                `(condition: ${rule.condition})`,
                                { component: COMPONENT },
                            );
                            // Only apply first matching rule per idea
                            break;
                        } catch (err) {
                            this.logger.warn(
                                `Lifecycle: failed to transition idea ${idea.id}`,
                                { component: COMPONENT, error: err },
                            );
                            skipped.push(idea.id);
                        }
                    }
                }
            }

            this.eventBus.emit('analytics.lifecycle', {
                timestamp: Date.now(),
                source: COMPONENT,
                transitioned,
                skipped,
            });

            this.logger.info(
                `Lifecycle automation complete: ${transitioned.length} transitioned, ` +
                `${skipped.length} skipped`,
                { component: COMPONENT },
            );
        } catch (err) {
            this.logger.error('Lifecycle automation failed', {
                component: COMPONENT,
                error: err,
            });
        }

        return { transitioned, skipped };
    }

    // ── HTML Generation ──────────────────────────────────────────

    /**
     * Generate an HTML heatmap visualization of trend data using Chart.js.
     *
     * @param data Trend data points to visualize
     * @returns Self-contained HTML string
     */
    public generateTrendHeatmapHtml(data: TrendDataPoint[]): string {
        const periods = [...new Set(data.map((d) => d.period))];
        const categories = [...new Set(data.map((d) => d.category))];

        // Build matrix for heatmap
        const matrix: { x: string; y: string; v: number }[] = [];
        for (const period of periods) {
            for (const category of categories) {
                const point = data.find(
                    (d) => d.period === period && d.category === category,
                );
                matrix.push({
                    x: period,
                    y: category,
                    v: point?.count ?? 0,
                });
            }
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idea Trends Heatmap</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); }
        .chart-container { max-width: 900px; margin: 0 auto; }
        h2 { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px 12px; text-align: center; border: 1px solid rgba(128,128,128,0.3); }
        th { background: rgba(128,128,128,0.1); font-weight: 600; }
        .heat-0 { background: transparent; }
        .heat-1 { background: rgba(76,175,80,0.2); }
        .heat-2 { background: rgba(76,175,80,0.4); }
        .heat-3 { background: rgba(76,175,80,0.6); }
        .heat-4 { background: rgba(76,175,80,0.8); }
        .heat-5 { background: rgba(76,175,80,1.0); color: #fff; }
    </style>
</head>
<body>
    <div class="chart-container">
        <h2>Idea Trends Heatmap</h2>
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    ${periods.map((p) => `<th>${this.escapeHtml(p)}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${categories.map((cat) => {
                    const cells = periods.map((p) => {
                        const point = data.find(
                            (d) => d.period === p && d.category === cat,
                        );
                        const count = point?.count ?? 0;
                        const level = Math.min(5, count);
                        return `<td class="heat-${level}">${count}</td>`;
                    }).join('');
                    return `<tr><td><strong>${this.escapeHtml(cat)}</strong></td>${cells}</tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
    }

    /**
     * Generate a comprehensive analytics dashboard combining scoring,
     * trends, duplicates, and stale ideas.
     *
     * @returns Self-contained HTML string
     */
    public generateAnalyticsDashboardHtml(): string {
        const scores = this.rankIdeas();
        const staleIdeas = this.detectStaleIdeas();
        const allIdeas = this.ideation.listIdeas();

        // Detect duplicates across all ideas
        const allDuplicates: DuplicateCandidate[] = [];
        const seenPairs = new Set<string>();
        for (const idea of allIdeas) {
            const dupes = this.detectDuplicates(idea);
            for (const d of dupes) {
                const pairKey = [d.ideaId, d.matchId].sort().join('-');
                if (!seenPairs.has(pairKey)) {
                    seenPairs.add(pairKey);
                    allDuplicates.push(d);
                }
            }
        }

        const topScores = scores.slice(0, 10);
        const statusCounts = this.computeStatusCounts(allIdeas);
        const categoryCounts = this.computeCategoryCounts(allIdeas);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Idea Analytics Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); }
        .dashboard { max-width: 1100px; margin: 0 auto; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .card { background: rgba(128,128,128,0.05); border: 1px solid rgba(128,128,128,0.2); border-radius: 8px; padding: 16px; }
        .card h3 { margin-top: 0; border-bottom: 1px solid rgba(128,128,128,0.2); padding-bottom: 8px; }
        .full-width { grid-column: 1 / -1; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid rgba(128,128,128,0.15); }
        th { font-weight: 600; opacity: 0.8; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.85em; font-weight: 500; }
        .badge-high { background: rgba(76,175,80,0.2); color: #66bb6a; }
        .badge-med { background: rgba(255,152,0,0.2); color: #ffa726; }
        .badge-low { background: rgba(244,67,54,0.2); color: #ef5350; }
        .stat { text-align: center; }
        .stat .value { font-size: 2em; font-weight: 700; }
        .stat .label { opacity: 0.7; font-size: 0.9em; }
        .warning { color: #ffa726; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h2>📊 Idea Analytics Dashboard</h2>

        <!-- Summary Stats -->
        <div class="grid">
            <div class="card stat">
                <div class="value">${allIdeas.length}</div>
                <div class="label">Total Ideas</div>
            </div>
            <div class="card stat">
                <div class="value">${topScores.length > 0 ? topScores[0].composite : 0}</div>
                <div class="label">Top Score</div>
            </div>
            <div class="card stat">
                <div class="value ${staleIdeas.length > 0 ? 'warning' : ''}">${staleIdeas.length}</div>
                <div class="label">Stale Ideas</div>
            </div>
            <div class="card stat">
                <div class="value ${allDuplicates.length > 0 ? 'warning' : ''}">${allDuplicates.length}</div>
                <div class="label">Potential Duplicates</div>
            </div>
        </div>

        <!-- Top Scored Ideas -->
        <div class="grid">
            <div class="card full-width">
                <h3>🏆 Top Scored Ideas</h3>
                <table>
                    <thead><tr><th>#</th><th>Idea</th><th>Score</th><th>Votes</th><th>Engagement</th><th>Recency</th></tr></thead>
                    <tbody>
                        ${topScores.map((s, i) => {
                            const idea = allIdeas.find((x) => x.id === s.ideaId);
                            const title = idea ? this.escapeHtml(idea.title) : s.ideaId;
                            const badge = s.composite >= 70 ? 'high' : s.composite >= 40 ? 'med' : 'low';
                            return `<tr><td>${i + 1}</td><td>${title}</td><td><span class="badge badge-${badge}">${s.composite}</span></td><td>${s.voteScore}</td><td>${s.engagementScore}</td><td>${s.recencyScore}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Status & Category Breakdown -->
        <div class="grid">
            <div class="card">
                <h3>📋 By Status</h3>
                <table>
                    <thead><tr><th>Status</th><th>Count</th></tr></thead>
                    <tbody>
                        ${Object.entries(statusCounts).map(([status, count]) =>
                            `<tr><td>${this.escapeHtml(status)}</td><td>${count}</td></tr>`,
                        ).join('')}
                    </tbody>
                </table>
            </div>
            <div class="card">
                <h3>🏷️ By Category</h3>
                <table>
                    <thead><tr><th>Category</th><th>Count</th></tr></thead>
                    <tbody>
                        ${Object.entries(categoryCounts).map(([cat, count]) =>
                            `<tr><td>${this.escapeHtml(cat)}</td><td>${count}</td></tr>`,
                        ).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Duplicates -->
        ${allDuplicates.length > 0 ? `
        <div class="grid">
            <div class="card full-width">
                <h3>🔍 Potential Duplicates</h3>
                <table>
                    <thead><tr><th>Idea A</th><th>Idea B</th><th>Similarity</th><th>Matched Fields</th></tr></thead>
                    <tbody>
                        ${allDuplicates.slice(0, 10).map((d) => {
                            const ideaA = allIdeas.find((x) => x.id === d.ideaId);
                            const ideaB = allIdeas.find((x) => x.id === d.matchId);
                            return `<tr><td>${ideaA ? this.escapeHtml(ideaA.title) : d.ideaId}</td><td>${ideaB ? this.escapeHtml(ideaB.title) : d.matchId}</td><td>${Math.round(d.similarity * 100)}%</td><td>${d.matchedFields.join(', ')}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : ''}

        <!-- Stale Ideas -->
        ${staleIdeas.length > 0 ? `
        <div class="grid">
            <div class="card full-width">
                <h3>⏰ Stale Ideas</h3>
                <table>
                    <thead><tr><th>Title</th><th>Status</th><th>Last Updated</th><th>Days Inactive</th></tr></thead>
                    <tbody>
                        ${staleIdeas.slice(0, 10).map((idea) => {
                            const daysInactive = Math.floor(
                                (Date.now() - new Date(idea.updatedAt).getTime()) /
                                (24 * 60 * 60 * 1000),
                            );
                            return `<tr><td>${this.escapeHtml(idea.title)}</td><td>${idea.status}</td><td>${idea.updatedAt.slice(0, 10)}</td><td>${daysInactive}</td></tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : ''}
    </div>
</body>
</html>`;
    }

    // ── Private Helpers ──────────────────────────────────────────

    /**
     * Compute a vote sub-score (0–100).
     * Uses net votes (up − down) capped at ±20.
     */
    private computeVoteScore(idea: Idea): number {
        const upVotes = idea.votes.filter((v) => v.direction === 'up').length;
        const downVotes = idea.votes.filter((v) => v.direction === 'down').length;
        const net = upVotes - downVotes;
        // Normalize: -20..+20 → 0..100
        const capped = Math.max(-20, Math.min(20, net));
        return ((capped + 20) / 40) * 100;
    }

    /**
     * Compute an engagement sub-score (0–100).
     * Based on comment count, capped at 10.
     */
    private computeEngagementScore(idea: Idea): number {
        const count = Math.min(10, idea.comments.length);
        return (count / 10) * 100;
    }

    /**
     * Compute a recency sub-score (0–100).
     * Ideas updated within 7 days get 100; score decays over 90 days.
     */
    private computeRecencyScore(idea: Idea): number {
        const lastActivity = this.getLastActivityTimestamp(idea);
        const daysSinceActivity =
            (Date.now() - lastActivity) / (24 * 60 * 60 * 1000);

        if (daysSinceActivity <= 7) {
            return 100;
        }
        if (daysSinceActivity >= 90) {
            return 0;
        }
        // Linear decay from 100 at 7 days to 0 at 90 days
        return Math.round(((90 - daysSinceActivity) / (90 - 7)) * 100);
    }

    /**
     * Compute a uniqueness sub-score (0–100).
     * Inverse of the highest duplicate similarity found.
     */
    private computeUniquenessScore(idea: Idea): number {
        const allIdeas = this.ideation.listIdeas();
        let maxSimilarity = 0;

        for (const other of allIdeas) {
            if (other.id === idea.id) {
                continue;
            }
            const titleSim = this.computeSimilarity(
                idea.title.toLowerCase(),
                other.title.toLowerCase(),
            );
            maxSimilarity = Math.max(maxSimilarity, titleSim);
        }

        return Math.round((1 - maxSimilarity) * 100);
    }

    /**
     * Compute string similarity using Levenshtein distance.
     * Returns a value between 0 (completely different) and 1 (identical).
     */
    private computeSimilarity(a: string, b: string): number {
        if (a === b) {
            return 1;
        }
        if (a.length === 0 || b.length === 0) {
            return 0;
        }
        const distance = this.levenshteinDistance(a, b);
        const maxLen = Math.max(a.length, b.length);
        return 1 - distance / maxLen;
    }

    /**
     * Compute the Levenshtein edit distance between two strings.
     *
     * Uses the classic dynamic-programming matrix approach with
     * O(min(m,n)) space optimisation.
     */
    private levenshteinDistance(a: string, b: string): number {
        // Ensure a is the shorter string for space efficiency
        if (a.length > b.length) {
            [a, b] = [b, a];
        }

        const m = a.length;
        const n = b.length;
        let prev = new Array<number>(m + 1);
        let curr = new Array<number>(m + 1);

        // Base case: distance from empty string
        for (let i = 0; i <= m; i++) {
            prev[i] = i;
        }

        for (let j = 1; j <= n; j++) {
            curr[0] = j;
            for (let i = 1; i <= m; i++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                curr[i] = Math.min(
                    prev[i] + 1,       // deletion
                    curr[i - 1] + 1,   // insertion
                    prev[i - 1] + cost, // substitution
                );
            }
            [prev, curr] = [curr, prev];
        }

        return prev[m];
    }

    /**
     * Extract meaningful keywords from text.
     * Removes stop words, short tokens, and normalises to lowercase.
     */
    private extractKeywords(text: string): string[] {
        const tokens = text
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

        // Deduplicate
        return [...new Set(tokens)];
    }

    /**
     * Find ideas related to a given idea based on shared keywords.
     */
    private findRelatedIdeas(idea: Idea, limit: number): Idea[] {
        const keywords = this.extractKeywords(
            `${idea.title} ${idea.description}`,
        );
        if (keywords.length === 0) {
            return [];
        }

        const allIdeas = this.ideation.listIdeas();
        const scored: Array<{ idea: Idea; overlap: number }> = [];

        for (const other of allIdeas) {
            if (other.id === idea.id) {
                continue;
            }
            const otherKeywords = this.extractKeywords(
                `${other.title} ${other.description}`,
            );
            const overlap = keywords.filter((kw) =>
                otherKeywords.includes(kw),
            ).length;
            if (overlap > 0) {
                scored.push({ idea: other, overlap });
            }
        }

        scored.sort((a, b) => b.overlap - a.overlap);
        return scored.slice(0, limit).map((s) => s.idea);
    }

    /**
     * Determine the most recent activity timestamp for an idea.
     * Considers updatedAt, last comment, and last vote.
     */
    private getLastActivityTimestamp(idea: Idea): number {
        let latest = new Date(idea.updatedAt).getTime();

        for (const comment of idea.comments) {
            const ts = new Date(comment.createdAt).getTime();
            if (ts > latest) {
                latest = ts;
            }
        }

        for (const vote of idea.votes) {
            const ts = new Date(vote.votedAt).getTime();
            if (ts > latest) {
                latest = ts;
            }
        }

        return latest;
    }

    /**
     * Evaluate whether a lifecycle rule should fire for a given idea.
     */
    private evaluateRule(idea: Idea, rule: LifecycleRule): boolean {
        switch (rule.condition) {
            case 'stale': {
                if (!rule.thresholdDays) {
                    return false;
                }
                const lastActivity = this.getLastActivityTimestamp(idea);
                const cutoff =
                    Date.now() - rule.thresholdDays * 24 * 60 * 60 * 1000;
                return lastActivity < cutoff;
            }
            case 'voted': {
                if (!rule.minVotes) {
                    return false;
                }
                const upVotes = idea.votes.filter(
                    (v) => v.direction === 'up',
                ).length;
                return upVotes >= rule.minVotes;
            }
            case 'promoted': {
                return (
                    idea.promotedTo !== undefined &&
                    idea.promotedTo.length > 0
                );
            }
            case 'manual': {
                return false; // Manual transitions are not automated
            }
            default:
                return false;
        }
    }

    /**
     * Format a period label based on date and period length.
     */
    private formatPeriodLabel(date: Date, periodDays: number): string {
        if (periodDays <= 7) {
            // Weekly: "2026-W08"
            const year = date.getFullYear();
            const startOfYear = new Date(year, 0, 1);
            const dayOfYear = Math.floor(
                (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000),
            );
            const weekNumber = Math.ceil((dayOfYear + 1) / 7);
            return `${year}-W${String(weekNumber).padStart(2, '0')}`;
        }
        // Monthly: "2026-02"
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }

    /**
     * Compute idea counts by status.
     */
    private computeStatusCounts(ideas: Idea[]): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const idea of ideas) {
            counts[idea.status] = (counts[idea.status] || 0) + 1;
        }
        return counts;
    }

    /**
     * Compute idea counts by category.
     */
    private computeCategoryCounts(ideas: Idea[]): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const idea of ideas) {
            counts[idea.category] = (counts[idea.category] || 0) + 1;
        }
        return counts;
    }

    /**
     * Escape HTML special characters to prevent XSS in generated HTML.
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
