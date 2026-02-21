/**
 * Shared Actions Library
 * 
 * Centralized action registry for the AI Command Center Secondary Panel.
 * Provides namespaced action handlers, shared lookup maps, and utility functions
 * accessible across all components. Uses variable function maps instead of
 * switch/case or if/then blocks for dispatch.
 * 
 * Usage:
 *   const actions = window.AICC.actions;
 *   actions.dispatch('message.init', payload, context);
 *   actions.register('message.customEvent', (payload, ctx) => { ... });
 *   const color = actions.lookup('statusColors', 'IN-PROGRESS');
 */

(function () {
    'use strict';

    window.AICC = window.AICC || {};

    // =========================================================================
    //  ActionRegistry - Core dispatch engine
    // =========================================================================

    class ActionRegistry {
        constructor() {
            /** @type {Map<string, Function>} Namespaced action handlers */
            this._handlers = new Map();

            /** @type {Map<string, Object>} Named lookup maps */
            this._lookups = new Map();

            /** @type {Map<string, Function[]>} Event subscribers */
            this._subscribers = new Map();

            // Bootstrap built-in lookups and actions
            this._registerBuiltinLookups();
        }

        // =====================================================================
        //  Registration API
        // =====================================================================

        /**
         * Register a single action handler.
         * @param {string} name  Dot-namespaced key, e.g. 'message.init'
         * @param {Function} handler  (payload, context) => void
         * @returns {ActionRegistry} this (chainable)
         */
        register(name, handler) {
            if (typeof handler !== 'function') {
                throw new TypeError(`Handler for "${name}" must be a function`);
            }
            this._handlers.set(name, handler);
            return this;
        }

        /**
         * Bulk-register a map of handlers under a namespace.
         * @param {string} namespace  e.g. 'message'
         * @param {Object<string, Function>} handlerMap  { init: fn, error: fn, ... }
         * @returns {ActionRegistry}
         */
        registerAll(namespace, handlerMap) {
            for (const [key, handler] of Object.entries(handlerMap)) {
                this.register(`${namespace}.${key}`, handler);
            }
            return this;
        }

        /**
         * Remove a registered handler.
         * @param {string} name
         * @returns {boolean}
         */
        unregister(name) {
            return this._handlers.delete(name);
        }

        /**
         * Check whether a handler exists.
         * @param {string} name
         * @returns {boolean}
         */
        has(name) {
            return this._handlers.has(name);
        }

        // =====================================================================
        //  Dispatch API
        // =====================================================================

        /**
         * Dispatch an action by name.
         * @param {string} name       Dot-namespaced key
         * @param {*}      payload    Data passed to the handler
         * @param {Object} [context]  Shared context (typically the app instance)
         * @returns {*} Return value of the handler, or undefined if not found
         */
        dispatch(name, payload, context) {
            const handler = this._handlers.get(name);
            if (handler) {
                return handler(payload, context);
            }
            console.warn(`[Actions] No handler registered for "${name}"`);
            return undefined;
        }

        /**
         * Dispatch an action, returning a default if the handler is missing.
         * @param {string} name
         * @param {*} payload
         * @param {Object} context
         * @param {*} defaultValue
         * @returns {*}
         */
        dispatchOr(name, payload, context, defaultValue) {
            const handler = this._handlers.get(name);
            return handler ? handler(payload, context) : defaultValue;
        }

        /**
         * Try dispatching to `namespace.key`; if missing, fall back to `namespace._default`.
         * Useful as a drop-in replacement for switch/default patterns.
         * @param {string} namespace
         * @param {string} key
         * @param {*} payload
         * @param {Object} context
         * @returns {*}
         */
        dispatchWithFallback(namespace, key, payload, context) {
            const primary = `${namespace}.${key}`;
            if (this._handlers.has(primary)) {
                return this._handlers.get(primary)(payload, context);
            }
            const fallback = `${namespace}._default`;
            if (this._handlers.has(fallback)) {
                return this._handlers.get(fallback)(payload, context);
            }
            console.warn(`[Actions] No handler or fallback for "${primary}"`);
            return undefined;
        }

        // =====================================================================
        //  Lookup Maps API
        // =====================================================================

        /**
         * Register a named lookup map.
         * @param {string} name
         * @param {Object} map
         * @returns {ActionRegistry}
         */
        registerLookup(name, map) {
            this._lookups.set(name, map);
            return this;
        }

        /**
         * Retrieve a value from a named lookup map.
         * @param {string} mapName
         * @param {string} key
         * @param {*} [fallback]
         * @returns {*}
         */
        lookup(mapName, key, fallback) {
            const map = this._lookups.get(mapName);
            if (!map) {
                console.warn(`[Actions] Unknown lookup map "${mapName}"`);
                return fallback;
            }
            return key in map ? map[key] : fallback;
        }

        /**
         * Retrieve the entire lookup map (read-only copy).
         * @param {string} mapName
         * @returns {Object|undefined}
         */
        getLookup(mapName) {
            const map = this._lookups.get(mapName);
            return map ? { ...map } : undefined;
        }

        /**
         * Extend an existing lookup map with additional entries.
         * @param {string} mapName
         * @param {Object} entries
         * @returns {ActionRegistry}
         */
        extendLookup(mapName, entries) {
            const existing = this._lookups.get(mapName) || {};
            this._lookups.set(mapName, { ...existing, ...entries });
            return this;
        }

        // =====================================================================
        //  Pub/Sub (cross-component events)
        // =====================================================================

        /**
         * Subscribe to a named event.
         * @param {string} event
         * @param {Function} callback
         * @returns {Function} unsubscribe function
         */
        on(event, callback) {
            if (!this._subscribers.has(event)) {
                this._subscribers.set(event, []);
            }
            this._subscribers.get(event).push(callback);
            return () => this.off(event, callback);
        }

        /**
         * Unsubscribe from an event.
         * @param {string} event
         * @param {Function} callback
         */
        off(event, callback) {
            const subs = this._subscribers.get(event);
            if (subs) {
                this._subscribers.set(event, subs.filter(fn => fn !== callback));
            }
        }

        /**
         * Emit an event to all subscribers.
         * @param {string} event
         * @param {*} data
         */
        emit(event, data) {
            const subs = this._subscribers.get(event);
            if (subs) {
                subs.forEach(fn => {
                    try { fn(data); } catch (err) {
                        console.error(`[Actions] Subscriber error on "${event}":`, err);
                    }
                });
            }
        }

        // =====================================================================
        //  Utility Helpers
        // =====================================================================

        /**
         * List all registered handler names (useful for debugging).
         * @param {string} [namespace] Optional filter prefix
         * @returns {string[]}
         */
        listHandlers(namespace) {
            const all = Array.from(this._handlers.keys());
            return namespace ? all.filter(k => k.startsWith(namespace + '.')) : all;
        }

        /**
         * List all registered lookup map names.
         * @returns {string[]}
         */
        listLookups() {
            return Array.from(this._lookups.keys());
        }

        // =====================================================================
        //  Built-in Lookup Maps
        // =====================================================================

        /** @private */
        _registerBuiltinLookups() {

            // -----------------------------------------------------------------
            //  Status colours (shared across accordion, badges, components)
            // -----------------------------------------------------------------
            this.registerLookup('statusColors', {
                'BACKLOG':      '#eab308',
                'READY':        '#f97316',
                'IN-PROGRESS':  '#14b8a6',
                'BLOCKED':      '#ff0000',
                'REVIEW':       '#3b82f6',
                'DONE':         '#22c55e',
                'SKIP':         '#9ca3af',
                // Legacy lowercase aliases
                'todo':         '#eab308',
                'open':         '#3b82f6',
                'done':         '#22c55e',
                'in-progress':  '#14b8a6',
                'ready':        '#f97316',
                'error':        '#ff0000',
                'hold':         '#6b7280',
                'backlog':      '#eab308',
                'blocked':      '#ff0000',
                'review':       '#3b82f6',
                'skip':         '#9ca3af'
            });

            // -----------------------------------------------------------------
            //  Status → Bootstrap colour name (no 'bg-' prefix)
            // -----------------------------------------------------------------
            this.registerLookup('statusBadgeColor', {
                'todo':         'secondary',
                'ready':        'info',
                'in-progress':  'primary',
                'review':       'warning',
                'done':         'success',
                'blocked':      'danger',
                'backlog':      'secondary',
                'skip':         'secondary'
            });

            // -----------------------------------------------------------------
            //  Status → Bootstrap badge class (for jQuery/Bootstrap components)
            // -----------------------------------------------------------------
            this.registerLookup('statusBadgeClass', {
                'todo':         'bg-secondary',
                'ready':        'bg-info',
                'in-progress':  'bg-primary',
                'review':       'bg-warning text-dark',
                'done':         'bg-success',
                'blocked':      'bg-danger',
                'backlog':      'bg-secondary',
                'skip':         'bg-secondary',
                'BACKLOG':      'bg-secondary',
                'READY':        'bg-info',
                'IN-PROGRESS':  'bg-primary',
                'REVIEW':       'bg-warning text-dark',
                'DONE':         'bg-success',
                'BLOCKED':      'bg-danger',
                'SKIP':         'bg-secondary'
            });

            // -----------------------------------------------------------------
            //  Priority → Bootstrap badge class
            // -----------------------------------------------------------------
            this.registerLookup('priorityBadgeClass', {
                'low':      'bg-secondary',
                'medium':   'bg-info',
                'high':     'bg-warning text-dark',
                'critical': 'bg-danger'
            });

            // -----------------------------------------------------------------
            //  Priority → Codicon icon HTML
            // -----------------------------------------------------------------
            this.registerLookup('priorityIcons', {
                'critical': '<span class="codicon codicon-flame" style="color:#ef4444;" title="Priority: Critical" aria-label="Critical priority" aria-hidden="true"></span>',
                'high':     '<span class="codicon codicon-arrow-up" style="color:#f97316;" title="Priority: High" aria-label="High priority" aria-hidden="true"></span>',
                'medium':   '<span class="codicon codicon-dash" style="color:#6b7280;" title="Priority: Medium" aria-label="Medium priority" aria-hidden="true"></span>',
                'low':      '<span class="codicon codicon-arrow-down" style="color:#22c55e;" title="Priority: Low" aria-label="Low priority" aria-hidden="true"></span>'
            });

            // -----------------------------------------------------------------
            //  Item type → Codicon icon name
            // -----------------------------------------------------------------
            this.registerLookup('typeIcons', {
                'epic':  'layers',
                'story': 'bookmark',
                'task':  'circle-outline',
                'bug':   'bug'
            });

            // -----------------------------------------------------------------
            //  Legacy status normalisation (old lowercase → uppercase canonical)
            // -----------------------------------------------------------------
            this.registerLookup('statusNormalize', {
                'backlog':      'BACKLOG',
                'todo':         'BACKLOG',
                'not-started':  'BACKLOG',
                'ready':        'READY',
                'in-progress':  'IN-PROGRESS',
                'blocked':      'BLOCKED',
                'error':        'BLOCKED',
                'review':       'REVIEW',
                'done':         'DONE',
                'hold':         'BLOCKED',
                'skip':         'SKIP'
            });

            // -----------------------------------------------------------------
            //  Canonical status list (ordered for UI rendering)
            // -----------------------------------------------------------------
            this.registerLookup('statusOrder', {
                'BACKLOG':      0,
                'READY':        1,
                'IN-PROGRESS':  2,
                'BLOCKED':      3,
                'REVIEW':       4,
                'DONE':         5,
                'SKIP':         6
            });

            // -----------------------------------------------------------------
            //  Relationship types (for links tab)
            // -----------------------------------------------------------------
            this.registerLookup('relationshipTypes', {
                'depends-on':  'Depends On',
                'done-before': 'Done Before',
                'done-after':  'Done After',
                'blocks':      'Blocks',
                'blocked-by':  'Blocked By',
                'related':     'Related',
                'duplicates':  'Duplicates',
                'parent':      'Parent',
                'child':       'Child'
            });

            // -----------------------------------------------------------------
            //  Item action → accordion tab mapping
            // -----------------------------------------------------------------
            this.registerLookup('actionTabMap', {
                'edit':         'edit',
                'ai-settings':  'ai-settings',
                'info':         'info',
                'metadata':     'metadata',
                'connections':  'links',
                'repo':         'repo',
                'comments':     'comments'
            });

            // -----------------------------------------------------------------
            //  Frontend-only tab IDs (handled locally, not by backend)
            // -----------------------------------------------------------------
            this.registerLookup('localTabs', {
                'intakes':          true,
                'component-catalog': true
            });
        }
    }

    // =========================================================================
    //  Shared Utility Functions
    // =========================================================================

    /**
     * Collection of stateless utility functions available to all components.
     * Avoids duplicated helper code across app.js and component scripts.
     */
    const SharedUtils = {

        /**
         * HTML-escape a string.
         * @param {string} str
         * @returns {string}
         */
        escapeHtml(str) {
            if (!str) return '';
            return str.toString()
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },

        /**
         * Normalise a status value to its canonical uppercase form.
         * @param {string} status
         * @returns {string}
         */
        normalizeStatus(status) {
            if (!status) return 'BACKLOG';
            const upper = status.toUpperCase();
            // Already canonical?
            if (window.AICC.actions.lookup('statusOrder', upper) !== undefined) {
                return upper;
            }
            return window.AICC.actions.lookup('statusNormalize', status.toLowerCase(), 'BACKLOG');
        },

        /**
         * Get the colour for a status value.
         * @param {string} status
         * @returns {string} CSS colour
         */
        getStatusColor(status) {
            return window.AICC.actions.lookup('statusColors', status)
                || window.AICC.actions.lookup('statusColors', SharedUtils.normalizeStatus(status))
                || '#6b7280';
        },

        /**
         * Get Bootstrap badge class for a status.
         * @param {string} status
         * @returns {string}
         */
        getStatusBadgeClass(status) {
            return window.AICC.actions.lookup('statusBadgeClass', status, 'bg-secondary');
        },

        /**
         * Get Bootstrap colour name (no 'bg-' prefix) for a status.
         * @param {string} status
         * @returns {string}
         */
        getStatusBadgeColor(status) {
            return window.AICC.actions.lookup('statusBadgeColor', status, 'secondary');
        },

        /**
         * Get Bootstrap badge class for a priority.
         * @param {string} priority
         * @returns {string}
         */
        getPriorityBadgeClass(priority) {
            return window.AICC.actions.lookup('priorityBadgeClass', (priority || 'medium').toLowerCase(), 'bg-info');
        },

        /**
         * Get codicon icon name for an item type.
         * @param {string} type
         * @returns {string}
         */
        getTypeIcon(type) {
            return window.AICC.actions.lookup('typeIcons', type, 'file');
        },

        /**
         * Get priority icon HTML.
         * @param {string} priority
         * @returns {string}
         */
        getPriorityIcon(priority) {
            return window.AICC.actions.lookup('priorityIcons', (priority || 'medium').toLowerCase(), '');
        },

        /**
         * Format a timestamp for display.
         * @param {string|number|Date} timestamp
         * @returns {string}
         */
        formatTimestamp(timestamp) {
            if (!timestamp) return 'Never';
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },

        /**
         * Debounce a function.
         * @param {Function} fn
         * @param {number} delay ms
         * @returns {Function}
         */
        debounce(fn, delay) {
            let timer;
            return function (...args) {
                clearTimeout(timer);
                timer = setTimeout(() => fn.apply(this, args), delay);
            };
        }
    };

    // =========================================================================
    //  Pre-built Action Sets (register on demand)
    // =========================================================================

    /**
     * Message handler actions – replaces the switch/case in handleMessage().
     * Each key corresponds to a message.type received from the VS Code backend.
     * Handlers receive (payload, app) where app is the SecondaryPanelApp instance.
     */
    const MessageActions = {
        init(payload, app) {
            app.handleInit(payload);
        },
        panelChanged(payload, app) {
            app.handlePanelChanged(payload);
        },
        agentChanged(payload, app) {
            app.handleAgentChanged(payload);
        },
        mcpConfigUpdated(payload, app) {
            app.handleMcpConfigUpdated(payload);
        },
        intakeFormLoaded(payload, app) {
            app.renderIntakeForm(payload);
        },
        dataRefreshed(payload, app) {
            app.handleDataRefreshed(payload);
        },
        settingsUpdate(payload, app) {
            app.handleSettingsUpdate(payload);
        },
        aikitCatalog(payload, app) {
            console.log('[AIKIT] Rendering catalog with', payload?.kits?.length || 0, 'kits');
            app.renderAIKitCatalog(payload.kits);
        },
        aikitSettings(payload, app) {
            console.log('[AIKIT] Rendering settings for', payload.kitName);
            app.renderKitSettings(payload.settings, payload.kitName);
        },
        aikitConfiguration(payload, app) {
            console.log('[AIKIT] Rendering configuration for', payload.kitName);
            app.renderKitConfiguration(payload.config, payload.kitName);
        },
        aikitComponents(payload, app) {
            console.log('[AIKIT] Rendering components for', payload.kitName);
            app.renderKitComponents(payload.components, payload.installed);
        },
        error(payload, app) {
            console.error('[AIKIT] Error received:', payload.message);
            app.showError(payload.message);
        }
    };

    /**
     * Panel renderer actions – replaces the if/else chain in renderPanel().
     * Each key is a panel ID. Handlers receive (panelConfig, app).
     */
    const PanelActions = {
        planning(panelConfig, app) {
            document.querySelector('.body')?.classList.remove('api-docs-active');
            app.renderPlanningPanel();
        },
        'ai-kit-loader'(panelConfig, app) {
            document.querySelector('.body')?.classList.remove('api-docs-active');
            app.renderAIKitLoaderPanel();
        },
        'api-docs'(panelConfig, app) {
            document.querySelector('.body')?.classList.add('api-docs-active');
            app.renderAPIDocs();
        },
        _default(panelConfig, app) {
            document.querySelector('.body')?.classList.remove('api-docs-active');
            app.renderGenericPanel(panelConfig);
        }
    };

    /**
     * Item actions – replaces the handleItemAction() switch/tabMap.
     * Each key is an action name from data-action attributes.
     * Handlers receive ({ itemId, item }, app).
     */
    const ItemActions = {
        refine({ itemId }, app) {
            app.sendMessage('executeAction', {
                command: 'aicc.executePrompt',
                args: ['aicc-plan-refine', itemId]
            });
        },
        run({ itemId }, app) {
            app.sendMessage('runItem', { itemId });
        },
        edit({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'edit', app);
        },
        'ai-settings'({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'ai-settings', app);
        },
        info({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'info', app);
        },
        metadata({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'metadata', app);
        },
        connections({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'links', app);
        },
        repo({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'repo', app);
        },
        comments({ itemId }, app) {
            _expandAndSwitchTab(itemId, 'comments', app);
        }
    };

    /**
     * Local (frontend-only) tab renderers – replaces if/else in handleTabClick.
     * Handlers receive (tabId, app).
     */
    const LocalTabActions = {
        intakes(tabId, app) {
            app.renderIntakesPanel();
        },
        'component-catalog'(tabId, app) {
            app.renderComponentCatalog();
        }
    };

    /**
     * Intake field renderers – replaces the switch/case in renderIntakeField().
     * Each key is a field.type. Handlers receive (field, fieldId, required) and
     * return an HTML string for the input element.
     */
    const IntakeFieldRenderers = {
        text:     _renderTextInput,
        email:    _renderTextInput,
        url:      _renderTextInput,
        textarea: _renderTextarea,
        select:   _renderSelect,
        checkbox: _renderCheckbox,
        radio:    _renderRadio,
        _default: _renderTextInput
    };

    /**
     * Kit modal tab loaders – replaces switch in switchKitTab().
     * Handlers receive (kitName, app).
     */
    const KitTabActions = {
        settings(kitName, app) {
            app.loadKitSettings(kitName);
        },
        configuration(kitName, app) {
            app.loadKitConfiguration(kitName);
        },
        components(kitName, app) {
            app.loadKitComponents(kitName);
        }
    };

    /**
     * Form field renderers – replaces if/else in renderFieldInput().
     * Handlers receive (key, field, value, prefix) and return HTML.
     */
    const FormFieldRenderers = {
        boolean(key, field, value, prefix) {
            return `<input type="checkbox" id="${prefix}-${key}" name="${key}" ${value ? 'checked' : ''} />`;
        },
        enum(key, field, value, prefix) {
            const options = field.enum.map(opt =>
                `<option value="${opt}" ${opt === value ? 'selected' : ''}>${opt}</option>`
            ).join('');
            return `<select id="${prefix}-${key}" name="${key}" class="form-control">${options}</select>`;
        },
        number(key, field, value, prefix) {
            return `<input type="number" id="${prefix}-${key}" name="${key}" value="${value}" class="form-control" />`;
        },
        integer(key, field, value, prefix) {
            return FormFieldRenderers.number(key, field, value, prefix);
        },
        _default(key, field, value, prefix) {
            return `<input type="text" id="${prefix}-${key}" name="${key}" value="${value}" class="form-control" placeholder="${field.description || ''}" />`;
        }
    };

    // =========================================================================
    //  Private Helpers
    // =========================================================================

    /** Expand an accordion item and switch to a specific tab */
    function _expandAndSwitchTab(itemId, tabName, app) {
        if (!app.expandedItems.has(itemId)) {
            app.expandedItems.add(itemId);
            app.renderCurrentPanel();
        }
        setTimeout(() => app.switchTab(itemId, tabName), 100);
    }

    function _renderTextInput(field, fieldId, required) {
        return `
            <input 
                type="${field.type}" 
                id="${fieldId}" 
                name="${field.name}" 
                placeholder="${field.placeholder || ''}"
                ${required}
                ${field.pattern ? `pattern="${field.pattern}"` : ''}
            />
        `;
    }

    function _renderTextarea(field, fieldId, required) {
        return `
            <textarea 
                id="${fieldId}" 
                name="${field.name}" 
                rows="${field.rows || 4}"
                placeholder="${field.placeholder || ''}"
                ${required}
            ></textarea>
        `;
    }

    function _renderSelect(field, fieldId, required) {
        return `
            <select id="${fieldId}" name="${field.name}" ${required}>
                <option value="">-- Select --</option>
                ${(field.options || []).map(opt => `
                    <option value="${opt.value || opt}">${opt.label || opt}</option>
                `).join('')}
            </select>
        `;
    }

    function _renderCheckbox(field, fieldId, required) {
        const requiredMark = field.required ? '<span class="required-mark">*</span>' : '';
        return `
            <div class="checkbox-field">
                <input 
                    type="checkbox" 
                    id="${fieldId}" 
                    name="${field.name}" 
                    ${required}
                />
                <label for="${fieldId}">${field.label}${requiredMark}</label>
            </div>
        `;
    }

    function _renderRadio(field, fieldId, required) {
        return `
            <div class="radio-group">
                ${(field.options || []).map((opt, idx) => `
                    <div class="radio-option">
                        <input 
                            type="radio" 
                            id="${fieldId}-${idx}" 
                            name="${field.name}" 
                            value="${opt.value || opt}"
                            ${required && idx === 0 ? 'required' : ''}
                        />
                        <label for="${fieldId}-${idx}">${opt.label || opt}</label>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // =========================================================================
    //  Instantiate & Expose
    // =========================================================================

    const registry = new ActionRegistry();

    // Register pre-built action sets
    registry.registerAll('message', MessageActions);
    registry.registerAll('panel', PanelActions);
    registry.registerAll('item', ItemActions);
    registry.registerAll('localTab', LocalTabActions);
    registry.registerAll('intakeField', IntakeFieldRenderers);
    registry.registerAll('kitTab', KitTabActions);
    registry.registerAll('formField', FormFieldRenderers);

    // Public surface
    window.AICC.actions = registry;
    window.AICC.utils = SharedUtils;

    console.log('[Actions] Shared actions library initialised –',
        registry.listHandlers().length, 'handlers,',
        registry.listLookups().length, 'lookup maps');
})();
