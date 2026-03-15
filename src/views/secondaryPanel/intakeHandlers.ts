/**
 * Intake Handlers for the Secondary Panel
 * Manages intake form loading and submission.
 */

import * as vscode from 'vscode';
import { HandlerContext } from './types';
import { IntakeLoaderService } from '../../services/intakeLoader';
import { PlanGenerator } from '../../services/planGenerator';
import { Logger } from '../../logger';

const logger = Logger.getInstance();

/** Handle load intake form */
export async function handleLoadIntakeForm(ctx: HandlerContext, payload: { intakeId: string }): Promise<void> {
    try {
      const intakeLoader = IntakeLoaderService.getInstance();
      const intake = await intakeLoader.loadIntakeConfig(payload.intakeId);
      
      if (!intake) {
        vscode.window.showErrorMessage(`Intake form '${payload.intakeId}' not found`);
        return;
      }
      
      ctx.postMessage({ type: 'intakeFormLoaded', payload: intake });
    } catch (error) {
      logger.error('Error loading intake form', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to load intake form: ${error}`);
    }
}

/** Handle submit intake */
export async function handleSubmitIntake(ctx: HandlerContext, payload: { intakeId: string; data: Record<string, any> }): Promise<void> {
    try {
      const intakeLoader = IntakeLoaderService.getInstance();
      const intake = await intakeLoader.loadIntakeConfig(payload.intakeId);
      
      if (!intake) {
        vscode.window.showErrorMessage(`Intake form '${payload.intakeId}' not found`);
        return;
      }
      
      const planGenerator = PlanGenerator.getInstance();
      const itemType = intake.metadata?.type || 'task';
      
      const newItem = {
        id: `ITEM-${Date.now()}`,
        type: itemType,
        title: payload.data.title || payload.data.name || 'New Item',
        description: payload.data.description || '',
        status: 'BACKLOG',
        metadata: {
          source: 'intake',
          intakeId: payload.intakeId,
          intakeData: payload.data,
          createdAt: new Date().toISOString()
        }
      };
      
      const planDoc = planGenerator.getPlanDocument();
      if (planDoc) {
        planDoc.items = planDoc.items || [];
        planDoc.items.push(newItem as any);
        ctx.setSelfWriteGuard(true);
        try {
          await planGenerator.savePlanDocument();
        } finally {
          ctx.setSelfWriteGuard(false);
        }
        
        vscode.window.showInformationMessage(`Intake submitted successfully: ${newItem.title}`);
        await ctx.refreshData();
      } else {
        vscode.window.showErrorMessage('No plan document available');
      }
    } catch (error) {
      logger.error('Error submitting intake', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to submit intake: ${error}`);
    }
}
