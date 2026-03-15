/**
 * Secondary Panel WebView Provider
 * Provides the webview for the secondary panel (bottom panel area).
 * Delegates message handling to domain-specific handler modules.
 *
 * Handler modules:
 *  - planningHandlers  - Planning CRUD (status, metadata, relationships, comments)
 *  - ideationHandlers  - Idea management, voting, AI discovery
 *  - schedulerHandlers - Scheduled task CRUD
 *  - jiraHandlers      - Jira config, sync, project lookup
 *  - mcpHandlers       - MCP status, inventory, port scanning
 *  - aikitHandlers     - AI Kit catalog, settings, components
 *  - intakeHandlers    - Intake form loading and submission
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { PanelLoaderService } from '../services/panelLoader';
import { TabLoaderService } from '../services/tabLoader';
import { IntakeLoaderService } from '../services/intakeLoader';
import { PlanGenerator } from '../services/planGenerator';
import { PanelRenderer } from '../services/panelRenderer';
import { ActionRegistry } from '../actions';
import { SchedulerEngine } from '../scheduler';
import { MCPManager } from '../mcp/mcpManager';
import { Logger } from '../logger';
import { getPlatformInfoForWebview } from '../utils/platformInfo';
import { HandlerContext } from './secondaryPanel/types';

// Handler modules
import * as planningHandlers from './secondaryPanel/planningHandlers';
import * as ideationHandlers from './secondaryPanel/ideationHandlers';
import * as schedulerHandlers from './secondaryPanel/schedulerHandlers';
import * as jiraHandlers from './secondaryPanel/jiraHandlers';
import * as mcpHandlers from './secondaryPanel/mcpHandlers';
import * as aikitHandlers from './secondaryPanel/aikitHandlers';
import * as intakeHandlers from './secondaryPanel/intakeHandlers';

const logger = Logger.getInstance();

export class SecondaryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'aicc.secondaryPanel';

  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _currentPanelId: string = 'planning';
  private _currentAgentMode: 'all' | 'agent' = 'all';
  private _isSelfWrite = false;
  private _previousPlanSnapshot: Map<string, string> = new Map();
  private _refreshDebounceTimer?: NodeJS.Timeout;
  private panelLoader: PanelLoaderService;
  private tabLoader: TabLoaderService;
  private intakeLoader: IntakeLoaderService;
  private planGenerator: PlanGenerator;
  private panelRenderer: PanelRenderer;
  private planFileWatcher?: vscode.FileSystemWatcher;
  private ideasFileWatcher?: vscode.FileSystemWatcher;
  private _isIdeaSelfWrite = false;
  private _context?: vscode.ExtensionContext;
  private _mcpManager?: MCPManager;

  // Rate limiting for webview messages
  private _messageTimestamps: number[] = [];
  private readonly _rateLimitMax = 60;       // max messages per window
  private readonly _rateLimitWindowMs = 5000; // 5-second sliding window

  constructor(extensionUri: vscode.Uri, context?: vscode.ExtensionContext) {
    this._extensionUri = extensionUri;
    this._context = context;
    this.panelLoader = PanelLoaderService.getInstance();
    this.tabLoader = TabLoaderService.getInstance();
    this.intakeLoader = IntakeLoaderService.getInstance();
    this.planGenerator = PlanGenerator.getInstance();
    this.panelRenderer = PanelRenderer.getInstance(extensionUri.fsPath);

    // Set up file watchers for PLAN.json and IDEAS.json
    this.setupPlanFileWatcher();
    this.setupIdeasFileWatcher();
  }

  // ==================================================================
  //  Handler Context
  // ==================================================================

  /** Build a HandlerContext for handler modules */
  private _getHandlerContext(): HandlerContext {
    return {
      postMessage: (msg) => {
        if (this._view) {
          this._view.webview.postMessage(msg);
        }
      },
      planGenerator: this.planGenerator,
      extensionContext: this._context,
      mcpManager: this._mcpManager,
      refreshPlanningData: () => this._refreshPlanningData(),
      refreshData: () => this._refreshData(),
      setSelfWriteGuard: (flag) => { this._isSelfWrite = flag; },
      setIdeaSelfWriteGuard: (flag) => { this._isIdeaSelfWrite = flag; },
    };
  }

  // ==================================================================
  //  WebView Lifecycle
  // ==================================================================

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void | Thenable<void> {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'media'),
        vscode.Uri.joinPath(this._extensionUri, 'media', 'webview')
      ]
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      try {
        await this._handleMessage(message);
      } catch (error) {
        logger.error('Unhandled error in webview message handler', {
          messageType: message?.type,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    });

    // Listen for configuration changes
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('aicc.ui.showComponentReferences')) {
        const config = vscode.workspace.getConfiguration('aicc');
        const showComponentReferences = config.get<boolean>('ui.showComponentReferences', false);
        if (this._view) {
          this._view.webview.postMessage({
            type: 'settingsUpdate',
            payload: { showComponentReferences }
          });
        }
      }

      // Watch for MCP configuration changes
      if (e.affectsConfiguration('aicc.mcp')) {
        const mcpConfig = vscode.workspace.getConfiguration('aicc.mcp');
        const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name ?? 'No Workspace';
        const mcpData = {
          enabled: mcpConfig.get<boolean>('enabled', true),
          transport: mcpConfig.get<string>('transport', 'stdio'),
          host: mcpConfig.get<string>('host', 'localhost'),
          port: mcpConfig.get<number>('port', 3000),
          workspaceName
        };
        if (this._view) {
          this._view.webview.postMessage({
            type: 'mcpConfigUpdated',
            payload: mcpData
          });
        }
      }
    });

    // Initialize PanelRenderer
    this.panelRenderer.initialize().catch(err => {
      logger.error('Failed to initialize PanelRenderer', { error: String(err) });
    });

    // Send initial data
    this._sendInitialData();

    // Send initial workspace info for footer
    this._sendWorkspaceInfo();

    logger.info('Secondary Panel WebView initialized');
  }

  // ==================================================================
  //  Message Router
  // ==================================================================

  /**
   * Route messages from the webview to the appropriate handler module.
   */
  private async _handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    // Rate limiting — drop messages that exceed the threshold
    const now = Date.now();
    this._messageTimestamps = this._messageTimestamps.filter(t => now - t < this._rateLimitWindowMs);
    if (this._messageTimestamps.length >= this._rateLimitMax) {
      logger.warn('Webview message rate limit exceeded, dropping message', { type: message.type });
      return;
    }
    this._messageTimestamps.push(now);

    const ctx = this._getHandlerContext();

    switch (message.type) {
      // -- Core -------------------------------------------------------
      case 'ready':
        await this._sendInitialData();
        this._sendWorkspaceInfo();
        break;

      case 'switchPanel':
        await this._switchPanel(message.payload as string);
        break;

      case 'refresh':
        await this._refreshData();
        break;

      case 'executeAction':
        await this._executeAction(message.payload as { command: string; args?: unknown[] });
        break;

      case 'updateItem':
        await this._updateItem(message.payload as { id: string; data: Record<string, unknown> });
        break;

      case 'openDocs':
        await this._handleOpenDocs(message.payload as { docPath?: string } | undefined);
        break;

      case 'executeActionV2':
        await this._handleExecuteActionV2(message as { type: string; action?: string; payload?: any });
        break;

      case 'changeAgent':
        await this._handleChangeAgent(message.payload as { agentId: string });
        break;

      // -- Developer Mode (AICC-0502 / AICC-0505) ---------------------
      case 'setDevMode':
        if (this._context) {
          const devPayload = message.payload as { enabled: boolean };
          await this._context.workspaceState.update('aicc.devModeEnabled', devPayload.enabled);
          logger.info(`Developer mode ${devPayload.enabled ? 'enabled' : 'disabled'}`);
        }
        break;

      // -- Planning ---------------------------------------------------
      case 'updateStatus':
        await planningHandlers.handleStatusUpdate(ctx, message.payload as any);
        break;
      case 'runItem':
        await planningHandlers.handleRunItem(ctx, message.payload as any);
        break;
      case 'expandPanel':
        await planningHandlers.handleExpandPanel(ctx, message.payload as any);
        break;
      case 'saveItem':
        await planningHandlers.handleSaveItem(ctx, message.payload as any);
        break;
      case 'addComment':
        await planningHandlers.handleAddComment(ctx, message.payload as any);
        break;
      case 'saveAllChanges':
        await planningHandlers.handleSaveAllChanges(ctx);
        break;
      case 'runNext':
        await planningHandlers.handleRunNext(ctx);
        break;
      case 'copyToClipboard':
        await planningHandlers.handleCopyToClipboard(ctx, message.payload as any);
        break;
      case 'downloadFile':
        await planningHandlers.handleDownloadFile(ctx, message.payload as any);
        break;
      case 'addMetadata':
        await planningHandlers.handleAddMetadata(ctx, message.payload as any);
        break;
      case 'deleteMetadata':
        await planningHandlers.handleDeleteMetadata(ctx, message.payload as any);
        break;
      case 'addRelationship':
        await planningHandlers.handleAddRelationship(ctx, message.payload as any);
        break;
      case 'deleteRelationship':
        await planningHandlers.handleDeleteRelationship(ctx, message.payload as any);
        break;
      case 'deleteComment':
        await planningHandlers.handleDeleteComment(ctx, message.payload as any);
        break;
      case 'toggleCommentEnabled':
        await planningHandlers.handleToggleCommentEnabled(ctx, message.payload as any);
        break;
      case 'addListItem':
        await planningHandlers.handleAddListItem(ctx, message.payload as any);
        break;
      case 'removeListItem':
        await planningHandlers.handleRemoveListItem(ctx, message.payload as any);
        break;
      case 'showProgressReport':
        await planningHandlers.handleShowProgressReport(ctx);
        break;
      case 'openJiraIssue':
        await planningHandlers.handleOpenJiraIssue(ctx, message.payload as any);
        break;

      // -- AI Kit -----------------------------------------------------
      case 'installKit':
        await aikitHandlers.handleInstallKit(ctx, message.payload as any);
        break;
      case 'uninstallKit':
        await aikitHandlers.handleUninstallKit(ctx, message.payload as any);
        break;
      case 'loadAIKits':
        await aikitHandlers.handleLoadAIKits(ctx);
        break;
      case 'fetchData':
        logger.info('fetchData message received', { payload: message.payload });
        await aikitHandlers.handleFetchData(ctx, message.payload as any);
        break;
      case 'saveKitSettings':
        logger.info('saveKitSettings message received', { payload: message.payload });
        await aikitHandlers.handleSaveKitSettings(ctx, message.payload as any);
        break;

      // -- Intake -----------------------------------------------------
      case 'loadIntakeForm':
        await intakeHandlers.handleLoadIntakeForm(ctx, message.payload as any);
        break;
      case 'submitIntake':
        await intakeHandlers.handleSubmitIntake(ctx, message.payload as any);
        break;

      // -- Scheduler (AICC-0079 / AICC-0080) --------------------------
      case 'getSchedulerTasks':
        await schedulerHandlers.handleGetSchedulerTasks(ctx);
        break;
      case 'addSchedulerTask':
        await schedulerHandlers.handleAddSchedulerTask(ctx, message.payload as any);
        break;
      case 'removeSchedulerTask':
        await schedulerHandlers.handleRemoveSchedulerTask(ctx, message.payload as any);
        break;
      case 'toggleSchedulerTask':
        await schedulerHandlers.handleToggleSchedulerTask(ctx, message.payload as any);
        break;
      case 'executeSchedulerTask':
        await schedulerHandlers.handleExecuteSchedulerTask(ctx, message.payload as any);
        break;

      // -- Jira Configuration (AICC-0081) -----------------------------
      case 'getJiraConfig':
        await jiraHandlers.handleGetJiraConfig(ctx);
        break;
      case 'saveJiraConfig':
        await jiraHandlers.handleSaveJiraConfig(ctx, message.payload as any);
        break;
      case 'testJiraConnection':
        await jiraHandlers.handleTestJiraConnection(ctx);
        break;
      case 'triggerJiraSync':
        await jiraHandlers.handleTriggerJiraSync(ctx);
        break;
      case 'jiraLookupProjects':
        await jiraHandlers.handleJiraLookupProjects(ctx);
        break;
      case 'getJiraSyncConfig':
        await jiraHandlers.handleGetJiraSyncConfig(ctx);
        break;
      case 'saveJiraSyncConfig':
        await jiraHandlers.handleSaveJiraSyncConfig(ctx, message.payload as any);
        break;

      // -- MCP Servers (AICC-0085 / REQ-MPD-001) ----------------------
      case 'getMcpStatus':
        await mcpHandlers.handleGetMcpStatus(ctx);
        break;
      case 'getMcpInventory':
        await mcpHandlers.handleGetMcpInventory(ctx);
        break;
      case 'mcpServerAction':
        await mcpHandlers.handleMcpServerAction(ctx, message as any);
        break;
      case 'getMcpPortScan':
        await mcpHandlers.handleGetMcpPortScan(ctx);
        break;

      // -- Ideation (REQ-IDEA-080+) -----------------------------------
      case 'getIdeationData':
        await ideationHandlers.handleGetIdeationData(ctx);
        break;
      case 'ideationVote':
        await ideationHandlers.handleIdeationVote(ctx, message.payload as any);
        break;
      case 'ideationAction':
        await ideationHandlers.handleIdeationAction(ctx, message.payload as any);
        break;
      case 'ideationDiscover':
        await ideationHandlers.handleIdeationDiscover(ctx);
        break;
      case 'getIdeationJiraConfig':
        await ideationHandlers.handleGetIdeationJiraConfig(ctx);
        break;
      case 'saveIdeationJiraConfig':
        await ideationHandlers.handleSaveIdeationJiraConfig(ctx, message.payload as any);
        break;
      case 'syncIdeationNow':
        await ideationHandlers.handleSyncIdeationNow(ctx, message.payload as any);
        break;

      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  // ==================================================================
  //  Core Panel Operations (kept inline - small, tightly coupled)
  // ==================================================================

  /** Handle agent change */
  private async _handleChangeAgent(payload: { agentId: string }): Promise<void> {
    logger.info('Agent changed', { agentId: payload.agentId });

    const isAllMode = payload.agentId === 'all' || !payload.agentId;
    this._currentAgentMode = isAllMode ? 'all' : 'agent';

    const tabs = this.tabLoader.getTabsForAgent(this._currentAgentMode);
    const intakes = this.intakeLoader.getIntakesForAgent(this._currentAgentMode);

    if (this._view) {
      this._view.webview.postMessage({
        type: 'agentChanged',
        payload: {
          agentId: payload.agentId,
          agentMode: this._currentAgentMode,
          tabs,
          intakes
        }
      });
    }
  }

  /**
   * Send workspace name, MCP port, and connection status to the webview footer.
   */
  private _sendWorkspaceInfo(): void {
    if (!this._view) { return; }

    const wsName = vscode.workspace.workspaceFolders?.[0]?.name ?? 'No Workspace';
    const mcpCfg = vscode.workspace.getConfiguration('aicc.mcp');
    const port = mcpCfg.get<number>('port', 3000);
    const enabled = mcpCfg.get<boolean>('enabled', true);
    const isRunning = this._mcpManager?.getServerStatus()?.isRunning ?? false;

    this._view.webview.postMessage({
      type: 'workspaceInfo',
      payload: { workspaceName: wsName, port, connected: enabled && isRunning },
    });
  }

  /** Send initial data to the webview */
  private async _sendInitialData(): Promise<void> {
    if (!this._view) { return; }

    const panels = this.panelLoader.getAllPanels();
    const panelMetadata = panels.map(p => p.panel);
    const tabs = this.tabLoader.getTabsForAgent(this._currentAgentMode);
    const intakes = this.intakeLoader.getIntakesForAgent(this._currentAgentMode);
    const currentPanel = this.panelLoader.getPanel(this._currentPanelId);
    const planDocument = this.planGenerator.getPlanDocument();
    const statusCounts = this.planGenerator.getStatusCounts();

    // Initialize previous plan snapshot for delta computation
    if (planDocument?.items) {
      this._previousPlanSnapshot = new Map();
      for (const item of planDocument.items) {
        this._previousPlanSnapshot.set(item.id, JSON.stringify(item));
      }
    }

    const config = vscode.workspace.getConfiguration('aicc');
    const showComponentReferences = config.get<boolean>('ui.showComponentReferences', false);
    const packageJson = require('../../package.json');
    const version = packageJson.version || '1.0.0';
    const mcpConfig = vscode.workspace.getConfiguration('aicc.mcp');
    const mcpData = {
      enabled: mcpConfig.get<boolean>('enabled', true),
      transport: mcpConfig.get<string>('transport', 'stdio'),
      host: mcpConfig.get<string>('host', 'localhost'),
      port: mcpConfig.get<number>('port', 3000)
    };
    const devModeEnabled = this._context?.workspaceState.get<boolean>('aicc.devModeEnabled', false) ?? false;
    const platform = getPlatformInfoForWebview();

    this._view.webview.postMessage({
      type: 'init',
      payload: {
        panels: panelMetadata,
        tabs,
        intakes,
        currentPanel,
        agentMode: this._currentAgentMode,
        planDocument,
        statusCounts,
        showComponentReferences,
        version,
        mcpConfig: mcpData,
        devModeEnabled,
        platform
      }
    });
  }

  /** Switch to a different panel */
  private async _switchPanel(panelId: string): Promise<void> {
    this._currentPanelId = panelId;
    const panelConfig = this.panelLoader.getPanel(panelId);

    if (this._view && panelConfig) {
      this._view.webview.postMessage({
        type: 'panelChanged',
        payload: panelConfig
      });
    }
  }

  /** Refresh current panel data */
  private async _refreshData(): Promise<void> {
    try {
      await this.planGenerator.generatePlan();

      if (this._view) {
        this._view.webview.postMessage({
          type: 'dataRefreshed',
          payload: {
            planDocument: this.planGenerator.getPlanDocument(),
            statusCounts: this.planGenerator.getStatusCounts()
          }
        });
      }
    } catch (error) {
      logger.error('Error refreshing data', { error: String(error) });
    }
  }

  /** Open documentation in markdown preview */
  private async _handleOpenDocs(payload?: { docPath?: string }): Promise<void> {
    try {
      const relativePath = payload?.docPath ?? 'docs/USER_GUIDE.md';
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const candidates: vscode.Uri[] = [];
      if (workspaceFolder) {
        candidates.push(vscode.Uri.joinPath(workspaceFolder.uri, relativePath));
      }
      candidates.push(vscode.Uri.file(path.join(this._extensionUri.fsPath, relativePath)));

      for (const uri of candidates) {
        try {
          await vscode.workspace.openTextDocument(uri);
          await vscode.commands.executeCommand('markdown.showPreview', uri);
          return;
        } catch {
          // Try next candidate
        }
      }
      logger.warn(`Documentation file not found: ${relativePath}`);
      vscode.window.showErrorMessage(`Documentation not found: ${relativePath}`);
    } catch (error) {
      logger.error('Error opening docs', { error: String(error) });
    }
  }

  /** Execute a VS Code command */
  private async _executeAction(payload: { command: string; args?: unknown[] }): Promise<void> {
    try {
      await vscode.commands.executeCommand(payload.command, ...(payload.args || []));
    } catch (error) {
      logger.error('Error executing action', { error: String(error) });
      if (this._view) {
        this._view.webview.postMessage({
          type: 'error',
          payload: { message: `Failed to execute action: ${error}` }
        });
      }
    }
  }

  /** Handle ActionRegistry-based action invocation (AICC-0217) */
  private async _handleExecuteActionV2(message: { type: string; action?: string; payload?: any }): Promise<void> {
    try {
      const registry = ActionRegistry.getInstance();
      const result = await registry.invokeFromMessage(message);
      if (this._view) {
        this._view.webview.postMessage({ type: 'actionResult', payload: result });
      }
    } catch (error) {
      logger.error('Error executing action v2', { error: String(error) });
    }
  }

  /** Update a planning item */
  private async _updateItem(payload: { id: string; data: Record<string, unknown> }): Promise<void> {
    try {
      const updated = await this.planGenerator.updatePlanItem(
        payload.id,
        payload.data as Partial<import('../types/plan').PlanItem>
      );
      if (!updated) {
        logger.warn('Item not found for update', { itemId: payload.id });
      } else {
        logger.info(`Item updated: ${payload.id}`);
      }
      if (this._view) {
        this._view.webview.postMessage({
          type: 'itemUpdated',
          payload: { id: payload.id, success: !!updated }
        });
      }
    } catch (error) {
      logger.error('Error updating item', { error: String(error), itemId: payload.id });
      if (this._view) {
        this._view.webview.postMessage({
          type: 'itemUpdated',
          payload: { id: payload.id, success: false, error: String(error) }
        });
      }
    }
  }

  // ==================================================================
  //  HTML / CSP
  // ==================================================================

  /** Get the HTML content for the webview */
  private _getHtmlContent(webview: vscode.Webview): string {
    const nonce = this._getNonce();

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'app.js')
    );
    const actionsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'lib', 'actions.js')
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'styles.css')
    );
    const codiconFontUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'codicon.ttf')
    );
    const codiconCssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'codicon.css')
    );

    const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'index.html');
    const fs = require('fs');
    let html: string;
    try {
      html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    } catch (error) {
      logger.error('Failed to load secondary panel HTML template', {
        path: htmlPath.fsPath,
        error: error instanceof Error ? error.message : String(error)
      });
      return `<!DOCTYPE html><html><body><p>Error: Failed to load panel template. Please reload the window.</p></body></html>`;
    }

    html = html
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{cspSource}}/g, webview.cspSource)
      .replace(/{{scriptUri}}/g, scriptUri.toString())
      .replace(/{{actionsUri}}/g, actionsUri.toString())
      .replace(/{{stylesUri}}/g, stylesUri.toString())
      .replace(/{{codiconFontUri}}/g, codiconFontUri.toString())
      .replace(/{{codiconCssUri}}/g, codiconCssUri.toString());

    return html;
  }

  /** Generate a nonce for CSP */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  // ==================================================================
  //  File Watchers
  // ==================================================================

  /** Set up file watcher for PLAN.json */
  private setupPlanFileWatcher(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return; }

    const planJsonPattern = new vscode.RelativePattern(workspaceFolders[0], '.project/PLAN.json');
    this.planFileWatcher = vscode.workspace.createFileSystemWatcher(planJsonPattern);

    this.planFileWatcher.onDidChange(async () => {
      if (this._isSelfWrite) {
        logger.info('PLAN.json change from self-write, skipping refresh');
        return;
      }
      logger.info('PLAN.json changed externally, refreshing data');
      await this._refreshPlanningData();
    });

    this.planFileWatcher.onDidCreate(async () => {
      logger.info('PLAN.json created, refreshing data');
      await this._refreshPlanningData();
    });

    logger.info('PLAN.json file watcher established');
  }

  /** Set up file watcher for IDEAS.json */
  private setupIdeasFileWatcher(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) { return; }

    const ideasPattern = new vscode.RelativePattern(workspaceFolders[0], '.project/IDEAS.json');
    this.ideasFileWatcher = vscode.workspace.createFileSystemWatcher(ideasPattern);

    this.ideasFileWatcher.onDidChange(async () => {
      if (this._isIdeaSelfWrite) {
        logger.info('IDEAS.json change from self-write, skipping refresh');
        return;
      }
      logger.info('IDEAS.json changed externally, refreshing ideation data');
      await this._refreshIdeationData();
    });

    this.ideasFileWatcher.onDidCreate(async () => {
      logger.info('IDEAS.json created, refreshing ideation data');
      await this._refreshIdeationData();
    });

    this.ideasFileWatcher.onDidDelete(() => {
      logger.info('IDEAS.json deleted, clearing ideation data');
      if (this._view) {
        this._view.webview.postMessage({
          type: 'ideationDataLoaded',
          payload: { version: '1.0.0', ideas: [] },
        });
      }
    });

    logger.info('IDEAS.json file watcher established');
  }

  // ==================================================================
  //  Data Refresh (kept inline - tightly coupled to internal state)
  // ==================================================================

  /** Refresh ideation data and push to webview */
  private async _refreshIdeationData(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) { return; }

      const fs = require('fs');
      const ideasPath = path.join(workspaceFolders[0].uri.fsPath, '.project', 'IDEAS.json');

      if (!fs.existsSync(ideasPath)) { return; }

      const raw = fs.readFileSync(ideasPath, 'utf-8');
      const data = JSON.parse(raw);

      if (this._view) {
        this._view.webview.postMessage({
          type: 'ideationDataLoaded',
          payload: data,
        });
      }
    } catch (error) {
      logger.error('Error refreshing ideation data', { error: String(error) });
    }
  }

  /** Compute delta between previous and new plan items */
  private _computePlanDelta(newItems: any[]): { added: string[]; removed: string[]; modified: string[] } {
    const newMap = new Map<string, string>();
    for (const item of newItems) {
      newMap.set(item.id, JSON.stringify(item));
    }

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    for (const [id, json] of newMap) {
      if (!this._previousPlanSnapshot.has(id)) {
        added.push(id);
      } else if (this._previousPlanSnapshot.get(id) !== json) {
        modified.push(id);
      }
    }

    for (const id of this._previousPlanSnapshot.keys()) {
      if (!newMap.has(id)) {
        removed.push(id);
      }
    }

    this._previousPlanSnapshot = newMap;
    return { added, removed, modified };
  }

  /** Refresh planning data with debounce and delta computation */
  private async _refreshPlanningData(): Promise<void> {
    if (this._refreshDebounceTimer) {
      clearTimeout(this._refreshDebounceTimer);
    }

    this._refreshDebounceTimer = setTimeout(async () => {
      if (!this._view) { return; }

      try {
        await this.planGenerator.loadPlanDocument();
        const planDocument = this.planGenerator.getPlanDocument();
        const statusCounts = this.planGenerator.getStatusCounts();

        if (!planDocument) { return; }

        const delta = this._computePlanDelta(planDocument.items);

        this._view.webview.postMessage({
          type: 'planUpdated',
          payload: { planDocument, statusCounts, delta }
        });

        logger.info('Planning data refreshed with delta', {
          added: delta.added.length,
          removed: delta.removed.length,
          modified: delta.modified.length
        });
      } catch (error) {
        logger.error('Error refreshing planning data', { error: String(error) });
      }
    }, 500);
  }

  // ==================================================================
  //  Public API
  // ==================================================================

  /** Post a message to the webview */
  public postMessage(message: { type: string; payload?: unknown }): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /** Set the MCPManager reference */
  public setMcpManager(manager: MCPManager): void {
    this._mcpManager = manager;
  }

  /** Dispose of resources */
  public dispose(): void {
    if (this._refreshDebounceTimer) {
      clearTimeout(this._refreshDebounceTimer);
      this._refreshDebounceTimer = undefined;
    }
    if (this.planFileWatcher) {
      this.planFileWatcher.dispose();
      this.planFileWatcher = undefined;
    }
    if (this.ideasFileWatcher) {
      this.ideasFileWatcher.dispose();
      this.ideasFileWatcher = undefined;
    }
    // Stop scheduler engine timers
    try { SchedulerEngine.getInstance().dispose(); } catch (_) { /* noop */ }
  }

  /** Show the panel */
  public show(): void {
    if (this._view) {
      this._view.show(true);
    }
  }
}
