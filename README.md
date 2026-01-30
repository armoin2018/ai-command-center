# AI Command Center

A comprehensive VS Code extension for AI-powered development workflows with integrated planning, Jira synchronization, and AI assistant integration via Model Context Protocol (MCP).

## ✨ Key Features

### 🎯 Planning Management
- **Hierarchical Structure**: Epic → Story → Task organization
- **Interactive WebView UI**: React-based planning panel with 22+ components
- **Evolution Tracking**: Complete audit trail with version history
- **Advanced Filtering**: Search, filter by status/priority/story points
- **Real-Time Statistics**: Progress tracking, completion rates, distributions
- **File-Based Persistence**: YAML/JSON storage with atomic writes
- **Tree Visualization**: Complete planning tree with traversal utilities
- **Export**: JSON, YAML, and Markdown export formats

### 🔄 Jira Integration (NEW!)
- **Full Hierarchy Sync**: Epic/Story/Task ↔ Epic/Story/Sub-task
- **Bidirectional Sync**: Push, pull, or bidirectional with conflict resolution
- **Real-Time Webhooks**: Instant updates from Jira changes
- **Parent Relationship Tracking**: Preserves Epic→Story→Task hierarchy
- **Conflict Detection**: MD5 hash-based change detection
- **10 Commands**: Configure, sync, resolve conflicts, view status, and more
- **Rate Limiting**: Token bucket algorithm (100 req/min) with retry logic

### 🤖 Model Context Protocol (MCP) Server
- **AI Assistant Integration**: Connect Claude Desktop to your planning structure
- **12 MCP Tools**: Create, update, search, bulk operations, statistics
- **3 Resources**: Planning tree, epics list, epic details
- **8 Workflow Prompts**: Epic creation, sprint planning, progress reports, risk assessment
- **Real-Time Sync**: Live updates between VS Code and AI assistants
- **Multiple Transports**: stdio (local) and HTTP (remote)

### 🎨 WebView UI
- **Modern React Interface**: TypeScript + React 18 with VS Code theming
- **22+ Components**: Tree view, Kanban, Timeline, Calendar, Charts, Activity log
- **Keyboard Navigation**: Arrow keys, shortcuts, accessibility support
- **Context Menus**: Right-click actions for all item types
- **State Persistence**: Remembers expanded nodes, selections, filters
- **Drag & Drop**: Reorder epics, stories, and tasks with hierarchy validation
- **Responsive Design**: Adapts to panel size with mobile-friendly layouts

### ⚙️ Configuration System
- **Multi-Layer Configuration**: Defaults → Workspace → User → Runtime
- **4 Built-in Presets**: Starter, Standard, Enterprise, Custom
- **Health Scoring**: 0-100 validation with recommendations
- **Auto-Reload**: File watcher and settings monitoring
- **Version Migration**: Automatic configuration upgrades with backup
- **Secrets Management**: Secure storage for API tokens

---

## 📚 Documentation

- **[User Guide](docs/USER_GUIDE.md)** - Complete setup and usage documentation
- **[Quick Reference](QUICK_REFERENCE.md)** - Common workflows and commands
- **[Jira Integration](JIRA_INTEGRATION_COMPLETE.md)** - Full Jira sync documentation
- **[Installation Guide](INSTALLATION.md)** - Detailed installation instructions
- **[Configuration Guide](docs/CONFIGURATION.md)** - Settings and presets
- **[MCP Setup](docs/MCP_SETUP.md)** - AI assistant integration

---

## 🚀 Quick Start

### 1. Install Extension

```bash
# Build from source
./build-vsix.sh

# Install the VSIX
./install-extension.sh

# Reload VS Code
# Cmd+Shift+P → "Developer: Reload Window"
```

### 2. Create Your First Epic

```bash
# Open Command Palette (Cmd+Shift+P)
AI Command Center: Create Epic

# Enter details
Name: "User Authentication System"
Description: "Implement secure user authentication"
Priority: High
```

### 3. Set Up Jira (Optional)

```bash
# Configure Jira integration
AI Command Center: Configure Jira Integration

# Test connection
AI Command Center: Test Jira Connection

# Sync your planning
AI Command Center: Sync with Jira
```

