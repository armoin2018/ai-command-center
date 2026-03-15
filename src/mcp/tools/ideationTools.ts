/**
 * Ideation MCP Tools
 *
 * Full CRUD + voting + promotion tool handlers for the Ideation subsystem.
 * Each handler validates inputs, delegates to {@link IdeationService}, and
 * returns a standardised AiccMsg envelope.
 *
 * Part of AICC-0113: Ideation System & Jira Sync
 *   - AICC-0118 / AICC-0327: Implement MCP CRUD tools for ideas
 */

import type { McpToolDefinition, McpToolResult } from './planningCrudTools';
import { IdeationService } from '../../services/ideationService';
import {
    VALID_IDEA_STATUSES,
    VALID_IDEA_CATEGORIES,
} from '../../types/ideation';
import type {
    IdeaCategory,
    IdeaStatus,
    VoteDirection,
} from '../../types/ideation';

// ─── Constants ───────────────────────────────────────────────────────

/**
 * Default workspace path used when no explicit path is supplied.
 * In a real VS Code extension this comes from the workspace folder,
 * but MCP tool handlers don't have direct access to it, so we fall
 * back to `process.cwd()`.
 */
function resolveWorkspace(args: Record<string, unknown>): string {
    return typeof args.workspacePath === 'string' && args.workspacePath
        ? args.workspacePath
        : process.cwd();
}

// ─── Validation Helpers ──────────────────────────────────────────────

function requireString(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null || val === '') {
        errors.push(`Missing required field: ${field}`);
        return undefined;
    }
    if (typeof val !== 'string') {
        errors.push(`Field '${field}' must be a string`);
        return undefined;
    }
    return val;
}

function optionalString(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (typeof val !== 'string') {
        errors.push(`Field '${field}' must be a string`);
        return undefined;
    }
    return val;
}

function optionalEnum(
    args: Record<string, unknown>,
    field: string,
    allowed: string[],
    errors: string[],
): string | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (typeof val !== 'string') {
        errors.push(`Field '${field}' must be a string`);
        return undefined;
    }
    if (!allowed.includes(val)) {
        errors.push(`Field '${field}' must be one of: ${allowed.join(', ')}`);
        return undefined;
    }
    return val;
}

function optionalStringArray(
    args: Record<string, unknown>,
    field: string,
    errors: string[],
): string[] | undefined {
    const val = args[field];
    if (val === undefined || val === null) {
        return undefined;
    }
    if (!Array.isArray(val)) {
        errors.push(`Field '${field}' must be an array of strings`);
        return undefined;
    }
    for (let i = 0; i < val.length; i++) {
        if (typeof val[i] !== 'string') {
            errors.push(`Field '${field}[${i}]' must be a string`);
            return undefined;
        }
    }
    return val as string[];
}

// ─── Response Envelope ───────────────────────────────────────────────

function envelope(
    toolName: string,
    startTime: number,
    data: unknown,
    errors?: string[],
): McpToolResult {
    return {
        success: !errors || errors.length === 0,
        data,
        ...(errors && errors.length > 0 ? { errors } : {}),
        meta: {
            toolName,
            duration: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        },
    };
}

// ─── Tool Definitions ────────────────────────────────────────────────

/**
 * create_idea — create a new idea.
 */
const createIdeaTool: McpToolDefinition = {
    name: 'create_idea',
    description:
        'Create a new idea with title, description, author, category, and optional tags.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            title: { type: 'string', description: 'Idea title' },
            description: { type: 'string', description: 'Idea description' },
            author: { type: 'string', description: 'Author identifier' },
            category: {
                type: 'string',
                enum: VALID_IDEA_CATEGORIES,
                description: 'Idea category',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional tags',
            },
        },
        required: ['title', 'description', 'author', 'category'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const title = requireString(args, 'title', errors);
        const description = requireString(args, 'description', errors);
        const author = requireString(args, 'author', errors);
        const category = optionalEnum(
            args, 'category', VALID_IDEA_CATEGORIES as string[], errors,
        ) as IdeaCategory | undefined;
        const tags = optionalStringArray(args, 'tags', errors);

        if (errors.length > 0 || !title || !description || !author || !category) {
            return envelope('create_idea', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const idea = svc.createIdea({
                title,
                description,
                author,
                category,
                tags,
            });
            return envelope('create_idea', start, idea);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('create_idea', start, null, [msg]);
        }
    },
};

