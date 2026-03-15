/**
 * Jira Configuration Handlers for the Secondary Panel (AICC-0081)
 * Manages Jira connection settings, sync operations, and project lookup.
 * All configuration persisted to .my/aicc/jira-config.save.json
 * API token stored securely in VS Code SecretStorage.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { HandlerContext } from './types';
import { JiraSyncService, JiraSyncProgress } from '../../integrations/jira/jiraSyncService';
import { JiraClient } from '../../integrations/jira/jiraClient';
import { JiraConfig } from '../../integrations/jira/types';
import { SchedulerEngine, ScheduledTask } from '../../scheduler';
import { Logger } from '../../logger';

const logger = Logger.getInstance();
const CONFIG_FILE = '.my/aicc/jira-config.save.json';
const JIRA_SYNC_TASK_ID = 'jira-auto-sync';

/** Default Jira configuration shape */
function getDefaultConfig(): Record<string, any> {
    return {
        enabled: false,
        baseUrl: '',
        email: '',
        projectKey: '',
        syncStrategy: 'pull',
        conflictResolution: 'remote-wins',
        autoSync: false,
        syncInterval: 30,
        // Unified filters (no duplicates)
        issueTypeFilters: { epic: true, story: true, task: true, bug: true },
        statusFilter: [],
        assigneeFilter: '',
        sprintFilter: '',
        labelsFilter: [],
        dateRange: '',
        jql: ''
    };
}

/** Resolve the config file path from workspace root */
function getConfigPath(): string | null {
    const wf = vscode.workspace.workspaceFolders;
    if (!wf) return null;
    return path.join(wf[0].uri.fsPath, CONFIG_FILE);
}

/** Read config from .my/aicc/jira-config.save.json (or return defaults) */
function readConfigFile(): Record<string, any> {
    const configPath = getConfigPath();
    if (!configPath) return getDefaultConfig();

    try {
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            return { ...getDefaultConfig(), ...JSON.parse(content) };
        }
    } catch (err) {
        logger.warn('Failed to read Jira config file', { error: String(err) });
    }
    return getDefaultConfig();
}

/** Write config to .my/aicc/jira-config.save.json (atomic) */
function writeConfigFile(data: Record<string, any>): void {
    const configPath = getConfigPath();
    if (!configPath) return;

    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = configPath + '.tmp';
    const bakPath = configPath + '.bak';

    const doc: Record<string, any> = { ...data, lastUpdated: new Date().toISOString() };
    // Never persist apiToken to file — it lives in SecretStorage only
    delete doc.apiToken;

    try {
        if (fs.existsSync(configPath)) {
            fs.copyFileSync(configPath, bakPath);
        }
        fs.writeFileSync(tmpPath, JSON.stringify(doc, null, 2), 'utf-8');
        fs.renameSync(tmpPath, configPath);
    } catch (err) {
        logger.error('Failed to write Jira config file', { error: String(err) });
        throw err;
    }
}

/** Return saved Jira configuration to the webview */
export async function handleGetJiraConfig(ctx: HandlerContext): Promise<void> {
    try {
        const config = readConfigFile();

        // Retrieve API token from SecretStorage
        if (ctx.extensionContext) {
            const token = await ctx.extensionContext.secrets.get('aicc.jira.apiToken');
            if (token) {
                config.apiToken = token;
            }
        }

        ctx.postMessage({ type: 'jiraConfigLoaded', payload: config });
    } catch (error) {
        logger.error('Error loading Jira config', { error: String(error) });
    }
}

/**
 * Sync the ailey-scheduler with the Jira auto-sync setting.
 *
 * When `autoSync` is enabled in the saved config, creates or updates a
 * scheduled task (id: jira-auto-sync) that invokes the `aicc.syncJira`
 * command at the configured interval. When `autoSync` is disabled, the
 * existing task is removed from the scheduler.
 *
 * This bridges the ailey-scheduler skill with the ailey-atl-jira skill,
 * referencing the saved configuration at .my/aicc/jira-config.save.json.
 */
