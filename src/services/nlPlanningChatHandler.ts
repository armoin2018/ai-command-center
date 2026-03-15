/**
 * Natural Language Planning Chat Handler
 *
 * Handles planning-related chat requests from the @aicc chat participant,
 * delegating to the NlPlanningParser for intent detection and attribute
 * extraction, then executing CRUD operations via PlanningManager.
 *
 * Part of AICC-0119: Natural Language Planning
 *   - AICC-0121: Planning queries & pipeline triggers via chat
 *   - AICC-0333: Implement planning query handler for chat
 *   - AICC-0334: Add pipeline trigger commands via chat
 *   - AICC-0335: Format chat responses with markdown tables
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';
import { EventBus } from '../services/eventBus';
import { EventChannels, type PlanningItemEvent } from '../types/events';
import {
    NlPlanningParser,
    type ParsedPlanningIntent,
} from './nlPlanningParser';
import {
    ItemType,
    type PlanningItem,
    type IPlanData,
} from '../planning/types';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Result of a planning chat operation.
 */
export interface PlanningChatResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Human-readable message */
    message: string;
    /** Created or modified item ID, if any */
    itemId?: string;
}

/**
 * Pending confirmation state for a create operation.
 */
interface PendingConfirmation {
    /** The parsed intent awaiting confirmation */
    intent: ParsedPlanningIntent;
    /** Timestamp when the confirmation was requested */
    requestedAt: number;
    /** Confirmation timeout in milliseconds (default: 5 minutes) */
    timeoutMs: number;
}

// ─── NlPlanningChatHandler ───────────────────────────────────────────

/**
 * Singleton service that bridges the @aicc chat participant to the
 * planning subsystem via natural language understanding.
 *
 * Responsibilities:
 * - Parse NL input and dispatch to create / query / update / trigger flows
 * - Present confirmation prompts before mutating plan data
 * - Format query results as markdown tables
 * - Emit EventBus events on successful mutations
 *
 * @example
 * ```ts
 * const handler = NlPlanningChatHandler.getInstance();
 * await handler.handlePlanningRequest(
 *     'Create a high priority story about login flow',
 *     stream,
 * );
 * ```
 */
export class NlPlanningChatHandler {
    private static instance: NlPlanningChatHandler;
    private readonly logger: Logger;
    private readonly parser: NlPlanningParser;
    private readonly eventBus: EventBus;

    /** Pending confirmation keyed by a session identifier (simplified: single pending) */
    private pendingConfirmation: PendingConfirmation | null = null;

    private constructor() {
        this.logger = Logger.getInstance();
        this.parser = NlPlanningParser.getInstance();
        this.eventBus = EventBus.getInstance();

        this.logger.info('NlPlanningChatHandler initialized', {
            component: 'NlPlanningChatHandler',
        });
    }

    /**
     * Get or create the singleton instance.
     * @returns The NlPlanningChatHandler singleton
     */
    public static getInstance(): NlPlanningChatHandler {
        if (!NlPlanningChatHandler.instance) {
            NlPlanningChatHandler.instance = new NlPlanningChatHandler();
        }
        return NlPlanningChatHandler.instance;
    }

    // ─── Main Entry Point ────────────────────────────────────────

