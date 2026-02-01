#!/usr/bin/env node
/**
 * MCP Server for ailey-admin-tools-index
 * 
 * Model Context Protocol (MCP) server providing search capabilities
 * for AI-ley index files.
 * 
 * Usage:
 *   node mcp-server.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { searchResources, formatResults, loadIndexes } from './search.js';

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'search-index',
    description: 'Search AI-ley index files by name, keywords, text, or regex',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Filter by name pattern (supports regex)',
        },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by keywords',
        },
        string: {
          type: 'string',
          description: 'Search text in name, description, or keywords',
        },
        regex: {
          type: 'string',
          description: 'Advanced regex pattern search',
        },
        type: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['agents', 'skills', 'personas', 'instructions', 'flows', 'prompts'],
          },
          description: 'Index types to search',
        },
        format: {
          type: 'string',
          enum: ['json', 'json-array', 'yaml', 'xml', 'txt', 'csv', 'markdown', 'html', 'prompt'],
          default: 'json',
          description: 'Output format for results',
        },
        namesOnly: {
          type: 'boolean',
          default: false,
          description: 'Return only resource names',
        },
      },
    },
  },
];

/**
 * Initialize and start the MCP server
 */
async function main(): Promise<void> {
  const server = new Server(
    {
      name: 'ailey-admin-tools-index',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'search-index') {
      try {
        if (!args) {
          throw new Error('No arguments provided');
        }

        // Load indexes
        const indexes = await loadIndexes(args.type as string[] | undefined);
        
        // Search resources
        const results = searchResources(indexes, {
          name: args.name as string | undefined,
          keywords: args.keywords as string[] | undefined,
          string: args.string as string | undefined,
          regex: args.regex as string | undefined,
        });
        
        // Format results
        const output = formatResults(
          results,
          (args.format as string) || 'json',
          (args.namesOnly as boolean) || false
        );
        
        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('AI-ley Index Tool MCP server started');
}

// Execute
main().catch((error: Error) => {
  console.error('MCP Server Error:', error);
  process.exit(1);
});
