// src/services/versionOverrideSystem.ts
import { Logger } from '../logger';
import { WorkspaceManager } from '../planning/workspaceManager';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Instruction source configuration
 */
export interface InstructionSource {
  id: string;
  name: string;
  type: 'local' | 'git' | 'url';
  location: string; // path, git URL, or HTTP URL
  branch?: string; // for git sources
  autoRefresh: boolean;
  refreshInterval: number; // seconds
  priority: number; // lower number = higher priority
  enabled: boolean;
}

/**
 * Version information for an instruction set
 */
export interface InstructionVersion {
  source: string;
  version: string;
  lastUpdated: Date;
  hash?: string;
  metadata?: Record<string, any>;
}

/**
 * Instruction set metadata
 */
export interface InstructionSet {
  id: string;
  name: string;
  description: string;
  version: InstructionVersion;
  files: string[];
  path: string;
}

/**
 * Version Override System
 * 
 * Manages instruction sets from multiple sources with version control and auto-refresh
 */
export class VersionOverrideSystem {
  private logger: Logger;
  private workspaceManager: WorkspaceManager;
  private sources: Map<string, InstructionSource> = new Map();
  private instructionSets: Map<string, InstructionSet> = new Map();
  private refreshTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private configPath: string;
  
  // Performance: Directory scan caching
  private scanCache: Map<string, { files: string[], timestamp: number }> = new Map();
  private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache TTL

  constructor(
    workspaceManager: WorkspaceManager,
    logger: Logger,
    options: {
      configPath?: string;
    } = {}
  ) {
    this.workspaceManager = workspaceManager;
    this.logger = logger;
    this.configPath = options.configPath || '.project/config/instruction-sources.json';

    this.logger.info('Version Override System initialized', {
      component: 'VersionOverrideSystem',
      configPath: this.configPath
    });
  }

