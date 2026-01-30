// src/planning/evolutionTracker.ts
import { Logger } from '../logger';
import { WorkspaceManager } from './workspaceManager';
import * as path from 'path';

/**
 * Evolution event types
 */
export type EvolutionEventType = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'status_changed'
  | 'priority_changed'
  | 'assigned'
  | 'moved';

/**
 * Evolution event interface
 */
export interface EvolutionEvent {
  id: string;
  timestamp: Date;
  itemType: 'epic' | 'story' | 'task';
  itemId: string;
  eventType: EvolutionEventType;
  userId?: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}

/**
 * Item history interface
 */
export interface ItemHistory {
  itemId: string;
  itemType: 'epic' | 'story' | 'task';
  events: EvolutionEvent[];
  createdAt: Date;
  lastModified: Date;
  totalChanges: number;
}

/**
 * Evolution Tracker
 * 
 * Tracks changes to planning items over time with complete audit trail
 */
export class EvolutionTracker {
  private historyPath: string;
  private logger: Logger;
  private workspaceManager: WorkspaceManager;
  private eventBuffer: EvolutionEvent[] = [];
  private bufferFlushInterval: ReturnType<typeof setInterval> | null = null;
  private flushInterval: number;

  constructor(
    workspaceManager: WorkspaceManager,
    logger: Logger,
    options: {
      historyPath?: string;
      flushIntervalMs?: number;
    } = {}
  ) {
    this.workspaceManager = workspaceManager;
    this.logger = logger;
    this.historyPath = options.historyPath || '.project/history';
    this.flushInterval = options.flushIntervalMs || 5000;

    this.logger.info('Evolution Tracker created', {
      component: 'EvolutionTracker',
      historyPath: this.historyPath
    });
  }

