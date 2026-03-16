/**
 * AI Kit Handlers for the Secondary Panel
 * Manages AI Kit catalog browsing, settings, configuration, components, and installation.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { HandlerContext } from './types';
import { Logger } from '../../logger';

const logger = Logger.getInstance();

/** Handle install AI Kit */
export async function handleInstallKit(_ctx: HandlerContext, payload: { kitId: string }): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.installAIKit', payload.kitId);
    } catch (error) {
      logger.error('Error installing AI Kit', { error: String(error) });
    }
}

/** Handle uninstall AI Kit */
export async function handleUninstallKit(_ctx: HandlerContext, payload: { kitId: string }): Promise<void> {
    try {
      await vscode.commands.executeCommand('aicc.uninstallAIKit', payload.kitId);
    } catch (error) {
      logger.error('Error uninstalling AI Kit', { error: String(error) });
    }
}

/** Handle load AI Kits - fetches available kits from selected repository */
export async function handleLoadAIKits(ctx: HandlerContext): Promise<void> {
    try {
      const kits = await vscode.commands.executeCommand('aicc.loadAIKits');
      ctx.postMessage({ type: 'aiKitsLoaded', payload: { kits: kits || [] } });
    } catch (error) {
      logger.error('Error loading AI Kits', { error: String(error) });
      ctx.postMessage({ type: 'error', payload: { message: `Failed to load AI Kits: ${error}` } });
    }
}

/** Handle fetch data for AI Kit catalog */
export async function handleFetchData(ctx: HandlerContext, payload: { endpoint: string; params?: Record<string, unknown> }): Promise<void> {
    logger.info('_handleFetchData called', { endpoint: payload.endpoint, params: payload.params });
    try {
      const { endpoint, params } = payload;
      
      switch (endpoint) {
        case 'aikit-catalog':
          logger.info('Fetching AI Kit catalog');
          await fetchAIKitCatalog(ctx);
          break;
          
        case 'aikit-settings':
          logger.info('Fetching AI Kit settings', { kitName: params?.kitName });
          await fetchAIKitSettings(ctx, params?.kitName as string);
          break;
          
        case 'aikit-configuration':
          logger.info('Fetching AI Kit configuration', { kitName: params?.kitName });
          await fetchAIKitConfiguration(ctx, params?.kitName as string);
          break;
          
        case 'aikit-components':
          logger.info('Fetching AI Kit components', { kitName: params?.kitName });
          await fetchAIKitComponents(ctx, params?.kitName as string);
          break;
          
        default:
          logger.warn(`Unknown fetch endpoint: ${endpoint}`);
      }
    } catch (error) {
      logger.error('Error fetching data', { error: String(error), endpoint: payload.endpoint });
      ctx.postMessage({ type: 'error', payload: { message: `Failed to fetch data: ${error}` } });
    }
}

