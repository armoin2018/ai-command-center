/**
 * Kit Component Types
 * 
 * Defines interfaces for the AI Kit Component System, enabling
 * independent installation, toggling, and management of named
 * subsets within an AI Kit (e.g., "office", "social-media").
 * 
 * Part of AICC-0103: Component Definition & Toggle Behavior
 *   - AICC-0283: Component schema
 *   - AICC-0284: Component toggle behavior
 *   - AICC-0285: Component state management
 *   - AICC-0286: Component refresh
 *   - AICC-0287: Dependency validation
 *   - AICC-0288: Conflict detection
 */

// ─── Core Component Definition ──────────────────────────────────────

/**
 * Definition of a single kit component as declared in `structure.json`.
 * A component groups related resources (skills, instructions, personas)
 * that can be independently installed or removed.
 * 
 * @see REQ-KIT-050, REQ-KIT-051
 */
export interface KitComponent {
    /** Unique component name within the kit (e.g., "office", "social-media") */
    name: string;
    /** Human-readable description of the component's purpose */
    description: string;
    /** Default installation state from the kit's structure.json */
    installedByDefault: boolean;
    /**
     * Files belonging to this component, as relative paths from the
     * kit repository root (e.g., ".github/skills/ailey-com-outlook/SKILL.md").
     */
    files: string[];
    /**
     * Optional dependencies on other components within the same kit.
     * The component cannot be enabled unless all dependencies are also enabled.
     * @see REQ-KIT-059
     */
    dependencies?: ComponentDependency[];
    /**
     * Optional metadata tags for categorization or search.
     */
    tags?: string[];
}

/**
 * Dependency declaration between components.
 * A component may require other components to function correctly.
 * 
 * @see REQ-KIT-059
 */
export interface ComponentDependency {
    /** Name of the required component */
    componentName: string;
    /** Whether this dependency is strictly required or advisory */
    required: boolean;
    /** Reason for the dependency (shown in validation messages) */
    reason?: string;
}

/**
 * Conflict detected when two or more components share file paths.
 * 
 * @see REQ-KIT-060
 */
export interface ComponentConflict {
    /** File path that is shared between components */
    filePath: string;
    /** Names of the components that both claim this file */
    componentNames: string[];
    /** Severity of the conflict */
    severity: 'error' | 'warning';
    /** Human-readable description of the conflict */
    message: string;
}

// ─── Component State ────────────────────────────────────────────────

/**
 * Runtime state of a single component within a workspace.
 * Persisted in `.aicc-components.json`.
 * 
 * @see REQ-KIT-053
 */
export interface ComponentState {
    /** Component name (matches KitComponent.name) */
    name: string;
    /** Whether the component is currently installed in this workspace */
    installed: boolean;
    /** ISO 8601 timestamp of last state change */
    lastChanged: string;
    /** Number of files deployed for this component */
    fileCount: number;
    /** Whether any deployed files have been modified by the user */
    hasModifiedFiles: boolean;
}

/**
 * Per-kit component state record, persisted to `.aicc-components.json`.
 * Maps kit names to their component states.
 */
export interface ComponentStateFile {
    /** Schema version for forward compatibility */
    version: '1.0.0';
    /** ISO 8601 timestamp of last update */
    updatedAt: string;
    /** Component states keyed by kit name, then by component name */
    kits: Record<string, KitComponentStates>;
}

/**
 * All component states for a single kit within a workspace.
 */
export interface KitComponentStates {
    /** Kit name this state record belongs to */
    kitName: string;
    /** Component states keyed by component name */
    components: Record<string, ComponentState>;
}

// ─── Dependency Validation Results ──────────────────────────────────

/**
 * Result of dependency validation before enabling or disabling a component.
 * 
 * @see REQ-KIT-059
 */
