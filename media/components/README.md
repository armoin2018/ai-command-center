# Component-Based Architecture

This document describes the component-based architecture for the AI Command Center visual layer.

## Architecture Overview

The visual layer follows a **strict component-based model** where each component is a self-contained, reusable unit with clear separation of concerns.

### Folder Structure

```
media/
├── components/              # All UI components
│   ├── planning-tree/       # Planning tree component
│   │   ├── index.html       # HTML structure only
│   │   ├── styles.css       # CSS presentation only
│   │   └── script.js        # Client behavior only
│   ├── toolbar/             # Toolbar component
│   ├── epic-card/           # Epic card component
│   ├── story-list/          # Story list component
│   ├── task-card/           # Task card component
│   └── filter-bar/          # Filter bar component
├── api/                     # API client modules
│   └── mcpClient.ts         # MCP REST API TypeScript client
├── lib/                     # Shared utilities
│   └── componentLoader.js   # Component loader utility
└── index.html               # Main application entry point
```

## Separation of Concerns

### HTML (Structure)
- **Purpose**: Semantic markup and structure only
- **Responsibilities**:
  - Define DOM structure
  - Use semantic HTML5 elements
  - Include data attributes for behavior hooks
  - Use Bootstrap classes for layout
- **Forbidden**:
  - Inline styles
  - Inline event handlers
  - Business logic

### CSS (Presentation)
- **Purpose**: Visual styling and layout only
- **Responsibilities**:
  - Component-specific styles
  - Responsive design
  - Theme support (VSCode dark/light)
  - Animations and transitions
- **Forbidden**:
  - JavaScript behavior
  - Content generation
  - Data manipulation

### JavaScript (Behavior)
- **Purpose**: Client-side interactions and UI logic only
- **Responsibilities**:
  - Event handling
  - DOM manipulation
  - Component lifecycle
  - Emit custom events
  - Call API client methods
- **Forbidden**:
  - Direct API calls (use API client)
  - Server logic
  - Data persistence logic

### TypeScript (API Layer)
- **Purpose**: Type-safe API interactions
- **Responsibilities**:
  - Define interfaces/types
  - REST endpoint communication
  - Request/response handling
  - Error handling
  - VSCode webview message passing
- **Forbidden**:
  - DOM manipulation
  - UI logic
  - Component-specific behavior

## Component Structure

Each component follows this pattern:

```
component-name/
├── index.html     # HTML template
├── styles.css     # Component styles
└── script.js      # Component behavior
```

### Component Class Pattern

```javascript
class ComponentName {
    constructor(container, options) {
        this.container = container;
        this.options = options;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadData();
    }

    bindEvents() {
        // Attach event listeners
    }

    async loadData() {
        // Load data via API client
        const data = await window.apiClient.someMethod();
        this.render(data);
    }

    render(data) {
        // Update DOM
    }

    emit(eventName, data) {
        const event = new CustomEvent(`component:${eventName}`, {
            detail: data,
            bubbles: true
        });
        this.container.dispatchEvent(event);
    }

    on(eventName, handler) {
        this.container.addEventListener(`component:${eventName}`, handler);
    }
}

window.ComponentName = ComponentName;
```

## API Client Usage

Components interact with backend through the MCP API client:

```javascript
// Get API client instance
const apiClient = window.apiClient;

// Use typed methods
const tree = await apiClient.getPlanningTree();
const epics = await apiClient.listEpics();
const epic = await apiClient.getEpic(epicId);

// Create/Update/Delete
await apiClient.createEpic({ title, description });
await apiClient.updateEpic(epicId, updates);
await apiClient.deleteEpic(epicId);
```

The API client handles:
- REST endpoint communication (when running standalone)
- VSCode webview message passing (when running in VSCode)
- Request/response type safety
- Error handling

## Shared Libraries

The following libraries are loaded globally:

### Bootstrap 5.3
- **Purpose**: Responsive layout, components, utilities
- **Usage**: CSS classes and JavaScript plugins
- **CDN**: https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/

### Bootstrap Icons
- **Purpose**: Icon set
- **Usage**: `<i class="bi bi-icon-name"></i>`
- **CDN**: https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/

### jQuery 3.7
- **Purpose**: DOM manipulation, AJAX (if needed)
- **Usage**: `$(selector)` or `jQuery(selector)`
- **CDN**: https://code.jquery.com/jquery-3.7.0.min.js

### Lodash 4.17
- **Purpose**: Utility functions
- **Usage**: `_.debounce()`, `_.groupBy()`, etc.
- **CDN**: https://cdn.jsdelivr.net/npm/lodash@4.17.21/

