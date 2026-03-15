/**
 * Unit Tests — Schema Migration
 * AICC-0278: Validates v1 → v2 migration, compatibility layer, and round-trip
 */

import * as assert from 'assert';
import { PlanDocument, PlanItem, StatusCounts } from '../../types/plan';
import { PlanDocumentV2, PlanItemV2, defaultPlanSettings } from '../../types/planV2';
import { SchemaMigrationService } from '../../services/schemaMigration';
import { SchemaCompatLayer } from '../../services/schemaCompat';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStatusCounts(overrides: Partial<StatusCounts> = {}): StatusCounts {
  return {
    BACKLOG: 0,
    READY: 0,
    'IN-PROGRESS': 0,
    BLOCKED: 0,
    REVIEW: 0,
    DONE: 0,
    SKIP: 0,
    ...overrides,
  };
}

function makeV1Item(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: 'TASK-001-001-001',
    type: 'task',
    summary: 'Test task',
    status: 'BACKLOG',
    priority: 'medium',
    metadata: {
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-06-15T12:00:00.000Z',
      createdBy: 'tester',
      updatedBy: 'tester',
    },
    ...overrides,
  };
}

function makeV1Doc(overrides: Partial<PlanDocument> = {}): PlanDocument {
  return {
    version: '1.0.0',
    generatedAt: '2025-06-15T12:00:00.000Z',
    source: '.project/plan/epics',
    metadata: { projectName: 'Test', projectCode: 'TST' },
    statusCounts: makeStatusCounts({ BACKLOG: 2, DONE: 1 }),
    items: [
      makeV1Item(),
      makeV1Item({
        id: 'EPIC-001',
        type: 'epic',
        summary: 'Epic One',
        status: 'IN-PROGRESS',
        sprint: 'Sprint-1',
      }),
      makeV1Item({
        id: 'STORY-001-001',
        type: 'story',
        summary: 'Story One',
        status: 'DONE',
        sprint: 'Sprint-1',
        linkedRelationships: [
          { type: 'depends-on', itemId: 'EPIC-001' },
          { type: 'blocks', itemId: 'TASK-001-001-001' },
        ],
        tags: ['backend', 'api'],
      }),
    ],
    ...overrides,
  };
}

