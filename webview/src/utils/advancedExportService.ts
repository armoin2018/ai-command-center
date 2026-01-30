/**
 * Advanced Export Service
 * 
 * Export planning data to multiple formats: Markdown, CSV, Excel, JIRA
 */

import { TreeNodeData } from '../types/tree';

export type AdvancedExportFormat = 'markdown' | 'csv' | 'excel' | 'jira';

export interface ExportOptions {
    format: AdvancedExportFormat;
    includeDescription?: boolean;
    includeMetadata?: boolean;
    template?: 'default' | 'detailed' | 'summary';
    customFields?: string[];
}

export class AdvancedExportService {
    /**
     * Export tree to specified format
     */
    static export(tree: TreeNodeData[], options: ExportOptions): string {
        switch (options.format) {
            case 'markdown':
                return this.exportToMarkdown(tree, options);
            case 'csv':
                return this.exportToCSV(tree, options);
            case 'jira':
                return this.exportToJIRA(tree, options);
            default:
                throw new Error(`Unsupported format: ${options.format}`);
        }
    }

    /**
     * Export to Markdown format
     */
    private static exportToMarkdown(tree: TreeNodeData[], options: ExportOptions): string {
        const lines: string[] = [];
        const template = options.template || 'default';

        lines.push('# Planning Overview\n');
        lines.push(`Generated: ${new Date().toLocaleString()}\n`);

        const traverse = (node: TreeNodeData, depth: number = 0) => {
            const indent = '  '.repeat(depth);
            const emoji = this.getTypeEmoji(node.type);
            const status = this.getStatusIndicator(node.status);
            
            // Title line
            lines.push(`${indent}- ${emoji} **${node.title}** ${status}`);

            // Metadata
            if (template === 'detailed' || options.includeMetadata) {
                const metadata: string[] = [];
                if (node.priority) metadata.push(`Priority: ${node.priority}`);
                if (node.estimatedHours) metadata.push(`Points: ${node.estimatedHours}`);
                if (node.tags && node.tags.length > 0) metadata.push(`Tags: ${node.tags.join(', ')}`);
                
                if (metadata.length > 0) {
                    lines.push(`${indent}  - ${metadata.join(' | ')}`);
                }
            }

            // Description
            if (options.includeDescription && node.description) {
                const descLines = node.description.split('\n');
                descLines.forEach(line => {
                    lines.push(`${indent}  > ${line}`);
                });
            }

            lines.push(''); // Blank line

            // Recurse children
            if (node.children) {
                node.children.forEach(child => traverse(child, depth + 1));
            }
        };

        tree.forEach(node => traverse(node, 0));

        // Summary section
        if (template === 'summary' || template === 'detailed') {
            lines.push('\n## Summary\n');
            const stats = this.calculateStats(tree);
            lines.push(`- Total Items: ${stats.total}`);
            lines.push(`- Epics: ${stats.epics}`);
            lines.push(`- Stories: ${stats.stories}`);
            lines.push(`- Tasks: ${stats.tasks}`);
            lines.push(`- Completed: ${stats.completed}`);
            lines.push(`- In Progress: ${stats.inProgress}`);
            lines.push(`- Not Started: ${stats.notStarted}`);
            lines.push(`- Blocked: ${stats.blocked}`);
            if (stats.totalPoints > 0) {
                lines.push(`- Total Story Points: ${stats.totalPoints}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Export to CSV format
     */
    private static exportToCSV(tree: TreeNodeData[], options: ExportOptions): string {
        const lines: string[] = [];
        
        // Header
        const headers = ['Type', 'Name', 'Status', 'Priority', 'Story Points', 'Tags', 'Description', 'Path'];
        lines.push(headers.map(h => this.escapeCSV(h)).join(','));

        // Flatten tree and export
        const traverse = (node: TreeNodeData, path: string = '') => {
            const currentPath = path ? `${path} > ${node.title}` : node.title;
            
            const row = [
                node.type,
                node.title,
                node.status,
                node.priority || '',
                node.estimatedHours?.toString() || '',
                node.tags?.join('; ') || '',
                options.includeDescription ? (node.description || '') : '',
                currentPath
            ];

            lines.push(row.map(cell => this.escapeCSV(cell)).join(','));

            if (node.children) {
                node.children.forEach(child => traverse(child, currentPath));
            }
        };

        tree.forEach(node => traverse(node));

        return lines.join('\n');
    }

    /**
     * Export to JIRA import format (CSV)
     */
    private static exportToJIRA(tree: TreeNodeData[], options: ExportOptions): string {
        const lines: string[] = [];
        
        // JIRA CSV header
        const headers = [
            'Summary',
            'Issue Type',
            'Priority',
            'Status',
            'Description',
            'Story Points',
            'Labels',
            'Parent',
            'Epic Link'
        ];
        lines.push(headers.map(h => this.escapeCSV(h)).join(','));

        let epicKey = '';

        const traverse = (node: TreeNodeData, parentKey: string = '') => {
            const issueType = this.mapToJIRAType(node.type);
            const priority = this.mapToJIRAPriority(node.priority);
            const status = this.mapToJIRAStatus(node.status);
            
            // Track epic for children
            if (node.type === 'epic') {
                epicKey = node.title;
            }

            const row = [
                node.title,
                issueType,
                priority,
                status,
                node.description || '',
                node.estimatedHours?.toString() || '',
                node.tags?.join(' ') || '',
                parentKey,
                node.type !== 'epic' ? epicKey : ''
            ];

            lines.push(row.map(cell => this.escapeCSV(cell)).join(','));

            if (node.children) {
                node.children.forEach(child => traverse(child, node.title));
            }
        };

        tree.forEach(node => traverse(node));

        return lines.join('\n');
    }

    /**
     * Helper: Escape CSV values
     */
    private static escapeCSV(value: string): string {
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }

    /**
     * Helper: Get emoji for type
     */
    private static getTypeEmoji(type: string): string {
        switch (type) {
            case 'epic': return '🎯';
            case 'story': return '📘';
            case 'task': return '✅';
            default: return '📌';
        }
    }

    /**
     * Helper: Get status indicator
     */
    private static getStatusIndicator(status: string): string {
        switch (status) {
            case 'done': return '✓';
            case 'in-progress': return '⏳';
            case 'pending': return '🚫';
            case 'todo': return '○';
            default: return '';
        }
    }

    /**
     * Helper: Map to JIRA issue type
     */
    private static mapToJIRAType(type: string): string {
        switch (type) {
            case 'epic': return 'Epic';
            case 'story': return 'Story';
            case 'task': return 'Task';
            default: return 'Task';
        }
    }

    /**
     * Helper: Map to JIRA priority
     */
    private static mapToJIRAPriority(priority?: string): string {
        switch (priority) {
            case 'critical': return 'Highest';
            case 'high': return 'High';
            case 'medium': return 'Medium';
            case 'low': return 'Low';
            default: return 'Medium';
        }
    }

    /**
     * Helper: Map to JIRA status
     */
    private static mapToJIRAStatus(status: string): string {
        switch (status) {
            case 'todo': return 'To Do';
            case 'in-progress': return 'In Progress';
            case 'done': return 'Done';
            case 'pending': return 'Blocked';
            default: return 'To Do';
        }
    }

    /**
     * Calculate statistics
     */
    private static calculateStats(tree: TreeNodeData[]): {
        total: number;
        epics: number;
        stories: number;
        tasks: number;
        completed: number;
        inProgress: number;
        notStarted: number;
        blocked: number;
        totalPoints: number;
    } {
        const stats = {
            total: 0,
            epics: 0,
            stories: 0,
            tasks: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            blocked: 0,
            totalPoints: 0
        };

        const traverse = (node: TreeNodeData) => {
            stats.total++;
            
            // Count by type
            if (node.type === 'epic') stats.epics++;
            else if (node.type === 'story') stats.stories++;
            else if (node.type === 'task') stats.tasks++;

            // Count by status
            if (node.status === 'done') stats.completed++;
            else if (node.status === 'in-progress') stats.inProgress++;
            else if (node.status === 'todo') stats.notStarted++;
            else if (node.status === 'pending') stats.blocked++;

            // Sum story points
            if (node.estimatedHours) {
                stats.totalPoints += node.estimatedHours;
            }

            if (node.children) {
                node.children.forEach(traverse);
            }
        };

        tree.forEach(traverse);
        return stats;
    }

    /**
     * Download exported content as file
     */
    static download(content: string, filename: string): void {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
