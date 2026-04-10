/**
 * API Docs Tab Module
 * Extracted from SecondaryPanelApp (REQ-APIDOC-001 – REQ-APIDOC-006)
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 *
 * Fetches the OpenAPI specification from the MCP server and renders it
 * directly in the webview DOM — no iframe required.
 */
(function (App) {
    Object.assign(App.prototype, {

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
        },

        /**
         * Render API Documentation panel with in-DOM OpenAPI viewer
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

            // Show loading state with header actions
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
                    <div class="api-docs-filter">
                        <input type="text" id="api-docs-search" class="api-docs-search-input" placeholder="Filter endpoints by path, method, or description..." />
                    </div>
                    <div id="api-docs-content" class="api-docs-endpoints">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading API specification...</span>
                        </div>
                    </div>
                </div>
            `;

            // Attach header event listeners
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

            // Fetch and render OpenAPI spec in DOM
            this._fetchAndRenderOpenAPISpec(openApiUrl);
        },

        /**
         * Fetch OpenAPI spec and render it directly in the DOM
         */
        async _fetchAndRenderOpenAPISpec(openApiUrl) {
            const container = document.getElementById('api-docs-content');
            if (!container) return;

            try {
                const response = await fetch(openApiUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                const spec = await response.json();

                this._openApiSpec = spec;
                this._renderOpenAPIEndpoints(spec, container);

                // Wire up search/filter
                const searchInput = document.getElementById('api-docs-search');
                if (searchInput) {
                    searchInput.addEventListener('input', (e) => {
                        this._filterAPIEndpoints(e.target.value.toLowerCase());
                    });
                }
            } catch (error) {
                container.innerHTML = `
                    <div class="empty-state">
                        <span class="codicon codicon-error" style="font-size: 48px; color: #ef4444;"></span>
                        <h2>Failed to Load API Specification</h2>
                        <p>${this._escapeHtml(error.message)}</p>
                        <p>Ensure the MCP server is running with HTTP transport enabled.</p>
                        <button id="retry-api-docs-btn" class="action-button">
                            <span class="codicon codicon-refresh"></span>
                            Retry
                        </button>
                    </div>
                `;
                document.getElementById('retry-api-docs-btn')?.addEventListener('click', () => {
                    this.renderAPIDocs();
                });
            }
        },

        /**
         * Render OpenAPI endpoints grouped by tag
         */
        _renderOpenAPIEndpoints(spec, container) {
            const paths = spec.paths || {};
            const info = spec.info || {};

            // Group endpoints by tag
            const groups = {};
            let totalEndpoints = 0;

            for (const [pathStr, methods] of Object.entries(paths)) {
                for (const [method, operation] of Object.entries(methods)) {
                    if (method === 'parameters' || method.startsWith('x-')) continue;
                    totalEndpoints++;
                    const tags = operation.tags || ['Untagged'];
                    tags.forEach(tag => {
                        if (!groups[tag]) groups[tag] = [];
                        groups[tag].push({ path: pathStr, method: method.toUpperCase(), operation });
                    });
                }
            }

            // Build header summary
            let html = `
                <div class="api-docs-summary">
                    <span class="api-docs-title">${this._escapeHtml(info.title || 'API')} <span class="api-docs-version">v${this._escapeHtml(info.version || '0.0.0')}</span></span>
                    <span class="api-docs-count">${totalEndpoints} endpoint${totalEndpoints !== 1 ? 's' : ''}</span>
                </div>
            `;

            // Build tag groups
            const sortedTags = Object.keys(groups).sort();
            for (const tag of sortedTags) {
                const endpoints = groups[tag];
                html += `
                    <div class="api-tag-group" data-tag="${this._escapeHtml(tag)}">
                        <div class="api-tag-header" onclick="this.parentElement.classList.toggle('collapsed')">
                            <span class="codicon codicon-chevron-down api-tag-chevron"></span>
                            <span class="api-tag-name">${this._escapeHtml(tag)}</span>
                            <span class="api-tag-count">${endpoints.length}</span>
                        </div>
                        <div class="api-tag-endpoints">
                `;

                for (const ep of endpoints) {
                    const op = ep.operation;
                    const methodClass = `api-method-${ep.method.toLowerCase()}`;
                    const summary = op.summary || op.description || '';
                    const params = op.parameters || [];
                    const requestBody = op.requestBody;
                    const responses = op.responses || {};

                    html += `
                        <div class="api-endpoint" data-path="${this._escapeHtml(ep.path)}" data-method="${ep.method}">
                            <div class="api-endpoint-header" onclick="this.parentElement.classList.toggle('expanded')">
                                <span class="api-method-badge ${methodClass}">${ep.method}</span>
                                <span class="api-endpoint-path">${this._escapeHtml(ep.path)}</span>
                                <span class="api-endpoint-summary">${this._escapeHtml(summary)}</span>
                            </div>
                            <div class="api-endpoint-detail">
                    `;

                    // Parameters section
                    if (params.length > 0) {
                        html += `<div class="api-section"><h4>Parameters</h4><table class="api-params-table">
                            <thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>`;
                        for (const p of params) {
                            const pType = p.schema?.type || 'string';
                            html += `<tr>
                                <td><code>${this._escapeHtml(p.name)}</code></td>
                                <td>${this._escapeHtml(p.in)}</td>
                                <td>${this._escapeHtml(pType)}</td>
                                <td>${p.required ? '✓' : ''}</td>
                                <td>${this._escapeHtml(p.description || '')}</td>
                            </tr>`;
                        }
                        html += `</tbody></table></div>`;
                    }

                    // Request body
                    if (requestBody) {
                        const bodyContent = requestBody.content || {};
                        const jsonSchema = bodyContent['application/json']?.schema;
                        html += `<div class="api-section"><h4>Request Body</h4>`;
                        if (jsonSchema) {
                            html += `<pre class="api-schema">${this._escapeHtml(JSON.stringify(jsonSchema, null, 2))}</pre>`;
                        }
                        html += `</div>`;
                    }

                    // Responses
                    if (Object.keys(responses).length > 0) {
                        html += `<div class="api-section"><h4>Responses</h4>`;
                        for (const [code, resp] of Object.entries(responses)) {
                            const statusClass = code.startsWith('2') ? 'success' : code.startsWith('4') ? 'client-error' : code.startsWith('5') ? 'server-error' : '';
                            html += `<div class="api-response ${statusClass}">
                                <span class="api-response-code">${this._escapeHtml(code)}</span>
                                <span class="api-response-desc">${this._escapeHtml(resp.description || '')}</span>
                            </div>`;
                            const respContent = resp.content?.['application/json']?.schema;
                            if (respContent) {
                                html += `<pre class="api-schema">${this._escapeHtml(JSON.stringify(respContent, null, 2))}</pre>`;
                            }
                        }
                        html += `</div>`;
                    }

                    html += `</div></div>`;
                }

                html += `</div></div>`;
            }

            if (totalEndpoints === 0) {
                html += `
                    <div class="empty-state">
                        <span class="codicon codicon-info" style="font-size: 36px;"></span>
                        <p>No API endpoints found in the specification.</p>
                    </div>
                `;
            }

            container.innerHTML = html;
        },

        /**
         * Filter API endpoints by search text
         */
        _filterAPIEndpoints(query) {
            const endpoints = document.querySelectorAll('.api-endpoint');
            const tagGroups = document.querySelectorAll('.api-tag-group');

            endpoints.forEach(ep => {
                const path = (ep.dataset.path || '').toLowerCase();
                const method = (ep.dataset.method || '').toLowerCase();
                const summary = (ep.querySelector('.api-endpoint-summary')?.textContent || '').toLowerCase();
                const matches = !query || path.includes(query) || method.includes(query) || summary.includes(query);
                ep.style.display = matches ? '' : 'none';
            });

            // Hide tag groups with no visible endpoints
            tagGroups.forEach(group => {
                const visibleEndpoints = group.querySelectorAll('.api-endpoint:not([style*="display: none"])');
                group.style.display = visibleEndpoints.length > 0 ? '' : 'none';
            });
        },

        /**
         * Escape HTML for safe rendering
         */
        _escapeHtml(str) {
            if (typeof str !== 'string') return '';
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }
    });
})(SecondaryPanelApp);