/**
 * update_idea — update an existing idea.
 */
const updateIdeaTool: McpToolDefinition = {
    name: 'update_idea',
    description: 'Update an existing idea\'s title, description, category, status, or tags.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            ideaId: { type: 'string', description: 'Idea ID to update' },
            title: { type: 'string', description: 'New title' },
            description: { type: 'string', description: 'New description' },
            category: {
                type: 'string',
                enum: VALID_IDEA_CATEGORIES,
                description: 'New category',
            },
            status: {
                type: 'string',
                enum: VALID_IDEA_STATUSES,
                description: 'New status',
            },
            tags: {
                type: 'array',
                items: { type: 'string' },
                description: 'New tags',
            },
        },
        required: ['ideaId'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const ideaId = requireString(args, 'ideaId', errors);
        const title = optionalString(args, 'title', errors);
        const description = optionalString(args, 'description', errors);
        const category = optionalEnum(
            args, 'category', VALID_IDEA_CATEGORIES as string[], errors,
        ) as IdeaCategory | undefined;
        const status = optionalEnum(
            args, 'status', VALID_IDEA_STATUSES as string[], errors,
        ) as IdeaStatus | undefined;
        const tags = optionalStringArray(args, 'tags', errors);

        if (errors.length > 0 || !ideaId) {
            return envelope('update_idea', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const idea = svc.updateIdea(ideaId, {
                title,
                description,
                category,
                status,
                tags,
            });
            return envelope('update_idea', start, idea);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('update_idea', start, null, [msg]);
        }
    },
};

/**
 * delete_idea — delete an idea.
 */
const deleteIdeaTool: McpToolDefinition = {
    name: 'delete_idea',
    description: 'Delete an idea by ID.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            ideaId: { type: 'string', description: 'Idea ID to delete' },
        },
        required: ['ideaId'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const ideaId = requireString(args, 'ideaId', errors);

        if (errors.length > 0 || !ideaId) {
            return envelope('delete_idea', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            svc.deleteIdea(ideaId);
            return envelope('delete_idea', start, { deleted: ideaId });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('delete_idea', start, null, [msg]);
        }
    },
};

/**
 * list_ideas — list ideas with optional filters.
 */
