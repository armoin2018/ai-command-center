# Component-Based Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VSCode Extension Host                               │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                     src/planning/planningManager.ts                   │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │ │
│  │  │ Epic Manager│  │Story Manager│  │ Task Manager│                  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                   ▲                                         │
│                                   │ MCP Protocol / REST API                │
│                                   │                                         │
│  ┌────────────────────────────────┴──────────────────────────────────────┐ │
│  │                     src/mcp/mcpServer.ts                             │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │  REST Endpoints (to be implemented)                            │ │ │
│  │  │  GET  /api/planning/tree                                       │ │ │
│  │  │  GET  /api/planning/epics                                      │ │ │
│  │  │  POST /api/planning/epics                                      │ │ │
│  │  │  GET  /api/planning/epics/:id                                  │ │ │
│  │  │  ...                                                            │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                   ▲
                                   │ HTTP / WebSocket / Message Passing
                                   │
┌──────────────────────────────────┴──────────────────────────────────────────┐
│                          Browser / VSCode Webview                           │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    media/components/index.html                        │ │
│  │                      Main Application Entry Point                     │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────┐    │ │
│  │  │  External Libraries (CDN)                                   │    │ │
│  │  │  • Bootstrap 5.3 + Icons                                    │    │ │
│  │  │  • jQuery 3.7                                               │    │ │
│  │  │  • Lodash 4.17                                              │    │ │
│  │  │  • Moment.js 2.29                                           │    │ │
│  │  │  • Chart.js 4.3                                             │    │ │
│  │  │  • Tabulator 5.5                                            │    │ │
│  │  │  • Tagify                                                   │    │ │
│  │  └─────────────────────────────────────────────────────────────┘    │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────┐    │ │
│  │  │  media/api/mcpClient.ts (TypeScript → JS)                  │    │ │
│  │  │  ┌──────────────────────────────────────────────────────┐  │    │ │
│  │  │  │  class MCPApiClient                                  │  │    │ │
│  │  │  │  • getPlanningTree()                                 │  │    │ │
│  │  │  │  • listEpics() / getEpic() / createEpic()           │  │    │ │
│  │  │  │  • listStories() / createStory() / updateStory()    │  │    │ │
│  │  │  │  • listTasks() / createTask() / deleteTask()        │  │    │ │
│  │  │  │  • sendMessage() - VSCode webview fallback          │  │    │ │
│  │  │  └──────────────────────────────────────────────────────┘  │    │ │
│  │  └─────────────────────────────────────────────────────────────┘    │ │
│  │                                   ▲                                   │ │
│  │                                   │ API Calls                        │ │
│  │                                   │                                   │ │
│  │  ┌─────────────────────────────────────────────────────────────┐    │ │
│  │  │  media/lib/componentLoader.js                              │    │ │
│  │  │  • load(componentName, container)                          │    │ │
│  │  │  • loadHTML() / loadStyles() / loadScript()               │    │ │
│  │  │  • Component caching                                       │    │ │
│  │  └─────────────────────────────────────────────────────────────┘    │ │
│  │                                   │                                   │ │
│  │  ┌────────────────────────────────┴──────────────────────────────┐  │ │
│  │  │            Component Loading & Initialization                 │  │ │
│  │  └────────────────────────────────┬──────────────────────────────┘  │ │
│  └───────────────────────────────────┼───────────────────────────────────┘ │
│                                      │                                     │
│  ┌───────────────────────────────────┴───────────────────────────────────┐ │
│  │                          UI Components                                │ │
│  │                                                                       │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │ │
│  │  │   Toolbar           │  │  Planning Tree      │                   │ │
│  │  │  ┌──────────────┐   │  │  ┌──────────────┐   │                   │ │
│  │  │  │ index.html   │   │  │  │ index.html   │   │                   │ │
│  │  │  │ • Navbar     │   │  │  │ • Tree nodes │   │                   │ │
│  │  │  │ • Buttons    │   │  │  │ • Stats      │   │                   │ │
│  │  │  └──────────────┘   │  │  │ • Actions    │   │                   │ │
│  │  │  ┌──────────────┐   │  │  └──────────────┘   │                   │ │
│  │  │  │ styles.css   │   │  │  ┌──────────────┐   │                   │ │
│  │  │  │ • Layout     │   │  │  │ styles.css   │   │                   │ │
│  │  │  │ • Theme      │   │  │  │ • Tree styles│   │                   │ │
│  │  │  └──────────────┘   │  │  │ • Animations │   │                   │ │
│  │  │  ┌──────────────┐   │  │  └──────────────┘   │                   │ │
│  │  │  │ script.js    │   │  │  ┌──────────────┐   │                   │ │
│  │  │  │ • Events     │   │  │  │ script.js    │   │                   │ │
│  │  │  │ • Emit       │   │  │  │ • loadTree() │   │                   │ │
│  │  │  └──────────────┘   │  │  │ • toggle()   │   │                   │ │
│  │  └─────────────────────┘  │  │ • select()   │   │                   │ │
│  │                           │  │ • emit()     │   │                   │ │
│  │                           │  └──────────────┘   │                   │ │
│  │                           └─────────────────────┘                   │ │
│  │                                                                       │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │ │
│  │  │   Epic Card         │  │  Story List         │                   │ │
│  │  │  (folder created)   │  │  (folder created)   │                   │ │
│  │  └─────────────────────┘  └─────────────────────┘                   │ │
│  │                                                                       │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐                   │ │
│  │  │   Task Card         │  │  Filter Bar         │                   │ │
│  │  │  (folder created)   │  │  (folder created)   │                   │ │
│  │  └─────────────────────┘  └─────────────────────┘                   │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Event Flow:                                                                │
│  ┌──────────────┐  tree:nodeSelected   ┌────────────────────────┐         │
│  │Planning Tree ├────────────────────▶  │ Main App               │         │
│  └──────────────┘                       │ • Update details panel │         │
│                                         │ • Load item data       │         │
│  ┌──────────────┐  toolbar:viewChanged │                        │         │
│  │   Toolbar    ├────────────────────▶  │                        │         │
│  └──────────────┘                       └────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Data Flow:
1. User interaction → Component (script.js)
2. Component → API Client (mcpClient.ts)
3. API Client → MCP Server (REST or WebView message)
4. MCP Server → Planning Manager
5. Planning Manager → File System / Data
6. Response flows back through same path
7. Component updates DOM (render)

Component Structure:
component-name/
├── index.html     # Semantic HTML structure only
├── styles.css     # Visual presentation only
└── script.js      # Client-side behavior only

Separation Enforced:
✅ HTML: No inline styles, no inline handlers, no logic
✅ CSS: No JavaScript, no content, only presentation
✅ JS: No inline styles, API client only, DOM manipulation
✅ TS: Types, API, no DOM, no UI logic
```
