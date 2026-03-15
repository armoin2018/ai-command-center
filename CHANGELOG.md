# Changelog

All notable changes to the AI Command Center extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-02-21

### 🚀 v2.0.0 — Major Feature Release (Sprints 15–30)

This release represents a major evolution of AI Command Center from a planning panel into a full-spectrum AI-powered project management platform with 40+ MCP tools, a skills engine, analytics, and deep integrations.

#### 📊 Planning System
- **Velocity Engine** — Sprint velocity calculation, historical tracking, and trend analysis
- **Burndown Charts** — Real-time burndown visualization with ideal-line comparison
- **Sprint Forecasting** — AI-assisted completion predictions based on velocity history
- **Plan History & Archival** — Version-controlled plan snapshots with restore capability
- **Natural Language Planning** — Create epics, stories, and tasks from plain-English descriptions
- **Git Branch Auto-Linking** — Automatically associate git branches with plan items by naming convention

#### 🧩 AI Kit Platform
- **Component System** — Modular UI components (epic-card, filter-bar, planning-tree, story-list, task-card, toolbar)
- **Config Forms** — Dynamic configuration forms generated from kit manifests
- **Global Caching** — Cross-workspace AI Kit cache (`~/.vscode/ai-ley-cache`) for faster loads
- **Manifests** — Standardized kit manifests with auto-load recommendations and workspace detection

#### 🔧 MCP Tools (40+ Tools)
- **Full CRUD Surface** — Create, read, update, delete, list, move, link, search across all plan entities
- **Resource Discovery** — Discover agents, skills, personas, and instructions dynamically
- **Bulk Operations** — Batch status updates, reparenting, and cascade deletes
- **Velocity & Forecasting Tools** — Metrics retrieval, burndown data, completion forecasting, sprint recording
- **Idea Analytics Tools** — Scoring, duplicate detection, enrichment suggestions, trend analysis, lifecycle rules
- **Prompt Tracking Tools** — Usage tracking, outcome updates, effectiveness scoring, leaderboard
- **Offline Queue Tools** — Queue stats, drain, dead-letter inspection, retry
- **Agent Memory Tools** — Store, recall, export, prune, and summarize session memory
- **Knowledge Base Tools** — Store, search, deduplicate, summarize, and export cross-workspace knowledge
- **Confluence Tools** — Page retrieval, search, push, pull, and bidirectional sync
- **Skill Registration Tools** — Auto-discover, register, list registrations, index retrieval
- **Pipeline Tools** — Run pipelines, list definitions, inspect runs
- **Telemetry Tools** — Summary, event listing, custom event tracking
- **Ideation Tools** — Full idea lifecycle: create, update, delete, list, vote, comment, promote, retrieve

#### ⚡ Skills Platform
- **Skill-to-MCP Factory** — Convert any skill definition into an MCP tool automatically
- **Skill Pipelines** — Chain skills into multi-step automation pipelines with data flow
- **Skill Health Monitoring** — Periodic health probes with configurable intervals and status reporting
- **Skill Registration Manager** — Auto-discovery and registration of skills from workspace and kits
- **Offline-First Queue** — Exponential-backoff retry queue with dead-letter handling for failed operations

#### 🔗 Integrations
- **Confluence Client** — Full Confluence Cloud integration (get, search, push, pull, sync)
- **Jira Sync Enhancements** — Bidirectional sync with conflict resolution strategies (local-wins, remote-wins, manual, merge)
- **Reactive Event Bus** — Publish/subscribe event system for cross-component communication

#### 📈 Analytics
- **Workspace Telemetry** — Local-only telemetry collection for workspace activity insights
- **Prompt Effectiveness Scoring** — Track prompt usage and outcomes to surface highest-performing prompts
- **Idea Analytics & AI Enrichment** — Score ideas, detect duplicates, surface trends, and suggest enrichments

#### 🤖 AI Services
- **Agent Session Memory** — Persistent memory store with auto-pruning (configurable max entries and age)
- **Cross-Workspace Knowledge Base** — Shared knowledge store with semantic search and deduplication
- **Smart Context Engine** — Intelligent context assembly for AI agent interactions