### 4. Connect AI Assistant (Optional)

```bash
# Enable MCP server
Settings → "aicc.mcp.enabled": true

# Configure Claude Desktop
# Edit ~/Library/Application Support/Claude/claude_desktop_config.json

# Ask Claude to help with planning!
```

---

## 🔍 VS Code Commands

### Planning Commands
- `AI Command Center: Create Epic` - Interactive epic creation wizard
- `AI Command Center: Create Story` - Create story within epic
- `AI Command Center: Create Task` - Create task within story
- `AI Command Center: Open Planning Panel` - Launch interactive WebView UI

### Jira Commands
- `AI Command Center: Configure Jira Integration` - Setup wizard
- `AI Command Center: Test Jira Connection` - Verify credentials
- `AI Command Center: Sync with Jira` - Bidirectional sync
- `AI Command Center: Push to Jira` - Local → Jira only
- `AI Command Center: Pull from Jira` - Jira → Local only
- `AI Command Center: View Jira Sync Status` - Check sync state
- `AI Command Center: View Jira Mappings` - See ID mappings
- `AI Command Center: Resolve Jira Conflicts` - Manual conflict resolution
- `AI Command Center: Initialize Jira Integration` - First-time setup
- `AI Command Center: Disable Jira Integration` - Turn off sync

### MCP Server Commands
- `AI Command Center: Start MCP Server` - Enable AI assistant integration
- `AI Command Center: Stop MCP Server` - Disable MCP server
- `AI Command Center: Restart MCP Server` - Reload server configuration

### Configuration Commands
- `AI Command Center: Validate Configuration` - Check config validity
- `AI Command Center: Show Configuration Health` - Display health score
- `AI Command Center: Apply Configuration Preset` - Quick preset application
- `AI Command Center: Show Configuration Recommendations` - Get optimization tips
- `AI Command Center: Export Configuration` - Save config to file
- `AI Command Center: Reload Configuration` - Manual reload
- `AI Command Center: Compare Configuration Presets` - View differences
- `AI Command Center: Show Configuration Version` - Version history

### 📝 Logging & Error Handling
- **Winston Logger**: Multi-transport logging (Console, File, Output Channel)
- **Structured Logging**: Contextual metadata with every log
- **Log Rotation**: Configurable retention and file size limits
- **Error Handler**: Global error handling with user notifications
- **Custom Errors**: UserError, SystemError, ExternalError types

## Installation

1. Open VS Code
2. Press `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS)
3. Type `ext install ai-command-center`
4. Press Enter

## Quick Start

### 1. Initialize Planning Structure

The extension automatically creates the planning directory structure on first use:

```
.project/
├── plan/
│   ├── epics/
│   ├── sprints/
│   └── templates/
└── config/
```

### 2. Open Planning Panel

Launch the interactive WebView UI:

```
AI Command Center: Open Planning Panel
```

Features:
- Drag-and-drop reordering
- Right-click context menus
- Advanced filtering and search
- Real-time statistics
- Export to JSON/YAML/Markdown

### 3. Connect Claude Desktop (Optional)

Enable AI assistant integration via MCP:

1. Enable MCP in VS Code settings:
   ```json
   {
     "aicc.mcp.enabled": true,
     "aicc.mcp.protocol": "stdio"
   }
   ```

2. Configure Claude Desktop (see [MCP Setup Guide](docs/MCP_SETUP.md)):
   ```json
   {
     "mcpServers": {
       "ai-command-center": {
         "command": "node",
         "args": ["/path/to/out/mcp/mcpServer.js"],
         "env": {
           "WORKSPACE_ROOT": "/path/to/workspace"
         }
       }
     }
   }
   ```

3. Ask Claude to help with planning:
   - "Create an epic for user authentication with OAuth stories"
   - "Generate a progress report for my planning structure"
   - "Help me plan this sprint with 21 story points capacity"

### 4. Configure Settings

Open Settings (`Ctrl+,` or `Cmd+,`) and search for "AICC":

```json
{
  "aicc.planPath": ".project/plan",
  "aicc.autoSaveInterval": 30,
  "aicc.logLevel": "info"
}
```

### 4. Apply a Configuration Preset

```
AI Command Center: Apply Configuration Preset
```

Choose from:
- **Minimal**: Bare essentials
- **Development**: Debug logging, auto-save enabled
- **Production**: Optimized for production use
- **Enterprise**: Full features, extended retention

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

### Logging Settings

```json
{
  "aicc.logLevel": "info",
  "aicc.fileLoggingEnabled": true,
  "aicc.retentionDays": 7,
  "aicc.maxFileSizeMB": 5
}
```

### Integration Settings

Configure in `.project/config/aicc.yaml`:

```yaml
integrations:
  jira:
    enabled: true
    baseUrl: "https://your-company.atlassian.net"
    email: "your-email@company.com"
  confluence:
    enabled: true
    baseUrl: "https://your-company.atlassian.net/wiki"
  gamma:
    enabled: false
    apiKey: ""
