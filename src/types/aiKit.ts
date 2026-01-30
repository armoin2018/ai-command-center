/**
 * AI Kit Types
 * TypeScript interfaces for the AI Kit Loader system
 */

// Inventory Schema
export interface Inventory {
  inventory: InventoryMetadata;
  agenticSystems: AgenticSystemConfig[];
  categories?: Category[];
  contents?: ContentItem[];
  hooks?: Hooks;
  compatibility?: Compatibility;
}

export interface InventoryMetadata {
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository: string;
}

// Agentic Systems
export interface AgenticSystemConfig {
  id: AgenticSystemId;
  name: string;
  description?: string;
  enabled: boolean;
  folderMappings: FolderMapping[];
}

export type AgenticSystemId = 
  | 'generic'
  | 'githubCopilot'
  | 'claude'
  | 'gemini'
  | 'cursor'
  | 'windsurf'
  | 'cline'
  | 'roo'
  | 'codex'
  | 'opencode'
  | 'metis';

export interface FolderMapping {
  source: string;
  target: string;
  description?: string;
  overwrite?: boolean;
  merge?: boolean;
  filePatterns?: {
    include?: string[];
    exclude?: string[];
  };
}

// Categories
export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  order?: number;
}

// Content Items
export interface ContentItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  path: string;
  type: ContentType;
  targetSystems?: AgenticSystemId[];
  dependencies?: string[];
}

export type ContentType = 
  | 'instruction'
  | 'persona'
  | 'template'
  | 'workflow'
  | 'config'
  | 'prompt'
  | 'tool'
  | 'other';

// Hooks
export interface Hooks {
  preInstall?: string;
  postInstall?: string;
  preUninstall?: string;
  postUninstall?: string;
}

// Compatibility
export interface Compatibility {
  minVersion?: string;
  maxVersion?: string;
  vscodeVersion?: string;
  nodeVersion?: string;
}

// AI Kit Configuration
export interface AIKitConfig {
  version: string;
  defaults: AIKitDefaults;
  repositories: RepositoryConfig[];
  agenticSystems: AgenticSystemDefinition[];
  installation: InstallationConfig;
  ui: UIConfig;
}

export interface AIKitDefaults {
  branch: string;
  autoUpdate: boolean;
  checkInterval: number;
}

export interface RepositoryConfig {
  id: string;
  name: string;
  description: string;
  url: string;
  branch: string;
  enabled: boolean;
  featured?: boolean;
  categories?: string[];
  tags?: string[];
}

export interface AgenticSystemDefinition {
  id: AgenticSystemId;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  configPath: string;
}

export interface InstallationConfig {
  targetPath: string;
  backup: boolean;
  mergeStrategy: 'prompt' | 'overwrite' | 'skip' | 'merge';
  excludePatterns: string[];
}

export interface UIConfig {
  showCategories: boolean;
  showDescriptions: boolean;
  showVersions: boolean;
  confirmBeforeInstall: boolean;
  confirmBeforeUninstall: boolean;
  showProgress: boolean;
}

// Runtime Types
export interface InstalledKit {
  id: string;
  name: string;
  version: string;
  sourceRepo: string;
  sourceBranch: string;
  installedAt: string;
  installedPath: string;
  targetSystem: AgenticSystemId;
  fileCount: number;
  description?: string;
  status: InstalledKitStatus;
  lastChecked?: string;
  availableUpdate?: string;
}

export type InstalledKitStatus = 'active' | 'outdated' | 'error';

export interface AvailableKit {
  id: string;
  name: string;
  category: string;
  description?: string;
  path: string;
  type: ContentType;
  targetPath: string;
  repo: RepositoryConfig;
}

export interface KitInstallResult {
  success: boolean;
  kitId: string;
  installedPath?: string;
  fileCount?: number;
  error?: string;
  warnings?: string[];
}

export interface KitUninstallResult {
  success: boolean;
  kitId: string;
  filesRemoved?: number;
  error?: string;
}

// API Response Types
export interface ReposResponse {
  success: boolean;
  data?: RepositoryConfig[];
  error?: string;
}

export interface AvailableKitsResponse {
  success: boolean;
  data?: AvailableKit[];
  error?: string;
}

export interface InstalledKitsResponse {
  success: boolean;
  data?: InstalledKit[];
  error?: string;
}

export interface InstallResponse {
  success: boolean;
  data?: KitInstallResult;
  error?: string;
}

export interface UninstallResponse {
  success: boolean;
  data?: KitUninstallResult;
  error?: string;
}