#### ✅ Quality
- **172 Unit & Integration Tests** — Comprehensive test coverage across all modules
- **0 TypeScript Errors** — Full strict-mode compliance with zero compiler errors

#### 🎨 UI Polish
- **Dashboard Commands** — Velocity charts, health dashboards, prompt leaderboard, knowledge base search, queue status, memory export
- **Settings Registration** — All new features fully registered in VS Code settings with ordered grouping
- **Queue Status Bar** — Real-time offline queue status indicator in the VS Code status bar

---

## [1.0.43] - 2026-01-11

### 🐛 Bug Fixes - Duplicate ID Registration

#### Fixed
- **Tree Node ID Conflicts**
  - Story and task IDs are now globally unique across all epics
  - Previously, "story-001" existed in every epic, causing "already registered" errors
  - IDs now use composite format: `epic-001-story-001-task-001`
  - Panel now correctly expands/collapses all items without conflicts

- **Message Handler Updates**
  - Added `parseCompositeId()` helper to extract epic/story/task IDs
  - Update and delete operations now handle composite IDs correctly
  - All CRUD operations work properly with unique identifiers

### 🎯 Impact
- **All epics, stories, and tasks**: Now have globally unique IDs
- **Tree expansion**: Works correctly for all items
- **Item operations**: Update, delete, and edit operations fully functional

---

## [1.0.42] - 2026-01-11

### 🐛 Bug Fixes - Critical Planning Panel Issues

#### Fixed
- **Epic/Story README Parsing**
  - Fixed Epic parser to look for `## Overview` instead of `## Description`
  - Updated Story parser to handle multiline descriptions correctly
  - Panel now loads and displays all epics, stories, and tasks properly

- **Config Migration Error**
  - Fixed "Unknown config level: my" error in ConfigHierarchy
  - Migration now initializes source paths before attempting to save
  - Handles .my/aicc.yaml migration gracefully

- **VersionOverrideSystem ENOENT Spam**
  - Suppressed ENOENT errors for optional .ai-ley/instructions directory
  - Only logs actual errors (permissions, corruption, etc.)
  - Reduces console noise during normal operation

### 🎯 Impact
- **Planning Panel**: Now correctly expands/collapses all items
- **Item Clicking**: Epic, Story, and Task selection fully functional
- **Error Logs**: Cleaner console output without misleading errors

---

## [1.0.41] - 2026-01-11

### 🐛 Bug Fixes

#### Fixed
- **RealTimeUpdateSystem - Missing Config File Handling**
  - Suppressed ENOENT error logging when optional config files don't exist
  - System correctly works with embedded defaults when `.project/config.yaml` is missing
  - Prevents console spam with non-critical errors during normal operation
  - File watching still functions correctly when config file is created later

### 📝 Behavior
- Config files are **optional** - system falls back to embedded defaults
- File watchers are created even when config files don't exist initially
- When config file is created, watcher automatically picks it up
- Only logs file read errors for unexpected issues (not ENOENT)

---

## [1.0.40] - 2026-01-11

### ⚡ Performance Improvements

#### Added
- **Directory Scan Caching - VersionOverrideSystem**
  - Implemented 60-second TTL cache for directory scans
  - Added FileSystemWatcher for automatic cache invalidation
  - Prevents redundant file system operations on refresh
  - Reduces startup time and refresh latency

#### Optimized
- **Instruction Source Scanning**
  - Cache results keyed by `dirPath:extensions`
  - Auto-invalidate on file create/change/delete events
  - Watchers properly disposed on cleanup
  
#### Monitoring
- Added debug logging for cache hits/misses
- Performance metrics for scan operations

### 🗂️ Infrastructure

#### Added
- Created `.project/config/` directory structure
- Created `.project/history/` directory structure
- Ensures required directories exist on startup

---

## [1.0.39] - 2026-01-11

### 🐛 Bug Fixes - Critical Stability Improvements

#### Fixed
- **EvolutionTracker Initialization**
  - Fixed missing `.project/history/` directory creation causing crashes on first use
  - Moved `setInterval` out of constructor to prevent race conditions
  - Added `initialize()` method with proper async directory creation
  - Fixed error handling to detect both `UserError` and `ENOENT` properly

