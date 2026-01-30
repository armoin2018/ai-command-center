import * as winston from 'winston';
import * as path from 'path';
import * as vscode from 'vscode';
import Transport from 'winston-transport';

/**
 * Structured logging metadata interface.
 * Extend with additional context fields as needed.
 */
export interface LogMetadata {
    operationId?: string;
    component?: string;
    duration?: number;
    error?: any;
    [key: string]: any;
}

/**
 * Custom Winston transport that writes to VS Code Output Channel.
 * Provides user-visible logging in the VS Code Output panel.
 */
class OutputChannelTransport extends Transport {
    private outputChannel: vscode.OutputChannel;

    constructor(opts?: Transport.TransportStreamOptions) {
        super(opts);
        this.outputChannel = vscode.window.createOutputChannel('AI Command Center', { log: true });
    }

    log(info: any, callback: () => void): void {
        setImmediate(() => {
            const timestamp = info.timestamp || new Date().toISOString();
            const level = (info.level || 'info').toUpperCase().padEnd(5);
            const metaStr = info.meta && Object.keys(info.meta).length > 0 
                ? ` ${JSON.stringify(info.meta)}` 
                : '';
            
            // Format: [TIMESTAMP] LEVEL: message {metadata}
            const message = `[${timestamp}] ${level}: ${info.message}${metaStr}`;
            this.outputChannel.appendLine(message);
        });
        callback();
    }

    public show(): void {
        this.outputChannel.show(true);
    }

    public getOutputChannel(): vscode.OutputChannel {
        return this.outputChannel;
    }
}

/**
 * Winston-based logger singleton for AI Command Center.
 * Provides structured logging with console, file, and Output Channel transports.
 */
export class Logger {
    private static instance: Logger;
    private logger: winston.Logger;
    private outputChannelTransport?: OutputChannelTransport;

    private constructor(logDir?: string, logLevel: string = 'info') {
        // Create Output Channel transport for VS Code integration
        this.outputChannelTransport = new OutputChannelTransport();

        const transports: winston.transport[] = [
            // Console transport for development
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                    winston.format.printf(({ level, message, timestamp, ...meta }) => {
                        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
                        return `[${timestamp}] ${level}: ${message}${metaStr}`;
                    })
                )
            }),
            // Output Channel transport
            this.outputChannelTransport
        ];

        // File transport for production (if logDir provided)
        if (logDir) {
            transports.push(
                new winston.transports.File({
                    filename: path.join(logDir, 'aicc-error.log'),
                    level: 'error',
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json() // Structured JSON for file logs
                    )
                }),
                new winston.transports.File({
                    filename: path.join(logDir, 'aicc-combined.log'),
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    format: winston.format.combine(
                        winston.format.timestamp(),
                        winston.format.json() // Structured JSON for file logs
                    )
                })
            );
        }

        this.logger = winston.createLogger({
            level: logLevel,
            transports,
            exitOnError: false
        });
    }

    /**
     * Get or create the logger singleton instance.
     * 
     * @param logDir - Optional directory for log files
     * @param logLevel - Optional log level (debug, info, warn, error)
     * @returns Logger instance
     */
    public static getInstance(logDir?: string, logLevel?: string): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(logDir, logLevel);
        }
        return Logger.instance;
    }

    /**
     * Log debug message (development only).
     * 
     * @param message - Log message
     * @param meta - Optional structured metadata
     */
    public debug(message: string, meta?: LogMetadata): void {
        this.logger.debug(message, meta);
    }

    /**
     * Log informational message.
     * 
     * @param message - Log message
     * @param meta - Optional structured metadata
     */
    public info(message: string, meta?: LogMetadata): void {
        this.logger.info(message, meta);
    }

    /**
     * Log warning message.
     * 
     * @param message - Log message
     * @param meta - Optional structured metadata
     */
    public warn(message: string, meta?: LogMetadata): void {
        this.logger.warn(message, meta);
    }

    /**
     * Log error message.
     * 
     * @param message - Log message
     * @param meta - Optional structured metadata
     */
    public error(message: string, meta?: LogMetadata): void {
        this.logger.error(message, meta);
    }

    /**
     * Change the logging level at runtime.
     * 
     * @param level - New log level (debug, info, warn, error)
     */
    public setLevel(level: string): void {
        this.logger.level = level;
    }

    /**
     * Show the VS Code Output Channel.
     * Opens the Output panel and selects AI Command Center channel.
     */
    public showOutputChannel(): void {
        this.outputChannelTransport?.show();
    }

    /**
     * Get the underlying Winston logger instance.
     * Use sparingly - prefer the Logger class methods.
     */
    public getWinstonLogger(): winston.Logger {
        return this.logger;
    }
}

// Export singleton instance for easy import
export const logger = Logger.getInstance();
