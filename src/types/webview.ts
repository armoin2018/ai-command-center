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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic message payload; narrow at handler sites
    payload?: any;
}

export interface WebViewMessage extends BaseMessage {
    type: MessageType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic message payload; narrow at handler sites
    payload: any;
}
