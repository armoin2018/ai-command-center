/**
 * Component Catalog Tab Module (AICC-0535)
 * Renders component catalog with card grid, live demos, and regex filter.
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 */
(function (App) {
    Object.assign(App.prototype, {

        /**
         * Render the Component Catalog tab content
         */
        renderComponentCatalog() {
            const content = document.getElementById('panel-content');
            if (!content) return;

            // Request components from backend on first render
            if (!this._componentCatalogData) {
                this._componentCatalogData = [];
                this._componentCatalogErrors = 0;
                this._componentCatalogFilter = '';
                this._componentCatalogCaseInsensitive = true;
                this._componentCatalogExpandedDemos = new Set();
                this._componentCatalogExpandedSources = new Set();
                this.sendMessage('getComponents');
            }

            this._renderComponentCatalogContent(content);
        },

        /**
         * Handle componentsLoaded message from backend
         */
        handleComponentsLoaded(payload) {
            this._componentCatalogData = payload.components || [];
            this._componentCatalogErrors = payload.errors || 0;
            if (this.currentPanelId === 'component-catalog') {
                const content = document.getElementById('panel-content');
                if (content) this._renderComponentCatalogContent(content);
            }
        },

        /**
         * Render the catalog content into the given container
         */
        _renderComponentCatalogContent(content) {
            const components = this._getFilteredComponents();
            const total = this._componentCatalogData ? this._componentCatalogData.length : 0;
            const errorCount = this._componentCatalogErrors || 0;

            // Gather unique categories
            const categories = [...new Set(
                (this._componentCatalogData || []).map(c => c.metadata.category).filter(Boolean)
            )].sort();

            content.innerHTML = `
                <div class="component-catalog-container">
                    <div class="catalog-header">
                        <h2>
                            <span class="codicon codicon-library"></span>
                            Components
                            <span class="catalog-count">${total}</span>
                            ${errorCount > 0 ? `<span class="catalog-warning" title="${errorCount} component(s) failed to load">⚠ ${errorCount}</span>` : ''}
                        </h2>
                        <div class="catalog-categories">
                            ${categories.map(cat => `<span class="catalog-category-chip" data-ccat-action="category" data-ccat-category="${this._escCat(cat)}">${this._escCat(cat)}</span>`).join('')}
                        </div>
                    </div>

                    <div class="catalog-filter">
                        <div class="catalog-filter-row">
                            <div class="catalog-filter-input-wrap">
                                <input
                                    type="text"
                                    id="catalog-filter-input"
                                    class="filter-input"
                                    placeholder="Filter components (regex)…"
                                    value="${this._escCat(this._componentCatalogFilter || '')}">
                                ${this._componentCatalogFilter ? '<button class="catalog-clear-btn" data-ccat-action="clear" title="Clear filter"><span class="codicon codicon-close"></span></button>' : ''}
                            </div>
                            <button
                                class="filter-toggle ${this._componentCatalogCaseInsensitive ? 'active' : ''}"
                                data-ccat-action="case-toggle"
                                title="Case Insensitive">
                                <span class="codicon codicon-case-sensitive"></span>
                            </button>
                            <button
                                class="filter-toggle"
                                data-ccat-action="refresh"
                                title="Reload Components">
                                <span class="codicon codicon-refresh"></span>
                            </button>
                        </div>
                        ${components.length !== total && total > 0 ? `<div class="catalog-filter-info">Showing ${components.length} of ${total} components</div>` : ''}
                    </div>

                    <div class="catalog-grid">
                        ${components.length > 0 ? components.map(comp => this._renderComponentCard(comp)).join('') : `
                            <div class="catalog-empty">
                                <span class="codicon codicon-search" style="font-size: 48px; color: var(--vscode-textLink-foreground);"></span>
                                <h3>${total === 0 ? 'No Components Found' : 'No components match your filter'}</h3>
                                <p>${total === 0 ? 'Components will appear when YAML files are added to .github/aicc/components/' : 'Try adjusting your search pattern.'}</p>
                            </div>
                        `}
                    </div>
                </div>
            `;

            this._bindComponentCatalogEvents(content);
        },

        /**
         * Render a single component card
         */
        _renderComponentCard(comp) {
            const m = comp.metadata;
            const s = comp.spec;
            const hasDemo = s.template && s.examples && s.examples.length > 0;

            return `
                <div class="component-card" data-component-id="${this._escCat(m.id)}">
                    <div class="component-card-header">
                        <span class="component-name">${this._escCat(m.name)}</span>
                        <span class="component-version">v${this._escCat(m.version || '0.0.0')}</span>
                    </div>
                    <div class="component-category-label">${this._escCat(m.category)}</div>
                    <div class="component-description">${this._escCat(m.description)}</div>
                    ${m.tags && m.tags.length > 0 ? `
                        <div class="component-tags">
                            ${m.tags.map(t => `<span class="component-tag">${this._escCat(t)}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${hasDemo ? `
                        <div class="component-demo-section">
                            <button class="component-demo-toggle" data-ccat-action="open-demo-modal" data-ccat-id="${this._escCat(m.id)}">
                                <span class="codicon codicon-eye"></span>
                                Show Demo
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        },

        /**
         * Render the live demo for a component example (MVC pattern — AICC-0535)
         * Processes template + styles + props through the same pipeline used by
         * the common MVC component system (componentLoader / jQuery / Bootstrap).
         * @param {object} comp - parsed component definition
         * @param {number} exampleIndex - index into spec.examples (default 0)
         */
        _renderComponentDemo(comp, exampleIndex) {
            const s = comp.spec;
            if (!s.examples || s.examples.length === 0 || !s.template) return '';

            const idx = typeof exampleIndex === 'number' ? exampleIndex : 0;
            const example = s.examples[idx];
            if (!example) return '';

            let rendered = this._renderTemplate(s.template, example.props || {});

            // Strip inline event handlers for safety in webview context
            rendered = rendered.replace(/\s+on\w+="[^"]*"/gi, '');

            const scopeId = 'ccat-demo-' + comp.metadata.id;

            // Scope component styles to demo container (same as MVC scoping)
            let scopedStyles = '';
            if (s.styles) {
                scopedStyles = s.styles.replace(/(^|\})\s*([^{}@]+?)\s*\{/g, (match, prefix, selector) => {
                    if (selector.trim().startsWith('@')) return match;
                    const scopedSelector = selector.split(',').map(sel =>
                        `#${scopeId} ${sel.trim()}`
                    ).join(', ');
                    return `${prefix} ${scopedSelector} {`;
                });
            }

            return `
                <div class="component-demo-wrapper">
                    <div class="component-demo-label">${this._escCat(example.name || 'Demo')}${example.description ? ` — ${this._escCat(example.description)}` : ''}</div>
                    ${scopedStyles ? `<style>${scopedStyles}</style>` : ''}
                    <div class="component-demo-container" id="${scopeId}">
                        ${rendered}
                    </div>
                </div>
            `;
        },

        /**
         * Simple Handlebars-style template renderer
         * Handles {{variable}}, {{#if}}, {{#each}}, {{#unless}}, and nested paths
         */
        _renderTemplate(template, data) {
            if (!template || !data) return template || '';
            return this._renderBlock(template, data, null);
        },

        /**
         * Render a template block with the given data context.
         * @param {string} tpl - template string
         * @param {object} data - current data context
         * @param {object|null} root - root data context (for @root references)
         */
        _renderBlock(tpl, data, root) {
            if (!tpl) return '';
            const rootCtx = root || data;
            let result = '';
            let pos = 0;

            while (pos < tpl.length) {
                const tagStart = tpl.indexOf('{{', pos);
                if (tagStart === -1) {
                    result += tpl.slice(pos);
                    break;
                }

                // Append literal text before this tag
                result += tpl.slice(pos, tagStart);

                const tagEnd = tpl.indexOf('}}', tagStart);
                if (tagEnd === -1) {
                    result += tpl.slice(tagStart);
                    break;
                }

                const tag = tpl.slice(tagStart + 2, tagEnd).trim();

                if (tag.startsWith('#each ')) {
                    const key = tag.slice(6).trim();
                    const { body, elseBody, end } = this._extractBlock(tpl, tagEnd + 2, 'each');
                    const arr = this._resolvePath(data, key);
                    if (Array.isArray(arr) && arr.length > 0) {
                        result += arr.map((item, index) => {
                            const itemCtx = (typeof item === 'object' && item !== null) ? item : { '.': item };
                            let itemBody = this._renderBlock(body, itemCtx, rootCtx);
                            itemBody = itemBody.replace(/\{\{this\}\}/g, String(item ?? ''));
                            itemBody = itemBody.replace(/\{\{@index\}\}/g, String(index));
                            return itemBody;
                        }).join('');
                    } else if (elseBody) {
                        result += this._renderBlock(elseBody, data, rootCtx);
                    }
                    pos = end;

                } else if (tag.startsWith('#if ')) {
                    const cond = tag.slice(4).trim();
                    const { body, elseBody, end } = this._extractBlock(tpl, tagEnd + 2, 'if');
                    const val = this._evaluateCondition(cond, data, rootCtx);
                    if (val) {
                        result += this._renderBlock(body, data, rootCtx);
                    } else {
                        result += this._renderBlock(elseBody || '', data, rootCtx);
                    }
                    pos = end;

                } else if (tag.startsWith('#unless ')) {
                    const cond = tag.slice(8).trim();
                    const { body, elseBody, end } = this._extractBlock(tpl, tagEnd + 2, 'unless');
                    const val = this._evaluateCondition(cond, data, rootCtx);
                    if (!val) {
                        result += this._renderBlock(body, data, rootCtx);
                    } else {
                        result += this._renderBlock(elseBody || '', data, rootCtx);
                    }
                    pos = end;

                } else {
                    // Variable interpolation
                    result += this._resolveVariable(tag, data, rootCtx);
                    pos = tagEnd + 2;
                }
            }

            return result;
        },

        /**
         * Extract the body (and optional else body) of a block helper,
         * properly handling nested blocks of ALL types (if, each, unless).
         * Returns { body, elseBody, end } where end is the position after {{/blockType}}
         */
        _extractBlock(tpl, startPos, blockType) {
            let pos = startPos;
            let depth = 1;       // nesting depth for 'blockType' specifically
            let otherDepth = 0;  // nesting depth for other block types
            let elsePos = -1;

            while (pos < tpl.length) {
                const nextTag = tpl.indexOf('{{', pos);
                if (nextTag === -1) break;
                const tagClose = tpl.indexOf('}}', nextTag + 2);
                if (tagClose === -1) break;
                const tagContent = tpl.slice(nextTag + 2, tagClose).trim();
                const afterTag = tagClose + 2;

                if (tagContent.startsWith('#')) {
                    // Opening block tag: #if, #each, #unless
                    const spaceIdx = tagContent.indexOf(' ');
                    const bt = spaceIdx !== -1 ? tagContent.slice(1, spaceIdx) : tagContent.slice(1);
                    if (bt === blockType) depth++;
                    else otherDepth++;
                    pos = afterTag;
                } else if (tagContent.startsWith('/')) {
                    // Closing block tag
                    const bt = tagContent.slice(1).trim();
                    if (bt === blockType) {
                        depth--;
                        if (depth === 0) {
                            const bodyEnd = elsePos !== -1 ? elsePos : nextTag;
                            const body = tpl.slice(startPos, bodyEnd);
                            const elseBody = elsePos !== -1
                                ? tpl.slice(elsePos + '{{else}}'.length, nextTag)
                                : null;
                            return { body, elseBody, end: afterTag };
                        }
                    } else {
                        otherDepth = Math.max(0, otherDepth - 1);
                    }
                    pos = afterTag;
                } else if (tagContent === 'else') {
                    // Only capture {{else}} at top level of our block (no nested blocks open)
                    if (depth === 1 && otherDepth === 0 && elsePos === -1) {
                        elsePos = nextTag;
                    }
                    pos = afterTag;
                } else {
                    pos = afterTag;
                }
            }

            // Fallback: return rest of template as body
            return { body: tpl.slice(startPos), elseBody: null, end: tpl.length };
        },

        /**
         * Evaluate a condition expression for {{#if}} / {{#unless}}.
         * Supports: plain paths, @root.path, (eq a 'b'), (gt a b), dotted properties like tags.length
         */
        _evaluateCondition(cond, data, rootCtx) {
            // Helper call: (eq status 'todo'), (gt count 0)
            const helperMatch = cond.match(/^\((\w+)\s+(.+)\)$/);
            if (helperMatch) {
                const [, helper, argsStr] = helperMatch;
                const args = this._parseHelperArgs(argsStr, data, rootCtx);
                switch (helper) {
                    case 'eq': return args[0] === args[1];
                    case 'ne': case 'neq': return args[0] !== args[1];
                    case 'gt': return Number(args[0]) > Number(args[1]);
                    case 'lt': return Number(args[0]) < Number(args[1]);
                    case 'gte': return Number(args[0]) >= Number(args[1]);
                    case 'lte': return Number(args[0]) <= Number(args[1]);
                    case 'and': return args[0] && args[1];
                    case 'or': return args[0] || args[1];
                    case 'not': return !args[0];
                    default: return false;
                }
            }

            // Resolve plain path or @root path
            const val = this._resolveCondPath(cond, data, rootCtx);
            if (Array.isArray(val)) return val.length > 0;
            return !!val;
        },

        /**
         * Parse helper arguments, resolving paths and string literals
         */
        _parseHelperArgs(argsStr, data, rootCtx) {
            const args = [];
            const re = /'([^']*)'|"([^"]*)"|(\S+)/g;
            let m;
            while ((m = re.exec(argsStr)) !== null) {
                if (m[1] !== undefined) args.push(m[1]); // single-quoted string
                else if (m[2] !== undefined) args.push(m[2]); // double-quoted string
                else {
                    // Path reference — resolve it
                    const resolved = this._resolveCondPath(m[3], data, rootCtx);
                    args.push(resolved === undefined ? m[3] : resolved);
                }
            }
            return args;
        },

        /**
         * Resolve a condition path, handling @root. and this. prefixes
         */
        _resolveCondPath(path, data, rootCtx) {
            let p = path.trim().replace(/^this\./, '');
            if (p.startsWith('@root.')) {
                return this._resolvePath(rootCtx, p.slice(6));
            }
            return this._resolvePath(data, p) ?? this._resolvePath(rootCtx, p);
        },

        /**
         * Resolve a variable tag (non-block) to a string value.
         * Handles: @root.prop, @index, this.prop, helper calls like (multiply a b), plain paths
         */
        _resolveVariable(tag, data, rootCtx) {
            let p = tag.trim();

            // @index is handled by caller in #each, return empty here
            if (p === '@index' || p === 'this') return '';

            // Helper call: (multiply depth 20)
            const helperMatch = p.match(/^\((\w+)\s+(.+)\)$/);
            if (helperMatch) {
                const [, helper, argsStr] = helperMatch;
                const args = this._parseHelperArgs(argsStr, data, rootCtx);
                switch (helper) {
                    case 'multiply': return String(Number(args[0] || 0) * Number(args[1] || 0));
                    case 'add': return String(Number(args[0] || 0) + Number(args[1] || 0));
                    case 'subtract': return String(Number(args[0] || 0) - Number(args[1] || 0));
                    case 'concat': return args.join('');
                    default: return '';
                }
            }

            // Skip remaining @ references we don't handle
            if (p.startsWith('@') && !p.startsWith('@root.')) return '';

            // @root.prop
            if (p.startsWith('@root.')) {
                const val = this._resolvePath(rootCtx, p.slice(6));
                return (val === undefined || val === null) ? '' : String(val);
            }

            // this.prop
            p = p.replace(/^this\./, '');
            const val = this._resolvePath(data, p) ?? this._resolvePath(rootCtx, p);
            if (val === undefined || val === null) return '';
            if (typeof val === 'object') return '';
            return String(val);
        },

        /**
         * Resolve a dot-path on data object
         */
        _resolvePath(obj, path) {
            if (!obj || !path) return undefined;
            return path.split('.').reduce((acc, key) => {
                if (acc === undefined || acc === null) return undefined;
                return acc[key];
            }, obj);
        },

        /**
         * Get filtered components based on current filter and case sensitivity
         */
        _getFilteredComponents() {
            const components = this._componentCatalogData || [];
            const filter = this._componentCatalogFilter || '';
            if (!filter) return components;

            const isCaseInsensitive = this._componentCatalogCaseInsensitive;
            let regex;
            try {
                regex = new RegExp(filter, isCaseInsensitive ? 'i' : '');
            } catch {
                // Invalid regex — fall back to literal substring match
                const escaped = filter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                regex = new RegExp(escaped, isCaseInsensitive ? 'i' : '');
            }

            return components.filter(comp => {
                const m = comp.metadata;
                return regex.test(m.id) ||
                       regex.test(m.name) ||
                       regex.test(m.description || '') ||
                       (m.tags || []).some(tag => regex.test(tag));
            });
        },

        /**
         * Open a modal showing the component demo rendered through the MVC pipeline.
         * Supports multiple examples via tab selector, Bootstrap framework context,
         * and jQuery hydration — matching how the common MVC components render.
         */
        _openComponentDemoModal(compId) {
            const comp = (this._componentCatalogData || []).find(c => c.metadata.id === compId);
            if (!comp) return;

            const m = comp.metadata;
            const s = comp.spec;
            const examples = s.examples || [];
            const activeIdx = 0;

            // -- Example tabs (only shown when ≥ 2 examples) ----------------------
            const exampleTabsHtml = examples.length > 1
                ? `<div class="ccat-example-tabs" id="ccat-example-tabs">
                       ${examples.map((ex, i) => `
                           <button class="ccat-example-tab ${i === activeIdx ? 'active' : ''}"
                                   data-ccat-action="switch-example"
                                   data-ccat-example-idx="${i}"
                                   data-ccat-id="${this._escCat(m.id)}">
                               ${this._escCat(ex.name || 'Example ' + (i + 1))}
                           </button>
                       `).join('')}
                   </div>`
                : '';

            // -- Initial demo HTML -------------------------------------------------
            const demoHtml = this._renderComponentDemo(comp, activeIdx);

            // -- Source section (template + example code) --------------------------
            const bodyHTML = `
                <div class="ccat-modal-demo">
                    ${exampleTabsHtml}
                    <div id="ccat-demo-area">${demoHtml}</div>
                    <div class="component-source-section" style="margin-top:16px;">
                        <button class="component-source-toggle" id="ccat-modal-source-toggle">
                            <span class="codicon codicon-code"></span>
                            View Source
                        </button>
                        <pre class="component-source-code" id="ccat-modal-source" style="display:none;"></pre>
                    </div>
                </div>
            `;

            this.showModal(`${m.name} — Demo`, bodyHTML);

            // -- Post-mount: set source, wire events, hydrate Bootstrap -----------
            const sourceEl = document.getElementById('ccat-modal-source');
            if (sourceEl) {
                sourceEl.textContent = s.template;
            }

            // Source toggle
            const toggle = document.getElementById('ccat-modal-source-toggle');
            const source = document.getElementById('ccat-modal-source');
            if (toggle && source) {
                toggle.addEventListener('click', () => {
                    const visible = source.style.display !== 'none';
                    source.style.display = visible ? 'none' : 'block';
                    toggle.innerHTML = visible
                        ? '<span class="codicon codicon-code"></span> View Source'
                        : '<span class="codicon codicon-code"></span> Hide Source';
                });
            }

            // Example tab switching
            const tabsContainer = document.getElementById('ccat-example-tabs');
            if (tabsContainer) {
                tabsContainer.addEventListener('click', (e) => {
                    const btn = e.target.closest('[data-ccat-action="switch-example"]');
                    if (!btn) return;
                    const idx = parseInt(btn.dataset.ccatExampleIdx, 10);
                    if (isNaN(idx) || idx < 0 || idx >= examples.length) return;

                    // Update active tab
                    tabsContainer.querySelectorAll('.ccat-example-tab').forEach(t => t.classList.remove('active'));
                    btn.classList.add('active');

                    // Re-render demo area
                    const demoArea = document.getElementById('ccat-demo-area');
                    if (demoArea) {
                        demoArea.innerHTML = this._renderComponentDemo(comp, idx);
                        this._hydrateDemoContainer(comp);
                    }

                    // Update source with example-specific code if available
                    if (sourceEl) {
                        const ex = examples[idx];
                        sourceEl.textContent = (ex && ex.code) ? ex.code : s.template;
                    }
                });
            }

            // Hydrate the initial demo
            this._hydrateDemoContainer(comp);
        },

        /**
         * Hydrate a rendered demo container with MVC framework behaviours.
         * Initialises Bootstrap JS widgets (tooltips, popovers, collapse, etc.)
         * and jQuery-based component bindings when the libraries are available.
         */
        _hydrateDemoContainer(comp) {
            const scopeId = 'ccat-demo-' + comp.metadata.id;
            const container = document.getElementById(scopeId);
            if (!container) return;

            // Bootstrap JS component auto-initialisation
            if (typeof bootstrap !== 'undefined') {
                // Tooltips
                container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
                    new bootstrap.Tooltip(el);
                });
                // Popovers
                container.querySelectorAll('[data-bs-toggle="popover"]').forEach(el => {
                    new bootstrap.Popover(el);
                });
                // Collapse (accordions)
                container.querySelectorAll('[data-bs-toggle="collapse"]').forEach(el => {
                    new bootstrap.Collapse(el, { toggle: false });
                });
            }

            // jQuery: wrap container and dispatch a custom ready event so that
            // any component scripts listening on the demo can bind.
            if (typeof $ !== 'undefined') {
                $(container).trigger('aicc:demo-ready', { component: comp });
            }
        },

        /**
         * Bind event delegation for the component catalog (CSP-safe)
         */
        _bindComponentCatalogEvents(container) {
            // Filter input with 300ms debounce
            const filterInput = container.querySelector('#catalog-filter-input');
            if (filterInput) {
                let debounceTimer = null;
                filterInput.addEventListener('keyup', () => {
                    clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        this._componentCatalogFilter = filterInput.value;
                        const content = document.getElementById('panel-content');
                        if (content) this._renderComponentCatalogContent(content);
                    }, 300);
                });
            }

            // Event delegation for all catalog actions
            container.addEventListener('click', (e) => {
                const target = e.target.closest('[data-ccat-action]');
                if (!target) return;

                const action = target.dataset.ccatAction;
                const id = target.dataset.ccatId;
                const category = target.dataset.ccatCategory;

                switch (action) {
                    case 'open-demo-modal':
                        this._openComponentDemoModal(id);
                        break;
                    case 'case-toggle':
                        this._componentCatalogCaseInsensitive = !this._componentCatalogCaseInsensitive;
                        { const c = document.getElementById('panel-content'); if (c) this._renderComponentCatalogContent(c); }
                        break;
                    case 'clear':
                        this._componentCatalogFilter = '';
                        { const c = document.getElementById('panel-content'); if (c) this._renderComponentCatalogContent(c); }
                        break;
                    case 'refresh':
                        this._componentCatalogData = null;
                        this.renderComponentCatalog();
                        break;
                    case 'category':
                        if (category) {
                            this._componentCatalogFilter = category;
                            const c = document.getElementById('panel-content');
                            if (c) this._renderComponentCatalogContent(c);
                        }
                        break;
                }
            });
        },

        /**
         * Escape HTML for safe rendering
         */
        _escCat(str) {
            if (!str) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
    });

})(SecondaryPanelApp);
