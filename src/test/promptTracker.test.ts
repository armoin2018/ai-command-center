/**
 * Unit Tests — PromptEffectivenessTracker
 * AICC-0448 Sprint 28: Track, outcome, score, leaderboard, prune
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ─── Stubs ──────────────────────────────────────────────────────────

const stubLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
};

const emittedEvents: Array<{ channel: string; data: unknown }> = [];
const stubEventBus = {
    emit: async (channel: string, data: unknown) => {
        emittedEvents.push({ channel, data });
    },
};

// ─── Import ─────────────────────────────────────────────────────────

import {
    PromptEffectivenessTracker,
    PromptUsage,
} from '../services/promptEffectivenessTracker';

suite('PromptEffectivenessTracker', () => {
    let tracker: PromptEffectivenessTracker;
    let tmpDir: string;

    setup(() => {
        PromptEffectivenessTracker.resetInstances();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicc-pet-'));
        fs.mkdirSync(path.join(tmpDir, '.project'), { recursive: true });
        tracker = PromptEffectivenessTracker.getInstance(tmpDir);
        (tracker as any).logger = stubLogger;
        (tracker as any).eventBus = stubEventBus;
        emittedEvents.length = 0;
    });

    teardown(() => {
        PromptEffectivenessTracker.resetInstances();
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // best-effort
        }
    });

    // ── trackUsage ──────────────────────────────────────────────

    suite('trackUsage', () => {
        test('creates entry with auto-generated ID', () => {
            const usage = tracker.trackUsage({
                promptName: 'test-prompt',
                promptText: 'Generate unit tests',
                timestamp: new Date().toISOString(),
                durationMs: 1200,
                outcome: 'success',
                tags: ['testing'],
                context: { agentName: 'tester' },
            });
            assert.ok(usage.id, 'Should have an ID');
            assert.strictEqual(usage.promptName, 'test-prompt');
            assert.strictEqual(usage.outcome, 'success');
        });

        test('emits prompt.tracked event', () => {
            tracker.trackUsage({
                promptName: 'p',
                promptText: 't',
                timestamp: new Date().toISOString(),
                durationMs: 100,
                outcome: 'pending',
                tags: [],
                context: {},
            });
            const evt = emittedEvents.find(
                (e) => e.channel === 'prompt.tracked',
            );
            assert.ok(evt, 'Should emit tracked event');
        });
    });

    // ── updateOutcome ───────────────────────────────────────────

    suite('updateOutcome', () => {
        test('changes outcome status', () => {
            const usage = tracker.trackUsage({
                promptName: 'p',
                promptText: 't',
                timestamp: new Date().toISOString(),
                durationMs: 500,
                outcome: 'pending',
                tags: [],
                context: {},
            });
            tracker.updateOutcome(usage.id, 'success', 'Worked great');
            const history = tracker.getUsageHistory('p');
            assert.strictEqual(history[0].outcome, 'success');
            assert.strictEqual(history[0].resultSummary, 'Worked great');
        });

        test('throws for nonexistent usage', () => {
            assert.throws(() => {
                tracker.updateOutcome('bad-id', 'failure');
            }, /not found/);
        });

        test('emits prompt.outcomeUpdated event', () => {
            const usage = tracker.trackUsage({
                promptName: 'p',
                promptText: 't',
                timestamp: new Date().toISOString(),
                durationMs: 100,
                outcome: 'pending',
                tags: [],
                context: {},
            });
            tracker.updateOutcome(usage.id, 'success');
            const evt = emittedEvents.find(
                (e) => e.channel === 'prompt.outcomeUpdated',
            );
            assert.ok(evt, 'Should emit outcome updated event');
        });
    });

    // ── computeEffectiveness ────────────────────────────────────

    suite('computeEffectiveness', () => {
        test('returns zero score for unknown prompt', () => {
            const score = tracker.computeEffectiveness('unknown');
            assert.strictEqual(score.score, 0);
            assert.strictEqual(score.usageCount, 0);
        });

        test('computes score in 0-100 range', () => {
            for (let i = 0; i < 5; i++) {
                tracker.trackUsage({
                    promptName: 'good-prompt',
                    promptText: 'text',
                    timestamp: new Date(Date.now() - i * 86400000).toISOString(),
                    durationMs: 800,
                    outcome: 'success',
                    tags: [],
                    context: {},
                });
            }
            const score = tracker.computeEffectiveness('good-prompt');
            assert.ok(score.score >= 0 && score.score <= 100);
            assert.strictEqual(score.usageCount, 5);
            assert.ok(score.successRate > 0);
        });

        test('higher success rate yields higher score', () => {
            // All successes
            for (let i = 0; i < 3; i++) {
                tracker.trackUsage({
                    promptName: 'winner',
                    promptText: 'text',
                    timestamp: new Date().toISOString(),
                    durationMs: 500,
                    outcome: 'success',
                    tags: [],
                    context: {},
                });
            }
            // All failures
            for (let i = 0; i < 3; i++) {
                tracker.trackUsage({
                    promptName: 'loser',
                    promptText: 'text',
                    timestamp: new Date().toISOString(),
                    durationMs: 500,
                    outcome: 'failure',
                    tags: [],
                    context: {},
                });
            }
            const winner = tracker.computeEffectiveness('winner');
            const loser = tracker.computeEffectiveness('loser');
            assert.ok(winner.score > loser.score, `Winner score ${winner.score} should be > loser ${loser.score}`);
        });
    });

    // ── leaderboard ─────────────────────────────────────────────

    suite('getLeaderboard', () => {
        test('returns ranked entries sorted by score', () => {
            tracker.trackUsage({
                promptName: 'A',
                promptText: 't',
                timestamp: new Date().toISOString(),
                durationMs: 100,
                outcome: 'success',
                tags: [],
                context: {},
            });
            tracker.trackUsage({
                promptName: 'B',
                promptText: 't',
                timestamp: new Date().toISOString(),
                durationMs: 100,
                outcome: 'failure',
                tags: [],
                context: {},
            });

            const lb = tracker.getLeaderboard();
            assert.ok(lb.length >= 2);
            assert.strictEqual(lb[0].rank, 1);
            assert.strictEqual(lb[1].rank, 2);
            assert.ok(lb[0].score >= lb[1].score);
        });

        test('respects limit parameter', () => {
            tracker.trackUsage({ promptName: 'A', promptText: 't', timestamp: new Date().toISOString(), durationMs: 100, outcome: 'success', tags: [], context: {} });
            tracker.trackUsage({ promptName: 'B', promptText: 't', timestamp: new Date().toISOString(), durationMs: 100, outcome: 'success', tags: [], context: {} });
            tracker.trackUsage({ promptName: 'C', promptText: 't', timestamp: new Date().toISOString(), durationMs: 100, outcome: 'success', tags: [], context: {} });

            const lb = tracker.getLeaderboard(2);
            assert.strictEqual(lb.length, 2);
        });
    });

    // ── getUsageHistory ─────────────────────────────────────────

    suite('getUsageHistory', () => {
        test('returns history newest first', () => {
            const ts1 = new Date('2026-01-01').toISOString();
            const ts2 = new Date('2026-02-01').toISOString();
            tracker.trackUsage({ promptName: 'p', promptText: 't', timestamp: ts1, durationMs: 100, outcome: 'success', tags: [], context: {} });
            tracker.trackUsage({ promptName: 'p', promptText: 't', timestamp: ts2, durationMs: 100, outcome: 'success', tags: [], context: {} });

            const history = tracker.getUsageHistory('p');
            assert.strictEqual(history.length, 2);
            assert.ok(
                new Date(history[0].timestamp).getTime() >= new Date(history[1].timestamp).getTime(),
            );
        });

        test('filters by promptName', () => {
            tracker.trackUsage({ promptName: 'A', promptText: 't', timestamp: new Date().toISOString(), durationMs: 100, outcome: 'success', tags: [], context: {} });
            tracker.trackUsage({ promptName: 'B', promptText: 't', timestamp: new Date().toISOString(), durationMs: 100, outcome: 'success', tags: [], context: {} });

            const history = tracker.getUsageHistory('A');
            assert.ok(history.every((u) => u.promptName === 'A'));
        });
    });

    // ── pruneOldUsages ──────────────────────────────────────────

    suite('pruneOldUsages', () => {
        test('removes entries older than threshold', () => {
            const oldTs = new Date();
            oldTs.setDate(oldTs.getDate() - 100);
            tracker.trackUsage({
                promptName: 'old',
                promptText: 't',
                timestamp: oldTs.toISOString(),
                durationMs: 100,
                outcome: 'success',
                tags: [],
                context: {},
            });
            tracker.trackUsage({
                promptName: 'new',
                promptText: 't',
                timestamp: new Date().toISOString(),
                durationMs: 100,
                outcome: 'success',
                tags: [],
                context: {},
            });

            const removed = tracker.pruneOldUsages(30);
            assert.strictEqual(removed, 1);
            const remaining = tracker.getUsageHistory();
            assert.strictEqual(remaining.length, 1);
            assert.strictEqual(remaining[0].promptName, 'new');
        });
    });
});
