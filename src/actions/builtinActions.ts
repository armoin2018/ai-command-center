/**
 * Built-in Action Handlers
 * AICC-0216: Register built-in plan actions with the ActionRegistry
 *
 * Each action implements ActionHandler using the variable function map
 * pattern — the registry dispatches via Record<string, ActionHandler>
 * lookup, never switch/case.
 */

import { ActionHandler, ActionResult, ActionParameterDescriptor } from './types';
import { ActionRegistry } from './actionRegistry';
import { PlanGenerator } from '../services/planGenerator';
import { PlanArchivalService } from '../services/planArchivalService';
import { Logger } from '../logger';

const logger = Logger.getInstance();

// ── plan.create ──────────────────────────────────────────────────────────────

const planCreateAction: ActionHandler = {
  id: 'plan.create',
  description: 'Create a new plan item in PLAN.json',

  describe(): ActionParameterDescriptor[] {
    return [
      { name: 'id', type: 'string', required: true, description: 'Unique item identifier (e.g., AICC-0099)' },
      { name: 'type', type: 'string', required: true, description: 'Item type: epic | story | task | bug' },
      { name: 'title', type: 'string', required: true, description: 'Short title for the item' },
      { name: 'status', type: 'string', required: false, description: 'Initial status (default BACKLOG)', defaultValue: 'BACKLOG' },
      { name: 'parentId', type: 'string', required: false, description: 'Parent item ID' },
      { name: 'description', type: 'string', required: false, description: 'Detailed description' }
    ];
  },

  validate(params) {
    const errors: string[] = [];
    if (!params.id) errors.push('id is required');
    if (!params.type) errors.push('type is required');
    if (!params.title) errors.push('title is required');
    return { valid: errors.length === 0, errors };
  },

  async execute(params, _context): Promise<ActionResult> {
    const gen = PlanGenerator.getInstance();
    const item = await gen.createPlanItem({
      id: params.id,
      type: params.type,
      title: params.title,
      status: params.status || 'BACKLOG',
      parentId: params.parentId,
      description: params.description,
      projectNumber: params.id
    } as any);
    return { success: true, data: item, message: `Created ${item.id}` };
  }
};

// ── plan.update ──────────────────────────────────────────────────────────────

const planUpdateAction: ActionHandler = {
  id: 'plan.update',
  description: 'Update an existing plan item',

  describe(): ActionParameterDescriptor[] {
    return [
      { name: 'id', type: 'string', required: true, description: 'Item ID to update' },
      { name: 'updates', type: 'object', required: true, description: 'Fields to update (partial PlanItem)' }
    ];
  },

  validate(params) {
    const errors: string[] = [];
    if (!params.id) errors.push('id is required');
    if (!params.updates || typeof params.updates !== 'object') errors.push('updates object is required');
    return { valid: errors.length === 0, errors };
  },

  async execute(params, _context): Promise<ActionResult> {
    const gen = PlanGenerator.getInstance();
    const updated = await gen.updatePlanItem(params.id, params.updates);
    if (!updated) {
      return { success: false, error: `Item not found: ${params.id}` };
    }
    return { success: true, data: updated, message: `Updated ${params.id}` };
  }
};

// ── plan.updateStatus ────────────────────────────────────────────────────────

const planUpdateStatusAction: ActionHandler = {
  id: 'plan.updateStatus',
  description: 'Update the status of a plan item',

  describe(): ActionParameterDescriptor[] {
    return [
      { name: 'id', type: 'string', required: true, description: 'Item ID' },
      { name: 'status', type: 'string', required: true, description: 'New status value' }
    ];
  },

  validate(params) {
    const errors: string[] = [];
    if (!params.id) errors.push('id is required');
    if (!params.status) errors.push('status is required');
    return { valid: errors.length === 0, errors };
  },

  async execute(params, _context): Promise<ActionResult> {
    const gen = PlanGenerator.getInstance();
    const updated = await gen.updatePlanItem(params.id, { status: params.status });
    if (!updated) {
      return { success: false, error: `Item not found: ${params.id}` };
    }
    return { success: true, data: updated, message: `Status of ${params.id} → ${params.status}` };
  }
};

// ── plan.delete ──────────────────────────────────────────────────────────────

const planDeleteAction: ActionHandler = {
  id: 'plan.delete',
  description: 'Remove a plan item from PLAN.json',

  describe(): ActionParameterDescriptor[] {
    return [
      { name: 'id', type: 'string', required: true, description: 'Item ID to delete' }
    ];
  },

  validate(params) {
    const errors: string[] = [];
    if (!params.id) errors.push('id is required');
    return { valid: errors.length === 0, errors };
  },

  async execute(params, _context): Promise<ActionResult> {
    const gen = PlanGenerator.getInstance();
    const doc = gen.getPlanDocument();
    if (!doc) {
      return { success: false, error: 'Plan document not loaded' };
    }
    const idx = doc.items.findIndex(i => i.id === params.id);
    if (idx === -1) {
      return { success: false, error: `Item not found: ${params.id}` };
    }
    const removed = doc.items.splice(idx, 1)[0];
    // Persist
    await gen.updatePlanItem(removed.id, {}); // triggers save via updatePlanItem flow
    return { success: true, data: removed, message: `Deleted ${params.id}` };
  }
};

