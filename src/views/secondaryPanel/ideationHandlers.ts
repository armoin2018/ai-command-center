/**
 * Ideation Handlers for the Secondary Panel
 * Handles idea management, voting, cloning to plan items, and AI discovery.
 * Extracted from SecondaryPanelProvider for modularity.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { HandlerContext } from './types';
import { Logger } from '../../logger';
import { PlanItem } from '../../types/plan';

const logger = Logger.getInstance();

/** Runtime idea voter shape (legacy IDEAS.json format) */
interface RuntimeIdeaVoter {
    createdBy?: string;
    voterId?: string;
    vote: number;
    votedAt: string;
}

/** Runtime idea shape (legacy IDEAS.json format — differs from formal Idea type) */
interface RuntimeIdea {
    id: string;
    type?: string;
    name?: string;
    title?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    status: string;
    votes?: { up: number; down: number; voters: RuntimeIdeaVoter[] };
    comments?: Array<{ commentId: string; createdBy: string; text: string; createdAt: string }>;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    clonedToStoryId?: string;
    clonedToTaskId?: string;
}

/**
 * Load ideation data from .project/IDEAS.json
 */
export async function handleGetIdeationData(ctx: HandlerContext): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const ideasPath = path.join(workspaceFolders[0].uri.fsPath, '.project', 'IDEAS.json');
      const fs = require('fs');

      let data = { version: '1.0.0', ideas: [] as RuntimeIdea[] };
      if (fs.existsSync(ideasPath)) {
        const raw = fs.readFileSync(ideasPath, 'utf-8');
        data = JSON.parse(raw);
      }

      ctx.postMessage({
        type: 'ideationDataLoaded',
        payload: data,
      });
    } catch (error) {
      logger.error('Error loading ideation data', { error: String(error) });
    }
}

/**
 * Handle vote on an idea (REQ-IDEA-085 / REQ-IDEA-086)
 */
export async function handleIdeationVote(ctx: HandlerContext, payload: { ideaId: string; direction: string; userId: string }): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const ideasPath = path.join(workspaceFolders[0].uri.fsPath, '.project', 'IDEAS.json');
      const fs = require('fs');

      if (!fs.existsSync(ideasPath)) return;

      const raw = fs.readFileSync(ideasPath, 'utf-8');
      const data = JSON.parse(raw);
      const idea = data.ideas?.find((i: RuntimeIdea) => i.id === payload.ideaId);
      if (!idea) return;

      // Ensure votes structure
      if (!idea.votes) idea.votes = { up: 0, down: 0, voters: [] };
      if (!idea.votes.voters) idea.votes.voters = [];

      // Check one-vote-per-person limit (REQ-IDEA-085)
      const existing = idea.votes.voters.find((v: RuntimeIdeaVoter) => v.createdBy === payload.userId || v.voterId === payload.userId);
      if (existing) return; // already voted

      const voteVal = payload.direction === 'up' ? 1 : -1;
      idea.votes.voters.push({
        createdBy: payload.userId,
        vote: voteVal,
        votedAt: new Date().toISOString(),
      });
      if (voteVal === 1) idea.votes.up = (idea.votes.up || 0) + 1;
      else idea.votes.down = (idea.votes.down || 0) + 1;

      // Vote history as comment (REQ-IDEA-086)
      if (!idea.comments) idea.comments = [];
      idea.comments.push({
        commentId: `vote-${Date.now()}`,
        createdBy: 'system',
        text: `${payload.userId} voted ${payload.direction} on this idea`,
        createdAt: new Date().toISOString(),
      });

      idea.updatedAt = new Date().toISOString();
      data.updatedAt = new Date().toISOString();
      ctx.setIdeaSelfWriteGuard(true);
      fs.writeFileSync(ideasPath, JSON.stringify(data, null, 2), 'utf-8');
      setTimeout(() => { ctx.setIdeaSelfWriteGuard(false); }, 500);

      ctx.postMessage({
        type: 'ideationVoteResult',
        payload: { idea },
      });
    } catch (error) {
      logger.error('Error processing ideation vote', { error: String(error) });
    }
}

/**
 * Handle ideation actions: create, clone-story, clone-task
 */
