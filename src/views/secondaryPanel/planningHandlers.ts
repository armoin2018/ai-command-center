/**
 * @module planningHandlers
 * @description Planning-related message handlers extracted from SecondaryPanelProvider.
 * Each function receives a HandlerContext and a typed payload, wraps logic in try-catch,
 * and uses the shared Logger instance for diagnostics.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { HandlerContext } from './types';
import { Logger } from '../../logger';

import { PlanItem } from '../../types/plan';
const logger = Logger.getInstance();

/**
 * Updates the status of a plan item and notifies the webview.
 */
export async function handleStatusUpdate(ctx: HandlerContext, payload: { itemId: string; status: string }): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.updateItemStatus', payload.itemId, payload.status);
      await ctx.refreshData();
      ctx.postMessage({
        type: 'statusUpdated',
        payload: { itemId: payload.itemId, status: payload.status }
      });
    } catch (error) {
      logger.error('Error updating status', { error: String(error) });
    }
}

/**
 * Runs a specific plan item by its ID.
 */
export async function handleRunItem(_ctx: HandlerContext, payload: { itemId: string }): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.runItem', payload.itemId);
    } catch (error) {
      logger.error('Error running item', { error: String(error) });
    }
}

/**
 * Expands a detail panel for a given plan item and sends the item data to the webview.
 */
export async function handleExpandPanel(ctx: HandlerContext, payload: { itemId: string; panelType: string }): Promise<void> {
    try {
      const planDoc = ctx.planGenerator.getPlanDocument();
      const item = planDoc?.items.find((i: PlanItem) => i.id === payload.itemId);
    
      if (item) {
        ctx.postMessage({
          type: 'panelExpanded',
          payload: {
            itemId: payload.itemId,
            panelType: payload.panelType,
            itemData: item
          }
        });
      }
    } catch (error) {
      logger.error('Error expanding panel', { error: String(error), itemId: payload.itemId });
    }
}

/**
 * Saves updated data for a plan item.
 */
export async function handleSaveItem(ctx: HandlerContext, payload: { itemId: string; data: Record<string, unknown> }): Promise<void> {
    try {
      const updated = await ctx.planGenerator.updatePlanItem(
        payload.itemId,
        payload.data as Partial<PlanItem>
      );
      if (!updated) {
        logger.warn('Item not found for save', { itemId: payload.itemId });
        ctx.postMessage({
          type: 'itemSaved',
          payload: { itemId: payload.itemId, success: false, error: 'Item not found' }
        });
        return;
      }
      logger.info('Item saved', { itemId: payload.itemId });
      ctx.postMessage({
        type: 'itemSaved',
        payload: { itemId: payload.itemId, success: true }
      });
    } catch (error) {
      logger.error('Error saving item', { error: String(error), itemId: payload.itemId });
      ctx.postMessage({
        type: 'itemSaved',
        payload: { itemId: payload.itemId, success: false, error: String(error) }
      });
    }
}

/**
 * Adds a comment to a plan item.
 */
export async function handleAddComment(ctx: HandlerContext, payload: { itemId: string; comment: string }): Promise<void> {
    try {
      const planDoc = ctx.planGenerator.getPlanDocument();
      const item = planDoc?.items.find((i: PlanItem) => i.id === payload.itemId);
      if (!item) {
        logger.warn('Item not found for comment', { itemId: payload.itemId });
        ctx.postMessage({
          type: 'commentAdded',
          payload: { itemId: payload.itemId, success: false, error: 'Item not found' }
        });
        return;
      }

      // Ensure comments array exists
      if (!item.comments) {
        item.comments = [];
      }

      item.comments.push({
        createdBy: 'local-user',
        comment: payload.comment,
        createdOn: new Date().toISOString()
      });

      // Update metadata
      if (item.metadata) {
        item.metadata.updatedAt = new Date().toISOString();
      }

      // Persist
      await ctx.planGenerator.savePlanDocument();

      logger.info('Comment added', { itemId: payload.itemId });
      ctx.postMessage({
        type: 'commentAdded',
        payload: { itemId: payload.itemId, success: true }
      });
    } catch (error) {
      logger.error('Error adding comment', { error: String(error), itemId: payload.itemId });
      ctx.postMessage({
        type: 'commentAdded',
        payload: { itemId: payload.itemId, success: false, error: String(error) }
      });
    }
}

/**
 * Saves all pending changes across the plan.
 */
export async function handleSaveAllChanges(_ctx: HandlerContext): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.saveAllChanges');
      _ctx.postMessage({
        type: 'allChangesSaved',
        payload: { success: true }
      });
    } catch (error) {
      logger.error('Error saving all changes', { error: String(error) });
    }
}

