/**
 * Offline-First Skill Queue
 *
 * Detects network state, queues skill operations while offline,
 * auto-drains on reconnection with FIFO ordering, and handles
 * dead-letter items after max retries.
 *
 * Part of AICC-0150: Offline-First Skill Queue
 *   - AICC-0151: Offline detection, queue & auto-drain
 *     - AICC-0404: Implement network monitor (online/offline detection)
 *     - AICC-0405: Build queue persistence to .project/offline-queue.json
 *     - AICC-0406: Implement FIFO drain on reconnection
 *     - AICC-0407: Add retry with exponential backoff
 *   - AICC-0152: Event bus integration & dead letter handling
 *     - AICC-0408: Wire queue events to EventBus
 *     - AICC-0409: Implement dead letter handler (max retries exceeded)
 *     - AICC-0410: Build manual review UI for dead-letter items
 *
 * REQ-OFQ-001 to REQ-OFQ-008
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as dns from 'dns';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EventBus } from './eventBus';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * A single queued skill operation.
 */
export interface QueueItem {
    /** Unique item identifier (UUID) */
    id: string;
    /** Name of the skill that should execute this operation */
    skillName: string;
    /** The operation to perform (e.g. 'store', 'update', 'delete') */
    operation: string;
    /** Arbitrary payload to pass to the skill */
    payload: any;
    /** ISO 8601 timestamp when the item was enqueued */
    createdAt: string;
    /** Number of retry attempts made so far */
    retryCount: number;
    /** Maximum number of retries before dead-lettering */
    maxRetries: number;
    /** Last error message if the operation failed */
    lastError?: string;
    /** Current status of the queue item */
    status: 'pending' | 'processing' | 'failed' | 'dead-letter';
}

/**
 * Aggregate statistics for the offline queue.
 */
export interface QueueStats {
    /** Items waiting to be processed */
    pending: number;
    /** Items currently being processed */
    processing: number;
    /** Items that exceeded max retries */
    deadLetter: number;
    /** Total items successfully processed (lifetime) */
    totalProcessed: number;
    /** Total items that failed processing (lifetime) */
    totalFailed: number;
}

/**
 * Result of a drain operation.
 */
export interface DrainResult {
    /** Number of items successfully processed */
    processed: number;
    /** Number of items that failed during this drain */
    failed: number;
    /** Number of items moved to dead-letter during this drain */
    deadLettered: number;
    /** Number of pending items remaining after drain */
    remaining: number;
}

// ─── Persistence Shape ───────────────────────────────────────────────

/**
 * On-disk structure stored in `.project/offline-queue.json`.
 */
interface QueueStore {
    /** Schema version for future migration */
    version: number;
    /** All queued items (pending, processing, dead-letter) */
    items: QueueItem[];
    /** Lifetime counters */
    counters: {
        totalProcessed: number;
        totalFailed: number;
    };
    /** ISO 8601 timestamp of last modification */
    lastUpdated: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const COMPONENT = 'OfflineQueue';
const QUEUE_DIR = '.project';
const QUEUE_FILE = 'offline-queue.json';
const STORE_VERSION = 1;

/** Default maximum retries before dead-lettering */
const DEFAULT_MAX_RETRIES = 5;

/** Network check interval in ms (30 seconds) */
const NETWORK_CHECK_INTERVAL_MS = 30_000;

/** Maximum backoff delay in ms */
const MAX_BACKOFF_MS = 30_000;

/** Base backoff delay in ms */
const BASE_BACKOFF_MS = 1_000;

/** DNS host used for connectivity checks */
const CONNECTIVITY_HOST = 'dns.google';

// ─── Service ─────────────────────────────────────────────────────────

/**
 * Singleton offline-first queue that buffers skill operations while
 * the network is unavailable and auto-drains on reconnection.
 *
 * All mutating operations persist atomically (temp-file + rename)
 * and emit events on the {@link EventBus}.
 *
 * @example
 * ```ts
 * import { OfflineQueue } from '../services/offlineQueue';
 *
 * const queue = OfflineQueue.getInstance('/workspace');
 *
 * // Enqueue while offline
 * const item = queue.enqueue('mySkill', 'update', { id: '123' });
 *
 * // Manually drain (also happens automatically on reconnection)
 * const result = await queue.drain();
 * ```
 */
export class OfflineQueue implements vscode.Disposable {
    // ── Singleton ────────────────────────────────────────────────
    private static instances = new Map<string, OfflineQueue>();

