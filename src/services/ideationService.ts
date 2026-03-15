/**
 * Ideation Service
 *
 * Singleton CRUD service for managing ideas stored in `.project/IDEAS.json`.
 * Provides creation, update, deletion, voting, commenting, and promotion of
 * ideas to planning epics / stories with full bidirectional traceability.
 *
 * Part of AICC-0113: Ideation System & Jira Sync
 *   - AICC-0115 / AICC-0317: Implement idea CRUD service
 *   - AICC-0318: File persistence with atomic writes
 *   - AICC-0319: Schema validation on read/write
 *   - AICC-0116 / AICC-0320: Clone-to-Story handler
 *   - AICC-0321: Clone-to-Epic handler
 *   - AICC-0322: Bidirectional traceability links
 *   - AICC-0328: Wire event emissions on all state changes
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';
import { EventBus } from './eventBus';
import type {
    Idea,
    IdeaComment,
    IdeaFilter,
    IdeaStatus,
    IdeaCategory,
    IdeasDocument,
    CreateIdeaInput,
    UpdateIdeaInput,
    VoteDirection,
    IdeaPromotionLink,
    IdeationItemEvent,
    IdeationVoteEvent,
    IdeationPromotedEvent,
} from '../types/ideation';
import {
    IdeationChannels,
    VALID_IDEA_STATUSES,
    VALID_IDEA_CATEGORIES,
    IDEAS_DOCUMENT_VERSION,
} from '../types/ideation';

// ─── Constants ───────────────────────────────────────────────────────

const IDEAS_DIR = '.project';
const IDEAS_FILE = 'IDEAS.json';
const COMPONENT = 'IdeationService';

// ─── Validation Helpers ──────────────────────────────────────────────

/**
 * Validate a full {@link IdeasDocument} after reading from disk.
 * Throws a descriptive error if the document is malformed.
 */
function validateDocument(doc: unknown): asserts doc is IdeasDocument {
    if (!doc || typeof doc !== 'object') {
        throw new Error('IDEAS.json root must be an object');
    }
    const d = doc as Record<string, unknown>;
    if (typeof d.version !== 'string') {
        throw new Error('IDEAS.json missing "version" string');
    }
    if (typeof d.updatedAt !== 'string') {
        throw new Error('IDEAS.json missing "updatedAt" string');
    }
    if (!Array.isArray(d.ideas)) {
        throw new Error('IDEAS.json missing "ideas" array');
    }
    for (let i = 0; i < (d.ideas as unknown[]).length; i++) {
        validateIdea((d.ideas as unknown[])[i], i);
    }
}

function validateIdea(raw: unknown, index: number): void {
    if (!raw || typeof raw !== 'object') {
        throw new Error(`ideas[${index}] must be an object`);
    }
    const idea = raw as Record<string, unknown>;
    const requiredStrings = ['id', 'title', 'description', 'author', 'createdAt', 'updatedAt'];
    for (const key of requiredStrings) {
        if (typeof idea[key] !== 'string') {
            throw new Error(`ideas[${index}].${key} must be a string`);
        }
    }
    if (!VALID_IDEA_STATUSES.includes(idea.status as IdeaStatus)) {
        throw new Error(
            `ideas[${index}].status must be one of: ${VALID_IDEA_STATUSES.join(', ')}`,
        );
    }
    if (!VALID_IDEA_CATEGORIES.includes(idea.category as IdeaCategory)) {
        throw new Error(
            `ideas[${index}].category must be one of: ${VALID_IDEA_CATEGORIES.join(', ')}`,
        );
    }
    if (!Array.isArray(idea.tags)) {
        throw new Error(`ideas[${index}].tags must be an array`);
    }
    if (!Array.isArray(idea.votes)) {
        throw new Error(`ideas[${index}].votes must be an array`);
    }
    if (!Array.isArray(idea.comments)) {
        throw new Error(`ideas[${index}].comments must be an array`);
    }
}

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton service that manages the full lifecycle of ideas.
 *
 * All mutating operations persist atomically (temp-file + rename) and
 * emit typed events on the {@link EventBus}.
 */
