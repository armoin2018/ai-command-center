/**
 * PLAN.json Generator Service
 * Consolidates planning data from .project/plan/epics/ hierarchy into PLAN.json
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import {
  PlanDocument,
  PlanItem,
  PlanItemType,
  PlanItemStatus,
  StatusCounts,
  PlanMetadata
} from '../types/plan';
import { Logger } from '../logger';
import { PlanArchivalService } from './planArchivalService';

const logger = Logger.getInstance();

export class PlanGenerator {
  private static instance: PlanGenerator;
  private planDocument: PlanDocument | null = null;
  private workspaceRoot: string = '';
  private fileWatcher: vscode.FileSystemWatcher | null = null;

  /**
   * R-ARCH-020: In-memory Map<string, PlanItem> index providing O(1) lookup by ID.
   * Rebuilt from PLAN.json on activation (loadPlanDocument / generatePlan).
   */
  private itemIndex: Map<string, PlanItem> = new Map();

  private constructor() {}

  public static getInstance(): PlanGenerator {
    if (!PlanGenerator.instance) {
      PlanGenerator.instance = new PlanGenerator();
    }
    return PlanGenerator.instance;
  }

  /**
   * Initialize the plan generator
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    this.workspaceRoot = workspaceRoot;
    logger.info('Initializing Plan Generator');
    
    // Load existing PLAN.json (do not auto-regenerate from source files)
    await this.loadPlanDocument();
    
    // File watcher disabled - PLAN.json is the source of truth
    // Sync process will be implemented in a future update
    // this.setupFileWatcher();
    
    logger.info('Plan Generator initialized - using PLAN.json as source of truth');
  }

  /**
   * Generate PLAN.json from the epics directory structure
   */
  public async generatePlan(): Promise<PlanDocument> {
    const epicsDir = path.join(this.workspaceRoot, '.project', 'plan', 'epics');
    const items: PlanItem[] = [];
    
    try {
      // Scan epics directory
      const epicDirs = await this.readDirectory(epicsDir);
      
      for (const epicDir of epicDirs) {
        if (!epicDir.endsWith('/')) continue;
        
        const epicPath = path.join(epicsDir, epicDir);
        const epic = await this.parseEpic(epicPath, epicDir.replace('/', ''));
        
        if (epic) {
          items.push(epic);
          
          // Scan stories in this epic
          const storyDirs = await this.readDirectory(epicPath);
          
          for (const storyDir of storyDirs) {
            if (!storyDir.endsWith('/') || !storyDir.startsWith('story-')) continue;
            
            const storyPath = path.join(epicPath, storyDir);
            const story = await this.parseStory(storyPath, storyDir.replace('/', ''), epic.id);
            
            if (story) {
              items.push(story);
              epic.children = epic.children || [];
              epic.children.push(story.id);
              
              // Scan tasks and bugs in this story
              const taskFiles = await this.readDirectory(storyPath);
              
              for (const taskFile of taskFiles) {
                if (taskFile.endsWith('/') || !taskFile.endsWith('.md')) continue;
                if (taskFile === 'README.md') continue;
                
                const taskPath = path.join(storyPath, taskFile);
                const item = await this.parseTaskOrBug(taskPath, story.id);
                
                if (item) {
                  items.push(item);
                  story.children = story.children || [];
                  story.children.push(item.id);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      logger.warn(`Epics directory not found or empty: ${epicsDir}`);
    }
    
    // Calculate status counts
    const statusCounts = this.calculateStatusCounts(items);
    
    // Load metadata to get project code
    const metadata = await this.loadProjectMetadata();
    
    // Add projectNumber to each item using projectCode (e.g., AICC-0001)
    if (metadata.projectCode) {
      let counter = 1;
      for (const _item of items) {
        // Project number is displayed using metadata.projectCode + item.id
        counter++;
      }
    }
    
    // Build document
    this.planDocument = {
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: '.project/plan/epics',
      metadata,
      statusCounts,
      items
    };
    
    // R-ARCH-020: Rebuild index
    this.rebuildIndex();
    
    // Save PLAN.json
    await this.savePlanDocument();
    
    return this.planDocument;
  }

  /**
   * Parse an epic from its directory
   */
  private async parseEpic(epicPath: string, dirName: string): Promise<PlanItem | null> {
    const readmePath = path.join(epicPath, 'README.md');
    
    try {
      const content = await this.readFile(readmePath);
      return this.parseMarkdownItem(content, 'epic', readmePath);
    } catch {
      // Try to infer from directory name
      const epicNum = dirName.match(/epic-(\d+)/)?.[1] || '000';
      return {
        id: `EPIC-${epicNum}`,
        type: 'epic',
        summary: dirName.replace('epic-', '').replace(/-/g, ' '),
        status: 'BACKLOG'
      };
    }
  }

  /**
   * Parse a story from its directory
   */
  private async parseStory(storyPath: string, dirName: string, parentId: string): Promise<PlanItem | null> {
    const readmePath = path.join(storyPath, 'README.md');
    
    try {
      const content = await this.readFile(readmePath);
      const story = this.parseMarkdownItem(content, 'story', readmePath);
      if (story) {
        story.parentId = parentId;
      }
      return story;
    } catch {
      // Infer from directory name
      const nums = dirName.match(/story-(\d+)/)?.[1] || '000';
      const parentNum = parentId.replace('EPIC-', '');
      return {
        id: `STORY-${parentNum}-${nums}`,
        type: 'story',
        summary: dirName.replace('story-', '').replace(/-/g, ' '),
        status: 'BACKLOG',
        parentId: parentId
      };
    }
  }

  /**
   * Parse a task or bug from a markdown file
   */
  private async parseTaskOrBug(filePath: string, parentId: string): Promise<PlanItem | null> {
    try {
      const content = await this.readFile(filePath);
      const fileName = path.basename(filePath, '.md');
      const type: PlanItemType = fileName.toLowerCase().includes('bug') ? 'bug' : 'task';
      
      const item = this.parseMarkdownItem(content, type, filePath);
      if (item) {
        item.parentId = parentId;
      }
      return item;
    } catch {
      return null;
    }
  }

  /**
   * Parse markdown content to extract item metadata
   */
  private parseMarkdownItem(content: string, type: PlanItemType, sourcePath: string): PlanItem | null {
    try {
      // Try to extract YAML frontmatter
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let metadata: Record<string, unknown> = {};
      
      if (frontmatterMatch) {
        metadata = yaml.load(frontmatterMatch[1]) as Record<string, unknown>;
      }
      
      // Extract title from first heading
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const summary = (metadata.title as string) || titleMatch?.[1] || path.basename(sourcePath, '.md');
      
      // Extract ID from metadata or generate
      const id = (metadata.id as string) || this.generateId(type, sourcePath);
      
      // Extract status
      const status = this.normalizeStatus((metadata.status as string) || 'backlog');
      
      // Extract description
      const descMatch = content.match(/## (Description|Overview)\n\n([\s\S]*?)(?=\n##|$)/i);
      const description = descMatch?.[2]?.trim() || '';
      
      return {
        id,
        type,
        summary,
        description,
        status,
        priority: (metadata.priority as 'critical' | 'high' | 'medium' | 'low') || 'medium',
        storyPoints: metadata.storyPoints as number,
        assignee: metadata.assignee as string,
        agent: metadata.agent as 'Architect' | 'Orchestrator' | 'Developer' | 'Reviewer' | 'Tester' | 'Any',
        instructions: metadata.instructions as string[],
        personas: metadata.personas as string[],
        sprint: metadata.sprint as string,
        milestone: metadata.milestone as string,
        tags: metadata.labels as string[],
        metadata: {
          createdAt: (metadata.createdAt as string) || new Date().toISOString(),
          updatedAt: (metadata.updatedAt as string) || new Date().toISOString(),
          createdBy: (metadata.createdBy as string) || 'system',
          updatedBy: (metadata.updatedBy as string) || 'system',
          phase: metadata.phase as string
        }
      };
    } catch (error) {
      logger.warn(`Error parsing markdown item: ${sourcePath}`, { error: String(error) });
      return null;
    }
  }

  /**
   * Generate an ID for an item based on type and path
   */
  private generateId(type: PlanItemType, sourcePath: string): string {
    const parts = sourcePath.split(path.sep);
    const prefix = type.toUpperCase();
    
    // Try to extract numbers from path
    const epicMatch = parts.find(p => p.startsWith('epic-'))?.match(/\d+/)?.[0] || '001';
    const storyMatch = parts.find(p => p.startsWith('story-'))?.match(/\d+/)?.[0];
    const taskMatch = path.basename(sourcePath, '.md').match(/\d+/)?.[0];
    
    if (type === 'epic') {
      return `EPIC-${epicMatch.padStart(3, '0')}`;
    } else if (type === 'story') {
      return `STORY-${epicMatch.padStart(3, '0')}-${(storyMatch || '001').padStart(3, '0')}`;
    } else {
      const storyNum = storyMatch || '001';
      const taskNum = taskMatch || '001';
      return `${prefix}-${epicMatch.padStart(3, '0')}-${storyNum.padStart(3, '0')}-${taskNum.padStart(3, '0')}`;
    }
  }

  /**
   * Normalize status values
   */
  private normalizeStatus(status: string): PlanItemStatus {
    const statusMap: Record<string, PlanItemStatus> = {
      'backlog': 'BACKLOG',
      'todo': 'BACKLOG',
      'not started': 'BACKLOG',
      'not-started': 'BACKLOG',
      'ready': 'READY',
      'ready for development': 'READY',
      'in progress': 'IN-PROGRESS',
      'in-progress': 'IN-PROGRESS',
      'active': 'IN-PROGRESS',
      'blocked': 'BLOCKED',
      'review': 'REVIEW',
      'in review': 'REVIEW',
      'testing': 'REVIEW',
      'done': 'DONE',
      'complete': 'DONE',
      'completed': 'DONE',
      'closed': 'DONE'
    };
    
    return statusMap[status.toLowerCase()] || 'backlog';
  }

  /**
   * Calculate status counts from items
   */
  private calculateStatusCounts(items: PlanItem[]): StatusCounts {
    const counts: StatusCounts = {
      BACKLOG: 0,
      READY: 0,
      'IN-PROGRESS': 0,
      BLOCKED: 0,
      REVIEW: 0,
      DONE: 0,
      SKIP: 0
    };
    
    for (const item of items) {
      if (item.status in counts) {
        counts[item.status]++;
      }
    }
    
    return counts;
  }

  /**
   * Load project metadata from settings.json
   */
  private async loadProjectMetadata(): Promise<PlanMetadata> {
    // Try settings.json first
    const settingsPath = path.join(this.workspaceRoot, '.project', 'settings.json');
    
    try {
      const content = await this.readFile(settingsPath);
      const settings = JSON.parse(content);
      return {
        projectName: settings.project?.name,
        projectCode: settings.project?.code,
        currentSprint: settings.project?.currentSprint,
        currentMilestone: settings.project?.currentMilestone,
        defaultAssignee: settings.project?.defaultAssignee,
        defaultAgent: settings.project?.defaultAgent
      };
    } catch {
      // Fallback to metadata.yaml
      const metadataPath = path.join(this.workspaceRoot, '.project', 'metadata.yaml');
      try {
        const content = await this.readFile(metadataPath);
        return yaml.load(content) as PlanMetadata;
      } catch {
        return {};
      }
    }
  }

  /**
   * Load PLAN.json from disk
   */
  public async loadPlanDocument(): Promise<void> {
    const planPath = path.join(this.workspaceRoot, '.project', 'PLAN.json');
    
    try {
      const content = await this.readFile(planPath);
      this.planDocument = JSON.parse(content);
      this.rebuildIndex();
      logger.info(`PLAN.json loaded with ${this.planDocument?.items.length || 0} items (index: ${this.itemIndex.size} entries)`);
    } catch (error) {
      logger.info('PLAN.json not found, generating from source files (expected on first run)');
      // Only generate if PLAN.json doesn't exist
      await this.generatePlan();
    }
  }

  /**
   * Save PLAN.json to disk
   */
  /**
   * Save plan document to file (public for external updates)
   * Uses atomic write: writes to .tmp then renames, with .bak backup
   */
  public async savePlanDocument(): Promise<void> {
    if (!this.planDocument) return;
    
    const planPath = path.join(this.workspaceRoot, '.project', 'PLAN.json');
    const tmpPath = planPath + '.tmp';
    const bakPath = planPath + '.bak';
    const content = JSON.stringify(this.planDocument, null, 2);
    
    try {
      // Ensure directory exists
      const dir = path.dirname(planPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Create backup if file exists
      if (fs.existsSync(planPath)) {
        fs.copyFileSync(planPath, bakPath);
      }

      // Write to temp file first
      fs.writeFileSync(tmpPath, content, 'utf-8');

      // Atomic rename
      fs.renameSync(tmpPath, planPath);

      logger.info(`PLAN.json saved with ${this.planDocument.items.length} items`);
    } catch (error) {
      logger.error('Error saving PLAN.json', { error: String(error) });
    }
  }

  /**
   * Update a plan item by ID.
   * If the status transitions to DONE or SKIP, the item is automatically archived to PLAN-HISTORY.json.
   */
  public async updatePlanItem(
    id: string,
    updates: Partial<PlanItem>
  ): Promise<PlanItem | undefined> {
    if (!this.planDocument) return undefined;

    // R-ARCH-020: O(1) lookup via Map index
    const item = this.itemIndex.get(id);
    if (!item) {
      logger.warn(`updatePlanItem: item not found: ${id}`);
      return undefined;
    }
    const previousStatus = item.status;

    // Apply updates
    Object.assign(item, updates);

    // Update metadata timestamp
    if (item.metadata) {
      item.metadata.updatedAt = new Date().toISOString();
    }

    // Auto-archive on terminal status transitions
    if (
      updates.status &&
      (updates.status === 'DONE' || updates.status === 'SKIP') &&
      previousStatus !== updates.status
    ) {
      try {
        const archivalService = PlanArchivalService.getInstance();
        archivalService.initialize(this.workspaceRoot);
        await archivalService.archiveToHistory(item, 'status-transition', previousStatus);
        logger.info(`Item ${id} archived to history on status transition: ${previousStatus} → ${updates.status}`);
      } catch (error) {
        logger.error(`Failed to archive item ${id} to history`, { error: String(error) });
      }
    }

    // Recalculate status counts
    this.planDocument.statusCounts = this.calculateStatusCounts(this.planDocument.items);

    // Save plan
    await this.savePlanDocument();

    return item;
  }

  /**
   * Create a new plan item and add it to the plan document.
   */
  public async createPlanItem(item: PlanItem): Promise<PlanItem> {
    if (!this.planDocument) {
      throw new Error('Plan document not loaded');
    }

    // Set metadata defaults
    if (!item.metadata) {
      item.metadata = {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'system',
        updatedBy: 'system'
      };
    }

    this.planDocument.items.push(item);
    this.itemIndex.set(item.id, item);

    // Recalculate status counts
    this.planDocument.statusCounts = this.calculateStatusCounts(this.planDocument.items);

    await this.savePlanDocument();

    logger.info(`Plan item created: ${item.id}`, { type: item.type, status: item.status });

    return item;
  }

  /**
   * Set up file watcher for auto-regeneration
   */
  // @ts-ignore TS6133: kept for future use (see constructor)
  private setupFileWatcher(): void {
    const epicsPattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '.project/plan/epics/**/*.md'
    );
    
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(epicsPattern);
    
    const debounceRegenerate = this.debounce(() => this.generatePlan(), 1000);
    
    this.fileWatcher.onDidChange(debounceRegenerate);
    this.fileWatcher.onDidCreate(debounceRegenerate);
    this.fileWatcher.onDidDelete(debounceRegenerate);
  }

  /**
   * Debounce helper
   */
  private debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  /**
   * Read directory contents
   */
  private async readDirectory(dirPath: string): Promise<string[]> {
    const dirUri = vscode.Uri.file(dirPath);
    const entries = await vscode.workspace.fs.readDirectory(dirUri);
    return entries.map(([name, type]) => 
      type === vscode.FileType.Directory ? `${name}/` : name
    );
  }

  /**
   * Read file contents
   */
  private async readFile(filePath: string): Promise<string> {
    const fileUri = vscode.Uri.file(filePath);
    const content = await vscode.workspace.fs.readFile(fileUri);
    return content.toString();
  }

  /**
   * Get the current plan document
   */
  public getPlanDocument(): PlanDocument | null {
    return this.planDocument;
  }

  /**
   * Get items by filter
   */
  public getItems(filter?: {
    type?: PlanItemType;
    status?: PlanItemStatus[];
    parent?: string;
  }): PlanItem[] {
    if (!this.planDocument) return [];
    
    let items = this.planDocument.items;
    
    if (filter?.type) {
      items = items.filter(item => item.type === filter.type);
    }
    
    if (filter?.status?.length) {
      items = items.filter(item => filter.status!.includes(item.status));
    }
    
    if (filter?.parent) {
      items = items.filter(item => item.parentId === filter.parent);
    }
    
    return items;
  }

  /**
   * Get a single item by ID
   */
  /**
   * R-ARCH-020: O(1) item lookup by ID via in-memory Map index
   */
  public getItem(id: string): PlanItem | undefined {
    return this.itemIndex.get(id);
  }

  /**
   * R-ARCH-020: Rebuild the in-memory Map<string, PlanItem> index from planDocument.items
   */
  private rebuildIndex(): void {
    this.itemIndex.clear();
    if (this.planDocument?.items) {
      for (const item of this.planDocument.items) {
        this.itemIndex.set(item.id, item);
      }
    }
  }

  /**
   * Get status counts
   */
  public getStatusCounts(): StatusCounts | null {
    return this.planDocument?.statusCounts || null;
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
    this.planDocument = null;
    this.itemIndex.clear();
  }
}
