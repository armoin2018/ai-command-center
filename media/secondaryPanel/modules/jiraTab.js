/**
 * Jira Configuration Tab Module
 * Extracted from SecondaryPanelApp (AICC-0081 / AICC-0230–0237)
 * Includes Jira Sync Query Parameters (REQ-JIRACFG-015–019)
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 */
(function (App) {
    Object.assign(App.prototype, {

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
                            <div class="jira-form-group jira-autosync-row">
                                <div class="jira-autosync-toggle">
                                    <label class="jira-toggle-switch">
                                        <input type="checkbox" id="jira-autoSync" ${cfg.autoSync ? 'checked' : ''} />
                                        <span class="jira-toggle-slider"></span>
                                    </label>
                                    <span class="jira-autosync-label" id="jira-autoSync-label">${cfg.autoSync ? 'Auto-sync enabled' : 'Auto-sync disabled'}</span>
                                </div>
                                <div class="jira-interval-inline" id="jira-interval-group" style="${cfg.autoSync ? '' : 'opacity:0.4;pointer-events:none;'}">
                                    <label for="jira-syncInterval">Interval</label>
                                    <input type="number" id="jira-syncInterval" min="1" max="1440" value="${cfg.syncInterval || 30}" style="width:60px;" />
                                    <span style="font-size:11px;color:var(--vscode-descriptionForeground);">min</span>
                                </div>
                            </div>
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
                            <div id="jira-query-filters" style="${cfg.autoSync ? '' : 'display:none;'}">
                            <div class="jira-form-group">
                                <label style="font-weight:600;margin-bottom:6px;">Issue Type Filters</label>
                                <div class="jira-filter-group">
                                    ${[{v:'Epic',k:'epic'},{v:'Story',k:'story'},{v:'Task',k:'task'},{v:'Bug',k:'bug'},{v:'Feature',k:'feature'}].map(t =>
                                        `<button type="button" class="jira-filter-btn jira-issue-filter ${cfg.issueTypeFilters?.[t.k] !== false ? 'active' : ''}" data-value="${t.v}">${t.v}</button>`
                                    ).join('')}
                                </div>
                            </div>
                            <div class="jira-form-group">
                                <label style="font-weight:600;margin-bottom:6px;">Status Filter</label>
                                <div class="jira-filter-group">
                                    ${['To Do', 'In Progress', 'In Review', 'Done', 'Blocked', 'Released'].map(s =>
                                        `<button type="button" class="jira-filter-btn jira-sync-status-filter ${(cfg.statusFilter || []).includes(s) ? 'active' : ''}" data-value="${s}">${s}</button>`
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
                            </div><!-- /jira-query-filters -->
                            <div style="display:flex;gap:8px;margin-top:8px;">
                                <button class="jira-btn jira-btn-secondary" id="jira-preview-jql">Preview JQL</button>    
                                <button class="jira-btn jira-btn-primary" id="jira-save-sync-settings">Save Sync Configuration</button>
                                <div id="jira-jql-preview" style="display:none;margin-top:8px;padding:8px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px;font-family:monospace;font-size:11px;word-break:break-all;"></div>
                            </div>
                            
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                                <span>Connection:</span>
                                <span class="jira-status-badge ${statusClass}">
                                    <span>●</span>
                                    ${statusClass.charAt(0).toUpperCase() + statusClass.slice(1)}
                                </span>
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
                            <div style="margin-bottom:8px;font-size:12px;">
                                <span style="opacity:0.7;">Last sync:</span> ${lastSync}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this._attachJiraEventListeners();
        },

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
                const checked = e.target.checked;
                const intervalGroup = document.getElementById('jira-interval-group');
                const queryFilters = document.getElementById('jira-query-filters');
                const label = document.getElementById('jira-autoSync-label');
                if (intervalGroup) {
                    intervalGroup.style.opacity = checked ? '' : '0.4';
                    intervalGroup.style.pointerEvents = checked ? '' : 'none';
                }
                if (queryFilters) {
                    queryFilters.style.display = checked ? '' : 'none';
                }
                if (label) {
                    label.textContent = checked ? 'Auto-sync enabled' : 'Auto-sync disabled';
                }
            });

            // Filter toggle buttons
            document.querySelectorAll('.jira-filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.toggle('active');
                });
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
        },

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
        },

        /**
         * Save all Jira sync configuration (unified — AICC-0232 / REQ-JIRACFG-016)
         */
        _saveJiraSyncSettings() {
            const syncStrategy = document.getElementById('jira-syncStrategy')?.value || 'pull';
            const conflictResolution = document.getElementById('jira-conflictResolution')?.value || 'remote-wins';
            const autoSync = document.getElementById('jira-autoSync')?.checked || false;
            const syncInterval = parseInt(document.getElementById('jira-syncInterval')?.value, 10) || 30;

            const issueTypeFilters = {};
            document.querySelectorAll('.jira-issue-filter').forEach(btn => {
                issueTypeFilters[btn.dataset.value.toLowerCase()] = btn.classList.contains('active');
            });

            const statusFilter = Array.from(document.querySelectorAll('.jira-sync-status-filter.active')).map(btn => btn.dataset.value);
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
        },

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
        },

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
        },

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
        },

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
        },

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
        },

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
        },

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
        },

        // ── Jira Sync Query Parameters (REQ-JIRACFG-015 – REQ-JIRACFG-019) ──

        /**
         * Handle jira sync config loaded from .my/aicc/jira-config.save.json (unified)
         */
        handleJiraSyncConfigLoaded(payload) {
            this.jiraConfig = { ...this.jiraConfig, ...payload };
            this._populateJiraSyncFields();
        },

        handleJiraSyncConfigSaved(payload) {
            if (payload.success) {
                console.log('[AIKIT] Jira sync config saved');
            }
        },

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
        },

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
    });
})(SecondaryPanelApp);
