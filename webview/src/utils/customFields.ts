/**
 * Custom Fields System
 * 
 * Allows users to define and manage custom fields for items
 */

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'boolean' | 'url' | 'email';

export interface CustomFieldDefinition {
    id: string;
    title: string;
    type: FieldType;
    required: boolean;
    description?: string;
    defaultValue?: any;
    options?: string[]; // For select/multi-select
    validation?: FieldValidation;
    appliesTo: ('epic' | 'story' | 'task')[];
}

export interface FieldValidation {
    min?: number; // For number
    max?: number; // For number
    minLength?: number; // For text
    maxLength?: number; // For text
    pattern?: string; // Regex for text
    errorMessage?: string;
}

export interface CustomFieldValue {
    fieldId: string;
    value: any;
}

class CustomFieldsManagerClass {
    private definitions: Map<string, CustomFieldDefinition> = new Map();

    constructor() {
        this.loadDefinitions();
        this.initializeDefaults();
    }

    /**
     * Initialize default custom fields
     */
    private initializeDefaults(): void {
        if (this.definitions.size === 0) {
            // Add some common default fields
            this.addDefinition({
                id: 'estimated-hours',
                title: 'Estimated Hours',
                type: 'number',
                required: false,
                description: 'Estimated time in hours',
                validation: { min: 0 },
                appliesTo: ['story', 'task']
            });

            this.addDefinition({
                id: 'actual-hours',
                title: 'Actual Hours',
                type: 'number',
                required: false,
                description: 'Actual time spent in hours',
                validation: { min: 0 },
                appliesTo: ['story', 'task']
            });

            this.addDefinition({
                id: 'start-date',
                title: 'Start Date',
                type: 'date',
                required: false,
                description: 'When work begins',
                appliesTo: ['epic', 'story', 'task']
            });

            this.addDefinition({
                id: 'due-date',
                title: 'Due Date',
                type: 'date',
                required: false,
                description: 'Target completion date',
                appliesTo: ['epic', 'story', 'task']
            });

            this.addDefinition({
                id: 'environment',
                title: 'Environment',
                type: 'select',
                required: false,
                options: ['Development', 'Staging', 'Production'],
                appliesTo: ['task']
            });

            this.addDefinition({
                id: 'labels',
                title: 'Labels',
                type: 'multi-select',
                required: false,
                options: ['Bug', 'Feature', 'Enhancement', 'Documentation', 'Testing'],
                appliesTo: ['epic', 'story', 'task']
            });

            this.addDefinition({
                id: 'pending',
                title: 'Blocked',
                type: 'boolean',
                required: false,
                defaultValue: false,
                description: 'Is this item blocked?',
                appliesTo: ['story', 'task']
            });

            this.saveDefinitions();
        }
    }

    /**
     * Add or update field definition
     */
    addDefinition(definition: CustomFieldDefinition): void {
        this.definitions.set(definition.id, definition);
        this.saveDefinitions();
    }

    /**
     * Get field definition by ID
     */
    getDefinition(id: string): CustomFieldDefinition | null {
        return this.definitions.get(id) || null;
    }

    /**
     * Get all field definitions
     */
    getAllDefinitions(): CustomFieldDefinition[] {
        return Array.from(this.definitions.values());
    }

    /**
     * Get definitions that apply to a specific item type
     */
    getDefinitionsForType(type: 'epic' | 'story' | 'task'): CustomFieldDefinition[] {
        return this.getAllDefinitions().filter(def => def.appliesTo.includes(type));
    }

    /**
     * Remove field definition
     */
    removeDefinition(id: string): boolean {
        const deleted = this.definitions.delete(id);
        if (deleted) {
            this.saveDefinitions();
        }
        return deleted;
    }

