/**
 * Reactive Event Bus Service
 *
 * Centralized, typed publish/subscribe event bus for loose coupling
 * between AI Command Center subsystems. Supports typed channels,
 * wildcard subscriptions, event history / replay, and per-channel metrics.
 *
 * Part of AICC-0106: Reactive Event Bus
 *   - AICC-0293: Create EventBus singleton
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import type {
    EventChannelMap,
    EventEnvelope,
    ChannelMetrics,
    EventBusMetrics,
} from '../types/events';

// ─── Configuration ───────────────────────────────────────────────────

/**
 * Options applied when the EventBus singleton is first created.
 */
export interface EventBusOptions {
    /** Maximum events retained per channel (default: 50) */
    maxHistoryPerChannel?: number;
    /** Enable per-channel metrics collection (default: true) */
    enableMetrics?: boolean;
    /** Log every emitted event at debug level (default: false) */
    logEvents?: boolean;
}

// ─── Internal Types ──────────────────────────────────────────────────

/** Internal representation of a registered handler. */
interface HandlerEntry {
    /** Monotonic ID for deterministic ordering */
    id: number;
    /** The callback */
    handler: (event: any) => void | Promise<void>;
    /** Auto-unsubscribe after first invocation */
    once: boolean;
    /** Guards against double-fire across concurrent emits */
    consumed: boolean;
}

// ─── EventBus ────────────────────────────────────────────────────────

/**
 * Singleton publish/subscribe event bus with typed channels.
 *
 * Features:
 * - Compile-time channel ↔ payload inference via {@link EventChannelMap}
 * - Wildcard subscriptions (`"planning.*"`, `"*"`)
 * - Sliding-window event history with replay
 * - Per-channel metrics (emit count, avg handler duration, error count)
 *
 * @example
 * ```ts
 * import { EventBus } from '../services/eventBus';
 * import { EventChannels } from '../types/events';
 *
 * const bus = EventBus.getInstance();
 *
 * // Type-safe subscription
 * const sub = bus.subscribe(EventChannels.Planning.Epic.Created, (evt) => {
 *     console.log('Epic created:', evt.itemId);
 * });
 *
 * // Wildcard — all planning events
 * const all = bus.subscribe('planning.*', (evt) => {
 *     console.log('Planning event:', evt);
 * });
 *
 * // Emit
 * await bus.emit(EventChannels.Planning.Epic.Created, {
 *     timestamp: Date.now(),
 *     itemId: 'AICC-0001',
 *     itemType: 'epic',
 *     action: 'created',
 *     after: { title: 'New Epic' },
 * });
 *
 * // Cleanup
 * sub.dispose();
 * all.dispose();
 * ```
 */
export class EventBus {
    // ── Singleton ────────────────────────────────────────────────
    private static instance: EventBus | undefined;

    // ── State ────────────────────────────────────────────────────
    private readonly logger: Logger;

    /** Exact-match channel → handler set */
    private readonly handlers = new Map<string, Set<HandlerEntry>>();
    /** Wildcard pattern → handler set */
    private readonly wildcardHandlers = new Map<string, Set<HandlerEntry>>();
    /** Per-channel sliding-window event history */
    private readonly history = new Map<string, EventEnvelope[]>();
    /** Per-channel runtime metrics */
    private readonly channelMetrics = new Map<string, ChannelMetrics>();

    private readonly maxHistoryPerChannel: number;
    private readonly enableMetrics: boolean;
    private readonly logEvents: boolean;
    private readonly startTime: number;

    private nextHandlerId = 0;
    private nextEventId = 0;
    private disposed = false;

    // ── Constructor ──────────────────────────────────────────────

    private constructor(options?: EventBusOptions) {
        this.logger = Logger.getInstance();
        this.maxHistoryPerChannel = options?.maxHistoryPerChannel ?? 50;
        this.enableMetrics = options?.enableMetrics ?? true;
        this.logEvents = options?.logEvents ?? false;
        this.startTime = Date.now();
    }

    // ── Singleton Access ─────────────────────────────────────────

