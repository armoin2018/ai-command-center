# AI Command Center — Settings Reference

All settings are prefixed with `aicc.` and can be configured in VS Code's `settings.json` or via **Settings UI** → search "AI Command Center".

---

## General

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.advancedMode` | `boolean` | `false` | Enable advanced mode to show legacy sidebar tree view, editor panel, and additional commands. When disabled (default), only the bottom panel UI is active. |

---

## Planning & Velocity

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.planPath` | `string` | `".project/plan"` | Directory path for planning artifacts (relative to workspace root). |
| `aicc.autoSaveInterval` | `number` | `30` | Auto-save interval in seconds (`0` = disabled). |
| `aicc.storyPointScale` | `string` | `"fibonacci"` | Story point estimation scale. Options: `fibonacci` (1, 2, 3, 5, 8, 13, 21), `linear` (1–8). |
| `aicc.sprintDurationWeeks` | `number` | `2` | Default sprint duration in weeks (1–4). |
| `aicc.velocity.autoSnapshot` | `boolean` | `true` | Automatically record sprint velocity snapshots on sprint change. |

---

## Logging

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.logLevel` | `string` | `"info"` | Logging level. Options: `debug`, `info`, `warn`, `error`. |
| `aicc.fileLoggingEnabled` | `boolean` | `true` | Enable logging to file (in addition to Output Channel). |
| `aicc.retentionDays` | `number` | `7` | Log file retention period in days (1–30). |
| `aicc.maxFileSizeMB` | `number` | `5` | Maximum log file size in MB before rotation (1–50). |

---

## Jira Integration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.jira.enabled` | `boolean` | `false` | Enable Jira integration. |
| `aicc.jira.baseUrl` | `string` | `""` | Jira Cloud base URL (e.g., `https://your-domain.atlassian.net`). |
| `aicc.jira.email` | `string` | `""` | Jira account email for API authentication. |
| `aicc.jira.apiToken` | `string` | `""` | Jira API token for authentication (stored securely). |
| `aicc.jira.projectKey` | `string` | `""` | Default Jira project key (e.g., `PROJ`). |
| `aicc.jira.syncStrategy` | `string` | `"bidirectional"` | Sync strategy. Options: `push`, `pull`, `bidirectional`. |
| `aicc.jira.conflictResolution` | `string` | `"manual"` | Conflict resolution strategy. Options: `local-wins`, `remote-wins`, `manual`, `merge`. |
| `aicc.jira.autoSync` | `boolean` | `false` | Enable automatic synchronization with Jira. |
| `aicc.jira.syncInterval` | `number` | `15` | Auto-sync interval in minutes (5–120). Only applies when `autoSync` is enabled. |
| `aicc.jira.webhookEnabled` | `boolean` | `false` | Enable Jira webhook for real-time updates. |

---

## Confluence Integration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.confluence.enabled` | `boolean` | `false` | Enable Confluence integration. |
| `aicc.confluence.baseUrl` | `string` | `""` | Confluence base URL (e.g., `https://your-domain.atlassian.net/wiki`). |

---

## MCP Server

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.enabled` | `boolean` | `true` | Enable MCP (Model Context Protocol) server. |
| `aicc.mcp.transport` | `string` | `"stdio"` | Transport protocol. Options: `stdio`, `http`, `https`, `websocket`. |
| `aicc.mcp.port` | `number` | `3000` | Port number for HTTP transport (1024–65535). |
| `aicc.mcp.localhostOnly` | `boolean` | `true` | Restrict MCP server to localhost connections only (recommended for security). |
| `aicc.mcp.host` | `string` | `"localhost"` | Hostname or IP to bind MCP server. Requires `localhostOnly` = `false` for non-localhost. |
| `aicc.mcp.portRangeStart` | `number` | `3100` | Start of port range for multi-workspace MCP leader election. |
| `aicc.mcp.portRangeEnd` | `number` | `3110` | End of port range for multi-workspace MCP leader election. |

### MCP Logging

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.logging.enabled` | `boolean` | `true` | Enable MCP server logging. |
| `aicc.mcp.logging.level` | `string` | `"info"` | MCP server log level. Options: `debug`, `info`, `warn`, `error`. |