export async function handleIdeationAction(ctx: HandlerContext, payload: { ideaId?: string; action: string }): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const ideasPath = path.join(workspaceFolders[0].uri.fsPath, '.project', 'IDEAS.json');
      const fs = require('fs');

      let data = { version: '1.0.0', ideas: [] as RuntimeIdea[], updatedAt: new Date().toISOString() };
      if (fs.existsSync(ideasPath)) {
        data = JSON.parse(fs.readFileSync(ideasPath, 'utf-8'));
      }

      if (payload.action === 'create') {
        const nextId = data.ideas.length > 0
          ? Math.max(...data.ideas.map((i: RuntimeIdea) => parseInt(i.id?.replace('IDEA-', '') || '0', 10))) + 1
          : 1;
        const newIdea = {
          id: `IDEA-${String(nextId).padStart(3, '0')}`,
          type: 'Story',
          name: 'New Idea',
          summary: '',
          description: '',
          tags: ['Uncategorized'],
          status: 'draft',
          votes: { up: 0, down: 0, voters: [] },
          comments: [],
          createdBy: 'local-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        data.ideas.unshift(newIdea);
      } else if (payload.action === 'clone-story' || payload.action === 'clone-task') {
        const idea = data.ideas.find((i: RuntimeIdea) => i.id === payload.ideaId);
        if (idea) {
          const itemType = payload.action === 'clone-story' ? 'story' : 'task';
          logger.info(`Cloning idea ${idea.id} to ${itemType}`);

          // Generate a plan item ID from existing items
          const planGen = ctx.planGenerator;
          const existingItems = planGen.getItems ? planGen.getItems() : [];
          const prefix = itemType.toUpperCase();
          const existingOfType = existingItems.filter((it: PlanItem) => it.type === itemType);
          const nextNum = existingOfType.length + 1;
          const planItemId = `${prefix}-IDEA-${String(nextNum).padStart(3, '0')}`;

          // Create actual plan item via PlanGenerator
          try {
            const planItem = {
              id: planItemId,
              type: itemType as 'story' | 'task',
              summary: idea.name || idea.title || 'Untitled Idea',
              description: [
                idea.summary || idea.description || '',
                '',
                `---`,
                `*Source*: Ideation System`,
                `*Idea ID*: ${idea.id}`,
                `*Created by*: ${idea.createdBy || 'unknown'}`,
                idea.tags?.length ? `*Tags*: ${idea.tags.join(', ')}` : '',
              ].filter(Boolean).join('\n'),
              status: 'BACKLOG' as const,
              priority: 'medium' as const,
              tags: [...(idea.tags || []), 'from-ideation'],
              metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'ideation-clone',
                updatedBy: 'ideation-clone',
              },
              linkedRelationships: [{
                type: 'relates-to' as const,
                itemId: idea.id,
              }],
            };

            await planGen.createPlanItem(planItem);
            logger.info(`Plan item ${planItemId} created from idea ${idea.id}`);

            // Record traceability link on the idea
            if (itemType === 'story') {
              idea.clonedToStoryId = planItemId;
            } else {
              idea.clonedToTaskId = planItemId;
            }
            idea.status = 'accepted';
            idea.updatedAt = new Date().toISOString();

            // Add audit comment
            if (!idea.comments) idea.comments = [];
            idea.comments.push({
              commentId: `clone-${Date.now()}`,
              createdBy: 'system',
              text: `Cloned to ${itemType}: ${planItemId}`,
              createdAt: new Date().toISOString(),
            });

            vscode.window.showInformationMessage(
              `Idea ${idea.id} cloned to ${itemType} ${planItemId} in PLAN.json`
            );
          } catch (planErr) {
            logger.error(`Failed to create plan item from idea ${idea.id}`, { error: String(planErr) });
            if (itemType === 'story') idea.clonedToStoryId = `error-${Date.now()}`;
            else idea.clonedToTaskId = `error-${Date.now()}`;
            vscode.window.showErrorMessage(
              `Failed to clone idea to ${itemType}: ${String(planErr)}`
            );
          }
        }
      }

      data.updatedAt = new Date().toISOString();
      // Ensure directory exists and write with self-write guard
      const dir = path.dirname(ideasPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      ctx.setIdeaSelfWriteGuard(true);
      fs.writeFileSync(ideasPath, JSON.stringify(data, null, 2), 'utf-8');
      setTimeout(() => { ctx.setIdeaSelfWriteGuard(false); }, 500);

      ctx.postMessage({
        type: 'ideationItemSaved',
        payload: { ideas: data.ideas },
      });
    } catch (error) {
      logger.error('Error handling ideation action', { error: String(error) });
    }
}

