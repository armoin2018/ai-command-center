/**
 * MCP Server Handlers for the Secondary Panel (AICC-0085 / AICC-0086 / AICC-0087)
 * Manages MCP server status, inventory, port scanning, and server actions.
 */

import * as vscode from 'vscode';
import { HandlerContext } from './types';
import { Logger } from '../../logger';

const logger = Logger.getInstance();

/** Scan all ports in the configured range using fast TCP connect + HTTP enrichment (REQ-MPD-010–014) */
export async function handleGetMcpPortScan(ctx: HandlerContext): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('aicc.mcp');
      const portRangeStart = config.get<number>('portRangeStart', 3100);
      const portRangeEnd = config.get<number>('portRangeEnd', 3110);

      const portList: number[] = [];
      for (let p = portRangeStart; p <= portRangeEnd; p++) {
        portList.push(p);
      }

      // ── Phase 1: Fast TCP connect check (REQ-MPD-010 / REQ-MPD-014) ──
      const net = require('net');
      const tcpCheck = (port: number): Promise<boolean> => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          socket.setTimeout(500);
          socket.once('connect', () => { socket.destroy(); resolve(true); });
          socket.once('error', () => { socket.destroy(); resolve(false); });
          socket.once('timeout', () => { socket.destroy(); resolve(false); });
          socket.connect(port, '127.0.0.1');
        });
      };

      // Run all TCP checks in parallel — bounded by slowest (≤500ms)
      const tcpResults = await Promise.all(portList.map(async (p) => ({
        port: p,
        listening: await tcpCheck(p),
      })));

      // Send Phase 1 partial results immediately (REQ-MPD-012)
      const partialPorts = tcpResults.map(r => ({
        port: r.port,
        listening: r.listening,
      }));
      ctx.postMessage({ type: 'mcpPortScanResult', payload: { ports: partialPorts, partial: true } });

      // ── Phase 2: HTTP enrichment for listening ports (REQ-MPD-011) ──
      const http = require('http');
      const httpGet = (port: number, urlPath: string): Promise<any> => {
        return new Promise((resolve) => {
          const req = http.request(
            { hostname: '127.0.0.1', port, path: urlPath, method: 'GET', timeout: 2000 },
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

      const listeningPorts = tcpResults.filter(r => r.listening);
      const enriched = await Promise.all(listeningPorts.map(async (r) => {
        const [health, wsData] = await Promise.all([
          httpGet(r.port, '/health'),
          httpGet(r.port, '/workspaces'),
        ]);
        const workspaces = wsData ? (Array.isArray(wsData) ? wsData : (wsData.workspaces || [])) : [];
        return {
          port: r.port,
          listening: true,
          pid: health?.pid,
          version: health?.version,
          role: health?.role,
          uptime: health?.uptime,
          workspaceCount: workspaces.length,
        };
      }));

      // Merge enriched data with non-listening ports
      const enrichedMap = new Map(enriched.map(e => [e.port, e]));
      const fullPorts = portList.map(p => {
        if (enrichedMap.has(p)) {
          return enrichedMap.get(p)!;
        }
        return { port: p, listening: false };
      });

      ctx.postMessage({ type: 'mcpPortScanResult', payload: { ports: fullPorts } });
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
        state: status.isRunning ? 'connected' : 'disconnected',
        attempts: 0,
        lastTransition: new Date(),
        uptime: status.startedAt ? Date.now() - new Date(status.startedAt).getTime() : 0,
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
export async function handleMcpServerAction(ctx: HandlerContext, message: { type: string; action?: string; payload?: { action: string } }): Promise<void> {
    try {
      const action = message.payload?.action ?? message.action;
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

/** Fetch OpenAPI spec from MCP server and return to webview (REQ-APIDOC-001) */
export async function handleFetchOpenApiSpec(ctx: HandlerContext, payload: { url: string }): Promise<void> {
    try {
      const http = require('http');
      const https = require('https');
      const urlStr = payload?.url;
      if (!urlStr) {
        ctx.postMessage({ type: 'openApiSpecResult', payload: { error: 'No URL provided' } });
        return;
      }

      const parsedUrl = new URL(urlStr);
      const client = parsedUrl.protocol === 'https:' ? https : http;

      const spec: string = await new Promise((resolve, reject) => {
        const req = client.request(
          { hostname: parsedUrl.hostname, port: parsedUrl.port, path: parsedUrl.pathname, method: 'GET', timeout: 5000 },
          (res: any) => {
            let body = '';
            res.on('data', (chunk: string) => { body += chunk; });
            res.on('end', () => resolve(body));
          }
        );
        req.on('error', (err: Error) => reject(err));
        req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
        req.end();
      });

      const parsed = JSON.parse(spec);
      ctx.postMessage({ type: 'openApiSpecResult', payload: { spec: parsed } });
    } catch (error) {
      logger.error('Error fetching OpenAPI spec', { error: String(error) });
      ctx.postMessage({ type: 'openApiSpecResult', payload: { error: String(error) } });
    }
}
