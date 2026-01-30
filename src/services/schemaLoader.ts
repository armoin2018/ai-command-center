/**
 * Schema Loader Service
 * 
 * Loads, validates, and manages YAML schema definitions for panels, tabs, and components.
 * Supports versioning, defaults, and runtime schema validation.
 */

import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/**
 * Base schema metadata
 */
export interface SchemaMetadata {
    name: string;
    id: string;
    description?: string;
    version: string;
    icon?: string;
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
}

/**
 * Panel schema definition
 */
export interface PanelSchema {
    apiVersion: string;
    kind: 'Panel';
    metadata: SchemaMetadata;
    spec: {
        layout: {
            type: 'tabs' | 'split' | 'grid' | 'stack';
            orientation?: 'horizontal' | 'vertical';
            columns?: number;
            gap?: string;
        };
        tabs?: Array<{
            tabRef: string;
            order?: number;
            condition?: string;
        }>;
        header?: {
            show: boolean;
            title?: string;
            actions?: Action[];
        };
        footer?: {
            show: boolean;
            leftActions?: Action[];
            rightActions?: Action[];
        };
        dataBindings?: Record<string, DataBinding>;
        theme?: {
            cssVariables?: Record<string, string>;
            cssClasses?: string[];
        };
    };
}

/**
 * Tab schema definition
 */
export interface TabSchema {
    apiVersion: string;
    kind: 'Tab';
    metadata: SchemaMetadata;
    spec: {
        components: ComponentReference[];
        layout?: {
            type: 'stack' | 'grid' | 'flex';
            direction?: 'column' | 'row';
            gap?: string;
            padding?: string;
        };
        dataBindings?: Record<string, DataBinding>;
        state?: {
            persist: boolean;
            initialState?: Record<string, any>;
        };
        hooks?: {
            onMount?: string;
            onUnmount?: string;
            onDataChange?: string;
        };
    };
}

/**
 * Component schema definition
 */
export interface ComponentSchema {
    apiVersion: string;
    kind: 'Component';
    metadata: SchemaMetadata & {
        category: 'layout' | 'data-display' | 'input' | 'navigation' | 'feedback' | 'utility';
        tags?: string[];
    };
    spec: {
        template: string;
        props?: Record<string, PropDefinition>;
        events?: EventDefinition[];
        styles?: string;
        examples?: Example[];
    };
}

/**
 * Component reference in tab
 */
export interface ComponentReference {
    componentId: string;
    id?: string;
    props?: Record<string, any>;
    dataBinding?: string;
    condition?: string;
    order?: number;
    style?: {
        className?: string;
        cssVariables?: Record<string, string>;
    };
}

/**
 * Action definition
 */
export interface Action {
    id: string;
    type: 'button' | 'dropdown' | 'toggle' | 'select';
    label?: string;
    icon?: string;
    tooltip?: string;
    command?: string;
    style?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
    options?: Array<{ value: string; label: string }>;
    condition?: string;
}

/**
 * Data binding definition
 */
export interface DataBinding {
    source: 'rest' | 'graphql' | 'sdk' | 'command' | 'state';
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    params?: Record<string, any>;
    transform?: string;
    cache?: {
        enabled: boolean;
        ttl?: number;
    };
    poll?: {
        enabled: boolean;
        interval?: number;
    };
}

/**
 * Property definition
 */
export interface PropDefinition {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    default?: any;
    required?: boolean;
    description?: string;
}

/**
 * Event definition
 */
export interface EventDefinition {
    name: string;
    description?: string;
    payload?: Record<string, any>;
}

/**
 * Example definition
 */
export interface Example {
    name: string;
    description?: string;
    props?: Record<string, any>;
    code?: string;
}

/**
 * Schema loader service
 */
export class SchemaLoaderService {
    private static instance: SchemaLoaderService;
    private ajv: InstanceType<typeof Ajv>;
    private validators: Map<string, ValidateFunction> = new Map();
    private loadedSchemas: Map<string, PanelSchema | TabSchema | ComponentSchema> = new Map();
    private extensionPath: string;

    private constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
        this.ajv = new Ajv({ 
            allErrors: true,
            useDefaults: true,
            coerceTypes: true
        });
        this.initializeValidators();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(extensionPath?: string): SchemaLoaderService {
        if (!SchemaLoaderService.instance) {
            if (!extensionPath) {
                throw new Error('Extension path required for first initialization');
            }
            SchemaLoaderService.instance = new SchemaLoaderService(extensionPath);
        }
        return SchemaLoaderService.instance;
    }

    /**
     * Initialize JSON schema validators
     */
    private async initializeValidators(): Promise<void> {
        try {
            const schemaDir = path.join(this.extensionPath, '.github', 'aicc', 'schemas');
            
            // Load schema files
            const panelSchema = await this.loadJsonSchema(path.join(schemaDir, 'panel.schema.json'));
            const tabSchema = await this.loadJsonSchema(path.join(schemaDir, 'tab.schema.json'));
            const componentSchema = await this.loadJsonSchema(path.join(schemaDir, 'component.schema.json'));
            
            // Compile validators
            this.validators.set('Panel', this.ajv.compile(panelSchema));
            this.validators.set('Tab', this.ajv.compile(tabSchema));
            this.validators.set('Component', this.ajv.compile(componentSchema));
            
            logger.info('Schema validators initialized');
        } catch (error) {
            logger.error('Failed to initialize schema validators', { error: String(error) });
        }
    }

