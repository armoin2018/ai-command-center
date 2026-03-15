/**
 * @module archivalRegistration
 * @description Extracts archival service and sprint services command registration
 * from extension.ts. Registers the {@link COMMAND_IDS.ARCHIVE_ITEMS} command and
 * initializes Sprint 22–26 service tiers (core → advanced → integration).
 */

import * as vscode from 'vscode';
import { COMMAND_IDS } from '../commands/commandIds';
import { Logger } from '../logger';
import type { PlanGenerator } from '../services/planGenerator';

/**
 * Disposable-like object used to register teardown hooks with
 * {@link vscode.ExtensionContext.subscriptions}.
 */
interface DisposableLike {
    dispose(): void;
}

/**
 * Registers the archival service and the "Archive Items" command.
 *
 * Dynamically imports {@link PlanArchivalService}, obtains its singleton,
 * initialises it with the workspace root, and wires up the
 * {@link COMMAND_IDS.ARCHIVE_ITEMS} command which lets the user pick
 * completed / skipped items and archive them to `PLAN-ARCHIVE.json`.
 *
 * @param context       - VS Code extension context for subscription management.
 * @param planGenerator - Singleton plan generator (used to read current plan items).
 * @param workspaceRoot - Absolute path to the workspace root directory.
 * @param logger        - Logger instance for informational and error messages.
 * @returns An array of disposables created during registration.
 */
export async function registerArchivalCommands(
    context: vscode.ExtensionContext,
    planGenerator: PlanGenerator,
    workspaceRoot: string,
    logger: Logger
): Promise<DisposableLike[]> {
    const disposables: DisposableLike[] = [];

    try {
        const { PlanArchivalService } = await import('../services/planArchivalService');
        const archivalService = PlanArchivalService.getInstance();
        archivalService.initialize(workspaceRoot);
        disposables.push({ dispose: () => {} }); // singleton — no teardown needed

        const archiveItemsCmd = vscode.commands.registerCommand(COMMAND_IDS.ARCHIVE_ITEMS, async () => {
            try {
                const planDoc = planGenerator.getPlanDocument();
                if (!planDoc || planDoc.items.length === 0) {
                    vscode.window.showInformationMessage('No plan items found.');
                    return;
                }

                // Filter to DONE / SKIP items
                const archivable = planDoc.items.filter(
                    item => item.status === 'DONE' || item.status === 'SKIP'
                );

                if (archivable.length === 0) {
                    vscode.window.showInformationMessage('No completed or skipped items to archive.');
                    return;
                }

                // Show multi-select QuickPick
                const picks = archivable.map(item => ({
                    label: `$(${item.status === 'DONE' ? 'check' : 'circle-slash'}) ${item.id}`,
                    description: item.status,
                    detail: item.summary,
                    item
                }));

                const selected = await vscode.window.showQuickPick(picks, {
                    placeHolder: `Select items to archive (${archivable.length} available)`,
                    canPickMany: true
                });

                if (!selected || selected.length === 0) {
                    return;
                }

                const itemsToArchive = selected.map(s => s.item);
                await archivalService.archiveManually(itemsToArchive);

                vscode.window.showInformationMessage(
                    `Archived ${itemsToArchive.length} item(s) to PLAN-ARCHIVE.json`
                );
            } catch (error) {
                const msg = error instanceof Error ? error.message : 'Unknown error';
                logger.error('Archive items command failed', { error: msg });
                vscode.window.showErrorMessage(`Failed to archive items: ${msg}`);
            }
        });

        context.subscriptions.push(archiveItemsCmd);
        logger.info('Archival service initialized');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.warn(`Failed to initialize archival service: ${message}`);
    }

    return disposables;
}

