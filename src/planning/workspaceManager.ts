import * as path from 'path';
import * as fs from 'fs/promises';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { ErrorHandler } from '../errorHandler';
import { SystemError, UserError } from '../errors/customErrors';
import { IPlanData } from './types';

/**
 * WorkspaceManager - Handles atomic file operations and directory management.
 * Provides safe, transactional file system operations with rollback capabilities.
 */
export class WorkspaceManager {
    private logger: Logger;
    private workspaceRoot: string;
    private planPath: string;
    private planFilePath: string;
    private fileWatcher: vscode.FileSystemWatcher | null = null;

    constructor(workspaceRoot: string, logger: Logger) {
        this.logger = logger;
        this.workspaceRoot = workspaceRoot;
        
        const config = ConfigManager.getInstance().getConfig();
        this.planPath = path.join(workspaceRoot, config.planning.planPath);
        this.planFilePath = path.join(workspaceRoot, '.project', 'PLAN.json');
    }

    // ========== ATOMIC WRITE OPERATIONS ==========

    /**
     * Atomically write content to a file using a temporary file + rename strategy.
     * This ensures the file is either fully written or not written at all (no partial writes).
     */
    public async atomicWrite(filePath: string, content: string): Promise<void> {
        const startTime = performance.now();
        const tempPath = `${filePath}.tmp`;

        try {
            // Ensure parent directory exists
            const dir = path.dirname(filePath);
            await this.ensureDirectory(dir);

            // Write to temporary file
            await fs.writeFile(tempPath, content, 'utf8');

            // Atomically rename temp file to target file
            await fs.rename(tempPath, filePath);

            const duration = performance.now() - startTime;
            this.logger.debug('Atomic write completed', {
                component: 'WorkspaceManager',
                filePath,
                size: content.length,
                duration
            });

        } catch (error) {
            // Cleanup temp file if it exists
            try {
                await fs.unlink(tempPath);
            } catch {
                // Ignore cleanup errors
            }

            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.atomicWrite'
            );
            throw new SystemError(
                `Failed to write file: ${filePath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Atomically update a file by reading, transforming, and writing.
     * Uses a transformation function to modify content safely.
     */
    public async atomicUpdate(
        filePath: string,
        transformer: (content: string) => string | Promise<string>
    ): Promise<void> {
        try {
            // Read current content
            const currentContent = await this.readFile(filePath);

            // Transform content
            const newContent = await transformer(currentContent);

            // Atomically write new content
            await this.atomicWrite(filePath, newContent);

            this.logger.debug('Atomic update completed', {
                component: 'WorkspaceManager',
                filePath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.atomicUpdate'
            );
            throw error;
        }
    }

    /**
     * Batch atomic writes - writes multiple files in sequence.
     * If any write fails, previous writes are NOT rolled back (fire-and-forget).
     * For transactional batch writes, use transactionalBatchWrite().
     */
    public async batchWrite(writes: Array<{ path: string; content: string }>): Promise<void> {
        const startTime = performance.now();

        try {
            for (const write of writes) {
                await this.atomicWrite(write.path, write.content);
            }

            const duration = performance.now() - startTime;
            this.logger.info('Batch write completed', {
                component: 'WorkspaceManager',
                fileCount: writes.length,
                duration
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.batchWrite'
            );
            throw error;
        }
    }

    // ========== FILE READ OPERATIONS ==========

    /**
     * Read file content safely with error handling.
     */
    public async readFile(filePath: string): Promise<string> {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            
            this.logger.debug('File read', {
                component: 'WorkspaceManager',
                filePath,
                size: content.length
            });

            return content;

        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                throw new UserError(`File not found: ${filePath}`);
            }
            
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.readFile'
            );
            throw new SystemError(
                `Failed to read file: ${filePath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Read JSON file and parse it.
     */
    public async readJson<T>(filePath: string): Promise<T> {
        try {
            const content = await this.readFile(filePath);
            const data = JSON.parse(content) as T;

            this.logger.debug('JSON file read', {
                component: 'WorkspaceManager',
                filePath
            });

            return data;

        } catch (error) {
            if (error instanceof UserError) {
                throw error;
            }
            
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.readJson'
            );
            throw new SystemError(
                `Failed to parse JSON file: ${filePath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Check if file exists.
     */
    public async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // ========== DIRECTORY MANAGEMENT ==========

    /**
     * Ensure directory exists, create if it doesn't (recursive).
     */
    public async ensureDirectory(dirPath: string): Promise<void> {
        try {
            await fs.mkdir(dirPath, { recursive: true });

            this.logger.debug('Directory ensured', {
                component: 'WorkspaceManager',
                dirPath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.ensureDirectory'
            );
            throw new SystemError(
                `Failed to create directory: ${dirPath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * List directory contents with filtering options.
     */
    public async listDirectory(
        dirPath: string,
        options?: {
            filesOnly?: boolean;
            directoriesOnly?: boolean;
            pattern?: RegExp;
        }
    ): Promise<string[]> {
        try {
            const entries = await fs.readdir(dirPath, { withFileTypes: true });

            let filtered = entries;

            if (options?.filesOnly) {
                filtered = filtered.filter(entry => entry.isFile());
            }

            if (options?.directoriesOnly) {
                filtered = filtered.filter(entry => entry.isDirectory());
            }

            if (options?.pattern) {
                filtered = filtered.filter(entry => options.pattern!.test(entry.name));
            }

            const names = filtered.map(entry => entry.name);

            this.logger.debug('Directory listed', {
                component: 'WorkspaceManager',
                dirPath,
                count: names.length
            });

            return names;

        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return []; // Directory doesn't exist, return empty array
            }
            
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.listDirectory'
            );
            throw new SystemError(
                `Failed to list directory: ${dirPath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Recursively delete directory.
     */
    public async deleteDirectory(dirPath: string): Promise<void> {
        try {
            await fs.rm(dirPath, { recursive: true, force: true });

            this.logger.info('Directory deleted', {
                component: 'WorkspaceManager',
                dirPath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.deleteDirectory'
            );
            throw new SystemError(
                `Failed to delete directory: ${dirPath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Rename/move directory.
     */
    public async renameDirectory(oldPath: string, newPath: string): Promise<void> {
        try {
            await fs.rename(oldPath, newPath);

            this.logger.info('Directory renamed', {
                component: 'WorkspaceManager',
                oldPath,
                newPath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.renameDirectory'
            );
            throw new SystemError(
                `Failed to rename directory: ${oldPath} -> ${newPath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Copy directory recursively.
     */
    public async copyDirectory(sourcePath: string, destPath: string): Promise<void> {
        try {
            await fs.cp(sourcePath, destPath, { recursive: true });

            this.logger.info('Directory copied', {
                component: 'WorkspaceManager',
                sourcePath,
                destPath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.copyDirectory'
            );
            throw new SystemError(
                `Failed to copy directory: ${sourcePath} -> ${destPath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    // ========== FILE WATCHING ==========

    /**
     * Start watching the planning directory for changes.
     */
    public startFileWatcher(
        onChange: (uri: vscode.Uri, changeType: 'created' | 'changed' | 'deleted') => void
    ): void {
        if (this.fileWatcher) {
            this.logger.warn('File watcher already started', { component: 'WorkspaceManager' });
            return;
        }

        const pattern = new vscode.RelativePattern(this.planPath, '**/*');
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.fileWatcher.onDidCreate((uri) => {
            this.logger.debug('File created', { component: 'WorkspaceManager', uri: uri.fsPath });
            onChange(uri, 'created');
        });

        this.fileWatcher.onDidChange((uri) => {
            this.logger.debug('File changed', { component: 'WorkspaceManager', uri: uri.fsPath });
            onChange(uri, 'changed');
        });

        this.fileWatcher.onDidDelete((uri) => {
            this.logger.debug('File deleted', { component: 'WorkspaceManager', uri: uri.fsPath });
            onChange(uri, 'deleted');
        });

        this.logger.info('File watcher started', {
            component: 'WorkspaceManager',
            watchPath: this.planPath
        });
    }

    /**
     * Stop file watching.
     */
    public stopFileWatcher(): void {
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;

            this.logger.info('File watcher stopped', { component: 'WorkspaceManager' });
        }
    }

    // ========== UTILITY METHODS ==========

    /**
     * Get absolute path relative to workspace root.
     */
    public getAbsolutePath(relativePath: string): string {
        return path.join(this.workspaceRoot, relativePath);
    }

    /**
     * Get relative path from workspace root.
     */
    public getRelativePath(absolutePath: string): string {
        return path.relative(this.workspaceRoot, absolutePath);
    }

    /**
     * Get planning directory path.
     */
    public getPlanPath(): string {
        return this.planPath;
    }

    /**
     * Load plan data from .project/PLAN.json
     */
    public async loadPlanData(): Promise<IPlanData | null> {
        try {
            const planExists = await this.fileExists(this.planFilePath);
            if (!planExists) {
                this.logger.info('PLAN.json not found (expected on first run)', {
                    component: 'WorkspaceManager',
                    path: this.planFilePath
                });
                return null;
            }

            const planData = await this.readJson<IPlanData>(this.planFilePath);

            this.logger.info('Plan data loaded', {
                component: 'WorkspaceManager',
                itemCount: planData.items.length,
                projectName: planData.metadata.projectName
            });

            return planData;

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.loadPlanData'
            );
            throw new SystemError(
                `Failed to load plan data from ${this.planFilePath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Save plan data to .project/PLAN.json
     */
    public async savePlanData(planData: IPlanData): Promise<void> {
        try {
            // Ensure .project directory exists
            const projectDir = path.dirname(this.planFilePath);
            await this.ensureDirectory(projectDir);

            // Update timestamp
            planData.metadata.updatedAt = new Date().toISOString();

            // Atomically write the plan data
            const content = JSON.stringify(planData, null, 2);
            await this.atomicWrite(this.planFilePath, content);

            this.logger.info('Plan data saved', {
                component: 'WorkspaceManager',
                itemCount: planData.items.length
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.savePlanData'
            );
            throw new SystemError(
                `Failed to save plan data to ${this.planFilePath}`,
                error instanceof Error ? error : undefined
            );
        }
    }

    /**
     * Initialize planning directory structure.
     */
    public async initializePlanningStructure(): Promise<void> {
        try {
            await this.ensureDirectory(this.planPath);
            await this.ensureDirectory(path.join(this.planPath, 'epics'));
            await this.ensureDirectory(path.join(this.planPath, 'sprints'));
            await this.ensureDirectory(path.join(this.planPath, 'templates'));

            this.logger.info('Planning structure initialized', {
                component: 'WorkspaceManager',
                planPath: this.planPath
            });

        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                'WorkspaceManager.initializePlanningStructure'
            );
            throw error;
        }
    }

    /**
     * Cleanup - dispose resources.
     */
    public dispose(): void {
        this.stopFileWatcher();
        this.logger.debug('WorkspaceManager disposed', { component: 'WorkspaceManager' });
    }

    /**
     * Write file (alias for atomicWrite for compatibility)
     */
    public async writeFile(filePath: string, content: string): Promise<void> {
        return this.atomicWrite(filePath, content);
    }
}
