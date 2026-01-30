/**
 * VS Code commands for configuration management.
 * 
 * Provides interactive commands for viewing, validating, and managing
 * configuration through the VS Code command palette.
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { ConfigManager } from '../configManager';
import { ConfigPresets } from './configPresets';
import { ConfigHealthPanel } from '../panels/configHealthPanel';
import { ConfigBackupService } from './configBackup';
import { RealTimeUpdateSystem } from '../services/realTimeUpdateSystem';
/**
 * Configuration commands manager.
 */
export class ConfigCommands {
    private logger: Logger;
    private configManager: ConfigManager;
    private presets: ConfigPresets;
    private context: vscode.ExtensionContext | undefined;
    private realTimeUpdateSystem: RealTimeUpdateSystem | undefined;

    constructor(logger: Logger, configManager: ConfigManager) {
        this.logger = logger;
        this.configManager = configManager;
        this.presets = new ConfigPresets(logger);
    }

    /**
     * Set the real-time update system for config watching.
     */
    public setRealTimeUpdateSystem(realTimeUpdateSystem: RealTimeUpdateSystem): void {
        this.realTimeUpdateSystem = realTimeUpdateSystem;
    }

    /**
     * Register all configuration commands.
     */
    public register(context: vscode.ExtensionContext): void {
        this.context = context;
        
        context.subscriptions.push(
            vscode.commands.registerCommand('aicc.config.validate', () => this.validateConfig()),
            vscode.commands.registerCommand('aicc.config.showHealth', () => this.showHealthScore()),
            vscode.commands.registerCommand('aicc.config.showHealthUI', () => this.showHealthUI()),
            vscode.commands.registerCommand('aicc.config.applyPreset', () => this.applyPreset()),
            vscode.commands.registerCommand('aicc.config.showRecommendations', () => this.showRecommendations()),
            vscode.commands.registerCommand('aicc.config.exportConfig', () => this.exportConfig()),
            vscode.commands.registerCommand('aicc.config.reload', () => this.reloadConfig()),
            vscode.commands.registerCommand('aicc.config.comparePresets', () => this.comparePresets()),
            vscode.commands.registerCommand('aicc.config.showVersion', () => this.showVersion()),
            vscode.commands.registerCommand('aicc.config.backup', () => this.backupConfig()),
            vscode.commands.registerCommand('aicc.config.restore', () => this.restoreConfig()),
            vscode.commands.registerCommand('aicc.config.showHierarchy', () => this.showHierarchy()),
            vscode.commands.registerCommand('aicc.config.initializeHierarchy', () => this.initializeHierarchy()),
            vscode.commands.registerCommand('aicc.config.editLevel', () => this.editLevel())
        );

        this.logger.info('Configuration commands registered', {
            component: 'ConfigCommands',
            commandCount: 11
        });
    }