export interface DependencyValidationResult {
    /** Whether the operation can proceed */
    valid: boolean;
    /** Missing dependencies that must be installed first (for enable) */
    missingDependencies: ComponentDependency[];
    /** Dependent components that would break (for disable) */
    dependentComponents: string[];
    /** Human-readable validation messages */
    messages: string[];
}

// ─── Conflict Detection Results ─────────────────────────────────────

/**
 * Result of conflict detection across all components in a kit.
 * 
 * @see REQ-KIT-060
 */
export interface ConflictDetectionResult {
    /** Whether any conflicts were found */
    hasConflicts: boolean;
    /** List of detected conflicts */
    conflicts: ComponentConflict[];
    /** Total number of conflicting file paths */
    conflictingFileCount: number;
}

// ─── Component Operation Results ────────────────────────────────────

/**
 * Result of a component toggle (enable/disable) operation.
 */
export interface ComponentToggleResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Component name that was toggled */
    componentName: string;
    /** Kit name the component belongs to */
    kitName: string;
    /** New installed state after the toggle */
    installed: boolean;
    /** Number of files added or removed */
    filesAffected: number;
    /** Files skipped due to user modifications */
    filesSkipped: string[];
    /** Error message if the operation failed */
    error?: string;
    /** Warning messages (e.g., dependency warnings) */
    warnings: string[];
}

/**
 * Result of a component refresh operation.
 * 
 * @see REQ-KIT-058
 */
export interface ComponentRefreshResult {
    /** Whether the refresh succeeded */
    success: boolean;
    /** Component name that was refreshed */
    componentName: string;
    /** Kit name the component belongs to */
    kitName: string;
    /** Files that were updated from cache */
    updatedFiles: string[];
    /** Files skipped because user modified them */
    skippedFiles: string[];
    /** Files that were newly added */
    addedFiles: string[];
    /** Files that were removed (no longer in component definition) */
    removedFiles: string[];
    /** Error message if the refresh failed */
    error?: string;
}

// ─── Kit Config Form Types ──────────────────────────────────────────

/**
 * Schema definition for a single configuration field rendered in the form.
 * Parsed from the kit's config.yaml schema.
 * 
 * @see REQ-KIT-031, REQ-KIT-032
 */
export interface ConfigFieldDefinition {
    /** Field key (dot-separated path, e.g. "defaults.branch") */
    key: string;
    /** Human-readable label */
    label: string;
    /** Field type for rendering */
    type: ConfigFieldType;
    /** Default value from config.yaml */
    defaultValue: unknown;
    /** Current value (from workspace override or default) */
    currentValue?: unknown;
    /** Optional description / help text */
    description?: string;
    /** Whether the field is required */
    required?: boolean;
    /** Minimum value (number) or minimum length (string) */
    min?: number;
    /** Maximum value (number) or maximum length (string) */
    max?: number;
    /** Regex pattern for string validation */
    pattern?: string;
    /** Allowed values for select/enum fields */
    options?: string[];
    /** Validation error message (populated at runtime) */
    validationError?: string;
    /** Section/group this field belongs to */
    section?: string;
}

/** Supported field types for the configuration form */
export type ConfigFieldType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'select'
    | 'array'
    | 'object';

/**
 * A logical section grouping related configuration fields.
 */
export interface ConfigFormSection {
    /** Section identifier */
    id: string;
    /** Section display title */
    title: string;
    /** Optional description shown below the title */
    description?: string;
    /** Fields belonging to this section */
    fields: ConfigFieldDefinition[];
}

/**
 * Validation error for a single form field.
 */
export interface ConfigValidationError {
    /** Field key that failed validation */
    fieldKey: string;
    /** Error message to display inline */
    message: string;
    /** Severity level */
    severity: 'error' | 'warning';
}

/**
 * Result of validating the entire config form.
 */
export interface ConfigFormValidationResult {
    /** Whether all fields passed validation */
    valid: boolean;
    /** Validation errors per field */
    errors: ConfigValidationError[];
}
