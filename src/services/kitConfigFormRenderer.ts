/**
 * Kit Config Form Renderer Service
 * 
 * Generates HTML form markup from a kit's config.yaml schema and
 * handles YAML→JSON conversion, save/reset with workspace overrides,
 * and inline validation against schema constraints.
 * 
 * Part of AICC-0105: Kit Configuration Form UI & Save/Reset
 *   - AICC-0289: Config form renderer from config.yaml
 *   - AICC-0290: YAML→JSON config conversion
 *   - AICC-0291: Save/reset handlers with workspace override
 *   - AICC-0292: Inline validation with error messages
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Logger } from '../logger';
import {
    ConfigFieldDefinition,
    ConfigFieldType,
    ConfigFormSection,
    ConfigValidationError,
    ConfigFormValidationResult
} from '../types/kitComponent';

/** Path template for kit config.yaml (source defaults) */
const CONFIG_YAML_PATH = '.github/aicc/catalog/{kitName}/config.yaml';

/** Path template for workspace-local config override */
const CONFIG_JSON_PATH = '.my/aicc/catalog/{kitName}/config.json';

/**
 * KitConfigFormRenderer generates HTML forms from kit config.yaml files,
 * converts YAML↔JSON, persists workspace-local overrides, and validates
 * user input against schema constraints.
 * 
 * @see REQ-KIT-030 through REQ-KIT-037
 */
export class KitConfigFormRenderer {
    private static instance: KitConfigFormRenderer;
    private readonly logger: Logger;

    private constructor() {
        this.logger = Logger.getInstance();
    }

    /**
     * Get the singleton instance.
     */
    public static getInstance(): KitConfigFormRenderer {
        if (!KitConfigFormRenderer.instance) {
            KitConfigFormRenderer.instance = new KitConfigFormRenderer();
        }
        return KitConfigFormRenderer.instance;
    }

    // ─── YAML→JSON Conversion (AICC-0290) ───────────────────────────

    /**
     * Load and parse a kit's config.yaml file.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     * @returns Parsed YAML as a plain object, or null if not found
     */
    public loadConfigYaml(
        kitName: string,
        workspacePath: string
    ): Record<string, unknown> | null {
        const configPath = path.join(
            workspacePath,
            CONFIG_YAML_PATH.replace('{kitName}', kitName)
        );

        if (!fs.existsSync(configPath)) {
            this.logger.debug('Config YAML not found', { kitName, configPath });
            return null;
        }

        try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            const parsed = yaml.load(raw);

            if (typeof parsed !== 'object' || parsed === null) {
                this.logger.warn('Config YAML parsed to non-object value', { kitName });
                return null;
            }

            this.logger.info('Config YAML loaded', {
                kitName,
                keys: Object.keys(parsed as Record<string, unknown>).length
            });

            return parsed as Record<string, unknown>;
        } catch (error) {
            this.logger.error('Failed to parse config YAML', {
                kitName,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Convert a parsed YAML object to a flat JSON structure suitable for storage.
     * 
     * @param yamlData - Parsed YAML data
     * @returns Flat JSON object with dot-separated keys
     */
    public yamlToJson(yamlData: Record<string, unknown>): Record<string, unknown> {
        return this.flattenObject(yamlData);
    }

    /**
     * Convert a flat JSON object (dot-separated keys) back to nested structure.
     * 
     * @param jsonData - Flat JSON with dot-separated keys
     * @returns Nested object
     */
    public jsonToNested(jsonData: Record<string, unknown>): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(jsonData)) {
            const parts = key.split('.');
            let current: Record<string, unknown> = result;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!(part in current) || typeof current[part] !== 'object' || current[part] === null) {
                    current[part] = {};
                }
                current = current[part] as Record<string, unknown>;
            }

            current[parts[parts.length - 1]] = value;
        }

