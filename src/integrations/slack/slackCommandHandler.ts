/**
 * Slack Slash Command Handler
 *
 * Registry and dispatcher for Slack slash commands.
 * Allows registration of command handlers and dispatching incoming slash commands.
 */

import { logger } from '../../logger';
import {
    SlashCommand,
    SlashCommandHandler,
    SlashCommandResponse
} from './types';

/**
 * Registry for slash command handlers with dispatch capabilities.
 */
export class SlashCommandRegistry {
    private handlers: Map<string, SlashCommandHandler> = new Map();

    /**
     * Register a slash command handler
     * @param command - The command name (e.g., '/deploy')
     * @param handler - The handler that processes this command
     */
    register(command: string, handler: SlashCommandHandler): void {
        const normalizedCommand = command.startsWith('/') ? command : `/${command}`;

        if (this.handlers.has(normalizedCommand)) {
            logger.warn('Overwriting existing slash command handler', {
                component: 'SlashCommandRegistry',
                command: normalizedCommand
            });
        }

        this.handlers.set(normalizedCommand, handler);

        logger.info('Registered slash command handler', {
            component: 'SlashCommandRegistry',
            command: normalizedCommand,
            name: handler.name
        });
    }

    /**
     * Unregister a slash command handler
     * @param command - The command name to unregister
     */
    unregister(command: string): boolean {
        const normalizedCommand = command.startsWith('/') ? command : `/${command}`;
        const removed = this.handlers.delete(normalizedCommand);

        if (removed) {
            logger.info('Unregistered slash command handler', {
                component: 'SlashCommandRegistry',
                command: normalizedCommand
            });
        }

        return removed;
    }

    /**
     * Dispatch an incoming slash command to the appropriate handler
     * @param command - The incoming slash command payload
     * @returns The command response, or a fallback ephemeral error
     */
    async dispatch(command: SlashCommand): Promise<SlashCommandResponse> {
        const handler = this.handlers.get(command.command);

        if (!handler) {
            logger.warn('No handler registered for slash command', {
                component: 'SlashCommandRegistry',
                command: command.command
            });

            return {
                text: `Unknown command: ${command.command}`,
                response_type: 'ephemeral'
            };
        }

        try {
            logger.info('Dispatching slash command', {
                component: 'SlashCommandRegistry',
                command: command.command,
                handler: handler.name,
                userId: command.user_id,
                channelId: command.channel_id
            });

            const response = await handler.execute(command);
            return response;
        } catch (error: any) {
            logger.error('Slash command handler failed', {
                component: 'SlashCommandRegistry',
                command: command.command,
                handler: handler.name,
                error: error.message
            });

            return {
                text: `Error executing ${command.command}: ${error.message}`,
                response_type: 'ephemeral'
            };
        }
    }

    /**
     * List all registered commands with their descriptions
     */
    listCommands(): Array<{ command: string; name: string; description: string }> {
        const commands: Array<{ command: string; name: string; description: string }> = [];

        for (const [command, handler] of this.handlers) {
            commands.push({
                command,
                name: handler.name,
                description: handler.description
            });
        }

        return commands;
    }

    /**
     * Check if a command is registered
     * @param command - The command name to check
     */
    hasCommand(command: string): boolean {
        const normalizedCommand = command.startsWith('/') ? command : `/${command}`;
        return this.handlers.has(normalizedCommand);
    }

    /**
     * Get the number of registered commands
     */
    get size(): number {
        return this.handlers.size;
    }

    /**
     * Clear all registered handlers
     */
    clear(): void {
        this.handlers.clear();
        logger.info('Cleared all slash command handlers', {
            component: 'SlashCommandRegistry'
        });
    }
}
