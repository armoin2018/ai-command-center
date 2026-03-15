/**
 * Skill Health Monitor
 *
 * Periodic health probes, credential validation, rate-limit monitoring,
 * and a state machine for skill availability (healthy → degraded → unreachable).
 *
 * Part of AICC-0145: Skill Health Monitor
 *   - AICC-0146: Health probes & credential validation
 *     - AICC-0393: Implement periodic health probe scheduler
 *     - AICC-0394: Build credential validation checks
 *     - AICC-0395: Add rate limit monitoring per skill
 *     - AICC-0396: Implement health state machine
 *   - AICC-0147: Orchestrator integration & event bus
 *     - AICC-0397: Create Orchestrator health API endpoint
 *     - AICC-0398: Wire skill health events to Event Bus
 *     - AICC-0399: Build health dashboard integration
 *
 * REQ-SKHM-001 to REQ-SKHM-008
 */

import * as vscode from 'vscode';
import { Logger } from '../logger';
import { EventBus } from './eventBus';

// ─── Types ───────────────────────────────────────────────────────────

/**
 * Possible health statuses for a skill.
 */
export type HealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown';

/**
 * Full health state tracked per skill.
 */
export interface SkillHealthState {
    /** Skill name / identifier */
    skillName: string;
    /** Current health status */
    status: HealthStatus;
    /** ISO timestamp of last health check */
    lastCheck: string;
    /** ISO timestamp of last healthy check */
    lastHealthy: string;
    /** Number of consecutive probe failures */
    consecutiveFailures: number;
    /** Last probe round-trip latency in milliseconds */
    latencyMs: number;
    /** Remaining API rate limit (if available) */
    rateLimitRemaining?: number;
    /** Rate limit reset time (ISO 8601, if available) */
    rateLimitReset?: string;
    /** Whether credentials passed validation */
    credentialValid: boolean;
    /** Error message from most recent failure */
    errorMessage?: string;
}

/**
 * Result of a single health probe against a skill.
 */
export interface HealthProbeResult {
    /** Skill name */
    skillName: string;
    /** Whether the skill endpoint was reachable */
    reachable: boolean;
    /** Probe round-trip latency in milliseconds */
    latencyMs: number;
    /** HTTP status code (if applicable) */
    statusCode?: number;
    /** Rate limit information returned by the probe */
    rateLimitInfo?: {
        remaining: number;
        limit: number;
        resetAt: string;
    };
    /** Whether credentials are valid */
    credentialValid: boolean;
    /** Error message if the probe failed */
    error?: string;
}

/**
 * Configuration for the health monitoring system.
 */
export interface HealthConfig {
    /** Whether health monitoring is enabled */
    enabled: boolean;
    /** Interval between health checks in milliseconds */
    intervalMs: number;
    /** Probe timeout in milliseconds */
    timeoutMs: number;
    /** Number of consecutive failures before status becomes degraded */
    degradedThreshold: number;
    /** Number of consecutive failures before status becomes unreachable */
    unreachableThreshold: number;
}

/**
 * Summary of health across all monitored skills.
 */
export interface HealthSummary {
    /** Total number of monitored skills */
    total: number;
    /** Count of healthy skills */
    healthy: number;
    /** Count of degraded skills */
    degraded: number;
    /** Count of unreachable skills */
    unreachable: number;
    /** Count of skills with unknown status */
    unknown: number;
}

// ─── Internal types ──────────────────────────────────────────────────

/**
 * Registered skill entry for health monitoring.
 */
interface RegisteredSkill {
    /** Skill name */
    name: string;
    /** Optional health-check endpoint URL */
    healthEndpoint?: string;
    /** Optional credentials identifier (e.g. secret key name) */
    credentialKey?: string;
}

// ─── Constants ───────────────────────────────────────────────────────

/** Default interval between health checks (5 minutes). */
const DEFAULT_INTERVAL_MS = 300_000;
/** Default probe timeout (10 seconds). */
const DEFAULT_TIMEOUT_MS = 10_000;
/** Default failures before degraded status. */
const DEFAULT_DEGRADED_THRESHOLD = 1;
/** Default failures before unreachable status. */
const DEFAULT_UNREACHABLE_THRESHOLD = 3;

