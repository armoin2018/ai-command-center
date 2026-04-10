/**
 * Planning Tab Module
 * Extracted from SecondaryPanelApp
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 *
 * Handles the planning panel: status badges, filter bar, accordion items,
 * content tabs (overview, details, sub-items, notes, history), modals,
 * and event listeners for CRUD operations.
 */
(function (App) {
    Object.assign(App.prototype, {

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
    },
    
    /**
     * Get MCP Server URL from configuration
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
    },
    
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
    },
    
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

                    <div class="jira-accordion">
                        <div class="jira-accordion-header" data-section="sync">
                            <span>Jira Configuration</span>
                            <span class="codicon codicon-chevron-right chevron"></span>
                        </div>
                        <div class="jira-accordion-body" data-section="sync">
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
                                <button class="jira-btn jira-btn-primary" id="jira-save-sync-settings">Save Sync Configuration</button>
                                <button class="jira-btn jira-btn-secondary" id="jira-preview-jql">Preview JQL</button>
                            </div>
                            <div id="jira-jql-preview" style="display:none;margin-top:8px;padding:8px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px;font-family:monospace;font-size:11px;word-break:break-all;"></div>
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
            </div>
        `;
    },

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
                <button id="btn-planning-refresh" class="filter-toggle" title="Refresh" aria-label="Refresh planning data">
                    <span class="codicon codicon-refresh" aria-hidden="true"></span>
                </button>
                <button id="btn-jira-config-toggle" class="filter-toggle ${this.jiraConfigExpanded ? 'active' : ''}" title="Toggle Jira Configuration" aria-label="Toggle Jira Configuration">
                    <span class="codicon codicon-issues" aria-hidden="true"></span>
                </button>
            </div>
        `;
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
    /**
     * Build children list
     */
    buildChildrenList(item, allItems, depth) {
        const childrenHTML = item.children.map(childId => {
            const child = allItems.find(i => i.id === childId);
            return child ? this.buildAccordionItem(child, allItems, depth + 1) : '';
        }).join('');
        
        return `<div class="children-list">${childrenHTML}</div>`;
    },
    
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
        document.getElementById('btn-planning-refresh')?.addEventListener('click', () => {
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
    },
    
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
    },
    
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
    },
    
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
    },
    
    /**
     * Extract item ID from input element ID
     */
    extractItemIdFromInputId(inputId) {
        // Input IDs follow pattern: "edit-summary-{itemId}", "metadata-key-{itemId}", etc.
        const match = inputId.match(/-([\w-]+)$/);
        return match ? match[1] : null;
    },
    
    /**
     * Open Jira issue in browser
     */
    openJiraIssue(itemId) {
        this.sendMessage('openJiraIssue', { itemId });
    },

    /**
     * Update status
     */
    updateStatus(itemId, status) {
        this.sendMessage('updateStatus', { itemId, status });
        this.pendingChanges++;
        this.updateChangesCount();
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
    /**
     * Delete metadata
     */
    deleteMetadata(itemId, key) {
        this.sendMessage('deleteMetadata', { itemId, key });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    },
    
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
    },
    
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
    },
    
    /**
     * Delete relationship
     */
    deleteRelationship(itemId, index) {
        this.sendMessage('deleteRelationship', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
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
    },
    
    /**
     * Delete comment
     */
    deleteComment(itemId, index) {
        this.sendMessage('deleteComment', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => { this.renderCurrentPanel(); this.switchTab(itemId, 'comments'); }, 200);
    },
    
    /**
     * Toggle comment enabled/disabled
     */
    toggleCommentEnabled(itemId, index) {
        this.sendMessage('toggleCommentEnabled', { itemId, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => { this.renderCurrentPanel(); this.switchTab(itemId, 'comments'); }, 200);
    },
    
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
    },
    
    /**
     * Remove item from list (instructions, personas, contexts)
     */
    removeListItem(itemId, listType, index) {
        this.sendMessage('removeListItem', { itemId, listType, index });
        this.pendingChanges++;
        this.updateChangesCount();
        setTimeout(() => this.renderCurrentPanel(), 200);
    },
    
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
    },
    
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
    },
    
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
    });
})(SecondaryPanelApp);
