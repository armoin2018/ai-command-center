/**
 * Ideation Type Definitions
 *
 * Data model for the Ideation subsystem — capturing, voting on, and
 * promoting ideas to planning items.
 *
 * Part of AICC-0113: Ideation System & Jira Sync
 *   - AICC-0114 / AICC-0316: Define IDEAS.json schema
 */

// ─── Enums / Union Types ─────────────────────────────────────────────

/**
 * Lifecycle status of an idea.
 */
export type IdeaStatus =
    | 'draft'
    | 'submitted'
    | 'under-review'
    | 'approved'
    | 'rejected'
    | 'promoted'
    | 'archived';

/**
 * Broad category bucket for an idea.
 */
export type IdeaCategory =
    | 'feature'
    | 'improvement'
    | 'bug-idea'
    | 'research'
    | 'tooling'
    | 'process'
    | 'other';

/** Direction of a vote. */
export type VoteDirection = 'up' | 'down';

// ─── Sub-entities ────────────────────────────────────────────────────

/**
 * A single vote on an idea.
 */
export interface IdeaVote {
    /** User identifier */
    userId: string;
    /** Vote direction */
    direction: VoteDirection;
    /** ISO 8601 timestamp */
    votedAt: string;
}

/**
 * A single comment on an idea (supports threading via parentId).
 */
export interface IdeaComment {
    /** Unique comment identifier */
    id: string;
    /** Author identifier */
    author: string;
    /** Comment body text */
    body: string;
    /** ISO 8601 creation timestamp */
    createdAt: string;
    /** Optional parent comment ID for threading */
    parentId?: string;
}

// ─── Core Entity ─────────────────────────────────────────────────────

/**
 * Link recording that an idea was promoted to a planning item.
 */
export interface IdeaPromotionLink {
    /** The type of planning item the idea was promoted to */
    type: 'epic' | 'story';
    /** The planning item ID */
    id: string;
}

/**
 * Top-level Idea entity persisted in `.project/IDEAS.json`.
 */
export interface Idea {
    /** Unique idea identifier (UUID) */
    id: string;
    /** Short title */
    title: string;
    /** Full description / body */
    description: string;
    /** Author identifier */
    author: string;
    /** Idea category */
    category: IdeaCategory;
    /** Current lifecycle status */
    status: IdeaStatus;
    /** Free-form tags */
    tags: string[];
    /** Votes cast on this idea */
    votes: IdeaVote[];
    /** Comments on this idea */
    comments: IdeaComment[];
    /** ISO 8601 creation timestamp */
    createdAt: string;
    /** ISO 8601 last-updated timestamp */
    updatedAt: string;
    /** Planning items this idea has been promoted to */
    promotedTo?: IdeaPromotionLink[];
    /** Linked Jira issue key (e.g. "PROJ-123") */
    jiraIssueKey?: string;
    /** ISO 8601 timestamp of last Jira sync */
    jiraSyncedAt?: string;
}

// ─── IDEAS.json Document ─────────────────────────────────────────────

/**
 * Root document shape for `.project/IDEAS.json`.
 */
export interface IdeasDocument {
    /** Schema version for forward compatibility */
    version: string;
    /** ISO 8601 timestamp of last modification */
    updatedAt: string;
    /** All ideas */
    ideas: Idea[];
}

// ─── Filter / Query ──────────────────────────────────────────────────

/**
 * Filters accepted by `listIdeas`.
 */
export interface IdeaFilter {
    status?: IdeaStatus;
    category?: IdeaCategory;
    author?: string;
    tag?: string;
    search?: string;
}

// ─── Create / Update DTOs ────────────────────────────────────────────

/**
 * Payload for creating a new idea.
 */
export interface CreateIdeaInput {
    title: string;
    description: string;
    author: string;
    category: IdeaCategory;
    tags?: string[];
}

/**
 * Payload for updating an existing idea (all fields optional).
 */
export interface UpdateIdeaInput {
    title?: string;
    description?: string;
    category?: IdeaCategory;
    status?: IdeaStatus;
    tags?: string[];
}

// ─── Event Payloads ──────────────────────────────────────────────────

/**
 * Base event shared by all ideation events.
 */
export interface IdeationBaseEvent {
    /** Unix epoch milliseconds */
    timestamp: number;
    /** Originating subsystem */
    source: string;
}

/**
 * Emitted when an idea is created, updated, or deleted.
 */
export interface IdeationItemEvent extends IdeationBaseEvent {
    ideaId: string;
    action: 'created' | 'updated' | 'deleted';
    before?: Partial<Idea>;
    after?: Partial<Idea>;
}

/**
 * Emitted when a vote is cast on an idea.
 */
export interface IdeationVoteEvent extends IdeationBaseEvent {
    ideaId: string;
    userId: string;
    direction: VoteDirection;
    newScore: number;
}

/**
 * Emitted when an idea is promoted to an epic or story.
 */
export interface IdeationPromotedEvent extends IdeationBaseEvent {
    ideaId: string;
    promotedTo: IdeaPromotionLink;
}

// ─── Event Channel Constants (AICC-0326) ─────────────────────────────

/**
 * Channel name constants for ideation events.
 * Compatible with the EventBus wildcard subscriptions (`"ideation.*"`).
 */
export const IdeationChannels = {
    Created: 'ideation.created' as const,
    Updated: 'ideation.updated' as const,
    Deleted: 'ideation.deleted' as const,
    Voted: 'ideation.voted' as const,
    Promoted: 'ideation.promoted' as const,
} as const;

// ─── Validation Constants ────────────────────────────────────────────

export const VALID_IDEA_STATUSES: IdeaStatus[] = [
    'draft',
    'submitted',
    'under-review',
    'approved',
    'rejected',
    'promoted',
    'archived',
];

export const VALID_IDEA_CATEGORIES: IdeaCategory[] = [
    'feature',
    'improvement',
    'bug-idea',
    'research',
    'tooling',
    'process',
    'other',
];

export const IDEAS_DOCUMENT_VERSION = '1.0.0';
