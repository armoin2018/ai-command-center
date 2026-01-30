/**
 * Panel YAML Types
 * TypeScript interfaces for the panel configuration system
 */

// Panel Metadata
export interface PanelConfig {
  panel: PanelMetadata;
  layout: LayoutConfig;
  components: ComponentConfig[];
  actions: ActionConfig[];
  events: EventHandlers;
  permissions: string[];
}

export interface PanelMetadata {
  id: string;
  name: string;
  scope: 'all' | 'agent-specific';
  agent?: string;
  icon: string;
  order: number;
  enabled: boolean;
  description?: string;
}

// Layout Configuration
export interface LayoutConfig {
  type: 'single' | 'split-horizontal' | 'split-vertical' | 'grid';
  sections: SectionConfig[];
}

export interface SectionConfig {
  id: string;
  name?: string;
  flex?: number;
  minHeight?: string;
  maxHeight?: string;
  collapsible?: boolean;
  collapsed?: boolean;
}

// Component Types
export type ComponentType =
  | 'status-badges'
  | 'filter-bar'
  | 'accordion-list'
  | 'form-panel'
  | 'repo-selector'
  | 'installed-list'
  | 'comments-panel'
  | 'tagify-input'
  | 'select-dropdown'
  | 'button-group'
  | 'info-display'
  | 'custom';

export interface ComponentConfig {
  type: ComponentType;
  section?: string;
  order: number;
  config: Record<string, unknown>;
  dataSource?: DataSourceConfig;
}

export interface DataSourceConfig {
  type: 'mcp' | 'local' | 'vscode' | 'static';
  endpoint?: string;
  refreshTrigger?: string;
}

// Status Badges Component
export interface StatusBadgeConfig {
  badges: Array<{
    status: string;
    color: string;
    icon: string;
  }>;
  clickable: boolean;
  multiSelect: boolean;
}

// Filter Bar Component
export interface FilterBarConfig {
  placeholder: string;
  regexEnabled: boolean;
  caseSensitive: boolean;
  filterFields: string[];
  toggles: Array<{
    id: string;
    label: string;
    icon: string;
    default: boolean;
  }>;
}

// Accordion List Component
export interface AccordionListConfig {
  hierarchy: Array<{
    type: string;
    icon: string;
    expandable: boolean;
    defaultExpanded: boolean;
    showCount?: boolean;
    parent?: string;
  }>;
  displayFields: {
    title: string;
    subtitle?: string;
    status?: string;
    assignee?: string;
    agent?: string;
  };
  sortOptions: Array<{
    field: string;
    label: string;
  }>;
  defaultSort: string;
  clickAction: 'select' | 'expand' | 'open';
  doubleClickAction?: string;
  contextMenu: boolean;
}

// Form Panel Component
export interface FormPanelConfig {
  showWhen: string;
  position: 'inline' | 'modal' | 'sidebar';
  fields: FormFieldConfig[];
  actions: Array<{
    id: string;
    label: string;
    style: ButtonStyle;
    command: string;
  }>;
}

export interface FormFieldConfig {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'tagify' | 'checkbox' | 'number' | 'date';
  label: string;
  required?: boolean;
  readonly?: boolean;
  rows?: number;
  options?: Array<{
    value: string;
    label?: string;
  }>;
  suggestions?: {
    source: 'mcp' | 'static';
    endpoint?: string;
    items?: string[];
  };
  maxTags?: number;
}

// Repo Selector Component
export interface RepoSelectorConfig {
  label: string;
  showBranch: boolean;
  defaultBranch: string;
  allowCustom: boolean;
  recentRepos: number;
  presets: Array<{
    name: string;
    repo: string;
    branch: string;
    description?: string;
  }>;
}

// Installed List Component
export interface InstalledListConfig {
  displayFields: {
    title: string;
    subtitle?: string;
    badge?: string;
    status?: string;
  };
  statusColors: Record<string, string>;
  itemActions: Array<{
    id: string;
    icon: string;
    tooltip: string;
    command: string;
    confirm?: boolean;
  }>;
  sortOptions: Array<{
    field: string;
    label: string;
  }>;
  defaultSort: string;
}

// Button Group Component
export interface ButtonGroupConfig {
  layout: 'horizontal' | 'vertical';
  align: 'left' | 'center' | 'right';
  buttons: Array<{
    id: string;
    label: string;
    icon: string;
    style: ButtonStyle;
    command: string;
    condition?: string;
  }>;
}

// Action Configuration
export interface ActionConfig {
  id: string;
  label: string;
  icon: string;
  command: string;
  args?: unknown[];
  position: 'header' | 'footer' | 'inline' | 'context-menu';
  style: ButtonStyle;
  condition?: string;
}

export type ButtonStyle = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'link';

// Event Handlers
export interface EventHandlers {
  onLoad?: string;
  onUnload?: string;
  onRefresh?: string;
  onError?: string;
}

// Panel Discovery
export interface PanelManifest {
  version: string;
  panels: PanelMetadata[];
  loadedAt: string;
}

// Panel Instance (runtime)
export interface PanelInstance {
  config: PanelConfig;
  state: PanelState;
}

export interface PanelState {
  isLoading: boolean;
  error?: string;
  selectedItems: string[];
  filters: Record<string, unknown>;
  expandedSections: string[];
  componentStates: Map<string, unknown>;
}
