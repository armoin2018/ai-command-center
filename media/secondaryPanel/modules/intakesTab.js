/**
 * Intakes Tab Module
 * Extracted from SecondaryPanelApp
 * Mixin pattern — attaches methods to SecondaryPanelApp.prototype
 *
 * Handles intake form selection, rendering, field generation, and submission.
 */
(function (App) {
    Object.assign(App.prototype, {

        renderIntakesPanel() {
            const content = document.getElementById('panel-content');
            if (!content) return;

            if (!this.availableIntakes || this.availableIntakes.length === 0) {
                content.innerHTML = `
                    <div class="intakes-container">
                        <div class="empty-state">
                            <span class="codicon codicon-note" style="font-size: 48px; color: var(--vscode-textLink-foreground);"></span>
                            <h2>No Intake Forms Available</h2>
                            <p>No intake forms are available for the current agent mode.</p>
                            <p>Intake forms should be placed in:</p>
                            <code>.github/aicc/intakes/</code>
                            <p style="margin-top: 16px;">File naming convention:</p>
                            <ul style="text-align: left; display: inline-block;">
                                <li><strong>All_*.intake.yaml</strong> - Available in all agent modes</li>
                                <li><strong>Agent_*.intake.yaml</strong> - Available only in agent mode</li>
                            </ul>
                        </div>
                    </div>
                `;
                return;
            }

            content.innerHTML = `
                <div class="intakes-container">
                    <div class="intakes-header">
                        <h2>
                            <span class="codicon codicon-note"></span>
                            Intake Forms
                        </h2>
                        <p>Select an intake form to fill out and submit</p>
                    </div>

                    <div class="intake-selector">
                        <label for="intake-select">Select Form:</label>
                        <select id="intake-select" class="intake-select-dropdown">
                            <option value="">-- Select an intake form --</option>
                            ${this.availableIntakes.map(intake => `
                                <option value="${intake.id}">${intake.displayName || intake.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div id="intake-form-container" class="intake-form-container" style="display: none;">
                        <!-- Form fields will be dynamically inserted here -->
                    </div>
                </div>
            `;

            // Attach event listener for intake selection
            const intakeSelect = document.getElementById('intake-select');
            if (intakeSelect) {
                intakeSelect.addEventListener('change', (e) => {
                    const intakeId = e.target.value;
                    if (intakeId) {
                        this.loadIntakeForm(intakeId);
                    } else {
                        document.getElementById('intake-form-container').style.display = 'none';
                    }
                });
            }
        },

        /**
         * Load and render specific intake form
         */
        loadIntakeForm(intakeId) {
            const intake = this.availableIntakes.find(i => i.id === intakeId);
            if (!intake) return;

            // Request the full intake form configuration from backend
            this.sendMessage('loadIntakeForm', { intakeId });
        },

        /**
         * Render intake form fields
         */
        renderIntakeForm(intakeConfig) {
            const container = document.getElementById('intake-form-container');
            if (!container) return;

            const fields = intakeConfig.fields || [];

            container.innerHTML = `
                <form id="intake-form" class="intake-form">
                    <h3>${intakeConfig.displayName || intakeConfig.name}</h3>
                    ${intakeConfig.description ? `<p class="intake-description">${intakeConfig.description}</p>` : ''}

                    <div class="form-fields">
                        ${fields.map(field => this.renderIntakeField(field)).join('')}
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="action-button primary">
                            <span class="codicon codicon-send"></span>
                            Submit
                        </button>
                        <button type="button" id="cancel-intake-btn" class="action-button">
                            <span class="codicon codicon-close"></span>
                            Cancel
                        </button>
                    </div>
                </form>
            `;

            container.style.display = 'block';

            // Attach form submission handler
            const form = document.getElementById('intake-form');
            if (form) {
                form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitIntakeForm(intakeConfig);
                });
            }

            // Attach cancel handler
            document.getElementById('cancel-intake-btn')?.addEventListener('click', () => {
                container.style.display = 'none';
                document.getElementById('intake-select').value = '';
            });
        },

        /**
         * Render a single intake form field
         */
        renderIntakeField(field) {
            const fieldId = `intake-field-${field.id || field.name}`;
            const required = field.required ? 'required' : '';
            const requiredMark = field.required ? '<span class="required-mark">*</span>' : '';

            const actions = window.AICC?.actions;
            const renderer = actions
                ? (payload, ctx) => actions.dispatchWithFallback('intakeField', field.type, field, fieldId, required)
                : null;

            // Dispatch to the appropriate field renderer
            const fieldHTML = actions && actions.has(`intakeField.${field.type}`)
                ? actions.dispatch(`intakeField.${field.type}`, field, fieldId, required)
                : actions
                    ? actions.dispatch('intakeField._default', field, fieldId, required)
                    : `<input type="text" id="${fieldId}" name="${field.name}" placeholder="${field.placeholder || ''}" ${required} />`;

            // Checkbox has its own wrapper
            if (field.type === 'checkbox') {
                return `<div class="form-field">${fieldHTML}</div>`;
            }

            return `
                <div class="form-field">
                    <label for="${fieldId}">
                        ${field.label}${requiredMark}
                    </label>
                    ${field.helpText ? `<p class="help-text">${field.helpText}</p>` : ''}
                    ${fieldHTML}
                    ${field.validation?.message ? `<p class="validation-message">${field.validation.message}</p>` : ''}
                </div>
            `;
        },

        /**
         * Submit intake form
         */
        submitIntakeForm(intakeConfig) {
            const form = document.getElementById('intake-form');
            if (!form) return;

            // Validate form
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            // Collect form data
            const formData = new FormData(form);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }

            // Send to backend
            this.sendMessage('submitIntake', {
                intakeId: intakeConfig.id,
                data
            });

            // Clear form
            form.reset();
            document.getElementById('intake-form-container').style.display = 'none';
            document.getElementById('intake-select').value = '';
        }
    });
})(SecondaryPanelApp);
