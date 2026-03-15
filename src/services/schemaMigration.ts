/**
 * Schema Migration Service
 * AICC-0276: Migrates PLAN.json documents from v1 → v2 schema.
 *
 * Responsibilities:
 *  - Detect schema version of an arbitrary plan document
 *  - Perform lossless v1 → v2 migration
 *  - Report whether a document requires migration
 */

import { PlanDocument, PlanItem } from '../types/plan';
import {
  PlanDocumentV2,
  PlanItemV2,
  PlanMetadataV2,
  PlanSettings,
  defaultPlanSettings,
} from '../types/planV2';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/** Recognised schema version strings */
export type SchemaVersion = '1.0.0' | '2.0.0' | 'unknown';

/**
 * Singleton service responsible for plan-document schema migration.
 */
export class SchemaMigrationService {
  private static instance: SchemaMigrationService;

  private constructor() {}

  /** Obtain the singleton instance */
  public static getInstance(): SchemaMigrationService {
    if (!SchemaMigrationService.instance) {
      SchemaMigrationService.instance = new SchemaMigrationService();
    }
    return SchemaMigrationService.instance;
  }

  // -----------------------------------------------------------------------
  // Version detection
  // -----------------------------------------------------------------------

  /**
   * Detect the schema version of an arbitrary plan document.
   *
   * @param doc - A parsed plan JSON object (v1, v2, or unknown shape)
   * @returns The detected {@link SchemaVersion}
   */
  public detectSchemaVersion(doc: any): SchemaVersion {
    if (!doc || typeof doc !== 'object') {
      return 'unknown';
    }

    // v2 is identified by its $schema sentinel and version field
    if (doc.$schema === 'plan.v2.schema.json' && doc.version === '2.0.0') {
      return '2.0.0';
    }

    // v1 uses version '1.0.0' and lacks $schema
    if (doc.version === '1.0.0' && Array.isArray(doc.items)) {
      return '1.0.0';
    }

    return 'unknown';
  }

  /**
   * Determine whether a document needs migration to v2.
   *
   * @param doc - A parsed plan JSON object
   * @returns `true` when the document is v1 and can be migrated
   */
  public needsMigration(doc: any): boolean {
    return this.detectSchemaVersion(doc) === '1.0.0';
  }

  // -----------------------------------------------------------------------
  // Migration
  // -----------------------------------------------------------------------

  /**
   * Migrate a v1 {@link PlanDocument} to v2 {@link PlanDocumentV2}.
   *
   * Migration rules:
   *  1. All existing fields are preserved.
   *  2. `$schema` is set and `version` bumped to `2.0.0`.
   *  3. Default {@link PlanSettings} are injected.
   *  4. `metadata.createdAt` / `updatedAt` are promoted to top-level item fields.
   *  5. `linkedRelationships` entries of type `depends-on` are flattened into
   *     a `dependencies[]` string array on each item.
   *  6. Items with status `DONE` receive a `completedAt` timestamp.
   *  7. Provenance fields `migratedFrom` / `migratedAt` are recorded.
   *
   * @param v1Doc - A valid v1 plan document
   * @returns A fully-populated v2 plan document
   */
  public migrateV1ToV2(v1Doc: PlanDocument): PlanDocumentV2 {
    const migratedAt = new Date().toISOString();

    logger.info('Starting v1 → v2 schema migration', {
      itemCount: v1Doc.items.length,
    });

    // Migrate items
    const items: PlanItemV2[] = v1Doc.items.map((item) =>
      this.migrateItem(item, migratedAt),
    );

    // Build v2 metadata
    const metadata: PlanMetadataV2 = {
      ...v1Doc.metadata,
      schemaVersion: '2.0.0',
      migratedFrom: '1.0.0',
      migratedAt,
    };

    // Compute sprint count heuristic
    const sprintSet = new Set<string>();
    for (const item of v1Doc.items) {
      if (item.sprint) {
        sprintSet.add(item.sprint);
      }
    }
    if (sprintSet.size > 0) {
      metadata.totalSprints = sprintSet.size;
    }

    const settings: PlanSettings = defaultPlanSettings();

    const v2Doc: PlanDocumentV2 = {
      $schema: 'plan.v2.schema.json',
      version: '2.0.0',
      generatedAt: v1Doc.generatedAt,
      source: v1Doc.source,
      metadata,
      statusCounts: { ...v1Doc.statusCounts },
      settings,
      items,
    };

    logger.info('Schema migration v1 → v2 complete', {
      itemCount: items.length,
      migratedAt,
    });

    return v2Doc;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Migrate a single v1 PlanItem to PlanItemV2.
   */
  private migrateItem(item: PlanItem, migratedAt: string): PlanItemV2 {
    const v2Item: PlanItemV2 = { ...item };

    // Promote metadata timestamps to top-level fields
    if (item.metadata) {
      v2Item.createdAt = item.metadata.createdAt;
      v2Item.updatedAt = item.metadata.updatedAt;
    }

    // Set completedAt for DONE items
    if (item.status === 'DONE') {
      v2Item.completedAt =
        item.metadata?.updatedAt || migratedAt;
    }

    // Flatten depends-on relationships into dependencies[]
    if (item.linkedRelationships && item.linkedRelationships.length > 0) {
      const deps = item.linkedRelationships
        .filter((rel) => rel.type === 'depends-on')
        .map((rel) => rel.itemId);

      if (deps.length > 0) {
        v2Item.dependencies = deps;
      }
    }

    // Alias tags → labels (only if tags exist and labels are not already set)
    if (item.tags && item.tags.length > 0 && !v2Item.labels) {
      v2Item.labels = [...item.tags];
    }

    return v2Item;
  }
}