    /**
     * Handle a planning-related chat request.
     *
     * This is the primary entry point called from `ChatParticipantManager`
     * when a planning intent is detected. Routes to the appropriate
     * sub-handler based on the parsed intent type.
     *
     * @param prompt - The raw user prompt text
     * @param stream - The VS Code chat response stream for output
     * @returns Promise that resolves when handling is complete
     */
    public async handlePlanningRequest(
        prompt: string,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        const start = Date.now();

        try {
            // Check if this is a confirmation reply for a pending creation
            if (this.pendingConfirmation) {
                await this.handleConfirmationReply(prompt, stream);
                return;
            }

            stream.progress('Analysing your planning request…');

            // Parse the NL input
            const intent = await this.parser.parseRequest(prompt);

            this.logger.debug('Planning intent resolved', {
                component: 'NlPlanningChatHandler',
                intentType: intent.intentType,
                confidence: intent.confidence,
            });

            // Route to handler
            switch (intent.intentType) {
                case 'create_epic':
                case 'create_story':
                case 'create_task':
                case 'create_bug':
                    await this.handleCreateIntent(intent, stream);
                    break;

                case 'query_items':
                    await this.handlePlanningQuery(
                        intent.query || intent.rawInput,
                        stream,
                    );
                    break;

                case 'update_status':
                    await this.handleStatusUpdate(intent, stream);
                    break;

                case 'trigger_pipeline':
                    await this.handlePipelineTrigger(
                        intent.pipelineName || '',
                        stream,
                    );
                    break;

                default:
                    stream.markdown(
                        `⚠️ Could not determine your intent (confidence: ${(intent.confidence * 100).toFixed(0)}%).\n\n` +
                        'Try rephrasing, e.g.:\n' +
                        '- "Create a story about user authentication"\n' +
                        '- "Show all high priority tasks"\n' +
                        '- "Move AICC-0042 to in-progress"\n',
                    );
            }

            const duration = Date.now() - start;
            this.logger.debug('Planning request handled', {
                component: 'NlPlanningChatHandler',
                duration,
                intentType: intent.intentType,
            });
        } catch (error) {
            this.logger.error('Error handling planning request', {
                component: 'NlPlanningChatHandler',
                error: error instanceof Error ? error.message : String(error),
            });
            stream.markdown(
                `❌ **Error processing planning request:** ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            );
        }
    }

    // ─── Create Flow ─────────────────────────────────────────────

    /**
     * Handle a create intent by presenting a confirmation prompt.
     *
     * @param intent - The parsed create intent
     * @param stream - The chat response stream
     */
    private async handleCreateIntent(
        intent: ParsedPlanningIntent,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        // Build and show confirmation message
        const confirmMsg = this.parser.generateConfirmationMessage(intent);
        stream.markdown(confirmMsg);

        // Store pending confirmation
        this.pendingConfirmation = {
            intent,
            requestedAt: Date.now(),
            timeoutMs: 5 * 60 * 1000, // 5 minutes
        };

        this.logger.debug('Pending confirmation stored', {
            component: 'NlPlanningChatHandler',
            intentType: intent.intentType,
            title: intent.title,
        });
    }

    /**
     * Handle a user's reply to a pending confirmation prompt.
     *
     * @param reply - The user's reply text
     * @param stream - The chat response stream
     */
    private async handleConfirmationReply(
        reply: string,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        const pending = this.pendingConfirmation;
        if (!pending) {
            return;
        }

        // Check timeout
        if (Date.now() - pending.requestedAt > pending.timeoutMs) {
            this.pendingConfirmation = null;
            stream.markdown('⏰ Confirmation timed out. Please start again.\n');
            return;
        }

        const normalised = reply.trim().toLowerCase();

        // Confirmed
        if (/^(?:yes|y|confirm|ok|sure|go|create|do it|proceed)\b/.test(normalised)) {
            this.pendingConfirmation = null;
            await this.executeCreateItem(pending.intent, stream);
            return;
        }

        // Cancelled
        if (/^(?:no|n|cancel|discard|abort|stop|nevermind)\b/.test(normalised)) {
            this.pendingConfirmation = null;
            stream.markdown('❌ Item creation cancelled.\n');
            return;
        }

        // Otherwise treat as a modification — re-parse and merge
        stream.markdown('✏️ Updating intent with your changes…\n\n');
        this.pendingConfirmation = null;

        const updatedIntent = await this.parser.parseRequest(reply);

        // Merge: prefer new values over old where present
        const merged: ParsedPlanningIntent = {
            ...pending.intent,
            title: updatedIntent.title || pending.intent.title,
            description: updatedIntent.description || pending.intent.description,
            attributes: {
                ...pending.intent.attributes,
                ...Object.fromEntries(
                    Object.entries(updatedIntent.attributes).filter(
                        ([, v]) => v !== undefined,
                    ),
                ),
            },
        };

        // Show updated confirmation
        await this.handleCreateIntent(merged, stream);
    }

    /**
     * Execute the actual item creation after confirmation.
     *
     * @param intent - The confirmed intent
     * @param stream - The chat response stream
     */
    private async executeCreateItem(
        intent: ParsedPlanningIntent,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        stream.progress('Creating planning item…');

        try {
            const planItem = this.parser.buildPlanItem(intent);

            // Load current plan data
            const planData = await this.loadPlanData();
            if (!planData) {
                stream.markdown('❌ No PLAN.json found in workspace. Run `AICC: Initialize Planning` first.\n');
                return;
            }

            // Generate next ID
            const newId = this.generateNextId(planData);
            const now = new Date().toISOString();

            // Build the full item
            const fullItem: PlanningItem = {
                id: newId,
                type: planItem.type,
                title: planItem.title,
                description: planItem.description,
                status: planItem.status as any,
                priority: planItem.priority,
                assignee: planItem.assignee,
                tags: planItem.tags,
                estimatedHours: planItem.estimatedHours,
                epicId: planItem.epicId ?? null,
                order: planData.items.length,
                links: [],
                createdOn: now,
                lastUpdatedOn: now,
            } as PlanningItem;

            // Add to plan data
            planData.items.push(fullItem);

            // Save
            await this.savePlanData(planData);

            // Emit EventBus event
            await this.emitCreatedEvent(fullItem);

            // Respond
            stream.markdown(`✅ **${this.formatType(planItem.type)} created successfully!**\n\n`);
            stream.markdown(this.formatItemDetail(fullItem));

            this.logger.info('Planning item created via NL chat', {
                component: 'NlPlanningChatHandler',
                itemId: newId,
                type: planItem.type,
                title: planItem.title,
            });
        } catch (error) {
            this.logger.error('Failed to create planning item', {
                component: 'NlPlanningChatHandler',
                error: error instanceof Error ? error.message : String(error),
            });
            stream.markdown(
                `❌ **Failed to create item:** ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            );
        }
    }