function makeV2Doc(): PlanDocumentV2 {
  return {
    $schema: 'plan.v2.schema.json',
    version: '2.0.0',
    generatedAt: '2025-06-15T12:00:00.000Z',
    source: '.project/plan/epics',
    metadata: {
      projectName: 'Test',
      projectCode: 'TST',
      schemaVersion: '2.0.0',
    },
    statusCounts: makeStatusCounts({ BACKLOG: 1 }),
    settings: defaultPlanSettings(),
    items: [
      {
        id: 'TASK-001-001-001',
        type: 'task',
        summary: 'V2 task',
        status: 'BACKLOG',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-06-15T12:00:00.000Z',
        labels: ['infra'],
        effort: 'm',
      } as PlanItemV2,
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

suite('SchemaMigrationService', () => {
  let service: SchemaMigrationService;

  setup(() => {
    service = SchemaMigrationService.getInstance();
  });

  // 1. detectSchemaVersion — v1
  test('detectSchemaVersion returns 1.0.0 for v1 documents', () => {
    const doc = makeV1Doc();
    assert.strictEqual(service.detectSchemaVersion(doc), '1.0.0');
  });

  // 2. detectSchemaVersion — v2
  test('detectSchemaVersion returns 2.0.0 for v2 documents', () => {
    const doc = makeV2Doc();
    assert.strictEqual(service.detectSchemaVersion(doc), '2.0.0');
  });

  // 3. detectSchemaVersion — unknown
  test('detectSchemaVersion returns unknown for unrecognised shapes', () => {
    assert.strictEqual(service.detectSchemaVersion(null), 'unknown');
    assert.strictEqual(service.detectSchemaVersion({}), 'unknown');
    assert.strictEqual(service.detectSchemaVersion({ version: '3.0.0' }), 'unknown');
    assert.strictEqual(service.detectSchemaVersion('string'), 'unknown');
  });

  // 4. needsMigration
  test('needsMigration returns true for v1, false for v2 and unknown', () => {
    assert.strictEqual(service.needsMigration(makeV1Doc()), true);
    assert.strictEqual(service.needsMigration(makeV2Doc()), false);
    assert.strictEqual(service.needsMigration({}), false);
  });

  // 5. migrateV1ToV2 — structural integrity
  test('migrateV1ToV2 produces a valid v2 document', () => {
    const v1 = makeV1Doc();
    const v2 = service.migrateV1ToV2(v1);

    assert.strictEqual(v2.$schema, 'plan.v2.schema.json');
    assert.strictEqual(v2.version, '2.0.0');
    assert.strictEqual(v2.metadata.schemaVersion, '2.0.0');
    assert.strictEqual(v2.metadata.migratedFrom, '1.0.0');
    assert.ok(v2.metadata.migratedAt);
    assert.strictEqual(v2.items.length, v1.items.length);
    assert.deepStrictEqual(v2.settings, defaultPlanSettings());
  });

  // 6. migrateV1ToV2 — item field promotion & dependency extraction
  test('migrateV1ToV2 promotes metadata timestamps and extracts dependencies', () => {
    const v1 = makeV1Doc();
    const v2 = service.migrateV1ToV2(v1);

    // Story with depends-on relationship
    const story = v2.items.find((i) => i.id === 'STORY-001-001') as PlanItemV2;
    assert.ok(story);
    assert.deepStrictEqual(story.dependencies, ['EPIC-001']);
    assert.ok(story.createdAt);
    assert.ok(story.updatedAt);

    // Labels aliased from tags
    assert.deepStrictEqual(story.labels, ['backend', 'api']);
  });

  // 7. migrateV1ToV2 — completedAt for DONE items
  test('migrateV1ToV2 sets completedAt for DONE items', () => {
    const v1 = makeV1Doc();
    const v2 = service.migrateV1ToV2(v1);

    const doneItem = v2.items.find((i) => i.status === 'DONE') as PlanItemV2;
    assert.ok(doneItem);
    assert.ok(doneItem.completedAt);
    assert.strictEqual(doneItem.completedAt, doneItem.metadata?.updatedAt);
  });

  // 8. migrateV1ToV2 — sprint count heuristic
  test('migrateV1ToV2 calculates totalSprints from unique sprint values', () => {
    const v1 = makeV1Doc();
    const v2 = service.migrateV1ToV2(v1);

    // Two items with sprint 'Sprint-1' → 1 unique sprint
    assert.strictEqual(v2.metadata.totalSprints, 1);
  });
});

suite('SchemaCompatLayer', () => {
  let compat: SchemaCompatLayer;

  setup(() => {
    compat = new SchemaCompatLayer();
  });

  // 9. isV1 / isV2 type guards
  test('isV1 and isV2 correctly identify document versions', () => {
    assert.strictEqual(compat.isV1(makeV1Doc()), true);
    assert.strictEqual(compat.isV2(makeV1Doc()), false);
    assert.strictEqual(compat.isV2(makeV2Doc()), true);
    assert.strictEqual(compat.isV1(makeV2Doc()), false);
  });

  // 10. normalize — v1 input produces valid v2
  test('normalize converts v1 input to v2', () => {
    const v2 = compat.normalize(makeV1Doc());
    assert.strictEqual(v2.version, '2.0.0');
    assert.strictEqual(v2.$schema, 'plan.v2.schema.json');
    assert.ok(v2.settings);
  });

  // 11. normalize — v2 input returned as-is
  test('normalize returns v2 input unchanged', () => {
    const original = makeV2Doc();
    const result = compat.normalize(original);
    assert.deepStrictEqual(result, original);
  });

  // 12. normalize — unknown throws
  test('normalize throws on unknown schema', () => {
    assert.throws(() => compat.normalize({}), /unrecognised/);
  });

  // 13. downgradeToV1
  test('downgradeToV1 produces a valid v1 document', () => {
    const v2 = makeV2Doc();
    const v1 = compat.downgradeToV1(v2);

    assert.strictEqual(v1.version, '1.0.0');
    assert.strictEqual((v1 as any).$schema, undefined);
    assert.strictEqual((v1 as any).settings, undefined);
    assert.strictEqual(v1.items.length, v2.items.length);

    // v2-only fields removed
    const item = v1.items[0] as any;
    assert.strictEqual(item.createdAt, undefined);
    assert.strictEqual(item.updatedAt, undefined);
    assert.strictEqual(item.effort, undefined);
  });

  // 14. downgradeToV1 — labels restore to tags
  test('downgradeToV1 restores labels to tags when tags are absent', () => {
    const v2 = makeV2Doc();
    (v2.items[0] as PlanItemV2).labels = ['infra', 'urgent'];
    delete (v2.items[0] as any).tags;

    const v1 = compat.downgradeToV1(v2);
    assert.deepStrictEqual(v1.items[0].tags, ['infra', 'urgent']);
  });

  // 15. Round-trip: v1 → v2 → v1 preserves data
  test('round-trip v1 → v2 → v1 preserves core data', () => {
    const original = makeV1Doc();
    const v2 = compat.normalize(original);
    const roundTripped = compat.downgradeToV1(v2);

    assert.strictEqual(roundTripped.version, '1.0.0');
    assert.strictEqual(roundTripped.items.length, original.items.length);
    assert.strictEqual(roundTripped.source, original.source);
    assert.deepStrictEqual(roundTripped.statusCounts, original.statusCounts);

    // Verify each item ID is preserved
    const originalIds = original.items.map((i) => i.id).sort();
    const rtIds = roundTripped.items.map((i) => i.id).sort();
    assert.deepStrictEqual(rtIds, originalIds);
  });

  // 16. Round-trip preserves item relationships
  test('round-trip preserves linkedRelationships', () => {
    const original = makeV1Doc();
    const v2 = compat.normalize(original);
    const roundTripped = compat.downgradeToV1(v2);

    const origStory = original.items.find((i) => i.id === 'STORY-001-001');
    const rtStory = roundTripped.items.find((i) => i.id === 'STORY-001-001');
    assert.ok(origStory?.linkedRelationships);
    assert.deepStrictEqual(
      rtStory?.linkedRelationships,
      origStory?.linkedRelationships,
    );
  });
});
