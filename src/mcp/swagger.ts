/**
 * Swagger UI Endpoint Handler
 * 
 * Serves Swagger UI for interactive API documentation using local swagger-ui-dist package
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { MCPServerConfig } from './mcpServer';
import { getOpenAPIJSON } from './openapi';
import { Logger } from '../logger';

/**
 * Extension root directory (set during initialization)
 */
let extensionPath: string | undefined;

/**
 * Set the extension path for resolving swagger-ui-dist
 */
export function setExtensionPath(extPath: string): void {
    extensionPath = extPath;
}

/**
 * Get path to swagger-ui-dist package
 */
function getSwaggerUIPath(): string {
    if (!extensionPath) {
        throw new Error('Extension path not set. Call setExtensionPath first.');
    }

    // Try multiple potential locations for swagger-ui-dist
    const possiblePaths = [
        // Bundled in dist/swagger-ui (preferred for installed extension)
        path.join(extensionPath, 'dist', 'swagger-ui'),
        // Development mode: extension root/node_modules/swagger-ui-dist
        path.join(extensionPath, 'node_modules', 'swagger-ui-dist'),
        // Installed extension: go up from dist to extension root
        path.join(extensionPath, '..', 'node_modules', 'swagger-ui-dist'),
        // Alternative: check parent directories
        path.join(extensionPath, '..', '..', 'node_modules', 'swagger-ui-dist')
    ];

    for (const swaggerPath of possiblePaths) {
        if (fs.existsSync(swaggerPath)) {
            // For bundled dist/swagger-ui, check for main files
            const bundleFile = path.join(swaggerPath, 'swagger-ui-bundle.js');
            if (fs.existsSync(bundleFile)) {
                return swaggerPath;
            }
            // For node_modules package, check for package.json
            const packageJsonPath = path.join(swaggerPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                return swaggerPath;
            }
        }
    }

    throw new Error('swagger-ui-dist package not found. Searched: ' + possiblePaths.join(', '));
}

/**
 * Swagger UI HTML generator
 * Uses local swagger-ui-dist package files
 */
function generateSwaggerHTML(specUrl: string, baseUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'unsafe-inline' 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' http://localhost:* https://localhost:* ws://localhost:* http://127.0.0.1:* https://127.0.0.1:* ws://127.0.0.1:*;">
    <title>AI Command Center - API Documentation</title>
    <link rel="stylesheet" type="text/css" href="${baseUrl}/swagger-ui/swagger-ui.css">
    <style>
        body {
            margin: 0;
            padding: 0;
        }
        .swagger-ui .topbar {
            background-color: #2c3e50;
        }
        .swagger-ui .info .title {
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="${baseUrl}/swagger-ui/swagger-ui-bundle.js"></script>
    <script src="${baseUrl}/swagger-ui/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '${specUrl}',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
                docExpansion: 'list',
                filter: true,
                tryItOutEnabled: true
            });
            window.ui = ui;
        };
    </script>
</body>
</html>`;
}

/**
 * Handle Swagger UI endpoint requests
 */
export class SwaggerEndpoint {
    private config: MCPServerConfig;
    private logger: Logger;
    private cachedSpec: string | null = null;
    private cachedHTML: string | null = null;

    constructor(config: MCPServerConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Handle requests for /api-docs and /openapi.json
     */
    async handleRequest(
        req: http.IncomingMessage,
        res: http.ServerResponse
    ): Promise<boolean> {
        const url = req.url || '';

        // Serve OpenAPI specification JSON
        if (url === '/openapi.json') {
            this.logger.info('Serving OpenAPI specification');
            
            // Cache the spec for better performance
            if (!this.cachedSpec) {
                this.cachedSpec = getOpenAPIJSON(this.config);
            }

            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(this.cachedSpec);
            return true;
        }

        // Serve Swagger UI static files
        if (url.startsWith('/swagger-ui/')) {
            const fileName = url.substring('/swagger-ui/'.length);
            
            try {
                const swaggerPath = getSwaggerUIPath();
                const filePath = path.join(swaggerPath, fileName);
                
                // Only serve files from swagger-ui-dist directory (prevent directory traversal)
                const normalizedPath = path.normalize(filePath);
                if (!normalizedPath.startsWith(swaggerPath)) {
                    res.writeHead(403, { 'Content-Type': 'text/plain' });
                    res.end('Forbidden');
                    return true;
                }

                const content = fs.readFileSync(normalizedPath);
                const ext = path.extname(fileName);
                const contentTypes: Record<string, string> = {
                    '.js': 'application/javascript',
                    '.css': 'text/css',
                    '.json': 'application/json',
                    '.png': 'image/png',
                    '.svg': 'image/svg+xml',
                    '.html': 'text/html'
                };

                res.writeHead(200, {
                    'Content-Type': contentTypes[ext] || 'application/octet-stream',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(content);
                return true;
            } catch (error) {
                this.logger.warn(`Swagger UI file not found: ${fileName}`, { error: String(error) });
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
                return true;
            }
        }

        // Serve Swagger UI HTML
        if (url === '/api-docs' || url === '/api-docs/') {
            this.logger.info('Serving Swagger UI');

            // Generate Swagger UI HTML with spec URL
            if (!this.cachedHTML) {
                const protocol = this.config.transport === 'https' ? 'https' : 'http';
                const host = this.config.host || 'localhost';
                const port = this.config.port || 3000;
                const baseUrl = `${protocol}://${host}:${port}`;
                const specUrl = `${baseUrl}/openapi.json`;
                this.cachedHTML = generateSwaggerHTML(specUrl, baseUrl);
            }

            res.writeHead(200, {
                'Content-Type': 'text/html',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(this.cachedHTML);
            return true;
        }

        return false;
    }

    /**
     * Clear cached spec and HTML (call when config changes)
     */
    clearCache(): void {
        this.cachedSpec = null;
        this.cachedHTML = null;
        this.logger.debug('Swagger cache cleared');
    }

    /**
     * Get statistics about the Swagger endpoint
     */
    getStats(): {
        specCached: boolean;
        htmlCached: boolean;
        specSize: number;
    } {
        return {
            specCached: this.cachedSpec !== null,
            htmlCached: this.cachedHTML !== null,
            specSize: this.cachedSpec ? this.cachedSpec.length : 0
        };
    }
}
