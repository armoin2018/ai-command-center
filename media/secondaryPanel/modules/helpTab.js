/**
 * Help Documentation Tab Module (REQ-HELP-018)
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 *
 * Renders searchable help documentation inside the Secondary Panel.
 * In HTTP mode, fetches sections & search results from /api/help/*.
 * In stdio mode, renders a link to the full portal.
 */
(function (App) {
    Object.assign(App.prototype, {

        /**
         * Render the Help tab
         */
        renderHelpTab() {
            const content = document.getElementById('panel-content');
            if (!content) return;

            // Determine MCP base URL for API calls
            const s = this.mcpStatus || {};
            const isHttp = s.isRunning && (s.transport === 'http' || s.transport === 'https');
            const scheme = s.transport === 'https' ? 'https' : 'http';
            const baseUrl = isHttp ? `${scheme}://${s.host || 'localhost'}:${s.port}` : null;

            if (!baseUrl) {
                content.innerHTML = `
                    <div class="section-card" style="text-align:center;padding:2rem;">
                        <span class="codicon codicon-book" style="font-size:3rem;color:var(--vscode-descriptionForeground);"></span>
                        <h3 style="margin:1rem 0 0.5rem;">Help Documentation</h3>
                        <p style="color:var(--vscode-descriptionForeground);">
                            The interactive help portal requires the MCP REST server to be running in HTTP mode.
                        </p>
                        <p style="color:var(--vscode-descriptionForeground);margin-top:0.5rem;">
                            Start the MCP server with transport set to <code>http</code> or <code>https</code>,
                            then return to this tab.
                        </p>
                    </div>`;
                return;
            }

            // Store base URL for search calls
            this._helpBaseUrl = baseUrl;
            this._helpSections = this._helpSections || [];
            this._helpSearchResults = null;

            content.innerHTML = `
                <div class="help-tab">
                    <div class="section-card" style="margin-bottom:0.75rem;">
                        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap;">
                            <span class="codicon codicon-book" style="font-size:1.5rem;"></span>
                            <h3 style="margin:0;flex:1;">Help &amp; Documentation</h3>
                            <a href="${baseUrl}/help" target="_blank"
                               class="btn btn-sm btn-outline-secondary"
                               style="font-size:0.75rem;text-decoration:none;">
                                <span class="codicon codicon-link-external"></span> Open Portal
                            </a>
                        </div>
                        <div style="margin-top:0.75rem;display:flex;gap:0.5rem;">
                            <input id="help-search-input" type="text" placeholder="Search docs..."
                                   style="flex:1;padding:0.35rem 0.6rem;border:1px solid var(--vscode-input-border);
                                          background:var(--vscode-input-background);color:var(--vscode-input-foreground);
                                          border-radius:4px;">
                            <button id="help-search-btn" class="btn btn-sm btn-primary"
                                    style="white-space:nowrap;">
                                <span class="codicon codicon-search"></span> Search
                            </button>
                        </div>
                    </div>
                    <div id="help-content" style="display:flex;flex-direction:column;gap:0.5rem;">
                        <div style="text-align:center;padding:1rem;color:var(--vscode-descriptionForeground);">
                            Loading documentation...
                        </div>
                    </div>
                </div>`;

            // Wire search
            const searchInput = document.getElementById('help-search-input');
            const searchBtn = document.getElementById('help-search-btn');
            let debounce = null;

            const doSearch = () => {
                const q = (searchInput?.value || '').trim();
                this._helpSearchQuery = q;
                this._fetchHelpSearch(q);
            };

            searchInput?.addEventListener('input', () => {
                clearTimeout(debounce);
                debounce = setTimeout(doSearch, 300);
            });
            searchInput?.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { clearTimeout(debounce); doSearch(); }
            });
            searchBtn?.addEventListener('click', () => { clearTimeout(debounce); doSearch(); });

            // Initial load: fetch all sections
            this._fetchHelpSections();
        },

        /**
         * Fetch the sections table-of-contents from the REST API
         */
        _fetchHelpSections() {
            const url = `${this._helpBaseUrl}/api/help/sections`;
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    this._helpSections = data.sections || [];
                    this._renderHelpSections(this._helpSections);
                })
                .catch(err => {
                    console.error('[Help] Failed to fetch sections:', err);
                    this._renderHelpError('Failed to load documentation sections.');
                });
        },

        /**
         * Search via the REST API
         */
        _fetchHelpSearch(query) {
            const q = encodeURIComponent(query);
            const url = `${this._helpBaseUrl}/api/help/search?q=${q}`;
            fetch(url)
                .then(r => r.json())
                .then(data => {
                    this._helpSearchResults = data.results || [];
                    if (query) {
                        this._renderHelpSearchResults(data.results, query);
                    } else {
                        this._renderHelpSections(this._helpSections);
                    }
                })
                .catch(err => {
                    console.error('[Help] Search failed:', err);
                    this._renderHelpError('Search failed. Check server connection.');
                });
        },

        /**
         * Render sections grouped by group name
         */
        _renderHelpSections(sections) {
            const container = document.getElementById('help-content');
            if (!container) return;

            if (!sections || sections.length === 0) {
                container.innerHTML = `<p style="color:var(--vscode-descriptionForeground);padding:1rem;">No documentation sections available.</p>`;
                return;
            }

            // Group by group name
            const groups = {};
            sections.forEach(s => {
                if (!groups[s.group]) groups[s.group] = [];
                groups[s.group].push(s);
            });

            const groupIcons = {
                'Getting Started': 'rocket',
                'Core Features': 'tools',
                'Integrations': 'plug',
                'Cookbook': 'beaker',
                'Release Notes': 'tag',
                'Reference': 'references',
                'AI-Ley Framework': 'hubot'
            };

            let html = '';
            for (const [groupName, items] of Object.entries(groups)) {
                const icon = groupIcons[groupName] || 'folder';
                html += `
                    <div class="section-card" style="padding:0.75rem;">
                        <h4 style="margin:0 0 0.5rem;display:flex;align-items:center;gap:0.5rem;">
                            <span class="codicon codicon-${icon}"></span>
                            ${this._helpEscape(groupName)}
                            <span style="font-size:0.7rem;color:var(--vscode-descriptionForeground);font-weight:normal;">
                                (${items.length})
                            </span>
                        </h4>
                        <div style="display:flex;flex-direction:column;gap:0.25rem;">
                            ${items.map(s => `
                                <div class="help-section-item" data-section-id="${s.id}"
                                     style="padding:0.4rem 0.6rem;border-radius:4px;cursor:pointer;
                                            display:flex;align-items:center;gap:0.5rem;
                                            background:var(--vscode-list-hoverBackground);"
                                     onmouseover="this.style.background='var(--vscode-list-activeSelectionBackground)'"
                                     onmouseout="this.style.background='var(--vscode-list-hoverBackground)'">
                                    <span class="codicon codicon-file-text" style="font-size:0.85rem;"></span>
                                    <span style="flex:1;">${this._helpEscape(s.title)}</span>
                                    ${(s.tags || []).slice(0, 3).map(t =>
                                        `<span style="font-size:0.65rem;padding:1px 5px;border-radius:3px;
                                                background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);">${this._helpEscape(t)}</span>`
                                    ).join('')}
                                </div>
                            `).join('')}
                        </div>
                    </div>`;
            }

            container.innerHTML = html;

            // Attach click handlers to load section detail
            container.querySelectorAll('.help-section-item').forEach(el => {
                el.addEventListener('click', () => {
                    const sid = el.dataset.sectionId;
                    if (sid) this._fetchHelpSectionDetail(sid);
                });
            });
        },

        /**
         * Render search results
         */
        _renderHelpSearchResults(results, query) {
            const container = document.getElementById('help-content');
            if (!container) return;

            if (!results || results.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center;padding:1.5rem;color:var(--vscode-descriptionForeground);">
                        <span class="codicon codicon-search" style="font-size:2rem;"></span>
                        <p>No results found for "<strong>${this._helpEscape(query)}</strong>"</p>
                    </div>`;
                return;
            }

            let html = `
                <div style="padding:0.5rem;color:var(--vscode-descriptionForeground);font-size:0.8rem;">
                    ${results.length} result${results.length !== 1 ? 's' : ''} for "<strong>${this._helpEscape(query)}</strong>"
                </div>`;

            results.forEach(r => {
                html += `
                    <div class="help-section-item section-card" data-section-id="${r.id}"
                         style="padding:0.6rem 0.75rem;cursor:pointer;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <strong>${this._helpEscape(r.title)}</strong>
                            <span style="font-size:0.65rem;color:var(--vscode-descriptionForeground);">${r.group}</span>
                        </div>
                        <p style="margin:0.25rem 0 0;font-size:0.8rem;color:var(--vscode-descriptionForeground);">
                            ${this._helpEscape(r.snippet || '')}
                        </p>
                    </div>`;
            });

            container.innerHTML = html;

            container.querySelectorAll('.help-section-item').forEach(el => {
                el.addEventListener('click', () => {
                    const sid = el.dataset.sectionId;
                    if (sid) this._fetchHelpSectionDetail(sid);
                });
            });
        },

        /**
         * Load and render a single section's full content
         */
        _fetchHelpSectionDetail(sectionId) {
            const url = `${this._helpBaseUrl}/api/help/sections/${encodeURIComponent(sectionId)}`;
            fetch(url)
                .then(r => r.json())
                .then(section => {
                    this._renderHelpSectionDetail(section);
                })
                .catch(err => {
                    console.error('[Help] Failed to load section:', err);
                    this._renderHelpError('Failed to load section.');
                });
        },

        /**
         * Render a section's full content with a back button
         */
        _renderHelpSectionDetail(section) {
            const container = document.getElementById('help-content');
            if (!container) return;

            // Convert markdown-like content to rendered HTML
            const rendered = this._helpRenderContent(section.content || '');

            container.innerHTML = `
                <div class="section-card" style="padding:0.75rem;">
                    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
                        <button id="help-back-btn" class="btn btn-sm btn-outline-secondary"
                                style="display:flex;align-items:center;gap:0.25rem;">
                            <span class="codicon codicon-arrow-left"></span> Back
                        </button>
                        <h3 style="margin:0;flex:1;">${this._helpEscape(section.title)}</h3>
                        <span style="font-size:0.7rem;padding:2px 6px;border-radius:3px;
                                background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);">
                            ${this._helpEscape(section.group)}
                        </span>
                    </div>
                    ${(section.tags || []).length > 0 ? `
                        <div style="margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:0.25rem;">
                            ${section.tags.map(t =>
                                `<span style="font-size:0.65rem;padding:1px 5px;border-radius:3px;
                                        background:var(--vscode-badge-background);color:var(--vscode-badge-foreground);">${this._helpEscape(t)}</span>`
                            ).join('')}
                        </div>` : ''}
                    <div class="help-section-body" style="line-height:1.6;font-size:0.85rem;">
                        ${rendered}
                    </div>
                </div>`;

            document.getElementById('help-back-btn')?.addEventListener('click', () => {
                if (this._helpSearchQuery) {
                    this._fetchHelpSearch(this._helpSearchQuery);
                } else {
                    this._renderHelpSections(this._helpSections);
                }
                // Restore search input value
                const inp = document.getElementById('help-search-input');
                if (inp && this._helpSearchQuery) inp.value = this._helpSearchQuery;
            });
        },

        /**
         * Simple markdown-like content renderer
         */
        _helpRenderContent(text) {
            let html = this._helpEscape(text);

            // Headers (### -> h5, ## -> h4)
            html = html.replace(/^### (.+)$/gm, '<h5 style="margin:0.75rem 0 0.25rem;">$1</h5>');
            html = html.replace(/^## (.+)$/gm, '<h4 style="margin:1rem 0 0.35rem;">$1</h4>');

            // Bold
            html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

            // Inline code
            html = html.replace(/`([^`]+)`/g,
                '<code style="padding:1px 4px;border-radius:3px;background:var(--vscode-textCodeBlock-background);font-size:0.8rem;">$1</code>');

            // Code blocks
            html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
                `<pre style="padding:0.5rem;border-radius:4px;background:var(--vscode-textCodeBlock-background);
                        overflow-x:auto;font-size:0.8rem;margin:0.5rem 0;"><code>${code.trim()}</code></pre>`);

            // Unordered lists
            html = html.replace(/^- (.+)$/gm, '<li style="margin:0.15rem 0;">$1</li>');
            html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, '<ul style="margin:0.25rem 0 0.5rem 1rem;padding:0;">$&</ul>');

            // Ordered lists
            html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:0.15rem 0;">$1</li>');

            // Paragraphs (double newline)
            html = html.replace(/\n\n/g, '</p><p style="margin:0.4rem 0;">');
            html = '<p style="margin:0.4rem 0;">' + html + '</p>';

            // Clean up empty paragraphs
            html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

            return html;
        },

        /**
         * Render error state
         */
        _renderHelpError(message) {
            const container = document.getElementById('help-content');
            if (!container) return;
            container.innerHTML = `
                <div style="text-align:center;padding:1.5rem;color:var(--vscode-errorForeground);">
                    <span class="codicon codicon-error" style="font-size:2rem;"></span>
                    <p>${this._helpEscape(message)}</p>
                    <button class="btn btn-sm btn-outline-secondary" onclick="app.renderHelpTab()">
                        <span class="codicon codicon-refresh"></span> Retry
                    </button>
                </div>`;
        },

        /**
         * HTML-escape helper for help content
         */
        _helpEscape(str) {
            if (!str) return '';
            return str.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }
    });
})(SecondaryPanelApp);