/** Fetch AI Kit catalog */
export async function fetchAIKitCatalog(ctx: HandlerContext): Promise<void> {
    logger.info('fetchAIKitCatalog started');
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        logger.error('No workspace folder open');
        throw new Error('No workspace folder open');
      }
      
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const catalogPath = path.join(workspaceRoot, '.github', 'aicc', 'catalog');
      logger.info('Catalog path', { catalogPath });
      
      const kits: any[] = [];
      
      if (fsSync.existsSync(catalogPath)) {
        const kitFolders = await fs.readdir(catalogPath);
        logger.info('Found kit folders', { count: kitFolders.length, folders: kitFolders });
        
        for (const kitFolder of kitFolders) {
          const kitPath = path.join(catalogPath, kitFolder);
          const stats = await fs.stat(kitPath);
          
          if (stats.isDirectory()) {
            logger.info('Processing kit folder', { folder: kitFolder });
            const structurePath = path.join(kitPath, 'structure.json');
            
            if (fsSync.existsSync(structurePath)) {
              const structureData = await fs.readFile(structurePath, 'utf-8');
              const structure = JSON.parse(structureData);
              logger.info('Loaded structure', { name: structure.name || kitFolder });
              
              // Load icon as base64
              let iconBase64 = null;
              if (structure.icon) {
                const iconPath = path.join(kitPath, structure.icon);
                if (fsSync.existsSync(iconPath)) {
                  const iconBuffer = await fs.readFile(iconPath);
                  const ext = path.extname(structure.icon).toLowerCase();
                  const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/svg+xml';
                  iconBase64 = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
                  logger.info('Icon loaded', { kit: kitFolder, size: iconBuffer.length });
                }
              }
              
              // Check if installed (exists under .my/)
              const myStructurePath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', kitFolder, 'structure.json');
              const installed = fsSync.existsSync(myStructurePath);

              // Kits found in .github/aicc/catalog/ are default (ship with the extension)
              const isDefault = true;

              // Check for bootstrap error marker
              const errorMarkerPath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', kitFolder, '.bootstrap-error');
              const hasError = fsSync.existsSync(errorMarkerPath);

              // Determine install status for UI border colour
              // blue = default installed, green = user installed, white = not installed, red = error
              let installStatus: 'default' | 'installed' | 'not-installed' | 'error' = 'not-installed';
              if (hasError) {
                installStatus = 'error';
              } else if (installed && isDefault) {
                installStatus = 'default';
              } else if (installed) {
                installStatus = 'installed';
              }

              kits.push({
                name: structure.name || kitFolder,
                displayName: structure.displayName || structure.name || kitFolder,
                description: structure.description || '',
                author: structure.author || '',
                lastUpdated: structure.lastUpdated || null,
                iconBase64,
                installed,
                isDefault,
                installStatus
              });
              logger.info('Kit added to catalog', { name: structure.name || kitFolder, installed, installStatus });
            } else {
              logger.warn('structure.json not found', { folder: kitFolder });
            }
          }
        }
      } else {
        logger.warn('Catalog path does not exist', { catalogPath });
      }
      
      logger.info('Sending catalog to webview', { kitCount: kits.length });
      ctx.postMessage({ type: 'aikitCatalog', payload: { kits } });
      logger.info('Catalog message sent to webview');
    } catch (error) {
      logger.error('Error fetching AI Kit catalog', { error: String(error), stack: error instanceof Error ? error.stack : undefined });
      throw error;
    }
}

