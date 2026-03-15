/**
 * Scheduler Engine
 * AICC-0079: Scheduling Patterns
 * AICC-0222: Interval-based scheduling engine
 * AICC-0223: Cron expression parser and scheduler
 * AICC-0224: Specific-time (one-shot) scheduling
 * AICC-0227: Task throttle configuration per-task
 * AICC-0228: Stuck process detection timer
 * AICC-0229: Kill timeout handler with user notification
 */

import * as vscode from 'vscode';
import { ActionRegistry } from '../actions';
import { Logger } from '../logger';
import { SchedulerPersistence } from './schedulerPersistence';

// ── Types ────────────────────────────────────────────────────────────────

export type ScheduleType = 'interval' | 'cron' | 'once';

/**
 * Per-task throttle configuration (AICC-0227)
 */
export interface TaskThrottleConfig {
  maxExecutionsPerHour?: number;
  minIntervalMs?: number;
  concurrencyLimit?: number;
  maxExecutionTimeMs?: number;
}

/**
 * A single scheduled task definition
 */
export interface ScheduledTask {
  id: string;
  name: string;
  actionId: string;
  params: Record<string, any>;
  scheduleType: ScheduleType;
  /** e.g., "30000" for 30s interval, cron expression for cron, ISO date for once */
  scheduleValue: string;
  enabled: boolean;
  lastRun: string | null;
  lastResult: 'success' | 'error' | null;
  lastError: string | null;
  nextRun: string | null;
  createdAt: string;
  throttle?: TaskThrottleConfig;
}

// ── Engine ───────────────────────────────────────────────────────────────

export class SchedulerEngine {
  private static instance: SchedulerEngine;

  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private running: boolean = false;
  private logger: Logger;
  private persistence: SchedulerPersistence;

  /** Per-task execution-count tracking for throttle (AICC-0227) */
  private executionCounts: Map<string, { timestamps: number[] }> = new Map();
  private lastExecutionTime: Map<string, number> = new Map();

  /** Stuck process detection (AICC-0228) */
  private executionStartTimes: Map<string, number> = new Map();
  private readonly STUCK_THRESHOLD_MS = 300000; // 5 minutes default
  private stuckCheckTimer: NodeJS.Timeout | null = null;

  // ── Singleton ────────────────────────────────────────────────────────

  private constructor() {
    this.logger = Logger.getInstance();
    this.persistence = new SchedulerPersistence();
  }

  static getInstance(): SchedulerEngine {
    if (!SchedulerEngine.instance) {
      SchedulerEngine.instance = new SchedulerEngine();
    }
    return SchedulerEngine.instance;
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Initialize the engine: load persisted tasks and start scheduling.
   */
  initialize(workspaceRoot: string): void {
    this.persistence.initialize(workspaceRoot);

    const saved = this.persistence.loadTasks();
    for (const task of saved) {
      this.tasks.set(task.id, task);
    }

    this.logger.info(`SchedulerEngine initialized with ${saved.length} persisted task(s)`);
    this.start();
  }

  /** Start all enabled tasks */
  start(): void {
    if (this.running) { return; }
    this.running = true;

    for (const task of this.tasks.values()) {
      if (task.enabled) {
        this.scheduleTask(task);
      }
    }

    this.startStuckDetection();
    this.logger.info('SchedulerEngine started');
  }

  /** Stop all timers */
  stop(): void {
    this.running = false;

    for (const id of this.timers.keys()) {
      this.clearTimer(id);
    }

    if (this.stuckCheckTimer) {
      clearInterval(this.stuckCheckTimer);
      this.stuckCheckTimer = null;
    }

    this.logger.info('SchedulerEngine stopped');
  }

  // ── CRUD ─────────────────────────────────────────────────────────────

  /** Add a task and start it if enabled */
  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);

    if (task.enabled && this.running) {
      this.scheduleTask(task);
    }

