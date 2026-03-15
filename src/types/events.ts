/**
 * Event Bus Type Definitions
 *
 * Defines all event channel types, payload interfaces, and the channel map
 * for the AI Command Center reactive event system.
 *
 * Part of AICC-0106: Reactive Event Bus
 *   - AICC-0294: Define all event channel types
 *   - AICC-0295: Planning event definitions
 *   - AICC-0296: MCP event definitions
 *   - AICC-0297: Skill event definitions
 *   - AICC-0298: Integration event definitions
 *   - AICC-0299: File watcher event definitions
 *   - AICC-0300: System / RealTimeUpdateSystem event definitions
 */

// ─── Base Event ──────────────────────────────────────────────────────

/**
 * Base interface shared by every event payload.
 * All concrete event types extend this.
 */
export interface BaseEvent {
    /** Unix epoch milliseconds when the event was produced */
    timestamp: number;
    /** Component or subsystem that emitted the event */
    source?: string;
}

// ─── Planning Events ─────────────────────────────────────────────────
// Channels: planning.epic.*, planning.story.*, planning.task.*, planning.sync.*

/**
 * Emitted when a planning item (epic, story, task, bug) is
 * created, updated, or deleted.
 */
export interface PlanningItemEvent extends BaseEvent {
    /** Unique item ID (e.g. "AICC-0001") */
    itemId: string;
    /** Type of the planning item */
    itemType: 'epic' | 'story' | 'task' | 'bug';
    /** CRUD action performed */
    action: 'created' | 'updated' | 'deleted';
    /** Snapshot of the item before the change (updates/deletes) */
    before?: Record<string, unknown>;
    /** Snapshot of the item after the change (creates/updates) */
    after?: Record<string, unknown>;
}

/**
 * Emitted when a planning item's status field changes.
 */
export interface PlanningStatusChangeEvent extends BaseEvent {
    itemId: string;
    itemType: 'epic' | 'story' | 'task' | 'bug';
    previousStatus: string;
    newStatus: string;
}

/**
 * Emitted when a planning sync operation completes.
 */
export interface PlanningSyncEvent extends BaseEvent {
    direction: 'push' | 'pull' | 'bidirectional';
    itemCount: number;
    duration: number;
    success: boolean;
    errors?: string[];
}

// ─── MCP Events ──────────────────────────────────────────────────────
// Channels: mcp.tool.*, mcp.resource.*, mcp.connection.*

/**
 * Emitted when an MCP tool is invoked through the bridge.
 */
export interface McpToolCallEvent extends BaseEvent {
    toolName: string;
    args: Record<string, unknown>;
    result?: unknown;
    duration: number;
    success: boolean;
    error?: string;
}

/**
 * Emitted when an MCP resource is accessed.
 */
export interface McpResourceAccessEvent extends BaseEvent {
    resourceUri: string;
    operation: 'read' | 'list';
    success: boolean;
    error?: string;
}

/**
 * Emitted when an MCP server connection status changes.
 */
export interface McpConnectionEvent extends BaseEvent {
    serverId: string;
    status: 'connected' | 'disconnected' | 'error';
    error?: string;
}

// ─── Skill Events ────────────────────────────────────────────────────
// Channels: skill.execution.*, skill.health.*, skill.registered

/**
 * Emitted when a skill execution starts.
 */
export interface SkillExecutionStartEvent extends BaseEvent {
    skillId: string;
    input?: Record<string, unknown>;
}

/**
 * Emitted when a skill execution completes (success or failure).
 */
export interface SkillExecutionCompleteEvent extends BaseEvent {
    skillId: string;
    input?: Record<string, unknown>;
    output?: unknown;
    duration: number;
    success: boolean;
    error?: string;
}

/**
 * Emitted when a skill execution fails with an unrecoverable error.
 */
export interface SkillExecutionErrorEvent extends BaseEvent {
    skillId: string;
    error: string;
    stack?: string;
}

/**
 * Emitted after a skill health check completes.
 */
export interface SkillHealthEvent extends BaseEvent {
    skillId: string;
    healthy: boolean;
    details?: Record<string, unknown>;
}

/**
 * Emitted when a skill is registered or unregistered.
 */
export interface SkillRegistrationEvent extends BaseEvent {
    skillId: string;
    name: string;
    version?: string;
    action: 'registered' | 'unregistered';
}

// ─── Integration Events ──────────────────────────────────────────────
// Channels: integration.sync.*, integration.config.*, integration.connection.*

/**
 * Emitted when an integration sync operation starts.
 */
