/**
 * Asset Tree Map Tool
 * 
 * Generates a detailed tree map of all project assets including:
 * - File structure with metadata
 * - Dependencies and relationships
 * - Size statistics
 * - Type categorization
 * 
 * Exposed as a VS Code command and toolset
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../logger';

/**
 * Asset metadata interface
 */
export interface AssetInfo {
    name: string;
    path: string;
    relativePath: string;
    type: AssetType;
    category: AssetCategory;
    size: number;
    sizeFormatted: string;
    extension: string;
    lastModified: Date;
    isDirectory: boolean;
    children?: AssetInfo[];
    dependencies?: string[];
    exports?: string[];
    lineCount?: number;
}

/**
 * Asset type enumeration
 */
export type AssetType = 
    | 'typescript'
    | 'javascript'
    | 'react'
    | 'css'
    | 'html'
    | 'json'
    | 'yaml'
    | 'markdown'
    | 'image'
    | 'font'
    | 'config'
    | 'bundle'
    | 'directory'
    | 'other';

/**
 * Asset category for grouping
 */
export type AssetCategory = 
    | 'source'
    | 'component'
    | 'service'
    | 'utility'
    | 'type'
    | 'config'
    | 'media'
    | 'webview'
    | 'test'
    | 'documentation'
    | 'build'
    | 'other';

/**
 * Tree statistics
 */
export interface TreeStats {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
    totalSizeFormatted: string;
    byType: Record<AssetType, { count: number; size: number }>;
    byCategory: Record<AssetCategory, { count: number; size: number }>;
    largestFiles: AssetInfo[];
    recentlyModified: AssetInfo[];
}

/**
 * Complete tree map output
 */
export interface AssetTreeMap {
    root: AssetInfo;
    stats: TreeStats;
    generatedAt: Date;
    projectPath: string;
}

/**
 * Asset Tree Map Generator
 */
export class AssetTreeMapGenerator {
    private logger: Logger;
    private ignoredPatterns: RegExp[];
    private allFiles: AssetInfo[] = [];

    constructor(logger: Logger) {
        this.logger = logger;
        this.ignoredPatterns = [
            /node_modules/,
            /\.git/,
            /dist/,
            /out/,
            /\.DS_Store/,
            /\.vsix$/,
            /\.log$/,
            /package-lock\.json$/
        ];
    }

    /**
     * Generate complete asset tree map
     */
    public async generate(rootPath: string): Promise<AssetTreeMap> {
        this.logger.info('Generating asset tree map', { rootPath });
        this.allFiles = [];

        const startTime = Date.now();
        const root = await this.scanDirectory(rootPath, rootPath);
        const stats = this.calculateStats();
        const duration = Date.now() - startTime;

        this.logger.info('Asset tree map generated', { 
            totalFiles: stats.totalFiles,
            totalDirectories: stats.totalDirectories,
            duration
        });

        return {
            root,
            stats,
            generatedAt: new Date(),
            projectPath: rootPath
        };
    }

    /**
     * Recursively scan directory
     */
    private async scanDirectory(dirPath: string, rootPath: string): Promise<AssetInfo> {
        const stats = fs.statSync(dirPath);
        const relativePath = path.relative(rootPath, dirPath);
        const name = path.basename(dirPath);

        const dirInfo: AssetInfo = {
            name: name || path.basename(rootPath),
            path: dirPath,
            relativePath: relativePath || '.',
            type: 'directory',
            category: this.categorizeDirectory(relativePath),
            size: 0,
            sizeFormatted: '0 B',
            extension: '',
            lastModified: stats.mtime,
            isDirectory: true,
            children: []
        };

        try {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const entryPath = path.join(dirPath, entry.name);
                
                // Skip ignored patterns
                if (this.shouldIgnore(entryPath)) {
                    continue;
                }

                if (entry.isDirectory()) {
                    const childDir = await this.scanDirectory(entryPath, rootPath);
                    dirInfo.children!.push(childDir);
                    dirInfo.size += childDir.size;
                } else if (entry.isFile()) {
                    const fileInfo = await this.scanFile(entryPath, rootPath);
                    dirInfo.children!.push(fileInfo);
                    dirInfo.size += fileInfo.size;
                    this.allFiles.push(fileInfo);
                }
            }

            // Sort children: directories first, then files, alphabetically
            dirInfo.children!.sort((a, b) => {
                if (a.isDirectory && !b.isDirectory) return -1;
                if (!a.isDirectory && b.isDirectory) return 1;
                return a.name.localeCompare(b.name);
            });

            dirInfo.sizeFormatted = this.formatSize(dirInfo.size);

        } catch (error) {
            this.logger.error('Error scanning directory', { path: dirPath, error });
        }

