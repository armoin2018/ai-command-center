/**
 * Unit Tests — AgentSessionMemory
 * AICC-0448 Sprint 28: Store, recall, prune, export, import
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
    AgentSessionMemory,
    MemoryEntry,
    MemoryExport,
} from '../services/agentSessionMemory';

suite('AgentSessionMemory', () => {
    let memory: AgentSessionMemory;
    let tmpDir: string;

    setup(() => {
        AgentSessionMemory.resetInstances();
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aicc-asm-'));
        fs.mkdirSync(path.join(tmpDir, '.project'), { recursive: true });
        memory = AgentSessionMemory.getInstance(tmpDir, { autoSave: false });
        (memory as any).logger = stubLogger;
        (memory as any).eventBus = stubEventBus;
        emittedEvents.length = 0;
    });

    teardown(() => {
        AgentSessionMemory.resetInstances();
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            // best-effort
        }
    });

    // ── store ───────────────────────────────────────────────────

    suite('store', () => {
        test('creates entry with auto-generated fields', () => {
            const entry = memory.store({
                agentName: 'architect',
                sessionId: 'sess-1',
                type: 'decision',
                content: 'Chose microservices',
                tags: ['architecture'],
                relevanceScore: 85,
            });
            assert.ok(entry.id);
            assert.strictEqual(entry.agentName, 'architect');
            assert.strictEqual(entry.type, 'decision');
            assert.strictEqual(entry.accessCount, 0);
            assert.ok(entry.createdAt);
            assert.ok(entry.lastAccessedAt);
        });

        test('validates entry schema', () => {
            assert.throws(() => {
                memory.store({
                    agentName: 'test',
                    sessionId: 'sess-1',
                    type: 'invalid-type' as any,
                    content: 'bad',
                    tags: [],
                    relevanceScore: 50,
                });
            });
        });

        test('emits memory.entry.stored event', () => {
            memory.store({
                agentName: 'tester',
                sessionId: 's1',
                type: 'context',
                content: 'test content',
                tags: [],
                relevanceScore: 50,
            });
            const evt = emittedEvents.find(
                (e) => e.channel === 'memory.entry.stored',
            );
            assert.ok(evt, 'Should emit stored event');
        });
    });

    // ── recall ──────────────────────────────────────────────────

    suite('recall', () => {
        setup(() => {
            memory.store({
                agentName: 'architect',
                sessionId: 'sess-1',
                type: 'decision',
                content: 'Design choice A',
                tags: ['design', 'arch'],
                relevanceScore: 90,
            });
            memory.store({
                agentName: 'architect',
                sessionId: 'sess-1',
                type: 'context',
                content: 'Context note',
                tags: ['context'],
                relevanceScore: 40,
            });
            memory.store({
                agentName: 'developer',
                sessionId: 'sess-2',
                type: 'pattern',
                content: 'Code pattern',
                tags: ['code', 'design'],
                relevanceScore: 70,
            });
        });

        test('filters by agentName', () => {
            const results = memory.recall({ agentName: 'architect' });
            assert.strictEqual(results.length, 2);
            assert.ok(results.every((e) => e.agentName === 'architect'));
        });

        test('filters by type', () => {
            const results = memory.recall({ type: 'decision' });
            assert.strictEqual(results.length, 1);
            assert.strictEqual(results[0].type, 'decision');
        });

        test('filters by tags (any match)', () => {
            const results = memory.recall({ tags: ['design'] });
            assert.strictEqual(results.length, 2);
        });

        test('sorts by relevance score descending', () => {
            const results = memory.recall({ agentName: 'architect' });
            assert.ok(results[0].relevanceScore >= results[1].relevanceScore);
        });

        test('respects limit', () => {
            const results = memory.recall({ limit: 1 });
            assert.strictEqual(results.length, 1);
        });

        test('filters by minRelevance', () => {
            const results = memory.recall({ minRelevance: 60 });
            assert.ok(results.every((e) => e.relevanceScore >= 60));
            assert.strictEqual(results.length, 2);
        });
    });

    // ── pruning ─────────────────────────────────────────────────

    suite('prune', () => {
        test('removes old entries by age', () => {
            const entry = memory.store({
                agentName: 'a',
                sessionId: 's',
                type: 'context',
                content: 'old',
                tags: [],
                relevanceScore: 50,
            });
            // Backdate the entry
            const stored = (memory as any).entries.find(
                (e: MemoryEntry) => e.id === entry.id,
            );
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 200);
            stored.createdAt = oldDate.toISOString();

            const pruned = memory.prune({ pruneAgeDays: 100 });
            assert.strictEqual(pruned, 1);
        });

        test('removes entries below min relevance', () => {
            memory.store({
                agentName: 'a',
                sessionId: 's',
                type: 'context',
                content: 'low',
                tags: [],
                relevanceScore: 5,
            });
            memory.store({
                agentName: 'a',
                sessionId: 's',
                type: 'decision',
                content: 'high',
                tags: [],
                relevanceScore: 80,
            });
            const pruned = memory.prune({ pruneMinRelevance: 20 });
            assert.strictEqual(pruned, 1);
        });
    });

    // ── export ──────────────────────────────────────────────────

    suite('export', () => {
        test('exportToJson returns proper format', () => {
            memory.store({
                agentName: 'a',
                sessionId: 's',
                type: 'decision',
                content: 'c',
                tags: [],
                relevanceScore: 50,
            });
            const exported = memory.exportToJson();
            assert.ok(exported.exportedAt);
            assert.strictEqual(exported.entryCount, 1);
            assert.strictEqual(exported.entries.length, 1);
        });

        test('exportToMarkdown returns string with headers', () => {
            memory.store({
                agentName: 'architect',
                sessionId: 'sess-1',
                type: 'decision',
                content: 'Design choice',
                tags: ['design'],
                relevanceScore: 80,
            });
            const md = memory.exportToMarkdown();
            assert.ok(md.includes('# Agent Session Memory Export'));
            assert.ok(md.includes('## Agent: architect'));
            assert.ok(md.includes('Design choice'));
        });
    });

    // ── import ──────────────────────────────────────────────────

    suite('importFromJson', () => {
        test('imports entries from export data', () => {
            const exportData: MemoryExport = {
                exportedAt: new Date().toISOString(),
                entryCount: 1,
                entries: [
                    {
                        id: 'import-001',
                        agentName: 'importer',
                        sessionId: 'sess-x',
                        type: 'context',
                        content: 'Imported content',
                        tags: ['imported'],
                        relevanceScore: 60,
                        createdAt: new Date().toISOString(),
                        lastAccessedAt: new Date().toISOString(),
                        accessCount: 0,
                    },
                ],
            };
            const count = memory.importFromJson(exportData);
            assert.strictEqual(count, 1);
            const found = memory.getEntry('import-001');
            assert.ok(found);
            assert.strictEqual(found!.agentName, 'importer');
        });

        test('skips duplicate IDs', () => {
            const entry = memory.store({
                agentName: 'a',
                sessionId: 's',
                type: 'decision',
                content: 'c',
                tags: [],
                relevanceScore: 50,
            });
            const exportData: MemoryExport = {
                exportedAt: new Date().toISOString(),
                entryCount: 1,
                entries: [entry],
            };
            const count = memory.importFromJson(exportData);
            assert.strictEqual(count, 0, 'Should skip existing ID');
        });

        test('throws for invalid import data', () => {
            assert.throws(() => {
                memory.importFromJson(null as any);
            });
        });
    });

    // ── validateEntry ───────────────────────────────────────────

    suite('validateEntry', () => {
        test('valid entry returns true', () => {
            assert.ok(
                memory.validateEntry({
                    id: 'x',
                    agentName: 'a',
                    sessionId: 's',
                    type: 'decision',
                    content: 'c',
                    tags: ['t'],
                    relevanceScore: 50,
                    createdAt: new Date().toISOString(),
                    lastAccessedAt: new Date().toISOString(),
                    accessCount: 0,
                }),
            );
        });

        test('rejects entry with missing fields', () => {
            assert.strictEqual(memory.validateEntry({}), false);
            assert.strictEqual(memory.validateEntry(null), false);
        });

        test('rejects invalid type', () => {
            assert.strictEqual(
                memory.validateEntry({
                    id: 'x',
                    agentName: 'a',
                    sessionId: 's',
                    type: 'unknown',
                    content: 'c',
                    tags: [],
                    relevanceScore: 50,
                    createdAt: 'x',
                    lastAccessedAt: 'x',
                    accessCount: 0,
                }),
                false,
            );
        });

        test('rejects relevance outside 0-100', () => {
            assert.strictEqual(
                memory.validateEntry({
                    id: 'x',
                    agentName: 'a',
                    sessionId: 's',
                    type: 'decision',
                    content: 'c',
                    tags: [],
                    relevanceScore: 150,
                    createdAt: 'x',
                    lastAccessedAt: 'x',
                    accessCount: 0,
                }),
                false,
            );
        });
    });
});