- **Async Disposal Pattern**
  - Made `EvolutionTracker.dispose()` async to properly await event flushing
  - Updated `PlanningManager.dispose()` to await tracker disposal
  - Prevents lost history events on extension shutdown

- **VersionOverrideSystem Directory Creation**
  - Added directory creation in `createDefaultConfiguration()`
  - Ensures `.project/config/` exists before writing config files
  - Prevents activation failures on fresh installations

- **Memory Leak Prevention**
  - Added null assignment after `clearInterval()` in JiraIntegrationManager
  - Prevents orphaned timer references

- **Type Safety**
  - Fixed CollaborativeEditing timer type to use `ReturnType<typeof setInterval>`
  - Ensures cross-platform compatibility

- **Input Validation**
  - Added regex validation for HistoryPanel item IDs
  - Pattern: `/(epic|story|task)-\d{3}/`
  - Improves UX and prevents invalid history requests

### 📊 Code Quality
- Comprehensive code audit completed
- Created detailed audit report in `.project/AUDIT_REPORT.md`
- Overall code health score: B+ (85/100)
- All P0 critical issues resolved

---

## [1.0.38] - 2026-01-11

### 🐛 Bug Fixes

#### Fixed
- **VersionOverrideSystem Error Handling**
  - Fixed file not found detection to handle `UserError` from WorkspaceManager
  - Improved error handling consistency across file operations
  - System now creates default config automatically when file is missing

### 🔧 Improvements
- Enhanced error messages with better context
- Improved logging for initialization failures

---

## [1.0.37] - 2026-01-11

### ✨ Features

#### Added
- **Evolution Tracker UI Panel**
  - New HistoryPanel WebView for item change visualization
  - Timeline view with color-coded event markers
  - Event filtering by type (created, updated, deleted, status_changed, priority_changed, assigned, moved)
  - Statistics dashboard showing total changes, created date, last modified
  - Change detail display showing field transformations
  - Command: `aicc.showItemHistory`

#### Integration
- EvolutionTracker fully integrated with UI
- Event buffering (50 events, 5s auto-flush)
- JSON history storage in `.project/history/`
- Complete audit trail for all planning items

---

## [1.0.36] - 2026-01-11

### ✨ Features

#### Added
- **Version Override System Integration**
  - Multi-source instruction management (local/git/HTTP)
  - Priority-based instruction merging (lower number = higher priority)
  - Auto-refresh with configurable intervals
  - Version tracking with SHA hashes
  - Status bar indicator showing active instruction count
  
#### Commands
- `aicc.showInstructionSources` - Quick pick to view/refresh sources
- `aicc.refreshInstructions` - Refresh all instruction sources

#### UI
- Status bar item: `$(file-code) N instructions`
- Tooltip displays active source count
- Click to open source management

#### Configuration
- Sources stored in `.project/config/instruction-sources.json`
- Each source configurable: id, name, type, location, priority, enabled flag
- Auto-refresh intervals in seconds

---

## [1.0.35] - 2026-01-11

### ✨ Features

#### Added
- **Collaborative Editing Integration**
  - Session management with 5-minute timeout
  - Optimistic locking for concurrent edits
  - Background cleanup (60s interval)
  - Conflict warnings with resolution options

#### WebView Integration
- 6 new message handlers in MainPanel
- Tree data enriched with editing indicators (✏️ username)
- Lock status display (isLocked, lockOwner)
- Real-time session updates

#### API
- 12 new public methods in PlanningManager
- Session: startEditSession, endEditSession, updateEditActivity, getActiveEditSessions
- Locking: acquireEditLock, releaseEditLock, isItemLocked, getItemLockOwner
- Conflict: hasMultipleEditors, detectEditConflict, showEditConflictWarning
- UI: getEditingIndicator, getCollaborativeEditingStats

---

## [1.0.34] - 2026-01-11

### ✨ Features

#### Added
- **Real-Time Update System Integration**
  - Config file watching with 500ms debouncing
  - Conflict detection (local vs external changes)
  - Resolution UI with 3 choices: keep local, reload, view diff
  - WebView auto-refresh via postMessage

