/**
 * Type definitions for AI Kit Catalog Management
 */

export type AgenticSystem = 
  | 'copilot'
  | 'claude'
  | 'cursor'
  | 'windsurf'
  | 'codex'
  | 'gemini'
  | 'custom'
  | '*';

export type MappingType = 'folder' | 'file' | 'pattern';

export interface RenameRule {
  pattern: string;
  replacement: string;
}

export interface FolderMapping {
  source: string;
  target: string;
  type: MappingType;
  pattern?: string;
  exclude?: string[];
  rename?: RenameRule;
  recursionDepth?: number;
  evolveEnabled?: boolean;
  forceReplace?: boolean;
  supportedAgentic?: AgenticSystem | AgenticSystem[];
  preserveStructure?: boolean;
  flattenStructure?: boolean;
}

export interface KitStructure {
  $schema?: string;
  version?: string;
  name: string;
  repo: string;
  branch: string;
  refreshEnabled?: boolean;
  refreshInterval?: string | number;
  evolveEnabled?: boolean;
  icon?: string;
  description?: string;
  author?: string;
  lastUpdated?: string;
  folderMapping: FolderMapping | FolderMapping[];
  dependencies?: string[];
  bundles?: KitBundle[];
  configuration?: KitConfiguration;
}

export interface KitBundle {
  name: string;
  enabled: boolean;
  description?: string;
  icon?: string;
  assets: string[];
}

export type ConditionOperator =
  | 'equals'
  | 'not-equals'
  | 'contains'
  | 'not-contains'
  | 'starts-with'
  | 'ends-with'
  | 'greater-than'
  | 'less-than'
  | 'greater-than-or-equals'
  | 'less-than-or-equals'
  | 'matches'
  | 'exists'
  | 'not-exists'
  | 'in'
  | 'not-in'
  | 'is-empty'
  | 'is-not-empty';

export interface ActionCondition {
  field: string;
  operator: ConditionOperator;
  value: any;
}

export type ConfigActionType =
  | 'create'
  | 'edit'
  | 'delete'
  | 'bulk-edit'
  | 'bulk-delete'
  | 'sync'
  | 'import'
  | 'export';

export interface ConfigAction {
  actionType: ConfigActionType;
  conditions?: ActionCondition[];
  command: string;
  label?: string;
  icon?: string;
  confirmMessage?: string;
}

export interface ConfigFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  errorMessage?: string;
}

export interface ConfigFieldOption {
  label: string;
  value: string;
}

export interface ConfigField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'checkbox' | 'toggle' | 'date' | 'email' | 'url' | 'radio';
  placeholder?: string;
  validation?: ConfigFieldValidation;
  helpText?: string;
  value?: any;
  defaultValue?: any;
  options?: (string | ConfigFieldOption)[];
}

export interface KitConfiguration {
  fields?: ConfigField[];
  actions?: ConfigAction[];
}

export interface KitConfig {
  [key: string]: any;
}

export interface KitConfigValues {
  [key: string]: any;
}

export interface ManifestEntry {
  source: string;
  target: string;
  hash: string;
  timestamp: number;
  mapping: FolderMapping;
}

export interface KitManifest {
  kitName: string;
  version: string;
  installedAt: number;
  updatedAt: number;
  files: ManifestEntry[];
}

export interface CatalogItem {
  name: string;
  path: string;
  structure: KitStructure;
  installed: boolean;
  custom: boolean;
  manifestPath?: string;
  configPath?: string;
}

export interface InstallOptions {
  force?: boolean;
  skipDependencies?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface UpdateOptions {
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface RemoveOptions {
  force?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface EvolveOptions {
  branchName?: string;
  commitMessage?: string;
  createPR?: boolean;
  verbose?: boolean;
  dryRun?: boolean;
}

export interface RetryOptions {
  maxAttempts?: number;
  backoffBase?: number;
  maxBackoff?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

export interface GitOperationResult {
  success: boolean;
  error?: Error;
  output?: string;
}

export interface FilterOptions {
  installed?: boolean;
  custom?: boolean;
  namePattern?: string;
  hasIcon?: boolean;
}
