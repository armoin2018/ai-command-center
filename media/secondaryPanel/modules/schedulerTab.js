/**
 * Scheduler Tab Module
 * Extracted from SecondaryPanelApp (AICC-0219 / 0220 / 0221)
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 */
(function (App) {
    Object.assign(App.prototype, {

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

                // Display actions — show count + primary action
                let actionDisplay = '';
                if (Array.isArray(t.actions) && t.actions.length > 0) {
                    actionDisplay = `<code>${this.escapeSchedulerHtml(t.actions[0].actionId)}</code>`;
                    if (t.actions.length > 1) {
                        actionDisplay += ` <span class="sched-action-badge">+${t.actions.length - 1}</span>`;
                    }
                } else {
                    actionDisplay = `<code>${this.escapeSchedulerHtml(t.actionId)}</code>`;
                }

                return `
                    <tr data-sched-id="${this.escapeSchedulerHtml(t.id)}">
                        <td>${this.escapeSchedulerHtml(t.name)}</td>
                        <td>${this.escapeSchedulerHtml(t.schedule)}</td>
                        <td>${actionDisplay}</td>
                        <td><span class="scheduler-status ${statusClass}">● ${statusLabel}</span></td>
                        <td class="scheduler-countdown" data-next-run="${t.nextRun || ''}">${t.enabled && t.nextRun ? this.formatCountdown(t.nextRun) : '—'}</td>
                        <td>${lastRunStr}</td>
                        <td class="scheduler-actions">
                            <button title="Edit" data-sched-action="edit" data-sched-id="${this.escapeSchedulerHtml(t.id)}"><span class="codicon codicon-edit"></span></button>
                            <button title="${t.enabled ? 'Pause' : 'Resume'}" data-sched-action="toggle" data-sched-id="${this.escapeSchedulerHtml(t.id)}"><span class="codicon codicon-${t.enabled ? 'debug-pause' : 'play'}"></span></button>
                            <button title="Restart" data-sched-action="restart" data-sched-id="${this.escapeSchedulerHtml(t.id)}"><span class="codicon codicon-refresh"></span></button>
                            <button title="Delete" data-sched-action="delete" data-sched-id="${this.escapeSchedulerHtml(t.id)}"><span class="codicon codicon-trash"></span></button>
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
                        <button class="btn-add-task" id="sched-add-task-btn">
                            <span class="codicon codicon-add"></span> Add Task
                        </button>
                    </div>
                    ${tableHTML}
                </div>
            `;

            // Bind event listeners (CSP-safe — no inline onclick)
            this.bindSchedulerEvents();

            // Start countdown interval
            this.startSchedulerCountdowns();
        },

        /**
         * Show scheduler task create/edit modal (AICC-0220)
         * Supports multiple actions per task, all action types, and toggle switch.
         */
        showSchedulerModal(taskId) {
            const task = taskId ? this.schedulerTasks.find(t => t.id === taskId) : null;
            const isEdit = !!task;

            // Parse existing actions array (or fall back to legacy single actionId)
            let existingActions = [];
            if (task) {
                if (Array.isArray(task.actions) && task.actions.length > 0) {
                    existingActions = task.actions;
                } else if (task.actionId) {
                    // Legacy single-action format → normalise to actions array
                    let parsedParams = {};
                    try { parsedParams = typeof task.params === 'string' ? JSON.parse(task.params) : (task.params || {}); } catch (_) { /* empty */ }
                    existingActions = [{ actionId: task.actionId, command: task.actionId, args: parsedParams, order: 0 }];
                }
            }

            const enabledChecked = !task || task.enabled;

            const modalBody = `
                <div class="scheduler-form">
                    <div class="sched-modal-top-row">
                        <div class="form-group" style="flex:1;">
                            <label for="sched-name">Name</label>
                            <input type="text" id="sched-name" placeholder="e.g., Nightly Archive" value="${task ? this.escapeSchedulerHtml(task.name) : ''}" />
                        </div>
                        <div class="sched-toggle-wrap" title="${enabledChecked ? 'Enabled' : 'Disabled'}">
                            <label class="sched-toggle-switch">
                                <input type="checkbox" id="sched-enabled" ${enabledChecked ? 'checked' : ''}>
                                <span class="sched-toggle-slider"></span>
                            </label>
                            <span class="sched-toggle-label" id="sched-enabled-label">${enabledChecked ? 'Enabled' : 'Disabled'}</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="sched-pattern">Schedule Pattern</label>
                        <input type="text" id="sched-pattern" placeholder="e.g., */30 * * * * or 'Every 30 min'" value="${task ? this.escapeSchedulerHtml(task.schedule) : ''}" />
                    </div>

                    <div class="form-group">
                        <label>
                            Commands
                            <button class="sched-action-add-btn" id="sched-add-action" title="Add command">
                                <span class="codicon codicon-add"></span>
                            </button>
                        </label>
                        <div id="sched-actions-list" class="sched-actions-list">
                            ${existingActions.length > 0
                                ? existingActions.map((a, i) => this._renderSchedulerActionRow(a, i)).join('')
                                : this._renderSchedulerActionRow(null, 0)}
                        </div>
                    </div>

                    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
                        <button class="modal-btn modal-btn-secondary" id="sched-modal-cancel">Cancel</button>
                        <button class="modal-btn modal-btn-primary" id="sched-modal-save" data-task-id="${taskId || ''}">
                            ${isEdit ? 'Update' : 'Create'}
                        </button>
                    </div>
                </div>
            `;

            this.showModal(isEdit ? `Edit Task: ${task.name}` : 'New Scheduled Task', modalBody);

            // Bind modal events
            this._bindSchedulerModalEvents(taskId);
        },

        /**
         * Action type definitions used across the scheduler modal
         */
        _getSchedulerActionTypes() {
            return [
                { group: 'System Commands', items: [
                    { id: 'plan.create', label: 'plan.create — Create plan item' },
                    { id: 'plan.update', label: 'plan.update — Update plan item' },
                    { id: 'plan.updateStatus', label: 'plan.updateStatus — Update status' },
                    { id: 'plan.delete', label: 'plan.delete — Delete plan item' },
                    { id: 'plan.archive', label: 'plan.archive — Archive items' },
                    { id: 'plan.sync', label: 'plan.sync — Jira sync' },
                    { id: 'plan.reload', label: 'plan.reload — Reload PLAN.json' },
                ]},
                { group: 'Prompts', items: [
                    { id: 'prompt.run', label: 'prompt.run — Run a saved prompt' },
                    { id: 'prompt.chat', label: 'prompt.chat — Send chat message' },
                ]},
                { group: 'Skills', items: [
                    { id: 'skill.invoke', label: 'skill.invoke — Invoke a skill' },
                    { id: 'skill.scheduler', label: 'skill.scheduler — Scheduler skill' },
                ]},
                { group: 'Custom', items: [
                    { id: 'custom.shell', label: 'custom.shell — Shell command' },
                    { id: 'custom.script', label: 'custom.script — Run script file' },
                    { id: 'custom.prompt', label: 'custom.prompt — Custom AI prompt' },
                    { id: 'ideation.jiraSync', label: 'ideation.jiraSync — Ideation Jira Sync' },
                ]},
            ];
        },

        /**
         * Render a single action (command) row within the modal
         */
        _renderSchedulerActionRow(action, index) {
            const groups = this._getSchedulerActionTypes();
            const selectedId = action ? (action.actionId || action.command || '') : '';
            const argsStr = action && action.args ? (typeof action.args === 'string' ? action.args : JSON.stringify(action.args, null, 2)) : '{}';
            const command = action && action.command ? action.command : '';

            const optgroups = groups.map(g =>
                `<optgroup label="${this.escapeSchedulerHtml(g.group)}">
                    ${g.items.map(a =>
                        `<option value="${a.id}" ${selectedId === a.id ? 'selected' : ''}>${a.label}</option>`
                    ).join('')}
                 </optgroup>`
            ).join('');

            return `
                <div class="sched-action-row" data-sched-action-idx="${index}">
                    <div class="sched-action-row-header">
                        <span class="sched-action-order">#${index + 1}</span>
                        <select class="sched-action-select" data-field="actionId">
                            <option value="">-- Select Action Type --</option>
                            ${optgroups}
                            ${selectedId && !groups.some(g => g.items.some(a => a.id === selectedId))
                                ? `<option value="${this.escapeSchedulerHtml(selectedId)}" selected>${this.escapeSchedulerHtml(selectedId)} — Custom</option>`
                                : ''}
                        </select>
                        <button class="sched-action-remove-btn" data-sched-remove-idx="${index}" title="Remove command">
                            <span class="codicon codicon-trash"></span>
                        </button>
                    </div>
                    <div class="sched-action-row-body">
                        <div class="form-group">
                            <label>Command</label>
                            <input type="text" class="sched-action-command" data-field="command" placeholder="Command string or path" value="${this.escapeSchedulerHtml(command)}" />
                        </div>
                        <div class="form-group">
                            <label>Arguments (JSON)</label>
                            <textarea class="sched-action-args" data-field="args" placeholder='{"key": "value"}'>${this.escapeSchedulerHtml(argsStr)}</textarea>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Bind all events inside the scheduler modal
         */
        _bindSchedulerModalEvents(taskId) {
            // Cancel
            document.getElementById('sched-modal-cancel')?.addEventListener('click', () => {
                this.closeModal();
            });

            // Save
            document.getElementById('sched-modal-save')?.addEventListener('click', () => {
                this.saveSchedulerTask(taskId || '');
            });

            // Toggle label update
            const enabledCb = document.getElementById('sched-enabled');
            const enabledLabel = document.getElementById('sched-enabled-label');
            if (enabledCb && enabledLabel) {
                enabledCb.addEventListener('change', () => {
                    enabledLabel.textContent = enabledCb.checked ? 'Enabled' : 'Disabled';
                    enabledCb.closest('.sched-toggle-wrap').title = enabledCb.checked ? 'Enabled' : 'Disabled';
                });
            }

            // Add action button
            document.getElementById('sched-add-action')?.addEventListener('click', () => {
                const list = document.getElementById('sched-actions-list');
                if (!list) return;
                const idx = list.querySelectorAll('.sched-action-row').length;
                const html = this._renderSchedulerActionRow(null, idx);
                list.insertAdjacentHTML('beforeend', html);
                this._rebindActionRowRemoveButtons();
            });

            // Bind remove buttons
            this._rebindActionRowRemoveButtons();

            // Auto-fill command when action type is selected
            const list = document.getElementById('sched-actions-list');
            if (list) {
                list.addEventListener('change', (e) => {
                    if (e.target.classList.contains('sched-action-select')) {
                        const row = e.target.closest('.sched-action-row');
                        const cmdInput = row?.querySelector('.sched-action-command');
                        if (cmdInput && !cmdInput.value) {
                            cmdInput.value = e.target.value;
                        }
                    }
                });
            }
        },

        /**
         * Rebind remove buttons for action rows (after adding new rows)
         */
        _rebindActionRowRemoveButtons() {
            const list = document.getElementById('sched-actions-list');
            if (!list) return;
            list.querySelectorAll('.sched-action-remove-btn').forEach(btn => {
                // Clone to remove previous listeners
                const newBtn = btn.cloneNode(true);
                btn.replaceWith(newBtn);
                newBtn.addEventListener('click', () => {
                    const rows = list.querySelectorAll('.sched-action-row');
                    if (rows.length <= 1) return; // must keep at least one
                    newBtn.closest('.sched-action-row')?.remove();
                    // Re-number remaining rows
                    list.querySelectorAll('.sched-action-row').forEach((r, i) => {
                        r.dataset.schedActionIdx = i;
                        const orderEl = r.querySelector('.sched-action-order');
                        if (orderEl) orderEl.textContent = '#' + (i + 1);
                        const rmBtn = r.querySelector('.sched-action-remove-btn');
                        if (rmBtn) rmBtn.dataset.schedRemoveIdx = i;
                    });
                });
            });
        },

        /**
         * Save (create or update) a scheduler task from the modal form.
         * Collects multiple actions from the dynamic actions list.
         */
        saveSchedulerTask(taskId) {
            const name = document.getElementById('sched-name')?.value?.trim();
            const schedule = document.getElementById('sched-pattern')?.value?.trim();
            const enabled = document.getElementById('sched-enabled')?.checked ?? true;

            if (!name || !schedule) return; // basic guard

            // Collect all action rows
            const rows = document.querySelectorAll('#sched-actions-list .sched-action-row');
            const actions = [];
            rows.forEach((row, i) => {
                const actionId = row.querySelector('[data-field="actionId"]')?.value || '';
                const command = row.querySelector('[data-field="command"]')?.value?.trim() || actionId;
                const argsStr = row.querySelector('[data-field="args"]')?.value?.trim() || '{}';
                if (!actionId && !command) return; // skip empty rows
                let args = {};
                try { args = JSON.parse(argsStr); } catch (_) { /* keep empty */ }
                actions.push({ actionId: actionId || command, command: command || actionId, args, order: i });
            });

            if (actions.length === 0) return; // must have at least one action

            // Determine schedule type and value for the engine
            const isCron = /[\*\/]/.test(schedule);
            const scheduleType = isCron ? 'cron' : 'interval';
            let scheduleValue = schedule;
            if (!isCron) {
                const match = schedule.match(/(\d+)\s*(s|sec|min|h|hr|hour|d|day)/i);
                if (match) {
                    const num = parseInt(match[1], 10);
                    const unit = match[2].toLowerCase();
                    const multipliers = { s: 1000, sec: 1000, min: 60000, h: 3600000, hr: 3600000, hour: 3600000, d: 86400000, day: 86400000 };
                    scheduleValue = String(num * (multipliers[unit] || 60000));
                }
            }

            // Back-compat: also set top-level actionId to the first action for the engine
            const primaryActionId = actions[0].actionId;
            const primaryParams = actions[0].args;

            if (taskId) {
                this.sendMessage('removeSchedulerTask', { id: taskId });
                const task = {
                    id: taskId,
                    name,
                    actionId: primaryActionId,
                    params: primaryParams,
                    actions,
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
                const newTask = {
                    id: 'sched-' + Date.now(),
                    name,
                    actionId: primaryActionId,
                    params: primaryParams,
                    actions,
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
            this.sendMessage('getSchedulerTasks');
        },

        /**
         * Bind event listeners for scheduler controls (CSP-safe delegation)
         */
        bindSchedulerEvents() {
            // Add Task button
            document.getElementById('sched-add-task-btn')?.addEventListener('click', () => {
                this.showSchedulerModal();
            });

            // Delegate action buttons inside the scheduler table
            const table = document.querySelector('.scheduler-table');
            if (table) {
                table.addEventListener('click', (e) => {
                    const btn = e.target.closest('button[data-sched-action]');
                    if (!btn) return;
                    const action = btn.getAttribute('data-sched-action');
                    const taskId = btn.getAttribute('data-sched-id');
                    if (!taskId) return;

                    switch (action) {
                        case 'edit':    this.showSchedulerModal(taskId); break;
                        case 'toggle':  this.toggleSchedulerTask(taskId); break;
                        case 'restart': this.restartSchedulerTask(taskId); break;
                        case 'delete':  this.deleteSchedulerTask(taskId); break;
                    }
                });
            }
        },

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
        },

        /**
         * Delete a scheduler task
         */
        deleteSchedulerTask(taskId) {
            this.sendMessage('removeSchedulerTask', { id: taskId });
            this.schedulerTasks = this.schedulerTasks.filter(t => t.id !== taskId);
            this.renderSchedulerTab();
        },

        /**
         * Restart a scheduler task (disable then re-enable to reset timers and clear errors)
         */
        restartSchedulerTask(taskId) {
            const task = this.schedulerTasks.find(t => t.id === taskId);
            if (!task) return;
            this.sendMessage('restartSchedulerTask', { id: taskId });
            // Optimistic update
            task.enabled = true;
            task.status = 'active';
            this.renderSchedulerTab();
        },

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
                    actions: t.actions || [],
                    params: typeof t.params === 'object' ? JSON.stringify(t.params) : (t.params || '{}'),
                    status: t.enabled ? (t.lastResult === 'error' ? 'error' : 'active') : 'paused',
                    nextRun: t.nextRun ? new Date(t.nextRun).getTime() : null,
                    lastRun: t.lastRun,
                    enabled: t.enabled,
                    scheduleType: t.scheduleType,
                    scheduleValue: t.scheduleValue
                };
            });
            this.schedulerLoaded = true;
            if (this.currentPanelId === 'scheduler') {
                this.renderSchedulerTab();
            }
        },

        /**
         * Start live countdown interval (AICC-0221)
         */
        startSchedulerCountdowns() {
            // Clear any existing interval
            if (this.schedulerCountdownInterval) {
                clearInterval(this.schedulerCountdownInterval);
            }
            this.schedulerCountdownInterval = setInterval(() => this.updateSchedulerCountdowns(), 1000);
        },

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
        },

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
    });
})(SecondaryPanelApp);