#### Integration Points
- MainPanel: Start/stop watching on panel lifecycle
- ConfigHealthPanel: Auto-refresh health score on changes
- ConfigCommands: Dependency injection for realTimeUpdateSystem

#### File Watching
- FileSystemWatcher monitors config file
- Debounced change detection
- Proper cleanup on panel disposal

---

## [1.0.0] - 2024-01-10

### 🎉 Initial Release

Complete AI Command Center extension with planning management, Jira integration, and MCP server.

---

## Features

### Planning Manager

#### Added
- **Hierarchical Planning Structure** (Epic → Story → Task)
  - Epic management with CRUD operations
  - Story management with story point estimation
  - Task management with assignee tracking
  - Parent-child relationship preservation
  
- **File-Based Persistence**
  - `.project/plan/` directory structure
  - YAML/JSON format support
  - Atomic write operations
  - Automatic backup on updates

- **Evolution Tracking System**
  - Complete audit trail for all changes
  - Event logging (create/update/delete)
  - Version history with metadata
  - Stored in `.project/plan/evolution/events.json`

- **ID Generation System**
  - Auto-incrementing IDs: EPIC-###, STORY-###, TASK-###
  - Collision detection and resolution
  - Persistent ID tracking

- **Tree Structure**
  - TreeBuilder for hierarchy construction
  - TreeTraversal for navigation
  - PlanningTree data structure
  - Export to JSON/YAML/Markdown

### Jira Integration

#### Added
- **Full Hierarchy Synchronization**
  - Epic ↔ Jira Epic
  - Story ↔ Jira Story (with Epic linking)
  - Task ↔ Jira Sub-task (with Story linking)
  - Parent relationship preservation via mapping system

- **Bidirectional Sync Engine**
  - Three strategies: push, pull, bidirectional
  - MD5 hash-based change detection
  - Skip unchanged items for performance
  - Dry-run mode for preview

- **Conflict Resolution**
  - Four strategies: local-wins, remote-wins, manual, merge
  - Conflict detection with field-level tracking
  - Interactive conflict resolution UI
  - Conflict history logging

- **Jira REST API Client**
  - Full CRUD operations for issues
  - JQL search support
  - Transition management
  - Custom field support
  - Rate limiting (token bucket: 100 req/min)
  - Exponential backoff retry (3 attempts)
  - Comprehensive error handling

- **Real-Time Webhooks**
  - HTTP server for Jira webhooks
  - HMAC-SHA256 signature verification
  - Event processing: issue created/updated/deleted
  - Automatic single-issue sync on events
  - Configurable port

- **Sync State Management**
  - Persistent mapping: AICC ID ↔ Jira Key
  - Last sync timestamp tracking
  - Sync result history
  - Parent ID tracking (epicId, storyId)

- **10 Jira Commands**
  - Initialize, Configure, Test Connection
  - Sync (bidirectional), Push, Pull
  - View Status, View Mappings
  - Resolve Conflicts, Disable

- **10 Configuration Settings**
  - Enable/disable, credentials (baseUrl, email, apiToken)
  - Project key, sync strategy, conflict resolution
  - Auto-sync, sync interval, webhook enabled

### MCP Server

#### Added
- **Model Context Protocol Implementation**
  - Server with stdio and HTTP transports
  - Tools, resources, and prompts support
  - Planning Manager bridge
  - Configuration integration

- **12 MCP Tools**
  - `create_epic`, `update_epic`, `delete_epic`
  - `create_story`, `update_story`, `delete_story`
  - `create_task`, `update_task`, `delete_task`
  - `get_planning_tree`, `search_items`, `bulk_operations`

- **3 MCP Resources**
  - `planning://tree` - Complete hierarchy
  - `planning://epics` - All epics list
  - `planning://epic/{id}` - Epic details

- **8 Workflow Prompts**
  - Epic creation wizard
  - Sprint planning assistant
  - Progress report generator
  - Risk assessment
  - Story breakdown
  - Dependency analysis
  - Capacity planning
  - Retrospective preparation