/**
 * AI Discover ideas (REQ-IDEA-088)
 * Analyses PLAN.json for gaps, existing ideas for patterns, and generates
 * context-aware draft ideas based on workspace analysis.
 */
export async function handleIdeationDiscover(ctx: HandlerContext): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const fs = require('fs');
      const wsRoot = workspaceFolders[0].uri.fsPath;

      // ── 1. Gather PLAN.json context
      const planPath = path.join(wsRoot, '.project', 'PLAN.json');
      let planItems: PlanItem[] = [];
      if (fs.existsSync(planPath)) {
        try {
          const planDoc = JSON.parse(fs.readFileSync(planPath, 'utf-8'));
          planItems = planDoc.items || [];
        } catch { /* ignore parse errors */ }
      }

      // ── 2. Gather existing IDEAS.json context
      const ideasPath = path.join(wsRoot, '.project', 'IDEAS.json');
      let existingIdeas: RuntimeIdea[] = [];
      if (fs.existsSync(ideasPath)) {
        try {
          const ideasDoc = JSON.parse(fs.readFileSync(ideasPath, 'utf-8'));
          existingIdeas = ideasDoc.ideas || [];
        } catch { /* ignore parse errors */ }
      }

      const existingTitles = new Set(
        existingIdeas.map((i: RuntimeIdea) => (i.name || i.title || '').toLowerCase())
      );

      // ── 3. Analyse plan for opportunity patterns
      const newIdeas: RuntimeIdea[] = [];
      const now = new Date().toISOString();
      const nextId = existingIdeas.length > 0
        ? Math.max(...existingIdeas.map((i: RuntimeIdea) => parseInt(i.id?.replace('IDEA-', '') || '0', 10))) + 1
        : 1;
      let idCounter = nextId;

      const makeIdea = (name: string, summary: string, tags: string[], type = 'Story') => {
        if (existingTitles.has(name.toLowerCase())) return;
        existingTitles.add(name.toLowerCase());
        const idea = {
          id: `IDEA-${String(idCounter++).padStart(3, '0')}`,
          type,
          name,
          summary,
          description: `AI Discovery generated this idea based on project analysis. Review and refine before promoting.`,
          tags: ['ai-discovered', ...tags],
          status: 'draft',
          votes: { up: 0, down: 0, voters: [] },
          comments: [{
            commentId: `ai-${Date.now()}-${idCounter}`,
            createdBy: 'system',
            text: `Auto-discovered via AI analysis (REQ-IDEA-088)`,
            createdAt: now,
          }],
          createdBy: 'ai-discovery',
          createdAt: now,
          updatedAt: now,
        };
        newIdeas.push(idea);
      };

      // Pattern A: Find blocked items
      const blockedItems = planItems.filter((i: PlanItem) => i.status === 'BLOCKED');
      for (const blocked of blockedItems.slice(0, 2)) {
        makeIdea(
          `Unblock: ${blocked.summary}`,
          `${blocked.id} is blocked. Explore alternative approaches or dependency resolution.`,
          ['improvement', 'blocked-resolution']
        );
      }

      // Pattern B: Epics with no stories
      const epics = planItems.filter((i: PlanItem) => i.type === 'epic');
      const childMap = new Map<string, number>();
      planItems.forEach((i: PlanItem) => {
        if (i.parentId) childMap.set(i.parentId, (childMap.get(i.parentId) || 0) + 1);
      });
      for (const epic of epics) {
        if (!childMap.has(epic.id) || (childMap.get(epic.id) || 0) === 0) {
          makeIdea(
            `Decompose: ${epic.summary}`,
            `Epic ${epic.id} has no child stories. Consider breaking it down into actionable stories.`,
            ['planning', 'decomposition'],
            'Epic'
          );
        }
      }

      // Pattern C: High concentration of BACKLOG items
      const backlogItems = planItems.filter((i: PlanItem) => i.status === 'BACKLOG');
      if (backlogItems.length > 20) {
        makeIdea(
          'Backlog Prioritisation Sprint',
          `${backlogItems.length} items in BACKLOG. Run a prioritisation session to identify quick wins and critical path items.`,
          ['process', 'prioritisation']
        );
      }

      // Pattern D: Tags/categories with few items
      const tagCounts = new Map<string, number>();
      planItems.forEach((i: PlanItem) => {
        (i.tags || []).forEach((t: string) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));
      });
      for (const [tag, count] of tagCounts) {
        if (count <= 2 && !['from-ideation'].includes(tag)) {
          makeIdea(
            `Expand coverage: ${tag}`,
            `Only ${count} plan item(s) tagged "${tag}". Consider whether this area needs more stories or tasks.`,
            ['research', tag]
          );
          if (newIdeas.length >= 5) break;
        }
      }

      // Pattern E: No testing items
      const testItems = planItems.filter((i: PlanItem) =>
        (i.summary || '').toLowerCase().includes('test') ||
        (i.tags || []).some((t: string) => t.toLowerCase().includes('test'))
      );
      if (testItems.length === 0 && planItems.length > 10) {
        makeIdea(
          'Add Test Coverage Strategy',
          'No test-related items found in the plan. Consider adding unit, integration, or E2E test stories.',
          ['tooling', 'testing'],
          'Story'
        );
      }

      // Pattern F: Completed items without docs
      const doneCount = planItems.filter((i: PlanItem) => i.status === 'DONE').length;
      const docItems = planItems.filter((i: PlanItem) =>
        (i.summary || '').toLowerCase().includes('doc') ||
        (i.tags || []).some((t: string) => t.toLowerCase().includes('doc'))
      );
      if (doneCount > 15 && docItems.length < 3) {
        makeIdea(
          'Documentation Catch-up Sprint',
          `${doneCount} items completed but few documentation items exist. Consider a docs sprint.`,
          ['process', 'documentation'],
          'Story'
        );
      }

      // ── 4. Persist new ideas to IDEAS.json
      if (newIdeas.length > 0) {
        const saveData = { version: '1.0.0', ideas: [...newIdeas, ...existingIdeas], updatedAt: now };

        const dir = path.dirname(ideasPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        ctx.setIdeaSelfWriteGuard(true);
        fs.writeFileSync(ideasPath, JSON.stringify(saveData, null, 2), 'utf-8');
        setTimeout(() => { ctx.setIdeaSelfWriteGuard(false); }, 500);
      }

      // ── 5. Send results to webview
      ctx.postMessage({
        type: 'ideationDiscoverResult',
        payload: { newIdeas },
      });

      const count = newIdeas.length;
      if (count > 0) {
        vscode.window.showInformationMessage(
          `AI Discovery: ${count} new idea${count > 1 ? 's' : ''} added as draft${count > 1 ? 's' : ''}`
        );
      } else {
        vscode.window.showInformationMessage(
          'AI Discovery: No new ideas to suggest — your project is well-covered!'
        );
      }
    } catch (error) {
      logger.error('Error in AI ideation discover', { error: String(error) });
      vscode.window.showErrorMessage(`AI Discovery failed: ${String(error)}`);
    }
}

