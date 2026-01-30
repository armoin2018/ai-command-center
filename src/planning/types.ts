/**
 * Planning entity interfaces and enums for AI Command Center.
 */

/**
 * Item type values
 */
export enum ItemType {
    Epic = 'epic',
    Story = 'story',
    Task = 'task',
    Bug = 'bug'
}

/**
 * Link type values for item relationships
 */
export enum LinkType {
    Parent = 'parent',
    DependsOn = 'depends-on',
    Blocks = 'blocks',
    RelatesTo = 'relates-to',
    Duplicates = 'duplicates',
    IsBlockedBy = 'is-blocked-by'
}

/**
 * Link interface for item relationships
 */
export interface IItemLink {
    type: LinkType | string;
    targetId: string;
    description?: string;
}

/**
 * Epic status values
 */
export enum EpicStatus {
    Todo = 'todo',
    Ready = 'ready',
    Pending = 'pending',
    InProgress = 'in-progress',
    Review = 'review',
    Done = 'done'
}

/**
 * Story status values
 */
export enum StoryStatus {
    Todo = 'todo',
    Ready = 'ready',
    Pending = 'pending',
    InProgress = 'in-progress',
    Review = 'review',
    Done = 'done'
}

/**
 * Task status values
 */
export enum TaskStatus {
    Todo = 'todo',
    Ready = 'ready',
    Pending = 'pending',
    InProgress = 'in-progress',
    Review = 'review',
    Done = 'done'
}

/**
 * Priority levels
 */
export enum Priority {
    High = 'high',
    Medium = 'medium',
    Low = 'low'
}

/**
 * Comment interface
 */
export interface IComment {
    author: string;
    timestamp: string;
    text: string;
}

/**
 * Epic entity interface
 */
export interface IEpic {
    id: string;              // ARMOIN-001, ARMOIN-002, etc.
    type: ItemType;          // 'epic'
    title: string;           // Epic title
    status: EpicStatus;      // todo, ready, pending, in-progress, review, done
    description: string;     // Long description
    workingDetails?: string; // Additional working details
    estimatedHours?: number; // Estimated hours
    actualHours?: number;    // Actual hours spent
    assignee?: string;       // Person assigned to this epic
    order: number;           // Display order / sequence
    epicId: null;            // Always null for epics
    gitRepoUrl?: string | null;      // Git repository URL (null = inherit)
    gitRepoBranch?: string | null;   // Git branch (null = inherit)
    assignedAgent?: string | null;   // AI agent assigned (null = inherit)
    instructions?: string[];         // Instruction files
    personas?: string[];             // Persona files
    acceptanceCriteria?: string[];   // Acceptance criteria
    comments?: IComment[];           // Comments array
    tags?: string[];                 // Tags for categorization
    links?: IItemLink[];             // Relationships to other items
    priority?: Priority;     // high, medium, low
    createdOn: string;       // ISO 8601 timestamp
    lastUpdatedOn: string;   // ISO 8601 timestamp
    deliverByDate?: string | null;  // ISO 8601 timestamp
    deliveredOn?: string | null;    // ISO 8601 timestamp
    dependencies?: string[]; // Deprecated - use links instead
}

/**
 * Story entity interface
 */
export interface IStory {
    id: string;              // ARMOIN-002, ARMOIN-003, etc.
    type: ItemType;          // 'story'
    title: string;           // Story title
    status: StoryStatus;     // todo, ready, pending, in-progress, review, done
    description: string;     // Long description
    estimatedHours?: number; // Estimated hours
    actualHours?: number;    // Actual hours spent
    assignee?: string;       // Person assigned to this story
    order: number;           // Display order / sequence
    epicId?: string | null;  // Parent epic ID (null for orphan stories)
    gitRepoUrl?: string | null;      // Git repository URL (null = inherit)
    gitRepoBranch?: string | null;   // Git branch (null = inherit)
    assignedAgent?: string | null;   // AI agent assigned (null = inherit)
    instructions?: string[];         // Instruction files
    personas?: string[];             // Persona files
    acceptanceCriteria?: string[];   // Acceptance criteria
    comments?: IComment[];           // Comments array
    tags?: string[];                 // Tags for categorization
    links?: IItemLink[];             // Relationships to other items
    priority?: Priority;     // high, medium, low
    createdOn: string;       // ISO 8601 timestamp
    lastUpdatedOn: string;   // ISO 8601 timestamp
    deliverByDate?: string | null;  // ISO 8601 timestamp
    deliveredOn?: string | null;    // ISO 8601 timestamp
    dependencies?: string[]; // Deprecated - use links instead
}

