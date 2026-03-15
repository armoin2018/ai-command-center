/**
 * Prompt Effectiveness Tracker
 *
 * Tracks prompt usage, correlates outcomes, computes effectiveness
 * scores (0–100), and generates leaderboard visualizations.
 * Persists usage history to `.project/PROMPT-HISTORY.json` with
 * atomic writes.
 *
 * Part of AICC-0148: Prompt Effectiveness Scoring
 *   - AICC-0149: Prompt tracking & effectiveness scoring
 *     - AICC-0400: Implement prompt usage tracker
 *     - AICC-0401: Build outcome correlation engine
 *     - AICC-0402: Create effectiveness score 0-100 algorithm
 *     - AICC-0403: Build leaderboard UI
 *
 * REQ-PES-001 to REQ-PES-006
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';
import { EventBus } from './eventBus';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single recorded prompt usage event.
 */
export interface PromptUsage {
    /** Unique usage identifier (UUID) */
    id: string;
    /** Human-readable name of the prompt */
    promptName: string;
    /** The full prompt text sent */
    promptText: string;
    /** ISO 8601 timestamp when the prompt was used */
    timestamp: string;
    /** Duration in milliseconds from prompt send to response */
    durationMs: number;
    /** Outcome of the prompt usage */
    outcome: 'success' | 'partial' | 'failure' | 'pending';
    /** Optional summary of the result */
    resultSummary?: string;
    /** Tags for categorisation and filtering */
    tags: string[];
    /** Contextual metadata */
    context: {
        /** Name of the agent that used the prompt */
        agentName?: string;
        /** Type of task the prompt was used for */
        taskType?: string;
        /** Number of files involved */
        fileCount?: number;
    };
}

/**
 * Computed effectiveness score for a specific prompt.
 */
export interface PromptEffectivenessScore {
    /** The prompt name */
    promptName: string;
    /** Composite effectiveness score (0–100) */
    score: number;
    /** Total number of times this prompt has been used */
    usageCount: number;
    /** Ratio of successful outcomes (0–1) */
    successRate: number;
    /** Average response duration in milliseconds */
    avgDurationMs: number;
    /** ISO 8601 timestamp of the most recent usage */
    lastUsed: string;
    /** Trend direction based on recent performance vs historical */
    trend: 'improving' | 'stable' | 'declining';
}

/**
 * A single entry in the prompt leaderboard.
 */
export interface PromptLeaderboardEntry {
    /** Rank position (1-based) */
    rank: number;
    /** The prompt name */
    promptName: string;
    /** Composite effectiveness score (0–100) */
    score: number;
    /** Total usage count */
    usageCount: number;
    /** Success rate (0–1) */
    successRate: number;
    /** Trend indicator */
    trend: string;
}

// ─── Persistence Shape ───────────────────────────────────────────────

/**
 * On-disk structure stored in `.project/PROMPT-HISTORY.json`.
 */
interface PromptHistoryStore {
    /** Schema version for future migration */
    version: number;
    /** All tracked prompt usages */
    usages: PromptUsage[];
    /** ISO 8601 timestamp of last modification */
    lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const COMPONENT = 'PromptEffectivenessTracker';
const HISTORY_DIR = '.project';
const HISTORY_FILE = 'PROMPT-HISTORY.json';
const STORE_VERSION = 1;

/**
 * Scoring weights for the composite effectiveness score.
 * Must sum to 100.
 */
const WEIGHT_SUCCESS_RATE = 40;
const WEIGHT_USAGE_FREQ = 20;
const WEIGHT_AVG_SPEED = 20;
const WEIGHT_TREND = 20;

/** Maximum acceptable duration in ms (used for speed scoring) */
const MAX_DURATION_MS = 30_000;

/** Minimum usages required for a meaningful trend calculation */
const MIN_TREND_USAGES = 4;

/** Number of recent usages to compare against historical for trend */
const TREND_RECENT_COUNT = 5;

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton service that tracks prompt usage, correlates outcomes,
 * computes effectiveness scores, and generates leaderboard visualizations.
 */
export class PromptEffectivenessTracker {
    // ── Singleton ────────────────────────────────────────────────
    private static instances = new Map<string, PromptEffectivenessTracker>();

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly filePath: string;
    private usages: PromptUsage[];

