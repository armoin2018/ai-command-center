/**
 * Catalog Panel Main Component
 * Apple Store-inspired UI for AI Kit Management
 */

class CatalogPanel {
  constructor() {
    this.vscode = acquireVsCodeApi();
    this.kits = [];
    this.selectedKit = null;
    this.activeTab = 'settings';
    
    this.init();
  }
  
  async init() {
    this.render();
    await this.loadKits();
    this.attachEventListeners();
  }
  
  /**
   * Load available kits from catalog
   */
  async loadKits() {
    try {
      // Request kits from VS Code extension
      this.vscode.postMessage({
        command: 'catalog.list',
        payload: {}
      });
    } catch (error) {
      console.error('Failed to load kits:', error);
      this.showError('Failed to load catalog');
    }
  }
  
  /**
   * Handle messages from VS Code extension
   */
  handleMessage(event) {
    const message = event.data;
    
    switch (message.command) {
      case 'catalog.kits':
        this.kits = message.data || [];
        this.renderGrid();
        break;
        
      case 'catalog.kitDetails':
        this.selectedKit = message.data;
        this.openModal(message.data);
        break;
        
      case 'catalog.installComplete':
        this.showSuccess(`Kit "${message.kitName}" installed successfully`);
        this.loadKits();
        break;
        
      case 'catalog.updateComplete':
        this.showSuccess(`Kit "${message.kitName}" updated successfully`);
        this.loadKits();
        break;
        
      case 'catalog.error':
        this.showError(message.error);
        break;
    }
  }
  
  /**
   * Render main container
   */
  render() {
    document.body.innerHTML = `
      <div class="catalog-grid-container">
        <div class="catalog-grid" id="catalogGrid"></div>
      </div>
      <div id="modalRoot"></div>
    `;
  }
  