/**
 * Load ideation-specific Jira config from .my/aicc/ideation.json (REQ-IDEA-092)
 */
export async function handleGetIdeationJiraConfig(ctx: HandlerContext): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const configPath = path.join(workspaceFolders[0].uri.fsPath, '.my', 'aicc', 'ideation.json');
      const fs = require('fs');

      let config: Record<string, any> = {
        enabled: false,
        projectKey: '',
        issueType: 'Task',
        syncEnabled: false,
        syncIntervalMinutes: 30,
        statusMapping: {},
      };

      if (fs.existsSync(configPath)) {
        const existing = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config = { ...config, ...existing };
      }

      ctx.postMessage({
        type: 'ideationJiraConfigLoaded',
        payload: config,
      });
    } catch (error) {
      logger.error('Error loading ideation Jira config', { error: String(error) });
    }
}

/**
 * Save ideation-specific Jira config to .my/aicc/ideation.json
 * If syncEnabled is true, creates a scheduled sync task; if false, removes it.
 */
export async function handleSaveIdeationJiraConfig(ctx: HandlerContext, payload: Record<string, any>): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) return;

      const configDir = path.join(workspaceFolders[0].uri.fsPath, '.my', 'aicc');
      const configPath = path.join(configDir, 'ideation.json');
      const fs = require('fs');

      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const existing = fs.existsSync(configPath)
        ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
        : {};

      const merged = { ...existing, ...payload, lastUpdated: new Date().toISOString() };
      fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');

      logger.info('Ideation Jira config saved to .my/aicc/ideation.json');

      // Manage scheduled sync task based on syncEnabled flag
      let scheduledTask = false;
      try {
        const { SchedulerEngine } = require('../../scheduler/schedulerEngine');
        const engine = SchedulerEngine.getInstance();
        const taskId = 'ideation-jira-sync';

        if (payload.syncEnabled && payload.projectKey) {
          const intervalMs = (payload.syncIntervalMinutes || 30) * 60 * 1000;
          const existingTask = engine.getTask?.(taskId);
          if (existingTask) {
            // Update existing task
            engine.removeTask(taskId);
          }
          engine.addTask({
            id: taskId,
            name: `Ideation Jira Sync (${payload.projectKey})`,
            actionId: 'ideation.jiraSync',
            params: { projectKey: payload.projectKey },
            scheduleType: 'interval',
            scheduleValue: String(intervalMs),
            enabled: true,
            lastRun: null,
            lastResult: null,
            lastError: null,
            nextRun: new Date(Date.now() + intervalMs).toISOString(),
            createdAt: new Date().toISOString(),
          });
          scheduledTask = true;
          logger.info(`Ideation Jira scheduled sync task created: every ${payload.syncIntervalMinutes}min for ${payload.projectKey}`);
        } else {
          // Remove scheduled task if it exists
          try { engine.removeTask(taskId); } catch (_e) { /* no-op if not found */ }
          logger.info('Ideation Jira scheduled sync task removed (auto-sync disabled)');
        }
      } catch (schedErr) {
        logger.warn('Could not manage scheduler task for ideation sync', { error: String(schedErr) });
      }

      ctx.postMessage({
        type: 'ideationJiraConfigSaved',
        payload: { success: true, scheduledTask },
      });
    } catch (error) {
      logger.error('Error saving ideation Jira config', { error: String(error) });
      ctx.postMessage({
        type: 'ideationJiraConfigSaved',
        payload: { success: false },
      });
    }
}

