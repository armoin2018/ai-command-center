/**
 * MCP Server Handlers for the Secondary Panel (AICC-0085 / AICC-0086 / AICC-0087)
 * Manages MCP server status, inventory, port scanning, and server actions.
 */

import * as vscode from 'vscode';
import { HandlerContext } from './types';
import { Logger } from '../../logger';

const logger = Logger.getInstance();

/** Scan all ports in the configured range using netstat and /health probes (REQ-MPD-001) */
export async function handleGetMcpPortScan(ctx: HandlerContext): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('aicc.mcp');
      const portRangeStart = config.get<number>('portRangeStart', 3100);
      const portRangeEnd = config.get<number>('portRangeEnd', 3110);

      const ports: Array<{
        port: number; listening: boolean; pid?: number; version?: string;
        role?: string; workspaceCount?: number; uptime?: number;
      }> = [];

      const portList: number[] = [];
      for (let p = portRangeStart; p <= portRangeEnd; p++) {
        portList.push(p);
      }

      // Determine which ports are listening
      let listeningPorts: Set<number> = new Set();
      try {
        const { execFileSync } = require('child_process');
        const portPattern = `[.:](${ portList.join('|') }) .+LISTEN`;
        const output: string = execFileSync('netstat', ['-an'], { encoding: 'utf-8', timeout: 5000 });
        const regex = new RegExp(portPattern);
        for (const line of output.split('\n')) {
          if (regex.test(line)) {
            for (const p of portList) {
              if (line.includes(`.${p} `) || line.includes(`:${p} `)) {
                listeningPorts.add(p);
              }
            }
          }
        }
      } catch {
        logger.warn('netstat scan failed, falling back to HTTP probes');
      }

      // Probe each port for health info (REQ-MPD-003 / REQ-MPD-004)
      const http = require('http');
      const probePort = (port: number): Promise<any> => {
        return new Promise((resolve) => {
          const req = http.request(
            { hostname: '127.0.0.1', port, path: '/health', method: 'GET', timeout: 2000 },
            (res: any) => {
              let body = '';
              res.on('data', (chunk: string) => { body += chunk; });
              res.on('end', () => {
                try { resolve(JSON.parse(body)); } catch { resolve(null); }
              });
            }
          );
          req.on('error', () => resolve(null));
          req.on('timeout', () => { req.destroy(); resolve(null); });
          req.end();
        });
      };

      const probeWorkspaces = (port: number): Promise<any[]> => {
        return new Promise((resolve) => {
          const req = http.request(
            { hostname: '127.0.0.1', port, path: '/workspaces', method: 'GET', timeout: 2000 },
            (res: any) => {
              let body = '';
              res.on('data', (chunk: string) => { body += chunk; });
              res.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  resolve(Array.isArray(data) ? data : (data.workspaces || []));
                } catch { resolve([]); }
              });
            }
          );
          req.on('error', () => resolve([]));
          req.on('timeout', () => { req.destroy(); resolve([]); });
          req.end();
        });
      };

      for (const p of portList) {
        if (listeningPorts.has(p)) {
          const [health, workspaces] = await Promise.all([probePort(p), probeWorkspaces(p)]);
          ports.push({
            port: p,
            listening: true,
            pid: health?.pid,
            version: health?.version,
            role: health?.role,
            uptime: health?.uptime,
            workspaceCount: workspaces.length,
          });
        } else {
          const health = await probePort(p);
          if (health) {
            const workspaces = await probeWorkspaces(p);
            listeningPorts.add(p);
            ports.push({
              port: p, listening: true,
              pid: health.pid, version: health.version, role: health.role,
              uptime: health.uptime, workspaceCount: workspaces.length,
            });
          } else {
            ports.push({ port: p, listening: false });
          }
        }
      }

      ctx.postMessage({ type: 'mcpPortScanResult', payload: { ports } });
    } catch (error) {
      logger.error('Error scanning MCP ports', { error: String(error) });
    }
}

/** Return MCP server status + connection state to the webview */
export async function handleGetMcpStatus(ctx: HandlerContext): Promise<void> {
    try {
      const status = ctx.mcpManager?.getServerStatus() ?? {
        isRunning: false, port: undefined, host: 'localhost', transport: 'stdio',
        pid: process.pid, role: 'standalone', isLeader: false,
        connectedWorkspaces: 0, startedAt: null,
      };

      const connMgr = ctx.mcpManager?.getConnectionManager();
      const stateInfo = connMgr?.getStateInfo() ?? {
        state: 'disconnected', attempts: 0,
        lastTransition: new Date(), uptime: 0,
      };

      ctx.postMessage({
        type: 'mcpStatusUpdate',
        payload: {
          ...status,
          connectionState: stateInfo.state,
          connectionAttempts: stateInfo.attempts,
          lastTransition: stateInfo.lastTransition.toISOString(),
          uptime: stateInfo.uptime,
        },
      });
    } catch (error) {
      logger.error('Error fetching MCP status', { error: String(error) });
    }
}

/** Return the MCP inventory (registered workspaces) to the webview */
export async function handleGetMcpInventory(ctx: HandlerContext): Promise<void> {
    try {
      const inv = ctx.mcpManager?.getInventoryManager();
      const workspaces = inv?.getWorkspaces() ?? [];
      const leader = inv?.getLeader() ?? null;

      ctx.postMessage({
        type: 'mcpInventoryUpdate',
        payload: { workspaces, leader },
      });
    } catch (error) {
      logger.error('Error fetching MCP inventory', { error: String(error) });
    }
}

/** Handle start / stop / restart actions on the MCP server */
export async function handleMcpServerAction(ctx: HandlerContext, message: { type: string; action: string }): Promise<void> {
    try {
      const action = message.action;
      if (!ctx.mcpManager) {
        logger.warn('MCP Manager not available for server action');
        return;
      }

      switch (action) {
        case 'start':
          await ctx.mcpManager.start();
          break;
        case 'stop':
          await ctx.mcpManager.stop();
          break;
        case 'restart':
          await ctx.mcpManager.restart();
          break;
        default:
          logger.warn(`Unknown MCP server action: ${action}`);
          return;
      }

      // Send updated status after action
      await handleGetMcpStatus(ctx);
      await handleGetMcpInventory(ctx);
    } catch (error) {
      logger.error('Error executing MCP server action', { error: String(error) });
      ctx.postMessage({ type: 'mcpActionError', payload: { error: String(error) } });
    }
}
