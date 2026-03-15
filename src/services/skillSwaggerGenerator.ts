/**
 * Skill Swagger / OpenAPI Generator Service
 *
 * Generates per-skill OpenAPI 3.0 fragments and aggregates them into
 * a master specification that can be served by the Swagger UI.
 *
 * Part of AICC-0129: Per-skill Swagger & aggregated OpenAPI
 *   - AICC-0355: Implement per-skill swagger.json generation
 *   - AICC-0356: Build aggregation service
 *   - AICC-0357: Wire Swagger UI integration
 */

import { Logger } from '../logger';
import type { DiscoveredSkill, SkillAction } from './skillIntrospector';

// ─── Types ───────────────────────────────────────────────────────────

/** JSON Schema property descriptor (subset used in OpenAPI). */
interface SchemaProperty {
    type: string;
    description?: string;
    default?: string;
}

/** A single OpenAPI path item with POST method. */
interface PathItem {
    post: {
        tags: string[];
        summary: string;
        description: string;
        operationId: string;
        requestBody: {
            required: boolean;
            content: {
                'application/json': {
                    schema: {
                        type: string;
                        properties: Record<string, SchemaProperty>;
                        required?: string[];
                    };
                };
            };
        };
        responses: Record<string, ResponseObject>;
    };
}

/** OpenAPI response object (simplified). */
interface ResponseObject {
    description: string;
    content?: {
        'application/json': {
            schema: { '$ref': string } | Record<string, unknown>;
        };
    };
}

/**
 * Per-skill OpenAPI spec fragment.
 */
export interface OpenAPISkillSpec {
    /** Skill identifier */
    skillId: string;
    /** Skill human name */
    skillName: string;
    /** Tag used to group paths */
    tag: string;
    /** Path items keyed by route */
    paths: Record<string, PathItem>;
    /** Component schemas specific to this skill */
    schemas: Record<string, Record<string, unknown>>;
}

/**
 * Aggregated OpenAPI 3.0 specification combining all skill specs.
 */
export interface AggregatedOpenAPISpec {
    openapi: string;
    info: {
        title: string;
        description: string;
        version: string;
    };
    servers: Array<{ url: string; description: string }>;
    tags: Array<{ name: string; description: string }>;
    paths: Record<string, PathItem>;
    components: {
        schemas: Record<string, Record<string, unknown>>;
    };
}

// ─── SkillSwaggerGenerator ───────────────────────────────────────────

/**
 * Singleton service that generates OpenAPI 3.0 specs from
 * {@link DiscoveredSkill} entries and aggregates them into
 * a master specification served at `/swagger`.
 */
export class SkillSwaggerGenerator {
    private static instance: SkillSwaggerGenerator | undefined;

    private readonly logger: Logger;

    /** Cached per-skill specs keyed by skillId */
    private readonly specCache = new Map<string, OpenAPISkillSpec>();

    /** Cached aggregated spec */
    private cachedAggregation: AggregatedOpenAPISpec | undefined;

    /** Timestamp of last aggregation build */
    private aggregationBuiltAt = 0;

    /** Cache TTL in milliseconds (default 60 s) */
    private readonly cacheTtlMs: number;

    private constructor(cacheTtlMs = 60_000) {
        this.logger = Logger.getInstance();
        this.cacheTtlMs = cacheTtlMs;
    }

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(cacheTtlMs?: number): SkillSwaggerGenerator {
        if (!SkillSwaggerGenerator.instance) {
            SkillSwaggerGenerator.instance = new SkillSwaggerGenerator(
                cacheTtlMs,
            );
        }
        return SkillSwaggerGenerator.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        SkillSwaggerGenerator.instance = undefined;
    }

    // ── Per-Skill Spec (AICC-0355) ──────────────────────────────