    this.saveState();
    this.logger.info(`Task added: ${task.id} (${task.name})`);
  }

  /** Remove a task and clear its timer */
  removeTask(id: string): void {
    this.clearTimer(id);
    this.tasks.delete(id);
    this.executionCounts.delete(id);
    this.lastExecutionTime.delete(id);
    this.executionStartTimes.delete(id);

    this.saveState();
    this.logger.info(`Task removed: ${id}`);
  }

  /** Enable / disable a task */
  toggleTask(id: string, enabled: boolean): void {
    const task = this.tasks.get(id);
    if (!task) { return; }

    task.enabled = enabled;

    if (enabled && this.running) {
      this.scheduleTask(task);
    } else {
      this.clearTimer(id);
      task.nextRun = null;
    }

    this.saveState();
    this.logger.info(`Task ${id} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /** Execute a task immediately (manual trigger) */
  async executeNow(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (!task) {
      this.logger.warn(`executeNow: unknown task ${id}`);
      return;
    }
    await this.runTask(task);
    this.saveState();
  }

  /** Get all tasks */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /** Get a single task */
  getTask(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  // ── Scheduling Dispatch ──────────────────────────────────────────────

  /** Route to the correct scheduler based on type (AICC-0224) */
  private scheduleTask(task: ScheduledTask): void {
    this.clearTimer(task.id);
    if (!task.enabled) { return; }

    switch (task.scheduleType) {
      case 'interval':
        this.scheduleInterval(task);
        break;
      case 'cron':
        this.scheduleCron(task);
        break;
      case 'once':
        this.scheduleOnce(task);
        break;
    }
  }

  // ── Interval (AICC-0222) ─────────────────────────────────────────────

  /** Schedule an interval-based task */
  private scheduleInterval(task: ScheduledTask): void {
    const ms = parseInt(task.scheduleValue, 10);
    if (isNaN(ms) || ms < 5000) {
      this.logger.warn(`Invalid interval for ${task.id}: ${task.scheduleValue} (min 5000ms)`);
      return;
    }

    task.nextRun = new Date(Date.now() + ms).toISOString();

    const timer = setInterval(async () => {
      await this.runTask(task);
      task.nextRun = new Date(Date.now() + ms).toISOString();
    }, ms);

    this.timers.set(task.id, timer);
  }

  // ── Cron (AICC-0223) ────────────────────────────────────────────────

  /**
   * Parse a cron expression and calculate the next run time.
   *
   * Supports 5-field expressions: minute hour dayOfMonth month dayOfWeek
   * Field tokens: `*`, `* /N` (steps), specific numbers, ranges (`1-5`).
   */
  private parseCron(expression: string): Date | null {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) { return null; }

    const [minExpr, hourExpr, domExpr, monExpr, dowExpr] = parts;

    const expandField = (expr: string, min: number, max: number): number[] | null => {
      const values: number[] = [];

      for (const token of expr.split(',')) {
        // Step: */N or N-M/S
        if (token.includes('/')) {
          const [rangeStr, stepStr] = token.split('/');
          const step = parseInt(stepStr, 10);
          if (isNaN(step) || step <= 0) { return null; }
          let start = min;
          let end = max;
          if (rangeStr !== '*') {
            if (rangeStr.includes('-')) {
              const [a, b] = rangeStr.split('-').map(Number);
              if (isNaN(a) || isNaN(b)) { return null; }
              start = a;
              end = b;
            } else {
              start = parseInt(rangeStr, 10);
              if (isNaN(start)) { return null; }
            }
          }
          for (let i = start; i <= end; i += step) { values.push(i); }
        } else if (token === '*') {
          for (let i = min; i <= max; i++) { values.push(i); }
        } else if (token.includes('-')) {
          const [a, b] = token.split('-').map(Number);
          if (isNaN(a) || isNaN(b)) { return null; }
          for (let i = a; i <= b; i++) { values.push(i); }
        } else {
          const val = parseInt(token, 10);
          if (isNaN(val)) { return null; }
          values.push(val);
        }
      }

      return values.sort((a, b) => a - b);
    };

    const minutes = expandField(minExpr, 0, 59);
    const hours = expandField(hourExpr, 0, 23);
    const daysOfMonth = expandField(domExpr, 1, 31);
    const months = expandField(monExpr, 1, 12);
    const daysOfWeek = expandField(dowExpr, 0, 6);

    if (!minutes || !hours || !daysOfMonth || !months || !daysOfWeek) {
      return null;
    }

    // Walk forward from now to find the next matching instant (cap at 1 year)
    const now = new Date();
    const limit = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
    const candidate = new Date(now);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1); // always at least 1 min ahead

    while (candidate < limit) {
      const mon = candidate.getMonth() + 1;
      if (!months.includes(mon)) {
        candidate.setMonth(candidate.getMonth() + 1, 1);
        candidate.setHours(0, 0, 0, 0);
        continue;
      }
      const dom = candidate.getDate();
      const dow = candidate.getDay();
      if (!daysOfMonth.includes(dom) || !daysOfWeek.includes(dow)) {
        candidate.setDate(candidate.getDate() + 1);
        candidate.setHours(0, 0, 0, 0);
        continue;
      }
      const hr = candidate.getHours();
      if (!hours.includes(hr)) {
        candidate.setHours(candidate.getHours() + 1, 0, 0, 0);
        continue;
      }
      const min = candidate.getMinutes();
      if (!minutes.includes(min)) {
        candidate.setMinutes(candidate.getMinutes() + 1, 0, 0);
        continue;
      }
      return candidate;
    }
    return null;
  }

  /** Schedule a cron-based task */
  private scheduleCron(task: ScheduledTask): void {
    const nextRun = this.parseCron(task.scheduleValue);
    if (!nextRun) {
      this.logger.warn(`Invalid cron for ${task.id}: ${task.scheduleValue}`);
      return;
    }

    task.nextRun = nextRun.toISOString();
    const delay = nextRun.getTime() - Date.now();

    const timer = setTimeout(async () => {
      await this.runTask(task);
      // Re-schedule after execution
      if (task.enabled) {
        this.scheduleCron(task);
      }
    }, Math.max(delay, 1000));

    this.timers.set(task.id, timer);
  }

  // ── One-Shot (AICC-0224) ────────────────────────────────────────────

  /** Schedule a one-shot task at a specific time */
  private scheduleOnce(task: ScheduledTask): void {
    const targetTime = new Date(task.scheduleValue);
    if (isNaN(targetTime.getTime())) {
      this.logger.warn(`Invalid date for ${task.id}: ${task.scheduleValue}`);
      return;
    }

    const delay = targetTime.getTime() - Date.now();
    if (delay <= 0) {
      this.logger.warn(`One-shot time already passed for ${task.id}`);
      task.enabled = false;
      return;
    }

    task.nextRun = targetTime.toISOString();

    const timer = setTimeout(async () => {
      await this.runTask(task);
      task.enabled = false; // One-shot — disable after execution
      this.timers.delete(task.id);
      this.saveState();
    }, delay);

    this.timers.set(task.id, timer);
  }

  // ── Timer Helpers ───────────────────────────────────────────────────

  private clearTimer(id: string): void {
    const existing = this.timers.get(id);
    if (existing) {
      clearTimeout(existing);
      clearInterval(existing);
      this.timers.delete(id);
    }
  }

  // ── Throttle Check (AICC-0227) ──────────────────────────────────────

  /**
   * Check whether a task is throttled. Returns `true` if execution should
   * be skipped.
   */
  private isThrottled(task: ScheduledTask): boolean {
    const throttle = task.throttle;
    if (!throttle) { return false; }

    // Min interval check
    if (throttle.minIntervalMs) {
      const lastExec = this.lastExecutionTime.get(task.id);
      if (lastExec && (Date.now() - lastExec) < throttle.minIntervalMs) {
        this.logger.warn(`Task ${task.id} throttled: min interval not elapsed`);
        return true;
      }
    }

    // Max executions per hour check
    if (throttle.maxExecutionsPerHour) {
      const counts = this.executionCounts.get(task.id);
      if (counts) {
        const oneHourAgo = Date.now() - 3600000;
        counts.timestamps = counts.timestamps.filter(ts => ts > oneHourAgo);
        if (counts.timestamps.length >= throttle.maxExecutionsPerHour) {
          this.logger.warn(`Task ${task.id} throttled: max executions/hr reached (${counts.timestamps.length})`);
          return true;
        }
      }
    }

    return false;
  }

  /** Record an execution for throttle tracking */
  private recordExecution(taskId: string): void {
    const now = Date.now();
    this.lastExecutionTime.set(taskId, now);

    let counts = this.executionCounts.get(taskId);
    if (!counts) {
      counts = { timestamps: [] };
      this.executionCounts.set(taskId, counts);
    }
    counts.timestamps.push(now);
  }

  // ── Task Execution ──────────────────────────────────────────────────

  /** Execute a task via ActionRegistry */
  private async runTask(task: ScheduledTask): Promise<void> {
    // Throttle gate (AICC-0227)
    if (this.isThrottled(task)) {
      return;
    }

    // Track execution start for stuck detection (AICC-0228)
    this.executionStartTimes.set(task.id, Date.now());

    try {
      const result = await ActionRegistry.getInstance().execute(task.actionId, task.params);
      task.lastRun = new Date().toISOString();
      task.lastResult = result.success ? 'success' : 'error';
      task.lastError = result.success ? null : (result.error || 'Unknown error');
    } catch (err: any) {
      task.lastRun = new Date().toISOString();
      task.lastResult = 'error';
      task.lastError = err.message;
    } finally {
      this.executionStartTimes.delete(task.id);
      this.recordExecution(task.id);
    }
  }

  // ── Stuck Process Detection (AICC-0228) ─────────────────────────────

  /** Start monitoring for stuck processes */
  private startStuckDetection(): void {
    if (this.stuckCheckTimer) { return; }

    this.stuckCheckTimer = setInterval(() => {
      const now = Date.now();
      for (const [taskId, startTime] of this.executionStartTimes) {
        const elapsed = now - startTime;
        const task = this.tasks.get(taskId);
        const threshold = task?.throttle?.maxExecutionTimeMs || this.STUCK_THRESHOLD_MS;
        if (elapsed > threshold) {
          this.logger.error(`Task ${taskId} appears stuck (running for ${Math.round(elapsed / 1000)}s)`);
          this.handleStuckTask(taskId);
        }
      }
    }, 30000); // Check every 30s
  }

  // ── Kill Timeout Handler (AICC-0229) ───────────────────────────────

  /** Handle a stuck task by marking it as error and notifying the user */
  private handleStuckTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) { return; }

    // Mark as error
    task.lastResult = 'error';
    task.lastError = 'Task exceeded maximum execution time and was marked as stuck';
    task.enabled = false; // Disable to prevent further runs

    // Remove from execution tracking
    this.executionStartTimes.delete(taskId);

    // Clear timer
    this.clearTimer(taskId);

    // Notify user via VS Code
    vscode.window.showWarningMessage(
      `Scheduled task "${task.name}" appears stuck and has been disabled. Check logs for details.`,
      'Re-enable', 'View Logs'
    ).then(choice => {
      if (choice === 'Re-enable') {
        this.toggleTask(taskId, true);
      } else if (choice === 'View Logs') {
        this.logger.showOutputChannel();
      }
    });

    // Persist
    this.saveState();

    this.logger.warn(`Stuck task ${taskId} disabled`, { name: task.name });
  }

  // ── Persistence ─────────────────────────────────────────────────────

  /** Save current tasks to disk via SchedulerPersistence */
  saveState(): void {
    this.persistence.saveTasks(this.getTasks());
  }

  // ── Dispose ─────────────────────────────────────────────────────────

  dispose(): void {
    this.stop();
  }
}