  /**
   * Initialize the system by loading configuration
   */
  async initialize(): Promise<void> {
    try {
      await this.loadSourceConfiguration();
      await this.refreshAllSources();
      this.startAutoRefresh();

      this.logger.info('Version Override System ready', {
        component: 'VersionOverrideSystem',
        sourceCount: this.sources.size
      });
    } catch (error) {
      this.logger.error('Failed to initialize Version Override System', {
        component: 'VersionOverrideSystem',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Add a new instruction source
   */
  async addSource(source: InstructionSource): Promise<void> {
    this.sources.set(source.id, source);
    await this.saveSourceConfiguration();

    if (source.autoRefresh) {
      this.scheduleRefresh(source);
    }

    // Immediately fetch from the new source
    await this.refreshSource(source.id);

    this.logger.info('Instruction source added', {
      component: 'VersionOverrideSystem',
      sourceId: source.id,
      type: source.type
    });
  }

  /**
   * Remove an instruction source
   */
  async removeSource(sourceId: string): Promise<void> {
    const timer = this.refreshTimers.get(sourceId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(sourceId);
    }

    this.sources.delete(sourceId);
    await this.saveSourceConfiguration();

    this.logger.info('Instruction source removed', {
      component: 'VersionOverrideSystem',
      sourceId
    });
  }

  /**
   * Update source configuration
   */
  async updateSource(sourceId: string, updates: Partial<InstructionSource>): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    const updated = { ...source, ...updates };
    this.sources.set(sourceId, updated);
    await this.saveSourceConfiguration();

    // Restart auto-refresh if settings changed
    const timer = this.refreshTimers.get(sourceId);
    if (timer) {
      clearTimeout(timer);
    }

    if (updated.autoRefresh) {
      this.scheduleRefresh(updated);
    }

    this.logger.info('Instruction source updated', {
      component: 'VersionOverrideSystem',
      sourceId
    });
  }

  /**
   * Manually refresh a specific source
   */
  async refreshSource(sourceId: string): Promise<InstructionSet | null> {
    const source = this.sources.get(sourceId);
    if (!source || !source.enabled) {
      this.logger.warn('Source not found or disabled', {
        component: 'VersionOverrideSystem',
        sourceId
      });
      return null;
    }

    try {
      const instructionSet = await this.fetchInstructionsFromSource(source);
      
      if (instructionSet) {
        this.instructionSets.set(source.id, instructionSet);
        
        this.logger.info('Instructions refreshed from source', {
          component: 'VersionOverrideSystem',
          sourceId: source.id,
          version: instructionSet.version.version,
          fileCount: instructionSet.files.length
        });

        return instructionSet;
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to refresh source', {
        component: 'VersionOverrideSystem',
        sourceId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Refresh all sources
   */
  async refreshAllSources(): Promise<void> {
    const promises = Array.from(this.sources.keys()).map(sourceId => 
      this.refreshSource(sourceId)
    );

    await Promise.allSettled(promises);

    this.logger.info('All sources refreshed', {
      component: 'VersionOverrideSystem'
    });
  }

  /**
   * Get merged instruction set based on priority
   */
  getMergedInstructions(): InstructionSet | null {
    if (this.instructionSets.size === 0) {
      return null;
    }

    // Sort sources by priority
    const sortedSources = Array.from(this.sources.values())
      .filter(s => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    // Merge instruction sets by priority (higher priority overrides lower)
    const mergedFiles = new Map<string, string>();
    const versions: InstructionVersion[] = [];

    for (const source of sortedSources) {
      const instructionSet = this.instructionSets.get(source.id);
      if (!instructionSet) continue;

      // Add version info
      versions.push(instructionSet.version);

      // Merge files (later sources override earlier ones)
      instructionSet.files.forEach(file => {
        const fileName = path.basename(file);
        mergedFiles.set(fileName, file);
      });
    }

    if (mergedFiles.size === 0) {
      return null;
    }

    return {
      id: 'merged',
      name: 'Merged Instructions',
      description: 'Instructions merged from all sources by priority',
      version: {
        source: 'multiple',
        version: 'merged',
        lastUpdated: new Date(),
        metadata: { versions }
      },
      files: Array.from(mergedFiles.values()),
      path: ''
    };
  }

  /**
   * Get instruction set from specific source
   */
  getInstructionSet(sourceId: string): InstructionSet | undefined {
    return this.instructionSets.get(sourceId);
  }

  /**
   * List all sources
   */
  listSources(): InstructionSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * List all instruction sets
   */
  listInstructionSets(): InstructionSet[] {
    return Array.from(this.instructionSets.values());
  }

  /**
   * Fetch instructions from a source
   */
  private async fetchInstructionsFromSource(source: InstructionSource): Promise<InstructionSet | null> {
    switch (source.type) {
      case 'local':
        return this.fetchLocalInstructions(source);
      
      case 'git':
        return this.fetchGitInstructions(source);
      
      case 'url':
        return this.fetchUrlInstructions(source);
      
      default:
        throw new Error(`Unknown source type: ${(source as any).type}`);
    }
  }

  /**
   * Fetch instructions from local directory
   */
  private async fetchLocalInstructions(source: InstructionSource): Promise<InstructionSet> {
    const files = await this.scanDirectory(source.location, ['.md', '.txt', '.instructions']);
    
    return {
      id: source.id,
      name: source.name,
      description: `Local instructions from ${source.location}`,
      version: {
        source: source.id,
        version: 'local',
        lastUpdated: new Date()
      },
      files,
      path: source.location
    };
  }

  /**
   * Fetch instructions from git repository
   */
  private async fetchGitInstructions(source: InstructionSource): Promise<InstructionSet | null> {
    // This would require executing git commands or using a git library
    // For now, log a warning that it's not fully implemented
    this.logger.warn('Git source fetching not fully implemented', {
      component: 'VersionOverrideSystem',
      sourceId: source.id
    });

    // Placeholder: would clone/pull repo and scan for instruction files
    return null;
  }

  /**
   * Fetch instructions from URL
   */
  private async fetchUrlInstructions(source: InstructionSource): Promise<InstructionSet | null> {
    // This would fetch from a remote URL (e.g., GitHub API, REST endpoint)
    // For now, log a warning that it's not fully implemented
    this.logger.warn('URL source fetching not fully implemented', {
      component: 'VersionOverrideSystem',
      sourceId: source.id
    });

    // Placeholder: would fetch manifest and download instruction files
    return null;
  }

  /**
   * Scan directory for instruction files with caching
   */
  private async scanDirectory(dirPath: string, extensions: string[]): Promise<string[]> {
    // Resolve relative paths against workspace root
    let absolutePath = dirPath;
    if (!path.isAbsolute(dirPath)) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        this.logger.debug('No workspace root available for relative path', {
          component: 'VersionOverrideSystem',
          dirPath
        });
        return [];
      }
      absolutePath = path.join(workspaceRoot, dirPath);
    }

    // Check cache first
    const cacheKey = `${absolutePath}:${extensions.join(',')}`;
    const cached = this.scanCache.get(cacheKey);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      this.logger.debug('Using cached directory scan', {
        component: 'VersionOverrideSystem',
        dirPath: absolutePath,
        fileCount: cached.files.length
      });
      return cached.files;
    }

    const files: string[] = [];

    try {
      const entries = await vscode.workspace.fs.readDirectory(vscode.Uri.file(absolutePath));
      
      for (const [name, type] of entries) {
        const fullPath = path.join(absolutePath, name);
        
        if (type === vscode.FileType.Directory) {
          // Recursively scan subdirectories (pass absolute path)
          const subFiles = await this.scanDirectory(fullPath, extensions);
          files.push(...subFiles);
        } else if (type === vscode.FileType.File) {
          // Check if file has matching extension
          const ext = path.extname(name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
      
      // Cache the results
      this.scanCache.set(cacheKey, { files, timestamp: now });
      
      // Set up file watcher if not already watching
      if (!this.fileWatchers.has(absolutePath)) {
        this.watchDirectory(absolutePath, extensions);
      }
      
    } catch (error: any) {
      // Only log error if it's not ENOENT (missing directory is expected for optional paths)
      if (error.code !== 'ENOENT') {
        this.logger.error('Failed to scan directory', {
          component: 'VersionOverrideSystem',
          dirPath: absolutePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return files;
  }
  
  /**
   * Watch directory for changes to invalidate cache
   */
  private watchDirectory(dirPath: string, extensions: string[]): void {
    try {
      const pattern = new vscode.RelativePattern(dirPath, `**/*{${extensions.join(',')}}`);
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      
      const invalidateCache = () => {
        const cacheKey = `${dirPath}:${extensions.join(',')}`;
        this.scanCache.delete(cacheKey);
        this.logger.debug('Cache invalidated for directory', {
          component: 'VersionOverrideSystem',
          dirPath
        });
      };
      
      watcher.onDidCreate(invalidateCache);
      watcher.onDidChange(invalidateCache);
      watcher.onDidDelete(invalidateCache);
      
      this.fileWatchers.set(dirPath, watcher);
      
    } catch (error) {
      this.logger.warn('Failed to create file watcher', {
        component: 'VersionOverrideSystem',
        dirPath,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Schedule auto-refresh for a source
   */
  private scheduleRefresh(source: InstructionSource): void {
    const intervalMs = source.refreshInterval * 1000;
    
    const timer = setInterval(() => {
      this.refreshSource(source.id).catch(error => {
        this.logger.error('Auto-refresh failed', {
          component: 'VersionOverrideSystem',
          sourceId: source.id,
          error: error instanceof Error ? error.message : String(error)
        });
      });
    }, intervalMs);

    this.refreshTimers.set(source.id, timer);

    this.logger.debug('Auto-refresh scheduled', {
      component: 'VersionOverrideSystem',
      sourceId: source.id,
      intervalMs
    });
  }

  /**
   * Start auto-refresh for all enabled sources
   */
  private startAutoRefresh(): void {
    for (const source of this.sources.values()) {
      if (source.enabled && source.autoRefresh) {
        this.scheduleRefresh(source);
      }
    }
  }

  /**
   * Load source configuration from file
   */
  private async loadSourceConfiguration(): Promise<void> {
    try {
      const content = await this.workspaceManager.readFile(this.configPath);
      const config = JSON.parse(content);

      if (Array.isArray(config.sources)) {
        config.sources.forEach((source: InstructionSource) => {
          this.sources.set(source.id, source);
        });
      }

      this.logger.info('Source configuration loaded', {
        component: 'VersionOverrideSystem',
        sourceCount: this.sources.size
      });
    } catch (error) {
      // Check for file not found errors (UserError from WorkspaceManager or ENOENT from fs)
      const isFileNotFound = 
        (error as any)?.message?.includes('File not found') ||
        (error as any)?.code === 'ENOENT';
      
      if (isFileNotFound) {
        // Create default configuration
        this.logger.info('Config file not found, creating default configuration', {
          component: 'VersionOverrideSystem',
          configPath: this.configPath
        });
        await this.createDefaultConfiguration();
      } else {
        throw error;
      }
    }
  }

  /**
   * Save source configuration to file
   */
  private async saveSourceConfiguration(): Promise<void> {
    const config = {
      version: '1.0.0',
      sources: Array.from(this.sources.values())
    };

    await this.workspaceManager.writeFile(
      this.configPath,
      JSON.stringify(config, null, 2)
    );

    this.logger.debug('Source configuration saved', {
      component: 'VersionOverrideSystem'
    });
  }

  /**
   * Create default configuration
   */
  private async createDefaultConfiguration(): Promise<void> {
    // Ensure config directory exists
    const configDir = path.dirname(this.configPath);
    try {
      await this.workspaceManager.ensureDirectory(configDir);
    } catch (error) {
      this.logger.error('Failed to create config directory', {
        component: 'VersionOverrideSystem',
        path: configDir,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }

    const defaultSource: InstructionSource = {
      id: 'local-default',
      name: 'Local Instructions',
      type: 'local',
      location: '.github/ai-ley/instructions',
      autoRefresh: false,
      refreshInterval: 3600,
      priority: 1,
      enabled: true
    };

    this.sources.set(defaultSource.id, defaultSource);
    await this.saveSourceConfiguration();

    this.logger.info('Default source configuration created', {
      component: 'VersionOverrideSystem'
    });
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    // Clear all refresh timers
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
    
    // Dispose all file watchers
    for (const watcher of this.fileWatchers.values()) {
      watcher.dispose();
    }
    this.fileWatchers.clear();
    
    // Clear cache
    this.scanCache.clear();

    this.logger.info('Version Override System disposed', {
      component: 'VersionOverrideSystem'
    });
  }
}
