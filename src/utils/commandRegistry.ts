import * as vscode from 'vscode';
import { Logger } from '../logger';

/**
 * Centralized command registry that prevents duplicate registrations
 * and provides automatic cleanup.
 * 
 * Requirements: P0 Item 2.3
 */
export class CommandRegistry {
    private static instance: CommandRegistry;
    private readonly logger: Logger;
    private readonly registeredCommands: Map<string, vscode.Disposable> = new Map();

    private constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): CommandRegistry {
        if (!CommandRegistry.instance) {
            CommandRegistry.instance = new CommandRegistry();
        }
        return CommandRegistry.instance;
    }

    /**
     * Register a command with automatic duplicate detection and error handling
     */
    public register(
        commandId: string,
        callback: (...args: any[]) => any,
        context?: vscode.ExtensionContext
    ): vscode.Disposable {
        // Check if command is already registered
        if (this.registeredCommands.has(commandId)) {
            this.logger.warn('Command already registered, skipping', { commandId });
            return this.registeredCommands.get(commandId)!;
        }

        try {
            const disposable = vscode.commands.registerCommand(commandId, callback);
            this.registeredCommands.set(commandId, disposable);
            
            // Add to context if provided
            if (context) {
                context.subscriptions.push(disposable);
            }

            this.logger.debug('Command registered', { commandId });
            return disposable;
        } catch (error) {
            this.logger.error('Failed to register command', {
                commandId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Register multiple commands at once
     */
    public registerMany(
        commands: Array<{ id: string; callback: (...args: any[]) => any }>,
        context?: vscode.ExtensionContext
    ): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = [];

        for (const { id, callback } of commands) {
            try {
                const disposable = this.register(id, callback, context);
                disposables.push(disposable);
            } catch (error) {
                this.logger.error('Failed to register command in batch', {
                    commandId: id,
                    error: error instanceof Error ? error.message : String(error)
                });
                // Continue with other commands
            }
        }

        return disposables;
    }

    /**
     * Unregister a specific command
     */
    public unregister(commandId: string): boolean {
        const disposable = this.registeredCommands.get(commandId);
        if (disposable) {
            try {
                disposable.dispose();
                this.registeredCommands.delete(commandId);
                this.logger.debug('Command unregistered', { commandId });
                return true;
            } catch (error) {
                this.logger.error('Failed to unregister command', {
                    commandId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        return false;
    }

    /**
     * Check if a command is registered
     */
    public isRegistered(commandId: string): boolean {
        return this.registeredCommands.has(commandId);
    }

    /**
     * Get all registered command IDs
     */
    public getRegisteredCommands(): string[] {
        return Array.from(this.registeredCommands.keys());
    }

    /**
     * Unregister all commands
     */
    public unregisterAll(): void {
        this.logger.info('Unregistering all commands', {
            count: this.registeredCommands.size
        });

        for (const [commandId, disposable] of this.registeredCommands) {
            try {
                disposable.dispose();
            } catch (error) {
                this.logger.error('Failed to dispose command', {
                    commandId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        this.registeredCommands.clear();
    }

    /**
     * Get statistics about registered commands
     */
    public getStats(): {
        total: number;
        commands: string[];
        byPrefix: Record<string, number>;
    } {
        const commands = this.getRegisteredCommands();
        const byPrefix: Record<string, number> = {};

        for (const commandId of commands) {
            const prefix = commandId.split('.')[0];
            byPrefix[prefix] = (byPrefix[prefix] || 0) + 1;
        }

        return {
            total: commands.length,
            commands: commands.sort(),
            byPrefix
        };
    }

    /**
     * Reset the singleton instance (useful for testing)
     */
    public static reset(): void {
        if (CommandRegistry.instance) {
            CommandRegistry.instance.unregisterAll();
            CommandRegistry.instance = undefined as any;
        }
    }
}
