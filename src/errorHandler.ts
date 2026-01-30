import * as vscode from 'vscode';
import { Logger } from './logger';
import { UserError, SystemError, ExternalError } from './errors/customErrors';

/**
 * Global error handler for AI Command Center.
 * Provides error classification, logging, and user-friendly notifications.
 */
export class ErrorHandler {
    private static logger: Logger;

    /**
     * Initialize the error handler with a logger instance.
     * Call this once during extension activation.
     */
    public static initialize(logger: Logger): void {
        ErrorHandler.logger = logger;
    }

    /**
     * Handle an error with appropriate classification and user notification.
     * 
     * @param error - The error to handle
     * @param context - Optional context (e.g., command name, operation)
     * @returns Promise<void>
     */
    public static async handleError(error: Error, context?: string): Promise<void> {
        const contextMsg = context ? `[${context}] ` : '';
        
        if (error instanceof UserError) {
            // User-facing errors: show friendly message
            const message = error.userMessage || error.message;
            ErrorHandler.logger.warn(`${contextMsg}User error: ${message}`);
            await vscode.window.showWarningMessage(message);
            
        } else if (error instanceof SystemError) {
            // System errors: log stack trace, show generic message
            ErrorHandler.logger.error(`${contextMsg}System error: ${error.message}`, {
                component: 'ErrorHandler',
                context,
                stack: error.stack,
                originalError: error.originalError ? {
                    name: error.originalError.name,
                    message: error.originalError.message,
                    stack: error.originalError.stack
                } : undefined
            });
            
            const selection = await vscode.window.showErrorMessage(
                `An unexpected error occurred. Please check the logs for details.`,
                'View Logs',
                'Report Issue'
            );
            
            if (selection === 'View Logs') {
                ErrorHandler.logger.showOutputChannel();
            } else if (selection === 'Report Issue') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://github.com/yourusername/ai-command-center/issues/new')
                );
            }
            
        } else if (error instanceof ExternalError) {
            // External service errors: log details, show service-specific message
            ErrorHandler.logger.error(`${contextMsg}External service error: ${error.service}`, {
                component: 'ErrorHandler',
                context,
                service: error.service,
                statusCode: error.statusCode,
                message: error.message,
                stack: error.stack
            });
            
            const selection = await vscode.window.showErrorMessage(
                `Failed to connect to ${error.service}: ${error.message}`,
                'Retry',
                'View Logs'
            );
            
            if (selection === 'View Logs') {
                ErrorHandler.logger.showOutputChannel();
            }
            // Note: 'Retry' logic should be handled by the caller
            
        } else {
            // Unknown errors: log everything with full details
            ErrorHandler.logger.error(`${contextMsg}Unknown error: ${error.message}`, {
                component: 'ErrorHandler',
                context,
                errorType: error.constructor.name,
                stack: error.stack,
                error: {
                    name: error.name,
                    message: error.message
                }
            });
            
            const selection = await vscode.window.showErrorMessage(
                `An error occurred: ${error.message}`,
                'View Logs',
                'Report Issue'
            );
            
            if (selection === 'View Logs') {
                ErrorHandler.logger.showOutputChannel();
            } else if (selection === 'Report Issue') {
                vscode.env.openExternal(
                    vscode.Uri.parse('https://github.com/yourusername/ai-command-center/issues/new')
                );
            }
        }
    }

    /**
     * Handle a promise rejection with error classification.
     * Useful for async operations that may fail.
     */
    public static async handlePromiseRejection(
        promise: Promise<any>,
        context?: string
    ): Promise<void> {
        try {
            await promise;
        } catch (error) {
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                context
            );
        }
    }
}