// ─── SkillHealthMonitor ──────────────────────────────────────────────

/**
 * Singleton service that performs periodic health probes on registered
 * skills, tracks credential validity and rate-limit budgets, and emits
 * state-transition events on the EventBus.
 *
 * Configuration is read from VS Code settings under `aicc.skillHealth.*`.
 *
 * @example
 * ```ts
 * const monitor = SkillHealthMonitor.getInstance();
 * monitor.registerSkill({ name: 'ailey-com-slack', healthEndpoint: 'https://...' });
 * monitor.initialize();
 *
 * const state = monitor.getHealthState('ailey-com-slack');
 * console.log(state?.status); // 'healthy'
 * ```
 */
export class SkillHealthMonitor implements vscode.Disposable {
    // ── Singleton ────────────────────────────────────────────────

    private static instance: SkillHealthMonitor | undefined;

    /** Retrieve (or create) the singleton instance. */
    public static getInstance(): SkillHealthMonitor {
        if (!SkillHealthMonitor.instance) {
            SkillHealthMonitor.instance = new SkillHealthMonitor();
        }
        return SkillHealthMonitor.instance;
    }

    /** Destroy the singleton (useful in tests). */
    public static resetInstance(): void {
        if (SkillHealthMonitor.instance) {
            SkillHealthMonitor.instance.dispose();
        }
        SkillHealthMonitor.instance = undefined;
    }

    // ── State ────────────────────────────────────────────────────

    private readonly logger: Logger;
    private readonly eventBus: EventBus;

    /** Registered skills to monitor. */
    private readonly registeredSkills = new Map<string, RegisteredSkill>();

    /** Current health state per skill. */
    private readonly healthStates = new Map<string, SkillHealthState>();

    /** Periodic check timer handle. */
    private checkTimer: ReturnType<typeof setInterval> | undefined;

    /** Whether the monitor has been initialized. */
    private initialized = false;

    /** Disposables for cleanup. */
    private readonly disposables: vscode.Disposable[] = [];

    private constructor() {
        this.logger = Logger.getInstance();
        this.eventBus = EventBus.getInstance();
    }

    // ─── Configuration (AICC-0393) ───────────────────────────────

    /**
     * Read health monitoring configuration from VS Code settings.
     *
     * @returns Current health config.
     */
    public getConfig(): HealthConfig {
        const config = vscode.workspace.getConfiguration('aicc');
        return {
            enabled: config.get<boolean>('skillHealth.enabled', true),
            intervalMs: config.get<number>(
                'skillHealth.intervalMs',
                DEFAULT_INTERVAL_MS,
            ),
            timeoutMs: config.get<number>(
                'skillHealth.timeoutMs',
                DEFAULT_TIMEOUT_MS,
            ),
            degradedThreshold: config.get<number>(
                'skillHealth.degradedThreshold',
                DEFAULT_DEGRADED_THRESHOLD,
            ),
            unreachableThreshold: config.get<number>(
                'skillHealth.unreachableThreshold',
                DEFAULT_UNREACHABLE_THRESHOLD,
            ),
        };
    }

    // ─── Initialization (AICC-0393) ──────────────────────────────

    /**
     * Start the periodic health check scheduler.
     *
     * Reads configuration from VS Code settings and begins polling
     * all registered skills at the configured interval.
     */
    public initialize(): void {
        if (this.initialized) {
            this.logger.debug(
                'SkillHealthMonitor: already initialized',
                { component: 'SkillHealthMonitor' },
            );
            return;
        }

        const cfg = this.getConfig();
        if (!cfg.enabled) {
            this.logger.info(
                'SkillHealthMonitor: disabled via configuration',
                { component: 'SkillHealthMonitor' },
            );
            return;
        }

        this.checkTimer = setInterval(() => {
            this.checkAllSkills().catch((err) => {
                const message =
                    err instanceof Error ? err.message : String(err);
                this.logger.error(
                    `SkillHealthMonitor: periodic check failed: ${message}`,
                    { component: 'SkillHealthMonitor', error: err },
                );
            });
        }, cfg.intervalMs);

        // Listen for config changes to restart the timer
        const configListener = vscode.workspace.onDidChangeConfiguration(
            (e) => {
                if (e.affectsConfiguration('aicc.skillHealth')) {
                    this.logger.info(
                        'SkillHealthMonitor: configuration changed, restarting',
                        { component: 'SkillHealthMonitor' },
                    );
                    this.stopTimer();
                    this.initialized = false;
                    this.initialize();
                }
            },
        );
        this.disposables.push(configListener);

        this.initialized = true;
        this.logger.info(
            `SkillHealthMonitor: initialized with ${cfg.intervalMs}ms interval`,
            { component: 'SkillHealthMonitor' },
        );
    }