export interface IntegrationSyncStartEvent extends BaseEvent {
    provider: string;
    direction: 'push' | 'pull' | 'bidirectional';
}

/**
 * Emitted when an integration sync operation completes.
 */
export interface IntegrationSyncCompleteEvent extends BaseEvent {
    provider: string;
    direction: 'push' | 'pull' | 'bidirectional';
    itemCount: number;
    duration: number;
    success: boolean;
    errors?: string[];
}

/**
 * Emitted when an integration sync encounters an error.
 */
export interface IntegrationSyncErrorEvent extends BaseEvent {
    provider: string;
    error: string;
    details?: Record<string, unknown>;
}

/**
 * Emitted when an integration configuration setting changes.
 */
export interface IntegrationConfigChangeEvent extends BaseEvent {
    provider: string;
    setting: string;
    previousValue?: unknown;
    newValue?: unknown;
}

/**
 * Emitted when an integration connection status changes.
 */
export interface IntegrationConnectionEvent extends BaseEvent {
    provider: string;
    status: 'connected' | 'disconnected' | 'error' | 'authenticating';
    error?: string;
}

// ─── File Events ─────────────────────────────────────────────────────
// Channels: file.plan.*

/**
 * Emitted when a plan file is created, modified, or deleted on disk.
 */
export interface FileChangeEvent extends BaseEvent {
    filePath: string;
    changeType: 'created' | 'modified' | 'deleted';
    /** Optional file type indicator (e.g. "plan", "config") */
    fileType?: string;
}

// ─── System Events ───────────────────────────────────────────────────
// Channels: system.*

/**
 * Emitted when the extension activates.
 */
export interface SystemActivationEvent extends BaseEvent {
    version: string;
    /** Activation duration in milliseconds */
    activationTime: number;
}

/**
 * Emitted when the extension deactivates.
 */
export interface SystemDeactivationEvent extends BaseEvent {
    reason?: string;
    /** Total uptime in milliseconds */
    uptime: number;
}

/**
 * Emitted when a system-level error occurs.
 */
export interface SystemErrorEvent extends BaseEvent {
    error: string;
    component?: string;
    stack?: string;
    severity: 'warning' | 'error' | 'fatal';
}

/**
 * Emitted when a system configuration setting changes.
 */
export interface SystemConfigChangeEvent extends BaseEvent {
    section: string;
    setting: string;
    previousValue?: unknown;
    newValue?: unknown;
}

// ─── Event Envelope ──────────────────────────────────────────────────

/**
 * Wrapper that the EventBus adds around every emitted event,
 * providing routing and tracing metadata.
 */
export interface EventEnvelope<T = unknown> {
    /** Unique event identifier (e.g. "evt-42") */
    id: string;
    /** Channel the event was emitted on */
    channel: string;
    /** Unix epoch milliseconds of emission */
    timestamp: number;
    /** The event payload */
    data: T;
}

// ─── Metrics ─────────────────────────────────────────────────────────

/**
 * Runtime metrics for a single event channel.
 */
export interface ChannelMetrics {
    channel: string;
    emitCount: number;
    subscriberCount: number;
    /** Cumulative handler execution time in ms */
    totalHandlerDuration: number;
    /** Average handler execution time per emit in ms */
    averageHandlerDuration: number;
    /** Unix epoch ms of the most recent emit, if any */
    lastEmitTimestamp?: number;
    /** Total number of handler errors caught */
    errorCount: number;
}

/**
 * Aggregate runtime metrics across all event channels.
 */
export interface EventBusMetrics {
    totalChannels: number;
    totalSubscribers: number;
    totalEmits: number;
    channels: Record<string, ChannelMetrics>;
    /** Uptime in milliseconds since EventBus creation */
    uptime: number;
}

// ─── Channel → Payload Type Map ──────────────────────────────────────

/**
 * Maps every known channel name to its expected event payload type.
 * Used by the EventBus for compile-time type inference on
 * {@link EventBus.subscribe} and {@link EventBus.emit}.
 *
 * 33 channels across 6 categories.
 */
export interface EventChannelMap {
    // ── Planning — Epic (4) ──────────────────────────────────────
    'planning.epic.created': PlanningItemEvent;
    'planning.epic.updated': PlanningItemEvent;
    'planning.epic.deleted': PlanningItemEvent;
    'planning.epic.statusChanged': PlanningStatusChangeEvent;

    // ── Planning — Story (4) ─────────────────────────────────────
    'planning.story.created': PlanningItemEvent;
    'planning.story.updated': PlanningItemEvent;
    'planning.story.deleted': PlanningItemEvent;
    'planning.story.statusChanged': PlanningStatusChangeEvent;

