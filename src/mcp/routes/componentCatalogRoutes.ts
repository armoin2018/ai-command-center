import * as http from 'http';
import * as url from 'url';
import { ComponentRegistry } from '../../services/componentRegistry';
import { logger } from '../../logger';

/**
 * Component Catalog Routes
 * Provides REST endpoints for browsing and discovering UI components
 */
export class ComponentCatalogRoutes {
  private componentRegistry: ComponentRegistry;

  constructor() {
    this.componentRegistry = ComponentRegistry.getInstance();
  }

  /**
   * Route handler - dispatches to appropriate method
   */
  public async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname || '';
    const method = req.method || 'GET';

    try {
      // GET /mcp/components/catalog
      if (method === 'GET' && pathname === '/mcp/components/catalog') {
        await this.getCatalog(req, res);
        return;
      }

      // GET /mcp/components/search
      if (method === 'GET' && pathname === '/mcp/components/search') {
        await this.searchComponents(req, res);
        return;
      }

      // GET /mcp/components/tags
      if (method === 'GET' && pathname === '/mcp/components/tags') {
        await this.getTags(req, res);
        return;
      }

      // GET /mcp/components/:componentId/demo
      const demoMatch = pathname.match(/^\/mcp\/components\/([^/]+)\/demo$/);
      if (method === 'GET' && demoMatch) {
        await this.getComponentDemo(req, res, demoMatch[1]);
        return;
      }

      // GET /mcp/components/:componentId
      const componentMatch = pathname.match(/^\/mcp\/components\/([^/]+)$/);
      if (method === 'GET' && componentMatch) {
        await this.getComponent(req, res, componentMatch[1]);
        return;
      }

      // Not found
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (error) {
      logger.error('Error handling component catalog request', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: String(error)
      }));
    }
  }

  /**
   * GET /mcp/components/catalog
   * Returns all registered components with metadata
   */
  private async getCatalog(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const catalog = this.componentRegistry.getCatalog();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          components: catalog,
          count: catalog.length,
          timestamp: new Date().toISOString()
        }
      }));
      
      logger.info('Component catalog retrieved', { count: catalog.length });
    } catch (error) {
      logger.error('Failed to retrieve component catalog', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve component catalog',
        message: String(error)
      }));
    }
  }

  /**
   * GET /mcp/components/:componentId
   * Returns detailed information about a specific component
   */
  private async getComponent(
    _req: http.IncomingMessage,
    res: http.ServerResponse,
    componentId: string
  ): Promise<void> {
    try {
      const catalog = this.componentRegistry.getCatalog();
      const component = catalog.find(c => c.id === componentId);
      
      if (!component) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Component not found',
          componentId
        }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: component
      }));
      
      logger.info('Component details retrieved', { componentId });
    } catch (error) {
      logger.error('Failed to retrieve component', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve component',
        message: String(error)
      }));
    }
  }

  /**
   * GET /mcp/components/:componentId/demo
   * Returns demo HTML for a specific component
   */
  private async getComponentDemo(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    componentId: string
  ): Promise<void> {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const exampleIndex = parseInt((parsedUrl.query.example as string) || '0', 10);
      
      const demoHtml = this.componentRegistry.getDemoHtml(componentId, exampleIndex);
      
      if (!demoHtml) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: 'Component demo not found',
          componentId
        }));
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(demoHtml);
      
      logger.info('Component demo retrieved', { componentId, exampleIndex });
    } catch (error) {
      logger.error('Failed to retrieve component demo', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve component demo',
        message: String(error)
      }));
    }
  }

  /**
   * GET /mcp/components/search
   * Search components by name or tags
   */
  private async searchComponents(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const parsedUrl = url.parse(req.url || '', true);
      const { q, tag } = parsedUrl.query;
      
      let results = this.componentRegistry.getCatalog();
      
      if (q) {
        const schemas = this.componentRegistry.searchComponents(q as string);
        results = schemas.map(schema => ({
          id: schema.metadata.id,
          name: schema.metadata.name,
          description: schema.metadata.description || '',
          category: schema.metadata.category,
          tags: schema.metadata.tags || [],
          version: schema.metadata.version,
          examples: schema.spec.examples || []
        }));
      }
      
      if (tag) {
        results = results.filter(c => c.tags?.includes(tag as string));
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          components: results,
          count: results.length,
          query: q,
          tag
        }
      }));
      
      logger.info('Component search completed', { query: q, tag, count: results.length });
    } catch (error) {
      logger.error('Failed to search components', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to search components',
        message: String(error)
      }));
    }
  }

  /**
   * GET /mcp/components/tags
   * Returns all unique tags across all components
   */
  private async getTags(_req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    try {
      const catalog = this.componentRegistry.getCatalog();
      const tags = new Set<string>();
      
      catalog.forEach(component => {
        component.tags?.forEach(tag => tags.add(tag));
      });
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          tags: Array.from(tags).sort(),
          count: tags.size
        }
      }));
      
      logger.info('Component tags retrieved', { count: tags.size });
    } catch (error) {
      logger.error('Failed to retrieve component tags', { error: String(error) });
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: 'Failed to retrieve component tags',
        message: String(error)
      }));
    }
  }
}