    /**
     * Generate an OpenAPI 3.0 fragment for a single skill.
     *
     * Each skill action becomes a `POST /api/skills/{skillName}/{action}`
     * path entry. Request/response schemas include the AiccMsg envelope.
     */
    public generateSkillSpec(skill: DiscoveredSkill): OpenAPISkillSpec {
        const tag = skill.name;
        const paths: Record<string, PathItem> = {};
        const schemas: Record<string, Record<string, unknown>> = {};

        for (const action of skill.actions) {
            const routePath = `/api/skills/${encodeURIComponent(skill.name)}/${encodeURIComponent(action.name)}`;
            const operationId = `${sanitiseOperationId(skill.name)}_${sanitiseOperationId(action.name)}`;

            // Build request schema
            const { properties, required } =
                buildRequestSchema(action);

            const requestSchemaName = `${operationId}_Request`;
            schemas[requestSchemaName] = {
                type: 'object',
                properties,
                ...(required.length > 0 ? { required } : {}),
            };

            // Build response schema name (reuses shared AiccMsg)
            const pathItem: PathItem = {
                post: {
                    tags: [tag],
                    summary: action.description,
                    description: `Invoke the **${action.name}** action on skill **${skill.name}**.\n\nReturns a standardised AiccMsg envelope.`,
                    operationId,
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties,
                                    ...(required.length > 0
                                        ? { required }
                                        : {}),
                                },
                            },
                        },
                    },
                    responses: {
                        '200': {
                            description: 'Successful execution',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/AiccMsg',
                                    },
                                },
                            },
                        },
                        '400': {
                            description:
                                'Validation error — missing or invalid parameters',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/AiccMsg',
                                    },
                                },
                            },
                        },
                        '404': {
                            description: 'Skill or action not found',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/AiccMsg',
                                    },
                                },
                            },
                        },
                        '500': {
                            description: 'Internal execution error',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/AiccMsg',
                                    },
                                },
                            },
                        },
                    },
                },
            };

            paths[routePath] = pathItem;
        }

        const spec: OpenAPISkillSpec = {
            skillId: skill.id,
            skillName: skill.name,
            tag,
            paths,
            schemas,
        };

        // Cache
        this.specCache.set(skill.id, spec);
        this.invalidateAggregation();

        this.logger.debug(
            `Generated OpenAPI spec for skill "${skill.name}" — ${Object.keys(paths).length} path(s)`,
            { component: 'SkillSwaggerGenerator', skillId: skill.id },
        );

        return spec;
    }

    /**
     * Remove a skill's cached spec (e.g. on unregistration).
     */
    public removeSkillSpec(skillId: string): void {
        if (this.specCache.delete(skillId)) {
            this.invalidateAggregation();
            this.logger.debug(
                `Removed cached OpenAPI spec for skill "${skillId}"`,
                { component: 'SkillSwaggerGenerator' },
            );
        }
    }

    // ── Aggregation (AICC-0356) ─────────────────────────────────

    /**
     * Merge all per-skill specs into a single master OpenAPI 3.0 spec.
     *
     * @param skills - Optional list of skills to include; if omitted
     *                 all cached specs are used.
     */
    public aggregateSpecs(
        skills?: DiscoveredSkill[],
    ): AggregatedOpenAPISpec {
        // If explicit skills provided, generate specs first
        if (skills) {
            for (const skill of skills) {
                if (!this.specCache.has(skill.id)) {
                    this.generateSkillSpec(skill);
                }
            }
        }

        const mergedPaths: Record<string, PathItem> = {};
        const mergedSchemas: Record<string, Record<string, unknown>> =
            {};
        const tags: Array<{ name: string; description: string }> = [];
        const seenTags = new Set<string>();

        for (const spec of this.specCache.values()) {
            // Merge paths
            for (const [route, pathItem] of Object.entries(spec.paths)) {
                mergedPaths[route] = pathItem;
            }

            // Merge schemas
            for (const [name, schema] of Object.entries(spec.schemas)) {
                mergedSchemas[name] = schema;
            }

            // Collect tags
            if (!seenTags.has(spec.tag)) {
                seenTags.add(spec.tag);
                tags.push({
                    name: spec.tag,
                    description: `Operations for the ${spec.skillName} skill`,
                });
            }
        }

        // Always include the AiccMsg envelope schema
        mergedSchemas['AiccMsg'] = buildAiccMsgSchema();

        const aggregated: AggregatedOpenAPISpec = {
            openapi: '3.0.0',
            info: {
                title: 'AI Command Center — Skill API',
                description:
                    'Auto-generated REST API for AI-ley skills.\n\n' +
                    'Each skill exposes its actions as `POST /api/skills/{skillName}/{action}` endpoints. ' +
                    'All responses use the standardised **AiccMsg** envelope.',
                version: '1.0.0',
            },
            servers: [
                {
                    url: 'http://localhost:3000',
                    description: 'Local MCP Server',
                },
            ],
            tags,
            paths: mergedPaths,
            components: {
                schemas: mergedSchemas,
            },
        };

        this.cachedAggregation = aggregated;
        this.aggregationBuiltAt = Date.now();

        this.logger.info(
            `Aggregated OpenAPI spec — ${Object.keys(mergedPaths).length} path(s), ${tags.length} tag(s)`,
            { component: 'SkillSwaggerGenerator' },
        );

        return aggregated;
    }

    // ── Cached Retrieval (AICC-0357) ────────────────────────────

    /**
     * Return the cached aggregated spec, rebuilding if the cache
     * has expired or been invalidated.
     */
    public getAggregatedSpec(): AggregatedOpenAPISpec {
        if (
            this.cachedAggregation &&
            Date.now() - this.aggregationBuiltAt < this.cacheTtlMs
        ) {
            return this.cachedAggregation;
        }
        return this.aggregateSpecs();
    }

    /**
     * Serialise the aggregated spec to a JSON string.
     * Suitable for serving at `/swagger/skills.json`.
     */
    public getAggregatedSpecJson(): string {
        return JSON.stringify(this.getAggregatedSpec(), null, 2);
    }

    // ── Private helpers ──────────────────────────────────────────

    /**
     * Invalidate the cached aggregation so it is rebuilt on next access.
     */
    private invalidateAggregation(): void {
        this.aggregationBuiltAt = 0;
        this.cachedAggregation = undefined;
    }
}

