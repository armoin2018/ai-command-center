/**
 * Init Map Parser
 * 
 * Parses and validates init/map.json files for file operations
 */

import * as fs from 'fs';
import { Logger } from '../logger';

export type OperationAction = 'copy' | 'move' | 'link' | 'create';

export interface FileOperation {
    action: OperationAction;
    source?: string;
    target: string;
    overwrite: boolean;
    content?: string;
    description?: string;
    conditions?: {
        fileExists?: string;
        fileNotExists?: string;
        platform?: 'darwin' | 'win32' | 'linux';
    };
}

export interface InitMap {
    version: string;
    description?: string;
    operations: FileOperation[];
}

export class MapParser {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Parse init/map.json file
     */
    async parseFile(filePath: string): Promise<InitMap> {
        try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const data = JSON.parse(content) as any;

            // Validate structure
            this.validateMap(data);

            const initMap: InitMap = {
                version: data.version || '1.0',
                description: data.description,
                operations: this.parseOperations(data.operations || [])
            };

            this.logger.info('Parsed init map successfully', {
                component: 'MapParser',
                path: filePath,
                operationCount: initMap.operations.length
            });

            return initMap;
        } catch (error) {
            this.logger.error('Failed to parse init map', {
                component: 'MapParser',
                path: filePath,
                error: error instanceof Error ? error.message : String(error)
            });
            throw new Error(`Failed to parse init map: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Parse from JSON string
     */
    parseString(jsonContent: string): InitMap {
        try {
            const data = JSON.parse(jsonContent) as any;
            this.validateMap(data);

            return {
                version: data.version || '1.0',
                description: data.description,
                operations: this.parseOperations(data.operations || [])
            };
        } catch (error) {
            throw new Error(`Failed to parse init map string: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validate init map structure
     */
    private validateMap(data: any): void {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid init map: must be an object');
        }

        if (!data.operations || !Array.isArray(data.operations)) {
            throw new Error('Invalid init map: operations must be an array');
        }

        if (data.operations.length === 0) {
            throw new Error('Invalid init map: at least one operation required');
        }
    }

    /**
     * Parse operations array
     */
    private parseOperations(operations: any[]): FileOperation[] {
        return operations.map((op, index) => {
            try {
                return this.parseOperation(op);
            } catch (error) {
                throw new Error(`Invalid operation at index ${index}: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }

    /**
     * Parse single operation
     */
    private parseOperation(op: any): FileOperation {
        // Validate action
        if (!op.action || typeof op.action !== 'string') {
            throw new Error('Operation must have an action field');
        }

        const action = op.action.toLowerCase() as OperationAction;
        if (!['copy', 'move', 'link', 'create'].includes(action)) {
            throw new Error(`Invalid action: ${op.action}. Must be copy, move, link, or create`);
        }

        // Validate target
        if (!op.target || typeof op.target !== 'string') {
            throw new Error('Operation must have a target field');
        }

        // Validate source for copy/move/link
        if (['copy', 'move', 'link'].includes(action)) {
            if (!op.source || typeof op.source !== 'string') {
                throw new Error(`${action} operation requires a source field`);
            }
        }

        // Validate content for create
        if (action === 'create') {
            if (op.content !== undefined && typeof op.content !== 'string') {
                throw new Error('create operation content must be a string');
            }
        }

        return {
            action,
            source: op.source,
            target: op.target,
            overwrite: op.overwrite === true,
            content: op.content,
            description: op.description,
            conditions: op.conditions ? {
                fileExists: op.conditions.fileExists,
                fileNotExists: op.conditions.fileNotExists,
                platform: op.conditions.platform
            } : undefined
        };
    }

    /**
     * Generate example init map
     */
    static generateExample(): string {
        const example = {
            version: '1.0',
            description: 'Example init map for project setup',
            operations: [
                {
                    action: 'copy',
                    source: '.ai-ley/templates/README.md',
                    target: 'README.md',
                    overwrite: false,
                    description: 'Copy README template'
                },
                {
                    action: 'create',
                    target: '.project/plan/epic-001.md',
                    content: '# Epic 001\n\n## Description\nYour epic description here',
                    overwrite: false,
                    description: 'Create first epic'
                },
                {
                    action: 'link',
                    source: '.github/ai-ley/shared/global.json',
                    target: '.ai-ley/global.json',
                    overwrite: false,
                    description: 'Link to global config',
                    conditions: {
                        platform: 'darwin'
                    }
                },
                {
                    action: 'move',
                    source: 'old-config.json',
                    target: '.project/archive/old-config.json',
                    overwrite: false,
                    description: 'Archive old config',
                    conditions: {
                        fileExists: 'old-config.json'
                    }
                }
            ]
        };

        return JSON.stringify(example, null, 2);
    }

    /**
     * Validate init map file
     */
    async validateFile(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
        const errors: string[] = [];

        try {
            await this.parseFile(filePath);
            return { valid: true, errors: [] };
        } catch (error) {
            errors.push(error instanceof Error ? error.message : String(error));
            return { valid: false, errors };
        }
    }
}
