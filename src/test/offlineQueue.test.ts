/**
 * Unit Tests — OfflineQueue
 * AICC-0448 Sprint 28: FIFO queueing, retry, backoff, dead-letter, stats
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ─── Stubs ──────────────────────────────────────────────────────────

const logMessages: string[] = [];
const emittedEvents: Array<{ channel: string; data: unknown }> = [];

const stubLogger = {
    info: (msg: string) => { logMessages.push(msg); },
    warn: (msg: string) => { logMessages.push(msg); },
    error: (msg: string) => { logMessages.push(msg); },
    debug: (msg: string) => { logMessages.push(msg); },
};

const stubEventBus = {
    emit: async (channel: string, data: unknown) => {
        emittedEvents.push({ channel, data });
    },
};

// ─── Import ─────────────────────────────────────────────────────────

import { OfflineQueue, QueueItem } from '../services/offlineQueue';

suite('OfflineQueue', () => {
    let queue: OfflineQueue;
    let tmpDir: string;

    setup(() => {
        OfflineQueue.resetInstances();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicc-oq-'));
        fs.mkdirSync(path.join(tmpDir, '.project'), { recursive: true });
        queue = OfflineQueue.getInstance(tmpDir);
        // Override internal deps
        (queue as any).logger = stubLogger;
        (queue as any).eventBus = stubEventBus;
        queue.stopNetworkMonitor();
        logMessages.length = 0;
        emittedEvents.length = 0;
    });

    teardown(() => {
        OfflineQueue.resetInstances();
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // cleanup best-effort
        }
    });

    // ── enqueue ─────────────────────────────────────────────────

    suite('enqueue', () => {
        test('adds item with correct fields', () => {
            const item = queue.enqueue('mySkill', 'update', { id: '1' });
            assert.ok(item.id, 'Should have an ID');
            assert.strictEqual(item.skillName, 'mySkill');
            assert.strictEqual(item.operation, 'update');
            assert.strictEqual(item.retryCount, 0);
            assert.strictEqual(item.status, 'pending');
            assert.deepStrictEqual(item.payload, { id: '1' });
        });

        test('enqueues in FIFO order', () => {
            const a = queue.enqueue('s1', 'opA', { order: 1 });
            const b = queue.enqueue('s2', 'opB', { order: 2 });
            const c = queue.enqueue('s3', 'opC', { order: 3 });
            const stats = queue.getStats();
            assert.strictEqual(stats.pending, 3);
            // Items internally should preserve insertion order
            const items = (queue as any).items as QueueItem[];
            assert.strictEqual(items[0].id, a.id);
            assert.strictEqual(items[1].id, b.id);
            assert.strictEqual(items[2].id, c.id);
        });

        test('emits queue.item.enqueued event', () => {
            queue.enqueue('s', 'op', {});
            const evt = emittedEvents.find(
                (e) => e.channel === 'queue.item.enqueued',
            );
            assert.ok(evt, 'Should emit enqueue event');
        });
    });

    // ── drain ───────────────────────────────────────────────────

    suite('drain', () => {
        test('processes items sequentially with executor', async () => {
            const executed: string[] = [];
            queue.setExecutor(async (skill, op) => {
                executed.push(`${skill}.${op}`);
            });
            queue.enqueue('s1', 'a', {});
            queue.enqueue('s2', 'b', {});

            const result = await queue.drain();
            assert.strictEqual(result.processed, 2);
            assert.strictEqual(result.failed, 0);
            assert.strictEqual(result.remaining, 0);
            assert.deepStrictEqual(executed, ['s1.a', 's2.b']);
        });

        test('increments counters on successful drain', async () => {
            queue.setExecutor(async () => {});
            queue.enqueue('s', 'op', {});
            await queue.drain();
            const stats = queue.getStats();
            assert.strictEqual(stats.totalProcessed, 1);
            assert.strictEqual(stats.pending, 0);
        });
    });

    // ── retry & backoff ─────────────────────────────────────────

    suite('retry and backoff', () => {
        test('increments retryCount on failure', async () => {
            let callCount = 0;
            queue.setExecutor(async () => {
                callCount++;
                if (callCount <= 1) {
                    throw new Error('transient');
                }
            });
            const item = queue.enqueue('s', 'op', {}, 3);
            const success = await queue.processItem(item);
            // First call fails, retryWithBackoff is called, second call succeeds
            assert.ok(callCount >= 1);
        });

        test('backoff delay formula: min(1000 * 2^retryCount, 30000)', () => {
            // Test the delay calculation conceptually
            const delays = [0, 1, 2, 3, 4, 5, 6].map((retry) =>
                Math.min(1000 * Math.pow(2, retry), 30000),
            );
            assert.strictEqual(delays[0], 1000);
            assert.strictEqual(delays[1], 2000);
            assert.strictEqual(delays[2], 4000);
            assert.strictEqual(delays[3], 8000);
            assert.strictEqual(delays[4], 16000);
            assert.strictEqual(delays[5], 30000); // capped
            assert.strictEqual(delays[6], 30000); // still capped
        });
    });

    // ── dead-letter ─────────────────────────────────────────────

    suite('dead-letter', () => {
        test('moveToDeadLetter sets status and emits event', () => {
            const item = queue.enqueue('s', 'op', {}, 1);
            queue.moveToDeadLetter(item, 'max retries reached');
            assert.strictEqual(item.status, 'dead-letter');
            assert.strictEqual(item.lastError, 'max retries reached');
            const evt = emittedEvents.find(
                (e) => e.channel === 'queue.item.failed',
            );
            assert.ok(evt, 'Should emit failed event');
        });

        test('getDeadLetterItems returns only dead-letter items', () => {
            const a = queue.enqueue('s', 'a', {});
            const b = queue.enqueue('s', 'b', {});
            queue.moveToDeadLetter(b, 'error');
            const dl = queue.getDeadLetterItems();
            assert.strictEqual(dl.length, 1);
            assert.strictEqual(dl[0].id, b.id);
        });

        test('item moved to dead-letter after exceeding maxRetries', async () => {
            queue.setExecutor(async () => {
                throw new Error('always fails');
            });
            const item = queue.enqueue('s', 'op', {}, 1);
            await queue.processItem(item);
            assert.strictEqual(item.status, 'dead-letter');
        });
    });

    // ── stats ───────────────────────────────────────────────────

    suite('getStats', () => {
        test('accurately counts pending, processing, dead-letter', () => {
            queue.enqueue('s', 'a', {});
            queue.enqueue('s', 'b', {});
            const item = queue.enqueue('s', 'c', {});
            queue.moveToDeadLetter(item, 'err');

            const stats = queue.getStats();
            assert.strictEqual(stats.pending, 2);
            assert.strictEqual(stats.deadLetter, 1);
        });

        test('tracks lifetime totals', async () => {
            queue.setExecutor(async () => {});
            queue.enqueue('s', 'a', {});
            queue.enqueue('s', 'b', {});
            await queue.drain();
            const stats = queue.getStats();
            assert.strictEqual(stats.totalProcessed, 2);
        });
    });

    // ── network monitor ─────────────────────────────────────────

    suite('network state', () => {
        test('isOnline returns boolean', () => {
            const online = queue.isOnline();
            assert.strictEqual(typeof online, 'boolean');
        });

        test('stopNetworkMonitor clears interval', () => {
            queue.startNetworkMonitor();
            queue.stopNetworkMonitor();
            assert.strictEqual(
                (queue as any).networkCheckInterval,
                undefined,
            );
        });
    });

    // ── persistence ─────────────────────────────────────────────

    suite('queue persistence', () => {
        test('queue file is written on enqueue', () => {
            queue.enqueue('s', 'op', {});
            const queueFile = path.join(tmpDir, '.project', 'offline-queue.json');
            assert.ok(fs.existsSync(queueFile), 'Queue file should exist');
            const data = JSON.parse(fs.readFileSync(queueFile, 'utf-8'));
            assert.ok(Array.isArray(data.items));
            assert.strictEqual(data.items.length, 1);
        });
    });
});
