/**
 * Workspace Telemetry Collector Service
 *
 * Local-only command/tool/skill tracking with dashboard generation.
 * All data stays local in `.project/telemetry.json`. Opt-in via the
 * `aicc.telemetry.enabled` setting (default: false).
 *
 * Part of AICC-0136: Workspace Telemetry
 *   - AICC-0137: Telemetry tracking & persistence
 *   - AICC-0371: Build telemetry collector service
 *   - AICC-0372: Implement file persistence to telemetry.json
 *   - AICC-0373: Add opt-in configuration setting
 *   - AICC-0374: Build daily data aggregation and pruning
 *   - AICC-0138: Telemetry dashboard tab & MCP resource
 *   - AICC-0375: Create telemetry dashboard tab HTML
 *   - AICC-0376: Implement chart rendering with Chart.js
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Logger } from '../logger';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single telemetry event recorded by the collector.
 */
export interface TelemetryEvent {
    /** Unique event identifier */
    id: string;
    /** Category of the event */
    type: 'command' | 'tool' | 'skill' | 'mcp' | 'pipeline' | 'query';
    /** Name of the command, tool, or skill that was invoked */
    name: string;
    /** ISO timestamp when the event occurred */
    timestamp: string;
    /** Duration in milliseconds (if measurable) */
    duration?: number;
    /** Whether the invocation succeeded */
    success: boolean;
    /** Additional context */
    metadata?: Record<string, unknown>;
}

/**
 * Aggregated telemetry data for a single day.
 */
export interface TelemetryAggregation {
    /** Date string (YYYY-MM-DD) */
    date: string;
    /** Total number of events on this day */
    totalEvents: number;
    /** Event count broken down by type */
    byType: Record<string, number>;
    /** Event count broken down by name */
    byName: Record<string, number>;
    /** Average duration in milliseconds across all events with a duration */
    avgDuration: number;
    /** Percentage of successful events (0–100) */
    successRate: number;
    /** Most-used items sorted by count */
    topItems: { name: string; count: number }[];
}

/**
 * Configuration for telemetry collection behaviour.
 */
export interface TelemetryConfig {
    /** Whether telemetry is enabled */
    enabled: boolean;
    /** Number of days to retain raw events (default: 30) */
    retentionDays: number;
    /** Whether daily aggregation is enabled */
    aggregationEnabled: boolean;
}

/**
 * Dashboard-ready data payload.
 */
export interface TelemetryDashboardData {
    /** High-level summary for the requested period */
    summary: {
        totalEvents: number;
        uniqueCommands: number;
        avgDuration: number;
        successRate: number;
        period: string;
    };
    /** Per-day aggregation data */
    daily: TelemetryAggregation[];
    /** Top commands ranked by usage */
    topCommands: {
        name: string;
        count: number;
        avgDuration: number;
        successRate: number;
    }[];
    /** Most recent events */
    recentEvents: TelemetryEvent[];
}

// ─── Persistence Shape ───────────────────────────────────────────────

/**
 * On-disk structure stored in `.project/telemetry.json`.
 */
interface TelemetryStore {
    /** Schema version for future migration */
    version: number;
    /** Raw event log */
    events: TelemetryEvent[];
    /** Pre-computed daily aggregations */
    aggregations: TelemetryAggregation[];
    /** Last flush timestamp */
    lastFlush: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Directory for telemetry storage, relative to workspace root. */
const TELEMETRY_DIR = '.project';
/** Telemetry file name. */
const TELEMETRY_FILE = 'telemetry.json';
/** Flush interval in milliseconds (30 seconds). */
const FLUSH_INTERVAL_MS = 30_000;
/** Default event retention in days. */
const DEFAULT_RETENTION_DAYS = 30;
/** Maximum number of recent events returned in dashboard data. */
const MAX_RECENT_EVENTS = 50;
/** Maximum in-memory buffer size before auto-flush. */
const MAX_BUFFER_SIZE = 200;

// ─── TelemetryCollector ──────────────────────────────────────────────

/**
 * Singleton service that collects local-only usage telemetry for
 * commands, tools, skills, and pipelines within the workspace.
 *
 * Data is stored in `.project/telemetry.json` and never leaves the
 * local machine. Collection is opt-in via the `aicc.telemetry.enabled`
 * VS Code setting.
 *
 * @example
 * ```ts
 * const collector = TelemetryCollector.getInstance();
 * collector.trackCommand('create_story', 42, true);
 * const dashboard = collector.getDashboardData(7);
 * ```
 */
export class TelemetryCollector {
    // ── Singleton ────────────────────────────────────────────────

