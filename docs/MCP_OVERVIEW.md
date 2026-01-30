# 🌐 Universal MCP Server - Connect Any AI Agent

The AI Command Center includes a **built-in Model Context Protocol (MCP) server** that works with ANY MCP-compatible AI agent or client.

## ✨ What This Means

Your planning data, tools, and prompts are instantly available to:

- 🤖 **Claude Desktop** - Auto-configure in one click
- 🧠 **OpenAI Assistants** - Connect custom GPTs and assistants  
- 🐍 **LangChain / LlamaIndex** - Build advanced RAG systems
- 👥 **Autogen / CrewAI** - Power multi-agent systems
- 🛠️ **Custom Agents** - Any MCP client in any language
- 💻 **CLI / Scripts** - Automate from command line

## 🚀 Getting Started

1. **MCP server starts automatically** when extension loads
2. **Run command:** `AI Command Center: Export MCP Configuration`
3. **Select your client** from the dialog
4. **Follow the generated instructions**

That's it! Your agent now has access to:
- ✅ Planning resources (epics, stories, tasks)
- ✅ CRUD tools (create, update, delete)
- ✅ Prompt templates
- ✅ Search and export capabilities

## 📡 Connection Modes

Choose the right transport for your use case:

| Mode | Best For | Example |
|------|----------|---------|
| **stdio** | Local apps | Claude Desktop |
| **http** | Web apps, REST | OpenAI, custom dashboards |
| **https** | Production | Enterprise deployments |
| **websocket** | Real-time | Live monitoring dashboards |

## 📖 Documentation

- **Quick Start:** [docs/QUICK_START_MCP.md](./QUICK_START_MCP.md)
- **Full Guide:** [docs/MCP_CLIENT_CONNECTIONS.md](./MCP_CLIENT_CONNECTIONS.md)
- **Examples:** Python, TypeScript, LangChain, CLI

## 🔧 Example: Connect Claude Desktop

```bash
# 1. Export config
AI Command Center: Export MCP Configuration → Claude Desktop

# 2. Restart Claude Desktop

# 3. See "AI Command Center" in Claude's tools
```

## 🐍 Example: Python Client

```python
from mcp import Client

# Connect to server
client = Client.connect("http://localhost:3000")

# List planning resources
resources = client.list_resources()

# Create an epic
client.call_tool("createEpic", {
    "title": "Q1 2026 Features",
    "description": "Major features for Q1"
})
```

## 🌟 Why This Matters

**Universal Integration** - Not locked to one AI provider  
**Future-Proof** - Works with new MCP clients automatically  
**Open Standard** - Based on Model Context Protocol spec  
**Multiple Languages** - Python, TypeScript, and more  
**Easy Setup** - One command to export config  

## 🎯 Use Cases

- **AI Assistants:** Let Claude/GPT manage your project planning
- **Automation:** Script epic/story creation with Python
- **Multi-Agent:** Coordinate planning across agent teams
- **CI/CD:** Integrate planning into pipelines
- **Custom Tools:** Build your own AI-powered PM tools

## 🔒 Security

- **Local by default:** Binds to `localhost` only
- **No auth needed:** For local development
- **HTTPS ready:** SSL/TLS for production
- **Configurable:** Full control over networking

## 📦 What's Included

The MCP server exposes:

- **45+ Resources:** All planning data (read-only)
- **25+ Tools:** Create, update, delete operations
- **10+ Prompts:** Pre-built templates for common tasks
- **REST API:** Swagger docs at `/swagger`
- **Real-time:** WebSocket support for live updates

## 🤝 Contributing

We welcome examples for more AI platforms! Found a great integration? Share it via PR.

---

**The MCP server makes AI Command Center the hub for AI-powered project management across any agent platform.** 🚀
