/**
 * AI Kit Tab Module
 * Extracted from SecondaryPanelApp
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 *
 * Handles the AI Kit catalog panel: loading, rendering kit cards,
 * kit modal with settings/config/components tabs, installation,
 * and settings persistence.
 */
(function (App) {
    Object.assign(App.prototype, {

    renderAIKitLoaderPanel() {
        console.log('[AIKIT] Rendering AI Kit Loader panel');
        const content = document.getElementById('panel-content');
        if (!content) {
            console.error('[AIKIT] panel-content element not found');
            return;
        }
        
        const refClass = this.showComponentRefs ? 'component-ref visible' : 'component-ref';
        
        content.innerHTML = `
            <span class="${refClass}" style="top:0;left:100px;" data-ref="SEC-AIKIT-TAB">SEC-AIKIT-TAB</span>
            <div class="aikit-catalog-container">
                <div class="catalog-grid" id="catalog-grid">
                    <div class="loading">
                        <span class="codicon codicon-loading codicon-modifier-spin"></span>
                        <span>Loading AI Kits...</span>
                    </div>
                </div>
            </div>
        `;
        
        console.log('[AIKIT] Panel HTML rendered, loading catalog...');
        // Load available kits
        this.loadAIKitCatalog();
    },
    
    /**
     * Load AI Kit catalog from backend
     */
    async loadAIKitCatalog() {
        console.log('[AIKIT] loadAIKitCatalog() called');
        try {
            // Request catalog data from backend
            console.log('[AIKIT] Sending fetchData message to backend');
            this.sendMessage('fetchData', { 
                endpoint: 'aikit-catalog',
                params: {}
            });
            console.log('[AIKIT] fetchData message sent');
        } catch (error) {
            console.error('[AIKIT] Failed to load AI Kit catalog:', error);
            this.showAIKitError('Failed to load catalog: ' + error.message);
        }
    },
    
    /**
     * Render AI Kit catalog grid
     */
    renderAIKitCatalog(kits) {
        console.log('[AIKIT] renderAIKitCatalog() called with', kits?.length || 0, 'kits');
        const grid = document.getElementById('catalog-grid');
        if (!grid) {
            console.error('[AIKIT] catalog-grid element not found');
            return;
        }
        
        if (!kits || kits.length === 0) {
            console.log('[AIKIT] No kits available, showing empty message');
            grid.innerHTML = '<div class="empty-message">No AI Kits available</div>';
            return;
        }
        
        console.log('[AIKIT] Creating kit cards for', kits.length, 'kits');
        grid.innerHTML = kits.map(kit => this.createKitCard(kit)).join('');
        
        // Add click handlers
        const cards = grid.querySelectorAll('.kit-card');
        console.log('[AIKIT] Adding click handlers to', cards.length, 'kit cards');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const kitId = card.dataset.kitId;
                console.log('[AIKIT] Kit card clicked:', kitId);
                const kit = kits.find(k => k.name === kitId);
                if (kit) {
                    this.openKitModal(kit);
                } else {
                    console.error('[AIKIT] Kit not found:', kitId);
                }
            });
        });
        console.log('[AIKIT] Catalog rendering complete');
    },
    
    /**
     * Create kit card HTML
     */
    createKitCard(kit) {
        const iconData = kit.iconBase64 || this.getDefaultKitIcon();
        // Border colour class: blue=default, green=installed, white=not-installed, red=error
        let borderClass = '';
        if (kit.installStatus === 'error') {
            borderClass = ' kit-border-error';
        } else if (kit.installStatus === 'default') {
            borderClass = ' kit-border-default';
        } else if (kit.installStatus === 'installed') {
            borderClass = ' kit-border-installed';
        }
        return `
            <div class="kit-card" data-kit-id="${kit.name}">
                <div class="kit-icon${borderClass}">
                    <img src="${iconData}" alt="${kit.name}" />
                </div>
                <div class="kit-name">${kit.displayName || kit.name}</div>
            </div>
        `;
    },
    
    /**
     * Get default kit icon as base64
     */
    getDefaultKitIcon() {
        // Default package icon as base64 SVG
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHZpZXdCb3g9IjAgMCA3NSA3NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNzUiIGhlaWdodD0iNzUiIHJ4PSIxMCIgZmlsbD0iIzIxMjEyMSIvPgogIDxwYXRoIGQ9Ik0zNy41IDIwTDU1IDMwVjUwTDM3LjUgNjBMMjAgNTBWMzBMMzcuNSAyMFoiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CiAgPHBhdGggZD0iTTM3LjUgMjBWNjAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+CiAgPHBhdGggZD0iTTIwIDMwTDM3LjUgNDBMNTUgMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==';
    },
    
    /**
     * Open kit modal
     */
    openKitModal(kit) {
        console.log('[AIKIT] Opening modal for kit:', kit.name);
        const modal = document.getElementById('modal-overlay');
        const modalContainer = document.getElementById('modal-container');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        
        if (!modal || !modalContainer || !modalTitle || !modalBody) {
            console.error('[AIKIT] Modal elements not found');
            return;
        }
        
        // Set modal size for kit modal
        modalContainer.style.width = '80%';
        modalContainer.style.height = '80%';
        
        // Render modal header
        const iconData = kit.iconBase64 || this.getDefaultKitIcon();
        modalTitle.innerHTML = `
            <div class="kit-modal-header">
                <div class="kit-modal-icon">
                    <img src="${iconData}" alt="${kit.name}" />
                </div>
                <div class="kit-modal-title">${kit.displayName || kit.name}</div>
            </div>
        `;
        
        // Render modal body with tabs
        modalBody.innerHTML = `
            <div class="kit-modal-tabs">
                <div class="kit-tab-buttons">
                    <button class="kit-tab-btn active" data-tab="settings">Settings</button>
                    <button class="kit-tab-btn" data-tab="configuration">Configuration</button>
                    <button class="kit-tab-btn" data-tab="components">Bundles</button>
                </div>
                <div class="kit-tab-content">
                    <div class="kit-tab-pane active" id="tab-settings">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading settings...</span>
                        </div>
                    </div>
                    <div class="kit-tab-pane" id="tab-configuration">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading configuration...</span>
                        </div>
                    </div>
                    <div class="kit-tab-pane" id="tab-components">
                        <div class="loading">
                            <span class="codicon codicon-loading codicon-modifier-spin"></span>
                            <span>Loading bundles...</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="kit-modal-footer">
                <div class="footer-left">
                    <span class="last-updated">Last Updated: ${this.formatLastUpdated(kit.lastUpdated)}</span>
                </div>
                <div class="footer-right">
                    <button class="footer-btn primary" id="btn-save-kit">
                        <span class="codicon codicon-save"></span> Save
                    </button>
                </div>
            </div>
        `;
        
        // Setup tab switching
        modalBody.querySelectorAll('.kit-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchKitTab(tabName);
            });
        });
        
        // Setup save button
        modalBody.querySelector('#btn-save-kit')?.addEventListener('click', () => {
            this.saveKitSettings(kit.name);
        });
        
        // Show modal
        modal.style.display = 'flex';
        console.log('[AIKIT] Modal displayed');
        
        // Load initial tab content
        console.log('[AIKIT] Loading initial settings tab');
        this.loadKitSettings(kit.name);
        
        // Store current kit
        this.currentKit = kit;
        console.log('[AIKIT] Current kit stored:', kit.name);
    },
    
    /**
     * Switch kit modal tab
     */
    switchKitTab(tabName) {
        const modalBody = document.getElementById('modal-body');
        if (!modalBody) return;
        
        // Update button states
        modalBody.querySelectorAll('.kit-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update pane visibility
        modalBody.querySelectorAll('.kit-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `tab-${tabName}`);
        });
        
        // Load tab content via actions dispatch
        if (!this.currentKit) return;
        
        const actions = window.AICC?.actions;
        if (actions && actions.has(`kitTab.${tabName}`)) {
            actions.dispatch(`kitTab.${tabName}`, this.currentKit.name, this);
        }
    },
    
    /**
     * Load kit settings tab
     */
    async loadKitSettings(kitName) {
        const pane = document.getElementById('tab-settings');
        if (!pane) return;
        
        try {
            this.sendMessage('fetchData', {
                endpoint: 'aikit-settings',
                params: { kitName }
            });
        } catch (error) {
            console.error('Failed to load kit settings:', error);
            pane.innerHTML = '<div class="error-message">Failed to load settings</div>';
        }
    },
    
    /**
     * Render kit settings
     */
    renderKitSettings(settings, kitName) {
        const pane = document.getElementById('tab-settings');
        if (!pane) return;
        
        const isInstalled = settings.installed || false;
        const topLevelFields = settings.topLevelFields || [];
        const configFields = settings.configFields || [];
        
        // Group top-level fields
        const groups = {};
        const ungrouped = [];
        for (const field of topLevelFields) {
            if (field.group) {
                if (!groups[field.group]) groups[field.group] = [];
                groups[field.group].push(field);
            } else {
                ungrouped.push(field);
            }
        }
        
        // Render top-level fields
        const topLevelHtml = ungrouped.map(f => this.renderSettingsField(f, 'setting')).join('');
        
        // Render grouped fields
        const groupLabels = { refresh: 'Refresh Settings', evolution: 'Evolution Settings' };
        const groupsHtml = Object.entries(groups).map(([groupName, fields]) => `
            <div class="settings-group">
                <h4 class="settings-group-heading">
                    <span class="codicon codicon-${groupName === 'refresh' ? 'sync' : 'git-pull-request'}"></span>
                    ${groupLabels[groupName] || groupName}
                </h4>
                ${fields.map(f => this.renderSettingsField(f, 'setting')).join('')}
            </div>
        `).join('');
        
        // Render configuration fields section
        let configFieldsHtml = '';
        if (configFields.length > 0) {
            const fieldsHtml = configFields.map(f => this.renderSettingsField(f, 'kitcfg')).join('');
            configFieldsHtml = `
                <div class="settings-group">
                    <h4 class="settings-group-heading">
                        <span class="codicon codicon-settings-gear"></span> Kit Configuration
                    </h4>
                    ${fieldsHtml}
                </div>
            `;
        }
        
        pane.innerHTML = `
            <div class="kit-settings-form">
                ${topLevelHtml}
                ${groupsHtml}
                ${configFieldsHtml}
                ${!isInstalled ? `
                    <div class="form-group" style="margin-top: 16px;">
                        <button class="footer-btn success" id="btn-install-kit">
                            <span class="codicon codicon-cloud-download"></span> Install Kit
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Setup install button
        pane.querySelector('#btn-install-kit')?.addEventListener('click', () => {
            this.installKit(kitName);
        });
    },
    
    /**
     * Render a single settings field based on its type
     */
    renderSettingsField(field, prefix) {
        const fieldId = `${prefix}-${field.name}`;
        const label = field.label || field.name;
        const value = field.value ?? '';
        const isReadonly = field.readonly === true;
        const helpText = field.helpText ? `<span class="field-help-text">${this.escapeHtml(field.helpText)}</span>` : '';
        
        let inputHtml = '';
        
        switch (field.type) {
            case 'toggle':
            case 'checkbox': {
                const checked = value === true || value === 'true' ? 'checked' : '';
                const disabled = isReadonly ? 'disabled' : '';
                inputHtml = `
                    <div class="toggle-field">
                        <label class="toggle-switch">
                            <input type="checkbox" id="${fieldId}" name="${field.name}" ${checked} ${disabled} />
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                            <span class="toggle-label-text">${this.escapeHtml(label)}</span>
                        </label>
                    </div>
                    ${helpText}
                `;
                // Toggles have their label inline; skip the outer label
                return `<div class="form-group">${inputHtml}</div>`;
            }
            case 'number': {
                const ro = isReadonly ? 'readonly' : '';
                inputHtml = `<input type="number" id="${fieldId}" name="${field.name}" value="${this.escapeHtml(String(value))}" class="form-control" ${ro} />`;
                break;
            }
            case 'select': {
                const options = (field.options || []).map(opt => {
                    const optVal = typeof opt === 'object' ? opt.value : opt;
                    const optLabel = typeof opt === 'object' ? opt.label : opt;
                    const selected = String(optVal) === String(value) ? 'selected' : '';
                    return `<option value="${this.escapeHtml(String(optVal))}" ${selected}>${this.escapeHtml(String(optLabel))}</option>`;
                }).join('');
                const dis = isReadonly ? 'disabled' : '';
                inputHtml = `<select id="${fieldId}" name="${field.name}" class="form-control" ${dis}>${options}</select>`;
                break;
            }
            case 'textarea': {
                const ro = isReadonly ? 'readonly' : '';
                inputHtml = `<textarea id="${fieldId}" name="${field.name}" class="form-control" rows="3" ${ro}>${this.escapeHtml(String(value))}</textarea>`;
                break;
            }
            default: { // text, email, url, date
                const ro = isReadonly ? 'readonly' : '';
                const placeholder = field.placeholder ? `placeholder="${this.escapeHtml(field.placeholder)}"` : '';
                inputHtml = `<input type="${field.type || 'text'}" id="${fieldId}" name="${field.name}" value="${this.escapeHtml(String(value))}" class="form-control" ${ro} ${placeholder} />`;
                break;
            }
        }
        
        return `
            <div class="form-group">
                <label for="${fieldId}">${this.escapeHtml(label)}</label>
                ${inputHtml}
                ${helpText}
            </div>
        `;
    },
    
    /**
     * Load kit configuration tab
     */
    async loadKitConfiguration(kitName) {
        const pane = document.getElementById('tab-configuration');
        if (!pane) return;
        
        try {
            this.sendMessage('fetchData', {
                endpoint: 'aikit-configuration',
                params: { kitName }
            });
        } catch (error) {
            console.error('Failed to load kit configuration:', error);
            pane.innerHTML = '<div class="error-message">Failed to load configuration</div>';
        }
    },
    
    /**
     * Render kit configuration
     */
    renderKitConfiguration(config, kitName) {
        const pane = document.getElementById('tab-configuration');
        if (!pane) return;
        
        const hasFields = config.fields && config.fields.length > 0;
        const hasActions = config.actions && config.actions.length > 0;
        const hasBundles = config.bundles && config.bundles.length > 0;
        
        // New configuration format: fields + actions + bundles
        if (hasFields || hasActions || hasBundles) {
            pane.innerHTML = `
                <div class="kit-config-form" data-kit-name="${kitName}">
                    ${hasFields ? this.renderConfigurationFields(config.fields, config.values || {}) : ''}
                    ${hasBundles ? this.renderConfigurationBundles(config.bundles, kitName) : ''}
                    ${hasActions ? this.renderConfigurationActions(config.actions) : ''}
                </div>
            `;
            
            // Setup bundle toggle handlers
            if (hasBundles) {
                pane.querySelectorAll('.bundle-toggle-input').forEach(toggle => {
                    toggle.addEventListener('change', (e) => {
                        const bundleName = e.target.dataset.bundle;
                        const enabled = e.target.checked;
                        const card = e.target.closest('.config-bundle-card');
                        if (card) {
                            card.classList.toggle('disabled', !enabled);
                        }
                        // Track bundle changes for save
                        if (!this.kitBundleChanges) this.kitBundleChanges = {};
                        this.kitBundleChanges[bundleName] = enabled;
                    });
                });
            }
        } else {
            // Legacy fallback: schema-based rendering
            pane.innerHTML = `
                <div class="kit-config-form">
                    ${this.renderConfigFields(config.schema || {}, config.values || {})}
                </div>
            `;
        }
    },
    
    /**
     * Render configuration fields using intake-style form builders
     */
    renderConfigurationFields(fields, values) {
        if (!fields || fields.length === 0) return '';
        
        const actions = window.AICC?.actions;
        
        const fieldsHtml = fields.map(field => {
            const fieldId = `config-field-${field.name}`;
            const currentValue = values[field.name] ?? field.value ?? field.defaultValue ?? '';
            const required = field.validation?.required ? 'required' : '';
            const helpTextHtml = field.helpText
                ? `<span class="field-help-text">${field.helpText}</span>`
                : '';
            
            // Use intake field renderers for the input, then inject the value
            let inputHtml = '';
            const fieldWithValue = { ...field, placeholder: field.placeholder || '' };
            
            if (actions && actions.has(`intakeField.${field.type}`)) {
                inputHtml = actions.dispatch(`intakeField.${field.type}`, fieldWithValue, fieldId, required);
            } else if (actions) {
                inputHtml = actions.dispatch('intakeField._default', fieldWithValue, fieldId, required);
            } else {
                inputHtml = `<input type="text" id="${fieldId}" name="${field.name}" placeholder="${field.placeholder || ''}" ${required} />`;
            }
            
            // Inject current value into rendered HTML
            inputHtml = this.injectFieldValue(inputHtml, field, currentValue);
            
            const requiredMark = field.validation?.required
                ? '<span class="required-mark">*</span>'
                : '';
            
            return `
                <div class="form-group config-field-group">
                    <label for="${fieldId}">${field.label}${requiredMark}</label>
                    ${inputHtml}
                    ${helpTextHtml}
                </div>
            `;
        }).join('');
        
        return `
            <div class="config-fields-section">
                <h4 class="config-section-heading">
                    <span class="codicon codicon-settings-gear"></span> Fields
                </h4>
                ${fieldsHtml}
            </div>
        `;
    },
    
    /**
     * Inject a current value into a rendered field HTML string
     */
    injectFieldValue(html, field, value) {
        if (value === '' || value === null || value === undefined) return html;
        
        switch (field.type) {
            case 'toggle':
            case 'checkbox':
                if (value === true || value === 'true') {
                    return html.replace('<input ', '<input checked ');
                }
                return html;
            case 'select':
                // Mark the matching option as selected
                const escapedVal = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return html.replace(
                    new RegExp(`(<option\\s+value="${escapedVal}")>`),
                    '$1 selected>'
                );
            case 'textarea':
                return html.replace('></textarea>', `>${this.escapeHtml(String(value))}</textarea>`);
            case 'radio':
                const radioVal = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                return html.replace(
                    new RegExp(`(value="${radioVal}")`),
                    '$1 checked'
                );
            case 'number':
                return html.replace(/(<input[^>]*?)(\s*\/?>)/, `$1 value="${value}"$2`);
            default:
                // text, email, url, date
                return html.replace(/(<input[^>]*?)(\s*\/?>)/, `$1 value="${this.escapeHtml(String(value))}"$2`);
        }
    },
    
    /**
     * Render configuration bundles section
     */
    renderConfigurationBundles(bundles, kitName) {
        if (!bundles || bundles.length === 0) return '';
        
        const bundleCards = bundles.map(bundle => {
            const assetCount = bundle.assets ? bundle.assets.length : 0;
            const isEnabled = bundle.enabled !== false;
            const icon = bundle.icon || 'package';
            
            // Group assets by type prefix
            const assetGroups = {};
            (bundle.assets || []).forEach(asset => {
                const type = asset.split('/')[0] || 'other';
                if (!assetGroups[type]) assetGroups[type] = [];
                assetGroups[type].push(asset);
            });
            
            const assetSummary = Object.entries(assetGroups).map(([type, items]) =>
                `<span class="asset-type-badge badge-${type}">${items.length} ${type}</span>`
            ).join(' ');
            
            const assetList = (bundle.assets || []).map(asset => {
                const type = asset.split('/')[0] || 'other';
                const name = asset.split('/').pop();
                return `<li class="bundle-asset-item"><span class="asset-type-dot dot-${type}"></span>${name}</li>`;
            }).join('');
            
            return `
                <div class="config-bundle-card ${isEnabled ? '' : 'disabled'}" data-bundle="${bundle.name}">
                    <div class="config-bundle-header">
                        <div class="config-bundle-info">
                            <span class="codicon codicon-${icon}"></span>
                            <span class="config-bundle-name">${bundle.name}</span>
                            <span class="config-bundle-count">${assetCount} assets</span>
                        </div>
                        <label class="bundle-toggle-label">
                            <input type="checkbox" class="bundle-toggle-input" data-bundle="${bundle.name}" ${isEnabled ? 'checked' : ''} />
                            <span class="bundle-toggle-slider"></span>
                        </label>
                    </div>
                    ${bundle.description ? `<p class="config-bundle-desc">${bundle.description}</p>` : ''}
                    <div class="config-bundle-summary">${assetSummary}</div>
                    <details class="config-bundle-details">
                        <summary>View assets</summary>
                        <ul class="bundle-asset-list">${assetList}</ul>
                    </details>
                </div>
            `;
        }).join('');
        
        return `
            <div class="config-bundles-section">
                <h4 class="config-section-heading">
                    <span class="codicon codicon-package"></span> Bundles
                </h4>
                ${bundleCards}
            </div>
        `;
    },
    
    /**
     * Render configuration actions section (read-only display)
     */
    renderConfigurationActions(actions) {
        if (!actions || actions.length === 0) return '';
        
        const actionTypeIcons = {
            'create': 'add',
            'edit': 'edit',
            'delete': 'trash',
            'bulk-edit': 'checklist',
            'bulk-delete': 'close-all',
            'sync': 'sync',
            'import': 'cloud-download',
            'export': 'cloud-upload'
        };
        
        const actionCards = actions.map(action => {
            const icon = actionTypeIcons[action.actionType] || 'play';
            const label = action.label || action.actionType;
            
            const conditionsHtml = (action.conditions || []).map(cond =>
                `<span class="action-condition"><code>${cond.field}</code> ${cond.operator} <code>${JSON.stringify(cond.value)}</code></span>`
            ).join(' <span class="condition-and">AND</span> ');
            
            return `
                <div class="config-action-card">
                    <div class="config-action-header">
                        <span class="codicon codicon-${icon}"></span>
                        <span class="config-action-type">${label}</span>
                    </div>
                    <div class="config-action-command"><code>${this.escapeHtml(action.command)}</code></div>
                    ${conditionsHtml ? `<div class="config-action-conditions"><strong>When:</strong> ${conditionsHtml}</div>` : ''}
                </div>
            `;
        }).join('');
        
        return `
            <div class="config-actions-section">
                <h4 class="config-section-heading">
                    <span class="codicon codicon-play"></span> Actions
                </h4>
                ${actionCards}
            </div>
        `;
    },
    
    /**
     * Load kit bundles tab (formerly components)
     */
    async loadKitComponents(kitName) {
        const pane = document.getElementById('tab-components');
        if (!pane) return;
        
        try {
            this.sendMessage('fetchData', {
                endpoint: 'aikit-components',
                params: { kitName }
            });
        } catch (error) {
            console.error('Failed to load kit bundles:', error);
            pane.innerHTML = '<div class="error-message">Failed to load bundles</div>';
        }
    },
    
    /**
     * Render kit bundles (formerly components)
     */
    renderKitComponents(bundles) {
        const pane = document.getElementById('tab-components');
        if (!pane) return;
        
        if (!bundles || bundles.length === 0) {
            pane.innerHTML = '<p class="no-bundles-message">No bundles available for this kit.</p>';
            return;
        }
        
        const bundleItems = bundles.map(bundle => {
            const assetCount = bundle.assets ? bundle.assets.length : 0;
            const isChecked = bundle.enabled !== false;
            
            return `
                <div class="bundle-item">
                    <label class="bundle-label">
                        <input type="checkbox" 
                               class="bundle-checkbox" 
                               data-bundle="${bundle.name}" 
                               ${isChecked ? 'checked' : ''} />
                        <span class="bundle-name">${bundle.name}</span>
                        <span class="bundle-asset-count">(${assetCount} assets)</span>
                    </label>
                </div>
            `;
        }).join('');
        
        pane.innerHTML = `
            <div class="kit-bundles-list">
                ${bundleItems}
            </div>
        `;
        
        // Setup bundle checkboxes
        pane.querySelectorAll('.bundle-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const bundleName = e.target.dataset.bundle;
                const isChecked = e.target.checked;
                this.toggleBundle(bundleName, isChecked);
            });
        });
    },
    
    /**
     * Render settings fields
     */
    renderSettingsFields(schema, values) {
        if (!schema.properties) return '<p>No settings available</p>';
        
        return Object.entries(schema.properties).map(([key, field]) => {
            const value = values[key] || field.default || '';
            return `
                <div class="form-group">
                    <label for="setting-${key}">${field.description || key}</label>
                    ${this.renderFieldInput(key, field, value, 'setting')}
                </div>
            `;
        }).join('');
    },
    
    /**
     * Render config fields
     */
    renderConfigFields(schema, values) {
        if (!schema.properties) return '<p>No configuration available</p>';
        
        return Object.entries(schema.properties).map(([key, field]) => {
            const value = values[key] || field.default || '';
            return `
                <div class="form-group">
                    <label for="config-${key}">${field.description || key}</label>
                    ${this.renderFieldInput(key, field, value, 'config')}
                </div>
            `;
        }).join('');
    },
    
    /**
     * Render field input based on type
     */
    renderFieldInput(key, field, value, prefix) {
        const actions = window.AICC?.actions;
        if (actions) {
            // Determine the renderer key: enum is a special case
            const rendererKey = field.enum ? 'enum' : (field.type || '_default');
            return actions.dispatchWithFallback('formField', rendererKey, key, field, value, prefix);
        }
        // Fallback if actions library not loaded
        const id = `${prefix}-${key}`;
        return `<input type="text" id="${id}" name="${key}" value="${value}" class="form-control" />`;
    },
    
    /**
     * Toggle bundle enabled state
     */
    toggleBundle(bundleName, enabled) {
        if (!this.kitBundleChanges) {
            this.kitBundleChanges = {};
        }
        this.kitBundleChanges[bundleName] = enabled;
    },
    
    /**
     * Install kit
     */
    async installKit(kitName) {
        try {
            this.sendMessage('executeAction', {
                command: 'aicc.installKit',
                args: [kitName]
            });
        } catch (error) {
            console.error('Failed to install kit:', error);
            this.showError('Failed to install kit');
        }
    },
    
    /**
     * Save kit settings
     */
    async saveKitSettings(kitName) {
        try {
            // Collect form values
            const settingsPane = document.getElementById('tab-settings');
            const configPane = document.getElementById('tab-configuration');
            
            const settings = this.collectFormValues(settingsPane, 'setting');
            
            // Collect kit configuration field values (from Settings tab, prefixed kitcfg-)
            const configFieldValues = this.collectFormValues(settingsPane, 'kitcfg');
            
            // Collect config values from both old and new format (Configuration tab)
            const config = {
                ...this.collectFormValues(configPane, 'config'),
                ...this.collectFormValues(configPane, 'config-field')
            };
            
            this.sendMessage('saveKitSettings', {
                kitName,
                settings,
                config,
                configFieldValues,
                componentChanges: this.kitComponentChanges || {},
                bundleChanges: this.kitBundleChanges || {}
            });
            
            // Close modal
            document.getElementById('modal-overlay').style.display = 'none';
            
            // Reset changes
            this.kitComponentChanges = {};
            this.kitBundleChanges = {};
        } catch (error) {
            console.error('Failed to save kit settings:', error);
            this.showError('Failed to save settings');
        }
    },
    
    /**
     * Collect form values
     */
    collectFormValues(pane, prefix) {
        if (!pane) return {};
        
        const values = {};
        pane.querySelectorAll(`[id^="${prefix}-"]`).forEach(input => {
            const key = input.name;
            if (input.type === 'checkbox') {
                values[key] = input.checked;
            } else if (input.type === 'number') {
                values[key] = parseFloat(input.value);
            } else {
                values[key] = input.value;
            }
        });
        
        return values;
    },
    
    /**
     * Format last updated date
     */
    formatLastUpdated(timestamp) {
        return window.AICC?.utils?.formatTimestamp(timestamp) || 'Never';
    },
    
    /**
     * Show AI Kit error
     */
    showAIKitError(message) {
        const grid = document.getElementById('catalog-grid');
        if (grid) {
            grid.innerHTML = `<div class="error-message">${message}</div>`;
        }
    },
    
    /**
     * Render generic panel
     */
    renderGenericPanel(panelConfig) {
        const content = document.getElementById('panel-content');
        if (!content) return;
        
        content.innerHTML = `<p>Panel: ${panelConfig.panel.name}</p>`;
    }
    
    /**
     * Save all changes
     */

    });
})(SecondaryPanelApp);