```

## Architecture

### Core Components

```
Extension
├── Planning System
│   ├── Planning Manager (orchestrator)
│   ├── Epic/Story/Task Managers
│   ├── Workspace Manager
│   ├── Validation System
│   └── Tree Builder
├── WebView UI
│   ├── React 18 + TypeScript
│   ├── 14 Components
│   ├── Custom Hooks (keyboard, drag-drop, state)
│   └── Export Service
├── MCP Server
│   ├── Protocol Implementation (stdio/http)
│   ├── 12 Tools (CRUD + search + stats)
│   ├── 3 Resources (tree, epics, epic details)
│   ├── 8 Workflow Prompts
│   └── MCPManager (lifecycle)
├── Configuration
│   ├── ConfigManager (multi-layer)
│   ├── ConfigValidator (health scoring)
│   ├── ConfigPresets (4 templates)
│   ├── ConfigMigration (version upgrades)
│   └── ConfigWatcher (auto-reload)
├── Logger (Winston)
└── Error Handler
```

### MCP Server Tools

**CRUD Operations:**
- `create_epic` - Create epic with priority and tags
- `create_story` - Create story with story points
- `create_task` - Create task with estimated hours
- `update_epic` - Update epic properties
- `bulk_create_stories` - Create multiple stories at once
- `bulk_create_tasks` - Create multiple tasks at once

**Query Operations:**
- `list_epics` - List all epics with filtering
- `get_planning_tree` - Get complete hierarchy
- `search_items` - Search by name/description with filters

**Statistics:**
- `get_epic_stats` - Epic-level metrics and completion
- `get_planning_stats` - Overall planning statistics
- `update_status` - Update item status

### Configuration System

```
Configuration Stack
├── ConfigManager (orchestrator)
├── ConfigValidator (validation & health)
├── ConfigPresets (templates)
├── ConfigMigration (version upgrades)
├── ConfigCommands (VS Code commands)
└── ConfigWatcher (auto-reload)
```

## Usage Examples

### Using the Planning Panel

1. **Open the panel**: `AI Command Center: Open Planning Panel`
2. **Create items**: Use the toolbar or right-click context menu
3. **Search and filter**: Use the filter bar to find specific items
4. **Drag and drop**: Reorder epics, stories, or tasks
5. **View statistics**: Check the stats panel for progress metrics
6. **Export**: Use toolbar export button for JSON/YAML/Markdown

### Using MCP with Claude Desktop

**Create an epic with stories:**
```
I need an epic for user authentication with these stories:
- OAuth 2.0 integration (8 points)
- Login/logout flows (5 points)
- Session management (3 points)
- Password reset (5 points)

Can you create this using the MCP tools?
```

**Get progress report:**
```
Use the progress_report prompt to analyze my planning structure
```

**Search for items:**
```
Find all stories related to "database" that are in progress
```

**Sprint planning:**
```
I have 21 story points for this sprint. Use the sprint_planning 
prompt to help me select stories.
```

### Programmatic Usage

```typescript
import { PlanningManager } from './planning/planningManager';

const manager = new PlanningManager(workspaceRoot, logger);
await manager.initialize();

// Create epic
const epic = await manager.createEpic({
  name: 'User Authentication',
  description: 'Implement user authentication system',
  priority: 'high',
  status: 'planning'
});