function syncJiraSchedulerTask(config: Record<string, any>): void {
    try {
        const engine = SchedulerEngine.getInstance();
        const existingTask = engine.getTask(JIRA_SYNC_TASK_ID);

        if (config.autoSync) {
            // Convert syncInterval (minutes) to milliseconds for the scheduler
            const intervalMinutes = Math.max(1, parseInt(String(config.syncInterval), 10) || 30);
            const intervalMs = intervalMinutes * 60 * 1000;

            if (existingTask) {
                // Update: remove old and re-add with new interval
                engine.removeTask(JIRA_SYNC_TASK_ID);
            }

            const task: ScheduledTask = {
                id: JIRA_SYNC_TASK_ID,
                name: 'Jira Auto-Sync',
                actionId: 'plan.sync',
                params: {
                    skill: 'ailey-atl-jira',
                    configFile: CONFIG_FILE,
                    projectKey: config.projectKey || '',
                    syncStrategy: config.syncStrategy || 'pull',
                    conflictResolution: config.conflictResolution || 'remote-wins'
                },
                scheduleType: 'interval',
                scheduleValue: String(intervalMs),
                enabled: true,
                lastRun: existingTask?.lastRun || null,
                lastResult: existingTask?.lastResult || null,
                lastError: existingTask?.lastError || null,
                nextRun: null,
                createdAt: existingTask?.createdAt || new Date().toISOString(),
                throttle: {
                    maxExecutionsPerHour: Math.min(60, Math.ceil(60 / intervalMinutes)),
                    minIntervalMs: intervalMs
                }
            };

            engine.addTask(task);
            logger.info('Jira auto-sync scheduled task created/updated', {
                component: 'JiraHandlers',
                taskId: JIRA_SYNC_TASK_ID,
                intervalMinutes
            });
        } else {
            // autoSync disabled — remove the scheduled task if it exists
            if (existingTask) {
                engine.removeTask(JIRA_SYNC_TASK_ID);
                logger.info('Jira auto-sync scheduled task removed', {
                    component: 'JiraHandlers',
                    taskId: JIRA_SYNC_TASK_ID
                });
            }
        }
    } catch (error) {
        // Non-fatal: log but don't block the config save
        logger.warn('Failed to sync Jira scheduler task', { error: String(error) });
    }
}

/** Save Jira configuration to .my/aicc/jira-config.save.json and SecretStorage */
export async function handleSaveJiraConfig(ctx: HandlerContext, payload: Record<string, any>): Promise<void> {
    try {
        const existing = readConfigFile();
        const merged: Record<string, any> = { ...existing, ...payload, enabled: true };

        writeConfigFile(merged);

        // Store API token securely in SecretStorage (not in file)
        if (payload.apiToken && ctx.extensionContext) {
            await ctx.extensionContext.secrets.store('aicc.jira.apiToken', payload.apiToken);
        }

        // Also update the registered VS Code settings that the sync engine reads
        const vscConfig = vscode.workspace.getConfiguration('aicc.jira');
        const registeredKeys = ['enabled', 'baseUrl', 'email', 'projectKey', 'syncStrategy',
            'conflictResolution', 'autoSync', 'syncInterval'];
        for (const key of registeredKeys) {
            if (merged[key] !== undefined) {
                try {
                    await vscConfig.update(key, merged[key], vscode.ConfigurationTarget.Workspace);
                } catch (_) { /* skip unregistered */ }
            }
        }

        // ── Scheduler integration (ailey-scheduler ↔ ailey-atl-jira) ──
        // When autoSync is enabled, create/update a scheduled task.
        // When disabled, remove the existing scheduled task.
        syncJiraSchedulerTask(merged);

        logger.info('Jira configuration saved to ' + CONFIG_FILE);
        ctx.postMessage({ type: 'jiraConfigSaved', payload: { success: true } });
        vscode.window.showInformationMessage('Jira configuration saved.');
    } catch (error) {
        logger.error('Error saving Jira config', { error: String(error) });
        ctx.postMessage({ type: 'jiraConfigSaved', payload: { success: false, error: String(error) } });
        vscode.window.showErrorMessage(`Failed to save Jira config: ${error}`);
    }
}

/** Test Jira connection and return result to webview (AICC-0234) */
export async function handleTestJiraConnection(ctx: HandlerContext): Promise<void> {
    try {
      const cfg = readConfigFile();
      const baseUrl = cfg.baseUrl || '';
      const email = cfg.email || '';

      let apiToken = '';
      if (ctx.extensionContext) {
        apiToken = (await ctx.extensionContext.secrets.get('aicc.jira.apiToken')) || '';
      }

      if (!baseUrl || !email || !apiToken) {
        ctx.postMessage({
          type: 'jiraConnectionResult',
          payload: { success: false, error: 'Missing configuration. Please fill in all connection fields.' }
        });
        return;
      }

      const jiraConfig: JiraConfig = {
        enabled: true,
        baseUrl,
        email,
        apiToken,
        projectKey: cfg.projectKey || '',
        syncStrategy: 'pull',
        conflictResolution: 'remote-wins',
        autoSync: false,
        syncInterval: 30,
        webhookEnabled: false
      };

      JiraClient.resetInstance();
      const client = JiraClient.getInstance(jiraConfig);
      const result = await client.testConnection();

      ctx.postMessage({
        type: 'jiraConnectionResult',
        payload: {
          success: result.success,
          user: result.message.replace('Connected as ', ''),
          error: result.success ? undefined : result.message
        }
      });
    } catch (error) {
      logger.error('Error testing Jira connection', { error: String(error) });
      ctx.postMessage({
        type: 'jiraConnectionResult',
        payload: { success: false, error: String(error) }
      });
    }
}

