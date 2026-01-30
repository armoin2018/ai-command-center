# AI Command Center - User Guide

**Version 1.0.0** | Complete Planning & Integration Solution for VS Code

---

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Planning Manager](#planning-manager)
5. [Jira Integration](#jira-integration)
6. [MCP Server](#mcp-server)
7. [Configuration](#configuration)
8. [Command Reference](#command-reference)
9. [Troubleshooting](#troubleshooting)
10. [Best Practices](#best-practices)

---

## Overview

AI Command Center is a comprehensive VS Code extension that centralizes AI-powered development workflows with integrated planning, instruction management, and external service integrations.

### Key Features

✅ **Hierarchical Planning System**
- Epic → Story → Task hierarchy
- File-based persistence in `.project/plan`
- Full CRUD operations with version tracking
- Evolution history and audit trails

✅ **Jira Integration**
- Bidirectional sync (Epic/Story/Task ↔ Epic/Story/Sub-task)
- Real-time webhooks for instant updates
- Conflict detection and resolution
- Parent relationship preservation

✅ **MCP Server**
- Model Context Protocol server for AI agents
- Tools, resources, and prompts for planning
- HTTP and stdio transports
- Integration with Claude Desktop and other AI tools

✅ **Rich WebView UI**
- 22+ React components
- Tree view, Kanban board, Timeline, Calendar
- Charts, activity logs, bulk operations
- Responsive design with dark/light themes

---

## Installation

### Prerequisites

- **VS Code**: Version 1.85.0 or higher
- **Node.js**: Version 18.0.0 or higher (for development)

### From VSIX (Recommended)

1. **Build the extension:**
   ```bash
   cd /path/to/ai-command-center
   ./build-vsix.sh
   ```

2. **Install the VSIX:**
   ```bash
   ./install-extension.sh
   ```

3. **Reload VS Code:**
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Developer: Reload Window"
   - Press Enter

### From Source (Development)

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/ai-command-center.git
   cd ai-command-center
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd webview && npm install && cd ..
   ```

3. **Build the extension:**
   ```bash
   npm run compile
   ```

4. **Run in debug mode:**
   - Press `F5` to launch Extension Development Host

---

## Quick Start

### 1. Initialize Planning Structure

Open a workspace and initialize the planning structure:

```bash
# Via Command Palette (Cmd+Shift+P)
AI Command Center: Create Epic
```

This creates `.project/plan/` directory structure:

```
.project/plan/
├── epics/
├── config/
│   └── sync-state.json
└── evolution/
    └── events.json
```

### 2. Create Your First Epic

1. **Open Command Palette**: `Cmd+Shift+P`
2. **Run**: `AI Command Center: Create Epic`
3. **Enter Details**:
   - Name: "User Authentication System"
   - Description: "Implement secure user authentication"
   - Priority: High

Result: Creates `EPIC-001-user-authentication-system/`

### 3. Add Stories to Epic

1. **Run**: `AI Command Center: Create Story`
2. **Select Parent Epic**: EPIC-001
3. **Enter Details**:
   - Name: "Login Form UI"
   - Description: "Create responsive login form"
   - Story Points: 5

Result: Creates `STORY-001-login-form-ui/` under the epic

### 4. Add Tasks to Story

1. **Run**: `AI Command Center: Create Task`
2. **Select Parent Epic**: EPIC-001
3. **Select Parent Story**: STORY-001
4. **Enter Details**:
   - Name: "Design login form mockup"
   - Assignee: your-name

Result: Creates `TASK-001-design-login-form-mockup.md`

### 5. View Planning Panel

```bash
# Command Palette
AI Command Center: Open Planning Panel
```

This opens the WebView UI showing:
- Tree view of all epics/stories/tasks
- Kanban board
- Timeline view
- Activity log

---

## Planning Manager

### Epic Management

#### Create Epic

```bash
Command: AI Command Center: Create Epic
```

**Fields:**
- Name (required): Epic title
- Description: Detailed description
- Priority: High | Medium | Low
- Tags: Comma-separated tags

**File Structure:**
```
.project/plan/epics/EPIC-001-epic-name/
├── README.md          # Epic details
├── stories/           # Child stories
└── .metadata.json     # Internal metadata
```

#### Update Epic

Epics are updated by editing the `README.md` file or via the Planning Panel UI.

**Tracked Changes:**
- Name
- Description
- Status (not-started | in-progress | completed | blocked)
- Priority
- Tags

#### Delete Epic

**⚠️ Warning**: Deleting an epic also deletes all child stories and tasks.

```bash
Command: AI Command Center: Delete Epic
# Confirmation required if aicc.ui.confirmDelete = true
```

### Story Management

#### Create Story

```bash
Command: AI Command Center: Create Story
```

**Fields:**
- Epic ID (required): Parent epic
- Name (required): Story title
- Description: Detailed description
- Story Points: Fibonacci (1,2,3,5,8,13,21) or Linear (1-8)
- Priority: High | Medium | Low
- Sprint: Optional sprint assignment

**File Structure:**
```
epics/EPIC-001/stories/STORY-001-story-name/
├── README.md          # Story details
├── tasks/             # Child tasks
└── .metadata.json     # Internal metadata
```

### Task Management

#### Create Task

```bash
Command: AI Command Center: Create Task
```

**Fields:**
- Epic ID (required): Parent epic
- Story ID (required): Parent story
- Name (required): Task title
- Description: Task details
- Assignee: Person responsible
- Status: not-started | in-progress | completed | blocked

**File Structure:**
```
stories/STORY-001/tasks/TASK-001-task-name.md
```

### Evolution Tracking

Every create/update/delete operation is logged:

```json
{
  "id": "evt-001",
  "timestamp": "2024-01-10T10:30:00Z",
  "type": "epic.created",
  "entityId": "EPIC-001",
  "changes": {
    "name": "User Authentication",
    "status": "not-started"
  },
  "metadata": {
    "triggeredBy": "user",
    "reason": "New feature request"
  }
}
```

Access via: `.project/plan/evolution/events.json`

---

## Jira Integration

### Setup

#### 1. Generate Jira API Token

1. Go to: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **Create API token**
3. Name: "VS Code AI Command Center"
4. Copy the token (you won't see it again)

#### 2. Configure Extension

```bash
# Command Palette
AI Command Center: Configure Jira Integration
```

**Interactive Wizard:**
1. ✅ Enable Jira: Yes
2. 🌐 Base URL: `https://your-company.atlassian.net`
3. 📧 Email: `your-email@company.com`
4. 🔑 API Token: `paste-your-token-here`
5. 📁 Project Key: `PROJ` (your Jira project)
6. 🔄 Sync Strategy: `bidirectional`
7. ⚡ Conflict Resolution: `manual`
8. 🔁 Auto Sync: `false` (manual sync recommended initially)

**Or Configure Manually:**

Open VS Code Settings (`Cmd+,`) and set:

```json
{
  "aicc.jira.enabled": true,
  "aicc.jira.baseUrl": "https://your-company.atlassian.net",
  "aicc.jira.email": "your-email@company.com",
  "aicc.jira.apiToken": "YOUR_API_TOKEN",
  "aicc.jira.projectKey": "PROJ",
  "aicc.jira.syncStrategy": "bidirectional",
  "aicc.jira.conflictResolution": "manual",
  "aicc.jira.autoSync": false,
  "aicc.jira.syncInterval": 15
}
```

#### 3. Test Connection

```bash
# Command Palette
AI Command Center: Test Jira Connection
```

Expected Output:
```
✅ Connected successfully to Jira
   Project: PROJ - Project Name
   Permissions: Read/Write
```

### Synchronization

#### Sync Strategies

1. **Push** (`push`): Only local → Jira
   - Use when: You manage planning locally, Jira is for tracking
   - Changes: Local changes pushed to Jira

2. **Pull** (`pull`): Only Jira → local
   - Use when: Jira is source of truth
   - Changes: Jira changes pulled to local

3. **Bidirectional** (`bidirectional`): Both ways
   - Use when: Both systems actively used
   - Changes: Sync both directions with conflict detection

#### Conflict Resolution

1. **Local Wins** (`local-wins`): Always keep local changes
2. **Remote Wins** (`remote-wins`): Always keep Jira changes
3. **Manual** (`manual`): Prompt user to resolve (recommended)
4. **Merge** (`merge`): Automatic merge (newest wins)

#### Manual Sync

```bash
# Command Palette
AI Command Center: Sync with Jira
```

**Process:**
1. Compares local and Jira states
2. Detects changes using MD5 hash comparison
3. Shows progress: "Syncing 5 epics... 3/5 complete"
4. Reports conflicts if any
5. Creates/updates issues in Jira
6. Updates local planning files

**Example Output:**
```
✅ Sync completed
   Epics: 5 synced (3 created, 2 updated)
   Stories: 12 synced (8 created, 4 updated)
   Tasks: 23 synced (20 created, 3 updated)
   Conflicts: 0
   Duration: 4.2s
```

#### Push Only

```bash
# Command Palette
AI Command Center: Push to Jira
```

Pushes all local changes to Jira without pulling.

#### Pull Only

```bash
# Command Palette
AI Command Center: Pull from Jira
```

Pulls all Jira changes to local without pushing.

#### Auto Sync

Enable automatic synchronization:

```json
{
  "aicc.jira.autoSync": true,
  "aicc.jira.syncInterval": 15  // minutes
}
```

**Behavior:**
- Syncs every 15 minutes (configurable)
- Runs in background
- Shows notification on conflicts
- Can be disabled anytime

### Jira Mapping

#### How It Works

The extension maintains a bidirectional mapping:

```json
{
  "aiccId": "EPIC-001",
  "jiraKey": "PROJ-123",
  "itemType": "epic",
  "lastSyncedAt": 1704892800000,
  "lastSyncedHash": "a1b2c3d4"
}
```

Stored in: `.project/plan/config/jira-mappings.json`

#### View Mappings

```bash
# Command Palette
AI Command Center: View Jira Mappings
```

Shows:
```
EPIC-001 ↔ PROJ-123 (Epic: User Authentication)
STORY-001 ↔ PROJ-124 (Story: Login Form UI)
TASK-001 ↔ PROJ-125 (Task: Design mockup)
```

#### Hierarchy Preservation

**Local → Jira:**
- Epic → Jira Epic
- Story → Jira Story (linked to Epic via `epicKey`)
- Task → Jira Sub-task (linked to Story via `parentKey`)

**Jira → Local:**
- Jira Epic → Epic
- Jira Story → Story (Epic resolved via parent key)
- Jira Sub-task → Task (Story/Epic resolved via parent chain)

### Conflict Resolution

When conflicts detected:

```bash
# Command Palette
AI Command Center: Resolve Jira Conflicts
```

**UI Shows:**
```
Conflict: EPIC-001 ↔ PROJ-123

Local Version:
  Name: User Authentication System
  Status: in-progress
  Updated: 2024-01-10 09:00

Jira Version:
  Name: User Auth (Updated by John)
  Status: completed
  Updated: 2024-01-10 10:30

Resolution:
[ ] Keep Local
[ ] Keep Jira
[ ] Merge (newest wins)
```

### Webhooks (Real-time Sync)

Enable real-time updates from Jira:

1. **Enable webhook in settings:**
   ```json
   {
     "aicc.jira.webhookEnabled": true
   }
   ```

2. **Get webhook URL:**
   ```bash
   # Command Palette
   AI Command Center: View Jira Sync Status
   ```
   
   Shows: `Webhook URL: http://localhost:3001/webhook`

3. **Configure in Jira:**
   - Go to Jira Settings → System → WebHooks
   - Click **Create a WebHook**
   - URL: Your webhook URL (use ngrok for public access)
   - Events: Issue Created, Updated, Deleted
   - Save

**Behavior:**
- Jira sends webhook on any issue change
- Extension receives webhook
- Automatically syncs affected item
- Shows notification: "PROJ-123 updated in Jira, synced to EPIC-001"

---

## MCP Server

### What is MCP?

Model Context Protocol (MCP) is a standard protocol for AI agents to interact with external tools and data sources. The AI Command Center provides an MCP server that exposes planning operations to AI agents.

### Setup for Claude Desktop

1. **Enable MCP in settings:**
   ```json
   {
     "aicc.mcp.enabled": true,
     "aicc.mcp.transport": "stdio"
   }
   ```

2. **Configure Claude Desktop:**

   Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "aicc-planning": {
         "command": "node",
         "args": [
           "/path/to/ai-command-center/out/mcp/mcpServer.js"
         ],
         "env": {
           "WORKSPACE_ROOT": "/path/to/your/project"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

4. **Verify in Claude:**
   ```
   You: "What planning tools do you have access to?"
   
   Claude: "I have access to AI Command Center planning tools:
   - create_epic, update_epic, delete_epic
   - create_story, update_story, delete_story
   - create_task, update_task, delete_task
   - get_planning_tree
   - search_planning_items"
   ```

### Available Tools

#### Planning Operations

**create_epic**
```json
{
  "name": "create_epic",
  "description": "Create a new epic in the planning system",
  "inputSchema": {
    "name": "string",
    "description": "string",
    "priority": "high | medium | low",
    "tags": ["string"]
  }
}
```

**get_planning_tree**
```json
{
  "name": "get_planning_tree",
  "description": "Get complete planning hierarchy",
  "inputSchema": {
    "includeCompleted": "boolean"
  }
}
```

#### Using with AI

```
You: "Create an epic for building a REST API with authentication, 
     database migrations, and API documentation stories"

Claude: [Uses create_epic tool]
        Created EPIC-005: REST API Development
        
        [Uses create_story tool 3 times]
        - STORY-015: Authentication endpoints
        - STORY-016: Database migrations
        - STORY-017: API documentation
        
        Would you like me to break these down into tasks?
```

### HTTP Transport (Remote Access)

For web-based AI tools:

```json
{
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "http",
  "aicc.mcp.port": 3000
}
```

**Start server:**
```bash
# Command Palette
AI Command Center: Start MCP Server
```

**Access:**
- URL: `http://localhost:3000`
- Health check: `GET http://localhost:3000/health`
- Tools: `GET http://localhost:3000/tools`

---

## Configuration

### Configuration Presets

The extension includes 4 presets:

#### 1. Starter (Minimal)
```bash
# Command Palette
AI Command Center: Apply Configuration Preset → Starter
```

**Best for:** Small projects, solo developers

**Settings:**
- Auto-save: 60s
- Log level: warn
- MCP: stdio only
- Jira: disabled

#### 2. Standard (Recommended)
```bash
AI Command Center: Apply Configuration Preset → Standard
```

**Best for:** Team projects, medium complexity

**Settings:**
- Auto-save: 30s
- Log level: info
- MCP: stdio + HTTP
- Jira: optional

#### 3. Enterprise (Full Features)
```bash
AI Command Center: Apply Configuration Preset → Enterprise
```

**Best for:** Large teams, complex workflows

**Settings:**
- Auto-save: 15s
- Log level: debug
- MCP: all transports
- Jira: enabled with webhooks
- File logging: enabled
- Evolution tracking: detailed

### Configuration Levels

Settings are merged in this order (last wins):

1. **Default** (built-in)
2. **Workspace** (`.vscode/settings.json`)
3. **User** (global settings)
4. **Runtime** (temporary overrides)

### Key Settings

#### Planning

```json
{
  "aicc.planPath": ".project/plan",
  "aicc.autoSaveInterval": 30,
  "aicc.storyPointScale": "fibonacci",
  "aicc.sprintDurationWeeks": 2
}
```

#### Logging

```json
{
  "aicc.logLevel": "info",
  "aicc.fileLoggingEnabled": true,
  "aicc.retentionDays": 7,
  "aicc.maxFileSizeMB": 5
}
```

#### UI

```json
{
  "aicc.ui.theme": "auto",
  "aicc.ui.showWelcomeMessage": true,
  "aicc.ui.confirmDelete": true
}
```

### Configuration Health

Check configuration validity:

```bash
# Command Palette
AI Command Center: Show Configuration Health
```

**Health Score:**
- 🟢 90-100: Excellent
- 🟡 70-89: Good
- 🟠 50-69: Fair
- 🔴 <50: Poor

**Reports:**
- Missing required settings
- Invalid values
- Performance recommendations
- Security warnings

---

## Command Reference

### Planning Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `aicc.createEpic` | - | Create new epic |
| `aicc.createStory` | - | Create story under epic |
| `aicc.createTask` | - | Create task under story |
| `aicc.openPlanningPanel` | - | Open WebView UI |
| `aicc.exportToJira` | - | Alias for Jira sync |

### Jira Commands

| Command | Description |
|---------|-------------|
| `aicc.jira.initialize` | Initialize Jira integration |
| `aicc.jira.testConnection` | Test Jira API connection |
| `aicc.jira.sync` | Bidirectional sync |
| `aicc.jira.syncPush` | Push local → Jira |
| `aicc.jira.syncPull` | Pull Jira → local |
| `aicc.jira.configure` | Configuration wizard |
| `aicc.jira.viewSyncStatus` | View sync status |
| `aicc.jira.viewMappings` | View ID mappings |
| `aicc.jira.resolveConflicts` | Resolve sync conflicts |
| `aicc.jira.disable` | Disable Jira integration |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `aicc.config.validate` | Validate configuration |
| `aicc.config.showHealth` | Show health score |
| `aicc.config.applyPreset` | Apply preset |
| `aicc.config.exportConfig` | Export config to file |
| `aicc.config.reload` | Reload configuration |

### MCP Commands

| Command | Description |
|---------|-------------|
| `aicc.mcp.start` | Start MCP server |
| `aicc.mcp.stop` | Stop MCP server |
| `aicc.mcp.restart` | Restart MCP server |

---

## Troubleshooting

### Common Issues

#### 1. "Planning structure not found"

**Solution:**
```bash
# Command Palette
AI Command Center: Create Epic
# This initializes the structure
```

#### 2. "Jira connection failed"

**Checks:**
1. ✅ API token is valid (regenerate if expired)
2. ✅ Base URL is correct: `https://your-domain.atlassian.net`
3. ✅ Email matches Jira account
4. ✅ Project key exists and you have access
5. ✅ Network allows outbound HTTPS

**Test:**
```bash
curl -u your-email@company.com:YOUR_API_TOKEN \
  https://your-domain.atlassian.net/rest/api/3/myself
```

#### 3. "Sync conflicts"

**Resolution:**
1. Run: `AI Command Center: Resolve Jira Conflicts`
2. Review each conflict
3. Choose resolution strategy
4. Re-sync

**Prevention:**
- Use manual conflict resolution initially
- Enable auto-sync only after stable
- Communicate with team about sync times

#### 4. "MCP server won't start"

**Checks:**
1. ✅ Port 3000 available (or configured port)
2. ✅ Node.js installed and in PATH
3. ✅ Extension compiled: `npm run compile`

**Logs:**
```bash
# Check Output panel
View → Output → AI Command Center (MCP)
```

#### 5. "WebView not loading"

**Solution:**
```bash
# Rebuild webview
cd webview && npm run build && cd ..

# Or full rebuild
npm run compile
```

### Debug Logging

Enable detailed logging:

```json
{
  "aicc.logLevel": "debug",
  "aicc.fileLoggingEnabled": true,
  "aicc.mcp.logging.level": "debug"
}
```

**Log locations:**
- **Output Panel**: View → Output → AI Command Center
- **File Logs**: `.project/plan/.logs/aicc-YYYY-MM-DD.log`
- **MCP Logs**: `.project/plan/.logs/mcp-YYYY-MM-DD.log`

### Performance Issues

#### Slow Sync

**Solutions:**
1. Reduce sync frequency:
   ```json
   { "aicc.jira.syncInterval": 30 }
   ```

2. Sync specific item types:
   ```typescript
   // Only sync epics
   { itemTypes: ['epic'] }
   ```

3. Disable webhooks if not needed

#### High Memory Usage

**Solutions:**
1. Reduce cache size:
   ```json
   { "aicc.mcp.resources.cacheSize": 50 }
   ```

2. Lower log retention:
   ```json
   { "aicc.retentionDays": 3 }
   ```

---

## Best Practices

### Planning Hierarchy

1. **Epic Naming**
   - ✅ Good: "User Authentication System"
   - ❌ Bad: "Auth"
   - Use descriptive, specific names

2. **Story Sizing**
   - Keep stories to 3-8 points
   - Break large stories (>8 points) into smaller ones
   - Use Fibonacci scale for better estimation

3. **Task Granularity**
   - Tasks should be completable in 1-4 hours
   - Break down if larger
   - Assign to specific team members

### Jira Integration

1. **Initial Setup**
   - Start with manual sync
   - Test with a few items first
   - Enable auto-sync after confidence

2. **Conflict Resolution**
   - Use "manual" resolution initially
   - Document team's sync schedule
   - Avoid concurrent edits of same item

3. **Sync Strategy**
   - **Local-first teams**: Use `push` strategy
   - **Jira-first teams**: Use `pull` strategy
   - **Hybrid teams**: Use `bidirectional` with manual conflicts

### MCP Server

1. **Security**
   - Use stdio for local AI agents (most secure)
   - Use HTTP only on trusted networks
   - Consider firewall rules for HTTP mode

2. **Performance**
   - Enable caching for frequent operations
   - Set reasonable timeouts (30s default)
   - Monitor resource usage

### Configuration

1. **Version Control**
   - ✅ Commit: `.vscode/settings.json` (workspace config)
   - ❌ Don't commit: API tokens, secrets
   - Use workspace settings for team consistency

2. **Presets**
   - Use "Standard" for most teams
   - Customize after understanding defaults
   - Document custom configurations

---

## Advanced Topics

### Custom Field Mapping

Extend Jira field mappings for custom fields:

```typescript
// .project/plan/config/field-mappings.json
{
  "customfield_10020": "storyPoints",
  "customfield_10030": "epicName"
}
```

### Backup and Restore

**Backup:**
```bash
# Backup planning structure
tar -czf aicc-backup-$(date +%Y%m%d).tar.gz .project/plan/
```

**Restore:**
```bash
# Restore from backup
tar -xzf aicc-backup-20240110.tar.gz
```

### Migration from Other Tools

**From Jira:**
1. Configure Jira integration
2. Run: `AI Command Center: Pull from Jira`
3. All Jira issues become local planning items

**From Trello/Asana:**
1. Export to CSV
2. Write custom import script using MCP tools
3. Or manually create via Planning Panel

---

## Support

### Getting Help

- **Issues**: https://github.com/your-org/ai-command-center/issues
- **Discussions**: https://github.com/your-org/ai-command-center/discussions
- **Documentation**: https://github.com/your-org/ai-command-center/wiki

### Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### License

MIT License - see [LICENSE](../LICENSE) for details.

---

**Last Updated**: January 10, 2024 | **Version**: 1.0.0
