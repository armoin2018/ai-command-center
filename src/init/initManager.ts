/**
 * Init Manager
 * 
 * Coordinates file operations based on init/map.json
 */

import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger';
import { MapParser, InitMap, FileOperation } from './mapParser';
import { FileOperations, OperationResult } from './fileOperations';

export interface ExecutionSummary {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    results: OperationResult[];
}

export class InitManager {
    private logger: Logger;
    private workspacePath: string;
    private mapParser: MapParser;
    private fileOps: FileOperations;

    constructor(workspacePath: string, logger: Logger) {
        this.workspacePath = workspacePath;
        this.logger = logger;
        this.mapParser = new MapParser(logger);
        this.fileOps = new FileOperations(workspacePath, logger);
    }

    /**
     * Execute operations from init/map.json file
     */
    async executeFromFile(mapFilePath: string): Promise<ExecutionSummary> {
        this.logger.info('Executing operations from init map', {
            component: 'InitManager',
            path: mapFilePath
        });

        // Parse map file
        const initMap = await this.mapParser.parseFile(mapFilePath);

        // Execute operations
        return await this.execute(initMap);
    }

    /**
     * Execute operations from InitMap object
     */
    async execute(initMap: InitMap): Promise<ExecutionSummary> {
        const summary: ExecutionSummary = {
            total: initMap.operations.length,
            successful: 0,
            failed: 0,
            skipped: 0,
            results: []
        };

        for (const operation of initMap.operations) {
            // Check conditions
            if (!this.checkConditions(operation)) {
                this.logger.debug('Operation skipped due to conditions', {
                    component: 'InitManager',
                    action: operation.action,
                    target: operation.target
                });
                summary.skipped++;
                continue;
            }

            // Execute operation
            const result = await this.executeOperation(operation);
            summary.results.push(result);

            if (result.success) {
                summary.successful++;
            } else {
                summary.failed++;
            }
        }

        this.logger.info('Init map execution completed', {
            component: 'InitManager',
            total: summary.total,
            successful: summary.successful,
            failed: summary.failed,
            skipped: summary.skipped
        });

        return summary;
    }

    /**
     * Execute single operation
     */
    private async executeOperation(operation: FileOperation): Promise<OperationResult> {
        this.logger.debug('Executing operation', {
            component: 'InitManager',
            action: operation.action,
            source: operation.source,
            target: operation.target
        });

        switch (operation.action) {
            case 'copy':
                return await this.fileOps.copy(
                    operation.source!,
                    operation.target,
                    operation.overwrite
                );

            case 'move':
                return await this.fileOps.move(
                    operation.source!,
                    operation.target,
                    operation.overwrite
                );

            case 'link':
                return await this.fileOps.link(
                    operation.source!,
                    operation.target,
                    operation.overwrite
                );

            case 'create':
                return await this.fileOps.create(
                    operation.target,
                    operation.content || '',
                    operation.overwrite
                );

            default:
                return {
                    success: false,
                    action: operation.action,
                    target: operation.target,
                    error: `Unknown action: ${operation.action}`
                };
        }
    }

    /**
     * Check if operation conditions are met
     */
    private checkConditions(operation: FileOperation): boolean {
        if (!operation.conditions) {
            return true;
        }

        // Check platform
        if (operation.conditions.platform) {
            if (!FileOperations.checkPlatform(operation.conditions.platform)) {
                return false;
            }
        }

        // Check fileExists
        if (operation.conditions.fileExists) {
            const absolutePath = path.resolve(this.workspacePath, operation.conditions.fileExists);
            if (!fs.existsSync(absolutePath)) {
                return false;
            }
        }

        // Check fileNotExists
        if (operation.conditions.fileNotExists) {
            const absolutePath = path.resolve(this.workspacePath, operation.conditions.fileNotExists);
            if (fs.existsSync(absolutePath)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Undo last operation
     */
    async undoLast(): Promise<{ success: boolean; message: string }> {
        return await this.fileOps.undoLast();
    }

    /**
     * Get operation log
     */
    getLog() {
        return this.fileOps.getLog();
    }

    /**
     * Clear operation log
     */
    clearLog() {
        this.fileOps.clearLog();
    }

    /**
     * Save operation log to file
     */
    async saveLog(filePath: string = '.project/logs/init.log'): Promise<void> {
        await this.fileOps.saveLog(filePath);
    }

    /**
     * Find init/map.json in workspace
     */
    async findInitMap(): Promise<string | null> {
        const possiblePaths = [
            '.my/init.json',
            '.github/aicc/config/init.json',
            '.github/aicc/config/ai-ley/init.json'
        ];

        for (const relativePath of possiblePaths) {
            const absolutePath = path.resolve(this.workspacePath, relativePath);
            if (fs.existsSync(absolutePath)) {
                this.logger.debug('Found init map', {
                    component: 'InitManager',
                    path: relativePath
                });
                return absolutePath;
            }
        }

        this.logger.debug('No init map found', {
            component: 'InitManager'
        });
        return null;
    }

    /**
     * Create example init/map.json
     */
    async createExampleMap(outputPath: string = 'init/map.json'): Promise<void> {
        const absolutePath = path.resolve(this.workspacePath, outputPath);
        const dir = path.dirname(absolutePath);

        // Ensure directory exists
        await fs.promises.mkdir(dir, { recursive: true });

        // Generate example content
        const example = MapParser.generateExample();

        // Write to file
        await fs.promises.writeFile(absolutePath, example, 'utf-8');

        this.logger.info('Created example init map', {
            component: 'InitManager',
            path: outputPath
        });
    }

    /**
     * Validate init/map.json file
     */
    async validateMap(mapFilePath: string): Promise<{ valid: boolean; errors: string[] }> {
        return await this.mapParser.validateFile(mapFilePath);
    }

    /**
     * Get execution summary as formatted text
     */
    formatSummary(summary: ExecutionSummary): string {
        const lines: string[] = [];
        
        lines.push('=== INIT MAP EXECUTION SUMMARY ===\n');
        lines.push(`Total Operations: ${summary.total}`);
        lines.push(`Successful: ${summary.successful}`);
        lines.push(`Failed: ${summary.failed}`);
        lines.push(`Skipped: ${summary.skipped}`);
        lines.push('');
        
        if (summary.results.length > 0) {
            lines.push('=== OPERATIONS ===\n');
            summary.results.forEach((result, index) => {
                const status = result.success ? '✓' : '✗';
                const line = `${index + 1}. ${status} ${result.action.toUpperCase()}: ${result.source || ''} → ${result.target}`;
                lines.push(line);
                if (result.error) {
                    lines.push(`   Error: ${result.error}`);
                }
            });
        }
        
        return lines.join('\n');
    }
}
