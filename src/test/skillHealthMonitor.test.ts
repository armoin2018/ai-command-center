/**
 * Unit Tests — SkillHealthMonitor
 * AICC-0448 Sprint 28: State machine, summary, dashboard HTML
 */

import * as assert from 'assert';

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

// Mock VS Code API
const mockVscode = {
    workspace: {
        getConfiguration: () => ({
            get: (key: string, defaultValue: any) => defaultValue,
        }),
        onDidChangeConfiguration: () => ({ dispose: () => {} }),
    },
    extensions: {
        getExtension: () => undefined,
    },
};

// ─── Import ─────────────────────────────────────────────────────────

import {
    SkillHealthMonitor,
    HealthProbeResult,
    HealthStatus,
} from '../services/skillHealthMonitor';

suite('SkillHealthMonitor', () => {
    let monitor: SkillHealthMonitor;

    setup(() => {
        SkillHealthMonitor.resetInstance();
        monitor = SkillHealthMonitor.getInstance();
        (monitor as any).logger = stubLogger;
        (monitor as any).eventBus = stubEventBus;
        emittedEvents.length = 0;
    });

    teardown(() => {
        SkillHealthMonitor.resetInstance();
    });

    // ── State Machine Transitions ───────────────────────────────

    suite('state machine', () => {
        test('healthy → degraded after 1 failure (default threshold)', () => {
            monitor.registerSkill({ name: 'test-skill' });

            // First: set to healthy
            monitor.updateHealthState('test-skill', {
                skillName: 'test-skill',
                reachable: true,
                latencyMs: 50,
                credentialValid: true,
            });
            let state = monitor.getHealthState('test-skill');
            assert.strictEqual(state?.status, 'healthy');

            // Then: one failure → degraded (degradedThreshold defaults to 1)
            monitor.updateHealthState('test-skill', {
                skillName: 'test-skill',
                reachable: false,
                latencyMs: 0,
                credentialValid: true,
                error: 'Connection refused',
            });
            state = monitor.getHealthState('test-skill');
            assert.strictEqual(state?.status, 'degraded');
            assert.strictEqual(state?.consecutiveFailures, 1);
        });

        test('degraded → unreachable after N failures (default threshold = 3)', () => {
            monitor.registerSkill({ name: 'test-skill' });

            // Set healthy first
            monitor.updateHealthState('test-skill', {
                skillName: 'test-skill',
                reachable: true,
                latencyMs: 50,
                credentialValid: true,
            });

            // Simulate 3 consecutive failures
            for (let i = 0; i < 3; i++) {
                monitor.updateHealthState('test-skill', {
                    skillName: 'test-skill',
                    reachable: false,
                    latencyMs: 0,
                    credentialValid: true,
                    error: `Failure ${i + 1}`,
                });
            }

            const state = monitor.getHealthState('test-skill');
            assert.strictEqual(state?.status, 'unreachable');
            assert.strictEqual(state?.consecutiveFailures, 3);
        });

        test('unreachable → healthy on success', () => {
            monitor.registerSkill({ name: 'test-skill' });

            // Drive to unreachable
            for (let i = 0; i < 3; i++) {
                monitor.updateHealthState('test-skill', {
                    skillName: 'test-skill',
                    reachable: false,
                    latencyMs: 0,
                    credentialValid: true,
                    error: 'Down',
                });
            }
            assert.strictEqual(monitor.getHealthState('test-skill')?.status, 'unreachable');

            // Successful probe restores healthy
            monitor.updateHealthState('test-skill', {
                skillName: 'test-skill',
                reachable: true,
                latencyMs: 25,
                credentialValid: true,
            });
            const state = monitor.getHealthState('test-skill');
            assert.strictEqual(state?.status, 'healthy');
            assert.strictEqual(state?.consecutiveFailures, 0);
        });

        test('emits skill.health.changed on status transition', () => {
            monitor.registerSkill({ name: 'evt-skill' });

            monitor.updateHealthState('evt-skill', {
                skillName: 'evt-skill',
                reachable: true,
                latencyMs: 50,
                credentialValid: true,
            });

            // unknown → healthy should emit
            const evt = emittedEvents.find(
                (e) => e.channel === 'skill.health.changed',
            );
            assert.ok(evt, 'Should emit health changed event');
        });

        test('credential failure triggers degraded', () => {
            monitor.registerSkill({ name: 'cred-skill' });

            monitor.updateHealthState('cred-skill', {
                skillName: 'cred-skill',
                reachable: true,
                latencyMs: 50,
                credentialValid: false, // Bad creds
                error: 'Invalid credentials',
            });
            const state = monitor.getHealthState('cred-skill');
            assert.strictEqual(state?.status, 'degraded');
        });
    });

    // ── Health Summary ──────────────────────────────────────────

    suite('getHealthSummary', () => {
        test('counts skills by status category', () => {
            monitor.registerSkill({ name: 'skill-a' });
            monitor.registerSkill({ name: 'skill-b' });
            monitor.registerSkill({ name: 'skill-c' });

            monitor.updateHealthState('skill-a', {
                skillName: 'skill-a',
                reachable: true,
                latencyMs: 30,
                credentialValid: true,
            });
            monitor.updateHealthState('skill-b', {
                skillName: 'skill-b',
                reachable: false,
                latencyMs: 0,
                credentialValid: true,
                error: 'Down',
            });
            // skill-c remains 'unknown'

            const summary = monitor.getHealthSummary();
            assert.strictEqual(summary.total, 3);
            assert.strictEqual(summary.healthy, 1);
            assert.strictEqual(summary.degraded, 1);
            assert.strictEqual(summary.unknown, 1);
        });

        test('returns zeros for empty monitor', () => {
            const summary = monitor.getHealthSummary();
            assert.strictEqual(summary.total, 0);
            assert.strictEqual(summary.healthy, 0);
        });
    });

    // ── Dashboard HTML ──────────────────────────────────────────

    suite('generateHealthDashboardHtml', () => {
        test('returns HTML string with dashboard structure', () => {
            monitor.registerSkill({ name: 'html-skill' });
            monitor.updateHealthState('html-skill', {
                skillName: 'html-skill',
                reachable: true,
                latencyMs: 42,
                credentialValid: true,
            });

            const html = monitor.generateHealthDashboardHtml();
            assert.ok(html.includes('health-dashboard'));
            assert.ok(html.includes('html-skill'));
            assert.ok(html.includes('Healthy'));
        });

        test('shows empty message when no skills registered', () => {
            const html = monitor.generateHealthDashboardHtml();
            assert.ok(html.includes('No skills registered'));
        });
    });

    // ── Registration ────────────────────────────────────────────

    suite('skill registration', () => {
        test('registerSkill initializes unknown state', () => {
            monitor.registerSkill({ name: 'new-skill' });
            const state = monitor.getHealthState('new-skill');
            assert.ok(state);
            assert.strictEqual(state!.status, 'unknown');
            assert.strictEqual(state!.consecutiveFailures, 0);
        });

        test('unregisterSkill removes state', () => {
            monitor.registerSkill({ name: 'remove-me' });
            assert.ok(monitor.getHealthState('remove-me'));
            monitor.unregisterSkill('remove-me');
            assert.strictEqual(monitor.getHealthState('remove-me'), undefined);
        });
    });
});
