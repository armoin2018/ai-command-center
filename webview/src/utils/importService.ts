import { TreeNodeData } from '../types/tree';

/**
 * Import Service
 * 
 * Handles importing data from various formats
 */

export interface ImportResult {
    success: boolean;
    imported: number;
    errors: string[];
    data?: TreeNodeData[];
}

export interface ImportOptions {
    format: 'json' | 'csv' | 'jira';
    mergeMode?: 'replace' | 'append' | 'merge';
    validateOnly?: boolean;
}

export interface FieldMapping {
    source: string;
    target: keyof TreeNodeData;
    transform?: (value: any) => any;
}

export class ImportService {
    /**
     * Import data from file content
     */
    static async import(
        content: string,
        options: ImportOptions,
        fieldMapping?: FieldMapping[]
    ): Promise<ImportResult> {
        try {
            let data: TreeNodeData[] = [];

            switch (options.format) {
                case 'json':
                    data = this.importJSON(content, fieldMapping);
                    break;
                case 'csv':
                    data = this.importCSV(content, fieldMapping);
                    break;
                case 'jira':
                    data = this.importJIRA(content, fieldMapping);
                    break;
                default:
                    throw new Error(`Unsupported format: ${options.format}`);
            }

            // Validate
            const validation = this.validate(data);
            if (!validation.valid) {
                return {
                    success: false,
                    imported: 0,
                    errors: validation.errors,
                    data
                };
            }

            if (options.validateOnly) {
                return {
                    success: true,
                    imported: data.length,
                    errors: [],
                    data
                };
            }

            return {
                success: true,
                imported: data.length,
                errors: [],
                data
            };
        } catch (error: any) {
            return {
                success: false,
                imported: 0,
                errors: [error.message]
            };
        }
    }

    /**
     * Import from JSON
     */
    private static importJSON(content: string, fieldMapping?: FieldMapping[]): TreeNodeData[] {
        const parsed = JSON.parse(content);
        const data = Array.isArray(parsed) ? parsed : [parsed];

        if (fieldMapping) {
            return data.map(item => this.applyFieldMapping(item, fieldMapping));
        }

        return data;
    }

    /**
     * Import from CSV
     */
    private static importCSV(content: string, fieldMapping?: FieldMapping[]): TreeNodeData[] {
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            throw new Error('CSV must have at least header and one data row');
        }

        const headers = this.parseCSVLine(lines[0]);
        const data: TreeNodeData[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            const node = fieldMapping 
                ? this.applyFieldMapping(row, fieldMapping)
                : this.csvRowToNode(row);

            data.push(node);
        }

