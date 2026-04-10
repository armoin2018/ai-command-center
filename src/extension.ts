import * as vscode from 'vscode';
import * as path from 'path';
import { COMMAND_IDS } from './commands/commandIds';
import { PerformanceTracker } from './utils/performanceTracker';
import { Logger } from './logger';
import { ErrorHandler } from './errorHandler';
import { ConfigManager } from './configManager';
import { ConfigCommands } from './config/configCommands';
import { ConfigWatcher } from './config/configWatcher';
import { PlanningCommands } from './planning/planningCommands';
import { PlanningManager } from './planning/planningManager';
import { WorkspaceManager } from './planning/workspaceManager';
import { MainPanel } from './panels/mainPanel';
import { HistoryPanel } from './panels/historyPanel';
import { PlanningTreeViewProvider } from './views/planningTreeView';
import { MCPManager } from './mcp/mcpManager';
import { JiraIntegrationManager } from './integrations/jira/jiraIntegrationManager';
import { JiraCommands } from './integrations/jira/jiraCommands';
import { AgentDetector } from './agentDetector';
import { ChatParticipantManager } from './chatParticipant';
import { AIKitManager } from './aiKitManager';
import { IntakeManager } from './intakeManager';
import { KitBootstrapService } from './services/kitBootstrap';
import { RealTimeUpdateSystem } from './services/realTimeUpdateSystem';
import { VersionOverrideSystem } from './services/versionOverrideSystem';
import { WorkspaceIdentityDetector } from './services/workspaceIdentity';


// Activation modules — extracted command registration
import { registerMcpCommands, registerInstructionSourceCommands } from './activation/mcpRegistration';
import {
    registerInitToolsetCommands,
    registerFileProtectionCommands,
    registerUndoManagerCommands,
    registerMermaidCommands,
    registerDiagramConverterCommands
} from './activation/toolsRegistration';
import { registerSecondaryPanelCommands, registerSearchAndToolCommands } from './activation/panelRegistration';
import { registerArchivalCommands, registerSprintServices } from './activation/archivalRegistration';
import * as fs from 'fs';
// Extension lifecycle tracking
let extensionActivated = false;
let disposables: vscode.Disposable[] = [];
let logger: Logger;
let configWatcher: ConfigWatcher;
let mcpManager: MCPManager | undefined;
let jiraManager: JiraIntegrationManager | undefined;
let agentDetector: AgentDetector | undefined;
let chatParticipantManager: ChatParticipantManager | undefined;
let aiKitManager: AIKitManager | undefined;
let intakeManager: IntakeManager | undefined;
let realTimeUpdateSystem: RealTimeUpdateSystem | undefined;
let versionOverrideSystem: VersionOverrideSystem | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Update status bar with active instruction set info
 */
function updateStatusBar(): void {
    if (!statusBarItem || !versionOverrideSystem) return;
    
    const mergedSet = versionOverrideSystem.getMergedInstructions();
    const sources = versionOverrideSystem.listSources();
    const activeSources = sources.filter(s => s.enabled).length;
    
    if (mergedSet && mergedSet.files.length > 0) {
        statusBarItem.text = `$(file-code) ${mergedSet.files.length} instructions`;
        statusBarItem.tooltip = `Active instruction sources: ${activeSources}\nClick to manage sources`;
    } else {
        statusBarItem.text = `$(file-code) No instructions`;
        statusBarItem.tooltip = 'No active instruction sources\nClick to add sources';
    }
}

/**
 * Silently ensure required workspace directories exist.
 * Creates `.project` and `.my` directory trees if missing;
 * suppresses errors if they already exist.
 */
function ensureWorkspaceDirectories(workspaceRoot: string, log: Logger): void {
    const dirs = [
        path.join(workspaceRoot, '.project'),
        path.join(workspaceRoot, '.project', 'plan'),
        path.join(workspaceRoot, '.project', 'plan', 'epics'),
        path.join(workspaceRoot, '.project', 'plan', 'sprints'),
        path.join(workspaceRoot, '.project', 'plan', 'templates'),
        path.join(workspaceRoot, '.project', 'config'),
        path.join(workspaceRoot, '.my'),
        path.join(workspaceRoot, '.my', 'aicc'),
        path.join(workspaceRoot, '.my', 'aicc', 'catalog'),
    ];

    for (const dir of dirs) {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                log.info('Created workspace directory', { dir });
            }
        } catch {
            // Suppress — directory may have been created by another process
        }
    }
}

