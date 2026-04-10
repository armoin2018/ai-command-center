/**
 * Panel Renderer Service
 * 
 * Renders panels, tabs, and components from YAML schemas.
 * Supports data binding, template processing, and event handling.
 */

import { SchemaLoaderService, PanelSchema, TabSchema } from './schemaLoader';
import { Logger } from '../logger';

const logger = Logger.getInstance();

/**
 * Render context with data and state
 */
export interface RenderContext {
    data?: Record<string, any>;
    state?: Record<string, any>;
    showComponentRef?: boolean;
}

/**
 * Panel renderer service
 */
export class PanelRenderer {
    private static instance: PanelRenderer;
    private schemaLoader: SchemaLoaderService;

    private constructor(extensionPath: string) {
        this.schemaLoader = SchemaLoaderService.getInstance(extensionPath);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(extensionPath?: string): PanelRenderer {
        if (!PanelRenderer.instance) {
            if (!extensionPath) {
                throw new Error('Extension path required for first initialization');
            }
            PanelRenderer.instance = new PanelRenderer(extensionPath);
        }
        return PanelRenderer.instance;
    }

    /**
     * Initialize renderer
     */
    public async initialize(): Promise<void> {
        logger.info('PanelRenderer initialized');
    }

    /**
     * Render panel HTML
     */
    public async renderPanel(panelId: string, context: RenderContext = {}): Promise<string> {
        try {
            const panel = await this.schemaLoader.loadPanel(panelId);
            if (!panel) {
                throw new Error(`Panel not found: ${panelId}`);
            }

            return this.renderPanelFromSchema(panel, context);
        } catch (error) {
            logger.error('Failed to render panel', { panelId, error: String(error) });
            return this.renderError(`Failed to render panel: ${error}`);
        }
    }

    /**
     * Render panel from schema
     */
    private async renderPanelFromSchema(panel: PanelSchema, context: RenderContext): Promise<string> {
        const refClass = context.showComponentRef ? 'component-ref visible' : 'component-ref';
        let html = '';

        // Panel reference
        html += `<span class="${refClass}" style="position:fixed;top:4px;right:4px;" data-ref="PANEL-${panel.metadata.id.toUpperCase()}">${panel.metadata.name}</span>`;

        // Render header
        if (panel.spec.header) {
            html += this.renderHeader(panel.spec.header, context);
        }

        // Render body based on layout
        html += '<div class="body">';
        html += '<div id="panel-content">';
        
        const layoutType = typeof panel.spec.layout === 'string' ? panel.spec.layout : panel.spec.layout.type;
        switch (layoutType) {
            case 'tabs':
                html += await this.renderTabsLayout(panel, context);
                break;
            case 'split':
                html += await this.renderSplitLayout(panel, context);
                break;
            case 'grid':
                html += await this.renderGridLayout(panel, context);
                break;
            case 'stack':
                html += await this.renderStackLayout(panel, context);
                break;
            default:
                html += '<div>Unknown layout type</div>';
        }
        
        html += '</div>';
        html += '</div>';

        // Render footer
        if (panel.spec.footer) {
            html += this.renderFooter(panel.spec.footer, context);
        }

        return html;
    }

    /**
     * Render header
     */
    private renderHeader(header: any, _context: RenderContext): string {
        let html = '<div class="header">';
        
        if (header.title) {
            html += `<span class="header-title">${header.title}</span>`;
        }
        
        if (header.actions && header.actions.length > 0) {
            html += '<div class="header-actions">';
            header.actions.forEach((action: string) => {
                const icon = this.getActionIcon(action);
                html += `<button class="header-btn" onclick="executeAction('${action}')" title="${this.capitalize(action)}">`;
                html += `<span class="codicon codicon-${icon}"></span>`;
                html += '</button>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render footer
     */
    private renderFooter(footer: any, _context: RenderContext): string {
        let html = '<div class="footer">';
        
        if (footer.agentSelector) {
            html += '<select class="footer-select" id="agent-select" onchange="setActiveAgent(this.value)">';
            const agents = footer.agentSelector.options || ['orchestrator', 'architect', 'developer', 'reviewer', 'tester'];
            agents.forEach((agent: string) => {
                html += `<option value="${agent}">${this.capitalize(agent)}</option>`;
            });
            html += '</select>';
        }
        
        if (footer.actions && footer.actions.length > 0) {
            html += '<div class="footer-actions">';
            footer.actions.forEach((action: any) => {
                const icon = this.getActionIcon(action.id || action);
                const label = action.label || this.capitalize(action.id || action);
                const buttonClass = action.variant === 'success' ? 'footer-btn success' : 'footer-btn primary';
                
                html += `<button class="${buttonClass}" onclick="executeAction('${action.id || action}')">`;
                html += `<span class="codicon codicon-${icon}"></span>`;
                html += label;
                html += '</button>';
            });
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render tabs layout
     */
    private async renderTabsLayout(panel: PanelSchema, context: RenderContext): Promise<string> {
        if (!panel.spec.tabs || panel.spec.tabs.length === 0) {
            return '<div>No tabs defined</div>';
        }

        const refClass = context.showComponentRef ? 'component-ref visible' : 'component-ref';
        let html = '';

        // Render tabs row
        html += '<div class="tabs-row">';
        html += `<span class="${refClass}" style="position:absolute;top:-16px;left:4px;" data-ref="TAB-ROW">Tabs</span>`;
        
        for (let i = 0; i < panel.spec.tabs.length; i++) {
            const tabRef = panel.spec.tabs[i];
            const tab = await this.schemaLoader.loadTab(tabRef.tabRef);
            if (tab) {
                const activeClass = i === 0 ? 'active' : '';
                const icon = 'file'; // Icon from tab metadata or default
                html += `<span class="tab ${activeClass}" data-tab-id="${tab.metadata.id}" onclick="switchTab('${tab.metadata.id}')">`;
                html += `<span class="codicon codicon-${icon}"></span>`;
                html += tab.metadata.name;
                html += '</span>';
            }
        }
        html += '</div>';

        // Render first tab content
        const firstTabRef = panel.spec.tabs[0];
        const firstTab = await this.schemaLoader.loadTab(firstTabRef.tabRef);
        if (firstTab) {
            html += await this.renderTab(firstTab, context);
        }

        return html;
    }

    /**
     * Render tab
     */
    private async renderTab(tab: TabSchema, context: RenderContext): Promise<string> {
        const refClass = context.showComponentRef ? 'component-ref visible' : 'component-ref';
        let html = '';
        
        html += `<div class="tab-content" data-tab-id="${tab.metadata.id}">`;
        html += `<span class="${refClass}" style="top:0;left:100px;" data-ref="TAB-${tab.metadata.id.toUpperCase()}">${tab.metadata.name}</span>`;
        
        
        html += '</div>';
        return html;
    }

    /**
     * Render split layout
     */
    private async renderSplitLayout(panel: PanelSchema, context: RenderContext): Promise<string> {
        const splitSpec = panel.spec.layout as any;
        const orientation = splitSpec.orientation || 'horizontal';
        const panels = splitSpec.panels || [];
        
        if (panels.length === 0) {
            return this.renderError('Split layout requires at least one panel');
        }
        
        let html = `<div class="split-layout split-${orientation}">`;
        
        for (const panelRef of panels) {
            const size = panelRef.size || '50%';
            const tab = await this.schemaLoader.loadTab(panelRef.tabRef);
            
            if (tab) {
                html += `<div class="split-panel" style="${orientation === 'horizontal' ? 'width' : 'height'}: ${size};">`;
                html += await this.renderTab(tab, context);
                html += '</div>';
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render grid layout
     */
    private async renderGridLayout(panel: PanelSchema, context: RenderContext): Promise<string> {
        const gridSpec = panel.spec.layout as any;
        const columns = gridSpec.columns || 2;
        const rows = gridSpec.rows || 2;
        const gap = gridSpec.gap || '8px';
        const panels = gridSpec.panels || [];
        
        if (panels.length === 0) {
            return this.renderError('Grid layout requires at least one panel');
        }
        
        let html = `<div class="grid-layout" style="display: grid; grid-template-columns: repeat(${columns}, 1fr); grid-template-rows: repeat(${rows}, 1fr); gap: ${gap};">`;
        
        for (const panelRef of panels) {
            const tab = await this.schemaLoader.loadTab(panelRef.tabRef);
            const position = panelRef.position || { row: 1, col: 1 };
            
            if (tab) {
                html += `<div class="grid-panel" style="grid-row: ${position.row}; grid-column: ${position.col};">`;
                html += await this.renderTab(tab, context);
                html += '</div>';
            }
        }
        
        html += '</div>';
        return html;
    }

    /**
     * Render stack layout
     */
    private async renderStackLayout(panel: PanelSchema, context: RenderContext): Promise<string> {
        const stackSpec = panel.spec.layout as any;
        const panels = stackSpec.panels || [];
        
        if (panels.length === 0) {
            return this.renderError('Stack layout requires at least one panel');
        }
        
        let html = '<div class="stack-layout">';
        html += '<div class="stack-tabs">';
        
        // Render stack tabs
        panels.forEach((panelRef: any, index: number) => {
            const activeClass = index === 0 ? 'active' : '';
            html += `<button class="stack-tab ${activeClass}" onclick="switchStackPanel(${index})" data-stack-index="${index}">`;
            html += panelRef.label || `Panel ${index + 1}`;
            html += '</button>';
        });
        
        html += '</div>';
        html += '<div class="stack-content">';
        
        // Render all panels (hidden except first)
        for (let i = 0; i < panels.length; i++) {
            const panelRef = panels[i];
            const tab = await this.schemaLoader.loadTab(panelRef.tabRef);
            const visibleClass = i === 0 ? 'visible' : 'hidden';
            
            if (tab) {
                html += `<div class="stack-panel ${visibleClass}" data-stack-index="${i}">`;
                html += await this.renderTab(tab, context);
                html += '</div>';
            }
        }
        
        html += '</div>';
        html += '</div>';
        return html;
    }

    /**
     * Render error message
     */
    private renderError(message: string): string {
        return `
            <div class="error-state">
                <span class="codicon codicon-error"></span>
                <p>${message}</p>
            </div>
        `;
    }

    /**
     * Get icon for action
     */
    private getActionIcon(action: string): string {
        const iconMap: Record<string, string> = {
            'refresh': 'refresh',
            'export': 'export',
            'share': 'share',
            'settings': 'gear',
            'save': 'save',
            'run': 'play',
            'debug': 'debug',
            'help': 'question'
        };
        return iconMap[action] || 'circle-outline';
    }

    /**
     * Capitalize string
     */
    private capitalize(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