    /**
     * Load JSON schema file
     */
    private async loadJsonSchema(filePath: string): Promise<any> {
        const content = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Load and validate panel schema
     */
    public async loadPanel(filePath: string): Promise<PanelSchema | null> {
        return this.loadSchema<PanelSchema>(filePath, 'Panel');
    }

    /**
     * Load and validate tab schema
     */
    public async loadTab(filePath: string): Promise<TabSchema | null> {
        return this.loadSchema<TabSchema>(filePath, 'Tab');
    }

    /**
     * Load and validate component schema
     */
    public async loadComponent(filePath: string): Promise<ComponentSchema | null> {
        return this.loadSchema<ComponentSchema>(filePath, 'Component');
    }

    /**
     * Generic schema loader with validation
     */
    private async loadSchema<T>(
        filePath: string, 
        kind: 'Panel' | 'Tab' | 'Component'
    ): Promise<T | null> {
        try {
            // Check cache
            const cached = this.loadedSchemas.get(filePath);
            if (cached && cached.kind === kind) {
                return cached as T;
            }

            // Resolve path (support workspace and .my overrides)
            const resolvedPath = await this.resolvePath(filePath);
            if (!resolvedPath) {
                logger.warn(`Schema file not found: ${filePath}`);
                return null;
            }

            // Load YAML file
            const content = await fs.readFile(resolvedPath, 'utf-8');
            const schema = yaml.load(content) as T;

            // Validate against JSON schema
            const validator = this.validators.get(kind);
            if (validator) {
                const valid = validator(schema);
                if (!valid) {
                    logger.error(`Schema validation failed for ${filePath}`, {
                        errors: JSON.stringify(validator.errors)
                    });
                    return null;
                }
            }

            // Cache the loaded schema
            this.loadedSchemas.set(filePath, schema as any);
            
            logger.debug(`Loaded ${kind} schema: ${filePath}`);
            return schema;
        } catch (error) {
            logger.error(`Failed to load ${kind} schema: ${filePath}`, { 
                error: String(error) 
            });
            return null;
        }
    }

    /**
     * Resolve schema path (check workspace, then .my override)
     */
    private async resolvePath(filePath: string): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        
        // Check for .my override first
        if (filePath.startsWith('.github/')) {
            const myOverride = filePath.replace('.github/', '.my/');
            const myPath = path.join(workspaceRoot, myOverride);
            try {
                await fs.access(myPath);
                return myPath;
            } catch {
                // No override, continue to default
            }
        }

        // Use default path
        const defaultPath = path.join(workspaceRoot, filePath);
        try {
            await fs.access(defaultPath);
            return defaultPath;
        } catch {
            return null;
        }
    }

    /**
     * Load all panels from directory
     */
    public async loadAllPanels(): Promise<PanelSchema[]> {
        return this.loadAllFromDirectory<PanelSchema>('panels', 'Panel');
    }

    /**
     * Load all tabs from directory
     */
    public async loadAllTabs(): Promise<TabSchema[]> {
        return this.loadAllFromDirectory<TabSchema>('tabs', 'Tab');
    }

    /**
     * Load all components from directory
     */
    public async loadAllComponents(): Promise<ComponentSchema[]> {
        return this.loadAllFromDirectory<ComponentSchema>('components', 'Component');
    }

    /**
     * Load all schemas from a directory
     */
    private async loadAllFromDirectory<T>(
        dirName: string,
        kind: 'Panel' | 'Tab' | 'Component'
    ): Promise<T[]> {
        const results: T[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return results;

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const baseDir = path.join(workspaceRoot, '.github', 'aicc', dirName);
        
        try {
            const files = await fs.readdir(baseDir);
            const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
            
            for (const file of yamlFiles) {
                const filePath = `.github/aicc/${dirName}/${file}`;
                const schema = await this.loadSchema<T>(filePath, kind);
                if (schema) {
                    results.push(schema);
                }
            }
        } catch (error) {
            logger.warn(`Failed to load ${dirName} from ${baseDir}`, { 
                error: String(error) 
            });
        }

        return results;
    }

    /**
     * Clear schema cache
     */
    public clearCache(): void {
        this.loadedSchemas.clear();
        logger.debug('Schema cache cleared');
    }

    /**
     * Watch for schema file changes
     */
    public watchSchemas(callback: (path: string) => void): vscode.FileSystemWatcher {
        const pattern = new vscode.RelativePattern(
            vscode.workspace.workspaceFolders![0],
            '{.github,.my}/aicc/{panels,tabs,components}/**/*.{yaml,yml}'
        );
        
        const watcher = vscode.workspace.createFileSystemWatcher(pattern);
        
        watcher.onDidChange(uri => {
            this.loadedSchemas.delete(uri.fsPath);
            callback(uri.fsPath);
        });
        
        watcher.onDidCreate(uri => {
            callback(uri.fsPath);
        });
        
        watcher.onDidDelete(uri => {
            this.loadedSchemas.delete(uri.fsPath);
            callback(uri.fsPath);
        });
        
        return watcher;
    }
}
