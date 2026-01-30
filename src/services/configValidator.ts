/**
 * Config Validation Service
 * 
 * Advanced validation rules for planning configurations
 * Includes dependency validation, circular reference detection, required field validation
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';

export interface ValidationRule {
    name: string;
    severity: 'error' | 'warning' | 'info';
    validate: (config: any) => ValidationResult;
}

export interface ValidationResult {
    valid: boolean;
    message?: string;
    path?: string;
}

export interface ValidationReport {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    info: ValidationError[];
}

export interface ValidationError {
    rule: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    path?: string;
}

export class ConfigValidator {
    private logger: Logger;
    private rules: ValidationRule[] = [];

    constructor(logger: Logger) {
        this.logger = logger;
        this.initializeDefaultRules();
    }

    /**
     * Initialize default validation rules
     */
    private initializeDefaultRules(): void {
        // Required fields validation
        this.addRule({
            name: 'required-fields',
            severity: 'error',
            validate: (config) => this.validateRequiredFields(config)
        });

        // Circular dependencies
        this.addRule({
            name: 'circular-dependencies',
            severity: 'error',
            validate: (config) => this.validateCircularDependencies(config)
        });

        // Dependency existence
        this.addRule({
            name: 'dependency-existence',
            severity: 'warning',
            validate: (config) => this.validateDependencyExistence(config)
        });

        // Story points validation
        this.addRule({
            name: 'story-points',
            severity: 'warning',
            validate: (config) => this.validateStoryPoints(config)
        });

        // Priority validation
        this.addRule({
            name: 'priority-values',
            severity: 'error',
            validate: (config) => this.validatePriority(config)
        });

        // Status validation
        this.addRule({
            name: 'status-values',
            severity: 'error',
            validate: (config) => this.validateStatus(config)
        });

        // Tag validation
        this.addRule({
            name: 'tag-format',
            severity: 'info',
            validate: (config) => this.validateTags(config)
        });

        // Hierarchy validation
        this.addRule({
            name: 'hierarchy-consistency',
            severity: 'error',
            validate: (config) => this.validateHierarchy(config)
        });

        // Description length
        this.addRule({
            name: 'description-length',
            severity: 'info',
            validate: (config) => this.validateDescriptionLength(config)
        });

        // Duplicate IDs
        this.addRule({
            name: 'duplicate-ids',
            severity: 'error',
            validate: (config) => this.validateDuplicateIds(config)
        });
    }

    /**
     * Add a custom validation rule
     */
    addRule(rule: ValidationRule): void {
        this.rules.push(rule);
    }

    /**
     * Remove a validation rule by name
     */
    removeRule(name: string): void {
        this.rules = this.rules.filter(r => r.name !== name);
    }

    /**
     * Validate configuration against all rules
     */
    async validate(config: any): Promise<ValidationReport> {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        const info: ValidationError[] = [];

        for (const rule of this.rules) {
            try {
                const result = rule.validate(config);
                if (!result.valid) {
                    const error: ValidationError = {
                        rule: rule.name,
                        severity: rule.severity,
                        message: result.message || 'Validation failed',
                        path: result.path
                    };

                    if (rule.severity === 'error') {
                        errors.push(error);
                    } else if (rule.severity === 'warning') {
                        warnings.push(error);
                    } else {
                        info.push(error);
                    }
                }
            } catch (err) {
                this.logger.error('Validation rule error', {
                    component: 'ConfigValidator',
                    rule: rule.name,
                    error: err instanceof Error ? err.message : 'Unknown error'
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            info
        };
    }

    /**
     * Validate required fields
     */
    private validateRequiredFields(config: any): ValidationResult {
        const requiredFields = ['epics'];
        
        for (const field of requiredFields) {
            if (!(field in config)) {
                return {
                    valid: false,
                    message: `Missing required field: ${field}`,
                    path: field
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate circular dependencies
     */
    private validateCircularDependencies(config: any): ValidationResult {
        const epics = config.epics || [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (id: string, dependencies: string[]): boolean => {
            if (recursionStack.has(id)) {
                return true;
            }

            if (visited.has(id)) {
                return false;
            }

            visited.add(id);
            recursionStack.add(id);

            for (const depId of dependencies) {
                const epic = epics.find((e: any) => e.id === depId);
                if (epic && hasCycle(depId, epic.dependencies || [])) {
                    return true;
                }
            }

            recursionStack.delete(id);
            return false;
        };

        for (const epic of epics) {
            if (epic.dependencies && hasCycle(epic.id, epic.dependencies)) {
                return {
                    valid: false,
                    message: `Circular dependency detected in epic: ${epic.name}`,
                    path: `epics.${epic.id}`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate dependency existence
     */
    private validateDependencyExistence(config: any): ValidationResult {
        const epics = config.epics || [];
        const epicIds = new Set(epics.map((e: any) => e.id));

        for (const epic of epics) {
            if (epic.dependencies) {
                for (const depId of epic.dependencies) {
                    if (!epicIds.has(depId)) {
                        return {
                            valid: false,
                            message: `Epic "${epic.name}" depends on non-existent epic: ${depId}`,
                            path: `epics.${epic.id}.dependencies`
                        };
                    }
                }
            }
        }

        return { valid: true };
    }

    /**
     * Validate story points
     */
    private validateStoryPoints(config: any): ValidationResult {
        const items = this.getAllItems(config);

        for (const item of items) {
            if (item.storyPoints !== undefined) {
                if (typeof item.storyPoints !== 'number' || item.storyPoints < 0) {
                    return {
                        valid: false,
                        message: `Invalid story points for ${item.type} "${item.name}": must be non-negative number`,
                        path: `${item.type}s.${item.id}.storyPoints`
                    };
                }

                // Fibonacci sequence validation (optional)
                const fibonacci = [1, 2, 3, 5, 8, 13, 21];
                if (!fibonacci.includes(item.storyPoints)) {
                    return {
                        valid: false,
                        message: `Story points for ${item.type} "${item.name}" should follow Fibonacci sequence`,
                        path: `${item.type}s.${item.id}.storyPoints`
                    };
                }
            }
        }

        return { valid: true };
    }

    /**
     * Validate priority values
     */
    private validatePriority(config: any): ValidationResult {
        const validPriorities = ['low', 'medium', 'high', 'critical'];
        const items = this.getAllItems(config);

        for (const item of items) {
            if (item.priority && !validPriorities.includes(item.priority)) {
                return {
                    valid: false,
                    message: `Invalid priority for ${item.type} "${item.name}": ${item.priority}`,
                    path: `${item.type}s.${item.id}.priority`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate status values
     */
    private validateStatus(config: any): ValidationResult {
        const validStatuses = ['todo', 'in-progress', 'done', 'pending'];
        const items = this.getAllItems(config);

        for (const item of items) {
            if (item.status && !validStatuses.includes(item.status)) {
                return {
                    valid: false,
                    message: `Invalid status for ${item.type} "${item.name}": ${item.status}`,
                    path: `${item.type}s.${item.id}.status`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate tags
     */
    private validateTags(config: any): ValidationResult {
        const items = this.getAllItems(config);

        for (const item of items) {
            if (item.tags) {
                if (!Array.isArray(item.tags)) {
                    return {
                        valid: false,
                        message: `Tags for ${item.type} "${item.name}" must be an array`,
                        path: `${item.type}s.${item.id}.tags`
                    };
                }

                for (const tag of item.tags) {
                    if (typeof tag !== 'string' || tag.length === 0) {
                        return {
                            valid: false,
                            message: `Invalid tag format for ${item.type} "${item.name}"`,
                            path: `${item.type}s.${item.id}.tags`
                        };
                    }
                }
            }
        }

        return { valid: true };
    }

    /**
     * Validate hierarchy consistency
     */
    private validateHierarchy(config: any): ValidationResult {
        const epics = config.epics || [];
        const stories = config.stories || [];
        const tasks = config.tasks || [];

        const epicIds = new Set(epics.map((e: any) => e.id));
        const storyIds = new Set(stories.map((s: any) => s.id));

        // Validate story epic references
        for (const story of stories) {
            if (story.epicId && !epicIds.has(story.epicId)) {
                return {
                    valid: false,
                    message: `Story "${story.name}" references non-existent epic: ${story.epicId}`,
                    path: `stories.${story.id}.epicId`
                };
            }
        }

        // Validate task story references
        for (const task of tasks) {
            if (task.storyId && !storyIds.has(task.storyId)) {
                return {
                    valid: false,
                    message: `Task "${task.name}" references non-existent story: ${task.storyId}`,
                    path: `tasks.${task.id}.storyId`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate description length
     */
    private validateDescriptionLength(config: any): ValidationResult {
        const items = this.getAllItems(config);
        const maxLength = 5000;

        for (const item of items) {
            if (item.description && item.description.length > maxLength) {
                return {
                    valid: false,
                    message: `Description for ${item.type} "${item.name}" exceeds maximum length of ${maxLength} characters`,
                    path: `${item.type}s.${item.id}.description`
                };
            }
        }

        return { valid: true };
    }

    /**
     * Validate duplicate IDs
     */
    private validateDuplicateIds(config: any): ValidationResult {
        const allIds = new Set<string>();
        const items = this.getAllItems(config);

        for (const item of items) {
            if (allIds.has(item.id)) {
                return {
                    valid: false,
                    message: `Duplicate ID found: ${item.id}`,
                    path: `${item.type}s.${item.id}`
                };
            }
            allIds.add(item.id);
        }

        return { valid: true };
    }

    /**
     * Get all items from config
     */
    private getAllItems(config: any): any[] {
        const items: any[] = [];
        
        ['epics', 'stories', 'tasks'].forEach(type => {
            if (config[type]) {
                items.push(...config[type].map((item: any) => ({ ...item, type: type.slice(0, -1) })));
            }
        });

        return items;
    }

    /**
     * Display validation report to user
     */
    async showValidationReport(report: ValidationReport): Promise<void> {
        if (report.valid) {
            vscode.window.showInformationMessage('✅ Configuration validation passed');
            return;
        }

        const errorCount = report.errors.length;
        const warningCount = report.warnings.length;

        const message = `Configuration validation found ${errorCount} error(s) and ${warningCount} warning(s)`;

        const action = await vscode.window.showErrorMessage(
            message,
            'Show Details',
            'Dismiss'
        );

        if (action === 'Show Details') {
            await this.showValidationDetails(report);
        }
    }

    /**
     * Show validation details in output channel
     */
    private async showValidationDetails(report: ValidationReport): Promise<void> {
        const channel = vscode.window.createOutputChannel('AICC Validation');
        channel.clear();

        channel.appendLine('=== Configuration Validation Report ===\n');

        if (report.errors.length > 0) {
            channel.appendLine('ERRORS:');
            report.errors.forEach(err => {
                channel.appendLine(`  ❌ [${err.rule}] ${err.message}`);
                if (err.path) {
                    channel.appendLine(`     Path: ${err.path}`);
                }
            });
            channel.appendLine('');
        }

        if (report.warnings.length > 0) {
            channel.appendLine('WARNINGS:');
            report.warnings.forEach(warn => {
                channel.appendLine(`  ⚠️  [${warn.rule}] ${warn.message}`);
                if (warn.path) {
                    channel.appendLine(`     Path: ${warn.path}`);
                }
            });
            channel.appendLine('');
        }

        if (report.info.length > 0) {
            channel.appendLine('INFO:');
            report.info.forEach(info => {
                channel.appendLine(`  ℹ️  [${info.rule}] ${info.message}`);
                if (info.path) {
                    channel.appendLine(`     Path: ${info.path}`);
                }
            });
        }

        channel.show();
    }
}
