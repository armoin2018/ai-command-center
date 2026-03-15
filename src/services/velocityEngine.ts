/**
 * Planning Velocity Engine
 *
 * Sprint velocity computation, burndown generation, cycle-time analysis,
 * and predictive sprint forecasting from PLAN-HISTORY.json snapshots.
 *
 * Part of AICC-0133: Planning Velocity Engine
 *   - AICC-0134: Velocity computation & charts
 *     - AICC-0365: Implement velocity calculator from PLAN-HISTORY.json
 *     - AICC-0366: Build burndown chart component
 *     - AICC-0367: Create velocity trend chart component
 *   - AICC-0135: Predictive estimates & MCP resource
 *     - AICC-0368: Implement prediction algorithm from velocity data
 *     - AICC-0369: Create MCP resource for velocity data
 *     - AICC-0370: Build sprint forecast display in planning tab
 *
 * REQ-VEL-001 to REQ-VEL-008
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EventBus } from './eventBus';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A snapshot of a single sprint's work data captured at a point in time.
 */
export interface SprintSnapshot {
    /** Sprint number (1-based) */
    sprint: number;
    /** Sprint start date (ISO 8601) */
    startDate: string;
    /** Sprint end date (ISO 8601) */
    endDate: string;
    /** Number of items planned for this sprint */
    itemsPlanned: number;
    /** Number of items completed in this sprint */
    itemsCompleted: number;
    /** Total story points planned */
    storyPointsPlanned: number;
    /** Total story points completed */
    storyPointsCompleted: number;
    /** IDs of items included in this sprint */
    itemIds: string[];
}

/**
 * Aggregated velocity metrics computed from sprint snapshots.
 */
export interface VelocityMetrics {
    /** All sprint snapshots used for computation */
    sprints: SprintSnapshot[];
    /** Average items completed per sprint */
    averageVelocity: number;
    /** Average story points completed per sprint */
    averageStoryPoints: number;
    /** Whether velocity is increasing, stable, or decreasing */
    velocityTrend: 'increasing' | 'stable' | 'decreasing';
    /** Average cycle time in days (start-to-done per item) */
    cycleTimeAvg: number;
    /** Average throughput (items completed per day) */
    throughputAvg: number;
}

/**
 * Burndown data for a single sprint — actual vs ideal remaining items.
 */
export interface BurndownData {
    /** Sprint number */
    sprint: number;
    /** Total items at sprint start */
    totalItems: number;
    /** Daily remaining-item entries */
    dailyRemaining: {
        /** Date (YYYY-MM-DD) */
        date: string;
        /** Actual remaining items on this date */
        remaining: number;
        /** Ideal remaining items for a linear burndown */
        ideal: number;
    }[];
}

/**
 * Predicted completion forecast based on velocity data.
 */
export interface SprintForecast {
    /** Number of remaining items to complete */
    remainingItems: number;
    /** Estimated number of sprints needed */
    estimatedSprints: number;
    /** Estimated completion date (ISO 8601) */
    estimatedCompletionDate: string;
    /** Confidence level based on velocity consistency */
    confidence: 'high' | 'medium' | 'low';
    /** Best-case scenario sprints (using highest velocity) */
    scenarioBest: number;
    /** Worst-case scenario sprints (using lowest velocity) */
    scenarioWorst: number;
}

// ─── Persistence Shape ───────────────────────────────────────────────

/**
 * On-disk structure stored in `.project/PLAN-HISTORY.json`.
 */
interface PlanHistoryStore {
    /** Schema version for future migration */
    version: number;
    /** Sprint snapshot records */
    snapshots: SprintSnapshot[];
    /** Last updated timestamp */
    lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Directory for plan history storage, relative to workspace root. */
const PROJECT_DIR = '.project';
/** Plan history file name. */
const HISTORY_FILE = 'PLAN-HISTORY.json';
/** Plan file name. */
const PLAN_FILE = 'PLAN.json';
/** Default sprint duration in days. */
const DEFAULT_SPRINT_DAYS = 14;
/** Minimum sprints required for trend detection. */
const MIN_SPRINTS_FOR_TREND = 3;
/** Trend detection threshold (percentage change). */
const TREND_THRESHOLD = 0.1;

// ─── VelocityEngine ──────────────────────────────────────────────────

/**
 * Singleton service that computes sprint velocity, generates burndown
 * charts, and produces completion forecasts from PLAN-HISTORY.json.
 *
 * @example
 * ```ts
 * const engine = VelocityEngine.getInstance();
 * const snapshots = await engine.loadHistory();
 * const metrics = engine.computeVelocity(snapshots);
 * const forecast = engine.forecastCompletion(25, metrics);
 * ```
 */
export class VelocityEngine {
    // ── Singleton ────────────────────────────────────────────────

