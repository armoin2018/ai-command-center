/**
 * Integration Tests — MCP Tool Definitions & AiccMsg Envelope
 * AICC-0448 Sprint 28: Tool shape validation, envelope fields, getTools() registries,
 *                       input-schema compliance, error envelope
 *
 * Validates that every exported McpToolDefinition from the planning CRUD,
 * bulk operations, discovery, ideation, pipeline, health, velocity, telemetry,
 * prompt, offline-queue, memory, knowledge, confluence, and skill-registration
 * tool modules adheres to the shared contract.
 */

import * as assert from 'assert';
import type {
    McpToolDefinition,
    McpToolResult,
} from '../../mcp/tools/planningCrudTools';

// ─── Tool module imports ─────────────────────────────────────────────

import { getTools as getPlanningTools } from '../../mcp/tools/planningCrudTools';
import { getTools as getBulkTools } from '../../mcp/tools/bulkOperationTools';
import { getTools as getDiscoveryTools } from '../../mcp/tools/discoveryTools';
import { getIdeationTools } from '../../mcp/tools/ideationTools';
import { getPipelineTools } from '../../mcp/tools/pipelineTools';
import { getHealthTools } from '../../mcp/tools/healthTools';
import { getVelocityTools } from '../../mcp/tools/velocityTools';
import { getTelemetryTools } from '../../mcp/tools/telemetryTools';
import { getPromptTools } from '../../mcp/tools/promptTools';
import { getOfflineQueueTools } from '../../mcp/tools/offlineQueueTools';
import { getMemoryTools } from '../../mcp/tools/memoryTools';
import { getKnowledgeTools } from '../../mcp/tools/knowledgeTools';
import { getConfluenceTools } from '../../mcp/tools/confluenceTools';
import { getSkillRegistrationTools } from '../../mcp/tools/skillRegistrationTools';

// ─── Helpers ─────────────────────────────────────────────────────────

/** Flatten every tool registry into a single array for shared assertions. */
function allTools(): McpToolDefinition[] {
    return [
        ...getPlanningTools(),
        ...getBulkTools(),
        ...getDiscoveryTools(),
        ...getIdeationTools(),
        ...getPipelineTools(),
        ...getHealthTools(),
        ...getVelocityTools(),
        ...getTelemetryTools(),
        ...getPromptTools(),
        ...getOfflineQueueTools(),
        ...getMemoryTools(),
        ...getKnowledgeTools(),
        ...getConfluenceTools(),
        ...getSkillRegistrationTools(),
    ];
}

// ─── Tests ───────────────────────────────────────────────────────────

