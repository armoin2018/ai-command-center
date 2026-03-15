/**
 * MCP Server Implementation
 * 
 * Model Context Protocol server exposing planning resources and tools
 * Supports stdio, HTTP, and HTTPS transports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as http from 'http';
import * as https from 'https';
import * as path from 'path';
import {
    CallToolRequestSchema,
    ListResourcesRequestSchema,
    ListToolsRequestSchema,
    ReadResourceRequestSchema,
    ListPromptsRequestSchema,
    GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PlanningManager } from '../planning/planningManager';
import { Logger } from '../logger';
import { Priority } from '../planning/types';
import { Epic } from '../planning/entities/epic';
import { Story } from '../planning/entities/story';
import { Task } from '../planning/entities/task';
import { EpicNode, StoryNode, TaskNode } from '../planning/treeBuilder/planningTree';
import { PROMPT_TEMPLATES, renderPrompt } from './promptTemplates';
import { MCPCache, RequestBatcher } from './mcpCache';
import { SecurityManager } from './securityManager';
import { AIKitLoaderService } from '../services/aiKitLoader';
import { WebSocketTransport } from './transports/webSocketTransport';
import { LogEndpoint } from './endpoints/logEndpoint';
import { CodiconsEndpoint, setCodiconsExtensionPath } from './endpoints/codiconsEndpoint';
import { SwaggerEndpoint } from './swagger';
import { PanelDataRoutes } from './routes/panelDataRoutes';
import { WorkspaceRegistration } from './leaderElection';

/** Flat planning item with type discriminator for API responses */
interface FlatPlanningItem {
    id: string;
    type: string;
    parentId?: string;
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    storyPoints?: number;
    tags?: string[];
    [key: string]: unknown;
}

export type TransportType = 'stdio' | 'http' | 'https' | 'websocket';

export interface MCPServerConfig {
    transport: TransportType;
    port?: number;
    host?: string;
    securityManager?: SecurityManager;
    extensionPath?: string;
    /** Extension version (e.g. '2.0.10'). Included in /health and validated on registration. */
    version?: string;
}

export class MCPServer {
    private server: Server;
    private httpServer: http.Server | https.Server | null = null;
    private wsTransport: WebSocketTransport | null = null;
    private planningManager: PlanningManager;
    private logger: Logger;
    private cache: MCPCache;
    private batcher: RequestBatcher;
    private config: MCPServerConfig;
    private securityManager: SecurityManager | null = null;
    private logEndpoint: LogEndpoint | null = null;
    private swaggerEndpoint: SwaggerEndpoint | null = null;
    private codiconsEndpoint: CodiconsEndpoint | null = null;
    private extensionPath: string | null = null;
    private panelDataRoutes: PanelDataRoutes | null = null;
    private startTime: number = Date.now();
    private registeredWorkspaces: WorkspaceRegistration[] = [];

    constructor(planningManager: PlanningManager, logger: Logger, config: MCPServerConfig = { transport: 'stdio' }) {
        this.planningManager = planningManager;
        this.logger = logger;
        this.config = config;
        this.cache = new MCPCache(5000, 100); // 5 second TTL, 100 max entries
        this.batcher = new RequestBatcher(50); // 50ms batch delay

        if (config.securityManager) {
            this.securityManager = config.securityManager;
        }

        if (config.extensionPath) {
            this.extensionPath = config.extensionPath;
        }

        this.server = new Server(
            {
                name: 'ai-command-center',
                version: '0.1.0',
            },
            {
                capabilities: {
                    resources: {},
                    tools: {},
                    prompts: {},
                },
            }
        );

        this.setupHandlers();
        this.initializeLogEndpoint();
        
        // Initialize panel data routes for separation of concerns architecture
        this.panelDataRoutes = new PanelDataRoutes();
    }

