/**
 * Mermaid Panel Provider
 * 
 * Renders Mermaid diagrams in a WebView panel with zoom, pan, and export capabilities
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { Logger } from '../logger';

export interface MermaidDiagram {
    source: string;
    title?: string;
}

export class MermaidPanelProvider {
    private static currentPanel: MermaidPanelProvider | undefined;
    private readonly panel: vscode.WebviewPanel;
    // @ts-ignore - stored for future use
    private readonly _extensionUri: vscode.Uri;
    private readonly logger: Logger;
    private disposables: vscode.Disposable[] = [];
    private currentDiagram: MermaidDiagram | undefined;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        logger: Logger,
        diagram?: MermaidDiagram
    ) {
        this.panel = panel;
        this._extensionUri = extensionUri;
        this.logger = logger;
        this.currentDiagram = diagram;

        // Set the webview's initial html content
        this.update();

        // Listen for when the panel is disposed
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        // Handle messages from the webview
        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.command) {
                    case 'export':
                        await this.exportDiagram(message.format);
                        break;
                    case 'error':
                        vscode.window.showErrorMessage(`Mermaid error: ${message.message}`);
                        this.logger.error('Mermaid rendering error', { error: message.message });
                        break;
                    case 'ready':
                        this.logger.info('Mermaid panel ready');
                        break;
                }
            },
            null,
            this.disposables
        );
    }

    /**
     * Create or show the Mermaid panel
     */
    public static render(
        extensionUri: vscode.Uri,
        logger: Logger,
        diagram?: MermaidDiagram
    ): MermaidPanelProvider {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (MermaidPanelProvider.currentPanel) {
            MermaidPanelProvider.currentPanel.panel.reveal(column);
            if (diagram) {
                MermaidPanelProvider.currentPanel.setDiagram(diagram);
            }
            return MermaidPanelProvider.currentPanel;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            'aiccMermaidPanel',
            diagram?.title || 'Mermaid Diagram',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media'),
                    vscode.Uri.joinPath(extensionUri, 'webview')
                ]
            }
        );

        MermaidPanelProvider.currentPanel = new MermaidPanelProvider(
            panel,
            extensionUri,
            logger,
            diagram
        );

        return MermaidPanelProvider.currentPanel;
    }

    /**
     * Render from active editor
     */
    public static async renderFromActiveEditor(
        extensionUri: vscode.Uri,
        logger: Logger
    ): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const document = editor.document;
        const text = document.getText();

        // Check if it's a Mermaid file or contains Mermaid code
        const isMermaidFile = document.languageId === 'mermaid' || 
                              document.fileName.endsWith('.mmd') ||
                              document.fileName.endsWith('.mermaid');

        let diagramSource = text;
        
        // If not a Mermaid file, try to extract Mermaid code blocks
        if (!isMermaidFile) {
            const mermaidBlocks = this.extractMermaidBlocks(text);
            if (mermaidBlocks.length === 0) {
                vscode.window.showErrorMessage('No Mermaid diagrams found in document');
                return;
            }

            if (mermaidBlocks.length === 1) {
                diagramSource = mermaidBlocks[0];
            } else {
                // Let user choose which diagram to render
                const selected = await vscode.window.showQuickPick(
                    mermaidBlocks.map((block, index) => ({
                        label: `Diagram ${index + 1}`,
                        description: block.split('\n')[0].substring(0, 50),
                        block
                    })),
                    { placeHolder: 'Select a diagram to preview' }
                );

                if (!selected) {
                    return;
                }

                diagramSource = selected.block;
            }
        }

        const diagram: MermaidDiagram = {
            source: diagramSource,
            title: path.basename(document.fileName)
        };

        MermaidPanelProvider.render(extensionUri, logger, diagram);
    }

    /**
     * Extract Mermaid code blocks from markdown
     */
    private static extractMermaidBlocks(text: string): string[] {
        const blocks: string[] = [];
        const regex = /```mermaid\s*\n([\s\S]*?)```/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            blocks.push(match[1].trim());
        }

        return blocks;
    }

    /**
     * Set or update the diagram
     */
    public setDiagram(diagram: MermaidDiagram): void {
        this.currentDiagram = diagram;
        this.panel.title = diagram.title || 'Mermaid Diagram';
        this.update();
    }

    /**
     * Update the webview content
     */
    private update(): void {
        this.panel.webview.html = this.getWebviewContent();
    }

    /**
     * Export diagram to file
     */
    private async exportDiagram(format: 'svg' | 'png'): Promise<void> {
        if (!this.currentDiagram) {
            vscode.window.showErrorMessage('No diagram to export');
            return;
        }

        const defaultUri = vscode.workspace.workspaceFolders?.[0]?.uri;
        const defaultFileName = `diagram.${format}`;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri ? vscode.Uri.joinPath(defaultUri, defaultFileName) : undefined,
            filters: {
                [format.toUpperCase()]: [format]
            }
        });

        if (!uri) {
            return;
        }

        // Request export data from webview
        this.panel.webview.postMessage({
            command: 'export',
            format,
            path: uri.fsPath
        });
    }

    /**
     * Dispose the panel
     */
    public dispose(): void {
        MermaidPanelProvider.currentPanel = undefined;

        this.panel.dispose();

        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    /**
     * Get webview HTML content
     */
    private getWebviewContent(): string {
        const nonce = this.getNonce();
        
        const diagramSource = this.currentDiagram?.source || 
            'graph TD\n    A[Start] --> B[No Diagram]\n    B --> C[Load a diagram]';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this.panel.webview.cspSource} https: data: blob:; style-src ${this.panel.webview.cspSource} 'unsafe-inline'; font-src ${this.panel.webview.cspSource} data:; script-src 'nonce-${nonce}'; connect-src ${this.panel.webview.cspSource} https: http://localhost:* https://localhost:* ws://localhost:* http://127.0.0.1:* https://127.0.0.1:* ws://127.0.0.1:*; frame-src http://localhost:* https://localhost:* http://127.0.0.1:* https://127.0.0.1:*; worker-src blob:;">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mermaid Diagram</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }
        #toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 40px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 12px;
            z-index: 1000;
        }
        #toolbar button {
            padding: 6px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            border-radius: 3px;
            font-size: 12px;
        }
        #toolbar button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        #toolbar .separator {
            width: 1px;
            height: 24px;
            background: var(--vscode-panel-border);
        }
        #toolbar .zoom-info {
            margin-left: auto;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        #container {
            position: absolute;
            top: 40px;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #diagram-wrapper {
            transform-origin: center center;
            transition: transform 0.2s ease;
        }
        #mermaid {
            padding: 20px;
        }
        .error {
            color: var(--vscode-errorForeground);
            padding: 20px;
            text-align: center;
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <button onclick="zoomIn()">Zoom In (+)</button>
        <button onclick="zoomOut()">Zoom Out (-)</button>
        <button onclick="resetZoom()">Reset (0)</button>
        <div class="separator"></div>
        <button onclick="fitToScreen()">Fit to Screen</button>
        <div class="separator"></div>
        <button onclick="exportSVG()">Export SVG</button>
        <button onclick="exportPNG()">Export PNG</button>
        <div class="zoom-info">
            <span id="zoom-level">100%</span>
        </div>
    </div>
    <div id="container">
        <div id="diagram-wrapper">
            <div id="mermaid"></div>
        </div>
    </div>

    <script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
mermaid.initialize({
    startOnLoad: false,
    theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'var(--vscode-font-family)'
});
window.__mermaid = mermaid;
window.dispatchEvent(new Event('mermaid-ready'));
    </script>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let currentZoom = 1.0;
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        // Render diagram
        const diagramSource = ${JSON.stringify(diagramSource)};
        
        async function renderDiagram() {
            try {
                const mermaid = window.__mermaid;
                const element = document.getElementById('mermaid');
                element.textContent = diagramSource;
                
                await mermaid.run({
                    nodes: [element]
                });
                
                vscode.postMessage({ command: 'ready' });
            } catch (error) {
                document.getElementById('mermaid').innerHTML = 
                    '<div class="error">Error rendering diagram: ' + error.message + '</div>';
                vscode.postMessage({ 
                    command: 'error', 
                    message: error.message 
                });
            }
        }

        if (window.__mermaid) {
            renderDiagram();
        } else {
            window.addEventListener('mermaid-ready', () => renderDiagram());
        }

        // Zoom controls
        function updateZoom(zoom) {
            currentZoom = Math.max(0.1, Math.min(5, zoom));
            const wrapper = document.getElementById('diagram-wrapper');
            wrapper.style.transform = \`scale(\${currentZoom})\`;
            document.getElementById('zoom-level').textContent = 
                Math.round(currentZoom * 100) + '%';
        }

        function zoomIn() {
            updateZoom(currentZoom + 0.1);
        }

        function zoomOut() {
            updateZoom(currentZoom - 0.1);
        }

        function resetZoom() {
            updateZoom(1.0);
        }

        function fitToScreen() {
            const container = document.getElementById('container');
            const diagram = document.getElementById('mermaid');
            const containerRect = container.getBoundingClientRect();
            const diagramRect = diagram.getBoundingClientRect();
            
            const scaleX = (containerRect.width - 40) / diagramRect.width;
            const scaleY = (containerRect.height - 40) / diagramRect.height;
            const scale = Math.min(scaleX, scaleY, 1);
            
            updateZoom(scale);
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                zoomIn();
            } else if (e.key === '-') {
                e.preventDefault();
                zoomOut();
            } else if (e.key === '0') {
                e.preventDefault();
                resetZoom();
            } else if (e.key === 'f') {
                e.preventDefault();
                fitToScreen();
            }
        });

        // Pan with mouse drag
        const container = document.getElementById('container');
        
        container.addEventListener('mousedown', (e) => {
            if (e.target === container || e.target.id === 'diagram-wrapper') {
                isDragging = true;
                startX = e.pageX - container.offsetLeft;
                startY = e.pageY - container.offsetTop;
                scrollLeft = container.scrollLeft;
                scrollTop = container.scrollTop;
                container.style.cursor = 'grabbing';
            }
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - container.offsetLeft;
            const y = e.pageY - container.offsetTop;
            const walkX = (x - startX);
            const walkY = (y - startY);
            container.scrollLeft = scrollLeft - walkX;
            container.scrollTop = scrollTop - walkY;
        });

        container.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'default';
        });

        container.addEventListener('mouseleave', () => {
            isDragging = false;
            container.style.cursor = 'default';
        });

        // Zoom with mouse wheel
        container.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                updateZoom(currentZoom + delta);
            }
        });

        // Export functions
        async function exportSVG() {
            const svg = document.querySelector('#mermaid svg');
            if (!svg) {
                alert('No diagram to export');
                return;
            }
            
            const svgData = new XMLSerializer().serializeToString(svg);
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'diagram.svg';
            link.click();
            URL.revokeObjectURL(url);
        }

        async function exportPNG() {
            const svg = document.querySelector('#mermaid svg');
            if (!svg) {
                alert('No diagram to export');
                return;
            }

            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'diagram.png';
                    link.click();
                    URL.revokeObjectURL(url);
                });
            };

            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'export') {
                if (message.format === 'svg') {
                    exportSVG();
                } else if (message.format === 'png') {
                    exportPNG();
                }
            }
        });
    </script>
</body>
</html>`;
    }

    /**
     * Generate nonce for CSP
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}