        return result;
    }

    // ─── Config Override (AICC-0291) ────────────────────────────────

    /**
     * Load the workspace-local config override (JSON) for a kit.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     * @returns Parsed JSON config, or null if no override exists
     */
    public loadConfigOverride(
        kitName: string,
        workspacePath: string
    ): Record<string, unknown> | null {
        const configPath = path.join(
            workspacePath,
            CONFIG_JSON_PATH.replace('{kitName}', kitName)
        );

        if (!fs.existsSync(configPath)) {
            return null;
        }

        try {
            const raw = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(raw) as Record<string, unknown>;
        } catch (error) {
            this.logger.error('Failed to load config override', {
                kitName,
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }

    /**
     * Get the effective (merged) configuration for a kit.
     * Workspace-local override takes precedence over kit defaults.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     * @returns Merged configuration, or null if no config exists at all
     * @see REQ-KIT-034
     */
    public getEffectiveConfig(
        kitName: string,
        workspacePath: string
    ): Record<string, unknown> | null {
        const defaults = this.loadConfigYaml(kitName, workspacePath);
        const override = this.loadConfigOverride(kitName, workspacePath);

        if (!defaults && !override) {
            return null;
        }

        if (!defaults) {
            return override;
        }

        if (!override) {
            return defaults;
        }

        // Deep merge: override wins
        return this.deepMerge(defaults, override);
    }

    /**
     * Save a config override to the workspace-local JSON file.
     * 
     * @param kitName - Kit identifier
     * @param config - Configuration to save
     * @param workspacePath - Absolute path to the workspace root
     * @see REQ-KIT-033
     */
    public saveConfigOverride(
        kitName: string,
        config: Record<string, unknown>,
        workspacePath: string
    ): void {
        const configPath = path.join(
            workspacePath,
            CONFIG_JSON_PATH.replace('{kitName}', kitName)
        );
        const configDir = path.dirname(configPath);

        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
            this.logger.info('Config override saved', { kitName, path: configPath });
        } catch (error) {
            this.logger.error('Failed to save config override', {
                kitName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to save config override: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Reset a kit's configuration by deleting the workspace-local override.
     * After reset, the kit defaults from config.yaml will be used.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     * @returns true if an override was deleted, false if none existed
     * @see REQ-KIT-036
     */
    public resetConfigOverride(
        kitName: string,
        workspacePath: string
    ): boolean {
        const configPath = path.join(
            workspacePath,
            CONFIG_JSON_PATH.replace('{kitName}', kitName)
        );

        if (!fs.existsSync(configPath)) {
            this.logger.debug('No config override to reset', { kitName });
            return false;
        }

        try {
            fs.unlinkSync(configPath);
            this.logger.info('Config override reset to defaults', { kitName });
            return true;
        } catch (error) {
            this.logger.error('Failed to reset config override', {
                kitName,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to reset config override: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // ─── Form Rendering (AICC-0289) ─────────────────────────────────

    /**
     * Extract field definitions from a parsed config object.
     * Introspects the YAML structure to infer field types, sections, and constraints.
     * 
     * @param yamlData - Parsed YAML config object
     * @param override - Optional workspace override values
     * @returns Array of form sections with their fields
     */
    public extractFormSections(
        yamlData: Record<string, unknown>,
        override?: Record<string, unknown> | null
    ): ConfigFormSection[] {
        const sections: ConfigFormSection[] = [];

        for (const [sectionKey, sectionValue] of Object.entries(yamlData)) {
            if (typeof sectionValue === 'object' && sectionValue !== null && !Array.isArray(sectionValue)) {
                // Nested object → form section
                const fields = this.extractFields(
                    sectionKey,
                    sectionValue as Record<string, unknown>,
                    override
                );

                sections.push({
                    id: sectionKey,
                    title: this.formatLabel(sectionKey),
                    fields
                });
            } else {
                // Top-level primitive → "General" section
                let generalSection = sections.find(s => s.id === '_general');
                if (!generalSection) {
                    generalSection = {
                        id: '_general',
                        title: 'General',
                        fields: []
                    };
                    sections.unshift(generalSection);
                }

                generalSection.fields.push(
                    this.createFieldDefinition(sectionKey, sectionKey, sectionValue, override)
                );
            }
        }

        return sections;
    }

    /**
     * Render an HTML form from extracted form sections.
     * Produces semantic HTML with VS Code-compatible CSS classes.
     * 
     * @param sections - Form sections with field definitions
     * @param kitName - Kit identifier (used in data attributes)
     * @returns Complete HTML string for the configuration form
     */
    public renderFormHtml(
        sections: ConfigFormSection[],
        kitName: string
    ): string {
        const sectionHtml = sections.map(section => this.renderSection(section)).join('\n');

        return `<div class="kit-config-form" data-kit-name="${this.escapeHtml(kitName)}">
  <div class="kit-config-header">
    <h3>Configuration — ${this.escapeHtml(kitName)}</h3>
    <div class="kit-config-actions">
      <button class="btn btn-secondary kit-config-reset" data-kit="${this.escapeHtml(kitName)}" title="Reset to defaults">
        <i class="codicon codicon-discard"></i> Reset
      </button>
      <button class="btn btn-primary kit-config-save" data-kit="${this.escapeHtml(kitName)}" title="Save configuration">
        <i class="codicon codicon-save"></i> Save
      </button>
    </div>
  </div>
  <div class="kit-config-body">
${sectionHtml}
  </div>
</div>`;
    }

    /**
     * Generate a complete form from a kit's config.yaml.
     * Convenience method combining load → extract → render.
     * 
     * @param kitName - Kit identifier
     * @param workspacePath - Absolute path to the workspace root
     * @returns HTML form string, or null if no config found
     */
    public generateForm(
        kitName: string,
        workspacePath: string
    ): string | null {
        const yamlData = this.loadConfigYaml(kitName, workspacePath);
        if (!yamlData) {
            return null;
        }

        const override = this.loadConfigOverride(kitName, workspacePath);
        const sections = this.extractFormSections(yamlData, override);
        return this.renderFormHtml(sections, kitName);
    }

    // ─── Inline Validation (AICC-0292) ──────────────────────────────

    /**
     * Validate a set of form values against field definitions.
     * Checks required, min/max, and pattern constraints.
     * 
     * @param values - Key-value pairs from the form submission
     * @param sections - The form sections containing field definitions
     * @returns Validation result with per-field errors
     * @see REQ-KIT-037
     */
    public validateForm(
        values: Record<string, unknown>,
        sections: ConfigFormSection[]
    ): ConfigFormValidationResult {
        const errors: ConfigValidationError[] = [];

        for (const section of sections) {
            for (const field of section.fields) {
                const fieldErrors = this.validateField(field, values[field.key]);
                errors.push(...fieldErrors);
            }
        }

        return {
            valid: errors.filter(e => e.severity === 'error').length === 0,
            errors
        };
    }

    /**
     * Validate a single field value against its definition.
     * 
     * @param field - Field definition with constraints
     * @param value - Current field value
     * @returns Array of validation errors (empty if valid)
     */
    public validateField(
        field: ConfigFieldDefinition,
        value: unknown
    ): ConfigValidationError[] {
        const errors: ConfigValidationError[] = [];

        // Required check
        if (field.required && (value === undefined || value === null || value === '')) {
            errors.push({
                fieldKey: field.key,
                message: `${field.label} is required`,
                severity: 'error'
            });
            return errors; // No point checking further
        }

        // Skip further checks if value is empty and not required
        if (value === undefined || value === null || value === '') {
            return errors;
        }

        // Type-specific validation
        switch (field.type) {
            case 'string':
                if (typeof value !== 'string') {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be a string`,
                        severity: 'error'
                    });
                    break;
                }
                // Min length
                if (field.min !== undefined && value.length < field.min) {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be at least ${field.min} characters`,
                        severity: 'error'
                    });
                }
                // Max length
                if (field.max !== undefined && value.length > field.max) {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be at most ${field.max} characters`,
                        severity: 'error'
                    });
                }
                // Pattern
                if (field.pattern) {
                    try {
                        const regex = new RegExp(field.pattern);
                        if (!regex.test(value)) {
                            errors.push({
                                fieldKey: field.key,
                                message: `${field.label} does not match the required pattern`,
                                severity: 'error'
                            });
                        }
                    } catch {
                        // Invalid pattern — skip validation
                        this.logger.warn('Invalid validation pattern', {
                            fieldKey: field.key,
                            pattern: field.pattern
                        });
                    }
                }
                break;

            case 'number':
                const num = typeof value === 'number' ? value : Number(value);
                if (isNaN(num)) {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be a valid number`,
                        severity: 'error'
                    });
                    break;
                }
                if (field.min !== undefined && num < field.min) {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be at least ${field.min}`,
                        severity: 'error'
                    });
                }
                if (field.max !== undefined && num > field.max) {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be at most ${field.max}`,
                        severity: 'error'
                    });
                }
                break;

            case 'select':
                if (field.options && !field.options.includes(String(value))) {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be one of: ${field.options.join(', ')}`,
                        severity: 'error'
                    });
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
                    errors.push({
                        fieldKey: field.key,
                        message: `${field.label} must be true or false`,
                        severity: 'error'
                    });
                }
                break;

            // array and object types are not validated inline
            default:
                break;
        }

        return errors;
    }

    // ─── Private Helpers ────────────────────────────────────────────

    /**
     * Extract field definitions from a section-level object.
     */
    private extractFields(
        sectionKey: string,
        sectionData: Record<string, unknown>,
        override?: Record<string, unknown> | null
    ): ConfigFieldDefinition[] {
        const fields: ConfigFieldDefinition[] = [];

        for (const [fieldKey, fieldValue] of Object.entries(sectionData)) {
            const fullKey = `${sectionKey}.${fieldKey}`;
            fields.push(this.createFieldDefinition(fullKey, fieldKey, fieldValue, override));
        }

        return fields;
    }

    /**
     * Create a single field definition by introspecting the value type.
     */
    private createFieldDefinition(
        fullKey: string,
        displayKey: string,
        value: unknown,
        override?: Record<string, unknown> | null
    ): ConfigFieldDefinition {
        const fieldType = this.inferFieldType(value);
        const overrideValue = override ? this.getNestedValue(override, fullKey) : undefined;

        return {
            key: fullKey,
            label: this.formatLabel(displayKey),
            type: fieldType,
            defaultValue: value,
            currentValue: overrideValue !== undefined ? overrideValue : value,
            section: fullKey.split('.')[0],
            required: false
        };
    }

    /**
     * Infer the ConfigFieldType from a runtime value.
     */
    private inferFieldType(value: unknown): ConfigFieldType {
        if (typeof value === 'boolean') {
            return 'boolean';
        }
        if (typeof value === 'number') {
            return 'number';
        }
        if (Array.isArray(value)) {
            return 'array';
        }
        if (typeof value === 'object' && value !== null) {
            return 'object';
        }
        return 'string';
    }

    /**
     * Get a value from a nested object using a dot-separated key.
     */
    private getNestedValue(obj: Record<string, unknown>, key: string): unknown {
        const parts = key.split('.');
        let current: unknown = obj;

        for (const part of parts) {
            if (current === null || current === undefined || typeof current !== 'object') {
                return undefined;
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    /**
     * Flatten a nested object to dot-separated keys.
     */
    private flattenObject(
        obj: Record<string, unknown>,
        prefix: string = ''
    ): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (
                typeof value === 'object' &&
                value !== null &&
                !Array.isArray(value)
            ) {
                Object.assign(result, this.flattenObject(value as Record<string, unknown>, fullKey));
            } else {
                result[fullKey] = value;
            }
        }

        return result;
    }

    /**
     * Deep merge two objects. Values from `source` override `target`.
     */
    private deepMerge(
        target: Record<string, unknown>,
        source: Record<string, unknown>
    ): Record<string, unknown> {
        const result: Record<string, unknown> = { ...target };

        for (const [key, sourceValue] of Object.entries(source)) {
            const targetValue = result[key];

            if (
                typeof sourceValue === 'object' &&
                sourceValue !== null &&
                !Array.isArray(sourceValue) &&
                typeof targetValue === 'object' &&
                targetValue !== null &&
                !Array.isArray(targetValue)
            ) {
                result[key] = this.deepMerge(
                    targetValue as Record<string, unknown>,
                    sourceValue as Record<string, unknown>
                );
            } else {
                result[key] = sourceValue;
            }
        }

        return result;
    }

    /**
     * Convert a camelCase or kebab-case key to a human-readable label.
     */
    private formatLabel(key: string): string {
        return key
            // camelCase → space-separated
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            // kebab-case → space-separated
            .replace(/-/g, ' ')
            // underscore → space-separated
            .replace(/_/g, ' ')
            // Title Case
            .replace(/\b\w/g, c => c.toUpperCase());
    }

    /**
     * Escape HTML special characters to prevent XSS.
     */
    private escapeHtml(str: string): string {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Render a single form section as HTML.
     */
    private renderSection(section: ConfigFormSection): string {
        const fieldsHtml = section.fields
            .map(field => this.renderField(field))
            .join('\n');

        return `    <fieldset class="kit-config-section" data-section="${this.escapeHtml(section.id)}">
      <legend>${this.escapeHtml(section.title)}</legend>
${section.description ? `      <p class="section-description">${this.escapeHtml(section.description)}</p>\n` : ''}${fieldsHtml}
    </fieldset>`;
    }

    /**
     * Render a single form field as HTML.
     */
    private renderField(field: ConfigFieldDefinition): string {
        const value = field.currentValue ?? field.defaultValue;
        const errorHtml = field.validationError
            ? `\n        <span class="field-error">${this.escapeHtml(field.validationError)}</span>`
            : '';
        const requiredAttr = field.required ? ' required' : '';
        const errorClass = field.validationError ? ' has-error' : '';
        const escapedKey = this.escapeHtml(field.key);
        const escapedLabel = this.escapeHtml(field.label);

        switch (field.type) {
            case 'boolean':
                return `      <div class="form-group form-check${errorClass}" data-field="${escapedKey}">
        <input type="checkbox" class="form-check-input" id="field-${escapedKey}" name="${escapedKey}"${value ? ' checked' : ''}${requiredAttr}>
        <label class="form-check-label" for="field-${escapedKey}">${escapedLabel}</label>${errorHtml}
      </div>`;

            case 'number':
                return `      <div class="form-group${errorClass}" data-field="${escapedKey}">
        <label for="field-${escapedKey}">${escapedLabel}</label>
        <input type="number" class="form-control" id="field-${escapedKey}" name="${escapedKey}" value="${this.escapeHtml(String(value ?? ''))}"${field.min !== undefined ? ` min="${field.min}"` : ''}${field.max !== undefined ? ` max="${field.max}"` : ''}${requiredAttr}>
        ${field.description ? `<small class="form-text">${this.escapeHtml(field.description)}</small>` : ''}${errorHtml}
      </div>`;

            case 'select':
                const options = (field.options ?? [])
                    .map(opt => `<option value="${this.escapeHtml(opt)}"${opt === String(value) ? ' selected' : ''}>${this.escapeHtml(opt)}</option>`)
                    .join('');
                return `      <div class="form-group${errorClass}" data-field="${escapedKey}">
        <label for="field-${escapedKey}">${escapedLabel}</label>
        <select class="form-control" id="field-${escapedKey}" name="${escapedKey}"${requiredAttr}>${options}</select>
        ${field.description ? `<small class="form-text">${this.escapeHtml(field.description)}</small>` : ''}${errorHtml}
      </div>`;

            case 'array':
                const arrayVal = Array.isArray(value) ? value.join(', ') : String(value ?? '');
                return `      <div class="form-group${errorClass}" data-field="${escapedKey}">
        <label for="field-${escapedKey}">${escapedLabel} <small>(comma-separated)</small></label>
        <textarea class="form-control" id="field-${escapedKey}" name="${escapedKey}" rows="3"${requiredAttr}>${this.escapeHtml(arrayVal)}</textarea>
        ${field.description ? `<small class="form-text">${this.escapeHtml(field.description)}</small>` : ''}${errorHtml}
      </div>`;

            case 'object':
                const objectVal = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
                return `      <div class="form-group${errorClass}" data-field="${escapedKey}">
        <label for="field-${escapedKey}">${escapedLabel} <small>(JSON)</small></label>
        <textarea class="form-control" id="field-${escapedKey}" name="${escapedKey}" rows="5"${requiredAttr}>${this.escapeHtml(objectVal)}</textarea>
        ${field.description ? `<small class="form-text">${this.escapeHtml(field.description)}</small>` : ''}${errorHtml}
      </div>`;

            case 'string':
            default:
                return `      <div class="form-group${errorClass}" data-field="${escapedKey}">
        <label for="field-${escapedKey}">${escapedLabel}</label>
        <input type="text" class="form-control" id="field-${escapedKey}" name="${escapedKey}" value="${this.escapeHtml(String(value ?? ''))}"${field.min !== undefined ? ` minlength="${field.min}"` : ''}${field.max !== undefined ? ` maxlength="${field.max}"` : ''}${field.pattern ? ` pattern="${this.escapeHtml(field.pattern)}"` : ''}${requiredAttr}>
        ${field.description ? `<small class="form-text">${this.escapeHtml(field.description)}</small>` : ''}${errorHtml}
      </div>`;
        }
    }
}
