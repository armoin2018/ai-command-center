/**
 * Jira API Client
 * 
 * Enhanced Jira REST API v3 client with rate limiting, retry logic, and error handling
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../logger';
import { ExternalError } from '../../errors/customErrors';
import { JiraIssue, JiraConfig } from './types';

interface RateLimiter {
    tokens: number;
    lastRefill: number;
    maxTokens: number;
    refillRate: number; // tokens per second
}

interface CreateIssueRequest {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: 'Epic' | 'Story' | 'Task' | 'Sub-task';
    priority?: string;
    labels?: string[];
    epicKey?: string; // Parent epic for stories
    parentKey?: string; // Parent story for sub-tasks
    storyPoints?: number;
    estimatedHours?: number;
    assignee?: string;
    dueDate?: string;
}

export class JiraClient {
    private static instance: JiraClient;
    private axiosInstance: AxiosInstance;
    private rateLimiter: RateLimiter;
    private config: JiraConfig;
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAY_MS = 1000;
    private readonly RATE_LIMIT = 100; // requests per minute

    private constructor(config: JiraConfig) {
        this.config = config;
        
        this.rateLimiter = {
            tokens: this.RATE_LIMIT,
            lastRefill: Date.now(),
            maxTokens: this.RATE_LIMIT,
            refillRate: this.RATE_LIMIT / 60 // tokens per second
        };

        this.axiosInstance = axios.create({
            baseURL: `${config.baseUrl}/rest/api/3`,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        this.setupInterceptors();
        this.setupAuthentication();

        logger.info('JiraClient initialized', { 
            component: 'JiraClient',
            baseUrl: config.baseUrl,
            projectKey: config.projectKey
        });
    }

    public static getInstance(config?: JiraConfig): JiraClient {
        if (!JiraClient.instance && config) {
            JiraClient.instance = new JiraClient(config);
        } else if (!JiraClient.instance) {
            throw new Error('JiraClient not initialized. Provide config on first call.');
        }
        return JiraClient.instance;
    }

    public static resetInstance(): void {
        JiraClient.instance = null as any;
    }

    private setupAuthentication(): void {
        // Jira Cloud uses Basic Auth with email + API token
        const credentials = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
        this.axiosInstance.defaults.headers.common['Authorization'] = `Basic ${credentials}`;
    }

    private setupInterceptors(): void {
        // Request interceptor
        this.axiosInstance.interceptors.request.use(
            async (config) => {
                await this.acquireToken();

                logger.debug('Jira API request', {
                    component: 'JiraClient',
                    method: config.method,
                    url: config.url
                });

                return config;
            },
            (error) => {
                logger.error('Request interceptor error', {
                    component: 'JiraClient',
                    error: error.message
                });
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.debug('Jira API response', {
                    component: 'JiraClient',
                    status: response.status,
                    url: response.config.url
                });
                return response;
            },
            (error: AxiosError) => {
                return this.handleError(error);
            }
        );
    }

    private async acquireToken(): Promise<void> {
        const now = Date.now();
        const timeSinceRefill = (now - this.rateLimiter.lastRefill) / 1000;
        const tokensToAdd = timeSinceRefill * this.rateLimiter.refillRate;

        this.rateLimiter.tokens = Math.min(
            this.rateLimiter.maxTokens,
            this.rateLimiter.tokens + tokensToAdd
        );
        this.rateLimiter.lastRefill = now;

        if (this.rateLimiter.tokens < 1) {
            const waitTime = (1 - this.rateLimiter.tokens) / this.rateLimiter.refillRate * 1000;
            logger.debug('Rate limit wait', {
                component: 'JiraClient',
                waitTime: `${Math.round(waitTime)}ms`
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.rateLimiter.tokens = 1;
        }

        this.rateLimiter.tokens -= 1;
    }

    private async retryRequest<T>(
        request: () => Promise<T>,
        attempt: number = 1
    ): Promise<T> {
        try {
            return await request();
        } catch (error: any) {
            if (attempt >= this.MAX_RETRIES) {
                throw error;
            }

            // Retry on specific errors
            if (error.response?.status === 429 || error.response?.status >= 500) {
                const delay = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                logger.info('Retrying Jira request', {
                    component: 'JiraClient',
                    attempt,
                    maxRetries: this.MAX_RETRIES,
                    delay: `${delay}ms`
                });

                await new Promise(resolve => setTimeout(resolve, delay));
                return this.retryRequest(request, attempt + 1);
            }

            throw error;
        }
    }

    private handleError(error: AxiosError): Promise<never> {
        const status = error.response?.status;
        const data: any = error.response?.data;
        
        let message = 'Jira API error';
        
        if (status === 401) {
            message = 'Authentication failed. Check your email and API token.';
        } else if (status === 403) {
            message = 'Permission denied. Check your Jira permissions.';
        } else if (status === 404) {
            message = 'Resource not found.';
        } else if (status === 429) {
            message = 'Rate limit exceeded. Please try again later.';
        } else if (data?.errorMessages?.length > 0) {
            message = data.errorMessages[0];
        } else if (data?.message) {
            message = data.message;
        } else if (error.request && !error.response) {
            message = 'No response from Jira server. Check your network connection and base URL.';
        }

        logger.error('Jira API error', {
            component: 'JiraClient',
            status,
            message,
            url: error.config?.url
        });

        return Promise.reject(new ExternalError(message, 'Jira'));
    }

    /**
     * Test connection to Jira
     */
    async testConnection(): Promise<{ success: boolean; message: string }> {
        try {
            const response = await this.retryRequest(() =>
                this.axiosInstance.get('/myself')
            );
            
            logger.info('Jira connection successful', {
                component: 'JiraClient',
                user: response.data.displayName
            });

            return {
                success: true,
                message: `Connected as ${response.data.displayName}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    /**
     * Get issue by key
     */
    async getIssue(issueKey: string): Promise<JiraIssue> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(`/issue/${issueKey}`)
        );
        return response.data;
    }

    /**
     * Create new issue
     */
    async createIssue(request: CreateIssueRequest): Promise<JiraIssue> {
        const payload: any = {
            fields: {
                project: { key: request.projectKey },
                summary: request.summary,
                issuetype: { title: request.issueType }
            }
        };

        // Add description (Atlassian Document Format)
        if (request.description) {
            payload.fields.description = {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: request.description }]
                    }
                ]
            };
        }

        // Add optional fields
        if (request.priority) {
            payload.fields.priority = { title: request.priority };
        }
        if (request.labels) {
            payload.fields.labels = request.labels;
        }
        if (request.epicKey) {
            payload.fields.parent = { key: request.epicKey };
        }
        if (request.parentKey) {
            payload.fields.parent = { key: request.parentKey };
        }
        if (request.storyPoints) {
            payload.fields.customfield_10016 = request.storyPoints; // Story points field
        }
        if (request.assignee) {
            payload.fields.assignee = { accountId: request.assignee };
        }
        if (request.dueDate) {
            payload.fields.duedate = request.dueDate;
        }

        const response = await this.retryRequest(() =>
            this.axiosInstance.post('/issue', payload)
        );

        logger.info('Created Jira issue', {
            component: 'JiraClient',
            key: response.data.key,
            id: response.data.id
        });

        // Fetch full issue details
        return await this.getIssue(response.data.key);
    }

    /**
     * Update issue
     */
    async updateIssue(issueKey: string, updates: Partial<CreateIssueRequest>): Promise<void> {
        const payload: any = { fields: {} };

        if (updates.summary !== undefined) {
            payload.fields.summary = updates.summary;
        }
        if (updates.description !== undefined) {
            payload.fields.description = {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: updates.description }]
                    }
                ]
            };
        }
        if (updates.priority !== undefined) {
            payload.fields.priority = { title: updates.priority };
        }
        if (updates.labels !== undefined) {
            payload.fields.labels = updates.labels;
        }
        if (updates.storyPoints !== undefined) {
            payload.fields.customfield_10016 = updates.storyPoints;
        }
        if (updates.dueDate !== undefined) {
            payload.fields.duedate = updates.dueDate;
        }

        await this.retryRequest(() =>
            this.axiosInstance.put(`/issue/${issueKey}`, payload)
        );

        logger.info('Updated Jira issue', {
            component: 'JiraClient',
            issueKey
        });
    }

    /**
     * Delete issue
     */
    async deleteIssue(issueKey: string): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.delete(`/issue/${issueKey}`)
        );

        logger.info('Deleted Jira issue', {
            component: 'JiraClient',
            issueKey
        });
    }

    /**
     * Search issues with JQL
     */
    async searchIssues(jql: string, options?: { maxResults?: number; startAt?: number }): Promise<JiraIssue[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.post('/search', {
                jql,
                maxResults: options?.maxResults || 100,
                startAt: options?.startAt || 0,
                fields: ['*all']
            })
        );

        return response.data.issues;
    }

    /**
     * Get project issues
     */
    async getProjectIssues(projectKey?: string): Promise<JiraIssue[]> {
        const key = projectKey || this.config.projectKey;
        return this.searchIssues(`project = ${key} ORDER BY created DESC`);
    }

    /**
     * Transition issue (change status)
     */
    async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.post(`/issue/${issueKey}/transitions`, {
                transition: { id: transitionId }
            })
        );

        logger.info('Transitioned Jira issue', {
            component: 'JiraClient',
            issueKey,
            transitionId
        });
    }

    /**
     * Get available transitions
     */
    async getTransitions(issueKey: string): Promise<any[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(`/issue/${issueKey}/transitions`)
        );
        return response.data.transitions;
    }

    /**
     * Get projects
     */
    async getProjects(): Promise<any[]> {
        const response = await this.retryRequest(() =>
            this.axiosInstance.get('/project')
        );
        return response.data;
    }

    /**
     * Get issue types for project
     */
    async getIssueTypes(projectKey?: string): Promise<any[]> {
        const key = projectKey || this.config.projectKey;
        const response = await this.retryRequest(() =>
            this.axiosInstance.get(`/project/${key}/statuses`)
        );
        return response.data;
    }

    /**
     * Add comment to issue
     */
    async addComment(issueKey: string, comment: string): Promise<void> {
        await this.retryRequest(() =>
            this.axiosInstance.post(`/issue/${issueKey}/comment`, {
                body: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [{ type: 'text', text: comment }]
                        }
                    ]
                }
            })
        );

        logger.info('Added comment to Jira issue', {
            component: 'JiraClient',
            issueKey
        });
    }
}