  /**
   * Initialize the tracker - must be called before use
   */
  async initialize(): Promise<void> {
    try {
      // Ensure history directory exists
      await this.workspaceManager.ensureDirectory(this.historyPath);
      
      // Start auto-flush timer
      this.bufferFlushInterval = setInterval(() => {
        this.flushEventBuffer();
      }, this.flushInterval);

      

      this.logger.info('Evolution Tracker initialized', {
        component: 'EvolutionTracker',
        historyPath: this.historyPath,
        flushInterval: this.flushInterval
      });
    } catch (error) {
      this.logger.error('Failed to initialize Evolution Tracker', {
        component: 'EvolutionTracker',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Track an evolution event
   */
  async trackEvent(event: Omit<EvolutionEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: EvolutionEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    this.eventBuffer.push(fullEvent);

    this.logger.debug('Evolution event tracked', {
      component: 'EvolutionTracker',
      itemType: event.itemType,
      itemId: event.itemId,
      eventType: event.eventType
    });

    // Flush if buffer is large
    if (this.eventBuffer.length >= 50) {
      await this.flushEventBuffer();
    }
  }

  /**
   * Track item creation
   */
  async trackCreated(
    itemType: 'epic' | 'story' | 'task',
    itemId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    await this.trackEvent({
      itemType,
      itemId,
      eventType: 'created',
      userId,
      changes: [{
        field: '__item__',
        oldValue: null,
        newValue: data
      }],
      metadata: { source: 'creation' }
    });
  }

  /**
   * Track item update
   */
  async trackUpdated(
    itemType: 'epic' | 'story' | 'task',
    itemId: string,
    oldData: any,
    newData: any,
    userId?: string
  ): Promise<void> {
    const changes = this.detectChanges(oldData, newData);
    
    if (changes.length === 0) {
      return; // No actual changes
    }

    await this.trackEvent({
      itemType,
      itemId,
      eventType: 'updated',
      userId,
      changes,
      metadata: { changeCount: changes.length }
    });
  }

  /**
   * Track item deletion
   */
  async trackDeleted(
    itemType: 'epic' | 'story' | 'task',
    itemId: string,
    data: any,
    userId?: string
  ): Promise<void> {
    await this.trackEvent({
      itemType,
      itemId,
      eventType: 'deleted',
      userId,
      changes: [{
        field: '__item__',
        oldValue: data,
        newValue: null
      }],
      metadata: { source: 'deletion' }
    });
  }

  /**
   * Get history for a specific item
   */
  async getItemHistory(itemId: string): Promise<ItemHistory | null> {
    try {
      const historyFile = path.join(this.historyPath, `${itemId}.json`);
      const content = await this.workspaceManager.readFile(historyFile);
      const history = JSON.parse(content) as ItemHistory;

      // Parse dates
      history.createdAt = new Date(history.createdAt);
      history.lastModified = new Date(history.lastModified);
      history.events.forEach(event => {
        event.timestamp = new Date(event.timestamp);
      });

      return history;
    } catch (error) {
      // Check for file not found errors (UserError from WorkspaceManager or ENOENT from fs)
      const isFileNotFound = 
        (error as any)?.message?.includes('File not found') ||
        (error as any)?.code === 'ENOENT';
      
      if (isFileNotFound) {
        return null;
      }
      
      this.logger.error('Failed to read item history', {
        component: 'EvolutionTracker',
        itemId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all events for an item
   */
  async getItemEvents(itemId: string): Promise<EvolutionEvent[]> {
    const history = await this.getItemHistory(itemId);
    return history?.events || [];
  }

  /**
   * Get events by type
   */
  async getEventsByType(_eventType: EvolutionEventType): Promise<EvolutionEvent[]> {
    // This would need to scan all history files
    // For now, return empty array (full implementation would index events)
    this.logger.warn('getEventsByType not fully implemented', {
      component: 'EvolutionTracker'
    });
    return [];
  }

  /**
   * Get statistics for an item
   */
  async getItemStatistics(itemId: string): Promise<{
    totalEvents: number;
    eventsByType: Record<EvolutionEventType, number>;
    firstEvent: Date | null;
    lastEvent: Date | null;
    contributors: string[];
  } | null> {
    const history = await this.getItemHistory(itemId);
    if (!history) {
      return null;
    }

    const eventsByType: Record<EvolutionEventType, number> = {
      created: 0,
      updated: 0,
      deleted: 0,
      status_changed: 0,
      priority_changed: 0,
      assigned: 0,
      moved: 0
    };

    const contributors = new Set<string>();

    history.events.forEach(event => {
      eventsByType[event.eventType]++;
      if (event.userId) {
        contributors.add(event.userId);
      }
    });

    return {
      totalEvents: history.events.length,
      eventsByType,
      firstEvent: history.events.length > 0 ? history.events[0].timestamp : null,
      lastEvent: history.events.length > 0 ? history.events[history.events.length - 1].timestamp : null,
      contributors: Array.from(contributors)
    };
  }

  /**
   * Flush event buffer to disk
   */
  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Group events by item
      const eventsByItem = new Map<string, EvolutionEvent[]>();
      
      eventsToFlush.forEach(event => {
        const existing = eventsByItem.get(event.itemId) || [];
        existing.push(event);
        eventsByItem.set(event.itemId, existing);
      });

      // Write each item's history
      for (const [itemId, events] of eventsByItem) {
        await this.appendEventsToHistory(itemId, events);
      }

      this.logger.debug('Event buffer flushed', {
        component: 'EvolutionTracker',
        eventCount: eventsToFlush.length,
        itemCount: eventsByItem.size
      });
    } catch (error) {
      this.logger.error('Failed to flush event buffer', {
        component: 'EvolutionTracker',
        error: error instanceof Error ? error.message : String(error)
      });

      // Put events back in buffer
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Append events to item history
   */
  private async appendEventsToHistory(itemId: string, events: EvolutionEvent[]): Promise<void> {
    const historyFile = path.join(this.historyPath, `${itemId}.json`);
    
    let history = await this.getItemHistory(itemId);
    
    if (!history) {
      // Create new history
      history = {
        itemId,
        itemType: events[0].itemType,
        events: [],
        createdAt: events[0].timestamp,
        lastModified: events[0].timestamp,
        totalChanges: 0
      };
    }

    // Append events
    history.events.push(...events);
    history.lastModified = events[events.length - 1].timestamp;
    history.totalChanges = history.events.length;

    // Write to file
    await this.workspaceManager.writeFile(
      historyFile,
      JSON.stringify(history, null, 2)
    );
  }

  /**
   * Detect changes between old and new data
   */
  private detectChanges(oldData: any, newData: any): Array<{field: string; oldValue: any; newValue: any}> {
    const changes: Array<{field: string; oldValue: any; newValue: any}> = [];

    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach(key => {
      if (oldData[key] !== newData[key]) {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: newData[key]
        });
      }
    });

    return changes;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup and stop tracking
   */
  async dispose(): Promise<void> {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
      this.bufferFlushInterval = null;
    }

    // Flush any remaining events
    try {
      await this.flushEventBuffer();
    } catch (error) {
      this.logger.error('Failed to flush events on dispose', {
        component: 'EvolutionTracker',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    

    this.logger.info('Evolution Tracker disposed', {
      component: 'EvolutionTracker'
    });
  }
}
