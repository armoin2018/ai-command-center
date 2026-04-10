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
        this.panelData.currentPanel = panelConfig;
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
        } else if (actions && actions.has(`panel.${this.currentPanelId}`)) {
            // Dispatch through PanelActions using the tracked currentPanelId
            const panelConfig = this.panelData.currentPanel || { panel: { id: this.currentPanelId } };
            actions.dispatchWithFallback('panel', this.currentPanelId, panelConfig, this);
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
     * Utility: Normalize status
     */
    normalizeStatus(status) {
        return window.AICC?.utils?.normalizeStatus(status) || status || 'BACKLOG';
    }

    /**
     * Utility: Escape HTML
     */
    escapeHtml(str) {
        if (typeof str !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
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
