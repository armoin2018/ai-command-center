/**
 * Jira Sync Service
 * AICC-0081: Shared sync logic used by both manual trigger and plan.sync action
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { JiraClient } from './jiraClient';
import { JiraConfig, JiraIssue } from './types';
import { PlanGenerator } from '../../services/planGenerator';
import { PlanArchivalService } from '../../services/planArchivalService';
import { PlanItem } from '../../types/plan';
import { Logger } from '../../logger';

const logger = Logger.getInstance();
const CONFIG_FILE = '.my/aicc/jira-config.save.json';

export interface JiraSyncProgress {
  phase: 'fetching' | 'mapping' | 'comparing' | 'archiving' | 'saving' | 'complete' | 'error';
  message: string;
  percent: number;
}

export interface JiraSyncResult {
  success: boolean;
  itemsCreated: number;
  itemsUpdated: number;
  itemsUnchanged: number;
  itemsArchived: number;
  errors: string[];
  duration: number;
}

export class JiraSyncService {
  private static instance: JiraSyncService;

  private constructor() {}

  public static getInstance(): JiraSyncService {
    if (!JiraSyncService.instance) {
      JiraSyncService.instance = new JiraSyncService();
    }
    return JiraSyncService.instance;
  }

  /**
   * Read Jira configuration from .my/aicc/jira-config.save.json (unified config file)
   * Falls back to VS Code workspace settings for backward compatibility.
   */
  public getJiraConfig(): JiraConfig | null {
    // Primary: read from unified config file
    const wf = vscode.workspace.workspaceFolders;
    if (wf) {
      const configPath = path.join(wf[0].uri.fsPath, CONFIG_FILE);
      try {
        if (fs.existsSync(configPath)) {
          const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (raw.baseUrl && raw.email && raw.projectKey) {
            return {
              enabled: raw.enabled ?? false,
              baseUrl: raw.baseUrl,
              email: raw.email,
              apiToken: '', // Filled from SecretStorage by caller
              projectKey: raw.projectKey,
              syncStrategy: raw.syncStrategy ?? 'pull',
              conflictResolution: raw.conflictResolution ?? 'remote-wins',
              autoSync: raw.autoSync ?? false,
              syncInterval: raw.syncInterval ?? 30,
              webhookEnabled: raw.webhookEnabled ?? false,
              webhookSecret: raw.webhookSecret ?? ''
            };
          }
        }
      } catch (err) {
        logger.warn('Failed to read Jira config file, falling back to settings', { error: String(err) });
      }
    }

    // Fallback: VS Code workspace settings (backward compat)
    const config = vscode.workspace.getConfiguration('aicc.jira');
    const enabled = config.get<boolean>('enabled', false);
    const baseUrl = config.get<string>('baseUrl', '');
    const email = config.get<string>('email', '');
    const projectKey = config.get<string>('projectKey', '');

    if (!baseUrl || !email || !projectKey) {
      return null;
    }

    return {
      enabled,
      baseUrl,
      email,
      apiToken: '', // Filled from SecretStorage by caller
      projectKey,
      syncStrategy: config.get<any>('syncStrategy', 'pull'),
      conflictResolution: config.get<any>('conflictResolution', 'remote-wins'),
      autoSync: config.get<boolean>('autoSync', false),
      syncInterval: config.get<number>('syncInterval', 30),
      webhookEnabled: config.get<boolean>('webhookEnabled', false),
      webhookSecret: config.get<string>('webhookSecret', '')
    };
  }

  /**
   * Perform full sync between Jira and PLAN.json
   * AICC-0235, AICC-0238, AICC-0239
   */
  public async performSync(
    config: JiraConfig,
    workspaceRoot: string,
    onProgress?: (progress: JiraSyncProgress) => void
  ): Promise<JiraSyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let itemsUnchanged = 0;
    let itemsArchived = 0;

    try {
      // Phase 1: Fetch from Jira
      onProgress?.({ phase: 'fetching', message: 'Fetching issues from Jira...', percent: 10 });

      JiraClient.resetInstance();
      const client = JiraClient.getInstance(config);

      const jql = `project = ${config.projectKey} ORDER BY created DESC`;
      const jiraIssues = await client.searchIssues(jql);

      logger.info(`Fetched ${jiraIssues.length} issues from Jira`, { component: 'JiraSyncService' });

      // Phase 2: Map to PlanItems
      onProgress?.({ phase: 'mapping', message: `Mapping ${jiraIssues.length} issues...`, percent: 30 });

      const mappedItems = jiraIssues.map(issue => this.mapJiraIssueToPlanItem(issue));

      // Phase 3: Compare with existing plan
      onProgress?.({ phase: 'comparing', message: 'Comparing with local plan...', percent: 50 });

      const planGen = PlanGenerator.getInstance();
      const planDoc = planGen.getPlanDocument();
      const existingItems = planDoc?.items || [];

      // Build lookup of existing items by jiraKey
      const existingByJiraKey = new Map<string, PlanItem>();
      for (const item of existingItems) {
        const jiraKey =
          (item.metadata as Record<string, unknown>)?.jiraKey as string | undefined;
        if (jiraKey) {
          existingByJiraKey.set(jiraKey, item);
        }
      }

      // Process mapped items
      for (const mapped of mappedItems) {
        const jiraKey = (mapped.metadata as Record<string, unknown>)?.jiraKey as string;
        const existing = existingByJiraKey.get(jiraKey);

        try {
          if (!existing) {
            // New item — create
            await planGen.createPlanItem(mapped);
            itemsCreated++;
          } else {
            // Existing item — check for changes
            const hasChanges = this.hasItemChanged(existing, mapped);
            if (hasChanges) {
              await planGen.updatePlanItem(existing.id, {
                summary: mapped.summary,
                description: mapped.description,
                status: mapped.status,
                priority: mapped.priority,
                assignee: mapped.assignee,
                metadata: {
                  ...(existing.metadata || {}),
                  ...(mapped.metadata as Record<string, unknown> || {}),
                  updatedAt: new Date().toISOString(),
                  updatedBy: 'jira-sync'
                }
              } as Partial<PlanItem>);
              itemsUpdated++;
            } else {
              itemsUnchanged++;
            }
          }
        } catch (err) {
          const errorMsg = `Error processing ${jiraKey}: ${err}`;
          errors.push(errorMsg);
          logger.error(errorMsg, { component: 'JiraSyncService' });
        }
      }

      // Phase 4: Detect and archive removals (AICC-0238, AICC-0239)
      onProgress?.({ phase: 'archiving', message: 'Checking for removed issues...', percent: 70 });

      const jiraIssueKeys = jiraIssues.map(i => i.key);
      const archival = PlanArchivalService.getInstance();
      archival.initialize(workspaceRoot);

      const archivedItems = await archival.detectAndArchiveJiraRemovals(existingItems, jiraIssueKeys);
      itemsArchived = archivedItems.length;

      // Remove archived items from plan
      if (archivedItems.length > 0 && planDoc) {
        const archivedIds = new Set(archivedItems.map(i => i.id));
        planDoc.items = planDoc.items.filter(i => !archivedIds.has(i.id));
      }

      // Phase 5: Save
      onProgress?.({ phase: 'saving', message: 'Saving plan...', percent: 90 });
      await planGen.savePlanDocument();

      const duration = Date.now() - startTime;

      onProgress?.({ phase: 'complete', message: 'Sync complete', percent: 100 });

      logger.info('Jira sync complete', {
        component: 'JiraSyncService',
        itemsCreated,
        itemsUpdated,
        itemsUnchanged,
        itemsArchived,
        errors: errors.length,
        duration
      });

      return {
        success: errors.length === 0,
        itemsCreated,
        itemsUpdated,
        itemsUnchanged,
        itemsArchived,
        errors,
        duration
      };
    } catch (err) {
      const errorMsg = `Sync failed: ${err}`;
      errors.push(errorMsg);
      logger.error(errorMsg, { component: 'JiraSyncService' });

      onProgress?.({ phase: 'error', message: errorMsg, percent: 0 });

      return {
        success: false,
        itemsCreated,
        itemsUpdated,
        itemsUnchanged,
        itemsArchived,
        errors,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Map a Jira issue to a PlanItem
   */
  private mapJiraIssueToPlanItem(issue: JiraIssue): PlanItem {
    const issueType = (issue.fields.issuetype?.name || 'Task').toLowerCase();
    let planType: PlanItem['type'] = 'task';
    if (issueType === 'epic') planType = 'epic';
    else if (issueType === 'story' || issueType === 'user story') planType = 'story';
    else if (issueType === 'bug') planType = 'bug';

    const statusName = (issue.fields.status?.name || '').toLowerCase();
    let planStatus: PlanItem['status'] = 'BACKLOG';
    if (statusName.includes('in progress') || statusName.includes('in development')) planStatus = 'IN-PROGRESS';
    else if (statusName.includes('done') || statusName.includes('closed') || statusName.includes('resolved')) planStatus = 'DONE';
    else if (statusName.includes('review')) planStatus = 'REVIEW';
    else if (statusName.includes('blocked')) planStatus = 'BLOCKED';
    else if (statusName.includes('ready') || statusName.includes('to do') || statusName === 'open') planStatus = 'READY';

    const priorityName = (issue.fields.priority?.name || 'Medium').toLowerCase();
    let planPriority: PlanItem['priority'] = 'medium';
    if (priorityName.includes('highest') || priorityName.includes('critical')) planPriority = 'critical';
    else if (priorityName.includes('high')) planPriority = 'high';
    else if (priorityName.includes('low') || priorityName.includes('lowest')) planPriority = 'low';

    // Extract description text from Atlassian Document Format
    let description = '';
    if (issue.fields.description) {
      if (typeof issue.fields.description === 'string') {
        description = issue.fields.description;
      } else if (issue.fields.description.content) {
        description = this.extractTextFromADF(issue.fields.description);
      }
    }

    return {
      id: issue.key,
      type: planType,
      summary: issue.fields.summary,
      description,
      status: planStatus,
      priority: planPriority,
      parentId: issue.fields.parent?.key,
      tags: issue.fields.labels || [],
      assignee: issue.fields.assignee?.displayName,
      metadata: {
        createdAt: issue.fields.created,
        updatedAt: issue.fields.updated,
        createdBy: issue.fields.reporter?.displayName || 'jira',
        updatedBy: 'jira-sync',
        jiraKey: issue.key,
        jiraId: issue.id,
        jiraUrl: issue.self,
        externalId: issue.key,
        lastSyncedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Extract plain text from Atlassian Document Format
   */
  private extractTextFromADF(adf: any): string {
    if (!adf || !adf.content) return '';

    const extractText = (nodes: any[]): string => {
      return nodes.map((node: any) => {
        if (node.type === 'text') return node.text || '';
        if (node.content) return extractText(node.content);
        return '';
      }).join('');
    };

    return extractText(adf.content);
  }

  /**
   * Check if a plan item has changed compared to mapped Jira data
   */
  private hasItemChanged(existing: PlanItem, mapped: PlanItem): boolean {
    return (
      existing.summary !== mapped.summary ||
      existing.status !== mapped.status ||
      existing.priority !== mapped.priority ||
      existing.description !== mapped.description ||
      existing.assignee !== mapped.assignee
    );
  }
}
