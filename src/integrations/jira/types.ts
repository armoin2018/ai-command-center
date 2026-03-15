/**
 * Jira Integration Types
 * 
 * Core type definitions for Jira integration
 */

export type SyncStrategy = 'push' | 'pull' | 'bidirectional';
export type SyncDirection = 'local-to-remote' | 'remote-to-local' | 'both';
export type ConflictResolution = 'local-wins' | 'remote-wins' | 'manual' | 'merge';

export interface JiraConfig {
    enabled: boolean;
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
    syncStrategy: SyncStrategy;
    conflictResolution: ConflictResolution;
    autoSync: boolean;
    syncInterval: number; // minutes
    webhookEnabled: boolean;
    webhookSecret?: string;
}

export interface JiraIssue {
    id: string;
    key: string;
    self: string;
    fields: {
        summary: string;
        description?: string | Record<string, unknown> | null;
        issuetype: {
            id: string;
            name: string;
        };
        status: {
            id: string;
            name: string;
        };
        priority?: {
            id: string;
            name: string;
        };
        assignee?: {
            accountId: string;
            displayName: string;
            emailAddress: string;
        };
        reporter?: {
            accountId: string;
            displayName: string;
        };
        created: string;
        updated: string;
        duedate?: string;
        labels?: string[];
        parent?: {
            id: string;
            key: string;
        };
        [key: string]: unknown; // Custom fields
    };
}

export interface SyncOptions {
    strategy: SyncStrategy;
    conflictResolution: ConflictResolution;
    dryRun?: boolean;
    itemTypes?: ('epic' | 'story' | 'task')[];
    forceSync?: boolean;
}

export interface SyncResult {
    success: boolean;
    itemsProcessed: number;
    itemsSynced: number;
    conflicts: SyncConflict[];
    errors: SyncError[];
    duration: number;
    timestamp: string;
}

export interface SyncConflict {
    itemType: 'epic' | 'story' | 'task';
    itemId: string;
    jiraKey?: string;
    /** Local plan item (Epic, Story, or Task). Typed loosely to avoid circular deps. */
    localVersion: { title?: string; description?: string; priority?: string; id: string } | null;
    remoteVersion: JiraIssue | null;
    conflictingFields: string[];
    resolution?: 'local' | 'remote' | 'merged';
    timestamp: string;
}

export interface SyncError {
    itemType: 'epic' | 'story' | 'task';
    itemId: string;
    jiraKey?: string;
    operation: 'create' | 'update' | 'delete';
    error: string;
    timestamp: string;
}

export interface SyncState {
    lastSyncTime: number;
    lastSyncResult?: SyncResult;
    inProgress: boolean;
    pendingConflicts: SyncConflict[];
}

export interface SyncMapping {
    aiccId: string;
    jiraKey: string;
    itemType: 'epic' | 'story' | 'task';
    lastSyncedAt: number;
    lastSyncedHash: string;
    parentEpicId?: string; // For stories and tasks
    parentStoryId?: string; // For tasks only
}

export interface SyncTransaction {
    id: string;
    timestamp: number;
    operation: 'create' | 'update' | 'delete';
    itemType: 'epic' | 'story' | 'task';
    itemId: string;
    jiraKey?: string;
    data: Record<string, unknown>;
    rollbackData?: Record<string, unknown>;
    status: 'pending' | 'done' | 'failed' | 'rolled-back';
}

export interface WebhookPayload {
    webhookEvent: string;
    timestamp: number;
    issue: JiraIssue;
    user?: {
        accountId: string;
        displayName: string;
    };
    changelog?: {
        items: {
            field: string;
            fieldtype: string;
            from: string | null;
            to: string | null;
        }[];
    };
}

export interface FieldMapping {
    aiccField: string;
    jiraField: string;
    transform?: (value: unknown) => unknown;
    required: boolean;
}
