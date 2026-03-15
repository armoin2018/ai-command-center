# What's New in AI Command Center

**Version 1.1.24** | Release Notes & New Features

---

## Table of Contents

1. [Multi-Workspace MCP](#multi-workspace-mcp)
2. [Security Enhancements](#security-enhancements)
3. [Advanced Mode](#advanced-mode)
4. [Footer & Status Bar](#footer--status-bar)
5. [Non-Disruptive Refresh](#non-disruptive-refresh)
6. [Connection Management](#connection-management)
7. [AI Kit Catalogs](#ai-kit-catalogs)
8. [Planning Enhancements](#planning-enhancements)
9. [Configuration Reference](#configuration-reference)

---

## Multi-Workspace MCP

The MCP (Model Context Protocol) server now supports multi-workspace scenarios with automatic coordination between VS Code windows.

### Leader Election

When multiple VS Code windows are open, the extension automatically elects a leader workspace to host the MCP server. This prevents port conflicts and ensures a single source of truth.

- The first workspace to activate becomes the leader
- If the leader closes, a new leader is elected from remaining workspaces
- Health scanning detects unresponsive leaders and triggers re-election

### Workspace Registration

Each workspace registers itself with the MCP server, providing:

- Workspace name and root path
- Available planning data (epics, stories, tasks)
- Active instruction sources and skill inventory

### Health Scanning

Background health checks run at a configurable interval to verify the MCP server is responsive. If the health check fails:

1. The extension attempts to reconnect (see [Connection Management](#connection-management))
2. If reconnection fails, a new leader election is triggered
3. The footer health indicator updates in real-time

---

## Security Enhancements

Version 1.1.x introduced several security hardening measures for the webview panels.

### Content Security Policy (CSP) with Nonce

All webview scripts now use CSP nonces to prevent unauthorized script injection:

```html
<meta http-equiv="Content-Security-Policy"
  content="script-src 'nonce-{{nonce}}';">
```

Each webview render generates a unique cryptographic nonce. Only scripts tagged with the matching nonce attribute are executed.

### CORS Localhost-Only

The webview's `connect-src` directive restricts API calls to localhost origins:

```
connect-src http://localhost:* https://localhost:* ws://localhost:*
```

This prevents webview content from making requests to external servers.

### No Inline Scripts

All JavaScript has been moved to external bundled files. No inline `<script>` blocks remain in any webview HTML, eliminating an entire class of XSS vulnerabilities.

---

## Advanced Mode

A new `aicc.advancedMode` setting controls the visibility of power-user features.

### Standard Mode (default)

- Secondary panel in the VS Code panel area (bottom/side)
- Status bar indicators for MCP and instruction sources
- Command palette access to all planning operations

### Advanced Mode

Enable in settings:

```json
{
  "aicc.advancedMode": true
}
```

Advanced mode adds:

- **Sidebar tree view** — Hierarchical planning tree in the Explorer sidebar
- **Editor panel** — Full-featured planning panel opened via command
- **History panel** — Item version history with diff view
- **Context menus** — Right-click actions on tree items (edit, delete, copy ID, set status)

The status bar displays `$(layers) AICC: Advanced` when enabled.

---

## Footer & Status Bar

### Secondary Panel Footer

The footer row at the bottom of the secondary panel now displays:

| Element              | Description                                       |
|----------------------|---------------------------------------------------|
| Agent selector       | Switch between AI-ley Orchestrator, Architect, etc.|
| Workspace:Port       | Current workspace name and MCP port number        |
| Health indicator     | Green (connected), red (disconnected)             |
| Save All button      | Batch-save all pending changes                    |

### Status Bar Items

Two new status bar items appear in the VS Code status bar:

- **Instruction Sources** — `$(file-code) N instructions` — click to manage active sources
- **MCP Status** — `$(radio-tower) MCP` (running) or `$(debug-disconnect) MCP` (stopped) — click to start/stop/restart

---

## Non-Disruptive Refresh

UI updates now use delta-based rendering to avoid disruptive full-page reloads.

### Delta Updates

When planning data changes (file edits, status updates, Jira sync), only the affected DOM elements are updated. This preserves:

- Scroll position
- Expanded/collapsed state
- Form input focus and unsaved edits
- Selected items

### Conflict Banners

When another user or process modifies an item you're currently editing, a conflict banner appears at the top of the item:

> ⚠️ This item was modified externally. [Reload] [Keep My Changes]

This prevents silent data loss from concurrent edits.

### Real-Time Update System

The `RealTimeUpdateSystem` service watches `.project/` files for changes and pushes incremental updates to all open webview panels. Config file changes (e.g., `instruction-sources.json`) trigger immediate setting refreshes.

---

## Connection Management

MCP client connections now feature robust reconnection logic.

### Exponential Backoff

If the connection to the MCP server drops, the client retries with exponential backoff:

| Attempt | Delay    |
|---------|----------|
| 1       | 1 second |
| 2       | 2 seconds|
| 3       | 4 seconds|
| 4       | 8 seconds|
| 5+      | 30 seconds (max) |

### Graceful Shutdown

On extension deactivation, all connections are cleanly closed:

1. Pending requests are allowed to complete (5-second grace period)
2. WebSocket/HTTP connections send close frames
3. File watchers and timers are disposed
4. State is persisted for next activation

### State Machine

Connection state follows a deterministic state machine:

```
DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTING → DISCONNECTED
                    ↓                        ↑
               RECONNECTING ────────────────┘
```

The footer health indicator reflects the current state with color coding.

---

## AI Kit Catalogs

The new AI Kit Catalog tab in the secondary panel lets you browse, install, and manage AI kits without leaving VS Code.

### Features

- **Browse** — View available kits with descriptions and version info
- **Search** — Filter kits by name, category, or keyword
- **Install/Uninstall** — One-click kit management with file tracking
- **Settings** — Configure kit-specific settings per installation

### Commands

| Command               | Description                     |
|-----------------------|---------------------------------|
| `AICC: Install AI Kit`  | Install a kit by ID or URL   |
| `AICC: Uninstall AI Kit`| Remove an installed kit      |
| `AICC: Refresh AI Kits` | Refresh catalog and indexes  |

---

## Planning Enhancements

### Intake Forms

Custom intake forms (`.github/aicc/intakes/`) allow structured data collection for creating new epics, stories, or tasks with validated fields.

### Version Override System

Manage multiple instruction sources with priority-based merging. Higher-priority sources override lower ones, with `.my/` overrides taking highest precedence.

### Template System

Use planning templates to quickly scaffold common project structures:

```
Cmd+Shift+P → "AICC: Use Template" → Select template
```

---

## Configuration Reference

### New Settings in v1.1.x

| Setting                  | Type      | Default     | Description                          |
|--------------------------|-----------|-------------|--------------------------------------|
| `aicc.advancedMode`      | `boolean` | `false`     | Enable sidebar and editor panels     |
| `aicc.mcp.transport`     | `string`  | `"stdio"`   | MCP transport mode                   |
| `aicc.mcp.host`          | `string`  | `"localhost"`| MCP server bind address             |
| `aicc.logLevel`          | `string`  | `"info"`    | Extension log level                  |

### Migrating from v1.0.x

No breaking changes. All v1.0.x settings and plan files remain compatible. New features are opt-in via settings.

---

*See the [AI-Ley Framework Guide](AI_LEY_FRAMEWORK.md) for the full resource reference, or the [Quick Start](QUICK_START.md) to get started.*