  /**
   * Render kit grid
   */
  renderGrid() {
    const grid = document.getElementById('catalogGrid');
    
    if (!this.kits || this.kits.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-title">No Kits Available</div>
          <div class="empty-state-description">
            Add kits to .github/aicc/catalog/ or .my/aicc/catalog/
          </div>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = this.kits.map(kit => this.renderKitCard(kit)).join('');
  }
  
  /**
   * Render individual kit card
   */
  renderKitCard(kit) {
    const iconHtml = kit.iconBase64 
      ? `<img src="data:image/png;base64,${kit.iconBase64}" alt="${kit.name}" />`
      : `<div class="kit-icon-placeholder">📦</div>`;
      
    const statusBadge = kit.installed 
      ? '<span class="status-badge status-installed">Installed</span>'
      : '';
    
    return `
      <div class="kit-card" data-kit-name="${kit.name}">
        <button class="kit-icon-button" onclick="catalogPanel.selectKit('${kit.name}')">
          ${iconHtml}
        </button>
        <div class="kit-name">${kit.name}${statusBadge}</div>
      </div>
    `;
  }
  
  /**
   * Select and open kit details
   */
  selectKit(kitName) {
    this.vscode.postMessage({
      command: 'catalog.getDetails',
      payload: { kitName }
    });
  }
  
  /**
   * Open modal dialog
   */
  openModal(kit) {
    const modalRoot = document.getElementById('modalRoot');
    const lastUpdated = kit.structure.lastUpdated 
      ? new Date(kit.structure.lastUpdated).toLocaleString()
      : 'Never';
    
    const iconHtml = kit.iconBase64 
      ? `<img src="data:image/png;base64,${kit.iconBase64}" alt="${kit.name}" />`
      : `<div class="kit-icon-placeholder">📦</div>`;
    
    modalRoot.innerHTML = `
      <div class="modal-overlay" onclick="catalogPanel.closeModal(event)">
        <div class="modal-container" onclick="event.stopPropagation()">
          <!-- Header -->
          <div class="modal-header">
            <div class="modal-header-icon">${iconHtml}</div>
            <div class="modal-header-title">${kit.name}</div>
            <button class="modal-close-button" onclick="catalogPanel.closeModal()">✕</button>
          </div>
          
          <!-- Tabs -->
          <div class="modal-tabs">
            <button class="modal-tab active" data-tab="settings" onclick="catalogPanel.switchTab('settings')">
              Settings
            </button>
            <button class="modal-tab" data-tab="configuration" onclick="catalogPanel.switchTab('configuration')">
              Configuration
            </button>
            <button class="modal-tab" data-tab="components" onclick="catalogPanel.switchTab('components')">
              Components
            </button>
          </div>
          
          <!-- Body -->
          <div class="modal-body">
            <div class="tab-content active" data-tab-content="settings">
              ${this.renderSettingsTab(kit)}
            </div>
            <div class="tab-content" data-tab-content="configuration">
              ${this.renderConfigurationTab(kit)}
            </div>
            <div class="tab-content" data-tab-content="components">
              ${this.renderComponentsTab(kit)}
            </div>
          </div>
          
          <!-- Footer -->
          <div class="modal-footer">
            <div class="modal-footer-left">
              Last Updated: ${lastUpdated}
            </div>
            <div class="modal-footer-right">
              <button class="btn btn-secondary" onclick="catalogPanel.closeModal()">Cancel</button>
              <button class="btn btn-primary" onclick="catalogPanel.saveModal()">Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render Settings tab
   */
  renderSettingsTab(kit) {
    const structure = kit.structure;
    const isInstalled = kit.installed;
    
    return `
      <form id="settingsForm">
        <div class="form-group">
          <label class="form-label">Repository URL</label>
          <input type="text" class="form-input" name="repo" value="${structure.repo}" ${isInstalled ? 'readonly' : ''} />
        </div>
        
        <div class="form-group">
          <label class="form-label">Branch</label>
          <input type="text" class="form-input" name="branch" value="${structure.branch}" />
        </div>
        
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-textarea" name="description">${structure.description || ''}</textarea>
        </div>
        
        <div class="form-group">
          <label class="form-checkbox-label">
            <input type="checkbox" class="form-checkbox" name="refreshEnabled" 
              ${structure.refreshEnabled ? 'checked' : ''} />
            Enable Auto-Refresh
          </label>
        </div>
        
        <div class="form-group">
          <label class="form-label">Refresh Interval (seconds)</label>
          <input type="number" class="form-input" name="refreshInterval" 
            value="${structure.refreshInterval || 86400}" />
        </div>
        
        <div class="form-group">
          <label class="form-checkbox-label">
            <input type="checkbox" class="form-checkbox" name="evolveEnabled" 
              ${structure.evolveEnabled ? 'checked' : ''} />
            Enable Evolution (Contribute Back)
          </label>
        </div>
        
        ${!isInstalled ? `
          <div class="form-group">
            <button type="button" class="btn btn-install" onclick="catalogPanel.installKit('${kit.name}')">
              📦 Install Kit
            </button>
          </div>
        ` : ''}
      </form>
    `;
  }
  
  /**
   * Render Configuration tab
   */
  renderConfigurationTab(kit) {
    const config = kit.config || {};
    const configValues = kit.configValues || {};
    
    if (!config || Object.keys(config).length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">⚙️</div>
          <div class="empty-state-title">No Configuration Available</div>
          <div class="empty-state-description">
            This kit does not have advanced configuration options.
          </div>
        </div>
      `;
    }
    
    return `
      <form id="configurationForm">
        ${Object.entries(config).map(([key, schema]) => {
          const value = configValues[key] || schema.default || '';
          const type = schema.type === 'boolean' ? 'checkbox' : 
                      schema.type === 'number' ? 'number' : 'text';
          
          if (type === 'checkbox') {
            return `
              <div class="form-group">
                <label class="form-checkbox-label">
                  <input type="checkbox" class="form-checkbox" name="config_${key}" 
                    ${value ? 'checked' : ''} />
                  ${schema.title || key}
                </label>
                ${schema.description ? `<small style="color: var(--vscode-descriptionForeground); margin-left: 24px; display: block;">${schema.description}</small>` : ''}
              </div>
            `;
          }
          
          return `
            <div class="form-group">
              <label class="form-label">${schema.title || key}</label>
              <input type="${type}" class="form-input" name="config_${key}" value="${value}" />
              ${schema.description ? `<small style="color: var(--vscode-descriptionForeground);">${schema.description}</small>` : ''}
            </div>
          `;
        }).join('')}
      </form>
    `;
  }
  