    // ── Planning — Task (4) ──────────────────────────────────────
    'planning.task.created': PlanningItemEvent;
    'planning.task.updated': PlanningItemEvent;
    'planning.task.deleted': PlanningItemEvent;
    'planning.task.statusChanged': PlanningStatusChangeEvent;

    // ── Planning — Sync (1) ──────────────────────────────────────
    'planning.sync.completed': PlanningSyncEvent;

    // ── MCP (3) ──────────────────────────────────────────────────
    'mcp.tool.called': McpToolCallEvent;
    'mcp.resource.accessed': McpResourceAccessEvent;
    'mcp.connection.changed': McpConnectionEvent;

    // ── Skill (5) ────────────────────────────────────────────────
    'skill.execution.started': SkillExecutionStartEvent;
    'skill.execution.completed': SkillExecutionCompleteEvent;
    'skill.execution.error': SkillExecutionErrorEvent;
    'skill.health.checked': SkillHealthEvent;
    'skill.registered': SkillRegistrationEvent;

    // ── Integration (5) ──────────────────────────────────────────
    'integration.sync.started': IntegrationSyncStartEvent;
    'integration.sync.completed': IntegrationSyncCompleteEvent;
    'integration.sync.error': IntegrationSyncErrorEvent;
    'integration.config.changed': IntegrationConfigChangeEvent;
    'integration.connection.changed': IntegrationConnectionEvent;

    // ── File (3) ─────────────────────────────────────────────────
    'file.plan.created': FileChangeEvent;
    'file.plan.modified': FileChangeEvent;
    'file.plan.deleted': FileChangeEvent;

    // ── System (4) ───────────────────────────────────────────────
    'system.activated': SystemActivationEvent;
    'system.deactivated': SystemDeactivationEvent;
    'system.error': SystemErrorEvent;
    'system.config.changed': SystemConfigChangeEvent;
}

// ─── Channel Name Constants ──────────────────────────────────────────

/**
 * Namespace-style constants for every known event channel.
 * Use these instead of raw strings to prevent typos and enable
 * IDE auto-completion.
 *
 * @example
 * ```ts
 * import { EventChannels } from '../types/events';
 * eventBus.subscribe(EventChannels.Planning.Epic.Created, handler);
 * ```
 */
export const EventChannels = {
    Planning: {
        Epic: {
            Created: 'planning.epic.created' as const,
            Updated: 'planning.epic.updated' as const,
            Deleted: 'planning.epic.deleted' as const,
            StatusChanged: 'planning.epic.statusChanged' as const,
        },
        Story: {
            Created: 'planning.story.created' as const,
            Updated: 'planning.story.updated' as const,
            Deleted: 'planning.story.deleted' as const,
            StatusChanged: 'planning.story.statusChanged' as const,
        },
        Task: {
            Created: 'planning.task.created' as const,
            Updated: 'planning.task.updated' as const,
            Deleted: 'planning.task.deleted' as const,
            StatusChanged: 'planning.task.statusChanged' as const,
        },
        Sync: {
            Completed: 'planning.sync.completed' as const,
        },
    },
    Mcp: {
        Tool: {
            Called: 'mcp.tool.called' as const,
        },
        Resource: {
            Accessed: 'mcp.resource.accessed' as const,
        },
        Connection: {
            Changed: 'mcp.connection.changed' as const,
        },
    },
    Skill: {
        Execution: {
            Started: 'skill.execution.started' as const,
            Completed: 'skill.execution.completed' as const,
            Error: 'skill.execution.error' as const,
        },
        Health: {
            Checked: 'skill.health.checked' as const,
        },
        Registered: 'skill.registered' as const,
    },
    Integration: {
        Sync: {
            Started: 'integration.sync.started' as const,
            Completed: 'integration.sync.completed' as const,
            Error: 'integration.sync.error' as const,
        },
        Config: {
            Changed: 'integration.config.changed' as const,
        },
        Connection: {
            Changed: 'integration.connection.changed' as const,
        },
    },
    File: {
        Plan: {
            Created: 'file.plan.created' as const,
            Modified: 'file.plan.modified' as const,
            Deleted: 'file.plan.deleted' as const,
        },
    },
    System: {
        Activated: 'system.activated' as const,
        Deactivated: 'system.deactivated' as const,
        Error: 'system.error' as const,
        Config: {
            Changed: 'system.config.changed' as const,
        },
    },
} as const;

/**
 * Union of all known channel name strings.
 * Derived from {@link EventChannelMap} keys.
 */
export type EventChannelName = keyof EventChannelMap;
