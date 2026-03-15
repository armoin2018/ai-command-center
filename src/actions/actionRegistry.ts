/**
 * Action Registry
 * AICC-0215: Variable function map registry — no switch/case dispatch
 * AICC-0217: Message invocation API (invokeFromMessage)
 */

import { ActionHandler, ActionResult, ActionContext } from './types';
import { Logger } from '../logger';

const logger = Logger.getInstance();

export class ActionRegistry {
  private static instance: ActionRegistry;
  private handlers: Record<string, ActionHandler> = {};
  private context: ActionContext | null = null;

  private constructor() {}

  static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  /** Set the execution context */
  setContext(context: ActionContext): void {
    this.context = context;
    logger.info('ActionRegistry context set', {
      workspaceRoot: context.workspaceRoot,
      planPath: context.planPath
    });
  }

  /** Register an action handler */
  register(handler: ActionHandler): void {
    if (this.handlers[handler.id]) {
      logger.warn(`Overwriting action handler: ${handler.id}`);
    }
    this.handlers[handler.id] = handler;
    logger.info(`Action registered: ${handler.id}`);
  }

  /** Unregister an action handler */
  unregister(id: string): void {
    if (this.handlers[id]) {
      delete this.handlers[id];
      logger.info(`Action unregistered: ${id}`);
    }
  }

  /** Execute an action by name */
  async execute(actionId: string, params: Record<string, any> = {}): Promise<ActionResult> {
    const handler = this.handlers[actionId];
    if (!handler) {
      return { success: false, error: `Unknown action: ${actionId}` };
    }

    // Validate if handler has validate()
    if (handler.validate) {
      const validation = handler.validate(params);
      if (!validation.valid) {
        return { success: false, error: `Validation failed: ${validation.errors.join(', ')}` };
      }
    }

    // Execute with context
    if (!this.context) {
      return { success: false, error: 'ActionRegistry context not set. Call setContext() first.' };
    }

    try {
      const result = await handler.execute(params, this.context);
      logger.info(`Action executed: ${actionId}`, { success: result.success });
      return result;
    } catch (error: any) {
      logger.error(`Action failed: ${actionId}`, { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /** Invoke action via AiccMsg-style message */
  async invokeFromMessage(message: { type: string; action?: string; payload?: any }): Promise<ActionResult> {
    if (message.type !== 'executeActionV2' || !message.action) {
      return { success: false, error: 'Invalid action message format' };
    }
    return this.execute(message.action, message.payload || {});
  }

  /** List all registered actions */
  listActions(): { id: string; description: string }[] {
    return Object.values(this.handlers).map(h => ({
      id: h.id,
      description: h.description
    }));
  }

  /** Get a specific handler */
  getHandler(id: string): ActionHandler | undefined {
    return this.handlers[id];
  }
}