    /**
     * Validate current configuration.
     */
    private async validateConfig(): Promise<void> {
        try {
            const result = this.configManager.validate();
            
            if (result.isValid) {
                vscode.window.showInformationMessage('✓ Configuration is valid');
            } else {
                const errorCount = result.errors.length;
                const warningCount = result.warnings.length;
                
                const message = `Configuration validation failed: ${errorCount} error(s), ${warningCount} warning(s)`;
                
                const action = await vscode.window.showErrorMessage(
                    message,
                    'Show Details',
                    'Show Recommendations'
                );

                if (action === 'Show Details') {
                    this.showValidationDetails(result.errors, result.warnings);
                } else if (action === 'Show Recommendations') {
                    this.showRecommendations();
                }
            }

            this.logger.info('Configuration validated', {
                component: 'ConfigCommands',
                isValid: result.isValid,
                errorCount: result.errors.length,
                warningCount: result.warnings.length
            });
        } catch (error) {
            this.logger.error('Failed to validate configuration', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to validate configuration');
        }
    }

    /**
     * Show configuration health score.
     */
    private async showHealthScore(): Promise<void> {
        try {
            const score = this.configManager.getHealthScore();
            
            let icon: string;
            let level: 'info' | 'warning' | 'error';
            
            if (score >= 90) {
                icon = '✓';
                level = 'info';
            } else if (score >= 70) {
                icon = '⚠';
                level = 'warning';
            } else {
                icon = '✗';
                level = 'error';
            }

            const message = `${icon} Configuration Health: ${score}/100`;

            if (level === 'info') {
                const action = await vscode.window.showInformationMessage(
                    message,
                    'Show Recommendations'
                );
                if (action === 'Show Recommendations') {
                    this.showRecommendations();
                }
            } else if (level === 'warning') {
                const action = await vscode.window.showWarningMessage(
                    message,
                    'Show Recommendations',
                    'Validate'
                );
                if (action === 'Show Recommendations') {
                    this.showRecommendations();
                } else if (action === 'Validate') {
                    this.validateConfig();
                }
            } else {
                const action = await vscode.window.showErrorMessage(
                    message,
                    'Show Recommendations',
                    'Validate'
                );
                if (action === 'Show Recommendations') {
                    this.showRecommendations();
                } else if (action === 'Validate') {
                    this.validateConfig();
                }
            }

            this.logger.info('Health score displayed', {
                component: 'ConfigCommands',
                score
            });
        } catch (error) {
            this.logger.error('Failed to get health score', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to calculate health score');
        }
    }

    /**
     * Show health score in UI panel.
     */
    private showHealthUI(): void {
        if (!this.context) {
            vscode.window.showErrorMessage('Extension context not available');
            return;
        }

        try {
            const configPath = this.configManager.getConfigPath();
            ConfigHealthPanel.show(
                this.context,
                this.configManager,
                this.logger,
                this.realTimeUpdateSystem,
                configPath
            );
            this.logger.info('Health UI panel opened', {
                component: 'ConfigCommands'
            });
        } catch (error) {
            this.logger.error('Failed to open health UI', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to open health panel');
        }
    }

    /**
     * Apply a configuration preset.
     */
    private async applyPreset(): Promise<void> {
        try {
            const presets = this.presets.listPresets();
            const items = presets.map(preset => ({
                label: preset.name,
                description: preset.description,
                detail: `${preset.features.length} features`
            }));

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select a configuration preset to apply',
                title: 'Apply Configuration Preset'
            });

            if (!selected) {
                return;
            }

            const presetName = selected.label.toLowerCase() as 'minimal' | 'development' | 'production' | 'enterprise';
            
            const confirm = await vscode.window.showWarningMessage(
                `Apply "${selected.label}" preset? This will update your workspace settings.`,
                { modal: true },
                'Apply',
                'Cancel'
            );

            if (confirm !== 'Apply') {
                return;
            }

            await this.configManager.applyPreset(presetName);
            
            vscode.window.showInformationMessage(`✓ Applied "${selected.label}" preset`);

            this.logger.info('Preset applied', {
                component: 'ConfigCommands',
                preset: presetName
            });
        } catch (error) {
            this.logger.error('Failed to apply preset', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to apply preset');
        }
    }

    /**
     * Show configuration recommendations.
     */
    private async showRecommendations(): Promise<void> {
        try {
            const recommendations = this.configManager.getRecommendations();
            
            if (recommendations.length === 0) {
                vscode.window.showInformationMessage('✓ No recommendations - configuration is optimal');
                return;
            }

            const items = recommendations.map((rec, index) => ({
                label: `${index + 1}. ${rec}`,
                picked: false
            }));

            await vscode.window.showQuickPick(items, {
                placeHolder: `${recommendations.length} recommendation(s) available`,
                title: 'Configuration Recommendations',
                canPickMany: false
            });

            this.logger.info('Recommendations displayed', {
                component: 'ConfigCommands',
                count: recommendations.length
            });
        } catch (error) {
            this.logger.error('Failed to show recommendations', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to get recommendations');
        }
    }

    /**
     * Export current configuration to file.
     */
    private async exportConfig(): Promise<void> {
        try {
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file('aicc-config.json'),
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                },
                title: 'Export Configuration'
            });

            if (!uri) {
                return;
            }

            await this.configManager.saveConfiguration(uri.fsPath);
            
            vscode.window.showInformationMessage(`✓ Configuration exported to ${uri.fsPath}`);

            this.logger.info('Configuration exported', {
                component: 'ConfigCommands',
                path: uri.fsPath
            });
        } catch (error) {
            this.logger.error('Failed to export configuration', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to export configuration');
        }
    }

    /**
     * Reload configuration.
     */
    private async reloadConfig(): Promise<void> {
        try {
            this.configManager.reload();
            
            vscode.window.showInformationMessage('✓ Configuration reloaded');

            this.logger.info('Configuration reloaded', {
                component: 'ConfigCommands'
            });
        } catch (error) {
            this.logger.error('Failed to reload configuration', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to reload configuration');
        }
    }

    /**
     * Compare two configuration presets.
     */
    private async comparePresets(): Promise<void> {
        try {
            const presets = this.presets.listPresets();
            const items = presets.map(preset => ({
                label: preset.name,
                description: preset.description
            }));

            const first = await vscode.window.showQuickPick(items, {
                placeHolder: 'Select first preset to compare',
                title: 'Compare Presets (1/2)'
            });

            if (!first) {
                return;
            }

            const second = await vscode.window.showQuickPick(
                items.filter(item => item.label !== first.label),
                {
                    placeHolder: 'Select second preset to compare',
                    title: 'Compare Presets (2/2)'
                }
            );

            if (!second) {
                return;
            }

            const preset1 = first.label.toLowerCase() as 'minimal' | 'development' | 'production' | 'enterprise';
            const preset2 = second.label.toLowerCase() as 'minimal' | 'development' | 'production' | 'enterprise';

            const comparison = this.presets.comparePresets(preset1, preset2);
            
            this.showPresetDifferences(first.label, second.label, comparison.differences);

            this.logger.info('Presets compared', {
                component: 'ConfigCommands',
                preset1,
                preset2,
                differenceCount: comparison.differences.length
            });
        } catch (error) {
            this.logger.error('Failed to compare presets', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to compare presets');
        }
    }

    /**
     * Show configuration version.
     */
    private async showVersion(): Promise<void> {
        try {
            const history = this.configManager.getVersionHistory();
            const latest = history[history.length - 1];

            const items = history.reverse().map(version => ({
                label: `v${version.version}`,
                description: version.description,
                detail: `Released: ${version.releaseDate}${version.breakingChanges.length > 0 ? ` (${version.breakingChanges.length} breaking changes)` : ''}`
            }));

            await vscode.window.showQuickPick(items, {
                placeHolder: `Current: v${latest.version}`,
                title: 'Configuration Version History'
            });

            this.logger.info('Version history displayed', {
                component: 'ConfigCommands',
                currentVersion: latest.version,
                versionCount: history.length
            });
        } catch (error) {
            this.logger.error('Failed to show version', {
                component: 'ConfigCommands',
                error
            });
            vscode.window.showErrorMessage('Failed to get version information');
        }
    }

    /**
     * Show validation details in output channel.
     */
    private showValidationDetails(errors: string[], warnings: string[]): void {
        const output = vscode.window.createOutputChannel('AICC Configuration Validation');
        output.clear();
        
        if (errors.length > 0) {
            output.appendLine('=== ERRORS ===\n');
            errors.forEach((error, index) => {
                output.appendLine(`${index + 1}. ${error}`);
            });
            output.appendLine('');
        }

        if (warnings.length > 0) {
            output.appendLine('=== WARNINGS ===\n');
            warnings.forEach((warning, index) => {
                output.appendLine(`${index + 1}. ${warning}`);
            });
            output.appendLine('');
        }

        output.show();
    }

    /**
     * Show preset differences in output channel.
     */
    private showPresetDifferences(name1: string, name2: string, differences: any[]): void {
        const output = vscode.window.createOutputChannel('AICC Preset Comparison');
        output.clear();
        
        output.appendLine(`Comparing "${name1}" vs "${name2}"\n`);
        output.appendLine('=== DIFFERENCES ===\n');
        
        differences.forEach((diff, index) => {
            const diffText = typeof diff === 'string' ? diff : `${diff.path}: ${JSON.stringify(diff.value1)} → ${JSON.stringify(diff.value2)}`;
            output.appendLine(`${index + 1}. ${diffText}`);
        });

        output.appendLine(`\nTotal: ${differences.length} difference(s)`);
        
        output.show();
    }

    /**
     * Backup current configuration to file.
     */
    private async backupConfig(): Promise<void> {
        const path = await ConfigBackupService.exportConfig(this.logger);
        if (path) {
            this.logger.info('Configuration backup created', {
                component: 'ConfigCommands',
                path
            });
        }
    }

    /**
     * Restore configuration from backup file.
     */
    private async restoreConfig(): Promise<void> {
        const success = await ConfigBackupService.importConfig(this.logger);
        if (success) {
            this.logger.info('Configuration restored from backup', {
                component: 'ConfigCommands'
            });
            // Inform user to reload if needed
            vscode.window.showInformationMessage('Configuration restored. Reload window for changes to take full effect.');
        }
    }

    /**
     * Show configuration hierarchy diagnostics
     */
    private showHierarchy(): void {
        const diagnostics = this.configManager.getHierarchyDiagnostics();
        
        if (!diagnostics) {
            vscode.window.showInformationMessage('Configuration hierarchy not available. Initialize it first.');
            return;
        }

        const output = vscode.window.createOutputChannel('AICC Config Hierarchy');
        output.clear();
        
        output.appendLine('=== CONFIGURATION HIERARCHY ===\n');
        output.appendLine(`Workspace: ${diagnostics.workspace}`);
        output.appendLine(`Repository: ${diagnostics.repo}\n`);
        
        output.appendLine('=== SOURCES (highest to lowest priority) ===\n');
        diagnostics.sources.forEach((source, index) => {
            const status = source.loaded ? '✓ Loaded' : source.exists ? '⚠ Not loaded' : '✗ Not found';
            output.appendLine(`${index + 1}. ${source.level.toUpperCase()}: ${status}`);
            output.appendLine(`   Path: ${source.path}`);
        });
        
        output.appendLine(`\n=== OVERRIDES (${diagnostics.overrideCount} total) ===\n`);
        diagnostics.topOverrides.forEach((override, index) => {
            output.appendLine(`${index + 1}. ${override.path} (from: ${override.source})`);
        });
        
        if (diagnostics.overrideCount > diagnostics.topOverrides.length) {
            output.appendLine(`\n... and ${diagnostics.overrideCount - diagnostics.topOverrides.length} more`);
        }
        
        output.show();
        
        this.logger.info('Configuration hierarchy displayed', {
            component: 'ConfigCommands'
        });
    }

    /**
     * Initialize configuration hierarchy in workspace
     */
    private async initializeHierarchy(): Promise<void> {
        try {
            await this.configManager.initializeHierarchy();
            vscode.window.showInformationMessage('Configuration hierarchy initialized successfully.');
            
            this.logger.info('Configuration hierarchy initialized', {
                component: 'ConfigCommands'
            });
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize hierarchy: ${error instanceof Error ? error.message : String(error)}`);
            
            this.logger.error('Failed to initialize hierarchy', {
                component: 'ConfigCommands',
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Edit configuration at a specific hierarchy level
     */
    private async editLevel(): Promise<void> {
        const level = await vscode.window.showQuickPick([
            { label: 'My (User/Workspace)', value: 'my' },
            { label: 'Project', value: 'project' },
            { label: 'GitHub (Repository)', value: 'github' },
            { label: 'Global (AI-Ley)', value: 'global' }
        ], {
            placeHolder: 'Select configuration level to edit'
        });

        if (!level) {
            return;
        }

        const sources = this.configManager.getConfigSources();
        const source = sources.find(s => s.level === level.value);
        
        if (!source) {
            vscode.window.showErrorMessage('Configuration source not found');
            return;
        }

        // Open file for editing (create if doesn't exist)
        const uri = vscode.Uri.file(source.path);
        
        if (!source.exists) {
            // Create directory if needed
            const fs = require('fs');
            const path = require('path');
            const dir = path.dirname(source.path);
            await fs.promises.mkdir(dir, { recursive: true });
            
            // Create empty config file
            await fs.promises.writeFile(source.path, '# Configuration for ' + level.label + '\n', 'utf-8');
        }

        // Open in editor
        const document = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(document);

        this.logger.info('Configuration level opened for editing', {
            component: 'ConfigCommands',
            level: level.value,
            path: source.path
        });
    }
}
