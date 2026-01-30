/**
 * OpenAPI Specification Generator
 * 
 * Auto-generates OpenAPI 3.0 specification from MCP server tools and endpoints
 */

import { MCPServerConfig } from './mcpServer';

export interface OpenAPISpec {
    openapi: string;
    info: {
        title: string;
        description: string;
        version: string;
        contact: {
            name: string;
            url: string;
        };
        license: {
            name: string;
            url: string;
        };
    };
    servers: Array<{
        url: string;
        description: string;
    }>;
    paths: Record<string, any>;
    components: {
        schemas: Record<string, any>;
        securitySchemes?: Record<string, any>;
    };
}

/**
 * Generate OpenAPI 3.0 specification for MCP server
 */
export function generateOpenAPISpec(config: MCPServerConfig): OpenAPISpec {
    const protocol = config.transport === 'https' ? 'https' : 'http';
    const host = config.host || 'localhost';
    const port = config.port || 3000;
    const baseUrl = `${protocol}://${host}:${port}`;

    const spec: OpenAPISpec = {
        openapi: '3.0.0',
        info: {
            title: 'AI Command Center - MCP Server API',
            description: `Model Context Protocol (MCP) server for AI Command Center extension.

This API provides access to planning resources, tools, and prompts for AI agents.

## Features
- Planning management (Epics, Stories, Tasks)
- Jira integration and synchronization
- File operations and workspace management
- Code analysis and diagram generation
- Real-time WebSocket updates

## Authentication
${config.transport === 'https' ? 'This server uses HTTPS with self-signed certificates. Trust the certificate in your system to connect.' : 'This server runs on HTTP (localhost-only by default).'}

## Transports
- stdio: Command-line interface for local agents
- http: REST API for remote clients
- https: Secure REST API with TLS
- websocket: Real-time bidirectional communication`,
            version: '1.0.21',
            contact: {
                name: 'AI Command Center',
                url: 'https://github.com/yourusername/ai-command-center'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: baseUrl,
                description: `MCP Server (${config.transport.toUpperCase()} Transport)`
            }
        ],
        paths: {
            '/health': {
                get: {
                    summary: 'Health Check',
                    description: 'Check if the MCP server is running and healthy',
                    operationId: 'getHealth',
                    tags: ['Health'],
                    responses: {
                        '200': {
                            description: 'Server is healthy',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            status: {
                                                type: 'string',
                                                example: 'ok'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/mcp/log': {
                post: {
                    summary: 'Submit Client Logs',
                    description: 'Send log entries from client applications to the server for centralized logging',
                    operationId: 'postLog',
                    tags: ['Logging'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['level', 'message', 'source'],
                                    properties: {
                                        level: {
                                            type: 'string',
                                            enum: ['DEBUG', 'INFO', 'WARN', 'ERROR'],
                                            description: 'Log level'
                                        },
                                        message: {
                                            type: 'string',
                                            description: 'Log message'
                                        },
                                        source: {
                                            type: 'string',
                                            description: 'Source of the log (e.g., "webview", "client")'
                                        },
                                        data: {
                                            type: 'object',
                                            description: 'Additional structured data'
                                        }
                                    }
                                },
                                examples: {
                                    info: {
                                        summary: 'Info log example',
                                        value: {
                                            level: 'INFO',
                                            message: 'User clicked epic',
                                            source: 'webview',
                                            data: { epicId: 'epic-001' }
                                        }
                                    },
                                    error: {
                                        summary: 'Error log example',
                                        value: {
                                            level: 'ERROR',
                                            message: 'Failed to fetch planning tree',
                                            source: 'webview',
                                            data: { error: 'Network timeout' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Log entry received successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            success: {
                                                type: 'boolean',
                                                example: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid log entry',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            error: {
                                                type: 'string',
                                                example: 'Missing required field: level'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/': {
                post: {
                    summary: 'MCP Protocol Request',
                    description: 'Send Model Context Protocol requests to access resources, tools, and prompts',
                    operationId: 'postMCPRequest',
                    tags: ['MCP Protocol'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['jsonrpc', 'method', 'id'],
                                    properties: {
                                        jsonrpc: {
                                            type: 'string',
                                            example: '2.0',
                                            description: 'JSON-RPC version'
                                        },
                                        method: {
                                            type: 'string',
                                            enum: [
                                                'resources/list',
                                                'resources/read',
                                                'tools/list',
                                                'tools/call',
                                                'prompts/list',
                                                'prompts/get'
                                            ],
                                            description: 'MCP method to call'
                                        },
                                        params: {
                                            type: 'object',
                                            description: 'Method parameters'
                                        },
                                        id: {
                                            type: 'string',
                                            description: 'Request ID'
                                        }
                                    }
                                },
                                examples: {
                                    listResources: {
                                        summary: 'List available resources',
                                        value: {
                                            jsonrpc: '2.0',
                                            method: 'resources/list',
                                            params: {},
                                            id: '1'
                                        }
                                    },
                                    listTools: {
                                        summary: 'List available tools',
                                        value: {
                                            jsonrpc: '2.0',
                                            method: 'tools/list',
                                            params: {},
                                            id: '2'
                                        }
                                    },
                                    callTool: {
                                        summary: 'Call a tool',
                                        value: {
                                            jsonrpc: '2.0',
                                            method: 'tools/call',
                                            params: {
                                                name: 'create_epic',
                                                arguments: {
                                                    title: 'New Feature',
                                                    description: 'Implement new feature',
                                                    priority: 'high'
                                                }
                                            },
                                            id: '3'
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'MCP response',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            jsonrpc: {
                                                type: 'string',
                                                example: '2.0'
                                            },
                                            result: {
                                                type: 'object',
                                                description: 'Method result'
                                            },
                                            id: {
                                                type: 'string',
                                                description: 'Request ID'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        components: {
            schemas: {
                Epic: {
                    type: 'object',
                    required: ['id', 'title', 'status'],
                    properties: {
                        id: {
                            type: 'string',
                            example: 'epic-001'
                        },
                        title: {
                            type: 'string',
                            example: 'User Authentication System'
                        },
                        description: {
                            type: 'string',
                            example: 'Implement complete user authentication with OAuth'
                        },
                        status: {
                            type: 'string',
                            enum: ['todo', 'in-progress', 'done'],
                            example: 'in-progress'
                        },
                        priority: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'critical'],
                            example: 'high'
                        },
                        stories: {
                            type: 'array',
                            items: {
                                type: 'string'
                            },
                            example: ['story-001', 'story-002']
                        }
                    }
                },
                Story: {
                    type: 'object',
                    required: ['id', 'title', 'epicId'],
                    properties: {
                        id: {
                            type: 'string',
                            example: 'story-001'
                        },
                        title: {
                            type: 'string',
                            example: 'User login with email/password'
                        },
                        epicId: {
                            type: 'string',
                            example: 'epic-001'
                        },
                        description: {
                            type: 'string'
                        },
                        status: {
                            type: 'string',
                            enum: ['todo', 'in-progress', 'done']
                        },
                        tasks: {
                            type: 'array',
                            items: {
                                type: 'string'
                            }
                        }
                    }
                },
                Task: {
                    type: 'object',
                    required: ['id', 'title', 'storyId'],
                    properties: {
                        id: {
                            type: 'string',
                            example: 'task-001'
                        },
                        title: {
                            type: 'string',
                            example: 'Create login form component'
                        },
                        storyId: {
                            type: 'string',
                            example: 'story-001'
                        },
                        description: {
                            type: 'string'
                        },
                        status: {
                            type: 'string',
                            enum: ['todo', 'in-progress', 'done']
                        }
                    }
                }
            }
        }
    };

    // Add security scheme for HTTPS
    if (config.transport === 'https') {
        spec.components.securitySchemes = {
            https: {
                type: 'http',
                scheme: 'https',
                description: 'HTTPS with self-signed certificate'
            }
        };
    }

    return spec;
}

/**
 * Get OpenAPI specification as JSON string
 */
export function getOpenAPIJSON(config: MCPServerConfig): string {
    return JSON.stringify(generateOpenAPISpec(config), null, 2);
}
