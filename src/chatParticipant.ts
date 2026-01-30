import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';
import { AgentDetector } from './agentDetector';

/**
 * Plan item for /ailey-run command
 */
interface PlanItem {
    id: string;
    projectNumber?: number;
    type: string;
    summary: string;
    description?: string;
    status: string;
    priority?: string;
    assignee?: string;
    agent?: string;
    storyPoints?: number;
}

/**
 * Agent definition parsed from .agent.md files
 */
export interface AgentDefinition {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly filePath: string;
    readonly keywords: string[];
    readonly content: string;
    readonly metadata: Record<string, string>;
}

/**
 * Chat participant configuration
 */
export interface ChatParticipantConfig {
    participantId?: string; // default 'aicc.agent'
    agentsDirectory?: string; // default '.github/agents'
    enableStreaming?: boolean; // default true
    maxTokens?: number; // default 4000
}

/**
 * ChatParticipantManager handles registration and management of the @aicc chat participant.
 * Loads agent definitions from .github/agents/*.agent.md files and provides
 * intelligent responses based on agent context.
 * 
 * Requirements: Section 4.2
 */
export class ChatParticipantManager implements vscode.Disposable {
    private readonly logger: Logger;
    private readonly config: Required<ChatParticipantConfig>;
    private participant?: vscode.ChatParticipant;
    private agents: Map<string, AgentDefinition> = new Map();
    private disposables: vscode.Disposable[] = [];
    private watcher?: vscode.FileSystemWatcher;

    constructor(
        _agentDetector: AgentDetector,
        config: ChatParticipantConfig = {}
    ) {
        this.logger = Logger.getInstance();
        this.config = {
            participantId: config.participantId ?? 'aicc.agent',
            agentsDirectory: config.agentsDirectory ?? '.github/agents',
            enableStreaming: config.enableStreaming ?? true,
            maxTokens: config.maxTokens ?? 4000
        };

        this.logger.info('ChatParticipantManager initializing', {
            participantId: this.config.participantId,
            agentsDirectory: this.config.agentsDirectory
        });
    }

