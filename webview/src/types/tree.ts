/**
 * Tree Data Types
 * 
 * Type definitions for the planning tree structure
 */

export type ItemStatus = 'todo' | 'ready' | 'pending' | 'in-progress' | 'review' | 'done';
export type ItemType = 'epic' | 'story' | 'task' | 'bug';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type LinkType = 'parent' | 'depends-on' | 'blocks' | 'relates-to' | 'duplicates' | 'is-blocked-by';

export interface Comment {
    author: string;
    timestamp: string;
    text: string;
}

export interface ItemLink {
    type: LinkType;
    targetId: string;
    description?: string;
}

export interface TreeNodeData {
    id: string;
    type: ItemType;
    title: string;
    status: ItemStatus;
    description?: string;
    workingDetails?: string;
    estimatedHours?: number;
    actualHours?: number;
    assignee?: string;
    order: number;
    epicId?: string | null;
    gitRepoUrl?: string | null;
    gitRepoBranch?: string | null;
    assignedAgent?: string | null;
    instructions?: string[];
    personas?: string[];
    acceptanceCriteria?: string[];
    comments?: Comment[];
    tags?: string[];
    links?: ItemLink[];
    priority?: Priority;
    createdOn: string;
    lastUpdatedOn: string;
    deliverByDate?: string | null;
    deliveredOn?: string | null;
    children?: TreeNodeData[];
}