    private readonly logger: Logger;
    private readonly eventBus: EventBus;
    private readonly filePath: string;
    private items: QueueItem[];
    private counters: { totalProcessed: number; totalFailed: number };

    /** Whether the network is currently considered online */
    private online: boolean = true;

    /** Handle for the periodic network check interval */
    private networkCheckInterval: ReturnType<typeof setInterval> | undefined;

    /** Whether a drain operation is currently in progress */
    private draining: boolean = false;

    /** Whether the service has been disposed */
    private disposed: boolean = false;

    /** Optional executor function for processing queue items */
    private executor?: (skillName: string, operation: string, payload: any) => Promise<void>;

    // ── Construction ─────────────────────────────────────────────

    private constructor(workspacePath: string) {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
        this.filePath = path.join(workspacePath, QUEUE_DIR, QUEUE_FILE);
        this.counters = { totalProcessed: 0, totalFailed: 0 };
        this.items = this.loadQueueSync();
        this.startNetworkMonitor();
        this.logger.info(
            `OfflineQueue initialized (${this.items.length} items, online=${this.online})`,
            { component: COMPONENT },
        );
    }

    /**
     * Retrieve (or create) the OfflineQueue singleton for a workspace.
     *
     * @param workspacePath Root path of the workspace
     * @returns The OfflineQueue instance
     */
    public static getInstance(workspacePath: string): OfflineQueue {
        const key = path.resolve(workspacePath);
        let instance = OfflineQueue.instances.get(key);
        if (!instance) {
            instance = new OfflineQueue(workspacePath);
            OfflineQueue.instances.set(key, instance);
        }
        return instance;
    }

    /**
     * Reset all singleton instances. Primarily for tests.
     */
    public static resetInstances(): void {
        for (const instance of OfflineQueue.instances.values()) {
            instance.dispose();
        }
        OfflineQueue.instances.clear();
    }

    /**
     * Register an executor function that processes queued items.
     * The executor receives the skill name, operation, and payload.
     *
     * @param fn Async function to execute queued operations
     */
    public setExecutor(fn: (skillName: string, operation: string, payload: any) => Promise<void>): void {
        this.executor = fn;
        this.logger.debug('Queue executor registered', { component: COMPONENT });
    }

    // ── Network Monitoring (AICC-0404) ───────────────────────────

    /**
     * Check whether the network is currently online.
     *
     * @returns `true` if online, `false` otherwise
     */
    public isOnline(): boolean {
        return this.online;
    }

    /**
     * Start the periodic network monitor.
     * Uses DNS lookup to detect connectivity changes and auto-drains
     * on transition from offline → online.
     */
    public startNetworkMonitor(): void {
        if (this.networkCheckInterval) {
            return; // Already running
        }

        this.networkCheckInterval = setInterval(async () => {
            if (this.disposed) {
                return;
            }
            const wasOnline = this.online;
            this.online = await this.checkConnectivity();

            if (!wasOnline && this.online) {
                // Transition: offline → online
                this.logger.info('Network connectivity restored', {
                    component: COMPONENT,
                });
                this.eventBus.emit('queue.network.online', {
                    timestamp: Date.now(),
                    source: COMPONENT,
                });

                // Auto-drain on reconnection (AICC-0406)
                const pendingCount = this.items.filter(
                    (i) => i.status === 'pending',
                ).length;
                if (pendingCount > 0) {
                    this.logger.info(
                        `Auto-draining ${pendingCount} pending items`,
                        { component: COMPONENT },
                    );
                    this.drain().catch((err) => {
                        this.logger.error('Auto-drain failed', {
                            component: COMPONENT,
                            error: err,
                        });
                    });
                }
            } else if (wasOnline && !this.online) {
                // Transition: online → offline
                this.logger.warn('Network connectivity lost', {
                    component: COMPONENT,
                });
                this.eventBus.emit('queue.network.offline', {
                    timestamp: Date.now(),
                    source: COMPONENT,
                });
            }
        }, NETWORK_CHECK_INTERVAL_MS);

        this.logger.debug('Network monitor started', { component: COMPONENT });
    }

