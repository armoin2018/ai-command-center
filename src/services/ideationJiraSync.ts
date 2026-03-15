/**
 * Ideation Jira Sync Service
 *
 * Maps ideas to Jira issues, tracks sync status, and provides scheduled
 * synchronisation via a simple interval pattern.
 *
 * Part of AICC-0113: Ideation System & Jira Sync
 *   - AICC-0117 / AICC-0323: Implement Jira issue creation from idea
 *   - AICC-0324: Build sync status tracking
 *   - AICC-0325: Add scheduled sync for ideation via scheduler
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { IdeationService } from './ideationService';
import type { Idea } from '../types/ideation';

// ─── Constants ───────────────────────────────────────────────────────

const COMPONENT = 'IdeationJiraSync';
const DEFAULT_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// ─── Jira Config (read from VS Code settings) ───────────────────────

interface IdeationJiraConfig {
    enabled: boolean;
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
    issueType: string;
}

// ─── Sync Result ─────────────────────────────────────────────────────

export interface IdeationJiraSyncResult {
    success: boolean;
    ideasSynced: number;
    ideasSkipped: number;
    errors: string[];
    duration: number;
}

// ─── Jira Payload ────────────────────────────────────────────────────

interface JiraCreatePayload {
    fields: {
        project: { key: string };
        summary: string;
        description: string;
        issuetype: { name: string };
        labels: string[];
    };
}

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton service that synchronises ideas to Jira.
 *
 * Responsibilities:
 * - Map idea fields → Jira issue fields
 * - Create issues in Jira via REST API
 * - Track which ideas have been synced (via `jiraIssueKey` / `jiraSyncedAt`)
 * - Provide a scheduled interval for automatic sync
 */
export class IdeationJiraSync {
    // ── Singleton ────────────────────────────────────────────────
    private static instance: IdeationJiraSync | undefined;

    private readonly logger: Logger;
    private syncTimer: ReturnType<typeof setInterval> | undefined;
    private workspacePath: string | undefined;

    // ── Construction ─────────────────────────────────────────────

    private constructor() {
        this.logger = Logger.getInstance();
    }

    public static getInstance(): IdeationJiraSync {
        if (!IdeationJiraSync.instance) {
            IdeationJiraSync.instance = new IdeationJiraSync();
        }
        return IdeationJiraSync.instance;
    }

    public static resetInstance(): void {
        if (IdeationJiraSync.instance) {
            IdeationJiraSync.instance.stopScheduledSync();
            IdeationJiraSync.instance = undefined;
        }
    }

    // ── Configuration ────────────────────────────────────────────

    /**
     * Read Jira configuration from VS Code workspace settings.
     * Returns `null` if required fields are missing.
     */
    private getConfig(): IdeationJiraConfig | null {
        const cfg = vscode.workspace.getConfiguration('aicc.jira');
        const baseUrl = cfg.get<string>('baseUrl', '');
        const email = cfg.get<string>('email', '');
        const projectKey = cfg.get<string>('projectKey', '');

        if (!baseUrl || !email || !projectKey) {
            return null;
        }

        return {
            enabled: cfg.get<boolean>('enabled', false),
            baseUrl,
            email,
            apiToken: '', // Filled from SecretStorage by caller
            projectKey,
            issueType: cfg.get<string>('ideationIssueType', 'Task'),
        };
    }

    // ── Field Mapping (AICC-0323) ────────────────────────────────

    /**
     * Map an {@link Idea} to a Jira issue creation payload.
     *
     * Mapping:
     *   - title       → summary
     *   - description → description
     *   - category    → label (prefixed `idea-category:`)
     *   - tags        → labels
     */
    public mapIdeaToJiraPayload(idea: Idea, projectKey: string, issueType: string): JiraCreatePayload {
        const labels = [
            ...idea.tags,
            `idea-category:${idea.category}`,
            `idea-status:${idea.status}`,
        ];

        return {
            fields: {
                project: { key: projectKey },
                summary: idea.title,
                description: this.buildDescription(idea),
                issuetype: { name: issueType },
                labels,
            },
        };
    }