    private static instance: TelemetryCollector | undefined;

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): TelemetryCollector {
        if (!TelemetryCollector.instance) {
            TelemetryCollector.instance = new TelemetryCollector();
        }
        return TelemetryCollector.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        if (TelemetryCollector.instance) {
            TelemetryCollector.instance.dispose();
        }
        TelemetryCollector.instance = undefined;
    }

    // ── State ────────────────────────────────────────────────────

    private readonly logger: Logger;

    /** In-memory event buffer awaiting flush to disk. */
    private buffer: TelemetryEvent[] = [];

    /** Events loaded from disk + accumulated. */
    private events: TelemetryEvent[] = [];

    /** Pre-computed aggregations loaded from disk. */
    private aggregations: TelemetryAggregation[] = [];

    /** Periodic flush timer handle. */
    private flushTimer: ReturnType<typeof setInterval> | undefined;

    /** Whether initial data has been loaded from disk. */
    private loaded = false;

    /** Monotonic counter for event IDs. */
    private idCounter = 0;

    private constructor() {
        this.logger = Logger.getInstance();
        this.startFlushTimer();
    }

    // ── Configuration (AICC-0373) ────────────────────────────────

    /**
     * Check whether workspace telemetry is enabled.
     *
     * Reads the `aicc.telemetry.enabled` VS Code setting.
     * Defaults to `false` (opt-in).
     */
    public isEnabled(): boolean {
        const config = vscode.workspace.getConfiguration('aicc');
        return config.get<boolean>('telemetry.enabled', false);
    }

    /**
     * Get the current telemetry configuration from VS Code settings.
     */
    public getConfig(): TelemetryConfig {
        const config = vscode.workspace.getConfiguration('aicc');
        return {
            enabled: config.get<boolean>('telemetry.enabled', false),
            retentionDays: config.get<number>(
                'telemetry.retentionDays',
                DEFAULT_RETENTION_DAYS,
            ),
            aggregationEnabled: config.get<boolean>(
                'telemetry.aggregationEnabled',
                true,
            ),
        };
    }

    // ── Tracking Methods (AICC-0371) ─────────────────────────────

    /**
     * Record a generic telemetry event.
     *
     * No-op if telemetry is disabled via settings.
     *
     * @param event Event data (id and timestamp are auto-generated).
     */
    public track(
        event: Omit<TelemetryEvent, 'id' | 'timestamp'>,
    ): void {
        if (!this.isEnabled()) {
            return;
        }

        const telemetryEvent: TelemetryEvent = {
            ...event,
            id: this.generateId(),
            timestamp: new Date().toISOString(),
        };

        this.buffer.push(telemetryEvent);

        this.logger.debug(
            `Telemetry: tracked ${event.type}/${event.name} (success=${event.success})`,
            { component: 'TelemetryCollector' },
        );

        // Auto-flush if buffer grows too large
        if (this.buffer.length >= MAX_BUFFER_SIZE) {
            this.flush().catch(() => {
                /* swallow — best-effort */
            });
        }
    }

    /**
     * Convenience method to track a command invocation.
     *
     * @param name     Command name.
     * @param duration Execution duration in milliseconds.
     * @param success  Whether the command succeeded.
     * @param metadata Optional additional context.
     */
    public trackCommand(
        name: string,
        duration: number,
        success: boolean,
        metadata?: Record<string, unknown>,
    ): void {
        this.track({
            type: 'command',
            name,
            duration,
            success,
            metadata,
        });
    }