/**
 * Runs the next available plan item.
 */
export async function handleRunNext(_ctx: HandlerContext): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.runNextItem');
    } catch (error) {
      logger.error('Error running next item', { error: String(error) });
    }
}

/**
 * Copies the provided text to the system clipboard.
 */
export async function handleCopyToClipboard(_ctx: HandlerContext, payload: { text: string }): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(payload.text);
      vscode.window.showInformationMessage('Copied to clipboard');
    } catch (error) {
      logger.error('Error copying to clipboard', { error: String(error) });
      vscode.window.showErrorMessage('Failed to copy to clipboard');
    }
}

/**
 * Downloads a file from a URL and saves it to a user-selected location.
 */
export async function handleDownloadFile(_ctx: HandlerContext, payload: { url: string; filename: string }): Promise<void> {
    try {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(payload.filename),
        filters: { 'JSON': ['json'] }
      });

      if (uri) {
        const response = await fetch(payload.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.text();
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        vscode.window.showInformationMessage(`File saved to ${uri.fsPath}`);
      }
    } catch (error) {
      logger.error('Error downloading file', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to download file: ${error}`);
    }
}

/**
 * Adds a metadata key-value pair to a plan item.
 */
export async function handleAddMetadata(ctx: HandlerContext, payload: { itemId: string; key: string; value: string }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item) {
        if (!item.metadata) {
          const now = new Date().toISOString();
          item.metadata = {
            createdAt: now,
            updatedAt: now,
            createdBy: 'system',
            updatedBy: 'system'
          };
        }
        (item.metadata as Record<string, any>)[payload.key] = payload.value;
        ctx.setSelfWriteGuard(true);
        try {
          await ctx.planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        await ctx.refreshPlanningData();
        logger.info('Metadata added', { itemId: payload.itemId, key: payload.key });
      }
    } catch (error) {
      logger.error('Error adding metadata', { error: String(error) });
    }
}

/**
 * Deletes a metadata key from a plan item.
 */
export async function handleDeleteMetadata(ctx: HandlerContext, payload: { itemId: string; key: string }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item && item.metadata) {
        delete (item.metadata as Record<string, any>)[payload.key];
        ctx.setSelfWriteGuard(true);
        try {
          await ctx.planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        await ctx.refreshPlanningData();
        logger.info('Metadata deleted', { itemId: payload.itemId, key: payload.key });
      }
    } catch (error) {
      logger.error('Error deleting metadata', { error: String(error) });
    }
}

/**
 * Adds a linked relationship between two plan items.
 */
export async function handleAddRelationship(ctx: HandlerContext, payload: { itemId: string; type: string; targetId: string }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item) {
        if (!item.linkedRelationships) {
          item.linkedRelationships = [];
        }
        item.linkedRelationships.push({
          type: payload.type as any,
          itemId: payload.targetId
        });
        ctx.setSelfWriteGuard(true);
        try {
          await ctx.planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        await ctx.refreshPlanningData();
        logger.info('Relationship added', { itemId: payload.itemId, type: payload.type, targetId: payload.targetId });
      }
    } catch (error) {
      logger.error('Error adding relationship', { error: String(error) });
    }
}

/**
 * Deletes a linked relationship from a plan item by index.
 */
export async function handleDeleteRelationship(ctx: HandlerContext, payload: { itemId: string; index: number }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item && item.linkedRelationships && item.linkedRelationships.length > payload.index) {
        item.linkedRelationships.splice(payload.index, 1);
        ctx.setSelfWriteGuard(true);
        try {
          await ctx.planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        await ctx.refreshPlanningData();
        logger.info('Relationship deleted', { itemId: payload.itemId, index: payload.index });
      }
    } catch (error) {
      logger.error('Error deleting relationship', { error: String(error) });
    }
}

/**
 * Deletes a comment from a plan item by index.
 */
export async function handleDeleteComment(ctx: HandlerContext, payload: { itemId: string; index: number }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item && item.comments && item.comments.length > payload.index) {
        item.comments.splice(payload.index, 1);
        ctx.setSelfWriteGuard(true);
        try {
          await ctx.planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        await ctx.refreshPlanningData();
        logger.info('Comment deleted', { itemId: payload.itemId, index: payload.index });
      }
    } catch (error) {
      logger.error('Error deleting comment', { error: String(error) });
    }
}

/**
 * Toggles the enabled state of a comment on a plan item.
 */
export async function handleToggleCommentEnabled(ctx: HandlerContext, payload: { itemId: string; index: number }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item && item.comments && item.comments.length > payload.index) {
        const comment = item.comments[payload.index];
        comment.enabled = !(comment.enabled ?? true);
        comment.updatedOn = new Date().toISOString();
        
        ctx.setSelfWriteGuard(true);
        try {
          await ctx.planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        await ctx.refreshPlanningData();
        logger.info('Comment enabled toggled', { 
          itemId: payload.itemId, 
          index: payload.index, 
          enabled: comment.enabled 
        });
      }
    } catch (error) {
      logger.error('Error toggling comment enabled', { error: String(error) });
    }
}

/**
 * Adds an item to one of the plan item's list fields (instructions, personas, or contexts).
 */
export async function handleAddListItem(ctx: HandlerContext, payload: { itemId: string; listType: string; value: string }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item) {
        const validListTypes = ['instructions', 'personas', 'contexts'] as const;
        type ListType = typeof validListTypes[number];
        
        if (!validListTypes.includes(payload.listType as ListType)) {
          logger.warn('Invalid list type', { listType: payload.listType });
          return;
        }
        
        const listType = payload.listType as ListType;
        
        if (!(item as any)[listType]) {
          (item as any)[listType] = [];
        }
        
        if (!(item as any)[listType]!.includes(payload.value)) {
          (item as any)[listType]!.push(payload.value);
          
          ctx.setSelfWriteGuard(true);
          try {
            await ctx.planGenerator.savePlanDocument();
          } finally {
            ctx.setSelfWriteGuard(false);
          }
          await ctx.refreshPlanningData();
          logger.info('List item added', { 
            itemId: payload.itemId, 
            listType: payload.listType, 
            value: payload.value 
          });
        }
      }
    } catch (error) {
      logger.error('Error adding list item', { error: String(error) });
    }
}

/**
 * Removes an item from one of the plan item's list fields by index.
 */
export async function handleRemoveListItem(ctx: HandlerContext, payload: { itemId: string; listType: string; index: number }): Promise<void> {
    try {
      const planDocument = ctx.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find((i: PlanItem) => i.id === payload.itemId);
      
      if (item) {
        const validListTypes = ['instructions', 'personas', 'contexts'] as const;
        type ListType = typeof validListTypes[number];
        
        if (!validListTypes.includes(payload.listType as ListType)) {
          logger.warn('Invalid list type', { listType: payload.listType });
          return;
        }
        
        const listType = payload.listType as ListType;
        const list = (item as any)[listType];
        
        if (list && Array.isArray(list) && list.length > payload.index) {
          const removed = list.splice(payload.index, 1);
          
          ctx.setSelfWriteGuard(true);
          try {
            await ctx.planGenerator.savePlanDocument();
          } finally {
            ctx.setSelfWriteGuard(false);
          }
          await ctx.refreshPlanningData();
          logger.info('List item removed', { 
            itemId: payload.itemId, 
            listType: payload.listType, 
            index: payload.index,
            value: removed[0]
          });
        }
      }
    } catch (error) {
      logger.error('Error removing list item', { error: String(error) });
    }
}

/**
 * Opens the progress report HTML file in the editor.
 */
export async function handleShowProgressReport(_ctx: HandlerContext): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        vscode.window.showWarningMessage('No workspace folder open');
        return;
      }
      
      const progressPath = path.join(workspaceFolders[0].uri.fsPath, '.project', 'PROGRESS.html');
      const progressUri = vscode.Uri.file(progressPath);
      
      try {
        await vscode.workspace.fs.stat(progressUri);
        await vscode.commands.executeCommand('vscode.open', progressUri);
      } catch {
        vscode.window.showInformationMessage('Progress report not found. Generate it first using the AI Agent.');
      }
    } catch (error) {
      logger.error('Error showing progress report', { error: String(error) });
    }
}

/**
 * Opens a Jira issue in the external browser using the configured base URL.
 */
export async function handleOpenJiraIssue(ctx: HandlerContext, payload: { itemId: string }): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('aicc');
      const jiraBaseUrl = config.get<string>('jira.baseUrl', '');

      if (!jiraBaseUrl) {
        vscode.window.showWarningMessage('Jira base URL not configured. Set aicc.jira.baseUrl in settings.');
        return;
      }

      const planDoc = ctx.planGenerator.getPlanDocument();
      const item = planDoc?.items?.find((i: PlanItem) => i.id === payload.itemId);
      const jiraKey = item?.projectNumber || payload.itemId;

      const url = `${jiraBaseUrl.replace(/\/$/, '')}/browse/${jiraKey}`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (error) {
      logger.error('Failed to open Jira issue', { error: String(error) });
    }
}
