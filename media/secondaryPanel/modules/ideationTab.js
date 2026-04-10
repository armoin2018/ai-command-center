/**
 * Ideation Tab Module
 * Extracted from SecondaryPanelApp (REQ-IDEA-080 – REQ-IDEA-093)
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 */
(function (App) {
    Object.assign(App.prototype, {

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
        },

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
        },

        /**
         * Get all unique tags from ideas
         */
        _getAllIdeationTags(ideas) {
            const tags = new Set();
            ideas.forEach(i => (i.tags || []).forEach(t => tags.add(t)));
            return [...tags].sort();
        },

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
        },

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
        },

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
        },

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
        },

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
        },

        /**
         * Get current user's vote on an idea (REQ-IDEA-085)
         * Returns 1, -1, or 0
         */
        _getUserVote(idea) {
            if (!idea.votes?.voters) return 0;
            const voter = idea.votes.voters.find(v => v.createdBy === this.ideationCurrentUser || v.voterId === this.ideationCurrentUser);
            if (!voter) return 0;
            return voter.vote ?? (voter.direction === 'up' ? 1 : voter.direction === 'down' ? -1 : 0);
        },

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
        },

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
        },

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
        },

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
        },

        /**
         * Handle ideation data loaded from backend
         */
        handleIdeationDataLoaded(payload) {
            this.ideationData = payload || { version: '1.0.0', ideas: [] };
            if (this.currentPanelId === 'ideation') {
                this.renderIdeationTab();
            }
        },

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
        },

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
        },

        /**
         * Handle ideation Jira config loaded from backend
         */
        handleIdeationJiraConfigLoaded(payload) {
            this.ideationJiraConfig = { ...this.ideationJiraConfig, ...payload };
            this._populateIdeationJiraFields();
        },

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
        },

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
        },

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
        },

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
    });
})(SecondaryPanelApp);