/**
 * Task entity interface
 */
export interface ITask {
    id: string;              // ARMOIN-003, ARMOIN-004, etc.
    type: ItemType;          // 'task'
    title: string;           // Task title
    status: TaskStatus;      // todo, ready, pending, in-progress, review, done
    description?: string;    // Long description
    assignee?: string;       // Person assigned to this task
    estimatedHours?: number; // Estimated hours
    actualHours?: number;    // Actual hours spent
    order: number;           // Display order / sequence
    epicId?: string | null;  // Parent epic ID (null for orphan tasks)
    gitRepoUrl?: string | null;      // Git repository URL (null = inherit)
    gitRepoBranch?: string | null;   // Git branch (null = inherit)
    assignedAgent?: string | null;   // AI agent assigned (null = inherit)
    instructions?: string[];         // Instruction files
    personas?: string[];             // Persona files
    acceptanceCriteria?: string[];   // Acceptance criteria
    comments?: IComment[];           // Comments array
    tags?: string[];                 // Tags for categorization
    links?: IItemLink[];             // Relationships to other items
    priority?: Priority;     // high, medium, low
    createdOn: string;       // ISO 8601 timestamp
    lastUpdatedOn: string;   // ISO 8601 timestamp
    deliverByDate?: string | null;  // ISO 8601 timestamp
    deliveredOn?: string | null;    // ISO 8601 timestamp
    dependencies?: string[]; // Deprecated - use links instead
}

/**
 * Bug entity interface
 */
export interface IBug {
    id: string;              // ARMOIN-007, etc.
    type: ItemType;          // 'bug'
    title: string;           // Bug title
    status: TaskStatus;      // Uses same status as tasks
    description: string;     // Bug description with repro steps
    assignee?: string;       // Person assigned to fix this bug
    order: number;           // Display order / sequence
    epicId?: string | null;  // Parent epic ID (null for orphan bugs)
    gitRepoUrl?: string | null;      // Git repository URL (null = inherit)
    gitRepoBranch?: string | null;   // Git branch (null = inherit)
    assignedAgent?: string | null;   // AI agent assigned (null = inherit)
    instructions?: string[];         // Instruction files
    personas?: string[];             // Persona files
    acceptanceCriteria?: string[];   // Acceptance criteria (fix verification)
    comments?: IComment[];           // Comments array
    tags?: string[];                 // Tags for categorization (severity, etc.)
    links?: IItemLink[];             // Relationships to other items
    priority?: Priority;     // high, medium, low (severity)
    estimatedHours?: number; // Estimated fix time
    actualHours?: number;    // Actual fix time
    createdOn: string;       // ISO 8601 timestamp
    lastUpdatedOn: string;   // ISO 8601 timestamp
    deliverByDate?: string | null;  // ISO 8601 timestamp
    deliveredOn?: string | null;    // ISO 8601 timestamp
    dependencies?: string[]; // Deprecated - use links instead
}

/**
 * Generic planning item (union type)
 */
export type PlanningItem = IEpic | IStory | ITask | IBug;

/**
 * Plan metadata interface
 */
export interface IPlanMetadata {
    projectName: string;
    projectId: string;
    version: string;
    schemaVersion: string;
    createdAt: string;
    updatedAt: string;
    gitRepoUrl?: string;
    gitRepoBranch?: string;
    assignedAgent?: string;
    instructions?: string[];
    personas?: string[];
}

/**
 * Complete plan data structure from .project/PLAN.json
 */
export interface IPlanData {
    metadata: IPlanMetadata;
    items: PlanningItem[];
}
