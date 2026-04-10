/**
 * Help Documentation Panel (REQ-HEDP-001 – REQ-HEDP-005)
 *
 * Renders the help documentation portal in a full editor-area WebView panel
 * instead of confining it to the secondary panel tab.
 *
 * The HTML is sourced from HelpEndpoint.getPortalHTML() so the same rich
 * content (Mermaid diagrams, Chart.js charts, full-text search) is displayed
 * without needing a running HTTP server.
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { HelpEndpoint } from '../mcp/helpEndpoint';

const logger = Logger.getInstance();

export class HelpPanel {
    public static currentPanel: HelpPanel | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private helpEndpoint: HelpEndpoint;

    private constructor(
        panel: vscode.WebviewPanel,
        extensionPath: string
    ) {
        this._panel = panel;
        this.helpEndpoint = new HelpEndpoint(logger, extensionPath);

        // Set initial HTML content
        this._panel.webview.html = this.helpEndpoint.getPortalHTML();

        // Listen for disposal
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    /**
     * Create or reveal the help documentation editor panel.
     */
    public static createOrShow(extensionPath: string): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Reveal existing panel
        if (HelpPanel.currentPanel) {
            HelpPanel.currentPanel._panel.reveal(column);
            return;
        }

        // Create new panel
        const panel = vscode.window.createWebviewPanel(
            'aiccHelpPanel',
            'Help Documentation',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        HelpPanel.currentPanel = new HelpPanel(panel, extensionPath);
    }

    /**
     * Refresh the panel content (e.g., after a version change).
     */
    public refresh(extensionPath: string): void {
        this.helpEndpoint = new HelpEndpoint(logger, extensionPath);
        this._panel.webview.html = this.helpEndpoint.getPortalHTML();
    }

    public dispose(): void {
        HelpPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const d = this._disposables.pop();
            if (d) { d.dispose(); }
        }
    }
}