    private async initializeLogEndpoint(): Promise<void> {
        if (this.extensionPath && (this.config.transport === 'http' || this.config.transport === 'https')) {
            try {
                const logDir = path.join(this.extensionPath, 'logs');
                this.logEndpoint = new LogEndpoint({
                    logDir,
                    maxFileSize: 10 * 1024 * 1024, // 10MB
                    maxFiles: 5,
                    logger: this.logger
                });
                await this.logEndpoint.initialize();
                this.logger.info('Client log endpoint initialized', { component: 'MCPServer' });
            } catch (error: unknown) {
                this.logger.error('Failed to initialize log endpoint', error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    private setupHandlers(): void {
        // List available resources
        this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
            const epics = await this.planningManager.listEpics();
            
            return {
                resources: [
                    {
                        uri: 'aicc://planning/tree',
                        name: 'Planning Tree',
                        description: 'Complete hierarchical planning tree',
                        mimeType: 'application/json',
                    },
                    {
                        uri: 'aicc://planning/epics',
                        name: 'All Epics',
                        description: 'List of all epics',
                        mimeType: 'application/json',
                    },
                    ...epics.map((epic) => ({
                        uri: `aicc://planning/epic/${epic.id}`,
                        name: `Epic: ${epic.title}`,
                        description: epic.description,
                        mimeType: 'application/json',
                    })),
                ],
            };
        });

        // Read resource content
        this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
            const uri = request.params.uri;
            const cacheKey = MCPCache.resourceKey(uri);

            // Check cache first
            const cached = this.cache.get(cacheKey);
            if (cached) {
                this.logger.info('Cache hit for resource', { component: 'MCPServer', uri });
                return cached;
            }

            // Batch requests for the same resource
            return this.batcher.batch(cacheKey, async () => {
                let response: { contents: Array<{ uri: string; mimeType: string; text: string }> } | null = null;

                if (uri === 'aicc://planning/tree') {
                    const tree = await this.planningManager.rebuildTree();
                    response = {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(tree, null, 2),
                            },
                        ],
                    };
                }

                if (uri === 'aicc://planning/epics') {
                    const epics = await this.planningManager.listEpics();
                    response = {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify(epics, null, 2),
                            },
                        ],
                    };
                }

                if (uri.startsWith('aicc://planning/epic/')) {
                    const epicId = uri.replace('aicc://planning/epic/', '');
                    const epic = await this.planningManager.getEpic(epicId);
                    const stories = await this.planningManager.listStories(epicId);
                    
                    response = {
                        contents: [
                            {
                                uri,
                                mimeType: 'application/json',
                                text: JSON.stringify({ epic, stories }, null, 2),
                            },
                        ],
                    };
                }

                if (!response) {
                    throw new Error(`Unknown resource: ${uri}`);
                }

                // Cache the response
                this.cache.set(cacheKey, response);
                return response;
            });
        });

        // List available prompts
        this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
            return {
                prompts: PROMPT_TEMPLATES.map(template => ({
                    name: template.name,
                    description: template.description,
                    arguments: template.arguments,
                })),
            };
        });

        // Get prompt content
        this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            const template = PROMPT_TEMPLATES.find(t => t.name === name);
            
            if (!template) {
                throw new Error(`Unknown prompt: ${name}`);
            }

            const rendered = renderPrompt(template, args || {});
            
            return {
                messages: [
                    {
                        role: 'user',
                        content: {
                            type: 'text',
                            text: rendered,
                        },
                    },
                ],
            };
        });

        // List available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'create_epic',
                        description: 'Create a new epic with metadata',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'Epic name',
                                },
                                description: {
                                    type: 'string',
                                    description: 'Epic description',
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high', 'critical'],
                                    description: 'Priority level',
                                },
                                tags: {
                                    type: 'array',
                                    items: { type: 'string' },
                                    description: 'Tags for categorization',
                                },
                            },
                            required: ['name', 'description'],
                        },
                    },
                    {
                        name: 'create_story',
                        description: 'Create a new story under an epic',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                epicId: {
                                    type: 'string',
                                    description: 'Parent epic ID',
                                },
                                name: {
                                    type: 'string',
                                    description: 'Story name',
                                },
                                description: {
                                    type: 'string',
                                    description: 'User story description',
                                },
                                storyPoints: {
                                    type: 'number',
                                    description: 'Story point estimate',
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high', 'critical'],
                                    description: 'Priority level',
                                },
                            },
                            required: ['epicId', 'name', 'description'],
                        },
                    },
                    {
                        name: 'create_task',
                        description: 'Create a new task under a story',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                epicId: {
                                    type: 'string',
                                    description: 'Parent epic ID',
                                },
                                storyId: {
                                    type: 'string',
                                    description: 'Parent story ID',
                                },
                                name: {
                                    type: 'string',
                                    description: 'Task name',
                                },
                                description: {
                                    type: 'string',
                                    description: 'Task description',
                                },
                                estimatedHours: {
                                    type: 'number',
                                    description: 'Estimated hours to complete',
                                },
                            },
                            required: ['epicId', 'storyId', 'name', 'description'],
                        },
                    },
                    {
                        name: 'update_epic',
                        description: 'Update an existing epic',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'Epic ID to update',
                                },
                                updates: {
                                    type: 'object',
                                    description: 'Fields to update',
                                },
                            },
                            required: ['id', 'updates'],
                        },
                    },
                    {
                        name: 'list_epics',
                        description: 'List all epics with optional filtering',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                status: {
                                    type: 'string',
                                    enum: ['planning', 'in-progress', 'done', 'pending'],
                                    description: 'Filter by status',
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high', 'critical'],
                                    description: 'Filter by priority',
                                },
                            },
                        },
                    },
                    {
                        name: 'get_planning_tree',
                        description: 'Get the complete hierarchical planning tree',
                        inputSchema: {
                            type: 'object',
                            properties: {},
                        },
                    },                    {
                        name: 'search_items',
                        description: 'Search for epics, stories, or tasks by name, description, or other criteria',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                query: {
                                    type: 'string',
                                    description: 'Search query (searches name and description)',
                                },
                                type: {
                                    type: 'string',
                                    enum: ['epic', 'story', 'task'],
                                    description: 'Item type to search for (optional)',
                                },
                                status: {
                                    type: 'string',
                                    enum: ['todo', 'in-progress', 'done', 'pending'],
                                    description: 'Filter by status (optional)',
                                },
                                priority: {
                                    type: 'string',
                                    enum: ['low', 'medium', 'high', 'critical'],
                                    description: 'Filter by priority (optional, epics and stories only)',
                                },
                            },
                            required: ['query'],
                        },
                    },
                    {
                        name: 'update_status',
                        description: 'Update the status of an epic, story, or task',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['epic', 'story', 'task'],
                                    description: 'Type of item to update',
                                },
                                id: {
                                    type: 'string',
                                    description: 'ID of the item',
                                },
                                status: {
                                    type: 'string',
                                    enum: ['todo', 'in-progress', 'done', 'pending'],
                                    description: 'New status',
                                },
                            },
                            required: ['type', 'id', 'status'],
                        },
                    },                ],
            };
        });

        // Handle tool calls
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            try {
                switch (name) {
                    case 'create_epic': {
                        if (!args) throw new Error('Missing arguments');
                        const epic = await this.planningManager.createEpic({
                            title: args.name as string,
                            description: args.description as string,
                            priority: (args.priority as Priority) || 'medium',
                        });
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Created epic: ${epic.id}\n${JSON.stringify(epic, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'create_story': {
                        if (!args) throw new Error('Missing arguments');
                        const story = await this.planningManager.createStory(
                            args.epicId as string,
                            {
                                title: args.name as string,
                                description: args.description as string,
                                storyPoints: (args.storyPoints as number) || 0,
                                priority: (args.priority as Priority) || 'medium',
                            }
                        );
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Created story: ${story.id}\n${JSON.stringify(story, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'create_task': {
                        if (!args) throw new Error('Missing arguments');
                        const task = await this.planningManager.createTask(
                            args.epicId as string,
                            args.storyId as string,
                            {
                                title: args.name as string,
                                description: args.description as string,
                            }
                        );
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Created task: ${task.id}\n${JSON.stringify(task, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'update_epic': {
                        if (!args) throw new Error('Missing arguments');
                        const epic = await this.planningManager.updateEpic(
                            args.id as string,
                            args.updates as Partial<Epic>
                        );
                        if (!epic) throw new Error('Epic not found');
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Updated epic: ${epic.id}\n${JSON.stringify(epic, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'list_epics': {
                        const epics = await this.planningManager.listEpics();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Found ${epics.length} epics\n${JSON.stringify(epics, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'get_planning_tree': {
                        const tree = await this.planningManager.rebuildTree();
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(tree, null, 2),
                                },
                            ],
                        };
                    }

                    case 'search_items': {
                        if (!args) throw new Error('Missing arguments');
                        const { query, type, status, priority } = args;
                        const tree = await this.planningManager.rebuildTree();
                        const results: FlatPlanningItem[] = [];

                        // Recursive search function
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tree nodes have varying shapes
                        const searchNode = (node: Record<string, any>, nodeType: string) => {
                            const matchesQuery = 
                                node.name?.toLowerCase().includes((query as string).toLowerCase()) ||
                                node.description?.toLowerCase().includes((query as string).toLowerCase());
                            const matchesType = !type || nodeType === type;
                            const matchesStatus = !status || node.status === status;
                            const matchesPriority = !priority || node.priority === priority;

                            if (matchesQuery && matchesType && matchesStatus && matchesPriority) {
                                results.push({ ...node, type: nodeType } as FlatPlanningItem);
                            }

                            // Search children
                            if (nodeType === 'epic' && node.stories) {
                                node.stories.forEach((story: StoryNode) => searchNode(story, 'story'));
                            }
                            if (nodeType === 'story' && node.tasks) {
                                node.tasks.forEach((task: TaskNode) => searchNode(task, 'task'));
                            }
                        };

                        // Search all epics
                        const treeEpics = tree.getAllEpics();
                        treeEpics.forEach((epic: EpicNode) => searchNode(epic, 'epic'));

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify({
                                        query,
                                        filters: { type, status, priority },
                                        count: results.length,
                                        results,
                                    }, null, 2),
                                },
                            ],
                        };
                    }

                    case 'update_status': {
                        if (!args) throw new Error('Missing arguments');
                        const { type, id, status } = args;

                        let updated: Epic | null;
                        switch (type) {
                            case 'epic':
                                updated = await this.planningManager.updateEpic(
                                    id as string,
                                    { status: status as unknown as import('../planning/types').EpicStatus }
                                );
                                break;
                            case 'story':
                            case 'task':
                                // For story and task updates, we need to find the parent IDs first
                                // This is a limitation - need epic/story IDs to update
                                throw new Error('Story and task status updates require epic and story IDs. Use update_epic tool or update via the planning panel.');
                            default:
                                throw new Error(`Unknown item type: ${type}`);
                        }

                        if (!updated) {
                            throw new Error(`${type} not found: ${id}`);
                        }

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(updated, null, 2),
                                },
                            ],
                        };
                    }

                    case 'bulk_create_stories': {
                        if (!args) throw new Error('Missing arguments');
                        const { epicId, stories } = args;
                        const created: Story[] = [];
                        
                        for (const storyData of stories as Array<{ name: string; description: string; storyPoints?: number; priority?: string }>) {
                            const story = await this.planningManager.createStory(
                                epicId as string,
                                {
                                    title: storyData.name,
                                    description: storyData.description,
                                    storyPoints: storyData.storyPoints || 0,
                                    priority: (storyData.priority as Priority) || 'medium',
                                }
                            );
                            created.push(story);
                        }

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Created ${created.length} stories\n${JSON.stringify(created, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'bulk_create_tasks': {
                        if (!args) throw new Error('Missing arguments');
                        const { epicId, storyId, tasks } = args;
                        const created: Task[] = [];
                        
                        for (const taskData of tasks as Array<{ name: string; description: string }>) {
                            const task = await this.planningManager.createTask(
                                epicId as string,
                                storyId as string,
                                {
                                    title: taskData.name,
                                    description: taskData.description,
                                }
                            );
                            created.push(task);
                        }

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: `Created ${created.length} tasks\n${JSON.stringify(created, null, 2)}`,
                                },
                            ],
                        };
                    }

                    case 'get_epic_stats': {
                        if (!args) throw new Error('Missing arguments');
                        const { epicId } = args;
                        const tree = await this.planningManager.rebuildTree();
                        const epicNode = tree.getEpic(epicId as string);
                        
                        if (!epicNode) {
                            throw new Error(`Epic not found: ${epicId}`);
                        }

                        const stories = epicNode.getStories();
                        const tasks = epicNode.getAllTasks();
                        
                        const stats = {
                            epic: {
                                id: epicNode.id,
                                name: epicNode.name,
                                status: epicNode.status,
                            },
                            stories: {
                                total: stories.length,
                                byStatus: {
                                    'todo': stories.filter(s => s.status === 'todo').length,
                                    'in-progress': stories.filter(s => s.status === 'in-progress').length,
                                    'done': stories.filter(s => s.status === 'done').length,
                                    'pending': stories.filter(s => s.status === 'pending').length,
                                },
                            },
                            tasks: {
                                total: tasks.length,
                                byStatus: {
                                    'todo': tasks.filter(t => t.status === 'todo').length,
                                    'in-progress': tasks.filter(t => t.status === 'in-progress').length,
                                    'done': tasks.filter(t => t.status === 'done').length,
                                    'pending': tasks.filter(t => t.status === 'pending').length,
                                },
                            },
                            storyPoints: {
                                total: epicNode.getTotalStoryPoints(),
                                completed: stories
                                    .filter(s => s.status === 'done')
                                    .reduce((sum, s) => sum + s.storyPoints, 0),
                            },
                            completion: {
                                percentage: epicNode.getCompletionPercentage(),
                            },
                        };

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(stats, null, 2),
                                },
                            ],
                        };
                    }

                    case 'get_planning_stats': {
                        const tree = await this.planningManager.rebuildTree();
                        const epics = tree.getAllEpics();
                        
                        const allStories = epics.flatMap(e => e.getStories());
                        const allTasks = epics.flatMap(e => e.getAllTasks());
                        
                        const stats = {
                            epics: {
                                total: epics.length,
                                byStatus: {
                                    'todo': epics.filter(e => e.status === 'todo').length,
                                    'in-progress': epics.filter(e => e.status === 'in-progress').length,
                                    'done': epics.filter(e => e.status === 'done').length,
                                    'pending': epics.filter(e => e.status === 'pending').length,
                                },
                            },
                            stories: {
                                total: allStories.length,
                                byStatus: {
                                    'todo': allStories.filter(s => s.status === 'todo').length,
                                    'in-progress': allStories.filter(s => s.status === 'in-progress').length,
                                    'done': allStories.filter(s => s.status === 'done').length,
                                    'pending': allStories.filter(s => s.status === 'pending').length,
                                },
                            },
                            tasks: {
                                total: allTasks.length,
                                byStatus: {
                                    'todo': allTasks.filter(t => t.status === 'todo').length,
                                    'in-progress': allTasks.filter(t => t.status === 'in-progress').length,
                                    'done': allTasks.filter(t => t.status === 'done').length,
                                    'pending': allTasks.filter(t => t.status === 'pending').length,
                                },
                            },
                            storyPoints: {
                                total: allStories.reduce((sum, s) => sum + s.storyPoints, 0),
                                completed: allStories
                                    .filter(s => s.status === 'done')
                                    .reduce((sum, s) => sum + s.storyPoints, 0),
                            },
                            completion: {
                                epicsPercentage: Math.round((epics.filter(e => e.status === 'done').length / (epics.length || 1)) * 100),
                                storiesPercentage: Math.round((allStories.filter(s => s.status === 'done').length / (allStories.length || 1)) * 100),
                                tasksPercentage: Math.round((allTasks.filter(t => t.status === 'done').length / (allTasks.length || 1)) * 100),
                            },
                        };

                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(stats, null, 2),
                                },
                            ],
                        };
                    }

                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
            } catch (error: unknown) {
                this.logger.error(`MCP tool error: ${name}`, error instanceof Error ? error : new Error(String(error)));
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    async start(): Promise<void> {
        switch (this.config.transport) {
            case 'stdio':
                await this.startStdio();
                break;
            case 'http':
                await this.startHttp(false);
                break;
            case 'https':
                await this.startHttp(true);
                break;
            case 'websocket':
                await this.startWebSocket();
                break;
            default:
                throw new Error(`Unknown transport type: ${this.config.transport}`);
        }
    }

    private async startStdio(): Promise<void> {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        this.logger.info('MCP Server started on stdio', { component: 'MCPServer' });
    }

    private async startHttp(useHttps: boolean): Promise<void> {
        const port = this.config.port || (useHttps ? 3001 : 3000);
        const host = this.config.host || 'localhost';

        // Validate localhost-only configuration if security manager is available
        if (this.securityManager) {
            this.securityManager.validateLocalhostOnly(host);
        }

        // Initialize log endpoint if extension path is available
        if (this.extensionPath) {
            this.logEndpoint = new LogEndpoint({
                logDir: path.join(this.extensionPath, 'logs'),
                maxFileSize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                logger: this.logger
            });
            await this.logEndpoint.initialize();
        }

        // Initialize Swagger endpoint for API documentation
        this.swaggerEndpoint = new SwaggerEndpoint(this.config, this.logger);
        
        // Set extension path for swagger-ui-dist resolution
        if (this.extensionPath) {
            const { setExtensionPath } = await import('./swagger');
            setExtensionPath(this.extensionPath);
        }

        // Initialize Codicons endpoint for font/CSS serving
        this.codiconsEndpoint = new CodiconsEndpoint(this.logger);
        if (this.extensionPath) {
            setCodiconsExtensionPath(this.extensionPath);
        }

        // Create HTTP request handler
        const requestHandler = this.createHttpRequestHandler();

        if (useHttps) {
            if (!this.securityManager) {
                throw new Error('HTTPS transport requires SecurityManager');
            }

            // Ensure SSL certificate exists
            const certificate = await this.securityManager.ensureCertificate();

            // Get TLS options
            const tlsOptions = this.securityManager.getTLSOptions(certificate.cert, certificate.key);

            // Create HTTPS server
            this.httpServer = https.createServer(tlsOptions, requestHandler);

            this.logger.info('MCP Server starting with HTTPS', {
                component: 'MCPServer',
                host,
                port,
                certPath: certificate.certPath
            });

            // Show certificate trust prompt
            await this.securityManager.promptCertificateTrust(certificate.certPath);
        } else {
            // Create HTTP server
            this.httpServer = http.createServer(requestHandler);

            this.logger.info('MCP Server starting with HTTP', {
                component: 'MCPServer',
                host,
                port
            });
        }

        // Start listening
        return new Promise((resolve, reject) => {
            this.httpServer!.listen(port, host, () => {
                const protocol = useHttps ? 'https' : 'http';
                this.logger.info(`MCP Server listening on ${protocol}://${host}:${port}`, {
                    component: 'MCPServer'
                });
                resolve();
            });

            this.httpServer!.on('error', (error) => {
                this.logger.error('MCP HTTP Server error', error);
                reject(error);
            });
        });
    }

    private createHttpRequestHandler(): (req: http.IncomingMessage, res: http.ServerResponse) => void {
        return async (req, res) => {
            try {
                // Set CORS headers — localhost-only
                const requestOrigin = req.headers.origin || '';
                const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin);
                res.setHeader('Access-Control-Allow-Origin', isLocalhost ? requestOrigin : '');
                res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
                res.setHeader('Vary', 'Origin');

                // Handle CORS preflight
                if (req.method === 'OPTIONS') {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                // Health check endpoint (AICC-0191: enriched for multi-workspace)
                if (req.method === 'GET' && req.url === '/health') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        status: 'ok',
                        role: 'leader',
                        server: 'ai-command-center-mcp',
                        version: this.config.version ?? '0.0.0',
                        uptime: Math.floor((Date.now() - this.startTime) / 1000),
                        workspaces: this.registeredWorkspaces,
                        pid: process.pid,
                        port: this.config.port ?? null,
                    }));
                    return;
                }

                // ── AICC-0195: Workspace registration API endpoints ──
                if (req.method === 'POST' && req.url === '/workspaces/register') {
                    const body = await this.parseRequestBody(req);
                    const ws: WorkspaceRegistration = JSON.parse(body);

                    // Reject workspaces running a different extension version
                    const serverVersion = this.config.version ?? '0.0.0';
                    if (ws.version && ws.version !== serverVersion) {
                        this.logger.warn('Workspace registration rejected: version mismatch', {
                            component: 'MCPServer',
                            workspaceId: ws.id,
                            workspaceVersion: ws.version,
                            serverVersion,
                        });
                        res.writeHead(409, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            status: 'error',
                            error: 'version_mismatch',
                            message: `Server is running v${serverVersion}, workspace is running v${ws.version}`,
                            serverVersion,
                        }));
                        return;
                    }

                    this.registerWorkspace(ws);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', workspaces: this.registeredWorkspaces }));
                    return;
                }

                if (req.method === 'GET' && req.url === '/workspaces') {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ workspaces: this.registeredWorkspaces }));
                    return;
                }

                // DELETE /workspaces/:id
                const wsDeleteMatch = req.url?.match(/^\/workspaces\/([^/]+)$/);
                if (req.method === 'DELETE' && wsDeleteMatch) {
                    const wsId = decodeURIComponent(wsDeleteMatch[1]);
                    this.unregisterWorkspace(wsId);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'ok', workspaces: this.registeredWorkspaces }));
                    return;
                }

                // Swagger UI and OpenAPI endpoints
                if (this.swaggerEndpoint && req.url && (req.url.startsWith('/api-docs') || req.url.startsWith('/swagger-ui/') || req.url === '/openapi.json')) {
                    const handled = await this.swaggerEndpoint.handleRequest(req, res);
                    if (handled) {
                        return;
                    }
                }

                // Codicons endpoint — serves codicon CSS & font files
                if (this.codiconsEndpoint && req.url?.startsWith('/codicons/')) {
                    const handled = await this.codiconsEndpoint.handleRequest(req, res);
                    if (handled) {
                        return;
                    }
                }

                // Client log endpoint
                if (req.method === 'POST' && req.url === '/mcp/log') {
                    if (this.logEndpoint) {
                        await this.logEndpoint.handleLogRequest(req, res);
                    } else {
                        res.writeHead(503, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Log endpoint not available' }));
                    }
                    return;
                }

                // Panel data REST endpoints (separation of concerns)
                if (req.url?.startsWith('/mcp/panels/') || req.url?.startsWith('/mcp/planning/')) {
                    if (this.panelDataRoutes) {
                        await this.panelDataRoutes.handleRequest(req, res);
                    } else {
                        res.writeHead(503, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Panel data routes not available' }));
                    }
                    return;
                }

                // Planning API endpoints
                if (req.url?.startsWith('/api/planning/')) {
                    await this.handlePlanningApiRequest(req, res);
                    return;
                }

                // AI Kit API endpoints
                if (req.url?.startsWith('/api/ai-kits/')) {
                    await this.handleAIKitApiRequest(req, res);
                    return;
                }

                // Only allow POST for MCP requests
                if (req.method !== 'POST') {
                    res.writeHead(405, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Method not allowed' }));
                    return;
                }

                // Parse request body
                const body = await this.parseRequestBody(req);
                const mcpRequest = JSON.parse(body);

                this.logger.info('Received MCP HTTP request', {
                    component: 'MCPServer',
                    method: mcpRequest.method
                });

                // Route MCP request to appropriate handler
                const response = await this.handleMCPRequest(mcpRequest);

                // Send response
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(response));

            } catch (error: unknown) {
                this.logger.error('HTTP request handler error', error instanceof Error ? error : new Error(String(error)));
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    error: 'Internal server error',
                    message: error instanceof Error ? error.message : String(error)
                }));
            }
        };
    }

    private parseRequestBody(req: http.IncomingMessage): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => resolve(body));
            req.on('error', reject);
        });
    }

    private async startWebSocket(): Promise<void> {
        const port = this.config.port || 3001;
        const host = this.config.host || 'localhost';

        // Validate localhost-only configuration if security manager is available
        if (this.securityManager) {
            this.securityManager.validateLocalhostOnly(host);
        }

        this.logger.info('MCP Server starting with WebSocket', {
            component: 'MCPServer',
            host,
            port
        });

        // Create WebSocket transport
        this.wsTransport = new WebSocketTransport(this.server, port);
        await this.wsTransport.start();

        this.logger.info(`MCP Server listening on ws://${host}:${port}`, {
            component: 'MCPServer',
            transport: 'websocket'
        });
    }

    private async handleMCPRequest(request: { id: string | number; method: string; params?: unknown }): Promise<{ jsonrpc: string; id: string | number; result: unknown }> {
        // This is a simplified router - in production, you'd route based on request.method
        // to the appropriate handler registered with the MCP server
        return {
            jsonrpc: '2.0',
            id: request.id,
            result: {
                message: 'MCP request received - full implementation pending'
            }
        };
    }

    async stop(): Promise<void> {
        // Stop WebSocket transport
        if (this.wsTransport) {
            await this.wsTransport.stop();
            this.wsTransport = null;
            this.logger.info('WebSocket transport stopped', { component: 'MCPServer' });
        }

        // Stop HTTP/HTTPS server
        if (this.httpServer) {
            await new Promise<void>((resolve, reject) => {
                this.httpServer!.close((err) => {
                    if (err) {
                        this.logger.error('Error stopping HTTP server', err);
                        reject(err);
                    } else {
                        this.logger.info('MCP HTTP Server stopped', { component: 'MCPServer' });
                        this.httpServer = null;
                        resolve();
                    }
                });
            });
        }

        // Stop MCP server
        await this.server.close();
        this.logger.info('MCP Server stopped', { component: 'MCPServer' });
    }

    // ── AICC-0191 / AICC-0195: Workspace registration helpers ──

    /**
     * Register (or update) a workspace in the in-memory list.
     */
    registerWorkspace(ws: WorkspaceRegistration): void {
        const idx = this.registeredWorkspaces.findIndex((w) => w.id === ws.id);
        if (idx >= 0) {
            this.registeredWorkspaces[idx] = ws;
        } else {
            this.registeredWorkspaces.push(ws);
        }
        this.logger.info('Workspace registered with MCP server', {
            component: 'MCPServer',
            workspaceId: ws.id,
        });
    }

    /**
     * Remove a workspace by ID from the in-memory list.
     */
    unregisterWorkspace(id: string): void {
        this.registeredWorkspaces = this.registeredWorkspaces.filter((w) => w.id !== id);
        this.logger.info('Workspace unregistered from MCP server', {
            component: 'MCPServer',
            workspaceId: id,
        });
    }

    /**
     * Return a snapshot of all currently registered workspaces.
     */
    getRegisteredWorkspaces(): WorkspaceRegistration[] {
        return [...this.registeredWorkspaces];
    }

    /**
     * Get WebSocket transport for broadcasting updates
     */
    getWebSocketTransport(): WebSocketTransport | null {
        return this.wsTransport;
    }

    /**
     * Broadcast update to WebSocket clients
     */
    broadcastUpdate(resource: string, data: unknown): void {
        if (this.wsTransport) {
            this.wsTransport.broadcastUpdate(resource, data);
        }
    }

    /**
     * Handle Planning API requests
     */
    private async handlePlanningApiRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = req.url || '';
        
        try {
            // GET /api/planning/status-counts
            if (req.method === 'GET' && url === '/api/planning/status-counts') {
                const items = await this.getAllPlanningItems();
                const counts: Record<string, number> = {
                    'backlog': 0,
                    'todo': 0,
                    'open': 0,
                    'ready': 0,
                    'in-progress': 0,
                    'blocked': 0,
                    'review': 0,
                    'done': 0,
                    'hold': 0,
                    'error': 0
                };
                
                for (const item of items) {
                    const status = item.status || 'backlog';
                    if (status in counts) {
                        counts[status]++;
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: counts }));
                return;
            }
            
            // GET /api/planning/items
            if (req.method === 'GET' && url.startsWith('/api/planning/items')) {
                const urlParams = new URL(url, `http://${req.headers.host}`);
                const type = urlParams.searchParams.get('type');
                const status = urlParams.searchParams.get('status');
                const parent = urlParams.searchParams.get('parent');
                
                let items = await this.getAllPlanningItems();
                
                // Apply filters
                if (type) {
                    items = items.filter((i: { type?: string }) => i.type === type);
                }
                if (status) {
                    const statuses = status.split(',');
                    items = items.filter((i: { status?: string }) => statuses.includes(i.status || 'backlog'));
                }
                if (parent) {
                    items = items.filter((i: { parentId?: string }) => i.parentId === parent);
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: items }));
                return;
            }
            
            // GET /api/planning/items/:id
            const itemMatch = url.match(/^\/api\/planning\/items\/([^/]+)$/);
            if (req.method === 'GET' && itemMatch) {
                const itemId = itemMatch[1];
                const item = await this.getPlanningItem(itemId);
                
                if (item) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, data: item }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Item not found' }));
                }
                return;
            }
            
            // POST /api/planning/items - Create new item
            if (req.method === 'POST' && url === '/api/planning/items') {
                const body = await this.parseRequestBody(req);
                const data = JSON.parse(body);
                
                // Create item based on type
                let result;
                switch (data.type) {
                    case 'epic':
                        result = await this.planningManager.createEpic({
                            title: data.summary || data.title,
                            description: data.description,
                            priority: data.priority || Priority.Medium
                        });
                        break;
                    case 'story':
                        result = await this.planningManager.createStory(data.epicId || data.parentId, {
                            title: data.summary || data.title,
                            description: data.description,
                            priority: data.priority || Priority.Medium,
                            storyPoints: data.storyPoints
                        });
                        break;
                    case 'task':
                        result = await this.planningManager.createTask(
                            data.epicId || data.parentId?.split('/')[0],
                            data.storyId || data.parentId?.split('/')[1] || data.parentId,
                            {
                                title: data.summary || data.title,
                                description: data.description,
                                priority: data.priority || Priority.Medium,
                                storyPoints: data.storyPoints,
                                assignee: data.assignee
                            }
                        );
                        break;
                    default:
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Invalid item type' }));
                        return;
                }
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: result }));
                return;
            }
            
            // PUT /api/planning/items/:id - Update item
            const updateMatch = url.match(/^\/api\/planning\/items\/([^/]+)$/);
            if (req.method === 'PUT' && updateMatch) {
                const itemId = updateMatch[1];
                const body = await this.parseRequestBody(req);
                const updates = JSON.parse(body);
                
                const result = await this.updatePlanningItem(itemId, updates);
                
                if (result) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, data: result }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Item not found' }));
                }
                return;
            }
            
            // DELETE /api/planning/items/:id - Delete item
            const deleteMatch = url.match(/^\/api\/planning\/items\/([^/]+)$/);
            if (req.method === 'DELETE' && deleteMatch) {
                const itemId = deleteMatch[1];
                
                await this.deletePlanningItem(itemId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: 'Item deleted' }));
                return;
            }
            
            // GET /api/planning/items/:id/comments
            const commentsMatch = url.match(/^\/api\/planning\/items\/([^/]+)\/comments$/);
            if (req.method === 'GET' && commentsMatch) {
                const itemId = commentsMatch[1];
                const item = await this.getPlanningItem(itemId);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true, 
                    data: item?.comments || [] 
                }));
                return;
            }
            
            // Route not found
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Planning API endpoint not found' }));
            
        } catch (error: unknown) {
            this.logger.error('Planning API error', error instanceof Error ? error : new Error(String(error)));
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }));
        }
    }

    /**
     * Get all planning items (epics, stories, tasks)
     */
    private async getAllPlanningItems(): Promise<FlatPlanningItem[]> {
        const allItems: FlatPlanningItem[] = [];
        
        const epics = await this.planningManager.listEpics();
        for (const epic of epics) {
            allItems.push({ ...epic, type: 'epic' });
            
            const stories = await this.planningManager.listStories(epic.id);
            for (const story of stories) {
                allItems.push({ ...story, type: 'story', parentId: epic.id });
                
                const tasks = await this.planningManager.listTasks(epic.id, story.id);
                for (const task of tasks) {
                    allItems.push({ ...task, type: 'task', parentId: story.id });
                }
            }
        }
        
        return allItems;
    }

    /**
     * Get a specific planning item by ID
     */
    private async getPlanningItem(itemId: string): Promise<FlatPlanningItem | null> {
        // Try to find as epic
        const epic = await this.planningManager.getEpic(itemId);
        if (epic) return { ...epic, type: 'epic' };
        
        // Try to find as story or task in all epics
        const epics = await this.planningManager.listEpics();
        for (const e of epics) {
            const story = await this.planningManager.getStory(e.id, itemId);
            if (story) return { ...story, type: 'story', parentId: e.id };
            
            const stories = await this.planningManager.listStories(e.id);
            for (const s of stories) {
                const task = await this.planningManager.getTask(e.id, s.id, itemId);
                if (task) return { ...task, type: 'task', parentId: s.id };
            }
        }
        
        return null;
    }

    /**
     * Update a planning item by ID
     */
    private async updatePlanningItem(itemId: string, updates: Record<string, unknown>): Promise<Epic | Story | Task | null> {
        // Try to update as epic
        const epic = await this.planningManager.getEpic(itemId);
        if (epic) {
            return await this.planningManager.updateEpic(itemId, updates);
        }
        
        // Try to find and update as story or task
        const epics = await this.planningManager.listEpics();
        for (const e of epics) {
            const story = await this.planningManager.getStory(e.id, itemId);
            if (story) {
                return await this.planningManager.updateStory(e.id, itemId, updates);
            }
            
            const stories = await this.planningManager.listStories(e.id);
            for (const s of stories) {
                const task = await this.planningManager.getTask(e.id, s.id, itemId);
                if (task) {
                    return await this.planningManager.updateTask(e.id, s.id, itemId, updates);
                }
            }
        }
        
        return null;
    }

    /**
     * Delete a planning item by ID
     */
    private async deletePlanningItem(itemId: string): Promise<boolean> {
        // Try to delete as epic
        const epic = await this.planningManager.getEpic(itemId);
        if (epic) {
            return await this.planningManager.deleteEpic(itemId);
        }
        
        // Try to find and delete as story or task
        const epics = await this.planningManager.listEpics();
        for (const e of epics) {
            const story = await this.planningManager.getStory(e.id, itemId);
            if (story) {
                return await this.planningManager.deleteStory(e.id, itemId);
            }
            
            const stories = await this.planningManager.listStories(e.id);
            for (const s of stories) {
                const task = await this.planningManager.getTask(e.id, s.id, itemId);
                if (task) {
                    return await this.planningManager.deleteTask(e.id, s.id, itemId);
                }
            }
        }
        
        return false;
    }

    /**
     * Handle AI Kit API requests
     */
    private async handleAIKitApiRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const url = req.url || '';
        
        try {
            // GET /api/ai-kits/repos - List available repositories
            if (req.method === 'GET' && url === '/api/ai-kits/repos') {
                // Return configured AI Kit repositories
                const repos = [
                    {
                        id: 'ai-ley-official',
                        name: 'AI-ley Official',
                        description: 'Official AI-ley development toolkit',
                        url: 'https://github.com/armoin2018/ai-ley',
                        branch: 'dev',
                        enabled: true,
                        featured: true
                    }
                ];
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: repos }));
                return;
            }
            
            // GET /api/ai-kits/available - List available kits from selected repo
            if (req.method === 'GET' && url.startsWith('/api/ai-kits/available')) {
                const kitLoader = AIKitLoaderService.getInstance();
                const kits = await kitLoader.getAvailableKits();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: kits }));
                return;
            }
            
            // GET /api/ai-kits/installed - List installed kits
            if (req.method === 'GET' && url === '/api/ai-kits/installed') {
                const kitLoader = AIKitLoaderService.getInstance();
                const installed = kitLoader.getInstalledKits();
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: installed }));
                return;
            }
            
            // POST /api/ai-kits/install - Install a kit
            if (req.method === 'POST' && url === '/api/ai-kits/install') {
                const body = await this.parseRequestBody(req);
                const { kitId, targetSystem, repo } = JSON.parse(body);
                
                const kitLoader = AIKitLoaderService.getInstance();
                const repoConfig = kitLoader.getRepositories().find(r => r.id === repo || r.url === repo);
                const repoUrl = repoConfig?.url || repo;
                const branch = repoConfig?.branch || 'dev';
                
                this.logger.info('Installing AI Kit', { kitId, targetSystem, repo: repoUrl });
                const result = await kitLoader.installKit(kitId, repoUrl, branch, targetSystem);
                
                res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: result.success, 
                    data: result
                }));
                return;
            }
            
            // DELETE /api/ai-kits/uninstall/:id - Uninstall a kit
            const uninstallMatch = url.match(/^\/api\/ai-kits\/uninstall\/([^/]+)$/);
            if (req.method === 'DELETE' && uninstallMatch) {
                const kitId = uninstallMatch[1];
                
                const kitLoader = AIKitLoaderService.getInstance();
                this.logger.info('Uninstalling AI Kit', { kitId });
                const result = await kitLoader.uninstallKit(kitId);
                
                res.writeHead(result.success ? 200 : 400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: result.success, 
                    data: result
                }));
                return;
            }
            
            // Route not found
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'AI Kit API endpoint not found' }));
            
        } catch (error: unknown) {
            this.logger.error('AI Kit API error', error instanceof Error ? error : new Error(String(error)));
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }));
        }
    }
}
