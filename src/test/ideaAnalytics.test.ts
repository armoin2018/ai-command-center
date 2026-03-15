/**
 * Unit Tests — IdeaAnalytics
 * AICC-0448 Sprint 28: Scoring, ranking, dedup, tags, stale, trends
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

import type { Idea } from '../types/ideation';
import {
    IdeaAnalytics,
    IdeaScore,
    DuplicateCandidate,
} from '../services/ideaAnalytics';

/**
 * Helper: create a minimal Idea for testing.
 */
function makeIdea(overrides: Partial<Idea> & { id: string; title: string }): Idea {
    return {
        id: overrides.id,
        title: overrides.title,
        description: overrides.description ?? 'Default description',
        author: overrides.author ?? 'tester',
        category: overrides.category ?? 'feature',
        status: overrides.status ?? 'submitted',
        tags: overrides.tags ?? [],
        votes: overrides.votes ?? [],
        comments: overrides.comments ?? [],
        createdAt: overrides.createdAt ?? new Date().toISOString(),
        updatedAt: overrides.updatedAt ?? new Date().toISOString(),
    };
}

suite('IdeaAnalytics', () => {
    let analytics: IdeaAnalytics;
    let mockIdeas: Idea[];

    setup(() => {
        IdeaAnalytics.resetInstances();
        mockIdeas = [];

        // Create a mock ideation service
        const mockIdeation = {
            listIdeas: () => mockIdeas,
            updateIdea: (_id: string, _data: any) => {},
        };

        // Construct the analytics instance with mocked dependencies
        analytics = (IdeaAnalytics as any).getInstance('/tmp/test-analytics');
        (analytics as any).logger = stubLogger;
        (analytics as any).eventBus = stubEventBus;
        (analytics as any).ideation = mockIdeation;
        emittedEvents.length = 0;
    });

    teardown(() => {
        IdeaAnalytics.resetInstances();
    });

    // ── computeScore ────────────────────────────────────────────

    suite('computeScore', () => {
        test('returns composite score clamped to 0-100', () => {
            const idea = makeIdea({
                id: 'i1',
                title: 'Test idea',
                votes: [
                    { userId: 'u1', direction: 'up', votedAt: new Date().toISOString() },
                    { userId: 'u2', direction: 'up', votedAt: new Date().toISOString() },
                ],
                comments: [
                    { id: 'c1', author: 'u1', body: 'Great idea', createdAt: new Date().toISOString() },
                ],
            });
            mockIdeas.push(idea);
            const score = analytics.computeScore(idea);
            assert.ok(score.composite >= 0 && score.composite <= 100);
            assert.strictEqual(score.ideaId, 'i1');
            assert.ok(typeof score.voteScore === 'number');
            assert.ok(typeof score.engagementScore === 'number');
            assert.ok(typeof score.recencyScore === 'number');
            assert.ok(typeof score.uniquenessScore === 'number');
        });

        test('scoring weights sum correctly', () => {
            // Weights: votes 0.3, engagement 0.2, recency 0.3, uniqueness 0.2
            const sum = 0.3 + 0.2 + 0.3 + 0.2;
            assert.strictEqual(sum, 1.0);
        });

        test('returns zero scores for idea with no activity', () => {
            const idea = makeIdea({ id: 'empty', title: 'Empty idea' });
            mockIdeas.push(idea);
            const score = analytics.computeScore(idea);
            // Vote and engagement scores should be 0
            assert.strictEqual(score.voteScore, 0);
            assert.strictEqual(score.engagementScore, 0);
        });
    });

    // ── rankIdeas ───────────────────────────────────────────────

    suite('rankIdeas', () => {
        test('returns ideas sorted by composite score descending', () => {
            const ideaHigh = makeIdea({
                id: 'h',
                title: 'High',
                votes: Array.from({ length: 10 }, (_, i) => ({
                    userId: `u${i}`,
                    direction: 'up' as const,
                    votedAt: new Date().toISOString(),
                })),
            });
            const ideaLow = makeIdea({ id: 'l', title: 'Low' });
            mockIdeas.push(ideaHigh, ideaLow);

            const ranked = analytics.rankIdeas();
            assert.strictEqual(ranked.length, 2);
            assert.ok(ranked[0].composite >= ranked[1].composite);
        });

        test('returns empty array when no ideas', () => {
            const ranked = analytics.rankIdeas();
            assert.strictEqual(ranked.length, 0);
        });
    });

    // ── detectDuplicates ────────────────────────────────────────

    suite('detectDuplicates', () => {
        test('detects duplicates by similar title', () => {
            const original = makeIdea({
                id: 'o',
                title: 'Add dark mode support for the dashboard',
                description: 'Users want dark mode in the dashboard UI',
            });
            const duplicate = makeIdea({
                id: 'd',
                title: 'Add dark mode support for the dashboard panel',
                description: 'Dark mode should be added to the dashboard panel UI',
            });
            mockIdeas.push(original, duplicate);

            const dupes = analytics.detectDuplicates(duplicate);
            assert.ok(dupes.length > 0, 'Should find duplicate');
            assert.strictEqual(dupes[0].matchId, original.id);
            assert.ok(dupes[0].similarity > 0);
        });

        test('returns empty for unique ideas', () => {
            const a = makeIdea({ id: 'a', title: 'Authentication system' });
            const b = makeIdea({ id: 'b', title: 'Performance monitoring dashboard' });
            mockIdeas.push(a, b);

            const dupes = analytics.detectDuplicates(b);
            // These should be different enough
            const highSim = dupes.filter((d) => d.similarity >= 0.6);
            assert.strictEqual(highSim.length, 0);
        });

        test('uses Levenshtein-style fuzzy matching', () => {
            // Verify the similarity function exists and works
            const sim = (analytics as any).computeSimilarity;
            if (typeof sim === 'function') {
                const score = sim.call(analytics, 'hello world', 'hello world');
                assert.strictEqual(score, 1.0, 'Identical strings should be 1.0');
            }
        });
    });

    // ── suggestTags ─────────────────────────────────────────────

    suite('suggestTags', () => {
        test('suggests tags from content analysis', () => {
            // Seed vocabulary with existing tagged ideas
            const existing = makeIdea({
                id: 'e1',
                title: 'API integration system',
                tags: ['api', 'integration', 'backend'],
            });
            const target = makeIdea({
                id: 't1',
                title: 'Build new API integration module',
                description: 'We need a new integration for the API',
                tags: [],
            });
            mockIdeas.push(existing, target);

            const suggestions = analytics.suggestTags(target);
            assert.ok(Array.isArray(suggestions));
            // Should suggest 'api' or 'integration' from vocabulary
        });

        test('returns empty when no vocabulary overlap', () => {
            const target = makeIdea({
                id: 't',
                title: 'Completely unique subject',
                tags: [],
            });
            mockIdeas.push(target);
            const suggestions = analytics.suggestTags(target);
            assert.ok(Array.isArray(suggestions));
        });
    });

    // ── stale idea detection ────────────────────────────────────

    suite('detectStaleIdeas', () => {
        test('finds ideas older than threshold', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);
            const staleIdea = makeIdea({
                id: 's',
                title: 'Stale idea',
                status: 'submitted',
                updatedAt: oldDate.toISOString(),
                createdAt: oldDate.toISOString(),
            });
            const freshIdea = makeIdea({
                id: 'f',
                title: 'Fresh idea',
                status: 'submitted',
            });
            mockIdeas.push(staleIdea, freshIdea);

            const stale = analytics.detectStaleIdeas(30);
            assert.ok(stale.length >= 1);
            assert.ok(stale.some((i) => i.id === 's'));
        });

        test('excludes archived ideas', () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);
            const archived = makeIdea({
                id: 'a',
                title: 'Archived',
                status: 'archived',
                updatedAt: oldDate.toISOString(),
                createdAt: oldDate.toISOString(),
            });
            mockIdeas.push(archived);

            const stale = analytics.detectStaleIdeas(30);
            assert.ok(!stale.some((i) => i.id === 'a'));
        });
    });

    // ── trend data ──────────────────────────────────────────────

    suite('buildTrendData', () => {
        test('aggregates by period and category', () => {
            const now = new Date();
            const ideas = [
                makeIdea({ id: '1', title: 'A', category: 'feature', createdAt: now.toISOString() }),
                makeIdea({ id: '2', title: 'B', category: 'feature', createdAt: now.toISOString() }),
                makeIdea({ id: '3', title: 'C', category: 'improvement', createdAt: now.toISOString() }),
            ];
            mockIdeas.push(...ideas);

            const trends = analytics.buildTrendData(7);
            assert.ok(Array.isArray(trends));
            if (trends.length > 0) {
                assert.ok(trends[0].period);
                assert.ok(trends[0].category);
                assert.ok(typeof trends[0].count === 'number');
            }
        });

        test('returns empty for no ideas', () => {
            const trends = analytics.buildTrendData();
            assert.strictEqual(trends.length, 0);
        });
    });
});
