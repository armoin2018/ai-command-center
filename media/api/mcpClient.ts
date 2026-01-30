/**
 * MCP REST API Client
 * 
 * TypeScript client for interacting with MCP REST endpoints
 * Provides typed methods for all planning operations
 */

export interface Epic {
    id: string;
    type: string;
    title: string;
    description: string;
    status: string;
    priority?: string;
    order: number;
    epicId: null;
    links?: ItemLink[];
    createdOn: string;
    lastUpdatedOn: string;
    [key: string]: any;
}

export interface Story {
    id: string;
    type: string;
    title: string;
    description: string;
    status: string;
    priority?: string;
    epicId?: string | null;
    order: number;
    links?: ItemLink[];
    createdOn: string;
    lastUpdatedOn: string;
    [key: string]: any;
}

export interface Task {
    id: string;
    type: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    epicId?: string | null;
    assignee?: string;
    order: number;
    links?: ItemLink[];
    createdOn: string;
    lastUpdatedOn: string;
    [key: string]: any;
}

export interface ItemLink {
    type: string;
    targetId: string;
    description?: string;
}

export interface PlanningTree {
    epics: TreeNode[];
    stats: TreeStats;
}

export interface TreeNode {
    id: string;
    type: string;
    title: string;
    status: string;
    children?: TreeNode[];
    data: Epic | Story | Task;
}

export interface TreeStats {
    totalEpics: number;
    totalStories: number;
    totalTasks: number;
    completedItems: number;
    inProgressItems: number;
}

export class MCPApiClient {
    private baseUrl: string;
    private vscode: any;

    constructor(baseUrl: string = '/api', vscode?: any) {
        this.baseUrl = baseUrl;
        this.vscode = vscode;
    }

    /**
     * Get planning tree
     */
    async getPlanningTree(): Promise<PlanningTree> {
        if (this.vscode) {
            // In VSCode webview, use message passing
            return this.sendMessage('getPlanningTree', {});
        }
        
        const response = await fetch(`${this.baseUrl}/planning/tree`);
        if (!response.ok) {
            throw new Error(`Failed to get planning tree: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * List all epics
     */
    async listEpics(): Promise<Epic[]> {
        if (this.vscode) {
            return this.sendMessage('listEpics', {});
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics`);
        if (!response.ok) {
            throw new Error(`Failed to list epics: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get epic by ID
     */
    async getEpic(epicId: string): Promise<Epic> {
        if (this.vscode) {
            return this.sendMessage('getEpic', { epicId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}`);
        if (!response.ok) {
            throw new Error(`Failed to get epic: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Create new epic
     */
    async createEpic(data: { title: string; description: string; priority?: string }): Promise<Epic> {
        if (this.vscode) {
            return this.sendMessage('createEpic', data);
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Failed to create epic: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Update epic
     */
    async updateEpic(epicId: string, updates: Partial<Epic>): Promise<Epic> {
        if (this.vscode) {
            return this.sendMessage('updateEpic', { epicId, updates });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            throw new Error(`Failed to update epic: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Delete epic
     */
    async deleteEpic(epicId: string): Promise<boolean> {
        if (this.vscode) {
            return this.sendMessage('deleteEpic', { epicId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to delete epic: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * List stories for an epic
     */
    async listStories(epicId: string): Promise<Story[]> {
        if (this.vscode) {
            return this.sendMessage('listStories', { epicId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories`);
        if (!response.ok) {
            throw new Error(`Failed to list stories: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Create new story
     */
    async createStory(epicId: string, data: { title: string; description: string; priority?: string }): Promise<Story> {
        if (this.vscode) {
            return this.sendMessage('createStory', { epicId, ...data });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Failed to create story: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Get story by ID
     */
    async getStory(epicId: string, storyId: string): Promise<Story> {
        if (this.vscode) {
            return this.sendMessage('getStory', { epicId, storyId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}`);
        if (!response.ok) {
            throw new Error(`Failed to get story: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Update story
     */
    async updateStory(epicId: string, storyId: string, updates: Partial<Story>): Promise<Story> {
        if (this.vscode) {
            return this.sendMessage('updateStory', { epicId, storyId, updates });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            throw new Error(`Failed to update story: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Delete story
     */
    async deleteStory(epicId: string, storyId: string): Promise<boolean> {
        if (this.vscode) {
            return this.sendMessage('deleteStory', { epicId, storyId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to delete story: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * List tasks for a story
     */
    async listTasks(epicId: string, storyId: string): Promise<Task[]> {
        if (this.vscode) {
            return this.sendMessage('listTasks', { epicId, storyId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}/tasks`);
        if (!response.ok) {
            throw new Error(`Failed to list tasks: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Create new task
     */
    async createTask(epicId: string, storyId: string, data: { title: string; description: string; priority?: string; assignee?: string }): Promise<Task> {
        if (this.vscode) {
            return this.sendMessage('createTask', { epicId, storyId, ...data });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error(`Failed to create task: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Update task
     */
    async updateTask(epicId: string, storyId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
        if (this.vscode) {
            return this.sendMessage('updateTask', { epicId, storyId, taskId, updates });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            throw new Error(`Failed to update task: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Delete task
     */
    async deleteTask(epicId: string, storyId: string, taskId: string): Promise<boolean> {
        if (this.vscode) {
            return this.sendMessage('deleteTask', { epicId, storyId, taskId });
        }
        
        const response = await fetch(`${this.baseUrl}/planning/epics/${epicId}/stories/${storyId}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        if (!response.ok) {
            throw new Error(`Failed to delete task: ${response.statusText}`);
        }
        return response.json();
    }

    /**
     * Send message to VSCode extension (when running in webview)
     */
    private sendMessage(command: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.vscode) {
                reject(new Error('VSCode API not available'));
                return;
            }

            const messageId = `${command}_${Date.now()}_${Math.random()}`;
            
            const handler = (event: MessageEvent) => {
                const message = event.data;
                if (message.id === messageId) {
                    window.removeEventListener('message', handler);
                    if (message.error) {
                        reject(new Error(message.error));
                    } else {
                        resolve(message.data);
                    }
                }
            };

            window.addEventListener('message', handler);
            
            this.vscode.postMessage({
                id: messageId,
                command,
                payload
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                window.removeEventListener('message', handler);
                reject(new Error('Request timeout'));
            }, 30000);
        });
    }
}

// Global instance for easy access
export const apiClient = new MCPApiClient();