- **Multiple Transports**
  - stdio for local AI agents (Claude Desktop)
  - HTTP for remote AI agents
  - WebSocket support (experimental)

- **Performance Features**
  - Resource caching (configurable size)
  - Tool timeout management (default: 30s)
  - Logging system integration

### WebView UI

#### Added
- **22+ React Components**
  - TreeView with expand/collapse
  - KanbanBoard with drag-and-drop
  - Timeline view
  - Calendar view
  - Charts (progress, priority distribution, burndown)
  - Activity log
  - AdvancedFilter
  - BulkOperations
  - CollaborativeIndicators
  - VersionHistory
  - And more...

- **Responsive Design**
  - Adapts to panel size
  - Mobile-friendly layouts
  - Print styles for documentation

- **Theming**
  - VS Code theme integration
  - Light/dark mode support
  - Auto-detection

- **State Management**
  - Context API (TreeContext)
  - Persistent selections
  - Filter preservation
  - Expanded node tracking

- **Production Build**
  - Webpack 5 optimization
  - 345 KB bundle size
  - Code splitting
  - Minification

### Configuration System

#### Added
- **Multi-Layer Configuration**
  - Default values (built-in)
  - Workspace settings (`.vscode/settings.json`)
  - User settings (global)
  - Runtime overrides

- **4 Built-in Presets**
  - **Starter**: Minimal configuration for solo developers
  - **Standard**: Recommended for teams (default)
  - **Enterprise**: Full features for large organizations
  - **Custom**: User-defined presets

- **Configuration Validation**
  - Health scoring (0-100)
  - Missing field detection
  - Invalid value checking
  - Performance recommendations
  - Security warnings

- **Auto-Reload System**
  - File watcher for YAML configs
  - VS Code settings monitoring
  - Live reload without restart

- **Migration System**
  - Automatic version upgrades
  - Backup before migration
  - Rollback support

- **Secrets Management**
  - Secure storage for API tokens
  - Encryption support
  - VS Code secrets API integration

### Extension Infrastructure

#### Added
- **Logging System**
  - Multi-channel logger (Extension, MCP, Jira, Planning)
  - File logging with rotation
  - Configurable retention (default: 7 days)
  - Max file size limits (default: 5 MB)
  - Debug/info/warn/error levels

- **Error Handling**
  - Custom error types (ValidationError, ExternalError, etc.)
  - Error recovery strategies
  - User-friendly error messages
  - Error logging and tracking

- **Performance Tracking**
  - Operation timing
  - Resource usage monitoring
  - Performance metrics

- **Command System**
  - 30+ commands registered
  - Command wrapper for error handling
  - Progress indicators
  - Cancellation support

---

## Configuration

### Planning Settings
```json
{
  "aicc.planPath": ".project/plan",
  "aicc.autoSaveInterval": 30,
  "aicc.storyPointScale": "fibonacci",
  "aicc.sprintDurationWeeks": 2
}
```

### Jira Settings
```json
{
  "aicc.jira.enabled": false,
  "aicc.jira.baseUrl": "",
  "aicc.jira.email": "",
  "aicc.jira.apiToken": "",
  "aicc.jira.projectKey": "",
  "aicc.jira.syncStrategy": "bidirectional",
  "aicc.jira.conflictResolution": "manual",
  "aicc.jira.autoSync": false,
  "aicc.jira.syncInterval": 15,
  "aicc.jira.webhookEnabled": false
}
```

### MCP Settings
```json
{
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "stdio",
  "aicc.mcp.port": 3000,
  "aicc.mcp.logging.enabled": true,
  "aicc.mcp.logging.level": "info",
  "aicc.mcp.tools.enabled": true,
  "aicc.mcp.tools.timeout": 30000,
  "aicc.mcp.resources.enabled": true,
  "aicc.mcp.resources.cacheSize": 100,
  "aicc.mcp.prompts.enabled": true
}
```

### Logging Settings
```json
{
  "aicc.logLevel": "info",
  "aicc.fileLoggingEnabled": true,
  "aicc.retentionDays": 7,
  "aicc.maxFileSizeMB": 5
}
```

