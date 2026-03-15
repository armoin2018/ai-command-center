/**
 * Codicons Endpoint for MCP Server
 * 
 * Serves the @vscode/codicons CSS and TTF font files via the REST interface
 * so that MCP-connected clients can render VS Code codicons.
 * 
 * Routes:
 *   GET /codicons/codicon.css  → codicon stylesheet
 *   GET /codicons/codicon.ttf  → codicon font
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../../logger';

/**
 * Extension root directory (set during initialization via setExtensionPath)
 */
let extensionPath: string | undefined;

/**
 * Set the extension path for resolving bundled codicons
 */
export function setCodiconsExtensionPath(extPath: string): void {
    extensionPath = extPath;
}

/**
 * Locate the codicons dist directory.
 * Checks bundled dist/codicons first, then falls back to node_modules.
 */
function getCodiconsPath(): string {
    if (!extensionPath) {
        throw new Error('Extension path not set. Call setCodiconsExtensionPath first.');
    }

    const possiblePaths = [
        // Bundled in dist/codicons (preferred for installed extension)
        path.join(extensionPath, 'dist', 'codicons'),
        // Development mode: extension root / node_modules
        path.join(extensionPath, 'node_modules', '@vscode', 'codicons', 'dist'),
        // Installed extension: go up from dist to extension root
        path.join(extensionPath, '..', 'node_modules', '@vscode', 'codicons', 'dist'),
    ];

    for (const codPath of possiblePaths) {
        const cssFile = path.join(codPath, 'codicon.css');
        if (fs.existsSync(cssFile)) {
            return codPath;
        }
    }

    throw new Error('Codicons package not found. Searched: ' + possiblePaths.join(', '));
}

/**
 * Content-type map for codicon assets
 */
const CONTENT_TYPES: Record<string, string> = {
    '.css': 'text/css',
    '.ttf': 'font/ttf',
    '.svg': 'image/svg+xml',
    '.html': 'text/html',
};

/**
 * Allowed files — only serve specific codicon assets
 */
const ALLOWED_FILES = new Set([
    'codicon.css',
    'codicon.ttf',
    'codicon.svg',
]);

export class CodiconsEndpoint {
    private logger: Logger;
    private cachedFiles: Map<string, Buffer> = new Map();

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Handle requests under /codicons/*
     * Returns true if the request was handled, false otherwise.
     */
    async handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<boolean> {
        const url = req.url || '';

        if (!url.startsWith('/codicons/')) {
            return false;
        }

        if (req.method !== 'GET') {
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            return true;
        }

        const fileName = url.substring('/codicons/'.length);

        // Only serve allowed files — prevent directory traversal
        if (!ALLOWED_FILES.has(fileName)) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return true;
        }

        try {
            // Check cache first
            let content = this.cachedFiles.get(fileName);
            if (!content) {
                const codiconsDir = getCodiconsPath();
                const filePath = path.join(codiconsDir, fileName);

                // Extra safety: verify resolved path is within codicons dir
                const normalizedPath = path.normalize(filePath);
                if (!normalizedPath.startsWith(codiconsDir)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Forbidden');
                    return true;
                }

                content = fs.readFileSync(normalizedPath);
                this.cachedFiles.set(fileName, content);
                this.logger.debug(`Codicons: cached ${fileName} (${content.length} bytes)`);
            }

            const ext = path.extname(fileName);
            const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';

            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400', // Cache for 24h — font rarely changes
            });
            res.end(content);
            return true;

        } catch (error) {
            this.logger.warn(`Codicons file not found: ${fileName}`, {
                error: error instanceof Error ? error.message : String(error),
            });
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return true;
        }
    }

    /**
     * Clear the in-memory file cache
     */
    clearCache(): void {
        this.cachedFiles.clear();
        this.logger.debug('Codicons cache cleared');
    }
}