    /**
     * Validate field value against definition
     */
    validateValue(fieldId: string, value: any): { valid: boolean; error?: string } {
        const definition = this.getDefinition(fieldId);
        if (!definition) {
            return { valid: false, error: 'Field definition not found' };
        }

        // Check required
        if (definition.required && (value === null || value === undefined || value === '')) {
            return { valid: false, error: `${definition.title} is required` };
        }

        // Allow empty values for non-required fields
        if (!definition.required && (value === null || value === undefined || value === '')) {
            return { valid: true };
        }

        // Type-specific validation
        switch (definition.type) {
            case 'number':
                if (typeof value !== 'number' || isNaN(value)) {
                    return { valid: false, error: 'Must be a valid number' };
                }
                if (definition.validation?.min !== undefined && value < definition.validation.min) {
                    return { valid: false, error: `Must be at least ${definition.validation.min}` };
                }
                if (definition.validation?.max !== undefined && value > definition.validation.max) {
                    return { valid: false, error: `Must be at most ${definition.validation.max}` };
                }
                break;

            case 'text':
            case 'url':
            case 'email':
                if (typeof value !== 'string') {
                    return { valid: false, error: 'Must be text' };
                }
                if (definition.validation?.minLength && value.length < definition.validation.minLength) {
                    return { valid: false, error: `Must be at least ${definition.validation.minLength} characters` };
                }
                if (definition.validation?.maxLength && value.length > definition.validation.maxLength) {
                    return { valid: false, error: `Must be at most ${definition.validation.maxLength} characters` };
                }
                if (definition.validation?.pattern) {
                    try {
                        const regex = new RegExp(definition.validation.pattern);
                        if (!regex.test(value)) {
                            return { valid: false, error: definition.validation.errorMessage || 'Invalid format' };
                        }
                    } catch {
                        // Invalid regex pattern — skip validation
                    }
                }
                if (definition.type === 'email' && !this.isValidEmail(value)) {
                    return { valid: false, error: 'Invalid email address' };
                }
                if (definition.type === 'url' && !this.isValidUrl(value)) {
                    return { valid: false, error: 'Invalid URL' };
                }
                break;

            case 'date':
                if (!(value instanceof Date) && typeof value !== 'string') {
                    return { valid: false, error: 'Invalid date' };
                }
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    return { valid: false, error: 'Invalid date format' };
                }
                break;

            case 'select':
                if (definition.options && !definition.options.includes(value)) {
                    return { valid: false, error: 'Invalid option selected' };
                }
                break;

            case 'multi-select':
                if (!Array.isArray(value)) {
                    return { valid: false, error: 'Must be an array' };
                }
                if (definition.options) {
                    const invalidOptions = value.filter(v => !definition.options!.includes(v));
                    if (invalidOptions.length > 0) {
                        return { valid: false, error: 'Invalid options selected' };
                    }
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    return { valid: false, error: 'Must be true or false' };
                }
                break;
        }

        return { valid: true };
    }

    /**
     * Validate all field values for an item
     */
    validateAllValues(
        itemType: 'epic' | 'story' | 'task',
        values: CustomFieldValue[]
    ): { valid: boolean; errors: Record<string, string> } {
        const errors: Record<string, string> = {};
        const applicableFields = this.getDefinitionsForType(itemType);

        // Check required fields
        applicableFields.forEach(def => {
            if (def.required) {
                const value = values.find(v => v.fieldId === def.id);
                if (!value) {
                    errors[def.id] = `${def.title} is required`;
                }
            }
        });

        // Validate provided values
        values.forEach(fieldValue => {
            const result = this.validateValue(fieldValue.fieldId, fieldValue.value);
            if (!result.valid && result.error) {
                errors[fieldValue.fieldId] = result.error;
            }
        });

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Email validation helper
     */
    private isValidEmail(email: string): boolean {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    /**
     * URL validation helper
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Save definitions to localStorage
     */
    private saveDefinitions(): void {
        try {
            const data = Array.from(this.definitions.entries());
            localStorage.setItem('customFieldDefinitions', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save custom field definitions:', error);
        }
    }

    /**
     * Load definitions from localStorage
     */
    private loadDefinitions(): void {
        try {
            const data = localStorage.getItem('customFieldDefinitions');
            if (data) {
                const entries = JSON.parse(data);
                this.definitions = new Map(entries);
            }
        } catch (error) {
            console.error('Failed to load custom field definitions:', error);
        }
    }

    /**
     * Export definitions
     */
    export(): string {
        return JSON.stringify(this.getAllDefinitions(), null, 2);
    }

    /**
     * Import definitions
     */
    import(json: string): { success: boolean; error?: string } {
        try {
            const definitions = JSON.parse(json) as CustomFieldDefinition[];
            if (!Array.isArray(definitions)) {
                return { success: false, error: 'Invalid format: expected array' };
            }

            definitions.forEach(def => this.addDefinition(def));
            return { success: true };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    }
}

export const CustomFieldsManager = new CustomFieldsManagerClass();