/** Fetch AI Kit settings */
export async function fetchAIKitSettings(ctx: HandlerContext, kitName: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open');
      }
      
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      
      // Load base structure from .github/
      const basePath = path.join(workspaceRoot, '.github', 'aicc', 'catalog', kitName, 'structure.json');
      let baseStructure: Record<string, any> = {};
      if (fsSync.existsSync(basePath)) {
        const baseData = await fs.readFile(basePath, 'utf-8');
        baseStructure = JSON.parse(baseData);
      }
      
      // Load user override from .my/ (installed kits)
      const myStructurePath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', kitName, 'structure.json');
      let myStructure: Record<string, any> = {};
      const installed = fsSync.existsSync(myStructurePath);
      if (installed) {
        const myData = await fs.readFile(myStructurePath, 'utf-8');
        myStructure = JSON.parse(myData);
      }
      
      // Merge: .my/ overrides .github/ values
      const merged = { ...baseStructure, ...myStructure };
      
      // Load schema for reference
      const schemaPath = path.join(workspaceRoot, '.github', 'aicc', 'schemas', 'structure.v1.schema.json');
      let schema: Record<string, any> = { properties: {} };
      if (fsSync.existsSync(schemaPath)) {
        const schemaData = await fs.readFile(schemaPath, 'utf-8');
        schema = JSON.parse(schemaData);
      }
      
      // Build top-level editable properties from the schema
      // These are the structure.json root-level fields the user can edit
      const topLevelFields: any[] = [];
      if (schema.properties) {
        const orderedProps = Object.entries(schema.properties)
          .map(([key, prop]: [string, any]) => ({ key, ...prop }))
          .filter(p => !p['x-hidden'])
          .sort((a, b) => (a['x-ui-order'] ?? 999) - (b['x-ui-order'] ?? 999));
        
        for (const prop of orderedProps) {
          const isReadonly = prop['x-readonly'] === true;
          const fieldType = resolveSchemaFieldType(prop);
          topLevelFields.push({
            name: prop.key,
            label: prop.description || prop.key,
            type: fieldType,
            value: merged[prop.key] ?? prop.default ?? '',
            readonly: isReadonly,
            group: prop['x-ui-group'] || null
          });
        }
      }
      
      // Extract configuration.fields from structure.json
      const baseConfigFields: any[] = baseStructure.configuration?.fields || [];
      const myConfigFields: any[] = myStructure.configuration?.fields || [];
      
      // Merge configuration field values: .my/ values override base defaults
      const myConfigValues: Record<string, any> = {};
      for (const f of myConfigFields) {
        myConfigValues[f.name] = f.value;
      }
      
      const configFields = baseConfigFields.map((field: any) => ({
        ...field,
        value: myConfigValues[field.name] ?? field.value ?? field.defaultValue ?? ''
      }));
      
      ctx.postMessage({
        type: 'aikitSettings',
        payload: {
          kitName,
          settings: {
            schema,
            values: merged,
            installed,
            topLevelFields,
            configFields
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching AI Kit settings', { error: String(error), kitName });
      throw error;
    }
}

/** Resolve a JSON Schema property type to a form field type */
function resolveSchemaFieldType(prop: Record<string, any>): string {
    if (prop.type === 'boolean') return 'toggle';
    if (prop.type === 'number' || prop.type === 'integer') return 'number';
    if (prop.enum) return 'select';
    if (Array.isArray(prop.type)) {
      // e.g. ["string", "number"] — use text
      if (prop.type.includes('boolean')) return 'toggle';
      if (prop.type.includes('number') || prop.type.includes('integer')) return 'number';
    }
    return 'text';
}

/** Fetch AI Kit configuration */
export async function fetchAIKitConfiguration(ctx: HandlerContext, kitName: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open');
      }
      
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      
      // Load configuration from structure.json's configuration key
      const structurePath = path.join(workspaceRoot, '.github', 'aicc', 'catalog', kitName, 'structure.json');
      let configFields: any[] = [];
      let configActions: any[] = [];
      let configSchema: any = { properties: {} };
      
      if (fsSync.existsSync(structurePath)) {
        const structureData = await fs.readFile(structurePath, 'utf-8');
        const structure = JSON.parse(structureData);
        
        if (structure.configuration) {
          configFields = structure.configuration.fields || [];
          configActions = structure.configuration.actions || [];
        }
      }
      
      // Fallback: also check for legacy config.json
      const configPath = path.join(workspaceRoot, '.github', 'aicc', 'catalog', kitName, 'config.json');
      if (configFields.length === 0 && fsSync.existsSync(configPath)) {
        const configData = await fs.readFile(configPath, 'utf-8');
        configSchema = JSON.parse(configData);
      }
      
      // Load saved values from user override
      const configSavePath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', kitName, 'config.save.json');
      let configValues: Record<string, any> = {};
      if (fsSync.existsSync(configSavePath)) {
        const configData = await fs.readFile(configSavePath, 'utf-8');
        configValues = JSON.parse(configData);
      }
      
      // Merge default values from fields with saved values
      const mergedValues: Record<string, any> = {};
      for (const field of configFields) {
        const defaultVal = field.value ?? field.defaultValue ?? '';
        mergedValues[field.name] = configValues[field.name] ?? defaultVal;
      }
      
      // Load bundles from structure.json
      let bundles: any[] = [];
      if (fsSync.existsSync(structurePath)) {
        const structureData = await fs.readFile(structurePath, 'utf-8');
        const structure = JSON.parse(structureData);
        bundles = structure.bundles || [];
        
        // Merge user bundle overrides
        const bundleOverridePath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', kitName, 'bundles.json');
        if (fsSync.existsSync(bundleOverridePath)) {
          const overrideData = await fs.readFile(bundleOverridePath, 'utf-8');
          const overrides = JSON.parse(overrideData);
          bundles = bundles.map((b: any) => ({
            ...b,
            enabled: overrides[b.name] !== undefined ? overrides[b.name] : b.enabled
          }));
        }
      }
      
      ctx.postMessage({
        type: 'aikitConfiguration',
        payload: {
          kitName,
          config: {
            fields: configFields,
            actions: configActions,
            values: mergedValues,
            bundles,
            // Legacy fallback
            schema: configSchema
          }
        }
      });
    } catch (error) {
      logger.error('Error fetching AI Kit configuration', { error: String(error), kitName });
      throw error;
    }
}