        return dirInfo;
    }

    /**
     * Scan individual file
     */
    private async scanFile(filePath: string, rootPath: string): Promise<AssetInfo> {
        const stats = fs.statSync(filePath);
        const relativePath = path.relative(rootPath, filePath);
        const ext = path.extname(filePath).toLowerCase();
        const name = path.basename(filePath);

        const fileInfo: AssetInfo = {
            name,
            path: filePath,
            relativePath,
            type: this.getFileType(ext, name),
            category: this.categorizeFile(relativePath, ext),
            size: stats.size,
            sizeFormatted: this.formatSize(stats.size),
            extension: ext,
            lastModified: stats.mtime,
            isDirectory: false
        };

        // Get line count for text files
        if (this.isTextFile(ext)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                fileInfo.lineCount = content.split('\n').length;

                // Parse imports/exports for TypeScript/JavaScript
                if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
                    fileInfo.dependencies = this.extractImports(content);
                    fileInfo.exports = this.extractExports(content);
                }
            } catch (error) {
                // Ignore read errors for binary files
            }
        }

        return fileInfo;
    }

    /**
     * Check if path should be ignored
     */
    private shouldIgnore(filePath: string): boolean {
        return this.ignoredPatterns.some(pattern => pattern.test(filePath));
    }

    /**
     * Determine file type from extension
     */
    private getFileType(ext: string, name: string): AssetType {
        const typeMap: Record<string, AssetType> = {
            '.ts': 'typescript',
            '.tsx': 'react',
            '.js': 'javascript',
            '.jsx': 'react',
            '.css': 'css',
            '.html': 'html',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.md': 'markdown',
            '.png': 'image',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.gif': 'image',
            '.svg': 'image',
            '.ico': 'image',
            '.woff': 'font',
            '.woff2': 'font',
            '.ttf': 'font',
            '.eot': 'font'
        };

        // Check for bundle files
        if (name.includes('.bundle.')) {
            return 'bundle';
        }

        // Check for config files
        if (name.match(/^(tsconfig|webpack|eslint|prettier|babel)/i) || 
            name === 'package.json' || 
            name === '.gitignore') {
            return 'config';
        }

        return typeMap[ext] || 'other';
    }

    /**
     * Categorize file based on path and extension
     */
    private categorizeFile(relativePath: string, ext: string): AssetCategory {
        const pathLower = relativePath.toLowerCase();

        if (pathLower.includes('/test/') || pathLower.includes('.test.') || pathLower.includes('.spec.')) {
            return 'test';
        }
        if (pathLower.includes('/components/')) {
            return 'component';
        }
        if (pathLower.includes('/services/') || pathLower.includes('/api/')) {
            return 'service';
        }
        if (pathLower.includes('/utils/') || pathLower.includes('/lib/') || pathLower.includes('/helpers/')) {
            return 'utility';
        }
        if (pathLower.includes('/types/')) {
            return 'type';
        }
        if (pathLower.includes('/webview/') || pathLower.includes('/media/webview/')) {
            return 'webview';
        }
        if (pathLower.includes('/media/')) {
            return 'media';
        }
        if (pathLower.includes('/config/') || ext === '.json' || ext === '.yaml' || ext === '.yml') {
            return 'config';
        }
        if (ext === '.md') {
            return 'documentation';
        }
        if (pathLower.includes('/dist/') || pathLower.includes('/out/') || pathLower.includes('.bundle.')) {
            return 'build';
        }
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
            return 'source';
        }

        return 'other';
    }

    /**
     * Categorize directory based on path
     */
    private categorizeDirectory(relativePath: string): AssetCategory {
        const pathLower = relativePath.toLowerCase();

        if (pathLower === '' || pathLower === '.') return 'source';
        if (pathLower.includes('test')) return 'test';
        if (pathLower.includes('component')) return 'component';
        if (pathLower.includes('service') || pathLower.includes('api')) return 'service';
        if (pathLower.includes('util') || pathLower.includes('lib') || pathLower.includes('helper')) return 'utility';
        if (pathLower.includes('type')) return 'type';
        if (pathLower.includes('webview')) return 'webview';
        if (pathLower.includes('media')) return 'media';
        if (pathLower.includes('config')) return 'config';
        if (pathLower.includes('doc')) return 'documentation';

        return 'other';
    }

    /**
     * Check if file is text-based
     */
    private isTextFile(ext: string): boolean {
        const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html', '.json', '.yaml', '.yml', '.md', '.txt', '.xml', '.svg'];
        return textExtensions.includes(ext);
    }

    /**
     * Extract import statements from code
     */
    private extractImports(content: string): string[] {
        const imports: string[] = [];
        const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
        
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        // Also check for require statements
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        while ((match = requireRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }

        return [...new Set(imports)];
    }

    /**
     * Extract export statements from code
     */
    private extractExports(content: string): string[] {
        const exports: string[] = [];
        
        // Named exports
        const namedExportRegex = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
        let match;
        while ((match = namedExportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }

        // Export { } statements
        const exportListRegex = /export\s+\{([^}]+)\}/g;
        while ((match = exportListRegex.exec(content)) !== null) {
            const names = match[1].split(',').map(n => n.trim().split(/\s+as\s+/)[0].trim());
            exports.push(...names.filter(n => n));
        }

        // Default exports
        if (/export\s+default/.test(content)) {
            exports.push('default');
        }

        return [...new Set(exports)];
    }

    /**
     * Format file size for display
     */
    private formatSize(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    }

    /**
     * Calculate aggregate statistics
     */
    private calculateStats(): TreeStats {
        const stats: TreeStats = {
            totalFiles: this.allFiles.length,
            totalDirectories: 0, // Will be calculated
            totalSize: this.allFiles.reduce((sum, f) => sum + f.size, 0),
            totalSizeFormatted: '',
            byType: {} as Record<AssetType, { count: number; size: number }>,
            byCategory: {} as Record<AssetCategory, { count: number; size: number }>,
            largestFiles: [],
            recentlyModified: []
        };

        stats.totalSizeFormatted = this.formatSize(stats.totalSize);

        // Aggregate by type
        for (const file of this.allFiles) {
            if (!stats.byType[file.type]) {
                stats.byType[file.type] = { count: 0, size: 0 };
            }
            stats.byType[file.type].count++;
            stats.byType[file.type].size += file.size;

            if (!stats.byCategory[file.category]) {
                stats.byCategory[file.category] = { count: 0, size: 0 };
            }
            stats.byCategory[file.category].count++;
            stats.byCategory[file.category].size += file.size;
        }

        // Top 10 largest files
        stats.largestFiles = [...this.allFiles]
            .sort((a, b) => b.size - a.size)
            .slice(0, 10);

        // Top 10 recently modified files
        stats.recentlyModified = [...this.allFiles]
            .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
            .slice(0, 10);

        return stats;
    }

    /**
     * Generate Markdown report
     */
    public generateMarkdownReport(treeMap: AssetTreeMap): string {
        const { root, stats, generatedAt, projectPath } = treeMap;
        
        let md = `# Asset Tree Map\n\n`;
        md += `**Project:** ${projectPath}\n`;
        md += `**Generated:** ${generatedAt.toISOString()}\n\n`;

        md += `## Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Files | ${stats.totalFiles} |\n`;
        md += `| Total Size | ${stats.totalSizeFormatted} |\n\n`;

        md += `## By Type\n\n`;
        md += `| Type | Count | Size |\n`;
        md += `|------|-------|------|\n`;
        for (const [type, data] of Object.entries(stats.byType).sort((a, b) => b[1].size - a[1].size)) {
            md += `| ${type} | ${data.count} | ${this.formatSize(data.size)} |\n`;
        }

        md += `\n## By Category\n\n`;
        md += `| Category | Count | Size |\n`;
        md += `|----------|-------|------|\n`;
        for (const [category, data] of Object.entries(stats.byCategory).sort((a, b) => b[1].size - a[1].size)) {
            md += `| ${category} | ${data.count} | ${this.formatSize(data.size)} |\n`;
        }

        md += `\n## Largest Files\n\n`;
        md += `| File | Size | Type |\n`;
        md += `|------|------|------|\n`;
        for (const file of stats.largestFiles) {
            md += `| ${file.relativePath} | ${file.sizeFormatted} | ${file.type} |\n`;
        }

        md += `\n## Recently Modified\n\n`;
        md += `| File | Modified | Size |\n`;
        md += `|------|----------|------|\n`;
        for (const file of stats.recentlyModified) {
            md += `| ${file.relativePath} | ${file.lastModified.toISOString()} | ${file.sizeFormatted} |\n`;
        }

        md += `\n## Directory Tree\n\n`;
        md += '```\n';
        md += this.generateTreeText(root, '');
        md += '```\n';

        return md;
    }

    /**
     * Generate ASCII tree representation
     */
    private generateTreeText(node: AssetInfo, prefix: string): string {
        let result = `${node.name}`;
        
        if (node.isDirectory) {
            result += `/\n`;
            if (node.children) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const isLast = i === node.children.length - 1;
                    const connector = isLast ? '└── ' : '├── ';
                    const childPrefix = isLast ? '    ' : '│   ';
                    result += `${prefix}${connector}${this.generateTreeText(child, prefix + childPrefix)}`;
                }
            }
        } else {
            result += ` (${node.sizeFormatted})\n`;
        }

        return result;
    }
}

