/**
 * Component Catalog Handlers for the Secondary Panel (AICC-0535)
 * Reads YAML component definitions and sends them to the webview.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { HandlerContext } from './types';
import { Logger } from '../../logger';

const logger = Logger.getInstance();

interface ComponentMetadata {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  version?: string;
}

interface ComponentSpec {
  props?: Record<string, unknown>;
  events?: unknown[];
  template?: string;
  styles?: string;
  examples?: Array<{
    name: string;
    description?: string;
    props?: Record<string, unknown>;
    code?: string;
  }>;
}

interface ParsedComponent {
  metadata: ComponentMetadata;
  spec: ComponentSpec;
}

/** Read all component definition files (JSON preferred, YAML fallback) and send them to the webview */
export async function handleGetComponents(ctx: HandlerContext): Promise<void> {
  try {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      ctx.postMessage({ type: 'componentsLoaded', payload: { components: [], errors: 0 } });
      return;
    }

    const componentsDir = path.join(workspaceRoot, '.github', 'aicc', 'components');
    const jsonPattern = new vscode.RelativePattern(componentsDir, '*.component.json');
    const yamlPattern = new vscode.RelativePattern(componentsDir, '*.yaml');
    const jsonFiles = await vscode.workspace.findFiles(jsonPattern);
    const yamlFiles = await vscode.workspace.findFiles(yamlPattern);

    // Prefer JSON; fall back to YAML for components without a JSON file
    const jsonBaseNames = new Set(jsonFiles.map(f => path.basename(f.fsPath, '.component.json')));
    const files: Array<{ uri: vscode.Uri; format: 'json' | 'yaml' }> = [
      ...jsonFiles.map(uri => ({ uri, format: 'json' as const })),
      ...yamlFiles
        .filter(f => !jsonBaseNames.has(path.basename(f.fsPath, '.yaml')))
        .map(uri => ({ uri, format: 'yaml' as const })),
    ];

    const components: ParsedComponent[] = [];
    let errorCount = 0;

    for (const { uri: fileUri, format } of files) {
      try {
        const content = await vscode.workspace.fs.readFile(fileUri);
        const text = Buffer.from(content).toString('utf8');
        const parsed = format === 'json'
          ? JSON.parse(text) as Record<string, unknown>
          : yaml.load(text) as Record<string, unknown>;

        if (!parsed || typeof parsed !== 'object') {
          logger.warn('Component file is not an object', { file: fileUri.fsPath });
          errorCount++;
          continue;
        }

        const metadata = parsed.metadata as ComponentMetadata | undefined;
        const spec = parsed.spec as ComponentSpec | undefined;

        if (!metadata?.id || !metadata?.name) {
          logger.warn('Component file missing required metadata.id or metadata.name', { file: fileUri.fsPath });
          errorCount++;
          continue;
        }

        components.push({
          metadata: {
            id: metadata.id,
            name: metadata.name,
            description: metadata.description || '',
            category: metadata.category || 'Uncategorized',
            tags: metadata.tags || [],
            version: metadata.version || '0.0.0',
          },
          spec: {
            props: spec?.props || {},
            events: spec?.events || [],
            template: spec?.template || '',
            styles: spec?.styles || '',
            examples: spec?.examples || [],
          },
        });
      } catch (err) {
        logger.warn('Failed to parse component file', { file: fileUri.fsPath, error: String(err) });
        errorCount++;
      }
    }

    // Sort by name
    components.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

    ctx.postMessage({
      type: 'componentsLoaded',
      payload: { components, errors: errorCount },
    });

    logger.info('Component catalog loaded', { count: components.length, errors: errorCount });
  } catch (error) {
    logger.error('Error loading component catalog', { error: String(error) });
    ctx.postMessage({ type: 'componentsLoaded', payload: { components: [], errors: -1 } });
  }
}