const listIdeasTool: McpToolDefinition = {
    name: 'list_ideas',
    description:
        'List ideas with optional filters for status, category, author, tag, or search text.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            status: {
                type: 'string',
                enum: VALID_IDEA_STATUSES,
                description: 'Filter by status',
            },
            category: {
                type: 'string',
                enum: VALID_IDEA_CATEGORIES,
                description: 'Filter by category',
            },
            author: { type: 'string', description: 'Filter by author' },
            tag: { type: 'string', description: 'Filter by tag' },
            search: { type: 'string', description: 'Full-text search in title/description' },
        },
        required: [],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const status = optionalEnum(
            args, 'status', VALID_IDEA_STATUSES as string[], errors,
        ) as IdeaStatus | undefined;
        const category = optionalEnum(
            args, 'category', VALID_IDEA_CATEGORIES as string[], errors,
        ) as IdeaCategory | undefined;
        const author = optionalString(args, 'author', errors);
        const tag = optionalString(args, 'tag', errors);
        const search = optionalString(args, 'search', errors);

        if (errors.length > 0) {
            return envelope('list_ideas', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const ideas = svc.listIdeas({ status, category, author, tag, search });
            return envelope('list_ideas', start, {
                count: ideas.length,
                ideas,
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('list_ideas', start, null, [msg]);
        }
    },
};

/**
 * vote_idea — cast a vote on an idea.
 */
const voteIdeaTool: McpToolDefinition = {
    name: 'vote_idea',
    description: 'Upvote or downvote an idea. Each user can only have one active vote.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            ideaId: { type: 'string', description: 'Idea ID to vote on' },
            userId: { type: 'string', description: 'Voter identifier' },
            direction: {
                type: 'string',
                enum: ['up', 'down'],
                description: 'Vote direction',
            },
        },
        required: ['ideaId', 'userId', 'direction'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const ideaId = requireString(args, 'ideaId', errors);
        const userId = requireString(args, 'userId', errors);
        const direction = optionalEnum(
            args, 'direction', ['up', 'down'], errors,
        ) as VoteDirection | undefined;

        if (errors.length > 0 || !ideaId || !userId || !direction) {
            return envelope('vote_idea', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const idea = svc.voteIdea(ideaId, userId, direction);
            const score = svc.computeScore(idea);
            return envelope('vote_idea', start, { idea, score });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('vote_idea', start, null, [msg]);
        }
    },
};

/**
 * add_comment — add a comment to an idea.
 */
const addCommentTool: McpToolDefinition = {
    name: 'add_comment',
    description: 'Add a comment (optionally threaded) to an idea.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            ideaId: { type: 'string', description: 'Idea ID to comment on' },
            author: { type: 'string', description: 'Comment author' },
            body: { type: 'string', description: 'Comment body text' },
            parentId: { type: 'string', description: 'Parent comment ID for threading' },
        },
        required: ['ideaId', 'author', 'body'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const ideaId = requireString(args, 'ideaId', errors);
        const author = requireString(args, 'author', errors);
        const body = requireString(args, 'body', errors);
        const parentId = optionalString(args, 'parentId', errors);

        if (errors.length > 0 || !ideaId || !author || !body) {
            return envelope('add_comment', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const comment = svc.addComment(ideaId, author, body, parentId);
            return envelope('add_comment', start, comment);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('add_comment', start, null, [msg]);
        }
    },
};

/**
 * promote_to_story — promote an idea to a planning story.
 */
const promoteToStoryTool: McpToolDefinition = {
    name: 'promote_to_story',
    description:
        'Promote an idea to a planning story under a specified epic, with traceability.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            ideaId: { type: 'string', description: 'Idea ID to promote' },
            epicId: { type: 'string', description: 'Target epic ID for the new story' },
        },
        required: ['ideaId', 'epicId'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const ideaId = requireString(args, 'ideaId', errors);
        const epicId = requireString(args, 'epicId', errors);

        if (errors.length > 0 || !ideaId || !epicId) {
            return envelope('promote_to_story', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const storyId = svc.promoteToStory(ideaId, epicId);
            return envelope('promote_to_story', start, {
                ideaId,
                epicId,
                storyId,
                type: 'story',
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('promote_to_story', start, null, [msg]);
        }
    },
};

/**
 * promote_to_epic — promote an idea to a planning epic.
 */
const promoteToEpicTool: McpToolDefinition = {
    name: 'promote_to_epic',
    description: 'Promote an idea to a planning epic with traceability.',
    inputSchema: {
        type: 'object',
        properties: {
            workspacePath: { type: 'string', description: 'Workspace root path' },
            ideaId: { type: 'string', description: 'Idea ID to promote' },
        },
        required: ['ideaId'],
    },
    handler: async (args, _planningManager) => {
        const start = Date.now();
        const errors: string[] = [];

        const ideaId = requireString(args, 'ideaId', errors);

        if (errors.length > 0 || !ideaId) {
            return envelope('promote_to_epic', start, null, errors);
        }

        try {
            const svc = IdeationService.getInstance(resolveWorkspace(args));
            const epicId = svc.promoteToEpic(ideaId);
            return envelope('promote_to_epic', start, {
                ideaId,
                epicId,
                type: 'epic',
            });
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return envelope('promote_to_epic', start, null, [msg]);
        }
    },
};

// ─── Registry Export ─────────────────────────────────────────────────

/**
 * Return all ideation MCP tool definitions for registration in mcpServer.
 */
export function getIdeationTools(): McpToolDefinition[] {
    return [
        createIdeaTool,
        updateIdeaTool,
        deleteIdeaTool,
        listIdeasTool,
        voteIdeaTool,
        addCommentTool,
        promoteToStoryTool,
        promoteToEpicTool,
    ];
}
