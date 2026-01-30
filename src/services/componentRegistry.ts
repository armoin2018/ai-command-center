/**
 * Component Registry Service
 * 
 * Manages registration and rendering of UI components from schema definitions.
 * Provides component catalog for browsing and live demo capabilities.
 */

import { ComponentSchema, SchemaLoaderService } from './schemaLoader';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/**
 * Registered component with runtime metadata
 */
export interface RegisteredComponent {
    schema: ComponentSchema;
    renderer: ComponentRenderer;
    instances: Map<string, ComponentInstance>;
}

/**
 * Component instance
 */
export interface ComponentInstance {
    id: string;
    componentId: string;
    props: Record<string, any>;
    element?: any; // DOM element reference
    eventHandlers: Map<string, Function>;
}

/**
 * Component renderer interface
 */
export interface ComponentRenderer {
    render(props: Record<string, any>, context: RenderContext): string;
    mount?(instance: ComponentInstance, element: any): void;
    unmount?(instance: ComponentInstance): void;
}

/**
 * Render context
 */
export interface RenderContext {
    data?: any;
    state?: Record<string, any>;
    showComponentRef?: boolean;
}

/**
 * Component registry service
 */
export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private components: Map<string, RegisteredComponent> = new Map();
    private schemaLoader: SchemaLoaderService;

    private constructor(extensionPath: string) {
        this.schemaLoader = SchemaLoaderService.getInstance(extensionPath);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(extensionPath?: string): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            if (!extensionPath) {
                throw new Error('Extension path required for first initialization');
            }
            ComponentRegistry.instance = new ComponentRegistry(extensionPath);
        }
        return ComponentRegistry.instance;
    }

    /**
     * Initialize registry by loading all components
     */
    public async initialize(): Promise<void> {
        try {
            const componentSchemas = await this.schemaLoader.loadAllComponents();
            
            for (const schema of componentSchemas) {
                this.registerComponent(schema);
            }
            
            logger.info(`Component registry initialized with ${this.components.size} components`);
        } catch (error) {
            logger.error('Failed to initialize component registry', { error: String(error) });
        }
    }

    /**
     * Register a component
     */
    public registerComponent(schema: ComponentSchema): void {
        const renderer = this.createRenderer(schema);
        
        this.components.set(schema.metadata.id, {
            schema,
            renderer,
            instances: new Map()
        });
        
        logger.debug(`Registered component: ${schema.metadata.id}`);
    }

    /**
     * Create renderer from schema
     */
    private createRenderer(schema: ComponentSchema): ComponentRenderer {
        return {
            render: (props: Record<string, any>, context: RenderContext): string => {
                // Apply default props
                const finalProps = this.applyDefaults(props, schema.spec.props || {});
                
                // Simple template rendering (could be enhanced with Handlebars/Mustache)
                let html = schema.spec.template;
                
                // Replace template variables
                html = this.processTemplate(html, { ...finalProps, ...context });
                
                return html;
            }
        };
    }

    /**
     * Apply default values to props
     */
    private applyDefaults(
        props: Record<string, any>, 
        propDefs: Record<string, any>
    ): Record<string, any> {
        const result = { ...props };
        
        for (const [key, def] of Object.entries(propDefs)) {
            if (result[key] === undefined && def.default !== undefined) {
                result[key] = def.default;
            }
        }
        
        return result;
    }

    /**
     * Process template string
     */
    private processTemplate(template: string, data: Record<string, any>): string {
        let result = template;
        
        // Replace {{variable}} syntax
        result = result.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
            const value = this.getNestedValue(data, key.trim());
            return value !== undefined ? String(value) : match;
        });
        
        return result;
    }

    /**
     * Get nested value from object
     */
    private getNestedValue(obj: any, path: string): any {
        const keys = path.split('.');
        let value = obj;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }
        
        return value;
    }

    /**
     * Get component by ID
     */
    public getComponent(componentId: string): RegisteredComponent | undefined {
        return this.components.get(componentId);
    }

    /**
     * Get all components
     */
    public getAllComponents(): ComponentSchema[] {
        return Array.from(this.components.values()).map(c => c.schema);
    }

    /**
     * Get components by category
     */
    public getComponentsByCategory(category: string): ComponentSchema[] {
        return this.getAllComponents().filter(c => c.metadata.category === category);
    }

    /**
     * Search components by name or tags
     */
    public searchComponents(query: string): ComponentSchema[] {
        const lowerQuery = query.toLowerCase();
        
        return this.getAllComponents().filter(c => {
            return (
                c.metadata.name.toLowerCase().includes(lowerQuery) ||
                c.metadata.description?.toLowerCase().includes(lowerQuery) ||
                c.metadata.tags?.some(t => t.toLowerCase().includes(lowerQuery))
            );
        });
    }

    /**
     * Render component instance
     */
    public render(
        componentId: string,
        props: Record<string, any>,
        context: RenderContext = {}
    ): string | null {
        const component = this.components.get(componentId);
        if (!component) {
            logger.warn(`Component not found: ${componentId}`);
            return null;
        }

        return component.renderer.render(props, context);
    }

    /**
     * Create component instance
     */
    public createInstance(
        componentId: string,
        instanceId: string,
        props: Record<string, any>
    ): ComponentInstance | null {
        const component = this.components.get(componentId);
        if (!component) {
            return null;
        }

        const instance: ComponentInstance = {
            id: instanceId,
            componentId,
            props,
            eventHandlers: new Map()
        };

        component.instances.set(instanceId, instance);
        
        return instance;
    }

    /**
     * Get catalog for browsing components
     */
    public getCatalog(): Array<{
        id: string;
        name: string;
        description: string;
        category: string;
        tags: string[];
        version: string;
        examples: any[];
    }> {
        return this.getAllComponents().map(schema => ({
            id: schema.metadata.id,
            name: schema.metadata.name,
            description: schema.metadata.description || '',
            category: schema.metadata.category,
            tags: schema.metadata.tags || [],
            version: schema.metadata.version,
            examples: schema.spec.examples || []
        }));
    }

    /**
     * Get component demo HTML
     */
    public getDemoHtml(componentId: string, exampleIndex: number = 0): string | null {
        const component = this.components.get(componentId);
        if (!component || !component.schema.spec.examples) {
            return null;
        }

        const example = component.schema.spec.examples[exampleIndex];
        if (!example) {
            return null;
        }

        const html = this.render(componentId, example.props || {}, {});
        const styles = component.schema.spec.styles || '';

        return `
            <div class="component-demo">
                <div class="demo-header">
                    <h4>${component.schema.metadata.name}</h4>
                    <span class="demo-example">${example.name}</span>
                </div>
                <div class="demo-description">${example.description || ''}</div>
                <div class="demo-preview">
                    <style>${styles}</style>
                    ${html}
                </div>
                <div class="demo-code">
                    <pre><code>${this.escapeHtml(example.code || '')}</code></pre>
                </div>
            </div>
        `;
    }

    /**
     * Escape HTML for safe rendering
     */
    private escapeHtml(str: string): string {
        const div = { textContent: str } as any;
        return div.innerHTML || str;
    }

    /**
     * Clear registry
     */
    public clear(): void {
        this.components.clear();
        logger.debug('Component registry cleared');
    }
}
