// src/mcp/integration/planningBridge.ts
import { PlanningManager } from '../../planning/planningManager';
import { ToolCallResult } from '../types';
import { logger } from '../../logger';
import { UserError, SystemError, ExternalError } from '../../errors/customErrors';
import * as vscode from 'vscode';

export interface BridgeEvent {
  type: 'epic.created' | 'epic.updated' | 'epic.deleted' |
        'story.created' | 'story.updated' | 'story.deleted' |
        'task.created' | 'task.updated' | 'task.deleted';
  itemId: string;
  data?: any;
}

export class PlanningManagerBridge {
  private eventEmitter = new vscode.EventEmitter<BridgeEvent>();
  
  readonly onEvent = this.eventEmitter.event;

  constructor(private planningManager: PlanningManager) {
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    logger.debug('Event forwarding setup complete', {
      component: 'PlanningManagerBridge'
    });
  }

  async executeToolCall(toolName: string, args: any): Promise<ToolCallResult> {
    logger.info('Executing tool via bridge', {
      component: 'PlanningManagerBridge',
      tool: toolName
    });

    try {
      let result: any;

      switch (toolName) {
        // Epic operations
        case 'create_epic':
          result = await this.planningManager.createEpic(args);
          this.fireEvent('epic.created', result.id, result);
          break;
        case 'update_epic':
          result = await this.planningManager.updateEpic(args.id, args);
          this.fireEvent('epic.updated', args.id, result);
          break;
        case 'delete_epic':
          await this.planningManager.deleteEpic(args.id);
          this.fireEvent('epic.deleted', args.id);
          result = { success: true, id: args.id };
          break;
        case 'list_epics':
          result = await this.planningManager.listEpics();
          break;

        default:
          throw new UserError(`Unknown tool: ${toolName}`);
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }],
        isError: false
      };

    } catch (error) {
      return this.translateError(error);
    }
  }

  private fireEvent(type: BridgeEvent['type'], itemId: string, data?: any): void {
    this.eventEmitter.fire({ type, itemId, data });
    logger.debug('Bridge event fired', {
      component: 'PlanningManagerBridge',
      event: type,
      itemId
    });
  }

  private translateError(error: unknown): ToolCallResult {
    logger.error('Error in tool execution', {
      component: 'PlanningManagerBridge',
      error: error instanceof Error ? error.message : String(error)
    });

    let errorMessage: string;
    let mcpErrorCode: number;

    if (error instanceof UserError) {
      errorMessage = error.message;
      mcpErrorCode = -32602;
    } else if (error instanceof SystemError) {
      errorMessage = 'Internal server error';
      mcpErrorCode = -32603;
    } else if (error instanceof ExternalError) {
      errorMessage = 'External system error';
      mcpErrorCode = -32603;
    } else {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      mcpErrorCode = -32603;
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: errorMessage,
          code: mcpErrorCode
        }, null, 2)
      }],
      isError: true
    };
  }

  getAllTools(): Array<{name: string; description: string; inputSchema: any}> {
    return [
      {
        name: 'create_epic',
        description: 'Create a new epic',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Epic name' },
            description: { type: 'string', description: 'Epic description' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
          },
          required: ['name', 'description']
        }
      },
      {
        name: 'list_epics',
        description: 'List all epics',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ];
  }

  dispose(): void {
    this.eventEmitter.dispose();
    logger.info('Planning Manager Bridge disposed', {
      component: 'PlanningManagerBridge'
    });
  }
}