    // ─── Skill Registration ──────────────────────────────────────

    /**
     * Register a skill for health monitoring.
     *
     * @param skill - Skill registration details.
     */
    public registerSkill(skill: {
        name: string;
        healthEndpoint?: string;
        credentialKey?: string;
    }): void {
        this.registeredSkills.set(skill.name, {
            name: skill.name,
            healthEndpoint: skill.healthEndpoint,
            credentialKey: skill.credentialKey,
        });

        // Initialize health state if not already present
        if (!this.healthStates.has(skill.name)) {
            this.healthStates.set(skill.name, {
                skillName: skill.name,
                status: 'unknown',
                lastCheck: '',
                lastHealthy: '',
                consecutiveFailures: 0,
                latencyMs: 0,
                credentialValid: false,
            });
        }

        this.logger.debug(
            `SkillHealthMonitor: registered skill '${skill.name}'`,
            { component: 'SkillHealthMonitor' },
        );
    }

    /**
     * Unregister a skill from health monitoring.
     *
     * @param skillName - Name of the skill to unregister.
     */
    public unregisterSkill(skillName: string): void {
        this.registeredSkills.delete(skillName);
        this.healthStates.delete(skillName);

        this.logger.debug(
            `SkillHealthMonitor: unregistered skill '${skillName}'`,
            { component: 'SkillHealthMonitor' },
        );
    }

    // ─── Health Probing (AICC-0393, AICC-0395) ───────────────────

