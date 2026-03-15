/**
 * Leader Election for Multi-Workspace MCP Architecture
 *
 * Implements a leader/follower pattern so multiple VS Code windows
 * can share a single MCP server instance:
 *   - First window to bind a port in the configured range = leader
 *   - Other windows = followers (register with the leader)
 *   - If the leader dies, a follower detects it via health polling and re-elects
 *
 * @module AICC-0190 / AICC-0193
 */

import * as net from 'net';
import * as http from 'http';
import { EventEmitter } from 'events';
import { Logger } from '../logger';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export type LeaderRole = 'leader' | 'follower' | 'standalone';

export interface LeaderElectionConfig {
  /** First port to try when electing a leader (inclusive). */
  portRangeStart: number;
  /** Last port to try when electing a leader (inclusive). */
  portRangeEnd: number;
  /** Milliseconds between follower health-checks against the leader. */
  healthCheckInterval: number;
  /** Number of consecutive health-check failures before triggering re-election. */
  failureThreshold: number;
  /** Extension version string (e.g. '2.0.10'). Used to ensure version-compatible leader pairing. */
  version: string;
}

/** Result from probing a leader's /health endpoint. */
export interface LeaderHealthInfo {
  healthy: boolean;
  version?: string;
  port?: number;
  workspaces?: WorkspaceRegistration[];
}

export interface WorkspaceRegistration {
  /** Unique identifier for this workspace instance. */
  id: string;
  /** Human-readable workspace folder name. */
  name: string;
  /** OS process ID of the VS Code window. */
  pid: number;
  /** If this workspace is the leader, the port the MCP server is bound to. */
  port?: number;
  /** Extension version of this workspace instance (e.g. '2.0.10'). */
  version: string;
  /** Names of MCP skills registered by this workspace. */
  skills: string[];
  /** Current health status. */
  health: 'healthy' | 'unhealthy' | 'unknown';
  /** ISO-8601 timestamp of initial registration. */
  registeredAt: string;
  /** ISO-8601 timestamp of last successful health-check / heartbeat. */
  lastSeen: string;
}

// ────────────────────────────────────────────────────────────────────
// Leader Election
// ────────────────────────────────────────────────────────────────────

export class LeaderElection extends EventEmitter {
  private role: LeaderRole = 'standalone';
  private config: LeaderElectionConfig;
  private logger: Logger;
  private leaderPort: number | null = null;
  private healthTimer: NodeJS.Timeout | null = null;
  private consecutiveFailures: number = 0;
  private workspaceId: string;

  constructor(logger: Logger, config?: Partial<LeaderElectionConfig>) {
    super();
    this.logger = logger;
    this.workspaceId = `ws-${process.pid}-${Date.now()}`;
    this.config = {
      portRangeStart: config?.portRangeStart ?? 3100,
      portRangeEnd: config?.portRangeEnd ?? 3110,
      healthCheckInterval: config?.healthCheckInterval ?? 5000,
      failureThreshold: config?.failureThreshold ?? 3,
      version: config?.version ?? '0.0.0',
    };
  }

  // ──────────── Public API ────────────

  /**
   * Run the election algorithm.
   *
   * 1. Try to bind a TCP server on each port in the configured range.
   *    – If binding succeeds → become **leader**.
   * 2. If all ports are taken, probe each for a healthy MCP leader.
   *    – If found → become **follower** and start health polling.
   * 3. If no healthy leader is found → fall back to **standalone**.
   */
  async elect(): Promise<LeaderRole> {
    this.stopHealthPolling();
    this.consecutiveFailures = 0;

    // Phase 1 – try to claim a port
    for (let port = this.config.portRangeStart; port <= this.config.portRangeEnd; port++) {
      const available = await this.tryBindPort(port);
      if (available) {
        this.role = 'leader';
        this.leaderPort = port;
        this.logger.info('Elected as MCP leader', {
          component: 'LeaderElection',
          port,
          workspaceId: this.workspaceId,
        });
        this.emit('elected', { role: 'leader' as LeaderRole, port });
        return this.role;
      }
    }

    // Phase 2 – all ports occupied; look for a healthy leader running the same version
    for (let port = this.config.portRangeStart; port <= this.config.portRangeEnd; port++) {
      const info = await this.probeLeader(port);
      if (info.healthy) {
        if (info.version && info.version !== this.config.version) {
          this.logger.info('Skipping leader on different version', {
            component: 'LeaderElection',
            port,
            leaderVersion: info.version,
            ourVersion: this.config.version,
          });
          continue;
        }
        this.role = 'follower';
        this.leaderPort = port;
        this.logger.info('Joined as MCP follower (version-matched)', {
          component: 'LeaderElection',
          leaderPort: port,
          leaderVersion: info.version,
          workspaceId: this.workspaceId,
        });
        this.startHealthPolling();
        this.emit('elected', { role: 'follower' as LeaderRole, leaderPort: port });
        return this.role;
      }
    }

    // Phase 3 – no leader reachable; standalone
    this.role = 'standalone';
    this.leaderPort = null;
    this.logger.warn('No MCP leader found – running standalone', {
      component: 'LeaderElection',
      workspaceId: this.workspaceId,
    });
    this.emit('elected', { role: 'standalone' as LeaderRole });
    return this.role;
  }

