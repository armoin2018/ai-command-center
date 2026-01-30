/**
 * Secondary Panel - Frontend Application
 * Pure client-side rendering with REST API data fetching
 */

class SecondaryPanelApp {
    constructor() {
        this.vscode = acquireVsCodeApi();
        this.currentPanelId = 'planning';
        this.panelData = {};
        this.activeStatuses = ['BACKLOG', 'READY', 'IN-PROGRESS', 'BLOCKED', 'REVIEW'];
        this.filterText = '';
        this.caseInsensitive = true;
        this.pendingChanges = 0;
        this.dirtyForms = new Set();
        this.expandedItems = new Set();
        this.showComponentRefs = false;
        this.filterDebounceTimer = null;
        
        this.statusColors = {
            'BACKLOG': '#eab308',
            'READY': '#f97316',
            'IN-PROGRESS': '#14b8a6',
            'BLOCKED': '#ff0000',
            'REVIEW': '#3b82f6',
            'DONE': '#22c55e',
            'SKIP': '#9ca3af',
            // Legacy status mapping for backwards compatibility
            'todo': '#eab308',
            'open': '#3b82f6',
            'done': '#22c55e',
            'in-progress': '#14b8a6',
            'ready': '#f97316',
            'error': '#ff0000',
            'hold': '#6b7280'
        };
        
        this.init();
    }
    
    /**
     * Initialize application
     */
    init() {
        this.setupEventListeners();
        this.setupMessageHandler();
        this.requestInitialData();
    }
    
    /**
     * Setup DOM event listeners
     */
    setupEventListeners() {
        // Header buttons
        document.getElementById('btn-settings')?.addEventListener('click', () => {
            this.sendMessage('executeAction', { command: 'workbench.action.openSettings', args: ['@ext:ai-command-center'] });
        });
        
        document.getElementById('btn-toggle-refs')?.addEventListener('click', () => {
            this.toggleComponentRefs();
        });
        
        document.getElementById('btn-debug')?.addEventListener('click', () => {
            this.sendMessage('executeAction', { command: 'workbench.action.toggleDevTools' });
        });
        
        document.getElementById('btn-help')?.addEventListener('click', () => {
            this.sendMessage('executeAction', { command: 'aicc.showHelp' });
        });
        
        document.getElementById('btn-refresh')?.addEventListener('click', () => {
            this.sendMessage('executeAction', { command: 'workbench.action.webview.reloadWebviewAction' });
        });
        
        // Footer buttons
        document.getElementById('agent-select')?.addEventListener('change', (e) => {
            this.sendMessage('changeAgent', { agentId: e.target.value });
        });
        
        document.getElementById('btn-save-all')?.addEventListener('click', () => {
            this.saveAllChanges();
        });
        
        document.getElementById('btn-run-next')?.addEventListener('click', () => {
            this.sendMessage('executeAction', { command: 'aicc.ailey.runNext' });
        });
    }
    
    /**
     * Setup message handler for backend communication
     */
    setupMessageHandler() {
        window.addEventListener('message', (event) => {
            const message = event.data;
            this.handleMessage(message);
        });
    }
    
    /**
     * Handle messages from backend
     */
    handleMessage(message) {
        switch (message.type) {
            case 'init':
                this.handleInit(message.payload);
                break;
            case 'panelChanged':
                this.handlePanelChanged(message.payload);
                break;
            case 'agentChanged':
                this.handleAgentChanged(message.payload);
                break;
            case 'mcpConfigUpdated':
                this.handleMcpConfigUpdated(message.payload);
                break;
            case 'intakeFormLoaded':
                this.renderIntakeForm(message.payload);
                break;
            case 'dataRefreshed':
                this.handleDataRefreshed(message.payload);
                break;
            case 'settingsUpdate':
                this.handleSettingsUpdate(message.payload);
                break;
            case 'error':
                this.showError(message.payload.message);
                break;
        }
    }
    
    /**
     * Request initial data
     */
    requestInitialData() {
        this.sendMessage('ready');
    }
    
    /**
     * Send message to backend
     */
    sendMessage(type, payload) {
        this.vscode.postMessage({ type, payload });
    }
    
    /**
     * Handle initial data
     */
    handleInit(payload) {
        this.panelData = payload;
        
        // Set version
        document.getElementById('app-version').textContent = `v${payload.version || '1.0.0'}`;
        
        // Initialize component references
        if (payload.showComponentReferences !== undefined) {
            this.showComponentRefs = payload.showComponentReferences;
            this.updateComponentRefVisibility();
        }
        
        // Store tabs and intakes
        this.availableTabs = payload.tabs || [];
        this.availableIntakes = payload.intakes || [];
        this.agentMode = payload.agentMode || 'all';
        
        // Render tabs (panels + dynamic tabs + intakes)
        this.renderAllTabs(payload.panels);
        
        // Render current panel
        this.renderCurrentPanel();
    }
    
    /**
     * Render all tabs including panels, dynamic tabs, and intakes
     */
    renderAllTabs(panels) {
        const container = document.getElementById('tabs-container');
        if (!container) return;
        
        // Keep component reference
        const refSpan = container.querySelector('#tabs-ref');
        container.innerHTML = '';
        if (refSpan) container.appendChild(refSpan);
        
        // Track rendered tab IDs to prevent duplicates
        const renderedTabIds = new Set();
        
        // Add panel tabs
        if (panels && panels.length > 0) {
            panels.forEach(panel => {
                if (!renderedTabIds.has(panel.id)) {
                    const tab = this.createTab(
                        panel.id,
                        panel.name,
                        panel.icon || 'file',
                        panel.id === this.currentPanelId
                    );
                    container.appendChild(tab);
                    renderedTabIds.add(panel.id);
                }
            });
        } else {
            // Default tabs
            const defaultTab = this.createTab('planning', 'Planning', 'layers', true);
            container.appendChild(defaultTab);
            renderedTabIds.add('planning');
            const apiTab = this.createTab('api-docs', 'API Docs', 'globe', false);
            container.appendChild(apiTab);
            renderedTabIds.add('api-docs');
        }
        
        // Add dynamic tabs from YAML (skip duplicates)
        if (this.availableTabs && this.availableTabs.length > 0) {
            this.availableTabs.forEach(tab => {
                if (!renderedTabIds.has(tab.id)) {
                    const tabElement = this.createTab(
                        tab.id,
                        tab.name,
                        tab.icon || 'file',
                        tab.id === this.currentPanelId
                    );
                    container.appendChild(tabElement);
                    renderedTabIds.add(tab.id);
                }
            });
        }
        
        // Add intakes tab if intakes are available
        if (this.availableIntakes && this.availableIntakes.length > 0) {
            if (!renderedTabIds.has('intakes')) {
                const intakesTab = this.createTab('intakes', 'Intakes', 'mail', false);
                container.appendChild(intakesTab);
                renderedTabIds.add('intakes');
            }
        }
    }
    
    /**
     * Render tabs (legacy method - kept for compatibility)
     */
    renderTabs(panels) {
        this.renderAllTabs(panels);
    }
    
    /**
     * Create tab element
     */
    createTab(id, name, icon, active) {
        const tab = document.createElement('span');
        tab.className = 'tab' + (active ? ' active' : '');
        tab.dataset.panelId = id;
        tab.addEventListener('click', () => this.handleTabClick(id));
        
        const iconSpan = document.createElement('span');
        iconSpan.className = `codicon codicon-${icon}`;
        tab.appendChild(iconSpan);
        
        tab.appendChild(document.createTextNode(name));
        return tab;
    }
    
    /**
     * Handle tab click - determines if tab is handled locally or by backend
     */
    handleTabClick(tabId) {
        // Frontend-only tabs (handled locally)
        const localTabs = ['intakes', 'component-catalog'];
        
        if (localTabs.includes(tabId)) {
            this.currentPanelId = tabId;
            this.updateActiveTabs();
            
            if (tabId === 'intakes') {
                this.renderIntakesPanel();
            } else if (tabId === 'component-catalog') {
                this.renderComponentCatalog();
            }
        } else {
            // Backend-managed panels
            this.switchPanel(tabId);
        }
    }
    