/**
 * Ensure the workspace `.gitignore` has the required entries.
 *
 * Always present  : `.my/`, `.env`, `.env.local`
 * Conditionally present: `.github/` — added by default, BUT removed when
 *   `.my/plugin.lock` exists (plugin-development mode is active).
 */
function ensureGitignoreEntries(workspaceRoot: string, log: Logger): void {
    const gitignorePath = path.join(workspaceRoot, '.gitignore');
    const pluginLockPath = path.join(workspaceRoot, '.my', 'plugin.lock');
    const isPluginDev = fs.existsSync(pluginLockPath);

    const alwaysIgnored = ['.my/', '.env', '.env.local'];
    const conditionallyIgnored = ['.github/'];

    let lines: string[] = [];
    try {
        if (fs.existsSync(gitignorePath)) {
            lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
        }
    } catch {
        // start with an empty file
    }

    let changed = false;

    // Ensure always-present entries
    for (const entry of alwaysIgnored) {
        const bare = entry.replace(/\/$/, '');
        if (!lines.some(l => l.trim() === entry || l.trim() === bare)) {
            lines.push(entry);
            changed = true;
        }
    }

    if (isPluginDev) {
        // Plugin-dev active: remove .github from gitignore so it's tracked
        const before = lines.length;
        lines = lines.filter(l => !l.trim().match(/^\.github\/?$/));
        if (lines.length !== before) {
            changed = true;
        }
    } else {
        // Normal mode: ensure .github is ignored
        for (const entry of conditionallyIgnored) {
            const bare = entry.replace(/\/$/, '');
            if (!lines.some(l => l.trim() === entry || l.trim() === bare)) {
                lines.push(entry);
                changed = true;
            }
        }
    }

    if (changed) {
        try {
            fs.writeFileSync(gitignorePath, lines.join('\n'), 'utf8');
            log.info('Updated .gitignore', { isPluginDev });
        } catch (e) {
            log.warn('Failed to update .gitignore', { error: String(e) });
        }
    }
}