// Create story
const story = await manager.createStory({
  epicId: epic.id,
  name: 'Login Page',
  description: 'Create login UI',
  storyPoints: 5,
  status: 'todo'
});

// Create task
const task = await manager.createTask({
  storyId: story.id,
  name: 'Design login form',
  description: 'Create wireframes',
  status: 'todo'
});
```

### Configuration Management

```typescript
import { ConfigManager } from './configManager';

const configManager = ConfigManager.getInstance();

// Get configuration
const config = configManager.getConfig();

// Validate configuration
const result = configManager.validate();
if (!result.isValid) {
  console.error('Errors:', result.errors);
}

// Get health score
const score = configManager.getHealthScore(); // 0-100

// Apply preset
await configManager.applyPreset('development');

// Get recommendations
const recommendations = configManager.getRecommendations();
```

### Tree Operations

```typescript
import { PlanningManager } from './planning/planningManager';

const manager = PlanningManager.getInstance();

// Get complete planning tree
const tree = await manager.getTree();

// Search by name
const results = await manager.searchByName('authentication');

// Get blocked items
const blockedItems = await manager.getBlockedItems();

// Get tree statistics
const stats = await manager.getTreeStatistics();
console.log(`Total story points: ${stats.totalStoryPoints}`);
console.log(`Completion: ${stats.completionPercentage}%`);
```

## Development

### Prerequisites

- Node.js 18+
- VS Code 1.85.0+
- TypeScript 5.3+

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/ai-command-center.git
cd ai-command-center

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode
npm run watch
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=configManager
```

### Debugging

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. Set breakpoints in TypeScript files
4. Test the extension in the new VS Code window

## Project Structure