    // ── Construction ─────────────────────────────────────────────

    private constructor(workspacePath: string) {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.filePath = path.join(workspacePath, HISTORY_DIR, HISTORY_FILE);
        this.usages = this.loadHistorySync();
        this.logger.info(
            `PromptEffectivenessTracker initialized (${this.usages.length} usages)`,
            { component: COMPONENT },
        );
    }

    /**
     * Retrieve (or create) the PromptEffectivenessTracker singleton for a workspace.
     */
    public static getInstance(workspacePath: string): PromptEffectivenessTracker {
        const key = path.resolve(workspacePath);
        let instance = PromptEffectivenessTracker.instances.get(key);
        if (!instance) {
            instance = new PromptEffectivenessTracker(workspacePath);
            PromptEffectivenessTracker.instances.set(key, instance);
        }
        return instance;
    }

    /**
     * Reset all singleton instances. Primarily for tests.
     */
    public static resetInstances(): void {
        PromptEffectivenessTracker.instances.clear();
    }

    // ── Tracking (AICC-0400) ─────────────────────────────────────

    /**
     * Record a new prompt usage event.
     *
     * Generates a unique ID, persists to disk, and emits an event
     * on the EventBus.
     *
     * @param usage Usage data without the `id` field (auto-generated)
     * @returns The complete PromptUsage record with generated ID
     */
    public trackUsage(usage: Omit<PromptUsage, 'id'>): PromptUsage {
        try {
            const record: PromptUsage = {
                id: crypto.randomUUID(),
                ...usage,
            };

            this.usages.push(record);
            this.saveHistorySync();

            this.eventBus.emit('prompt.tracked', {
                timestamp: Date.now(),
                source: COMPONENT,
                usageId: record.id,
                promptName: record.promptName,
            });

            this.logger.info(
                `Tracked prompt usage: ${record.promptName} (${record.id})`,
                { component: COMPONENT },
            );
            return record;
        } catch (err) {
            this.logger.error('Failed to track prompt usage', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Outcome Correlation (AICC-0401) ──────────────────────────

    /**
     * Update the outcome of a previously tracked prompt usage.
     *
     * @param usageId The unique ID of the usage to update
     * @param outcome The outcome to record
     * @param resultSummary Optional summary of the result
     */
    public updateOutcome(
        usageId: string,
        outcome: PromptUsage['outcome'],
        resultSummary?: string,
    ): void {
        try {
            const usage = this.usages.find((u) => u.id === usageId);
            if (!usage) {
                throw new Error(`Prompt usage not found: ${usageId}`);
            }

            usage.outcome = outcome;
            if (resultSummary !== undefined) {
                usage.resultSummary = resultSummary;
            }

            this.saveHistorySync();

            this.eventBus.emit('prompt.outcomeUpdated', {
                timestamp: Date.now(),
                source: COMPONENT,
                usageId,
                outcome,
            });

            this.logger.info(
                `Updated outcome for usage ${usageId}: ${outcome}`,
                { component: COMPONENT },
            );
        } catch (err) {
            this.logger.error(`Failed to update outcome for ${usageId}`, {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Effectiveness Scoring (AICC-0402) ────────────────────────

    /**
     * Compute the effectiveness score for a named prompt.
     *
     * Score formula (0–100):
     *   - successRate   × 40  (ratio of success outcomes)
     *   - usageFrequency × 20  (usage count relative to most-used)
     *   - avgSpeed      × 20  (inverse of avg duration, capped)
     *   - trend         × 20  (recent vs historical success rate)
     *
     * @param promptName The name of the prompt to score
     * @returns Computed effectiveness score
     */
    public computeEffectiveness(promptName: string): PromptEffectivenessScore {
        try {
            const promptUsages = this.usages.filter(
                (u) => u.promptName === promptName,
            );

            if (promptUsages.length === 0) {
                return {
                    promptName,
                    score: 0,
                    usageCount: 0,
                    successRate: 0,
                    avgDurationMs: 0,
                    lastUsed: '',
                    trend: 'stable',
                };
            }

            // Sort by timestamp for trend analysis
            const sorted = [...promptUsages].sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            );

            const usageCount = sorted.length;
            const successRate = this.computeSuccessRate(sorted);
            const avgDurationMs = this.computeAvgDuration(sorted);
            const trend = this.computeTrend(sorted);
            const lastUsed = sorted[sorted.length - 1].timestamp;

            // Compute sub-scores
            const successScore = successRate * WEIGHT_SUCCESS_RATE;
            const freqScore = this.computeFrequencyScore(usageCount) * WEIGHT_USAGE_FREQ;
            const speedScore = this.computeSpeedScore(avgDurationMs) * WEIGHT_AVG_SPEED;
            const trendScore = this.computeTrendScore(trend) * WEIGHT_TREND;

            const score = Math.round(
                Math.min(100, Math.max(0, successScore + freqScore + speedScore + trendScore)),
            );

            return {
                promptName,
                score,
                usageCount,
                successRate: Math.round(successRate * 100) / 100,
                avgDurationMs: Math.round(avgDurationMs),
                lastUsed,
                trend,
            };
        } catch (err) {
            this.logger.error(
                `Failed to compute effectiveness for "${promptName}"`,
                { component: COMPONENT, error: err },
            );
            return {
                promptName,
                score: 0,
                usageCount: 0,
                successRate: 0,
                avgDurationMs: 0,
                lastUsed: '',
                trend: 'stable',
            };
        }
    }

    // ── Leaderboard (AICC-0403) ──────────────────────────────────

    /**
     * Get a ranked leaderboard of prompts sorted by effectiveness score.
     *
     * @param limit Maximum number of entries to return (default: all)
     * @returns Sorted leaderboard entries
     */
    public getLeaderboard(limit?: number): PromptLeaderboardEntry[] {
        try {
            const promptNames = this.getDistinctPromptNames();
            const scores = promptNames.map((name) =>
                this.computeEffectiveness(name),
            );

            scores.sort((a, b) => b.score - a.score);

            const entries: PromptLeaderboardEntry[] = scores.map(
                (s, index) => ({
                    rank: index + 1,
                    promptName: s.promptName,
                    score: s.score,
                    usageCount: s.usageCount,
                    successRate: s.successRate,
                    trend: s.trend,
                }),
            );

            const result = limit && limit > 0 ? entries.slice(0, limit) : entries;
            this.logger.info(
                `Generated leaderboard with ${result.length} entries`,
                { component: COMPONENT },
            );
            return result;
        } catch (err) {
            this.logger.error('Failed to generate leaderboard', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    /**
     * Get filtered and paginated usage history.
     *
     * @param promptName Optional filter by prompt name
     * @param limit Maximum number of results (default: 50)
     * @returns Array of prompt usages, newest first
     */
    public getUsageHistory(
        promptName?: string,
        limit: number = 50,
    ): PromptUsage[] {
        try {
            let results = [...this.usages];

            if (promptName) {
                results = results.filter((u) => u.promptName === promptName);
            }

            // Sort newest first
            results.sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
            );

            return results.slice(0, limit);
        } catch (err) {
            this.logger.error('Failed to get usage history', {
                component: COMPONENT,
                error: err,
            });
            return [];
        }
    }

    // ── HTML Generation (AICC-0403) ──────────────────────────────

    /**
     * Generate an HTML leaderboard table with score badges and trend arrows.
     *
     * @returns Self-contained HTML string
     */
    public generateLeaderboardHtml(): string {
        const entries = this.getLeaderboard();

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt Effectiveness Leaderboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); }
        .container { max-width: 900px; margin: 0 auto; }
        h2 { text-align: center; margin-bottom: 20px; }
        .summary { display: flex; gap: 20px; justify-content: center; margin-bottom: 20px; }
        .stat { text-align: center; background: rgba(128,128,128,0.05); border: 1px solid rgba(128,128,128,0.2); border-radius: 8px; padding: 12px 24px; }
        .stat .value { font-size: 1.8em; font-weight: 700; }
        .stat .label { opacity: 0.7; font-size: 0.85em; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid rgba(128,128,128,0.15); }
        th { font-weight: 600; opacity: 0.8; text-transform: uppercase; font-size: 0.8em; letter-spacing: 0.05em; }
        tr:hover { background: rgba(128,128,128,0.05); }
        .rank { font-weight: 700; width: 40px; }
        .rank-1 { color: #ffd700; }
        .rank-2 { color: #c0c0c0; }
        .rank-3 { color: #cd7f32; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.85em; font-weight: 600; min-width: 36px; text-align: center; }
        .badge-high { background: rgba(76,175,80,0.2); color: #66bb6a; }
        .badge-med { background: rgba(255,152,0,0.2); color: #ffa726; }
        .badge-low { background: rgba(244,67,54,0.2); color: #ef5350; }
        .trend-improving { color: #66bb6a; }
        .trend-stable { color: #90a4ae; }
        .trend-declining { color: #ef5350; }
        .success-bar { display: inline-block; height: 8px; border-radius: 4px; background: rgba(76,175,80,0.6); }
        .success-bg { display: inline-block; height: 8px; width: 80px; border-radius: 4px; background: rgba(128,128,128,0.15); }
        .empty { text-align: center; padding: 40px; opacity: 0.5; }
    </style>
</head>
<body>
    <div class="container">
        <h2>🏆 Prompt Effectiveness Leaderboard</h2>
        <div class="summary">
            <div class="stat">
                <div class="value">${entries.length}</div>
                <div class="label">Tracked Prompts</div>
            </div>
            <div class="stat">
                <div class="value">${this.usages.length}</div>
                <div class="label">Total Usages</div>
            </div>
            <div class="stat">
                <div class="value">${entries.length > 0 ? entries[0].score : 0}</div>
                <div class="label">Top Score</div>
            </div>
        </div>
        ${entries.length === 0
            ? '<div class="empty">No prompt usage data yet. Start tracking prompts to see the leaderboard.</div>'
            : `<table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Prompt</th>
                    <th>Score</th>
                    <th>Uses</th>
                    <th>Success Rate</th>
                    <th>Trend</th>
                </tr>
            </thead>
            <tbody>
                ${entries.map((e) => {
                    const badge = e.score >= 70 ? 'high' : e.score >= 40 ? 'med' : 'low';
                    const rankClass = e.rank <= 3 ? ` rank-${e.rank}` : '';
                    const trendArrow =
                        e.trend === 'improving' ? '↑' :
                        e.trend === 'declining' ? '↓' : '→';
                    const successPct = Math.round(e.successRate * 100);
                    const barWidth = Math.round(e.successRate * 80);
                    return `<tr>
                    <td class="rank${rankClass}">${e.rank}</td>
                    <td>${this.escapeHtml(e.promptName)}</td>
                    <td><span class="badge badge-${badge}">${e.score}</span></td>
                    <td>${e.usageCount}</td>
                    <td>
                        <span class="success-bg"><span class="success-bar" style="width:${barWidth}px"></span></span>
                        ${successPct}%
                    </td>
                    <td class="trend-${e.trend}">${trendArrow} ${e.trend}</td>
                </tr>`;
                }).join('')}
            </tbody>
        </table>`}
    </div>
</body>
</html>`;
    }

    /**
     * Generate a Chart.js line chart showing effectiveness over time
     * for a specific prompt.
     *
     * @param promptName The prompt to chart
     * @returns Self-contained HTML string with embedded Chart.js
     */
    public generateEffectivenessChartHtml(promptName: string): string {
        const promptUsages = this.usages
            .filter((u) => u.promptName === promptName)
            .sort(
                (a, b) =>
                    new Date(a.timestamp).getTime() -
                    new Date(b.timestamp).getTime(),
            );

        // Compute running success rate at each usage
        const labels: string[] = [];
        const successRates: number[] = [];
        const durations: number[] = [];
        let successes = 0;
        let total = 0;

        for (const usage of promptUsages) {
            total++;
            if (usage.outcome === 'success') {
                successes++;
            }
            labels.push(usage.timestamp.slice(0, 10));
            successRates.push(Math.round((successes / total) * 100));
            durations.push(usage.durationMs);
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prompt Effectiveness: ${this.escapeHtml(promptName)}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 20px; background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); }
        .container { max-width: 800px; margin: 0 auto; }
        h2 { text-align: center; }
        .chart-wrapper { position: relative; height: 400px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>📈 ${this.escapeHtml(promptName)}</h2>
        <div class="chart-wrapper">
            <canvas id="effectivenessChart"></canvas>
        </div>
    </div>
    <script>
        const ctx = document.getElementById('effectivenessChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(labels)},
                datasets: [
                    {
                        label: 'Success Rate (%)',
                        data: ${JSON.stringify(successRates)},
                        borderColor: '#66bb6a',
                        backgroundColor: 'rgba(102,187,106,0.1)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Duration (ms)',
                        data: ${JSON.stringify(durations)},
                        borderColor: '#42a5f5',
                        backgroundColor: 'rgba(66,165,245,0.1)',
                        fill: false,
                        tension: 0.3,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        min: 0,
                        max: 100,
                        title: { display: true, text: 'Success Rate (%)' }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        min: 0,
                        title: { display: true, text: 'Duration (ms)' },
                        grid: { drawOnChartArea: false }
                    }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    </script>
</body>
</html>`;
    }

    // ── Pruning ──────────────────────────────────────────────────

    /**
     * Remove usage records older than the specified number of days.
     *
     * @param maxAgeDays Maximum age in days; older records are removed
     * @returns Number of records removed
     */
    public pruneOldUsages(maxAgeDays: number): number {
        try {
            const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
            const before = this.usages.length;

            this.usages = this.usages.filter(
                (u) => new Date(u.timestamp).getTime() >= cutoff,
            );

            const removed = before - this.usages.length;

            if (removed > 0) {
                this.saveHistorySync();
                this.logger.info(
                    `Pruned ${removed} old usages (threshold: ${maxAgeDays} days)`,
                    { component: COMPONENT },
                );
            }

            return removed;
        } catch (err) {
            this.logger.error('Failed to prune old usages', {
                component: COMPONENT,
                error: err,
            });
            return 0;
        }
    }

    // ── Private: Persistence ─────────────────────────────────────

    /**
     * Load usage history from `.project/PROMPT-HISTORY.json`.
     * Returns an empty array if the file does not exist or is malformed.
     */
    private loadHistorySync(): PromptUsage[] {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed: unknown = JSON.parse(raw);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    Array.isArray((parsed as PromptHistoryStore).usages)
                ) {
                    this.logger.info(
                        `Loaded ${(parsed as PromptHistoryStore).usages.length} prompt usages`,
                        { component: COMPONENT },
                    );
                    return (parsed as PromptHistoryStore).usages;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(
                `Failed to load PROMPT-HISTORY.json, starting fresh: ${msg}`,
                { component: COMPONENT },
            );
        }
        return [];
    }

    /**
     * Persist usage history atomically via temp-file + rename.
     */
    private saveHistorySync(): void {
        const dir = path.dirname(this.filePath);

        const store: PromptHistoryStore = {
            version: STORE_VERSION,
            usages: this.usages,
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
            this.logger.error('Failed to save prompt history', {
                component: COMPONENT,
                error: err instanceof Error ? err.message : String(err),
            });
            // Attempt cleanup on failure
            try {
                if (fs.existsSync(tmpPath)) {
                    fs.unlinkSync(tmpPath);
                }
            } catch {
                // Ignore cleanup failure
            }
        }
    }

    // ── Private: Scoring Helpers ─────────────────────────────────

    /**
     * Compute success rate from usage records.
     * 'partial' counts as 0.5 success.
     */
    private computeSuccessRate(usages: PromptUsage[]): number {
        if (usages.length === 0) {
            return 0;
        }
        let score = 0;
        let counted = 0;
        for (const u of usages) {
            if (u.outcome === 'pending') {
                continue; // Skip pending outcomes
            }
            counted++;
            if (u.outcome === 'success') {
                score += 1;
            } else if (u.outcome === 'partial') {
                score += 0.5;
            }
        }
        return counted > 0 ? score / counted : 0;
    }

    /**
     * Compute average duration from usage records.
     */
    private computeAvgDuration(usages: PromptUsage[]): number {
        if (usages.length === 0) {
            return 0;
        }
        const total = usages.reduce((sum, u) => sum + u.durationMs, 0);
        return total / usages.length;
    }

    /**
     * Determine trend direction by comparing recent success rate
     * against historical success rate.
     */
    private computeTrend(
        usages: PromptUsage[],
    ): 'improving' | 'stable' | 'declining' {
        if (usages.length < MIN_TREND_USAGES) {
            return 'stable';
        }

        const recentStart = Math.max(0, usages.length - TREND_RECENT_COUNT);
        const recent = usages.slice(recentStart);
        const historical = usages.slice(0, recentStart);

        if (historical.length === 0) {
            return 'stable';
        }

        const recentRate = this.computeSuccessRate(recent);
        const historicalRate = this.computeSuccessRate(historical);
        const diff = recentRate - historicalRate;

        if (diff > 0.1) {
            return 'improving';
        }
        if (diff < -0.1) {
            return 'declining';
        }
        return 'stable';
    }

    /**
     * Compute a normalised frequency score (0–1) based on usage count
     * relative to the most-used prompt.
     */
    private computeFrequencyScore(usageCount: number): number {
        const maxCount = this.getMaxUsageCount();
        if (maxCount === 0) {
            return 0;
        }
        return Math.min(1, usageCount / maxCount);
    }

    /**
     * Compute a normalised speed score (0–1).
     * Lower duration = higher score.
     */
    private computeSpeedScore(avgDurationMs: number): number {
        if (avgDurationMs <= 0) {
            return 1;
        }
        return Math.max(0, 1 - avgDurationMs / MAX_DURATION_MS);
    }

    /**
     * Convert a trend direction to a normalised score (0–1).
     */
    private computeTrendScore(
        trend: 'improving' | 'stable' | 'declining',
    ): number {
        switch (trend) {
            case 'improving':
                return 1;
            case 'stable':
                return 0.5;
            case 'declining':
                return 0;
        }
    }

    /**
     * Get the maximum usage count across all prompts.
     */
    private getMaxUsageCount(): number {
        const counts = new Map<string, number>();
        for (const u of this.usages) {
            counts.set(u.promptName, (counts.get(u.promptName) || 0) + 1);
        }
        let max = 0;
        for (const count of counts.values()) {
            if (count > max) {
                max = count;
            }
        }
        return max;
    }

    /**
     * Get all distinct prompt names from usage history.
     */
    private getDistinctPromptNames(): string[] {
        const names = new Set<string>();
        for (const u of this.usages) {
            names.add(u.promptName);
        }
        return Array.from(names);
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