/** Fetch AI Kit bundles (formerly components) from structure.json */
export async function fetchAIKitComponents(ctx: HandlerContext, kitName: string): Promise<void> {
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open');
      }
      
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      
      // Load bundles from structure.json
      const structurePath = path.join(workspaceRoot, '.github', 'aicc', 'catalog', kitName, 'structure.json');
      let bundles: any[] = [];
      if (fsSync.existsSync(structurePath)) {
        const structureData = await fs.readFile(structurePath, 'utf-8');
        const structure = JSON.parse(structureData);
        bundles = structure.bundles || [];
      }
      
      // Merge user overrides from .my/aicc/catalog/{kitName}/structure.json
      const myStructurePath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', kitName, 'structure.json');
      if (fsSync.existsSync(myStructurePath)) {
        const myStructureData = await fs.readFile(myStructurePath, 'utf-8');
        const myStructure = JSON.parse(myStructureData);
        if (myStructure.bundles && Array.isArray(myStructure.bundles)) {
          // Build a map of user overrides by bundle name
          const overrideMap: Record<string, any> = {};
          for (const b of myStructure.bundles) {
            overrideMap[b.name] = b;
          }
          // Merge: user override takes precedence for enabled flag
          bundles = bundles.map((b: any) => ({
            ...b,
            enabled: overrideMap[b.name] !== undefined ? overrideMap[b.name].enabled : b.enabled
          }));
        }
      }
      
      ctx.postMessage({ type: 'aikitComponents', payload: { kitName, bundles } });
    } catch (error) {
      logger.error('Error fetching AI Kit bundles', { error: String(error), kitName });
      throw error;
    }
}

