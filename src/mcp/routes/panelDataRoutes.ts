import * as http from 'http';
import * as url from 'url';
import { PanelLoaderService } from '../../services/panelLoader';
import { PlanGenerator } from '../../services/planGenerator';
import { Logger } from '../../logger';
import { PlanItem } from '../../types/plan';

const logger = Logger.getInstance();

/**
 * Panel Data Routes
 * Provides REST endpoints for panel data access (separation of concerns compliant)
 */
export class PanelDataRoutes {
  private panelLoader: PanelLoaderService;
  private planGenerator: PlanGenerator;

  constructor() {
    this.panelLoader = PanelLoaderService.getInstance();
    this.planGenerator = PlanGenerator.getInstance();
  }

  /**
   * Route handler - dispatches to appropriate method
   */
  public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    const method = req.method || 'GET';

    try {
      // GET /mcp/panels/list
      if (method === 'GET' && pathname === '/mcp/panels/list') {
        await this.getPanelsList(req, res);
        return;
      }

      // GET /mcp/panels/:id/data
      const panelDataMatch = pathname.match(/^\/mcp\/panels\/([^/]+)\/data$/);
      if (method === 'GET' && panelDataMatch) {
        await this.getPanelData(req, res, panelDataMatch[1]);
        return;
      }

      // GET /mcp/planning/items
      if (method === 'GET' && pathname === '/mcp/planning/items') {
        await this.getPlanningItems(req, res);
        return;
      }

      // GET /mcp/planning/status-counts
      if (method === 'GET' && pathname === '/mcp/planning/status-counts') {
        await this.getStatusCounts(req, res);
        return;
      }

      // No route matched
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Route not found', path: pathname }));

    } catch (error: any) {
      logger.error('Panel data route error', { pathname, error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message 
      }));
    }
  }

  /**
   * GET /mcp/panels/list
   * Returns list of available panels with metadata
   */
  private async getPanelsList(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const panels = this.panelLoader.getAllPanels();
      
      const panelList = panels.map(panel => ({
        id: panel.panel.id,
        name: panel.panel.name,
        description: panel.panel.description,
        icon: panel.panel.icon,
        scope: panel.panel.scope,
        enabled: panel.panel.enabled
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: panelList,
        count: panelList.length
      }));

    } catch (error: any) {
      logger.error('Failed to get panels list', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false,
        error: 'Failed to retrieve panels list',
        message: error.message
      }));
    }
  }

  /**
   * GET /mcp/panels/:id/data
   * Returns data for a specific panel
   */
  private async getPanelData(
    _req: http.IncomingMessage, 
    res: http.ServerResponse, 
    panelId: string
  ): Promise<void> {
    try {
      const panel = this.panelLoader.getPanel(panelId);
      
      if (!panel) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Panel not found',
          panelId
        }));
        return;
      }

      // Return panel configuration as JSON
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          panel: {
            id: panel.panel.id,
            name: panel.panel.name,
            description: panel.panel.description,
            icon: panel.panel.icon,
            scope: panel.panel.scope,
            enabled: panel.panel.enabled
          },
          layout: panel.layout,
          components: panel.components,
          metadata: {
            loaded: true,
            timestamp: new Date().toISOString()
          }
        }
      }));

    } catch (error: any) {
      logger.error('Failed to get panel data', { panelId, error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve panel data',
        message: error.message
      }));
    }
  }

  /**
   * GET /mcp/planning/items
   * Returns all planning items (epics, stories, tasks) in hierarchical format
   */
  private async getPlanningItems(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      
      if (!planDocument) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'No planning data available'
        }));
        return;
      }
      
      // Calculate totals
      const items = planDocument.items || [];
      const epics = items.filter((i: PlanItem) => i.type === 'epic');
      let totalStories = 0;
      let totalTasks = 0;
      
      for (const epic of epics) {
        const stories = items.filter((i: PlanItem) => i.parent === epic.id && i.type === 'story');
        totalStories += stories.length;
        
        for (const story of stories) {
          const tasks = items.filter((i: PlanItem) => i.parent === story.id);
          totalTasks += tasks.length;
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          items,
          metadata: {
            totalEpics: epics.length,
            totalStories,
            totalTasks,
            generated: new Date().toISOString()
          }
        }
      }));

    } catch (error: any) {
      logger.error('Failed to get planning items', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve planning items',
        message: error.message
      }));
    }
  }

  /**
   * GET /mcp/planning/status-counts
   * Returns aggregated counts by status for epics, stories, and tasks
   */
  private async getStatusCounts(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const planDocument = this.planGenerator.getPlanDocument();
      
      if (!planDocument) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'No planning data available'
        }));
        return;
      }
      
      const items = planDocument.items || [];

      // Calculate status counts
      const statusCounts: Record<string, number> = {
        'BACKLOG': 0,
        'READY': 0,
        'IN-PROGRESS': 0,
        'BLOCKED': 0,
        'REVIEW': 0,
        'DONE': 0,
        'SKIP': 0
      };

      // Count all items
      for (const item of items) {
        const status = item.status || 'BACKLOG';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          statusCounts,
          total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
          timestamp: new Date().toISOString()
        }
      }));

    } catch (error: any) {
      logger.error('Failed to get status counts', { error: error.message });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve status counts',
        message: error.message
      }));
    }
  }
}
