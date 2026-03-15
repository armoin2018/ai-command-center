/**
 * PLAN.json v2 Schema Types
 * AICC-0275: Evolved plan schema with extended item fields,
 * project-level settings, and explicit schema versioning.
 */

import {
  PlanMetadata,
  PlanItem,
  PlanItemType,
  PlanItemStatus,
  PlanItemPriority,
  StatusCounts,
  LinkedRelationship,
  Comment,
  ItemMetadata,
  AgentType,
} from './plan';

// Re-export shared types unchanged in v2
export {
  PlanItemType,
  PlanItemStatus,
  PlanItemPriority,
  StatusCounts,
  LinkedRelationship,
  Comment,
  ItemMetadata,
  AgentType,
};

// ---------------------------------------------------------------------------
// Document-level types
// ---------------------------------------------------------------------------

/** Root document for PLAN.json v2 */
export interface PlanDocumentV2 {
  $schema: 'plan.v2.schema.json';
  version: '2.0.0';
  generatedAt: string;
  source: string;
  metadata: PlanMetadataV2;
  statusCounts: StatusCounts;
  settings: PlanSettings;
  items: PlanItemV2[];
}

/** Extended metadata with migration provenance */
export interface PlanMetadataV2 extends PlanMetadata {
  schemaVersion: '2.0.0';
  migratedFrom?: '1.0.0';
  migratedAt?: string;
  totalSprints?: number;
  currentVelocity?: number;
}

/** Project-level configuration surfaced inside the plan document */
export interface PlanSettings {
  /** Sprint duration in days (default 14) */
  sprintDuration: number;
  /** Number of sprints used for velocity averaging (default 3) */
  velocityWindow: number;
  /** Whether completed items are automatically archived (default true) */
  autoArchive: boolean;
  /** Days after completion before archiving (default 30) */
  archiveAfterDays: number;
  /** Whether to emit VS Code notifications on status changes (default true) */
  enableNotifications: boolean;
}

// ---------------------------------------------------------------------------
// Item-level types
// ---------------------------------------------------------------------------

/** T-shirt effort sizing */
export type EffortSize = 'xs' | 's' | 'm' | 'l' | 'xl';

/** Plan item with additional v2 fields */
export interface PlanItemV2 extends PlanItem {
  /** ISO-8601 creation timestamp (promoted from metadata) */
  createdAt?: string;
  /** ISO-8601 last-update timestamp (promoted from metadata) */
  updatedAt?: string;
  /** ISO-8601 timestamp when the item moved to DONE */
  completedAt?: string;
  /** Human-readable reason when status is BLOCKED */
  blockedReason?: string;
  /** Assigned reviewers for this item */
  reviewers?: string[];
  /** Categorization labels (aliases tags) */
  labels?: string[];
  /** T-shirt effort sizing */
  effort?: EffortSize;
  /** Simplified dependency list (item IDs this item depends on) */
  dependencies?: string[];
}

// ---------------------------------------------------------------------------
// Default settings factory
// ---------------------------------------------------------------------------

/** Returns a PlanSettings object populated with default values */
export function defaultPlanSettings(): PlanSettings {
  return {
    sprintDuration: 14,
    velocityWindow: 3,
    autoArchive: true,
    archiveAfterDays: 30,
    enableNotifications: true,
  };
}
