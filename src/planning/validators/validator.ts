import { Logger } from '../../logger';
import { ValidationSchema, ValidationRule } from './validationRules';

/**
 * Validation Result - Contains validation outcome and errors.
 */
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Validator - Validates entities against schema rules.
 */
export class Validator {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Validate an entity against a schema.
     */
    public validate<T extends Record<string, any>>(
        entity: T,
        schema: ValidationSchema
    ): ValidationResult {
        const startTime = performance.now();
        const errors: string[] = [];

        // Check required fields
        for (const field of schema.required) {
            if (!(field in entity) || entity[field] === null || entity[field] === undefined) {
                errors.push(`Required field missing: ${field}`);
            }
        }

        // Run validation rules
        for (const rule of schema.rules) {
            if (rule.field in entity) {
                const value = entity[rule.field];
                
                try {
                    if (!rule.validate(value)) {
                        errors.push(rule.message);
                    }
                } catch (error) {
                    this.logger.error('Validation rule failed', {
                        component: 'Validator',
                        field: rule.field,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    errors.push(`Validation error for ${rule.field}: ${rule.message}`);
                }
            }
        }

        const duration = performance.now() - startTime;
        const isValid = errors.length === 0;

        this.logger.debug('Validation completed', {
            component: 'Validator',
            isValid,
            errorCount: errors.length,
            duration
        });

        return {
            isValid,
            errors
        };
    }

    /**
     * Validate multiple entities.
     */
    public validateBatch<T extends Record<string, any>>(
        entities: T[],
        schema: ValidationSchema
    ): Map<number, ValidationResult> {
        const results = new Map<number, ValidationResult>();

        entities.forEach((entity, index) => {
            const result = this.validate(entity, schema);
            if (!result.isValid) {
                results.set(index, result);
            }
        });

        this.logger.debug('Batch validation completed', {
            component: 'Validator',
            totalEntities: entities.length,
            failedCount: results.size
        });

        return results;
    }

    /**
     * Validate a single field value against a rule.
     */
    public validateField<T = any>(
        value: T,
        rule: ValidationRule<T>
    ): ValidationResult {
        try {
            const isValid = rule.validate(value);
            
            return {
                isValid,
                errors: isValid ? [] : [rule.message]
            };
        } catch (error) {
            this.logger.error('Field validation failed', {
                component: 'Validator',
                field: rule.field,
                error: error instanceof Error ? error.message : String(error)
            });
            
            return {
                isValid: false,
                errors: [`Validation error: ${rule.message}`]
            };
        }
    }

    /**
     * Check if an entity is valid (convenience method).
     */
    public isValid<T extends Record<string, any>>(
        entity: T,
        schema: ValidationSchema
    ): boolean {
        return this.validate(entity, schema).isValid;
    }

    /**
     * Get validation errors for an entity (convenience method).
     */
    public getErrors<T extends Record<string, any>>(
        entity: T,
        schema: ValidationSchema
    ): string[] {
        return this.validate(entity, schema).errors;
    }

    /**
     * Validate with custom rules (override schema).
     */
    public validateWithRules<T extends Record<string, any>>(
        entity: T,
        rules: ValidationRule[]
    ): ValidationResult {
        const errors: string[] = [];

        for (const rule of rules) {
            if (rule.field in entity) {
                const value = entity[rule.field];
                
                try {
                    if (!rule.validate(value)) {
                        errors.push(rule.message);
                    }
                } catch (error) {
                    this.logger.error('Custom validation rule failed', {
                        component: 'Validator',
                        field: rule.field,
                        error: error instanceof Error ? error.message : String(error)
                    });
                    errors.push(`Validation error for ${rule.field}: ${rule.message}`);
                }
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a custom validation rule.
     */
    public static createRule<T = any>(
        field: string,
        validate: (value: T) => boolean,
        message: string
    ): ValidationRule<T> {
        return { field, validate, message };
    }

    /**
     * Combine multiple schemas into one.
     */
    public static combineSchemas(...schemas: ValidationSchema[]): ValidationSchema {
        const combined: ValidationSchema = {
            required: [],
            rules: []
        };

        for (const schema of schemas) {
            combined.required.push(...schema.required);
            combined.rules.push(...schema.rules);
        }

        // Remove duplicate required fields
        combined.required = Array.from(new Set(combined.required));

        return combined;
    }
}