    private static instance: VelocityEngine | undefined;

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): VelocityEngine {
        if (!VelocityEngine.instance) {
            VelocityEngine.instance = new VelocityEngine();
        }
        return VelocityEngine.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        VelocityEngine.instance = undefined;
    }

    // ── State ────────────────────────────────────────────────────

    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    /** Cached snapshots loaded from disk. */
    private cachedSnapshots: SprintSnapshot[] | undefined;

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    // ─── Workspace Helpers ───────────────────────────────────────

    /**
     * Get the workspace root folder path, or undefined if no workspace is open.
     */
    private getWorkspaceRoot(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;
    }

    /**
     * Get the absolute path to a file within the `.project` directory.
     */
    private getProjectFilePath(filename: string): string | undefined {
        const root = this.getWorkspaceRoot();
        if (!root) {
            return undefined;
        }
        return path.join(root, PROJECT_DIR, filename);
    }

    // ─── History Loading (AICC-0365) ─────────────────────────────

    /**
     * Load sprint snapshot history from `.project/PLAN-HISTORY.json`.
     *
     * If the history file does not exist, attempts to compute snapshots
     * from the current PLAN.json by grouping items by sprint tags.
     *
     * @returns Array of sprint snapshots, sorted by sprint number.
     */
    public async loadHistory(): Promise<SprintSnapshot[]> {
        if (this.cachedSnapshots) {
            return this.cachedSnapshots;
        }

        const historyPath = this.getProjectFilePath(HISTORY_FILE);
        if (!historyPath) {
            this.logger.warn('VelocityEngine: no workspace folder open', {
                component: 'VelocityEngine',
            });
            return [];
        }

        try {
            const raw = await fs.promises.readFile(historyPath, 'utf-8');
            const store: PlanHistoryStore = JSON.parse(raw);

            if (!store.snapshots || !Array.isArray(store.snapshots)) {
                this.logger.warn(
                    'VelocityEngine: PLAN-HISTORY.json has invalid format, computing from PLAN.json',
                    { component: 'VelocityEngine' },
                );
                return this.computeFromPlan();
            }

            const sorted = store.snapshots.sort((a, b) => a.sprint - b.sprint);
            this.cachedSnapshots = sorted;
            this.logger.debug(
                `VelocityEngine: loaded ${sorted.length} sprint snapshots from history`,
                { component: 'VelocityEngine' },
            );
            return sorted;
        } catch (err: unknown) {
            if (
                err instanceof Error &&
                'code' in err &&
                (err as NodeJS.ErrnoException).code === 'ENOENT'
            ) {
                this.logger.info(
                    'VelocityEngine: PLAN-HISTORY.json not found, computing from PLAN.json',
                    { component: 'VelocityEngine' },
                );
                return this.computeFromPlan();
            }

            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `VelocityEngine: failed to load history: ${message}`,
                { component: 'VelocityEngine', error: err },
            );
            return [];
        }
    }

    /**
     * Compute sprint snapshots from the current PLAN.json by examining
     * item tags for sprint markers (e.g. `sprint:1`, `sprint:2`) and
     * status fields for completion.
     */
    private async computeFromPlan(): Promise<SprintSnapshot[]> {
        const planPath = this.getProjectFilePath(PLAN_FILE);
        if (!planPath) {
            return [];
        }

        try {
            const raw = await fs.promises.readFile(planPath, 'utf-8');
            const plan = JSON.parse(raw);

            if (!plan.items || !Array.isArray(plan.items)) {
                this.logger.warn(
                    'VelocityEngine: PLAN.json has no items array',
                    { component: 'VelocityEngine' },
                );
                return [];
            }

            // Group items by sprint tag
            const sprintMap = new Map<number, {
                ids: string[];
                planned: number;
                completed: number;
                pointsPlanned: number;
                pointsCompleted: number;
            }>();

            for (const item of plan.items) {
                const sprintTag = (item.tags || []).find(
                    (t: string) => /^sprint:\d+$/i.test(t),
                );
                if (!sprintTag) {
                    continue;
                }

                const sprintNum = parseInt(sprintTag.split(':')[1], 10);
                if (isNaN(sprintNum)) {
                    continue;
                }

                let bucket = sprintMap.get(sprintNum);
                if (!bucket) {
                    bucket = {
                        ids: [],
                        planned: 0,
                        completed: 0,
                        pointsPlanned: 0,
                        pointsCompleted: 0,
                    };
                    sprintMap.set(sprintNum, bucket);
                }

                bucket.ids.push(item.id);
                bucket.planned += 1;

                const points = item.estimatedHours ?? 0;
                bucket.pointsPlanned += points;

                const doneStatuses = ['done', 'closed', 'resolved'];
                if (doneStatuses.includes(item.status?.toLowerCase())) {
                    bucket.completed += 1;
                    bucket.pointsCompleted += points;
                }
            }

            // Convert to snapshots with synthetic dates
            const snapshots: SprintSnapshot[] = [];
            const sortedSprints = Array.from(sprintMap.keys()).sort(
                (a, b) => a - b,
            );

            const baseDate = new Date();
            baseDate.setDate(
                baseDate.getDate() -
                    sortedSprints.length * DEFAULT_SPRINT_DAYS,
            );

            for (let i = 0; i < sortedSprints.length; i++) {
                const sprintNum = sortedSprints[i];
                const bucket = sprintMap.get(sprintNum)!;

                const startDate = new Date(baseDate);
                startDate.setDate(
                    startDate.getDate() + i * DEFAULT_SPRINT_DAYS,
                );

                const endDate = new Date(startDate);
                endDate.setDate(
                    endDate.getDate() + DEFAULT_SPRINT_DAYS - 1,
                );

                snapshots.push({
                    sprint: sprintNum,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    itemsPlanned: bucket.planned,
                    itemsCompleted: bucket.completed,
                    storyPointsPlanned: bucket.pointsPlanned,
                    storyPointsCompleted: bucket.pointsCompleted,
                    itemIds: bucket.ids,
                });
            }

            if (snapshots.length > 0) {
                this.cachedSnapshots = snapshots;
                await this.saveHistory(snapshots);
                this.logger.info(
                    `VelocityEngine: computed ${snapshots.length} sprint snapshots from PLAN.json`,
                    { component: 'VelocityEngine' },
                );
            }

            return snapshots;
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `VelocityEngine: failed to compute from PLAN.json: ${message}`,
                { component: 'VelocityEngine', error: err },
            );
            return [];
        }
    }

    // ─── Velocity Computation (AICC-0365) ────────────────────────

    /**
     * Compute aggregated velocity metrics from sprint snapshots.
     *
     * Calculates average velocity, story-point averages, trend detection,
     * cycle time, and throughput.
     *
     * @param snapshots - Array of sprint snapshots to analyse.
     * @returns Computed velocity metrics.
     */
    public computeVelocity(snapshots: SprintSnapshot[]): VelocityMetrics {
        if (snapshots.length === 0) {
            return {
                sprints: [],
                averageVelocity: 0,
                averageStoryPoints: 0,
                velocityTrend: 'stable',
                cycleTimeAvg: 0,
                throughputAvg: 0,
            };
        }

        const velocities = snapshots.map((s) => s.itemsCompleted);
        const storyPoints = snapshots.map((s) => s.storyPointsCompleted);

        const averageVelocity =
            velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
        const averageStoryPoints =
            storyPoints.reduce((sum, v) => sum + v, 0) / storyPoints.length;

        const velocityTrend = this.detectTrend(velocities);

        // Cycle time: average sprint duration / average items completed
        // Approximation: if a sprint is DEFAULT_SPRINT_DAYS and avg velocity is V,
        // then cycle time ≈ sprint_days / velocity
        const cycleTimeAvg =
            averageVelocity > 0
                ? DEFAULT_SPRINT_DAYS / averageVelocity
                : 0;

        // Throughput: average items completed per day
        const throughputAvg =
            averageVelocity > 0
                ? averageVelocity / DEFAULT_SPRINT_DAYS
                : 0;

        const metrics: VelocityMetrics = {
            sprints: snapshots,
            averageVelocity: Math.round(averageVelocity * 100) / 100,
            averageStoryPoints: Math.round(averageStoryPoints * 100) / 100,
            velocityTrend,
            cycleTimeAvg: Math.round(cycleTimeAvg * 100) / 100,
            throughputAvg: Math.round(throughputAvg * 1000) / 1000,
        };

        this.logger.debug(
            `VelocityEngine: computed velocity — avg=${metrics.averageVelocity}, trend=${metrics.velocityTrend}`,
            { component: 'VelocityEngine' },
        );

        return metrics;
    }

    // ─── Trend Detection (AICC-0365) ─────────────────────────────

    /**
     * Detect whether velocity is increasing, stable, or decreasing
     * using a 3-sprint moving average comparison.
     *
     * @param velocities - Array of items-completed values per sprint.
     * @returns Trend direction.
     */
    public detectTrend(
        velocities: number[],
    ): 'increasing' | 'stable' | 'decreasing' {
        if (velocities.length < MIN_SPRINTS_FOR_TREND) {
            return 'stable';
        }

        // Compute 3-sprint moving averages
        const movingAverages: number[] = [];
        for (let i = 2; i < velocities.length; i++) {
            const avg =
                (velocities[i - 2] + velocities[i - 1] + velocities[i]) / 3;
            movingAverages.push(avg);
        }

        if (movingAverages.length < 2) {
            return 'stable';
        }

        // Compare first half to second half of moving averages
        const midpoint = Math.floor(movingAverages.length / 2);
        const firstHalf = movingAverages.slice(0, midpoint);
        const secondHalf = movingAverages.slice(midpoint);

        const firstAvg =
            firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
        const secondAvg =
            secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

        if (firstAvg === 0) {
            return secondAvg > 0 ? 'increasing' : 'stable';
        }

        const changeRate = (secondAvg - firstAvg) / firstAvg;

        if (changeRate > TREND_THRESHOLD) {
            return 'increasing';
        } else if (changeRate < -TREND_THRESHOLD) {
            return 'decreasing';
        }
        return 'stable';
    }

    // ─── Burndown Generation (AICC-0366) ─────────────────────────

    /**
     * Generate burndown data for a specific sprint.
     *
     * Creates daily remaining-item entries with both actual (linear
     * approximation) and ideal burndown lines.
     *
     * @param sprint - Sprint number to generate burndown for.
     * @returns Burndown data for the sprint.
     */
    public async generateBurndown(sprint: number): Promise<BurndownData> {
        const snapshots = await this.loadHistory();
        const snapshot = snapshots.find((s) => s.sprint === sprint);

        if (!snapshot) {
            this.logger.warn(
                `VelocityEngine: no snapshot found for sprint ${sprint}`,
                { component: 'VelocityEngine' },
            );
            return {
                sprint,
                totalItems: 0,
                dailyRemaining: [],
            };
        }

        const totalItems = snapshot.itemsPlanned;
        const completed = snapshot.itemsCompleted;
        const startDate = new Date(snapshot.startDate);
        const endDate = new Date(snapshot.endDate);

        // Calculate number of days in the sprint
        const sprintDays = Math.max(
            1,
            Math.ceil(
                (endDate.getTime() - startDate.getTime()) /
                    (1000 * 60 * 60 * 24),
            ) + 1,
        );

        const dailyRemaining: BurndownData['dailyRemaining'] = [];
        const idealBurnRate = totalItems / sprintDays;

        // Simulate daily burndown — linear approximation for actual
        const actualBurnRate = completed / sprintDays;

        for (let day = 0; day < sprintDays; day++) {
            const currentDate = new Date(startDate);
            currentDate.setDate(currentDate.getDate() + day);

            const idealRemaining = Math.max(
                0,
                Math.round((totalItems - idealBurnRate * (day + 1)) * 100) /
                    100,
            );
            const actualRemaining = Math.max(
                0,
                Math.round(
                    (totalItems - actualBurnRate * (day + 1)) * 100,
                ) / 100,
            );

            dailyRemaining.push({
                date: currentDate.toISOString().split('T')[0],
                remaining: actualRemaining,
                ideal: idealRemaining,
            });
        }

        return {
            sprint,
            totalItems,
            dailyRemaining,
        };
    }

    // ─── Forecast (AICC-0368) ────────────────────────────────────

    /**
     * Forecast completion of remaining work using velocity data.
     *
     * Uses average velocity for the estimate, highest sprint velocity
     * for best-case, and lowest for worst-case. Confidence is derived
     * from velocity consistency (coefficient of variation).
     *
     * @param remainingItems - Number of items still to complete.
     * @param metrics - Pre-computed velocity metrics.
     * @returns Sprint forecast with scenarios and confidence level.
     */
    public forecastCompletion(
        remainingItems: number,
        metrics: VelocityMetrics,
    ): SprintForecast {
        if (
            remainingItems <= 0 ||
            metrics.averageVelocity <= 0 ||
            metrics.sprints.length === 0
        ) {
            return {
                remainingItems: Math.max(0, remainingItems),
                estimatedSprints: 0,
                estimatedCompletionDate: new Date().toISOString(),
                confidence: 'low',
                scenarioBest: 0,
                scenarioWorst: 0,
            };
        }

        const velocities = metrics.sprints.map((s) => s.itemsCompleted);
        const maxVelocity = Math.max(...velocities);
        const minVelocity = Math.max(1, Math.min(...velocities));

        // Estimated sprints using average velocity
        const estimatedSprints = Math.ceil(
            remainingItems / metrics.averageVelocity,
        );

        // Best / worst case
        const scenarioBest = Math.ceil(remainingItems / maxVelocity);
        const scenarioWorst = Math.ceil(remainingItems / minVelocity);

        // Confidence based on coefficient of variation
        const mean = metrics.averageVelocity;
        const variance =
            velocities.reduce(
                (sum, v) => sum + Math.pow(v - mean, 2),
                0,
            ) / velocities.length;
        const stdDev = Math.sqrt(variance);
        const cv = mean > 0 ? stdDev / mean : 1;

        let confidence: 'high' | 'medium' | 'low';
        if (cv < 0.2 && metrics.sprints.length >= 5) {
            confidence = 'high';
        } else if (cv < 0.4 && metrics.sprints.length >= 3) {
            confidence = 'medium';
        } else {
            confidence = 'low';
        }

        // Estimated completion date
        const now = new Date();
        const completionDate = new Date(now);
        completionDate.setDate(
            completionDate.getDate() +
                estimatedSprints * DEFAULT_SPRINT_DAYS,
        );

        const forecast: SprintForecast = {
            remainingItems,
            estimatedSprints,
            estimatedCompletionDate: completionDate.toISOString(),
            confidence,
            scenarioBest,
            scenarioWorst,
        };

        this.eventBus.emit('velocity.forecast.computed', {
            timestamp: Date.now(),
            forecast,
        });

        this.logger.info(
            `VelocityEngine: forecast — ${estimatedSprints} sprints, confidence=${confidence}`,
            { component: 'VelocityEngine' },
        );

        return forecast;
    }

    // ─── Sprint Recording (AICC-0365) ────────────────────────────

    /**
     * Record a snapshot of the current sprint state from PLAN.json.
     *
     * Scans items tagged with the given sprint number and creates a
     * SprintSnapshot capturing current planned/completed counts.
     *
     * @param sprint - Sprint number to record.
     * @returns The created snapshot.
     */
    public async recordCurrentSprint(
        sprint: number,
    ): Promise<SprintSnapshot> {
        const planPath = this.getProjectFilePath(PLAN_FILE);
        if (!planPath) {
            throw new Error(
                'VelocityEngine: no workspace folder open',
            );
        }

        let plan: { items?: unknown[] };
        try {
            const raw = await fs.promises.readFile(planPath, 'utf-8');
            plan = JSON.parse(raw);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(
                `VelocityEngine: failed to read PLAN.json: ${message}`,
            );
        }

        if (!plan.items || !Array.isArray(plan.items)) {
            throw new Error(
                'VelocityEngine: PLAN.json contains no items array',
            );
        }

        const sprintTag = `sprint:${sprint}`;
        const items = plan.items as Record<string, unknown>[];
        const sprintItems = items.filter((item) => {
            const tags = item.tags as string[] | undefined;
            return tags?.some(
                (t: string) => t.toLowerCase() === sprintTag.toLowerCase(),
            );
        });

        const doneStatuses = ['done', 'closed', 'resolved'];
        let completed = 0;
        let pointsPlanned = 0;
        let pointsCompleted = 0;
        const itemIds: string[] = [];

        for (const item of sprintItems) {
            const rec = item as Record<string, unknown>;
            itemIds.push(rec.id as string);
            const points = (rec.estimatedHours as number) ?? 0;
            pointsPlanned += points;

            if (
                doneStatuses.includes(
                    (rec.status as string)?.toLowerCase(),
                )
            ) {
                completed += 1;
                pointsCompleted += points;
            }
        }

        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(
            startDate.getDate() - (DEFAULT_SPRINT_DAYS - 1),
        );

        const snapshot: SprintSnapshot = {
            sprint,
            startDate: startDate.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0],
            itemsPlanned: sprintItems.length,
            itemsCompleted: completed,
            storyPointsPlanned: pointsPlanned,
            storyPointsCompleted: pointsCompleted,
            itemIds,
        };

        // Merge into cached snapshots and persist
        const snapshots = await this.loadHistory();
        const existingIndex = snapshots.findIndex(
            (s) => s.sprint === sprint,
        );
        if (existingIndex >= 0) {
            snapshots[existingIndex] = snapshot;
        } else {
            snapshots.push(snapshot);
            snapshots.sort((a, b) => a.sprint - b.sprint);
        }

        this.cachedSnapshots = snapshots;
        await this.saveHistory(snapshots);

        this.eventBus.emit('velocity.sprint.recorded', {
            timestamp: Date.now(),
            sprint,
            snapshot,
        });

        this.logger.info(
            `VelocityEngine: recorded sprint ${sprint} — ${completed}/${sprintItems.length} items completed`,
            { component: 'VelocityEngine' },
        );

        return snapshot;
    }

    // ─── Persistence (AICC-0365) ─────────────────────────────────

    /**
     * Persist sprint snapshots to `.project/PLAN-HISTORY.json`.
     *
     * Uses atomic write strategy (temp file + rename) to prevent
     * data corruption.
     *
     * @param snapshots - Snapshots to persist.
     */
    public async saveHistory(snapshots: SprintSnapshot[]): Promise<void> {
        const filePath = this.getProjectFilePath(HISTORY_FILE);
        if (!filePath) {
            this.logger.warn(
                'VelocityEngine: cannot save — no workspace folder open',
                { component: 'VelocityEngine' },
            );
            return;
        }

        try {
            const store: PlanHistoryStore = {
                version: 1,
                snapshots,
                lastUpdated: new Date().toISOString(),
            };

            const json = JSON.stringify(store, null, 2);
            const dir = path.dirname(filePath);
            await fs.promises.mkdir(dir, { recursive: true });

            // Atomic write via temp file + rename
            const tmpPath = filePath + `.tmp.${process.pid}`;
            await fs.promises.writeFile(tmpPath, json, 'utf-8');
            await fs.promises.rename(tmpPath, filePath);

            this.logger.debug(
                `VelocityEngine: saved ${snapshots.length} snapshots to disk`,
                { component: 'VelocityEngine' },
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `VelocityEngine: failed to save history: ${message}`,
                { component: 'VelocityEngine', error: err },
            );
        }
    }

    // ─── Chart Generation (AICC-0366, AICC-0367) ─────────────────

    /**
     * Generate an HTML snippet containing a Chart.js bar chart of
     * sprint velocities (items completed per sprint).
     *
     * @param metrics - Computed velocity metrics.
     * @returns HTML string with embedded Chart.js chart.
     */
    public generateVelocityChartHtml(metrics: VelocityMetrics): string {
        const labels = metrics.sprints.map((s) => `Sprint ${s.sprint}`);
        const completedData = metrics.sprints.map(
            (s) => s.itemsCompleted,
        );
        const plannedData = metrics.sprints.map((s) => s.itemsPlanned);

        return `
<div class="velocity-chart-container" style="max-width:700px;margin:0 auto;">
    <canvas id="velocityChart" width="700" height="350"></canvas>
    <script>
    (function() {
        const ctx = document.getElementById('velocityChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ${JSON.stringify(labels)},
                datasets: [
                    {
                        label: 'Completed',
                        data: ${JSON.stringify(completedData)},
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Planned',
                        data: ${JSON.stringify(plannedData)},
                        backgroundColor: 'rgba(0, 123, 255, 0.3)',
                        borderColor: 'rgba(0, 123, 255, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sprint Velocity',
                        font: { size: 16 }
                    },
                    annotation: {
                        annotations: {
                            avgLine: {
                                type: 'line',
                                yMin: ${metrics.averageVelocity},
                                yMax: ${metrics.averageVelocity},
                                borderColor: 'rgba(255, 193, 7, 0.8)',
                                borderWidth: 2,
                                borderDash: [6, 6],
                                label: {
                                    display: true,
                                    content: 'Avg: ${metrics.averageVelocity}',
                                    position: 'end'
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Items' }
                    }
                }
            }
        });
    })();
    </script>
</div>`;
    }

    /**
     * Generate an HTML snippet containing a Chart.js line chart
     * showing actual vs ideal burndown for a sprint.
     *
     * @param burndown - Burndown data for the sprint.
     * @returns HTML string with embedded Chart.js chart.
     */
    public generateBurndownChartHtml(burndown: BurndownData): string {
        const labels = burndown.dailyRemaining.map((d) => d.date);
        const actualData = burndown.dailyRemaining.map(
            (d) => d.remaining,
        );
        const idealData = burndown.dailyRemaining.map((d) => d.ideal);

        return `
<div class="burndown-chart-container" style="max-width:700px;margin:0 auto;">
    <canvas id="burndownChart" width="700" height="350"></canvas>
    <script>
    (function() {
        const ctx = document.getElementById('burndownChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(labels)},
                datasets: [
                    {
                        label: 'Actual Remaining',
                        data: ${JSON.stringify(actualData)},
                        borderColor: 'rgba(220, 53, 69, 1)',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        fill: true,
                        tension: 0.3
                    },
                    {
                        label: 'Ideal Remaining',
                        data: ${JSON.stringify(idealData)},
                        borderColor: 'rgba(108, 117, 125, 0.8)',
                        borderDash: [6, 6],
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sprint ${burndown.sprint} Burndown',
                        font: { size: 16 }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Remaining Items' }
                    },
                    x: {
                        title: { display: true, text: 'Date' }
                    }
                }
            }
        });
    })();
    </script>
</div>`;
    }

    // ─── Forecast Display (AICC-0370) ────────────────────────────

    /**
     * Generate an HTML card displaying sprint forecast data with
     * scenarios and confidence indicator.
     *
     * @param forecast - Sprint forecast data.
     * @returns HTML string with forecast card.
     */
    public generateForecastHtml(forecast: SprintForecast): string {
        const confidenceColors: Record<string, string> = {
            high: '#28a745',
            medium: '#ffc107',
            low: '#dc3545',
        };
        const color =
            confidenceColors[forecast.confidence] || '#6c757d';

        const completionDate = new Date(
            forecast.estimatedCompletionDate,
        ).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        return `
<div class="forecast-card" style="max-width:500px;margin:0 auto;border:1px solid #dee2e6;border-radius:8px;padding:24px;font-family:system-ui,sans-serif;">
    <h3 style="margin-top:0;color:#212529;">Sprint Forecast</h3>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
        <div style="background:#f8f9fa;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#0d6efd;">${forecast.estimatedSprints}</div>
            <div style="font-size:12px;color:#6c757d;">Estimated Sprints</div>
        </div>
        <div style="background:#f8f9fa;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:28px;font-weight:700;color:#6610f2;">${forecast.remainingItems}</div>
            <div style="font-size:12px;color:#6c757d;">Remaining Items</div>
        </div>
    </div>

    <div style="margin-bottom:16px;">
        <div style="font-size:14px;color:#495057;margin-bottom:4px;">Estimated Completion</div>
        <div style="font-size:18px;font-weight:600;">${completionDate}</div>
    </div>

    <div style="margin-bottom:16px;">
        <div style="font-size:14px;color:#495057;margin-bottom:4px;">Confidence</div>
        <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:13px;font-weight:600;color:#fff;background:${color};text-transform:uppercase;">${forecast.confidence}</span>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="background:#d4edda;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#155724;">${forecast.scenarioBest}</div>
            <div style="font-size:12px;color:#155724;">Best Case (sprints)</div>
        </div>
        <div style="background:#f8d7da;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:20px;font-weight:700;color:#721c24;">${forecast.scenarioWorst}</div>
            <div style="font-size:12px;color:#721c24;">Worst Case (sprints)</div>
        </div>
    </div>
</div>`;
    }

    /**
     * Invalidate the cached snapshots so the next load reads from disk.
     */
    public invalidateCache(): void {
        this.cachedSnapshots = undefined;
    }
}
