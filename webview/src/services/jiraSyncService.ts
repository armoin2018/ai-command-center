/**
 * JIRA Sync Service
 * 
 * Bidirectional synchronization between AICC and JIRA
 */

import { JiraClient, JiraIssue, CreateIssueRequest } from '../api/jiraClient';
import { TreeNodeData } from '../types/tree';
import { RemoteLogger } from '../utils/remoteLogger';

export interface SyncConfig {
    jiraClient: JiraClient;
    projectKey: string;
    syncDirection: 'push' | 'pull' | 'bidirectional';
    autoSync: boolean;
    syncInterval?: number; // minutes
}

export interface SyncResult {
    success: boolean;
    pushed: number;
    pulled: number;
    conflicts: SyncConflict[];
    errors: string[];
}

export interface SyncConflict {
    itemId: string;
    itemName: string;
    type: 'update' | 'delete';
    localData: Partial<TreeNodeData>;
    remoteData: Partial<JiraIssue>;
    timestamp: string;
}

export interface SyncHistory {
    timestamp: string;
    direction: 'push' | 'pull' | 'bidirectional';
    result: SyncResult;
}

export class JiraSyncService {
    private static readonly SYNC_MAP_KEY = 'jiraSyncMap';
    private static readonly SYNC_HISTORY_KEY = 'jiraSyncHistory';
    private static readonly MAX_HISTORY = 20;

    private config: SyncConfig;
    private syncMap: Map<string, string>; // AICC ID -> JIRA Key
    private lastSync: string | null = null;
    private syncTimer: number | null = null;
    private logger: RemoteLogger;

    constructor(config: SyncConfig) {
        this.config = config;
        this.syncMap = this.loadSyncMap();
        this.lastSync = localStorage.getItem('lastSyncTime');
        this.logger = new RemoteLogger();

        if (config.autoSync && config.syncInterval) {
            this.startAutoSync();
        }
    }

    /**
     * Perform bidirectional sync
     */
    async sync(tree: TreeNodeData[]): Promise<SyncResult> {
        const result: SyncResult = {
            success: false,
            pushed: 0,
            pulled: 0,
            conflicts: [],
            errors: []
        };

        try {
            this.logger.debug('Starting JIRA sync', { direction: this.config.syncDirection });

            if (this.config.syncDirection === 'push' || this.config.syncDirection === 'bidirectional') {
                const pushResult = await this.pushToJira(tree);
                result.pushed = pushResult.count;
                result.errors.push(...pushResult.errors);
            }

            if (this.config.syncDirection === 'pull' || this.config.syncDirection === 'bidirectional') {
                const pullResult = await this.pullFromJira();
                result.pulled = pullResult.count;
                result.errors.push(...pullResult.errors);
                result.conflicts.push(...pullResult.conflicts);
            }

            result.success = result.errors.length === 0;
            this.lastSync = new Date().toISOString();
            localStorage.setItem('lastSyncTime', this.lastSync);

            this.addToHistory({
                timestamp: this.lastSync,
                direction: this.config.syncDirection,
                result
            });

            this.logger.info('JIRA sync completed', result);
        } catch (error) {
            result.errors.push(error instanceof Error ? error.message : 'Unknown error');
            console.error('JIRA sync failed', error);
        }

        return result;
    }

