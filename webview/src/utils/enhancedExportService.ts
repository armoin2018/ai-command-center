/**
 * Enhanced Export Service
 * 
 * Support for multiple export formats with templates
 */

import { TreeNodeData } from '../types/tree';

export type ExportFormatType = 'json' | 'csv' | 'markdown' | 'html';

export interface ExportOptions {
    format: ExportFormatType;
    includeChildren?: boolean;
    includeMetadata?: boolean;
    fields?: string[];
    template?: string;
}

export class EnhancedExportService {
    /**
     * Export tree to specified format
     */
    static export(tree: TreeNodeData[], options: ExportOptions): string {
        switch (options.format) {
            case 'json':
                return this.exportJSON(tree, options);
            case 'csv':
                return this.exportCSV(tree, options);
            case 'markdown':
                return this.exportMarkdown(tree, options);
            case 'html':
                return this.exportHTML(tree, options);
            default:
                throw new Error(`Unsupported format: ${options.format}`);
        }
    }

    /**
     * Export to JSON
     */
    private static exportJSON(tree: TreeNodeData[], options: ExportOptions): string {
        const data = options.includeChildren ? tree : this.flattenTree(tree);
        return JSON.stringify(data, null, 2);
    }

    /**
     * Export to CSV
     */
    private static exportCSV(tree: TreeNodeData[], options: ExportOptions): string {
        const rows = this.flattenTree(tree);
        const fields = options.fields || ['id', 'name', 'type', 'status', 'priority', 'estimatedHours'];
        
        // Header
        const csv = [fields.join(',')];
        
        // Rows
        rows.forEach(node => {
            const row = fields.map(field => {
                const value = (node as any)[field];
                if (value === undefined || value === null) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value);
            });
            csv.push(row.join(','));
        });
        
        return csv.join('\n');
    }

    /**
     * Export to Markdown
     */
    private static exportMarkdown(tree: TreeNodeData[], options: ExportOptions): string {
        const lines: string[] = [];
        
        lines.push('# Planning Structure\n');
        
        const traverse = (nodes: TreeNodeData[], level: number = 0) => {
            nodes.forEach(node => {
                const indent = '  '.repeat(level);
                const icon = this.getTypeIcon(node.type);
                
                lines.push(`${indent}- ${icon} **${node.title}**`);
                lines.push(`${indent}  - Type: ${node.type}`);
                lines.push(`${indent}  - Status: ${node.status}`);
                
                if (node.priority) {
                    lines.push(`${indent}  - Priority: ${node.priority}`);
                }
                
                if (node.estimatedHours) {
                    lines.push(`${indent}  - Story Points: ${node.estimatedHours}`);
                }
                
                if (node.tags && node.tags.length > 0) {
                    lines.push(`${indent}  - Tags: ${node.tags.join(', ')}`);
                }
                
                lines.push('');
                
                if (options.includeChildren && node.children) {
                    traverse(node.children, level + 1);
                }
            });
        };
        
        traverse(tree);
        return lines.join('\n');
    }

    /**
     * Export to HTML
     */
    private static exportHTML(tree: TreeNodeData[], options: ExportOptions): string {
        const html: string[] = [];
        
        html.push('<!DOCTYPE html>');
        html.push('<html>');
        html.push('<head>');
        html.push('<meta charset="UTF-8">');
        html.push('<title>Planning Export</title>');
        html.push('<style>');
        html.push('body { font-family: sans-serif; margin: 20px; }');
        html.push('ul { list-style: none; padding-left: 20px; }');
        html.push('.epic { color: #8b5cf6; }');
        html.push('.story { color: #3b82f6; }');
        html.push('.task { color: #22c55e; }');
        html.push('.status { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 0.9em; }');
        html.push('.status.completed { background: #22c55e; color: white; }');
        html.push('.status.in-progress { background: #3b82f6; color: white; }');
        html.push('.status.blocked { background: #ef4444; color: white; }');
        html.push('.status.not-started { background: #94a3b8; color: white; }');
        html.push('.metadata { color: #666; font-size: 0.9em; margin-top: 4px; }');
        html.push('</style>');
        html.push('</head>');
        html.push('<body>');
        html.push('<h1>Planning Structure</h1>');
        
        const traverse = (nodes: TreeNodeData[]) => {
            html.push('<ul>');
            nodes.forEach(node => {
                html.push('<li>');
                html.push(`<div class="${node.type}">`);
                html.push(`<strong>${this.getTypeIcon(node.type)} ${node.title}</strong>`);
                html.push(`<span class="status ${node.status}">${node.status}</span>`);
                html.push('</div>');
                
                if (options.includeMetadata) {
                    html.push('<div class="metadata">');
                    if (node.priority) html.push(`Priority: ${node.priority} | `);
                    if (node.estimatedHours) html.push(`Points: ${node.estimatedHours} | `);
                    if (node.tags) html.push(`Tags: ${node.tags.join(', ')}`);
                    html.push('</div>');
                }
                
                if (options.includeChildren && node.children) {
                    traverse(node.children);
                }
                
                html.push('</li>');
            });
            html.push('</ul>');
        };
        
        traverse(tree);
        
        html.push('</body>');
        html.push('</html>');
        
        return html.join('\n');
    }

    /**
     * Flatten tree to array
     */
    private static flattenTree(tree: TreeNodeData[]): TreeNodeData[] {
        const result: TreeNodeData[] = [];
        
        const traverse = (nodes: TreeNodeData[]) => {
            nodes.forEach(node => {
                result.push({ ...node, children: undefined });
                if (node.children) {
                    traverse(node.children);
                }
            });
        };
        
        traverse(tree);
        return result;
    }

    /**
     * Get type icon
     */
    private static getTypeIcon(type: string): string {
        switch (type) {
            case 'epic': return '🎯';
            case 'story': return '📘';
            case 'task': return '✅';
            default: return '📄';
        }
    }

    /**
     * Download exported data
     */
    static download(content: string, filename: string, format: ExportFormatType): void {
        const mimeTypes = {
            json: 'application/json',
            csv: 'text/csv',
            markdown: 'text/markdown',
            html: 'text/html'
        };
        
        const blob = new Blob([content], { type: mimeTypes[format] });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
