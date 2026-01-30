/**
 * Tab Loader Service
 * Discovers and loads tab YAML configurations from .github/aicc/tabs/
 * Filters tabs based on agent selection (All_ prefix or Agent_ prefix)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '../logger';

const logger = Logger.getInstance();

export interface TabConfig {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    id: string;
    description?: string;
    version?: string;
    icon?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    layout?: unknown;
    components?: unknown[];
  };
}

export interface TabMetadata {
  id: string;
  name: string;
  icon: string;
  description?: string;
  agent: 'all' | 'agent';
  sourceFunction?: string;
}

export class TabLoaderService {
  private static instance: TabLoaderService;
  private tabs: Map<string, TabConfig> = new Map();
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  private constructor() {}

  public static getInstance(): TabLoaderService {
    if (!TabLoaderService.instance) {
      TabLoaderService.instance = new TabLoaderService();
    }
    return TabLoaderService.instance;
  }

  /**
   * Initialize the tab loader and discover all tab configurations
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    logger.info('Initializing Tab Loader Service');
    
    const tabsDir = path.join(workspaceRoot, '.github', 'aicc', 'tabs');
    
    // Load all tabs
    await this.loadTabs(tabsDir);
    
    // Set up file watcher for hot reload
    this.setupFileWatcher(tabsDir);
    
    logger.info(`Tab Loader initialized with ${this.tabs.size} tabs`);
  }

  /**
   * Load all tab YAML files from the tabs directory
   */
  private async loadTabs(tabsDir: string): Promise<void> {
    const tabsDirUri = vscode.Uri.file(tabsDir);
    
    try {
      const entries = await vscode.workspace.fs.readDirectory(tabsDirUri);
      
      for (const [fileName, fileType] of entries) {
        if (fileType === vscode.FileType.File && 
            (fileName.endsWith('.tab.yaml') || fileName.endsWith('.yaml')) &&
            !fileName.startsWith('_')) {
          
          const filePath = path.join(tabsDir, fileName);
          await this.loadTab(filePath, fileName);
        }
      }
    } catch (error) {
      if ((error as vscode.FileSystemError).code === 'FileNotFound') {
        logger.warn('Tabs directory not found');
      } else {
        logger.error('Error loading tabs', { error: String(error) });
      }
    }
  }

  /**
   * Load a single tab configuration
   */
  private async loadTab(filePath: string, fileName: string): Promise<TabConfig | null> {
    try {
      const fileUri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(fileUri);
      const tabConfig = yaml.load(content.toString()) as TabConfig;
      
      if (this.validateTabConfig(tabConfig)) {
        // Use fileName as key for tracking agent/all prefix
        this.tabs.set(fileName, tabConfig);
        logger.debug(`Loaded tab: ${tabConfig.metadata.name} (${tabConfig.metadata.id})`);
        return tabConfig;
      } else {
        logger.warn(`Invalid tab configuration in ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error loading tab from ${filePath}`, { error: String(error) });
    }
    return null;
  }

  /**
   * Validate tab configuration
   */
  private validateTabConfig(config: unknown): config is TabConfig {
    const cfg = config as TabConfig;
    return !!(
      cfg &&
      cfg.metadata &&
      cfg.metadata.id &&
      cfg.metadata.name &&
      cfg.spec
    );
  }

  /**
   * Get tabs filtered by agent selection
   * @param agentMode 'all' or 'agent' based on current selection
   */
  public getTabsForAgent(agentMode: 'all' | 'agent'): TabMetadata[] {
    const tabs: TabMetadata[] = [];
    
    for (const [fileName, config] of this.tabs) {
      const isAllTab = fileName.startsWith('All_');
      const isAgentTab = fileName.startsWith('Agent_');
      
      // Include tabs based on agent mode
      if (agentMode === 'all' && isAllTab) {
        tabs.push(this.createTabMetadata(config, 'all'));
      } else if (agentMode === 'agent' && isAgentTab) {
        tabs.push(this.createTabMetadata(config, 'agent'));
      } else if (!isAllTab && !isAgentTab) {
        // Tabs without prefix are available to both
        tabs.push(this.createTabMetadata(config, agentMode));
      }
    }
    
    return tabs;
  }

  /**
   * Create tab metadata from configuration
   */
  private createTabMetadata(config: TabConfig, agent: 'all' | 'agent'): TabMetadata {
    return {
      id: config.metadata.id,
      name: config.metadata.name,
      icon: config.metadata.icon || 'file',
      description: config.metadata.description,
      agent: agent,
      sourceFunction: config.metadata.annotations?.sourceFunction
    };
  }

  /**
   * Get full tab configuration by ID
   */
  public getTabConfig(tabId: string): TabConfig | undefined {
    for (const [_, config] of this.tabs) {
      if (config.metadata.id === tabId) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Set up file watcher for hot reload of tab configurations
   */
  private setupFileWatcher(tabsDir: string): void {
    const pattern = new vscode.RelativePattern(tabsDir, '*.{tab.yaml,yaml}');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    this.fileWatcher.onDidChange(async (uri) => {
      logger.info(`Tab file changed: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      await this.loadTab(uri.fsPath, fileName);
      this.notifyTabUpdate();
    });
    
    this.fileWatcher.onDidCreate(async (uri) => {
      logger.info(`Tab file created: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      await this.loadTab(uri.fsPath, fileName);
      this.notifyTabUpdate();
    });
    
    this.fileWatcher.onDidDelete((uri) => {
      logger.info(`Tab file deleted: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      this.tabs.delete(fileName);
      this.notifyTabUpdate();
    });
  }

  /**
   * Notify that tabs have been updated (for webview refresh)
   */
  private notifyTabUpdate(): void {
    // Emit event that can be listened to by SecondaryPanelProvider
    logger.debug('Tab configuration updated');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
