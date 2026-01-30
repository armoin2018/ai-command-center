/**
 * WebView Messaging Types (Extension Side)
 */

export type MessageType =
    | 'init'
    | 'treeData'
    | 'createEpic'
    | 'createStory'
    | 'createTask'
    | 'updateItem'
    | 'deleteItem'
    | 'log'
    | 'error'
    | 'startEditSession'
    | 'endEditSession'
    | 'updateEditActivity'
    | 'acquireLock'
    | 'releaseLock'
    | 'checkConflict'
    | 'editSessionStarted'
    | 'editSessionEnded'
    | 'lockAcquired'
    | 'lockReleased'
    | 'conflictResolution';

export interface BaseMessage {
    type: MessageType;
    requestId?: string;
    payload?: any;
}

export interface WebViewMessage extends BaseMessage {
    type: MessageType;
    payload: any;
}