/** Trigger a manual Jira sync with progress reporting (AICC-0235) */
export async function handleTriggerJiraSync(ctx: HandlerContext): Promise<void> {
    try {
      const syncService = JiraSyncService.getInstance();
      const config = syncService.getJiraConfig();

      if (!config || !config.baseUrl || !config.email) {
        vscode.window.showWarningMessage('Jira not configured. Please fill in connection settings first.');
        return;
      }

      let apiToken = '';
      if (ctx.extensionContext) {
        apiToken = (await ctx.extensionContext.secrets.get('aicc.jira.apiToken')) || '';
      }
      if (!apiToken) {
        apiToken = vscode.workspace.getConfiguration('aicc.jira').get<string>('apiToken', '');
      }
      if (!apiToken) {
        vscode.window.showWarningMessage('Jira API token not configured.');
        return;
      }
      config.apiToken = apiToken;

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      if (!workspaceRoot) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
      }

      // Send progress updates to webview
      const onProgress = (progress: JiraSyncProgress) => {
        ctx.postMessage({ type: 'jiraSyncProgress', payload: progress });
      };

      const result = await syncService.performSync(config, workspaceRoot, onProgress);

      ctx.postMessage({ type: 'jiraSyncComplete', payload: result });

      // AICC-0240: Show notification for archived items
      if (result.itemsArchived > 0) {
        const action = await vscode.window.showInformationMessage(
          `${result.itemsArchived} item(s) removed from Jira were archived.`,
          'View Archive'
        );
        if (action === 'View Archive') {
          const archivePath = path.join(workspaceRoot, '.project', 'PLAN-ARCHIVE.json');
          const archiveUri = vscode.Uri.file(archivePath);
          try {
            await vscode.workspace.openTextDocument(archiveUri);
            await vscode.window.showTextDocument(archiveUri);
          } catch {
            vscode.window.showWarningMessage('Archive file not found.');
          }
        }
      }

      await ctx.refreshPlanningData();
      logger.info('Jira sync triggered manually', { result });
    } catch (error) {
      logger.error('Error triggering Jira sync', { error: String(error) });
      vscode.window.showErrorMessage(`Jira sync failed: ${error}`);
      ctx.postMessage({
        type: 'jiraSyncComplete',
        payload: { success: false, errors: [String(error)], itemsCreated: 0, itemsUpdated: 0, itemsUnchanged: 0, itemsArchived: 0, duration: 0 }
      });
    }
}

/** Lookup available Jira projects (AICC-0233) */
export async function handleJiraLookupProjects(ctx: HandlerContext): Promise<void> {
    try {
      const cfg = readConfigFile();
      const baseUrl = cfg.baseUrl || '';
      const email = cfg.email || '';

      let apiToken = '';
      if (ctx.extensionContext) {
        apiToken = (await ctx.extensionContext.secrets.get('aicc.jira.apiToken')) || '';
      }

      if (!baseUrl || !email || !apiToken) {
        vscode.window.showWarningMessage('Please save connection settings first.');
        return;
      }

      const jiraConfig: JiraConfig = {
        enabled: true,
        baseUrl,
        email,
        apiToken,
        projectKey: '',
        syncStrategy: 'pull',
        conflictResolution: 'remote-wins',
        autoSync: false,
        syncInterval: 30,
        webhookEnabled: false
      };

      JiraClient.resetInstance();
      const client = JiraClient.getInstance(jiraConfig);
      const projects = await client.getProjects();

      ctx.postMessage({
        type: 'jiraProjectsLoaded',
        payload: {
          projects: projects.map((p: any) => ({
            key: p.key,
            name: p.name,
            id: p.id
          }))
        }
      });
    } catch (error) {
      logger.error('Error looking up Jira projects', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to lookup Jira projects: ${error}`);
    }
}

/** Load Jira sync config from .my/aicc/jira-config.save.json (unified) */
export async function handleGetJiraSyncConfig(ctx: HandlerContext): Promise<void> {
    try {
      // Sync config is now part of the unified config file
      const config = readConfigFile();
      ctx.postMessage({ type: 'jiraSyncConfigLoaded', payload: config });
    } catch (error) {
      logger.error('Error loading Jira sync config', { error: String(error) });
    }
}

/** Save Jira sync config to .my/aicc/jira-config.save.json (unified) */
export async function handleSaveJiraSyncConfig(ctx: HandlerContext, payload: Record<string, any>): Promise<void> {
    try {
      const existing = readConfigFile();
      const merged = { ...existing, ...payload };
      writeConfigFile(merged);

      // Keep scheduler task in sync with autoSync setting
      syncJiraSchedulerTask(merged);

      logger.info('Jira sync config saved to ' + CONFIG_FILE);
      ctx.postMessage({ type: 'jiraSyncConfigSaved', payload: { success: true } });
    } catch (error) {
      logger.error('Error saving Jira sync config', { error: String(error) });
    }
}
