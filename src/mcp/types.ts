// src/mcp/types.ts
/**
 * MCP Tool Call Result
 */
export interface ToolCallResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}
