/**
 * Remote Logger for Webview
 * 
 * Sends logs to MCP server /mcp/log endpoint for centralized logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface RemoteLoggerConfig {
    mcpServerUrl?: string;
    enabled?: boolean;
    batchSize?: number;
    flushInterval?: number;
}

interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    source: string;
    data?: any;
}

export class RemoteLogger {
    private config: Required<RemoteLoggerConfig>;
    private logQueue: LogEntry[] = [];
    private flushTimer: NodeJS.Timeout | null = null;

    constructor(config: RemoteLoggerConfig = {}) {
        this.config = {
            mcpServerUrl: config.mcpServerUrl || 'http://localhost:3000',
            enabled: config.enabled !== false,
            batchSize: config.batchSize || 10,
            flushInterval: config.flushInterval || 5000 // 5 seconds
        };

        // Start flush timer
        if (this.config.enabled) {
            this.startFlushTimer();
        }
    }

    /**
     * Log debug message
     */
    debug(message: string, data?: any): void {
        this.log('debug', message, data);
    }

    /**
     * Log info message
     */
    info(message: string, data?: any): void {
        this.log('info', message, data);
    }

    /**
     * Log warning message
     */
    warn(message: string, data?: any): void {
        this.log('warn', message, data);
    }

    /**
     * Log error message
     */
    error(message: string, data?: any): void {
        this.log('error', message, data);
    }

    /**
     * Generic log method
     */
    private log(level: LogLevel, message: string, data?: any): void {
        if (!this.config.enabled) {
            return;
        }

        // Also log to console for immediate visibility
        const consoleMethod = level === 'error' ? console.error : 
                             level === 'warn' ? console.warn : 
                             level === 'debug' ? console.debug : console.log;
        consoleMethod(`[RemoteLogger] ${level.toUpperCase()}: ${message}`, data || '');

        // Add to queue
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            source: 'webview',
            data
        };

        this.logQueue.push(entry);

        // Flush if batch size reached
        if (this.logQueue.length >= this.config.batchSize) {
            this.flush();
        }
    }

    /**
     * Start periodic flush timer
     */
    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => {
            if (this.logQueue.length > 0) {
                this.flush();
            }
        }, this.config.flushInterval);
    }

    /**
     * Flush log queue to server
     */
    async flush(): Promise<void> {
        if (this.logQueue.length === 0) {
            return;
        }

        const logsToSend = [...this.logQueue];
        this.logQueue = [];

        // Send each log entry individually
        // (Could be optimized to batch send, but keeping simple for now)
        for (const entry of logsToSend) {
            try {
                await fetch(`${this.config.mcpServerUrl}/mcp/log`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(entry)
                });
            } catch (error) {
                // Failed to send log - put it back in console only
                console.error('[RemoteLogger] Failed to send log to server:', error);
            }
        }
    }

    /**
     * Enable remote logging
     */
    enable(): void {
        this.config.enabled = true;
        if (!this.flushTimer) {
            this.startFlushTimer();
        }
    }

    /**
     * Disable remote logging
     */
    disable(): void {
        this.config.enabled = false;
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }

    /**
     * Update MCP server URL
     */
    setServerUrl(url: string): void {
        this.config.mcpServerUrl = url;
    }

    /**
     * Cleanup on unmount
     */
    destroy(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        // Final flush
        this.flush();
    }
}

// Singleton instance
let loggerInstance: RemoteLogger | null = null;

/**
 * Get or create singleton remote logger
 */
export function getRemoteLogger(config?: RemoteLoggerConfig): RemoteLogger {
    if (!loggerInstance) {
        loggerInstance = new RemoteLogger(config);
    }
    return loggerInstance;
}
