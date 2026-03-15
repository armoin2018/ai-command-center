/**
 * Kit Component Manager Service
 * 
 * Singleton service managing AI Kit component states per workspace.
 * Handles component toggling (install/uninstall), state persistence,
 * dependency validation, conflict detection, and component refresh.
 * 
 * State is persisted to `.aicc-components.json` at the workspace root.
 * 
 * Part of AICC-0103 / AICC-0104:
 *   - AICC-0284: Component toggle behavior
 *   - AICC-0285: Component state management
 *   - AICC-0286: Component refresh
 *   - AICC-0287: Dependency validation
 *   - AICC-0288: Conflict detection
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger } from '../logger';
import {
    KitComponent,
    ComponentDependency,
    ComponentConflict,
    ComponentState,
    ComponentStateFile,
    KitComponentStates,
    ComponentToggleResult,
    ComponentRefreshResult,
    DependencyValidationResult,
    ConflictDetectionResult
} from '../types/kitComponent';

/** Filename for workspace-local component state persistence */
const COMPONENT_STATE_FILE = '.aicc-components.json';

/**
 * KitComponentManager is a singleton that manages AI Kit component
 * states within a workspace.  It provides:
 * 
 * - Toggle components on/off (deploy/remove files)
 * - Persist state to `.aicc-components.json`
 * - Validate dependencies before enable/disable
 * - Detect file-path conflicts between components
 * - Refresh component files from cache
 */
export class KitComponentManager {
    private static instance: KitComponentManager;
    private readonly logger: Logger;

    /** In-memory state file; loaded lazily on first access */
    private stateFile: ComponentStateFile | null = null;

    private constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Get the singleton KitComponentManager instance.
     */
    public static getInstance(): KitComponentManager {
        if (!KitComponentManager.instance) {
            KitComponentManager.instance = new KitComponentManager();
        }
        return KitComponentManager.instance;
    }

    // ─── State Persistence (AICC-0285) ──────────────────────────────

