# Quick Start Guide

**AI Command Center v1.1.24** — Get up and running in 5 minutes.

---

## 1. Install the Extension

### From VSIX (local build)

```bash
code --install-extension ai-command-center-1.1.24.vsix
```

### From Marketplace

Search for **"AI Command Center"** in the VS Code Extensions view (`Cmd+Shift+X`).

After installation, reload VS Code when prompted.

---

## 2. First Run

1. Open a workspace folder in VS Code
2. The extension activates automatically on startup
3. Look for the **AI Command Center** panel in the bottom panel area (toggle with `Cmd+J`)
4. The status bar shows two new items:
   - `$(file-code) No instructions` — Instruction source manager
   - `$(radio-tower) MCP` — MCP server status

---

## 3. Create a Plan

1. Open the Command Palette: `Cmd+Shift+P`
2. Run: **AICC: Initialize Plan**
3. This creates a `.project/` directory with the following structure:

```
.project/
├── PLAN.json            # Main plan file with epics, stories, tasks
├── plan/                # Individual item files
│   ├── epics/
│   ├── stories/
│   └── tasks/
├── config/              # Configuration files
└── history/             # Version history
```

The `PLAN.json` file holds your project's hierarchical structure:

```json
{
  "project": "My Project",
  "version": "1.0.0",
  "epics": [
    {
      "id": "AICC-0001",
      "title": "First Epic",
      "status": "BACKLOG",
      "stories": []
    }
  ]
}
```

---

## 4. Add Epics, Stories & Tasks

### Using the Secondary Panel

1. Open the **Planning** tab in the secondary panel
2. Click the **+** button to create a new item
3. Fill in the item details (title, description, status, assignee)
4. Items are saved to `.project/plan/` as individual files

### Using the Command Palette

| Command               | Description              |
|-----------------------|--------------------------|
| `AICC: Create Epic`   | Create a new epic        |
| `AICC: Create Story`  | Create a story under an epic |
| `AICC: Create Task`   | Create a task under a story  |

### Item Hierarchy

```
Epic (AICC-0001)
├── Story (AICC-0010)
│   ├── Task (AICC-0100)
│   ├── Task (AICC-0101)
│   └── Task (AICC-0102)
└── Story (AICC-0011)
    └── Task (AICC-0110)
```

---

## 5. Configure MCP

The MCP (Model Context Protocol) server lets AI agents access your planning data.

### Settings

Open VS Code Settings (`Cmd+,`) and search for `aicc.mcp`:

| Setting            | Default     | Description                    |
|--------------------|-------------|--------------------------------|
| `aicc.mcp.enabled` | `true`      | Enable/disable the MCP server  |
| `aicc.mcp.transport` | `"stdio"` | Transport: stdio, http, https, websocket |
| `aicc.mcp.port`    | `3000`      | Port for HTTP/WS transports    |
| `aicc.mcp.host`    | `"localhost"` | Bind address                 |

### Verify MCP is Running

Check the status bar — `$(radio-tower) MCP` means the server is active. Click it for start/stop/restart options.

---

## 6. Connect AI Agents

### Export MCP Configuration

1. `Cmd+Shift+P` → **AICC: Export MCP Configuration**
2. Select your client type:
   - **Claude Desktop** — Auto-configures the Claude app
   - **Generic JSON** — Standard MCP config for any client
   - **Environment Variables** — For shell/CI integration
   - **CLI Arguments** — Ready-to-use terminal commands

### Claude Desktop Setup

After exporting, restart Claude Desktop. Your planning tools, resources, and prompts will be available in Claude conversations.

### HTTP Mode Quick Test

If using HTTP transport:

```bash
curl http://localhost:3000/health
```

---

## 7. Advanced Features

### Enable Advanced Mode

```json
{
  "aicc.advancedMode": true
}
```

This enables the sidebar tree view, editor panel, and context menu actions for power users.

### Jira Integration

1. Configure Jira credentials in settings or `.project/config/`
2. Use `AICC: Export to Jira` to sync planning items
3. Bidirectional sync keeps both systems in alignment

### Help & Documentation

- Click the **?** button in the secondary panel header to open the User Guide
- Run `AICC: Show Help` from the command palette
- See `docs/USER_GUIDE.md` for the complete reference

---

*For detailed documentation, see the [User Guide](USER_GUIDE.md). For new features, see [What's New](WHATS_NEW.md). For the AI-Ley framework, see [AI-Ley Framework Guide](AI_LEY_FRAMEWORK.md).*
