/**
 * File Protection System
 * 
 * Provides automatic backup and logging for file operations with retention policies
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../logger';

export interface FileOperationLog {
    timestamp: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'MOVE' | 'RESTORE';
    filePath: string;
    status: 'Success' | 'Failed';
    backupPath?: string;
    error?: string;
}

export interface RetentionPolicy {
    maxAge: number; // Days
    maxBackups: number; // Per file
}

export class FileProtection {
    private logger: Logger;
    private workspaceRoot: string;
    private logFilePath: string;
    private retentionPolicy: RetentionPolicy;

    constructor(workspaceRoot: string, logger: Logger) {
        this.logger = logger;
        this.workspaceRoot = workspaceRoot;
        this.logFilePath = path.join(workspaceRoot, '.project', 'logs', 'file.log');
        this.retentionPolicy = {
            maxAge: 30, // 30 days
            maxBackups: 50 // Max 50 backups per file
        };
    }

    /**
     * Write a file with automatic backup and logging
     */
    async writeFile(filePath: string, content: string | Buffer, createBackup: boolean = true): Promise<void> {
        const absolutePath = path.resolve(this.workspaceRoot, filePath);
        const exists = await this.fileExists(absolutePath);
        const action: FileOperationLog['action'] = exists ? 'UPDATE' : 'CREATE';

        try {
            // Create backup if file exists and backup is requested
            let backupPath: string | undefined;
            if (exists && createBackup) {
                backupPath = await this.createBackup(absolutePath);
            }

            // Ensure directory exists
            await fs.mkdir(path.dirname(absolutePath), { recursive: true });

            // Write the file
            await fs.writeFile(absolutePath, content, 'utf8');

            // Log success
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action,
                filePath: this.relativePath(absolutePath),
                status: 'Success',
                backupPath: backupPath ? this.relativePath(backupPath) : undefined
            });

            // Clean up old backups
            await this.cleanupOldBackups(absolutePath);

            this.logger.info(`File ${action.toLowerCase()}: ${this.relativePath(absolutePath)}`, {
                backup: backupPath ? this.relativePath(backupPath) : 'none'
            });
        } catch (error) {
            // Log failure
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action,
                filePath: this.relativePath(absolutePath),
                status: 'Failed',
                error: error instanceof Error ? error.message : String(error)
            });

            this.logger.error(`Failed to ${action.toLowerCase()} file: ${this.relativePath(absolutePath)}`, { error });
            throw error;
        }
    }

    /**
     * Delete a file with backup and logging
     */
    async deleteFile(filePath: string, createBackup: boolean = true): Promise<void> {
        const absolutePath = path.resolve(this.workspaceRoot, filePath);

        try {
            // Create backup before deletion
            let backupPath: string | undefined;
            if (await this.fileExists(absolutePath) && createBackup) {
                backupPath = await this.createBackup(absolutePath);
            }

            // Delete the file
            await fs.unlink(absolutePath);

            // Log success
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'DELETE',
                filePath: this.relativePath(absolutePath),
                status: 'Success',
                backupPath: backupPath ? this.relativePath(backupPath) : undefined
            });

            this.logger.info(`File deleted: ${this.relativePath(absolutePath)}`, {
                backup: backupPath ? this.relativePath(backupPath) : 'none'
            });
        } catch (error) {
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'DELETE',
                filePath: this.relativePath(absolutePath),
                status: 'Failed',
                error: error instanceof Error ? error.message : String(error)
            });

            this.logger.error(`Failed to delete file: ${this.relativePath(absolutePath)}`, { error });
            throw error;
        }
    }

    /**
     * Move/rename a file with backup and logging
     */
    async moveFile(sourcePath: string, destPath: string, createBackup: boolean = true): Promise<void> {
        const absoluteSource = path.resolve(this.workspaceRoot, sourcePath);
        const absoluteDest = path.resolve(this.workspaceRoot, destPath);

        try {
            // Create backup if destination exists
            let backupPath: string | undefined;
            if (await this.fileExists(absoluteDest) && createBackup) {
                backupPath = await this.createBackup(absoluteDest);
            }

            // Ensure destination directory exists
            await fs.mkdir(path.dirname(absoluteDest), { recursive: true });

            // Move the file
            await fs.rename(absoluteSource, absoluteDest);

            // Log success
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'MOVE',
                filePath: `${this.relativePath(absoluteSource)} → ${this.relativePath(absoluteDest)}`,
                status: 'Success',
                backupPath: backupPath ? this.relativePath(backupPath) : undefined
            });

            this.logger.info(`File moved: ${this.relativePath(absoluteSource)} → ${this.relativePath(absoluteDest)}`, {
                backup: backupPath ? this.relativePath(backupPath) : 'none'
            });
        } catch (error) {
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'MOVE',
                filePath: `${this.relativePath(absoluteSource)} → ${this.relativePath(absoluteDest)}`,
                status: 'Failed',
                error: error instanceof Error ? error.message : String(error)
            });

            this.logger.error(`Failed to move file: ${this.relativePath(absoluteSource)}`, { error });
            throw error;
        }
    }

    /**
     * Restore a file from backup
     */
    async restoreFromBackup(backupPath: string): Promise<void> {
        const absoluteBackup = path.resolve(this.workspaceRoot, backupPath);
        
        // Extract original file path from backup name
        const originalPath = this.getOriginalPathFromBackup(absoluteBackup);

        try {
            // Read backup content
            const content = await fs.readFile(absoluteBackup, 'utf8');

            // Create backup of current file if it exists
            if (await this.fileExists(originalPath)) {
                await this.createBackup(originalPath);
            }

            // Restore the file
            await fs.writeFile(originalPath, content, 'utf8');

            // Log success
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'RESTORE',
                filePath: this.relativePath(originalPath),
                status: 'Success',
                backupPath: this.relativePath(absoluteBackup)
            });

            this.logger.info(`File restored: ${this.relativePath(originalPath)} from ${this.relativePath(absoluteBackup)}`);
        } catch (error) {
            await this.logOperation({
                timestamp: new Date().toISOString(),
                action: 'RESTORE',
                filePath: this.relativePath(originalPath),
                status: 'Failed',
                error: error instanceof Error ? error.message : String(error),
                backupPath: this.relativePath(absoluteBackup)
            });

            this.logger.error(`Failed to restore file from backup: ${this.relativePath(absoluteBackup)}`, { error });
            throw error;
        }
    }

    /**
     * Create a backup of a file with timestamp
     */
    private async createBackup(filePath: string): Promise<string> {
        const timestamp = this.formatTimestamp(new Date());
        const backupPath = `${filePath}.${timestamp}.backup`;

        await fs.copyFile(filePath, backupPath);

        return backupPath;
    }

    /**
     * Clean up old backups based on retention policy
     */
    private async cleanupOldBackups(filePath: string): Promise<void> {
        const dir = path.dirname(filePath);
        const basename = path.basename(filePath);

        try {
            // Get all backup files for this file
            const files = await fs.readdir(dir);
            const backups = files
                .filter(f => f.startsWith(basename) && f.endsWith('.backup'))
                .map(f => ({
                    name: f,
                    path: path.join(dir, f),
                    timestamp: this.extractTimestamp(f)
                }))
                .filter(b => b.timestamp !== null)
                .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime());

            const now = new Date();
            const maxAgeMs = this.retentionPolicy.maxAge * 24 * 60 * 60 * 1000;

            // Delete backups that exceed limits
            for (let i = 0; i < backups.length; i++) {
                const backup = backups[i];
                const age = now.getTime() - backup.timestamp!.getTime();

                // Delete if too old or exceeds max backup count
                if (age > maxAgeMs || i >= this.retentionPolicy.maxBackups) {
                    await fs.unlink(backup.path);
                    this.logger.debug(`Deleted old backup: ${this.relativePath(backup.path)}`);
                }
            }
        } catch (error) {
            this.logger.warn('Failed to cleanup old backups', { error });
        }
    }

    /**
     * Log a file operation
     */
    private async logOperation(log: FileOperationLog): Promise<void> {
        try {
            // Ensure log directory exists
            await fs.mkdir(path.dirname(this.logFilePath), { recursive: true });

            // Format log entry
            const entry = this.formatLogEntry(log);

            // Append to log file
            await fs.appendFile(this.logFilePath, entry + '\n', 'utf8');
        } catch (error) {
            this.logger.error('Failed to write operation log', { error });
        }
    }

    /**
     * Format a log entry
     */
    private formatLogEntry(log: FileOperationLog): string {
        const parts = [
            log.timestamp,
            log.action,
            log.filePath,
            log.status
        ];

        if (log.backupPath) {
            parts.push(`Backup: ${log.backupPath}`);
        }

        if (log.error) {
            parts.push(`Error: ${log.error}`);
        }

        return parts.join(' | ');
    }

    /**
     * Format timestamp for backup filename
     */
    private formatTimestamp(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');

        return `${year}${month}${day}-${hours}${minutes}${seconds}`;
    }

    /**
     * Extract timestamp from backup filename
     */
    private extractTimestamp(filename: string): Date | null {
        const match = filename.match(/\.(\d{8}-\d{6})\.backup$/);
        if (!match) {
            return null;
        }

        const [, timestampStr] = match;
        const year = parseInt(timestampStr.substring(0, 4));
        const month = parseInt(timestampStr.substring(4, 6)) - 1;
        const day = parseInt(timestampStr.substring(6, 8));
        const hours = parseInt(timestampStr.substring(9, 11));
        const minutes = parseInt(timestampStr.substring(11, 13));
        const seconds = parseInt(timestampStr.substring(13, 15));

        return new Date(year, month, day, hours, minutes, seconds);
    }

    /**
     * Get original file path from backup path
     */
    private getOriginalPathFromBackup(backupPath: string): string {
        return backupPath.replace(/\.\d{8}-\d{6}\.backup$/, '');
    }

    /**
     * Get relative path from workspace root
     */
    private relativePath(absolutePath: string): string {
        return path.relative(this.workspaceRoot, absolutePath);
    }

    /**
     * Check if file exists
     */
    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get all file operation logs
     */
    async getOperationLogs(limit?: number): Promise<FileOperationLog[]> {
        try {
            const content = await fs.readFile(this.logFilePath, 'utf8');
            const lines = content.trim().split('\n').filter(l => l);

            const logs = lines.map(line => this.parseLogEntry(line)).filter(l => l !== null) as FileOperationLog[];

            if (limit) {
                return logs.slice(-limit);
            }

            return logs;
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Parse a log entry
     */
    private parseLogEntry(line: string): FileOperationLog | null {
        const parts = line.split(' | ');
        if (parts.length < 4) {
            return null;
        }

        const [timestamp, action, filePath, status, ...rest] = parts;

        const log: FileOperationLog = {
            timestamp,
            action: action as FileOperationLog['action'],
            filePath,
            status: status as FileOperationLog['status']
        };

        // Parse optional fields
        for (const part of rest) {
            if (part.startsWith('Backup: ')) {
                log.backupPath = part.substring(8);
            } else if (part.startsWith('Error: ')) {
                log.error = part.substring(7);
            }
        }

        return log;
    }

    /**
     * Get all backups for a file
     */
    async getFileBackups(filePath: string): Promise<string[]> {
        const absolutePath = path.resolve(this.workspaceRoot, filePath);
        const dir = path.dirname(absolutePath);
        const basename = path.basename(absolutePath);

        try {
            const files = await fs.readdir(dir);
            const backups = files
                .filter(f => f.startsWith(basename) && f.endsWith('.backup'))
                .map(f => path.join(dir, f))
                .map(f => this.relativePath(f));

            return backups.sort().reverse(); // Most recent first
        } catch (error) {
            return [];
        }
    }

    /**
     * Update retention policy
     */
    setRetentionPolicy(policy: Partial<RetentionPolicy>): void {
        this.retentionPolicy = { ...this.retentionPolicy, ...policy };
        this.logger.info('Retention policy updated', this.retentionPolicy);
    }

    /**
     * Get retention policy
     */
    getRetentionPolicy(): RetentionPolicy {
        return { ...this.retentionPolicy };
    }
}