    /**
     * Push AICC items to JIRA
     */
    private async pushToJira(tree: TreeNodeData[]): Promise<{ count: number; errors: string[] }> {
        let count = 0;
        const errors: string[] = [];

        const traverse = async (node: TreeNodeData, epicKey?: string) => {
            try {
                const jiraKey = this.syncMap.get(node.id);

                if (jiraKey) {
                    // Update existing
                    await this.config.jiraClient.updateIssue(jiraKey, {
                        fields: {
                            summary: node.title,
                            status: this.mapStatusToJira(node.status),
                            priority: this.mapPriorityToJira(node.priority),
                            labels: node.tags || []
                        }
                    });
                    count++;
                } else {
                    // Create new
                    const request: CreateIssueRequest = {
                        projectKey: this.config.projectKey,
                        summary: node.title,
                        issueType: this.mapTypeToJira(node.type),
                        priority: this.mapPriorityToJira(node.priority),
                        labels: node.tags,
                        estimatedHours: node.estimatedHours
                    };

                    if (epicKey && node.type !== 'epic') {
                        request.epicLink = epicKey;
                    }

                    const issue = await this.config.jiraClient.createIssue(request);
                    this.syncMap.set(node.id, issue.key);
                    count++;

                    // Use this issue as epic link for children
                    if (node.type === 'epic') {
                        epicKey = issue.key;
                    }
                }

                // Recurse children
                if (node.children) {
                    for (const child of node.children) {
                        await traverse(child, epicKey);
                    }
                }
            } catch (error) {
                const message = `Failed to sync ${node.title}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(message);
                console.error(message, error);
            }
        };

        for (const node of tree) {
            await traverse(node);
        }

        this.saveSyncMap();
        return { count, errors };
    }

    /**
     * Pull issues from JIRA
     */
    private async pullFromJira(): Promise<{ count: number; errors: string[]; conflicts: SyncConflict[] }> {
        let count = 0;
        const errors: string[] = [];
        const conflicts: SyncConflict[] = [];

        try {
            const issues = await this.config.jiraClient.getProjectIssues(this.config.projectKey);

            for (const issue of issues) {
                // Find matching AICC item
                const aiccId = Array.from(this.syncMap.entries()).find(([_, key]) => key === issue.key)?.[0];

                if (aiccId) {
                    // Check for conflicts
                    const localData = this.getLocalItem(aiccId);
                    if (localData && localData.title && this.hasConflict(localData, issue)) {
                        conflicts.push({
                            itemId: aiccId,
                            itemName: localData.title,
                            type: 'update',
                            localData,
                            remoteData: issue,
                            timestamp: new Date().toISOString()
                        });
                    }
                }

                count++;
            }
        } catch (error) {
            const message = `Failed to pull from JIRA: ${error instanceof Error ? error.message : 'Unknown error'}`;
            errors.push(message);
            console.error(message, error);
        }

        return { count, errors, conflicts };
    }

    /**
     * Map AICC type to JIRA issue type
     */
    private mapTypeToJira(type: string): 'Epic' | 'Story' | 'Task' {
        switch (type) {
            case 'epic': return 'Epic';
            case 'story': return 'Story';
            case 'task': return 'Task';
            default: return 'Task';
        }
    }

    /**
     * Map AICC status to JIRA status
     */
    private mapStatusToJira(status: string): any {
        // Note: Actual status transitions require getting available transitions
        switch (status) {
            case 'todo': return { title: 'To Do' };
            case 'in-progress': return { title: 'In Progress' };
            case 'pending': return { title: 'Blocked' };
            case 'done': return { title: 'Done' };
            default: return { title: 'To Do' };
        }
    }

    /**
     * Map AICC priority to JIRA priority
     */
    private mapPriorityToJira(priority?: string): string {
        switch (priority) {
            case 'critical': return 'Highest';
            case 'high': return 'High';
            case 'medium': return 'Medium';
            case 'low': return 'Low';
            default: return 'Medium';
        }
    }

    /**
     * Check if there's a conflict between local and remote data
     */
    private hasConflict(local: Partial<TreeNodeData>, remote: JiraIssue): boolean {
        if (local.title !== remote.fields.summary) return true;
        if (local.status !== this.mapJiraStatusToAicc(remote.fields.status.title)) return true;
        if (local.priority !== this.mapJiraPriorityToAicc(remote.fields.priority?.title)) return true;
        return false;
    }

    /**
     * Map JIRA status to AICC status
     */
    private mapJiraStatusToAicc(status: string): string {
        const lower = status.toLowerCase();
        if (lower.includes('todo') || lower.includes('backlog')) return 'todo';
        if (lower.includes('progress') || lower.includes('doing')) return 'in-progress';
        if (lower.includes('block')) return 'pending';
        if (lower.includes('done') || lower.includes('complete')) return 'done';
        return 'todo';
    }

    /**
     * Map JIRA priority to AICC priority
     */
    private mapJiraPriorityToAicc(priority?: string): string {
        if (!priority) return 'medium';
        const lower = priority.toLowerCase();
        if (lower.includes('highest') || lower.includes('critical')) return 'critical';
        if (lower.includes('high')) return 'high';
        if (lower.includes('medium')) return 'medium';
        if (lower.includes('low')) return 'low';
        return 'medium';
    }

    /**
     * Get local item (mock - actual implementation would query tree)
     */
    private getLocalItem(id: string): Partial<TreeNodeData> | null {
        // TODO: Implement actual lookup from tree
        return null;
    }

    /**
     * Resolve conflict
     */
    async resolveConflict(conflict: SyncConflict, resolution: 'local' | 'remote'): Promise<boolean> {
        try {
            const jiraKey = this.syncMap.get(conflict.itemId);
            if (!jiraKey) return false;

            if (resolution === 'local') {
                // Push local changes to JIRA
                await this.config.jiraClient.updateIssue(jiraKey, {
                    fields: {
                        summary: conflict.localData.title || '',
                        status: this.mapStatusToJira(conflict.localData.status || 'todo')
                    }
                });
            } else {
                // Pull remote changes to local (handled by caller)
                // Just mark as resolved
            }

            return true;
        } catch (error) {
            console.error('Failed to resolve conflict', error);
            return false;
        }
    }

    /**
     * Start auto-sync
     */
    private startAutoSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        const interval = (this.config.syncInterval || 15) * 60 * 1000; // Convert to ms
        this.syncTimer = window.setInterval(() => {
            this.logger.debug('Auto-sync triggered');
            // Auto-sync would need tree reference
        }, interval);
    }

    /**
     * Stop auto-sync
     */
    stopAutoSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    /**
     * Load sync map from storage
     */
    private loadSyncMap(): Map<string, string> {
        const stored = localStorage.getItem(JiraSyncService.SYNC_MAP_KEY);
        return stored ? new Map(JSON.parse(stored)) : new Map();
    }

    /**
     * Save sync map to storage
     */
    private saveSyncMap(): void {
        localStorage.setItem(
            JiraSyncService.SYNC_MAP_KEY,
            JSON.stringify(Array.from(this.syncMap.entries()))
        );
    }

    /**
     * Get sync history
     */
    getHistory(): SyncHistory[] {
        const stored = localStorage.getItem(JiraSyncService.SYNC_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    }

    /**
     * Add to sync history
     */
    private addToHistory(entry: SyncHistory): void {
        const history = this.getHistory();
        history.unshift(entry);
        const trimmed = history.slice(0, JiraSyncService.MAX_HISTORY);
        localStorage.setItem(JiraSyncService.SYNC_HISTORY_KEY, JSON.stringify(trimmed));
    }

    /**
     * Get last sync time
     */
    getLastSyncTime(): string | null {
        return this.lastSync;
    }
}
