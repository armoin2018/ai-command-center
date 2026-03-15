/**
 * Sync Engine
 * 
 * Core synchronization engine for bidirectional sync between AICC and Jira
 */

import { EventEmitter } from 'events';
import { PlanningManager } from '../../planning/planningManager';
import { JiraClient } from './jiraClient';
import { WorkspaceManager } from '../../planning/workspaceManager';
import { logger } from '../../logger';
import {
    SyncOptions,
    SyncResult,
    SyncConflict,
    SyncState,
    SyncMapping,
    JiraIssue
} from './types';
import { Epic } from '../../planning/entities/epic';
import { Story } from '../../planning/entities/story';
import { Task } from '../../planning/entities/task';
import { Priority, EpicStatus } from '../../planning/types';
import * as crypto from 'crypto';

export class SyncEngine extends EventEmitter {
    private static instance: SyncEngine;
    private planningManager: PlanningManager;
    private jiraClient: JiraClient;
    private workspaceManager: WorkspaceManager;
    private syncState: SyncState;
    private mappings: Map<string, SyncMapping> = new Map(); // aiccId -> mapping

    private readonly SYNC_STATE_FILE = '.aicc/sync/state.json';
    private readonly SYNC_MAPPINGS_FILE = '.aicc/sync/mappings.json';

    private constructor(
        planningManager: PlanningManager,
        jiraClient: JiraClient,
        workspaceManager: WorkspaceManager
    ) {
        super();
        this.planningManager = planningManager;
        this.jiraClient = jiraClient;
        this.workspaceManager = workspaceManager;
        this.syncState = {
            lastSyncTime: 0,
            inProgress: false,
            pendingConflicts: []
        };

        this.loadSyncState();
        this.loadMappings();

        logger.info('SyncEngine initialized', { component: 'SyncEngine' });
    }

    public static getInstance(
        planningManager?: PlanningManager,
        jiraClient?: JiraClient,
        workspaceManager?: WorkspaceManager
    ): SyncEngine {
        if (!SyncEngine.instance && planningManager && jiraClient && workspaceManager) {
            SyncEngine.instance = new SyncEngine(planningManager, jiraClient, workspaceManager);
        } else if (!SyncEngine.instance) {
            throw new Error('SyncEngine not initialized. Provide dependencies on first call.');
        }
        return SyncEngine.instance;
    }

    /**
     * Execute synchronization
     */
    async sync(options: SyncOptions): Promise<SyncResult> {
        if (this.syncState.inProgress) {
            throw new Error('Sync already in progress');
        }

        const startTime = Date.now();
        this.syncState.inProgress = true;
        this.emit('sync:started', options);

        const result: SyncResult = {
            success: false,
            itemsProcessed: 0,
            itemsSynced: 0,
            conflicts: [],
            errors: [],
            duration: 0,
            timestamp: new Date().toISOString()
        };

        try {
            logger.info('Starting sync', {
                component: 'SyncEngine',
                strategy: options.strategy,
                dryRun: options.dryRun || false
            });

            // Execute sync based on strategy
            if (options.strategy === 'push' || options.strategy === 'bidirectional') {
                const pushResult = await this.pushToJira(options);
                result.itemsProcessed += pushResult.itemsProcessed || 0;
                result.itemsSynced += pushResult.itemsSynced || 0;
                result.errors.push(...(pushResult.errors || []));
            }

            if (options.strategy === 'pull' || options.strategy === 'bidirectional') {
                const pullResult = await this.pullFromJira(options);
                result.itemsProcessed += pullResult.itemsProcessed || 0;
                result.itemsSynced += pullResult.itemsSynced || 0;
                result.conflicts.push(...(pullResult.conflicts || []));
                result.errors.push(...(pullResult.errors || []));
            }

            // Handle conflicts
            if (result.conflicts.length > 0 && options.conflictResolution !== 'manual') {
                await this.resolveConflicts(result.conflicts, options.conflictResolution);
            }

            result.success = result.errors.length === 0;
            result.duration = Date.now() - startTime;

            this.syncState.lastSyncTime = Date.now();
            this.syncState.lastSyncResult = result;
            this.syncState.pendingConflicts = result.conflicts.filter(c => !c.resolution);

            await this.saveSyncState();

            logger.info('Sync completed', {
                component: 'SyncEngine',
                ...result
            });

            this.emit('sync:completed', result);
        } catch (error: any) {
            result.errors.push({
                itemType: 'epic',
                itemId: 'unknown',
                operation: 'create',
                error: error.message,
                timestamp: new Date().toISOString()
            });
            result.duration = Date.now() - startTime;

            logger.error('Sync failed', {
                component: 'SyncEngine',
                error: error.message
            });

            this.emit('sync:failed', error);
        } finally {
            this.syncState.inProgress = false;
        }

        return result;
    }

