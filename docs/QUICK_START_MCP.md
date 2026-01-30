# 🚀 Quick Start: Connect Your AI Agent to MCP Server

## Step 1: Start the MCP Server

The server starts automatically when VS Code loads. Check the status bar:

- `$(radio-tower) MCP` = Running ✅
- `$(debug-disconnect) MCP` = Stopped ❌

## Step 2: Export Configuration

1. Open Command Palette (`Cmd/Ctrl+Shift+P`)
2. Run: **AI Command Center: Export MCP Configuration**
3. Select your client type:

### 🤖 Claude Desktop
- Auto-configures Claude app
- Restart Claude to see AI Command Center tools

### 🔧 Generic JSON
- Standard config file for any MCP client
- Save to your project or agent config folder

### 💻 Environment Variables
- For shell scripts and automation
- Add to `.bashrc`, `.zshrc`, or CI/CD pipeline

### ⚡ CLI Arguments  
- Ready-to-use terminal commands
- Perfect for testing and debugging

### 🌐 OpenAI Assistants
- Configuration for OpenAI platform
- Use with Assistants API

## Step 3: Connect Your Agent

### Quick Test (HTTP Mode)

```bash
# Check server is running
curl http://localhost:3000/health

# List available resources
curl http://localhost:3000/mcp/resources

# View API docs
open http://localhost:3000/swagger
```

### Python Example

```python
from mcp import Client

client = Client.connect("http://localhost:3000")
resources = client.list_resources()
```

### JavaScript Example

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

const client = new Client({name: 'my-agent', version: '1.0.0'});
// Connect and use...
```

## Common Settings

Access via: **Preferences → Settings → AI Command Center → MCP**

| Setting | Options | Default |
|---------|---------|---------|
| Transport | stdio, http, https, websocket | stdio |
| Port | 1-65535 | 3000 |
| Host | localhost, 0.0.0.0, etc. | localhost |
| Enabled | true/false | true |

## Transport Guide

**stdio** - Best for local apps like Claude Desktop  
**http** - Best for web apps and remote agents  
**https** - Best for production (secure)  
**websocket** - Best for real-time dashboards

## Need Help?

- 📖 Full Guide: `docs/MCP_CLIENT_CONNECTIONS.md`
- 🐛 Issues: [GitHub](https://github.com/armoin2018/ai-command-center/issues)
- 📊 Logs: Output panel → "AI Command Center"

---

**Works with ANY MCP-compatible agent!** 🎉
