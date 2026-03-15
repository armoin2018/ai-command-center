/**
 * Shared types and context for Secondary Panel handler modules.
 * Provides a clean interface for handler functions to interact
 * with the panel's services and state without tight coupling.
 */

import * as vscode from 'vscode';
import { PlanGenerator } from '../../services/planGenerator';
import { MCPManager } from '../../mcp/mcpManager';

/**
 * Context object passed to all handler functions.
 * Provides access to webview messaging, services, and state management.
 */
export interface HandlerContext {
  /** Post a message to the webview panel */
  postMessage(message: { type: string; payload?: unknown }): void;

  /** Access the PlanGenerator service */
  planGenerator: PlanGenerator;

  /** Access the VS Code ExtensionContext (for secrets, workspace state, etc.) */
  extensionContext: vscode.ExtensionContext | undefined;

  /** Access the MCP Manager (for server status, inventory, etc.) */
  mcpManager: MCPManager | undefined;

  /** Trigger debounced planning data refresh */
  refreshPlanningData(): Promise<void>;

  /** Trigger full data refresh */
  refreshData(): Promise<void>;

  /** Set/clear the PLAN.json self-write guard (prevents re-entrant file watcher) */
  setSelfWriteGuard(flag: boolean): void;

  /** Set/clear the IDEAS.json self-write guard */
  setIdeaSelfWriteGuard(flag: boolean): void;
}