    /**
     * Switch panel (backend-managed)
     */
    switchPanel(panelId) {
        this.sendMessage('switchPanel', panelId);
    }
    
    /**
     * Handle panel changed
     */
    handlePanelChanged(panelConfig) {
        this.currentPanelId = panelConfig.panel.id;
        this.updateActiveTabs();
        this.renderPanel(panelConfig);
    }
    
    /**
     * Update active tabs
     */
    updateActiveTabs() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.panelId === this.currentPanelId);
        });
    }
    
    /**
     * Handle data refreshed
     */
    handleDataRefreshed(payload) {
        this.panelData.planDocument = payload.planDocument;
        this.panelData.statusCounts = payload.statusCounts;
        this.renderCurrentPanel();
    }
    
    /**
     * Handle settings update
     */
    handleSettingsUpdate(payload) {
        if (payload.showComponentReferences !== undefined) {
            this.showComponentRefs = payload.showComponentReferences;
            this.updateComponentRefVisibility();
            this.renderCurrentPanel();
        }
    }
    
    /**
     * Handle MCP config update
     */
    handleMcpConfigUpdated(payload) {
        this.panelData.mcpConfig = payload;
        if (this.currentPanelId === 'api-docs') {
            this.renderAPIDocs();
        }
    }
    
    /**
     * Handle agent changed
     */
    handleAgentChanged(payload) {
        this.agentMode = payload.agentMode;
        this.availableTabs = payload.tabs || [];
        this.availableIntakes = payload.intakes || [];
        
        // Re-render tabs with new agent-specific tabs and intakes
        this.renderAllTabs(this.panelData.panels);
        
        // If current panel is a frontend-only tab, re-render it
        if (this.currentPanelId === 'intakes') {
            this.renderIntakesPanel();
        } else if (this.currentPanelId === 'component-catalog') {
            this.renderComponentCatalog();
        }
    }
    
    /**
     * Render current panel
     */
    renderCurrentPanel() {
        if (this.currentPanelId === 'intakes') {
            this.renderIntakesPanel();
        } else if (this.currentPanelId === 'component-catalog') {
            this.renderComponentCatalog();
        } else if (this.panelData.currentPanel) {
            this.renderPanel(this.panelData.currentPanel);
        } else {
            this.renderPlanningPanel();
        }
    }
    
    /**
     * Render panel based on config
     */
    renderPanel(panelConfig) {
        const bodyElement = document.querySelector('.body');
        
        if (panelConfig.panel.id === 'planning') {
            bodyElement?.classList.remove('api-docs-active');
            this.renderPlanningPanel();
        } else if (panelConfig.panel.id === 'ai-kit-loader') {
            bodyElement?.classList.remove('api-docs-active');
            this.renderAIKitLoaderPanel();
        } else if (panelConfig.panel.id === 'api-docs') {
            bodyElement?.classList.add('api-docs-active');
            this.renderAPIDocs();
        } else {
            bodyElement?.classList.remove('api-docs-active');
            this.renderGenericPanel(panelConfig);
        }
    }
    
    /**
     * Render planning panel
     */
    renderPlanningPanel() {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        // TODO: Fetch data from REST endpoint /mcp/planning/items
        // For now use cached data
        const items = this.panelData.planDocument?.items || [];
        const statusCounts = this.panelData.statusCounts || {};
        
        // Build UI structure
        content.innerHTML = this.buildPlanningHTML(items, statusCounts);
        
        // Attach event listeners
        this.attachPlanningEventListeners();
    }
    
    /**
     * Get MCP Server URL from configuration
     */
    getMcpServerUrl() {
        const mcpConfig = this.panelData.mcpConfig || {};
        const transport = mcpConfig.transport || 'http';
        const host = mcpConfig.host || 'localhost';
        const port = mcpConfig.port || 3000;
        
        if (transport === 'stdio') {
            return null; // Cannot show Swagger for stdio transport
        }
        
        const protocol = transport === 'https' ? 'https' : 'http';
        return `${protocol}://${host}:${port}`;
    }
    
    /**
     * Render API Documentation panel with Swagger UI
     */
    renderAPIDocs() {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        const mcpUrl = this.getMcpServerUrl();
        
        if (!mcpUrl) {
            content.innerHTML = `
                <div class="api-docs-container">
                    <div class="empty-state">
                        <span class="codicon codicon-warning" style="font-size: 48px; color: #f97316;"></span>
                        <h2>MCP Server Not Available</h2>
                        <p>The MCP Server is running in stdio mode or is not enabled.</p>
                        <p>To view API documentation:</p>
                        <ol style="text-align: left; display: inline-block;">
                            <li>Open VS Code Settings</li>
                            <li>Search for "AICC MCP"</li>
                            <li>Set "Transport" to "http" or "https"</li>
                            <li>Set "Enabled" to true</li>
                            <li>Restart the extension</li>
                        </ol>
                        <button id="open-settings-btn" class="action-button">
                            <span class="codicon codicon-settings-gear"></span>
                            Open Settings
                        </button>
                    </div>
                </div>
            `;
            
            document.getElementById('open-settings-btn')?.addEventListener('click', () => {
                this.sendMessage('executeAction', { 
                    command: 'workbench.action.openSettings', 
                    args: ['@ext:ai-command-center mcp'] 
                });
            });
            return;
        }
        
        const apiDocsUrl = `${mcpUrl}/api-docs`;
        const openApiUrl = `${mcpUrl}/openapi.json`;
        
        content.innerHTML = `
            <div class="api-docs-container">
                <div class="api-docs-header">
                    <div class="api-docs-info">
                        <span class="codicon codicon-server"></span>
                        <span>MCP Server: <strong>${mcpUrl}</strong></span>
                    </div>
                    <div class="api-docs-actions">
                        <button id="open-external-btn" class="action-button" title="Open in browser">
                            <span class="codicon codicon-link-external"></span>
                            Open in Browser
                        </button>
                        <button id="copy-openapi-btn" class="action-button" title="Copy OpenAPI URL">
                            <span class="codicon codicon-copy"></span>
                            Copy OpenAPI URL
                        </button>
                        <button id="download-spec-btn" class="action-button" title="Download OpenAPI Spec">
                            <span class="codicon codicon-cloud-download"></span>
                            Download Spec
                        </button>
                    </div>
                </div>
                <div class="swagger-container">
                    <iframe 
                        id="swagger-iframe" 
                        src="${apiDocsUrl}" 
                        style="width: 100%; height: 100%; border: none;"
                        title="API Documentation">
                    </iframe>
                </div>
            </div>
        `;
        
        // Attach event listeners
        document.getElementById('open-external-btn')?.addEventListener('click', () => {
            this.sendMessage('executeAction', { 
                command: 'vscode.open', 
                args: [apiDocsUrl] 
            });
        });
        
        document.getElementById('copy-openapi-btn')?.addEventListener('click', () => {
            this.sendMessage('copyToClipboard', { text: openApiUrl });
        });
        
        document.getElementById('download-spec-btn')?.addEventListener('click', () => {
            this.sendMessage('downloadFile', { url: openApiUrl, filename: 'openapi.json' });
        });
    }
    
    /**
     * Render Component Catalog panel
     */
    renderComponentCatalog() {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        content.innerHTML = `
            <div class="component-catalog-container">
                <div class="catalog-header">
                    <h2>
                        <span class="codicon codicon-library"></span>
                        Component Catalog
                    </h2>
                    <p>Browse and search available UI components and templates</p>
                </div>
                
                <div class="catalog-content">
                    <div class="empty-state">
                        <span class="codicon codicon-search" style="font-size: 48px; color: var(--vscode-textLink-foreground);"></span>
                        <h3>Component Catalog</h3>
                        <p>The component catalog will display UI components, templates, and reusable code snippets.</p>
                        <p style="margin-top: 16px;">This feature is coming soon.</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Render Intakes panel with available intake forms
     */
    renderIntakesPanel() {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        if (!this.availableIntakes || this.availableIntakes.length === 0) {
            content.innerHTML = `
                <div class="intakes-container">
                    <div class="empty-state">
                        <span class="codicon codicon-note" style="font-size: 48px; color: var(--vscode-textLink-foreground);"></span>
                        <h2>No Intake Forms Available</h2>
                        <p>No intake forms are available for the current agent mode.</p>
                        <p>Intake forms should be placed in:</p>
                        <code>.github/aicc/intakes/</code>
                        <p style="margin-top: 16px;">File naming convention:</p>
                        <ul style="text-align: left; display: inline-block;">
                            <li><strong>All_*.intake.yaml</strong> - Available in all agent modes</li>
                            <li><strong>Agent_*.intake.yaml</strong> - Available only in agent mode</li>
                        </ul>
                    </div>
                </div>
            `;
            return;
        }
        
        content.innerHTML = `
            <div class="intakes-container">
                <div class="intakes-header">
                    <h2>
                        <span class="codicon codicon-note"></span>
                        Intake Forms
                    </h2>
                    <p>Select an intake form to fill out and submit</p>
                </div>
                
                <div class="intake-selector">
                    <label for="intake-select">Select Form:</label>
                    <select id="intake-select" class="intake-select-dropdown">
                        <option value="">-- Select an intake form --</option>
                        ${this.availableIntakes.map(intake => `
                            <option value="${intake.id}">${intake.displayName || intake.name}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div id="intake-form-container" class="intake-form-container" style="display: none;">
                    <!-- Form fields will be dynamically inserted here -->
                </div>
            </div>
        `;
        
        // Attach event listener for intake selection
        const intakeSelect = document.getElementById('intake-select');
        if (intakeSelect) {
            intakeSelect.addEventListener('change', (e) => {
                const intakeId = e.target.value;
                if (intakeId) {
                    this.loadIntakeForm(intakeId);
                } else {
                    document.getElementById('intake-form-container').style.display = 'none';
                }
            });
        }
    }
    
    /**
     * Load and render specific intake form
     */
    loadIntakeForm(intakeId) {
        const intake = this.availableIntakes.find(i => i.id === intakeId);
        if (!intake) return;
        
        // Request the full intake form configuration from backend
        this.sendMessage('loadIntakeForm', { intakeId });
    }
    
    /**
     * Render intake form fields
     */
    renderIntakeForm(intakeConfig) {
        const container = document.getElementById('intake-form-container');
        if (!container) return;
        
        const fields = intakeConfig.fields || [];
        
        container.innerHTML = `
            <form id="intake-form" class="intake-form">
                <h3>${intakeConfig.displayName || intakeConfig.name}</h3>
                ${intakeConfig.description ? `<p class="intake-description">${intakeConfig.description}</p>` : ''}
                
                <div class="form-fields">
                    ${fields.map(field => this.renderIntakeField(field)).join('')}
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="action-button primary">
                        <span class="codicon codicon-send"></span>
                        Submit
                    </button>
                    <button type="button" id="cancel-intake-btn" class="action-button">
                        <span class="codicon codicon-close"></span>
                        Cancel
                    </button>
                </div>
            </form>
        `;
        
        container.style.display = 'block';
        
        // Attach form submission handler
        const form = document.getElementById('intake-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitIntakeForm(intakeConfig);
            });
        }
        
        // Attach cancel handler
        document.getElementById('cancel-intake-btn')?.addEventListener('click', () => {
            container.style.display = 'none';
            document.getElementById('intake-select').value = '';
        });
    }
    
    /**
     * Render a single intake form field
     */
    renderIntakeField(field) {
        const fieldId = `intake-field-${field.id || field.name}`;
        const required = field.required ? 'required' : '';
        const requiredMark = field.required ? '<span class="required-mark">*</span>' : '';
        
        let fieldHTML = '';
        
        switch (field.type) {
            case 'text':
            case 'email':
            case 'url':
                fieldHTML = `
                    <input 
                        type="${field.type}" 
                        id="${fieldId}" 
                        name="${field.name}" 
                        placeholder="${field.placeholder || ''}"
                        ${required}
                        ${field.pattern ? `pattern="${field.pattern}"` : ''}
                    />
                `;
                break;
                
            case 'textarea':
                fieldHTML = `
                    <textarea 
                        id="${fieldId}" 
                        name="${field.name}" 
                        rows="${field.rows || 4}"
                        placeholder="${field.placeholder || ''}"
                        ${required}
                    ></textarea>
                `;
                break;
                
            case 'select':
                fieldHTML = `
                    <select id="${fieldId}" name="${field.name}" ${required}>
                        <option value="">-- Select --</option>
                        ${(field.options || []).map(opt => `
                            <option value="${opt.value || opt}">${opt.label || opt}</option>
                        `).join('')}
                    </select>
                `;
                break;
                
            case 'checkbox':
                fieldHTML = `
                    <div class="checkbox-field">
                        <input 
                            type="checkbox" 
                            id="${fieldId}" 
                            name="${field.name}" 
                            ${required}
                        />
                        <label for="${fieldId}">${field.label}${requiredMark}</label>
                    </div>
                `;
                return `<div class="form-field">${fieldHTML}</div>`;
                
            case 'radio':
                fieldHTML = `
                    <div class="radio-group">
                        ${(field.options || []).map((opt, idx) => `
                            <div class="radio-option">
                                <input 
                                    type="radio" 
                                    id="${fieldId}-${idx}" 
                                    name="${field.name}" 
                                    value="${opt.value || opt}"
                                    ${required && idx === 0 ? 'required' : ''}
                                />
                                <label for="${fieldId}-${idx}">${opt.label || opt}</label>
                            </div>
                        `).join('')}
                    </div>
                `;
                break;
                
            default:
                fieldHTML = `
                    <input 
                        type="text" 
                        id="${fieldId}" 
                        name="${field.name}" 
                        placeholder="${field.placeholder || ''}"
                        ${required}
                    />
                `;
        }
        
        if (field.type === 'checkbox') {
            return fieldHTML;
        }
        
        return `
            <div class="form-field">
                <label for="${fieldId}">
                    ${field.label}${requiredMark}
                </label>
                ${field.helpText ? `<p class="help-text">${field.helpText}</p>` : ''}
                ${fieldHTML}
                ${field.validation?.message ? `<p class="validation-message">${field.validation.message}</p>` : ''}
            </div>
        `;
    }
    
    /**
     * Submit intake form
     */
    submitIntakeForm(intakeConfig) {
        const form = document.getElementById('intake-form');
        if (!form) return;
        
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        // Collect form data
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Send to backend
        this.sendMessage('submitIntake', {
            intakeId: intakeConfig.id,
            data
        });
        
        // Clear form
        form.reset();
        document.getElementById('intake-form-container').style.display = 'none';
        document.getElementById('intake-select').value = '';
    }
    
    /**
     * Build planning HTML
     */
    buildPlanningHTML(items, statusCounts) {
        const refClass = this.showComponentRefs ? 'component-ref visible' : 'component-ref';
        
        let html = `
            <span class="${refClass}" style="top:0;left:100px;" data-ref="SEC-PLANNING-TAB">SEC-PLANNING-TAB</span>
            ${this.buildStatusBadges(statusCounts, refClass)}
            ${this.buildFilterBar()}
            ${this.buildAccordionList(items, refClass)}
        `;
        
        return html;
    }
    
    /**
     * Build status badges
     */
    buildStatusBadges(rawCounts, refClass) {
        const counts = {
            'BACKLOG': rawCounts['BACKLOG'] || rawCounts['backlog'] || 0,
            'READY': rawCounts['READY'] || rawCounts['ready'] || 0,
            'IN-PROGRESS': rawCounts['IN-PROGRESS'] || rawCounts['in-progress'] || 0,
            'BLOCKED': rawCounts['BLOCKED'] || rawCounts['blocked'] || 0,
            'REVIEW': rawCounts['REVIEW'] || rawCounts['review'] || 0,
            'DONE': rawCounts['DONE'] || rawCounts['done'] || 0
        };
        
        const badges = Object.entries(counts).map(([status, count]) => {
            const isActive = this.activeStatuses.includes(status);
            const color = this.statusColors[status];
            
            return `
                <div class="status-badge ${isActive ? 'active' : ''}" 
                     style="border-color:${color};" 
                     data-status="${status}"
                     title="${status}: ${count} item${count !== 1 ? 's' : ''}">
                    <div class="count" style="background-color:${color};" aria-label="${count}">${count}</div>
                    <div class="label" aria-label="${status}">${status}</div>
                </div>
            `;
        }).join('');
        
        // Calculate progress
        const totalItems = Object.values(counts).reduce((sum, count) => sum + count, 0);
        const completedItems = counts['DONE'];
        const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
        
        return `
            <div class="status-badges" style="position:relative;">
                <span class="${refClass}" style="top:-10px;right:0;" data-ref="SEC-STATUS-BADGES">SEC-STATUS-BADGES</span>
                ${badges}
            </div>
            <div class="progress-bar-container">
                <div class="progress-bar-wrapper">
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
                    </div>
                    <span class="progress-bar-text">${completedItems} / ${totalItems} (${progressPercent}%)</span>
                </div>
                <button class="progress-report-btn" id="btn-progress-report" title="View Progress Report">
                    <span class="codicon codicon-graph"></span>
                    Report
                </button>
            </div>
        `;
    }
    
    /**
     * Build filter bar
     */
    buildFilterBar() {
        return `
            <div class="filter-bar">
                <input type="text" 
                       class="filter-input" 
                       id="filter-input"
                       placeholder="Filter by ID, title, or description (regex)" 
                       value="${this.filterText}"
                       aria-label="Filter planning items">
                <button id="case-toggle" 
                        class="filter-toggle ${this.caseInsensitive ? 'active' : ''}" 
                        title="${this.caseInsensitive ? 'Case Insensitive (Active)' : 'Case Insensitive'}"
                        aria-label="Toggle case sensitivity">
                    <span class="codicon codicon-text-size" aria-hidden="true"></span>
                </button>
                <button id="btn-refresh" class="filter-toggle" title="Refresh" aria-label="Refresh planning data">
                    <span class="codicon codicon-refresh" aria-hidden="true"></span>
                </button>
            </div>
        `;
    }
    
    /**
     * Build accordion list
     */
    buildAccordionList(items, refClass) {
        // Filter items
        let filteredItems = items.filter(item => {
            return this.activeStatuses.includes(item.status);
        });
        
        // Apply text filter and track matched items
        const matchedItemIds = new Set();
        if (this.filterText) {
            const regex = new RegExp(this.filterText, this.caseInsensitive ? 'i' : '');
            filteredItems.forEach(item => {
                if (regex.test(item.id) || 
                    regex.test(item.projectNumber || '') || 
                    regex.test(item.summary) || 
                    regex.test(item.description || '')) {
                    matchedItemIds.add(item.id);
                    // Auto-expand parents of matched items
                    this.expandParents(item, items);
                }
            });
            filteredItems = filteredItems.filter(item => matchedItemIds.has(item.id));
        }
        
        // Get root items
        const rootItems = filteredItems.filter(item => item.type === 'epic' || !item.parent);
        
        if (rootItems.length === 0) {
            return `
                <div class="accordion-list">
                    <div style="text-align:center;padding:20px;color:var(--vscode-descriptionForeground);">
                        No items match current filters
                    </div>
                </div>
            `;
        }
        
        const itemsHTML = rootItems.map(item => this.buildAccordionItem(item, filteredItems, 0)).join('');
        
        return `
            <div class="accordion-list" style="position:relative;">
                <span class="${refClass}" style="top:0;right:0;" data-ref="SEC-ACCORDION-LIST">SEC-ACCORDION-LIST</span>
                ${itemsHTML}
            </div>
        `;
    }
    
    /**
     * Expand parents of a given item
     */
    expandParents(item, allItems) {
        if (!item.parentId) return;
        
        const parent = allItems.find(i => i.id === item.parentId);
        if (parent) {
            this.expandedItems.add(parent.id);
            this.expandParents(parent, allItems);
        }
    }
    
    /**
     * Build accordion item
     */
    buildAccordionItem(item, allItems, depth) {
        const isExpanded = this.expandedItems.has(item.id);
        const statusColor = this.statusColors[item.status] || this.statusColors[this.normalizeStatus(item.status)] || '#6b7280';
        const hasChildren = item.children && item.children.length > 0;
        
        return `
            <div class="accordion-item ${isExpanded ? 'expanded' : ''}" 
                 data-type="${item.type}" 
                 data-id="${item.id}">
                <div class="accordion-header" data-item-id="${item.id}">
                    ${depth > 0 ? `<span style="display:inline-block;width:${depth * 20}px;"></span>` : ''}
                    ${hasChildren ? `<span class="codicon codicon-chevron-right expand-icon" title="${isExpanded ? 'Collapse' : 'Expand'}" aria-label="${isExpanded ? 'Collapse item' : 'Expand item'}" aria-hidden="true"></span>` : '<span style="width:16px;display:inline-block;"></span>'}
                    <span class="status-bullet" style="background-color:${statusColor};" title="Status: ${item.status}" aria-label="Status: ${item.status}"></span>
                    <span class="codicon codicon-${this.getTypeIcon(item.type)} accordion-icon" title="${item.type}" aria-label="Type: ${item.type}" aria-hidden="true"></span>
                    <span class="accordion-title">
                        <span class="id" aria-label="ID: ${item.projectNumber || item.id}">${item.projectNumber || item.id}</span>
                        <span class="summary">${this.escapeHtml(item.summary)}</span>
                    </span>
                    ${this.getPriorityIcon(item.priority)}
                    ${this.buildAccordionActions(item, statusColor)}
                </div>
                <div class="accordion-content" id="content-${item.id}">
                    ${isExpanded ? this.buildAccordionContentTabs(item) : ''}
                    ${hasChildren && isExpanded ? this.buildChildrenList(item, allItems, depth) : ''}
                </div>
            </div>
        `;
    }
    
    /**
     * Build accordion content tabs
     */
    buildAccordionContentTabs(item) {
        return `
            <div class="accordion-tabs">
                <div class="accordion-tab-headers">
                    <button class="accordion-tab-btn active" data-tab="details" data-item-id="${item.id}" title="Details">
                        <span class="codicon codicon-file"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="edit" data-item-id="${item.id}" title="Edit">
                        <span class="codicon codicon-edit"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="info" data-item-id="${item.id}" title="Info">
                        <span class="codicon codicon-info"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="metadata" data-item-id="${item.id}" title="Metadata">
                        <span class="codicon codicon-tag"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="links" data-item-id="${item.id}" title="Links">
                        <span class="codicon codicon-link"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="repo" data-item-id="${item.id}" title="Repository">
                        <span class="codicon codicon-github"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="comments" data-item-id="${item.id}" title="Comments">
                        <span class="codicon codicon-comment"></span>
                    </button>
                </div>
                <div class="accordion-tab-content">
                    <div class="accordion-tab-panel active" data-tab="details" data-item-id="${item.id}">
                        <div class="item-description">${this.escapeHtml(item.description || 'No description')}</div>
                        ${item.acceptanceCriteria ? `
                            <div style="margin-top: 12px;">
                                <strong>Acceptance Criteria:</strong>
                                <div style="margin-top: 4px; padding: 8px; background-color: var(--vscode-editor-background); border-radius: 3px;">
                                    ${this.escapeHtml(item.acceptanceCriteria)}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="accordion-tab-panel" data-tab="edit" data-item-id="${item.id}">
                        ${this.buildEditTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="info" data-item-id="${item.id}">
                        ${this.buildInfoTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="metadata" data-item-id="${item.id}">
                        ${this.buildMetadataTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="links" data-item-id="${item.id}">
                        ${this.buildLinksTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="repo" data-item-id="${item.id}">
                        ${this.buildRepoTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="comments" data-item-id="${item.id}">
                        ${this.buildCommentsTab(item)}
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Build accordion actions
     */
    buildAccordionActions(item, statusColor) {
        const statuses = ['BACKLOG', 'READY', 'IN-PROGRESS', 'BLOCKED', 'REVIEW', 'DONE', 'SKIP'];
        const options = statuses.map(s => 
            `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`
        ).join('');
        
        return `
            <div class="accordion-actions" onclick="event.stopPropagation()">
                <select class="status-dropdown" 
                        style="border-color:${statusColor}" 
                        data-item-id="${item.id}"
                        aria-label="Change status for ${item.projectNumber || item.id}">
                    ${options}
                </select>
                <button class="accordion-btn" data-action="run" data-item-id="${item.id}" title="Run ${item.projectNumber || item.id}" aria-label="Run item">
                    <span class="codicon codicon-play" aria-hidden="true"></span>
                </button>
            </div>
        `;
    }
    
    /**
     * Build edit tab
     */
    buildEditTab(item) {
        return `
            <div class="tab-form">
                <div class="tab-form-group">
                    <label class="tab-form-label">Summary</label>
                    <input type="text" class="tab-form-input" id="edit-summary-${item.id}" value="${this.escapeHtml(item.summary || '')}" />
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Description</label>
                    <textarea class="tab-form-textarea" id="edit-description-${item.id}">${this.escapeHtml(item.description || '')}</textarea>
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Acceptance Criteria</label>
                    <textarea class="tab-form-textarea" id="edit-criteria-${item.id}">${this.escapeHtml(item.acceptanceCriteria || '')}</textarea>
                </div>
                <button class="tab-btn tab-btn-primary" onclick="app.saveEdit('${item.id}')">Save Changes</button>
            </div>
        `;
    }
    
    /**
     * Build info tab
     */
    buildInfoTab(item) {
        return `
            <div class="tab-form">
                <div class="tab-form-group">
                    <label class="tab-form-label">Created By</label>
                    <div class="tab-form-display">${this.escapeHtml(item.metadata?.createdBy || 'Unknown')}</div>
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Created Date</label>
                    <div class="tab-form-display">${item.metadata?.createdDate ? new Date(item.metadata.createdDate).toLocaleString() : 'Unknown'}</div>
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Updated By</label>
                    <div class="tab-form-display">${this.escapeHtml(item.metadata?.updatedBy || 'Unknown')}</div>
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Updated Date</label>
                    <div class="tab-form-display">${item.metadata?.updatedDate ? new Date(item.metadata.updatedDate).toLocaleString() : 'Unknown'}</div>
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Assigned To</label>
                    <input type="text" class="tab-form-input" id="info-assignedTo-${item.id}" value="${this.escapeHtml(item.assignedTo || '')}" />
                </div>
                <button class="tab-btn tab-btn-primary" onclick="app.saveAssignment('${item.id}')">Save Assignment</button>
            </div>
        `;
    }
    
    /**
     * Build metadata tab
     */
    buildMetadataTab(item) {
        const metadata = item.customMetadata || {};
        const entries = Object.entries(metadata);
        
        const metadataList = entries.length > 0 ? entries.map(([key, value]) => `
            <div class="tab-list-item">
                <div class="tab-list-item-content">
                    <strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(value)}
                </div>
                <button class="tab-icon-btn" onclick="app.deleteMetadata('${item.id}', '${this.escapeHtml(key)}')" title="Delete">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>
        `).join('') : '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No metadata defined.</p>';
        
        return `
            <div class="tab-form">
                <div style="margin-bottom: 16px;">${metadataList}</div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Add New Metadata</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" class="tab-form-input" id="metadata-key-${item.id}" placeholder="Key" style="flex: 1;" />
                        <input type="text" class="tab-form-input" id="metadata-value-${item.id}" placeholder="Value" style="flex: 2;" />
                    </div>
                </div>
                <button class="tab-btn tab-btn-primary" onclick="app.addMetadata('${item.id}')">Add Metadata</button>
            </div>
        `;
    }
    
    /**
     * Build links tab
     */
    buildLinksTab(item) {
        const relationships = item.linkedRelationships || [];
        
        const relationshipList = relationships.length > 0 ? relationships.map((rel, idx) => `
            <div class="tab-list-item">
                <div class="tab-list-item-content">
                    <strong>${this.escapeHtml(rel.type || 'related')}:</strong> ${this.escapeHtml(rel.itemId || rel.id)}
                </div>
                <button class="tab-icon-btn" onclick="app.deleteRelationship('${item.id}', ${idx})" title="Delete">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>
        `).join('') : '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No relationships defined.</p>';
        
        return `
            <div class="tab-form">
                <div style="margin-bottom: 16px;">${relationshipList}</div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Add Relationship</label>
                    <select class="tab-form-select" id="relationship-type-${item.id}" style="margin-bottom: 8px;">
                        <option value="depends-on">Depends On</option>
                        <option value="done-before">Done Before</option>
                        <option value="done-after">Done After</option>
                        <option value="blocks">Blocks</option>
                        <option value="blocked-by">Blocked By</option>
                        <option value="related">Related</option>
                        <option value="duplicates">Duplicates</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                    </select>
                    <input type="text" class="tab-form-input" id="relationship-target-${item.id}" placeholder="Target Item ID" />
                </div>
                <button class="tab-btn tab-btn-primary" onclick="app.addRelationship('${item.id}')">Add Relationship</button>
            </div>
        `;
    }
    
    /**
     * Build repo tab
     */
    buildRepoTab(item) {
        const repo = item.repository || {};
        const parentRepo = this.getParentRepository(item);
        const inheritedText = parentRepo ? ` (Inherited: ${parentRepo.url} / ${parentRepo.branch})` : '';
        
        return `
            <div class="tab-form">
                <div class="tab-form-group">
                    <label class="tab-form-label">Repository URL</label>
                    <input type="text" class="tab-form-input" id="repo-url-${item.id}" value="${this.escapeHtml(repo.url || '')}" placeholder="${parentRepo?.url || ''}" />
                    <small style="color: var(--vscode-descriptionForeground); font-size: 11px;">${inheritedText}</small>
                </div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Branch</label>
                    <input type="text" class="tab-form-input" id="repo-branch-${item.id}" value="${this.escapeHtml(repo.branch || '')}" placeholder="${parentRepo?.branch || 'main'}" />
                </div>
                <div class="tab-form-group">
                    <label style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                        <input type="checkbox" id="repo-inherit-${item.id}" ${!repo.url ? 'checked' : ''} /> Inherit from parent
                    </label>
                </div>
                <button class="tab-btn tab-btn-primary" onclick="app.saveRepository('${item.id}')">Save Repository</button>
            </div>
        `;
    }
    
    /**
     * Build comments tab
     */
    buildCommentsTab(item) {
        const comments = item.comments || [];
        
        const commentsList = comments.length > 0 ? comments.map((comment, idx) => `
            <div class="tab-list-item" style="flex-direction: column; align-items: flex-start; padding: 12px;">
                <div style="display: flex; width: 100%; justify-content: space-between; margin-bottom: 6px;">
                    <strong style="font-size: 12px;">${this.escapeHtml(comment.author || 'Unknown')}</strong>
                    <small style="color: var(--vscode-descriptionForeground); font-size: 11px;">${comment.date ? new Date(comment.date).toLocaleString() : ''}</small>
                </div>
                <div style="margin-bottom: 8px; font-size: 12px;">${this.escapeHtml(comment.text || '')}</div>
                <button class="tab-icon-btn" onclick="app.deleteComment('${item.id}', ${idx})" title="Delete" style="align-self: flex-end;">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>
        `).join('') : '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No comments yet.</p>';
        
        return `
            <div class="tab-form">
                <div style="margin-bottom: 16px; max-height: 250px; overflow-y: auto;">${commentsList}</div>
                <div class="tab-form-group">
                    <label class="tab-form-label">Add Comment</label>
                    <textarea class="tab-form-textarea" id="comment-text-${item.id}" placeholder="Write your comment here..."></textarea>
                </div>
                <button class="tab-btn tab-btn-primary" onclick="app.addComment('${item.id}')">Add Comment</button>
            </div>
        `;
    }
    
    /**
     * Build children list
     */
    buildChildrenList(item, allItems, depth) {
        const childrenHTML = item.children.map(childId => {
            const child = allItems.find(i => i.id === childId);
            return child ? this.buildAccordionItem(child, allItems, depth + 1) : '';
        }).join('');
        
        return `<div class="children-list">${childrenHTML}</div>`;
    }
    
    /**
     * Attach planning event listeners
     */
    attachPlanningEventListeners() {
        // Status badges
        document.querySelectorAll('.status-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                this.toggleStatus(badge.dataset.status);
            });
        });
        
        // Progress report button
        document.getElementById('btn-progress-report')?.addEventListener('click', () => {
            this.sendMessage('showProgressReport');
        });
        
        // Filter input - debounced to prevent losing focus
        document.getElementById('filter-input')?.addEventListener('input', (e) => {
            this.filterText = e.target.value;
            if (this.filterDebounceTimer) {
                clearTimeout(this.filterDebounceTimer);
            }
            this.filterDebounceTimer = setTimeout(() => {
                this.renderCurrentPanel();
            }, 300);
        });
        
        // Case toggle
        document.getElementById('case-toggle')?.addEventListener('click', () => {
            this.caseInsensitive = !this.caseInsensitive;
            this.renderCurrentPanel();
        });
        
        // Refresh button (clear filter)
        document.getElementById('btn-refresh')?.addEventListener('click', () => {
            this.filterText = '';
            const filterInput = document.getElementById('filter-input');
            if (filterInput) filterInput.value = '';
            this.renderCurrentPanel();
        });
        
        // Accordion headers
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                this.toggleExpand(header.dataset.itemId);
            });
        });
        
        // Status dropdowns
        document.querySelectorAll('.status-dropdown').forEach(select => {
            select.addEventListener('click', (e) => e.stopPropagation());
            select.addEventListener('change', (e) => {
                this.updateStatus(e.target.dataset.itemId, e.target.value);
            });
        });
        
        // Action buttons
        document.querySelectorAll('.accordion-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleItemAction(btn.dataset.action, btn.dataset.itemId);
            });
        });
        
        // Tab buttons
        document.querySelectorAll('.accordion-tab-btn').forEach(tabBtn => {
            tabBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchTab(tabBtn.dataset.itemId, tabBtn.dataset.tab);
            });
        });
        
        // Form input change tracking
        this.attachFormChangeListeners();
    }
    
    /**
     * Toggle status filter
     */
    toggleStatus(status) {
        const idx = this.activeStatuses.indexOf(status);
        if (idx >= 0) {
            this.activeStatuses.splice(idx, 1);
        } else {
            this.activeStatuses.push(status);
        }
        this.renderCurrentPanel();
    }
    
    /**
     * Toggle expand item
     */
    toggleExpand(itemId) {
        if (this.expandedItems.has(itemId)) {
            this.expandedItems.delete(itemId);
        } else {
            this.expandedItems.add(itemId);
        }
        this.renderCurrentPanel();
    }
    
    /**
     * Attach form change listeners to track unsaved changes
     */
    attachFormChangeListeners() {
        // Listen to all form inputs, textareas, and selects
        document.querySelectorAll('.tab-form-input, .tab-form-textarea, .tab-form-select').forEach(input => {
            const eventType = input.type === 'checkbox' ? 'change' : 'input';
            input.addEventListener(eventType, (e) => {
                const itemId = this.extractItemIdFromInputId(e.target.id);
                if (itemId && !this.dirtyForms.has(itemId)) {
                    this.dirtyForms.add(itemId);
                    this.pendingChanges++;
                    this.updateChangesCount();
                }
            });
        });
    }
    
    /**
     * Extract item ID from input element ID
     */
    extractItemIdFromInputId(inputId) {
        // Input IDs follow pattern: "edit-summary-{itemId}", "metadata-key-{itemId}", etc.
        const match = inputId.match(/-([\w-]+)$/);
        return match ? match[1] : null;
    }
    
    /**
     * Update status
     */
    updateStatus(itemId, status) {
        this.sendMessage('updateStatus', { itemId, status });
        this.pendingChanges++;
        this.updateChangesCount();
    }
    
    /**
     * Handle item action
     */
    handleItemAction(action, itemId) {
        // Expand the item if not already expanded
        if (!this.expandedItems.has(itemId)) {
            this.expandedItems.add(itemId);
            this.renderCurrentPanel();
        }
        
        // Switch to the appropriate tab
        setTimeout(() => {
            const tabMap = {
                'edit': 'edit',
                'info': 'info',
                'metadata': 'metadata',
                'connections': 'links',
                'repo': 'repo',
                'comments': 'comments'
            };
            
            const tabName = tabMap[action];
            if (tabName) {
                this.switchTab(itemId, tabName);
            } else if (action === 'run') {
                this.sendMessage('runItem', { itemId });
            }
        }, 100);
    }
    
    /**
     * Switch accordion tab
     */
    switchTab(itemId, tabName) {
        // Deactivate all tabs and panels for this item
        document.querySelectorAll(`[data-item-id="${itemId}"].accordion-tab-btn`).forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll(`[data-item-id="${itemId}"].accordion-tab-panel`).forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Activate the selected tab
        const tabBtn = document.querySelector(`[data-item-id="${itemId}"][data-tab="${tabName}"].accordion-tab-btn`);
        const tabPanel = document.querySelector(`[data-item-id="${itemId}"][data-tab="${tabName}"].accordion-tab-panel`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (tabPanel) tabPanel.classList.add('active');
    }
    
    /**
     * Show edit modal
     */
    showEditModal(item) {
        const modalBody = `
            <div class="modal-form-group">
                <label class="modal-form-label">Summary</label>
                <input type="text" class="modal-form-input" id="edit-summary" value="${this.escapeHtml(item.summary || '')}" />
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Description</label>
                <textarea class="modal-form-textarea" id="edit-description">${this.escapeHtml(item.description || '')}</textarea>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Acceptance Criteria</label>
                <textarea class="modal-form-textarea" id="edit-criteria">${this.escapeHtml(item.acceptanceCriteria || '')}</textarea>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary" onclick="app.saveEdit('${item.id}')">Save</button>
            </div>
        `;
        this.showModal(`Edit ${item.projectNumber || item.id}`, modalBody);
    }
    
    /**
     * Save edit changes
     */
    saveEdit(itemId) {
        const summary = document.getElementById(`edit-summary-${itemId}`)?.value;
        const description = document.getElementById(`edit-description-${itemId}`)?.value;
        const acceptanceCriteria = document.getElementById(`edit-criteria-${itemId}`)?.value;
        
        this.sendMessage('updateItem', {
            itemId,
            updates: { summary, description, acceptanceCriteria }
        });
        
        // Remove from dirty forms if it was there (already tracked in pendingChanges)
        // Don't increment again if already dirty
        if (!this.dirtyForms.has(itemId)) {
            this.pendingChanges++;
        } else {
            this.dirtyForms.delete(itemId);
        }
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Show info modal
     */
    showInfoModal(item) {
        const modalBody = `
            <div class="modal-form-group">
                <label class="modal-form-label">Created By</label>
                <div class="modal-form-input" style="background-color: var(--vscode-editor-background);">
                    ${this.escapeHtml(item.metadata?.createdBy || 'Unknown')}
                </div>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Created Date</label>
                <div class="modal-form-input" style="background-color: var(--vscode-editor-background);">
                    ${item.metadata?.createdDate ? new Date(item.metadata.createdDate).toLocaleString() : 'Unknown'}
                </div>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Updated By</label>
                <div class="modal-form-input" style="background-color: var(--vscode-editor-background);">
                    ${this.escapeHtml(item.metadata?.updatedBy || 'Unknown')}
                </div>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Updated Date</label>
                <div class="modal-form-input" style="background-color: var(--vscode-editor-background);">
                    ${item.metadata?.updatedDate ? new Date(item.metadata.updatedDate).toLocaleString() : 'Unknown'}
                </div>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Assigned To</label>
                <input type="text" class="modal-form-input" id="info-assignedTo" value="${this.escapeHtml(item.assignedTo || '')}" />
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary" onclick="app.saveAssignment('${item.id}')">Save Assignment</button>
            </div>
        `;
        this.showModal(`Info: ${item.projectNumber || item.id}`, modalBody);
    }
    
    /**
     * Save assignment
     */
    saveAssignment(itemId) {
        const assignedTo = document.getElementById(`info-assignedTo-${itemId}`)?.value;
        
        this.sendMessage('updateItem', {
            itemId,
            updates: { assignedTo }
        });
        
        // Remove from dirty forms if it was there (already tracked in pendingChanges)
        if (!this.dirtyForms.has(itemId)) {
            this.pendingChanges++;
        } else {
            this.dirtyForms.delete(itemId);
        }
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Show metadata modal (key-value pairs)
     */
    showMetadataModal(item) {
        const metadata = item.customMetadata || {};
        const entries = Object.entries(metadata);
        
        const metadataList = entries.length > 0 ? entries.map(([key, value]) => `
            <div class="modal-list-item">
                <div class="modal-list-item-content">
                    <strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(value)}
                </div>
                <div class="modal-list-item-actions">
                    <button class="modal-icon-btn" onclick="app.deleteMetadata('${item.id}', '${this.escapeHtml(key)}')" title="Delete">
                        <span class="codicon codicon-trash"></span>
                    </button>
                </div>
            </div>
        `).join('') : '<p style="color: var(--vscode-descriptionForeground);">No metadata defined. Add key-value pairs below.</p>';
        
        const modalBody = `
            <div style="margin-bottom: 16px;">
                ${metadataList}
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Add New Metadata</label>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" class="modal-form-input" id="metadata-key" placeholder="Key" style="flex: 1;" />
                    <input type="text" class="modal-form-input" id="metadata-value" placeholder="Value" style="flex: 2;" />
                </div>
                <label style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                    <input type="checkbox" id="metadata-inherit" /> Inherit from parent
                </label>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Close</button>
                <button class="modal-btn modal-btn-primary" onclick="app.addMetadata('${item.id}')">Add Metadata</button>
            </div>
        `;
        this.showModal(`Metadata: ${item.projectNumber || item.id}`, modalBody);
    }
    
    /**
     * Add metadata
     */
    addMetadata(itemId) {
        const key = document.getElementById(`metadata-key-${itemId}`)?.value.trim();
        const value = document.getElementById(`metadata-value-${itemId}`)?.value.trim();
        
        if (!key || !value) {
            alert('Please provide both key and value');
            return;
        }
        
        this.sendMessage('addMetadata', { itemId, key, value });
        this.pendingChanges++;
        this.updateChangesCount();
        
        // Clear inputs and refresh
        document.getElementById(`metadata-key-${itemId}`).value = '';
        document.getElementById(`metadata-value-${itemId}`).value = '';
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Delete metadata
     */
    deleteMetadata(itemId, key) {
        this.sendMessage('deleteMetadata', { itemId, key });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Show connections modal (relationships)
     */
    showConnectionsModal(item) {
        const relationships = item.linkedRelationships || [];
        
        const relationshipList = relationships.length > 0 ? relationships.map((rel, idx) => `
            <div class="modal-list-item">
                <div class="modal-list-item-content">
                    <strong>${this.escapeHtml(rel.type || 'related')}:</strong> ${this.escapeHtml(rel.itemId || rel.id)}
                </div>
                <div class="modal-list-item-actions">
                    <button class="modal-icon-btn" onclick="app.deleteRelationship('${item.id}', ${idx})" title="Delete">
                        <span class="codicon codicon-trash"></span>
                    </button>
                </div>
            </div>
        `).join('') : '<p style="color: var(--vscode-descriptionForeground);">No relationships defined.</p>';
        
        const modalBody = `
            <div style="margin-bottom: 16px;">
                ${relationshipList}
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Add New Relationship</label>
                <select class="modal-form-select" id="relationship-type" style="margin-bottom: 8px;">
                    <option value="depends-on">Depends On</option>
                    <option value="done-before">Done Before</option>
                    <option value="done-after">Done After</option>
                    <option value="blocks">Blocks</option>
                    <option value="blocked-by">Blocked By</option>
                    <option value="related">Related</option>
                    <option value="duplicates">Duplicates</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                </select>
                <input type="text" class="modal-form-input" id="relationship-target" placeholder="Target Item ID" />
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Close</button>
                <button class="modal-btn modal-btn-primary" onclick="app.addRelationship('${item.id}')">Add Relationship</button>
            </div>
        `;
        this.showModal(`Relationships: ${item.projectNumber || item.id}`, modalBody);
    }
    
    /**
     * Add relationship
     */
    addRelationship(itemId) {
        const type = document.getElementById(`relationship-type-${itemId}`)?.value;
        const targetId = document.getElementById(`relationship-target-${itemId}`)?.value.trim();
        
        if (!targetId) {
            alert('Please provide target item ID');
            return;
        }
        
        this.sendMessage('addRelationship', { itemId, type, targetId });
        this.pendingChanges++;
        this.updateChangesCount();
        
        // Clear input and refresh
        document.getElementById(`relationship-target-${itemId}`).value = '';
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Delete relationship
     */
    deleteRelationship(itemId, index) {
        this.sendMessage('deleteRelationship', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Show repository modal
     */
    showRepoModal(item) {
        const repo = item.repository || {};
        const parentRepo = this.getParentRepository(item);
        const inheritedText = parentRepo ? ` (Inherited: ${parentRepo.url} / ${parentRepo.branch})` : '';
        
        const modalBody = `
            <div class="modal-form-group">
                <label class="modal-form-label">Repository URL</label>
                <input type="text" class="modal-form-input" id="repo-url" value="${this.escapeHtml(repo.url || '')}" placeholder="${parentRepo?.url || ''}" />
                <small style="color: var(--vscode-descriptionForeground);">${inheritedText}</small>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Branch</label>
                <input type="text" class="modal-form-input" id="repo-branch" value="${this.escapeHtml(repo.branch || '')}" placeholder="${parentRepo?.branch || 'main'}" />
            </div>
            <div class="modal-form-group">
                <label style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                    <input type="checkbox" id="repo-inherit" ${!repo.url ? 'checked' : ''} /> Inherit from parent
                </label>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary" onclick="app.saveRepository('${item.id}')">Save</button>
            </div>
        `;
        this.showModal(`Repository: ${item.projectNumber || item.id}`, modalBody);
    }
    
    /**
     * Get parent repository
     */
    getParentRepository(item) {
        if (!item.parentId) return null;
        
        const items = this.panelData.planDocument?.items || [];
        const parent = items.find(i => i.id === item.parentId);
        
        if (parent?.repository) {
            return parent.repository;
        }
        
        // Recursively check parent's parent
        return parent ? this.getParentRepository(parent) : null;
    }
    
    /**
     * Save repository
     */
    saveRepository(itemId) {
        const inherit = document.getElementById(`repo-inherit-${itemId}`)?.checked;
        const url = inherit ? null : document.getElementById(`repo-url-${itemId}`)?.value.trim();
        const branch = inherit ? null : document.getElementById(`repo-branch-${itemId}`)?.value.trim();
        
        this.sendMessage('updateItem', {
            itemId,
            updates: { repository: inherit ? null : { url, branch } }
        });
        
        // Remove from dirty forms if it was there (already tracked in pendingChanges)
        if (!this.dirtyForms.has(itemId)) {
            this.pendingChanges++;
        } else {
            this.dirtyForms.delete(itemId);
        }
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Show comments modal
     */
    showCommentsModal(item) {
        const comments = item.comments || [];
        
        const commentsList = comments.length > 0 ? comments.map((comment, idx) => `
            <div class="modal-list-item" style="flex-direction: column; align-items: flex-start;">
                <div style="display: flex; width: 100%; justify-content: space-between; margin-bottom: 4px;">
                    <strong>${this.escapeHtml(comment.author || 'Unknown')}</strong>
                    <small style="color: var(--vscode-descriptionForeground);">${comment.date ? new Date(comment.date).toLocaleString() : ''}</small>
                </div>
                <div style="margin-bottom: 8px;">${this.escapeHtml(comment.text || '')}</div>
                <div class="modal-list-item-actions">
                    <button class="modal-icon-btn" onclick="app.deleteComment('${item.id}', ${idx})" title="Delete">
                        <span class="codicon codicon-trash"></span>
                    </button>
                </div>
            </div>
        `).join('') : '<p style="color: var(--vscode-descriptionForeground);">No comments yet.</p>';
        
        const modalBody = `
            <div style="margin-bottom: 16px; max-height: 300px; overflow-y: auto;">
                ${commentsList}
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Add Comment</label>
                <textarea class="modal-form-textarea" id="comment-text" placeholder="Write your comment here..."></textarea>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Close</button>
                <button class="modal-btn modal-btn-primary" onclick="app.addComment('${item.id}')">Add Comment</button>
            </div>
        `;
        this.showModal(`Comments: ${item.projectNumber || item.id}`, modalBody);
    }
    
    /**
     * Add comment
     */
    addComment(itemId) {
        const text = document.getElementById(`comment-text-${itemId}`)?.value.trim();
        
        if (!text) {
            alert('Please enter a comment');
            return;
        }
        
        this.sendMessage('addComment', {
            itemId,
            comment: {
                text,
                author: 'Current User', // TODO: Get from vscode context
                date: new Date().toISOString()
            }
        });
        
        this.pendingChanges++;
        this.updateChangesCount();
        
        // Clear input and refresh
        document.getElementById(`comment-text-${itemId}`).value = '';
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Delete comment
     */
    deleteComment(itemId, index) {
        this.sendMessage('deleteComment', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Show modal
     */
    showModal(title, bodyHTML) {
        const overlay = document.getElementById('modal-overlay');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!overlay || !modalTitle || !modalBody) return;
        
        modalTitle.textContent = title;
        modalBody.innerHTML = bodyHTML;
        overlay.style.display = 'flex';
        
        // Close on overlay click
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                this.closeModal();
            }
        };
        
        // Setup close button
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
    }
    
    /**
     * Close modal
     */
    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
    
    /**
     * Render AI Kit Loader panel
     */
    renderAIKitLoaderPanel() {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        const refClass = this.showComponentRefs ? 'component-ref visible' : 'component-ref';
        
        content.innerHTML = `
            <span class="${refClass}" style="top:0;left:100px;" data-ref="SEC-AIKIT-TAB">SEC-AIKIT-TAB</span>
            <h3>AI Kit Loader</h3>
            <p>Select a repository and branch to add AI kits to your project.</p>
            <div class="form-group">
                <label>AI Kit Repository</label>
                <select class="form-control" id="aikit-repo">
                    <option value="armoin2018/ai-ley">AI-ley Official (armoin2018/ai-ley)</option>
                </select>
            </div>
            <div class="form-group">
                <label>Branch</label>
                <select class="form-control" id="aikit-branch">
                    <option value="dev">dev</option>
                    <option value="main">main</option>
                </select>
            </div>
            <button class="footer-btn primary" id="btn-load-kits">
                <span class="codicon codicon-cloud-download"></span> Load Kits
            </button>
        `;
        
        document.getElementById('btn-load-kits')?.addEventListener('click', () => {
            this.sendMessage('loadAIKits');
        });
    }
    
    /**
     * Render generic panel
     */
    renderGenericPanel(panelConfig) {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        content.innerHTML = `<p>Panel: ${panelConfig.panel.name}</p>`;
    }
    
    /**
     * Save all changes
     */
    saveAllChanges() {
        this.sendMessage('saveAllChanges');
        this.pendingChanges = 0;
        this.dirtyForms.clear();
        this.updateChangesCount();
    }
    
    /**
     * Update changes count
     */
    updateChangesCount() {
        const el = document.getElementById('changes-count');
        if (el) el.textContent = this.pendingChanges;
    }
    
    /**
     * Toggle component references
     */
    toggleComponentRefs() {
        this.showComponentRefs = !this.showComponentRefs;
        this.updateComponentRefVisibility();
    }
    
    /**
     * Update component reference visibility
     */
    updateComponentRefVisibility() {
        document.querySelectorAll('.component-ref').forEach(el => {
            el.classList.toggle('visible', this.showComponentRefs);
        });
        
        const btn = document.getElementById('btn-toggle-refs');
        if (btn) {
            btn.style.backgroundColor = this.showComponentRefs ? 'rgba(255, 193, 7, 0.3)' : '';
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        console.error('Error:', message);
        // TODO: Show toast notification
    }
    
    /**
     * Utility: Get type icon
     */
    getTypeIcon(type) {
        const icons = {
            'epic': 'layers',
            'story': 'bookmark',
            'task': 'circle-outline',
            'bug': 'bug'
        };
        return icons[type] || 'file';
    }
    
    /**
     * Utility: Get priority icon
     */
    getPriorityIcon(priority) {
        const p = (priority || 'medium').toLowerCase();
        const icons = {
            'critical': `<span class="codicon codicon-flame" style="color:#ef4444;" title="Priority: Critical" aria-label="Critical priority" aria-hidden="true"></span>`,
            'high': `<span class="codicon codicon-arrow-up" style="color:#f97316;" title="Priority: High" aria-label="High priority" aria-hidden="true"></span>`,
            'medium': `<span class="codicon codicon-dash" style="color:#6b7280;" title="Priority: Medium" aria-label="Medium priority" aria-hidden="true"></span>`,
            'low': `<span class="codicon codicon-arrow-down" style="color:#22c55e;" title="Priority: Low" aria-label="Low priority" aria-hidden="true"></span>`
        };
        return icons[p] || '';
    }
    
    /**
     * Utility: Normalize status (deprecated - now using uppercase directly)
     */
    normalizeStatus(status) {
        // Legacy support - convert old lowercase to uppercase
        const map = {
            'backlog': 'BACKLOG',
            'todo': 'BACKLOG',
            'not-started': 'BACKLOG',
            'ready': 'READY',
            'in-progress': 'IN-PROGRESS',
            'blocked': 'BLOCKED',
            'error': 'BLOCKED',
            'review': 'REVIEW',
            'done': 'DONE',
            'hold': 'BLOCKED',
            'skip': 'SKIP'
        };
        return map[status?.toLowerCase()] || status || 'BACKLOG';
    }
    
    /**
     * Utility: Escape HTML
     */
    escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}

// Initialize app when DOM ready and make it globally accessible
let app;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app = new SecondaryPanelApp();
    });
} else {
    app = new SecondaryPanelApp();
}