### UI Settings
```json
{
  "aicc.ui.showWelcomeMessage": true,
  "aicc.ui.theme": "auto",
  "aicc.ui.confirmDelete": true
}
```

---

## Technical Details

### Dependencies

#### Production
- `js-yaml`: ^4.1.1 - YAML parsing
- `winston`: ^3.19.0 - Logging
- `axios`: (for Jira client) - HTTP requests
- `crypto`: (built-in) - Hash generation, HMAC

#### Development
- `@types/node`: ^18.0.0
- `@types/vscode`: ^1.85.0
- `@types/js-yaml`: ^4.0.9
- `@types/winston`: ^2.4.4
- `typescript`: ^5.3.0
- `@typescript-eslint/eslint-plugin`: ^6.0.0
- `@typescript-eslint/parser`: ^6.0.0
- `@vscode/vsce`: ^2.22.0
- `eslint`: ^8.54.0

#### WebView
- `react`: ^18.0.0
- `react-dom`: ^18.0.0
- `webpack`: ^5.104.1
- `typescript`: ^5.3.0
- `css-loader`: Latest
- `style-loader`: Latest

### Build System
- TypeScript compiler with strict mode
- Webpack 5 for WebView bundling
- ESLint for code quality
- VSCE for packaging

### File Structure
```
ai-command-center/
├── src/
│   ├── extension.ts          # Main entry point
│   ├── configManager.ts      # Configuration management
│   ├── logger.ts             # Logging system
│   ├── errorHandler.ts       # Error handling
│   ├── api/
│   │   └── jiraClient.ts     # Jira REST client
│   ├── commands/             # Command handlers
│   ├── config/               # Config utilities
│   ├── integrations/
│   │   └── jira/             # Jira integration
│   ├── mcp/                  # MCP server
│   ├── panels/               # WebView panels
│   ├── planning/             # Planning manager
│   ├── services/             # Services
│   ├── types/                # TypeScript types
│   └── utils/                # Utilities
├── webview/
│   ├── src/
│   │   ├── App.tsx           # Main React app
│   │   ├── components/       # 22+ React components
│   │   ├── contexts/         # React contexts
│   │   ├── hooks/            # Custom hooks
│   │   └── utils/            # WebView utilities
│   └── public/
│       └── index.html        # WebView HTML
├── docs/                     # Documentation
├── .project/plan/            # Planning workspace (created at runtime)
└── package.json              # Extension manifest
```

---

## Performance

### Metrics
- **Build Time**: ~4.8s (full compile)
- **WebView Bundle**: 345 KB (minified)
- **Extension Size**: ~500 KB (compiled)
- **Memory Usage**: <50 MB typical
- **Startup Time**: <500ms

### Optimizations
- Lazy loading of WebView components
- Resource caching in MCP server
- Incremental sync (hash-based change detection)
- Debounced file watchers
- Atomic file operations

---

## Known Limitations

### Current Release
1. **Jira Integration**
   - Story/Task status updates from Jira not yet implemented
   - Custom field mapping requires manual configuration
   - Bulk sync operations may be slow for 100+ items

2. **MCP Server**
   - WebSocket transport marked as experimental
   - No authentication for HTTP transport (use on trusted networks)

3. **Testing**
   - Unit tests not yet complete
   - Integration tests in development
   - Manual testing performed for all features

### Future Enhancements
- Confluence integration
- Git integration for version control
- Advanced analytics and reporting
- Team collaboration features
- Mobile app companion

---

## Upgrade Notes

### From Pre-Release to 1.0.0
This is the initial public release. No migration needed.

### Fresh Installation
1. Install VSIX: `./install-extension.sh`
2. Reload VS Code
3. Create first epic to initialize structure
4. (Optional) Configure Jira integration
5. (Optional) Set up MCP for AI assistant

---

## Contributors

- Development Team: AI Command Center Team
- Documentation: Complete user guide, quick reference, API docs
- Testing: Manual testing across all features

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/ai-command-center/issues)
- **Documentation**: See `docs/` folder
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **User Guide**: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)

---

**Release Date**: January 10, 2024  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
