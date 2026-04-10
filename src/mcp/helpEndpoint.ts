/**
 * Help Documentation Endpoint (REQ-HELP-001 – REQ-HELP-018)
 *
 * Serves a comprehensive, searchable help documentation portal from the MCP REST server.
 * Includes full-text search, Mermaid diagrams, Chart.js visualizations, and cookbook guides.
 */

import * as http from 'http';
import { Logger } from '../logger';

interface HelpSection {
    id: string;
    title: string;
    group: string;
    tags: string[];
    content: string;
    order: number;
}

export class HelpEndpoint {
    private logger: Logger;
    private sections: HelpSection[] = [];
    private extensionPath: string;
    private cachedPortalHTML: string | null = null;

    constructor(logger: Logger, extensionPath: string) {
        this.logger = logger;
        this.extensionPath = extensionPath;
        this.buildSections();
    }

    /**
     * Handle help-related HTTP requests
     */
    async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<boolean> {
        const url = req.url || '';
        this.logger.debug('Help endpoint request', { url, extensionPath: this.extensionPath });

        // Serve the help portal HTML
        if (url === '/help' || url === '/help/') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(this.getPortalHTML());
            return true;
        }

        // Search API
        if (url.startsWith('/api/help/search')) {
            const parsedUrl = new URL(url, 'http://localhost');
            const query = (parsedUrl.searchParams.get('q') || '').toLowerCase().trim();
            const results = this.searchSections(query);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ query, results, total: results.length }));
            return true;
        }

        // Sections list (table of contents)
        if (url === '/api/help/sections') {
            const toc = this.sections.map(s => ({ id: s.id, title: s.title, group: s.group, tags: s.tags }));
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ sections: toc }));
            return true;
        }

        // Single section
        const sectionMatch = url.match(/^\/api\/help\/sections\/([a-z0-9-]+)$/);
        if (sectionMatch) {
            const section = this.sections.find(s => s.id === sectionMatch[1]);
            if (section) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(section));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Section not found' }));
            }
            return true;
        }

        return false;
    }

    /**
     * Full-text search across sections
     */
    private searchSections(query: string): Array<{ id: string; title: string; group: string; snippet: string; score: number }> {
        if (!query) {
            return this.sections.map(s => ({ id: s.id, title: s.title, group: s.group, snippet: s.content.substring(0, 120) + '…', score: 1 }));
        }

        const terms = query.split(/\s+/).filter(Boolean);
        const results: Array<{ id: string; title: string; group: string; snippet: string; score: number }> = [];

        for (const section of this.sections) {
            const searchText = `${section.title} ${section.tags.join(' ')} ${section.content}`.toLowerCase();
            let score = 0;
            for (const term of terms) {
                const idx = searchText.indexOf(term);
                if (idx >= 0) {
                    score += 10;
                    // Title match bonus
                    if (section.title.toLowerCase().includes(term)) score += 20;
                    // Tag match bonus
                    if (section.tags.some(t => t.toLowerCase().includes(term))) score += 15;
                }
            }
            if (score > 0) {
                // Extract snippet around first match
                const contentLower = section.content.toLowerCase();
                const firstMatch = contentLower.indexOf(terms[0]);
                const start = Math.max(0, firstMatch - 40);
                const snippet = section.content.substring(start, start + 150).replace(/</g, '&lt;') + '…';
                results.push({ id: section.id, title: section.title, group: section.group, snippet, score });
            }
        }

        results.sort((a, b) => b.score - a.score);
        return results;
    }

    /**
     * Build all documentation sections
     */
    private buildSections(): void {
        this.sections = [
            // ── Getting Started ──
            {
                id: 'overview',
                title: 'Overview',
                group: 'Getting Started',
                tags: ['overview', 'introduction', 'about'],
                order: 1,
                content: `The AI Command Center (AICC) is a VS Code extension that centralizes AI-powered development workflows with integrated planning, instruction management, and external service integrations.

It consists of two major subsystems:
• AI Command Center Extension — A TypeScript VS Code extension providing planning management (Epic → Story → Task), Jira synchronization, MCP server integration for AI assistants, configurable WebView panels, and a comprehensive configuration system.
• AI-Ley Toolset — A modular, catalog-based framework under .github/ that provides AI agents, personas, instructions, prompts, skills, and workflows enabling context-aware AI assistance.

Key Features:
• Hierarchical Planning: Epic → Story → Task with full CRUD, status workflow, priority, story points, sprints
• MCP Server: Multi-protocol server (stdio/HTTP/HTTPS/WebSocket) enabling AI assistant integration
• AI Kit Catalog: Install, configure, and manage AI skill kits from GitHub repositories
• Jira Integration: Bidirectional sync with conflict resolution and webhook support
• Task Scheduler: Automated task execution with cron-like scheduling
• Ideation System: Capture, vote, and promote ideas to planning items
• 22 Specialized AI Agents: From Architecture to Security, each inheriting shared behaviors`
            },
            {
                id: 'quick-start',
                title: 'Quick Start Guide',
                group: 'Getting Started',
                tags: ['setup', 'install', 'quickstart', 'getting-started'],
                order: 2,
                content: `1. Install the Extension
   • Open VS Code → Extensions → Search "AI Command Center" → Install
   • Or install from VSIX: code --install-extension ai-command-center-*.vsix

2. Initialize Your Project
   • Open Command Palette (Ctrl+Shift+P) → "AICC: Initialize Project"
   • This creates .project/ with PLAN.json and supporting files
   • Optionally select a workspace template from 6 pre-configured options

3. Open the Panels
   • Planning Panel: Click the AICC icon in the Activity Bar
   • Secondary Panel: Right-click → "AICC: Open Secondary Panel"
   • Available tabs: Planning, AI Kits, Scheduler, Jira, MCP, Ideation

4. Configure MCP Server (Optional)
   • Settings → Search "aicc.mcp"
   • Set transport to "http" for REST API access
   • Set port (default 3000) and host ("localhost")
   • Enable with "aicc.mcp.enabled: true"
   • Restart the extension

5. Connect Jira (Optional)
   • Settings → Search "aicc.jira"
   • Set baseUrl, email, apiToken, and projectKey
   • Test connection: Command Palette → "AICC: Test Jira Connection"`
            },
            {
                id: 'architecture',
                title: 'Architecture Overview',
                group: 'Getting Started',
                tags: ['architecture', 'components', 'design', 'diagram'],
                order: 3,
                content: `The AI Command Center follows a modular architecture with clear separation of concerns:

ARCHITECTURE DIAGRAM (Mermaid):
graph TB
    subgraph "VS Code Extension"
        EXT[Extension Host] --> PM[Planning Manager]
        EXT --> MCP[MCP Manager]
        EXT --> CFG[Config Manager]
        EXT --> SCH[Scheduler]
        EXT --> JIRA[Jira Client]
        PM --> PG[Plan Generator]
        PM --> EVO[Evolution Tracker]
        MCP --> SRV[MCP Server]
        MCP --> LE[Leader Election]
        MCP --> INV[Inventory Manager]
        SRV --> TOOLS[MCP Tools]
        SRV --> RES[MCP Resources]
        SRV --> HELP[Help Endpoint]
    end
    subgraph "WebView Panels"
        MAIN[Main Panel] --> TREE[Planning Tree]
        SEC[Secondary Panel] --> TABS[Tab System]
        TABS --> PLN[Planning Tab]
        TABS --> KITS[AI Kits Tab]
        TABS --> SCHTAB[Scheduler Tab]
        TABS --> MCPTAB[MCP Tab]
        TABS --> IDEATAB[Ideation Tab]
        TABS --> HELPTAB[Help Tab]
    end
    subgraph "AI-Ley Framework"
        AILEY[ai-ley.json] --> AGENTS[22 Agents]
        AILEY --> SKILLS[Skills Catalog]
        AILEY --> PERS[Personas]
        AILEY --> INST[Instructions]
        AILEY --> PROM[Prompts]
    end

Key Components:
• Planning Manager: Manages PLAN.json lifecycle, CRUD operations, status workflow
• MCP Server: Multi-transport server with tool registration, resource discovery
• Config Manager: Settings management with validation and migration
• Scheduler: Cron-like task automation from .my/aicc/tasks.json
• Leader Election: Multi-workspace coordination via port-based election
• Inventory Manager: Tracks registered workspaces across instances`
            },

            // ── Planning System ──
            {
                id: 'planning-system',
                title: 'Planning System',
                group: 'Core Features',
                tags: ['planning', 'epic', 'story', 'task', 'crud'],
                order: 10,
                content: `The Planning System provides hierarchical project management with Epic → Story → Task breakdown.

Data Model:
• Epic: High-level feature or initiative (contains stories)
• Story: User-facing deliverable (contains tasks)
• Task: Atomic work unit
• Bug: Defect tracking item (can be child of epic or story)

Status Workflow:
BACKLOG → READY → IN-PROGRESS → REVIEW → DONE
                                    ↓
                                 BLOCKED → (resume) → IN-PROGRESS
                                    ↓
                                   SKIP

Fields per Item:
• ID (auto-generated, e.g., AICC-0001)
• Summary and Description
• Status, Priority (Low/Medium/High/Critical)
• Story Points (Fibonacci or Linear)
• Sprint and Milestone assignment
• Acceptance Criteria
• Tags, Comments, Assignee, Agent
• Linked Relationships (relates-to, depends-on, blocks)
• Context Paths and External Links
• Custom Fields (8 types: text, number, date, select, multi-select, boolean, URL, email)

Storage: .project/PLAN.json (schema-validated)
History: .project/history/ (evolution tracking with audit trail)`
            },
            {
                id: 'planning-ui',
                title: 'Planning UI Features',
                group: 'Core Features',
                tags: ['ui', 'planning', 'tree', 'kanban', 'sprint'],
                order: 11,
                content: `The Planning UI provides multiple views for managing project items:

Tree View:
• Expandable/collapsible hierarchy (Epic → Story → Task)
• Checkbox selection for batch operations
• Status badges with color coding
• Right-click context menus for quick actions
• Keyboard navigation (arrow keys, Enter to expand/collapse)
• Drag-and-drop reordering with hierarchy validation

Sprint Board:
• Grid display of all sprints (planning/active/completed)
• Capacity vs committed vs completed tracking
• Burndown chart with ideal line (dashed blue) and actual line (solid green)
• Velocity chart showing historical performance (last 6 sprints)
• Sprint retrospective forms (what went well, improvements, action items)
• Sprint creation wizard with capacity input and velocity suggestion

Item Detail Tabs:
• Edit: Full CRUD form for all item fields
• Comments: Threaded comments with author and timestamps
• AI Settings: Agent selector, instructions, personas, context paths
• Info: Created/updated metadata
• Relationships: Type + target linking
• GitHub: Branch and repository tracking

Batch Operations:
• Select multiple items via checkboxes
• "Run (N)" button passes comma-separated IDs to AI agent
• AI-powered refinement via magic wand (🪄) icon per item

Filtering:
• Text search across summary/description
• Status filter chips
• Priority, assignee, sprint, and tag filters`
            },

            // ── MCP Server ──
            {
                id: 'mcp-server',
                title: 'MCP Server',
                group: 'Core Features',
                tags: ['mcp', 'server', 'api', 'transport', 'tools'],
                order: 20,
                content: `The MCP (Model Context Protocol) Server enables AI assistants to interact with the planning system.

Transport Modes:
• stdio: Standard input/output (default, use for Copilot Chat integration)
• http: REST API on configurable port (enables API docs, help portal)
• https: Secure REST API with auto-generated TLS certificates
• websocket: WebSocket transport for real-time bidirectional communication

Configuration (settings.json):
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "http",
  "aicc.mcp.port": 3000,
  "aicc.mcp.host": "localhost"

Available MCP Tools (12):
• create_epic, create_story, create_task — Create planning items
• update_epic, update_status — Modify items
• list_epics, get_planning_tree — Read operations
• search_items — Search by name/description with filters
• bulk_create_stories, bulk_create_tasks — Batch creation
• get_epic_stats, get_planning_stats — Analytics

MCP Resources:
• aicc://planning/tree — Complete hierarchical view
• aicc://planning/epics — All epics list
• aicc://planning/epic/{id} — Specific epic details

Multi-Workspace:
• Leader election across configurable port range (3100-3110)
• Workspace inventory tracking with health scanning
• Automatic registration of workspaces with the leader
• Version compatibility checks on registration`
            },
            {
                id: 'mcp-configuration',
                title: 'MCP Server Configuration',
                group: 'Core Features',
                tags: ['mcp', 'config', 'settings', 'ssl', 'security'],
                order: 21,
                content: `MCP Server Settings:

Basic Settings:
  aicc.mcp.enabled: true              // Enable/disable MCP server
  aicc.mcp.transport: "http"           // stdio | http | https | websocket
  aicc.mcp.port: 3000                  // HTTP port number
  aicc.mcp.host: "localhost"           // Bind address

Multi-Workspace Settings:
  aicc.mcp.portRangeStart: 3100        // Leader election port range start
  aicc.mcp.portRangeEnd: 3110          // Leader election port range end

Security:
• CORS: Localhost-only origin validation
• HTTPS: Auto-generated self-signed certificates
• Version Checks: Registration rejects mismatched extension versions
• Input Validation: All API inputs sanitized

API Endpoints (HTTP/HTTPS mode):
  GET  /health              — Server health status
  GET  /workspaces           — List registered workspaces
  POST /workspaces/register  — Register a workspace
  DELETE /workspaces/:id     — Unregister a workspace
  GET  /openapi.json         — OpenAPI specification
  GET  /api-docs             — Swagger UI
  GET  /help                 — Help documentation portal
  GET  /api/help/search?q=   — Search help content
  GET  /api/help/sections    — Help table of contents
  POST /mcp                  — MCP JSON-RPC requests`
            },

            // ── AI Kit Catalog ──
            {
                id: 'ai-kit-catalog',
                title: 'AI Kit Catalog',
                group: 'Core Features',
                tags: ['ai-kit', 'catalog', 'install', 'skills', 'components'],
                order: 30,
                content: `The AI Kit Catalog provides Apple Store-style management of AI skill kits.

What is an AI Kit?
An AI Kit is a packaged collection of AI-ley resources (agents, skills, personas, instructions, prompts) that can be installed from a GitHub repository into your workspace.

Kit Catalog UI:
• Grid layout with responsive auto-fill columns (min 120px)
• Kit cards showing 75×75px icons with hover scale effects
• Modal interface (80% viewport) with three tabs:
  - Settings: Editable fields from structure.json
  - Configuration: Advanced settings from config.json/config.yaml
  - Components: Tree view with checkboxes for selective install

Kit Lifecycle:
1. Browse available kits in the AI Kits tab
2. Click a kit to open the detail modal
3. Toggle components on/off as needed
4. Configure kit settings via the Configuration tab
5. Kit files are installed under .github/ with manifests in .my/aicc/catalog/

Kit Architecture:
• Global Cache: ~/.vscode/cache/{kitName}_{branch}/ — machine-scoped git clone
• Manifest: .my/aicc/catalog/{kitName}/manifest.json — tracks installed files
• Config Override: .my/aicc/catalog/{kitName}/config.json — user customizations
• Core Files: Always installed (from folderMapping)
• Components: Selectively installed named subsets`
            },

            // ── Jira Integration ──
            {
                id: 'jira-integration',
                title: 'Jira Integration',
                group: 'Integrations',
                tags: ['jira', 'sync', 'atlassian', 'issues'],
                order: 40,
                content: `Bidirectional Jira synchronization with conflict resolution and webhook support.

Setup:
1. Enable: aicc.jira.enabled = true
2. Configure base URL: aicc.jira.baseUrl = "https://your-org.atlassian.net"
3. Set email: aicc.jira.email = "your-email@example.com"
4. Set API token: aicc.jira.apiToken = "your-api-token"
5. Set project key: aicc.jira.projectKey = "PROJ"

API Token: Generate at https://id.atlassian.com/manage-profile/security/api-tokens

Sync Strategies:
• pull: Download Jira issues → PLAN.json
• push: Upload PLAN.json items → Jira
• bidirectional: Two-way sync with conflict resolution

Conflict Resolution:
• local-wins: Local changes take precedence
• remote-wins: Jira changes take precedence
• manual: Prompt user to choose
• merge: Attempt automatic field-level merge

Sync Configuration (.my/aicc/jira.sync.json):
  Assignee filter, Sprint filter, Labels filter, Date range, JQL query
  Issue type filters: epic, story, task, bug

VS Code Commands:
  AICC: Initialize Jira, Test Connection, Sync All
  AICC: Push to Jira, Pull from Jira
  AICC: View Sync Status, View Mappings, Resolve Conflicts`
            },

            // ── Scheduler ──
            {
                id: 'scheduler',
                title: 'Task Scheduler',
                group: 'Core Features',
                tags: ['scheduler', 'cron', 'automation', 'tasks'],
                order: 50,
                content: `Automated task execution with cron-like scheduling.

Configuration: .my/aicc/tasks.json

Task Definition:
{
  "id": "task-001",
  "name": "Daily Sync",
  "command": "aicc.jira.sync",
  "schedule": "0 9 * * 1-5",
  "enabled": true,
  "args": {},
  "lastRun": null,
  "nextRun": null
}

Schedule Format (cron):
  ┌───── minute (0-59)
  │ ┌──── hour (0-23)
  │ │ ┌─── day of month (1-31)
  │ │ │ ┌── month (1-12)
  │ │ │ │ ┌─ day of week (0-6, Sun=0)
  * * * * *

Operations:
• Create, update, delete scheduled tasks
• Start/stop individual tasks
• View next run countdown
• Manual trigger (run now)
• Task history and status tracking`
            },

            // ── Ideation ──
            {
                id: 'ideation',
                title: 'Ideation System',
                group: 'Core Features',
                tags: ['ideation', 'ideas', 'voting', 'brainstorm'],
                order: 60,
                content: `Capture, vote on, and promote ideas to planning items.

Data Model (.project/IDEAS.json):
• Title and Description
• Tags for categorization
• Vote count with up/down voting
• Comments thread
• Status lifecycle: Draft → Proposed → Under Review → Accepted → Rejected → Implemented
• Idea Score (0-100): Composite metric based on votes, comments, recency, feasibility

Features:
• Tag-based grouping and filtering
• Multi-select tag filters
• Paginated list (configurable page size)
• Sort by: newest, oldest, highest-rated, lowest-rated, most-watched
• AI-powered idea discovery suggestions
• Clone-to-Story: Create planning story from idea with bidirectional links
• Clone-to-Epic: Promote idea directly to planning epic
• Archive: Rejected/stale ideas moved to IDEAS-ARCHIVE.json

Jira Integration:
• Configure in .my/aicc/ideation.json
• Map idea statuses to Jira issue types
• Sync intervals and project key mapping`
            },

            // ── Cookbooks ──
            {
                id: 'cookbook-ai-kit',
                title: 'Building an AI Kit',
                group: 'Cookbook',
                tags: ['cookbook', 'ai-kit', 'build', 'create', 'tutorial'],
                order: 100,
                content: `Step-by-step guide to creating and publishing an AI Kit.

1. Create Kit Repository Structure:
   your-ai-kit/
   ├── structure.json          # Kit manifest with folderMapping
   ├── config.yaml             # Default configuration
   ├── README.md               # Kit documentation
   ├── agents/                 # Agent definitions
   │   └── my-agent.agent.md
   ├── skills/                 # Skill definitions
   │   └── my-skill/
   │       └── SKILL.md
   ├── personas/               # Persona profiles
   │   └── my-persona.md
   ├── instructions/           # Instruction files
   │   └── my-instructions.md
   └── prompts/                # Prompt templates
       └── my-prompt.prompt.md

2. Define structure.json:
   {
     "name": "my-ai-kit",
     "version": "1.0.0",
     "description": "Description of your kit",
     "author": "your-name",
     "repository": "https://github.com/user/my-ai-kit",
     "branch": "main",
     "folderMapping": {
       "agents": ".github/agents",
       "skills": ".github/skills",
       "personas": ".github/ai-ley/personas",
       "instructions": ".github/ai-ley/instructions"
     },
     "components": {
       "core": {
         "name": "Core",
         "description": "Essential agent and skills",
         "files": ["agents/my-agent.agent.md", "skills/my-skill/"]
       }
     }
   }

3. Define config.yaml:
   defaults:
     language: "en"
     verbosity: "normal"
   features:
     enable_logging: true

4. Publish to GitHub:
   • Push to a public (or private with token) GitHub repository
   • Users install via the AI Kits tab → Add Kit → enter repo URL

5. Test Installation:
   • Install your kit in a test workspace
   • Verify files appear under .github/ directories
   • Check .my/aicc/catalog/{kitName}/manifest.json for tracking`
            },
            {
                id: 'cookbook-intake',
                title: 'Creating an Intake Form',
                group: 'Cookbook',
                tags: ['cookbook', 'intake', 'form', 'create', 'tutorial'],
                order: 101,
                content: `Intake forms collect structured input from users to drive AI workflows.

1. Create an Intake File:
   Location: .github/ai-ley/intakes/my-intake.md

2. Intake Frontmatter:
   ---
   id: my-intake
   name: My Custom Intake
   description: Collect information for X workflow
   agent: AI-ley Orchestrator
   icon: codicon-note
   fields:
     - name: projectName
       type: text
       label: Project Name
       required: true
     - name: language
       type: select
       label: Programming Language
       options: [Python, TypeScript, Go, Rust]
     - name: features
       type: multi-select
       label: Features
       options: [Auth, Database, API, UI]
     - name: description
       type: textarea
       label: Description
       placeholder: Describe your project...
   ---

   ## Prompt Template

   Create a {{language}} project named "{{projectName}}" with the following features:
   {{#each features}}- {{this}}
   {{/each}}

   {{description}}

3. Register the Intake:
   • Intakes are auto-discovered from .github/ai-ley/intakes/
   • They appear in the Intakes tab of the Secondary Panel
   • Agent-specific intakes filter based on the active agent mode

4. Intake Execution Flow:
   User fills form → Frontmatter validated → Template rendered → Agent invoked with rendered prompt`
            },
            {
                id: 'cookbook-jira-sync',
                title: 'Setting up Jira Sync',
                group: 'Cookbook',
                tags: ['cookbook', 'jira', 'sync', 'setup', 'tutorial'],
                order: 102,
                content: `Configure bidirectional synchronization between PLAN.json and Jira.

Prerequisites:
• Jira Cloud instance (Server/Data Center also supported)
• API token from https://id.atlassian.com/manage-profile/security/api-tokens
• Project key (e.g., "PROJ") for the target Jira project

Step 1: Configure Settings
  Open VS Code Settings (Ctrl+,) and search for "aicc.jira":
  
  aicc.jira.enabled: true
  aicc.jira.baseUrl: "https://your-org.atlassian.net"
  aicc.jira.email: "your-email@example.com"
  aicc.jira.apiToken: "your-api-token"
  aicc.jira.projectKey: "PROJ"
  aicc.jira.syncStrategy: "bidirectional"
  aicc.jira.conflictResolution: "manual"

Step 2: Test Connection
  Command Palette → "AICC: Test Jira Connection"
  Verifies credentials and project access.

Step 3: Initial Sync
  Command Palette → "AICC: Pull from Jira"
  Downloads all issues matching your filters into PLAN.json.

Step 4: Configure Sync Filters (.my/aicc/jira.sync.json)
  {
    "issueTypeFilters": { "epic": true, "story": true, "task": true, "bug": false },
    "statusFilter": ["To Do", "In Progress", "Done"],
    "assigneeFilter": "current-user",
    "sprintFilter": "active",
    "jql": "project = PROJ AND updated >= -7d"
  }

Step 5: Enable Auto-Sync (Optional)
  aicc.jira.autoSync: true
  aicc.jira.syncInterval: 30    // minutes

Step 6: Configure Webhooks (Optional)
  • Set webhook URL in Jira: http://your-host:3000/jira/webhook
  • Events: issue_created, issue_updated, issue_deleted
  • Enables real-time sync on Jira changes`
            },
            {
                id: 'cookbook-mcp-server',
                title: 'Configuring MCP Server',
                group: 'Cookbook',
                tags: ['cookbook', 'mcp', 'server', 'setup', 'tutorial'],
                order: 103,
                content: `Set up the MCP server for AI assistant integration and REST API access.

For Copilot Chat Integration (stdio):
  1. MCP is enabled by default with stdio transport
  2. Use "AICC: Export MCP Configuration" to generate client config
  3. Copilot Chat can access planning tools automatically

For REST API Access (http):
  1. Open Settings: aicc.mcp.transport = "http"
  2. Set port: aicc.mcp.port = 3000
  3. Reload window (Ctrl+Shift+P → "Reload Window")
  4. Access API docs at http://localhost:3000/api-docs
  5. Access help portal at http://localhost:3000/help

For HTTPS:
  1. Set transport to "https"
  2. AICC auto-generates a self-signed certificate
  3. Trust the certificate when prompted
  4. Access via https://localhost:3000/

Multi-Workspace Setup:
  1. Open the same project in multiple VS Code windows
  2. Configure port range: aicc.mcp.portRangeStart = 3100
  3. First window becomes "leader" (runs the MCP server)
  4. Additional windows become "followers" (register with leader)
  5. View all workspaces in MCP tab → Port Range Dashboard

Client Configuration (for external MCP clients):
  {
    "mcpServers": {
      "ai-command-center": {
        "command": "node",
        "args": ["path/to/extension/dist/mcp-stdio.js"],
        "env": { "AICC_PROJECT_DIR": "/path/to/project" }
      }
    }
  }`
            },
            {
                id: 'cookbook-custom-skills',
                title: 'Creating Custom Skills',
                group: 'Cookbook',
                tags: ['cookbook', 'skills', 'create', 'custom', 'tutorial'],
                order: 104,
                content: `Create custom AI skills for domain-specific tasks.

1. Create Skill Directory:
   .github/skills/my-custom-skill/
   └── SKILL.md

2. Define SKILL.md:
   ---
   id: my-custom-skill
   name: My Custom Skill
   description: Short description for matching against user requests
   ---
   # My Custom Skill

   ## Overview
   Describe what this skill does and when to use it.

   ## When to Use
   Use this skill when:
   - User asks about X
   - Task involves Y
   - Working with Z technology

   ## Instructions
   1. First, gather context about...
   2. Then, implement...
   3. Finally, validate...

   ## Examples
   
   ### Example 1: Basic Usage
   User: "Do X with Y"
   Action: Follow steps 1-3 above with specific parameters...

   ## Best Practices
   - Always validate input before...
   - Use the helper pattern for...

3. Skill Discovery:
   • Skills are auto-indexed by the AI Kit system
   • Copilot agents match skills based on description keywords
   • Skills can be referenced by ID in PLAN.json items

4. Skill with TypeScript Scripts:
   .github/skills/my-skill/
   ├── SKILL.md
   └── scripts/
       └── helper.ts

   Reference scripts from SKILL.md for automated execution.`
            },

            // ── New Features ──
            {
                id: 'whats-new',
                title: "What's New & Changelog",
                group: 'Release Notes',
                tags: ['changelog', 'new', 'features', 'updates', 'version'],
                order: 200,
                content: `Recent Updates and New Features:

v1.13.0 (April 2026):
• MCP Port Dashboard Enhancement: Fast TCP-based port scanning replacing netstat
• API Documentation Rendering: In-panel OpenAPI spec viewer with search and filtering
• Interactive Help Portal: Searchable documentation system served by MCP REST server
• Help Documentation: Cookbook guides, Mermaid architecture diagrams, Chart.js graphs

v1.12.0 (February 2026):
• Planning Live Update: Non-disruptive delta updates when PLAN.json changes externally
• MCP Port Dashboard: Port range display with workspace registration status
• Jira Sync Filters: Configurable assignee, sprint, labels, and JQL filters
• Ideation Enhancements: Paging, tag sort, vote history, AI discovery, offline mode

v1.11.0 (February 2026):
• Service Activation & Wiring: Optimized extension startup with lazy initialization
• Integration Testing: Comprehensive test suite for all major components
• UI Polish: Accessibility improvements, keyboard shortcuts, responsive design

Previous Highlights:
• Sprint Board View with burndown/velocity charts
• Custom Fields System (8 field types with validation)
• Offline Support with intelligent sync queue
• AI Kit Catalog with Apple Store-style UI
• Collaborative Editing with optimistic locking
• Real-time Update System with conflict detection`
            },

            // ── Component Reference ──
            {
                id: 'components-reference',
                title: 'Component Reference',
                group: 'Reference',
                tags: ['components', 'reference', 'api', 'list'],
                order: 300,
                content: `Major Components Overview:

Extension Host Components:
• PlanningManager — CRUD operations, status workflow, hierarchy management
• MCPManager — Server lifecycle, leader election, inventory tracking
• MCPServer — HTTP/HTTPS/WebSocket/stdio transport, request routing
• ConfigManager — Settings management, migration, validation
• JiraClient — REST API v3 client with rate limiting and retry
• JiraSyncEngine — Bidirectional sync with conflict resolution
• Scheduler — Cron-like task automation
• EvolutionTracker — Change history and audit trail
• VersionOverrideSystem — Multi-source instruction management
• CollaborativeEditingService — Lock management, conflict detection
• RealTimeUpdateSystem — File watching with debouncing
• SecurityManager — TLS certificates, CORS, input validation
• LeaderElection — Port-based multi-workspace leader election
• MCPInventoryManager — Workspace registration and health monitoring
• ConnectionManager — Connection state machine with reconnection

WebView Components (22+):
• Tree View, Kanban Board, Timeline, Calendar
• Charts (burndown, velocity, pie, bar)
• Activity Log, Sprint Board, Custom Fields Panel
• Filter Bar, Toolbar, Context Menus, Modal Dialogs
• Planning Tree (main panel), Tab System (secondary panel)

AI-Ley Components:
• 22 Specialized Agents (from base agent)
• Skills Platform with auto-discovery
• Persona Library for role-specific context
• Instruction Library with priority merging
• Prompt Library with template rendering
• Intake System with form validation
• Index System with ID-based lookup`
            },

            // ── Agent System ──
            {
                id: 'agent-system',
                title: 'Agent System',
                group: 'AI-Ley Framework',
                tags: ['agents', 'ai-ley', 'orchestrator', 'base'],
                order: 400,
                content: `22 specialized AI agents with shared behaviors from a common base.

Base Agent (ailey-base.agent.md):
• Defines variables, folder structure conventions, and standards
• All specialized agents inherit these behaviors
• Provides workspace-aware context (files, folders, settings)

Agent Catalog:
1. Orchestrator — Multi-step task decomposition, prompt optimization
2. Architect — Software architecture, design patterns
3. Planner — Requirements, roadmaps, execution plans
4. Bug Fixer — Systematic debugging, root cause analysis
5. Tester — Test suite generation, quality assurance
6. Optimizer — Performance, code quality, scalability
7. Security — Vulnerability assessment, secure coding
8. DevOps — CI/CD, infrastructure as code
9. Documentation — Technical docs, API documentation
10. Designer — UI/UX design, design systems
11. Data Architect — Schema design, data flows
12. Data Engineer — ETL pipelines, analytics
13. Collaborative Minds — Multi-perspective problem solving
14. Brainstorm — Creative exploration, trade-offs
15. Leader Panel — Executive decision-making
16. Porting — Code migration, language translation
17. Product Design — User-centered product development
18. Marketing — Brand development, campaigns
19. Entrepreneur — Revenue opportunities, monetization
20. Patent Reviewer — Prior art research, IP strategy
21. Game Designer — Game mechanics, player experience
22. Explore — Fast read-only codebase exploration

Agent Selection:
• Automatic detection based on request keywords
• Manual selection via agent dropdown in Secondary Panel
• Each agent filters available tabs and intake forms`
            },
        ];
    }

    /**
     * Generate the complete help portal HTML (REQ-HELP-001)
     */
    public getPortalHTML(): string {
        if (this.cachedPortalHTML) return this.cachedPortalHTML;

        const groups: Record<string, HelpSection[]> = {};
        for (const s of this.sections) {
            if (!groups[s.group]) groups[s.group] = [];
            groups[s.group].push(s);
        }
        for (const g of Object.values(groups)) {
            g.sort((a, b) => a.order - b.order);
        }

        const groupOrder = ['Getting Started', 'Core Features', 'Integrations', 'Cookbook', 'Release Notes', 'Reference', 'AI-Ley Framework'];
        const orderedGroups = groupOrder.filter(g => groups[g]).map(g => ({ name: g, sections: groups[g] }));

        // Build sidebar nav
        const sidebarHTML = orderedGroups.map(g => `
            <div class="help-nav-group">
                <div class="help-nav-group-title">${g.name}</div>
                ${g.sections.map(s => `<a class="help-nav-link" href="#${s.id}" data-section="${s.id}">${s.title}</a>`).join('')}
            </div>
        `).join('');

        // Build content sections
        const contentHTML = orderedGroups.map(g =>
            g.sections.map(s => {
                // Convert Mermaid blocks to diagram containers
                let html = this.escapeHtml(s.content);
                // Detect ARCHITECTURE DIAGRAM (Mermaid): followed by a graph/flowchart block
                html = html.replace(/ARCHITECTURE DIAGRAM \(Mermaid\):\n((?:.*\n)*?)(?=\n[A-Z]|\n$|$)/,
                    (_, diagram) => {
                        // Unescape HTML entities so mermaid can parse arrows (-->) and quoted labels
                        const raw = diagram.trim()
                            .replace(/&gt;/g, '>')
                            .replace(/&lt;/g, '<')
                            .replace(/&quot;/g, '"')
                            .replace(/&amp;/g, '&');
                        return `<pre class="mermaid">${raw}</pre>`;
                    });
                // Basic formatting: headers, lists, code blocks
                html = html.replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, text) => {
                    const level = hashes.length + 2; // h3-h5
                    return `<h${level}>${text}</h${level}>`;
                });
                html = html.replace(/^  (aicc\.\S+:.*$)/gm, '<code>$1</code>');
                html = html.replace(/\n/g, '<br/>');
                return `<div class="help-section" id="${s.id}">
                    <h2>${s.title}</h2>
                    <div class="help-tags">${s.tags.map(t => `<span class="help-tag">${t}</span>`).join('')}</div>
                    <div class="help-content">${html}</div>
                </div>`;
            }).join('')
        ).join('');

        this.cachedPortalHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Command Center — Help Documentation</title>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'dark', fontFamily: 'sans-serif' });