    /**
     * Execute a health probe against a single skill.
     *
     * Attempts to reach the skill's health endpoint (if configured),
     * validates credentials, and captures rate-limit headers.
     *
     * @param skillName - Name of the skill to probe.
     * @returns Probe result with reachability, latency, and rate limits.
     */
    public async probeSkill(
        skillName: string,
    ): Promise<HealthProbeResult> {
        const skill = this.registeredSkills.get(skillName);
        if (!skill) {
            return {
                skillName,
                reachable: false,
                latencyMs: 0,
                credentialValid: false,
                error: `Skill '${skillName}' is not registered`,
            };
        }

        const cfg = this.getConfig();
        const startTime = Date.now();

        try {
            // If we have a health endpoint, probe it
            if (skill.healthEndpoint) {
                const controller = new AbortController();
                const timeoutId = setTimeout(
                    () => controller.abort(),
                    cfg.timeoutMs,
                );

                try {
                    const response = await fetch(skill.healthEndpoint, {
                        method: 'GET',
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'AICC-SkillHealthMonitor/1.0',
                        },
                    });

                    clearTimeout(timeoutId);
                    const latencyMs = Date.now() - startTime;

                    // Extract rate limit info from common headers
                    const rateLimitInfo = this.extractRateLimitHeaders(
                        response.headers,
                    );

                    const result: HealthProbeResult = {
                        skillName,
                        reachable: response.ok,
                        latencyMs,
                        statusCode: response.status,
                        rateLimitInfo,
                        credentialValid: response.status !== 401 && response.status !== 403,
                    };

                    if (!response.ok) {
                        result.error = `HTTP ${response.status} ${response.statusText}`;
                    }

                    return result;
                } catch (fetchErr: unknown) {
                    clearTimeout(timeoutId);
                    const latencyMs = Date.now() - startTime;
                    const isTimeout =
                        fetchErr instanceof Error &&
                        fetchErr.name === 'AbortError';

                    return {
                        skillName,
                        reachable: false,
                        latencyMs,
                        credentialValid: false,
                        error: isTimeout
                            ? `Probe timed out after ${cfg.timeoutMs}ms`
                            : fetchErr instanceof Error
                              ? fetchErr.message
                              : String(fetchErr),
                    };
                }
            }

            // No health endpoint — perform a lightweight check
            // (credential validation only)
            const credentialValid = await this.validateCredentials(
                skillName,
            );
            const latencyMs = Date.now() - startTime;

            return {
                skillName,
                reachable: true,
                latencyMs,
                credentialValid,
            };
        } catch (err: unknown) {
            const latencyMs = Date.now() - startTime;
            const message = err instanceof Error ? err.message : String(err);

            return {
                skillName,
                reachable: false,
                latencyMs,
                credentialValid: false,
                error: message,
            };
        }
    }

    /**
     * Probe all registered skills and return updated health states.
     *
     * @returns Map of skill name to updated SkillHealthState.
     */
    public async checkAllSkills(): Promise<Map<string, SkillHealthState>> {
        const cfg = this.getConfig();
        if (!cfg.enabled) {
            return this.healthStates;
        }

        this.logger.debug(
            `SkillHealthMonitor: checking ${this.registeredSkills.size} skills`,
            { component: 'SkillHealthMonitor' },
        );

        const probePromises = Array.from(
            this.registeredSkills.keys(),
        ).map(async (skillName) => {
            const result = await this.probeSkill(skillName);
            this.updateHealthState(skillName, result);
        });

        await Promise.allSettled(probePromises);

        this.eventBus.emit('skill.health.checkComplete', {
            timestamp: Date.now(),
            summary: this.getHealthSummary(),
        });

        return this.healthStates;
    }

    // ─── State Machine (AICC-0396) ───────────────────────────────

    /**
     * Update the health state for a skill based on a probe result.
     *
     * Implements the state machine:
     * - 0 failures → healthy
     * - 1..N failures → degraded (configurable threshold)
     * - N+ failures → unreachable (configurable threshold)
     *
     * Emits `skill.health.changed` on the EventBus when the status
     * transitions to a different value.
     *
     * @param skillName - Name of the skill.
     * @param result - Probe result to process.
     * @returns Updated health state.
     */
    public updateHealthState(
        skillName: string,
        result: HealthProbeResult,
    ): SkillHealthState {
        const cfg = this.getConfig();
        const now = new Date().toISOString();

        const existing = this.healthStates.get(skillName) ?? {
            skillName,
            status: 'unknown' as HealthStatus,
            lastCheck: '',
            lastHealthy: '',
            consecutiveFailures: 0,
            latencyMs: 0,
            credentialValid: false,
        };

        const previousStatus = existing.status;

        // Update base fields
        existing.lastCheck = now;
        existing.latencyMs = result.latencyMs;
        existing.credentialValid = result.credentialValid;

        if (result.rateLimitInfo) {
            existing.rateLimitRemaining = result.rateLimitInfo.remaining;
            existing.rateLimitReset = result.rateLimitInfo.resetAt;
        }

        // State machine transition
        if (result.reachable && result.credentialValid) {
            // Probe succeeded
            existing.consecutiveFailures = 0;
            existing.status = 'healthy';
            existing.lastHealthy = now;
            existing.errorMessage = undefined;
        } else {
            // Probe failed
            existing.consecutiveFailures += 1;
            existing.errorMessage = result.error;

            if (
                existing.consecutiveFailures >=
                cfg.unreachableThreshold
            ) {
                existing.status = 'unreachable';
            } else if (
                existing.consecutiveFailures >=
                cfg.degradedThreshold
            ) {
                existing.status = 'degraded';
            }
        }

        this.healthStates.set(skillName, existing);

        // Emit event on status transition (AICC-0398)
        if (existing.status !== previousStatus) {
            this.logger.info(
                `SkillHealthMonitor: skill '${skillName}' status changed: ${previousStatus} → ${existing.status}`,
                { component: 'SkillHealthMonitor' },
            );

            this.eventBus.emit('skill.health.changed', {
                timestamp: Date.now(),
                skillName,
                previousStatus,
                currentStatus: existing.status,
                consecutiveFailures: existing.consecutiveFailures,
                latencyMs: existing.latencyMs,
                error: existing.errorMessage,
            });
        }

        return existing;
    }

    // ─── Credential Validation (AICC-0394) ───────────────────────

    /**
     * Validate whether a skill's credentials are currently valid.
     *
     * Checks VS Code secret storage for the skill's credential key.
     * If no credential key is configured, returns true (no creds required).
     *
     * @param skillName - Name of the skill.
     * @returns True if credentials are valid or not required.
     */
    public async validateCredentials(
        skillName: string,
    ): Promise<boolean> {
        const skill = this.registeredSkills.get(skillName);
        if (!skill) {
            return false;
        }

        // If no credential key is configured, treat as valid
        if (!skill.credentialKey) {
            return true;
        }

        try {
            // Check if the credential exists in VS Code secret storage
            // This is a lightweight check — the actual credential value
            // is not validated against the remote service here.
            const secretStorage =
                vscode.extensions.getExtension('aicc')?.exports
                    ?.secretStorage;

            if (secretStorage) {
                const value = await secretStorage.get(
                    skill.credentialKey,
                );
                return value !== undefined && value !== '';
            }

            // Fallback: check workspace configuration for credential presence
            const config = vscode.workspace.getConfiguration('aicc');
            const credentialValue = config.get<string>(
                `credentials.${skill.credentialKey}`,
            );
            return (
                credentialValue !== undefined && credentialValue !== ''
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(
                `SkillHealthMonitor: credential validation failed for '${skillName}': ${message}`,
                { component: 'SkillHealthMonitor', error: err },
            );
            return false;
        }
    }

    // ─── State Accessors (AICC-0397) ─────────────────────────────

    /**
     * Get the current health state for a specific skill.
     *
     * @param skillName - Name of the skill.
     * @returns Health state, or undefined if not registered.
     */
    public getHealthState(
        skillName: string,
    ): SkillHealthState | undefined {
        return this.healthStates.get(skillName);
    }

    /**
     * Get all current health states.
     *
     * @returns Map of skill name to health state.
     */
    public getAllHealthStates(): Map<string, SkillHealthState> {
        return new Map(this.healthStates);
    }

    /**
     * Get aggregated health summary across all monitored skills.
     *
     * @returns Summary with counts by status category.
     */
    public getHealthSummary(): HealthSummary {
        let healthy = 0;
        let degraded = 0;
        let unreachable = 0;
        let unknown = 0;

        for (const state of this.healthStates.values()) {
            switch (state.status) {
                case 'healthy':
                    healthy++;
                    break;
                case 'degraded':
                    degraded++;
                    break;
                case 'unreachable':
                    unreachable++;
                    break;
                case 'unknown':
                    unknown++;
                    break;
            }
        }

        return {
            total: this.healthStates.size,
            healthy,
            degraded,
            unreachable,
            unknown,
        };
    }

    // ─── Rate Limit Helpers (AICC-0395) ──────────────────────────

    /**
     * Extract rate limit information from HTTP response headers.
     *
     * Supports common rate-limit header patterns:
     * - `X-RateLimit-Remaining` / `X-RateLimit-Limit` / `X-RateLimit-Reset`
     * - `RateLimit-Remaining` / `RateLimit-Limit` / `RateLimit-Reset`
     *
     * @param headers - HTTP response headers.
     * @returns Rate limit info, or undefined if no headers found.
     */
    private extractRateLimitHeaders(
        headers: Headers,
    ):
        | { remaining: number; limit: number; resetAt: string }
        | undefined {
        // Try X-RateLimit-* pattern
        const remaining =
            headers.get('x-ratelimit-remaining') ??
            headers.get('ratelimit-remaining');
        const limit =
            headers.get('x-ratelimit-limit') ??
            headers.get('ratelimit-limit');
        const reset =
            headers.get('x-ratelimit-reset') ??
            headers.get('ratelimit-reset');

        if (remaining === null || limit === null) {
            return undefined;
        }

        const remainingNum = parseInt(remaining, 10);
        const limitNum = parseInt(limit, 10);

        if (isNaN(remainingNum) || isNaN(limitNum)) {
            return undefined;
        }

        // Reset may be a Unix timestamp or ISO string
        let resetAt: string;
        if (reset) {
            const resetNum = parseInt(reset, 10);
            if (!isNaN(resetNum) && resetNum > 1_000_000_000) {
                // Unix timestamp (seconds)
                resetAt = new Date(resetNum * 1000).toISOString();
            } else {
                resetAt = reset;
            }
        } else {
            resetAt = '';
        }

        return {
            remaining: remainingNum,
            limit: limitNum,
            resetAt,
        };
    }

    // ─── Dashboard HTML (AICC-0399) ──────────────────────────────

    /**
     * Generate an HTML dashboard table showing health status for all
     * monitored skills with status badges, latency, and rate limits.
     *
     * @returns HTML string with health dashboard.
     */
    public generateHealthDashboardHtml(): string {
        const states = Array.from(this.healthStates.values());
        const summary = this.getHealthSummary();

        const statusBadge = (status: HealthStatus): string => {
            const colors: Record<HealthStatus, string> = {
                healthy: '#28a745',
                degraded: '#ffc107',
                unreachable: '#dc3545',
                unknown: '#6c757d',
            };
            const color = colors[status] || '#6c757d';
            return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;color:#fff;background:${color};text-transform:uppercase;">${status}</span>`;
        };

        const rows = states
            .sort((a, b) => a.skillName.localeCompare(b.skillName))
            .map(
                (s) => `
            <tr>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;font-weight:500;">${s.skillName}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;text-align:center;">${statusBadge(s.status)}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;text-align:right;">${s.latencyMs > 0 ? s.latencyMs + 'ms' : '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;text-align:center;">${s.credentialValid ? '✅' : '❌'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;text-align:right;">${s.rateLimitRemaining !== undefined ? s.rateLimitRemaining : '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;">${s.lastCheck ? new Date(s.lastCheck).toLocaleTimeString() : '—'}</td>
                <td style="padding:8px 12px;border-bottom:1px solid #dee2e6;color:#dc3545;font-size:12px;">${s.errorMessage || ''}</td>
            </tr>`,
            )
            .join('');

        return `
<div class="health-dashboard" style="font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;">
    <h3 style="margin-top:0;color:#212529;">Skill Health Dashboard</h3>

    <div style="display:flex;gap:12px;margin-bottom:20px;">
        <div style="flex:1;background:#d4edda;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#155724;">${summary.healthy}</div>
            <div style="font-size:12px;color:#155724;">Healthy</div>
        </div>
        <div style="flex:1;background:#fff3cd;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#856404;">${summary.degraded}</div>
            <div style="font-size:12px;color:#856404;">Degraded</div>
        </div>
        <div style="flex:1;background:#f8d7da;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#721c24;">${summary.unreachable}</div>
            <div style="font-size:12px;color:#721c24;">Unreachable</div>
        </div>
        <div style="flex:1;background:#e2e3e5;padding:12px;border-radius:6px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#383d41;">${summary.unknown}</div>
            <div style="font-size:12px;color:#383d41;">Unknown</div>
        </div>
    </div>

    <table style="width:100%;border-collapse:collapse;border:1px solid #dee2e6;border-radius:8px;overflow:hidden;">
        <thead>
            <tr style="background:#f8f9fa;">
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #dee2e6;">Skill</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #dee2e6;">Status</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #dee2e6;">Latency</th>
                <th style="padding:10px 12px;text-align:center;border-bottom:2px solid #dee2e6;">Creds</th>
                <th style="padding:10px 12px;text-align:right;border-bottom:2px solid #dee2e6;">Rate Limit</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #dee2e6;">Last Check</th>
                <th style="padding:10px 12px;text-align:left;border-bottom:2px solid #dee2e6;">Error</th>
            </tr>
        </thead>
        <tbody>
            ${rows || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#6c757d;">No skills registered for monitoring</td></tr>'}
        </tbody>
    </table>
</div>`;
    }

    // ─── Timer Management ────────────────────────────────────────

    /**
     * Stop the periodic health check timer.
     */
    private stopTimer(): void {
        if (this.checkTimer) {
            clearInterval(this.checkTimer);
            this.checkTimer = undefined;
        }
    }

    // ─── Disposal ────────────────────────────────────────────────

    /**
     * Dispose of all resources: stop the check timer and clean up
     * event listeners.
     */
    public dispose(): void {
        this.stopTimer();
        this.initialized = false;

        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;

        this.logger.debug(
            'SkillHealthMonitor: disposed',
            { component: 'SkillHealthMonitor' },
        );
    }
}
