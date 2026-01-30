# YAML Authoring Guide

Complete reference for creating schema-driven UI definitions in AI Command Center.

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Types](#schema-types)
3. [Panel Definitions](#panel-definitions)
4. [Tab Definitions](#tab-definitions)
5. [Component Definitions](#component-definitions)
6. [Data Binding](#data-binding)
7. [Override Pattern](#override-pattern)
8. [Best Practices](#best-practices)
9. [Examples](#examples)

---

## Overview

AI Command Center uses **Kubernetes-style resource definitions** to define UI panels, tabs, and components declaratively in YAML. This approach provides:

- **Configuration-as-Code**: Version-controlled UI definitions
- **Schema Validation**: Catch errors before runtime
- **Hot-Reload**: Changes take effect without restart
- **Component Reusability**: Share components across panels
- **User Overrides**: Customize UI without modifying core files

### File Structure

```
.github/aicc/
├── schemas/           # JSON Schema definitions
│   ├── panel.schema.json
│   ├── tab.schema.json
│   └── component.schema.json
├── panels/            # Panel definitions
│   └── All_AICC.yaml
├── tabs/              # Tab definitions
│   ├── All_Planning.yaml
│   ├── All_AIKitLoader.yaml
│   └── All_ComponentCatalog.yaml
├── components/        # Component definitions
│   ├── status-badges.yaml
│   ├── filter-bar.yaml
│   └── ...
└── docs/
    └── YAML_AUTHORING_GUIDE.md

.my/                   # User overrides (optional)
├── panels/
├── tabs/
└── components/
```

---

## Schema Types

All schemas follow the Kubernetes resource model:

```yaml
apiVersion: aicc/v1
kind: <Panel|Tab|Component>
metadata:
  id: unique-identifier
  name: Display Name
  description: Optional description
  version: 1.0.0
  tags: [tag1, tag2]
spec:
  # Type-specific configuration
```

### Version History

- `aicc/v1`: Initial release (January 2026)

---

## Panel Definitions

Panels are top-level containers displayed in the Secondary Panel webview.

### Minimal Panel Example

```yaml
apiVersion: aicc/v1
kind: Panel
metadata:
  id: my-panel
  name: My Panel
  version: 1.0.0
spec:
  layout:
    type: tabs
    tabs:
      - tabRef: my-tab
```

### Full Panel Schema

```yaml
apiVersion: aicc/v1
kind: Panel
metadata:
  id: panel-id
  name: Panel Display Name
  description: Panel description shown in tooltips
  version: 1.0.0
  tags: [category1, category2]

spec:
  # Panel header with title and actions
  header:
    title: Panel Title
    icon: codicon-name  # VS Code Codicon name
    actions:
      - label: Refresh
        icon: refresh
        command: aicc.refresh
        args: []
        tooltip: Refresh panel data
      - label: Settings
        icon: gear
        command: workbench.action.openSettings
        args: ['@ext:ai-command-center']

  # Panel layout (tabs, split, grid, or stack)
  layout:
    type: tabs
    tabs:
      - tabRef: tab-id-1
        props:
          customProp: value
      - tabRef: tab-id-2

  # Panel footer with actions
  footer:
    actions:
      - label: Save All
        icon: save
        command: aicc.saveAll
        variant: success
      - label: Run Next
        icon: play
        command: aicc.runNext
        variant: primary

  # Data bindings for the panel
  dataBinding:
    planDocument:
      source: REST
      endpoint: /api/plan/document
    statusCounts:
      source: state
      path: statusCounts

  # Theme overrides (optional)
  theme:
    primaryColor: '#3b82f6'
    backgroundColor: 'var(--vscode-editor-background)'
```

### Layout Types

#### Tabs Layout

```yaml
layout:
  type: tabs
  tabs:
    - tabRef: tab1
    - tabRef: tab2
    - tabRef: tab3
```

#### Split Layout

```yaml
layout:
  type: split
  orientation: horizontal  # or vertical
  panels:
    - tabRef: left-panel
      size: 50%
    - tabRef: right-panel
      size: 50%
```

#### Grid Layout

```yaml
layout:
  type: grid
  columns: 2
  rows: 2
  gap: 8px
  panels:
    - tabRef: panel1
      position: { row: 1, col: 1 }
    - tabRef: panel2
      position: { row: 1, col: 2 }
```

#### Stack Layout

```yaml
layout:
  type: stack
  panels:
    - tabRef: panel1
    - tabRef: panel2
```

---

## Tab Definitions

Tabs contain components and define their layout.

### Minimal Tab Example

```yaml
apiVersion: aicc/v1
kind: Tab
metadata:
  id: my-tab
  name: My Tab
  version: 1.0.0
spec:
  components:
    - componentId: my-component
```

### Full Tab Schema

```yaml
apiVersion: aicc/v1
kind: Tab
metadata:
  id: tab-id
  name: Tab Display Name
  icon: codicon-name
  description: Tab description
  version: 1.0.0
  tags: [category]

spec:
  # Tab layout (vertical, horizontal, grid)
  layout: vertical  # default

  # Component references with props
  components:
    - componentId: status-badges
      props:
        statuses:
          - todo
          - open
          - in-progress
          - done
      dataBinding:
        counts:
          source: state
          path: statusCounts

    - componentId: filter-bar
      props:
        placeholder: Filter items...

    - componentId: accordion-list
      dataBinding:
        items:
          source: state
          path: planDocument.items

  # State management
  state:
    activeStatuses: ['todo', 'open', 'in-progress']
    filterText: ''
    expandedItems: []

  # Lifecycle hooks
  hooks:
    onMount: initializeTab()
    onUnmount: cleanupTab()
    onActivate: refreshData()
```

---

## Component Definitions

Components are reusable UI elements with templates and behavior.

### Minimal Component Example

```yaml
apiVersion: aicc/v1
kind: Component
metadata:
  id: my-button
  name: My Button
  version: 1.0.0
spec:
  props:
    label:
      type: string
      required: true
  template: |
    <button class="btn">{{label}}</button>
```

### Full Component Schema

```yaml
apiVersion: aicc/v1
kind: Component
metadata:
  id: component-id
  name: Component Display Name
  description: Component description
  version: 1.0.0
  tags: [ui, form, input]

spec:
  # Component props (input parameters)
  props:
    label:
      type: string
      description: Button label text
      required: true
      default: Click Me
    
    variant:
      type: string
      description: Button style variant
      enum: [primary, secondary, success, danger]
      default: primary
    
    disabled:
      type: boolean
      default: false
    
    items:
      type: array
      items:
        type: object
        properties:
          id: { type: string }
          name: { type: string }

  # HTML template with Handlebars-style variables
  template: |
    <button class="btn btn-{{variant}}" 
            {{#if disabled}}disabled{{/if}}
            onclick="handleClick('{{id}}')">
      {{label}}
    </button>

  # Component-specific styles
  styles: |
    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-primary { background: #3b82f6; color: white; }
    .btn-success { background: #22c55e; color: white; }

  # Events emitted by component
  events:
    - name: click
      description: Fired when button is clicked
      payload:
        type: object
        properties:
          id: string
          timestamp: string

  # Usage examples for catalog
  examples:
    - name: Primary Button
      description: Standard primary action button
      props:
        label: Save Changes
        variant: primary
    
    - name: Disabled Button
      description: Disabled state
      props:
        label: Submit
        disabled: true
```

### Template Syntax

Components use Handlebars-style templating:

**Variables:**
```html
<div>{{propertyName}}</div>
```

**Conditionals:**
```html
{{#if condition}}
  <span>Shown when true</span>
{{/if}}

{{#unless disabled}}
  <button>Enabled</button>
{{/unless}}
```

**Loops:**
```html
{{#each items}}
  <div>{{this.name}}</div>
{{/each}}
```

**Nested Properties:**
```html
<span>{{user.profile.name}}</span>
```

---

## Data Binding

Components and tabs can bind to external data sources.

### Source Types

#### REST API

```yaml
dataBinding:
  items:
    source: REST
    endpoint: /api/planning/items
    method: GET
    params:
      status: open
    transform: response.data.items
```

#### GraphQL

```yaml
dataBinding:
  user:
    source: GraphQL
    query: |
      query GetUser($id: ID!) {
        user(id: $id) { name email }
      }
    variables:
      id: "{{userId}}"
```

#### VS Code Extension API (SDK)

```yaml
dataBinding:
  config:
    source: SDK
    api: vscode.workspace.getConfiguration
    args: ['aicc']
```

#### VS Code Command

```yaml
dataBinding:
  planDocument:
    source: command
    command: aicc.getPlanDocument
    args: []
```

#### Component State

```yaml
dataBinding:
  activeStatuses:
    source: state
    path: activeFilters.statuses
```

### Data Transformations

```yaml
dataBinding:
  displayName:
    source: state
    path: user.name
    transform: |
      value.toUpperCase()
```

---

## Override Pattern

Users can override core definitions by creating files in `.my/` directory:

```
.my/
├── panels/
│   └── All_AICC.yaml      # Overrides .github/aicc/panels/All_AICC.yaml
├── tabs/
│   └── All_Planning.yaml  # Overrides .github/aicc/tabs/All_Planning.yaml
└── components/
    └── filter-bar.yaml    # Overrides .github/aicc/components/filter-bar.yaml
```

**Resolution order:**
1. `.my/<type>/<name>.yaml` (highest priority)
2. `.github/aicc/<type>/<name>.yaml` (fallback)

### Example Override

**Original:** `.github/aicc/components/status-badges.yaml`
```yaml
spec:
  props:
    statuses:
      default: [todo, open, done]
```

**Override:** `.my/components/status-badges.yaml`
```yaml
apiVersion: aicc/v1
kind: Component
metadata:
  id: status-badges
  version: 1.0.0
spec:
  props:
    statuses:
      default: [todo, in-progress, review, done]  # Custom statuses
```

---

## Best Practices

### Naming Conventions

- **IDs**: kebab-case (`status-badges`, `planning-tab`)
- **File names**: Match ID + `.yaml` extension
- **Display names**: Title Case (`Status Badges`, `Planning Tab`)

### Component Design

✅ **DO:**
- Keep components small and focused (single responsibility)
- Use semantic HTML tags
- Include comprehensive examples
- Document all props and events
- Use VS Code CSS variables for theming

❌ **DON'T:**
- Mix business logic into components
- Hardcode colors or dimensions
- Create deeply nested component hierarchies
- Use inline styles (prefer CSS classes)

### Performance

- **Lazy load** data-heavy components
- **Batch** data bindings when possible
- **Cache** computed values in state
- **Debounce** filter inputs

### Versioning

Follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking changes to schema/API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, clarifications

---

## Examples

### Simple Dashboard Panel

```yaml
apiVersion: aicc/v1
kind: Panel
metadata:
  id: dashboard
  name: Dashboard
  version: 1.0.0
spec:
  layout:
    type: grid
    columns: 2
    panels:
      - tabRef: metrics-tab
        position: { row: 1, col: 1 }
      - tabRef: activity-tab
        position: { row: 1, col: 2 }
```

### Data-Driven Tab

```yaml
apiVersion: aicc/v1
kind: Tab
metadata:
  id: metrics-tab
  name: Metrics
  version: 1.0.0
spec:
  components:
    - componentId: metric-card
      dataBinding:
        value:
          source: REST
          endpoint: /api/metrics/total-items
          transform: response.count
      props:
        title: Total Items
        icon: archive
```

### Interactive Component

```yaml
apiVersion: aicc/v1
kind: Component
metadata:
  id: search-input
  name: Search Input
  version: 1.0.0
spec:
  props:
    placeholder:
      type: string
      default: Search...
  
  template: |
    <input type="text" 
           class="search-input"
           placeholder="{{placeholder}}"
           oninput="handleSearch(this.value)">
  
  styles: |
    .search-input {
      padding: 8px 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px;
      width: 100%;
    }
  
  events:
    - name: search
      payload:
        type: object
        properties:
          query: string
```

---

## Resources

- **JSON Schemas**: `.github/aicc/schemas/`
- **Component Catalog**: Available at MCP endpoint `/mcp/components/catalog`
- **Live Examples**: Use Component Catalog tab to browse and preview
- **VS Code Codicons**: https://microsoft.github.io/vscode-codicons/dist/codicon.html

---

**Version**: 1.0.0  
**Last Updated**: 2026-01-17  
**Maintained By**: AI Command Center Team