window.__mermaid = mermaid;
</script>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #1e1e1e; color: #d4d4d4; display: flex; height: 100vh; }
.help-sidebar { width: 260px; background: #252526; border-right: 1px solid #3c3c3c; overflow-y: auto; flex-shrink: 0; display: flex; flex-direction: column; }
.help-sidebar-header { padding: 16px; border-bottom: 1px solid #3c3c3c; }
.help-sidebar-header h1 { font-size: 16px; color: #fff; margin-bottom: 10px; }
.help-search { width: 100%; padding: 8px 10px; background: #3c3c3c; border: 1px solid #555; color: #d4d4d4; border-radius: 4px; font-size: 13px; }
.help-search:focus { outline: none; border-color: #007acc; }
.help-search-results { display: none; padding: 8px; border-bottom: 1px solid #3c3c3c; max-height: 300px; overflow-y: auto; }
.help-search-results.active { display: block; }
.help-search-result { padding: 6px 8px; border-radius: 3px; cursor: pointer; font-size: 12px; margin-bottom: 2px; }
.help-search-result:hover { background: #094771; }
.help-search-result .result-title { font-weight: 600; color: #fff; }
.help-search-result .result-snippet { opacity: 0.6; margin-top: 2px; font-size: 11px; }
.help-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
.help-nav-group { margin-bottom: 4px; }
.help-nav-group-title { padding: 8px 16px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; opacity: 0.5; letter-spacing: 0.5px; }
.help-nav-link { display: block; padding: 4px 16px 4px 24px; font-size: 13px; color: #d4d4d4; text-decoration: none; border-left: 3px solid transparent; }
.help-nav-link:hover { background: #2a2d2e; color: #fff; }
.help-nav-link.active { border-left-color: #007acc; background: #094771; color: #fff; }
.help-main { flex: 1; overflow-y: auto; padding: 24px 32px; }
.help-section { margin-bottom: 40px; padding-bottom: 24px; border-bottom: 1px solid #3c3c3c; }
.help-section h2 { font-size: 22px; color: #fff; margin-bottom: 8px; }
.help-tags { margin-bottom: 12px; }
.help-tag { display: inline-block; background: #094771; color: #7ec8e3; font-size: 10px; padding: 2px 8px; border-radius: 10px; margin: 0 4px 4px 0; }
.help-content { font-size: 14px; line-height: 1.7; white-space: pre-wrap; }
.help-content code { background: #3c3c3c; padding: 2px 6px; border-radius: 3px; font-size: 12px; font-family: 'Cascadia Code', 'Fira Code', Consolas, monospace; }
.help-content h3 { font-size: 18px; color: #ccc; margin: 16px 0 8px; }
.help-content h4 { font-size: 15px; color: #bbb; margin: 12px 0 6px; }
.mermaid { background: #1e1e1e; padding: 12px; border-radius: 8px; margin: 12px 0; white-space: pre; }
@media (max-width: 768px) { .help-sidebar { width: 200px; } .help-main { padding: 16px; } }
</style>
</head>
<body>
<div class="help-sidebar">
    <div class="help-sidebar-header">
        <h1>📖 AI Command Center</h1>
        <input type="text" class="help-search" id="help-search" placeholder="Search documentation…" autocomplete="off" />
    </div>
    <div class="help-search-results" id="search-results"></div>
    <div class="help-nav" id="help-nav">
        ${sidebarHTML}
    </div>
</div>
<div class="help-main" id="help-main">
    <div id="help-chart-section" class="help-section">
        <h2>Documentation Overview</h2>
        <div class="help-tags"><span class="help-tag">overview</span></div>
        <p style="margin-bottom:16px;">Welcome to the AI Command Center documentation. Use the sidebar or search to find what you need.</p>
    </div>
    ${contentHTML}
</div>
<script>
// Mermaid initialized via ESM module import in <head>

// Search functionality
const searchInput = document.getElementById('help-search');
const searchResults = document.getElementById('search-results');
let searchTimeout;
searchInput.addEventListener('input', function() {
    clearTimeout(searchTimeout);
    const q = this.value.trim();
    if (!q) { searchResults.classList.remove('active'); return; }
    searchTimeout = setTimeout(async () => {
        try {
            const resp = await fetch('/api/help/search?q=' + encodeURIComponent(q));
            const data = await resp.json();
            if (data.results && data.results.length > 0) {
                searchResults.innerHTML = data.results.slice(0, 10).map(r =>
                    '<div class="help-search-result" onclick="scrollToSection(\\'' + r.id + '\\')">' +
                    '<div class="result-title">' + r.title + '</div>' +
                    '<div class="result-snippet">' + r.snippet + '</div></div>'
                ).join('');
                searchResults.classList.add('active');
            } else {
                searchResults.innerHTML = '<div style="padding:8px;opacity:0.5;font-size:12px;">No results found</div>';
                searchResults.classList.add('active');
            }
        } catch(e) { console.error('Search error:', e); }
    }, 300);
});

// Navigation
function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    searchResults.classList.remove('active');
    document.querySelectorAll('.help-nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('[data-section="' + id + '"]');
    if (link) link.classList.add('active');
}
document.querySelectorAll('.help-nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        scrollToSection(this.dataset.section);
    });
});

// Highlight active section on scroll
const mainEl = document.getElementById('help-main');
mainEl.addEventListener('scroll', function() {
    const sections = document.querySelectorAll('.help-section');
    let currentId = '';
    sections.forEach(s => {
        if (s.getBoundingClientRect().top < 200) currentId = s.id;
    });
    if (currentId) {
        document.querySelectorAll('.help-nav-link').forEach(l => l.classList.remove('active'));
        const link = document.querySelector('[data-section="' + currentId + '"]');
        if (link) link.classList.add('active');
    }
});
</script>
</body>
</html>`;

        return this.cachedPortalHTML;
    }

    private escapeHtml(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    clearCache(): void {
        this.cachedPortalHTML = null;
    }
}