    // ─── Query Flow ──────────────────────────────────────────────

    /**
     * Handle a planning query request and format results as markdown tables.
     *
     * Supports queries like:
     * - "Show all high priority tasks"
     * - "List stories in progress"
     * - "What epics are assigned to @blaine"
     *
     * @param query - The query text
     * @param stream - The chat response stream
     */
    public async handlePlanningQuery(
        query: string,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        stream.progress('Querying planning items…');

        try {
            const planData = await this.loadPlanData();
            if (!planData) {
                stream.markdown('❌ No PLAN.json found. Run `AICC: Initialize Planning` first.\n');
                return;
            }

            // Filter items based on the query
            const filteredItems = this.filterItemsByQuery(planData.items, query);

            if (filteredItems.length === 0) {
                stream.markdown(`🔍 No items found matching your query.\n\n`);
                stream.markdown(`**Query:** ${query}\n`);
                stream.markdown(`**Total items in plan:** ${planData.items.length}\n`);
                return;
            }

            // Format results
            const formatted = this.formatQueryResults(filteredItems, query);
            stream.markdown(formatted);

            this.logger.debug('Planning query executed', {
                component: 'NlPlanningChatHandler',
                query: query.substring(0, 80),
                resultCount: filteredItems.length,
            });
        } catch (error) {
            this.logger.error('Failed to execute planning query', {
                component: 'NlPlanningChatHandler',
                error: error instanceof Error ? error.message : String(error),
            });
            stream.markdown(
                `❌ **Query error:** ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            );
        }
    }

    /**
     * Filter items based on a natural language query.
     *
     * @param items - All planning items
     * @param query - The NL query string
     * @returns Filtered array of matching items
     */
    private filterItemsByQuery(
        items: PlanningItem[],
        query: string,
    ): PlanningItem[] {
        const lowerQuery = query.toLowerCase();
        let filtered = [...items];

        // Filter by type
        if (/\bepics?\b/i.test(query)) {
            filtered = filtered.filter(i => i.type === ItemType.Epic);
        } else if (/\bstories|story\b/i.test(query)) {
            filtered = filtered.filter(i => i.type === ItemType.Story);
        } else if (/\btasks?\b/i.test(query)) {
            filtered = filtered.filter(i => i.type === ItemType.Task);
        } else if (/\bbugs?\b/i.test(query)) {
            filtered = filtered.filter(i => i.type === ItemType.Bug);
        }

        // Filter by status
        const statusMatch = lowerQuery.match(
            /\b(?:status\s+(?:is\s+)?|in\s+|with\s+status\s+)(todo|ready|pending|in-progress|review|done)\b/,
        );
        if (statusMatch) {
            const status = statusMatch[1];
            filtered = filtered.filter(i => i.status === status);
        } else if (/\bin\s*progress\b/i.test(query)) {
            filtered = filtered.filter(i => i.status === 'in-progress');
        } else if (/\bcompleted?\b|\bdone\b|\bfinished?\b/i.test(query)) {
            filtered = filtered.filter(i => i.status === 'done');
        } else if (/\bopen\b|\btodo\b|\bbacklog\b/i.test(query)) {
            filtered = filtered.filter(i => i.status === 'todo' || i.status === 'ready');
        }

        // Filter by priority
        if (/\bhigh\s*(?:priority|pri)\b|\burgent\b|\bcritical\b/i.test(query)) {
            filtered = filtered.filter(i => i.priority === 'high');
        } else if (/\bmedium\s*(?:priority|pri)\b|\bnormal\b/i.test(query)) {
            filtered = filtered.filter(i => i.priority === 'medium');
        } else if (/\blow\s*(?:priority|pri)\b|\bminor\b/i.test(query)) {
            filtered = filtered.filter(i => i.priority === 'low');
        }

        // Filter by assignee
        const assigneeMatch = lowerQuery.match(
            /\b(?:assigned?\s+to|for|by|owner)\s+@?([\w.-]+)/,
        );
        if (assigneeMatch) {
            const assignee = assigneeMatch[1].toLowerCase();
            filtered = filtered.filter(
                i => i.assignee?.toLowerCase() === assignee,
            );
        }

        // Filter by tag
        const tagMatch = lowerQuery.match(/\b(?:tagged?\s+(?:with\s+)?|label(?:led)?\s+)#?([\w-]+)/);
        if (tagMatch) {
            const tag = tagMatch[1].toLowerCase();
            filtered = filtered.filter(
                i => i.tags?.some(t => t.toLowerCase() === tag),
            );
        }

        // Filter by text search (title / description)
        const textKeywords = lowerQuery
            .replace(
                /\b(?:show|list|find|search|get|all|the|what|which|how|many|items?|stories|tasks?|epics?|bugs?|with|status|is|in|of|a|an|are|high|medium|low|priority|assigned?\s+to|for|tagged?\s+with)\b/gi,
                '',
            )
            .trim();
        if (textKeywords.length > 2) {
            const keywords = textKeywords.split(/\s+/).filter(k => k.length > 2);
            if (keywords.length > 0) {
                filtered = filtered.filter(item => {
                    const searchable = `${item.title} ${item.description || ''}`.toLowerCase();
                    return keywords.some(kw => searchable.includes(kw));
                });
            }
        }

        return filtered;
    }

    /**
     * Format an array of planning items as a markdown table.
     *
     * @param items - The items to format
     * @param query - The original query for the header
     * @returns Formatted markdown string
     */
    public formatQueryResults(items: PlanningItem[], query: string): string {
        const lines: string[] = [];

        lines.push(`## 🔍 Planning Query Results\n`);
        lines.push(`**Query:** ${query}`);
        lines.push(`**Results:** ${items.length} item${items.length === 1 ? '' : 's'}\n`);

        // Summary counts by type
        const typeCounts = new Map<string, number>();
        for (const item of items) {
            typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
        }
        const summaryParts = Array.from(typeCounts.entries())
            .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
            .join(', ');
        lines.push(`📊 ${summaryParts}\n`);

        // Table header
        lines.push('| ID | Type | Title | Status | Priority | Assignee |');
        lines.push('|----|------|-------|--------|----------|----------|');

        // Table rows
        for (const item of items) {
            const id = item.id;
            const type = this.typeEmoji(item.type);
            const title = item.title.length > 50
                ? item.title.substring(0, 47) + '…'
                : item.title;
            const status = this.statusBadge(item.status);
            const priority = item.priority ? this.priorityBadge(item.priority) : '—';
            const assignee = item.assignee ? `@${item.assignee}` : '—';

            lines.push(`| ${id} | ${type} | ${title} | ${status} | ${priority} | ${assignee} |`);
        }

        lines.push('');
        return lines.join('\n');
    }

    /**
     * Format a single planning item as a detailed markdown block.
     *
     * @param item - The planning item to format
     * @returns Formatted markdown string
     */
    public formatItemDetail(item: PlanningItem): string {
        const lines: string[] = [];

        lines.push(`### ${this.typeEmoji(item.type)} ${item.id}: ${item.title}\n`);
        lines.push(`| Field | Value |`);
        lines.push(`|-------|-------|`);
        lines.push(`| **Type** | ${item.type} |`);
        lines.push(`| **Status** | ${this.statusBadge(item.status)} |`);

        if (item.priority) {
            lines.push(`| **Priority** | ${this.priorityBadge(item.priority)} |`);
        }
        if (item.assignee) {
            lines.push(`| **Assignee** | @${item.assignee} |`);
        }
        if (item.description) {
            const desc = item.description.length > 100
                ? item.description.substring(0, 97) + '…'
                : item.description;
            lines.push(`| **Description** | ${desc} |`);
        }
        if (item.estimatedHours) {
            lines.push(`| **Estimated Hours** | ${item.estimatedHours}h |`);
        }
        if (item.tags && item.tags.length > 0) {
            lines.push(`| **Tags** | ${item.tags.map(t => `\`${t}\``).join(', ')} |`);
        }
        if (item.epicId) {
            lines.push(`| **Epic** | ${item.epicId} |`);
        }
        if (item.gitRepoBranch) {
            lines.push(`| **Branch** | \`${item.gitRepoBranch}\` |`);
        }

        lines.push(`| **Created** | ${item.createdOn} |`);
        lines.push(`| **Updated** | ${item.lastUpdatedOn} |`);
        lines.push('');

        return lines.join('\n');
    }