```
ai-command-center/
├── src/
│   ├── extension.ts                 # Entry point
│   ├── logger.ts                    # Winston logger
│   ├── errorHandler.ts              # Global error handling
│   ├── configManager.ts             # Configuration manager
│   ├── config/
│   │   ├── configValidator.ts       # Validation system
│   │   ├── configPresets.ts         # Preset templates
│   │   ├── configMigration.ts       # Version migration
│   │   ├── configCommands.ts        # VS Code commands
│   │   └── configWatcher.ts         # File watcher
│   ├── planning/
│   │   ├── planningManager.ts       # Unified interface
│   │   ├── epicManager.ts           # Epic CRUD
│   │   ├── storyManager.ts          # Story CRUD
│   │   ├── taskManager.ts           # Task CRUD
│   │   ├── workspaceManager.ts      # File system ops
│   │   ├── planningCommands.ts      # Interactive commands
│   │   ├── entities/                # Entity definitions
│   │   ├── treeBuilder/             # Tree construction
│   │   └── validation/              # Validation rules
│   ├── panels/
│   │   └── mainPanel.ts             # WebView provider
│   ├── mcp/
│   │   ├── mcpServer.ts             # MCP protocol server
│   │   ├── mcpManager.ts            # Lifecycle management
│   │   └── promptTemplates.ts       # Workflow prompts
│   ├── commands/
│   │   ├── commandIds.ts            # Command constants
│   │   └── commandHandlers.ts       # Command implementations
│   └── api/                         # External integrations
├── webview/
│   ├── src/
│   │   ├── index.tsx                # WebView entry
│   │   ├── App.tsx                  # Main component
│   │   ├── components/              # 14 React components
│   │   ├── hooks/                   # 5 custom hooks
│   │   ├── services/                # Export service
│   │   └── types/                   # TypeScript types
│   └── webpack.config.js            # Bundle config
├── docs/
│   ├── MCP_SETUP.md                 # MCP integration guide
│   ├── PLANNING.md                  # Planning system docs
│   └── CLIENT_LOGGING.md            # WebView logging
└── .project/
    ├── plan/                        # Planning artifacts
    └── config/                      # Configuration files
```
│   │   ├── epicManager.ts           # Epic CRUD
│   │   ├── storyManager.ts          # Story CRUD
│   │   ├── taskManager.ts           # Task CRUD
│   │   ├── workspaceManager.ts      # File operations
│   │   ├── entities/                # Epic/Story/Task classes
│   │   ├── validators/              # Validation rules
│   │   └── treeBuilder/             # Tree structures
│   ├── types/                       # TypeScript interfaces
│   ├── errors/                      # Custom error classes
│   ├── defaults/                    # Default configurations
│   └── mcp/                         # MCP server (planned)
├── docs/
│   ├── CONFIGURATION.md             # Configuration guide
│   └── CLIENT_LOGGING.md            # Logging documentation
├── media/                           # WebView assets
├── package.json                     # Extension manifest
├── tsconfig.json                    # TypeScript config
└── README.md                        # This file
```

## Configuration Health Scoring

The health score (0-100) is calculated based on:

- **Errors**: -20 points each
- **Warnings**: -5 points each
- **Starting Score**: 100 points

### Health Score Ranges

- **90-100**: ✓ Excellent - Configuration is optimal
- **70-89**: ⚠ Good - Minor issues, recommendations available
- **Below 70**: ✗ Poor - Requires attention

## Troubleshooting

### MCP Server Not Connecting

1. Check VS Code Output: View → Output → AI Command Center
2. Verify `aicc.mcp.enabled` is true in settings
3. Ensure Claude Desktop config has correct paths
4. Check WORKSPACE_ROOT environment variable
5. Try `AI Command Center: Restart MCP Server`

### WebView Panel Not Opening

1. Check for TypeScript/build errors in Output panel
2. Rebuild webview: `cd webview && npm run build`
3. Reload VS Code window: Developer: Reload Window
4. Check browser console in WebView (Help → Toggle Developer Tools)

### Configuration Not Loading

1. Check if `aicc.yaml` exists in the expected location
2. Verify YAML syntax is valid
3. Check extension logs: View → Output → AI Command Center
4. Reload configuration: `AI Command Center: Reload Configuration`

### Planning Items Not Saving

1. Verify workspace has `.project/plan` directory
2. Check file permissions in the planning directory
3. Review logs for error messages
4. Ensure `aicc.autoSaveInterval` > 0

## Performance

### Benchmarks

- **Extension Activation**: P95 ≤ 500ms
- **WebView Load**: Initial bundle 187 KB, ~1s load time
- **MCP Server Start**: P95 ≤ 200ms
- **Configuration Load**: P95 ≤ 100ms
- **Epic Creation**: P95 ≤ 200ms
- **Tree Build**: P95 ≤ 500ms (100 epics)
- **Search**: P95 ≤ 100ms (1000 items)

### Optimization Tips

1. Use appropriate `autoSaveInterval` (30-60s recommended)
2. Enable MCP only when using AI assistants
3. Filter planning panel for large trees (>100 epics)
3. Set reasonable log retention periods
4. Use minimal preset for resource-constrained environments

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and add tests
4. Ensure tests pass: `npm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Coding Standards

- TypeScript strict mode enabled
- ESLint configuration enforced
- 100% test coverage for new features
- JSDoc comments for public APIs
- Follow existing code patterns

## Roadmap

### Phase 1: MVP (Current)
- ✅ Extension activation and lifecycle
- ✅ Logging framework (Winston)
- ✅ Error handling system
- ✅ Configuration management
- ✅ Planning manager (Epic/Story/Task CRUD)
- ✅ File persistence and validation
- ✅ Tree builder and traversal
- ✅ Configuration presets and migration
- ✅ Configuration commands and watcher
- 🔄 WebView UI (in progress)
- 🔄 MCP Server (in progress)

### Phase 2: Integration
- ⏳ Jira integration (export/import)
- ⏳ Confluence integration
- ⏳ Gamma integration
- ⏳ GitHub integration

### Phase 3: AI Features
- ⏳ AI-powered task breakdown
- ⏳ Smart estimation
- ⏳ Sprint planning assistance
- ⏳ Risk analysis

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@ai-command-center.dev
- 🐛 Issues: [GitHub Issues](https://github.com/your-org/ai-command-center/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/your-org/ai-command-center/discussions)
- 📖 Documentation: [docs/](docs/)

## Acknowledgments

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Winston Logger](https://github.com/winstonjs/winston)
- [js-yaml](https://github.com/nodeca/js-yaml)
- [TypeScript](https://www.typescriptlang.org/)

---

**Built with ❤️ for developers by developers**
