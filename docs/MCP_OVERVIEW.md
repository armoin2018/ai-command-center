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

## 🛠️ Complete MCP Tools Reference (40+ Tools)

The following tools are exposed via the MCP server, organized by category.

### Planning CRUD (9 tools)

| Tool | Description |
|------|-------------|
| `create_item` | Create a new epic, story, or task |
| `read_item` | Read details of a specific plan item |
| `update_item` | Update fields on an existing item |
| `delete_item` | Delete a plan item |
| `list_items` | List items with optional filters (type, status, assignee) |
| `move_item` | Move an item to a different parent or position |
| `link_items` | Create a dependency or relationship link between items |
| `get_plan_summary` | Get a high-level summary of the entire plan |
| `search_items` | Full-text search across all plan items |

### Bulk Operations (3 tools)

| Tool | Description |
|------|-------------|
| `bulk_status_update` | Update status on multiple items at once |
| `bulk_reparent` | Move multiple items under a new parent |
| `cascade_delete` | Delete an item and all its children recursively |

### Resource Discovery (5 tools)

| Tool | Description |
|------|-------------|
| `discover_resources` | List all available MCP resources in the workspace |
| `get_agent_info` | Retrieve metadata about a registered AI agent |
| `get_skill_info` | Retrieve metadata and health status for a skill |
| `list_personas` | List all available personas from kits and workspace |
| `list_instructions` | List all available instruction sets |

### Velocity (4 tools)

| Tool | Description |
|------|-------------|
| `get_velocity_metrics` | Retrieve velocity data for recent sprints |
| `get_burndown` | Get burndown chart data for the current sprint |
| `forecast_completion` | Predict completion date based on velocity trends |
| `record_sprint` | Record a completed sprint snapshot for velocity tracking |

### Skill Health (3 tools)

| Tool | Description |
|------|-------------|
| `get_skill_health` | Get health status for a specific skill |
| `probe_skill` | Run an on-demand health probe against a skill |
| `get_health_summary` | Get aggregate health summary across all skills |

### Idea Analytics (5 tools)

| Tool | Description |
|------|-------------|
| `score_ideas` | Score ideas by impact, effort, and strategic alignment |
| `detect_duplicates` | Find duplicate or near-duplicate ideas |
| `get_enrichment_suggestions` | Get AI-generated enrichment suggestions for ideas |
| `get_idea_trends` | Analyze trends across ideas over time |
| `apply_lifecycle_rules` | Apply automated lifecycle transitions to ideas |

### Prompt Tracking (4 tools)

| Tool | Description |
|------|-------------|
| `track_prompt_usage` | Record a prompt invocation event |
| `update_prompt_outcome` | Update the outcome (success/failure) of a prompt usage |
| `get_prompt_effectiveness` | Get effectiveness score for a specific prompt |
| `get_prompt_leaderboard` | Get ranked list of prompts by effectiveness |

### Offline Queue (4 tools)

| Tool | Description |
|------|-------------|
| `get_queue_stats` | Get current queue depth, processing rate, and status |
| `drain_queue` | Force-process all queued items immediately |
| `get_dead_letter_items` | List items that exceeded max retries |
| `retry_dead_letter` | Re-queue a dead-letter item for another attempt |

### Agent Memory (5 tools)

| Tool | Description |
|------|-------------|
| `store_memory` | Store a key-value memory entry for the current session |
| `recall_memory` | Retrieve a stored memory entry by key |
| `export_memory` | Export all memory entries to a JSON file |
| `prune_memory` | Remove memory entries older than a threshold |
| `get_memory_summary` | Get summary statistics of the memory store |

### Knowledge Base (5 tools)

| Tool | Description |
|------|-------------|
| `store_knowledge` | Store a knowledge article in the cross-workspace KB |
| `search_knowledge` | Semantic search across all knowledge entries |
| `detect_knowledge_duplicates` | Find duplicate knowledge entries |
| `get_knowledge_summary` | Get summary statistics of the knowledge base |
| `export_knowledge` | Export the knowledge base to a file |

### Confluence (5 tools)

| Tool | Description |
|------|-------------|
| `confluence_get_page` | Retrieve a Confluence page by ID or title |
| `confluence_search` | Search Confluence using CQL queries |
| `confluence_push` | Push local documentation to Confluence |
| `confluence_pull` | Pull Confluence content to local files |
| `confluence_sync` | Bidirectional sync between local docs and Confluence |

### Skill Registration (4 tools)

| Tool | Description |
|------|-------------|
| `auto_discover_skills` | Scan workspace and kits for skill definitions |
| `register_skill` | Register a skill for MCP tool exposure |
| `list_skill_registrations` | List all registered skills and their status |
| `get_skill_index` | Get the full skill index with metadata |

### Pipelines (4 tools)

| Tool | Description |
|------|-------------|
| `run_pipeline` | Execute a skill pipeline by name |
| `list_pipelines` | List all available pipeline definitions |
| `get_pipeline_run` | Get status and output of a pipeline run |
| `get_pipeline_definition` | Get the full definition of a pipeline |

### Telemetry (3 tools)

| Tool | Description |
|------|-------------|
| `get_telemetry_summary` | Get aggregate telemetry summary for the workspace |
| `get_telemetry_events` | List recent telemetry events with filters |
| `track_event` | Record a custom telemetry event |

### Ideation (8 tools)

| Tool | Description |
|------|-------------|
| `create_idea` | Create a new idea entry |
| `update_idea` | Update an existing idea |
| `delete_idea` | Delete an idea |
| `list_ideas` | List ideas with optional filters |
| `vote_on_idea` | Cast a vote on an idea |
| `add_comment` | Add a comment to an idea |
| `promote_idea` | Promote an idea to a plan item (epic/story) |
| `get_idea` | Retrieve full details of an idea |

---

## 🤝 Contributing

We welcome examples for more AI platforms! Found a great integration? Share it via PR.

---

**The MCP server makes AI Command Center the hub for AI-powered project management across any agent platform.** 🚀