### MCP Tools

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.tools.enabled` | `boolean` | `true` | Enable MCP tools (create, update, delete, search operations). |
| `aicc.mcp.tools.timeout` | `number` | `30000` | Tool execution timeout in milliseconds (1000–60000). |

### MCP Resources

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.resources.enabled` | `boolean` | `true` | Enable MCP resources (planning tree, epic details, etc.). |
| `aicc.mcp.resources.cacheSize` | `number` | `100` | Number of resources to cache for faster access (0–1000). |

### MCP Prompts

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.prompts.enabled` | `boolean` | `true` | Enable MCP prompts (epic creation, sprint planning, etc.). |

### MCP SSL/TLS

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.ssl.enabled` | `boolean` | `false` | Enable SSL/TLS for MCP server (auto-enables when transport is `https`). |
| `aicc.mcp.ssl.certPath` | `string` | `""` | Path to SSL certificate file (leave empty to auto-generate self-signed). |
| `aicc.mcp.ssl.keyPath` | `string` | `""` | Path to SSL private key file (leave empty to auto-generate). |

### MCP WebSocket

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.mcp.websocket.enabled` | `boolean` | `false` | Enable WebSocket transport for real-time bidirectional communication. |
| `aicc.mcp.websocket.port` | `number` | `3001` | Port for WebSocket server (1024–65535). |

---

## UI Preferences

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.ui.showWelcomeMessage` | `boolean` | `true` | Show welcome message on extension activation. |
| `aicc.ui.theme` | `string` | `"auto"` | UI theme for planning panel. Options: `light`, `dark`, `auto` (match VS Code). |
| `aicc.ui.confirmDelete` | `boolean` | `true` | Confirm destructive actions (delete epic/story/task). |
| `aicc.ui.showComponentReferences` | `boolean` | `false` | Show component reference labels on UI elements (useful for development). |

---

## AI Kit

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.aiKit.autoLoad.enabled` | `boolean` | `false` | Enable AI Kit auto-loading recommendations on workspace activation. |
| `aicc.aiKit.autoLoad.onActivation` | `boolean` | `true` | Trigger auto-load detection when the extension activates. |
| `aicc.aiKit.autoLoad.defaultKits` | `string[]` | `[]` | Kit names to always recommend regardless of workspace type. |
| `aicc.aiKit.autoLoad.alwaysDismissed` | `boolean` | `false` | Suppress auto-load recommendations permanently for this workspace. |
| `aicc.aiKit.globalCachePath` | `string` | `"~/.vscode/ai-ley-cache"` | Global cache directory for AI Kit repositories (shared across workspaces). |

---

## Skill Health Monitoring

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.skillHealth.enabled` | `boolean` | `true` | Enable periodic skill health monitoring probes. |
| `aicc.skillHealth.intervalMs` | `number` | `300000` | Interval in milliseconds between health probes (default: 5 minutes). |

---

## Offline Queue

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.offlineQueue.maxRetries` | `number` | `5` | Maximum retry attempts before moving to dead-letter queue. |
| `aicc.offlineQueue.backoffBaseMs` | `number` | `1000` | Base delay in milliseconds for exponential backoff retry. |

---

## Agent Memory

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.memory.maxEntries` | `number` | `1000` | Maximum agent session memory entries before auto-pruning. |
| `aicc.memory.pruneAgeDays` | `number` | `90` | Auto-prune memory entries older than this many days. |

---

## Telemetry

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aicc.telemetry.localEnabled` | `boolean` | `true` | Enable local-only workspace telemetry collection. No data is sent externally. |

---

*Generated for AI Command Center v2.0.0 — February 2026*
