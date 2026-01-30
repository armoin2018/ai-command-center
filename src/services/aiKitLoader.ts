/**
 * AI Kit Loader Service
 * Handles fetching AI Kits from GitHub repositories and installing them locally
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';
import { 
  Inventory, 
  ContentItem, 
  InstalledKit, 
  AIKitConfig,
  RepositoryConfig,
  AgenticSystemId,
  KitInstallResult,
  KitUninstallResult
} from '../types/aiKit';

const logger = Logger.getInstance();

export class AIKitLoaderService {
  private static instance: AIKitLoaderService;
  private installedKits: Map<string, InstalledKit> = new Map();
  private configPath: string = '.github/aicc/ai-kits/config.yaml';
  private workspaceRoot: string;
  private config: AIKitConfig | null = null;

  private constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  }

  public static getInstance(): AIKitLoaderService {
    if (!AIKitLoaderService.instance) {
      AIKitLoaderService.instance = new AIKitLoaderService();
    }
    return AIKitLoaderService.instance;
  }

  /**
   * Initialize the AI Kit loader
   */
  public async initialize(): Promise<void> {
    await this.loadConfig();
    await this.scanInstalledKits();
    logger.info('AI Kit Loader initialized');
  }

  /**
   * Load configuration from config.yaml
   */
  private async loadConfig(): Promise<void> {
    try {
      const configFilePath = path.join(this.workspaceRoot, this.configPath);
      if (fs.existsSync(configFilePath)) {
        const content = fs.readFileSync(configFilePath, 'utf-8');
        // Use simple YAML parsing since we can't import yaml module
        this.config = this.parseYamlSimple(content) as unknown as AIKitConfig;
        logger.info('AI Kit config loaded', { repos: this.config?.repositories?.length || 0 });
      }
    } catch (error) {
      logger.error('Failed to load AI Kit config', { error: String(error) });
    }
  }

  /**
   * Simple YAML parser for basic config files
   */
  private parseYamlSimple(content: string): Record<string, unknown> {
    // Basic YAML parsing - for production, use the yaml package
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');
    let currentKey = '';
    let currentArray: unknown[] = [];
    let inArray = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.startsWith('- ') && inArray) {
        currentArray.push(trimmed.substring(2));
      } else if (trimmed.endsWith(':') && !trimmed.includes(' ')) {
        if (inArray && currentKey) {
          result[currentKey] = currentArray;
          currentArray = [];
        }
        currentKey = trimmed.slice(0, -1);
        inArray = false;
      } else if (trimmed.startsWith('- ')) {
        inArray = true;
        currentArray.push(trimmed.substring(2));
      } else if (trimmed.includes(': ')) {
        const [key, ...valueParts] = trimmed.split(': ');
        const value = valueParts.join(': ').replace(/^["']|["']$/g, '');
        result[key] = value;
      }
    }
    
    if (inArray && currentKey) {
      result[currentKey] = currentArray;
    }
    
    return result;
  }

  /**
   * Scan for installed AI Kits in the workspace
   */
  private async scanInstalledKits(): Promise<void> {
    this.installedKits.clear();
    
    // Scan .github/ai-ley for installed instructions and personas
    const aiLeyPath = path.join(this.workspaceRoot, '.github', 'ai-ley');
    if (fs.existsSync(aiLeyPath)) {
      // Check for kit markers
      const kitMarkerPath = path.join(aiLeyPath, '.installed-kits.json');
      if (fs.existsSync(kitMarkerPath)) {
        try {
          const markers = JSON.parse(fs.readFileSync(kitMarkerPath, 'utf-8'));
          for (const kit of markers) {
            this.installedKits.set(kit.id, kit as InstalledKit);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    logger.info('Scanned installed kits', { count: this.installedKits.size });
  }

  /**
   * Get all configured repositories
   */
  public getRepositories(): RepositoryConfig[] {
    return this.config?.repositories || [
      { 
        id: 'ai-ley-official',
        name: 'AI-ley Official',
        description: 'Official AI-ley instructions and personas',
        url: 'https://github.com/armoin2018/ai-ley',
        branch: 'dev', 
        enabled: true,
        featured: true
      }
    ];
  }

  /**
   * Fetch inventory from a GitHub repository
   */
  public async fetchInventory(repoUrl: string, branch: string = 'dev'): Promise<Inventory | null> {
    try {
      // Parse owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        logger.warn('Invalid GitHub URL', { url: repoUrl });
        return null;
      }
      
      const [, owner, repo] = match;
      const inventoryUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/inventory.yaml`;
      
      const response = await fetch(inventoryUrl);
      if (!response.ok) {
        logger.warn('Inventory not found', { owner, repo, branch });
        return null;
      }
      
      const content = await response.text();
      const inventory = this.parseYamlSimple(content) as unknown as Inventory;
      
      logger.info('Fetched inventory', { 
        owner, repo, branch, 
        contents: inventory.contents?.length || 0 
      });
      
      return inventory;
    } catch (error) {
      logger.error('Failed to fetch inventory', { 
        repoUrl, branch, 
        error: String(error) 
      });
      return null;
    }
  }

  /**
   * Get available kits from all configured repositories
   */
  public async getAvailableKits(): Promise<ContentItem[]> {
    const allKits: ContentItem[] = [];
    
    for (const repoConfig of this.getRepositories()) {
      if (!repoConfig.enabled) continue;
      
      const inventory = await this.fetchInventory(repoConfig.url, repoConfig.branch);
      
      if (inventory?.contents) {
        for (const item of inventory.contents) {
          allKits.push(item);
        }
      }
    }
    
    return allKits;
  }

  /**
   * Get installed kits
   */
  public getInstalledKits(): InstalledKit[] {
    return Array.from(this.installedKits.values());
  }

  /**
   * Check if a kit is installed
   */
  public isInstalled(kitId: string): boolean {
    return this.installedKits.has(kitId);
  }

  /**
   * Install an AI Kit
   */
  public async installKit(
    kitId: string, 
    repoUrl: string, 
    branch: string,
    agenticSystem: AgenticSystemId = 'githubCopilot'
  ): Promise<KitInstallResult> {
    try {
      // Fetch inventory to get kit details
      const inventory = await this.fetchInventory(repoUrl, branch);
      if (!inventory) {
        return { 
          success: false, 
          kitId, 
          error: `Could not fetch inventory from ${repoUrl}` 
        };
      }
      
      const kit = inventory.contents?.find(i => i.id === kitId);
      if (!kit) {
        return { 
          success: false, 
          kitId, 
          error: `Kit "${kitId}" not found in inventory` 
        };
      }
      
      // Determine target paths based on agentic system
      const targetPath = this.getTargetPath(agenticSystem, kit.type);
      
      // Parse owner/repo from URL
      const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) {
        return { success: false, kitId, error: 'Invalid GitHub URL' };
      }
      const [, owner, repo] = match;
      
      // Fetch and install kit file
      const success = await this.downloadAndSaveFile(
        owner, repo, branch, 
        kit.path, 
        targetPath
      );
      
      if (!success) {
        return { success: false, kitId, error: 'Failed to download file' };
      }
      
      // Record installation
      const installedKit: InstalledKit = {
        id: kitId,
        name: kit.name,
        version: inventory.inventory?.version || '1.0.0',
        sourceRepo: repoUrl,
        sourceBranch: branch,
        installedAt: new Date().toISOString(),
        installedPath: targetPath,
        targetSystem: agenticSystem,
        fileCount: 1,
        description: kit.description,
        status: 'active'
      };
      
      this.installedKits.set(kitId, installedKit);
      await this.saveInstalledKitsMarker();
      
      vscode.window.showInformationMessage(`Installed AI Kit: ${kit.name}`);
      logger.info('Kit installed', { kitId });
      
      return { 
        success: true, 
        kitId, 
        installedPath: targetPath, 
        fileCount: 1 
      };
    } catch (error) {
      logger.error('Failed to install kit', { kitId, error: String(error) });
      return { success: false, kitId, error: String(error) };
    }
  }

  /**
   * Uninstall an AI Kit
   */
  public async uninstallKit(kitId: string): Promise<KitUninstallResult> {
    try {
      const kit = this.installedKits.get(kitId);
      if (!kit) {
        return { success: false, kitId, error: `Kit "${kitId}" is not installed` };
      }
      
      // Remove installed file
      const fullPath = path.join(this.workspaceRoot, kit.installedPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        logger.debug('Removed file', { path: fullPath });
      }
      
      // Remove from installed kits
      this.installedKits.delete(kitId);
      await this.saveInstalledKitsMarker();
      
      vscode.window.showInformationMessage(`Uninstalled AI Kit: ${kit.name}`);
      logger.info('Kit uninstalled', { kitId });
      
      return { success: true, kitId, filesRemoved: 1 };
    } catch (error) {
      logger.error('Failed to uninstall kit', { kitId, error: String(error) });
      return { success: false, kitId, error: String(error) };
    }
  }

  /**
   * Get target path for different agentic systems and content types
   */
  private getTargetPath(agenticSystem: AgenticSystemId, contentType: string): string {
    const basePaths: Record<AgenticSystemId, string> = {
      'generic': '.github/ai-ley',
      'githubCopilot': '.github/ai-ley',
      'claude': '.claude',
      'gemini': '.gemini',
      'cursor': '.cursor',
      'windsurf': '.windsurf',
      'cline': '.cline',
      'roo': '.roo',
      'codex': '.codex',
      'opencode': '.opencode',
      'metis': '.metis'
    };
    
    const basePath = basePaths[agenticSystem] || '.github/ai-ley';
    
    const subFolders: Record<string, string> = {
      'instruction': 'instructions',
      'persona': 'personas',
      'template': 'templates',
      'workflow': 'workflows',
      'config': 'config',
      'prompt': 'prompts',
      'tool': 'tools',
      'other': 'other'
    };
    
    const subFolder = subFolders[contentType] || 'other';
    
    return path.join(basePath, subFolder);
  }

  /**
   * Download and save a file from GitHub
   */
  private async downloadAndSaveFile(
    owner: string, 
    repo: string, 
    branch: string,
    filePath: string,
    targetDir: string
  ): Promise<boolean> {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      
      const response = await fetch(rawUrl);
      if (!response.ok) {
        logger.warn('File not found', { filePath, status: response.status });
        return false;
      }
      
      const content = await response.text();
      
      // Determine local target path
      const localPath = path.join(this.workspaceRoot, targetDir, path.basename(filePath));
      
      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Write file
      fs.writeFileSync(localPath, content, 'utf-8');
      logger.debug('Saved file', { from: filePath, to: localPath });
      
      return true;
    } catch (error) {
      logger.error('Failed to download file', { filePath, error: String(error) });
      return false;
    }
  }

  /**
   * Save installed kits marker file
   */
  private async saveInstalledKitsMarker(): Promise<void> {
    try {
      const markerPath = path.join(this.workspaceRoot, '.github', 'ai-ley', '.installed-kits.json');
      const dir = path.dirname(markerPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      const kits = Array.from(this.installedKits.values());
      fs.writeFileSync(markerPath, JSON.stringify(kits, null, 2), 'utf-8');
    } catch (error) {
      logger.error('Failed to save installed kits marker', { error: String(error) });
    }
  }

  /**
   * Refresh the kit catalog from all sources
   */
  public async refresh(): Promise<void> {
    await this.loadConfig();
    await this.scanInstalledKits();
    logger.info('AI Kit Loader refreshed');
  }
}
