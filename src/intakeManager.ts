import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { Logger } from './logger';

/**
 * Field types supported in intake forms
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 
                        'checkbox' | 'radio' | 'date' | 'file';

/**
 * Option for select/radio fields
 */
export interface FieldOption {
    readonly label: string;
    readonly value: string;
}

/**
 * Field validation rules
 */
export interface FieldValidation {
    readonly required?: boolean;
    readonly minLength?: number;
    readonly maxLength?: number;
    readonly min?: number;
    readonly max?: number;
    readonly pattern?: string; // Regex pattern
    readonly errorMessage?: string;
}

/**
 * Form field definition
 */
export interface FormField {
    readonly name: string;
    readonly label: string;
    readonly type: FieldType;
    readonly placeholder?: string;
    readonly defaultValue?: unknown;
    readonly options?: FieldOption[]; // For select/radio
    readonly validation?: FieldValidation;
    readonly helpText?: string;
}

/**
 * Intake form definition
 */
export interface IntakeDefinition {
    readonly name: string;
    readonly displayName: string;
    readonly description?: string;
    readonly agent?: string; // Agent filter (undefined = all agents)
    readonly fields: FormField[];
    readonly submitLabel?: string;
    readonly cancelLabel?: string;
}

/**
 * Submitted form data
 */
export interface IntakeSubmission {
    readonly formName: string;
    readonly timestamp: string;
    readonly data: Record<string, unknown>;
}

/**
 * Intake manager configuration
 */
export interface IntakeManagerConfig {
    intakesDirectory?: string; // default '.github/aicc/intakes'
    dataDirectory?: string; // default '.project'
    enableAutoReload?: boolean; // default true
}

/**
 * IntakeManager handles intake form definitions and submissions.
 * Parses YAML-based form definitions and persists submissions.
 * 
 * Requirements: Section 6.1
 */
export class IntakeManager implements vscode.Disposable {
    private readonly logger: Logger;
    private readonly config: Required<IntakeManagerConfig>;
    private intakes: Map<string, IntakeDefinition> = new Map();
    private watcher?: vscode.FileSystemWatcher;
    private disposables: vscode.Disposable[] = [];

    constructor(config: IntakeManagerConfig = {}) {
        this.logger = Logger.getInstance();
        this.config = {
            intakesDirectory: config.intakesDirectory ?? '.github/aicc/intakes',
            dataDirectory: config.dataDirectory ?? '.project',
            enableAutoReload: config.enableAutoReload ?? true
        };

        this.logger.info('IntakeManager initialized', {
            intakesDirectory: this.config.intakesDirectory,
            dataDirectory: this.config.dataDirectory
        });
    }