  /** Current role of this workspace. */
  getRole(): LeaderRole {
    return this.role;
  }

  /** Port the leader MCP server is bound to (or `null` in standalone mode). */
  getLeaderPort(): number | null {
    return this.leaderPort;
  }

  /** Unique identifier for this workspace instance. */
  getWorkspaceId(): string {
    return this.workspaceId;
  }

  /** Extension version configured for this election instance. */
  getVersion(): string {
    return this.config.version;
  }

  /** Clean up timers and listeners. */
  dispose(): void {
    this.stopHealthPolling();
    this.removeAllListeners();
  }

  // ──────────── Private helpers ────────────

  /**
   * Attempt to bind a temporary TCP server on the given port.
   * Returns `true` when the port is available (bind succeeds), `false` otherwise.
   */
  private tryBindPort(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const srv = net.createServer();

      srv.once('error', () => {
        resolve(false);
      });

      srv.listen(port, '127.0.0.1', () => {
        // Port is free – close immediately so the real MCP server can bind later
        srv.close(() => resolve(true));
      });
    });
  }

  /**
   * Probe a port for a healthy MCP leader via `GET /health` (2 s timeout).
   * Returns structured info including the leader's version.
   */
  private probeLeader(port: number): Promise<LeaderHealthInfo> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        req.destroy();
        resolve({ healthy: false });
      }, 2000);

      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        clearTimeout(timeout);
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const data = JSON.parse(body);
              resolve({
                healthy: data.status === 'ok',
                version: data.version,
                port: data.port,
                workspaces: data.workspaces,
              });
            } else {
              resolve({ healthy: false });
            }
          } catch {
            resolve({ healthy: false });
          }
        });
      });

      req.on('error', () => {
        clearTimeout(timeout);
        resolve({ healthy: false });
      });
    });
  }

  /**
   * Simple boolean health check for backward compatibility (used by health polling).
   */
  private checkLeaderHealth(port: number): Promise<boolean> {
    return this.probeLeader(port).then((info) => info.healthy);
  }

  // ──── AICC-0193: Leader failure detection timer ────

  /**
   * Start polling the leader's `/health` endpoint at the configured interval.
   * After `failureThreshold` consecutive failures, emit `'leaderFailed'`
   * and trigger a new election round.
   */
  private startHealthPolling(): void {
    this.stopHealthPolling();

    if (this.leaderPort === null) {
      return;
    }

    const port = this.leaderPort;

    this.healthTimer = setInterval(async () => {
      const healthy = await this.checkLeaderHealth(port);

      if (healthy) {
        if (this.consecutiveFailures > 0) {
          this.logger.info('Leader health restored', {
            component: 'LeaderElection',
            leaderPort: port,
          });
        }
        this.consecutiveFailures = 0;
        return;
      }

      this.consecutiveFailures++;
      this.logger.warn('Leader health-check failed', {
        component: 'LeaderElection',
        leaderPort: port,
        consecutiveFailures: this.consecutiveFailures,
        threshold: this.config.failureThreshold,
      });

      if (this.consecutiveFailures >= this.config.failureThreshold) {
        this.logger.error('Leader presumed dead – starting re-election', {
          component: 'LeaderElection',
          leaderPort: port,
        });
        this.stopHealthPolling();
        this.emit('leaderFailed', { previousLeaderPort: port });
        await this.elect();
      }
    }, this.config.healthCheckInterval);
  }

  /** Stop the health-polling interval timer. */
  private stopHealthPolling(): void {
    if (this.healthTimer !== null) {
      clearInterval(this.healthTimer);
      this.healthTimer = null;
    }
  }
}
