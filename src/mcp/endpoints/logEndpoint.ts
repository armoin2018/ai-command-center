/**
 * Client Logger Endpoint for MCP Server
 * 
 * Receives logs from client applications (webview, etc.) via POST /mcp/log
 * Implements log rotation with configurable size and file retention
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import * as http from 'http';
import { Logger } from '../../logger';

const statAsync = promisify(fs.stat);
const renameAsync = promisify(fs.rename);
const unlinkAsync = promisify(fs.unlink);
const appendFileAsync = promisify(fs.appendFile);
const readdirAsync = promisify(fs.readdir);
const mkdirAsync = promisify(fs.mkdir);

export interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp?: string;
    source?: string;
    data?: any;
}

export interface LogEndpointConfig {
    logDir: string;
    maxFileSize: number; // bytes
    maxFiles: number;
    logger: Logger;
}

export class LogEndpoint {
    private config: LogEndpointConfig;
    private currentLogFile: string;

    constructor(config: LogEndpointConfig) {
        this.config = config;
        this.currentLogFile = path.join(this.config.logDir, 'client.log');
    }

    /**
     * Initialize log endpoint - ensure log directory exists
     */
    async initialize(): Promise<void> {
        try {
            await mkdirAsync(this.config.logDir, { recursive: true });
            this.config.logger.info('Client log endpoint initialized', {
                component: 'LogEndpoint',
                logDir: this.config.logDir,
                maxFileSize: this.config.maxFileSize,
                maxFiles: this.config.maxFiles
            });
        } catch (error: any) {
            this.config.logger.error('Failed to initialize log endpoint', error);
            throw error;
        }
    }

    /**
     * Handle POST /mcp/log request
     */
    async handleLogRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        try {
            // Parse request body
            const body = await this.parseRequestBody(req);
            const logEntry: LogEntry = JSON.parse(body);

            // Validate log entry
            if (!this.validateLogEntry(logEntry)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid log entry format' }));
                return;
            }

            // Write log entry
            await this.writeLog(logEntry);

            // Send success response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Log received' }));

        } catch (error: any) {
            this.config.logger.error('Error handling log request', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
                error: 'Internal server error',
                message: error.message 
            }));
        }
    }

    /**
     * Parse HTTP request body
     */
    private parseRequestBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
                // Prevent excessive body size
                if (body.length > 1024 * 1024) { // 1MB max
                    reject(new Error('Request body too large'));
                }
            });
            req.on('end', () => resolve(body));
            req.on('error', reject);
        });
    }

    /**
     * Validate log entry structure
     */
    private validateLogEntry(entry: any): entry is LogEntry {
        return (
            entry &&
            typeof entry === 'object' &&
            typeof entry.level === 'string' &&
            ['debug', 'info', 'warn', 'error'].includes(entry.level) &&
            typeof entry.message === 'string'
        );
    }

    /**
     * Write log entry to file with rotation
     */
    private async writeLog(entry: LogEntry): Promise<void> {
        // Check if rotation is needed
        await this.rotateIfNeeded();

        // Format log entry
        const timestamp = entry.timestamp || new Date().toISOString();
        const source = entry.source || 'client';
        const level = entry.level.toUpperCase().padEnd(5);
        const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
        
        const logLine = `${timestamp} | ${level} | ${source} | ${entry.message}${dataStr}\n`;

        // Append to log file
        try {
            await appendFileAsync(this.currentLogFile, logLine, 'utf8');
        } catch (error: any) {
            this.config.logger.error('Failed to write client log', error);
            throw error;
        }
    }

    /**
     * Rotate log file if size exceeds limit
     */
    private async rotateIfNeeded(): Promise<void> {
        try {
            // Check if current log file exists and its size
            const stats = await statAsync(this.currentLogFile);
            
            if (stats.size >= this.config.maxFileSize) {
                await this.rotateLogFiles();
            }
        } catch (error: any) {
            // File doesn't exist yet, no rotation needed
            if (error.code !== 'ENOENT') {
                this.config.logger.error('Error checking log file size', error);
            }
        }
    }

    /**
     * Rotate log files: client.log -> client.1.log -> client.2.log -> ... -> deleted
     */
    private async rotateLogFiles(): Promise<void> {
        this.config.logger.info('Rotating client log files', {
            component: 'LogEndpoint',
            maxFiles: this.config.maxFiles
        });

        try {
            // Delete oldest log file if it exists (maxFiles-1)
            const oldestLog = path.join(this.config.logDir, `client.${this.config.maxFiles - 1}.log`);
            try {
                await unlinkAsync(oldestLog);
            } catch (error: any) {
                // File doesn't exist, ignore
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            // Rotate existing log files
            for (let i = this.config.maxFiles - 2; i >= 1; i--) {
                const currentFile = path.join(this.config.logDir, `client.${i}.log`);
                const nextFile = path.join(this.config.logDir, `client.${i + 1}.log`);
                
                try {
                    await renameAsync(currentFile, nextFile);
                } catch (error: any) {
                    // File doesn't exist, continue
                    if (error.code !== 'ENOENT') {
                        throw error;
                    }
                }
            }

            // Rotate current log to .1.log
            const firstRotated = path.join(this.config.logDir, 'client.1.log');
            await renameAsync(this.currentLogFile, firstRotated);

            this.config.logger.info('Log rotation complete', { component: 'LogEndpoint' });
        } catch (error: any) {
            this.config.logger.error('Failed to rotate log files', error);
            throw error;
        }
    }

    /**
     * Get current log file path
     */
    getCurrentLogFile(): string {
        return this.currentLogFile;
    }

    /**
     * Get all client log files
     */
    async getLogFiles(): Promise<string[]> {
        try {
            const files = await readdirAsync(this.config.logDir);
            return files
                .filter(file => file.startsWith('client.') && file.endsWith('.log'))
                .map(file => path.join(this.config.logDir, file))
                .sort();
        } catch (error: any) {
            this.config.logger.error('Failed to list log files', error);
            return [];
        }
    }

    /**
     * Get log statistics
     */
    async getStats(): Promise<{ totalSize: number; fileCount: number; files: Array<{ path: string; size: number }> }> {
        const logFiles = await this.getLogFiles();
        const stats = {
            totalSize: 0,
            fileCount: logFiles.length,
            files: [] as Array<{ path: string; size: number }>
        };

        for (const file of logFiles) {
            try {
                const fileStat = await statAsync(file);
                stats.totalSize += fileStat.size;
                stats.files.push({
                    path: file,
                    size: fileStat.size
                });
            } catch (error) {
                // File might have been deleted, skip
            }
        }

        return stats;
    }
}