    // ─── Status Update Flow ──────────────────────────────────────

    /**
     * Handle a status update intent.
     *
     * @param intent - The parsed update_status intent
     * @param stream - The chat response stream
     */
    private async handleStatusUpdate(
        intent: ParsedPlanningIntent,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        if (!intent.targetItemId || !intent.newStatus) {
            stream.markdown('❌ Could not determine target item or new status.\n\n');
            stream.markdown('**Usage:** "Move AICC-0042 to in-progress"\n');
            return;
        }

        stream.progress(`Updating ${intent.targetItemId} status…`);

        try {
            const planData = await this.loadPlanData();
            if (!planData) {
                stream.markdown('❌ No PLAN.json found.\n');
                return;
            }

            const itemIndex = planData.items.findIndex(
                i => i.id.toUpperCase() === intent.targetItemId!.toUpperCase(),
            );

            if (itemIndex === -1) {
                stream.markdown(`❌ Item **${intent.targetItemId}** not found.\n`);
                return;
            }

            const item = planData.items[itemIndex];
            const previousStatus = item.status;
            const newStatus = this.normaliseStatus(intent.newStatus);

            if (!newStatus) {
                stream.markdown(
                    `❌ Unknown status: "${intent.newStatus}"\n\n` +
                    'Valid statuses: `todo`, `ready`, `pending`, `in-progress`, `review`, `done`\n',
                );
                return;
            }

            // Update status
            (item as any).status = newStatus;
            item.lastUpdatedOn = new Date().toISOString();
            if (newStatus === 'done' && !item.deliveredOn) {
                (item as any).deliveredOn = new Date().toISOString();
            }

            await this.savePlanData(planData);

            // Emit status changed event
            const channelKey = this.getStatusChangedChannel(item.type);
            if (channelKey) {
                await this.eventBus.emit(channelKey, {
                    timestamp: Date.now(),
                    source: 'NlPlanningChatHandler',
                    itemId: item.id,
                    itemType: item.type,
                    previousStatus,
                    newStatus,
                });
            }

            stream.markdown(
                `✅ **${item.id}** status updated: ${this.statusBadge(previousStatus)} → ${this.statusBadge(newStatus)}\n\n`,
            );
            stream.markdown(this.formatItemDetail(item));

            this.logger.info('Planning item status updated via NL chat', {
                component: 'NlPlanningChatHandler',
                itemId: item.id,
                previousStatus,
                newStatus,
            });
        } catch (error) {
            this.logger.error('Failed to update item status', {
                component: 'NlPlanningChatHandler',
                error: error instanceof Error ? error.message : String(error),
            });
            stream.markdown(
                `❌ **Update error:** ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            );
        }
    }

    // ─── Pipeline Trigger Flow ───────────────────────────────────

    /**
     * Handle a pipeline/skill trigger command from chat.
     *
     * @param pipelineName - The name of the pipeline or skill to trigger
     * @param stream - The chat response stream
     */
    public async handlePipelineTrigger(
        pipelineName: string,
        stream: vscode.ChatResponseStream,
    ): Promise<void> {
        if (!pipelineName) {
            stream.markdown('❌ Please specify a pipeline or skill name.\n\n');
            stream.markdown('**Usage:** "Run pipeline build-and-test"\n');
            return;
        }

        stream.progress(`Triggering pipeline: ${pipelineName}…`);

        try {
            // Attempt to execute the pipeline via VS Code command
            const commandId = `aicc.runSkill`;
            const commands = await vscode.commands.getCommands(true);

            if (commands.includes(commandId)) {
                await vscode.commands.executeCommand(commandId, pipelineName);
                stream.markdown(`✅ Pipeline **${pipelineName}** triggered successfully.\n`);
            } else {
                // Fallback: try the generic run command
                const fallbackId = `aicc.runPipeline`;
                if (commands.includes(fallbackId)) {
                    await vscode.commands.executeCommand(fallbackId, pipelineName);
                    stream.markdown(`✅ Pipeline **${pipelineName}** triggered successfully.\n`);
                } else {
                    stream.markdown(
                        `⚠️ Pipeline command not available. ` +
                        `Make sure the **${pipelineName}** skill or pipeline is registered.\n\n` +
                        `Available trigger commands:\n` +
                        `- \`aicc.runSkill\`\n` +
                        `- \`aicc.runPipeline\`\n`,
                    );
                }
            }