/**
 * Handle manual "Sync Now" from Ideation Jira Integration panel.
 * Pulls ideas from Jira for the given project key.
 */
export async function handleSyncIdeationNow(ctx: HandlerContext, payload: { projectKey: string }): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        ctx.postMessage({ type: 'ideationSyncResult', payload: { success: false, error: 'No workspace folder' } });
        return;
      }

      const projectKey = payload.projectKey;
      if (!projectKey) {
        ctx.postMessage({ type: 'ideationSyncResult', payload: { success: false, error: 'No project key configured' } });
        return;
      }

      // Load current ideation config
      const fs = require('fs');
      const configPath = path.join(workspaceFolders[0].uri.fsPath, '.my', 'aicc', 'ideation.json');
      let config: Record<string, any> = {};
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }

      // Attempt Jira sync via command (delegates to Jira integration if available)
      let itemsSynced = 0;
      try {
        const result = await vscode.commands.executeCommand('aicc.jira.pullIdeation', {
          projectKey,
          issueType: config.issueType || 'Task',
          statusMapping: config.statusMapping || {},
        });
        if (result && typeof result === 'object' && 'itemsSynced' in (result as any)) {
          itemsSynced = (result as any).itemsSynced || 0;
        }
      } catch (cmdErr) {
        // Command may not be registered yet — log and return graceful message
        logger.warn('Jira ideation sync command not available', { error: String(cmdErr) });
        ctx.postMessage({
          type: 'ideationSyncResult',
          payload: { success: false, error: 'Jira integration not configured or command unavailable. Configure Jira connection in Planning tab first.' },
        });
        return;
      }

      // Update last sync timestamp
      config.lastSyncAt = new Date().toISOString();
      const configDir = path.dirname(configPath);
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

      logger.info(`Ideation Jira sync completed: ${itemsSynced} items synced`);

      ctx.postMessage({
        type: 'ideationSyncResult',
        payload: { success: true, itemsSynced },
      });
    } catch (error) {
      logger.error('Error during ideation Jira sync', { error: String(error) });
      ctx.postMessage({
        type: 'ideationSyncResult',
        payload: { success: false, error: String(error) },
      });
    }
}