/**
 * Register Asset Tree Map commands
 */
export function registerAssetTreeMapCommands(
    _context: vscode.ExtensionContext,
    logger: Logger
): vscode.Disposable[] {
    const generator = new AssetTreeMapGenerator(logger);
    const disposables: vscode.Disposable[] = [];

    // Command: Generate Asset Tree Map
    disposables.push(
        vscode.commands.registerCommand('aicc.generateAssetTreeMap', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const rootPath = workspaceFolders[0].uri.fsPath;

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Generating Asset Tree Map...',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: 'Scanning files...' });
                    const treeMap = await generator.generate(rootPath);

                    progress.report({ message: 'Generating report...' });
                    const report = generator.generateMarkdownReport(treeMap);

                    // Create and show document
                    const doc = await vscode.workspace.openTextDocument({
                        content: report,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(doc);

                    logger.info('Asset tree map generated successfully', {
                        totalFiles: treeMap.stats.totalFiles,
                        totalSize: treeMap.stats.totalSizeFormatted
                    });

                    vscode.window.showInformationMessage(
                        `Asset Tree Map: ${treeMap.stats.totalFiles} files, ${treeMap.stats.totalSizeFormatted}`
                    );
                } catch (error) {
                    logger.error('Failed to generate asset tree map', { error });
                    vscode.window.showErrorMessage(`Failed to generate asset tree map: ${error}`);
                }
            });
        })
    );

    // Command: Show Asset Stats
    disposables.push(
        vscode.commands.registerCommand('aicc.showAssetStats', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                const treeMap = await generator.generate(workspaceFolders[0].uri.fsPath);
                const stats = treeMap.stats;

                const items: vscode.QuickPickItem[] = [
                    { label: `📁 Total Files: ${stats.totalFiles}`, description: stats.totalSizeFormatted },
                    { label: '', kind: vscode.QuickPickItemKind.Separator },
                    ...Object.entries(stats.byCategory)
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([cat, data]) => ({
                            label: `📦 ${cat}`,
                            description: `${data.count} files, ${generator['formatSize'](data.size)}`
                        }))
                ];

                await vscode.window.showQuickPick(items, {
                    title: 'Asset Statistics',
                    placeHolder: 'Project asset breakdown'
                });
            } catch (error) {
                logger.error('Failed to show asset stats', { error });
                vscode.window.showErrorMessage(`Failed to show asset stats: ${error}`);
            }
        })
    );

    // Command: Export Asset Tree as JSON
    disposables.push(
        vscode.commands.registerCommand('aicc.exportAssetTreeJson', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            try {
                const treeMap = await generator.generate(workspaceFolders[0].uri.fsPath);
                
                const uri = await vscode.window.showSaveDialog({
                    defaultUri: vscode.Uri.joinPath(workspaceFolders[0].uri, 'asset-tree-map.json'),
                    filters: { 'JSON': ['json'] }
                });

                if (uri) {
                    const json = JSON.stringify(treeMap, null, 2);
                    await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf-8'));
                    vscode.window.showInformationMessage(`Asset tree map exported to ${uri.fsPath}`);
                    logger.info('Asset tree map exported as JSON', { path: uri.fsPath });
                }
            } catch (error) {
                logger.error('Failed to export asset tree', { error });
                vscode.window.showErrorMessage(`Failed to export asset tree: ${error}`);
            }
        })
    );

    logger.info('Asset Tree Map commands registered');
    return disposables;
}
