/**
 * PLAN.json Types
 * TypeScript interfaces for the consolidated planning data
 */

// Main PLAN.json structure
export interface PlanDocument {
  version: '1.0.0';
  generatedAt: string;
  source: string;
  metadata: PlanMetadata;
  statusCounts: StatusCounts;
  items: PlanItem[];
}

export interface PlanMetadata {
  projectName?: string;
  projectCode?: string; // e.g., "AICC", "ARMOIN" - used for display IDs like AICC-0001
  currentSprint?: string;
  currentMilestone?: string;
  defaultAssignee?: string;
  defaultAgent?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface StatusCounts {
  BACKLOG: number;
  READY: number;
  'IN-PROGRESS': number;
  BLOCKED: number;
  REVIEW: number;
  DONE: number;
  SKIP: number;
}

// Item Types
export type PlanItemType = 'epic' | 'story' | 'task' | 'bug';

export type PlanItemStatus = 
  | 'BACKLOG' 
  | 'READY' 
  | 'IN-PROGRESS' 
  | 'BLOCKED' 
  | 'REVIEW' 
  | 'DONE'
  | 'SKIP';

export type PlanItemPriority = 'critical' | 'high' | 'medium' | 'low';

export type AgentType = 
  | 'Architect' 
  | 'Orchestrator' 
  | 'Developer' 
  | 'Reviewer' 
  | 'Tester' 
  | 'Any';

// Plan Item
export interface PlanItem {
  // Core Identity
  id: string; // Pattern: EPIC-001, STORY-001-001, TASK-001-001-001, BUG-001-001-001
  type: PlanItemType;
  
  // Content
  summary: string;
  description?: string;
  
  // Status & Priority
  status: PlanItemStatus;
  priority?: PlanItemPriority;
  storyPoints?: number;
  
  // Assignment
  assignee?: string | null;
  agent?: string | null;
  
  // Time Tracking
  estimatedHours?: number;
  actualHours?: number;
  
  // AI Resources
  instructions?: string[];
  personas?: string[];
  
  // Hierarchy & Ordering
  parentId?: string;
  children?: string[];
  order?: number;
  
  // Relationships
  linkedRelationships?: LinkedRelationship[];
  
  // Git Integration
  gitRepoUrl?: string;
  gitRepoBranch?: string;
  
  // Planning
  sprint?: string;
  milestone?: string;
  tags?: string[];
  
  // Context & Resources
  contexts?: string[];
  links?: string[];
  variables?: Record<string, any>;
  
  // Acceptance Criteria
  acceptanceCriteria?: string;
  
  // Comments
  comments?: Comment[];
  
  // Metadata
  metadata?: ItemMetadata;
}

export interface LinkedRelationship {
  type: 'blocks' | 'blocked-by' | 'relates-to' | 'duplicates' | 'depends-on';
  itemId: string;
}

export interface Comment {
  createdOn: string;
  createdBy: string;
  comment: string;
}

export interface ItemMetadata {
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  archived?: boolean;
  phase?: string;
  [key: string]: unknown;
}

// Hierarchical View (for accordion list)
export interface PlanHierarchy {
  epics: EpicNode[];
}

export interface EpicNode extends PlanItem {
  type: 'epic';
  stories: StoryNode[];
}

export interface StoryNode extends PlanItem {
  type: 'story';
  tasks: TaskNode[];
  bugs: BugNode[];
}

export interface TaskNode extends PlanItem {
  type: 'task';
}

export interface BugNode extends PlanItem {
  type: 'bug';
}

// Filter Options
export interface PlanFilter {
  status?: PlanItemStatus[];
  type?: PlanItemType[];
  assignee?: string;
  agent?: AgentType;
  sprint?: string;
  labels?: string[];
  searchQuery?: string;
  showArchived?: boolean;
}

// Sort Options
export interface PlanSort {
  field: 'order' | 'status' | 'updatedAt' | 'id' | 'priority';
  direction: 'asc' | 'desc';
}

// API Response Types
export interface PlanApiResponse {
  success: boolean;
  data?: PlanDocument | PlanItem | PlanItem[];
  error?: string;
  message?: string;
}

export interface StatusCountsResponse {
  success: boolean;
  data?: StatusCounts;
  error?: string;
}

export interface ItemResponse {
  success: boolean;
  data?: PlanItem;
  error?: string;
}

export interface ItemsResponse {
  success: boolean;
  data?: PlanItem[];
  total?: number;
  page?: number;
  pageSize?: number;
  error?: string;
}
