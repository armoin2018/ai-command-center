/**
 * MCP Inventory Manager
 *
 * Persists leader + workspace registration state to a shared
 * `mcp-inventory.json` file so every VS Code window can discover
 * which instance is the leader and what skills are available.
 *
 * @module AICC-0194 / AICC-0196 / AICC-0197
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as vscode from 'vscode';
import { Logger } from '../logger';
import { getPlatformPaths } from '../utils/platformInfo';
import { WorkspaceRegistration } from './leaderElection';

// ────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────

export interface MCPInventory {
  version: '1.0.0';
  leader: {
    workspaceId: string;
    port: number;
    pid: number;
    startedAt: string;
  } | null;
  workspaces: WorkspaceRegistration[];
  lastUpdated: string;
}

// ────────────────────────────────────────────────────────────────────
// Manager
// ────────────────────────────────────────────────────────────────────

export class MCPInventoryManager {
  private inventory: MCPInventory;
  private filePath: string;
  private logger: Logger;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private healthScanTimer: NodeJS.Timeout | null = null;

  /** Workspaces not seen within this window (ms) are removed automatically. */
  private static readonly STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

  constructor(logger: Logger, storagePath?: string) {
    this.logger = logger;

    const dir = storagePath ?? path.join(getPlatformPaths().tempDir, 'aicc-mcp');
    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.filePath = path.join(dir, 'mcp-inventory.json');
    this.inventory = this.createEmptyInventory();
  }

  // ──────────── Inventory lifecycle ────────────

  private createEmptyInventory(): MCPInventory {
    return {
      version: '1.0.0',
      leader: null,
      workspaces: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Load inventory from disk.  Creates an empty file if none exists.
   */
  async load(): Promise<MCPInventory> {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.inventory = JSON.parse(raw) as MCPInventory;
        this.logger.info('MCP inventory loaded', {
          component: 'MCPInventoryManager',
          workspaces: this.inventory.workspaces.length,
        });
      } else {
        this.inventory = this.createEmptyInventory();
        await this.save();
        this.logger.info('MCP inventory created', { component: 'MCPInventoryManager' });
      }
    } catch (err: any) {
      this.logger.warn('Failed to load MCP inventory – resetting', {
        component: 'MCPInventoryManager',
        error: err.message,
      });
      this.inventory = this.createEmptyInventory();
      await this.save();
    }
    return this.inventory;
  }

  /**
   * Persist inventory to disk atomically (write tmp → rename).
   */
  async save(): Promise<void> {
    try {
      this.inventory.lastUpdated = new Date().toISOString();
      const data = JSON.stringify(this.inventory, null, 2);
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, data, 'utf-8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err: any) {
      this.logger.error('Failed to save MCP inventory', err);
    }
  }

  // ──────────── Workspace CRUD ────────────

  registerWorkspace(ws: WorkspaceRegistration): void {
    const idx = this.inventory.workspaces.findIndex((w) => w.id === ws.id);
    if (idx >= 0) {
      this.inventory.workspaces[idx] = ws;
    } else {
      this.inventory.workspaces.push(ws);
    }
    this.save().catch(() => {});
    this.logger.info('Workspace registered in inventory', {
      component: 'MCPInventoryManager',
      workspaceId: ws.id,
    });
  }

  unregisterWorkspace(id: string): void {
    this.inventory.workspaces = this.inventory.workspaces.filter((w) => w.id !== id);
    this.save().catch(() => {});
    this.logger.info('Workspace unregistered from inventory', {
      component: 'MCPInventoryManager',
      workspaceId: id,
    });
  }

  getWorkspaces(): WorkspaceRegistration[] {
    return [...this.inventory.workspaces];
  }

  // ──────────── Leader management ────────────

  setLeader(workspaceId: string, port: number): void {
    this.inventory.leader = {
      workspaceId,
      port,
      pid: process.pid,
      startedAt: new Date().toISOString(),
    };
    this.save().catch(() => {});
    this.logger.info('Leader set in inventory', {
      component: 'MCPInventoryManager',
      workspaceId,
      port,
    });
  }

  getLeader(): MCPInventory['leader'] {
    return this.inventory.leader;
  }

  // ──── AICC-0197: File-watching auto-refresh ────

  /**
   * Watch the inventory file for external changes and reload automatically.
   */
  startWatching(onChange: () => void): void {
    this.stopWatching();

    try {
      const pattern = new vscode.RelativePattern(
        vscode.Uri.file(path.dirname(this.filePath)),
        path.basename(this.filePath),
      );
      this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);

      const reload = async () => {
        await this.load();
        onChange();
      };

      this.fileWatcher.onDidChange(reload);
      this.fileWatcher.onDidCreate(reload);
      this.fileWatcher.onDidDelete(async () => {
        this.inventory = this.createEmptyInventory();
        await this.save();
        onChange();
      });

      this.logger.info('Inventory file watcher started', {
        component: 'MCPInventoryManager',
        filePath: this.filePath,
      });
    } catch (err: any) {
      this.logger.warn('Could not create inventory file watcher', {
        component: 'MCPInventoryManager',
        error: err.message,
      });
    }
  }

  private stopWatching(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
      this.fileWatcher = null;
    }
  }

  // ──── AICC-0196: Background health scanner ────

  /**
   * Periodically ping each registered workspace's health endpoint,
   * update its `health` / `lastSeen` fields, and remove workspaces
   * that have been unreachable for more than 5 minutes.
   */
  startHealthScanning(intervalMs: number = 30_000): void {
    this.stopHealthScanning();

    this.healthScanTimer = setInterval(async () => {
      let changed = false;

      for (const ws of this.inventory.workspaces) {
        const status = await this.scanWorkspaceHealth(ws);

        if (status !== ws.health) {
          ws.health = status;
          changed = true;
        }

        if (status === 'healthy') {
          ws.lastSeen = new Date().toISOString();
        }
      }

      // Prune stale workspaces
      const now = Date.now();
      const before = this.inventory.workspaces.length;
      this.inventory.workspaces = this.inventory.workspaces.filter((ws) => {
        const lastSeen = new Date(ws.lastSeen).getTime();
        return now - lastSeen < MCPInventoryManager.STALE_THRESHOLD_MS;
      });
      if (this.inventory.workspaces.length !== before) {
        changed = true;
        this.logger.info('Pruned stale workspaces from inventory', {
          component: 'MCPInventoryManager',
          removed: before - this.inventory.workspaces.length,
        });
      }

      if (changed) {
        await this.save();
      }
    }, intervalMs);

    this.logger.info('Inventory health scanner started', {
      component: 'MCPInventoryManager',
      intervalMs,
    });
  }

  stopHealthScanning(): void {
    if (this.healthScanTimer !== null) {
      clearInterval(this.healthScanTimer);
      this.healthScanTimer = null;
    }
  }

  /**
   * HTTP GET the workspace's health endpoint.
   * Returns 'healthy' on a 200/ok response, 'unhealthy' otherwise.
   *
   * For the self-workspace (matching current PID), mark as healthy if the
   * process is alive — avoids false-negatives when the health-check port
   * differs from the registered port (e.g. election port ≠ config port).
   */
  private scanWorkspaceHealth(ws: WorkspaceRegistration): Promise<'healthy' | 'unhealthy'> {
    // Self-workspace: if our own process is alive, always healthy
    if (ws.pid === process.pid) {
      return Promise.resolve('healthy');
    }

    // Remote workspaces without a port cannot be health-checked
    if (!ws.port) {
      // If the workspace's PID is still running, consider it healthy
      try {
        process.kill(ws.pid, 0); // signal 0 = existence check
        return Promise.resolve('healthy');
      } catch {
        return Promise.resolve('unhealthy');
      }
    }

    // Determine the best port to probe: prefer the leader's port from inventory
    // (which matches the actual HTTP server), falling back to the workspace's
    // registered port.
    const probePort = (this.inventory.leader && this.inventory.leader.workspaceId === ws.id)
      ? this.inventory.leader.port
      : ws.port;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        req.destroy();
        resolve('unhealthy');
      }, 3000);

      const req = http.get(`http://127.0.0.1:${probePort}/health`, (res) => {
        clearTimeout(timeout);
        let body = '';
        res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
        res.on('end', () => {
          try {
            if (res.statusCode === 200) {
              const data = JSON.parse(body);
              resolve(data.status === 'ok' ? 'healthy' : 'unhealthy');
            } else {
              resolve('unhealthy');
            }
          } catch {
            resolve('unhealthy');
          }
        });
      });

      req.on('error', () => {
        clearTimeout(timeout);
        resolve('unhealthy');
      });
    });
  }

  // ──────────── Disposal ────────────

  dispose(): void {
    this.stopWatching();
    this.stopHealthScanning();
  }
}