### Moment.js 2.29
- **Purpose**: Date/time formatting
- **Usage**: `moment(date).format('YYYY-MM-DD')`
- **CDN**: https://cdn.jsdelivr.net/npm/moment@2.29.4/

### Chart.js 4.3
- **Purpose**: Data visualization
- **Usage**: `new Chart(ctx, config)`
- **CDN**: https://cdn.jsdelivr.net/npm/chart.js@4.3.0/

### Tabulator 5.5
- **Purpose**: Interactive tables
- **Usage**: `new Tabulator(element, config)`
- **CDN**: https://unpkg.com/tabulator-tables@5.5.0/

### Tagify
- **Purpose**: Tag input component
- **Usage**: `new Tagify(input, config)`
- **CDN**: https://cdn.jsdelivr.net/npm/@yaireo/tagify

## Component Loading

Components are loaded dynamically using the `ComponentLoader`:

```javascript
const loader = window.componentLoader;

// Load a component
await loader.load('planning-tree', containerElement, options);

// Check if loaded
if (loader.isLoaded('planning-tree')) {
    // Component is ready
}

// Unload a component
loader.unload('planning-tree');
```

The loader:
1. Loads CSS (once per component)
2. Fetches HTML template
3. Injects HTML into container
4. Loads and executes JavaScript
5. Caches loaded components

## Event Communication

Components communicate via custom events:

```javascript
// Emit event
component.emit('eventName', { data });

// Listen to event
component.on('eventName', (data) => {
    // Handle event
});

// Or use native addEventListener
container.addEventListener('component:eventName', (e) => {
    const data = e.detail;
});
```

### Standard Events

- `nodeSelected` - Item selected in tree
- `nodeEdit` - Edit request
- `nodeDeleted` - Item deleted
- `createEpic` - Create epic request
- `addChild` - Add child request
- `viewChanged` - View switch request

## Creating New Components

1. **Create component folder**: `media/components/my-component/`

2. **Create `index.html`**:
```html
<div class="my-component">
    <!-- Semantic HTML structure -->
</div>
```

3. **Create `styles.css`**:
```css
.my-component {
    /* Component-specific styles */
}
```

4. **Create `script.js`**:
```javascript
(function() {
    'use strict';
    
    class MyComponent {
        constructor(container, apiClient) {
            this.container = container;
            this.apiClient = apiClient;
            this.init();
        }
        
        init() {
            this.bindEvents();
        }
        
        bindEvents() {
            // Event handlers
        }
    }
    
    window.MyComponent = MyComponent;
})();
```

5. **Load in application**:
```javascript
await componentLoader.load('my-component', container);
const component = new MyComponent(container, apiClient);
```

## Best Practices

1. **Keep components small** - Single responsibility
2. **Use semantic HTML** - Accessibility first
3. **No inline styles** - All styles in CSS files
4. **No inline handlers** - Use addEventListener
5. **Use API client** - Never direct fetch/AJAX
6. **Emit events** - For cross-component communication
7. **Handle errors** - Show user-friendly messages
8. **Support theming** - Use VSCode CSS variables
9. **Responsive design** - Mobile-first approach
10. **Document components** - JSDoc comments

## VSCode Integration

When running in VSCode webview:

```javascript
// Detect VSCode environment
const vscode = (typeof acquireVsCodeApi !== 'undefined') 
    ? acquireVsCodeApi() 
    : null;

// API client automatically uses webview messaging
const apiClient = new MCPApiClient('/api', vscode);

// Messages are sent to extension
apiClient.getPlanningTree(); // → postMessage to extension
```

The extension handles messages in `mainPanel.ts` and responds with data.

## Testing Components

```javascript
// Load component in test environment
const container = document.createElement('div');
await componentLoader.load('planning-tree', container);

// Initialize with mock API
const mockApi = {
    getPlanningTree: async () => ({ epics: [], stats: {} })
};

const tree = new PlanningTreeComponent(container, mockApi);

// Test interactions
tree.on('nodeSelected', (data) => {
    assert.equal(data.id, 'ARMOIN-001');
});
```

## Performance Considerations

- **Lazy loading**: Load components on demand
- **Debouncing**: Use `_.debounce()` for frequent events
- **Virtual scrolling**: For large lists (use Tabulator)
- **Caching**: Component loader caches CSS and instances
- **Minimal reflows**: Batch DOM updates
- **Event delegation**: Use on parent containers

## Future Enhancements

- [ ] Component registry with dependency injection
- [ ] Hot module replacement for development
- [ ] Component state management (Redux/MobX)
- [ ] Automated component testing
- [ ] Component documentation generator
- [ ] Performance monitoring
- [ ] A11y testing automation
