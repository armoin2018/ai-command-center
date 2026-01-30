/**
 * File Operations for Init Toolset
 * 
 * Provides copy, move, link, create operations with undo support
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

export interface OperationResult {
    success: boolean;
    action: string;
    target: string;
    source?: string;
    error?: string;
    backupPath?: string;
}

export interface OperationLog {
    timestamp: string;
    action: string;
    source?: string;
    target: string;
    success: boolean;
    backupPath?: string;
    error?: string;
}

export class FileOperations {
    private logger: Logger;
    private workspacePath: string;
    private operationLog: OperationLog[] = [];

    constructor(workspacePath: string, logger: Logger) {
        this.workspacePath = workspacePath;
        this.logger = logger;
    }

    /**
     * Copy file or directory
     */
    async copy(source: string, target: string, overwrite: boolean = false): Promise<OperationResult> {
        const absoluteSource = path.resolve(this.workspacePath, source);
        const absoluteTarget = path.resolve(this.workspacePath, target);

        try {
            // Check if source exists
            if (!fs.existsSync(absoluteSource)) {
                throw new Error(`Source not found: ${source}`);
            }

            // Check if target exists
            if (fs.existsSync(absoluteTarget) && !overwrite) {
                throw new Error(`Target already exists: ${target}. Set overwrite: true to replace`);
            }

            let backupPath: string | undefined;

            // Create backup if overwriting
            if (fs.existsSync(absoluteTarget) && overwrite) {
                backupPath = await this.createBackup(absoluteTarget);
            }

            // Ensure target directory exists
            const targetDir = path.dirname(absoluteTarget);
            await fs.promises.mkdir(targetDir, { recursive: true });

            // Check if source is directory
            const stats = await fs.promises.stat(absoluteSource);
            if (stats.isDirectory()) {
                await this.copyDirectory(absoluteSource, absoluteTarget);
            } else {
                await fs.promises.copyFile(absoluteSource, absoluteTarget);
            }

            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'copy',
                source,
                target,
                success: true,
                backupPath
            });

            this.logger.info('File copied successfully', {
                component: 'FileOperations',
                source,
                target
            });

            return { success: true, action: 'copy', source, target, backupPath };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'copy',
                source,
                target,
                success: false,
                error: errorMessage
            });

            this.logger.error('Copy operation failed', {
                component: 'FileOperations',
                source,
                target,
                error: errorMessage
            });

            return { success: false, action: 'copy', source, target, error: errorMessage };
        }
    }

    /**
     * Move file or directory
     */
    async move(source: string, target: string, overwrite: boolean = false): Promise<OperationResult> {
        const absoluteSource = path.resolve(this.workspacePath, source);
        const absoluteTarget = path.resolve(this.workspacePath, target);

        try {
            // Check if source exists
            if (!fs.existsSync(absoluteSource)) {
                throw new Error(`Source not found: ${source}`);
            }

            // Check if target exists
            if (fs.existsSync(absoluteTarget) && !overwrite) {
                throw new Error(`Target already exists: ${target}. Set overwrite: true to replace`);
            }

            let backupPath: string | undefined;

            // Create backup if overwriting
            if (fs.existsSync(absoluteTarget) && overwrite) {
                backupPath = await this.createBackup(absoluteTarget);
            }

            // Ensure target directory exists
            const targetDir = path.dirname(absoluteTarget);
            await fs.promises.mkdir(targetDir, { recursive: true });

            // Move file or directory
            await fs.promises.rename(absoluteSource, absoluteTarget);

            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'move',
                source,
                target,
                success: true,
                backupPath
            });

            this.logger.info('File moved successfully', {
                component: 'FileOperations',
                source,
                target
            });

            return { success: true, action: 'move', source, target, backupPath };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'move',
                source,
                target,
                success: false,
                error: errorMessage
            });

            this.logger.error('Move operation failed', {
                component: 'FileOperations',
                source,
                target,
                error: errorMessage
            });

            return { success: false, action: 'move', source, target, error: errorMessage };
        }
    }

    /**
     * Create symbolic link
     */
    async link(source: string, target: string, overwrite: boolean = false): Promise<OperationResult> {
        const absoluteSource = path.resolve(this.workspacePath, source);
        const absoluteTarget = path.resolve(this.workspacePath, target);

        try {
            // Check if source exists
            if (!fs.existsSync(absoluteSource)) {
                throw new Error(`Source not found: ${source}`);
            }

            // Check if target exists
            if (fs.existsSync(absoluteTarget) && !overwrite) {
                throw new Error(`Target already exists: ${target}. Set overwrite: true to replace`);
            }

            let backupPath: string | undefined;

            // Create backup if overwriting
            if (fs.existsSync(absoluteTarget) && overwrite) {
                backupPath = await this.createBackup(absoluteTarget);
            }

            // Ensure target directory exists
            const targetDir = path.dirname(absoluteTarget);
            await fs.promises.mkdir(targetDir, { recursive: true });

            // Create symbolic link
            await fs.promises.symlink(absoluteSource, absoluteTarget);

            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'link',
                source,
                target,
                success: true,
                backupPath
            });

            this.logger.info('Link created successfully', {
                component: 'FileOperations',
                source,
                target
            });

            return { success: true, action: 'link', source, target, backupPath };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'link',
                source,
                target,
                success: false,
                error: errorMessage
            });

            this.logger.error('Link operation failed', {
                component: 'FileOperations',
                source,
                target,
                error: errorMessage
            });

            return { success: false, action: 'link', source, target, error: errorMessage };
        }
    }

    /**
     * Create file with content
     */
    async create(target: string, content: string = '', overwrite: boolean = false): Promise<OperationResult> {
        const absoluteTarget = path.resolve(this.workspacePath, target);

        try {
            // Check if target exists
            if (fs.existsSync(absoluteTarget) && !overwrite) {
                throw new Error(`Target already exists: ${target}. Set overwrite: true to replace`);
            }

            let backupPath: string | undefined;

            // Create backup if overwriting
            if (fs.existsSync(absoluteTarget) && overwrite) {
                backupPath = await this.createBackup(absoluteTarget);
            }

            // Ensure target directory exists
            const targetDir = path.dirname(absoluteTarget);
            await fs.promises.mkdir(targetDir, { recursive: true });

            // Create file with content
            await fs.promises.writeFile(absoluteTarget, content, 'utf-8');

            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'create',
                target,
                success: true,
                backupPath
            });

            this.logger.info('File created successfully', {
                component: 'FileOperations',
                target
            });

            return { success: true, action: 'create', target, backupPath };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'create',
                target,
                success: false,
                error: errorMessage
            });

            this.logger.error('Create operation failed', {
                component: 'FileOperations',
                target,
                error: errorMessage
            });

            return { success: false, action: 'create', target, error: errorMessage };
        }
    }

    /**
     * Create backup of file or directory
     */
    private async createBackup(filePath: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup.${timestamp}`;

        const stats = await fs.promises.stat(filePath);
        if (stats.isDirectory()) {
            await this.copyDirectory(filePath, backupPath);
        } else {
            await fs.promises.copyFile(filePath, backupPath);
        }

        this.logger.debug('Created backup', {
            component: 'FileOperations',
            original: filePath,
            backup: backupPath
        });

        return backupPath;
    }

    /**
     * Recursively copy directory
     */
    private async copyDirectory(source: string, target: string): Promise<void> {
        await fs.promises.mkdir(target, { recursive: true });
        
        const entries = await fs.promises.readdir(source, { withFileTypes: true });
        
        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const targetPath = path.join(target, entry.name);
            
            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, targetPath);
            } else {
                await fs.promises.copyFile(sourcePath, targetPath);
            }
        }
    }

    /**
     * Undo last operation (restore from backup)
     */
    async undoLast(): Promise<{ success: boolean; message: string }> {
        // Find last successful operation with backup
        const lastWithBackup = [...this.operationLog]
            .reverse()
            .find(log => log.success && log.backupPath);

        if (!lastWithBackup) {
            return {
                success: false,
                message: 'No operation to undo (no backups found)'
            };
        }

        try {
            const absoluteTarget = path.resolve(this.workspacePath, lastWithBackup.target);
            const absoluteBackup = lastWithBackup.backupPath!;

            if (!fs.existsSync(absoluteBackup)) {
                throw new Error('Backup file not found');
            }

            // Restore from backup
            if (fs.existsSync(absoluteTarget)) {
                await fs.promises.rm(absoluteTarget, { recursive: true, force: true });
            }

            const backupStats = await fs.promises.stat(absoluteBackup);
            if (backupStats.isDirectory()) {
                await this.copyDirectory(absoluteBackup, absoluteTarget);
            } else {
                await fs.promises.copyFile(absoluteBackup, absoluteTarget);
            }

            // Remove backup
            await fs.promises.rm(absoluteBackup, { recursive: true, force: true });

            this.logger.info('Operation undone successfully', {
                component: 'FileOperations',
                action: lastWithBackup.action,
                target: lastWithBackup.target
            });

            return {
                success: true,
                message: `Undone: ${lastWithBackup.action} ${lastWithBackup.target}`
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.logger.error('Undo operation failed', {
                component: 'FileOperations',
                error: errorMessage
            });

            return {
                success: false,
                message: `Undo failed: ${errorMessage}`
            };
        }
    }

    /**
     * Get operation log
     */
    getLog(): OperationLog[] {
        return [...this.operationLog];
    }

    /**
     * Clear operation log
     */
    clearLog(): void {
        this.operationLog = [];
    }

    /**
     * Save operation log to file
     */
    async saveLog(filePath: string): Promise<void> {
        const absolutePath = path.resolve(this.workspacePath, filePath);
        const dir = path.dirname(absolutePath);
        await fs.promises.mkdir(dir, { recursive: true });
        
        const logContent = this.operationLog.map(log => 
            `${log.timestamp} | ${log.action.toUpperCase()} | ${log.target} | ${log.success ? 'SUCCESS' : 'FAILED'}${log.error ? ` | ${log.error}` : ''}`
        ).join('\n');
        
        await fs.promises.writeFile(absolutePath, logContent, 'utf-8');
    }

    /**
     * Log operation
     */
    private logOperation(log: OperationLog): void {
        this.operationLog.push(log);
    }

    /**
     * Check if platform matches condition
     */
    static checkPlatform(condition?: 'darwin' | 'win32' | 'linux'): boolean {
        if (!condition) {
            return true;
        }
        return process.platform === condition;
    }
}
