/**
 * Schema Compatibility Layer
 * AICC-0277: Transparent adapter that normalises v1 and v2 plan documents
 * and provides downgrade capability for export.
 *
 * Consumers such as {@link PlanGenerator} can call `normalize()` to obtain
 * a guaranteed v2 shape regardless of the on-disk format.
 */

import {
  PlanDocument,
  PlanItem,
  PlanMetadata,
} from '../types/plan';
import {
  PlanDocumentV2,
  PlanItemV2,
} from '../types/planV2';
import { SchemaMigrationService } from './schemaMigration';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/**
 * Provides bidirectional compatibility between plan schema v1 and v2.
 */
export class SchemaCompatLayer {
  private migrationService: SchemaMigrationService;

  constructor() {
    this.migrationService = SchemaMigrationService.getInstance();
  }

  // -----------------------------------------------------------------------
  // Type guards
  // -----------------------------------------------------------------------

  /**
   * Type-guard: returns `true` when `doc` conforms to v1 {@link PlanDocument}.
   */
  public isV1(doc: any): doc is PlanDocument {
    return this.migrationService.detectSchemaVersion(doc) === '1.0.0';
  }

  /**
   * Type-guard: returns `true` when `doc` conforms to v2 {@link PlanDocumentV2}.
   */
  public isV2(doc: any): doc is PlanDocumentV2 {
    return this.migrationService.detectSchemaVersion(doc) === '2.0.0';
  }

  // -----------------------------------------------------------------------
  // Normalisation (always → v2)
  // -----------------------------------------------------------------------

  /**
   * Accept either a v1 or v2 plan document and return a v2 document.
   *
   * - If the input is already v2 it is returned as-is.
   * - If the input is v1 it is migrated via {@link SchemaMigrationService}.
   * - Unknown shapes throw an error.
   *
   * @param doc - A parsed plan JSON object (v1 or v2)
   * @returns A valid {@link PlanDocumentV2}
   * @throws {Error} When the document shape is unrecognised
   */
  public normalize(doc: any): PlanDocumentV2 {
    if (this.isV2(doc)) {
      logger.info('SchemaCompat: document is already v2');
      return doc as PlanDocumentV2;
    }

    if (this.isV1(doc)) {
      logger.info('SchemaCompat: migrating v1 document to v2');
      return this.migrationService.migrateV1ToV2(doc as PlanDocument);
    }

    throw new Error(
      'SchemaCompat.normalize: unrecognised plan document schema',
    );
  }

  // -----------------------------------------------------------------------
  // Downgrade (v2 → v1)
  // -----------------------------------------------------------------------

  /**
   * Downgrade a v2 {@link PlanDocumentV2} back to a v1 {@link PlanDocument}.
   *
   * Fields introduced in v2 that have no v1 equivalent are dropped. The
   * v2-only item fields (`createdAt`, `updatedAt`, `completedAt`,
   * `blockedReason`, `reviewers`, `labels`, `effort`, `dependencies`) are
   * removed from each item. `labels` are written back to `tags` if
   * `tags` is empty.
   *
   * @param v2Doc - A valid v2 plan document
   * @returns A valid v1 plan document
   */
  public downgradeToV1(v2Doc: PlanDocumentV2): PlanDocument {
    logger.info('SchemaCompat: downgrading v2 document to v1', {
      itemCount: v2Doc.items.length,
    });

    const items: PlanItem[] = v2Doc.items.map((v2Item) =>
      this.downgradeItem(v2Item),
    );

    // Strip v2-only metadata fields
    const metadata: PlanMetadata = {
      projectName: v2Doc.metadata.projectName,
      projectCode: v2Doc.metadata.projectCode,
      currentSprint: v2Doc.metadata.currentSprint,
      currentMilestone: v2Doc.metadata.currentMilestone,
      defaultAssignee: v2Doc.metadata.defaultAssignee,
      defaultAgent: v2Doc.metadata.defaultAgent,
      createdBy: v2Doc.metadata.createdBy,
      updatedBy: v2Doc.metadata.updatedBy,
    };

    const v1Doc: PlanDocument = {
      version: '1.0.0',
      generatedAt: v2Doc.generatedAt,
      source: v2Doc.source,
      metadata,
      statusCounts: { ...v2Doc.statusCounts },
      items,
    };

    return v1Doc;
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  /**
   * Downgrade a single {@link PlanItemV2} to {@link PlanItem} by stripping
   * v2-only fields and restoring `tags` from `labels` when applicable.
   */
  private downgradeItem(v2Item: PlanItemV2): PlanItem {
    // Destructure v2-only fields away; keep the rest
    const {
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      completedAt: _completedAt,
      blockedReason: _blockedReason,
      reviewers: _reviewers,
      labels,
      effort: _effort,
      dependencies: _dependencies,
      ...v1Fields
    } = v2Item;

    const item: PlanItem = { ...v1Fields };

    // Restore labels → tags when tags are empty/missing
    if (labels && labels.length > 0 && (!item.tags || item.tags.length === 0)) {
      item.tags = [...labels];
    }

    return item;
  }
}
