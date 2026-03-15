/**
 * Unit Tests — KnowledgeBase
 * AICC-0448 Sprint 28: Store, search, dedup, merge, version, summary
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

import { KnowledgeBase, KnowledgeEntry } from '../services/knowledgeBase';

suite('KnowledgeBase', () => {
    let kb: KnowledgeBase;
    let tmpDir: string;

    setup(() => {
        KnowledgeBase.resetInstance();
        // Override homedir so the KB writes to temp dir
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicc-kb-'));
        const kbDir = path.join(tmpDir, '.aicc', 'knowledge');
        fs.mkdirSync(kbDir, { recursive: true });

        kb = KnowledgeBase.getInstance();
        // Override internal paths and deps
        (kb as any).knowledgeDir = kbDir;
        (kb as any).filePath = path.join(kbDir, 'knowledge.json');
        (kb as any).entries = [];
        (kb as any).logger = stubLogger;
        (kb as any).eventBus = stubEventBus;
        emittedEvents.length = 0;
    });

    teardown(() => {
        KnowledgeBase.resetInstance();
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // best-effort
        }
    });

    // ── store ───────────────────────────────────────────────────

    suite('store', () => {
        test('creates entry with auto-generated ID', () => {
            const entry = kb.store({
                title: 'Atomic writes',
                content: 'Use temp file + rename',
                source: 'test',
                category: 'pattern',
                tags: ['fs', 'node'],
                confidence: 90,
            });
            assert.ok(entry.id, 'Should have an ID');
            assert.strictEqual(entry.title, 'Atomic writes');
            assert.strictEqual(entry.version, 1);
            assert.strictEqual(entry.usageCount, 0);
            assert.ok(entry.createdAt);
            assert.ok(entry.updatedAt);
        });

        test('rejects invalid category', () => {
            assert.throws(() => {
                kb.store({
                    title: 'Bad',
                    content: 'bad',
                    source: 'test',
                    category: 'invalid' as any,
                    tags: [],
                    confidence: 50,
                });
            }, /Invalid category/);
        });

        test('emits knowledge.entry.stored event', () => {
            kb.store({
                title: 'E',
                content: 'C',
                source: 's',
                category: 'solution',
                tags: [],
                confidence: 50,
            });
            const evt = emittedEvents.find(
                (e) => e.channel === 'knowledge.entry.stored',
            );
            assert.ok(evt, 'Should emit stored event');
        });
    });

    // ── search ──────────────────────────────────────────────────

    suite('search', () => {
        let entryA: KnowledgeEntry;
        let entryB: KnowledgeEntry;

        setup(() => {
            entryA = kb.store({
                title: 'Node.js error handling patterns',
                content: 'Always wrap async calls in try-catch',
                source: 'test',
                category: 'pattern',
                tags: ['node', 'error-handling'],
                confidence: 85,
            });
            entryB = kb.store({
                title: 'Docker networking gotcha',
                content: 'Containers on the same bridge network share DNS',
                source: 'test',
                category: 'gotcha',
                tags: ['docker', 'networking'],
                confidence: 70,
            });
        });

        test('search by text returns matching entries', () => {
            const results = kb.search({ text: 'Node.js error' });
            assert.ok(results.length > 0);
            assert.strictEqual(results[0].id, entryA.id);
        });

        test('search by tags returns matching entries', () => {
            const results = kb.search({ tags: ['docker'] });
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].id, entryB.id);
        });

        test('search by category filters correctly', () => {
            const results = kb.search({ category: 'gotcha' });
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].category, 'gotcha');
        });

        test('search with limit restricts results', () => {
            kb.store({
                title: 'Extra',
                content: 'Extra entry',
                source: 'test',
                category: 'pattern',
                tags: ['node'],
                confidence: 60,
            });
            const results = kb.search({ tags: ['node'], limit: 1 });
            assert.strictEqual(results.length, 1);
        });

        test('search with minConfidence filters low-confidence entries', () => {
            const results = kb.search({ minConfidence: 80 });
            assert.ok(results.every((e) => e.confidence >= 80));
        });
    });

    // ── duplicate detection ─────────────────────────────────────

    suite('detectDuplicates', () => {
        test('detects duplicate by similar content', () => {
            const a = kb.store({
                title: 'Atomic file writes in Node.js',
                content: 'Use temp file then rename for atomic writes in Node.js',
                source: 'test',
                category: 'pattern',
                tags: ['node'],
                confidence: 90,
            });
            const b = kb.store({
                title: 'Atomic file writes in Node.js using rename',
                content: 'Use temp file then rename for atomic writes in Node',
                source: 'test2',
                category: 'pattern',
                tags: ['node'],
                confidence: 80,
            });
            const dupes = kb.detectDuplicates(b);
            assert.ok(dupes.length > 0, 'Should detect duplicate');
            assert.strictEqual(dupes[0].entryId, a.id);
        });

        test('returns empty for unique content', () => {
            const a = kb.store({
                title: 'React hooks',
                content: 'useState and useEffect are the primary hooks',
                source: 'test',
                category: 'reference',
                tags: ['react'],
                confidence: 90,
            });
            const b = kb.store({
                title: 'Docker compose volumes',
                content: 'Named volumes persist data across container restarts',
                source: 'test',
                category: 'config',
                tags: ['docker'],
                confidence: 80,
            });
            const dupes = kb.detectDuplicates(b);
            assert.strictEqual(dupes.length, 0);
        });
    });

    // ── merge ───────────────────────────────────────────────────

    suite('mergeEntries', () => {
        test('combines content and tags from secondary into primary', () => {
            const primary = kb.store({
                title: 'Primary',
                content: 'Primary content',
                source: 'test',
                category: 'pattern',
                tags: ['a', 'b'],
                confidence: 80,
            });
            const secondary = kb.store({
                title: 'Secondary',
                content: 'Extra info',
                source: 'test',
                category: 'pattern',
                tags: ['b', 'c'],
                confidence: 90,
            });
            const merged = kb.mergeEntries(primary.id, secondary.id);
            assert.ok(merged.content.includes('Primary content'));
            assert.ok(merged.content.includes('Extra info'));
            // Tags union: a, b, c
            const tagSet = new Set(merged.tags.map((t) => t.toLowerCase()));
            assert.ok(tagSet.has('a'));
            assert.ok(tagSet.has('b'));
            assert.ok(tagSet.has('c'));
            // Higher confidence wins
            assert.strictEqual(merged.confidence, 90);
        });

        test('deletes secondary entry after merge', () => {
            const primary = kb.store({
                title: 'P',
                content: 'pc',
                source: 's',
                category: 'pattern',
                tags: [],
                confidence: 50,
            });
            const secondary = kb.store({
                title: 'S',
                content: 'sc',
                source: 's',
                category: 'pattern',
                tags: [],
                confidence: 60,
            });
            kb.mergeEntries(primary.id, secondary.id);
            assert.strictEqual(kb.getEntry(secondary.id), undefined);
        });
    });

    // ── version increment ───────────────────────────────────────

    suite('updateEntry', () => {
        test('increments version on update', () => {
            const entry = kb.store({
                title: 'V1',
                content: 'Content',
                source: 's',
                category: 'pattern',
                tags: [],
                confidence: 50,
            });
            assert.strictEqual(entry.version, 1);
            const updated = kb.updateEntry(entry.id, { content: 'Updated' });
            assert.strictEqual(updated.version, 2);
            assert.strictEqual(updated.content, 'Updated');
        });

        test('throws for nonexistent entry', () => {
            assert.throws(() => {
                kb.updateEntry('nonexistent-id', { content: 'x' });
            }, /not found/);
        });
    });

    // ── summary ─────────────────────────────────────────────────

    suite('getSummary', () => {
        test('returns accurate statistics', () => {
            kb.store({ title: 'A', content: 'c', source: 's', category: 'pattern', tags: ['x'], confidence: 80 });
            kb.store({ title: 'B', content: 'c', source: 's', category: 'gotcha', tags: ['y'], confidence: 60 });
            kb.store({ title: 'C', content: 'c', source: 's', category: 'pattern', tags: ['x'], confidence: 90 });

            const summary = kb.getSummary();
            assert.strictEqual(summary.total, 3);
            assert.strictEqual(summary.byCategory['pattern'], 2);
            assert.strictEqual(summary.byCategory['gotcha'], 1);
            assert.ok(summary.avgConfidence > 0);
            assert.ok(summary.topTags.length > 0);
        });

        test('returns empty summary for empty KB', () => {
            const summary = kb.getSummary();
            assert.strictEqual(summary.total, 0);
            assert.strictEqual(summary.avgConfidence, 0);
        });
    });
});
