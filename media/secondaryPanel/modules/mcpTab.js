/**
 * MCP Servers Tab Module
 * Extracted from SecondaryPanelApp (AICC-0085/0086/0087, AICC-0241–0247)
 * Includes MCP Port Dashboard (REQ-MPD-001–007)
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 */
(function (App) {
    Object.assign(App.prototype, {

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
        },

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
        },

        /**
         * Send an MCP server action (start/stop/restart) (AICC-0243)
         */
        _mcpServerAction(action) {
            // Disable buttons during transition
            const btns = document.querySelectorAll('.mcp-btn');
            btns.forEach(btn => btn.setAttribute('disabled', 'true'));

            this.sendMessage('mcpServerAction', { action });
        },

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
        },

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
        },

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
        },

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
        },

        /**
         * Stop MCP auto-refresh interval (AICC-0246)
         */
        _stopMcpAutoRefresh() {
            if (this.mcpAutoRefreshInterval) {
                clearInterval(this.mcpAutoRefreshInterval);
                this.mcpAutoRefreshInterval = null;
            }
        },

        /**
         * Get CSS class for MCP health indicator (AICC-0245)
         */
        _mcpHealthClass(status) {
            if (!status.isRunning && status.connectionState === 'disconnected') return 'stopped';
            if (status.connectionState === 'connected') return 'healthy';
            if (status.connectionState === 'reconnecting') return 'reconnecting';
            if (status.connectionState === 'disconnected') return 'disconnected';
            return 'starting';
        },

        /**
         * Get label for MCP health indicator (AICC-0245)
         */
        _mcpHealthLabel(status) {
            if (!status.isRunning && status.connectionState === 'disconnected') return 'Stopped';
            if (status.connectionState === 'connected') return 'Healthy';
            if (status.connectionState === 'reconnecting') return 'Reconnecting';
            if (status.connectionState === 'disconnected') return 'Disconnected';
            return 'Starting…';
        },

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
        },

        // ── MCP Port Dashboard (REQ-MPD-001 – REQ-MPD-007) ──

        /**
         * Handle port scan result from backend (supports partial Phase 1 results)
         */
        handleMcpPortScanResult(payload) {
            if (payload.partial) {
                // Phase 1 partial: update only if we don't have enriched data yet
                if (!this.mcpPortScanData || this.mcpPortScanData.length === 0) {
                    this.mcpPortScanData = payload.ports || [];
                    if (this.currentPanelId === 'mcp') {
                        this._renderPortDashboardSection();
                    }
                }
            } else {
                // Phase 2 complete: full enriched data
                this.mcpPortScanData = payload.ports || [];
                if (this.currentPanelId === 'mcp') {
                    this._renderPortDashboardSection();
                }
            }
        },

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
                const wsCount = p.workspaceCount != null ? p.workspaceCount : (p.listening ? '…' : '—');
                const version = p.version || (p.listening ? '…' : '—');
                const pid = p.pid || (p.listening ? '…' : '—');
                const role = p.role || (p.listening ? '…' : '—');
                const warnBadge = p.listening && p.workspaceCount != null && p.workspaceCount === 0
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
    });
})(SecondaryPanelApp);