    /**
     * Push local items to Jira
     */
    private async pushToJira(options: SyncOptions): Promise<Partial<SyncResult>> {
        const result: Partial<SyncResult> = {
            itemsProcessed: 0,
            itemsSynced: 0,
            errors: []
        };

        // Get all local items
        const epics = await this.planningManager.listEpics();

        for (const epic of epics) {
            if (options.itemTypes && !options.itemTypes.includes('epic')) {
                continue;
            }

            try {
                await this.pushEpicToJira(epic, options);
                result.itemsProcessed!++;
                result.itemsSynced!++;

                // Sync stories for this epic
                if (!options.itemTypes || options.itemTypes.includes('story')) {
                    const stories = await this.planningManager.listStories(epic.id);
                    for (const story of stories) {
                        try {
                            await this.pushStoryToJira(story, epic, options);
                            result.itemsProcessed!++;
                            result.itemsSynced!++;

                            // Sync tasks for this story
                            if (!options.itemTypes || options.itemTypes.includes('task')) {
                                const tasks = await this.planningManager.listTasks(epic.id, story.id);
                                for (const task of tasks) {
                                    try {
                                        await this.pushTaskToJira(task, story, options);
                                        result.itemsProcessed!++;
                                        result.itemsSynced!++;
                                    } catch (error: any) {
                                        result.errors!.push({
                                            itemType: 'task',
                                            itemId: task.id,
                                            operation: 'create',
                                            error: error.message,
                                            timestamp: new Date().toISOString()
                                        });
                                    }
                                }
                            }
                        } catch (error: any) {
                            result.errors!.push({
                                itemType: 'story',
                                itemId: story.id,
                                operation: 'create',
                                error: error.message,
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }
            } catch (error: any) {
                result.errors!.push({
                    itemType: 'epic',
                    itemId: epic.id,
                    operation: 'create',
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return result;
    }

    /**
     * Push epic to Jira
     */
    private async pushEpicToJira(epic: Epic, options: SyncOptions): Promise<void> {
        const mapping = this.mappings.get(epic.id);
        const currentHash = this.calculateHash(epic);

        // Skip if not changed
        if (mapping && mapping.lastSyncedHash === currentHash && !options.forceSync) {
            logger.debug('Epic unchanged, skipping', {
                component: 'SyncEngine',
                epicId: epic.id
            });
            return;
        }

        if (options.dryRun) {
            logger.info('[DRY RUN] Would sync epic', {
                component: 'SyncEngine',
                epic: epic.title
            });
            return;
        }

        if (mapping) {
            // Update existing
            await this.jiraClient.updateIssue(mapping.jiraKey, {
                summary: epic.title,
                description: epic.description,
                priority: this.mapPriority(epic.priority),
                labels: epic.tags
            });

            this.updateMapping(epic.id, mapping.jiraKey, 'epic', currentHash);
        } else {
            // Create new
            const issue = await this.jiraClient.createIssue({
                projectKey: '', // Will be set by config
                summary: epic.title,
                description: epic.description,
                issueType: 'Epic',
                priority: this.mapPriority(epic.priority),
                labels: epic.tags
            });

            this.createMapping(epic.id, issue.key, 'epic', currentHash);
        }
    }

    /**
     * Push story to Jira
     */
    private async pushStoryToJira(story: Story, epic: Epic, options: SyncOptions): Promise<void> {
        const mapping = this.mappings.get(story.id);
        const currentHash = this.calculateHash(story);

        // Skip if not changed
        if (mapping && mapping.lastSyncedHash === currentHash && !options.forceSync) {
            logger.debug('Story unchanged, skipping', {
                component: 'SyncEngine',
                storyId: story.id
            });
            return;
        }

        if (options.dryRun) {
            logger.info('[DRY RUN] Would sync story', {
                component: 'SyncEngine',
                story: story.title
            });
            return;
        }

        // Get parent epic's Jira key
        const epicMapping = this.mappings.get(epic.id);
        if (!epicMapping) {
            throw new Error(`Epic ${epic.id} not synced to Jira yet`);
        }

        if (mapping) {
            // Update existing
            await this.jiraClient.updateIssue(mapping.jiraKey, {
                summary: story.title,
                description: story.description,
                priority: this.mapPriority(story.priority),
                labels: story.tags,
                estimatedHours: story.estimatedHours
            });

            this.updateMapping(story.id, mapping.jiraKey, 'story', currentHash);
        } else {
            // Create new
            const issue = await this.jiraClient.createIssue({
                projectKey: '', // Will be set by config
                summary: story.title,
                description: story.description,
                issueType: 'Story',
                priority: this.mapPriority(story.priority),
                labels: story.tags,
                estimatedHours: story.estimatedHours,
                epicKey: epicMapping.jiraKey // Link to parent epic
            });

            this.createMapping(story.id, issue.key, 'story', currentHash, epic.id);
        }
    }

    /**
     * Push task to Jira
     */
    private async pushTaskToJira(task: Task, story: Story, options: SyncOptions): Promise<void> {
        const mapping = this.mappings.get(task.id);
        const currentHash = this.calculateHash(task);

        // Skip if not changed
        if (mapping && mapping.lastSyncedHash === currentHash && !options.forceSync) {
            logger.debug('Task unchanged, skipping', {
                component: 'SyncEngine',
                taskId: task.id
            });
            return;
        }

        if (options.dryRun) {
            logger.info('[DRY RUN] Would sync task', {
                component: 'SyncEngine',
                task: task.title
            });
            return;
        }

        // Get parent story's Jira key
        const storyMapping = this.mappings.get(story.id);
        if (!storyMapping) {
            throw new Error(`Story ${story.id} not synced to Jira yet`);
        }

        if (mapping) {
            // Update existing
            await this.jiraClient.updateIssue(mapping.jiraKey, {
                summary: task.title,
                description: task.description,
                priority: this.mapPriority(task.priority),
                labels: task.tags,
                assignee: task.assignee
            });

            this.updateMapping(task.id, mapping.jiraKey, 'task', currentHash);
        } else {
            // Create new (as subtask of story)
            const issue = await this.jiraClient.createIssue({
                projectKey: '', // Will be set by config
                summary: task.title,
                description: task.description,
                issueType: 'Sub-task',
                priority: this.mapPriority(task.priority),
                labels: task.tags,
                assignee: task.assignee,
                parentKey: storyMapping.jiraKey // Link to parent story
            });

            this.createMapping(task.id, issue.key, 'task', currentHash, story.epicId ?? undefined, story.id);
        }
    }

    /**
     * Pull items from Jira
     */
    private async pullFromJira(options: SyncOptions): Promise<Partial<SyncResult>> {
        const result: Partial<SyncResult> = {
            itemsProcessed: 0,
            itemsSynced: 0,
            conflicts: [],
            errors: []
        };

        try {
            const issues = await this.jiraClient.getProjectIssues();

            for (const issue of issues) {
                try {
                    const conflict = await this.pullIssueToLocal(issue, options);
                    if (conflict) {
                        result.conflicts!.push(conflict);
                    } else {
                        result.itemsSynced!++;
                    }
                    result.itemsProcessed!++;
                } catch (error: any) {
                    result.errors!.push({
                        itemType: this.mapIssueType(issue.fields.issuetype.name),
                        itemId: 'unknown',
                        jiraKey: issue.key,
                        operation: 'update',
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } catch (error: any) {
            result.errors!.push({
                itemType: 'epic',
                itemId: 'unknown',
                operation: 'create',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }

        return result;
    }

    /**
     * Pull single issue to local
     */
    private async pullIssueToLocal(issue: JiraIssue, options: SyncOptions): Promise<SyncConflict | null> {
        // Find local item by mapping
        const localId = Array.from(this.mappings.values())
            .find(m => m.jiraKey === issue.key)?.aiccId;

        const itemType = this.mapIssueType(issue.fields.issuetype.name);

        if (options.dryRun) {
            logger.info('[DRY RUN] Would pull issue', {
                component: 'SyncEngine',
                jiraKey: issue.key,
                type: itemType
            });
            return null;
        }

        // Check for conflicts
        if (localId) {
            const hasLocalChanges = await this.hasLocalChanges(localId, itemType);
            if (hasLocalChanges) {
                return {
                    itemType,
                    itemId: localId,
                    jiraKey: issue.key,
                    localVersion: await this.getLocalItem(localId, itemType) as SyncConflict['localVersion'],
                    remoteVersion: issue,
                    conflictingFields: ['summary', 'status', 'priority'],
                    timestamp: new Date().toISOString()
                };
            }

            // Update local item
            await this.updateLocalItem(localId, itemType, issue);
        } else {
            // Create new local item
            await this.createLocalItem(itemType, issue);
        }

        return null;
    }

    /**
     * Create local item from Jira issue
     */
    private async createLocalItem(itemType: 'epic' | 'story' | 'task', issue: JiraIssue): Promise<void> {
        if (itemType === 'epic') {
            const epic = await this.planningManager.createEpic({
                title: issue.fields.summary,
                description: this.extractDescription(issue.fields.description),
                priority: this.mapJiraPriority(issue.fields.priority?.name)
            });
            this.createMapping(epic.id, issue.key, 'epic', this.calculateHash(epic));
        } else if (itemType === 'story') {
            // Find parent epic by Jira parent key
            const parentJiraKey = issue.fields.parent?.key;
            if (!parentJiraKey) {
                throw new Error(`Story ${issue.key} has no parent epic in Jira`);
            }
            const parentMapping = Array.from(this.mappings.values())
                .find(m => m.jiraKey === parentJiraKey);
            if (!parentMapping) {
                throw new Error(`Parent epic ${parentJiraKey} not found in local mappings`);
            }

            const story = await this.planningManager.createStory(parentMapping.aiccId, {
                title: issue.fields.summary,
                description: this.extractDescription(issue.fields.description),
                priority: this.mapJiraPriority(issue.fields.priority?.name),
                estimatedHours: (issue.fields.customfield_10016 as number) || 0
            });
            this.createMapping(story.id, issue.key, 'story', this.calculateHash(story), parentMapping.aiccId);
        } else if (itemType === 'task') {
            // Find parent story by Jira parent key
            const parentJiraKey = issue.fields.parent?.key;
            if (!parentJiraKey) {
                throw new Error(`Task ${issue.key} has no parent story in Jira`);
            }
            const parentMapping = Array.from(this.mappings.values())
                .find(m => m.jiraKey === parentJiraKey);
            if (!parentMapping) {
                throw new Error(`Parent story ${parentJiraKey} not found in local mappings`);
            }

            // Get epic ID from parent story mapping
            const storyMapping = parentMapping;
            if (!storyMapping.parentEpicId) {
                throw new Error(`Story ${storyMapping.aiccId} has no epic ID in mapping`);
            }

            const task = await this.planningManager.createTask(
                storyMapping.parentEpicId,
                storyMapping.aiccId,
                {
                    title: issue.fields.summary,
                    description: this.extractDescription(issue.fields.description),
                    priority: this.mapJiraPriority(issue.fields.priority?.name),
                    assignee: issue.fields.assignee?.displayName
                }
            );
            this.createMapping(task.id, issue.key, 'task', this.calculateHash(task), storyMapping.parentEpicId, storyMapping.aiccId);
        }
    }

    /**
     * Update local item from Jira issue
     */
    private async updateLocalItem(localId: string, itemType: 'epic' | 'story' | 'task', issue: JiraIssue): Promise<void> {
        if (itemType === 'epic') {
            const epic = await this.planningManager.updateEpic(localId, {
                title: issue.fields.summary,
                description: this.extractDescription(issue.fields.description),
                status: this.mapJiraStatus(issue.fields.status.name),
                priority: this.mapJiraPriority(issue.fields.priority?.name),
                tags: issue.fields.labels
            });
            if (epic) {
                this.updateMapping(localId, issue.key, 'epic', this.calculateHash(epic));
            }
        } else if (itemType === 'story') {
            const mapping = this.mappings.get(localId);
            if (!mapping?.parentEpicId) {
                throw new Error(`Story ${localId} has no epic ID in mapping`);
            }
            const story = await this.planningManager.updateStory(mapping.parentEpicId, localId, {
                title: issue.fields.summary,
                description: this.extractDescription(issue.fields.description),
                priority: this.mapJiraPriority(issue.fields.priority?.name),
                estimatedHours: issue.fields.customfield_10016 as number | undefined,
                tags: issue.fields.labels
            });
            if (story) {
                this.updateMapping(localId, issue.key, 'story', this.calculateHash(story));
            }
        } else if (itemType === 'task') {
            const mapping = this.mappings.get(localId);
            if (!mapping?.parentEpicId || !mapping?.parentStoryId) {
                throw new Error(`Task ${localId} has no parent IDs in mapping`);
            }
            const task = await this.planningManager.updateTask(
                mapping.parentEpicId,
                mapping.parentStoryId,
                localId,
                {
                    title: issue.fields.summary,
                    description: this.extractDescription(issue.fields.description),
                    priority: this.mapJiraPriority(issue.fields.priority?.name),
                    assignee: issue.fields.assignee?.displayName,
                    tags: issue.fields.labels
                }
            );
            if (task) {
                this.updateMapping(localId, issue.key, 'task', this.calculateHash(task));
            }
        }
    }

    /**
     * Resolve conflicts
     */
    private async resolveConflicts(conflicts: SyncConflict[], resolution: string): Promise<void> {
        for (const conflict of conflicts) {
            if (resolution === 'local-wins') {
                // Push local changes
                const local = await this.getLocalItem(conflict.itemId, conflict.itemType);
                if (local && conflict.jiraKey) {
                    await this.jiraClient.updateIssue(conflict.jiraKey, {
                        summary: local.title || '',
                        description: local.description,
                        priority: this.mapPriority(local.priority)
                    });
                }
                conflict.resolution = 'local';
            } else if (resolution === 'remote-wins') {
                // Pull remote changes
                if (conflict.remoteVersion) {
                    await this.updateLocalItem(conflict.itemId, conflict.itemType, conflict.remoteVersion);
                }
                conflict.resolution = 'remote';
            }
        }
    }

    /**
     * Helper methods
     */
    private createMapping(
        aiccId: string,
        jiraKey: string,
        itemType: 'epic' | 'story' | 'task',
        hash: string,
        parentEpicId?: string,
        parentStoryId?: string
    ): void {
        this.mappings.set(aiccId, {
            aiccId,
            jiraKey,
            itemType,
            lastSyncedAt: Date.now(),
            lastSyncedHash: hash,
            parentEpicId,
            parentStoryId
        });
        this.saveMappings();
    }

    private updateMapping(aiccId: string, jiraKey: string, itemType: 'epic' | 'story' | 'task', hash: string): void {
        const existing = this.mappings.get(aiccId);
        if (existing) {
            existing.lastSyncedAt = Date.now();
            existing.lastSyncedHash = hash;
            this.saveMappings();
        } else {
            this.createMapping(aiccId, jiraKey, itemType, hash);
        }
    }

    private calculateHash(item: any): string {
        const data = JSON.stringify({
            title: item.name,
            description: item.description,
            status: item.status,
            priority: item.priority,
            tags: item.tags
        });
        return crypto.createHash('md5').update(data).digest('hex');
    }

    private async hasLocalChanges(localId: string, itemType: 'epic' | 'story' | 'task'): Promise<boolean> {
        const mapping = this.mappings.get(localId);
        if (!mapping) return false;

        const item = await this.getLocalItem(localId, itemType);
        if (!item) return false;

        const currentHash = this.calculateHash(item);
        return currentHash !== mapping.lastSyncedHash;
    }

    private async getLocalItem(localId: string, itemType: 'epic' | 'story' | 'task'): Promise<Epic | Story | Task | null> {
        if (itemType === 'epic') {
            return await this.planningManager.getEpic(localId);
        }
        // Retrieve story or task using parent IDs from sync mappings
        const mapping = this.mappings.get(localId);
        if (!mapping) return null;

        if (itemType === 'story' && mapping.parentEpicId) {
            return await this.planningManager.getStory(mapping.parentEpicId, localId);
        }
        if (itemType === 'task' && mapping.parentEpicId && mapping.parentStoryId) {
            return await this.planningManager.getTask(mapping.parentEpicId, mapping.parentStoryId, localId);
        }
        return null;
    }

    private mapPriority(priority?: string): string {
        const map: Record<string, string> = {
            critical: 'Highest',
            high: 'High',
            medium: 'Medium',
            low: 'Low'
        };
        return map[priority || 'medium'] || 'Medium';
    }

    private mapJiraPriority(priority?: string): Priority {
        if (!priority) return Priority.Medium;
        const lower = priority.toLowerCase();
        if (lower.includes('highest') || lower.includes('critical')) return Priority.High;
        if (lower.includes('high')) return Priority.High;
        if (lower.includes('low')) return Priority.Low;
        return Priority.Medium;
    }

    private mapJiraStatus(status: string): EpicStatus {
        const lower = status.toLowerCase();
        if (lower.includes('todo') || lower.includes('backlog')) return EpicStatus.Todo;
        if (lower.includes('progress')) return EpicStatus.InProgress;
        if (lower.includes('block')) return EpicStatus.Pending;
        if (lower.includes('done')) return EpicStatus.Done;
        return EpicStatus.Todo;
    }

    private mapIssueType(issueType: string): 'epic' | 'story' | 'task' {
        const lower = issueType.toLowerCase();
        if (lower === 'epic') return 'epic';
        if (lower === 'story') return 'story';
        return 'task';
    }

    private extractDescription(adf: any): string {
        if (!adf) return '';
        if (typeof adf === 'string') return adf;
        
        // Extract text from Atlassian Document Format
        if (adf.content && Array.isArray(adf.content)) {
            return adf.content
                .map((node: any) => {
                    if (node.content && Array.isArray(node.content)) {
                        return node.content.map((n: any) => n.text || '').join('');
                    }
                    return '';
                })
                .join('\n');
        }
        
        return '';
    }

    private async loadSyncState(): Promise<void> {
        try {
            const data = await this.workspaceManager.readFile(this.SYNC_STATE_FILE);
            this.syncState = JSON.parse(data);
        } catch {
            // File doesn't exist yet
        }
    }

    private async saveSyncState(): Promise<void> {
        await this.workspaceManager.writeFile(
            this.SYNC_STATE_FILE,
            JSON.stringify(this.syncState, null, 2)
        );
    }

    private async loadMappings(): Promise<void> {
        try {
            const data = await this.workspaceManager.readFile(this.SYNC_MAPPINGS_FILE);
            const mappings: SyncMapping[] = JSON.parse(data);
            this.mappings = new Map(mappings.map(m => [m.aiccId, m]));
        } catch {
            // File doesn't exist yet
        }
    }

    private async saveMappings(): Promise<void> {
        const mappings = Array.from(this.mappings.values());
        await this.workspaceManager.writeFile(
            this.SYNC_MAPPINGS_FILE,
            JSON.stringify(mappings, null, 2)
        );
    }

    public getSyncState(): SyncState {
        return { ...this.syncState };
    }

    public getMappings(): SyncMapping[] {
        return Array.from(this.mappings.values());
    }

    public dispose(): void {
        this.removeAllListeners();
    }
}