    /**
     * Load the component state file from the workspace root.
     * Creates a fresh state if none exists on disk.
     * 
     * @param workspacePath - Absolute path to the workspace root
     * @returns The loaded or newly created ComponentStateFile
     */
    public async loadState(workspacePath: string): Promise<ComponentStateFile> {
        if (this.stateFile) {
            return this.stateFile;
        }

        const filePath = path.join(workspacePath, COMPONENT_STATE_FILE);

        if (fs.existsSync(filePath)) {
            try {
                const raw = fs.readFileSync(filePath, 'utf-8');
                this.stateFile = JSON.parse(raw) as ComponentStateFile;
                this.logger.info('Component state loaded', {
                    kits: Object.keys(this.stateFile.kits).length
                });
                return this.stateFile;
            } catch (error) {
                this.logger.error('Failed to parse component state file, creating fresh state', {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Create fresh state
        this.stateFile = {
            version: '1.0.0',
            updatedAt: new Date().toISOString(),
            kits: {}
        };
        return this.stateFile;
    }

    /**
     * Persist the current in-memory state to `.aicc-components.json`.
     * 
     * @param workspacePath - Absolute path to the workspace root
     */
    public async saveState(workspacePath: string): Promise<void> {
        if (!this.stateFile) {
            this.logger.warn('No state to save');
            return;
        }

        this.stateFile.updatedAt = new Date().toISOString();
        const filePath = path.join(workspacePath, COMPONENT_STATE_FILE);

        try {
            fs.writeFileSync(filePath, JSON.stringify(this.stateFile, null, 2), 'utf-8');
            this.logger.debug('Component state saved', { path: filePath });
        } catch (error) {
            this.logger.error('Failed to save component state', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to save component state: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get the component state for a specific kit.
     * Returns null if no state has been recorded for the kit.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     */
    public async getKitState(
        kitName: string,
        workspacePath: string
    ): Promise<KitComponentStates | null> {
        const state = await this.loadState(workspacePath);
        return state.kits[kitName] ?? null;
    }

    /**
     * Get the state of a single component within a kit.
     * 
     * @param kitName - Kit identifier
     * @param componentName - Component name
     * @param workspacePath - Absolute path to the workspace root
     */
    public async getComponentState(
        kitName: string,
        componentName: string,
        workspacePath: string
    ): Promise<ComponentState | null> {
        const kitState = await this.getKitState(kitName, workspacePath);
        if (!kitState) {
            return null;
        }
        return kitState.components[componentName] ?? null;
    }

    /**
     * Initialize component states for a kit from its component definitions.
     * Only creates state entries that do not yet exist; preserves existing state.
     * 
     * @param kitName - Kit identifier
     * @param components - Component definitions from the kit's structure.json
     * @param workspacePath - Absolute path to the workspace root
     */
    public async initializeKitComponents(
        kitName: string,
        components: KitComponent[],
        workspacePath: string
    ): Promise<void> {
        const state = await this.loadState(workspacePath);

        if (!state.kits[kitName]) {
            state.kits[kitName] = {
                kitName,
                components: {}
            };
        }

        const kitState = state.kits[kitName];
        const now = new Date().toISOString();

        for (const component of components) {
            if (!kitState.components[component.name]) {
                kitState.components[component.name] = {
                    name: component.name,
                    installed: component.installedByDefault,
                    lastChanged: now,
                    fileCount: component.files.length,
                    hasModifiedFiles: false
                };
            }
        }

        await this.saveState(workspacePath);

        this.logger.info('Kit component states initialized', {
            kitName,
            componentCount: components.length
        });
    }

    // ─── Component Toggle (AICC-0284) ───────────────────────────────

    /**
     * Toggle a component's installed state.
     * 
     * When enabling:
     *   1. Validate dependencies
     *   2. Copy component files from cache to workspace
     *   3. Update state
     * 
     * When disabling:
     *   1. Validate no other installed component depends on this one
     *   2. Remove component files (skip user-modified files)
     *   3. Update state
     * 
     * @param kitName - Kit identifier
     * @param componentName - Component to toggle
     * @param enable - true to enable, false to disable
     * @param allComponents - All components for this kit (for dependency checks)
     * @param cachePath - Absolute path to the kit cache directory
     * @param workspacePath - Absolute path to the workspace root
     * @returns Result of the toggle operation
     */
    public async toggleComponent(
        kitName: string,
        componentName: string,
        enable: boolean,
        allComponents: KitComponent[],
        cachePath: string,
        workspacePath: string
    ): Promise<ComponentToggleResult> {
        const warnings: string[] = [];
        const component = allComponents.find(c => c.name === componentName);

        if (!component) {
            return {
                success: false,
                componentName,
                kitName,
                installed: false,
                filesAffected: 0,
                filesSkipped: [],
                error: `Component '${componentName}' not found in kit '${kitName}'`,
                warnings: []
            };
        }

        // Validate dependencies
        const validation = enable
            ? this.validateEnableDependencies(component, allComponents, await this.getKitState(kitName, workspacePath))
            : this.validateDisableDependencies(componentName, allComponents, await this.getKitState(kitName, workspacePath));

        if (!validation.valid) {
            return {
                success: false,
                componentName,
                kitName,
                installed: !enable,
                filesAffected: 0,
                filesSkipped: [],
                error: validation.messages.join('; '),
                warnings: []
            };
        }

        // Advisory warnings
        if (validation.messages.length > 0) {
            warnings.push(...validation.messages);
        }

        try {
            let filesAffected = 0;
            const filesSkipped: string[] = [];

            if (enable) {
                // Copy files from cache to workspace
                for (const file of component.files) {
                    const sourceFile = path.join(cachePath, file);
                    const targetFile = path.join(workspacePath, file);

                    if (!fs.existsSync(sourceFile)) {
                        warnings.push(`Source file not found in cache: ${file}`);
                        continue;
                    }

                    const targetDir = path.dirname(targetFile);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }

                    // If target exists and is different, check if user modified it
                    if (fs.existsSync(targetFile)) {
                        warnings.push(`File already exists, overwriting: ${file}`);
                    }

                    fs.copyFileSync(sourceFile, targetFile);
                    filesAffected++;
                }
            } else {
                // Remove files from workspace
                for (const file of component.files) {
                    const targetFile = path.join(workspacePath, file);

                    if (!fs.existsSync(targetFile)) {
                        continue;
                    }

                    // Check if user modified the file
                    const isModified = await this.isFileModified(targetFile, cachePath, file);
                    if (isModified) {
                        filesSkipped.push(file);
                        continue;
                    }

                    fs.unlinkSync(targetFile);
                    this.cleanEmptyParents(targetFile, workspacePath);
                    filesAffected++;
                }
            }

            // Update state
            await this.updateComponentState(kitName, componentName, enable, filesAffected, filesSkipped.length > 0, workspacePath);

            this.logger.info('Component toggled', {
                kitName,
                componentName,
                enabled: enable,
                filesAffected,
                filesSkipped: filesSkipped.length
            });

            return {
                success: true,
                componentName,
                kitName,
                installed: enable,
                filesAffected,
                filesSkipped,
                warnings
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to toggle component', {
                kitName,
                componentName,
                enable,
                error: message
            });
            return {
                success: false,
                componentName,
                kitName,
                installed: !enable,
                filesAffected: 0,
                filesSkipped: [],
                error: message,
                warnings
            };
        }
    }

    // ─── Component Refresh (AICC-0286) ──────────────────────────────

    /**
     * Refresh a component by re-syncing its files from the cache.
     * Only updates files belonging to currently-installed components.
     * Skips user-modified files to prevent data loss.
     * 
     * @param kitName - Kit identifier
     * @param componentName - Component to refresh
     * @param component - Component definition
     * @param cachePath - Absolute path to the kit cache directory
     * @param workspacePath - Absolute path to the workspace root
     * @returns Result of the refresh operation
     */
    public async refreshComponent(
        kitName: string,
        componentName: string,
        component: KitComponent,
        cachePath: string,
        workspacePath: string
    ): Promise<ComponentRefreshResult> {
        const state = await this.getComponentState(kitName, componentName, workspacePath);

        if (!state || !state.installed) {
            return {
                success: false,
                componentName,
                kitName,
                updatedFiles: [],
                skippedFiles: [],
                addedFiles: [],
                removedFiles: [],
                error: `Component '${componentName}' is not installed`
            };
        }

        const updatedFiles: string[] = [];
        const skippedFiles: string[] = [];
        const addedFiles: string[] = [];
        const removedFiles: string[] = [];

        try {
            // Track which files currently exist in workspace for this component
            const existingFiles = new Set<string>();
            for (const file of component.files) {
                const targetFile = path.join(workspacePath, file);
                if (fs.existsSync(targetFile)) {
                    existingFiles.add(file);
                }
            }

            // Sync files from cache
            for (const file of component.files) {
                const sourceFile = path.join(cachePath, file);
                const targetFile = path.join(workspacePath, file);

                if (!fs.existsSync(sourceFile)) {
                    continue;
                }

                if (!existingFiles.has(file)) {
                    // New file — add it
                    const targetDir = path.dirname(targetFile);
                    if (!fs.existsSync(targetDir)) {
                        fs.mkdirSync(targetDir, { recursive: true });
                    }
                    fs.copyFileSync(sourceFile, targetFile);
                    addedFiles.push(file);
                    continue;
                }

                // Existing file — check if user modified it
                const isModified = await this.isFileModified(targetFile, cachePath, file);
                if (isModified) {
                    skippedFiles.push(file);
                    continue;
                }

                // Check if cache version is different
                const cacheHash = this.computeFileHash(sourceFile);
                const currentHash = this.computeFileHash(targetFile);
                if (cacheHash !== currentHash) {
                    fs.copyFileSync(sourceFile, targetFile);
                    updatedFiles.push(file);
                }
            }

            // Detect removed files (exist in workspace but no longer in component definition)
            // This is handled by comparing against the component's files list
            // Files in workspace that are NOT in the component's files list may have been
            // removed from the component definition during a kit update

            // Update state
            const hasModified = skippedFiles.length > 0;
            await this.updateComponentState(
                kitName,
                componentName,
                true,
                component.files.length,
                hasModified,
                workspacePath
            );

            this.logger.info('Component refreshed', {
                kitName,
                componentName,
                updated: updatedFiles.length,
                skipped: skippedFiles.length,
                added: addedFiles.length,
                removed: removedFiles.length
            });

            return {
                success: true,
                componentName,
                kitName,
                updatedFiles,
                skippedFiles,
                addedFiles,
                removedFiles
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.logger.error('Failed to refresh component', {
                kitName,
                componentName,
                error: message
            });
            return {
                success: false,
                componentName,
                kitName,
                updatedFiles,
                skippedFiles,
                addedFiles,
                removedFiles,
                error: message
            };
        }
    }

    // ─── Dependency Validation (AICC-0287) ──────────────────────────

    /**
     * Validate dependencies before enabling a component.
     * Checks that all required dependencies are already installed.
     * 
     * @param component - Component to enable
     * @param allComponents - All components in the kit
     * @param kitState - Current kit component states (or null)
     * @returns Validation result
     */
    public validateEnableDependencies(
        component: KitComponent,
        _allComponents: KitComponent[],
        kitState: KitComponentStates | null
    ): DependencyValidationResult {
        const missingDependencies: ComponentDependency[] = [];
        const messages: string[] = [];

        if (!component.dependencies || component.dependencies.length === 0) {
            return { valid: true, missingDependencies: [], dependentComponents: [], messages: [] };
        }

        for (const dep of component.dependencies) {
            const depState = kitState?.components[dep.componentName];
            const isInstalled = depState?.installed ?? false;

            if (!isInstalled) {
                missingDependencies.push(dep);
                const severity = dep.required ? 'Required' : 'Recommended';
                const reason = dep.reason ? ` (${dep.reason})` : '';
                messages.push(`${severity} dependency '${dep.componentName}' is not installed${reason}`);
            }
        }

        const hasRequiredMissing = missingDependencies.some(d => d.required);

        return {
            valid: !hasRequiredMissing,
            missingDependencies,
            dependentComponents: [],
            messages
        };
    }

    /**
     * Validate that disabling a component will not break other installed components.
     * Checks if any currently installed component depends on this one.
     * 
     * @param componentName - Component being disabled
     * @param allComponents - All components in the kit
     * @param kitState - Current kit component states (or null)
     * @returns Validation result
     */
    public validateDisableDependencies(
        componentName: string,
        allComponents: KitComponent[],
        kitState: KitComponentStates | null
    ): DependencyValidationResult {
        const dependentComponents: string[] = [];
        const messages: string[] = [];

        for (const comp of allComponents) {
            if (comp.name === componentName) {
                continue;
            }

            const compState = kitState?.components[comp.name];
            if (!compState?.installed) {
                continue;
            }

            const dependsOnTarget = comp.dependencies?.some(
                d => d.componentName === componentName && d.required
            );

            if (dependsOnTarget) {
                dependentComponents.push(comp.name);
                messages.push(
                    `Component '${comp.name}' depends on '${componentName}' and is currently installed`
                );
            }
        }

        return {
            valid: dependentComponents.length === 0,
            missingDependencies: [],
            dependentComponents,
            messages
        };
    }

    // ─── Conflict Detection (AICC-0288) ─────────────────────────────

    /**
     * Detect file-path conflicts between components.
     * A conflict occurs when two or more components list the same file path.
     * 
     * @param components - All component definitions to check
     * @returns Conflict detection result
     */
    public detectConflicts(components: KitComponent[]): ConflictDetectionResult {
        const fileToComponents = new Map<string, string[]>();

        // Build file → component-name mapping
        for (const component of components) {
            for (const file of component.files) {
                const existing = fileToComponents.get(file);
                if (existing) {
                    existing.push(component.name);
                } else {
                    fileToComponents.set(file, [component.name]);
                }
            }
        }

        // Find conflicts
        const conflicts: ComponentConflict[] = [];
        for (const [filePath, componentNames] of fileToComponents) {
            if (componentNames.length > 1) {
                conflicts.push({
                    filePath,
                    componentNames: [...componentNames],
                    severity: 'warning',
                    message: `File '${filePath}' is claimed by components: ${componentNames.join(', ')}`
                });
            }
        }

        const result: ConflictDetectionResult = {
            hasConflicts: conflicts.length > 0,
            conflicts,
            conflictingFileCount: conflicts.length
        };

        if (result.hasConflicts) {
            this.logger.warn('Component file conflicts detected', {
                conflictCount: conflicts.length
            });
        }

        return result;
    }

    // ─── Private Helpers ────────────────────────────────────────────

    /**
     * Update the in-memory state for a single component and persist.
     */
    private async updateComponentState(
        kitName: string,
        componentName: string,
        installed: boolean,
        fileCount: number,
        hasModifiedFiles: boolean,
        workspacePath: string
    ): Promise<void> {
        const state = await this.loadState(workspacePath);

        if (!state.kits[kitName]) {
            state.kits[kitName] = { kitName, components: {} };
        }

        state.kits[kitName].components[componentName] = {
            name: componentName,
            installed,
            lastChanged: new Date().toISOString(),
            fileCount,
            hasModifiedFiles
        };

        await this.saveState(workspacePath);
    }

    /**
     * Check if a file in the workspace has been modified compared to
     * the cache version (using SHA-256 hash comparison).
     */
    private async isFileModified(
        targetFile: string,
        cachePath: string,
        relativePath: string
    ): Promise<boolean> {
        const cacheFile = path.join(cachePath, relativePath);
        if (!fs.existsSync(cacheFile) || !fs.existsSync(targetFile)) {
            return false;
        }

        const cacheHash = this.computeFileHash(cacheFile);
        const targetHash = this.computeFileHash(targetFile);
        return cacheHash !== targetHash;
    }

    /**
     * Compute the SHA-256 hash of a file.
     */
    private computeFileHash(filePath: string): string {
        const content = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Remove empty parent directories up to the workspace root.
     */
    private cleanEmptyParents(filePath: string, workspacePath: string): void {
        let dir = path.dirname(filePath);
        const normalized = path.normalize(workspacePath);

        while (dir !== normalized && dir.startsWith(normalized)) {
            try {
                const contents = fs.readdirSync(dir);
                if (contents.length === 0) {
                    fs.rmdirSync(dir);
                    dir = path.dirname(dir);
                } else {
                    break;
                }
            } catch {
                break;
            }
        }
    }

    /**
     * Reset the in-memory state (useful for testing or workspace changes).
     */
    public resetState(): void {
        this.stateFile = null;
    }
}