/**
 * Initializes the Sprint 22–26 service tiers.
 *
 * Services are loaded in three progressive tiers so that a failure in an
 * optional integration tier does not prevent core and advanced services from
 * starting:
 *
 * - **Tier 1 – Core services:** EventBus, KitComponentManager,
 *   TelemetryCollector, OfflineQueue, AgentSessionMemory, KnowledgeBase,
 *   PromptEffectivenessTracker.
 * - **Tier 2 – Advanced services:** VelocityEngine, SkillHealthMonitor,
 *   IdeaAnalytics, SmartContextEngine, GitBranchLinker,
 *   NlPlanningChatHandler, PipelineEngine.
 * - **Tier 3 – Integration services (optional):** SkillRegistrationManager,
 *   ConfluenceClient.
 *
 * @param context       - VS Code extension context for subscription management.
 * @param workspaceRoot - Absolute path to the workspace root directory.
 * @param logger        - Logger instance for informational and warning messages.
 * @returns An array of disposables created during initialization.
 */
export async function registerSprintServices(
    _context: vscode.ExtensionContext,
    workspaceRoot: string,
    logger: Logger
): Promise<DisposableLike[]> {
    const disposables: DisposableLike[] = [];

    // ── Tier 1 — No dependencies beyond Logger / EventBus / ConfigManager ──
    try {
        const { EventBus } = await import('../services/eventBus');
        const eventBusInstance = EventBus.getInstance();
        disposables.push({ dispose: () => eventBusInstance.dispose() });

        const { KitComponentManager } = await import('../services/kitComponentManager');
        KitComponentManager.getInstance();

        const { TelemetryCollector } = await import('../services/telemetryCollector');
        const telemetryCollector = TelemetryCollector.getInstance();
        disposables.push({ dispose: () => telemetryCollector.dispose() });

        const { OfflineQueue } = await import('../services/offlineQueue');
        const offlineQueue = OfflineQueue.getInstance(workspaceRoot);
        disposables.push(offlineQueue);

        const { AgentSessionMemory } = await import('../services/agentSessionMemory');
        AgentSessionMemory.getInstance(workspaceRoot);

        const { KnowledgeBase } = await import('../services/knowledgeBase');
        KnowledgeBase.getInstance();

        const { PromptEffectivenessTracker } = await import('../services/promptEffectivenessTracker');
        PromptEffectivenessTracker.getInstance(workspaceRoot);

        logger.info('Sprint 22-26 Tier 1 services initialized');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Sprint 22-26 Tier 1 service initialization failed', { error: msg });
    }

    // ── Tier 2 — Depends on Tier 1 services ──
    try {
        const { VelocityEngine } = await import('../services/velocityEngine');
        VelocityEngine.getInstance();

        const { SkillHealthMonitor } = await import('../services/skillHealthMonitor');
        const skillHealthMonitor = SkillHealthMonitor.getInstance();
        skillHealthMonitor.initialize();
        disposables.push(skillHealthMonitor);

        const { IdeaAnalytics } = await import('../services/ideaAnalytics');
        IdeaAnalytics.getInstance(workspaceRoot);

        const { SmartContextEngine } = await import('../services/smartContextEngine');
        const smartContextEngine = SmartContextEngine.getInstance();
        smartContextEngine.initialize();
        disposables.push(smartContextEngine);

        const { GitBranchLinker } = await import('../services/gitBranchLinker');
        const gitBranchLinker = GitBranchLinker.getInstance();
        await gitBranchLinker.initialize();
        disposables.push(gitBranchLinker);

        const { NlPlanningChatHandler } = await import('../services/nlPlanningChatHandler');
        NlPlanningChatHandler.getInstance();

        const { PipelineEngine } = await import('../services/pipelineEngine');
        PipelineEngine.getInstance();

        logger.info('Sprint 22-26 Tier 2 services initialized');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Sprint 22-26 Tier 2 service initialization failed', { error: msg });
    }

    // ── Tier 3 — Integration services (optional) ──
    try {
        const { SkillRegistrationManager } = await import('../services/skillRegistrationManager');
        SkillRegistrationManager.getInstance();

        const { ConfluenceClient } = await import('../integrations/confluenceClient');
        ConfluenceClient.getInstance();

        logger.info('Sprint 22-26 Tier 3 services initialized');
    } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Sprint 22-26 Tier 3 service initialization failed', { error: msg });
    }

    return disposables;
}