// ── plan.archive ─────────────────────────────────────────────────────────────

const planArchiveAction: ActionHandler = {
  id: 'plan.archive',
  description: 'Archive items to PLAN-ARCHIVE.json via PlanArchivalService',

  describe(): ActionParameterDescriptor[] {
    return [
      { name: 'ids', type: 'array', required: true, description: 'Array of item IDs to archive' },
      { name: 'reason', type: 'string', required: false, description: 'Archive reason', defaultValue: 'Manually archived' }
    ];
  },

  validate(params) {
    const errors: string[] = [];
    if (!params.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
      errors.push('ids array is required and must not be empty');
    }
    return { valid: errors.length === 0, errors };
  },

  async execute(params, context): Promise<ActionResult> {
    const gen = PlanGenerator.getInstance();
    const archival = PlanArchivalService.getInstance();
    archival.initialize(context.workspaceRoot);

    const doc = gen.getPlanDocument();
    if (!doc) {
      return { success: false, error: 'Plan document not loaded' };
    }

    const items = doc.items.filter(i => params.ids.includes(i.id));
    if (items.length === 0) {
      return { success: false, error: 'No matching items found' };
    }

    await archival.archiveManually(items, params.reason);
    return { success: true, message: `Archived ${items.length} item(s)`, data: { archivedIds: items.map(i => i.id) } };
  }
};

// ── plan.sync ────────────────────────────────────────────────────────────────

const planSyncAction: ActionHandler = {
  id: 'plan.sync',
  description: 'Trigger Jira synchronisation via JiraSyncService',

  describe(): ActionParameterDescriptor[] {
    return [
      { name: 'forceSync', type: 'boolean', required: false, description: 'Force sync even if recently synced', defaultValue: false }
    ];
  },

  validate(_params) {
    return { valid: true, errors: [] };
  },

  async execute(_params, context): Promise<ActionResult> {
    try {
      const { JiraSyncService } = await import('../integrations/jira/jiraSyncService');
      const syncService = JiraSyncService.getInstance();
      const config = syncService.getJiraConfig();

      if (!config || !config.baseUrl || !config.email) {
        return { success: false, error: 'Jira not configured. Set aicc.jira settings.' };
      }

      // Read API token from workspace settings
      const vscodeLib = await import('vscode');
      const jiraSettings = vscodeLib.workspace.getConfiguration('aicc.jira');
      const apiToken = jiraSettings.get<string>('apiToken', '');
      if (!apiToken) {
        return { success: false, error: 'Jira API token not configured.' };
      }
      config.apiToken = apiToken;

      const result = await syncService.performSync(config, context.workspaceRoot);

      return {
        success: result.success,
        data: result,
        message: `Sync complete: ${result.itemsCreated} created, ${result.itemsUpdated} updated, ${result.itemsArchived} archived`
      };
    } catch (err) {
      logger.error('plan.sync failed', { error: String(err) });
      return { success: false, error: `Sync failed: ${err}` };
    }
  }
};

// ── plan.reload ──────────────────────────────────────────────────────────────

const planReloadAction: ActionHandler = {
  id: 'plan.reload',
  description: 'Reload PLAN.json from disk',

  describe(): ActionParameterDescriptor[] {
    return [];
  },

  async execute(_params, context): Promise<ActionResult> {
    const gen = PlanGenerator.getInstance();
    await gen.initialize(context.workspaceRoot);
    const doc = gen.getPlanDocument();
    return {
      success: true,
      message: 'PLAN.json reloaded',
      data: { itemCount: doc?.items.length ?? 0 }
    };
  }
};

// ── Registration ─────────────────────────────────────────────────────────────

/** All built-in action handlers */
const builtinHandlers: ActionHandler[] = [
  planCreateAction,
  planUpdateAction,
  planUpdateStatusAction,
  planDeleteAction,
  planArchiveAction,
  planSyncAction,
  planReloadAction
];

/**
 * Register every built-in action with the shared ActionRegistry.
 * Call once during extension activation.
 */
export function initBuiltinActions(): void {
  const registry = ActionRegistry.getInstance();
  for (const handler of builtinHandlers) {
    registry.register(handler);
  }
  logger.info(`Registered ${builtinHandlers.length} built-in actions`);
}
