/**
 * Intake Loader Service
 * Discovers and loads intake form YAML configurations from .github/aicc/intakes/
 * Filters intakes based on agent selection (All_ prefix or Agent_ prefix)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '../logger';

const logger = Logger.getInstance();

export interface IntakeField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox' | 'date';
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    errorMessage?: string;
  };
  helpText?: string;
}

export interface IntakeConfig {
  name: string;
  displayName: string;
  description?: string;
  agent?: string;
  submitLabel?: string;
  cancelLabel?: string;
  fields: IntakeField[];
  metadata?: {
    id?: string;
    type?: string;
    [key: string]: any;
  };
}

export interface IntakeMetadata {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  agent: 'all' | 'agent';
  fileName: string;
}

export class IntakeLoaderService {
  private static instance: IntakeLoaderService;
  private intakes: Map<string, IntakeConfig> = new Map();
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  private constructor() {}

  public static getInstance(): IntakeLoaderService {
    if (!IntakeLoaderService.instance) {
      IntakeLoaderService.instance = new IntakeLoaderService();
    }
    return IntakeLoaderService.instance;
  }

  /**
   * Initialize the intake loader and discover all intake configurations
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    logger.info('Initializing Intake Loader Service');
    
    const intakesDir = path.join(workspaceRoot, '.github', 'aicc', 'intakes');
    
    // Load all intakes
    await this.loadIntakes(intakesDir);
    
    // Set up file watcher for hot reload
    this.setupFileWatcher(intakesDir);
    
    logger.info(`Intake Loader initialized with ${this.intakes.size} intakes`);
  }

  /**
   * Load all intake YAML files from the intakes directory
   */
  private async loadIntakes(intakesDir: string): Promise<void> {
    const intakesDirUri = vscode.Uri.file(intakesDir);
    
    try {
      const entries = await vscode.workspace.fs.readDirectory(intakesDirUri);
      
      for (const [fileName, fileType] of entries) {
        if (fileType === vscode.FileType.File && 
            (fileName.endsWith('.intake.yaml') || fileName.endsWith('.yaml')) &&
            !fileName.startsWith('_')) {
          
          const filePath = path.join(intakesDir, fileName);
          await this.loadIntake(filePath, fileName);
        }
      }
    } catch (error) {
      if ((error as vscode.FileSystemError).code === 'FileNotFound') {
        logger.warn('Intakes directory not found');
      } else {
        logger.error('Error loading intakes', { error: String(error) });
      }
    }
  }

  /**
   * Load a single intake configuration
   */
  private async loadIntake(filePath: string, fileName: string): Promise<IntakeConfig | null> {
    try {
      const fileUri = vscode.Uri.file(filePath);
      const content = await vscode.workspace.fs.readFile(fileUri);
      const intakeConfig = yaml.load(content.toString()) as IntakeConfig;
      
      if (this.validateIntakeConfig(intakeConfig)) {
        this.intakes.set(fileName, intakeConfig);
        logger.debug(`Loaded intake: ${intakeConfig.displayName} (${intakeConfig.name})`);
        return intakeConfig;
      } else {
        logger.warn(`Invalid intake configuration in ${filePath}`);
      }
    } catch (error) {
      logger.error(`Error loading intake from ${filePath}`, { error: String(error) });
    }
    return null;
  }

  /**
   * Validate intake configuration
   */
  private validateIntakeConfig(config: unknown): config is IntakeConfig {
    const cfg = config as IntakeConfig;
    return !!(
      cfg &&
      cfg.name &&
      cfg.displayName &&
      cfg.fields &&
      Array.isArray(cfg.fields)
    );
  }

  /**
   * Get intakes filtered by agent selection
   * @param agentMode 'all' or 'agent' based on current selection
   */
  public getIntakesForAgent(agentMode: 'all' | 'agent'): IntakeMetadata[] {
    const intakes: IntakeMetadata[] = [];
    
    for (const [fileName, config] of this.intakes) {
      const isAllIntake = fileName.startsWith('All_');
      const isAgentIntake = fileName.startsWith('Agent_');
      
      // Include intakes based on agent mode
      if (agentMode === 'all' && isAllIntake) {
        intakes.push(this.createIntakeMetadata(config, fileName, 'all'));
      } else if (agentMode === 'agent' && isAgentIntake) {
        intakes.push(this.createIntakeMetadata(config, fileName, 'agent'));
      } else if (!isAllIntake && !isAgentIntake) {
        // Intakes without prefix are available to both
        intakes.push(this.createIntakeMetadata(config, fileName, agentMode));
      }
    }
    
    return intakes;
  }

  /**
   * Create intake metadata from configuration
   */
  private createIntakeMetadata(config: IntakeConfig, fileName: string, agent: 'all' | 'agent'): IntakeMetadata {
    return {
      id: config.name,
      name: config.name,
      displayName: config.displayName,
      description: config.description,
      agent: agent,
      fileName: fileName
    };
  }

  /**
   * Get full intake configuration by name
   */
  public getIntakeConfig(intakeName: string): IntakeConfig | undefined {
    for (const [_, config] of this.intakes) {
      if (config.name === intakeName) {
        return config;
      }
    }
    return undefined;
  }

  /**
   * Get full intake configuration by filename
   */
  public getIntakeConfigByFilename(fileName: string): IntakeConfig | undefined {
    return this.intakes.get(fileName);
  }

  /**
   * Load full intake configuration by intake ID
   */
  public async loadIntakeConfig(intakeId: string): Promise<IntakeConfig | undefined> {
    // Try to find by ID first
    for (const [_, config] of this.intakes) {
      if (config.metadata?.id === intakeId || config.name === intakeId) {
        return config;
      }
    }
    
    // Try loading from file if not in cache
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return undefined;
    }
    
    const intakesDir = path.join(workspaceFolders[0].uri.fsPath, '.github', 'aicc', 'intakes');
    const files = await vscode.workspace.findFiles(
      new vscode.RelativePattern(intakesDir, '*.{intake.yaml,yaml}')
    );
    
    for (const file of files) {
      const fileName = path.basename(file.fsPath);
      if (!this.intakes.has(fileName)) {
        await this.loadIntake(file.fsPath, fileName);
      }
      
      const config = this.intakes.get(fileName);
      if (config && (config.metadata?.id === intakeId || config.name === intakeId)) {
        return config;
      }
    }
    
    return undefined;
  }

  /**
   * Set up file watcher for hot reload of intake configurations
   */
  private setupFileWatcher(intakesDir: string): void {
    const pattern = new vscode.RelativePattern(intakesDir, '*.{intake.yaml,yaml}');
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    
    this.fileWatcher.onDidChange(async (uri) => {
      logger.info(`Intake file changed: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      await this.loadIntake(uri.fsPath, fileName);
      this.notifyIntakeUpdate();
    });
    
    this.fileWatcher.onDidCreate(async (uri) => {
      logger.info(`Intake file created: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      await this.loadIntake(uri.fsPath, fileName);
      this.notifyIntakeUpdate();
    });
    
    this.fileWatcher.onDidDelete((uri) => {
      logger.info(`Intake file deleted: ${uri.fsPath}`);
      const fileName = path.basename(uri.fsPath);
      this.intakes.delete(fileName);
      this.notifyIntakeUpdate();
    });
  }

  /**
   * Notify that intakes have been updated (for webview refresh)
   */
  private notifyIntakeUpdate(): void {
    logger.debug('Intake configuration updated');
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
