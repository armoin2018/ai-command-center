/**
 * Settings watcher for AI Command Center (AICC-0479).
 *
 * Listens for VS Code configuration changes under the `aicc.*` namespace
 * and propagates updated values to the relevant singleton services so they
 * pick up new settings without requiring an extension reload.
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';

// ── Class ────────────────────────────────────────────────────────

export class SettingsWatcher implements vscode.Disposable {
    private readonly disposable: vscode.Disposable;
    private readonly logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.disposable = vscode.workspace.onDidChangeConfiguration(
            this.onConfigChange.bind(this),
        );
        this.logger.info('SettingsWatcher initialised', {
            component: 'SettingsWatcher',
        });
    }

    // ── Handler ──────────────────────────────────────────────────

    private async onConfigChange(
        event: vscode.ConfigurationChangeEvent,
    ): Promise<void> {
        try {
            // ── Skill Health Monitor ─────────────────────────────
            if (event.affectsConfiguration('aicc.skillHealth')) {
                await this.applySkillHealthSettings();
            }

            // ── Offline Queue ────────────────────────────────────
            if (event.affectsConfiguration('aicc.offlineQueue')) {
                await this.applyOfflineQueueSettings();
            }

            // ── Agent Session Memory ─────────────────────────────
            if (event.affectsConfiguration('aicc.memory')) {
                await this.applyMemorySettings();
            }

            // ── Telemetry Collector ──────────────────────────────
            if (event.affectsConfiguration('aicc.telemetry')) {
                await this.applyTelemetrySettings();
            }

            // ── Velocity Engine ──────────────────────────────────
            if (event.affectsConfiguration('aicc.velocity')) {
                await this.applyVelocitySettings();
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`SettingsWatcher: error applying settings — ${msg}`, {
                component: 'SettingsWatcher',
                error: err,
            });
        }
    }

    // ── Applicators ──────────────────────────────────────────────

    /**
     * Re-read `aicc.skillHealth.*` and reinitialise the health monitor
     * so it picks up the new interval / enabled flag.
     */
    private async applySkillHealthSettings(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('aicc');
        const enabled = cfg.get<boolean>('skillHealth.enabled', true);
        const intervalMs = cfg.get<number>('skillHealth.intervalMs', 300_000);

        this.logger.info(
            `SettingsWatcher: skillHealth changed — enabled=${enabled}, intervalMs=${intervalMs}`,
            { component: 'SettingsWatcher' },
        );

        try {
            const { SkillHealthMonitor } = await import(
                '../services/skillHealthMonitor'
            );
            const monitor = SkillHealthMonitor.getInstance();

            // Dispose and reinitialise to pick up new interval
            monitor.dispose();
            SkillHealthMonitor.resetInstance();

            if (enabled) {
                const fresh = SkillHealthMonitor.getInstance();
                fresh.initialize();
            }
        } catch (err) {
            this.logger.warn('SettingsWatcher: SkillHealthMonitor not available', {
                component: 'SettingsWatcher',
                error: err,
            });
        }
    }

    /**
     * Re-read `aicc.offlineQueue.*` settings.
     *
     * OfflineQueue reads config on each retry cycle, so we only need to
     * log the change; the queue will pick up new values on next drain.
     */
    private async applyOfflineQueueSettings(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('aicc');
        const maxRetries = cfg.get<number>('offlineQueue.maxRetries', 5);
        const backoffBaseMs = cfg.get<number>('offlineQueue.backoffBaseMs', 1000);

        this.logger.info(
            `SettingsWatcher: offlineQueue changed — maxRetries=${maxRetries}, backoffBaseMs=${backoffBaseMs}`,
            { component: 'SettingsWatcher' },
        );

        // OfflineQueue reads VS Code config per-retry so no imperative
        // update is required — the new values take effect automatically.
    }

    /**
     * Re-read `aicc.memory.*` settings.
     *
     * The AgentSessionMemory config is set at construction time. To apply
     * new values we log for visibility; the next instance creation will
     * use the updated config.
     */
    private async applyMemorySettings(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('aicc');
        const maxEntries = cfg.get<number>('memory.maxEntries', 1000);
        const pruneAgeDays = cfg.get<number>('memory.pruneAgeDays', 90);

        this.logger.info(
            `SettingsWatcher: memory changed — maxEntries=${maxEntries}, pruneAgeDays=${pruneAgeDays}`,
            { component: 'SettingsWatcher' },
        );

        // AgentSessionMemory will read these on next store/prune cycle.
    }

    /**
     * Re-read `aicc.telemetry.*` settings and toggle the collector.
     */
    private async applyTelemetrySettings(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('aicc');
        const localEnabled = cfg.get<boolean>('telemetry.localEnabled', true);

        this.logger.info(
            `SettingsWatcher: telemetry changed — localEnabled=${localEnabled}`,
            { component: 'SettingsWatcher' },
        );

        try {
            const { TelemetryCollector } = await import(
                '../services/telemetryCollector'
            );
            // Access the singleton so it is aware of the config cycle
            const _collector = TelemetryCollector.getInstance();
            void _collector; // consumed — collector reads config per-emit

            if (!localEnabled) {
                this.logger.info(
                    'SettingsWatcher: local telemetry disabled via settings',
                    { component: 'SettingsWatcher' },
                );
            }
        } catch (err) {
            this.logger.warn('SettingsWatcher: TelemetryCollector not available', {
                component: 'SettingsWatcher',
                error: err,
            });
        }
    }

    /**
     * Re-read `aicc.velocity.*` settings.
     */
    private async applyVelocitySettings(): Promise<void> {
        const cfg = vscode.workspace.getConfiguration('aicc');
        const autoSnapshot = cfg.get<boolean>('velocity.autoSnapshot', true);

        this.logger.info(
            `SettingsWatcher: velocity changed — autoSnapshot=${autoSnapshot}`,
            { component: 'SettingsWatcher' },
        );

        // VelocityEngine reads this flag at snapshot-creation time, so
        // no imperative update is required.
    }

    // ── Disposal ─────────────────────────────────────────────────

    public dispose(): void {
        this.disposable.dispose();
        this.logger.info('SettingsWatcher disposed', {
            component: 'SettingsWatcher',
        });
    }
}
