/**
 * Integration Tests — EventBus
 * AICC-0448 Sprint 28: Subscribe, wildcard, replay, multi-sub, unsub, cross-service
 */

import * as assert from 'assert';

// ─── Import ─────────────────────────────────────────────────────────

import { EventBus } from '../../services/eventBus';

suite('EventBus Integration Tests', () => {
    let bus: EventBus;

    setup(() => {
        EventBus.resetInstance();
        bus = EventBus.getInstance({
            maxHistoryPerChannel: 20,
            enableMetrics: true,
            logEvents: false,
        });
    });

    teardown(() => {
        EventBus.resetInstance();
    });

    // ── Subscribe & Receive ─────────────────────────────────────

    suite('subscribe and receive', () => {
        test('subscriber receives emitted event', async () => {
            const received: unknown[] = [];
            bus.subscribe('test.channel', (evt) => {
                received.push(evt);
            });

            await bus.emit('test.channel', { value: 42 });
            assert.strictEqual(received.length, 1);
            assert.deepStrictEqual(received[0], { value: 42 });
        });

        test('typed events preserve payload', async () => {
            const received: Array<{ timestamp: number; name: string }> = [];
            bus.subscribe('typed.channel', (evt: { timestamp: number; name: string }) => {
                received.push(evt);
            });

            const payload = { timestamp: Date.now(), name: 'test' };
            await bus.emit('typed.channel', payload);
            assert.strictEqual(received[0].name, 'test');
            assert.strictEqual(received[0].timestamp, payload.timestamp);
        });
    });

    // ── Wildcard Subscriptions ──────────────────────────────────

    suite('wildcard subscriptions', () => {
        test('"planning.*" receives planning.epic.created', async () => {
            const received: unknown[] = [];
            bus.subscribe('planning.*', (evt) => {
                received.push(evt);
            });

            await bus.emit('planning.epic.created', { id: '1' });
            await bus.emit('planning.story.updated', { id: '2' });
            await bus.emit('other.event', { id: '3' });

            assert.strictEqual(received.length, 2);
        });

        test('"*" receives all events', async () => {
            const received: unknown[] = [];
            bus.subscribe('*', (evt) => {
                received.push(evt);
            });

            await bus.emit('channel.a', { a: 1 });
            await bus.emit('channel.b', { b: 2 });
            await bus.emit('xyz', { c: 3 });

            assert.strictEqual(received.length, 3);
        });
    });

    // ── Replay ──────────────────────────────────────────────────

    suite('replay', () => {
        test('delivers last event to new subscribers', async () => {
            // Emit before subscribing
            await bus.emit('replay.test', { seq: 1 });
            await bus.emit('replay.test', { seq: 2 });

            const replayed: unknown[] = [];
            await bus.replay('replay.test', (evt: unknown) => {
                replayed.push(evt);
            });

            assert.strictEqual(replayed.length, 2);
            assert.deepStrictEqual(replayed[0], { seq: 1 });
            assert.deepStrictEqual(replayed[1], { seq: 2 });
        });

        test('replay returns empty for channel with no history', async () => {
            const replayed: unknown[] = [];
            await bus.replay('empty.channel', (evt: unknown) => {
                replayed.push(evt);
            });
            assert.strictEqual(replayed.length, 0);
        });
    });

    // ── Multiple Subscribers ────────────────────────────────────

    suite('multiple subscribers', () => {
        test('all subscribers receive the same event', async () => {
            const sub1: unknown[] = [];
            const sub2: unknown[] = [];
            const sub3: unknown[] = [];

            bus.subscribe('multi.channel', (evt) => { sub1.push(evt); });
            bus.subscribe('multi.channel', (evt) => { sub2.push(evt); });
            bus.subscribe('multi.channel', (evt) => { sub3.push(evt); });

            await bus.emit('multi.channel', { msg: 'hello' });

            assert.strictEqual(sub1.length, 1);
            assert.strictEqual(sub2.length, 1);
            assert.strictEqual(sub3.length, 1);
        });
    });

    // ── Unsubscribe ─────────────────────────────────────────────

    suite('unsubscribe', () => {
        test('stops delivery after dispose', async () => {
            const received: unknown[] = [];
            const sub = bus.subscribe('unsub.channel', (evt) => {
                received.push(evt);
            });

            await bus.emit('unsub.channel', { seq: 1 });
            assert.strictEqual(received.length, 1);

            sub.dispose();

            await bus.emit('unsub.channel', { seq: 2 });
            assert.strictEqual(received.length, 1, 'Should not receive after dispose');
        });

        test('once handler fires exactly once', async () => {
            const received: unknown[] = [];
            bus.once('once.channel', (evt) => {
                received.push(evt);
            });

            await bus.emit('once.channel', { first: true });
            await bus.emit('once.channel', { second: true });

            assert.strictEqual(received.length, 1);
            assert.deepStrictEqual(received[0], { first: true });
        });
    });

    // ── Cross-service event flow ────────────────────────────────

    suite('cross-service event flow', () => {
        test('simulates planning → velocity → notification flow', async () => {
            const flow: string[] = [];

            // Service A: planning
            bus.subscribe('planning.sprint.completed', async () => {
                flow.push('planning:received');
                await bus.emit('velocity.recalculate', { sprintId: 1 });
            });

            // Service B: velocity
            bus.subscribe('velocity.recalculate', async () => {
                flow.push('velocity:recalculated');
                await bus.emit('notification.send', { msg: 'Sprint done' });
            });

            // Service C: notification
            bus.subscribe('notification.send', () => {
                flow.push('notification:sent');
            });

            await bus.emit('planning.sprint.completed', { sprint: 1 });

            assert.deepStrictEqual(flow, [
                'planning:received',
                'velocity:recalculated',
                'notification:sent',
            ]);
        });
    });

    // ── Metrics ─────────────────────────────────────────────────

    suite('metrics', () => {
        test('tracks emit counts', async () => {
            bus.subscribe('metrics.channel', () => {});

            await bus.emit('metrics.channel', {});
            await bus.emit('metrics.channel', {});

            const metrics = bus.getMetrics('metrics.channel');
            assert.ok(metrics);
            assert.strictEqual(metrics!.emitCount, 2);
        });

        test('subscriber count is accurate', () => {
            bus.subscribe('count.channel', () => {});
            bus.subscribe('count.channel', () => {});
            const count = bus.getSubscriberCount('count.channel');
            assert.strictEqual(count, 2);
        });
    });

    // ── History ─────────────────────────────────────────────────

    suite('history', () => {
        test('getHistory returns stored events', async () => {
            await bus.emit('hist.channel', { a: 1 });
            await bus.emit('hist.channel', { a: 2 });

            const history = bus.getHistory('hist.channel');
            assert.strictEqual(history.length, 2);
            assert.deepStrictEqual(history[0].data, { a: 1 });
            assert.deepStrictEqual(history[1].data, { a: 2 });
        });

        test('clearHistory removes channel history', async () => {
            await bus.emit('clear.channel', { x: 1 });
            bus.clearHistory('clear.channel');
            const history = bus.getHistory('clear.channel');
            assert.strictEqual(history.length, 0);
        });
    });
});