export class IdeationService {
    // ── Singleton ────────────────────────────────────────────────
    private static instances = new Map<string, IdeationService>();

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly filePath: string;
    private document: IdeasDocument;

    // ── Construction ─────────────────────────────────────────────

    private constructor(wsPath: string) {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.filePath = path.join(wsPath, IDEAS_DIR, IDEAS_FILE);
        this.document = this.loadOrCreate();
        this.logger.info('IdeationService initialized', {
            component: COMPONENT,
        });
    }

    /**
     * Retrieve (or create) the IdeationService singleton for a workspace.
     */
    public static getInstance(workspacePath: string): IdeationService {
        const key = path.resolve(workspacePath);
        let instance = IdeationService.instances.get(key);
        if (!instance) {
            instance = new IdeationService(workspacePath);
            IdeationService.instances.set(key, instance);
        }
        return instance;
    }

    /**
     * Reset all singleton instances. Primarily for tests.
     */
    public static resetInstances(): void {
        IdeationService.instances.clear();
    }

    // ── Persistence (AICC-0318, AICC-0319) ───────────────────────

    /**
     * Load IDEAS.json from disk, or create a fresh document.
     */
    private loadOrCreate(): IdeasDocument {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed: unknown = JSON.parse(raw);
                validateDocument(parsed);
                this.logger.info(`Loaded ${parsed.ideas.length} ideas from disk`, {
                    component: COMPONENT,
                });
                return parsed;
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`Failed to load IDEAS.json, starting fresh: ${message}`, {
                component: COMPONENT,
            });
        }
        return this.emptyDocument();
    }

    /**
     * Persist the current document to disk atomically.
     * Writes to a temporary file first, then renames.
     */
    private persist(): void {
        const dir = path.dirname(this.filePath);
        this.document.updatedAt = new Date().toISOString();
        const data = JSON.stringify(this.document, null, 2);
        const tmpPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(tmpPath, data, 'utf-8');
            fs.renameSync(tmpPath, this.filePath);
        } catch (err) {
            this.logger.error('Failed to persist ideas document', {
                component: COMPONENT,
                error: err instanceof Error ? err.message : String(err),
            });
            // Attempt cleanup of temp file on failure
            try {
                if (fs.existsSync(tmpPath)) {
                    fs.unlinkSync(tmpPath);
                }
            } catch {
                // best-effort
            }
        }
    }

    private emptyDocument(): IdeasDocument {
        return {
            version: IDEAS_DOCUMENT_VERSION,
            updatedAt: new Date().toISOString(),
            ideas: [],
        };
    }

    // ── Event helpers (AICC-0328) ────────────────────────────────

    private emitItem(
        action: IdeationItemEvent['action'],
        ideaId: string,
        before?: Partial<Idea>,
        after?: Partial<Idea>,
    ): void {
        const channelMap = {
            created: IdeationChannels.Created,
            updated: IdeationChannels.Updated,
            deleted: IdeationChannels.Deleted,
        } as const;
        const event: IdeationItemEvent = {
            timestamp: Date.now(),
            source: COMPONENT,
            ideaId,
            action,
            before,
            after,
        };
        this.eventBus.emit(channelMap[action], event).catch((err) => {
            this.logger.error(`Failed to emit ideation event: ${err}`, {
                component: COMPONENT,
            });
        });
    }

    private emitVote(ideaId: string, userId: string, direction: VoteDirection, newScore: number): void {
        const event: IdeationVoteEvent = {
            timestamp: Date.now(),
            source: COMPONENT,
            ideaId,
            userId,
            direction,
            newScore,
        };
        this.eventBus.emit(IdeationChannels.Voted, event).catch((err) => {
            this.logger.error(`Failed to emit vote event: ${err}`, {
                component: COMPONENT,
            });
        });
    }

    private emitPromoted(ideaId: string, link: IdeaPromotionLink): void {
        const event: IdeationPromotedEvent = {
            timestamp: Date.now(),
            source: COMPONENT,
            ideaId,
            promotedTo: link,
        };
        this.eventBus.emit(IdeationChannels.Promoted, event).catch((err) => {
            this.logger.error(`Failed to emit promoted event: ${err}`, {
                component: COMPONENT,
            });
        });
    }

    // ── CRUD (AICC-0317) ─────────────────────────────────────────

    /**
     * Create a new idea.
     */
    public createIdea(input: CreateIdeaInput): Idea {
        const now = new Date().toISOString();
        const idea: Idea = {
            id: crypto.randomUUID(),
            title: input.title,
            description: input.description,
            author: input.author,
            category: input.category,
            status: 'draft',
            tags: input.tags ?? [],
            votes: [],
            comments: [],
            createdAt: now,
            updatedAt: now,
        };
        this.document.ideas.push(idea);
        this.persist();
        this.logger.info(`Idea created: ${idea.id}`, { component: COMPONENT });
        this.emitItem('created', idea.id, undefined, idea);
        return idea;
    }

    /**
     * Update an existing idea.
     */
    public updateIdea(ideaId: string, input: UpdateIdeaInput): Idea {
        const idea = this.requireIdea(ideaId);
        const before: Partial<Idea> = { ...idea };
        if (input.title !== undefined) {
            idea.title = input.title;
        }
        if (input.description !== undefined) {
            idea.description = input.description;
        }
        if (input.category !== undefined) {
            idea.category = input.category;
        }
        if (input.status !== undefined) {
            idea.status = input.status;
        }
        if (input.tags !== undefined) {
            idea.tags = input.tags;
        }
        idea.updatedAt = new Date().toISOString();
        this.persist();
        this.logger.info(`Idea updated: ${ideaId}`, { component: COMPONENT });
        this.emitItem('updated', ideaId, before, idea);
        return idea;
    }

    /**
     * Delete an idea by ID.
     */
    public deleteIdea(ideaId: string): void {
        const idea = this.requireIdea(ideaId);
        this.document.ideas = this.document.ideas.filter((i) => i.id !== ideaId);
        this.persist();
        this.logger.info(`Idea deleted: ${ideaId}`, { component: COMPONENT });
        this.emitItem('deleted', ideaId, idea, undefined);
    }

    /**
     * Get a single idea by ID, or `undefined` if not found.
     */
    public getIdea(ideaId: string): Idea | undefined {
        return this.document.ideas.find((i) => i.id === ideaId);
    }

    /**
     * List ideas with optional filters.
     */
    public listIdeas(filter?: IdeaFilter): Idea[] {
        let results = [...this.document.ideas];
        if (!filter) {
            return results;
        }
        if (filter.status) {
            results = results.filter((i) => i.status === filter.status);
        }
        if (filter.category) {
            results = results.filter((i) => i.category === filter.category);
        }
        if (filter.author) {
            results = results.filter((i) => i.author === filter.author);
        }
        if (filter.tag) {
            results = results.filter((i) => i.tags.includes(filter.tag!));
        }
        if (filter.search) {
            const q = filter.search.toLowerCase();
            results = results.filter(
                (i) =>
                    i.title.toLowerCase().includes(q) ||
                    i.description.toLowerCase().includes(q),
            );
        }
        return results;
    }

    // ── Voting (AICC-0314) ───────────────────────────────────────

    /**
     * Cast or change a vote on an idea.
     * Each user may only have one active vote; re-voting replaces it.
     *
     * @returns The updated idea.
     */
    public voteIdea(ideaId: string, userId: string, direction: VoteDirection): Idea {
        const idea = this.requireIdea(ideaId);
        // Remove any existing vote by this user
        idea.votes = idea.votes.filter((v) => v.userId !== userId);
        idea.votes.push({
            userId,
            direction,
            votedAt: new Date().toISOString(),
        });
        idea.updatedAt = new Date().toISOString();
        this.persist();
        const score = this.computeScore(idea);
        this.logger.info(`Vote on idea ${ideaId}: ${direction} by ${userId}`, {
            component: COMPONENT,
        });
        this.emitVote(ideaId, userId, direction, score);
        return idea;
    }

    /**
     * Compute net vote score for an idea.
     */
    public computeScore(idea: Idea): number {
        return idea.votes.reduce(
            (acc, v) => acc + (v.direction === 'up' ? 1 : -1),
            0,
        );
    }

    // ── Comments (AICC-0315) ─────────────────────────────────────

    /**
     * Add a comment (optionally threaded) to an idea.
     */
    public addComment(
        ideaId: string,
        author: string,
        body: string,
        parentId?: string,
    ): IdeaComment {
        const idea = this.requireIdea(ideaId);
        const comment: IdeaComment = {
            id: crypto.randomUUID(),
            author,
            body,
            createdAt: new Date().toISOString(),
            parentId,
        };
        idea.comments.push(comment);
        idea.updatedAt = new Date().toISOString();
        this.persist();
        this.logger.info(`Comment added to idea ${ideaId}`, { component: COMPONENT });
        this.emitItem('updated', ideaId, undefined, idea);
        return comment;
    }

    /**
     * Delete a comment from an idea.
     */
    public deleteComment(ideaId: string, commentId: string): void {
        const idea = this.requireIdea(ideaId);
        const before = idea.comments.length;
        idea.comments = idea.comments.filter((c) => c.id !== commentId);
        if (idea.comments.length === before) {
            throw new Error(`Comment ${commentId} not found on idea ${ideaId}`);
        }
        idea.updatedAt = new Date().toISOString();
        this.persist();
        this.logger.info(`Comment ${commentId} deleted from idea ${ideaId}`, {
            component: COMPONENT,
        });
        this.emitItem('updated', ideaId, undefined, idea);
    }

    // ── Promotion (AICC-0320, AICC-0321, AICC-0322) ─────────────

    /**
     * Promote an idea to a planning **story** under an existing epic.
     *
     * Records a bidirectional traceability link:
     *   - idea.promotedTo[]  → { type: 'story', id }
     *   - The caller is responsible for adding `sourceIdeaId` metadata
     *     on the newly-created planning story.
     *
     * @returns The generated story ID.
     */
    public promoteToStory(ideaId: string, epicId: string): string {
        const idea = this.requireIdea(ideaId);
        const storyId = `story-${crypto.randomUUID().slice(0, 8)}`;
        const link: IdeaPromotionLink = { type: 'story', id: storyId };
        if (!idea.promotedTo) {
            idea.promotedTo = [];
        }
        idea.promotedTo.push(link);
        idea.status = 'promoted';
        idea.updatedAt = new Date().toISOString();
        this.persist();
        this.logger.info(`Idea ${ideaId} promoted to story ${storyId} under epic ${epicId}`, {
            component: COMPONENT,
        });
        this.emitPromoted(ideaId, link);
        return storyId;
    }

    /**
     * Promote an idea to a planning **epic**.
     *
     * @returns The generated epic ID.
     */
    public promoteToEpic(ideaId: string): string {
        const idea = this.requireIdea(ideaId);
        const epicId = `epic-${crypto.randomUUID().slice(0, 8)}`;
        const link: IdeaPromotionLink = { type: 'epic', id: epicId };
        if (!idea.promotedTo) {
            idea.promotedTo = [];
        }
        idea.promotedTo.push(link);
        idea.status = 'promoted';
        idea.updatedAt = new Date().toISOString();
        this.persist();
        this.logger.info(`Idea ${ideaId} promoted to epic ${epicId}`, {
            component: COMPONENT,
        });
        this.emitPromoted(ideaId, link);
        return epicId;
    }

    // ── Jira Link (AICC-0324) ────────────────────────────────────

    /**
     * Record a Jira issue key on an idea after sync.
     */
    public setJiraLink(ideaId: string, jiraKey: string): Idea {
        const idea = this.requireIdea(ideaId);
        idea.jiraIssueKey = jiraKey;
        idea.jiraSyncedAt = new Date().toISOString();
        idea.updatedAt = new Date().toISOString();
        this.persist();
        this.logger.info(`Jira link set on idea ${ideaId}: ${jiraKey}`, {
            component: COMPONENT,
        });
        this.emitItem('updated', ideaId, undefined, idea);
        return idea;
    }

    // ── Internals ────────────────────────────────────────────────

    /**
     * Look up an idea by ID or throw.
     */
    private requireIdea(ideaId: string): Idea {
        const idea = this.document.ideas.find((i) => i.id === ideaId);
        if (!idea) {
            throw new Error(`Idea not found: ${ideaId}`);
        }
        return idea;
    }
}