    /**
     * Stop the periodic network monitor.
     */
    public stopNetworkMonitor(): void {
        if (this.networkCheckInterval) {
            clearInterval(this.networkCheckInterval);
            this.networkCheckInterval = undefined;
            this.logger.debug('Network monitor stopped', {
                component: COMPONENT,
            });
        }
    }

    // ── Queue Operations (AICC-0405) ─────────────────────────────

    /**
     * Add a skill operation to the FIFO queue.
     *
     * @param skillName Name of the skill to execute
     * @param operation Operation identifier (e.g. 'store', 'update')
     * @param payload Arbitrary payload for the operation
     * @param maxRetries Maximum retry attempts (default: 5)
     * @returns The created queue item
     */
    public enqueue(
        skillName: string,
        operation: string,
        payload: any,
        maxRetries: number = DEFAULT_MAX_RETRIES,
    ): QueueItem {
        try {
            const item: QueueItem = {
                id: crypto.randomUUID(),
                skillName,
                operation,
                payload,
                createdAt: new Date().toISOString(),
                retryCount: 0,
                maxRetries,
                status: 'pending',
            };

            this.items.push(item);
            this.saveQueueSync();

            this.eventBus.emit('queue.item.enqueued', {
                timestamp: Date.now(),
                source: COMPONENT,
                itemId: item.id,
                skillName,
                operation,
            });

            this.logger.info(
                `Enqueued: ${skillName}.${operation} (${item.id})`,
                { component: COMPONENT },
            );
            return item;
        } catch (err) {
            this.logger.error('Failed to enqueue item', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        }
    }

    // ── Drain (AICC-0406) ────────────────────────────────────────

    /**
     * Process all pending items in FIFO order.
     *
     * Each item is processed sequentially. Failed items are retried
     * with exponential backoff; items exceeding max retries are moved
     * to dead-letter.
     *
     * @returns Summary of the drain operation
     */
    public async drain(): Promise<DrainResult> {
        if (this.draining) {
            this.logger.warn('Drain already in progress, skipping', {
                component: COMPONENT,
            });
            return { processed: 0, failed: 0, deadLettered: 0, remaining: this.getPendingCount() };
        }

        this.draining = true;
        const result: DrainResult = {
            processed: 0,
            failed: 0,
            deadLettered: 0,
            remaining: 0,
        };

        try {
            const pendingItems = this.items.filter(
                (i) => i.status === 'pending',
            );

            this.logger.info(
                `Starting drain: ${pendingItems.length} pending items`,
                { component: COMPONENT },
            );

            for (const item of pendingItems) {
                if (this.disposed) {
                    break;
                }

                const success = await this.processItem(item);
                if (success) {
                    result.processed++;
                } else {
                    result.failed++;
                    if (item.status === 'dead-letter') {
                        result.deadLettered++;
                    }
                }
            }

            result.remaining = this.getPendingCount();

            this.logger.info(
                `Drain complete: processed=${result.processed}, failed=${result.failed}, ` +
                    `deadLettered=${result.deadLettered}, remaining=${result.remaining}`,
                { component: COMPONENT },
            );

            return result;
        } catch (err) {
            this.logger.error('Drain failed unexpectedly', {
                component: COMPONENT,
                error: err,
            });
            throw err;
        } finally {
            this.draining = false;
        }
    }

    /**
     * Process a single queued item.
     *
     * On failure, attempts retry with exponential backoff. If the item
     * has exhausted all retries, it is moved to dead-letter.
     *
     * @param item The queue item to process
     * @returns `true` if successfully processed, `false` otherwise
     */
    public async processItem(item: QueueItem): Promise<boolean> {
        try {
            item.status = 'processing';
            this.saveQueueSync();

            if (!this.executor) {
                throw new Error(
                    'No executor registered. Call setExecutor() before processing.',
                );
            }

            await this.executor(item.skillName, item.operation, item.payload);

            // Success — remove from queue
            this.items = this.items.filter((i) => i.id !== item.id);
            this.counters.totalProcessed++;
            this.saveQueueSync();

            this.eventBus.emit('queue.item.processed', {
                timestamp: Date.now(),
                source: COMPONENT,
                itemId: item.id,
                skillName: item.skillName,
                operation: item.operation,
            });

            this.logger.info(
                `Processed: ${item.skillName}.${item.operation} (${item.id})`,
                { component: COMPONENT },
            );
            return true;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            item.lastError = errorMsg;
            item.retryCount++;

            this.logger.warn(
                `Failed to process ${item.id}: ${errorMsg} (retry ${item.retryCount}/${item.maxRetries})`,
                { component: COMPONENT },
            );

            if (item.retryCount >= item.maxRetries) {
                this.moveToDeadLetter(item, errorMsg);
                return false;
            }

            // Retry with backoff (AICC-0407)
            return this.retryWithBackoff(item);
        }
    }

    // ── Retry with Backoff (AICC-0407) ───────────────────────────

    /**
     * Retry a queue item with exponential backoff.
     *
     * Delay formula: `min(1000 × 2^retryCount, 30000)` ms.
     *
     * @param item The queue item to retry
     * @returns `true` if retry succeeded, `false` otherwise
     */
    public async retryWithBackoff(item: QueueItem): Promise<boolean> {
        const delay = Math.min(
            BASE_BACKOFF_MS * Math.pow(2, item.retryCount),
            MAX_BACKOFF_MS,
        );

        this.logger.debug(
            `Backoff: waiting ${delay}ms before retry ${item.retryCount}/${item.maxRetries} for ${item.id}`,
            { component: COMPONENT },
        );

        await this.sleep(delay);

        try {
            if (!this.executor) {
                throw new Error('No executor registered');
            }

            await this.executor(item.skillName, item.operation, item.payload);

            // Success on retry — remove from queue
            this.items = this.items.filter((i) => i.id !== item.id);
            this.counters.totalProcessed++;
            this.saveQueueSync();

            this.eventBus.emit('queue.item.processed', {
                timestamp: Date.now(),
                source: COMPONENT,
                itemId: item.id,
                skillName: item.skillName,
                operation: item.operation,
                retryCount: item.retryCount,
            });

            this.logger.info(
                `Processed on retry ${item.retryCount}: ${item.skillName}.${item.operation} (${item.id})`,
                { component: COMPONENT },
            );
            return true;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            item.lastError = errorMsg;

            if (item.retryCount >= item.maxRetries) {
                this.moveToDeadLetter(item, errorMsg);
            } else {
                item.status = 'pending';
                this.saveQueueSync();
            }

            return false;
        }
    }

    // ── Dead Letter Handling (AICC-0409) ─────────────────────────

    /**
     * Move a failed item to dead-letter status.
     *
     * @param item The queue item to dead-letter
     * @param reason The reason for dead-lettering
     */
    public moveToDeadLetter(item: QueueItem, reason: string): void {
        item.status = 'dead-letter';
        item.lastError = reason;
        this.counters.totalFailed++;
        this.saveQueueSync();

        this.eventBus.emit('queue.item.failed', {
            timestamp: Date.now(),
            source: COMPONENT,
            itemId: item.id,
            skillName: item.skillName,
            operation: item.operation,
            reason,
            retryCount: item.retryCount,
        });

        this.logger.error(
            `Dead-lettered: ${item.skillName}.${item.operation} (${item.id}) — ${reason}`,
            { component: COMPONENT },
        );
    }

    /**
     * Get all dead-letter items.
     *
     * @returns Array of dead-letter queue items
     */
    public getDeadLetterItems(): QueueItem[] {
        return this.items.filter((i) => i.status === 'dead-letter');
    }

    /**
     * Manually retry a specific dead-letter item.
     *
     * Resets the item's retry count and status to 'pending',
     * then attempts to process it immediately.
     *
     * @param itemId The ID of the dead-letter item to retry
     * @returns `true` if the retry succeeded, `false` otherwise
     */
    public async retryDeadLetterItem(itemId: string): Promise<boolean> {
        const item = this.items.find(
            (i) => i.id === itemId && i.status === 'dead-letter',
        );
        if (!item) {
            this.logger.warn(
                `Dead-letter item not found: ${itemId}`,
                { component: COMPONENT },
            );
            return false;
        }

        // Reset for retry
        item.retryCount = 0;
        item.status = 'pending';
        item.lastError = undefined;
        this.saveQueueSync();

        this.logger.info(
            `Retrying dead-letter item: ${item.skillName}.${item.operation} (${itemId})`,
            { component: COMPONENT },
        );

        return this.processItem(item);
    }

    /**
     * Remove a dead-letter item from the queue entirely.
     *
     * @param itemId The ID of the dead-letter item to remove
     * @returns `true` if the item was found and removed
     */
    public removeDeadLetterItem(itemId: string): boolean {
        const idx = this.items.findIndex(
            (i) => i.id === itemId && i.status === 'dead-letter',
        );
        if (idx === -1) {
            this.logger.warn(
                `Dead-letter item not found for removal: ${itemId}`,
                { component: COMPONENT },
            );
            return false;
        }

        this.items.splice(idx, 1);
        this.saveQueueSync();

        this.logger.info(
            `Removed dead-letter item: ${itemId}`,
            { component: COMPONENT },
        );
        return true;
    }

    // ── Statistics ────────────────────────────────────────────────

    /**
     * Get aggregate queue statistics.
     *
     * @returns Current queue stats
     */
    public getStats(): QueueStats {
        return {
            pending: this.items.filter((i) => i.status === 'pending').length,
            processing: this.items.filter((i) => i.status === 'processing').length,
            deadLetter: this.items.filter((i) => i.status === 'dead-letter').length,
            totalProcessed: this.counters.totalProcessed,
            totalFailed: this.counters.totalFailed,
        };
    }

    // ── Dead Letter Review UI (AICC-0410) ────────────────────────

    /**
     * Generate an HTML table for reviewing dead-letter items.
     *
     * Includes columns for ID, skill, operation, error, retry count,
     * and created-at timestamp, plus action buttons for retry and remove.
     *
     * @returns HTML string with the dead-letter review table
     */
    public generateDeadLetterReviewHtml(): string {
        const deadLetters = this.getDeadLetterItems();

        if (deadLetters.length === 0) {
            return `
                <div style="padding: 20px; text-align: center; color: var(--vscode-descriptionForeground);">
                    <p>No dead-letter items. The queue is healthy.</p>
                </div>
            `;
        }

        const rows = deadLetters
            .map(
                (item) => `
                <tr>
                    <td title="${this.escapeHtml(item.id)}">${this.escapeHtml(item.id.substring(0, 8))}…</td>
                    <td>${this.escapeHtml(item.skillName)}</td>
                    <td>${this.escapeHtml(item.operation)}</td>
                    <td title="${this.escapeHtml(item.lastError || '')}">${this.escapeHtml(this.truncate(item.lastError || 'Unknown', 50))}</td>
                    <td>${item.retryCount}</td>
                    <td>${new Date(item.createdAt).toLocaleString()}</td>
                    <td>
                        <button class="queue-action" data-action="retry" data-id="${this.escapeHtml(item.id)}"
                            title="Retry this item">↻ Retry</button>
                        <button class="queue-action queue-action--danger" data-action="remove" data-id="${this.escapeHtml(item.id)}"
                            title="Remove permanently">✕ Remove</button>
                    </td>
                </tr>
            `,
            )
            .join('');

        return `
            <style>
                .queue-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                    color: var(--vscode-foreground);
                }
                .queue-table th, .queue-table td {
                    padding: 8px 12px;
                    text-align: left;
                    border-bottom: 1px solid var(--vscode-panel-border);
                }
                .queue-table th {
                    background: var(--vscode-editor-background);
                    font-weight: 600;
                    position: sticky;
                    top: 0;
                }
                .queue-table tr:hover {
                    background: var(--vscode-list-hoverBackground);
                }
                .queue-action {
                    padding: 3px 8px;
                    margin-right: 4px;
                    border: 1px solid var(--vscode-button-border, transparent);
                    background: var(--vscode-button-secondaryBackground);
                    color: var(--vscode-button-secondaryForeground);
                    cursor: pointer;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .queue-action:hover {
                    background: var(--vscode-button-secondaryHoverBackground);
                }
                .queue-action--danger {
                    color: var(--vscode-errorForeground);
                }
                .queue-summary {
                    padding: 12px;
                    margin-bottom: 12px;
                    background: var(--vscode-editor-background);
                    border-radius: 4px;
                    font-size: 13px;
                }
            </style>
            <div class="queue-summary">
                <strong>Dead Letter Queue</strong> — ${deadLetters.length} item${deadLetters.length !== 1 ? 's' : ''} require attention
            </div>
            <table class="queue-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Skill</th>
                        <th>Operation</th>
                        <th>Last Error</th>
                        <th>Retries</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    // ── Disposable ───────────────────────────────────────────────

    /**
     * Dispose the offline queue and release resources.
     */
    public dispose(): void {
        this.disposed = true;
        this.stopNetworkMonitor();
        this.logger.info('OfflineQueue disposed', { component: COMPONENT });
    }

    // ── Private: Network ─────────────────────────────────────────

    /**
     * Check network connectivity via DNS lookup.
     *
     * @returns `true` if DNS resolution succeeds
     */
    private async checkConnectivity(): Promise<boolean> {
        try {
            await dns.promises.lookup(CONNECTIVITY_HOST);
            return true;
        } catch {
            return false;
        }
    }

    // ── Private: Persistence (AICC-0405) ─────────────────────────

    /**
     * Load queue from `.project/offline-queue.json`.
     * Returns an empty array if the file does not exist or is malformed.
     */
    private loadQueueSync(): QueueItem[] {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                const parsed: unknown = JSON.parse(raw);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    Array.isArray((parsed as QueueStore).items)
                ) {
                    const store = parsed as QueueStore;
                    this.counters = store.counters || {
                        totalProcessed: 0,
                        totalFailed: 0,
                    };
                    this.logger.info(
                        `Loaded ${store.items.length} queue items`,
                        { component: COMPONENT },
                    );

                    // Reset any items stuck in 'processing' back to 'pending'
                    for (const item of store.items) {
                        if (item.status === 'processing') {
                            item.status = 'pending';
                        }
                    }
                    return store.items;
                }
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.warn(
                `Failed to load offline-queue.json, starting fresh: ${msg}`,
                { component: COMPONENT },
            );
        }
        return [];
    }

    /**
     * Persist queue atomically via temp-file + rename.
     */
    private saveQueueSync(): void {
        const dir = path.dirname(this.filePath);

        const store: QueueStore = {
            version: STORE_VERSION,
            items: this.items,
            counters: this.counters,
            lastUpdated: new Date().toISOString(),
        };

        const data = JSON.stringify(store, null, 2);
        const tmpPath = `${this.filePath}.${crypto.randomUUID()}.tmp`;

        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(tmpPath, data, 'utf-8');
            fs.renameSync(tmpPath, this.filePath);
        } catch (err) {
            this.logger.error('Failed to save offline queue', {
                component: COMPONENT,
                error: err instanceof Error ? err.message : String(err),
            });
            try {
                if (fs.existsSync(tmpPath)) {
                    fs.unlinkSync(tmpPath);
                }
            } catch {
                // Ignore cleanup failure
            }
        }
    }

    // ── Private: Helpers ─────────────────────────────────────────

    /**
     * Get the number of pending items.
     */
    private getPendingCount(): number {
        return this.items.filter((i) => i.status === 'pending').length;
    }

    /**
     * Sleep for the specified number of milliseconds.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Escape HTML special characters.
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Truncate text to a maximum length with ellipsis.
     */
    private truncate(text: string, maxLen: number): string {
        return text.length > maxLen
            ? text.substring(0, maxLen - 1) + '…'
            : text;
    }
}