    /**
     * Build a rich Jira description from an idea.
     */
    private buildDescription(idea: Idea): string {
        const lines: string[] = [
            idea.description,
            '',
            '---',
            `*Source*: Ideation System`,
            `*Idea ID*: ${idea.id}`,
            `*Author*: ${idea.author}`,
            `*Category*: ${idea.category}`,
            `*Status*: ${idea.status}`,
            `*Created*: ${idea.createdAt}`,
        ];
        if (idea.votes.length > 0) {
            const up = idea.votes.filter((v) => v.direction === 'up').length;
            const down = idea.votes.filter((v) => v.direction === 'down').length;
            lines.push(`*Votes*: +${up} / -${down} (net ${up - down})`);
        }
        if (idea.comments.length > 0) {
            lines.push(`*Comments*: ${idea.comments.length}`);
        }
        return lines.join('\n');
    }

    // ── Sync Execution (AICC-0323, AICC-0324) ───────────────────

    /**
     * Sync all un-synced ideas to Jira.
     *
     * Ideas that already have a `jiraIssueKey` are skipped.
     */
    public async syncIdeas(
        workspacePath: string,
        apiToken?: string,
    ): Promise<IdeationJiraSyncResult> {
        const startTime = Date.now();
        const errors: string[] = [];
        let synced = 0;
        let skipped = 0;

        const config = this.getConfig();
        if (!config || !config.enabled) {
            return {
                success: false,
                ideasSynced: 0,
                ideasSkipped: 0,
                errors: ['Jira integration not configured or disabled'],
                duration: Date.now() - startTime,
            };
        }

        if (apiToken) {
            config.apiToken = apiToken;
        }

        const ideation = IdeationService.getInstance(workspacePath);
        const ideas = ideation.listIdeas();

        for (const idea of ideas) {
            if (idea.jiraIssueKey) {
                skipped++;
                continue;
            }

            try {
                const payload = this.mapIdeaToJiraPayload(
                    idea,
                    config.projectKey,
                    config.issueType,
                );
                const jiraKey = await this.createJiraIssue(config, payload);
                ideation.setJiraLink(idea.id, jiraKey);
                synced++;
                this.logger.info(`Synced idea ${idea.id} → ${jiraKey}`, {
                    component: COMPONENT,
                });
            } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                errors.push(`Failed to sync idea ${idea.id}: ${msg}`);
                this.logger.error(`Jira sync error for idea ${idea.id}: ${msg}`, {
                    component: COMPONENT,
                });
            }
        }

        const duration = Date.now() - startTime;
        this.logger.info('Ideation Jira sync complete', {
            component: COMPONENT,
            synced,
            skipped,
            errors: errors.length,
            duration,
        });

        return {
            success: errors.length === 0,
            ideasSynced: synced,
            ideasSkipped: skipped,
            errors,
            duration,
        };
    }

    // ── Jira REST API ────────────────────────────────────────────

    /**
     * Create a Jira issue via REST API.
     *
     * @returns The newly created issue key (e.g. "PROJ-42").
     */
    private async createJiraIssue(
        config: IdeationJiraConfig,
        payload: JiraCreatePayload,
    ): Promise<string> {
        const url = `${config.baseUrl.replace(/\/+$/, '')}/rest/api/2/issue`;
        const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Jira API ${response.status}: ${text}`);
        }

        const result = (await response.json()) as { key: string };
        return result.key;
    }

    // ── Scheduled Sync (AICC-0325) ───────────────────────────────

    /**
     * Start a recurring sync interval.
     *
     * @param workspacePath - Workspace root for IdeationService.
     * @param intervalMs    - Interval in milliseconds (default: 30 min).
     * @param apiToken      - Optional pre-resolved Jira API token.
     */
    public startScheduledSync(
        workspacePath: string,
        intervalMs: number = DEFAULT_SYNC_INTERVAL_MS,
        apiToken?: string,
    ): void {
        this.stopScheduledSync();
        this.workspacePath = workspacePath;
        this.logger.info(`Starting ideation Jira sync every ${intervalMs / 1000}s`, {
            component: COMPONENT,
        });
        this.syncTimer = setInterval(() => {
            this.syncIdeas(workspacePath, apiToken).catch((err) => {
                this.logger.error(`Scheduled ideation sync error: ${err}`, {
                    component: COMPONENT,
                });
            });
        }, intervalMs);
    }

    /**
     * Stop the recurring sync interval, if active.
     */
    public stopScheduledSync(): void {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
            this.logger.info('Stopped ideation Jira scheduled sync', {
                component: COMPONENT,
            });
        }
    }

    /**
     * Returns the workspace path this sync was initialised for, if any.
     */
    public getWorkspacePath(): string | undefined {
        return this.workspacePath;
    }
}
