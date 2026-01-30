/**
 * Panel Loader Service
 * Discovers and loads panel YAML configurations from .github/aicc/panels/
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { PanelConfig, PanelMetadata, PanelManifest } from '../types/panel';
import { Logger } from '../logger';

const logger = Logger.getInstance();

export class PanelLoaderService {
  private static instance: PanelLoaderService;
  private panels: Map<string, PanelConfig> = new Map();
  private manifest: PanelManifest | null = null;
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  private constructor() {}

  public static getInstance(): PanelLoaderService {
    if (!PanelLoaderService.instance) {
      PanelLoaderService.instance = new PanelLoaderService();
    }
    return PanelLoaderService.instance;
  }

  /**
   * Initialize the panel loader and discover all panel configurations
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    logger.info('Initializing Panel Loader Service');
    
    const panelsDir = path.join(workspaceRoot, '.github', 'aicc', 'panels');
    
    // Load all panels
    await this.loadPanels(panelsDir);
    
    // Set up file watcher for hot reload
    this.setupFileWatcher(panelsDir);
    
    logger.info(`Panel Loader initialized with ${this.panels.size} panels`);
  }

  /**
   * Load all panel YAML files from the panels directory
   */
  private async loadPanels(panelsDir: string): Promise<void> {
    const panelsDirUri = vscode.Uri.file(panelsDir);
    
    try {
      const entries = await vscode.workspace.fs.readDirectory(panelsDirUri);
      
      for (const [fileName, fileType] of entries) {
        if (fileType === vscode.FileType.File && 
            fileName.endsWith('.panel.yaml') && 
            !fileName.startsWith('_')) {
          
          const filePath = path.join(panelsDir, fileName);
          await this.loadPanel(filePath);
        }
      }
      
      // Build manifest
      this.buildManifest();
    } catch (error) {
      if ((error as vscode.FileSystemError).code === 'FileNotFound') {
        logger.warn('Panels directory not found, creating default panels');
        await this.createDefaultPanels(panelsDir);
      } else {
        logger.error('Error loading panels', { error: String(error) });
      }
    }
  }

  /**
   * Load a single panel configuration
   */
  private async loadPanel(filePath: string): Promise<PanelConfig | null> {
    try {
      const fileUri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(fileUri);
      const panelConfig = yaml.load(content.toString()) as PanelConfig;
      
      if (this.validatePanelConfig(panelConfig)) {
        this.panels.set(panelConfig.panel.id, panelConfig);
        logger.debug(`Loaded panel: ${panelConfig.panel.name} (${panelConfig.panel.id})`);
        return panelConfig;
      } else {
        logger.warn(`Invalid panel configuration in ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error loading panel from ${filePath}`, { error: String(error) });
    }
    return null;
  }

  /**
   * Validate panel configuration
   */
  private validatePanelConfig(config: unknown): config is PanelConfig {
    const cfg = config as PanelConfig;
    return !!(
      cfg &&
      cfg.panel &&
      cfg.panel.id &&
      cfg.panel.name &&
      cfg.panel.icon !== undefined &&
      cfg.panel.order !== undefined &&
      cfg.components &&
      Array.isArray(cfg.components)
    );
  }

  /**
   * Build the panel manifest from loaded panels
   */
  private buildManifest(): void {
    const panelMetadata: PanelMetadata[] = [];
    
    for (const [_, config] of this.panels) {
      panelMetadata.push(config.panel);
    }
    
    // Sort by order
    panelMetadata.sort((a, b) => a.order - b.order);
    
    this.manifest = {
      version: '1.0.0',
      panels: panelMetadata,
      loadedAt: new Date().toISOString()
    };
  }

  /**
   * Set up file watcher for hot reload of panel configurations
   */
  private setupFileWatcher(panelsDir: string): void {
    const pattern = new vscode.RelativePattern(panelsDir, '*.panel.yaml');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    this.fileWatcher.onDidChange(async (uri) => {
      logger.info(`Panel file changed: ${uri.fsPath}`);
      await this.loadPanel(uri.fsPath);
      this.buildManifest();
      this.notifyPanelUpdate();
    });
    
    this.fileWatcher.onDidCreate(async (uri) => {
      logger.info(`New panel file created: ${uri.fsPath}`);
      await this.loadPanel(uri.fsPath);
      this.buildManifest();
      this.notifyPanelUpdate();
    });
    
    this.fileWatcher.onDidDelete((uri) => {
      logger.info(`Panel file deleted: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      const panelId = this.findPanelIdByFileName(fileName);
      if (panelId) {
        this.panels.delete(panelId);
        this.buildManifest();
        this.notifyPanelUpdate();
      }
    });
  }

  /**
   * Find panel ID by file name
   */
  private findPanelIdByFileName(fileName: string): string | null {
    for (const [id] of this.panels) {
      if (fileName.includes(id)) {
        return id;
      }
    }
    return null;
  }

  /**
   * Notify webview of panel updates
   */
  private notifyPanelUpdate(): void {
    vscode.commands.executeCommand('aicc.panel.refresh');
  }

  /**
   * Create default panels if none exist
   */
  private async createDefaultPanels(panelsDir: string): Promise<void> {
    // Create directory
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(panelsDir));
    
    // Panels will be copied from the extension's default location
    logger.info('Default panels directory created');
  }

  /**
   * Get all loaded panels
   */
  public getAllPanels(): PanelConfig[] {
    return Array.from(this.panels.values())
      .sort((a, b) => a.panel.order - b.panel.order);
  }

  /**
   * Get panels for a specific agent
   */
  public getPanelsForAgent(agentId: string): PanelConfig[] {
    return this.getAllPanels().filter(panel => 
      panel.panel.scope === 'all' || 
      panel.panel.agent === agentId
    );
  }

  /**
   * Get a specific panel by ID
   */
  public getPanel(panelId: string): PanelConfig | undefined {
    return this.panels.get(panelId);
  }

  /**
   * Get the panel manifest
   */
  public getManifest(): PanelManifest | null {
    return this.manifest;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
    this.panels.clear();
    this.manifest = null;
  }
}