// ─── Utility functions ───────────────────────────────────────────────

/**
 * Sanitise a name for use as an OpenAPI operationId segment.
 */
function sanitiseOperationId(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
}

/**
 * Build JSON Schema properties and required array from a {@link SkillAction}.
 */
function buildRequestSchema(action: SkillAction): {
    properties: Record<string, SchemaProperty>;
    required: string[];
} {
    const properties: Record<string, SchemaProperty> = {};
    const required: string[] = [];

    for (const param of action.parameters) {
        properties[param.name] = {
            type: mapType(param.type),
            description: param.description,
            ...(param.default !== undefined
                ? { default: param.default }
                : {}),
        };
        if (param.required) {
            required.push(param.name);
        }
    }

    return { properties, required };
}

/**
 * Map skill parameter type to JSON Schema type.
 */
function mapType(paramType: string): string {
    switch (paramType.toLowerCase()) {
        case 'number':
        case 'integer':
            return 'number';
        case 'boolean':
            return 'boolean';
        case 'object':
            return 'object';
        case 'array':
            return 'array';
        default:
            return 'string';
    }
}

/**
 * Build the shared AiccMsg envelope schema for use in `components.schemas`.
 */
function buildAiccMsgSchema(): Record<string, unknown> {
    return {
        type: 'object',
        description:
            'Standardised response envelope for all skill REST endpoints.',
        properties: {
            success: {
                type: 'boolean',
                description: 'Whether the action executed successfully',
            },
            data: {
                description:
                    'Action result payload (shape varies by action)',
                nullable: true,
            },
            errors: {
                type: 'array',
                items: { type: 'string' },
                description:
                    'Error messages (present only on failure)',
            },
            meta: {
                type: 'object',
                properties: {
                    skillId: {
                        type: 'string',
                        description: 'Identifier of the skill',
                    },
                    action: {
                        type: 'string',
                        description: 'Name of the action executed',
                    },
                    duration: {
                        type: 'number',
                        description: 'Execution time in milliseconds',
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        description:
                            'ISO-8601 timestamp of the response',
                    },
                },
                required: [
                    'skillId',
                    'action',
                    'duration',
                    'timestamp',
                ],
            },
        },
        required: ['success', 'data', 'meta'],
    };
}

/**
 * Helper used by {@link buildRequestSchema}.
 * Re-exported for convenience when external modules need to map
 * parameter types to JSON Schema.
 */
export { mapType as mapParameterType };