suite('MCP Tools Integration Tests', () => {

    // ── Tool Shape ──────────────────────────────────────────────

    suite('McpToolDefinition shape', () => {
        test('every tool has a non-empty name', () => {
            for (const tool of allTools()) {
                assert.ok(
                    typeof tool.name === 'string' && tool.name.length > 0,
                    `Tool name must be a non-empty string, got "${tool.name}"`,
                );
            }
        });

        test('every tool has a description', () => {
            for (const tool of allTools()) {
                assert.ok(
                    typeof tool.description === 'string' && tool.description.length > 0,
                    `Tool "${tool.name}" must have a description`,
                );
            }
        });

        test('every tool has an inputSchema with type "object"', () => {
            for (const tool of allTools()) {
                const schema = tool.inputSchema as Record<string, unknown>;
                assert.ok(schema, `Tool "${tool.name}" must have inputSchema`);
                assert.strictEqual(
                    schema.type,
                    'object',
                    `Tool "${tool.name}" inputSchema.type must be "object"`,
                );
            }
        });

        test('every tool has a handler function', () => {
            for (const tool of allTools()) {
                assert.strictEqual(
                    typeof tool.handler,
                    'function',
                    `Tool "${tool.name}" must have a handler function`,
                );
            }
        });

        test('tool names are globally unique', () => {
            const names = allTools().map((t) => t.name);
            const unique = new Set(names);
            assert.strictEqual(
                names.length,
                unique.size,
                `Duplicate tool names detected: ${names.filter((n, i) => names.indexOf(n) !== i).join(', ')}`,
            );
        });
    });

    // ── Input Schema ────────────────────────────────────────────

    suite('inputSchema compliance', () => {
        test('schemas that declare required must list string arrays', () => {
            for (const tool of allTools()) {
                const schema = tool.inputSchema as Record<string, unknown>;
                if ('required' in schema) {
                    assert.ok(
                        Array.isArray(schema.required),
                        `Tool "${tool.name}" required must be an array`,
                    );
                    for (const r of schema.required as unknown[]) {
                        assert.strictEqual(
                            typeof r,
                            'string',
                            `Tool "${tool.name}" required entries must be strings`,
                        );
                    }
                }
            }
        });

        test('schemas with properties must have an object of objects', () => {
            for (const tool of allTools()) {
                const schema = tool.inputSchema as Record<string, unknown>;
                if ('properties' in schema) {
                    assert.strictEqual(
                        typeof schema.properties,
                        'object',
                        `Tool "${tool.name}" properties must be an object`,
                    );
                    assert.ok(
                        !Array.isArray(schema.properties),
                        `Tool "${tool.name}" properties must not be an array`,
                    );
                }
            }
        });

        test('each property has a type or $ref', () => {
            for (const tool of allTools()) {
                const schema = tool.inputSchema as Record<string, unknown>;
                const props = schema.properties as Record<string, Record<string, unknown>> | undefined;
                if (!props) { continue; }

                for (const [key, propSchema] of Object.entries(props)) {
                    assert.ok(
                        'type' in propSchema || '$ref' in propSchema,
                        `Tool "${tool.name}" property "${key}" must have a "type" or "$ref"`,
                    );
                }
            }
        });
    });

    // ── McpToolResult / AiccMsg Envelope ────────────────────────

    suite('AiccMsg envelope', () => {
        test('successful envelope has correct shape', () => {
            const result: McpToolResult = {
                success: true,
                data: { items: [] },
                meta: {
                    toolName: 'test_tool',
                    duration: 42,
                    timestamp: new Date().toISOString(),
                },
            };

            assert.strictEqual(result.success, true);
            assert.ok(result.data !== undefined);
            assert.strictEqual(result.errors, undefined);
            assert.strictEqual(result.meta.toolName, 'test_tool');
            assert.strictEqual(typeof result.meta.duration, 'number');
            assert.ok(result.meta.timestamp);
        });

        test('error envelope includes errors array', () => {
            const result: McpToolResult = {
                success: false,
                data: null,
                errors: ['Missing required field: title'],
                meta: {
                    toolName: 'create_story_full',
                    duration: 1,
                    timestamp: new Date().toISOString(),
                },
            };

            assert.strictEqual(result.success, false);
            assert.ok(Array.isArray(result.errors));
            assert.ok(result.errors!.length > 0);
            assert.ok(result.errors![0].includes('title'));
        });

        test('meta.duration is non-negative', () => {
            const result: McpToolResult = {
                success: true,
                data: {},
                meta: {
                    toolName: 'test',
                    duration: 0,
                    timestamp: new Date().toISOString(),
                },
            };
            assert.ok(result.meta.duration >= 0);
        });

        test('meta.timestamp is a valid ISO string', () => {
            const ts = new Date().toISOString();
            const result: McpToolResult = {
                success: true,
                data: {},
                meta: { toolName: 'test', duration: 0, timestamp: ts },
            };
            const parsed = Date.parse(result.meta.timestamp);
            assert.ok(!isNaN(parsed), 'Timestamp must be a valid date');
        });
    });

    // ── Registry Completeness ───────────────────────────────────

    suite('tool registries', () => {
        test('planning CRUD tools include CRUD operations', () => {
            const tools = getPlanningTools();
            const names = tools.map((t) => t.name);
            assert.ok(names.some((n) => n.includes('create')), 'Should have a create tool');
            assert.ok(names.some((n) => n.includes('update')), 'Should have an update tool');
            assert.ok(names.some((n) => n.includes('delete')), 'Should have a delete tool');
            assert.ok(names.some((n) => n.includes('list')), 'Should have a list tool');
        });

        test('each registry returns at least one tool', () => {
            const registries = [
                { name: 'planning', tools: getPlanningTools() },
                { name: 'bulk', tools: getBulkTools() },
                { name: 'discovery', tools: getDiscoveryTools() },
                { name: 'ideation', tools: getIdeationTools() },
                { name: 'pipeline', tools: getPipelineTools() },
                { name: 'health', tools: getHealthTools() },
                { name: 'velocity', tools: getVelocityTools() },
                { name: 'telemetry', tools: getTelemetryTools() },
                { name: 'prompt', tools: getPromptTools() },
                { name: 'offlineQueue', tools: getOfflineQueueTools() },
                { name: 'memory', tools: getMemoryTools() },
                { name: 'knowledge', tools: getKnowledgeTools() },
                { name: 'confluence', tools: getConfluenceTools() },
                { name: 'skillRegistration', tools: getSkillRegistrationTools() },
            ];

            for (const reg of registries) {
                assert.ok(
                    reg.tools.length > 0,
                    `Registry "${reg.name}" must return at least one tool`,
                );
            }
        });

        test('total tool count is reasonable (> 20)', () => {
            const total = allTools().length;
            assert.ok(
                total > 20,
                `Expected > 20 tools across all registries, got ${total}`,
            );
        });
    });
});