    /**
     * Initialize the intake manager
     */
    public async initialize(): Promise<void> {
        try {
            // Load intake definitions
            await this.loadIntakeDefinitions();

            // Watch for changes if enabled
            if (this.config.enableAutoReload) {
                this.watchIntakeDefinitions();
            }

            this.logger.info('IntakeManager initialized', {
                intakeCount: this.intakes.size
            });
        } catch (error) {
            this.logger.error('Failed to initialize IntakeManager', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Load intake definitions from YAML files
     */
    private async loadIntakeDefinitions(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            this.logger.warn('No workspace folder found, skipping intake loading');
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const intakesPath = path.join(workspacePath, this.config.intakesDirectory);

        if (!fs.existsSync(intakesPath)) {
            this.logger.info('Intakes directory not found', { intakesPath });
            return;
        }

        let files: string[];
        try {
            files = fs.readdirSync(intakesPath);
        } catch (error) {
            this.logger.error('Failed to read intakes directory', {
                intakesPath,
                error: error instanceof Error ? error.message : String(error)
            });
            return;
        }
        const intakeFiles = files.filter(f => f.endsWith('.intake.yaml'));

        this.logger.info('Loading intake definitions', {
            directory: intakesPath,
            fileCount: intakeFiles.length
        });

        this.intakes.clear();

        for (const file of intakeFiles) {
            try {
                const filePath = path.join(intakesPath, file);
                const intake = await this.parseIntakeDefinition(filePath);
                this.intakes.set(intake.name, intake);
                
                this.logger.debug('Loaded intake definition', {
                    name: intake.name,
                    displayName: intake.displayName,
                    fields: intake.fields.length,
                    file
                });
            } catch (error) {
                this.logger.error('Failed to parse intake definition', {
                    file,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        this.logger.info('Intake definitions loaded', {
            count: this.intakes.size,
            intakes: Array.from(this.intakes.keys())
        });
    }

    /**
     * Parse an intake definition file
     */
    private async parseIntakeDefinition(filePath: string): Promise<IntakeDefinition> {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = yaml.load(content) as Record<string, unknown>;

        // Validate required fields
        if (!data.name || typeof data.name !== 'string') {
            throw new Error('Intake definition missing required field: name');
        }

        if (!data.displayName || typeof data.displayName !== 'string') {
            throw new Error('Intake definition missing required field: displayName');
        }

        if (!Array.isArray(data.fields)) {
            throw new Error('Intake definition missing required field: fields');
        }

        const fields: FormField[] = data.fields.map((field: Record<string, unknown>) => ({
            name: field.name as string,
            label: field.label as string,
            type: (field.type as FieldType) || 'text',
            placeholder: field.placeholder as string | undefined,
            defaultValue: field.defaultValue,
            options: field.options as FieldOption[] | undefined,
            validation: field.validation as FieldValidation | undefined,
            helpText: field.helpText as string | undefined
        }));

        return {
            name: data.name as string,
            displayName: data.displayName as string,
            description: data.description as string | undefined,
            agent: data.agent as string | undefined,
            fields,
            submitLabel: data.submitLabel as string | undefined,
            cancelLabel: data.cancelLabel as string | undefined
        };
    }

    /**
     * Get all intake definitions
     */
    public getIntakes(agentFilter?: string): readonly IntakeDefinition[] {
        const intakes = Array.from(this.intakes.values());
        
        if (!agentFilter) {
            return intakes;
        }

        // Filter by agent
        return intakes.filter(intake => 
            !intake.agent || intake.agent === agentFilter || intake.agent === 'All'
        );
    }

    /**
     * Get intake by name
     */
    public getIntake(name: string): IntakeDefinition | undefined {
        return this.intakes.get(name);
    }

    /**
     * Validate form submission data
     */
    public validateSubmission(
        intakeName: string,
        data: Record<string, unknown>
    ): { valid: boolean; errors: Record<string, string> } {
        const intake = this.intakes.get(intakeName);
        if (!intake) {
            return {
                valid: false,
                errors: { _form: `Intake '${intakeName}' not found` }
            };
        }

        const errors: Record<string, string> = {};

        for (const field of intake.fields) {
            const value = data[field.name];
            const validation = field.validation;

            if (!validation) {
                continue;
            }

            // Required check
            if (validation.required && (value === undefined || value === null || value === '')) {
                errors[field.name] = validation.errorMessage || `${field.label} is required`;
                continue;
            }

            // Skip further validation if field is empty and not required
            if (value === undefined || value === null || value === '') {
                continue;
            }

            // Type-specific validation
            if (field.type === 'text' || field.type === 'textarea') {
                const strValue = String(value);
                
                if (validation.minLength && strValue.length < validation.minLength) {
                    errors[field.name] = validation.errorMessage || 
                        `${field.label} must be at least ${validation.minLength} characters`;
                }
                
                if (validation.maxLength && strValue.length > validation.maxLength) {
                    errors[field.name] = validation.errorMessage || 
                        `${field.label} must not exceed ${validation.maxLength} characters`;
                }
                
                if (validation.pattern) {
                    try {
                        const regex = new RegExp(validation.pattern);
                        if (!regex.test(strValue)) {
                            errors[field.name] = validation.errorMessage || 
                                `${field.label} format is invalid`;
                        }
                    } catch {
                        // Invalid regex pattern from form definition — skip validation
                    }
                }
            } else if (field.type === 'number') {
                const numValue = Number(value);
                
                if (isNaN(numValue)) {
                    errors[field.name] = `${field.label} must be a number`;
                    continue;
                }
                
                if (validation.min !== undefined && numValue < validation.min) {
                    errors[field.name] = validation.errorMessage || 
                        `${field.label} must be at least ${validation.min}`;
                }
                
                if (validation.max !== undefined && numValue > validation.max) {
                    errors[field.name] = validation.errorMessage || 
                        `${field.label} must not exceed ${validation.max}`;
                }
            }
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Submit and persist form data
     */
    public async submitIntake(
        intakeName: string,
        data: Record<string, unknown>
    ): Promise<{ success: boolean; errors?: Record<string, string> }> {
        // Validate submission
        const validation = this.validateSubmission(intakeName, data);
        if (!validation.valid) {
            return {
                success: false,
                errors: validation.errors
            };
        }

        // Create submission
        const submission: IntakeSubmission = {
            formName: intakeName,
            timestamp: new Date().toISOString(),
            data
        };

        // Persist to file
        try {
            await this.persistSubmission(submission);
            
            this.logger.info('Intake submitted successfully', {
                formName: intakeName,
                timestamp: submission.timestamp
            });

            return { success: true };
        } catch (error) {
            this.logger.error('Failed to persist intake submission', {
                formName: intakeName,
                error: error instanceof Error ? error.message : String(error)
            });

            return {
                success: false,
                errors: {
                    _form: 'Failed to save submission. Please try again.'
                }
            };
        }
    }

    /**
     * Persist submission to JSON file
     */
    private async persistSubmission(submission: IntakeSubmission): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            throw new Error('No workspace folder open');
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const dataPath = path.join(workspacePath, this.config.dataDirectory);

        // Ensure data directory exists
        try {
            if (!fs.existsSync(dataPath)) {
                fs.mkdirSync(dataPath, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to create intake data directory', {
                dataPath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }

        // Generate filename: {formName}.intake.json
        const fileName = `${submission.formName}.intake.json`;
        const filePath = path.join(dataPath, fileName);

        // Load existing submissions
        let submissions: IntakeSubmission[] = [];
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                submissions = JSON.parse(content);
            } catch (error) {
                this.logger.warn('Failed to load existing submissions, creating new file', {
                    filePath,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        // Add new submission
        submissions.push(submission);

        // Write back to file
        try {
            fs.writeFileSync(filePath, JSON.stringify(submissions, null, 2), 'utf8');
        } catch (error) {
            this.logger.error('Failed to write intake submission file', {
                filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
        
        this.logger.debug('Submission persisted', { filePath, count: submissions.length });
    }

    /**
     * Get all submissions for a specific intake
     */
    public async getSubmissions(intakeName: string): Promise<IntakeSubmission[]> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return [];
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const fileName = `${intakeName}.intake.json`;
        const filePath = path.join(workspacePath, this.config.dataDirectory, fileName);

        if (!fs.existsSync(filePath)) {
            return [];
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            this.logger.error('Failed to load submissions', {
                intakeName,
                error: error instanceof Error ? error.message : String(error)
            });
            return [];
        }
    }

    /**
     * Watch for intake definition changes
     */
    private watchIntakeDefinitions(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return;
        }

        const workspacePath = workspaceFolders[0].uri.fsPath;
        const intakesPath = path.join(workspacePath, this.config.intakesDirectory);
        const pattern = new vscode.RelativePattern(intakesPath, '*.intake.yaml');

        this.watcher = vscode.workspace.createFileSystemWatcher(pattern);

        this.watcher.onDidCreate(async () => {
            this.logger.info('Intake definition created, reloading');
            await this.loadIntakeDefinitions();
        });

        this.watcher.onDidChange(async () => {
            this.logger.info('Intake definition changed, reloading');
            await this.loadIntakeDefinitions();
        });

        this.watcher.onDidDelete(async () => {
            this.logger.info('Intake definition deleted, reloading');
            await this.loadIntakeDefinitions();
        });

        this.disposables.push(this.watcher);
    }

    /**
     * Reload intake definitions manually
     */
    public async reload(): Promise<void> {
        await this.loadIntakeDefinitions();
    }

    /**
     * Clean up resources
     */
    public dispose(): void {
        this.logger.info('IntakeManager disposing');
        this.intakes.clear();
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }
}