    /**
     * Initialize the chat participant and load agent definitions
     */
    public async initialize(context: vscode.ExtensionContext): Promise<void> {
        try {
            // Load agent definitions
            await this.loadAgentDefinitions();

            // Register the chat participant
            this.registerParticipant(context);

            // Watch for agent definition changes
            this.watchAgentDefinitions();

            this.logger.info('ChatParticipantManager initialized', {
                agentCount: this.agents.size
            });
        } catch (error) {
            this.logger.error('Failed to initialize ChatParticipantManager', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Load agent definitions from .github/agents/*.agent.md files
     */
    private async loadAgentDefinitions(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folder found, skipping agent loading');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const agentsPath = path.join(workspacePath, this.config.agentsDirectory);

        if (!fs.existsSync(agentsPath)) {
            this.logger.info('Agents directory not found', { agentsPath });
            return;
        }

        const files = fs.readdirSync(agentsPath);
        const agentFiles = files.filter(f => f.endsWith('.agent.md'));

        this.logger.info('Loading agent definitions', {
            directory: agentsPath,
            fileCount: agentFiles.length
        });

        this.agents.clear();

        for (const file of agentFiles) {
            try {
                const filePath = path.join(agentsPath, file);
                const agent = await this.parseAgentDefinition(filePath);
                this.agents.set(agent.id, agent);
                
                this.logger.debug('Loaded agent definition', {
                    id: agent.id,
                    name: agent.name,
                    file
                });
            } catch (error) {
                this.logger.error('Failed to parse agent definition', {
                    file,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        this.logger.info('Agent definitions loaded', {
            count: this.agents.size,
            agents: Array.from(this.agents.keys())
        });
    }

    /**
     * Parse an agent definition file
     */
    private async parseAgentDefinition(filePath: string): Promise<AgentDefinition> {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Parse frontmatter (YAML between ---\n and \n---)
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        const metadata: Record<string, string> = {};
        let name = '';
        let description = '';
        let keywords: string[] = [];

        if (frontmatterMatch) {
            const frontmatter = frontmatterMatch[1];
            const lines = frontmatter.split('\n');
            
            for (const line of lines) {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match) {
                    const [, key, value] = match;
                    metadata[key] = value.trim();
                    
                    if (key === 'name') {
                        name = value.replace(/['"`]/g, '').trim();
                    } else if (key === 'description') {
                        description = value.replace(/['"`]/g, '').trim();
                    } else if (key === 'keywords') {
                        // Parse keywords array: [keyword1, keyword2]
                        const keywordMatch = value.match(/\[(.*?)\]/);
                        if (keywordMatch) {
                            keywords = keywordMatch[1]
                                .split(',')
                                .map(k => k.trim().replace(/['"`]/g, ''));
                        }
                    }
                }
            }
        }

        // Generate ID from filename
        const fileName = path.basename(filePath, '.agent.md');
        const id = fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

        return {
            id,
            name: name || fileName,
            description: description || 'AI Command Center Agent',
            filePath,
            keywords,
            content,
            metadata
        };
    }

    /**
     * Register the chat participant
     */
    private registerParticipant(_context: vscode.ExtensionContext): void {
        try {
            const handler: vscode.ChatRequestHandler = async (
                request: vscode.ChatRequest,
                context: vscode.ChatContext,
                stream: vscode.ChatResponseStream,
                token: vscode.CancellationToken
            ) => {
                await this.handleChatRequest(request, context, stream, token);
            };

            this.participant = vscode.chat.createChatParticipant(
                this.config.participantId,
                handler
            );

            // Set participant metadata
            this.participant.iconPath = new vscode.ThemeIcon('rocket');
            
            this.disposables.push(this.participant);

            this.logger.info('Chat participant registered', {
                id: this.config.participantId
            });
        } catch (error) {
            this.logger.error('Failed to register chat participant', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Handle chat requests
     */
    private async handleChatRequest(
        request: vscode.ChatRequest,
        _context: vscode.ChatContext,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        const prompt = request.prompt.trim();

        this.logger.debug('Processing chat request', { prompt });

        // Show progress
        if (this.config.enableStreaming) {
            stream.progress('Processing your request...');
        }

        try {
            // Handle commands
            if (prompt.startsWith('/')) {
                await this.handleCommand(prompt, stream);
                return;
            }

            // Handle general queries
            await this.handleGeneralQuery(prompt, request, stream, token);

        } catch (error) {
            this.logger.error('Error handling chat request', {
                error: error instanceof Error ? error.message : String(error)
            });
            
            stream.markdown(`❌ **Error:** ${error instanceof Error ? error.message : 'Unknown error occurred'}\n\n`);
            stream.markdown('Please try rephrasing your question or use `/help` for available commands.');
        }
    }

    /**
     * Handle slash commands
     */
    private async handleCommand(
        command: string,
        stream: vscode.ChatResponseStream
    ): Promise<void> {
        const parts = command.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case '/list':
                await this.handleListCommand(stream);
                break;

            case '/agent':
                await this.handleAgentCommand(args, stream);
                break;

            case '/help':
                await this.handleHelpCommand(stream);
                break;

            case '/refresh':
                await this.handleRefreshCommand(stream);
                break;

            case '/ailey-run':
                await this.handleAileyRunCommand(args, stream);
                break;

            case '/run':
                await this.handleAileyRunCommand(args, stream);
                break;

            default:
                stream.markdown(`❓ Unknown command: \`${cmd}\`\n\n`);
                stream.markdown('Use `/help` to see available commands.');
        }
    }

    /**
     * List all available agents
     */
    private async handleListCommand(stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown('## Available Agents\n\n');

        if (this.agents.size === 0) {
            stream.markdown('No agents found. Make sure you have `.agent.md` files in `.github/agents/`.\n');
            return;
        }

        for (const agent of this.agents.values()) {
            stream.markdown(`### ${agent.name}\n`);
            stream.markdown(`- **ID:** \`${agent.id}\`\n`);
            stream.markdown(`- **Description:** ${agent.description}\n`);
            if (agent.keywords.length > 0) {
                stream.markdown(`- **Keywords:** ${agent.keywords.join(', ')}\n`);
            }
            stream.markdown('\n');
        }
    }

    /**
     * Switch to specific agent
     */
    private async handleAgentCommand(
        args: string[],
        stream: vscode.ChatResponseStream
    ): Promise<void> {
        if (args.length === 0) {
            stream.markdown('❌ Please specify an agent ID. Use `/list` to see available agents.\n');
            return;
        }

        const agentId = args[0].toLowerCase();
        const agent = this.agents.get(agentId);

        if (!agent) {
            stream.markdown(`❌ Agent \`${agentId}\` not found. Use \`/list\` to see available agents.\n`);
            return;
        }

        stream.markdown(`✅ Switched to agent: **${agent.name}**\n\n`);
        stream.markdown(`${agent.description}\n`);
    }

    /**
     * Show help
     */
    private async handleHelpCommand(stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown('## AI Command Center Chat Participant\n\n');
        stream.markdown('### Available Commands\n\n');
        stream.markdown('- `/list` - List all available agents\n');
        stream.markdown('- `/agent <id>` - Switch to specific agent\n');
        stream.markdown('- `/ailey-run <id|next>` - Execute a planning item\n');
        stream.markdown('- `/run <id|next>` - Alias for /ailey-run\n');
        stream.markdown('- `/refresh` - Reload agent definitions\n');
        stream.markdown('- `/help` - Show this help message\n\n');
        stream.markdown('### Examples\n\n');
        stream.markdown('- `@aicc /list` - See all agents\n');
        stream.markdown('- `@aicc /agent ailey-planner` - Use the planner agent\n');
        stream.markdown('- `@aicc /ailey-run 42` - Execute item with project number 42\n');
        stream.markdown('- `@aicc /run next` - Execute the next available item\n');
        stream.markdown('- `@aicc how do I create an epic?` - Ask a question\n');
    }

    /**
     * Refresh agent definitions
     */
    private async handleRefreshCommand(stream: vscode.ChatResponseStream): Promise<void> {
        stream.progress('Refreshing agent definitions...');
        await this.loadAgentDefinitions();
        stream.markdown(`✅ Refreshed agent definitions. Found ${this.agents.size} agents.\n`);
    }

    /**
     * Handle /ailey-run command for executing planning items
     */
    private async handleAileyRunCommand(
        args: string[],
        stream: vscode.ChatResponseStream
    ): Promise<void> {
        if (args.length === 0) {
            stream.markdown('❌ Please specify an item ID or "next" to run the next available item.\n\n');
            stream.markdown('**Usage:**\n');
            stream.markdown('- `/ailey-run <project-number>` - Run specific item\n');
            stream.markdown('- `/ailey-run next` - Run the next ready/open item\n');
            return;
        }

        const itemIdOrCommand = args[0].toLowerCase();

        stream.progress('Loading planning data...');

        // Load the PLAN.json to get item details
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            stream.markdown('❌ No workspace folder found.\n');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const planPath = path.join(workspacePath, '.project', 'PLAN.json');

        let planData: { items: PlanItem[] } | null = null;

        try {
            if (fs.existsSync(planPath)) {
                const content = fs.readFileSync(planPath, 'utf-8');
                planData = JSON.parse(content);
            }
        } catch (error) {
            this.logger.warn('Failed to load PLAN.json', { error: String(error) });
        }

        // Handle "next" command
        if (itemIdOrCommand === 'next') {
            await this.runNextItem(planData, stream);
            return;
        }

        // Find specific item
        const item = planData?.items?.find(
            i => i.id === itemIdOrCommand || 
                 i.projectNumber?.toString() === itemIdOrCommand ||
                 i.projectNumber === parseInt(itemIdOrCommand, 10)
        );

        if (!item) {
            stream.markdown(`❌ Item with ID "${args[0]}" not found.\n\n`);
            stream.markdown('Use `/list` to see available items, or `/ailey-run next` to run the next available item.\n');
            return;
        }

        await this.executeItem(item, stream);
    }

    /**
     * Find and run the next available item
     */
    private async runNextItem(
        planData: { items: PlanItem[] } | null,
        stream: vscode.ChatResponseStream
    ): Promise<void> {
        if (!planData?.items?.length) {
            stream.markdown('❌ No planning items found. Generate a PLAN.json first.\n');
            return;
        }

        // Priority: ready > open > todo, then by priority and creation date
        const statusPriority = ['ready', 'open', 'todo'];
        const priorityOrder = ['critical', 'high', 'medium', 'low'];

        const eligibleItems = planData.items.filter(
            item => statusPriority.includes(item.status) && item.type !== 'epic'
        );

        if (eligibleItems.length === 0) {
            stream.markdown('✅ All items are complete or in progress!\n');
            return;
        }

        // Sort by status priority, then by priority, then by creation date
        eligibleItems.sort((a, b) => {
            const statusDiff = statusPriority.indexOf(a.status) - statusPriority.indexOf(b.status);
            if (statusDiff !== 0) return statusDiff;

            const priorityDiff = priorityOrder.indexOf(a.priority || 'medium') - 
                                 priorityOrder.indexOf(b.priority || 'medium');
            if (priorityDiff !== 0) return priorityDiff;

            return 0;
        });

        const nextItem = eligibleItems[0];
        await this.executeItem(nextItem, stream);
    }

    /**
     * Execute a planning item with AI-ley Orchestrator
     */
    private async executeItem(item: PlanItem, stream: vscode.ChatResponseStream): Promise<void> {
        stream.markdown(`## 🚀 Executing: ${item.summary}\n\n`);
        stream.markdown(`**ID:** ${item.projectNumber || item.id}\n`);
        stream.markdown(`**Type:** ${item.type}\n`);
        stream.markdown(`**Status:** ${item.status} → in-progress\n\n`);

        if (item.description) {
            stream.markdown(`### Description\n${item.description}\n\n`);
        }

        // Build execution context
        stream.markdown('### Execution Context\n\n');
        
        if (item.assignee) {
            stream.markdown(`- **Assignee:** ${item.assignee}\n`);
        }
        if (item.agent) {
            stream.markdown(`- **Agent:** ${item.agent}\n`);
        }
        if (item.storyPoints) {
            stream.markdown(`- **Story Points:** ${item.storyPoints}\n`);
        }

        stream.markdown('\n---\n\n');
        stream.markdown('**Ready to proceed.** Provide instructions or ask questions to continue.\n\n');

        // Update item status to in-progress
        try {
            await vscode.commands.executeCommand('aicc.updateItemStatus', item.id, 'in-progress');
        } catch {
            // Status update is optional, don't fail the command
        }

        // Store context for follow-up queries
        this.logger.info('Item execution started', {
            itemId: item.id,
            type: item.type,
            summary: item.summary
        });
    }

    /**
     * Handle general queries using language model
     */
    private async handleGeneralQuery(
        prompt: string,
        request: vscode.ChatRequest,
        stream: vscode.ChatResponseStream,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Build system prompt with agent context
        const systemPrompt = this.buildSystemPrompt();

        const messages = [
            vscode.LanguageModelChatMessage.User(systemPrompt),
            vscode.LanguageModelChatMessage.User(prompt)
        ];

        try {
            // Use the model from the request
            const chatResponse = await request.model.sendRequest(messages, {}, token);

            // Stream the response
            for await (const fragment of chatResponse.text) {
                stream.markdown(fragment);
            }
        } catch (error) {
            this.logger.error('Error querying language model', {
                error: error instanceof Error ? error.message : String(error)
            });
            
            stream.markdown('⚠️ Unable to process request with language model. ');
            stream.markdown('Please make sure you have GitHub Copilot or another language model provider enabled.\n');
        }
    }

    /**
     * Build system prompt with AI Command Center context
     */
    private buildSystemPrompt(): string {
        return `You are the AI Command Center assistant, a VS Code extension for project planning and management.

You help users with:
- Creating and managing Epics, Stories, and Tasks
- Organizing project planning hierarchies
- Integrating with Jira for issue tracking
- Using the MCP (Model Context Protocol) server
- Configuring the extension

Available agents: ${Array.from(this.agents.values()).map(a => a.name).join(', ')}

Provide helpful, concise answers focused on AI Command Center functionality.`;
    }

    /**
     * Watch for agent definition changes
     */
    private watchAgentDefinitions(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const agentsPath = path.join(workspacePath, this.config.agentsDirectory);
        const pattern = new vscode.RelativePattern(agentsPath, '*.agent.md');

        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.watcher.onDidCreate(async () => {
            this.logger.info('Agent definition created, reloading');
            await this.loadAgentDefinitions();
        });

        this.watcher.onDidChange(async () => {
            this.logger.info('Agent definition changed, reloading');
            await this.loadAgentDefinitions();
        });

        this.watcher.onDidDelete(async () => {
            this.logger.info('Agent definition deleted, reloading');
            await this.loadAgentDefinitions();
        });

        this.disposables.push(this.watcher);
    }

    /**
     * Get all loaded agents
     */
    public getAgents(): readonly AgentDefinition[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get agent by ID
     */
    public getAgent(id: string): AgentDefinition | undefined {
        return this.agents.get(id);
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.logger.info('ChatParticipantManager disposing');
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
        this.agents.clear();
    }
}
