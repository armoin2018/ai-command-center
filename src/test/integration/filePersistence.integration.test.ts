/**
 * Integration Tests — File Persistence (Atomic Write Pattern)
 * AICC-0448 Sprint 28: Atomic writes, concurrent safety, read-after-write,
 *                       temp-file cleanup, graceful file-not-found
 *
 * Several services (offlineQueue, knowledgeBase, agentSessionMemory,
 * velocityEngine, planArchivalService) share a common atomic-write
 * pattern: write to tmp → rename to final.
 * These tests verify the pattern in isolation using real filesystem I/O.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// ─── Helpers ─────────────────────────────────────────────────────────

/** Create a unique temp directory for each test run. */
function makeTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'aicc-persist-'));
}

/** Replicate the atomic-write pattern used across services. */
function atomicWriteSync(filePath: string, content: string): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    fs.writeFileSync(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
}

/** Async variant matching velocityEngine / telemetryCollector. */
async function atomicWriteAsync(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(tmpPath, content, 'utf-8');
    fs.renameSync(tmpPath, filePath);
}

/** Clean up temp directory. */
function cleanup(dir: string): void {
    try {
        fs.rmSync(dir, { recursive: true, force: true });
    } catch {
        // best-effort
    }
}

// ─── Tests ───────────────────────────────────────────────────────────

suite('File Persistence Integration Tests', () => {
    let tempDir: string;

    setup(() => {
        tempDir = makeTempDir();
    });

    teardown(() => {
        cleanup(tempDir);
    });

    // ── Atomic Write ────────────────────────────────────────────

    suite('atomic write — sync', () => {
        test('creates a file with correct content', () => {
            const fp = path.join(tempDir, 'test.json');
            atomicWriteSync(fp, '{"ok":true}');

            assert.ok(fs.existsSync(fp), 'File should exist');
            assert.strictEqual(fs.readFileSync(fp, 'utf-8'), '{"ok":true}');
        });

        test('creates nested directories automatically', () => {
            const fp = path.join(tempDir, 'a', 'b', 'c', 'deep.json');
            atomicWriteSync(fp, '[]');
            assert.ok(fs.existsSync(fp));
        });

        test('no orphan temp file left on success', () => {
            const fp = path.join(tempDir, 'clean.json');
            atomicWriteSync(fp, '{}');

            const siblings = fs.readdirSync(tempDir);
            const tmpFiles = siblings.filter((f) => f.endsWith('.tmp'));
            assert.strictEqual(tmpFiles.length, 0, 'No temp files should remain');
        });

        test('overwrite replaces content atomically', () => {
            const fp = path.join(tempDir, 'over.json');
            atomicWriteSync(fp, '{"v":1}');
            atomicWriteSync(fp, '{"v":2}');

            const parsed = JSON.parse(fs.readFileSync(fp, 'utf-8'));
            assert.strictEqual(parsed.v, 2);
        });
    });

    // ── Atomic Write — Async ────────────────────────────────────

    suite('atomic write — async', () => {
        test('creates file with correct content', async () => {
            const fp = path.join(tempDir, 'async.json');
            await atomicWriteAsync(fp, '{"async":true}');

            assert.ok(fs.existsSync(fp));
            const content = await fs.promises.readFile(fp, 'utf-8');
            assert.strictEqual(content, '{"async":true}');
        });
    });

    // ── Concurrent Writes ───────────────────────────────────────

    suite('concurrent writes', () => {
        test('sequential writes produce valid JSON', () => {
            const fp = path.join(tempDir, 'sequential.json');
            for (let i = 0; i < 20; i++) {
                const payload = { iteration: i, data: Array(100).fill('x').join('') };
                atomicWriteSync(fp, JSON.stringify(payload));
            }

            // Final file must be valid JSON with iteration === 19
            const result = JSON.parse(fs.readFileSync(fp, 'utf-8'));
            assert.strictEqual(result.iteration, 19);
        });

        test('interleaved writes do not corrupt file', async () => {
            const fp = path.join(tempDir, 'interleaved.json');

            // Launch 10 concurrent async writes
            const writes = Array.from({ length: 10 }, (_, i) =>
                atomicWriteAsync(fp, JSON.stringify({ writer: i })),
            );
            await Promise.all(writes);

            // File must contain valid JSON
            const content = fs.readFileSync(fp, 'utf-8');
            const parsed = JSON.parse(content);
            assert.ok(typeof parsed.writer === 'number');
        });
    });

    // ── Read After Write ────────────────────────────────────────

    suite('read after write', () => {
        test('immediately readable after sync write', () => {
            const fp = path.join(tempDir, 'readback.json');
            const data = { ts: Date.now(), items: [1, 2, 3] };
            atomicWriteSync(fp, JSON.stringify(data));

            const readBack = JSON.parse(fs.readFileSync(fp, 'utf-8'));
            assert.deepStrictEqual(readBack, data);
        });

        test('stat reflects correct file size', () => {
            const fp = path.join(tempDir, 'sized.json');
            const content = JSON.stringify({ big: 'x'.repeat(4096) });
            atomicWriteSync(fp, content);

            const stat = fs.statSync(fp);
            assert.strictEqual(stat.size, Buffer.byteLength(content, 'utf-8'));
        });
    });

    // ── Graceful File-Not-Found ─────────────────────────────────

    suite('graceful file-not-found', () => {
        test('readFileSync throws ENOENT for missing file', () => {
            const fp = path.join(tempDir, 'nope.json');
            assert.throws(
                () => fs.readFileSync(fp, 'utf-8'),
                (err: NodeJS.ErrnoException) => err.code === 'ENOENT',
            );
        });

        test('existsSync returns false for missing file', () => {
            const fp = path.join(tempDir, 'missing.json');
            assert.strictEqual(fs.existsSync(fp), false);
        });

        test('services handle missing storage gracefully', () => {
            // Simulate the pattern: try to read, return defaults on ENOENT
            const fp = path.join(tempDir, 'store.json');
            let items: unknown[] = [];

            try {
                const raw = fs.readFileSync(fp, 'utf-8');
                items = JSON.parse(raw);
            } catch (err) {
                const e = err as NodeJS.ErrnoException;
                if (e.code === 'ENOENT') {
                    items = []; // default
                } else {
                    throw err;
                }
            }

            assert.deepStrictEqual(items, []);
        });
    });

    // ── Backup Pattern (planArchivalService style) ──────────────

    suite('backup before overwrite', () => {
        test('creates .bak before atomic overwrite', () => {
            const fp = path.join(tempDir, 'backed.json');
            const bakPath = fp + '.bak';

            // Initial write
            atomicWriteSync(fp, '{"version":1}');

            // Backup + overwrite (planArchivalService pattern)
            if (fs.existsSync(fp)) {
                fs.copyFileSync(fp, bakPath);
            }
            atomicWriteSync(fp, '{"version":2}');

            assert.ok(fs.existsSync(bakPath), '.bak should exist');
            const bak = JSON.parse(fs.readFileSync(bakPath, 'utf-8'));
            assert.strictEqual(bak.version, 1);

            const current = JSON.parse(fs.readFileSync(fp, 'utf-8'));
            assert.strictEqual(current.version, 2);
        });
    });
});