/**
 * Extension activation function called by VS Code on startup.
 * Initializes all extension modules and registers commands/views.
 * 
 * @param context - VS Code extension context with subscriptions and state
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const tracker = new PerformanceTracker('AI Command Center Activation');

    try {
        // Initialize logger with extension log directory
        const logLevel = vscode.workspace.getConfiguration('aicc').get('logLevel', 'info') as string;
        logger = Logger.getInstance(context.logUri?.fsPath, logLevel);
        logger.info('AI Command Center: Starting activation...');

        // Initialize error handler
        ErrorHandler.initialize(logger);
        
        // Initialize configuration manager
        const configManager = ConfigManager.getInstance(context.extensionPath, logger);
        configManager.getConfig(); // Load configuration
        tracker.markPhase('Configuration initialization');

        // Initialize configuration commands
        const configCommands = new ConfigCommands(logger, configManager);
        configCommands.register(context);
        tracker.markPhase('Configuration commands registration');

        // Initialize configuration watcher
        configWatcher = new ConfigWatcher(logger, configManager);
        configWatcher.start(context.extensionPath);
        disposables.push(configWatcher);
        tracker.markPhase('Configuration watcher initialization');

        // Initialize planning manager
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || context.extensionPath;
        const advancedMode = vscode.workspace.getConfiguration('aicc').get<boolean>('advancedMode', false);

        // ── Pre-flight: silently ensure .project and .my directories exist ──
        ensureWorkspaceDirectories(workspaceRoot, logger);
        // ── Ensure .gitignore has required entries (plugin.lock-aware) ──
        ensureGitignoreEntries(workspaceRoot, logger);
        tracker.markPhase('Workspace directory pre-flight');

        // --- Version detection & "What's New" notification (AICC-0204 / AICC-0206) ---
        const currentVersion: string = context.extension.packageJSON.version;
        const lastSeenVersion = context.globalState.get<string>('aicc.lastSeenVersion');
        const versionDismissed = context.globalState.get<boolean>('aicc.versionDismissed', false);

        if (lastSeenVersion !== currentVersion) {
            // Version changed — reset dismissed flag
            await context.globalState.update('aicc.versionDismissed', false);

            const choice = await vscode.window.showInformationMessage(
                `AI Command Center updated to v${currentVersion}`,
                "What's New",
                'Dismiss'
            );

            if (choice === "What's New") {
                // Open WHATS_NEW.md in markdown preview
                const whatsNewUri = vscode.Uri.file(path.join(context.extensionPath, 'docs', 'WHATS_NEW.md'));
                try {
                    await vscode.workspace.openTextDocument(whatsNewUri);
                    await vscode.commands.executeCommand('markdown.showPreview', whatsNewUri);
                } catch {
                    // Fallback: try workspace copy
                    const wsUri = vscode.Uri.file(path.join(workspaceRoot, 'docs', 'WHATS_NEW.md'));
                    try {
                        await vscode.workspace.openTextDocument(wsUri);
                        await vscode.commands.executeCommand('markdown.showPreview', wsUri);
                    } catch {
                        logger.warn('WHATS_NEW.md not found in extension or workspace');
                    }
                }
            } else if (choice === 'Dismiss') {
                await context.globalState.update('aicc.versionDismissed', true);
            }

            // Persist version tracking state
            await context.globalState.update('aicc.lastSeenVersion', currentVersion);
            await context.globalState.update('aicc.lastOpenedTimestamp', new Date().toISOString());
        } else if (!versionDismissed) {
            // Same version, not dismissed — update timestamp only
            await context.globalState.update('aicc.lastOpenedTimestamp', new Date().toISOString());
        }
        tracker.markPhase('Version detection');

        const planningManager = new PlanningManager(workspaceRoot, logger);
        await planningManager.initialize();
        tracker.markPhase('Planning manager initialization');

        // Initialize planning commands
        const planningCommands = new PlanningCommands(planningManager, logger);
        planningCommands.register(context);
        tracker.markPhase('Planning commands registration');

        // Register planning tree view in sidebar (advanced mode only)
        if (advancedMode) {
            const planningTreeView = new PlanningTreeViewProvider(planningManager, logger);
            const treeView = vscode.window.createTreeView('aicc.planningTreeView', {
                treeDataProvider: planningTreeView,
                showCollapseAll: true
            });
            context.subscriptions.push(treeView);
            
            // Register planning tree context menu commands
            const { registerPlanningTreeCommands } = await import('./views/planningTreeCommands');
            const treeCommandDisposables = registerPlanningTreeCommands(context, {
                planningManager,
                logger,
                treeViewProvider: planningTreeView
            });
            context.subscriptions.push(...treeCommandDisposables);
            
            // Refresh tree view when planning changes
            planningManager.startFileWatching();
            
            // Add refresh command (guard against duplicate registration)
            let refreshTreeCommand: vscode.Disposable | undefined;
            try {
                refreshTreeCommand = vscode.commands.registerCommand('aicc.refreshTreeView', () => {
                    planningTreeView.refresh();
                });
                context.subscriptions.push(refreshTreeCommand);
            } catch (error) {
                // Command already registered, just log and continue
                logger.warn('Command aicc.refreshTreeView already registered, skipping');
            }
        }
        tracker.markPhase('Planning tree view registration');

        // Initialize Panel Loader and Plan Generator services
        const { PanelLoaderService } = await import('./services/panelLoader');
        const { TabLoaderService } = await import('./services/tabLoader');
        const { IntakeLoaderService } = await import('./services/intakeLoader');
        const { PlanGenerator } = await import('./services/planGenerator');
        
        const panelLoader = PanelLoaderService.getInstance();
        await panelLoader.initialize(workspaceRoot);
        disposables.push({ dispose: () => panelLoader.dispose() });
        
        const tabLoader = TabLoaderService.getInstance();
        await tabLoader.initialize(workspaceRoot);
        disposables.push({ dispose: () => tabLoader.dispose() });
        
        const intakeLoader = IntakeLoaderService.getInstance();
        await intakeLoader.initialize(workspaceRoot);
        disposables.push({ dispose: () => intakeLoader.dispose() });
        
        const planGenerator = PlanGenerator.getInstance();
        await planGenerator.initialize(workspaceRoot);
        disposables.push({ dispose: () => planGenerator.dispose() });
        tracker.markPhase('Panel services initialization');

        // Register Secondary Panel WebView in the panel area
        const { SecondaryPanelProvider } = await import('./views/secondaryPanelProvider');
        const secondaryPanelProvider = new SecondaryPanelProvider(context.extensionUri, context);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                SecondaryPanelProvider.viewId,
                secondaryPanelProvider,
                { webviewOptions: { retainContextWhenHidden: true } }
            )
        );
        tracker.markPhase('Secondary panel registration');

        // Initialize Scheduler Engine (AICC-0079 / AICC-0080)
        const { SchedulerEngine } = await import('./scheduler');
        const schedulerEngine = SchedulerEngine.getInstance();
        schedulerEngine.initialize(workspaceRoot);
        disposables.push({ dispose: () => schedulerEngine.dispose() });
        tracker.markPhase('Scheduler engine initialization');

        // Advanced mode indicator (AICC-0177) — REQ-SBAR-002: Removed from status bar
        // const modeStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
        // modeStatusBar.text = advancedMode ? '$(layers) AICC: Advanced' : '$(layers) AICC: Standard';
        // modeStatusBar.show();
        // context.subscriptions.push(modeStatusBar);

        // Register main panel command (advanced mode only)
        if (advancedMode) {
            let openPanelCommand: vscode.Disposable | undefined;
            try {
                openPanelCommand = vscode.commands.registerCommand('aicc.openPlanningPanel', () => {
                    const configPath = configManager.getConfigPath();
                    MainPanel.render(
                        context.extensionUri,
                        logger,
                        planningManager,
                        realTimeUpdateSystem,
                        configPath
                    );
                });
                context.subscriptions.push(openPanelCommand);
            } catch (error) {
                // Command already registered, just log and continue
                logger.warn('Command aicc.openPlanningPanel already registered, skipping');
            }
        }
        tracker.markPhase('Main panel registration');

        // Register history panel command (advanced mode only)
        if (advancedMode) {
            let historyPanelCommand: vscode.Disposable | undefined;
            try {
                historyPanelCommand = vscode.commands.registerCommand('aicc.showItemHistory', async () => {
                    const itemId = await vscode.window.showInputBox({
                        prompt: 'Enter item ID to view history',
                        placeHolder: 'epic-001, story-001, task-001',
                        validateInput: (value) => {
                            if (!value) {
                                return 'Item ID is required';
                            }
                            const pattern = /^(epic|story|task)-\d{3}$/;
                            if (!pattern.test(value)) {
                                return 'Invalid format. Use: epic-001, story-001, or task-001';
                            }
                            return null;
                        }
                    });
                    
                    if (itemId) {
                        HistoryPanel.show(context, planningManager, logger, itemId);
                    }
                });
                context.subscriptions.push(historyPanelCommand);
            } catch (error) {
                logger.warn('Command aicc.showItemHistory already registered, skipping');
            }
        }
        tracker.markPhase('History panel registration');

        // Initialize MCP server
        mcpManager = new MCPManager(planningManager, logger, context.extensionPath, context.globalStoragePath, currentVersion);
        await mcpManager.initialize();
        disposables.push(mcpManager);

        // Wire MCP manager into secondary panel (AICC-0085)
        secondaryPanelProvider.setMcpManager(mcpManager);
        
        // Show MCP server status
        const mcpConfig = vscode.workspace.getConfiguration('aicc.mcp');
        if (mcpConfig.get<boolean>('enabled', true)) {
            const transport = mcpConfig.get<string>('transport', 'stdio');
            const port = mcpConfig.get<number>('port', 3000);
            const host = mcpConfig.get<string>('host', 'localhost');
            
            let statusMessage = 'MCP Server ready';
            if (transport === 'http') {
                statusMessage = `MCP Server running at http://${host}:${port}`;
            } else if (transport === 'https') {
                statusMessage = `MCP Server running at https://${host}:${port}`;
            } else if (transport === 'websocket') {
                statusMessage = `MCP Server running at ws://${host}:${port}`;
            } else if (transport === 'stdio') {
                statusMessage = 'MCP Server ready (stdio mode for Claude Desktop)';
            }
            
            logger.info(statusMessage, { transport, port: transport !== 'stdio' ? port : undefined, host: transport !== 'stdio' ? host : undefined });
            
            // Show quick setup notification on first install
            const hasShownMCPWelcome = context.globalState.get<boolean>('aicc.mcpWelcomeShown', false);
            if (!hasShownMCPWelcome) {
                const choice = await vscode.window.showInformationMessage(
                    statusMessage + '. Export MCP configuration to connect AI agents and clients.',
                    'Export Configuration',
                    'Later'
                );
                
                if (choice === 'Export Configuration') {
                    vscode.commands.executeCommand(COMMAND_IDS.MCP_EXPORT_CONFIG);
                }
                
                await context.globalState.update('aicc.mcpWelcomeShown', true);
            }
        } else {
            logger.info('MCP Server disabled in settings');
        }
        
        tracker.markPhase('MCP server initialization');

        // Initialize Jira integration
        const workspaceManager = new WorkspaceManager(workspaceRoot, logger);
        jiraManager = JiraIntegrationManager.getInstance(configManager, planningManager, workspaceManager);
        const jiraInitialized = await jiraManager.initialize();
        if (jiraInitialized) {
            logger.info('Jira integration initialized successfully');
        }
        tracker.markPhase('Jira integration initialization');

        // Register Jira commands
        const jiraCommands = new JiraCommands(jiraManager);
        jiraCommands.registerCommands(context);
        tracker.markPhase('Jira commands registration');

        // Initialize Agent Detector (Section 4.1)
        agentDetector = new AgentDetector({
            pollingInterval: 30000,
            enableAutoDetection: true,
            watchedExtensions: ['GitHub.copilot-chat']
        });
        disposables.push(agentDetector);
        
        // Log agent status changes
        agentDetector.onChange(agents => {
            logger.info('Agent status changed', {
                agents: agents.map(a => ({ id: a.id, name: a.name, isActive: a.isActive }))
            });
        });
        tracker.markPhase('Agent detector initialization');

        // Initialize Chat Participant Manager (Section 4.2)
        chatParticipantManager = new ChatParticipantManager(agentDetector, {
            participantId: 'aicc.agent',
            agentsDirectory: '.github/agents',
            enableStreaming: true
        });
        await chatParticipantManager.initialize(context);
        disposables.push(chatParticipantManager);
        tracker.markPhase('Chat participant initialization');

        // Initialize AI Kit Manager (Section 3.1)
        aiKitManager = new AIKitManager(context, {
            cacheDirectory: 'cache',
            defaultBranch: 'main',
            enableAutoUpdate: false
        });
        disposables.push(aiKitManager);
        tracker.markPhase('AI Kit manager initialization');

        // ── Kit Bootstrap: first-load catalog copy, repo clone/fetch, and kit install ──
        try {
            const kitBootstrap = new KitBootstrapService(workspaceRoot);
            // Run bootstrap in background with progress notification
            vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Window,
                    title: 'AI Kit Bootstrap'
                },
                async (progress) => {
                    const results = await kitBootstrap.bootstrapAllKits(progress);
                    for (const r of results) {
                        if (r.errors.length > 0) {
                            logger.warn('Kit bootstrap had errors', { kit: r.kitName, errors: r.errors });
                        } else {
                            logger.info('Kit bootstrapped', {
                                kit: r.kitName,
                                catalogCopied: r.catalogCopied,
                                repoCloned: r.repoCloned,
                                repoUpdated: r.repoUpdated,
                                filesInstalled: r.filesInstalled
                            });
                        }
                    }
                }
            );
        } catch (err) {
            logger.warn('Kit bootstrap failed', { error: err instanceof Error ? err.message : String(err) });
        }
        tracker.markPhase('Kit bootstrap');

        // AI Kit Auto-Load (AICC-0098 / AICC-0274)
        const aiKitAutoLoadConfig = vscode.workspace.getConfiguration('aicc.aiKit.autoLoad');
        const autoLoadEnabled = aiKitAutoLoadConfig.get<boolean>('enabled', false);
        const autoLoadOnActivation = aiKitAutoLoadConfig.get<boolean>('onActivation', true);
        const autoLoadDefaultKits = aiKitAutoLoadConfig.get<string[]>('defaultKits', []);

        aiKitManager.configureAutoLoad({
            enabled: autoLoadEnabled,
            defaultKits: autoLoadDefaultKits,
            onActivation: autoLoadOnActivation
        });

        if (autoLoadEnabled && autoLoadOnActivation) {
            // Check workspace preference — skip if user chose "Always" dismiss
            const alwaysDismissed = vscode.workspace.getConfiguration('aicc.aiKit.autoLoad')
                .get<boolean>('alwaysDismissed', false);

            if (!alwaysDismissed) {
                try {
                    const identityDetector = new WorkspaceIdentityDetector();
                    const identity = await identityDetector.detectWorkspaceIdentity(workspaceRoot);

                    if (identity.language !== 'unknown') {
                        const recommended = aiKitManager.getRecommendedKits(identity);

                        if (recommended.length > 0) {
                            const label = identity.framework
                                ? `${identity.language}/${identity.framework}`
                                : identity.language;
                            const kitList = recommended.slice(0, 3).join(', ');

                            const choice = await vscode.window.showInformationMessage(
                                `AI Kit: Detected ${label} workspace. Install recommended kit '${kitList}'?`,
                                'Yes',
                                'No',
                                'Always Dismiss'
                            );

                            if (choice === 'Yes') {
                                logger.info('User accepted AI Kit recommendation', { kits: recommended });
                                // Kits would be installed via the AI Kit Loader catalog flow
                            } else if (choice === 'Always Dismiss') {
                                await vscode.workspace.getConfiguration('aicc.aiKit.autoLoad')
                                    .update('alwaysDismissed', true, vscode.ConfigurationTarget.Workspace);
                                logger.info('User chose to always dismiss AI Kit recommendations');
                            }
                        }
                    }
                } catch (error) {
                    logger.warn('AI Kit auto-load detection failed', {
                        error: error instanceof Error ? error.message : String(error)
                    });
                }
            }
        }
        tracker.markPhase('AI Kit auto-load');

        // Initialize Intake Manager (Section 6.1)
        intakeManager = new IntakeManager({
            intakesDirectory: '.github/aicc/intakes',
            dataDirectory: '.project',
            enableAutoReload: true
        });
        await intakeManager.initialize();
        disposables.push(intakeManager);
        tracker.markPhase('Intake manager initialization');

        // Initialize Real-Time Update System (Section 25.4)
        realTimeUpdateSystem = new RealTimeUpdateSystem(context);
        // Config file watching will be started when panels are opened
        disposables.push({
            dispose: () => realTimeUpdateSystem?.stopWatching()
        });
        tracker.markPhase('Real-time update system initialization');

        // Set real-time update system for config commands
        configCommands.setRealTimeUpdateSystem(realTimeUpdateSystem);

        // Initialize Version Override System (Section 25.5)
        versionOverrideSystem = new VersionOverrideSystem(workspaceManager, logger, {
            configPath: path.join(workspaceRoot, '.project/config/instruction-sources.json')
        });
        await versionOverrideSystem.initialize();
        disposables.push(versionOverrideSystem);
        tracker.markPhase('Version override system initialization');

        // Initialize VSIX Version Upgrade Checker (REQ-VUPG-001)
        const { VersionUpgradeChecker } = await import('./services/versionUpgradeChecker');
        const upgradeChecker = new VersionUpgradeChecker(workspaceRoot);
        upgradeChecker.start();
        await upgradeChecker.checkForUpgrade();
        disposables.push(upgradeChecker);
        tracker.markPhase('VSIX version upgrade checker');

        // AICC-0512: Instruction count status bar removed
        // AICC-0513: Keep statusBarItem for internal use but don't show it
        statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        statusBarItem.command = 'aicc.showInstructionSources';
        updateStatusBar();
        // statusBarItem.show(); // REQ-SBAR-001: Removed from status bar
        disposables.push(statusBarItem);
        
        // Create MCP status bar item (AICC-0514: Renamed to AICC: MCP)
        const mcpStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
        const mcpConfiguration = vscode.workspace.getConfiguration('aicc.mcp');
        const mcpEnabled = mcpConfiguration.get<boolean>('enabled', true);
        const mcpTransport = mcpConfiguration.get<string>('transport', 'stdio');
        
        if (mcpEnabled && mcpManager?.isRunning()) {
            mcpStatusBarItem.text = `$(radio-tower) AICC: MCP`;
            mcpStatusBarItem.tooltip = `MCP Server running (${mcpTransport} mode)\nClick to manage`;
            mcpStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
        } else {
            mcpStatusBarItem.text = `$(debug-disconnect) AICC: MCP`;
            mcpStatusBarItem.tooltip = 'MCP Server not running\nClick to start';
            mcpStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        }
        mcpStatusBarItem.command = 'aicc.mcpStatus';
        mcpStatusBarItem.show();
        disposables.push(mcpStatusBarItem);
        
        // Register MCP status command
        const mcpStatusCommand = vscode.commands.registerCommand('aicc.mcpStatus', async () => {
            const isRunning = mcpManager?.isRunning();
            const config = vscode.workspace.getConfiguration('aicc.mcp');
            const transport = config.get<string>('transport', 'stdio');
            const port = config.get<number>('port', 3000);
            const host = config.get<string>('host', 'localhost');
            
            const actions = isRunning 
                ? ['Stop Server', 'Restart Server', 'Export MCP Configuration', 'Open Settings']
                : ['Start Server', 'Export MCP Configuration', 'Open Settings'];
            
            const statusMessage = isRunning
                ? `Running (${transport} mode${transport !== 'stdio' ? ` on ${host}:${port}` : ''})`
                : 'Not running';
            
            const choice = await vscode.window.showQuickPick(actions, {
                placeHolder: `MCP Server: ${statusMessage}`
            });
            
            if (choice === 'Start Server') {
                vscode.commands.executeCommand(COMMAND_IDS.MCP_START);
            } else if (choice === 'Stop Server') {
                vscode.commands.executeCommand(COMMAND_IDS.MCP_STOP);
            } else if (choice === 'Restart Server') {
                vscode.commands.executeCommand(COMMAND_IDS.MCP_RESTART);
            } else if (choice === 'Export MCP Configuration') {
                vscode.commands.executeCommand(COMMAND_IDS.MCP_EXPORT_CONFIG);
            } else if (choice === 'Open Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'aicc.mcp');
            }
            
            // Update status bar (AICC-0514: Renamed to AICC: MCP)
            if (mcpManager?.isRunning()) {
                mcpStatusBarItem.text = `$(radio-tower) AICC: MCP`;
                mcpStatusBarItem.tooltip = `MCP Server running (${transport} mode)\nClick to manage`;
                mcpStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
            } else {
                mcpStatusBarItem.text = `$(debug-disconnect) AICC: MCP`;
                mcpStatusBarItem.tooltip = 'MCP Server not running\nClick to start';
                mcpStatusBarItem.backgroundColor = undefined;
            }
        });
        disposables.push(mcpStatusCommand);


        // ══════════════════════════════════════════════════════════════════
        // Command Registration via Activation Modules
        // Each module is wrapped in try-catch so a failure in one does not
        // prevent the rest from loading.
        // ══════════════════════════════════════════════════════════════════

        // Register instruction source management commands
        try {
            registerInstructionSourceCommands(context, versionOverrideSystem, updateStatusBar);
        } catch (err) {
            logger.warn('Failed to register instruction source commands', { error: String(err) });
        }
        tracker.markPhase('Instruction source commands registration');

        // Register MCP server control commands (START, STOP, RESTART, SSL, EXPORT)
        try {
            registerMcpCommands(context, mcpManager);
        } catch (err) {
            logger.warn('Failed to register MCP commands', { error: String(err) });
        }
        tracker.markPhase('MCP commands registration');

        // Register Init Toolset commands (execute, create example, validate, undo, show log)
        try {
            await registerInitToolsetCommands(context, workspaceRoot, logger);
        } catch (err) {
            logger.warn('Failed to register Init Toolset commands', { error: String(err) });
        }
        tracker.markPhase('Init Toolset commands registration');

        // Register File Protection commands (show logs, list backups, restore, configure)
        try {
            await registerFileProtectionCommands(context, workspaceRoot, logger);
        } catch (err) {
            logger.warn('Failed to register File Protection commands', { error: String(err) });
        }
        tracker.markPhase('File Protection commands registration');

        // Register Undo Manager commands (show history, undo last, undo panel, undo since)
        try {
            await registerUndoManagerCommands(context, workspaceRoot, logger);
        } catch (err) {
            logger.warn('Failed to register Undo Manager commands', { error: String(err) });
        }
        tracker.markPhase('Undo Manager commands registration');

        // Register Mermaid Panel commands (preview, preview selection)
        try {
            await registerMermaidCommands(context, logger);
        } catch (err) {
            logger.warn('Failed to register Mermaid commands', { error: String(err) });
        }
        tracker.markPhase('Mermaid Panel commands registration');

        // Register Diagram Converter commands (convert PlantUML, convert selection)
        try {
            await registerDiagramConverterCommands(context, logger);
        } catch (err) {
            logger.warn('Failed to register Diagram Converter commands', { error: String(err) });
        }
        tracker.markPhase('Diagram Converter commands registration');

        // Register Search, Asset Tree Map, Synthetic Test, and Planning Template commands
        try {
            await registerSearchAndToolCommands(context, planningManager, logger);
        } catch (err) {
            logger.warn('Failed to register Search and Tool commands', { error: String(err) });
        }
        tracker.markPhase('Search and Tool commands registration');

        // Register Secondary Panel action commands (settings, debug, help, CRUD, AI Kit)
        try {
            await registerSecondaryPanelCommands(context);
        } catch (err) {
            logger.warn('Failed to register Secondary Panel commands', { error: String(err) });
        }
        tracker.markPhase('Secondary Panel commands registration');

        // Register Archival service and archive command
        try {
            const archivalDisposables = await registerArchivalCommands(context, planGenerator, workspaceRoot, logger);
            disposables.push(...archivalDisposables);
        } catch (err) {
            logger.warn('Failed to register Archival commands', { error: String(err) });
        }
        tracker.markPhase('Archival commands registration');

        // Initialize Sprint 22-26 service tiers (core, advanced, integration)
        try {
            const sprintDisposables = await registerSprintServices(context, workspaceRoot, logger);
            disposables.push(...sprintDisposables);
        } catch (err) {
            logger.warn('Failed to initialize Sprint services', { error: String(err) });
        }
        tracker.markPhase('Sprint 22-26 services initialization');

        // Track activation state
        extensionActivated = true;

        // Store disposables for cleanup
        context.subscriptions.push(...disposables);
        tracker.markPhase('Finalization');

        // Complete performance tracking
        tracker.complete(500); // 500ms P95 threshold
        logger.info('AI Command Center: Activation complete');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger?.error('AI Command Center: Activation failed', { error: errorMessage });
        vscode.window.showErrorMessage(
            `AI Command Center failed to activate: ${errorMessage}`
        );
        throw error; // Re-throw to fail activation
    }
}

/**
 * Extension deactivation function called by VS Code on shutdown.
 * Cleans up resources and disposes all registered disposables.
 */