  /**
   * Render Components tab
   */
  renderComponentsTab(kit) {
    const components = kit.components || {};
    const componentsInstalled = kit.componentsInstalled || {};
    
    if (!components || Object.keys(components).length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-title">No Components Available</div>
          <div class="empty-state-description">
            This kit does not have optional components.
          </div>
        </div>
      `;
    }
    
    return `
      <div class="component-tree">
        ${Object.entries(components).map(([name, component]) => {
          const isEnabled = componentsInstalled[name] !== false && 
            (componentsInstalled[name] === true || component.defaultEnabled);
          const fileCount = component.files ? component.files.length : 0;
          
          return `
            <div class="component-item">
              <input type="checkbox" id="component_${name}" name="component_${name}" 
                ${isEnabled ? 'checked' : ''} />
              <label for="component_${name}" class="component-item-label">
                ${name}
              </label>
              <span class="component-item-files">${fileCount} files</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
  
  /**
   * Switch tabs
   */
  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.modal-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelector(`[data-tab-content="${tabName}"]`).classList.add('active');
    
    this.activeTab = tabName;
  }
  
  /**
   * Install kit
   */
  installKit(kitName) {
    this.vscode.postMessage({
      command: 'catalog.install',
      payload: { kitName }
    });
    
    this.showSuccess(`Installing ${kitName}...`);
    this.closeModal();
  }
  
  /**
   * Save modal changes
   */
  saveModal() {
    if (!this.selectedKit) return;
    
    const formData = {};
    
    // Collect settings
    if (this.activeTab === 'settings' || document.getElementById('settingsForm')) {
      const settingsForm = document.getElementById('settingsForm');
      if (settingsForm) {
        const settings = new FormData(settingsForm);
        formData.settings = {};
        for (let [key, value] of settings.entries()) {
          formData.settings[key] = value;
        }
      }
    }
    
    // Collect configuration
    const configForm = document.getElementById('configurationForm');
    if (configForm) {
      const config = new FormData(configForm);
      formData.configuration = {};
      for (let [key, value] of config.entries()) {
        const configKey = key.replace('config_', '');
        formData.configuration[configKey] = value;
      }
    }
    
    // Collect components
    const components = {};
    document.querySelectorAll('[name^="component_"]').forEach(checkbox => {
      const name = checkbox.name.replace('component_', '');
      components[name] = checkbox.checked;
    });
    if (Object.keys(components).length > 0) {
      formData.components = components;
    }
    
    // Send to VS Code
    this.vscode.postMessage({
      command: 'catalog.save',
      payload: {
        kitName: this.selectedKit.name,
        data: formData
      }
    });
    
    this.closeModal();
    this.showSuccess('Configuration saved');
  }
  
  /**
   * Close modal
   */
  closeModal(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modalRoot = document.getElementById('modalRoot');
    modalRoot.innerHTML = '';
    this.selectedKit = null;
  }
  
  /**
   * Show success message
   */
  showSuccess(message) {
    // TODO: Implement toast notifications
    console.log('SUCCESS:', message);
  }
  
  /**
   * Show error message
   */
  showError(message) {
    // TODO: Implement toast notifications
    console.error('ERROR:', message);
  }
  
  /**
   * Attach global event listeners
   */
  attachEventListeners() {
    window.addEventListener('message', (event) => this.handleMessage(event));
  }
}

// Initialize catalog panel
let catalogPanel;
window.addEventListener('DOMContentLoaded', () => {
  catalogPanel = new CatalogPanel();
});