/** Handle save kit settings */
export async function handleSaveKitSettings(ctx: HandlerContext, payload: {
    kitName: string;
    settings: Record<string, unknown>;
    config: Record<string, unknown>;
    configFieldValues?: Record<string, unknown>;
    componentChanges: Record<string, boolean>;
    bundleChanges?: Record<string, boolean>;
}): Promise<void> {
    try {
      const fs = require('fs').promises;
      const fsSync = require('fs');
      
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open');
      }
      
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const myKitPath = path.join(workspaceRoot, '.my', 'aicc', 'catalog', payload.kitName);
      
      if (!fsSync.existsSync(myKitPath)) {
        fsSync.mkdirSync(myKitPath, { recursive: true });
      }
      
      // Save settings (top-level structure.json properties + configuration.fields)
      const myStructurePath = path.join(myKitPath, 'structure.json');
      let existingStructure: Record<string, any> = {};
      if (fsSync.existsSync(myStructurePath)) {
        const existingData = await fs.readFile(myStructurePath, 'utf-8');
        existingStructure = JSON.parse(existingData);
      }
      
      // Merge top-level editable properties
      if (payload.settings && Object.keys(payload.settings).length > 0) {
        Object.assign(existingStructure, payload.settings);
      }
      
      // Merge configuration field values into structure.json's configuration.fields
      if (payload.configFieldValues && Object.keys(payload.configFieldValues).length > 0) {
        // Load base configuration fields from .github/ to preserve full field definitions
        const basePath = path.join(workspaceRoot, '.github', 'aicc', 'catalog', payload.kitName, 'structure.json');
        let baseConfigFields: any[] = [];
        if (fsSync.existsSync(basePath)) {
          const baseData = await fs.readFile(basePath, 'utf-8');
          const baseStructure = JSON.parse(baseData);
          baseConfigFields = baseStructure.configuration?.fields || [];
        }
        
        // Build updated fields list with user values
        const updatedFields = baseConfigFields.map((field: any) => {
          const userVal = (payload.configFieldValues as Record<string, unknown>)[field.name];
          if (userVal !== undefined) {
            return { ...field, value: userVal };
          }
          return field;
        });
        
        if (!existingStructure.configuration) {
          existingStructure.configuration = {};
        }
        existingStructure.configuration.fields = updatedFields;
      }
      
      existingStructure.lastUpdated = new Date().toISOString();
      await fs.writeFile(myStructurePath, JSON.stringify(existingStructure, null, 2), 'utf-8');
      
      // Save configuration (config.save.json)
      if (payload.config && Object.keys(payload.config).length > 0) {
        const configSavePath = path.join(myKitPath, 'config.save.json');
        await fs.writeFile(configSavePath, JSON.stringify(payload.config, null, 2), 'utf-8');
      }
      
      // Handle bundle changes - write to .my/aicc/catalog/{kitName}/structure.json
      // and trigger aicc-admin-catalog skill to add/remove bundle asset files
      if (payload.bundleChanges && Object.keys(payload.bundleChanges).length > 0) {
        const myStructurePath = path.join(myKitPath, 'structure.json');
        let myStructure: Record<string, any> = {};
        if (fsSync.existsSync(myStructurePath)) {
          const myData = await fs.readFile(myStructurePath, 'utf-8');
          myStructure = JSON.parse(myData);
        }
        
        // Load base bundles from .github/aicc/catalog/{kitName}/structure.json
        const basePath = path.join(workspaceRoot, '.github', 'aicc', 'catalog', payload.kitName, 'structure.json');
        let baseBundles: any[] = [];
        if (fsSync.existsSync(basePath)) {
          const baseData = await fs.readFile(basePath, 'utf-8');
          const baseStructure = JSON.parse(baseData);
          baseBundles = baseStructure.bundles || [];
        }
        
        // Merge: start from existing user bundles or base bundles
        const existingBundles: any[] = myStructure.bundles || baseBundles.map((b: any) => ({ name: b.name, enabled: b.enabled }));
        
        // Apply changes
        const updatedBundles = existingBundles.map((b: any) => {
          if (payload.bundleChanges![b.name] !== undefined) {
            return { ...b, enabled: payload.bundleChanges![b.name] };
          }
          return b;
        });
        
        myStructure.bundles = updatedBundles;
        myStructure.lastUpdated = new Date().toISOString();
        
        await fs.writeFile(myStructurePath, JSON.stringify(myStructure, null, 2), 'utf-8');
        
        // Trigger aicc-admin-catalog skill to add/remove bundle asset files
        for (const [bundleName, enabled] of Object.entries(payload.bundleChanges)) {
          // Find the bundle in baseBundles to get asset list
          const bundle = baseBundles.find((b: any) => b.name === bundleName);
          if (!bundle || !bundle.assets || bundle.assets.length === 0) {
            continue;
          }
          
          const action = enabled ? 'install' : 'remove';
          logger.info(`Bundle ${action}: ${bundleName}`, { kitName: payload.kitName, assets: bundle.assets });
          
          // Execute the catalog skill command via terminal
          const skillDir = path.join(workspaceRoot, '.github', 'skills', 'aicc-admin-catalog');
          if (fsSync.existsSync(skillDir)) {
            const terminal = vscode.window.createTerminal({
              name: `Bundle ${action}: ${bundleName}`,
              cwd: workspaceRoot
            });
            terminal.sendText(`npm run catalog ${action} ${payload.kitName} --verbose`);
            terminal.show(true);
          }
        }
      }
      
      // Handle component changes (legacy)
      if (payload.componentChanges && Object.keys(payload.componentChanges).length > 0) {
        const installedPath = path.join(myKitPath, 'components.installed.json');
        let installed: string[] = [];
        if (fsSync.existsSync(installedPath)) {
          const installedData = await fs.readFile(installedPath, 'utf-8');
          installed = JSON.parse(installedData);
        }
        
        for (const [component, enabled] of Object.entries(payload.componentChanges)) {
          if (enabled && !installed.includes(component)) {
            installed.push(component);
          } else if (!enabled && installed.includes(component)) {
            installed = installed.filter(c => c !== component);
          }
        }
        
        await fs.writeFile(installedPath, JSON.stringify(installed, null, 2), 'utf-8');
      }
      
      logger.info('Kit settings saved', { kitName: payload.kitName });
      ctx.postMessage({ type: 'success', payload: { message: 'Settings saved successfully' } });
      
      // Refresh catalog
      await fetchAIKitCatalog(ctx);
    } catch (error) {
      logger.error('Error saving kit settings', { error: String(error), kitName: payload.kitName });
      ctx.postMessage({ type: 'error', payload: { message: `Failed to save settings: ${error}` } });
    }
}
