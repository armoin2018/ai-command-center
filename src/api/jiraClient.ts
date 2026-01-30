import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../logger';

/**
 * JIRA API Client
 * 
 * Provides integration with JIRA REST API v3
 */

export interface JiraConfig {
    baseUrl: string;
    email: string;
    apiToken: string;
    projectKey?: string;
}

export interface JiraIssue {
    id: string;
    key: string;
    fields: {
        summary: string;
        description?: any;
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
        };
        reporter?: {
            accountId: string;
            displayName: string;
        };
        created: string;
        updated: string;
        duedate?: string;
        labels?: string[];
        [key: string]: any;
    };
}

export interface CreateIssueRequest {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: string; // 'Epic', 'Story', 'Task', 'Bug', 'Sub-task'
    priority?: string;
    labels?: string[];
    epicLink?: string;
    epicKey?: string;      // Parent epic key for stories
    parentKey?: string;    // Parent issue key for sub-tasks
    storyPoints?: number;
    estimatedHours?: number;
    assignee?: string;
}

export class JiraClient {
    private client: AxiosInstance;
    private retryAttempts = 3;
    private retryDelay = 1000; // ms

    constructor(config: JiraConfig) {

        // Create axios instance with auth
        this.client = axios.create({
            baseURL: `${config.baseUrl}/rest/api/3`,
            auth: {
                username: config.email,
                password: config.apiToken
            },
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        // Add response interceptor for error handling
        this.client.interceptors.response.use(
            response => response,
            error => this.handleError(error)
        );
    }

    /**
     * Test connection to JIRA
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await this.client.get('/myself');
            logger.info('JIRA connection successful', { 
                user: response.data.displayName 
            });
            return {
                success: true,
                message: `Connected as ${response.data.displayName}`
            };
        } catch (error: any) {
            logger.error('JIRA connection failed', { error });
            return {
                success: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    /**
     * Get issue by key or ID
     */
    async getIssue(issueKey: string): Promise<JiraIssue | null> {
        try {
            const response = await this.retryRequest(() =>
                this.client.get(`/issue/${issueKey}`)
            );
            return response.data;
        } catch (error) {
            logger.error('Failed to get issue', { issueKey, error });
            return null;
        }
    }

    /**
     * Create new issue
     */
    async createIssue(request: CreateIssueRequest): Promise<JiraIssue | null> {
        try {
            const payload: any = {
                fields: {
                    project: {
                        key: request.projectKey
                    },
                    summary: request.summary,
                    issuetype: {
                        name: request.issueType
                    }
                }
            };

            // Add optional fields
            if (request.description) {
                // JIRA uses ADF (Atlassian Document Format) for descriptions
                payload.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: request.description
                                }
                            ]
                        }
                    ]
                };
            }

            if (request.priority) {
                payload.fields.priority = { title: request.priority };
            }

            if (request.labels) {
                payload.fields.labels = request.labels;
            }

            // Epic link (custom field - usually customfield_10014)
            if (request.epicLink) {
                payload.fields.customfield_10014 = request.epicLink;
            }

            // Story points (custom field - usually customfield_10016)
            if (request.storyPoints) {
                payload.fields.customfield_10016 = request.storyPoints;
            }

            const response = await this.retryRequest(() =>
                this.client.post('/issue', payload)
            );

            logger.info('Created JIRA issue', { 
                key: response.data.key,
                id: response.data.id 
            });

            // Fetch full issue details
            return await this.getIssue(response.data.key);
        } catch (error) {
            logger.error('Failed to create issue', { request, error });
            return null;
        }
    }

    /**
     * Update existing issue
     */
    async updateIssue(
        issueKey: string,
        updates: Partial<CreateIssueRequest>
    ): Promise<boolean> {
        try {
            const payload: any = { fields: {} };

            if (updates.summary) {
                payload.fields.summary = updates.summary;
            }

            if (updates.description) {
                payload.fields.description = {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                {
                                    type: 'text',
                                    text: updates.description
                                }
                            ]
                        }
                    ]
                };
            }

            if (updates.priority) {
                payload.fields.priority = { title: updates.priority };
            }

            if (updates.labels) {
                payload.fields.labels = updates.labels;
            }

            if (updates.storyPoints) {
                payload.fields.customfield_10016 = updates.storyPoints;
            }

            await this.retryRequest(() =>
                this.client.put(`/issue/${issueKey}`, payload)
            );

            logger.info('Updated JIRA issue', { issueKey });
            return true;
        } catch (error) {
            logger.error('Failed to update issue', { issueKey, updates, error });
            return false;
        }
    }

    /**
     * Delete issue
     */
    async deleteIssue(issueKey: string): Promise<boolean> {
        try {
            await this.retryRequest(() =>
                this.client.delete(`/issue/${issueKey}`)
            );

            logger.info('Deleted JIRA issue', { issueKey });
            return true;
        } catch (error) {
            logger.error('Failed to delete issue', { issueKey, error });
            return false;
        }
    }

    /**
     * Search issues with JQL
     */
    async searchIssues(
        jql: string,
        options?: { maxResults?: number; startAt?: number }
    ): Promise<JiraIssue[]> {
        try {
            const response = await this.retryRequest(() =>
                this.client.post('/search', {
                    jql,
                    maxResults: options?.maxResults || 100,
                    startAt: options?.startAt || 0
                })
            );

            return response.data.issues;
        } catch (error) {
            logger.error('Failed to search issues', { jql, error });
            return [];
        }
    }

    /**
     * Get all issues for a project
     */
    async getProjectIssues(projectKey: string): Promise<JiraIssue[]> {
        return this.searchIssues(`project = ${projectKey} ORDER BY created DESC`);
    }

    /**
     * Transition issue (change status)
     */
    async transitionIssue(
        issueKey: string,
        transitionId: string
    ): Promise<boolean> {
        try {
            await this.retryRequest(() =>
                this.client.post(`/issue/${issueKey}/transitions`, {
                    transition: { id: transitionId }
                })
            );

            logger.info('Transitioned JIRA issue', { issueKey, transitionId });
            return true;
        } catch (error) {
            logger.error('Failed to transition issue', { issueKey, error });
            return false;
        }
    }

    /**
     * Get available transitions for an issue
     */
    async getTransitions(issueKey: string): Promise<any[]> {
        try {
            const response = await this.retryRequest(() =>
                this.client.get(`/issue/${issueKey}/transitions`)
            );

            return response.data.transitions;
        } catch (error) {
            logger.error('Failed to get transitions', { issueKey, error });
            return [];
        }
    }

    /**
     * Get projects accessible to user
     */
    async getProjects(): Promise<any[]> {
        try {
            const response = await this.retryRequest(() =>
                this.client.get('/project')
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to get projects', { error });
            return [];
        }
    }

    /**
     * Get issue types for a project
     */
    async getIssueTypes(projectKey: string): Promise<any[]> {
        try {
            const response = await this.retryRequest(() =>
                this.client.get(`/project/${projectKey}/statuses`)
            );

            return response.data;
        } catch (error) {
            logger.error('Failed to get issue types', { projectKey, error });
            return [];
        }
    }

    /**
     * Retry request with exponential backoff
     */
    private async retryRequest<T>(
        request: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await request();
        } catch (error) {
            if (attempt >= this.retryAttempts) {
                throw error;
            }

            const delay = this.retryDelay * Math.pow(2, attempt - 1);
            logger.info(`Retrying request (attempt ${attempt + 1}/${this.retryAttempts}) after ${delay}ms`);

            await new Promise(resolve => setTimeout(resolve, delay));
            return this.retryRequest(request, attempt + 1);
        }
    }

    /**
     * Handle axios errors
     */
    private handleError(error: AxiosError): Promise<never> {
        if (error.response) {
            // Server responded with error status
            const status = error.response.status;
            const data: any = error.response.data;

            if (status === 401) {
                throw new Error('Authentication failed. Check your email and API token.');
            } else if (status === 403) {
                throw new Error('Permission denied. Check your JIRA permissions.');
            } else if (status === 404) {
                throw new Error('Resource not found.');
            } else if (status === 429) {
                throw new Error('Rate limit exceeded. Please try again later.');
            } else {
                const message = data?.errorMessages?.[0] || data?.message || `Request failed with status ${status}`;
                throw new Error(message);
            }
        } else if (error.request) {
            // Request made but no response
            throw new Error('No response from JIRA server. Check your network connection and base URL.');
        } else {
            // Error setting up request
            throw new Error(error.message || 'Failed to make request');
        }
    }
}
