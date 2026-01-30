# MCP Server Setup Guide

The AI Command Center extension includes a Model Context Protocol (MCP) server that allows AI assistants like Claude Desktop to interact with your planning structure.

## What is MCP?

Model Context Protocol (MCP) is a standardized protocol that enables AI assistants to access context from external systems. The AI Command Center MCP server exposes your epics, stories, and tasks as resources and tools that AI can query and manipulate.

## Features

### Resources

The MCP server provides three types of resources:

1. **Planning Tree** (`aicc://planning/tree`)
   - Complete hierarchical view of all epics, stories, and tasks
   - Includes status, priority, story points, and other metadata
   - Useful for getting a comprehensive overview

2. **Epics List** (`aicc://planning/epics`)
   - List of all epics with their stories
   - Organized by priority and status
   - Useful for high-level planning

3. **Epic Details** (`aicc://planning/epic/{id}`)
   - Detailed view of a specific epic
   - Includes all associated stories and tasks
   - Useful for focused work on a single epic

### Tools

The MCP server provides six tools for manipulating your planning structure:

1. **create_epic**
   - Create a new epic with name, description, priority, and optional tags
   - Returns the created epic with its ID

2. **create_story**
   - Create a story within an epic
   - Specify story points, priority, and description
   - Returns the created story with its ID

3. **create_task**
   - Create a task within a story
   - Specify estimated hours and description
   - Returns the created task with its ID

4. **update_epic**
   - Update an existing epic's properties
   - Can change name, description, status, priority, etc.

5. **list_epics**
   - List all epics with optional filtering
   - Filter by status or priority
   - Returns epic summaries

6. **get_planning_tree**
   - Get the complete planning hierarchy
   - No parameters required
   - Returns the full tree structure

### Prompts

The MCP server includes eight predefined prompt templates to guide common workflows:

1. **create_epic_flow**: Guide through creating a complete epic with stories and tasks
2. **breakdown_story**: Help break down a story into actionable tasks
3. **estimate_tasks**: Estimate story points and task hours
4. **sprint_planning**: Plan a sprint by selecting stories
5. **progress_report**: Generate comprehensive progress reports
6. **dependency_analysis**: Analyze dependencies across planning structure
7. **refactor_epic**: Help reorganize epics and stories
8. **risk_assessment**: Identify and assess risks

## Claude Desktop Setup

### Step 1: Enable MCP Server

1. Open VS Code settings (File → Preferences → Settings)
2. Search for "AI Command Center MCP"
3. Ensure "Aicc › Mcp: Enabled" is checked
4. Set "Aicc › Mcp: Protocol" to "stdio"

### Step 2: Configure Claude Desktop

1. Locate your Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the AI Command Center MCP server to the configuration:

```json
{
  "mcpServers": {
    "ai-command-center": {
      "command": "node",
      "args": [
        "/path/to/ai-command-center/out/mcp/mcpServer.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "/path/to/your/workspace"
      }
    }
  }
}
```

3. Replace `/path/to/ai-command-center` with the actual path to your extension
4. Replace `/path/to/your/workspace` with your workspace root directory

### Step 3: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Relaunch Claude Desktop
3. The MCP server should connect automatically

### Step 4: Verify Connection

In Claude Desktop, you can verify the connection by asking:

```
Can you show me the available MCP resources?
```

You should see the AI Command Center resources listed (tree, epics, epic/{id}).

## Using MCP with Claude

### Example: Create an Epic

```
I need to create a new epic for user authentication. It should include:
- OAuth 2.0 integration
- Login/logout flows
- Session management
- Password reset

Priority is high. Can you create this epic with stories and tasks?
```

Claude will use the MCP tools to create the epic structure in your planning system.

### Example: Get Progress Report

```
Can you generate a progress report for my planning structure?
Use the progress_report prompt template.
```

Claude will use the predefined prompt to analyze your planning tree and provide insights.

### Example: Sprint Planning

```
I have 21 story points capacity for this sprint.
Can you help me select stories to work on?
Use the sprint_planning prompt.
```

Claude will review your backlog and recommend stories that fit within your capacity.

## VS Code Commands

The extension provides three commands to control the MCP server:

1. **Start MCP Server**
   - Command: `AI Command Center: Start MCP Server`
   - Starts the MCP server if it's not running

2. **Stop MCP Server**
   - Command: `AI Command Center: Stop MCP Server`
   - Stops the currently running MCP server

3. **Restart MCP Server**
   - Command: `AI Command Center: Restart MCP Server`
   - Restarts the MCP server (useful after configuration changes)

Access these via the Command Palette (Cmd/Ctrl + Shift + P).

## Troubleshooting

### MCP Server Not Connecting

1. Check VS Code Output panel:
   - View → Output
   - Select "AI Command Center" from dropdown
   - Look for MCP server logs

2. Verify configuration:
   - Ensure `aicc.mcp.enabled` is true
   - Check that the path in Claude Desktop config is correct

3. Check file permissions:
   - Ensure Claude Desktop can access the extension directory
   - Verify WORKSPACE_ROOT environment variable points to valid directory

### Resources Not Appearing

1. Ensure you have a planning structure:
   - Create at least one epic in VS Code
   - Use `AI Command Center: Create Epic` command

2. Check resource URIs:
   - Resources use `aicc://` scheme
   - Make sure you're requesting the correct URI format

### Tools Not Working

1. Verify planning manager is initialized:
   - Check VS Code output logs
   - Ensure workspace has `.project/plan` directory

2. Check tool parameters:
   - Each tool has required parameters
   - See tool schemas in the MCP server implementation

## Advanced Configuration

### Custom Port (HTTP Transport)

If you prefer HTTP instead of stdio:

1. Set `aicc.mcp.protocol` to "http" in VS Code settings
2. Configure Claude Desktop with HTTP endpoint:

```json
{
  "mcpServers": {
    "ai-command-center": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

Note: HTTP transport requires additional implementation.

### Environment Variables

You can pass additional environment variables to the MCP server:

```json
{
  "mcpServers": {
    "ai-command-center": {
      "command": "node",
      "args": ["/path/to/out/mcp/mcpServer.js"],
      "env": {
        "WORKSPACE_ROOT": "/path/to/workspace",
        "LOG_LEVEL": "debug",
        "AICC_CONFIG_PATH": "/custom/path/config.yaml"
      }
    }
  }
}
```

## Security Considerations

1. **File Access**: The MCP server can read/write planning files within your workspace
2. **Command Execution**: AI can create, update, and delete epics/stories/tasks
3. **Data Privacy**: Planning data is accessible to Claude Desktop when MCP is enabled

To restrict access:
- Disable MCP when not needed: `aicc.mcp.enabled = false`
- Use file permissions to limit planning directory access
- Review AI-generated changes before committing to version control

## Next Steps

- Explore [MCP Prompt Templates](../src/mcp/promptTemplates.ts) for workflow ideas
- Review [MCP Server Implementation](../src/mcp/mcpServer.ts) for technical details
- Join discussions about AI-assisted planning workflows

## Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Setup](https://docs.anthropic.com/claude/docs/mcp)
- [AI Command Center GitHub](https://github.com/yourusername/ai-command-center)
