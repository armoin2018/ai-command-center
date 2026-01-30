/**
 * Secondary Panel WebView Provider
 * Provides the webview for the secondary panel (bottom panel area)
 * Dynamically renders content based on panel YAML configurations
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { PanelLoaderService } from '../services/panelLoader';
import { TabLoaderService } from '../services/tabLoader';
import { IntakeLoaderService } from '../services/intakeLoader';
import { PlanGenerator } from '../services/planGenerator';
import { PanelRenderer } from '../services/panelRenderer';
import { Logger } from '../logger';

const logger = Logger.getInstance();

export class SecondaryPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'aicc.secondaryPanel';
  
  private _view?: vscode.WebviewView;
  private _extensionUri: vscode.Uri;
  private _currentPanelId: string = 'planning';
  private _currentAgentMode: 'all' | 'agent' = 'all';
  private panelLoader: PanelLoaderService;
  private tabLoader: TabLoaderService;
  private intakeLoader: IntakeLoaderService;
  private planGenerator: PlanGenerator;
  private panelRenderer: PanelRenderer;
  private planFileWatcher?: vscode.FileSystemWatcher;

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;
    this.panelLoader = PanelLoaderService.getInstance();
    this.tabLoader = TabLoaderService.getInstance();
    this.intakeLoader = IntakeLoaderService.getInstance();
    this.planGenerator = PlanGenerator.getInstance();
    this.panelRenderer = PanelRenderer.getInstance(extensionUri.fsPath);
    
    // Set up file watcher for PLAN.json
    this.setupPlanFileWatcher();
  }

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
      await this._handleMessage(message);
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
        const mcpData = {
          enabled: mcpConfig.get<boolean>('enabled', true),
          transport: mcpConfig.get<string>('transport', 'stdio'),
          host: mcpConfig.get<string>('host', 'localhost'),
          port: mcpConfig.get<number>('port', 3000)
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
    
    logger.info('Secondary Panel WebView initialized');
  }

  /**
   * Handle messages from the webview
   */
  private async _handleMessage(message: { type: string; payload?: unknown }): Promise<void> {
    switch (message.type) {
      case 'ready':
        await this._sendInitialData();
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
        
      case 'fetchData':
        await this._fetchData(message.payload as { endpoint: string; params?: Record<string, unknown> });
        break;
        
      case 'updateStatus':
        await this._handleStatusUpdate(message.payload as { itemId: string; status: string });
        break;
        
      case 'runItem':
        await this._handleRunItem(message.payload as { itemId: string });
        break;
        
      case 'expandPanel':
        await this._handleExpandPanel(message.payload as { itemId: string; panelType: string });
        break;
        
      case 'saveItem':
        await this._handleSaveItem(message.payload as { itemId: string; data: Record<string, unknown> });
        break;
        
      case 'addComment':
        await this._handleAddComment(message.payload as { itemId: string; comment: string });
        break;
        
      case 'saveAllChanges':
        await this._handleSaveAllChanges();
        break;
        
      case 'runNext':
        await this._handleRunNext();
        break;
        
      case 'changeAgent':
        await this._handleChangeAgent(message.payload as { agentId: string });
        break;
        
      case 'installKit':
        await this._handleInstallKit(message.payload as { kitId: string });
        break;
        
      case 'uninstallKit':
        await this._handleUninstallKit(message.payload as { kitId: string });
        break;
        
      case 'loadAIKits':
        await this._handleLoadAIKits();
        break;
        
      case 'copyToClipboard':
        await this._handleCopyToClipboard(message.payload as { text: string });
        break;
        
      case 'downloadFile':
        await this._handleDownloadFile(message.payload as { url: string; filename: string });
        break;
        
      case 'addMetadata':
        await this._handleAddMetadata(message.payload as { itemId: string; key: string; value: string });
        break;
        
      case 'deleteMetadata':
        await this._handleDeleteMetadata(message.payload as { itemId: string; key: string });
        break;
        
      case 'addRelationship':
        await this._handleAddRelationship(message.payload as { itemId: string; type: string; targetId: string });
        break;
        
      case 'deleteRelationship':
        await this._handleDeleteRelationship(message.payload as { itemId: string; index: number });
        break;
        
      case 'deleteComment':
        await this._handleDeleteComment(message.payload as { itemId: string; index: number });
        break;
        
      case 'showProgressReport':
        await this._handleShowProgressReport();
        break;
        
      case 'loadIntakeForm':
        await this._handleLoadIntakeForm(message.payload as { intakeId: string });
        break;
        
      case 'submitIntake':
        await this._handleSubmitIntake(message.payload as { intakeId: string; data: Record<string, any> });
        break;
        
      default:
        logger.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle status update from webview
   */
  private async _handleStatusUpdate(payload: { itemId: string; status: string }): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.updateItemStatus', payload.itemId, payload.status);
      await this._refreshData();
      
      if (this._view) {
        this._view.webview.postMessage({
          type: 'statusUpdated',
          payload: { itemId: payload.itemId, status: payload.status }
        });
      }
    } catch (error) {
      logger.error('Error updating status', { error: String(error) });
    }
  }

  /**
   * Handle run item from webview
   */
  private async _handleRunItem(payload: { itemId: string }): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.runItem', payload.itemId);
    } catch (error) {
      logger.error('Error running item', { error: String(error) });
    }
  }

  /**
   * Handle expand panel (Edit, Info, Connections, Repo, Comments)
   */
  private async _handleExpandPanel(payload: { itemId: string; panelType: string }): Promise<void> {
    // Get item data for the expanded panel
    const planDoc = this.planGenerator.getPlanDocument();
    const item = planDoc?.items.find(i => i.id === payload.itemId);
    
    if (item && this._view) {
      this._view.webview.postMessage({
        type: 'panelExpanded',
        payload: {
          itemId: payload.itemId,
          panelType: payload.panelType,
          itemData: item
        }
      });
    }
  }

  /**
   * Handle save item from expanded panel
   */
  private async _handleSaveItem(payload: { itemId: string; data: Record<string, unknown> }): Promise<void> {
    // TODO: Save to file system
    logger.info('Saving item', { itemId: payload.itemId, data: JSON.stringify(payload.data) });
    
    if (this._view) {
      this._view.webview.postMessage({
        type: 'itemSaved',
        payload: { itemId: payload.itemId, success: true }
      });
    }
  }

  /**
   * Handle add comment
   */
  private async _handleAddComment(payload: { itemId: string; comment: string }): Promise<void> {
    // TODO: Add comment to item file
    logger.info('Adding comment', { itemId: payload.itemId, comment: payload.comment });
    
    if (this._view) {
      this._view.webview.postMessage({
        type: 'commentAdded',
        payload: { itemId: payload.itemId, success: true }
      });
    }
  }

  /**
   * Handle save all changes
   */
  private async _handleSaveAllChanges(): Promise<void> {
    await vscode.commands.executeCommand('aicc.saveAllChanges');
    
    if (this._view) {
      this._view.webview.postMessage({
        type: 'allChangesSaved',
        payload: { success: true }
      });
    }
  }

  /**
   * Handle run next item
   */
  private async _handleRunNext(): Promise<void> {
    await vscode.commands.executeCommand('aicc.runNextItem');
  }

  /**
   * Handle agent change
   */
  private async _handleChangeAgent(payload: { agentId: string }): Promise<void> {
    logger.info('Agent changed', { agentId: payload.agentId });
    
    // Update agent mode based on selection
    const isAllMode = payload.agentId === 'all' || !payload.agentId;
    this._currentAgentMode = isAllMode ? 'all' : 'agent';
    
    // Get updated tabs and intakes for new agent mode
    const tabs = this.tabLoader.getTabsForAgent(this._currentAgentMode);
    const intakes = this.intakeLoader.getIntakesForAgent(this._currentAgentMode);
    
    // Send updated tabs and intakes to webview
    if (this._view) {
      this._view.webview.postMessage({
        type: 'agentChanged',
        payload: {
          agentId: payload.agentId,
          agentMode: this._currentAgentMode,
          tabs: tabs,
          intakes: intakes
        }
      });
    }
  }

  /**
   * Handle install AI Kit
   */
  private async _handleInstallKit(payload: { kitId: string }): Promise<void> {
    await vscode.commands.executeCommand('aicc.installAIKit', payload.kitId);
  }

  /**
   * Handle uninstall AI Kit
   */
  private async _handleUninstallKit(payload: { kitId: string }): Promise<void> {
    await vscode.commands.executeCommand('aicc.uninstallAIKit', payload.kitId);
  }

  /**
   * Handle load AI Kits - fetches available kits from selected repository
   */
  private async _handleLoadAIKits(): Promise<void> {
    try {
      // Execute the command to load AI Kits
      const kits = await vscode.commands.executeCommand('aicc.loadAIKits');
      
      if (this._view) {
        this._view.webview.postMessage({
          type: 'aiKitsLoaded',
          payload: { kits: kits || [] }
        });
      }
    } catch (error) {
      logger.error('Error loading AI Kits', { error: String(error) });
      if (this._view) {
        this._view.webview.postMessage({
          type: 'error',
          payload: { message: `Failed to load AI Kits: ${error}` }
        });
      }
    }
  }

  /**
   * Send initial data to the webview
   */
  private async _sendInitialData(): Promise<void> {
    if (!this._view) return;
    
    // Get available panels
    const panels = this.panelLoader.getAllPanels();
    const panelMetadata = panels.map(p => p.panel);
    
    // Get tabs filtered by agent mode
    const tabs = this.tabLoader.getTabsForAgent(this._currentAgentMode);
    
    // Get intakes filtered by agent mode
    const intakes = this.intakeLoader.getIntakesForAgent(this._currentAgentMode);
    
    // Get current panel config
    const currentPanel = this.panelLoader.getPanel(this._currentPanelId);
    
    // Get plan data
    const planDocument = this.planGenerator.getPlanDocument();
    const statusCounts = this.planGenerator.getStatusCounts();
    
    // Get component reference setting
    const config = vscode.workspace.getConfiguration('aicc');
    const showComponentReferences = config.get<boolean>('ui.showComponentReferences', false);
    
    // Get extension version
    const packageJson = require('../../package.json');
    const version = packageJson.version || '1.0.0';
    
    // Get MCP configuration
    const mcpConfig = vscode.workspace.getConfiguration('aicc.mcp');
    const mcpData = {
      enabled: mcpConfig.get<boolean>('enabled', true),
      transport: mcpConfig.get<string>('transport', 'stdio'),
      host: mcpConfig.get<string>('host', 'localhost'),
      port: mcpConfig.get<number>('port', 3000)
    };
    
    this._view.webview.postMessage({
      type: 'init',
      payload: {
        panels: panelMetadata,
        tabs: tabs,
        intakes: intakes,
        currentPanel: currentPanel,
        agentMode: this._currentAgentMode,
        planDocument: planDocument,
        statusCounts: statusCounts,
        showComponentReferences: showComponentReferences,
        version: version,
        mcpConfig: mcpData
      }
    });
  }

  /**
   * Switch to a different panel
   */
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

  /**
   * Refresh current panel data
   */
  private async _refreshData(): Promise<void> {
    // Regenerate plan
    await this.planGenerator.generatePlan();
    
    // Send updated data
    if (this._view) {
      this._view.webview.postMessage({
        type: 'dataRefreshed',
        payload: {
          planDocument: this.planGenerator.getPlanDocument(),
          statusCounts: this.planGenerator.getStatusCounts()
        }
      });
    }
  }

  /**
   * Execute a VS Code command
   */
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

  /**
   * Update a planning item
   */
  private async _updateItem(payload: { id: string; data: Record<string, unknown> }): Promise<void> {
    // TODO: Implement item update through MCP or direct file modification
    logger.info(`Update item: ${payload.id}`, { data: JSON.stringify(payload.data) });
    
    if (this._view) {
      this._view.webview.postMessage({
        type: 'itemUpdated',
        payload: { id: payload.id, success: true }
      });
    }
  }

  /**
   * Fetch data from an endpoint
   */
  private async _fetchData(payload: { endpoint: string; params?: Record<string, unknown> }): Promise<void> {
    // TODO: Implement MCP API calls
    logger.info(`Fetch data: ${payload.endpoint}`);
    
    // For now, return mock data based on endpoint
    let data: unknown = null;
    
    if (payload.endpoint.includes('status-counts')) {
      data = this.planGenerator.getStatusCounts();
    } else if (payload.endpoint.includes('items')) {
      data = this.planGenerator.getPlanDocument()?.items || [];
    }
    
    if (this._view) {
      this._view.webview.postMessage({
        type: 'dataFetched',
        payload: { endpoint: payload.endpoint, data }
      });
    }
  }

  /**
   * Get the HTML content for the webview
   * Serves static HTML shell with client-side rendering
   */
  private _getHtmlContent(webview: vscode.Webview): string {
    const nonce = this._getNonce();
    
    // Get URIs for static resources
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'app.js')
    );
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'styles.css')
    );
    const codiconFontUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'codicon.ttf')
    );
    
    // Load static HTML template
    const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'secondaryPanel', 'index.html');
    const fs = require('fs');
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8');
    
    // Replace placeholders
    html = html
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{cspSource}}/g, webview.cspSource)
      .replace(/{{scriptUri}}/g, scriptUri.toString())
      .replace(/{{stylesUri}}/g, stylesUri.toString())
      .replace(/{{codiconFontUri}}/g, codiconFontUri.toString());
    
    return html;
  }

  /**
   * Generate a nonce for CSP
   */
  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Set up file watcher for PLAN.json
   */
  private setupPlanFileWatcher(): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const planJsonPattern = new vscode.RelativePattern(
      workspaceFolders[0],
      '.project/PLAN.json'
    );

    this.planFileWatcher = vscode.workspace.createFileSystemWatcher(planJsonPattern);

    // Watch for changes to PLAN.json
    this.planFileWatcher.onDidChange(async () => {
      logger.info('PLAN.json changed, refreshing data');
      await this._refreshPlanningData();
    });

    this.planFileWatcher.onDidCreate(async () => {
      logger.info('PLAN.json created, refreshing data');
      await this._refreshPlanningData();
    });

    logger.info('PLAN.json file watcher established');
  }

  /**
   * Refresh planning data and notify webview
   */
  private async _refreshPlanningData(): Promise<void> {
    if (!this._view) return;

    try {
      // Reload plan document from file
      const planDocument = this.planGenerator.getPlanDocument();
      const statusCounts = this.planGenerator.getStatusCounts();

      // Send update to webview
      this._view.webview.postMessage({
        type: 'dataRefreshed',
        payload: {
          planDocument: planDocument,
          statusCounts: statusCounts
        }
      });

      logger.info('Planning data refreshed and sent to webview');
    } catch (error) {
      logger.error('Error refreshing planning data', { error: String(error) });
    }
  }

  /**
   * Handle copy to clipboard
   */
  private async _handleCopyToClipboard(payload: { text: string }): Promise<void> {
    try {
      await vscode.env.clipboard.writeText(payload.text);
      vscode.window.showInformationMessage('Copied to clipboard');
    } catch (error) {
      logger.error('Error copying to clipboard', { error: String(error) });
      vscode.window.showErrorMessage('Failed to copy to clipboard');
    }
  }

  /**
   * Handle download file
   */
  private async _handleDownloadFile(payload: { url: string; filename: string }): Promise<void> {
    try {
      // Use vscode command to open save dialog
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(payload.filename),
        filters: { 'JSON': ['json'] }
      });

      if (uri) {
        // Fetch the file content
        const response = await fetch(payload.url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const content = await response.text();
        
        // Write to file
        await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
        vscode.window.showInformationMessage(`File saved to ${uri.fsPath}`);
      }
    } catch (error) {
      logger.error('Error downloading file', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to download file: ${error}`);
    }
  }

  /**
   * Handle add metadata
   */
  private async _handleAddMetadata(payload: { itemId: string; key: string; value: string }): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find(i => i.id === payload.itemId);
      
      if (item) {
        if (!item.metadata) {
          item.metadata = {};
        }
        item.metadata[payload.key] = payload.value;
        await this.planGenerator.savePlanDocument();
        await this._refreshPlanningData();
        logger.info('Metadata added', { itemId: payload.itemId, key: payload.key });
      }
    } catch (error) {
      logger.error('Error adding metadata', { error: String(error) });
    }
  }

  /**
   * Handle delete metadata
   */
  private async _handleDeleteMetadata(payload: { itemId: string; key: string }): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find(i => i.id === payload.itemId);
      
      if (item && item.metadata) {
        delete item.metadata[payload.key];
        await this.planGenerator.savePlanDocument();
        await this._refreshPlanningData();
        logger.info('Metadata deleted', { itemId: payload.itemId, key: payload.key });
      }
    } catch (error) {
      logger.error('Error deleting metadata', { error: String(error) });
    }
  }

  /**
   * Handle add relationship
   */
  private async _handleAddRelationship(payload: { itemId: string; type: string; targetId: string }): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find(i => i.id === payload.itemId);
      
      if (item) {
        if (!item.linkedRelationships) {
          item.linkedRelationships = [];
        }
        item.linkedRelationships.push({
          type: payload.type as any,
          itemId: payload.targetId
        });
        await this.planGenerator.savePlanDocument();
        await this._refreshPlanningData();
        logger.info('Relationship added', { itemId: payload.itemId, type: payload.type, targetId: payload.targetId });
      }
    } catch (error) {
      logger.error('Error adding relationship', { error: String(error) });
    }
  }

  /**
   * Handle delete relationship
   */
  private async _handleDeleteRelationship(payload: { itemId: string; index: number }): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find(i => i.id === payload.itemId);
      
      if (item && item.linkedRelationships && item.linkedRelationships.length > payload.index) {
        item.linkedRelationships.splice(payload.index, 1);
        await this.planGenerator.savePlanDocument();
        await this._refreshPlanningData();
        logger.info('Relationship deleted', { itemId: payload.itemId, index: payload.index });
      }
    } catch (error) {
      logger.error('Error deleting relationship', { error: String(error) });
    }
  }

  /**
   * Handle delete comment
   */
  private async _handleDeleteComment(payload: { itemId: string; index: number }): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      if (!planDocument) {
        logger.warn('Plan document not loaded');
        return;
      }
      
      const item = planDocument.items.find(i => i.id === payload.itemId);
      
      if (item && item.comments && item.comments.length > payload.index) {
        item.comments.splice(payload.index, 1);
        await this.planGenerator.savePlanDocument();
        await this._refreshPlanningData();
        logger.info('Comment deleted', { itemId: payload.itemId, index: payload.index });
      }
    } catch (error) {
      logger.error('Error deleting comment', { error: String(error) });
    }
  }

  /**
   * Handle show progress report
   */
  private async _handleShowProgressReport(): Promise<void> {
    try {
      // Open the PROGRESS.html file if it exists
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
   * Handle load intake form
   */
  private async _handleLoadIntakeForm(payload: { intakeId: string }): Promise<void> {
    try {
      const intakeLoader = IntakeLoaderService.getInstance();
      const intake = await intakeLoader.loadIntakeConfig(payload.intakeId);
      
      if (!intake) {
        vscode.window.showErrorMessage(`Intake form '${payload.intakeId}' not found`);
        return;
      }
      
      if (this._view) {
        this._view.webview.postMessage({
          type: 'intakeFormLoaded',
          payload: intake
        });
      }
    } catch (error) {
      logger.error('Error loading intake form', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to load intake form: ${error}`);
    }
  }

  /**
   * Handle submit intake
   */
  private async _handleSubmitIntake(payload: { intakeId: string; data: Record<string, any> }): Promise<void> {
    try {
      const intakeLoader = IntakeLoaderService.getInstance();
      const intake = await intakeLoader.loadIntakeConfig(payload.intakeId);
      
      if (!intake) {
        vscode.window.showErrorMessage(`Intake form '${payload.intakeId}' not found`);
        return;
      }
      
      // Process the intake submission
      // For now, we'll create a new plan item from the intake data
      const planGenerator = PlanGenerator.getInstance();
      
      // Determine item type from intake metadata
      const itemType = intake.metadata?.type || 'task';
      
      // Create new plan item
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
      
      // Add to plan
      const planDoc = planGenerator.getPlanDocument();
      if (planDoc) {
        planDoc.items = planDoc.items || [];
        planDoc.items.push(newItem as any);
        await planGenerator.savePlanDocument();
        
        vscode.window.showInformationMessage(`Intake submitted successfully: ${newItem.title}`);
        await this._refreshData();
      } else {
        vscode.window.showErrorMessage('No plan document available');
      }
    } catch (error) {
      logger.error('Error submitting intake', { error: String(error) });
      vscode.window.showErrorMessage(`Failed to submit intake: ${error}`);
    }
  }

  /**
   * Post a message to the webview
   */
  public postMessage(message: { type: string; payload?: unknown }): void {
    if (this._view) {
      this._view.webview.postMessage(message);
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.planFileWatcher) {
      this.planFileWatcher.dispose();
      this.planFileWatcher = undefined;
    }
  }

  /**
   * Show the panel
   */
  public show(): void {
    if (this._view) {
      this._view.show(true);
    }
  }
}
