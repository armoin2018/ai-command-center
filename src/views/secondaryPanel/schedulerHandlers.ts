/**
 * Scheduler Handlers for the Secondary Panel (AICC-0079 / AICC-0080)
 * Manages scheduled task CRUD and manual execution.
 */

import { HandlerContext } from './types';
import { SchedulerEngine, ScheduledTask } from '../../scheduler';
import { Logger } from '../../logger';

const logger = Logger.getInstance();

/** Return all scheduled tasks to the webview */
export async function handleGetSchedulerTasks(ctx: HandlerContext): Promise<void> {
    try {
      const engine = SchedulerEngine.getInstance();
      const tasks = engine.getTasks();
      ctx.postMessage({ type: 'schedulerTasks', payload: tasks });
    } catch (error) {
      logger.error('Error fetching scheduler tasks', { error: String(error) });
    }
}

/** Add a new scheduled task */
export async function handleAddSchedulerTask(ctx: HandlerContext, payload: ScheduledTask): Promise<void> {
    try {
      const engine = SchedulerEngine.getInstance();
      const task: ScheduledTask = {
        id: payload.id || `sched-${Date.now()}`,
        name: payload.name,
        actionId: payload.actionId,
        params: payload.params || {},
        scheduleType: payload.scheduleType,
        scheduleValue: payload.scheduleValue,
        enabled: payload.enabled ?? true,
        lastRun: null,
        lastResult: null,
        lastError: null,
        nextRun: null,
        createdAt: new Date().toISOString(),
        throttle: payload.throttle
      };
      engine.addTask(task);
      ctx.postMessage({ type: 'schedulerTaskAdded', payload: task });
    } catch (error) {
      logger.error('Error adding scheduler task', { error: String(error) });
    }
}

/** Remove a scheduled task */
export async function handleRemoveSchedulerTask(ctx: HandlerContext, payload: { id: string }): Promise<void> {
    try {
      const engine = SchedulerEngine.getInstance();
      engine.removeTask(payload.id);
      ctx.postMessage({ type: 'schedulerTaskRemoved', payload: { id: payload.id } });
    } catch (error) {
      logger.error('Error removing scheduler task', { error: String(error) });
    }
}

/** Toggle enabled/disabled state of a task */
export async function handleToggleSchedulerTask(ctx: HandlerContext, payload: { id: string; enabled: boolean }): Promise<void> {
    try {
      const engine = SchedulerEngine.getInstance();
      engine.toggleTask(payload.id, payload.enabled);
      ctx.postMessage({ type: 'schedulerTaskToggled', payload: { id: payload.id, enabled: payload.enabled } });
    } catch (error) {
      logger.error('Error toggling scheduler task', { error: String(error) });
    }
}

/** Execute a scheduled task immediately (manual trigger) */
export async function handleExecuteSchedulerTask(ctx: HandlerContext, payload: { id: string }): Promise<void> {
    try {
      const engine = SchedulerEngine.getInstance();
      await engine.executeNow(payload.id);
      const task = engine.getTask(payload.id);
      ctx.postMessage({ type: 'schedulerTaskExecuted', payload: { id: payload.id, task } });
    } catch (error) {
      logger.error('Error executing scheduler task', { error: String(error) });
    }
}
