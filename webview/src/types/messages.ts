/**
 * WebView Messaging Types
 * 
 * Defines the message protocol between VS Code extension and WebView
 */

export type MessageType =
    | 'init'
    | 'treeData'
    | 'createEpic'
    | 'createStory'
    | 'createTask'
    | 'createBug'
    | 'updateItem'
    | 'deleteItem'
    | 'reorder'
    | 'updateOrder'
    | 'bulkUpdate'
    | 'log'
    | 'error';

export interface BaseMessage {
    type: MessageType;
    requestId?: string;
}

export interface InitMessage extends BaseMessage {
    type: 'init';
    payload: {
        config: any;
        theme: 'light' | 'dark';
    };
}

export interface TreeDataMessage extends BaseMessage {
    type: 'treeData';
    payload: {
        tree: any;
    };
}

export interface CreateEpicMessage extends BaseMessage {
    type: 'createEpic';
    payload: {
        title: string;
        description: string;
        priority?: string;
        assignee?: string;
        estimatedHours?: number;
        gitRepoUrl?: string;
        gitRepoBranch?: string;
        assignedAgent?: string;
        tags?: string[];
        deliverByDate?: string;
    };
}

export interface CreateStoryMessage extends BaseMessage {
    type: 'createStory';
    payload: {
        epicId?: string;
        title: string;
        description: string;
        assignee?: string;
        estimatedHours?: number;
        gitRepoUrl?: string;
        gitRepoBranch?: string;
        assignedAgent?: string;
        tags?: string[];
        deliverByDate?: string;
    };
}

export interface CreateTaskMessage extends BaseMessage {
    type: 'createTask';
    payload: {
        epicId?: string;
        title: string;
        description?: string;
        assignee?: string;
        gitRepoUrl?: string;
        gitRepoBranch?: string;
        assignedAgent?: string;
        tags?: string[];
        deliverByDate?: string;
    };
}

export interface CreateBugMessage extends BaseMessage {
    type: 'createBug';
    payload: {
        epicId?: string;
        title: string;
        description: string;
        assignee?: string;
        priority?: string;
        gitRepoUrl?: string;
        gitRepoBranch?: string;
        assignedAgent?: string;
        tags?: string[];
        deliverByDate?: string;
    };
}

export interface UpdateItemMessage extends BaseMessage {
    type: 'updateItem';
    payload: {
        itemType: 'epic' | 'story' | 'task' | 'bug';
        id: string;
        updates: any;
    };
}

export interface DeleteItemMessage extends BaseMessage {
    type: 'deleteItem';
    payload: {
        itemType: 'epic' | 'story' | 'task' | 'bug';
        id: string;
    };
}

export interface ReorderMessage extends BaseMessage {
    type: 'reorder';
    payload: {
        draggedId: string;
        targetId: string;
        position: 'before' | 'after' | 'inside';
    };
}

export interface UpdateOrderMessage extends BaseMessage {
    type: 'updateOrder';
    payload: {
        items: Array<{ id: string; order: number }>;
    };
}

export interface BulkUpdateMessage extends BaseMessage {
    type: 'bulkUpdate';
    payload: {
        itemIds: string[];
        updates: {
            status?: string;
            assignee?: string;
            tags?: string[];
            priority?: string;
        };
    };
}

export interface LogMessage extends BaseMessage {
    type: 'log';
    payload: {
        level: 'info' | 'warn' | 'error';
        message: string;
        data?: any;
    };
}

export interface ErrorMessage extends BaseMessage {
    type: 'error';
    payload: {
        message: string;
        error?: any;
    };
}

export type WebViewMessage =
    | InitMessage
    | TreeDataMessage
    | CreateEpicMessage
    | CreateStoryMessage
    | CreateTaskMessage
    | CreateBugMessage
    | UpdateItemMessage
    | DeleteItemMessage
    | ReorderMessage
    | UpdateOrderMessage
    | BulkUpdateMessage
    | LogMessage
    | ErrorMessage;

/**
 * VS Code API available in WebView
 */
export interface VSCodeAPI {
    postMessage(message: WebViewMessage): void;
    getState(): any;
    setState(state: any): void;
}

declare global {
    interface Window {
        acquireVsCodeApi(): VSCodeAPI;
    }
}