        // Build hierarchy from path
        return this.buildHierarchy(data);
    }

    /**
     * Parse CSV line handling quoted values
     */
    private static parseCSVLine(line: string): string[] {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        values.push(current.trim());
        return values;
    }

    /**
     * Convert CSV row to TreeNodeData
     */
    private static csvRowToNode(row: any): TreeNodeData {
        return {
            id: row.id || Date.now().toString() + Math.random(),
            title: row.title || row.title || row.summary || 'Unnamed',
            type: this.normalizeType(row.type || row.issuetype || 'task'),
            status: this.normalizeStatus(row.status || 'todo'),
            description: row.description || '',
            priority: this.normalizePriority(row.priority),
            estimatedHours: row.estimatedHours ? parseInt(row.estimatedHours) : undefined,
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : undefined,
            deliverByDate: row.deliverByDate,
            createdOn: row.createdOn || new Date().toISOString(),
            lastUpdatedOn: row.lastUpdatedOn || new Date().toISOString(),
            order: row.order ? parseInt(row.order) : 0
        };
    }

    /**
     * Import from JIRA CSV export
     */
    private static importJIRA(content: string, fieldMapping?: FieldMapping[]): TreeNodeData[] {
        // JIRA export typically has: Issue key, Summary, Issue Type, Status, Priority, etc.
        const data = this.importCSV(content, fieldMapping);

        // Convert JIRA types/statuses to our format
        return data.map(node => ({
            ...node,
            type: this.jiraTypeToOurs(node.type),
            status: this.jiraStatusToOurs(node.status),
            priority: this.jiraPriorityToOurs(node.priority)
        }));
    }

    /**
     * Apply field mapping
     */
    private static applyFieldMapping(item: any, mapping: FieldMapping[]): TreeNodeData {
        const mapped: any = {
            id: Date.now().toString() + Math.random(),
            title: 'Unnamed',
            type: 'task',
            status: 'todo'
        };

        mapping.forEach(({ source, target, transform }) => {
            const value = item[source];
            mapped[target] = transform ? transform(value) : value;
        });

        return mapped as TreeNodeData;
    }

    /**
     * Build hierarchy from flat list with path
     */
    private static buildHierarchy(nodes: TreeNodeData[]): TreeNodeData[] {
        // If nodes have a 'path' field, use it to build hierarchy
        // Otherwise return flat list
        const hasPath = nodes.some((n: any) => n.path);
        if (!hasPath) {
            return nodes;
        }

        const roots: TreeNodeData[] = [];
        const nodeMap = new Map<string, TreeNodeData>();

        nodes.forEach(node => {
            nodeMap.set(node.id, { ...node, children: [] });
        });

        nodes.forEach((node: any) => {
            const current = nodeMap.get(node.id)!;
            if (!node.path || node.path === node.title) {
                roots.push(current);
            } else {
                // Find parent by path
                const pathParts = node.path.split('/');
                const parentPath = pathParts.slice(0, -1).join('/');
                const parent = Array.from(nodeMap.values()).find(
                    (n: any) => n.path === parentPath
                );
                if (parent) {
                    if (!parent.children) {
                        parent.children = [];
                    }
                    parent.children.push(current);
                } else {
                    roots.push(current);
                }
            }
        });

        return roots;
    }

    /**
     * Validate imported data
     */
    private static validate(data: TreeNodeData[]): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        const validateNode = (node: TreeNodeData, path: string = '') => {
            if (!node.id) {
                errors.push(`${path}: Missing id`);
            }
            if (!node.title || !node.title.trim()) {
                errors.push(`${path}: Missing name`);
            }
            if (!['epic', 'story', 'task'].includes(node.type)) {
                errors.push(`${path}: Invalid type '${node.type}'`);
            }
            if (!['todo', 'in-progress', 'pending', 'done'].includes(node.status)) {
                errors.push(`${path}: Invalid status '${node.status}'`);
            }

            if (node.children) {
                node.children.forEach((child, index) => {
                    validateNode(child, `${path}/${node.title}[${index}]`);
                });
            }
        };

        data.forEach((node, index) => validateNode(node, `[${index}]`));

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Type normalization
     */
    private static normalizeType(type: string): 'epic' | 'story' | 'task' {
        const lower = type.toLowerCase();
        if (lower.includes('epic')) return 'epic';
        if (lower.includes('story') || lower.includes('feature')) return 'story';
        return 'task';
    }

    private static normalizeStatus(status: string): 'todo' | 'in-progress' | 'pending' | 'done' {
        const lower = status.toLowerCase().replace(/[_\s-]/g, '');
        if (lower.includes('complete') || lower.includes('done') || lower.includes('closed')) {
            return 'done';
        }
        if (lower.includes('progress') || lower.includes('active') || lower.includes('doing')) {
            return 'in-progress';
        }
        if (lower.includes('block')) {
            return 'pending';
        }
        return 'todo';
    }

    private static normalizePriority(priority?: string): 'low' | 'medium' | 'high' | 'critical' | undefined {
        if (!priority) return undefined;
        const lower = priority.toLowerCase();
        if (lower.includes('critical') || lower.includes('highest')) return 'critical';
        if (lower.includes('high')) return 'high';
        if (lower.includes('low') || lower.includes('lowest')) return 'low';
        return 'medium';
    }

    /**
     * JIRA field conversions
     */
    private static jiraTypeToOurs(type: string): 'epic' | 'story' | 'task' {
        return this.normalizeType(type);
    }

    private static jiraStatusToOurs(status: string): 'todo' | 'in-progress' | 'pending' | 'done' {
        return this.normalizeStatus(status);
    }

    private static jiraPriorityToOurs(priority?: string): 'low' | 'medium' | 'high' | 'critical' | undefined {
        return this.normalizePriority(priority);
    }

    /**
     * Preview import (validation only)
     */
    static async preview(content: string, format: 'json' | 'csv' | 'jira'): Promise<ImportResult> {
        return this.import(content, { format, validateOnly: true });
    }

    /**
     * Get import history from localStorage
     */
    static getHistory(): Array<{
        timestamp: string;
        format: string;
        imported: number;
        filename: string;
    }> {
        const history = localStorage.getItem('importHistory');
        return history ? JSON.parse(history) : [];
    }

    /**
     * Save import to history
     */
    static saveToHistory(result: ImportResult, format: string, filename: string): void {
        const history = this.getHistory();
        history.unshift({
            timestamp: new Date().toISOString(),
            format,
            imported: result.imported,
            filename
        });

        // Keep last 10
        if (history.length > 10) {
            history.pop();
        }

        localStorage.setItem('importHistory', JSON.stringify(history));
    }
}
