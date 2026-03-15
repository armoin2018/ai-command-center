/**
 * Plan Archival Service
 * Manages archival of completed/removed items to PLAN-HISTORY.json and PLAN-ARCHIVE.json
 */

import * as path from 'path';
import * as fs from 'fs';
import { PlanItem } from '../types/plan';
import { Logger } from '../logger';

// ── History types ──

export interface HistoryEntry {
  item: PlanItem;
  archivedAt: string;       // ISO timestamp
  archivedFrom: 'status-transition' | 'manual' | 'jira-sync';
  previousStatus?: string;
  archivedBy?: string;
}

export interface PlanHistoryDocument {
  version: '1.0.0';
  lastUpdated: string;
  entries: HistoryEntry[];
}

// ── Archive types ──

export interface ArchiveEntry {
  item: PlanItem;
  archivedAt: string;
  reason: 'jira-removal' | 'manual' | 'bulk-cleanup';
  context?: string;  // e.g., "Removed from Jira project AICC during sync on 2026-02-21"
}

export interface PlanArchiveDocument {
  version: '1.0.0';
  lastUpdated: string;
  entries: ArchiveEntry[];
}

export class PlanArchivalService {
  private static instance: PlanArchivalService;
  private logger: Logger;
  private workspaceRoot: string = '';

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): PlanArchivalService {
    if (!PlanArchivalService.instance) {
      PlanArchivalService.instance = new PlanArchivalService();
    }
    return PlanArchivalService.instance;
  }

  /**
   * Initialize with the workspace root path
   */
  public initialize(workspaceRoot: string): void {
    this.workspaceRoot = workspaceRoot;
    this.logger.info('PlanArchivalService initialized', { workspaceRoot });
  }

  // ── History operations ──

  /**
   * Move a completed/cancelled item from PLAN.json to PLAN-HISTORY.json
   */
  async archiveToHistory(
    item: PlanItem,
    reason: HistoryEntry['archivedFrom'],
    previousStatus?: string
  ): Promise<void> {
    const doc = await this.loadHistory();

    const entry: HistoryEntry = {
      item: { ...item },
      archivedAt: new Date().toISOString(),
      archivedFrom: reason,
      previousStatus,
      archivedBy: 'system'
    };

    doc.entries.push(entry);
    doc.lastUpdated = new Date().toISOString();

    await this.saveHistory(doc);

    this.logger.info(`Item archived to history: ${item.id}`, {
      reason,
      previousStatus
    });
  }

  /**
   * Load PLAN-HISTORY.json, creating a fresh document if the file does not exist
   */
  async loadHistory(): Promise<PlanHistoryDocument> {
    const historyPath = this.getHistoryPath();

    try {
      if (fs.existsSync(historyPath)) {
        const raw = fs.readFileSync(historyPath, 'utf-8');
        return JSON.parse(raw) as PlanHistoryDocument;
      }
    } catch (error) {
      this.logger.warn('Error reading PLAN-HISTORY.json, creating new document', {
        error: String(error)
      });
    }

    // Return empty document
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      entries: []
    };
  }

  /**
   * Save PLAN-HISTORY.json atomically with validation
   */
  private async saveHistory(doc: PlanHistoryDocument): Promise<void> {
    // Validate before saving (non-blocking)
    const validation = this.validateHistory(doc);
    if (!validation.valid) {
      this.logger.warn('PLAN-HISTORY.json validation warnings', {
        errors: validation.errors
      });
    }

    const historyPath = this.getHistoryPath();
    const content = JSON.stringify(doc, null, 2);
    await this.atomicWrite(historyPath, content);
  }

  // ── Archive operations ──

  /**
   * Move a Jira-removed item to PLAN-ARCHIVE.json
   */
  async archiveForJiraRemoval(item: PlanItem, context: string): Promise<void> {
    const doc = await this.loadArchive();

    const entry: ArchiveEntry = {
      item: { ...item },
      archivedAt: new Date().toISOString(),
      reason: 'jira-removal',
      context
    };

    doc.entries.push(entry);
    doc.lastUpdated = new Date().toISOString();

    await this.saveArchive(doc);

    this.logger.info(`Item archived for Jira removal: ${item.id}`, { context });
  }

  /**
   * Manual archive of selected items
   */
  async archiveManually(items: PlanItem[], reason?: string): Promise<void> {
    const doc = await this.loadArchive();
    const now = new Date().toISOString();

    for (const item of items) {
      const entry: ArchiveEntry = {
        item: { ...item },
        archivedAt: now,
        reason: 'manual',
        context: reason || 'Manually archived by user'
      };
      doc.entries.push(entry);
    }

    doc.lastUpdated = now;
    await this.saveArchive(doc);

    this.logger.info(`${items.length} item(s) manually archived`, {
      ids: items.map(i => i.id)
    });
  }

  /**
   * Load PLAN-ARCHIVE.json, creating a fresh document if the file does not exist
   */
  async loadArchive(): Promise<PlanArchiveDocument> {
    const archivePath = this.getArchivePath();

    try {
      if (fs.existsSync(archivePath)) {
        const raw = fs.readFileSync(archivePath, 'utf-8');
        return JSON.parse(raw) as PlanArchiveDocument;
      }
    } catch (error) {
      this.logger.warn('Error reading PLAN-ARCHIVE.json, creating new document', {
        error: String(error)
      });
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      entries: []
    };
  }

  /**
   * Save PLAN-ARCHIVE.json atomically
   */
  private async saveArchive(doc: PlanArchiveDocument): Promise<void> {
    const archivePath = this.getArchivePath();
    const content = JSON.stringify(doc, null, 2);
    await this.atomicWrite(archivePath, content);
  }

  // ── Jira removal detection ──

  /**
   * Detect plan items that have been removed from Jira and archive them.
   * Returns the list of items that were archived.
   */
  async detectAndArchiveJiraRemovals(
    planItems: PlanItem[],
    jiraIssueKeys: string[]
  ): Promise<PlanItem[]> {
    const removals = planItems.filter(item => {
      const jiraKey =
        (item.metadata as Record<string, unknown>)?.jiraKey as string | undefined ||
        (item.metadata as Record<string, unknown>)?.externalId as string | undefined;
      return jiraKey && !jiraIssueKeys.includes(jiraKey);
    });

    for (const item of removals) {
      await this.archiveForJiraRemoval(
        item,
        `Removed from Jira during sync at ${new Date().toISOString()}`
      );
    }

    if (removals.length > 0) {
      this.logger.info(`Detected and archived ${removals.length} Jira removal(s)`, {
        ids: removals.map(i => i.id)
      });
    }

    return removals;
  }

  // ── Validation ──

  /**
   * Validate a PlanHistoryDocument against the expected schema
   */
  validateHistory(doc: PlanHistoryDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (doc.version !== '1.0.0') {
      errors.push(`Invalid version: ${doc.version}`);
    }
    if (!doc.lastUpdated) {
      errors.push('Missing lastUpdated');
    }
    if (!Array.isArray(doc.entries)) {
      errors.push('entries must be an array');
    } else {
      for (const entry of doc.entries) {
        if (!entry.item?.id) {
          errors.push('Entry missing item.id');
        }
        if (!entry.archivedAt) {
          errors.push(`Entry ${entry.item?.id} missing archivedAt`);
        }
        if (!['status-transition', 'manual', 'jira-sync'].includes(entry.archivedFrom)) {
          errors.push(
            `Entry ${entry.item?.id} invalid archivedFrom: ${entry.archivedFrom}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate a PlanArchiveDocument against the expected schema
   */
  validateArchive(doc: PlanArchiveDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (doc.version !== '1.0.0') {
      errors.push(`Invalid version: ${doc.version}`);
    }
    if (!doc.lastUpdated) {
      errors.push('Missing lastUpdated');
    }
    if (!Array.isArray(doc.entries)) {
      errors.push('entries must be an array');
    } else {
      for (const entry of doc.entries) {
        if (!entry.item?.id) {
          errors.push('Entry missing item.id');
        }
        if (!entry.archivedAt) {
          errors.push(`Entry ${entry.item?.id} missing archivedAt`);
        }
        if (!['jira-removal', 'manual', 'bulk-cleanup'].includes(entry.reason)) {
          errors.push(
            `Entry ${entry.item?.id} invalid reason: ${entry.reason}`
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Utilities ──

  /** Get the history file path */
  private getHistoryPath(): string {
    return path.join(this.workspaceRoot, '.project', 'PLAN-HISTORY.json');
  }

  /** Get the archive file path */
  private getArchivePath(): string {
    return path.join(this.workspaceRoot, '.project', 'PLAN-ARCHIVE.json');
  }

  /**
   * Atomic write: write to temp, rename to final.
   * Creates a .bak backup of the existing file before overwriting.
   */
  private async atomicWrite(filePath: string, content: string): Promise<void> {
    const tmpPath = filePath + '.tmp';
    const bakPath = filePath + '.bak';

    // Ensure the parent directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create backup if the file already exists
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, bakPath);
    }

    // Write to temp file
    fs.writeFileSync(tmpPath, content, 'utf-8');

    // Atomic rename
    fs.renameSync(tmpPath, filePath);
  }
}
