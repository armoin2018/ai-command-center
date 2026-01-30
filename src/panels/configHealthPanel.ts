/**
 * Configuration Health Check WebView Panel
 * 
 * Displays configuration health score and recommendations
 */

import * as vscode from 'vscode';
import { ConfigManager } from '../configManager';
import { Logger } from '../logger';
import { RealTimeUpdateSystem } from '../services/realTimeUpdateSystem';

export class ConfigHealthPanel {
    public static currentPanel: ConfigHealthPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private realTimeUpdateSystem?: RealTimeUpdateSystem;

    public static show(
        context: vscode.ExtensionContext,
        configManager: ConfigManager,
        logger: Logger,
        realTimeUpdateSystem?: RealTimeUpdateSystem,
        configPath?: string
    ): void {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConfigHealthPanel.currentPanel) {
            ConfigHealthPanel.currentPanel.panel.reveal(column);
            ConfigHealthPanel.currentPanel.update(configManager);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'aiccConfigHealth',
            'Configuration Health',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        ConfigHealthPanel.currentPanel = new ConfigHealthPanel(
            panel,
            context.extensionUri,
            configManager,
            logger,
            realTimeUpdateSystem,
            configPath
        );
    }

    private constructor(
        panel: vscode.WebviewPanel,
        _extensionUri: vscode.Uri,
        private readonly configManager: ConfigManager,
        _logger: Logger,
        realTimeUpdateSystem?: RealTimeUpdateSystem,
        configPath?: string
    ) {
        this.panel = panel;
        this.update(configManager);

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

        this.panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'refresh':
                        this.update(this.configManager);
                        break;
                    case 'applyRecommendation':
                        await this.applyRecommendation(message.payload);
                        break;
                }
            },
            null,
            this.disposables
        );

        // Start watching config file if real-time update system is available
        if (realTimeUpdateSystem && configPath) {
            this.realTimeUpdateSystem = realTimeUpdateSystem;
            this.realTimeUpdateSystem.startWatching(configPath, this.panel);
        }
    }

    private update(configManager: ConfigManager): void {
        const config = configManager.getConfig();
        const health = configManager.getHealthScore();
        const recommendations = configManager.getRecommendations();

        this.panel.webview.html = this.getHtmlContent(config, health, recommendations);
    }

    private async applyRecommendation(recommendation: any): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('aicc');
            await config.update(
                recommendation.setting,
                recommendation.value,
                vscode.ConfigurationTarget.Global
            );
            vscode.window.showInformationMessage(
                `Applied recommendation: ${recommendation.title}`
            );
            this.update(this.configManager);
        } catch (error) {
            vscode.window.showErrorMessage(
                `Failed to apply recommendation: ${error}`
            );
        }
    }

    private getHtmlContent(_config: any, health: any, recommendations: any[]): string {
        const healthScore = health.score || 0;
        const healthColor = this.getHealthColor(healthScore);
        const healthGrade = this.getHealthGrade(healthScore);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configuration Health</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }

        .header {
            margin-bottom: 30px;
        }

        h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
        }

        .health-score-container {
            display: flex;
            align-items: center;
            gap: 20px;
            margin: 30px 0;
            padding: 20px;
            background-color: var(--vscode-editorWidget-background);
            border-radius: 8px;
            border: 1px solid var(--vscode-panel-border);
        }

        .score-circle {
            position: relative;
            width: 120px;
            height: 120px;
        }

        .score-circle svg {
            transform: rotate(-90deg);
        }

        .score-circle circle {
            fill: none;
            stroke-width: 10;
        }

        .score-bg {
            stroke: var(--vscode-panel-border);
        }

        .score-fill {
            stroke: ${healthColor};
            stroke-linecap: round;
            transition: stroke-dashoffset 1s ease;
        }

        .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 32px;
            font-weight: bold;
        }

        .score-details {
            flex: 1;
        }

        .score-grade {
            font-size: 28px;
            font-weight: bold;
            color: ${healthColor};
            margin-bottom: 8px;
        }

        .score-description {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }

        .section {
            margin: 30px 0;
        }

        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .recommendation-card {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            margin-bottom: 12px;
        }

        .recommendation-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .recommendation-title {
            font-weight: 600;
            font-size: 14px;
        }

        .recommendation-severity {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .severity-high {
            background-color: rgba(255, 100, 100, 0.2);
            color: #ff6464;
        }

        .severity-medium {
            background-color: rgba(255, 200, 100, 0.2);
            color: #ffc864;
        }

        .severity-low {
            background-color: rgba(100, 200, 255, 0.2);
            color: #64c8ff;
        }

        .recommendation-description {
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            margin-bottom: 12px;
        }

        .recommendation-action {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        .refresh-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .refresh-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .code {
            font-family: var(--vscode-editor-font-family);
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
        }

        .empty-state {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }

        .empty-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Configuration Health Check</h1>
        <button class="refresh-button" onclick="refresh()">🔄 Refresh</button>
    </div>

    <div class="health-score-container">
        <div class="score-circle">
            <svg width="120" height="120">
                <circle class="score-bg" cx="60" cy="60" r="50"></circle>
                <circle class="score-fill" cx="60" cy="60" r="50"
                    stroke-dasharray="${Math.PI * 2 * 50}"
                    stroke-dashoffset="${Math.PI * 2 * 50 * (1 - healthScore / 100)}">
                </circle>
            </svg>
            <div class="score-text">${healthScore}</div>
        </div>
        <div class="score-details">
            <div class="score-grade">Grade: ${healthGrade}</div>
            <div class="score-description">${this.getHealthDescription(healthScore)}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">
            📋 Recommendations
            ${recommendations.length > 0 ? `(${recommendations.length})` : ''}
        </div>
        ${recommendations.length > 0 ? recommendations.map(rec => `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <div class="recommendation-title">${rec.title}</div>
                    <span class="recommendation-severity severity-${rec.severity}">
                        ${rec.severity}
                    </span>
                </div>
                <div class="recommendation-description">${rec.description}</div>
                <div class="recommendation-action">
                    <span class="code">${rec.setting}: ${JSON.stringify(rec.currentValue)}</span>
                    <span>→</span>
                    <span class="code">${JSON.stringify(rec.recommendedValue)}</span>
                    <button onclick='applyRecommendation(${JSON.stringify(rec)})'>
                        Apply
                    </button>
                </div>
            </div>
        `).join('') : `
            <div class="empty-state">
                <div class="empty-icon">✅</div>
                <div>No recommendations - your configuration is optimal!</div>
            </div>
        `}
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function refresh() {
            vscode.postMessage({ type: 'refresh' });
        }

        function applyRecommendation(recommendation) {
            vscode.postMessage({
                type: 'applyRecommendation',
                payload: recommendation
            });
        }
    </script>
</body>
</html>`;
    }

    private getHealthColor(score: number): string {
        if (score >= 80) return '#4caf50';
        if (score >= 60) return '#ffc107';
        if (score >= 40) return '#ff9800';
        return '#f44336';
    }

    private getHealthGrade(score: number): string {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    private getHealthDescription(score: number): string {
        if (score >= 80) return 'Your configuration is in excellent shape!';
        if (score >= 60) return 'Your configuration is good with room for improvement.';
        if (score >= 40) return 'Your configuration needs attention.';
        return 'Your configuration has significant issues.';
    }

    public dispose(): void {
        ConfigHealthPanel.currentPanel = undefined;

        // Stop watching config file
        if (this.realTimeUpdateSystem) {
            this.realTimeUpdateSystem.stopWatching();
        }

        this.panel.dispose();
        while (this.disposables.length) {
            const disposable = this.disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