    /**
     * Convenience method to track an MCP tool invocation.
     *
     * @param name     Tool name.
     * @param duration Execution duration in milliseconds.
     * @param success  Whether the tool succeeded.
     */
    public trackTool(
        name: string,
        duration: number,
        success: boolean,
    ): void {
        this.track({
            type: 'tool',
            name,
            duration,
            success,
        });
    }

    /**
     * Convenience method to track a skill execution.
     *
     * @param name     Skill name.
     * @param duration Execution duration in milliseconds.
     * @param success  Whether the skill succeeded.
     */
    public trackSkill(
        name: string,
        duration: number,
        success: boolean,
    ): void {
        this.track({
            type: 'skill',
            name,
            duration,
            success,
        });
    }

    // ── Persistence (AICC-0372) ──────────────────────────────────

    /**
     * Flush buffered events to `.project/telemetry.json`.
     *
     * Uses an atomic write strategy (temp file + rename) to prevent
     * data corruption.
     */
    public async flush(): Promise<void> {
        if (this.buffer.length === 0) {
            return;
        }

        const filePath = this.getTelemetryFilePath();
        if (!filePath) {
            return;
        }

        try {
            // Ensure we have loaded existing data
            if (!this.loaded) {
                await this.loadFromDisk();
            }

            // Merge buffer into events
            this.events.push(...this.buffer);
            this.buffer = [];

            const store: TelemetryStore = {
                version: 1,
                events: this.events,
                aggregations: this.aggregations,
                lastFlush: new Date().toISOString(),
            };

            const json = JSON.stringify(store, null, 2);

            // Atomic write via temp file + rename
            const dir = path.dirname(filePath);
            await fs.promises.mkdir(dir, { recursive: true });

            const tmpPath = filePath + `.tmp.${process.pid}`;
            await fs.promises.writeFile(tmpPath, json, 'utf-8');
            await fs.promises.rename(tmpPath, filePath);

            this.logger.debug(
                `Telemetry: flushed ${this.events.length} total events to disk`,
                { component: 'TelemetryCollector' },
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error(
                `Telemetry: failed to flush to disk: ${message}`,
                { component: 'TelemetryCollector' },
            );

            // Put buffer items back so we don't lose them
            // (they were already moved to this.events, so no action needed)
        }
    }

    /**
     * Load existing telemetry data from disk.
     */
    private async loadFromDisk(): Promise<void> {
        const filePath = this.getTelemetryFilePath();
        if (!filePath) {
            this.loaded = true;
            return;
        }

        try {
            await fs.promises.access(filePath, fs.constants.R_OK);
            const raw = await fs.promises.readFile(filePath, 'utf-8');
            const store = JSON.parse(raw) as TelemetryStore;

            if (store && typeof store === 'object') {
                this.events = Array.isArray(store.events)
                    ? store.events
                    : [];
                this.aggregations = Array.isArray(store.aggregations)
                    ? store.aggregations
                    : [];
            }

            this.logger.debug(
                `Telemetry: loaded ${this.events.length} events from disk`,
                { component: 'TelemetryCollector' },
            );
        } catch {
            // File doesn't exist or is unreadable — start fresh
            this.events = [];
            this.aggregations = [];
        }

        this.loaded = true;
    }

    // ── Aggregation (AICC-0374) ──────────────────────────────────

    /**
     * Aggregate events for a specific date (or today).
     *
     * @param date Date string in YYYY-MM-DD format (defaults to today).
     * @returns Aggregated data for the specified day.
     */
    public aggregate(date?: string): TelemetryAggregation {
        const targetDate = date ?? new Date().toISOString().slice(0, 10);
        const allEvents = [...this.events, ...this.buffer];

        const dayEvents = allEvents.filter((e) =>
            e.timestamp.startsWith(targetDate),
        );

        const byType: Record<string, number> = {};
        const byName: Record<string, number> = {};
        let totalDuration = 0;
        let durationCount = 0;
        let successCount = 0;

        for (const event of dayEvents) {
            byType[event.type] = (byType[event.type] ?? 0) + 1;
            byName[event.name] = (byName[event.name] ?? 0) + 1;

            if (event.duration !== undefined) {
                totalDuration += event.duration;
                durationCount++;
            }

            if (event.success) {
                successCount++;
            }
        }

        const topItems = Object.entries(byName)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            date: targetDate,
            totalEvents: dayEvents.length,
            byType,
            byName,
            avgDuration:
                durationCount > 0
                    ? Math.round(totalDuration / durationCount)
                    : 0,
            successRate:
                dayEvents.length > 0
                    ? Math.round((successCount / dayEvents.length) * 100)
                    : 100,
            topItems,
        };
    }

