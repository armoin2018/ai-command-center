/**
 * Panel Registration Module
 *
 * Extracts panel-related command registration from extension.ts into
 * dedicated functions for secondary panel actions and search/tool commands.
 *
 * @module activation/panelRegistration
 */

import * as vscode from 'vscode';
import { COMMAND_IDS } from '../commands/commandIds';
import { Logger } from '../logger';
import { PlanningManager } from '../planning/planningManager';

const logger = Logger.getInstance();

/**
 * Registers secondary panel action commands (settings, debug, help,
 * save, run/edit/info actions, AI Kit install/uninstall, etc.).
 *
 * All command handlers are lazily imported from `commands/commandHandlers`
 * to keep the activation path lightweight.
 *
 * @param context - The VS Code extension context whose subscriptions
 *                  receive the registered disposables.
 */
export async function registerSecondaryPanelCommands(
    context: vscode.ExtensionContext
): Promise<void> {
    const commandHandlers = await import('../commands/commandHandlers');

    const openSettingsCmd = vscode.commands.registerCommand(
        COMMAND_IDS.OPEN_SETTINGS,
        () => commandHandlers.openSettingsCommand()
    );
    const showDebugPanelCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SHOW_DEBUG_PANEL,
        () => commandHandlers.showDebugPanelCommand()
    );
    const showHelpCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SHOW_HELP,
        () => commandHandlers.showHelpCommand()
    );
    const saveAllChangesCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SAVE_ALL_CHANGES,
        () => commandHandlers.saveAllChangesCommand()
    );
    const runNextItemCmd = vscode.commands.registerCommand(
        COMMAND_IDS.RUN_NEXT_ITEM,
        () => commandHandlers.runNextItemCommand()
    );
    const updateItemStatusCmd = vscode.commands.registerCommand(
        COMMAND_IDS.UPDATE_ITEM_STATUS,
        (itemId?: string, newStatus?: string) =>
            commandHandlers.updateItemStatusCommand(itemId, newStatus)
    );
    const runItemCmd = vscode.commands.registerCommand(
        COMMAND_IDS.RUN_ITEM,
        (itemId?: string) => commandHandlers.runItemCommand(itemId)
    );
    const editItemCmd = vscode.commands.registerCommand(
        COMMAND_IDS.EDIT_ITEM,
        (itemId?: string) => commandHandlers.editItemCommand(itemId)
    );
    const showItemInfoCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SHOW_ITEM_INFO,
        (itemId?: string) => commandHandlers.showItemInfoCommand(itemId)
    );
    const showItemConnectionsCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SHOW_ITEM_CONNECTIONS,
        (itemId?: string) => commandHandlers.showItemConnectionsCommand(itemId)
    );
    const showItemRepoCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SHOW_ITEM_REPO,
        (itemId?: string) => commandHandlers.showItemRepoCommand(itemId)
    );
    const showItemCommentsCmd = vscode.commands.registerCommand(
        COMMAND_IDS.SHOW_ITEM_COMMENTS,
        (itemId?: string) => commandHandlers.showItemCommentsCommand(itemId)
    );
    const installAIKitCmd = vscode.commands.registerCommand(
        COMMAND_IDS.INSTALL_AI_KIT,
        (kitId?: string) => commandHandlers.installAIKitCommand(kitId)
    );
    const uninstallAIKitCmd = vscode.commands.registerCommand(
        COMMAND_IDS.UNINSTALL_AI_KIT,
        (kitId?: string) => commandHandlers.uninstallAIKitCommand(kitId)
    );
    const refreshAIKitsCmd = vscode.commands.registerCommand(
        COMMAND_IDS.REFRESH_AI_KITS,
        () => commandHandlers.refreshAIKitsCommand()
    );

    context.subscriptions.push(
        openSettingsCmd,
        showDebugPanelCmd,
        showHelpCmd,
        saveAllChangesCmd,
        runNextItemCmd,
        updateItemStatusCmd,
        runItemCmd,
        editItemCmd,
        showItemInfoCmd,
        showItemConnectionsCmd,
        showItemRepoCmd,
        showItemCommentsCmd,
        installAIKitCmd,
        uninstallAIKitCmd,
        refreshAIKitsCmd
    );
}

