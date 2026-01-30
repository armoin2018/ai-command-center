# Connecting AI Agents to MCP Server

The AI Command Center MCP Server is **client-agnostic** and works with any MCP-compatible agent or client. Here's how to connect various AI systems:

## 🚀 Quick Start

1. Start the MCP server (enabled by default)
2. Run command: **AI Command Center: Export MCP Configuration**
3. Choose your client type
4. Follow the generated instructions

## Supported Clients

### 1. Claude Desktop

**Best for:** Interactive AI assistant with project context

**Setup:**
1. Export configuration → Select "Claude Desktop"
2. Config auto-written to `~/Library/Application Support/Claude/claude_desktop_config.json`
3. Restart Claude Desktop
4. AI Command Center appears as available MCP server

**Connection modes:**
- `stdio` - Direct process communication (recommended)
- `http/https` - Network connection

### 2. OpenAI Assistants API

**Best for:** Building custom AI assistants with OpenAI

**Setup:**
1. Set MCP transport to `http` or `https` in settings
2. Export configuration → Select "OpenAI Assistants"
3. Use generated config in OpenAI Assistant creation:

```javascript
const assistant = await openai.beta.assistants.create({
  name: "AI Command Center",
  tools: [{
    type: "function",
    function: {
      name: "mcp_server",
      description: "Access AI Command Center planning tools",
      parameters: {
        endpoint: "http://localhost:3000"
      }
    }
  }]
});
```

### 3. Custom MCP Clients

**Best for:** Building your own AI agents

**Setup:**
1. Export configuration → Select "Generic JSON" or "CLI Arguments"
2. Use the MCP SDK in your preferred language

#### Python Example

```python
from mcp import Client

# HTTP/HTTPS connection
client = Client.connect("http://localhost:3000")

# List available resources
resources = client.list_resources()

# Call a tool
result = client.call_tool("createEpic", {
    "title": "New Epic",
    "description": "Created via MCP"
})
```

#### JavaScript/TypeScript Example

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Stdio connection
const transport = new StdioClientTransport({
  command: 'npx',
  args: ['ai-command-center-mcp']
});

const client = new Client({
  name: 'my-agent',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// Use the server
const resources = await client.listResources();
```

### 4. LangChain / LlamaIndex

**Best for:** Advanced RAG and agent frameworks

**LangChain Setup:**

```python
from langchain.agents import initialize_agent
from langchain.tools import Tool
from mcp import MCPToolkit

# Connect to MCP server
mcp_toolkit = MCPToolkit.from_url("http://localhost:3000")

# Create LangChain tools
tools = mcp_toolkit.get_tools()

# Initialize agent
agent = initialize_agent(
    tools=tools,
    llm=your_llm,
    agent="zero-shot-react-description"
)
```

**LlamaIndex Setup:**

```python
from llama_index.tools import FunctionTool
from mcp import Client

client = Client.connect("http://localhost:3000")

# Convert MCP tools to LlamaIndex tools
tools = [
    FunctionTool.from_defaults(
        fn=lambda **kwargs: client.call_tool(tool_name, kwargs),
        name=tool_name,
        description=tool_desc
    )
    for tool_name, tool_desc in client.list_tools()
]
```

### 5. Autogen / CrewAI

**Best for:** Multi-agent systems

**Autogen Setup:**

```python
from autogen import AssistantAgent
from mcp import Client

mcp_client = Client.connect("http://localhost:3000")

# Create an Autogen agent with MCP tools
planning_agent = AssistantAgent(
    name="PlanningAgent",
    system_message="You help manage project planning using AI Command Center",
    llm_config={
        "functions": mcp_client.get_function_definitions(),
        "config_list": config_list
    }
)
```

### 6. Command Line / Shell Scripts

**Best for:** Automation and CI/CD

**Setup:**
1. Export configuration → Select "Environment Variables"
2. Add to `.bashrc` / `.zshrc`
3. Use MCP CLI:

```bash
# List resources
npx @modelcontextprotocol/cli connect http://localhost:3000 resources

# Call a tool
npx @modelcontextprotocol/cli connect http://localhost:3000 tool createEpic \
  --title "Deploy Pipeline" \
  --description "Set up CI/CD"

# Get prompts
npx @modelcontextprotocol/cli connect http://localhost:3000 prompts
```

## Transport Modes

### stdio (Default)
- Direct process communication
- Fastest, most reliable
- Best for local clients (Claude Desktop)
- No network overhead

### HTTP
- Standard REST-like interface
- Good for web apps, remote clients
- Easy to debug with curl/Postman
- Firewall-friendly

### HTTPS
- Encrypted communication
- Required for production deployments
- Auto-generates self-signed certs
- Custom cert support available

### WebSocket
- Real-time bidirectional communication
- Best for live updates
- Ideal for dashboard/UI clients
- Lower latency than HTTP polling

## Configuration Examples

### Minimal HTTP Setup

```json
{
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "http",
  "aicc.mcp.port": 3000,
  "aicc.mcp.host": "localhost"
}
```

### Production HTTPS Setup

```json
{
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "https",
  "aicc.mcp.port": 3443,
  "aicc.mcp.host": "0.0.0.0",
  "aicc.mcp.ssl": {
    "certPath": "/path/to/cert.pem",
    "keyPath": "/path/to/key.pem"
  }
}
```

### WebSocket for Real-Time

```json
{
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "websocket",
  "aicc.mcp.port": 3001,
  "aicc.mcp.host": "localhost"
}
```

## Available Capabilities

The MCP server exposes:

- **Resources:** Access to planning data (epics, stories, tasks)
- **Tools:** CRUD operations, search, export
- **Prompts:** Pre-built templates for common planning tasks

## Testing Connection

```bash
# HTTP health check
curl http://localhost:3000/health

# List MCP resources
curl http://localhost:3000/mcp/resources

# View OpenAPI spec
curl http://localhost:3000/swagger
```

## Troubleshooting

**Connection refused:**
- Check MCP server is running: Look for status bar indicator
- Verify port is not in use: `lsof -i :3000`
- Check firewall settings

**Authentication errors:**
- MCP server has no auth by default
- For production, use reverse proxy with auth

**Transport not working:**
- Stdio: Ensure client can spawn processes
- HTTP/HTTPS: Check network/firewall
- WebSocket: Verify WebSocket support in client

## Security Considerations

- Default: No authentication (local development)
- Production: Use HTTPS + reverse proxy with auth
- Network: Bind to `localhost` for local-only
- Firewall: Restrict port access as needed

## Need Help?

- File an issue: [GitHub Issues](https://github.com/armoin2018/ai-command-center/issues)
- Check logs: VS Code Developer Tools → Output → AI Command Center
- Export config: Verify generated config matches your setup

---

**The MCP server is designed to work with ANY MCP-compatible client.** If your AI agent supports MCP, it can connect to AI Command Center!