    /**
     * Remove events older than the configured retention period.
     *
     * @param retentionDays Override the configured retention period (in days).
     * @returns Number of events pruned.
     */
    public async pruneOldData(retentionDays?: number): Promise<number> {
        const days = retentionDays ?? this.getConfig().retentionDays;
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString();

        const before = this.events.length;
        this.events = this.events.filter((e) => e.timestamp >= cutoffStr);
        const pruned = before - this.events.length;

        // Also prune aggregations
        const cutoffDate = cutoff.toISOString().slice(0, 10);
        this.aggregations = this.aggregations.filter(
            (a) => a.date >= cutoffDate,
        );

        if (pruned > 0) {
            this.logger.info(
                `Telemetry: pruned ${pruned} events older than ${days} days`,
                { component: 'TelemetryCollector' },
            );

            // Persist the pruned state
            await this.flush();
        }

        return pruned;
    }

    // ── Dashboard Data (AICC-0375, AICC-0376) ────────────────────

    /**
     * Get formatted data suitable for rendering the telemetry dashboard.
     *
     * @param days Number of days to include (default: 7).
     * @returns Dashboard-ready data including summary, daily breakdown,
     *          top commands, and recent events.
     */
    public getDashboardData(days: number = 7): TelemetryDashboardData {
        const allEvents = [...this.events, ...this.buffer];

        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffStr = cutoff.toISOString();

        const periodEvents = allEvents.filter(
            (e) => e.timestamp >= cutoffStr,
        );

        // Summary
        const uniqueNames = new Set(periodEvents.map((e) => e.name));
        const totalDuration = periodEvents.reduce(
            (sum, e) => sum + (e.duration ?? 0),
            0,
        );
        const eventsWithDuration = periodEvents.filter(
            (e) => e.duration !== undefined,
        );
        const successCount = periodEvents.filter((e) => e.success).length;

        const summary = {
            totalEvents: periodEvents.length,
            uniqueCommands: uniqueNames.size,
            avgDuration:
                eventsWithDuration.length > 0
                    ? Math.round(totalDuration / eventsWithDuration.length)
                    : 0,
            successRate:
                periodEvents.length > 0
                    ? Math.round(
                          (successCount / periodEvents.length) * 100,
                      )
                    : 100,
            period: `Last ${days} day${days !== 1 ? 's' : ''}`,
        };

        // Daily aggregations
        const daily: TelemetryAggregation[] = [];
        for (let i = 0; i < days; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            daily.push(this.aggregate(dateStr));
        }
        daily.reverse(); // chronological order

        // Top commands
        const commandMap = new Map<
            string,
            { count: number; totalDuration: number; successCount: number }
        >();
        for (const event of periodEvents) {
            const existing = commandMap.get(event.name) ?? {
                count: 0,
                totalDuration: 0,
                successCount: 0,
            };
            existing.count++;
            existing.totalDuration += event.duration ?? 0;
            if (event.success) {
                existing.successCount++;
            }
            commandMap.set(event.name, existing);
        }

        const topCommands = Array.from(commandMap.entries())
            .map(([name, data]) => ({
                name,
                count: data.count,
                avgDuration: Math.round(data.totalDuration / data.count),
                successRate: Math.round(
                    (data.successCount / data.count) * 100,
                ),
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        // Recent events
        const recentEvents = [...periodEvents]
            .sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime(),
            )
            .slice(0, MAX_RECENT_EVENTS);

        return {
            summary,
            daily,
            topCommands,
            recentEvents,
        };
    }

    /**
     * Generate a standalone HTML dashboard page with Chart.js visualisations.
     *
     * The returned HTML can be loaded into a VS Code webview panel or
     * saved as a file. It includes embedded Chart.js from CDN and renders
     * usage trends, type breakdown, and top commands.
     *
     * @param days Number of days to include (default: 7).
     * @returns Complete HTML string.
     */
    public generateDashboardHtml(days: number = 7): string {
        const data = this.getDashboardData(days);
        const dailyLabels = JSON.stringify(data.daily.map((d) => d.date));
        const dailyCounts = JSON.stringify(
            data.daily.map((d) => d.totalEvents),
        );
        const dailySuccess = JSON.stringify(
            data.daily.map((d) => d.successRate),
        );

        // Type breakdown for the period
        const typeMap: Record<string, number> = {};
        for (const day of data.daily) {
            for (const [type, count] of Object.entries(day.byType)) {
                typeMap[type] = (typeMap[type] ?? 0) + count;
            }
        }
        const typeLabels = JSON.stringify(Object.keys(typeMap));
        const typeValues = JSON.stringify(Object.values(typeMap));

        const topLabels = JSON.stringify(
            data.topCommands.slice(0, 10).map((c) => c.name),
        );
        const topCounts = JSON.stringify(
            data.topCommands.slice(0, 10).map((c) => c.count),
        );

        return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AICC Workspace Telemetry</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
    <style>
        :root {
            --bg: #1e1e1e;
            --card: #252526;
            --text: #cccccc;
            --accent: #569cd6;
            --success: #4ec9b0;
            --warning: #dcdcaa;
            --error: #f44747;
            --border: #3c3c3c;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg); color: var(--text);
            padding: 24px;
        }
        h1 { color: var(--accent); margin-bottom: 8px; font-size: 1.6rem; }
        .subtitle { color: #888; margin-bottom: 24px; font-size: 0.9rem; }
        .summary-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 16px; margin-bottom: 32px;
        }
        .summary-card {
            background: var(--card); border: 1px solid var(--border);
            border-radius: 8px; padding: 16px; text-align: center;
        }
        .summary-card .value { font-size: 2rem; font-weight: 700; color: var(--accent); }
        .summary-card .label { font-size: 0.85rem; color: #888; margin-top: 4px; }
        .charts-grid {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px; margin-bottom: 32px;
        }
        .chart-card {
            background: var(--card); border: 1px solid var(--border);
            border-radius: 8px; padding: 20px;
        }
        .chart-card h3 { margin-bottom: 12px; font-size: 1rem; }
        canvas { width: 100% !important; }
        table {
            width: 100%; border-collapse: collapse; background: var(--card);
            border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
        }
        th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
        th { background: #2d2d2d; font-weight: 600; font-size: 0.85rem; color: #888; }
        td { font-size: 0.9rem; }
        .badge {
            display: inline-block; padding: 2px 8px; border-radius: 4px;
            font-size: 0.75rem; font-weight: 600;
        }
        .badge-success { background: rgba(78,201,176,.15); color: var(--success); }
        .badge-error   { background: rgba(244,71,71,.15);   color: var(--error);   }
    </style>
</head>
<body>
    <h1>📊 Workspace Telemetry</h1>
    <p class="subtitle">${data.summary.period} — generated ${new Date().toISOString()}</p>

    <div class="summary-grid">
        <div class="summary-card">
            <div class="value">${data.summary.totalEvents}</div>
            <div class="label">Total Events</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.summary.uniqueCommands}</div>
            <div class="label">Unique Commands</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.summary.avgDuration}ms</div>
            <div class="label">Avg Duration</div>
        </div>
        <div class="summary-card">
            <div class="value">${data.summary.successRate}%</div>
            <div class="label">Success Rate</div>
        </div>
    </div>

    <div class="charts-grid">
        <div class="chart-card">
            <h3>Daily Event Trend</h3>
            <canvas id="trendChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>Success Rate Trend</h3>
            <canvas id="successChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>Event Type Breakdown</h3>
            <canvas id="typeChart"></canvas>
        </div>
        <div class="chart-card">
            <h3>Top Commands</h3>
            <canvas id="topChart"></canvas>
        </div>
    </div>

    <h3 style="margin-bottom: 12px;">Top Commands</h3>
    <table>
        <thead>
            <tr>
                <th>Command</th>
                <th>Count</th>
                <th>Avg Duration</th>
                <th>Success Rate</th>
            </tr>
        </thead>
        <tbody>
            ${data.topCommands
                .slice(0, 15)
                .map(
                    (cmd) => `<tr>
                <td>${this.escapeHtml(cmd.name)}</td>
                <td>${cmd.count}</td>
                <td>${cmd.avgDuration}ms</td>
                <td><span class="badge ${cmd.successRate >= 90 ? 'badge-success' : 'badge-error'}">${cmd.successRate}%</span></td>
            </tr>`,
                )
                .join('\n            ')}
        </tbody>
    </table>

    <script>
    const chartDefaults = {
        color: '#cccccc',
        borderColor: '#3c3c3c',
        font: { family: '-apple-system, BlinkMacSystemFont, sans-serif' }
    };
    Chart.defaults.color = chartDefaults.color;

    // Daily trend
    new Chart(document.getElementById('trendChart'), {
        type: 'line',
        data: {
            labels: ${dailyLabels},
            datasets: [{
                label: 'Events',
                data: ${dailyCounts},
                borderColor: '#569cd6',
                backgroundColor: 'rgba(86,156,214,.15)',
                fill: true, tension: 0.3
            }]
        },
        options: { scales: { y: { beginAtZero: true, grid: { color: '#333' } }, x: { grid: { color: '#333' } } } }
    });

    // Success rate
    new Chart(document.getElementById('successChart'), {
        type: 'line',
        data: {
            labels: ${dailyLabels},
            datasets: [{
                label: 'Success %',
                data: ${dailySuccess},
                borderColor: '#4ec9b0',
                backgroundColor: 'rgba(78,201,176,.15)',
                fill: true, tension: 0.3
            }]
        },
        options: { scales: { y: { min: 0, max: 100, grid: { color: '#333' } }, x: { grid: { color: '#333' } } } }
    });

    // Type breakdown
    new Chart(document.getElementById('typeChart'), {
        type: 'doughnut',
        data: {
            labels: ${typeLabels},
            datasets: [{
                data: ${typeValues},
                backgroundColor: ['#569cd6','#4ec9b0','#dcdcaa','#f44747','#c586c0','#d7ba7d']
            }]
        }
    });

    // Top commands
    new Chart(document.getElementById('topChart'), {
        type: 'bar',
        data: {
            labels: ${topLabels},
            datasets: [{
                label: 'Invocations',
                data: ${topCounts},
                backgroundColor: '#569cd6'
            }]
        },
        options: {
            indexAxis: 'y',
            scales: { x: { beginAtZero: true, grid: { color: '#333' } }, y: { grid: { color: '#333' } } }
        }
    });
    </script>
</body>
</html>`;
    }

    // ── Lifecycle ────────────────────────────────────────────────

    /**
     * Dispose of resources: stop the flush timer and perform a final flush.
     */
    public async dispose(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }

        // Final flush
        try {
            await this.flush();
        } catch {
            // Best-effort
        }
    }

    // ── Private Helpers ──────────────────────────────────────────

    /**
     * Start the periodic flush timer.
     */
    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => {
            this.flush().catch(() => {
                /* swallow */
            });
        }, FLUSH_INTERVAL_MS);
    }

    /**
     * Resolve the absolute path to the telemetry JSON file.
     * Returns undefined if no workspace is open.
     */
    private getTelemetryFilePath(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders || folders.length === 0) {
            return undefined;
        }
        return path.join(
            folders[0].uri.fsPath,
            TELEMETRY_DIR,
            TELEMETRY_FILE,
        );
    }

    /**
     * Generate a unique event ID.
     */
    private generateId(): string {
        this.idCounter++;
        return `tel-${Date.now().toString(36)}-${this.idCounter}`;
    }

    /**
     * Escape HTML entities for safe rendering in the dashboard.
     */
    private escapeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