/**
 * Registers Global Search, Asset Tree Map, Synthetic Test, and
 * Planning Template commands.
 *
 * Each dependency is lazily imported so that the modules are only
 * loaded when this registration path is reached.
 *
 * @param context         - The VS Code extension context.
 * @param planningManager - The planning manager instance used by
 *                          search and template operations.
 * @param log             - Logger instance (falls back to the
 *                          module-level singleton when omitted).
 */
export async function registerSearchAndToolCommands(
    context: vscode.ExtensionContext,
    planningManager: PlanningManager,
    log: Logger = logger
): Promise<void> {
    // ── Global Search ────────────────────────────────────────────────
    const { GlobalSearch } = await import('../search/globalSearch');
    const globalSearch = new GlobalSearch(planningManager, log);

    const searchGlobalCommand = vscode.commands.registerCommand(
        COMMAND_IDS.SEARCH_GLOBAL,
        async () => {
            try {
                const query = await vscode.window.showInputBox({
                    prompt: 'Search planning items (epics, stories, tasks)',
                    placeHolder: 'Enter search terms...',
                    validateInput: (value) => {
                        if (value.trim().length < 2) {
                            return 'Search query must be at least 2 characters';
                        }
                        return undefined;
                    }
                });
                if (!query) { return; }

                const results = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Searching for "${query}"...`,
                        cancellable: false
                    },
                    async () => {
                        return await globalSearch.search({ query });
                    }
                );

                if (results.length === 0) {
                    vscode.window.showInformationMessage(`No results found for "${query}"`);
                    return;
                }

                const items = results.map((r) => {
                    const icon =
                        r.type === 'epic' ? '📚' : r.type === 'story' ? '📖' : '✓';
                    const location =
                        r.type === 'task'
                            ? ` (${r.epicId}/${r.storyId})`
                            : r.type === 'story'
                              ? ` (${r.epicId})`
                              : '';
                    const matchInfo =
                        r.matches.length > 0 ? ` - ${r.matches[0].snippet}` : '';

                    return {
                        label: `${icon} ${r.name}`,
                        description: `${r.type}${location} | ${r.status} | ${r.priority}`,
                        detail: matchInfo || r.description.substring(0, 100),
                        result: r
                    };
                });

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `${results.length} results for "${query}"`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    vscode.window.showInformationMessage(
                        `Selected: ${selected.result.type} "${selected.result.name}" (ID: ${selected.result.id})`
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Search failed: ${message}`);
            }
        }
    );

    const searchByTypeCommand = vscode.commands.registerCommand(
        COMMAND_IDS.SEARCH_BY_TYPE,
        async () => {
            try {
                const typeItems = [
                    { label: '📚 Epics', value: 'epic' as const },
                    { label: '📖 Stories', value: 'story' as const },
                    { label: '✓ Tasks', value: 'task' as const },
                    { label: '🔍 All Types', value: 'all' as const }
                ];

                const selectedType = await vscode.window.showQuickPick(typeItems, {
                    placeHolder: 'Select entity type to search'
                });
                if (!selectedType) { return; }

                const query = await vscode.window.showInputBox({
                    prompt: `Search ${selectedType.value === 'all' ? 'all items' : selectedType.value + 's'}`,
                    placeHolder: 'Enter search terms (optional)...'
                });

                const results = await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Searching ${selectedType.value}s...`,
                        cancellable: false
                    },
                    async () => {
                        return await globalSearch.search({
                            query: query || undefined,
                            type: selectedType.value
                        });
                    }
                );

                if (results.length === 0) {
                    vscode.window.showInformationMessage(
                        `No ${selectedType.value}s found`
                    );
                    return;
                }

                const items = results.slice(0, 100).map((r) => {
                    const icon =
                        r.type === 'epic' ? '📚' : r.type === 'story' ? '📖' : '✓';
                    const location =
                        r.type === 'task'
                            ? ` (${r.epicId}/${r.storyId})`
                            : r.type === 'story'
                              ? ` (${r.epicId})`
                              : '';

                    return {
                        label: `${icon} ${r.name}`,
                        description: `${r.status} | ${r.priority}${location}`,
                        detail: r.description.substring(0, 100),
                        result: r
                    };
                });

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: `${results.length} ${selectedType.value}${results.length === 1 ? '' : 's'} found${results.length > 100 ? ' (showing first 100)' : ''}`,
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    vscode.window.showInformationMessage(
                        `Selected: ${selected.result.type} "${selected.result.name}" (ID: ${selected.result.id})`
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Search failed: ${message}`);
            }
        }
    );

    context.subscriptions.push(searchGlobalCommand, searchByTypeCommand);

    // ── Asset Tree Map ───────────────────────────────────────────────
    const { registerAssetTreeMapCommands } = await import(
        '../tools/assetTreeMap'
    );
    const assetTreeMapDisposables = registerAssetTreeMapCommands(context, log);
    context.subscriptions.push(...assetTreeMapDisposables);

    // ── Synthetic Test ───────────────────────────────────────────────
    const { registerSyntheticTestCommands } = await import(
        '../tools/syntheticTest'
    );
    const syntheticTestDisposables = registerSyntheticTestCommands(context, log);
    context.subscriptions.push(...syntheticTestDisposables);

    // ── Planning Templates ───────────────────────────────────────────
    const { PlanningTemplates } = await import(
        '../templates/planningTemplates'
    );

    const useTemplateCommand = vscode.commands.registerCommand(
        COMMAND_IDS.PLANNING_USE_TEMPLATE,
        async () => {
            try {
                const templates = PlanningTemplates.getTemplates();
                const items = templates.map((t) => ({
                    label: t.name,
                    description: t.description,
                    detail: `Category: ${t.category} | ${t.stories.length} stories`,
                    template: t
                }));

                const selected = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select a planning template',
                    matchOnDescription: true,
                    matchOnDetail: true
                });
                if (!selected) { return; }

                const epicName = await vscode.window.showInputBox({
                    prompt: 'Epic Name',
                    value: selected.template.epicTitle,
                    placeHolder: 'Enter epic name'
                });
                if (!epicName) { return; }

                await vscode.window.withProgress(
                    {
                        location: vscode.ProgressLocation.Notification,
                        title: `Creating epic from ${selected.template.name} template...`,
                        cancellable: false
                    },
                    async () => {
                        const epic = await PlanningTemplates.applyTemplate(
                            selected.template.id,
                            planningManager,
                            { epicTitle: epicName }
                        );
                        if (epic) {
                            vscode.window.showInformationMessage(
                                `Successfully created epic "${epic.title}" with ${selected.template.stories.length} stories from template`
                            );
                        } else {
                            vscode.window.showErrorMessage(
                                'Failed to create epic from template'
                            );
                        }
                    }
                );
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(
                    `Failed to use template: ${message}`
                );
            }
        }
    );

    const listTemplatesCommand = vscode.commands.registerCommand(
        COMMAND_IDS.PLANNING_LIST_TEMPLATES,
        async () => {
            try {
                const templates = PlanningTemplates.getTemplates();
                const items = templates.map((t) => ({
                    label: `${t.name} (${t.category})`,
                    description: t.description,
                    detail: `${t.stories.length} stories | ${t.stories.reduce((sum, s) => sum + (s.tasks?.length || 0), 0)} tasks`
                }));

                await vscode.window.showQuickPick(items, {
                    placeHolder: 'Available planning templates',
                    matchOnDescription: true,
                    matchOnDetail: true
                });
            } catch (error) {
                const message =
                    error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(
                    `Failed to list templates: ${message}`
                );
            }
        }
    );

    context.subscriptions.push(useTemplateCommand, listTemplatesCommand);
}
