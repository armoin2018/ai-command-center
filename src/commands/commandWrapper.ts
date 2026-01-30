import { Logger } from '../logger';
import { ErrorHandler } from '../errorHandler';

const logger = Logger.getInstance();

/**
 * Wraps a command handler with consistent error handling and logging.
 * Ensures extension doesn't crash on command execution errors.
 * 
 * @param commandId - The command identifier for logging
 * @param handler - The command handler function to wrap
 * @returns Wrapped command handler with error boundaries
 */
export function wrapCommand(
    commandId: string,
    handler: (...args: any[]) => Promise<void>
): (...args: any[]) => Promise<void> {
    return async (...args: any[]) => {
        try {
            logger.info(`Executing command: ${commandId}`, { 
                component: 'commandWrapper', 
                operationId: commandId 
            });
            
            await handler(...args);
            
            logger.info(`Command completed: ${commandId}`, { 
                component: 'commandWrapper', 
                operationId: commandId 
            });
            
        } catch (error) {
            // Use ErrorHandler for classified error handling
            await ErrorHandler.handleError(
                error instanceof Error ? error : new Error(String(error)),
                commandId
            );
        }
    };
}
