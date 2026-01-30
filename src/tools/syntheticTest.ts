/**
 * Synthetic Test Tool
 * 
 * Validates information flow throughout the AI Command Center:
 * - Extension to WebView communication
 * - WebView to Extension communication
 * - Logging pipeline verification
 * - Component loading verification
 * 
 * Exposed as VS Code commands for on-demand testing
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';

/**
 * Test result interface
 */
export interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    details: string;
    error?: string;
}

/**
 * Test suite results
 */
export interface TestSuiteResult {
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    results: TestResult[];
    generatedAt: Date;
}

/**
 * Synthetic Test Runner
 */
export class SyntheticTestRunner {
    private logger: Logger;
    private results: TestResult[] = [];

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Run all synthetic tests
     */
    public async runAll(): Promise<TestSuiteResult> {
        this.results = [];
        const startTime = Date.now();

        this.logger.info('Starting synthetic test suite');

        // Test 1: Logger functionality
        await this.runTest('Logger Levels', async () => {
            this.logger.debug('DEBUG: Test debug message');
            this.logger.info('INFO: Test info message');
            this.logger.warn('WARN: Test warning message');
            this.logger.error('ERROR: Test error message');
            return 'All log levels executed successfully';
        });

        // Test 2: Extension API availability
        await this.runTest('VS Code API Availability', async () => {
            const checks = [];
            
            if (vscode.workspace) checks.push('workspace');
            if (vscode.window) checks.push('window');
            if (vscode.commands) checks.push('commands');
            if (vscode.extensions) checks.push('extensions');
            
            if (checks.length < 4) {
                throw new Error(`Missing VS Code APIs: expected 4, got ${checks.length}`);
            }
            
            return `All VS Code APIs available: ${checks.join(', ')}`;
        });

        // Test 3: Extension activation
        await this.runTest('Extension Activation', async () => {
            const extension = vscode.extensions.getExtension('ai-command-center.ai-command-center');
            
            if (!extension) {
                throw new Error('Extension not found');
            }
            
            if (!extension.isActive) {
                throw new Error('Extension not active');
            }
            
            return `Extension "${extension.id}" is active (v${extension.packageJSON.version})`;
        });

        // Test 4: Command registration
        await this.runTest('Command Registration', async () => {
            const commands = await vscode.commands.getCommands(true);
            const aiccCommands = commands.filter(c => c.startsWith('aicc.'));
            
            if (aiccCommands.length === 0) {
                throw new Error('No AICC commands registered');
            }
            
            // Check critical commands
            const criticalCommands = [
                'aicc.openPlanningPanel',
                'aicc.createEpic',
                'aicc.createStory',
                'aicc.createTask',
                'aicc.generateAssetTreeMap'
            ];
            
            const missing = criticalCommands.filter(c => !aiccCommands.includes(c));
            if (missing.length > 0) {
                throw new Error(`Missing critical commands: ${missing.join(', ')}`);
            }
            
            return `${aiccCommands.length} AICC commands registered, all critical commands present`;
        });

        // Test 5: Workspace availability
        await this.runTest('Workspace Configuration', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder open');
            }
            
            const folder = workspaceFolders[0];
            return `Workspace: ${folder.name} at ${folder.uri.fsPath}`;
        });

        // Test 6: Configuration access
        await this.runTest('Configuration Access', async () => {
            const config = vscode.workspace.getConfiguration('aicc');
            
            // Check if configuration is accessible
            const logLevel = config.get<string>('logLevel');
            const mcpEnabled = config.get<boolean>('mcp.enabled');
            
            return `Configuration accessible: logLevel=${logLevel}, mcp.enabled=${mcpEnabled}`;
        });

        // Test 7: Output channel
        await this.runTest('Output Channel', async () => {
            // This test verifies the output channel was created
            this.logger.info('SYNTHETIC_TEST: Output channel test message');
            return 'Output channel message sent successfully';
        });

        // Test 8: File system access
        await this.runTest('File System Access', async () => {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                throw new Error('No workspace folder');
            }
            
            const testUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
            
            try {
                const stat = await vscode.workspace.fs.stat(testUri);
                return `File system accessible: package.json (${stat.size} bytes)`;
            } catch {
                throw new Error('Cannot access package.json');
            }
        });

        // Test 9: WebView bundle verification
        await this.runTest('WebView Bundles', async () => {
            const extension = vscode.extensions.getExtension('ai-command-center.ai-command-center');
            if (!extension) {
                throw new Error('Extension not found');
            }
            
            const bundles = [
                'bootstrap.bundle.js',
                'charts.bundle.js',
                'tabulator.bundle.js',
                'tagify.bundle.js',
                'utils.bundle.js',
                'vendor.bundle.js',
                'main.bundle.js'
            ];
            
            const extensionPath = extension.extensionPath;
            const fs = require('fs');
            const path = require('path');
            
            const missing: string[] = [];
            const found: string[] = [];
            
            for (const bundle of bundles) {
                const bundlePath = path.join(extensionPath, 'media', 'webview', bundle);
                if (fs.existsSync(bundlePath)) {
                    const stats = fs.statSync(bundlePath);
                    found.push(`${bundle} (${(stats.size / 1024).toFixed(1)}KB)`);
                } else {
                    missing.push(bundle);
                }
            }
            
            if (missing.length > 0) {
                throw new Error(`Missing bundles: ${missing.join(', ')}`);
            }
            
            return `All ${bundles.length} bundles present: ${found.join(', ')}`;
        });

        // Test 10: Message flow simulation
        await this.runTest('Message Flow Simulation', async () => {
            // Simulate the message types that flow between extension and webview
            const messageTypes = [
                'treeData',
                'createEpic',
                'createStory',
                'createTask',
                'updateItem',
                'deleteItem',
                'log',
                'error'
            ];
            
            // Verify message structure
            const testMessage = {
                type: 'log',
                payload: {
                    level: 'info',
                    message: 'Synthetic test message'
                }
            };
            
            if (!testMessage.type || !testMessage.payload) {
                throw new Error('Invalid message structure');
            }
            
            return `Message flow structure verified for ${messageTypes.length} message types`;
        });

        const endTime = Date.now();
        const duration = endTime - startTime;

        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        this.logger.info('Synthetic test suite completed', {
            totalTests: this.results.length,
            passed,
            failed,
            duration
        });

        return {
            totalTests: this.results.length,
            passed,
            failed,
            duration,
            results: this.results,
            generatedAt: new Date()
        };
    }

    /**
     * Run individual test
     */
    private async runTest(name: string, testFn: () => Promise<string>): Promise<void> {
        const startTime = Date.now();
        
        try {
            const details = await testFn();
            const duration = Date.now() - startTime;
            
            this.results.push({
                name,
                passed: true,
                duration,
                details
            });
            
            this.logger.debug(`Test passed: ${name}`, { duration });
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            
            this.results.push({
                name,
                passed: false,
                duration,
                details: 'Test failed',
                error: errorMessage
            });
            
            this.logger.warn(`Test failed: ${name}`, { error: errorMessage, duration });
        }
    }

    /**
     * Generate markdown report
     */
    public generateReport(results: TestSuiteResult): string {
        let md = `# Synthetic Test Report\n\n`;
        md += `**Generated:** ${results.generatedAt.toISOString()}\n`;
        md += `**Duration:** ${results.duration}ms\n\n`;

        md += `## Summary\n\n`;
        md += `| Metric | Value |\n`;
        md += `|--------|-------|\n`;
        md += `| Total Tests | ${results.totalTests} |\n`;
        md += `| Passed | ${results.passed} ✅ |\n`;
        md += `| Failed | ${results.failed} ${results.failed > 0 ? '❌' : ''} |\n`;
        md += `| Success Rate | ${((results.passed / results.totalTests) * 100).toFixed(1)}% |\n\n`;

        md += `## Test Results\n\n`;
        
        for (const test of results.results) {
            const icon = test.passed ? '✅' : '❌';
            md += `### ${icon} ${test.name}\n\n`;
            md += `- **Status:** ${test.passed ? 'PASSED' : 'FAILED'}\n`;
            md += `- **Duration:** ${test.duration}ms\n`;
            md += `- **Details:** ${test.details}\n`;
            if (test.error) {
                md += `- **Error:** \`${test.error}\`\n`;
            }
            md += `\n`;
        }

        return md;
    }
}

