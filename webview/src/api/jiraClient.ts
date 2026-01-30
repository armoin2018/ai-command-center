/**
 * JIRA Client Interface for WebView
 * 
 * This is a lightweight interface that communicates with the extension's JIRA client via postMessage
 */

export interface JiraConfig {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey: string;
}

export interface JiraIssue {
    key: string;
    fields: {
        summary: string;
        status: { title: string };
        priority?: { title: string };
        assignee?: { displayName: string };
        labels: string[];
        issuetype: { title: string };
        created: string;
        updated: string;
    };
}

export interface CreateIssueRequest {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: 'Epic' | 'Story' | 'Task' | 'Bug';
    priority?: string;
    labels?: string[];
    epicLink?: string;
    estimatedHours?: number;
}

export class JiraClient {
    private config: JiraConfig;
    private vscode: any;

    constructor(config: JiraConfig) {
        this.config = config;
        this.vscode = (window as any).acquireVsCodeApi();
    }

    async testConnection(): Promise<any> {
        return this.sendCommand('jira.testConnection', this.config);
    }

    async createIssue(request: CreateIssueRequest): Promise<JiraIssue> {
        return this.sendCommand('jira.createIssue', { config: this.config, request });
    }

    async getIssue(issueKey: string): Promise<JiraIssue> {
        return this.sendCommand('jira.getIssue', { config: this.config, issueKey });
    }

    async updateIssue(issueKey: string, updates: any): Promise<void> {
        return this.sendCommand('jira.updateIssue', { config: this.config, issueKey, updates });
    }

    async deleteIssue(issueKey: string): Promise<void> {
        return this.sendCommand('jira.deleteIssue', { config: this.config, issueKey });
    }

    async searchIssues(jql: string, options?: any): Promise<JiraIssue[]> {
        return this.sendCommand('jira.searchIssues', { config: this.config, jql, options });
    }

    async getProjectIssues(projectKey: string): Promise<JiraIssue[]> {
        return this.sendCommand('jira.getProjectIssues', { config: this.config, projectKey });
    }

    async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
        return this.sendCommand('jira.transitionIssue', { config: this.config, issueKey, transitionId });
    }

    async getTransitions(issueKey: string): Promise<any[]> {
        return this.sendCommand('jira.getTransitions', { config: this.config, issueKey });
    }

    async getProjects(): Promise<any[]> {
        return this.sendCommand('jira.getProjects', this.config);
    }

    async getIssueTypes(projectKey: string): Promise<any[]> {
        return this.sendCommand('jira.getIssueTypes', { config: this.config, projectKey });
    }

    private sendCommand(command: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const messageId = Math.random().toString(36).substring(7);
            
            const handler = (event: MessageEvent) => {
                const message = event.data;
                if (message.id === messageId) {
                    window.removeEventListener('message', handler);
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        resolve(message.result);
                    }
                }
            };

            window.addEventListener('message', handler);
            
            this.vscode.postMessage({
                type: 'jiraCommand',
                id: messageId,
                command,
                data
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Request timeout'));
            }, 30000);
        });
    }
}
