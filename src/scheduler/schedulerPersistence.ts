/**
 * Scheduler Persistence
 * AICC-0225: Schedule persistence to .my/aicc/tasks.json
 *
 * Uses atomic write pattern: write → .tmp → rename, with .bak backup.
 * On first load, migrates tasks from legacy .project/scheduled-tasks.json
 * if the new file does not yet exist.
 */

import * as path from 'path';
import * as fs from 'fs';
import { ScheduledTask } from './schedulerEngine';
import { Logger } from '../logger';

const TASKS_FILE = '.my/aicc/tasks.json';
const LEGACY_TASKS_FILE = '.project/scheduled-tasks.json';

export class SchedulerPersistence {
  private workspaceRoot: string = '';
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /** Set the workspace root before any load / save operations */
  initialize(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
    this.migrateIfNeeded();
  }

  // ── Migration ────────────────────────────────────────────────────────

  /**
   * Migrate tasks from legacy .project/scheduled-tasks.json to .my/aicc/tasks.json.
   * Only runs when the new file does not exist and the legacy file does.
   */
  private migrateIfNeeded(): void {
    if (!this.workspaceRoot) { return; }

    const newPath = path.join(this.workspaceRoot, TASKS_FILE);
    const legacyPath = path.join(this.workspaceRoot, LEGACY_TASKS_FILE);

    try {
      if (!fs.existsSync(newPath) && fs.existsSync(legacyPath)) {
        const legacyContent = fs.readFileSync(legacyPath, 'utf-8');
        const legacyDoc = JSON.parse(legacyContent);
        const tasks: ScheduledTask[] = legacyDoc.tasks || [];

        // Ensure target directory exists
        const dir = path.dirname(newPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const doc = {
          $schema: '../.github/aicc/schemas/tasks.v1.schema.json',
          version: '1.0.0',
          updatedAt: new Date().toISOString(),
          migratedFrom: LEGACY_TASKS_FILE,
          tasks,
          settings: legacyDoc.settings || {
            maxConcurrentTasks: 3,
            rateLimitPerMinute: 30,
            stuckThresholdSeconds: 600
          }
        };

        fs.writeFileSync(newPath, JSON.stringify(doc, null, 2), 'utf-8');
        this.logger.info(`Migrated ${tasks.length} task(s) from ${LEGACY_TASKS_FILE} → ${TASKS_FILE}`);
      }
    } catch (err) {
      this.logger.warn('Failed to migrate legacy scheduled tasks', { error: String(err) });
    }
  }

  // ── Load ─────────────────────────────────────────────────────────────

  /** Load tasks from .my/aicc/tasks.json */
  loadTasks(): ScheduledTask[] {
    if (!this.workspaceRoot) { return []; }

    const filePath = path.join(this.workspaceRoot, TASKS_FILE);
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const doc = JSON.parse(content);
        return doc.tasks || [];
      }
    } catch (err) {
      this.logger.warn('Failed to load scheduled tasks', { error: String(err) });
    }
    return [];
  }

  // ── Save (atomic) ───────────────────────────────────────────────────

  /** Save tasks to .my/aicc/tasks.json with atomic write (.tmp → rename, .bak backup) */
  saveTasks(tasks: ScheduledTask[]): void {
    if (!this.workspaceRoot) { return; }

    const filePath = path.join(this.workspaceRoot, TASKS_FILE);
    const tmpPath = filePath + '.tmp';
    const bakPath = filePath + '.bak';

    // Preserve existing settings and $schema when present
    let existing: Record<string, any> = {};
    try {
      if (fs.existsSync(filePath)) {
        existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
    } catch (_) { /* use defaults */ }

    const doc = {
      $schema: existing.$schema || '../.github/aicc/schemas/tasks.v1.schema.json',
      version: '1.0.0',
      updatedAt: new Date().toISOString(),
      tasks,
      settings: existing.settings || {
        maxConcurrentTasks: 3,
        rateLimitPerMinute: 30,
        stuckThresholdSeconds: 600
      }
    };

    const content = JSON.stringify(doc, null, 2);

    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Backup existing file
      if (fs.existsSync(filePath)) {
        fs.copyFileSync(filePath, bakPath);
      }

      // Write to tmp then rename (atomic on most filesystems)
      fs.writeFileSync(tmpPath, content, 'utf-8');
      fs.renameSync(tmpPath, filePath);

      this.logger.info(`Saved ${tasks.length} scheduled task(s) to ${TASKS_FILE}`);
    } catch (err) {
      this.logger.error('Failed to save scheduled tasks', { error: String(err) });
    }
  }
}