    /**
     * Retrieve (or create) the singleton EventBus instance.
     *
     * @param options - Configuration applied **only** on first creation.
     */
    public static getInstance(options?: EventBusOptions): EventBus {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus(options);
        }
        return EventBus.instance;
    }

    /**
     * Destroy the current singleton (calls {@link dispose}) and allow
     * a fresh instance to be created on the next {@link getInstance} call.
     * Primarily useful in tests.
     */
    public static resetInstance(): void {
        if (EventBus.instance) {
            EventBus.instance.dispose();
            EventBus.instance = undefined;
        }
    }

    // ── Subscribe ────────────────────────────────────────────────

    /**
     * Subscribe to events on a channel.
     *
     * Returns a {@link vscode.Disposable} that removes the subscription
     * when disposed.
     *
     * Supports wildcard patterns:
     * - `"planning.*"` — matches any channel starting with `planning.`
     * - `"*"` — matches every channel
     *
     * @param channel - Exact channel name or wildcard pattern.
     * @param handler - Callback invoked for each matching event.
     */
    public subscribe<K extends keyof EventChannelMap>(
        channel: K,
        handler: (event: EventChannelMap[K]) => void | Promise<void>,
    ): vscode.Disposable;
    public subscribe<T = unknown>(
        channel: string,
        handler: (event: T) => void | Promise<void>,
    ): vscode.Disposable;
    public subscribe(
        channel: string,
        handler: (event: any) => void | Promise<void>,
    ): vscode.Disposable {
        return this.addHandler(channel, handler, false);
    }

    /**
     * Subscribe to a single event on a channel, then auto-unsubscribe.
     *
     * @param channel - Exact channel name or wildcard pattern.
     * @param handler - Callback invoked exactly once.
     */
    public once<K extends keyof EventChannelMap>(
        channel: K,
        handler: (event: EventChannelMap[K]) => void | Promise<void>,
    ): vscode.Disposable;
    public once<T = unknown>(
        channel: string,
        handler: (event: T) => void | Promise<void>,
    ): vscode.Disposable;
    public once(
        channel: string,
        handler: (event: any) => void | Promise<void>,
    ): vscode.Disposable {
        return this.addHandler(channel, handler, true);
    }

    // ── Emit ─────────────────────────────────────────────────────

    /**
     * Emit an event on a channel.
     *
     * All matching handlers (exact + wildcard) are invoked asynchronously.
     * Handler errors are caught and logged — they never propagate to
     * the emitter.
     *
     * @param channel - The channel to emit on.
     * @param event   - The event payload.
     */
    public async emit<K extends keyof EventChannelMap>(
        channel: K,
        event: EventChannelMap[K],
    ): Promise<void>;
    public async emit<T = unknown>(
        channel: string,
        event: T,
    ): Promise<void>;
    public async emit(channel: string, event: unknown): Promise<void> {
        if (this.disposed) {
            return;
        }

        // Wrap in envelope
        const envelope: EventEnvelope = {
            id: `evt-${++this.nextEventId}`,
            channel,
            timestamp: Date.now(),
            data: event,
        };

        this.addToHistory(channel, envelope);

        if (this.logEvents) {
            this.logger.debug(`EventBus emit: ${channel}`, {
                component: 'EventBus',
                eventId: envelope.id,
            });
        }

        const emitStart = Date.now();
        let totalErrors = 0;

        // 1. Direct (exact-match) handlers
        const directSet = this.handlers.get(channel);
        if (directSet) {
            totalErrors += await this.invokeHandlers(directSet, event, channel);
            if (directSet.size === 0) {
                this.handlers.delete(channel);
            }
        }

        // 2. Wildcard handlers — snapshot entries to avoid mutation during iteration
        const wildcardEntries = [...this.wildcardHandlers.entries()];
        for (const [pattern, handlerSet] of wildcardEntries) {
            if (this.matchesWildcard(channel, pattern)) {
                totalErrors += await this.invokeHandlers(handlerSet, event, channel);
                if (handlerSet.size === 0) {
                    this.wildcardHandlers.delete(pattern);
                }
            }
        }

        // 3. Record metrics
        if (this.enableMetrics) {
            const duration = Date.now() - emitStart;
            this.updateMetrics(channel, duration, totalErrors);
        }
    }

    // ── History & Replay ─────────────────────────────────────────

    /**
     * Retrieve the event history for a channel.
     *
     * @param channel - The channel whose history to retrieve.
     * @returns Array of {@link EventEnvelope} objects (oldest → newest).
     */
    public getHistory<T = unknown>(channel: string): EventEnvelope<T>[] {
        return [...(this.history.get(channel) ?? [])] as EventEnvelope<T>[];
    }

    /**
     * Replay all stored history for a channel to a handler.
     * Useful for late subscribers that need to catch up.
     *
     * @param channel - The channel to replay.
     * @param handler - Callback invoked once per historical event.
     */
    public async replay<T = unknown>(
        channel: string,
        handler: (event: T) => void | Promise<void>,
    ): Promise<void> {
        const channelHistory = this.history.get(channel) ?? [];
        for (const envelope of channelHistory) {
            try {
                await handler(envelope.data as T);
            } catch (err) {
                this.logger.error(`EventBus replay handler error on "${channel}"`, {
                    component: 'EventBus',
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }
    }

    /**
     * Clear stored event history.
     *
     * @param channel - If provided, clear only that channel's history.
     *                  If omitted, clear **all** history.
     */
    public clearHistory(channel?: string): void {
        if (channel) {
            this.history.delete(channel);
        } else {
            this.history.clear();
        }
    }

    // ── Metrics ──────────────────────────────────────────────────

    /** Retrieve aggregate metrics across all channels. */
    public getMetrics(): EventBusMetrics;
    /**
     * Retrieve metrics for a single channel.
     *
     * @returns The channel metrics, or `undefined` if no events
     *          have been emitted on that channel.
     */
    public getMetrics(channel: string): ChannelMetrics | undefined;
    public getMetrics(channel?: string): EventBusMetrics | ChannelMetrics | undefined {
        if (channel !== undefined) {
            const metrics = this.channelMetrics.get(channel);
            if (metrics) {
                metrics.subscriberCount = this.getSubscriberCount(channel);
            }
            return metrics;
        }

        // Aggregate across all channels
        const channels: Record<string, ChannelMetrics> = {};
        let totalEmits = 0;

        for (const [ch, m] of this.channelMetrics) {
            m.subscriberCount = this.getSubscriberCount(ch);
            channels[ch] = { ...m };
            totalEmits += m.emitCount;
        }

        return {
            totalChannels: this.channelMetrics.size,
            totalSubscribers: this.getSubscriberCount(),
            totalEmits,
            channels,
            uptime: Date.now() - this.startTime,
        };
    }

    // ── Subscriber Queries ───────────────────────────────────────

    /**
     * Count current subscribers for a channel (including wildcard matches),
     * or across **all** channels if no argument is given.
     */
    public getSubscriberCount(channel?: string): number {
        if (!channel) {
            let total = 0;
            for (const s of this.handlers.values()) {
                total += s.size;
            }
            for (const s of this.wildcardHandlers.values()) {
                total += s.size;
            }
            return total;
        }

        let count = this.handlers.get(channel)?.size ?? 0;
        for (const [pattern, handlerSet] of this.wildcardHandlers) {
            if (this.matchesWildcard(channel, pattern)) {
                count += handlerSet.size;
            }
        }
        return count;
    }

    /**
     * Check whether a channel currently has any subscribers
     * (including wildcard matches).
     */
    public hasSubscribers(channel: string): boolean {
        return this.getSubscriberCount(channel) > 0;
    }

    // ── Lifecycle ────────────────────────────────────────────────

    /**
     * Dispose of the EventBus — removes all subscriptions, history,
     * and metrics.
     */
    public dispose(): void {
        if (this.disposed) {
            return;
        }
        this.disposed = true;
        this.handlers.clear();
        this.wildcardHandlers.clear();
        this.history.clear();
        this.channelMetrics.clear();
    }

    // ── Private Helpers ──────────────────────────────────────────

    /**
     * Register a handler entry and return a Disposable for removal.
     */
    private addHandler(
        channel: string,
        handler: (event: any) => void | Promise<void>,
        once: boolean,
    ): vscode.Disposable {
        if (this.disposed) {
            // Return a no-op disposable so callers never get undefined
            return { dispose: () => { /* bus already disposed */ } };
        }

        const entry: HandlerEntry = {
            id: ++this.nextHandlerId,
            handler,
            once,
            consumed: false,
        };

        const targetMap = this.isWildcard(channel)
            ? this.wildcardHandlers
            : this.handlers;

        let handlerSet = targetMap.get(channel);
        if (!handlerSet) {
            handlerSet = new Set();
            targetMap.set(channel, handlerSet);
        }
        handlerSet.add(entry);

        // Capture stable references for the dispose closure
        const stableSet = handlerSet;

        return {
            dispose: () => {
                stableSet.delete(entry);
                if (stableSet.size === 0) {
                    targetMap.delete(channel);
                }
            },
        };
    }

    /**
     * Invoke every handler in a set, catching and logging errors.
     * `once` handlers are removed after invocation.
     *
     * @returns The number of handler errors encountered.
     */
    private async invokeHandlers(
        handlerSet: Set<HandlerEntry>,
        event: unknown,
        channel: string,
    ): Promise<number> {
        const toRemove: HandlerEntry[] = [];
        let errorCount = 0;

        for (const entry of handlerSet) {
            // Guard against double-fire of `once` handlers across
            // concurrent emits on the same channel.
            if (entry.once && entry.consumed) {
                toRemove.push(entry);
                continue;
            }

            try {
                await entry.handler(event);
            } catch (err) {
                errorCount++;
                this.logger.error(`EventBus handler error on "${channel}"`, {
                    component: 'EventBus',
                    handlerId: entry.id,
                    error: err instanceof Error ? err.message : String(err),
                });
            }

            if (entry.once) {
                entry.consumed = true;
                toRemove.push(entry);
            }
        }

        for (const entry of toRemove) {
            handlerSet.delete(entry);
        }

        return errorCount;
    }

    /**
     * Append an envelope to the channel's history, evicting the oldest
     * entry when the sliding window is full.
     */
    private addToHistory(channel: string, envelope: EventEnvelope): void {
        let channelHistory = this.history.get(channel);
        if (!channelHistory) {
            channelHistory = [];
            this.history.set(channel, channelHistory);
        }
        channelHistory.push(envelope);
        if (channelHistory.length > this.maxHistoryPerChannel) {
            channelHistory.shift();
        }
    }

    /**
     * Test whether a concrete channel name matches a wildcard pattern.
     *
     * Supported patterns:
     * - `"*"`          — matches any channel
     * - `"prefix.*"`   — matches any channel starting with `"prefix."`
     * - `"prefix*"`    — matches any channel starting with `"prefix"`
     */
    private matchesWildcard(channel: string, pattern: string): boolean {
        if (pattern === '*') {
            return true;
        }
        if (pattern.endsWith('*')) {
            return channel.startsWith(pattern.slice(0, -1));
        }
        return channel === pattern;
    }

    /** Returns `true` if the channel string contains a wildcard character. */
    private isWildcard(channel: string): boolean {
        return channel.includes('*');
    }

    /** Retrieve or lazily create a {@link ChannelMetrics} record. */
    private getOrCreateChannelMetrics(channel: string): ChannelMetrics {
        let metrics = this.channelMetrics.get(channel);
        if (!metrics) {
            metrics = {
                channel,
                emitCount: 0,
                subscriberCount: 0,
                totalHandlerDuration: 0,
                averageHandlerDuration: 0,
                errorCount: 0,
            };
            this.channelMetrics.set(channel, metrics);
        }
        return metrics;
    }

    /** Record emit metrics for a channel. */
    private updateMetrics(
        channel: string,
        duration: number,
        errorCount: number,
    ): void {
        const metrics = this.getOrCreateChannelMetrics(channel);
        metrics.emitCount++;
        metrics.totalHandlerDuration += duration;
        metrics.averageHandlerDuration =
            metrics.emitCount > 0
                ? metrics.totalHandlerDuration / metrics.emitCount
                : 0;
        metrics.lastEmitTimestamp = Date.now();
        metrics.errorCount += errorCount;
    }
}
