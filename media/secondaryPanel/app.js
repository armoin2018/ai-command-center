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
        this.selectedItemIds = new Set();
        
        // Scheduler state (AICC-0219) — loaded from .my/aicc/tasks.json via backend
        this.schedulerTasks = [];
        this.schedulerCountdownInterval = null;
        this.schedulerLoaded = false;
        
        // Jira config state (AICC-0081)
        this.jiraConfig = {
            baseUrl: '', email: '', apiToken: '', projectKey: '',
            syncStrategy: 'pull', conflictResolution: 'remote-wins',
            autoSync: false, syncInterval: 30,
            issueTypeFilters: { epic: true, story: true, task: true, bug: true },
            statusFilter: [],
            assigneeFilter: '', sprintFilter: '', labelsFilter: [],
            dateRange: '', jql: ''
        };
        this.jiraConnectionStatus = 'disconnected';
        this.jiraLastSyncTime = null;
        this.jiraSyncErrors = [];

        // MCP Servers state (AICC-0085)
        this.mcpStatus = {
            isRunning: false, port: undefined, host: 'localhost', transport: 'stdio',
            pid: null, role: 'standalone', isLeader: false,
            connectedWorkspaces: 0, startedAt: null,
            connectionState: 'disconnected', connectionAttempts: 0,
            lastTransition: null, uptime: 0,
        };
        this.mcpInventory = { workspaces: [], leader: null };
        this.mcpAutoRefreshInterval = null;
        this.mcpAutoRefreshEnabled = true;
        
        // Developer mode state (AICC-0502 / AICC-0505)
        this.devModeEnabled = false; // default to hiding dev tabs
        // Jira config panel open state in planning tab (AICC-0508)
        this.jiraConfigExpanded = false;
        
        // Ideation state (REQ-IDEA-080+)
        this.ideationData = { version: '1.0.0', ideas: [] };
        this.ideationPage = 1;
        this.ideationPageSize = 10;
        this.ideationSortBy = 'newest'; // 'newest' | 'oldest' | 'highest-rated' | 'lowest-rated' | 'watched' | 'mine'
        this.ideationFilterText = '';
        this.ideationFilterTags = []; // multi-select tag filter
        this.ideationCollapsedTags = new Set();
        this.ideationCurrentUser = 'local-user'; // placeholder for user identity
        
        // Jira sync config is now unified in this.jiraConfig (no separate jiraSyncConfig)
        
        // Ideation Jira config for .my/aicc/ideation.json (REQ-IDEA-092)
        this.ideationJiraConfig = {
            enabled: false,
            projectKey: '',
            issueType: 'Task',
            syncEnabled: false,
            syncIntervalMinutes: 30,
            statusMapping: {}
        };
        this.ideationJiraExpanded = false;
        
        // MCP port dashboard state (REQ-MPD-001+)
        this.mcpPortScanData = [];
        
        // Status colours provided by shared actions library (window.AICC.actions)
        this.statusColors = window.AICC?.actions?.getLookup('statusColors') || {};
        
        this.init();
    }
    
    /**
     * Initialize application
     */
    init() {
        console.log('[AIKIT] Initializing SecondaryPanelApp');
        this.setupEventListeners();
        this.setupMessageHandler();
        this.setupModalHandlers();
        this.initKeyboardNavigation();
        this.initLiveRegion();
        this.requestInitialData();
    }
    
    /**
     * AICC-0249: Keyboard navigation for all interactive elements
     */
    initKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            const target = e.target;

            // Tab bar keyboard nav (arrow keys)
            if (target.closest('.tabs-container, .tab-bar')) {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.navigateTab(e.key === 'ArrowRight' ? 1 : -1);
                }
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                const modal = document.querySelector('#modal-overlay[style*="flex"], .modal-overlay.show');
                if (modal) {
                    this.closeModal();
                    this.announce('Dialog closed');
                }
            }

            // Enter/Space on accordion headers
            if ((e.key === 'Enter' || e.key === ' ') && target.classList.contains('jira-accordion-header')) {
                e.preventDefault();
                target.click();
            }

            // Table row navigation with arrow keys
            if (target.closest('tr[tabindex]')) {
                const rows = Array.from(target.closest('table, [role="grid"]')?.querySelectorAll('tr[tabindex]') || []);
                const idx = rows.indexOf(target.closest('tr[tabindex]'));
                if (e.key === 'ArrowDown' && idx < rows.length - 1) {
                    e.preventDefault();
                    rows[idx + 1].focus();
                } else if (e.key === 'ArrowUp' && idx > 0) {
                    e.preventDefault();
                    rows[idx - 1].focus();
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    rows[0]?.focus();
                } else if (e.key === 'End') {
                    e.preventDefault();
                    rows[rows.length - 1]?.focus();
                }
            }
        });
    }

    /**
     * AICC-0249: Navigate between tabs using keyboard
     */
    navigateTab(direction) {
        const tabs = Array.from(document.querySelectorAll('.tabs-container .tab, .tab-bar [role="tab"]'));
        if (tabs.length === 0) return;
        const current = tabs.findIndex(t => t.classList.contains('active') || t.getAttribute('aria-selected') === 'true');
        const next = Math.max(0, Math.min(tabs.length - 1, current + direction));
        if (tabs[next].dataset.panelId) {
            this.handleTabClick(tabs[next].dataset.panelId);
        } else {
            tabs[next].click();
        }
        tabs[next].focus();
    }

    /**
     * AICC-0251: Initialize aria-live region for screen reader announcements
     */
    initLiveRegion() {
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.classList.add('sr-only');
        liveRegion.id = 'live-announcer';
        document.body.appendChild(liveRegion);
    }

    /**
     * AICC-0251: Announce a message to screen readers via the live region
     */
    announce(message) {
        const el = document.getElementById('live-announcer');
        if (el) {
            el.textContent = '';
            setTimeout(() => { el.textContent = message; }, 100);
        }
    }

    /**
     * AICC-0251: Manage focus for dynamic content — tab switch, modals
     */
    manageFocus(targetElement) {
        if (!targetElement) return;
        // Focus the first interactive element inside the target
        const focusable = targetElement.querySelector(
            'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable) {
            focusable.focus();
        } else {
            targetElement.setAttribute('tabindex', '-1');
            targetElement.focus();
        }
    }

    /**
     * Setup modal event handlers
     */
    setupModalHandlers() {
        console.log('[AIKIT] Setting up modal handlers');
        
        // Modal close button
        const closeBtn = document.getElementById('modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                console.log('[AIKIT] Modal close button clicked');
                this.closeModal();
            });
        } else {
            console.warn('[AIKIT] modal-close button not found in DOM');
        }
        
        // Click outside modal to close
        const overlay = document.getElementById('modal-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    console.log('[AIKIT] Modal overlay clicked, closing modal');
                    this.closeModal();
                }
            });
        } else {
            console.warn('[AIKIT] modal-overlay not found in DOM');
        }
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
        
        // Developer mode toggle (AICC-0502)
        document.getElementById('btn-dev-toggle')?.addEventListener('click', () => {
            this.toggleDevMode();
        });
        
        // Footer buttons
        document.getElementById('agent-select')?.addEventListener('change', (e) => {
            this.sendMessage('changeAgent', { agentId: e.target.value });
        });
        
        document.getElementById('btn-save-all')?.addEventListener('click', () => {
            this.saveAllChanges();
        });
        
        document.getElementById('btn-run-next')?.addEventListener('click', () => {
            if (this.selectedItemIds.size > 0) {
                const ids = Array.from(this.selectedItemIds).join(', ');
                this.sendMessage('executeAction', { command: 'aicc.ailey.run', args: [ids] });
            } else {
                this.sendMessage('executeAction', { command: 'aicc.ailey.run' });
            }
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
        console.log('[AIKIT] Received message:', message.type, message.payload);
        const actions = window.AICC?.actions;
        if (actions && actions.has(`message.${message.type}`)) {
            actions.dispatch(`message.${message.type}`, message.payload, this);
        } else {
            console.warn('[AIKIT] Unknown message type:', message.type);
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
        console.log('[AIKIT] Sending message to backend:', type, payload);
        this.vscode.postMessage({ type, payload });
    }
    
    /**
     * Handle initial data
     */
    handleInit(payload) {
        this.panelData = payload;
        
        // Store platform info for OS-aware rendering
        this.platform = payload.platform || { id: 'linux', label: 'Linux', isWindows: false, isMacOS: false, isLinux: true, sep: '/', shell: 'bash', arch: 'x64' };
        if (window.AICC) {
            window.AICC.platform = this.platform;
        }
        
        // Set version
        document.getElementById('app-version').textContent = `v${payload.version || '1.0.0'}`;
        
        // Restore developer mode state (AICC-0505)
        if (payload.devModeEnabled !== undefined) {
            this.devModeEnabled = payload.devModeEnabled;
            this._applyDevModeVisibility();
        }
        
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
        
        // Developer-mode tab IDs (hidden when dev mode is off) (AICC-0503)
        const devTabIds = new Set(['component-catalog', 'api-docs', 'mcp']);

        // ── 1. AI Kits tab (always first) (AICC-0499) ──
        if (!renderedTabIds.has('ai-kit-loader')) {
            const aiKitTab = this.createTab('ai-kit-loader', 'AI Kits', 'package', this.currentPanelId === 'ai-kit-loader');
            container.appendChild(aiKitTab);
            renderedTabIds.add('ai-kit-loader');
        }

        // ── 2. Intakes tab (second position) (AICC-0501) ──
        if (this.availableIntakes && this.availableIntakes.length > 0) {
            if (!renderedTabIds.has('intakes')) {
                const intakesTab = this.createTab('intakes', 'Intakes', 'mail', this.currentPanelId === 'intakes');
                container.appendChild(intakesTab);
                renderedTabIds.add('intakes');
            }
        }

        // ── 3. Panel tabs (planning, etc.) ──
        if (panels && panels.length > 0) {
            panels.forEach(panel => {
                if (panel.id === 'ai-kit-loader') return; // already rendered first
                if (!renderedTabIds.has(panel.id)) {
                    // Rename Component Catalog → Components (AICC-0500)
                    const displayName = panel.id === 'component-catalog' ? 'Components' : panel.name;
                    const tab = this.createTab(
                        panel.id,
                        displayName,
                        panel.icon || 'file',
                        panel.id === this.currentPanelId
                    );
                    if (devTabIds.has(panel.id)) tab.dataset.devTab = 'true';
                    container.appendChild(tab);
                    renderedTabIds.add(panel.id);
                }
            });
        } else {
            // Default tabs when no panels configured
            const defaultTab = this.createTab('planning', 'Planning', 'layers', true);
            container.appendChild(defaultTab);
            renderedTabIds.add('planning');
            const apiTab = this.createTab('api-docs', 'API Docs', 'globe', false);
            apiTab.dataset.devTab = 'true';
            container.appendChild(apiTab);
            renderedTabIds.add('api-docs');
        }

        // ── 4. Dynamic YAML tabs (skip duplicates) ──
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

        // ── 5. Scheduler tab ──
        if (!renderedTabIds.has('scheduler')) {
            const schedulerTab = this.createTab('scheduler', 'Scheduler', 'clock', this.currentPanelId === 'scheduler');
            container.appendChild(schedulerTab);
            renderedTabIds.add('scheduler');
        }

        // ── 5b. Ideation tab (REQ-IDEA-080) ──
        if (!renderedTabIds.has('ideation')) {
            const ideaTab = this.createTab('ideation', 'Ideation', 'lightbulb', this.currentPanelId === 'ideation');
            container.appendChild(ideaTab);
            renderedTabIds.add('ideation');
        }

        // ── 6. Components tab (if not already added via panels) (AICC-0500) ──
        if (!renderedTabIds.has('component-catalog')) {
            const compTab = this.createTab('component-catalog', 'Components', 'symbol-class', false);
            compTab.dataset.devTab = 'true';
            container.appendChild(compTab);
            renderedTabIds.add('component-catalog');
        }

        // ── 7. API Docs tab (dev-only) ──
        if (!renderedTabIds.has('api-docs')) {
            const apiTab = this.createTab('api-docs', 'API Docs', 'globe', false);
            apiTab.dataset.devTab = 'true';
            container.appendChild(apiTab);
            renderedTabIds.add('api-docs');
        }

        // ── 8. MCP tab (dev-only) (AICC-0085) ──
        if (!renderedTabIds.has('mcp')) {
            const mcpTab = this.createTab('mcp', 'MCP', 'server', this.currentPanelId === 'mcp');
            mcpTab.dataset.devTab = 'true';
            container.appendChild(mcpTab);
            renderedTabIds.add('mcp');
        }

        // Apply developer mode visibility (AICC-0503)
        this._applyDevModeVisibility();
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
        // Clear MCP auto-refresh when leaving the MCP tab (AICC-0246)
        if (this.currentPanelId === 'mcp' && tabId !== 'mcp') {
            this._stopMcpAutoRefresh();
        }

        const actions = window.AICC?.actions;
        // Check if this is a frontend-only tab via the shared lookup
        if (actions && actions.lookup('localTabs', tabId)) {
            this.currentPanelId = tabId;
            this.updateActiveTabs();
            actions.dispatch(`localTab.${tabId}`, tabId, this);
        } else {
            // Backend-managed panels
            this.switchPanel(tabId);
        }

        // AICC-0251: Announce tab switch and manage focus
        this.announce(`Switched to ${tabId} tab`);
        const panelContent = document.getElementById('panel-content');
        if (panelContent) this.manageFocus(panelContent);
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
     * Update footer workspace:port and health indicator
     */
    updateFooterInfo(payload) {
        const wsNameEl = document.getElementById('footer-ws-name');
        const portEl = document.getElementById('footer-mcp-port');
        const healthEl = document.getElementById('footer-health-indicator');

        if (wsNameEl && payload.workspaceName) {
            wsNameEl.textContent = payload.workspaceName;
        }
        if (portEl && payload.port !== undefined) {
            portEl.textContent = String(payload.port);
        }
        if (healthEl) {
            const connected = payload.connected ?? payload.enabled ?? false;
            healthEl.classList.remove('connected', 'disconnected');
            healthEl.classList.add(connected ? 'connected' : 'disconnected');
            healthEl.title = connected ? 'MCP Connected' : 'MCP Disconnected';
        }
    }

    /**
     * Handle MCP config update
     */
    handleMcpConfigUpdated(payload) {
        this.panelData.mcpConfig = payload;
        this.updateFooterInfo(payload);
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
        const actions = window.AICC?.actions;
        // Check if current panel is a frontend-only tab
        if (actions && actions.lookup('localTabs', this.currentPanelId)) {
            actions.dispatch(`localTab.${this.currentPanelId}`, this.currentPanelId, this);
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
        const actions = window.AICC?.actions;
        if (actions) {
            actions.dispatchWithFallback('panel', panelConfig.panel.id, panelConfig, this);
        } else {
            // Fallback if actions library not loaded
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
        
        const actions = window.AICC?.actions;
        const renderer = actions
            ? (payload, ctx) => actions.dispatchWithFallback('intakeField', field.type, field, fieldId, required)
            : null;
        
        // Dispatch to the appropriate field renderer
        const fieldHTML = actions && actions.has(`intakeField.${field.type}`)
            ? actions.dispatch(`intakeField.${field.type}`, field, fieldId, required)
            : actions
                ? actions.dispatch('intakeField._default', field, fieldId, required)
                : `<input type="text" id="${fieldId}" name="${field.name}" placeholder="${field.placeholder || ''}" ${required} />`;
        
        // Checkbox has its own wrapper
        if (field.type === 'checkbox') {
            return `<div class="form-field">${fieldHTML}</div>`;
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
            ${this.buildPlanningConfig(refClass)}
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
            'DONE': rawCounts['DONE'] || rawCounts['done'] || 0,
            'SKIP': rawCounts['SKIP'] || rawCounts['skip'] || 0
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
     * Build planning config accordion (AICC-0506 / AICC-0507)
     * Contains Jira configuration migrated from standalone Jira tab
     */
    buildPlanningConfig(refClass) {
        const cfg = this.jiraConfig || {};
        const statusClass = this.jiraConnectionStatus || 'disconnected';
        const lastSync = this.jiraLastSyncTime
            ? new Date(this.jiraLastSyncTime).toLocaleString()
            : 'Never';
        const expanded = this.jiraConfigExpanded;

        return `
            <div class="planning-config" style="position:relative;">
                <span class="${refClass}" style="top:0;right:0;" data-ref="SEC-PLANNING-CONFIG">SEC-PLANNING-CONFIG</span>
                <div class="jira-container planning-jira-config" style="display:${expanded ? 'block' : 'none'};" id="planning-jira-config">
                    <h3 style="margin:0 0 12px;font-size:14px;display:flex;align-items:center;gap:6px;">
                        <span class="codicon codicon-issues"></span> Jira Configuration
                    </h3>

                    <!-- Connection Section (AICC-0231) -->
                    <div class="jira-accordion">
                        <div class="jira-accordion-header expanded" data-section="connection">
                            <span>Connection</span>
                            <span class="codicon codicon-chevron-right chevron"></span>
                        </div>
                        <div class="jira-accordion-body show" data-section="connection">
                            <div class="jira-form-group">
                                <label for="jira-baseUrl">Base URL</label>
                                <input type="url" id="jira-baseUrl" placeholder="https://your-domain.atlassian.net" value="${this.escapeSchedulerHtml(cfg.baseUrl || '')}" />
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-email">Email</label>
                                <input type="email" id="jira-email" placeholder="you@example.com" value="${this.escapeSchedulerHtml(cfg.email || '')}" />
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-apiToken">API Token</label>
                                <div style="display:flex;gap:4px;">
                                    <input type="password" id="jira-apiToken" placeholder="••••••••" value="${this.escapeSchedulerHtml(cfg.apiToken || '')}" style="flex:1;" />
                                    <button class="jira-btn jira-btn-secondary" id="jira-toggle-token" title="Show/Hide">
                                        <span class="codicon codicon-eye"></span>
                                    </button>
                                </div>
                            </div>
                            <div id="jira-connection-errors" style="color:#ef4444;font-size:12px;margin-bottom:8px;display:none;"></div>
                            <div style="display:flex;gap:8px;">
                                <button class="jira-btn jira-btn-primary" id="jira-save-config">Save</button>
                                <button class="jira-btn jira-btn-secondary" id="jira-test-connection">Test Connection</button>
                            </div>
                            <div id="jira-connection-result" style="margin-top:8px;font-size:12px;display:none;"></div>
                        </div>
                    </div>

                    <!-- Project Section (AICC-0233) -->
                    <div class="jira-accordion">
                        <div class="jira-accordion-header" data-section="project">
                            <span>Project</span>
                            <span class="codicon codicon-chevron-right chevron"></span>
                        </div>
                        <div class="jira-accordion-body" data-section="project">
                            <div class="jira-form-group">
                                <label for="jira-projectKey">Project Key</label>
                                <div style="display:flex;gap:4px;">
                                    <input type="text" id="jira-projectKey" placeholder="e.g., AICC" value="${this.escapeSchedulerHtml(cfg.projectKey || '')}" style="flex:1;" />
                                    <button class="jira-btn jira-btn-secondary" id="jira-lookup-projects">Lookup</button>
                                </div>
                            </div>
                            <div id="jira-projects-list" style="margin-top:8px;display:none;">
                                <label>Select Project:</label>
                                <select id="jira-project-select" style="width:100%;padding:6px 8px;font-size:13px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
                                    <option value="">-- Select --</option>
                                </select>
                            </div>
                            <div id="jira-project-info" style="margin-top:8px;font-size:12px;display:none;"></div>
                        </div>
                    </div>

                    <!-- Sync Configuration (unified — AICC-0232 / REQ-JIRACFG-015) -->
                    <div class="jira-accordion">
                        <div class="jira-accordion-header" data-section="sync">
                            <span>Sync Configuration</span>
                            <span class="codicon codicon-chevron-right chevron"></span>
                        </div>
                        <div class="jira-accordion-body" data-section="sync">
                            <div class="jira-form-group">
                                <label for="jira-syncStrategy">Sync Strategy</label>
                                <select id="jira-syncStrategy">
                                    <option value="push" ${cfg.syncStrategy === 'push' ? 'selected' : ''}>Push (Local → Jira)</option>
                                    <option value="pull" ${cfg.syncStrategy === 'pull' || !cfg.syncStrategy ? 'selected' : ''}>Pull (Jira → Local)</option>
                                    <option value="bidirectional" ${cfg.syncStrategy === 'bidirectional' ? 'selected' : ''}>Bidirectional</option>
                                </select>
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-conflictResolution">Conflict Resolution</label>
                                <select id="jira-conflictResolution">
                                    <option value="local-wins" ${cfg.conflictResolution === 'local-wins' ? 'selected' : ''}>Local Wins</option>
                                    <option value="remote-wins" ${cfg.conflictResolution === 'remote-wins' || !cfg.conflictResolution ? 'selected' : ''}>Remote Wins</option>
                                    <option value="manual" ${cfg.conflictResolution === 'manual' ? 'selected' : ''}>Manual</option>
                                    <option value="merge" ${cfg.conflictResolution === 'merge' ? 'selected' : ''}>Merge</option>
                                </select>
                            </div>
                            <div class="jira-form-group">
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                    <input type="checkbox" id="jira-autoSync" ${cfg.autoSync ? 'checked' : ''} />
                                    Auto-sync enabled
                                </label>
                            </div>
                            <div class="jira-form-group" id="jira-interval-group" style="${cfg.autoSync ? '' : 'display:none;'}">
                                <label for="jira-syncInterval">Sync Interval (minutes)</label>
                                <input type="number" id="jira-syncInterval" min="1" max="1440" value="${cfg.syncInterval || 30}" />
                            </div>
                            <div class="jira-form-group">
                                <label style="font-weight:600;margin-bottom:6px;">Issue Type Filters</label>
                                <div class="jira-filter-group">
                                    <label><input type="checkbox" class="jira-issue-filter" value="Epic" ${cfg.issueTypeFilters?.epic !== false ? 'checked' : ''} /> Epic</label>
                                    <label><input type="checkbox" class="jira-issue-filter" value="Story" ${cfg.issueTypeFilters?.story !== false ? 'checked' : ''} /> Story</label>
                                    <label><input type="checkbox" class="jira-issue-filter" value="Task" ${cfg.issueTypeFilters?.task !== false ? 'checked' : ''} /> Task</label>
                                    <label><input type="checkbox" class="jira-issue-filter" value="Bug" ${cfg.issueTypeFilters?.bug !== false ? 'checked' : ''} /> Bug</label>
                                </div>
                            </div>
                            <div class="jira-form-group">
                                <label style="font-weight:600;margin-bottom:6px;">Status Filter</label>
                                <div class="jira-filter-group">
                                    ${['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map(s =>
                                        `<label><input type="checkbox" class="jira-sync-status-filter" value="${s}" ${(cfg.statusFilter || []).includes(s) ? 'checked' : ''} /> ${s}</label>`
                                    ).join('')}
                                </div>
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-sync-assignee">Assignee Filter</label>
                                <input type="text" id="jira-sync-assignee" placeholder="e.g., currentUser() or username" value="${this.escapeSchedulerHtml(cfg.assigneeFilter || '')}" />
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-sync-sprint">Sprint Filter</label>
                                <input type="text" id="jira-sync-sprint" placeholder="e.g., openSprints() or sprint name" value="${this.escapeSchedulerHtml(cfg.sprintFilter || '')}" />
                            </div>
                            <div class="jira-form-group">
                                <label style="font-weight:600;margin-bottom:6px;">Labels Filter</label>
                                <div class="jira-filter-group">
                                    <input type="text" id="jira-sync-labels" placeholder="Comma-separated labels" value="${this.escapeSchedulerHtml((cfg.labelsFilter || []).join(', '))}" />
                                </div>
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-sync-daterange">Updated Since</label>
                                <input type="text" id="jira-sync-daterange" placeholder="e.g., -7d or 2026-01-01" value="${this.escapeSchedulerHtml(cfg.dateRange || '')}" />
                            </div>
                            <div class="jira-form-group">
                                <label for="jira-sync-jql">Custom JQL (appended)</label>
                                <input type="text" id="jira-sync-jql" placeholder="e.g., component = Frontend" value="${this.escapeSchedulerHtml(cfg.jql || '')}" />
                            </div>
                            <div style="display:flex;gap:8px;margin-top:8px;">
                                <button class="jira-btn jira-btn-primary" id="jira-save-sync-settings">Save Sync Configuration</button>
                                <button class="jira-btn jira-btn-secondary" id="jira-preview-jql">Preview JQL</button>
                            </div>
                            <div id="jira-jql-preview" style="display:none;margin-top:8px;padding:8px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px;font-family:monospace;font-size:11px;word-break:break-all;"></div>
                        </div>
                    </div>

                    <!-- Status Section (AICC-0237) -->
                    <div class="jira-accordion">
                        <div class="jira-accordion-header" data-section="status">
                            <span>Status</span>
                            <span class="codicon codicon-chevron-right chevron"></span>
                        </div>
                        <div class="jira-accordion-body" data-section="status">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <span>Connection:</span>
                                <span class="jira-status-badge ${statusClass}">
                                    <span>●</span>
                                    ${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}
                                </span>
                            </div>
                            <div style="margin-bottom:8px;font-size:12px;">
                                <span style="opacity:0.7;">Last sync:</span> ${lastSync}
                            </div>
                            <div id="jira-sync-summary" style="font-size:12px;margin-bottom:8px;"></div>
                            <div class="jira-sync-progress" id="jira-sync-progress" style="display:none;">
                                <div style="font-size:12px;margin-bottom:4px;" id="jira-sync-phase">Syncing...</div>
                                <div class="progress-bar">
                                    <div class="progress-bar-fill" id="jira-sync-progress-fill" style="width:0%;"></div>
                                </div>
                            </div>
                            <div id="jira-sync-errors" style="margin-top:8px;display:none;">
                                <div style="color:#ef4444;font-size:12px;cursor:pointer;" id="jira-errors-toggle">
                                    <span class="codicon codicon-warning"></span> <span id="jira-error-count">0</span> error(s) — click to expand
                                </div>
                                <div id="jira-errors-detail" style="display:none;margin-top:4px;font-size:11px;max-height:150px;overflow-y:auto;padding:8px;background:var(--vscode-editor-background);border-radius:4px;border:1px solid var(--vscode-panel-border);"></div>
                            </div>
                            <div style="margin-top:12px;">
                                <button class="jira-btn jira-btn-primary" id="jira-sync-now">
                                    <span class="codicon codicon-sync"></span> Sync Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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
                <button id="btn-jira-config-toggle" class="filter-toggle ${this.jiraConfigExpanded ? 'active' : ''}" title="Toggle Jira Configuration" aria-label="Toggle Jira Configuration">
                    <span class="codicon codicon-issues" aria-hidden="true"></span>
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
        const isChecked = this.selectedItemIds.has(item.id);
        
        return `
            <div class="accordion-item ${isExpanded ? 'expanded' : ''}" 
                 data-type="${item.type}" 
                 data-id="${item.id}">
                <div class="accordion-header" data-item-id="${item.id}">
                    ${depth > 0 ? `<span style="display:inline-block;width:${depth * 20}px;"></span>` : ''}
                    <input type="checkbox" class="item-checkbox" data-item-id="${item.id}" ${isChecked ? 'checked' : ''} onclick="app.toggleItemSelection('${item.id}', event)" aria-label="Select ${item.projectNumber || item.id}" />
                    ${hasChildren ? `<span class="codicon codicon-chevron-right expand-icon" title="${isExpanded ? 'Collapse' : 'Expand'}" aria-label="${isExpanded ? 'Collapse item' : 'Expand item'}" aria-hidden="true"></span>` : '<span style="width:16px;display:inline-block;"></span>'}
                    <span class="status-bullet" style="background-color:${statusColor};" title="Status: ${item.status.toUpperCase()}" aria-label="Status: ${item.status.toUpperCase()}"></span>
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
                    <button class="accordion-tab-btn active" data-tab="edit" data-item-id="${item.id}" title="Edit">
                        <span class="codicon codicon-edit"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="repo" data-item-id="${item.id}" title="Repository">
                        <span class="codicon codicon-github"></span>
                    </button>
                    <button class="accordion-tab-btn" data-tab="ai-settings" data-item-id="${item.id}" title="AI Settings">
                        <span class="codicon codicon-circuit-board"></span>
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
                    <button class="accordion-tab-btn" data-tab="comments" data-item-id="${item.id}" title="Comments">
                        <span class="codicon codicon-comment"></span>
                    </button>
                </div>
                <div class="accordion-tab-content">
                    <div class="accordion-tab-panel active" data-tab="edit" data-item-id="${item.id}">
                        ${this.buildEditTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="repo" data-item-id="${item.id}">
                        ${this.buildRepoTab(item)}
                    </div>
                    <div class="accordion-tab-panel" data-tab="ai-settings" data-item-id="${item.id}">
                        ${this.buildAISettingsTab(item)}
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
            `<option value="${s}" ${item.status.toUpperCase() === s ? 'selected' : ''}>${s}</option>`
        ).join('');
        
        return `
            <div class="accordion-actions" onclick="event.stopPropagation()">
                <select class="status-dropdown" 
                        style="border-color:${statusColor}" 
                        data-item-id="${item.id}"
                        aria-label="Change status for ${item.projectNumber || item.id}">
                    ${options}
                </select>
                ${item.projectNumber && item.projectNumber.includes('-') ? `<button class="accordion-btn" onclick="event.stopPropagation(); app.openJiraIssue('${item.id}')" title="Open in Jira" aria-label="Open in Jira" style="margin-left:4px;">
                    <span class="codicon codicon-cloud" aria-hidden="true"></span>
                </button>` : ''}
                <button class="accordion-btn" data-action="refine" data-item-id="${item.id}" title="Refine ${item.projectNumber || item.id}" aria-label="Refine item" style="margin-left:4px;">
                    <span class="codicon codicon-wand" aria-hidden="true"></span>
                </button>
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
                <div class="tab-form-row">
                    <div class="tab-form-group tab-form-col">
                        <label class="tab-form-label">Created By</label>
                        <div class="tab-form-display">${this.escapeHtml(item.metadata?.createdBy || 'Unknown')}</div>
                    </div>
                    <div class="tab-form-group tab-form-col">
                        <label class="tab-form-label">Created Date</label>
                        <div class="tab-form-display">${item.metadata?.createdDate ? new Date(item.metadata.createdDate).toLocaleString() : 'Unknown'}</div>
                    </div>
                </div>
                <div class="tab-form-row">
                    <div class="tab-form-group tab-form-col">
                        <label class="tab-form-label">Updated By</label>
                        <div class="tab-form-display">${this.escapeHtml(item.metadata?.updatedBy || 'Unknown')}</div>
                    </div>
                    <div class="tab-form-group tab-form-col">
                        <label class="tab-form-label">Updated Date</label>
                        <div class="tab-form-display">${item.metadata?.updatedDate ? new Date(item.metadata.updatedDate).toLocaleString() : 'Unknown'}</div>
                    </div>
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
                <div class="tab-form-row">
                    <div class="tab-form-group tab-form-col">
                        <label class="tab-form-label">Type</label>
                        <select class="tab-form-select" id="relationship-type-${item.id}">
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
                    </div>
                    <div class="tab-form-group tab-form-col">
                        <label class="tab-form-label">Target Item ID</label>
                        <input type="text" class="tab-form-input" id="relationship-target-${item.id}" placeholder="Target Item ID" />
                    </div>
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
        
        const commentsList = comments.length > 0 ? comments.map((comment, idx) => {
            const enabled = comment.enabled !== false;
            const createdBy = comment.createdBy || comment.author || 'Unknown';
            const createdOn = comment.createdOn || comment.date;
            const updatedOn = comment.updatedOn;
            const commentText = comment.comment || comment.text || '';
            
            return `
            <div class="tab-list-item" style="flex-direction: column; align-items: flex-start; padding: 12px; ${!enabled ? 'opacity: 0.5;' : ''}">
                <div style="display: flex; width: 100%; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                    <button class="tab-icon-btn" onclick="app.toggleCommentEnabled('${item.id}', ${idx})" title="${enabled ? 'Skip comment' : 'Include comment'}" style="margin-top: 2px;">
                        <span class="codicon codicon-${enabled ? 'eye' : 'eye-closed'}${!enabled ? ' comment-suppressed-icon' : ''}"></span>
                    </button>
                    <div style="flex: 1;">
                        <div style="font-size: 12px; margin-bottom: 6px;">${this.escapeHtml(commentText)}</div>
                        <div style="font-size: 11px; color: var(--vscode-descriptionForeground);">
                            ${this.escapeHtml(createdBy)} • ${createdOn ? new Date(createdOn).toLocaleString() : ''}
                            ${updatedOn && updatedOn !== createdOn ? ` • Updated: ${new Date(updatedOn).toLocaleString()}` : ''}
                        </div>
                    </div>
                    <button class="tab-icon-btn" onclick="app.deleteComment('${item.id}', ${idx})" title="Delete" style="margin-top: 2px;">
                        <span class="codicon codicon-trash"></span>
                    </button>
                </div>
            </div>
        `;
        }).join('') : '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No comments yet.</p>';
        
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
     * Build AI Settings tab
     */
    buildAISettingsTab(item) {
        const instructions = item.instructions || [];
        const personas = item.personas || [];
        const contexts = item.contexts || [];
        const agent = item.agent || 'AI-ley Orchestrator';
        
        const instructionsList = instructions.map((inst, idx) => `
            <div class="list-builder-item">
                <span class="list-builder-text">${this.escapeHtml(inst)}</span>
                <button class="tab-icon-btn" onclick="app.removeListItem('${item.id}', 'instructions', ${idx})" title="Remove">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>
        `).join('');
        
        const personasList = personas.map((persona, idx) => `
            <div class="list-builder-item">
                <span class="list-builder-text">${this.escapeHtml(persona)}</span>
                <button class="tab-icon-btn" onclick="app.removeListItem('${item.id}', 'personas', ${idx})" title="Remove">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>
        `).join('');
        
        const contextsList = contexts.map((ctx, idx) => `
            <div class="list-builder-item">
                <span class="list-builder-text">${this.escapeHtml(ctx)}</span>
                <button class="tab-icon-btn" onclick="app.removeListItem('${item.id}', 'contexts', ${idx})" title="Remove">
                    <span class="codicon codicon-trash"></span>
                </button>
            </div>
        `).join('');
        
        return `
            <div class="tab-form">
                <div class="tab-form-group">
                    <label class="tab-form-label">AI Agent</label>
                    <select class="tab-form-select" id="agent-${item.id}">
                        <option value="AI-ley Orchestrator" ${agent === 'AI-ley Orchestrator' ? 'selected' : ''}>AI-ley Orchestrator</option>
                        <option value="AI-ley Architect" ${agent === 'AI-ley Architect' ? 'selected' : ''}>AI-ley Architect</option>
                        <option value="AI-ley Bug Fixer" ${agent === 'AI-ley Bug Fixer' ? 'selected' : ''}>AI-ley Bug Fixer</option>
                        <option value="AI-ley Tester" ${agent === 'AI-ley Tester' ? 'selected' : ''}>AI-ley Tester</option>
                        <option value="AI-ley Documentation" ${agent === 'AI-ley Documentation' ? 'selected' : ''}>AI-ley Documentation</option>
                        <option value="AI-ley Designer" ${agent === 'AI-ley Designer' ? 'selected' : ''}>AI-ley Designer</option>
                        <option value="AI-ley DevOps" ${agent === 'AI-ley DevOps' ? 'selected' : ''}>AI-ley DevOps</option>
                        <option value="AI-ley Security" ${agent === 'AI-ley Security' ? 'selected' : ''}>AI-ley Security</option>
                    </select>
                </div>
                
                <div class="tab-form-group">
                    <label class="tab-form-label">Instructions</label>
                    <div class="list-builder-container">
                        ${instructionsList || '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No instructions added</p>'}
                    </div>
                    <div class="list-builder-input-row">
                        <input type="text" class="tab-form-input" id="instruction-input-${item.id}" placeholder="Type to search instructions..." />
                        <button class="tab-icon-btn" onclick="app.addListItem('${item.id}', 'instructions')" title="Add">
                            <span class="codicon codicon-add"></span>
                        </button>
                    </div>
                </div>
                
                <div class="tab-form-group">
                    <label class="tab-form-label">Personas</label>
                    <div class="list-builder-container">
                        ${personasList || '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No personas added</p>'}
                    </div>
                    <div class="list-builder-input-row">
                        <input type="text" class="tab-form-input" id="persona-input-${item.id}" placeholder="Type to search personas..." />
                        <button class="tab-icon-btn" onclick="app.addListItem('${item.id}', 'personas')" title="Add">
                            <span class="codicon codicon-add"></span>
                        </button>
                    </div>
                </div>
                
                <div class="tab-form-group">
                    <label class="tab-form-label">Context (Files/Folders)</label>
                    <div class="list-builder-container">
                        ${contextsList || '<p style="color: var(--vscode-descriptionForeground); font-size: 12px;">No context added</p>'}
                    </div>
                    <div class="list-builder-input-row">
                        <input type="text" class="tab-form-input" id="context-input-${item.id}" placeholder="Add file or folder path..." />
                        <button class="tab-icon-btn" onclick="app.addListItem('${item.id}', 'contexts')" title="Add">
                            <span class="codicon codicon-add"></span>
                        </button>
                    </div>
                </div>
                
                <button class="tab-btn tab-btn-primary" onclick="app.saveAISettings('${item.id}')">Save AI Settings</button>
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

        // Jira config toggle in filter bar (AICC-0508)
        document.getElementById('btn-jira-config-toggle')?.addEventListener('click', () => {
            this.jiraConfigExpanded = !this.jiraConfigExpanded;
            const panel = document.getElementById('planning-jira-config');
            const btn = document.getElementById('btn-jira-config-toggle');
            if (panel) {
                panel.style.display = this.jiraConfigExpanded ? 'block' : 'none';
            }
            if (btn) {
                btn.classList.toggle('active', this.jiraConfigExpanded);
            }
            // Request Jira config data when expanding
            if (this.jiraConfigExpanded) {
                this.sendMessage('getJiraConfig');
                this.sendMessage('getJiraSyncConfig');  // REQ-JIRACFG-018
            }
        });

        // Jira event listeners within planning tab (AICC-0507)
        this._attachJiraEventListeners();
        
        // Accordion headers
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // Ignore clicks on interactive elements
                if (e.target.classList.contains('item-checkbox') ||
                    e.target.classList.contains('status-dropdown') ||
                    e.target.classList.contains('accordion-btn') ||
                    e.target.closest('.accordion-actions') ||
                    e.target.closest('.status-dropdown')) {
                    return;
                }
                
                e.stopPropagation();
                e.preventDefault();
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
     * Open Jira issue in browser
     */
    openJiraIssue(itemId) {
        this.sendMessage('openJiraIssue', { itemId });
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
        const actions = window.AICC?.actions;
        if (actions && actions.has(`item.${action}`)) {
            actions.dispatch(`item.${action}`, { itemId }, this);
        } else {
            console.warn('[AIKIT] Unknown item action:', action);
        }
    }
    
    /**
     * Toggle item selection
     */
    toggleItemSelection(itemId, event) {
        event.stopPropagation();
        if (this.selectedItemIds.has(itemId)) {
            this.selectedItemIds.delete(itemId);
        } else {
            this.selectedItemIds.add(itemId);
        }
        this.updateRunButtonLabel();
        this.renderCurrentPanel();
    }
    
    /**
     * Update run button label
     */
    updateRunButtonLabel() {
        const btn = document.getElementById('btn-run-next');
        if (btn && this.selectedItemIds.size > 0) {
            btn.textContent = `Run (${this.selectedItemIds.size})`;
        } else if (btn) {
            btn.textContent = 'Run Next';
        }
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
        setTimeout(() => { this.renderCurrentPanel(); this.switchTab(itemId, 'comments'); }, 200);
    }
    
    /**
     * Delete comment
     */
    deleteComment(itemId, index) {
        this.sendMessage('deleteComment', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => { this.renderCurrentPanel(); this.switchTab(itemId, 'comments'); }, 200);
    }
    
    /**
     * Toggle comment enabled/disabled
     */
    toggleCommentEnabled(itemId, index) {
        this.sendMessage('toggleCommentEnabled', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => { this.renderCurrentPanel(); this.switchTab(itemId, 'comments'); }, 200);
    }
    
    /**
     * Add item to list (instructions, personas, contexts)
     */
    addListItem(itemId, listType) {
        const inputId = `${listType.slice(0, -1)}-input-${itemId}`;
        const input = document.getElementById(inputId);
        const value = input?.value?.trim();
        
        if (!value) return;
        
        this.sendMessage('addListItem', { itemId, listType, value });
        this.pendingChanges++;
        this.updateChangesCount();
        
        if (input) input.value = '';
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Remove item from list (instructions, personas, contexts)
     */
    removeListItem(itemId, listType, index) {
        this.sendMessage('removeListItem', { itemId, listType, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    }
    
    /**
     * Save AI settings
     */
    saveAISettings(itemId) {
        const agent = document.getElementById(`agent-${itemId}`)?.value;
        
        if (agent) {
            this.sendMessage('updateItem', { itemId, field: 'agent', value: agent });
            this.pendingChanges++;
            this.updateChangesCount();
        }
        
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

        // AICC-0251: Announce modal and manage focus
        this.announce(`${title} dialog opened`);
        this.manageFocus(document.getElementById('modal-body'));
        
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
        // AICC-0251: Announce modal closure
        this.announce('Dialog closed');
    }
    
    /**
     * Render AI Kit Loader panel
     */
    renderAIKitLoaderPanel() {
        console.log('[AIKIT] Rendering AI Kit Loader panel');
        const content = document.getElementById('panel-content');
        if (!content) {
            console.error('[AIKIT] panel-content element not found');
            return;
        }
        
        const refClass = this.showComponentRefs ? 'component-ref visible' : 'component-ref';
        
        content.innerHTML = `
            <span class="${refClass}" style="top:0;left:100px;" data-ref="SEC-AIKIT-TAB">SEC-AIKIT-TAB</span>
            <div class="aikit-catalog-container">
                <div class="catalog-grid" id="catalog-grid">
                    <div class="loading">
                        <span class="codicon codicon-loading codicon-modifier-spin"></span>
                        <span>Loading AI Kits...</span>
                    </div>
                </div>
            </div>
        `;
        
        console.log('[AIKIT] Panel HTML rendered, loading catalog...');
        // Load available kits
        this.loadAIKitCatalog();
    }
    
    /**
     * Load AI Kit catalog from backend
     */
    async loadAIKitCatalog() {
        console.log('[AIKIT] loadAIKitCatalog() called');
        try {
            // Request catalog data from backend
            console.log('[AIKIT] Sending fetchData message to backend');
            this.sendMessage('fetchData', { 
                endpoint: 'aikit-catalog',
                params: {}
            });
            console.log('[AIKIT] fetchData message sent');
        } catch (error) {
            console.error('[AIKIT] Failed to load AI Kit catalog:', error);
            this.showAIKitError('Failed to load catalog: ' + error.message);
        }
    }
    
    /**
     * Render AI Kit catalog grid
     */
    renderAIKitCatalog(kits) {
        console.log('[AIKIT] renderAIKitCatalog() called with', kits?.length || 0, 'kits');
        const grid = document.getElementById('catalog-grid');
        if (!grid) {
            console.error('[AIKIT] catalog-grid element not found');
            return;
        }
        
        if (!kits || kits.length === 0) {
            console.log('[AIKIT] No kits available, showing empty message');
            grid.innerHTML = '<div class="empty-message">No AI Kits available</div>';
            return;
        }
        
        console.log('[AIKIT] Creating kit cards for', kits.length, 'kits');
        grid.innerHTML = kits.map(kit => this.createKitCard(kit)).join('');
        
        // Add click handlers
        const cards = grid.querySelectorAll('.kit-card');
        console.log('[AIKIT] Adding click handlers to', cards.length, 'kit cards');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const kitId = card.dataset.kitId;
                console.log('[AIKIT] Kit card clicked:', kitId);
                const kit = kits.find(k => k.name === kitId);
                if (kit) {
                    this.openKitModal(kit);
                } else {
                    console.error('[AIKIT] Kit not found:', kitId);
                }
            });
        });
        console.log('[AIKIT] Catalog rendering complete');
    }
    
    /**
     * Create kit card HTML
     */
    createKitCard(kit) {
        const iconData = kit.iconBase64 || this.getDefaultKitIcon();
        // Border colour class: blue=default, green=installed, white=not-installed, red=error
        let borderClass = '';
        if (kit.installStatus === 'error') {
            borderClass = ' kit-border-error';
        } else if (kit.installStatus === 'default') {
            borderClass = ' kit-border-default';
        } else if (kit.installStatus === 'installed') {
            borderClass = ' kit-border-installed';
        }
        return `
            <div class="kit-card" data-kit-id="${kit.name}">
                <div class="kit-icon${borderClass}">
                    <img src="${iconData}" alt="${kit.name}" />
                </div>
                <div class="kit-name">${kit.displayName || kit.name}</div>
            </div>
        `;
    }
    
    /**
     * Get default kit icon as base64
     */
    getDefaultKitIcon() {
        // Default package icon as base64 SVG
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA3NSA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHJ4PSIxMCIgZmlsbD0iIzIxMjEyMSIvPgogIDxwYXRoIGQ9Ik0zNy41IDIwTDU1IDMwVjUwTDM3LjUgNjBMMjAgNTBWMzBMMzcuNSAyMFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CiAgPHBhdGggZD0iTTM3LjUgMjBWNjAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHBhdGggZD0iTTIwIDMwTDM3LjUgNDBMNTUgMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==';
    }
    
    /**
     * Open kit modal
     */
    openKitModal(kit) {
        console.log('[AIKIT] Opening modal for kit:', kit.name);
        const modal = document.getElementById('modal-overlay');
        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalContainer || !modalTitle || !modalBody) {
            console.error('[AIKIT] Modal elements not found');
            return;
        }
        
        // Set modal size for kit modal
        modalContainer.style.width = '80%';
        modalContainer.style.height = '80%';
        
        // Render modal header
        const iconData = kit.iconBase64 || this.getDefaultKitIcon();
        modalTitle.innerHTML = `
            <div class="kit-modal-header">
                <div class="kit-modal-icon">
                    <img src="${iconData}" alt="${kit.name}" />
                </div>
                <div class="kit-modal-title">${kit.displayName || kit.name}</div>
            </div>
        `;
        
        // Render modal body with tabs
        modalBody.innerHTML = `
            <div class="kit-modal-tabs">
                <div class="kit-tab-buttons">
                    <button class="kit-tab-btn active" data-tab="settings">Settings</button>
                    <button class="kit-tab-btn" data-tab="configuration">Configuration</button>
                    <button class="kit-tab-btn" data-tab="components">Bundles</button>
                </div>
                <div class="kit-tab-content">
                    <div class="kit-tab-pane active" id="tab-settings">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading settings...</span>
                        </div>
                    </div>
                    <div class="kit-tab-pane" id="tab-configuration">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading configuration...</span>
                        </div>
                    </div>
                    <div class="kit-tab-pane" id="tab-components">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading bundles...</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="kit-modal-footer">
                <div class="footer-left">
                    <span class="last-updated">Last Updated: ${this.formatLastUpdated(kit.lastUpdated)}</span>
                </div>
                <div class="footer-right">
                    <button class="footer-btn primary" id="btn-save-kit">
                        <span class="codicon codicon-save"></span> Save
                    </button>
                </div>
            </div>
        `;
        
        // Setup tab switching
        modalBody.querySelectorAll('.kit-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchKitTab(tabName);
            });
        });
        
        // Setup save button
        modalBody.querySelector('#btn-save-kit')?.addEventListener('click', () => {
            this.saveKitSettings(kit.name);
        });
        
        // Show modal
        modal.style.display = 'flex';
        console.log('[AIKIT] Modal displayed');
        
        // Load initial tab content
        console.log('[AIKIT] Loading initial settings tab');
        this.loadKitSettings(kit.name);
        
        // Store current kit
        this.currentKit = kit;
        console.log('[AIKIT] Current kit stored:', kit.name);
    }
    
    /**
     * Switch kit modal tab
     */
    switchKitTab(tabName) {
        const modalBody = document.getElementById('modal-body');
        if (!modalBody) return;
        
        // Update button states
        modalBody.querySelectorAll('.kit-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update pane visibility
        modalBody.querySelectorAll('.kit-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });
        
        // Load tab content via actions dispatch
        if (!this.currentKit) return;
        
        const actions = window.AICC?.actions;
        if (actions && actions.has(`kitTab.${tabName}`)) {
            actions.dispatch(`kitTab.${tabName}`, this.currentKit.name, this);
        }
    }
    
    /**
     * Load kit settings tab
     */
    async loadKitSettings(kitName) {
        const pane = document.getElementById('tab-settings');
        if (!pane) return;
        
        try {
            this.sendMessage('fetchData', {
                endpoint: 'aikit-settings',
                params: { kitName }
            });
        } catch (error) {
            console.error('Failed to load kit settings:', error);
            pane.innerHTML = '<div class="error-message">Failed to load settings</div>';
        }
    }
    
    /**
     * Render kit settings
     */
    renderKitSettings(settings, kitName) {
        const pane = document.getElementById('tab-settings');
        if (!pane) return;
        
        const isInstalled = settings.installed || false;
        const topLevelFields = settings.topLevelFields || [];
        const configFields = settings.configFields || [];
        
        // Group top-level fields
        const groups = {};
        const ungrouped = [];
        for (const field of topLevelFields) {
            if (field.group) {
                if (!groups[field.group]) groups[field.group] = [];
                groups[field.group].push(field);
            } else {
                ungrouped.push(field);
            }
        }
        
        // Render top-level fields
        const topLevelHtml = ungrouped.map(f => this.renderSettingsField(f, 'setting')).join('');
        
        // Render grouped fields
        const groupLabels = { refresh: 'Refresh Settings', evolution: 'Evolution Settings' };
        const groupsHtml = Object.entries(groups).map(([groupName, fields]) => `
            <div class="settings-group">
                <h4 class="settings-group-heading">
                    <span class="codicon codicon-${groupName === 'refresh' ? 'sync' : 'git-pull-request'}"></span>
                    ${groupLabels[groupName] || groupName}
                </h4>
                ${fields.map(f => this.renderSettingsField(f, 'setting')).join('')}
            </div>
        `).join('');
        
        // Render configuration fields section
        let configFieldsHtml = '';
        if (configFields.length > 0) {
            const fieldsHtml = configFields.map(f => this.renderSettingsField(f, 'kitcfg')).join('');
            configFieldsHtml = `
                <div class="settings-group">
                    <h4 class="settings-group-heading">
                        <span class="codicon codicon-settings-gear"></span> Kit Configuration
                    </h4>
                    ${fieldsHtml}
                </div>
            `;
        }
        
        pane.innerHTML = `
            <div class="kit-settings-form">
                ${topLevelHtml}
                ${groupsHtml}
                ${configFieldsHtml}
                ${!isInstalled ? `
                    <div class="form-group" style="margin-top: 16px;">
                        <button class="footer-btn success" id="btn-install-kit">
                            <span class="codicon codicon-cloud-download"></span> Install Kit
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Setup install button
        pane.querySelector('#btn-install-kit')?.addEventListener('click', () => {
            this.installKit(kitName);
        });
    }
    
    /**
     * Render a single settings field based on its type
     */
    renderSettingsField(field, prefix) {
        const fieldId = `${prefix}-${field.name}`;
        const label = field.label || field.name;
        const value = field.value ?? '';
        const isReadonly = field.readonly === true;
        const helpText = field.helpText ? `<span class="field-help-text">${this.escapeHtml(field.helpText)}</span>` : '';
        
        let inputHtml = '';
        
        switch (field.type) {
            case 'toggle':
            case 'checkbox': {
                const checked = value === true || value === 'true' ? 'checked' : '';
                const disabled = isReadonly ? 'disabled' : '';
                inputHtml = `
                    <div class="toggle-field">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${fieldId}" name="${field.name}" ${checked} ${disabled} />
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                            <span class="toggle-label-text">${this.escapeHtml(label)}</span>
                        </label>
                    </div>
                    ${helpText}
                `;
                // Toggles have their label inline; skip the outer label
                return `<div class="form-group">${inputHtml}</div>`;
            }
            case 'number': {
                const ro = isReadonly ? 'readonly' : '';
                inputHtml = `<input type="number" id="${fieldId}" name="${field.name}" value="${this.escapeHtml(String(value))}" class="form-control" ${ro} />`;
                break;
            }
            case 'select': {
                const options = (field.options || []).map(opt => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const selected = String(optVal) === String(value) ? 'selected' : '';
                    return `<option value="${this.escapeHtml(String(optVal))}" ${selected}>${this.escapeHtml(String(optLabel))}</option>`;
                }).join('');
                const dis = isReadonly ? 'disabled' : '';
                inputHtml = `<select id="${fieldId}" name="${field.name}" class="form-control" ${dis}>${options}</select>`;
                break;
            }
            case 'textarea': {
                const ro = isReadonly ? 'readonly' : '';
                inputHtml = `<textarea id="${fieldId}" name="${field.name}" class="form-control" rows="3" ${ro}>${this.escapeHtml(String(value))}</textarea>`;
                break;
            }
            default: { // text, email, url, date
                const ro = isReadonly ? 'readonly' : '';
                const placeholder = field.placeholder ? `placeholder="${this.escapeHtml(field.placeholder)}"` : '';
                inputHtml = `<input type="${field.type || 'text'}" id="${fieldId}" name="${field.name}" value="${this.escapeHtml(String(value))}" class="form-control" ${ro} ${placeholder} />`;
                break;
            }
        }
        
        return `
            <div class="form-group">
                <label for="${fieldId}">${this.escapeHtml(label)}</label>
                ${inputHtml}
                ${helpText}
            </div>
        `;
    }
    
    /**
     * Load kit configuration tab
     */
    async loadKitConfiguration(kitName) {
        const pane = document.getElementById('tab-configuration');
        if (!pane) return;
        
        try {
            this.sendMessage('fetchData', {
                endpoint: 'aikit-configuration',
                params: { kitName }
            });
        } catch (error) {
            console.error('Failed to load kit configuration:', error);
            pane.innerHTML = '<div class="error-message">Failed to load configuration</div>';
        }
    }
    
    /**
     * Render kit configuration
     */
    renderKitConfiguration(config, kitName) {
        const pane = document.getElementById('tab-configuration');
        if (!pane) return;
        
        const hasFields = config.fields && config.fields.length > 0;
        const hasActions = config.actions && config.actions.length > 0;
        const hasBundles = config.bundles && config.bundles.length > 0;
        
        // New configuration format: fields + actions + bundles
        if (hasFields || hasActions || hasBundles) {
            pane.innerHTML = `
                <div class="kit-config-form" data-kit-name="${kitName}">
                    ${hasFields ? this.renderConfigurationFields(config.fields, config.values || {}) : ''}
                    ${hasBundles ? this.renderConfigurationBundles(config.bundles, kitName) : ''}
                    ${hasActions ? this.renderConfigurationActions(config.actions) : ''}
                </div>
            `;
            
            // Setup bundle toggle handlers
            if (hasBundles) {
                pane.querySelectorAll('.bundle-toggle-input').forEach(toggle => {
                    toggle.addEventListener('change', (e) => {
                        const bundleName = e.target.dataset.bundle;
                        const enabled = e.target.checked;
                        const card = e.target.closest('.config-bundle-card');
                        if (card) {
                            card.classList.toggle('disabled', !enabled);
                        }
                        // Track bundle changes for save
                        if (!this.kitBundleChanges) this.kitBundleChanges = {};
                        this.kitBundleChanges[bundleName] = enabled;
                    });
                });
            }
        } else {
            // Legacy fallback: schema-based rendering
            pane.innerHTML = `
                <div class="kit-config-form">
                    ${this.renderConfigFields(config.schema || {}, config.values || {})}
                </div>
            `;
        }
    }
    
    /**
     * Render configuration fields using intake-style form builders
     */
    renderConfigurationFields(fields, values) {
        if (!fields || fields.length === 0) return '';
        
        const actions = window.AICC?.actions;
        
        const fieldsHtml = fields.map(field => {
            const fieldId = `config-field-${field.name}`;
            const currentValue = values[field.name] ?? field.value ?? field.defaultValue ?? '';
            const required = field.validation?.required ? 'required' : '';
            const helpTextHtml = field.helpText
                ? `<span class="field-help-text">${field.helpText}</span>`
                : '';
            
            // Use intake field renderers for the input, then inject the value
            let inputHtml = '';
            const fieldWithValue = { ...field, placeholder: field.placeholder || '' };
            
            if (actions && actions.has(`intakeField.${field.type}`)) {
                inputHtml = actions.dispatch(`intakeField.${field.type}`, fieldWithValue, fieldId, required);
            } else if (actions) {
                inputHtml = actions.dispatch('intakeField._default', fieldWithValue, fieldId, required);
            } else {
                inputHtml = `<input type="text" id="${fieldId}" name="${field.name}" placeholder="${field.placeholder || ''}" ${required} />`;
            }
            
            // Inject current value into rendered HTML
            inputHtml = this.injectFieldValue(inputHtml, field, currentValue);
            
            const requiredMark = field.validation?.required
                ? '<span class="required-mark">*</span>'
                : '';
            
            return `
                <div class="form-group config-field-group">
                    <label for="${fieldId}">${field.label}${requiredMark}</label>
                    ${inputHtml}
                    ${helpTextHtml}
                </div>
            `;
        }).join('');
        
        return `
            <div class="config-fields-section">
                <h4 class="config-section-heading">
                    <span class="codicon codicon-settings-gear"></span> Fields
                </h4>
                ${fieldsHtml}
            </div>
        `;
    }
    
    /**
     * Inject a current value into a rendered field HTML string
     */
    injectFieldValue(html, field, value) {
        if (value === '' || value === null || value === undefined) return html;
        
        switch (field.type) {
            case 'toggle':
            case 'checkbox':
                if (value === true || value === 'true') {
                    return html.replace('<input ', '<input checked ');
                }
                return html;
            case 'select':
                // Mark the matching option as selected
                const escapedVal = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return html.replace(
                    new RegExp(`(<option\\s+value="${escapedVal}")>`),
                    '$1 selected>'
                );
            case 'textarea':
                return html.replace('></textarea>', `>${this.escapeHtml(String(value))}</textarea>`);
            case 'radio':
                const radioVal = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return html.replace(
                    new RegExp(`(value="${radioVal}")`),
                    '$1 checked'
                );
            case 'number':
                return html.replace(/(<input[^>]*?)(\s*\/?>)/, `$1 value="${value}"$2`);
            default:
                // text, email, url, date
                return html.replace(/(<input[^>]*?)(\s*\/?>)/, `$1 value="${this.escapeHtml(String(value))}"$2`);
        }
    }
    
    /**
     * Render configuration bundles section
     */
    renderConfigurationBundles(bundles, kitName) {
        if (!bundles || bundles.length === 0) return '';
        
        const bundleCards = bundles.map(bundle => {
            const assetCount = bundle.assets ? bundle.assets.length : 0;
            const isEnabled = bundle.enabled !== false;
            const icon = bundle.icon || 'package';
            
            // Group assets by type prefix
            const assetGroups = {};
            (bundle.assets || []).forEach(asset => {
                const type = asset.split('/')[0] || 'other';
                if (!assetGroups[type]) assetGroups[type] = [];
                assetGroups[type].push(asset);
            });
            
            const assetSummary = Object.entries(assetGroups).map(([type, items]) =>
                `<span class="asset-type-badge badge-${type}">${items.length} ${type}</span>`
            ).join(' ');
            
            const assetList = (bundle.assets || []).map(asset => {
                const type = asset.split('/')[0] || 'other';
                const name = asset.split('/').pop();
                return `<li class="bundle-asset-item"><span class="asset-type-dot dot-${type}"></span>${name}</li>`;
            }).join('');
            
            return `
                <div class="config-bundle-card ${isEnabled ? '' : 'disabled'}" data-bundle="${bundle.name}">
                    <div class="config-bundle-header">
                        <div class="config-bundle-info">
                            <span class="codicon codicon-${icon}"></span>
                            <span class="config-bundle-name">${bundle.name}</span>
                            <span class="config-bundle-count">${assetCount} assets</span>
                        </div>
                        <label class="bundle-toggle-label">
                            <input type="checkbox" class="bundle-toggle-input" data-bundle="${bundle.name}" ${isEnabled ? 'checked' : ''} />
                            <span class="bundle-toggle-slider"></span>
                        </label>
                    </div>
                    ${bundle.description ? `<p class="config-bundle-desc">${bundle.description}</p>` : ''}
                    <div class="config-bundle-summary">${assetSummary}</div>
                    <details class="config-bundle-details">
                        <summary>View assets</summary>
                        <ul class="bundle-asset-list">${assetList}</ul>
                    </details>
                </div>
            `;
        }).join('');
        
        return `
            <div class="config-bundles-section">
                <h4 class="config-section-heading">
                    <span class="codicon codicon-package"></span> Bundles
                </h4>
                ${bundleCards}
            </div>
        `;
    }
    
    /**
     * Render configuration actions section (read-only display)
     */
    renderConfigurationActions(actions) {
        if (!actions || actions.length === 0) return '';
        
        const actionTypeIcons = {
            'create': 'add',
            'edit': 'edit',
            'delete': 'trash',
            'bulk-edit': 'checklist',
            'bulk-delete': 'close-all',
            'sync': 'sync',
            'import': 'cloud-download',
            'export': 'cloud-upload'
        };
        
        const actionCards = actions.map(action => {
            const icon = actionTypeIcons[action.actionType] || 'play';
            const label = action.label || action.actionType;
            
            const conditionsHtml = (action.conditions || []).map(cond =>
                `<span class="action-condition"><code>${cond.field}</code> ${cond.operator} <code>${JSON.stringify(cond.value)}</code></span>`
            ).join(' <span class="condition-and">AND</span> ');
            
            return `
                <div class="config-action-card">
                    <div class="config-action-header">
                        <span class="codicon codicon-${icon}"></span>
                        <span class="config-action-type">${label}</span>
                    </div>
                    <div class="config-action-command"><code>${this.escapeHtml(action.command)}</code></div>
                    ${conditionsHtml ? `<div class="config-action-conditions"><strong>When:</strong> ${conditionsHtml}</div>` : ''}
                </div>
            `;
        }).join('');
        
        return `
            <div class="config-actions-section">
                <h4 class="config-section-heading">
                    <span class="codicon codicon-play"></span> Actions
                </h4>
                ${actionCards}
            </div>
        `;
    }
    
    /**
     * Load kit bundles tab (formerly components)
     */
    async loadKitComponents(kitName) {
        const pane = document.getElementById('tab-components');
        if (!pane) return;
        
        try {
            this.sendMessage('fetchData', {
                endpoint: 'aikit-components',
                params: { kitName }
            });
        } catch (error) {
            console.error('Failed to load kit bundles:', error);
            pane.innerHTML = '<div class="error-message">Failed to load bundles</div>';
        }
    }
    
    /**
     * Render kit bundles (formerly components)
     */
    renderKitComponents(bundles) {
        const pane = document.getElementById('tab-components');
        if (!pane) return;
        
        if (!bundles || bundles.length === 0) {
            pane.innerHTML = '<p class="no-bundles-message">No bundles available for this kit.</p>';
            return;
        }
        
        const bundleItems = bundles.map(bundle => {
            const assetCount = bundle.assets ? bundle.assets.length : 0;
            const isChecked = bundle.enabled !== false;
            
            return `
                <div class="bundle-item">
                    <label class="bundle-label">
                        <input type="checkbox" 
                               class="bundle-checkbox" 
                               data-bundle="${bundle.name}" 
                               ${isChecked ? 'checked' : ''} />
                        <span class="bundle-name">${bundle.name}</span>
                        <span class="bundle-asset-count">(${assetCount} assets)</span>
                    </label>
                </div>
            `;
        }).join('');
        
        pane.innerHTML = `
            <div class="kit-bundles-list">
                ${bundleItems}
            </div>
        `;
        
        // Setup bundle checkboxes
        pane.querySelectorAll('.bundle-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const bundleName = e.target.dataset.bundle;
                const isChecked = e.target.checked;
                this.toggleBundle(bundleName, isChecked);
            });
        });
    }
    
    /**
     * Render settings fields
     */
    renderSettingsFields(schema, values) {
        if (!schema.properties) return '<p>No settings available</p>';
        
        return Object.entries(schema.properties).map(([key, field]) => {
            const value = values[key] || field.default || '';
            return `
                <div class="form-group">
                    <label for="setting-${key}">${field.description || key}</label>
                    ${this.renderFieldInput(key, field, value, 'setting')}
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render config fields
     */
    renderConfigFields(schema, values) {
        if (!schema.properties) return '<p>No configuration available</p>';
        
        return Object.entries(schema.properties).map(([key, field]) => {
            const value = values[key] || field.default || '';
            return `
                <div class="form-group">
                    <label for="config-${key}">${field.description || key}</label>
                    ${this.renderFieldInput(key, field, value, 'config')}
                </div>
            `;
        }).join('');
    }
    
    /**
     * Render field input based on type
     */
    renderFieldInput(key, field, value, prefix) {
        const actions = window.AICC?.actions;
        if (actions) {
            // Determine the renderer key: enum is a special case
            const rendererKey = field.enum ? 'enum' : (field.type || '_default');
            return actions.dispatchWithFallback('formField', rendererKey, key, field, value, prefix);
        }
        // Fallback if actions library not loaded
        const id = `${prefix}-${key}`;
        return `<input type="text" id="${id}" name="${key}" value="${value}" class="form-control" />`;
    }
    
    /**
     * Toggle bundle enabled state
     */
    toggleBundle(bundleName, enabled) {
        if (!this.kitBundleChanges) {
            this.kitBundleChanges = {};
        }
        this.kitBundleChanges[bundleName] = enabled;
    }
    
    /**
     * Install kit
     */
    async installKit(kitName) {
        try {
            this.sendMessage('executeAction', {
                command: 'aicc.installKit',
                args: [kitName]
            });
        } catch (error) {
            console.error('Failed to install kit:', error);
            this.showError('Failed to install kit');
        }
    }
    
    /**
     * Save kit settings
     */
    async saveKitSettings(kitName) {
        try {
            // Collect form values
            const settingsPane = document.getElementById('tab-settings');
            const configPane = document.getElementById('tab-configuration');
            
            const settings = this.collectFormValues(settingsPane, 'setting');
            
            // Collect kit configuration field values (from Settings tab, prefixed kitcfg-)
            const configFieldValues = this.collectFormValues(settingsPane, 'kitcfg');
            
            // Collect config values from both old and new format (Configuration tab)
            const config = {
                ...this.collectFormValues(configPane, 'config'),
                ...this.collectFormValues(configPane, 'config-field')
            };
            
            this.sendMessage('saveKitSettings', {
                kitName,
                settings,
                config,
                configFieldValues,
                componentChanges: this.kitComponentChanges || {},
                bundleChanges: this.kitBundleChanges || {}
            });
            
            // Close modal
            document.getElementById('modal-overlay').style.display = 'none';
            
            // Reset changes
            this.kitComponentChanges = {};
            this.kitBundleChanges = {};
        } catch (error) {
            console.error('Failed to save kit settings:', error);
            this.showError('Failed to save settings');
        }
    }
    
    /**
     * Collect form values
     */
    collectFormValues(pane, prefix) {
        if (!pane) return {};
        
        const values = {};
        pane.querySelectorAll(`[id^="${prefix}-"]`).forEach(input => {
            const key = input.name;
            if (input.type === 'checkbox') {
                values[key] = input.checked;
            } else if (input.type === 'number') {
                values[key] = parseFloat(input.value);
            } else {
                values[key] = input.value;
            }
        });
        
        return values;
    }
    
    /**
     * Format last updated date
     */
    formatLastUpdated(timestamp) {
        return window.AICC?.utils?.formatTimestamp(timestamp) || 'Never';
    }
    
    /**
     * Show AI Kit error
     */
    showAIKitError(message) {
        const grid = document.getElementById('catalog-grid');
        if (grid) {
            grid.innerHTML = `<div class="error-message">${message}</div>`;
        }
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
     * Toggle developer mode (AICC-0502)
     */
    toggleDevMode() {
        this.devModeEnabled = !this.devModeEnabled;
        this._applyDevModeVisibility();
        // Persist state via backend (AICC-0505)
        this.sendMessage('setDevMode', { enabled: this.devModeEnabled });
    }

    /**
     * Apply developer mode visibility to tabs and header buttons (AICC-0503 / AICC-0504)
     */
    _applyDevModeVisibility() {
        const icon = document.getElementById('dev-toggle-icon');
        const btn = document.getElementById('btn-dev-toggle');
        if (icon && btn) {
            if (this.devModeEnabled) {
                icon.className = 'codicon codicon-eye';
                btn.style.color = '';
                btn.title = 'Hide Developer Tabs';
            } else {
                icon.className = 'codicon codicon-eye-closed';
                btn.style.color = '#ef4444';
                btn.title = 'Show Developer Tabs';
            }
        }

        // Toggle dev-only tabs (AICC-0503)
        document.querySelectorAll('[data-dev-tab="true"]').forEach(tab => {
            tab.style.display = this.devModeEnabled ? '' : 'none';
        });

        // Toggle dev-only header buttons (AICC-0504)
        document.querySelectorAll('[data-dev-btn="true"]').forEach(btn => {
            btn.style.display = this.devModeEnabled ? '' : 'none';
        });

        // If currently on a hidden tab, switch to first visible tab
        if (!this.devModeEnabled) {
            const devTabIds = new Set(['component-catalog', 'api-docs', 'mcp']);
            if (devTabIds.has(this.currentPanelId)) {
                this.handleTabClick('planning');
            }
        }
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
        return window.AICC?.utils?.getTypeIcon(type) || 'file';
    }
    
    /**
     * Utility: Get priority icon
     */
    getPriorityIcon(priority) {
        return window.AICC?.utils?.getPriorityIcon(priority) || '';
    }
    
    /**
     * Utility: Normalize status (deprecated - now using uppercase directly)
     */
    normalizeStatus(status) {
        return window.AICC?.utils?.normalizeStatus(status) || status || 'BACKLOG';
    }
    
    /**
     * Utility: Escape HTML
     */
    escapeHtml(str) {
        return window.AICC?.utils?.escapeHtml(str) || '';
    }

    // ─── Non-Disruptive Refresh (AICC-0430) ────────────────────────────

    /**
     * Capture current UI state snapshot for non-disruptive refresh
     */
    captureUIStateSnapshot() {
        const container = document.querySelector('.accordion-list');
        const snapshot = {
            scrollTop: container ? container.scrollTop : 0,
            expandedItems: new Set(this.expandedItems),
            activeSubTabs: new Map(),
            activeStatuses: [...this.activeStatuses],
            filterText: this.filterText,
            dirtyEditItemIds: new Set()
        };

        // Capture active sub-tab per expanded item
        this.expandedItems.forEach(itemId => {
            const activeBtn = document.querySelector(
                `.accordion-tab-btn.active[data-item-id="${itemId}"]`
            );
            if (activeBtn) {
                snapshot.activeSubTabs.set(itemId, activeBtn.dataset.tab);
            }
        });

        // Detect dirty edit forms (forms with unsaved changes)
        document.querySelectorAll('.accordion-item.expanded').forEach(el => {
            const itemId = el.dataset.id;
            const editTab = el.querySelector('.tab-pane[data-tab="edit"]');
            if (editTab) {
                const inputs = editTab.querySelectorAll('input, textarea, select');
                inputs.forEach(input => {
                    if (input.dataset.originalValue !== undefined && input.value !== input.dataset.originalValue) {
                        snapshot.dirtyEditItemIds.add(itemId);
                    }
                });
            }
        });

        return snapshot;
    }

    /**
     * Handle planUpdated message with in-place DOM updates
     */
    handlePlanUpdated(payload) {
        // Store new data
        this.panelData.planDocument = payload.planDocument;
        this.panelData.statusCounts = payload.statusCounts;
        const delta = payload.delta;

        // If no delta or too many changes, fall back to full re-render
        if (!delta || (delta.added.length + delta.removed.length + delta.modified.length) > 50) {
            this.renderCurrentPanel();
            return;
        }

        // If not on planning panel, just update data (no DOM changes needed)
        if (this.currentPanelId !== 'planning') {
            return;
        }

        // Capture UI state before updates
        const snapshot = this.captureUIStateSnapshot();

        // Handle modified items — update in-place
        delta.modified.forEach(itemId => {
            const item = payload.planDocument.items.find(i => i.id === itemId);
            if (!item) return;

            // Skip if item has dirty edits (conflict handling in AICC-0436)
            if (snapshot.dirtyEditItemIds.has(itemId)) return;

            const el = document.querySelector(`.accordion-item[data-id="${itemId}"]`);
            if (!el) return;

            // Update status bullet
            const statusColor = this.statusColors[item.status] || this.statusColors[this.normalizeStatus(item.status)] || '#6b7280';
            const bullet = el.querySelector('.status-bullet');
            if (bullet) {
                bullet.style.backgroundColor = statusColor;
                bullet.title = `Status: ${item.status.toUpperCase()}`;
            }

            // Update summary text
            const summary = el.querySelector('.summary');
            if (summary) summary.textContent = item.summary;

            // Update ID text
            const idSpan = el.querySelector('.id');
            if (idSpan) idSpan.textContent = item.projectNumber || item.id;

            // If expanded with content tabs, rebuild content
            if (this.expandedItems.has(itemId)) {
                const contentEl = el.querySelector('.accordion-content');
                if (contentEl) {
                    contentEl.innerHTML = this.buildAccordionContentTabs(item) +
                        (item.children && item.children.length > 0 ?
                            this.buildChildrenList(item, payload.planDocument.items, 0) : '');
                }
            }
        });

        // Handle removed items
        delta.removed.forEach(itemId => {
            const el = document.querySelector(`.accordion-item[data-id="${itemId}"]`);
            if (el) el.remove();
            this.expandedItems.delete(itemId);
        });

        // Handle added items — fall back to full re-render for simplicity
        if (delta.added.length > 0) {
            this.renderCurrentPanel();
            this.restoreUIState(snapshot);
            return;
        }

        // Update status badge counts in filter bar
        this.updateStatusBadgeCounts(payload.statusCounts);

        // Restore UI state
        this.restoreUIState(snapshot);
    }

    /**
     * Update status badge counts without full re-render
     */
    updateStatusBadgeCounts(statusCounts) {
        if (!statusCounts) return;

        document.querySelectorAll('.status-badge').forEach(badge => {
            const status = badge.dataset.status;
            if (status && statusCounts[status] !== undefined) {
                const countEl = badge.querySelector('.badge-count');
                if (countEl) countEl.textContent = String(statusCounts[status]);
            }
        });

        // Update progress bar if present
        const total = Object.values(statusCounts).reduce((s, v) => s + v, 0);
        const done = statusCounts['DONE'] || statusCounts['done'] || 0;
        const progressBar = document.querySelector('.progress-fill');
        if (progressBar && total > 0) {
            progressBar.style.width = `${Math.round((done / total) * 100)}%`;
        }
    }

    /**
     * Restore UI state after a re-render
     */
    restoreUIState(snapshot) {
        // 1. Restore expanded items
        snapshot.expandedItems.forEach(itemId => {
            this.expandedItems.add(itemId);
        });

        // 2. Restore active sub-tabs
        snapshot.activeSubTabs.forEach((tab, itemId) => {
            this.switchTab(itemId, tab);
        });

        // 3. Restore scroll position
        const container = document.querySelector('.accordion-list');
        if (container) {
            requestAnimationFrame(() => {
                container.scrollTop = snapshot.scrollTop;
            });
        }

        // 4. Re-apply filters (already preserved in this.activeStatuses and this.filterText)

        // 5. Show conflict indicators for dirty items that were modified externally
        snapshot.dirtyEditItemIds.forEach(itemId => {
            const el = document.querySelector(`.accordion-item[data-id="${itemId}"]`);
            if (!el) return;

            // Item was already filtered in handlePlanUpdated (dirty items skipped)
            this.showConflictBanner(itemId, el);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Scheduler Tab (AICC-0219 / 0220 / 0221)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Render the Scheduler tab content
     */
    renderSchedulerTab() {
        const content = document.getElementById('panel-content');
        if (!content) return;

        // Request tasks from backend on first render
        if (!this.schedulerLoaded) {
            this.sendMessage('getSchedulerTasks');
        }

        const rows = this.schedulerTasks.map(t => {
            const statusClass = t.enabled ? t.status : 'paused';
            const statusLabel = t.enabled ? t.status.charAt(0).toUpperCase() + t.status.slice(1) : 'Paused';
            const lastRunStr = t.lastRun ? new Date(t.lastRun).toLocaleString() : '—';

            return `
                <tr data-sched-id="${t.id}">
                    <td>${this.escapeSchedulerHtml(t.name)}</td>
                    <td>${this.escapeSchedulerHtml(t.schedule)}</td>
                    <td><code>${this.escapeSchedulerHtml(t.actionId)}</code></td>
                    <td><span class="scheduler-status ${statusClass}">● ${statusLabel}</span></td>
                    <td class="scheduler-countdown" data-next-run="${t.nextRun || ''}">${t.enabled && t.nextRun ? this.formatCountdown(t.nextRun) : '—'}</td>
                    <td>${lastRunStr}</td>
                    <td class="scheduler-actions">
                        <button title="Edit" onclick="app.showSchedulerModal('${t.id}')"><span class="codicon codicon-edit"></span></button>
                        <button title="${t.enabled ? 'Pause' : 'Resume'}" onclick="app.toggleSchedulerTask('${t.id}')"><span class="codicon codicon-${t.enabled ? 'debug-pause' : 'play'}"></span></button>
                        <button title="Delete" onclick="app.deleteSchedulerTask('${t.id}')"><span class="codicon codicon-trash"></span></button>
                    </td>
                </tr>
            `;
        }).join('');

        const tableHTML = this.schedulerTasks.length > 0 ? `
            <table class="scheduler-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Schedule</th>
                        <th>Action</th>
                        <th>Status</th>
                        <th>Next Run</th>
                        <th>Last Run</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        ` : `
            <div class="scheduler-empty">
                <span class="codicon codicon-clock"></span>
                No scheduled tasks. Click <strong>Add Task</strong> to create one.
            </div>
        `;

        content.innerHTML = `
            <div class="scheduler-container">
                <div class="scheduler-header">
                    <h3>Scheduled Tasks</h3>
                    <button class="btn-add-task" onclick="app.showSchedulerModal()">
                        <span class="codicon codicon-add"></span> Add Task
                    </button>
                </div>
                ${tableHTML}
            </div>
        `;

        // Start countdown interval
        this.startSchedulerCountdowns();
    }

    /**
     * Show scheduler task create/edit modal (AICC-0220)
     */
    showSchedulerModal(taskId) {
        const task = taskId ? this.schedulerTasks.find(t => t.id === taskId) : null;
        const isEdit = !!task;

        // Build action options — use known built-in actions
        const knownActions = [
            { id: 'plan.create', label: 'plan.create — Create plan item' },
            { id: 'plan.update', label: 'plan.update — Update plan item' },
            { id: 'plan.updateStatus', label: 'plan.updateStatus — Update status' },
            { id: 'plan.delete', label: 'plan.delete — Delete plan item' },
            { id: 'plan.archive', label: 'plan.archive — Archive items' },
            { id: 'plan.sync', label: 'plan.sync — Jira sync' },
            { id: 'plan.reload', label: 'plan.reload — Reload PLAN.json' },
            { id: 'ideation.jiraSync', label: 'ideation.jiraSync — Ideation Jira Sync' }
        ];

        // If editing a task with an unknown action, include it
        if (task && task.actionId && !knownActions.find(a => a.id === task.actionId)) {
            knownActions.push({ id: task.actionId, label: `${task.actionId} — Custom` });
        }

        const actionOptions = knownActions.map(a =>
            `<option value="${a.id}" ${task && task.actionId === a.id ? 'selected' : ''}>${a.label}</option>`
        ).join('');

        const modalBody = `
            <div class="scheduler-form">
                <div class="form-group">
                    <label for="sched-name">Name</label>
                    <input type="text" id="sched-name" placeholder="e.g., Nightly Archive" value="${task ? this.escapeSchedulerHtml(task.name) : ''}" />
                </div>
                <div class="form-group">
                    <label for="sched-pattern">Schedule Pattern</label>
                    <input type="text" id="sched-pattern" placeholder="e.g., */30 * * * * or 'Every 30 min'" value="${task ? this.escapeSchedulerHtml(task.schedule) : ''}" />
                </div>
                <div class="form-group">
                    <label for="sched-action">Action ID</label>
                    <select id="sched-action">
                        <option value="">-- Select Action --</option>
                        ${actionOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="sched-params">Parameters (JSON)</label>
                    <textarea id="sched-params" placeholder='{"key": "value"}'>${task ? this.escapeSchedulerHtml(task.params || '{}') : '{}'}</textarea>
                </div>
                <div class="form-group toggle-row">
                    <input type="checkbox" id="sched-enabled" ${!task || task.enabled ? 'checked' : ''} />
                    <label for="sched-enabled" style="margin-bottom:0">Enabled</label>
                </div>
                <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                    <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Cancel</button>
                    <button class="modal-btn modal-btn-primary" onclick="app.saveSchedulerTask('${taskId || ''}')">
                        ${isEdit ? 'Update' : 'Create'}
                    </button>
                </div>
            </div>
        `;

        this.showModal(isEdit ? `Edit Task: ${task.name}` : 'New Scheduled Task', modalBody);
    }

    /**
     * Save (create or update) a scheduler task from the modal form
     */
    saveSchedulerTask(taskId) {
        const name = document.getElementById('sched-name')?.value?.trim();
        const schedule = document.getElementById('sched-pattern')?.value?.trim();
        const actionId = document.getElementById('sched-action')?.value;
        const paramsStr = document.getElementById('sched-params')?.value?.trim() || '{}';
        const enabled = document.getElementById('sched-enabled')?.checked ?? true;

        if (!name || !schedule || !actionId) {
            return; // basic guard
        }

        let params = {};
        try { params = JSON.parse(paramsStr); } catch (_) { /* keep empty */ }

        // Determine schedule type and value for the engine
        const isCron = /[\*\/]/.test(schedule);
        const scheduleType = isCron ? 'cron' : 'interval';
        let scheduleValue = schedule;
        if (!isCron) {
            // Parse human-readable like "Every 30 min" → milliseconds
            const match = schedule.match(/(\d+)\s*(s|sec|min|h|hr|hour|d|day)/i);
            if (match) {
                const num = parseInt(match[1], 10);
                const unit = match[2].toLowerCase();
                const multipliers = { s: 1000, sec: 1000, min: 60000, h: 3600000, hr: 3600000, hour: 3600000, d: 86400000, day: 86400000 };
                scheduleValue = String(num * (multipliers[unit] || 60000));
            }
        }

        if (taskId) {
            // Update existing — remove and re-add via backend
            this.sendMessage('removeSchedulerTask', { id: taskId });
            const task = {
                id: taskId,
                name,
                actionId,
                params,
                scheduleType,
                scheduleValue,
                enabled,
                lastRun: null,
                lastResult: null,
                lastError: null,
                nextRun: null,
                createdAt: new Date().toISOString()
            };
            this.sendMessage('addSchedulerTask', task);
        } else {
            // Create new
            const newTask = {
                id: 'sched-' + Date.now(),
                name,
                actionId,
                params,
                scheduleType,
                scheduleValue,
                enabled,
                lastRun: null,
                lastResult: null,
                lastError: null,
                nextRun: null,
                createdAt: new Date().toISOString()
            };
            this.sendMessage('addSchedulerTask', newTask);
        }

        this.closeModal();
        // Tasks will refresh via schedulerTasks message from backend
        this.sendMessage('getSchedulerTasks');
    }

    /**
     * Toggle enabled state of a scheduler task
     */
    toggleSchedulerTask(taskId) {
        const task = this.schedulerTasks.find(t => t.id === taskId);
        if (!task) return;
        const newEnabled = !task.enabled;
        this.sendMessage('toggleSchedulerTask', { id: taskId, enabled: newEnabled });
        // Optimistic update for responsiveness
        task.enabled = newEnabled;
        task.status = newEnabled ? 'active' : 'paused';
        this.renderSchedulerTab();
    }

    /**
     * Delete a scheduler task
     */
    deleteSchedulerTask(taskId) {
        this.sendMessage('removeSchedulerTask', { id: taskId });
        this.schedulerTasks = this.schedulerTasks.filter(t => t.id !== taskId);
        this.renderSchedulerTab();
    }

    /**
     * Handle scheduler tasks loaded from backend (.my/aicc/tasks.json)
     */
    handleSchedulerTasksLoaded(tasks) {
        // Map engine ScheduledTask format to UI display format
        this.schedulerTasks = (tasks || []).map(t => {
            // Build human-readable schedule string
            let schedule = t.scheduleValue || '';
            if (t.scheduleType === 'interval') {
                const ms = parseInt(t.scheduleValue, 10);
                if (!isNaN(ms)) {
                    if (ms >= 86400000) schedule = `Every ${Math.round(ms / 86400000)} day(s)`;
                    else if (ms >= 3600000) schedule = `Every ${Math.round(ms / 3600000)} hour(s)`;
                    else if (ms >= 60000) schedule = `Every ${Math.round(ms / 60000)} min`;
                    else schedule = `Every ${Math.round(ms / 1000)} sec`;
                }
            } else if (t.scheduleType === 'cron') {
                schedule = t.scheduleValue;
            }
            return {
                id: t.id,
                name: t.name,
                schedule,
                actionId: t.actionId,
                params: typeof t.params === 'object' ? JSON.stringify(t.params) : (t.params || '{}'),
                status: t.enabled ? (t.lastResult === 'error' ? 'error' : 'active') : 'paused',
                nextRun: t.nextRun ? new Date(t.nextRun).getTime() : null,
                lastRun: t.lastRun,
                enabled: t.enabled,
                // Preserve engine fields for round-trip
                scheduleType: t.scheduleType,
                scheduleValue: t.scheduleValue
            };
        });
        this.schedulerLoaded = true;
        if (this.currentPanelId === 'scheduler') {
            this.renderSchedulerTab();
        }
    }

    /**
     * Start live countdown interval (AICC-0221)
     */
    startSchedulerCountdowns() {
        // Clear any existing interval
        if (this.schedulerCountdownInterval) {
            clearInterval(this.schedulerCountdownInterval);
        }
        this.schedulerCountdownInterval = setInterval(() => this.updateSchedulerCountdowns(), 1000);
    }

    /**
     * Update all countdown cells every second
     */
    updateSchedulerCountdowns() {
        const cells = document.querySelectorAll('.scheduler-countdown[data-next-run]');
        cells.forEach(cell => {
            const nextRun = parseInt(cell.getAttribute('data-next-run'), 10);
            if (!nextRun || isNaN(nextRun)) {
                cell.textContent = '—';
                return;
            }
            cell.textContent = this.formatCountdown(nextRun);
        });
    }

    /**
     * Format a countdown string from a target timestamp
     */
    formatCountdown(targetMs) {
        const diff = targetMs - Date.now();
        if (diff <= 0) return 'now';
        const totalSec = Math.floor(diff / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    /**
     * HTML-escape helper for scheduler content
     */
    escapeSchedulerHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ══════════════════════════════════════════════════════════════════════
    //  Jira Configuration Tab (AICC-0081)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Render the Jira configuration tab (AICC-0230)
     */
    renderJiraTab() {
        const content = document.getElementById('panel-content');
        if (!content) return;

        // Request saved config from backend
        this.sendMessage('getJiraConfig');
        this.sendMessage('getJiraSyncConfig');  // REQ-JIRACFG-018

        const cfg = this.jiraConfig || {};
        const statusClass = this.jiraConnectionStatus || 'disconnected';
        const lastSync = this.jiraLastSyncTime
            ? new Date(this.jiraLastSyncTime).toLocaleString()
            : 'Never';

        content.innerHTML = `
            <div class="jira-container">
                <h3 style="margin:0 0 12px;font-size:14px;display:flex;align-items:center;gap:6px;">
                    <span class="codicon codicon-issues"></span> Jira Configuration
                </h3>

                <!-- Connection Section (AICC-0231) -->
                <div class="jira-accordion">
                    <div class="jira-accordion-header expanded" data-section="connection">
                        <span>Connection</span>
                        <span class="codicon codicon-chevron-right chevron"></span>
                    </div>
                    <div class="jira-accordion-body show" data-section="connection">
                        <div class="jira-form-group">
                            <label for="jira-baseUrl">Base URL</label>
                            <input type="url" id="jira-baseUrl" placeholder="https://your-domain.atlassian.net" value="${this.escapeSchedulerHtml(cfg.baseUrl || '')}" />
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-email">Email</label>
                            <input type="email" id="jira-email" placeholder="you@example.com" value="${this.escapeSchedulerHtml(cfg.email || '')}" />
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-apiToken">API Token</label>
                            <div style="display:flex;gap:4px;">
                                <input type="password" id="jira-apiToken" placeholder="••••••••" value="${this.escapeSchedulerHtml(cfg.apiToken || '')}" style="flex:1;" />
                                <button class="jira-btn jira-btn-secondary" id="jira-toggle-token" title="Show/Hide">
                                    <span class="codicon codicon-eye"></span>
                                </button>
                            </div>
                        </div>
                        <div id="jira-connection-errors" style="color:#ef4444;font-size:12px;margin-bottom:8px;display:none;"></div>
                        <div style="display:flex;gap:8px;">
                            <button class="jira-btn jira-btn-primary" id="jira-save-config">Save</button>
                            <button class="jira-btn jira-btn-secondary" id="jira-test-connection">Test Connection</button>
                        </div>
                        <div id="jira-connection-result" style="margin-top:8px;font-size:12px;display:none;"></div>
                    </div>
                </div>

                <!-- Project Section (AICC-0233) -->
                <div class="jira-accordion">
                    <div class="jira-accordion-header" data-section="project">
                        <span>Project</span>
                        <span class="codicon codicon-chevron-right chevron"></span>
                    </div>
                    <div class="jira-accordion-body" data-section="project">
                        <div class="jira-form-group">
                            <label for="jira-projectKey">Project Key</label>
                            <div style="display:flex;gap:4px;">
                                <input type="text" id="jira-projectKey" placeholder="e.g., AICC" value="${this.escapeSchedulerHtml(cfg.projectKey || '')}" style="flex:1;" />
                                <button class="jira-btn jira-btn-secondary" id="jira-lookup-projects">Lookup</button>
                            </div>
                        </div>
                        <div id="jira-projects-list" style="margin-top:8px;display:none;">
                            <label>Select Project:</label>
                            <select id="jira-project-select" style="width:100%;padding:6px 8px;font-size:13px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
                                <option value="">-- Select --</option>
                            </select>
                        </div>
                        <div id="jira-project-info" style="margin-top:8px;font-size:12px;display:none;"></div>
                    </div>
                </div>

                <!-- Sync Configuration (unified — AICC-0232) -->
                <div class="jira-accordion">
                    <div class="jira-accordion-header" data-section="sync">
                        <span>Sync Configuration</span>
                        <span class="codicon codicon-chevron-right chevron"></span>
                    </div>
                    <div class="jira-accordion-body" data-section="sync">
                        <div class="jira-form-group">
                            <label for="jira-syncStrategy">Sync Strategy</label>
                            <select id="jira-syncStrategy">
                                <option value="push" ${cfg.syncStrategy === 'push' ? 'selected' : ''}>Push (Local → Jira)</option>
                                <option value="pull" ${cfg.syncStrategy === 'pull' || !cfg.syncStrategy ? 'selected' : ''}>Pull (Jira → Local)</option>
                                <option value="bidirectional" ${cfg.syncStrategy === 'bidirectional' ? 'selected' : ''}>Bidirectional</option>
                            </select>
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-conflictResolution">Conflict Resolution</label>
                            <select id="jira-conflictResolution">
                                <option value="local-wins" ${cfg.conflictResolution === 'local-wins' ? 'selected' : ''}>Local Wins</option>
                                <option value="remote-wins" ${cfg.conflictResolution === 'remote-wins' || !cfg.conflictResolution ? 'selected' : ''}>Remote Wins</option>
                                <option value="manual" ${cfg.conflictResolution === 'manual' ? 'selected' : ''}>Manual</option>
                                <option value="merge" ${cfg.conflictResolution === 'merge' ? 'selected' : ''}>Merge</option>
                            </select>
                        </div>
                        <div class="jira-form-group">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                <input type="checkbox" id="jira-autoSync" ${cfg.autoSync ? 'checked' : ''} />
                                Auto-sync enabled
                            </label>
                        </div>
                        <div class="jira-form-group" id="jira-interval-group" style="${cfg.autoSync ? '' : 'display:none;'}">
                            <label for="jira-syncInterval">Sync Interval (minutes)</label>
                            <input type="number" id="jira-syncInterval" min="1" max="1440" value="${cfg.syncInterval || 30}" />
                        </div>
                        <div class="jira-form-group">
                            <label style="font-weight:600;margin-bottom:6px;">Issue Type Filters</label>
                            <div class="jira-filter-group">
                                <label><input type="checkbox" class="jira-issue-filter" value="Epic" ${cfg.issueTypeFilters?.epic !== false ? 'checked' : ''} /> Epic</label>
                                <label><input type="checkbox" class="jira-issue-filter" value="Story" ${cfg.issueTypeFilters?.story !== false ? 'checked' : ''} /> Story</label>
                                <label><input type="checkbox" class="jira-issue-filter" value="Task" ${cfg.issueTypeFilters?.task !== false ? 'checked' : ''} /> Task</label>
                                <label><input type="checkbox" class="jira-issue-filter" value="Bug" ${cfg.issueTypeFilters?.bug !== false ? 'checked' : ''} /> Bug</label>
                            </div>
                        </div>
                        <div class="jira-form-group">
                            <label style="font-weight:600;margin-bottom:6px;">Status Filter</label>
                            <div class="jira-filter-group">
                                ${['To Do', 'In Progress', 'In Review', 'Done', 'Blocked'].map(s =>
                                    `<label><input type="checkbox" class="jira-sync-status-filter" value="${s}" ${(cfg.statusFilter || []).includes(s) ? 'checked' : ''} /> ${s}</label>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-sync-assignee">Assignee Filter</label>
                            <input type="text" id="jira-sync-assignee" placeholder="e.g., currentUser() or username" value="${this.escapeSchedulerHtml(cfg.assigneeFilter || '')}" />
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-sync-sprint">Sprint Filter</label>
                            <input type="text" id="jira-sync-sprint" placeholder="e.g., openSprints() or sprint name" value="${this.escapeSchedulerHtml(cfg.sprintFilter || '')}" />
                        </div>
                        <div class="jira-form-group">
                            <label style="font-weight:600;margin-bottom:6px;">Labels Filter</label>
                            <div class="jira-filter-group">
                                <input type="text" id="jira-sync-labels" placeholder="Comma-separated labels" value="${this.escapeSchedulerHtml((cfg.labelsFilter || []).join(', '))}" />
                            </div>
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-sync-daterange">Updated Since</label>
                            <input type="text" id="jira-sync-daterange" placeholder="e.g., -7d or 2026-01-01" value="${this.escapeSchedulerHtml(cfg.dateRange || '')}" />
                        </div>
                        <div class="jira-form-group">
                            <label for="jira-sync-jql">Custom JQL (appended)</label>
                            <input type="text" id="jira-sync-jql" placeholder="e.g., component = Frontend" value="${this.escapeSchedulerHtml(cfg.jql || '')}" />
                        </div>
                        <div style="display:flex;gap:8px;margin-top:8px;">
                            <button class="jira-btn jira-btn-primary" id="jira-save-sync-settings">Save Sync Configuration</button>
                            <button class="jira-btn jira-btn-secondary" id="jira-preview-jql">Preview JQL</button>
                        </div>
                        <div id="jira-jql-preview" style="display:none;margin-top:8px;padding:8px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px;font-family:monospace;font-size:11px;word-break:break-all;"></div>
                    </div>
                </div>

                <!-- Status Section (AICC-0237) -->
                <div class="jira-accordion">
                    <div class="jira-accordion-header" data-section="status">
                        <span>Status</span>
                        <span class="codicon codicon-chevron-right chevron"></span>
                    </div>
                    <div class="jira-accordion-body" data-section="status">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                            <span>Connection:</span>
                            <span class="jira-status-badge ${statusClass}">
                                <span>●</span>
                                ${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}
                            </span>
                        </div>
                        <div style="margin-bottom:8px;font-size:12px;">
                            <span style="opacity:0.7;">Last sync:</span> ${lastSync}
                        </div>
                        <div id="jira-sync-summary" style="font-size:12px;margin-bottom:8px;"></div>
                        <div class="jira-sync-progress" id="jira-sync-progress" style="display:none;">
                            <div style="font-size:12px;margin-bottom:4px;" id="jira-sync-phase">Syncing...</div>
                            <div class="progress-bar">
                                <div class="progress-bar-fill" id="jira-sync-progress-fill" style="width:0%;"></div>
                            </div>
                        </div>
                        <div id="jira-sync-errors" style="margin-top:8px;display:none;">
                            <div style="color:#ef4444;font-size:12px;cursor:pointer;" id="jira-errors-toggle">
                                <span class="codicon codicon-warning"></span> <span id="jira-error-count">0</span> error(s) — click to expand
                            </div>
                            <div id="jira-errors-detail" style="display:none;margin-top:4px;font-size:11px;max-height:150px;overflow-y:auto;padding:8px;background:var(--vscode-editor-background);border-radius:4px;border:1px solid var(--vscode-panel-border);"></div>
                        </div>
                        <div style="margin-top:12px;">
                            <button class="jira-btn jira-btn-primary" id="jira-sync-now">
                                <span class="codicon codicon-sync"></span> Sync Now
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._attachJiraEventListeners();
    }

    /**
     * Attach event listeners for the Jira tab
     */
    _attachJiraEventListeners() {
        // Accordion toggle
        document.querySelectorAll('.jira-accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('expanded');
                const section = header.getAttribute('data-section');
                const body = document.querySelector(`.jira-accordion-body[data-section="${section}"]`);
                if (body) body.classList.toggle('show');
            });
        });

        // Token show/hide toggle
        document.getElementById('jira-toggle-token')?.addEventListener('click', () => {
            const input = document.getElementById('jira-apiToken');
            if (input) {
                input.type = input.type === 'password' ? 'text' : 'password';
            }
        });

        // Save config (AICC-0231)
        document.getElementById('jira-save-config')?.addEventListener('click', () => {
            this._saveJiraConfig();
        });

        // Test connection (AICC-0234)
        document.getElementById('jira-test-connection')?.addEventListener('click', () => {
            this._testJiraConnection();
        });

        // Lookup projects (AICC-0233)
        document.getElementById('jira-lookup-projects')?.addEventListener('click', () => {
            this.sendMessage('jiraLookupProjects');
        });

        // Project select
        document.getElementById('jira-project-select')?.addEventListener('change', (e) => {
            const selected = e.target.options[e.target.selectedIndex];
            if (selected && selected.value) {
                document.getElementById('jira-projectKey').value = selected.value;
                const info = document.getElementById('jira-project-info');
                if (info) {
                    info.style.display = 'block';
                    info.innerHTML = `<span class="codicon codicon-check" style="color:#22c55e;"></span> Selected: <strong>${selected.textContent}</strong> (${selected.value})`;
                }
            }
        });

        // Auto-sync toggle
        document.getElementById('jira-autoSync')?.addEventListener('change', (e) => {
            const intervalGroup = document.getElementById('jira-interval-group');
            if (intervalGroup) {
                intervalGroup.style.display = e.target.checked ? '' : 'none';
            }
        });

        // Save sync settings (unified — AICC-0232 / REQ-JIRACFG-016)
        document.getElementById('jira-save-sync-settings')?.addEventListener('click', () => {
            this._saveJiraSyncSettings();
        });

        // Preview JQL button (REQ-JIRACFG-019)
        document.getElementById('jira-preview-jql')?.addEventListener('click', () => {
            const jql = this._composeJqlFromFields();
            const preview = document.getElementById('jira-jql-preview');
            if (preview) {
                preview.textContent = jql || '(empty — no filters set)';
                preview.style.display = 'block';
            }
        });

        // Sync Now (AICC-0235)
        document.getElementById('jira-sync-now')?.addEventListener('click', () => {
            this.sendMessage('triggerJiraSync');
        });

        // Error toggle
        document.getElementById('jira-errors-toggle')?.addEventListener('click', () => {
            const detail = document.getElementById('jira-errors-detail');
            if (detail) {
                detail.style.display = detail.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    /**
     * Validate and save Jira connection config (AICC-0231)
     */
    _saveJiraConfig() {
        const baseUrl = document.getElementById('jira-baseUrl')?.value?.trim() || '';
        const email = document.getElementById('jira-email')?.value?.trim() || '';
        const apiToken = document.getElementById('jira-apiToken')?.value?.trim() || '';
        const errDiv = document.getElementById('jira-connection-errors');
        const errors = [];

        // Validate URL
        if (!baseUrl) {
            errors.push('Base URL is required');
        } else {
            try { new URL(baseUrl); } catch { errors.push('Invalid URL format'); }
        }

        // Validate email
        if (!email) {
            errors.push('Email is required');
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push('Invalid email format');
        }

        // Validate token
        if (!apiToken) {
            errors.push('API Token is required');
        }

        if (errors.length > 0) {
            if (errDiv) {
                errDiv.style.display = 'block';
                errDiv.textContent = errors.join('; ');
            }
            return;
        }

        if (errDiv) errDiv.style.display = 'none';

        this.jiraConfig.baseUrl = baseUrl;
        this.jiraConfig.email = email;
        this.jiraConfig.apiToken = apiToken;

        this.sendMessage('saveJiraConfig', {
            baseUrl,
            email,
            apiToken,
            projectKey: document.getElementById('jira-projectKey')?.value?.trim() || this.jiraConfig.projectKey
        });
    }

    /**
     * Save all Jira sync configuration (unified — AICC-0232 / REQ-JIRACFG-016)
     * Collects sync strategy, conflict resolution, auto-sync, issue type filters,
     * status filters, assignee, sprint, labels, date range, and custom JQL.
     * Saves to .my/aicc/jira-config.save.json via backend.
     */
    _saveJiraSyncSettings() {
        const syncStrategy = document.getElementById('jira-syncStrategy')?.value || 'pull';
        const conflictResolution = document.getElementById('jira-conflictResolution')?.value || 'remote-wins';
        const autoSync = document.getElementById('jira-autoSync')?.checked || false;
        const syncInterval = parseInt(document.getElementById('jira-syncInterval')?.value, 10) || 30;

        const issueTypeFilters = {};
        document.querySelectorAll('.jira-issue-filter').forEach(cb => {
            issueTypeFilters[cb.value.toLowerCase()] = cb.checked;
        });

        const statusFilter = Array.from(document.querySelectorAll('.jira-sync-status-filter:checked')).map(cb => cb.value);
        const assigneeFilter = document.getElementById('jira-sync-assignee')?.value || '';
        const sprintFilter = document.getElementById('jira-sync-sprint')?.value || '';
        const labelsFilter = (document.getElementById('jira-sync-labels')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
        const dateRange = document.getElementById('jira-sync-daterange')?.value || '';
        const jql = document.getElementById('jira-sync-jql')?.value || '';

        const payload = {
            syncStrategy, conflictResolution, autoSync, syncInterval,
            issueTypeFilters, statusFilter, assigneeFilter, sprintFilter,
            labelsFilter, dateRange, jql
        };

        Object.assign(this.jiraConfig, payload);
        this.sendMessage('saveJiraConfig', payload);
    }

    /**
     * Test Jira connection (AICC-0234)
     */
    _testJiraConnection() {
        const resultDiv = document.getElementById('jira-connection-result');
        if (resultDiv) {
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<span class="codicon codicon-loading codicon-modifier-spin"></span> Testing connection...';
        }
        this.sendMessage('testJiraConnection');
    }

    /**
     * Update Jira connection test result (AICC-0234)
     */
    updateJiraConnectionResult(result) {
        const resultDiv = document.getElementById('jira-connection-result');
        if (!resultDiv) return;
        resultDiv.style.display = 'block';
        if (result.success) {
            resultDiv.innerHTML = `<span class="codicon codicon-check" style="color:#22c55e;"></span> Connected as <strong>${this.escapeSchedulerHtml(result.user || 'unknown')}</strong>`;
            this.jiraConnectionStatus = 'connected';
        } else {
            resultDiv.innerHTML = `<span class="codicon codicon-error" style="color:#ef4444;"></span> ${this.escapeSchedulerHtml(result.error || 'Connection failed')}`;
            this.jiraConnectionStatus = 'disconnected';
        }
        this._updateJiraStatusBadge();
    }

    /**
     * Update Jira sync status / progress (AICC-0237)
     */
    updateJiraSyncStatus(status) {
        const progressDiv = document.getElementById('jira-sync-progress');
        const phaseDiv = document.getElementById('jira-sync-phase');
        const fillDiv = document.getElementById('jira-sync-progress-fill');

        if (status.phase === 'complete' || status.phase === 'error') {
            if (progressDiv) progressDiv.style.display = 'none';
            this.jiraConnectionStatus = status.phase === 'complete' ? 'connected' : 'disconnected';
        } else {
            if (progressDiv) progressDiv.style.display = 'block';
            if (phaseDiv) phaseDiv.textContent = status.message || 'Syncing...';
            if (fillDiv) fillDiv.style.width = `${status.percent || 0}%`;
            this.jiraConnectionStatus = 'syncing';
        }
        this._updateJiraStatusBadge();
    }

    /**
     * Update Jira sync complete summary (AICC-0237)
     */
    updateJiraSyncComplete(result) {
        this.jiraLastSyncTime = Date.now();
        this.jiraSyncErrors = result.errors || [];

        const summaryDiv = document.getElementById('jira-sync-summary');
        if (summaryDiv) {
            summaryDiv.innerHTML = `
                Created: <strong>${result.itemsCreated || 0}</strong> |
                Updated: <strong>${result.itemsUpdated || 0}</strong> |
                Unchanged: <strong>${result.itemsUnchanged || 0}</strong> |
                Archived: <strong>${result.itemsArchived || 0}</strong>
            `;
        }

        // Show errors if any
        const errorsDiv = document.getElementById('jira-sync-errors');
        const errorCount = document.getElementById('jira-error-count');
        const errorsDetail = document.getElementById('jira-errors-detail');
        if (result.errors && result.errors.length > 0) {
            if (errorsDiv) errorsDiv.style.display = 'block';
            if (errorCount) errorCount.textContent = String(result.errors.length);
            if (errorsDetail) {
                errorsDetail.innerHTML = result.errors
                    .map(e => `<div style="margin-bottom:4px;">• ${this.escapeSchedulerHtml(e)}</div>`)
                    .join('');
            }
        } else {
            if (errorsDiv) errorsDiv.style.display = 'none';
        }

        const progressDiv = document.getElementById('jira-sync-progress');
        if (progressDiv) progressDiv.style.display = 'none';
        this.jiraConnectionStatus = result.success ? 'connected' : 'disconnected';
        this._updateJiraStatusBadge();
    }

    /**
     * Load Jira config into the form
     */
    loadJiraConfig(config) {
        this.jiraConfig = { ...this.jiraConfig, ...config };
        // Update Jira form fields in-place if visible (AICC-0507)
        if (this.currentPanelId === 'planning' && this.jiraConfigExpanded) {
            const baseUrl = document.getElementById('jira-baseUrl');
            const email = document.getElementById('jira-email');
            const apiToken = document.getElementById('jira-apiToken');
            const projectKey = document.getElementById('jira-projectKey');
            if (baseUrl) baseUrl.value = config.baseUrl || '';
            if (email) email.value = config.email || '';
            if (apiToken && !apiToken.value) apiToken.value = config.apiToken || '';
            if (projectKey) projectKey.value = config.projectKey || '';
        }
    }

    /**
     * Load project lookup results (AICC-0233)
     */
    loadJiraProjects(projects) {
        const listDiv = document.getElementById('jira-projects-list');
        const select = document.getElementById('jira-project-select');
        if (!listDiv || !select) return;

        listDiv.style.display = 'block';
        select.innerHTML = '<option value="">-- Select --</option>' +
            projects.map(p =>
                `<option value="${this.escapeSchedulerHtml(p.key)}">${this.escapeSchedulerHtml(p.name)} (${this.escapeSchedulerHtml(p.key)})</option>`
            ).join('');
    }

    /**
     * Update the Jira status badge element
     */
    _updateJiraStatusBadge() {
        const badges = document.querySelectorAll('.jira-status-badge');
        badges.forEach(badge => {
            badge.className = `jira-status-badge ${this.jiraConnectionStatus}`;
            const label = this.jiraConnectionStatus.charAt(0).toUpperCase() + this.jiraConnectionStatus.slice(1);
            badge.innerHTML = `<span>●</span> ${label}`;
        });
    }

    // ══════════════════════════════════════════════════════════════════════
    //  MCP Servers Tab (AICC-0085 / AICC-0086 / AICC-0087)
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Render the MCP Servers tab (AICC-0241)
     */
    renderMcpTab() {
        const content = document.getElementById('panel-content');
        if (!content) return;

        // Request fresh data from backend
        this.sendMessage('getMcpStatus');
        this.sendMessage('getMcpInventory');
        this.sendMessage('getMcpPortScan');  // REQ-MPD-001

        const s = this.mcpStatus;
        const isRunning = s.isRunning;
        const healthClass = this._mcpHealthClass(s);
        const healthLabel = this._mcpHealthLabel(s);

        // Server info card (AICC-0244)
        const roleClass = s.role === 'leader' ? 'leader' : 'follower';
        const roleLabel = s.role ? s.role.charAt(0).toUpperCase() + s.role.slice(1) : 'Standalone';
        const uptimeStr = isRunning ? this._formatMcpUptime(s.uptime) : '—';
        const portStr = s.port != null ? String(s.port) : '—';
        const pidStr = s.pid ? String(s.pid) : 'N/A';
        const transportStr = (s.transport || 'stdio').toUpperCase();
        const stateInfoJson = JSON.stringify({
            state: healthLabel,
            duration: uptimeStr,
            attempts: s.connectionAttempts || 0,
            lastChange: s.lastTransition ? new Date(s.lastTransition).toLocaleString() : '—',
        }).replace(/"/g, '&quot;');

        // Workspace rows (AICC-0242)
        const workspaces = this.mcpInventory.workspaces || [];
        const wsRows = workspaces.map(ws => {
            const wsHealth = ws.health === 'healthy' ? 'healthy' : (ws.health === 'unhealthy' ? 'disconnected' : 'stopped');
            const wsHealthLabel = ws.health === 'healthy' ? 'Healthy' : (ws.health === 'unhealthy' ? 'Unhealthy' : 'Unknown');
            const skillCount = (ws.skills || []).length;
            const connSince = ws.registeredAt ? new Date(ws.registeredAt).toLocaleString() : '—';
            const lastSeen = ws.lastSeen ? new Date(ws.lastSeen).toLocaleString() : '—';
            return `
                <tr data-ws-id="${this.escapeSchedulerHtml(ws.id)}">
                    <td><strong>${this.escapeSchedulerHtml(ws.name)}</strong><br/><span style="font-size:10px;opacity:0.5;">${this.escapeSchedulerHtml(ws.id)}</span></td>
                    <td><span class="mcp-health"><span class="mcp-health-dot ${wsHealth}"></span> ${wsHealthLabel}</span></td>
                    <td>${skillCount}</td>
                    <td>${ws.port ? String(ws.port) : '—'}</td>
                    <td>${connSince}</td>
                    <td>${lastSeen}</td>
                </tr>
            `;
        }).join('');

        const inventoryTable = workspaces.length > 0 ? `
            <table class="mcp-table">
                <thead>
                    <tr>
                        <th>Workspace</th>
                        <th>Status</th>
                        <th>Skills</th>
                        <th>Port</th>
                        <th>Connected Since</th>
                        <th>Last Seen</th>
                    </tr>
                </thead>
                <tbody>${wsRows}</tbody>
            </table>
        ` : `
            <div class="mcp-empty">
                <span class="codicon codicon-server" style="font-size: 32px; margin-bottom: 8px; display: block;"></span>
                No workspaces registered.
            </div>
        `;

        // Action buttons (AICC-0243)
        const startDisabled = isRunning ? 'disabled' : '';
        const stopDisabled = !isRunning ? 'disabled' : '';
        const restartDisabled = !isRunning ? 'disabled' : '';

        content.innerHTML = `
            <div class="mcp-container">
                <div class="mcp-header">
                    <h3><span class="codicon codicon-server"></span> MCP Servers</h3>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div class="mcp-auto-refresh">
                            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
                                <input type="checkbox" id="mcp-auto-refresh-toggle" ${this.mcpAutoRefreshEnabled ? 'checked' : ''} />
                                Auto-refresh
                            </label>
                        </div>
                        <div class="mcp-actions">
                            <button class="mcp-btn mcp-btn-start" ${startDisabled} id="mcp-btn-start" title="Start MCP Server">
                                <span class="codicon codicon-play"></span> Start
                            </button>
                            <button class="mcp-btn mcp-btn-stop" ${stopDisabled} id="mcp-btn-stop" title="Stop MCP Server">
                                <span class="codicon codicon-close"></span> Stop
                            </button>
                            <button class="mcp-btn mcp-btn-restart" ${restartDisabled} id="mcp-btn-restart" title="Restart MCP Server">
                                <span class="codicon codicon-refresh"></span> Restart
                            </button>
                        </div>
                    </div>
                </div>

                ${isRunning || s.connectionState !== 'disconnected' ? `
                <div class="mcp-server-card">
                    <div class="mcp-server-info">
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">Status</div>
                            <div class="mcp-info-value">
                                <span class="mcp-tooltip">
                                    <span class="mcp-health"><span class="mcp-health-dot ${healthClass}" id="mcp-health-dot"></span> <span id="mcp-health-label">${healthLabel}</span></span>
                                    <span class="mcp-tooltip-content" id="mcp-health-tooltip">
                                        State: ${healthLabel}<br/>
                                        Duration: ${uptimeStr}<br/>
                                        Attempts: ${s.connectionAttempts || 0}<br/>
                                        Last change: ${s.lastTransition ? new Date(s.lastTransition).toLocaleString() : '—'}
                                    </span>
                                </span>
                            </div>
                        </div>
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">Transport</div>
                            <div class="mcp-info-value" id="mcp-transport">${transportStr}</div>
                        </div>
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">Port</div>
                            <div class="mcp-info-value" id="mcp-port">${portStr}</div>
                        </div>
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">PID</div>
                            <div class="mcp-info-value" id="mcp-pid">${pidStr}</div>
                        </div>
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">Role</div>
                            <div class="mcp-info-value"><span class="mcp-role-badge ${roleClass}" id="mcp-role">${roleLabel}</span></div>
                        </div>
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">Uptime</div>
                            <div class="mcp-info-value" id="mcp-uptime">${uptimeStr}</div>
                        </div>
                        <div class="mcp-info-item">
                            <div class="mcp-info-label">Workspaces</div>
                            <div class="mcp-info-value" id="mcp-ws-count">${s.connectedWorkspaces || 0}</div>
                        </div>
                    </div>
                </div>

                <h4 style="margin: 0 0 8px; font-size: 13px; opacity: 0.8;">Connected Workspaces</h4>
                <div id="mcp-inventory-container">
                    ${inventoryTable}
                </div>

                <h4 style="margin: 16px 0 8px; font-size: 13px; opacity: 0.8;">Port Range Dashboard</h4>
                <div id="mcp-port-dashboard">
                    <p style="opacity:0.6;font-size:12px;">Scanning ports...</p>
                </div>
                ` : `
                <div class="mcp-empty">
                    <span class="codicon codicon-server" style="font-size: 48px; margin-bottom: 12px; display: block;"></span>
                    <h4>No MCP server running</h4>
                    <p style="margin: 8px 0 16px; font-size: 12px;">Start the MCP server to enable multi-workspace coordination.</p>
                    <button class="mcp-btn mcp-btn-start" id="mcp-btn-empty-start">
                        <span class="codicon codicon-play"></span> Start Server
                    </button>
                </div>
                `}
            </div>
        `;

        // Attach event listeners
        this._attachMcpEventListeners();

        // Start auto-refresh (AICC-0246)
        this._startMcpAutoRefresh();
    }

    /**
     * Attach MCP tab event listeners (AICC-0243)
     */
    _attachMcpEventListeners() {
        document.getElementById('mcp-btn-start')?.addEventListener('click', () => {
            this._mcpServerAction('start');
        });
        document.getElementById('mcp-btn-stop')?.addEventListener('click', () => {
            this._mcpServerAction('stop');
        });
        document.getElementById('mcp-btn-restart')?.addEventListener('click', () => {
            this._mcpServerAction('restart');
        });
        document.getElementById('mcp-btn-empty-start')?.addEventListener('click', () => {
            this._mcpServerAction('start');
        });
        document.getElementById('mcp-auto-refresh-toggle')?.addEventListener('change', (e) => {
            this.mcpAutoRefreshEnabled = e.target.checked;
            if (this.mcpAutoRefreshEnabled) {
                this._startMcpAutoRefresh();
            } else {
                this._stopMcpAutoRefresh();
            }
        });
    }

    /**
     * Send an MCP server action (start/stop/restart) (AICC-0243)
     */
    _mcpServerAction(action) {
        // Disable buttons during transition
        const btns = document.querySelectorAll('.mcp-btn');
        btns.forEach(btn => btn.setAttribute('disabled', 'true'));

        this.sendMessage('mcpServerAction', { action });
    }

    /**
     * Handle MCP status update from backend (AICC-0244 / AICC-0245)
     */
    handleMcpStatusUpdate(payload) {
        this.mcpStatus = { ...this.mcpStatus, ...payload };

        // Patch DOM elements if they exist (avoid full re-render) (AICC-0246)
        const healthDot = document.getElementById('mcp-health-dot');
        const healthLabelEl = document.getElementById('mcp-health-label');
        const portEl = document.getElementById('mcp-port');
        const pidEl = document.getElementById('mcp-pid');
        const roleEl = document.getElementById('mcp-role');
        const uptimeEl = document.getElementById('mcp-uptime');
        const wsCountEl = document.getElementById('mcp-ws-count');
        const tooltipEl = document.getElementById('mcp-health-tooltip');

        if (healthDot && healthLabelEl) {
            const healthClass = this._mcpHealthClass(this.mcpStatus);
            const healthLabel = this._mcpHealthLabel(this.mcpStatus);
            healthDot.className = `mcp-health-dot ${healthClass}`;
            healthLabelEl.textContent = healthLabel;
            // Update tooltip (AICC-0247)
            if (tooltipEl) {
                const uptimeStr = this.mcpStatus.isRunning ? this._formatMcpUptime(this.mcpStatus.uptime) : '—';
                tooltipEl.innerHTML = `
                    State: ${healthLabel}<br/>
                    Duration: ${uptimeStr}<br/>
                    Attempts: ${this.mcpStatus.connectionAttempts || 0}<br/>
                    Last change: ${this.mcpStatus.lastTransition ? new Date(this.mcpStatus.lastTransition).toLocaleString() : '—'}
                `;
            }
        } else {
            // DOM elements don't exist yet — need full render
            if (this.currentPanelId === 'mcp') {
                this.renderMcpTab();
            }
            return;
        }

        if (portEl) portEl.textContent = payload.port != null ? String(payload.port) : '—';
        if (pidEl) pidEl.textContent = payload.pid ? String(payload.pid) : 'N/A';
        if (roleEl) {
            const role = payload.role || 'standalone';
            roleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            roleEl.className = `mcp-role-badge ${role === 'leader' ? 'leader' : 'follower'}`;
        }
        if (uptimeEl) uptimeEl.textContent = payload.isRunning ? this._formatMcpUptime(payload.uptime) : '—';
        if (wsCountEl) wsCountEl.textContent = String(payload.connectedWorkspaces || 0);

        // Update footer workspace:port and health indicator
        const footerWsEl = document.getElementById('footer-ws-name');
        const footerPortEl = document.getElementById('footer-mcp-port');
        const footerHealthEl = document.getElementById('footer-health-indicator');
        if (footerPortEl && payload.port != null) footerPortEl.textContent = String(payload.port);
        if (footerHealthEl) {
            footerHealthEl.classList.remove('connected', 'disconnected');
            footerHealthEl.classList.add(payload.isRunning ? 'connected' : 'disconnected');
            footerHealthEl.title = payload.isRunning ? 'MCP Connected' : 'MCP Disconnected';
        }

        // Update button states
        this._updateMcpButtons(payload.isRunning);
    }

    /**
     * Handle MCP inventory update from backend (AICC-0242)
     */
    handleMcpInventoryUpdate(payload) {
        this.mcpInventory = payload;

        const container = document.getElementById('mcp-inventory-container');
        if (!container) return;

        const workspaces = payload.workspaces || [];
        if (workspaces.length === 0) {
            container.innerHTML = `
                <div class="mcp-empty">
                    <span class="codicon codicon-server" style="font-size: 32px; margin-bottom: 8px; display: block;"></span>
                    No workspaces registered.
                </div>
            `;
            return;
        }

        const wsRows = workspaces.map(ws => {
            const wsHealth = ws.health === 'healthy' ? 'healthy' : (ws.health === 'unhealthy' ? 'disconnected' : 'stopped');
            const wsHealthLabel = ws.health === 'healthy' ? 'Healthy' : (ws.health === 'unhealthy' ? 'Unhealthy' : 'Unknown');
            const skillCount = (ws.skills || []).length;
            const connSince = ws.registeredAt ? new Date(ws.registeredAt).toLocaleString() : '—';
            const lastSeen = ws.lastSeen ? new Date(ws.lastSeen).toLocaleString() : '—';
            return `
                <tr data-ws-id="${this.escapeSchedulerHtml(ws.id)}">
                    <td><strong>${this.escapeSchedulerHtml(ws.name)}</strong><br/><span style="font-size:10px;opacity:0.5;">${this.escapeSchedulerHtml(ws.id)}</span></td>
                    <td><span class="mcp-health"><span class="mcp-health-dot ${wsHealth}"></span> ${wsHealthLabel}</span></td>
                    <td>${skillCount}</td>
                    <td>${ws.port ? String(ws.port) : '—'}</td>
                    <td>${connSince}</td>
                    <td>${lastSeen}</td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table class="mcp-table">
                <thead>
                    <tr>
                        <th>Workspace</th>
                        <th>Status</th>
                        <th>Skills</th>
                        <th>Port</th>
                        <th>Connected Since</th>
                        <th>Last Seen</th>
                    </tr>
                </thead>
                <tbody>${wsRows}</tbody>
            </table>
        `;
    }

    /**
     * Update MCP button enabled/disabled states (AICC-0243)
     */
    _updateMcpButtons(isRunning) {
        const startBtn = document.getElementById('mcp-btn-start');
        const stopBtn = document.getElementById('mcp-btn-stop');
        const restartBtn = document.getElementById('mcp-btn-restart');

        if (startBtn) startBtn.disabled = isRunning;
        if (stopBtn) stopBtn.disabled = !isRunning;
        if (restartBtn) restartBtn.disabled = !isRunning;
    }

    /**
     * Start MCP auto-refresh interval (AICC-0246)
     */
    _startMcpAutoRefresh() {
        this._stopMcpAutoRefresh();
        if (!this.mcpAutoRefreshEnabled) return;

        this.mcpAutoRefreshInterval = setInterval(() => {
            if (this.currentPanelId !== 'mcp') {
                this._stopMcpAutoRefresh();
                return;
            }
            this.sendMessage('getMcpStatus');
            this.sendMessage('getMcpInventory');
        }, 5000);
    }

    /**
     * Stop MCP auto-refresh interval (AICC-0246)
     */
    _stopMcpAutoRefresh() {
        if (this.mcpAutoRefreshInterval) {
            clearInterval(this.mcpAutoRefreshInterval);
            this.mcpAutoRefreshInterval = null;
        }
    }

    /**
     * Get CSS class for MCP health indicator (AICC-0245)
     */
    _mcpHealthClass(status) {
        if (!status.isRunning && status.connectionState === 'disconnected') return 'stopped';
        if (status.connectionState === 'connected') return 'healthy';
        if (status.connectionState === 'reconnecting') return 'reconnecting';
        if (status.connectionState === 'disconnected') return 'disconnected';
        return 'starting';
    }

    /**
     * Get label for MCP health indicator (AICC-0245)
     */
    _mcpHealthLabel(status) {
        if (!status.isRunning && status.connectionState === 'disconnected') return 'Stopped';
        if (status.connectionState === 'connected') return 'Healthy';
        if (status.connectionState === 'reconnecting') return 'Reconnecting';
        if (status.connectionState === 'disconnected') return 'Disconnected';
        return 'Starting…';
    }

    /**
     * Format uptime milliseconds to human-readable (AICC-0244)
     */
    _formatMcpUptime(ms) {
        if (!ms || ms <= 0) return '0s';
        const totalSec = Math.floor(ms / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
        if (mins > 0) return `${mins}m ${secs}s`;
        return `${secs}s`;
    }

    /**
     * Show conflict banner for items with unsaved changes modified externally
     */
    // ═══════════════════════════════════════════════════════════════════════
    //  MCP Port Dashboard (REQ-MPD-001 – REQ-MPD-007)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Handle port scan result from backend
     */
    handleMcpPortScanResult(payload) {
        this.mcpPortScanData = payload.ports || [];
        if (this.currentPanelId === 'mcp') {
            this._renderPortDashboardSection();
        }
    }

    /**
     * Render port dashboard section within MCP tab
     */
    _renderPortDashboardSection() {
        const container = document.getElementById('mcp-port-dashboard');
        if (!container) return;

        const ports = this.mcpPortScanData;
        if (!ports || ports.length === 0) {
            container.innerHTML = '<p style="opacity:0.6;font-size:12px;">No port range configured or scan pending...</p>';
            return;
        }

        const rows = ports.map(p => {
            const statusClass = p.listening ? 'healthy' : 'stopped';
            const statusLabel = p.listening ? 'Active' : 'Available';
            const wsCount = p.workspaceCount ?? '—';
            const version = p.version || '—';
            const pid = p.pid || '—';
            const role = p.role || '—';
            const warnBadge = p.listening && (p.workspaceCount === 0)
                ? '<span class="mcp-warn-badge" title="Active — No Workspaces Registered">⚠</span>'
                : '';

            return `<tr>
                <td><strong>${p.port}</strong></td>
                <td><span class="mcp-health"><span class="mcp-health-dot ${statusClass}"></span> ${statusLabel}</span>${warnBadge}</td>
                <td>${pid}</td>
                <td>${version}</td>
                <td>${role}</td>
                <td>${wsCount}</td>
            </tr>`;
        }).join('');

        container.innerHTML = `
            <table class="mcp-table">
                <thead>
                    <tr>
                        <th>Port</th>
                        <th>Status</th>
                        <th>PID</th>
                        <th>Version</th>
                        <th>Role</th>
                        <th>Workspaces</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Jira Sync Query Parameters (REQ-JIRACFG-015 – REQ-JIRACFG-019)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Handle jira sync config loaded from .my/aicc/jira-config.save.json (unified)
     */
    handleJiraSyncConfigLoaded(payload) {
        this.jiraConfig = { ...this.jiraConfig, ...payload };
        this._populateJiraSyncFields();
    }

    handleJiraSyncConfigSaved(payload) {
        if (payload.success) {
            console.log('[AIKIT] Jira sync config saved');
        }
    }

    /**
     * Populate sync configuration fields from loaded config
     */
    _populateJiraSyncFields() {
        const c = this.jiraConfig;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        setVal('jira-sync-jql', c.jql);
        setVal('jira-sync-assignee', c.assigneeFilter);
        setVal('jira-sync-sprint', c.sprintFilter);
        setVal('jira-sync-daterange', c.dateRange);
        setVal('jira-sync-labels', (c.labelsFilter || []).join(', '));
        // Multi-select status checkboxes
        document.querySelectorAll('.jira-sync-status-filter').forEach(cb => {
            cb.checked = (c.statusFilter || []).includes(cb.value);
        });
    }

    /**
     * Build JQL from query parameter fields (REQ-JIRACFG-019)
     */
    _composeJqlFromFields() {
        const parts = [];
        const projectKey = document.getElementById('jira-projectKey')?.value;
        if (projectKey) parts.push(`project = "${projectKey}"`);

        const assignee = document.getElementById('jira-sync-assignee')?.value;
        if (assignee) parts.push(`assignee = "${assignee}"`);

        const sprint = document.getElementById('jira-sync-sprint')?.value;
        if (sprint) parts.push(`sprint = "${sprint}"`);

        const statuses = [];
        document.querySelectorAll('.jira-sync-status-filter:checked').forEach(cb => statuses.push(cb.value));
        if (statuses.length > 0) parts.push(`status IN (${statuses.map(s => `"${s}"`).join(', ')})`);

        const labels = [];
        document.querySelectorAll('.jira-sync-label-filter:checked').forEach(cb => labels.push(cb.value));
        if (labels.length > 0) parts.push(`labels IN (${labels.map(l => `"${l}"`).join(', ')})`);

        const dateRange = document.getElementById('jira-sync-daterange')?.value;
        if (dateRange) parts.push(`updated >= "${dateRange}"`);

        const customJql = document.getElementById('jira-sync-jql')?.value;
        if (customJql) parts.push(customJql);

        return parts.join(' AND ');
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Ideation Tab (REQ-IDEA-080 – REQ-IDEA-093)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Render the full Ideation tab
     */
    renderIdeationTab() {
        const content = document.getElementById('panel-content');
        if (!content) return;

        // Request data from backend
        this.sendMessage('getIdeationData');

        const ideas = this.ideationData.ideas || [];
        const allTags = this._getAllIdeationTags(ideas);
        const filtered = this._filterIdeas(ideas);
        const sorted = this._sortIdeas(filtered);
        const paged = this._pageIdeas(sorted);
        const grouped = this._groupByTag(paged.items);
        const totalPages = Math.ceil(paged.totalFiltered / this.ideationPageSize) || 1;

        content.innerHTML = `
            <div class="ideation-container">
                <div class="ideation-header">
                    <h3><span class="codicon codicon-lightbulb"></span> Ideation</h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button class="mcp-btn" id="idea-discover-btn" title="Discover Ideas with AI (REQ-IDEA-088)">
                            <span class="codicon codicon-sparkle"></span> Discover
                        </button>
                        <button class="mcp-btn mcp-btn-start" id="idea-new-btn">
                            <span class="codicon codicon-add"></span> New Idea
                        </button>
                    </div>
                </div>

                <!-- Filters (REQ-IDEA-082) -->
                <div class="ideation-filters" style="display:flex;gap:8px;margin:8px 0;flex-wrap:wrap;align-items:center;">
                    <div class="ideation-search-group" style="display:flex;flex:1;min-width:150px;border:1px solid var(--vscode-input-border);border-radius:3px;overflow:hidden;">
                        <input type="text" id="idea-filter-text" placeholder="Search ideas..." 
                               value="${this.escapeSchedulerHtml(this.ideationFilterText)}"
                               style="flex:1;padding:4px 8px;font-size:12px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:none;outline:none;" />
                        <button id="idea-filter-clear" title="Clear search" style="background:var(--vscode-input-background);border:none;border-left:1px solid var(--vscode-input-border);padding:0 6px;cursor:pointer;color:var(--vscode-input-foreground);display:flex;align-items:center;opacity:${this.ideationFilterText ? '1' : '0.4'};">
                            <span class="codicon codicon-clear-all" style="font-size:14px;"></span>
                        </button>
                    </div>
                    <select id="idea-filter-tags" multiple style="min-width:120px;max-width:200px;padding:4px;font-size:12px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
                        ${allTags.map(t => `<option value="${this.escapeSchedulerHtml(t)}" ${this.ideationFilterTags.includes(t) ? 'selected' : ''}>${this.escapeSchedulerHtml(t)}</option>`).join('')}
                    </select>
                    <div class="ideation-sort-wrapper" style="position:relative;">
                        <button class="mcp-btn" id="idea-sort-btn" title="Sort ideas" style="display:flex;align-items:center;gap:4px;font-size:12px;">
                            <span class="codicon codicon-list-filter"></span>
                            <span id="idea-sort-label">${this._getSortLabel(this.ideationSortBy)}</span>
                            <span class="codicon codicon-chevron-down" style="font-size:10px;"></span>
                        </button>
                        <div id="idea-sort-dropdown" class="ideation-sort-dropdown" style="display:none;position:absolute;top:100%;right:0;z-index:100;min-width:200px;margin-top:2px;background:var(--vscode-menu-background,var(--vscode-editor-background));border:1px solid var(--vscode-menu-border,var(--vscode-panel-border));border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.3);padding:4px 0;">
                            ${[
                                { value: 'highest-rated', label: 'Rating: Highest to Lowest', icon: 'arrow-up' },
                                { value: 'lowest-rated', label: 'Rating: Lowest to Highest', icon: 'arrow-down' },
                                { value: 'newest', label: 'Date: Newest to Oldest', icon: 'calendar' },
                                { value: 'oldest', label: 'Date: Oldest to Newest', icon: 'history' },
                                { value: 'watched', label: 'My Watched', icon: 'eye' },
                                { value: 'mine', label: 'Mine', icon: 'person' }
                            ].map(opt => `
                                <div class="ideation-sort-option ${this.ideationSortBy === opt.value ? 'active' : ''}" data-sort="${opt.value}" style="display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;font-size:12px;color:var(--vscode-menu-foreground,var(--vscode-foreground));">
                                    <span class="codicon codicon-${opt.icon}" style="font-size:14px;min-width:16px;"></span>
                                    <span>${opt.label}</span>
                                    ${this.ideationSortBy === opt.value ? '<span class="codicon codicon-check" style="margin-left:auto;"></span>' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <select id="idea-page-size" style="width:60px;padding:4px;font-size:12px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
                        ${[10, 25, 50, 100].map(n => `<option value="${n}" ${this.ideationPageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
                    </select>
                </div>

                <!-- Ideas grouped by tag (REQ-IDEA-080) -->
                <div class="ideation-list" id="ideation-list">
                    ${Object.keys(grouped).length > 0 ? Object.entries(grouped).map(([tag, tagIdeas]) => {
                        const collapsed = this.ideationCollapsedTags.has(tag);
                        const highestRated = this._getHighestRated(tagIdeas);
                        return `
                            <div class="ideation-tag-section">
                                <div class="ideation-tag-header" data-tag="${this.escapeSchedulerHtml(tag)}" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 8px;background:var(--vscode-sideBarSectionHeader-background);border-radius:4px;margin-bottom:4px;">
                                    <span class="codicon codicon-chevron-${collapsed ? 'right' : 'down'}"></span>
                                    <span class="codicon codicon-tag"></span>
                                    <strong>${this.escapeSchedulerHtml(tag)}</strong>
                                    <span style="opacity:0.5;font-size:11px;">(${tagIdeas.length})</span>
                                </div>
                                <div class="ideation-tag-body" style="${collapsed ? 'display:none;' : ''}">
                                    ${highestRated ? this._renderIdeaRow(highestRated, true) : ''}
                                    ${tagIdeas.filter(i => i.id !== highestRated?.id).map(i => this._renderIdeaRow(i, false)).join('')}
                                </div>
                            </div>
                        `;
                    }).join('') : '<div style="text-align:center;padding:32px;opacity:0.5;"><span class="codicon codicon-lightbulb" style="font-size:32px;display:block;margin-bottom:8px;"></span>No ideas yet. Click "New Idea" to get started.</div>'}
                </div>

                <!-- Paging (REQ-IDEA-083) -->
                <div class="ideation-paging" style="display:flex;justify-content:center;align-items:center;gap:8px;padding:8px 0;font-size:12px;">
                    <button class="mcp-btn" id="idea-page-prev" ${this.ideationPage <= 1 ? 'disabled' : ''}>◀ Prev</button>
                    <span>Page ${this.ideationPage} of ${totalPages}</span>
                    <button class="mcp-btn" id="idea-page-next" ${this.ideationPage >= totalPages ? 'disabled' : ''}>Next ▶</button>
                </div>

                <!-- Ideation Jira Config Accordion (REQ-IDEA-092) -->
                <div class="ideation-jira-section" style="margin-top:16px;border-top:1px solid var(--vscode-panel-border);padding-top:12px;">
                    <div class="jira-accordion">
                        <div class="jira-accordion-header ${this.ideationJiraExpanded ? 'expanded' : ''}" data-section="ideation-jira" id="ideation-jira-toggle">
                            <span><span class="codicon codicon-issues"></span> Ideation Jira Integration</span>
                            <span class="codicon codicon-chevron-right chevron"></span>
                        </div>
                        <div class="jira-accordion-body ${this.ideationJiraExpanded ? 'show' : ''}" data-section="ideation-jira">
                            <div class="jira-form-group">
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
                                    <input type="checkbox" id="ideation-jira-enabled" ${this.ideationJiraConfig.enabled ? 'checked' : ''} />
                                    Enable Jira sync for ideas
                                </label>
                            </div>
                            <div class="jira-form-group">
                                <label for="ideation-jira-project">Project Key</label>
                                <input type="text" id="ideation-jira-project" placeholder="e.g., AICC" value="${this.escapeSchedulerHtml(this.ideationJiraConfig.projectKey || '')}" />
                            </div>
                            <div class="jira-form-group">
                                <label for="ideation-jira-issue-type">Issue Type</label>
                                <select id="ideation-jira-issue-type">
                                    ${['Task', 'Story', 'Bug', 'Epic', 'Improvement', 'Suggestion'].map(t =>
                                        `<option value="${t}" ${this.ideationJiraConfig.issueType === t ? 'selected' : ''}>${t}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="jira-form-group">
                                <div style="display:flex;align-items:center;justify-content:space-between;">
                                    <span style="font-size:12px;">Auto-sync</span>
                                    <label class="ideation-toggle-switch" for="ideation-jira-auto-sync">
                                        <input type="checkbox" id="ideation-jira-auto-sync" ${this.ideationJiraConfig.syncEnabled ? 'checked' : ''} />
                                        <span class="ideation-toggle-slider"></span>
                                    </label>
                                </div>
                            </div>
                            <div class="jira-form-group" id="ideation-jira-interval-group" style="${this.ideationJiraConfig.syncEnabled ? '' : 'display:none;'}">
                                <label for="ideation-jira-interval">Sync Interval (minutes)</label>
                                <input type="number" id="ideation-jira-interval" min="5" max="1440" value="${this.ideationJiraConfig.syncIntervalMinutes || 30}" />
                            </div>
                            <div class="jira-form-group">
                                <label style="font-weight:600;margin-bottom:6px;">Status Mapping</label>
                                <div style="font-size:11px;opacity:0.7;margin-bottom:4px;">Map idea statuses to Jira transitions</div>
                                ${['draft', 'proposed', 'accepted', 'rejected', 'deferred'].map(s => `
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                                        <span style="min-width:70px;font-size:12px;">${s}</span>
                                        <span style="opacity:0.3;">→</span>
                                        <input type="text" class="ideation-jira-status-map" data-status="${s}" placeholder="Jira status" value="${this.escapeSchedulerHtml((this.ideationJiraConfig.statusMapping || {})[s] || '')}" style="flex:1;" />
                                    </div>
                                `).join('')}
                            </div>
                            <div style="display:flex;gap:8px;margin-top:8px;">
                                <button class="jira-btn jira-btn-primary" id="ideation-jira-save"><span class="codicon codicon-save"></span> Save Configuration</button>
                            </div>
                            <div id="ideation-jira-save-result" style="display:none;margin-top:8px;font-size:12px;"></div>
                            <div style="border-top:1px solid var(--vscode-panel-border);margin-top:12px;padding-top:12px;">
                                <button class="jira-btn jira-btn-secondary" id="ideation-jira-sync-now" style="width:100%;justify-content:center;display:inline-flex;align-items:center;gap:6px;padding:8px 12px;">
                                    <span class="codicon codicon-sync"></span> Sync Now
                                </button>
                                <div id="ideation-jira-sync-status" style="display:none;margin-top:8px;font-size:12px;text-align:center;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Request Jira config from backend
        this.sendMessage('getIdeationJiraConfig');

        this._attachIdeationEventListeners();
    }

    /**
     * Render a single idea row
     */
    _renderIdeaRow(idea, isPinned) {
        const netVotes = (idea.votes?.up || 0) - (idea.votes?.down || 0);
        const userVote = this._getUserVote(idea);
        const statusClass = (idea.status || 'draft').replace(/\s+/g, '-');
        const pinIcon = isPinned ? '<span class="codicon codicon-pinned" title="Highest rated in this tag" style="color:var(--vscode-charts-yellow);"></span> ' : '';

        return `
            <div class="ideation-row" data-idea-id="${idea.id}" style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--vscode-panel-border);${isPinned ? 'background:var(--vscode-editor-inactiveSelectionBackground);' : ''}">
                <div class="ideation-vote-group" style="display:flex;flex-direction:column;align-items:center;min-width:36px;">
                    <button class="idea-vote-btn idea-vote-up ${userVote === 1 ? 'voted' : ''}" data-idea-id="${idea.id}" data-direction="up" title="Upvote" ${userVote !== 0 ? 'disabled' : ''} style="background:none;border:none;cursor:pointer;color:${userVote === 1 ? 'var(--vscode-charts-green)' : 'inherit'};font-size:14px;">▲</button>
                    <span style="font-weight:600;font-size:13px;">${netVotes}</span>
                    <button class="idea-vote-btn idea-vote-down ${userVote === -1 ? 'voted' : ''}" data-idea-id="${idea.id}" data-direction="down" title="Downvote" ${userVote !== 0 ? 'disabled' : ''} style="background:none;border:none;cursor:pointer;color:${userVote === -1 ? 'var(--vscode-charts-red)' : 'inherit'};font-size:14px;">▼</button>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        ${pinIcon}
                        <span style="font-size:10px;opacity:0.5;">${idea.id}</span>
                        <span class="ideation-type-badge" style="font-size:10px;padding:1px 4px;border-radius:3px;background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);">${idea.type || 'Story'}</span>
                        <span class="ideation-status-badge ${statusClass}" style="font-size:10px;padding:1px 4px;border-radius:3px;">${idea.status || 'draft'}</span>
                    </div>
                    <div style="font-weight:500;margin:2px 0;">${this.escapeSchedulerHtml(idea.name || '')}</div>
                    ${idea.summary ? `<div style="font-size:11px;opacity:0.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${this.escapeSchedulerHtml(idea.summary)}</div>` : ''}
                    <div style="display:flex;gap:4px;margin-top:2px;flex-wrap:wrap;">
                        ${(idea.tags || []).map(t => `<span style="font-size:10px;padding:1px 4px;border-radius:2px;background:var(--vscode-textBlockQuote-background);">${this.escapeSchedulerHtml(t)}</span>`).join('')}
                    </div>
                </div>
                <div style="display:flex;gap:4px;">
                    <button class="idea-action-btn" data-idea-id="${idea.id}" data-action="clone-story" title="Clone to Story">
                        <span class="codicon codicon-git-pull-request-create" style="font-size:13px;"></span>
                    </button>
                    <button class="idea-action-btn" data-idea-id="${idea.id}" data-action="clone-task" title="Clone to Task (REQ-IDEA-087)">
                        <span class="codicon codicon-checklist" style="font-size:13px;"></span>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get all unique tags from ideas
     */
    _getAllIdeationTags(ideas) {
        const tags = new Set();
        ideas.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
        return [...tags].sort();
    }

    /**
     * Filter ideas by text and tag selections (REQ-IDEA-082)
     */
    _filterIdeas(ideas) {
        let result = ideas;
        if (this.ideationFilterText) {
            const q = this.ideationFilterText.toLowerCase();
            result = result.filter(i =>
                (i.name || '').toLowerCase().includes(q) ||
                (i.summary || '').toLowerCase().includes(q) ||
                (i.description || '').toLowerCase().includes(q) ||
                (i.id || '').toLowerCase().includes(q)
            );
        }
        if (this.ideationFilterTags.length > 0) {
            result = result.filter(i => (i.tags || []).some(t => this.ideationFilterTags.includes(t)));
        }
        return result;
    }

    /**
     * Sort ideas (REQ-IDEA-081 / REQ-IDEA-084)
     */
    _sortIdeas(ideas) {
        let sorted = [...ideas];
        switch (this.ideationSortBy) {
            case 'highest-rated':
                sorted.sort((a, b) => {
                    const scoreA = (a.votes?.up || 0) - (a.votes?.down || 0);
                    const scoreB = (b.votes?.up || 0) - (b.votes?.down || 0);
                    return scoreB - scoreA;
                });
                break;
            case 'lowest-rated':
                sorted.sort((a, b) => {
                    const scoreA = (a.votes?.up || 0) - (a.votes?.down || 0);
                    const scoreB = (b.votes?.up || 0) - (b.votes?.down || 0);
                    return scoreA - scoreB;
                });
                break;
            case 'oldest':
                sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateA - dateB;
                });
                break;
            case 'watched':
                sorted = sorted.filter(i =>
                    (i.watchers || []).includes(this.ideationCurrentUser)
                );
                sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                break;
            case 'mine':
                sorted = sorted.filter(i =>
                    i.createdBy === this.ideationCurrentUser || i.author === this.ideationCurrentUser
                );
                sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                break;
            case 'newest':
            default:
                sorted.sort((a, b) => {
                    const dateA = new Date(a.createdAt || 0).getTime();
                    const dateB = new Date(b.createdAt || 0).getTime();
                    return dateB - dateA;
                });
                break;
        }
        return sorted;
    }

    /**
     * Page ideas (REQ-IDEA-083)
     */
    _pageIdeas(ideas) {
        const start = (this.ideationPage - 1) * this.ideationPageSize;
        const end = start + this.ideationPageSize;
        return {
            items: ideas.slice(start, end),
            totalFiltered: ideas.length
        };
    }

    /**
     * Group ideas by their first tag (REQ-IDEA-080)
     */
    _groupByTag(ideas) {
        const groups = {};
        ideas.forEach(idea => {
            const tag = (idea.tags && idea.tags[0]) || 'Uncategorized';
            if (!groups[tag]) groups[tag] = [];
            groups[tag].push(idea);
        });
        return groups;
    }

    /**
     * Get highest rated idea in a tag group (REQ-IDEA-080)
     */
    _getHighestRated(ideas) {
        if (ideas.length === 0) return null;
        return ideas.reduce((best, curr) => {
            const bestScore = (best.votes?.up || 0) - (best.votes?.down || 0);
            const currScore = (curr.votes?.up || 0) - (curr.votes?.down || 0);
            return currScore > bestScore ? curr : best;
        }, ideas[0]);
    }

    /**
     * Get current user's vote on an idea (REQ-IDEA-085)
     * Returns 1, -1, or 0
     */
    _getUserVote(idea) {
        if (!idea.votes?.voters) return 0;
        const voter = idea.votes.voters.find(v => v.createdBy === this.ideationCurrentUser || v.voterId === this.ideationCurrentUser);
        if (!voter) return 0;
        return voter.vote ?? (voter.direction === 'up' ? 1 : voter.direction === 'down' ? -1 : 0);
    }

    /**
     * Attach ideation event listeners
     */
    _attachIdeationEventListeners() {
        // Text filter
        document.getElementById('idea-filter-text')?.addEventListener('input', (e) => {
            this.ideationFilterText = e.target.value;
            this.ideationPage = 1;
            this.renderIdeationTab();
        });

        // Tag filter (multi-select)
        document.getElementById('idea-filter-tags')?.addEventListener('change', (e) => {
            this.ideationFilterTags = Array.from(e.target.selectedOptions).map(o => o.value);
            this.ideationPage = 1;
            this.renderIdeationTab();
        });

        // Sort dropdown button
        const sortBtn = document.getElementById('idea-sort-btn');
        const sortDropdown = document.getElementById('idea-sort-dropdown');
        sortBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = sortDropdown.style.display !== 'none';
            sortDropdown.style.display = isVisible ? 'none' : 'block';
        });

        // Sort option selection
        document.querySelectorAll('.ideation-sort-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                this.ideationSortBy = opt.dataset.sort;
                if (sortDropdown) sortDropdown.style.display = 'none';
                this.renderIdeationTab();
            });
            opt.addEventListener('mouseenter', () => {
                opt.style.background = 'var(--vscode-list-hoverBackground)';
            });
            opt.addEventListener('mouseleave', () => {
                opt.style.background = opt.classList.contains('active') ? 'var(--vscode-list-activeSelectionBackground)' : 'transparent';
            });
        });

        // Close sort dropdown on outside click
        document.addEventListener('click', () => {
            if (sortDropdown) sortDropdown.style.display = 'none';
        }, { once: true });

        // Search clear button (broom)
        document.getElementById('idea-filter-clear')?.addEventListener('click', () => {
            this.ideationFilterText = '';
            this.ideationPage = 1;
            this.renderIdeationTab();
        });

        // Page size
        document.getElementById('idea-page-size')?.addEventListener('change', (e) => {
            this.ideationPageSize = parseInt(e.target.value) || 10;
            this.ideationPage = 1;
            this.renderIdeationTab();
        });

        // Paging buttons
        document.getElementById('idea-page-prev')?.addEventListener('click', () => {
            if (this.ideationPage > 1) { this.ideationPage--; this.renderIdeationTab(); }
        });
        document.getElementById('idea-page-next')?.addEventListener('click', () => {
            this.ideationPage++;
            this.renderIdeationTab();
        });

        // Tag section collapse/expand
        document.querySelectorAll('.ideation-tag-header').forEach(hdr => {
            hdr.addEventListener('click', () => {
                const tag = hdr.dataset.tag;
                if (this.ideationCollapsedTags.has(tag)) {
                    this.ideationCollapsedTags.delete(tag);
                } else {
                    this.ideationCollapsedTags.add(tag);
                }
                this.renderIdeationTab();
            });
        });

        // Vote buttons (REQ-IDEA-085)
        document.querySelectorAll('.idea-vote-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const ideaId = btn.dataset.ideaId;
                const direction = btn.dataset.direction;
                this.sendMessage('ideationVote', { ideaId, direction, userId: this.ideationCurrentUser });
            });
        });

        // Action buttons (clone-to-story, clone-to-task)
        document.querySelectorAll('.idea-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const ideaId = btn.dataset.ideaId;
                const action = btn.dataset.action;
                this.sendMessage('ideationAction', { ideaId, action });
            });
        });

        // New idea button — open modal form
        document.getElementById('idea-new-btn')?.addEventListener('click', () => {
            this._showNewIdeaModal();
        });

        // Discover button — open discover modal (REQ-IDEA-088)
        document.getElementById('idea-discover-btn')?.addEventListener('click', () => {
            this._showDiscoverModal();
        });

        // Ideation Jira Config accordion toggle (REQ-IDEA-092)
        const jiraToggle = document.getElementById('ideation-jira-toggle');
        jiraToggle?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.ideationJiraExpanded = !this.ideationJiraExpanded;
            const body = document.querySelector('.jira-accordion-body[data-section="ideation-jira"]');
            if (jiraToggle && body) {
                jiraToggle.classList.toggle('expanded', this.ideationJiraExpanded);
                body.classList.toggle('show', this.ideationJiraExpanded);
                // Update chevron
                const chevron = jiraToggle.querySelector('.chevron');
                if (chevron) {
                    chevron.style.transform = this.ideationJiraExpanded ? 'rotate(90deg)' : 'rotate(0deg)';
                }
            }
        });

        // Auto-sync checkbox toggle
        document.getElementById('ideation-jira-auto-sync')?.addEventListener('change', (e) => {
            const group = document.getElementById('ideation-jira-interval-group');
            if (group) group.style.display = e.target.checked ? '' : 'none';
        });

        // Save ideation Jira config
        document.getElementById('ideation-jira-save')?.addEventListener('click', () => {
            const statusMapping = {};
            document.querySelectorAll('.ideation-jira-status-map').forEach(input => {
                const status = input.dataset.status;
                const value = input.value.trim();
                if (status && value) statusMapping[status] = value;
            });

            const config = {
                enabled: document.getElementById('ideation-jira-enabled')?.checked || false,
                projectKey: document.getElementById('ideation-jira-project')?.value || '',
                issueType: document.getElementById('ideation-jira-issue-type')?.value || 'Task',
                syncEnabled: document.getElementById('ideation-jira-auto-sync')?.checked || false,
                syncIntervalMinutes: parseInt(document.getElementById('ideation-jira-interval')?.value || '30', 10),
                statusMapping
            };

            this.ideationJiraConfig = { ...this.ideationJiraConfig, ...config };
            this.sendMessage('saveIdeationJiraConfig', config);

            const result = document.getElementById('ideation-jira-save-result');
            if (result) {
                result.textContent = 'Saving...';
                result.style.display = 'block';
                result.style.color = 'var(--vscode-foreground)';
            }
        });

        // Sync Now button
        document.getElementById('ideation-jira-sync-now')?.addEventListener('click', () => {
            const projectKey = this.ideationJiraConfig.projectKey || document.getElementById('ideation-jira-project')?.value || '';
            if (!projectKey) {
                const statusEl = document.getElementById('ideation-jira-sync-status');
                if (statusEl) {
                    statusEl.textContent = '✗ Please configure a Project Key first';
                    statusEl.style.color = '#ef4444';
                    statusEl.style.display = 'block';
                    setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
                }
                return;
            }
            const btn = document.getElementById('ideation-jira-sync-now');
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="codicon codicon-loading codicon-modifier-spin"></span> Syncing...'; }
            const statusEl = document.getElementById('ideation-jira-sync-status');
            if (statusEl) { statusEl.textContent = 'Pulling ideas from Jira...'; statusEl.style.color = 'var(--vscode-foreground)'; statusEl.style.display = 'block'; }
            this.sendMessage('syncIdeationNow', { projectKey });
        });
    }

    /**
     * Get human-readable label for the current sort option
     */
    _getSortLabel(sortBy) {
        const labels = {
            'highest-rated': 'Rating: High→Low',
            'lowest-rated': 'Rating: Low→High',
            'newest': 'Date: New→Old',
            'oldest': 'Date: Old→New',
            'watched': 'My Watched',
            'mine': 'Mine'
        };
        return labels[sortBy] || 'Date: New→Old';
    }

    /**
     * Show New Idea modal form (REQ-IDEA-080)
     */
    _showNewIdeaModal() {
        const allTags = this._getAllIdeationTags(this.ideationData.ideas || []);
        const tagOptions = allTags.map(t => `<option value="${this.escapeSchedulerHtml(t)}">${this.escapeSchedulerHtml(t)}</option>`).join('');

        const modalBody = `
            <div class="modal-form-group">
                <label class="modal-form-label">Title <span style="color:var(--vscode-errorForeground);">*</span></label>
                <input type="text" id="new-idea-title" class="modal-form-input" placeholder="Enter idea title..." />
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Type</label>
                <select id="new-idea-type" class="modal-form-select">
                    <option value="Story" selected>Story</option>
                    <option value="Feature">Feature</option>
                    <option value="Improvement">Improvement</option>
                    <option value="Bug">Bug</option>
                    <option value="Research">Research</option>
                </select>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Summary</label>
                <textarea id="new-idea-summary" class="modal-form-textarea" rows="2" placeholder="Brief summary..."></textarea>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Description</label>
                <textarea id="new-idea-description" class="modal-form-textarea" rows="4" placeholder="Detailed description..."></textarea>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Tags</label>
                <select id="new-idea-tags" class="modal-form-select" multiple style="min-height:60px;">
                    ${tagOptions}
                </select>
                <input type="text" id="new-idea-custom-tag" class="modal-form-input" placeholder="Or type a new tag and press Enter" style="margin-top:4px;" />
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary" id="new-idea-submit">Create Idea</button>
            </div>
        `;

        this.showModal('New Idea', modalBody);

        // Handle custom tag entry
        document.getElementById('new-idea-custom-tag')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const input = e.target;
                const tag = input.value.trim();
                if (tag) {
                    const select = document.getElementById('new-idea-tags');
                    if (select) {
                        const exists = Array.from(select.options).some(o => o.value === tag);
                        if (!exists) {
                            const option = document.createElement('option');
                            option.value = tag;
                            option.textContent = tag;
                            option.selected = true;
                            select.appendChild(option);
                        } else {
                            Array.from(select.options).find(o => o.value === tag).selected = true;
                        }
                    }
                    input.value = '';
                }
            }
        });

        // Handle submit
        document.getElementById('new-idea-submit')?.addEventListener('click', () => {
            const title = document.getElementById('new-idea-title')?.value?.trim();
            if (!title) {
                const titleInput = document.getElementById('new-idea-title');
                if (titleInput) {
                    titleInput.style.borderColor = 'var(--vscode-errorForeground)';
                    titleInput.focus();
                }
                return;
            }

            const type = document.getElementById('new-idea-type')?.value || 'Story';
            const summary = document.getElementById('new-idea-summary')?.value?.trim() || '';
            const description = document.getElementById('new-idea-description')?.value?.trim() || '';
            const tagsSelect = document.getElementById('new-idea-tags');
            const tags = tagsSelect ? Array.from(tagsSelect.selectedOptions).map(o => o.value) : [];

            const newIdea = {
                name: title,
                type,
                summary,
                description,
                tags,
                status: 'draft',
                createdBy: this.ideationCurrentUser,
                author: this.ideationCurrentUser
            };

            this.sendMessage('ideationAction', { action: 'create', idea: newIdea });
            this.closeModal();
        });
    }

    /**
     * Show Discover Ideas modal (REQ-IDEA-088)
     */
    _showDiscoverModal() {
        const modalBody = `
            <div style="text-align:center;padding:16px 0;">
                <span class="codicon codicon-sparkle" style="font-size:32px;color:var(--vscode-charts-yellow);display:block;margin-bottom:12px;"></span>
                <p style="font-size:13px;margin-bottom:16px;">Use AI to discover and generate new ideas based on your project context, existing ideas, and industry trends.</p>
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Context / Focus Area (optional)</label>
                <input type="text" id="discover-context" class="modal-form-input" placeholder="e.g., performance improvements, UX enhancements..." />
            </div>
            <div class="modal-form-group">
                <label class="modal-form-label">Number of Ideas</label>
                <select id="discover-count" class="modal-form-select">
                    <option value="3">3 ideas</option>
                    <option value="5" selected>5 ideas</option>
                    <option value="10">10 ideas</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="modal-btn modal-btn-secondary" onclick="app.closeModal()">Cancel</button>
                <button class="modal-btn modal-btn-primary" id="discover-submit">
                    <span class="codicon codicon-sparkle"></span> Discover Ideas
                </button>
            </div>
            <div id="discover-loading" style="display:none;text-align:center;padding:12px;">
                <span class="codicon codicon-loading codicon-modifier-spin" style="font-size:20px;"></span>
                <div style="font-size:12px;margin-top:8px;opacity:0.7;">Discovering ideas with AI...</div>
            </div>
        `;

        this.showModal('Discover Ideas with AI', modalBody);

        document.getElementById('discover-submit')?.addEventListener('click', () => {
            const context = document.getElementById('discover-context')?.value?.trim() || '';
            const count = parseInt(document.getElementById('discover-count')?.value || '5', 10);

            // Show loading state
            const submitBtn = document.getElementById('discover-submit');
            const loading = document.getElementById('discover-loading');
            if (submitBtn) submitBtn.disabled = true;
            if (loading) loading.style.display = 'block';

            this.sendMessage('ideationDiscover', { context, count });

            // Auto-close after a delay (backend will send results via message)
            setTimeout(() => {
                this.closeModal();
            }, 1500);
        });
    }

    /**
     * Handle ideation data loaded from backend
     */
    handleIdeationDataLoaded(payload) {
        this.ideationData = payload || { version: '1.0.0', ideas: [] };
        if (this.currentPanelId === 'ideation') {
            this.renderIdeationTab();
        }
    }

    /**
     * Handle ideation item saved (refresh list)
     */
    handleIdeationItemSaved(payload) {
        if (payload.ideas) {
            this.ideationData.ideas = payload.ideas;
        }
        if (this.currentPanelId === 'ideation') {
            this.renderIdeationTab();
        }
    }

    /**
     * Handle ideation vote result
     */
    handleIdeationVoteResult(payload) {
        if (payload.idea) {
            const idx = this.ideationData.ideas.findIndex(i => i.id === payload.idea.id);
            if (idx >= 0) this.ideationData.ideas[idx] = payload.idea;
        }
        if (this.currentPanelId === 'ideation') {
            this.renderIdeationTab();
        }
    }

    /**
     * Handle ideation Jira config loaded from backend
     */
    handleIdeationJiraConfigLoaded(payload) {
        this.ideationJiraConfig = { ...this.ideationJiraConfig, ...payload };
        this._populateIdeationJiraFields();
    }

    handleIdeationJiraConfigSaved(payload) {
        const result = document.getElementById('ideation-jira-save-result');
        if (result) {
            if (payload.success) {
                const msg = payload.scheduledTask
                    ? '✓ Config saved · Scheduled sync task created'
                    : '✓ Config saved to .my/aicc/ideation.json';
                result.textContent = msg;
                result.style.color = '#4caf50';
            } else {
                result.textContent = '✗ Failed to save config';
                result.style.color = '#ef4444';
            }
            result.style.display = 'block';
            setTimeout(() => { result.style.display = 'none'; }, 5000);
        }
    }

    /**
     * Handle ideation sync now result from backend
     */
    handleIdeationSyncResult(payload) {
        const btn = document.getElementById('ideation-jira-sync-now');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span class="codicon codicon-sync"></span> Sync Now'; }
        const statusEl = document.getElementById('ideation-jira-sync-status');
        if (statusEl) {
            if (payload.success) {
                const count = payload.itemsSynced || 0;
                statusEl.textContent = `✓ Sync complete — ${count} item${count !== 1 ? 's' : ''} pulled`;
                statusEl.style.color = '#4caf50';
            } else {
                statusEl.textContent = `✗ Sync failed: ${payload.error || 'Unknown error'}`;
                statusEl.style.color = '#ef4444';
            }
            statusEl.style.display = 'block';
            setTimeout(() => { statusEl.style.display = 'none'; }, 6000);
        }
        // Refresh ideation data after sync
        if (payload.success) {
            this.sendMessage('getIdeationData');
        }
    }

    _populateIdeationJiraFields() {
        const c = this.ideationJiraConfig;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
        setCheck('ideation-jira-enabled', c.enabled);
        setVal('ideation-jira-project', c.projectKey);
        setCheck('ideation-jira-auto-sync', c.syncEnabled);
        setVal('ideation-jira-interval', c.syncIntervalMinutes);

        const typeSelect = document.getElementById('ideation-jira-issue-type');
        if (typeSelect) typeSelect.value = c.issueType || 'Task';

        const intervalGroup = document.getElementById('ideation-jira-interval-group');
        if (intervalGroup) intervalGroup.style.display = c.syncEnabled ? '' : 'none';

        // Populate status mapping
        document.querySelectorAll('.ideation-jira-status-map').forEach(input => {
            const status = input.dataset.status;
            if (status && c.statusMapping?.[status]) {
                input.value = c.statusMapping[status];
            }
        });
    }

    /**
     * Handle AI discover results (REQ-IDEA-088)
     */
    handleIdeationDiscoverResult(payload) {
        if (payload.newIdeas && Array.isArray(payload.newIdeas)) {
            this.ideationData.ideas = [...payload.newIdeas, ...this.ideationData.ideas];
        }
        if (this.currentPanelId === 'ideation') {
            this.renderIdeationTab();
        }
    }

    showConflictBanner(itemId, el) {
        // Don't add duplicate banners
        if (el.querySelector('.conflict-banner')) return;

        const banner = document.createElement('div');
        banner.className = 'conflict-banner';
        banner.innerHTML = `
            <span class="codicon codicon-warning"></span>
            <span>This item was modified externally while you have unsaved changes.</span>
            <button class="conflict-reload-btn" data-item-id="${itemId}">Reload</button>
            <button class="conflict-keep-btn" data-item-id="${itemId}">Keep Mine</button>
        `;

        const content = el.querySelector('.accordion-content');
        if (content) {
            content.insertBefore(banner, content.firstChild);
        }

        // Attach event listeners
        banner.querySelector('.conflict-reload-btn')?.addEventListener('click', () => {
            banner.remove();
            // Re-render this item's content with latest data
            const item = this.panelData.planDocument?.items?.find(i => i.id === itemId);
            if (item && content) {
                content.innerHTML = this.buildAccordionContentTabs(item);
            }
        });

        banner.querySelector('.conflict-keep-btn')?.addEventListener('click', () => {
            banner.remove();
        });
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