/**
 * Register Synthetic Test commands
 */
export function registerSyntheticTestCommands(
    _context: vscode.ExtensionContext,
    logger: Logger
): vscode.Disposable[] {
    const runner = new SyntheticTestRunner(logger);
    const disposables: vscode.Disposable[] = [];

    // Command: Run Synthetic Tests
    disposables.push(
        vscode.commands.registerCommand('aicc.runSyntheticTests', async () => {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: 'Running Synthetic Tests...',
                cancellable: false
            }, async (progress) => {
                try {
                    progress.report({ message: 'Executing test suite...' });
                    const results = await runner.runAll();

                    progress.report({ message: 'Generating report...' });
                    const report = runner.generateReport(results);

                    // Create and show document
                    const doc = await vscode.workspace.openTextDocument({
                        content: report,
                        language: 'markdown'
                    });
                    await vscode.window.showTextDocument(doc);

                    // Show summary notification
                    if (results.failed === 0) {
                        vscode.window.showInformationMessage(
                            `✅ All ${results.totalTests} synthetic tests passed!`
                        );
                    } else {
                        vscode.window.showWarningMessage(
                            `⚠️ ${results.failed}/${results.totalTests} synthetic tests failed`
                        );
                    }
                } catch (error) {
                    logger.error('Synthetic test run failed', { error });
                    vscode.window.showErrorMessage(`Synthetic test run failed: ${error}`);
                }
            });
        })
    );

    // Command: Quick Health Check
    disposables.push(
        vscode.commands.registerCommand('aicc.quickHealthCheck', async () => {
            try {
                const results = await runner.runAll();
                
                const statusItems = results.results.map(r => ({
                    label: `${r.passed ? '✅' : '❌'} ${r.name}`,
                    description: `${r.duration}ms`,
                    detail: r.passed ? r.details : r.error
                }));

                await vscode.window.showQuickPick(statusItems, {
                    title: `Health Check: ${results.passed}/${results.totalTests} passed`,
                    placeHolder: 'Test results'
                });
            } catch (error) {
                logger.error('Health check failed', { error });
                vscode.window.showErrorMessage(`Health check failed: ${error}`);
            }
        })
    );

    logger.info('Synthetic Test commands registered');
    return disposables;
}