export async function deactivate(): Promise<void> {
    logger?.info('AI Command Center: Deactivating extension...');

    // Stop core managers
    if (agentDetector) {
        agentDetector.dispose();
        agentDetector = undefined;
    }

    if (chatParticipantManager) {
        chatParticipantManager.dispose();
        chatParticipantManager = undefined;
    }

    if (aiKitManager) {
        aiKitManager.dispose();
        aiKitManager = undefined;
    }

    if (intakeManager) {
        intakeManager.dispose();
        intakeManager = undefined;
    }

    // Stop MCP server
    if (mcpManager) {
        mcpManager.dispose();
        mcpManager = undefined;
    }

    // Stop Jira integration
    if (jiraManager) {
        await jiraManager.dispose();
        jiraManager = undefined;
    }

    // Stop configuration watcher
    if (configWatcher) {
        configWatcher.dispose();
    }

    // Dispose all registered resources
    disposables.forEach(disposable => {
        try {
            disposable.dispose();
        } catch (error) {
            logger?.error('Error disposing resource', { error });
        }
    });

    disposables = [];
    extensionActivated = false;

    logger?.info('AI Command Center: Deactivated');
}

/**
 * Export activation state for testing.
 * @returns True if extension is currently activated
 */
export function isActivated(): boolean {
    return extensionActivated;
}

/**
 * Export disposables array for testing.
 * @returns Array of registered disposables
 */
export function getDisposables(): vscode.Disposable[] {
    return disposables;
}