            this.logger.info('Pipeline trigger requested via NL chat', {
                component: 'NlPlanningChatHandler',
                pipelineName,
            });
        } catch (error) {
            this.logger.error('Failed to trigger pipeline', {
                component: 'NlPlanningChatHandler',
                pipelineName,
                error: error instanceof Error ? error.message : String(error),
            });
            stream.markdown(
                `❌ **Pipeline error:** ${error instanceof Error ? error.message : 'Unknown error'}\n`,
            );
        }
    }

    // ─── Plan Data I/O ───────────────────────────────────────────

    /**
     * Load the PLAN.json from the workspace.
     *
     * @returns The parsed plan data, or null if not found
     */
    private async loadPlanData(): Promise<IPlanData | null> {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return null;
            }

            const planPath = path.join(
                workspaceFolders[0].uri.fsPath,
                '.project',
                'PLAN.json',
            );

            if (!fs.existsSync(planPath)) {
                return null;
            }

            const content = fs.readFileSync(planPath, 'utf-8');
            return JSON.parse(content) as IPlanData;
        } catch (error) {
            this.logger.error('Failed to load PLAN.json', {
                component: 'NlPlanningChatHandler',
                error: error instanceof Error ? error.message : String(error),
            });
            return null;
        }
    }

    /**
     * Save the plan data back to PLAN.json.
     *
     * @param planData - The plan data to save
     */
    private async savePlanData(planData: IPlanData): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder available');
        }

        const planPath = path.join(
            workspaceFolders[0].uri.fsPath,
            '.project',
            'PLAN.json',
        );

        // Update metadata timestamp
        planData.metadata.updatedAt = new Date().toISOString();

        fs.writeFileSync(planPath, JSON.stringify(planData, null, 2), 'utf-8');

        this.logger.debug('PLAN.json saved', {
            component: 'NlPlanningChatHandler',
            itemCount: planData.items.length,
        });
    }

    /**
     * Generate the next sequential AICC-NNNN ID.
     *
     * @param planData - Current plan data
     * @returns Next available ID string
     */
    private generateNextId(planData: IPlanData): string {
        let maxNum = 0;
        for (const item of planData.items) {
            const match = item.id.match(/AICC-(\d+)/i);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                    maxNum = num;
                }
            }
        }
        const nextNum = maxNum + 1;
        return `AICC-${nextNum.toString().padStart(4, '0')}`;
    }

    // ─── EventBus Integration ────────────────────────────────────

    /**
     * Emit a planning item created event on the EventBus.
     *
     * @param item - The newly created planning item
     */
    private async emitCreatedEvent(item: PlanningItem): Promise<void> {
        try {
            const channelKey = this.getCreatedChannel(item.type);
            if (!channelKey) {
                return;
            }

            const event: PlanningItemEvent = {
                timestamp: Date.now(),
                source: 'NlPlanningChatHandler',
                itemId: item.id,
                itemType: item.type as 'epic' | 'story' | 'task' | 'bug',
                action: 'created',
                after: item as unknown as Record<string, unknown>,
            };

            await this.eventBus.emit(channelKey, event);

            this.logger.debug('Emitted planning created event', {
                component: 'NlPlanningChatHandler',
                channel: channelKey,
                itemId: item.id,
            });
        } catch (error) {
            this.logger.warn('Failed to emit EventBus event', {
                component: 'NlPlanningChatHandler',
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    /**
     * Get the EventBus channel for a "created" event based on item type.
     *
     * @param type - The ItemType
     * @returns The channel string, or null if unknown type
     */
    private getCreatedChannel(type: ItemType | string): string | null {
        switch (type) {
            case ItemType.Epic:
                return EventChannels.Planning.Epic.Created;
            case ItemType.Story:
                return EventChannels.Planning.Story.Created;
            case ItemType.Task:
                return EventChannels.Planning.Task.Created;
            case ItemType.Bug:
                return EventChannels.Planning.Task.Created; // Bugs use task channels
            default:
                return null;
        }
    }

    /**
     * Get the EventBus channel for a "statusChanged" event based on item type.
     *
     * @param type - The ItemType
     * @returns The channel string, or null if unknown type
     */
    private getStatusChangedChannel(type: ItemType | string): string | null {
        switch (type) {
            case ItemType.Epic:
                return EventChannels.Planning.Epic.StatusChanged;
            case ItemType.Story:
                return EventChannels.Planning.Story.StatusChanged;
            case ItemType.Task:
                return EventChannels.Planning.Task.StatusChanged;
            case ItemType.Bug:
                return EventChannels.Planning.Task.StatusChanged;
            default:
                return null;
        }
    }

    // ─── Formatting Helpers ──────────────────────────────────────

    /**
     * Normalise a free-form status string to a valid status enum value.
     *
     * @param status - The raw status string
     * @returns Normalised status or null if invalid
     */
    private normaliseStatus(status: string): string | null {
        const normalised = status.toLowerCase().trim().replace(/\s+/g, '-');
        const validStatuses = ['todo', 'ready', 'pending', 'in-progress', 'review', 'done'];

        if (validStatuses.includes(normalised)) {
            return normalised;
        }

        // Common aliases
        const aliases: Record<string, string> = {
            'open': 'todo',
            'new': 'todo',
            'backlog': 'todo',
            'started': 'in-progress',
            'working': 'in-progress',
            'wip': 'in-progress',
            'active': 'in-progress',
            'pr': 'review',
            'reviewing': 'review',
            'code-review': 'review',
            'complete': 'done',
            'completed': 'done',
            'finished': 'done',
            'closed': 'done',
            'resolved': 'done',
        };

        return aliases[normalised] ?? null;
    }

    /**
     * Get emoji for item type.
     * @param type - The item type string
     * @returns Emoji + type label
     */
    private typeEmoji(type: string): string {
        switch (type) {
            case 'epic': return '🏔️ Epic';
            case 'story': return '📖 Story';
            case 'task': return '✅ Task';
            case 'bug': return '🐛 Bug';
            default: return '📋 Item';
        }
    }

    /**
     * Format a status value as a styled badge.
     * @param status - The status string
     * @returns Formatted status badge
     */
    private statusBadge(status: string): string {
        switch (status) {
            case 'todo': return '⬜ Todo';
            case 'ready': return '🟦 Ready';
            case 'pending': return '🟡 Pending';
            case 'in-progress': return '🔵 In Progress';
            case 'review': return '🟣 Review';
            case 'done': return '✅ Done';
            default: return status;
        }
    }

    /**
     * Format a priority value as a styled badge.
     * @param priority - The priority string
     * @returns Formatted priority badge
     */
    private priorityBadge(priority: string): string {
        switch (priority) {
            case 'high': return '🔴 High';
            case 'medium': return '🟠 Medium';
            case 'low': return '🟢 Low';
            default: return priority;
        }
    }

    /**
     * Format an ItemType enum value for display.
     * @param type - The ItemType
     * @returns Emoji-prefixed type label
     */
    private formatType(type: ItemType): string {
        return this.typeEmoji(type);
    }
}
