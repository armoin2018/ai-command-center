import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import type { CatalogConfig } from './config.js';
import type { CatalogItem, FilterOptions, FolderMapping } from './types.js';
import { loadKitStructure, getKitPaths, isAgenticSupported } from './config.js';

/**
 * List all catalog items
 */
export async function listCatalogItems(
  config: CatalogConfig,
  filter: FilterOptions = {}
): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  
  // Load from .github/aicc/catalog
  if (await fs.pathExists(config.catalogBasePath)) {
    const defaultKits = await fs.readdir(config.catalogBasePath);
    for (const kitName of defaultKits) {
      const paths = getKitPaths(kitName, config, false);
      if (await fs.pathExists(paths.structurePath)) {
        try {
          const structure = await loadKitStructure(paths.structurePath, config);
          const installed = await fs.pathExists(path.join(config.myBasePath, kitName));
          
          items.push({
            name: kitName,
            path: paths.kitPath,
            structure,
            installed,
            custom: false,
            manifestPath: installed ? paths.manifestPath : undefined,
            configPath: installed ? paths.configPath : undefined,
          });
        } catch (error) {
          console.error(`Error loading kit ${kitName}:`, error);
        }
      }
    }
  }
  
  // Load from .my/aicc/catalog (custom kits)
  if (await fs.pathExists(config.myBasePath)) {
    const customKits = await fs.readdir(config.myBasePath);
    for (const kitName of customKits) {
      // Skip if already in default kits
      if (items.some(item => item.name === kitName)) {
        continue;
      }
      
      const paths = getKitPaths(kitName, config, true);
      if (await fs.pathExists(paths.structurePath)) {
        try {
          const structure = await loadKitStructure(paths.structurePath, config);
          
          items.push({
            name: kitName,
            path: paths.kitPath,
            structure,
            installed: true,
            custom: true,
            manifestPath: paths.manifestPath,
            configPath: paths.configPath,
          });
        } catch (error) {
          console.error(`Error loading custom kit ${kitName}:`, error);
        }
      }
    }
  }
  
  // Apply filters
  return filterCatalogItems(items, filter);
}

/**
 * Filter catalog items
 */
function filterCatalogItems(items: CatalogItem[], filter: FilterOptions): CatalogItem[] {
  let filtered = items;
  
  if (filter.installed !== undefined) {
    filtered = filtered.filter(item => item.installed === filter.installed);
  }
  
  if (filter.custom !== undefined) {
    filtered = filtered.filter(item => item.custom === filter.custom);
  }
  
  if (filter.namePattern) {
    const pattern = new RegExp(filter.namePattern, 'i');
    filtered = filtered.filter(item => pattern.test(item.name));
  }
  
  if (filter.hasIcon !== undefined) {
    filtered = filtered.filter(item => {
      const hasIcon = !!item.structure.icon;
      return hasIcon === filter.hasIcon;
    });
  }
  
  return filtered;
}

/**
 * Get single catalog item
 */
export async function getCatalogItem(
  kitName: string,
  config: CatalogConfig
): Promise<CatalogItem | null> {
  const items = await listCatalogItems(config);
  return items.find(item => item.name === kitName) || null;
}

/**
 * Copy files based on folder mapping
 */
export async function copyFiles(
  sourcePath: string,
  mapping: FolderMapping,
  targetBase: string,
  config: CatalogConfig,
  onFile?: (source: string, target: string) => void
): Promise<string[]> {
  const copiedFiles: string[] = [];
  
  // Check if agentic system is supported
  if (!isAgenticSupported(config.agenticSystem, mapping.supportedAgentic)) {
    if (config.verbose) {
      console.log(`Skipping mapping (agentic system ${config.agenticSystem} not supported)`);
    }
    return copiedFiles;
  }
  
  const source = path.join(sourcePath, mapping.source);
  const target = path.join(targetBase, mapping.target);
  
  if (mapping.type === 'file') {
    // Copy single file
    if (await fs.pathExists(source)) {
      const targetFile = await applyRename(path.basename(source), mapping.rename);
      const targetPath = path.join(path.dirname(target), targetFile);
      
      if (!mapping.forceReplace && (await fs.pathExists(targetPath))) {
        if (config.verbose) {
          console.log(`Skipping ${targetPath} (already exists)`);
        }
        return copiedFiles;
      }
      
      if (!config.dryRun) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(source, targetPath);
      }
      
      copiedFiles.push(targetPath);
      if (onFile) {
        onFile(source, targetPath);
      }
    }
  } else if (mapping.type === 'pattern') {
    // Copy files matching pattern
    const pattern = mapping.pattern || '**/*';
    const files = await glob(pattern, {
      cwd: source,
      nodir: true,
      dot: true,
      ignore: mapping.exclude || [],
    });
    
    for (const file of files) {
      const sourcePath = path.join(source, file);
      let relativePath = file;
      
      // Apply rename if specified
      if (mapping.rename) {
        relativePath = await applyRename(file, mapping.rename);
      }
      
      // Flatten or preserve structure
      if (mapping.flattenStructure) {
        relativePath = path.basename(relativePath);
      }
      
      const targetPath = path.join(target, relativePath);
      
      if (!mapping.forceReplace && (await fs.pathExists(targetPath))) {
        if (config.verbose) {
          console.log(`Skipping ${targetPath} (already exists)`);
        }
        continue;
      }
      
      if (!config.dryRun) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
      }
      
      copiedFiles.push(targetPath);
      if (onFile) {
        onFile(sourcePath, targetPath);
      }
    }
  } else if (mapping.type === 'folder') {
    // Copy entire folder
    if (!(await fs.pathExists(source))) {
      return copiedFiles;
    }
    
    const files = await fs.readdir(source, { recursive: true, withFileTypes: true });
    
    for (const file of files) {
      if (file.isDirectory()) continue;
      
      const sourcePath = path.join(source, file.name);
      let relativePath = path.relative(source, sourcePath);
      
      // Check recursion depth
      if (mapping.recursionDepth !== undefined && mapping.recursionDepth >= 0) {
        const depth = relativePath.split(path.sep).length - 1;
        if (depth > mapping.recursionDepth) {
          continue;
        }
      }
      
      // Check exclusion patterns
      if (mapping.exclude && mapping.exclude.length > 0) {
        const shouldExclude = mapping.exclude.some(pattern => {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'));
          return regex.test(relativePath);
        });
        if (shouldExclude) {
          continue;
        }
      }
      
      // Apply rename if specified
      if (mapping.rename) {
        relativePath = await applyRename(relativePath, mapping.rename);
      }
      
      const targetPath = path.join(target, relativePath);
      
      if (!mapping.forceReplace && (await fs.pathExists(targetPath))) {
        if (config.verbose) {
          console.log(`Skipping ${targetPath} (already exists)`);
        }
        continue;
      }
      
      if (!config.dryRun) {
        await fs.ensureDir(path.dirname(targetPath));
        await fs.copy(sourcePath, targetPath);
      }
      
      copiedFiles.push(targetPath);
      if (onFile) {
        onFile(sourcePath, targetPath);
      }
    }
  }
  
  return copiedFiles;
}

/**
 * Apply rename rule to filename
 */
async function applyRename(
  filename: string,
  rename?: { pattern: string; replacement: string }
): Promise<string> {
  if (!rename) return filename;
  
  try {
    const regex = new RegExp(rename.pattern);
    return filename.replace(regex, rename.replacement);
  } catch (error) {
    console.error('Invalid rename pattern:', error);
    return filename;
  }
}
