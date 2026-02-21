import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import type { CatalogConfig } from './config.js';
import type { InstallOptions, UpdateOptions, RemoveOptions, EvolveOptions, FolderMapping, KitStructure } from './types.js';
import { getKitPaths, loadKitStructure, ensureDirectories } from './config.js';
import { loadManifest, saveManifest, addFileToManifest, getTrackedFiles } from './manifest.js';
import { getCatalogItem, copyFiles } from './catalog-manager.js';
import {
  getGitCachePath,
  isCacheValid,
  cloneRepository,
  updateRepository,
  shouldRefresh,
  createBranch,
  commitAndPush,
  isCurrentRepository,
} from './git-operations.js';

/**
 * Install a kit
 */
export async function installKit(
  kitName: string,
  config: CatalogConfig,
  options: InstallOptions = {}
): Promise<void> {
  console.log(chalk.blue(`\n📦 Installing kit: ${kitName}`));
  
  await ensureDirectories(config);
  
  // Get catalog item
  const catalogItem = await getCatalogItem(kitName, config);
  if (!catalogItem) {
    throw new Error(`Kit "${kitName}" not found in catalog`);
  }
  
  // Safety check: prevent installing from the same repository
  const isSameRepo = await isCurrentRepository(catalogItem.structure.repo);
  if (isSameRepo) {
    throw new Error(
      `${chalk.red('⛔ Operation not allowed:')}\n` +
      `Cannot install kit "${kitName}" from the same repository.\n` +
      `This would modify the catalog manager itself and could cause conflicts.\n` +
      `Please run this operation from a different project.`
    );
  }
  
  if (catalogItem.installed && !options.force) {
    throw new Error(`Kit "${kitName}" is already installed. Use --force to reinstall.`);
  }
  
  const structure = catalogItem.structure;
  
  // Check dependencies
  if (!options.skipDependencies && structure.dependencies && structure.dependencies.length > 0) {
    console.log(chalk.cyan(`📋 Checking dependencies...`));
    for (const dep of structure.dependencies) {
      const depItem = await getCatalogItem(dep, config);
      if (!depItem || !depItem.installed) {
        console.log(chalk.yellow(`⚠️  Installing dependency: ${dep}`));
        await installKit(dep, config, { ...options, skipDependencies: true });
      } else {
        console.log(chalk.green(`✓ Dependency ${dep} already installed`));
      }
    }
  }
  
  // Get or create git cache
  const cachePath = getGitCachePath(kitName, structure.branch, config);
  
  if (!(await isCacheValid(cachePath))) {
    console.log(chalk.cyan(`📥 Cloning repository...`));
    await cloneRepository(structure.repo, structure.branch, cachePath, config);
  } else {
    console.log(chalk.cyan(`✓ Using cached repository`));
  }
  
  // Load or create manifest
  const paths = getKitPaths(kitName, config, false);
  const manifest = await loadManifest(paths.manifestPath, kitName);
  
  // Copy structure.json to .my/aicc/catalog/{{kitName}}
  const myStructurePath = path.join(config.myBasePath, kitName, 'structure.json');
  if (!config.dryRun) {
    await fs.ensureDir(path.dirname(myStructurePath));
    
    // Add lastUpdated timestamp before copying
    const updatedStructure = { ...structure, lastUpdated: new Date().toISOString() };
    await fs.writeJson(myStructurePath, updatedStructure, { spaces: 2 });
  }
  console.log(chalk.green(`✓ Copied structure configuration`));
  
  // Process folder mappings
  const mappings = Array.isArray(structure.folderMapping) 
    ? structure.folderMapping 
    : [structure.folderMapping];
  
  let totalFiles = 0;
  
  for (const mapping of mappings) {
    console.log(chalk.cyan(`📂 Processing mapping: ${mapping.source} -> ${mapping.target}`));
    
    const copiedFiles = await copyFiles(
      cachePath,
      mapping,
      config.workspaceRoot,
      config,
      (source, target) => {
        if (options.verbose) {
          console.log(chalk.gray(`   ${path.relative(config.workspaceRoot, target)}`));
        }
        addFileToManifest(manifest, source, target, mapping);
      }
    );
    
    totalFiles += copiedFiles.length;
    console.log(chalk.green(`✓ Copied ${copiedFiles.length} files`));
  }
  
  // Save manifest
  if (!config.dryRun) {
    await saveManifest(paths.manifestPath, manifest);
  }
  
  console.log(chalk.green(`\n✨ Kit "${kitName}" installed successfully!`));
  console.log(chalk.gray(`   Total files: ${totalFiles}`));
}

/**
 * Update a kit
 */
export async function updateKit(
  kitName: string,
  config: CatalogConfig,
  options: UpdateOptions = {}
): Promise<void> {
  console.log(chalk.blue(`\n🔄 Updating kit: ${kitName}`));
  
  // Get catalog item
  const catalogItem = await getCatalogItem(kitName, config);
  if (!catalogItem) {
    throw new Error(`Kit "${kitName}" not found`);
  }
  
  if (!catalogItem.installed) {
    throw new Error(`Kit "${kitName}" is not installed`);
  }
  
  // Safety check: prevent updating from the same repository
  const isSameRepo = await isCurrentRepository(catalogItem.structure.repo);
  if (isSameRepo) {
    throw new Error(
      `${chalk.red('⛔ Operation not allowed:')}\n` +
      `Cannot update kit "${kitName}" from the same repository.\n` +
      `This would modify the catalog manager itself and could cause conflicts.\n` +
      `Please run this operation from a different project.`
    );
  }
  
  const structure = catalogItem.structure;
  const cachePath = getGitCachePath(kitName, structure.branch, config);
  
  // Check if refresh is needed
  if (structure.refreshEnabled && structure.refreshInterval) {
    const needsRefresh = await shouldRefresh(cachePath, structure.refreshInterval);
    
    if (!needsRefresh && !options.force) {
      console.log(chalk.yellow(`⏭️  Refresh not needed yet (interval: ${structure.refreshInterval}s)`));
      return;
    }
  }
  
  // Update git cache
  if (await isCacheValid(cachePath)) {
    console.log(chalk.cyan(`🔄 Updating repository...`));
    await updateRepository(cachePath, config);
  } else {
    console.log(chalk.cyan(`📥 Cache invalid, cloning repository...`));
    await cloneRepository(structure.repo, structure.branch, cachePath, config);
  }
  
  // Load manifest
  const paths = getKitPaths(kitName, config, false);
  const manifest = await loadManifest(paths.manifestPath, kitName);
  
  // Process folder mappings
  const mappings = Array.isArray(structure.folderMapping) 
    ? structure.folderMapping 
    : [structure.folderMapping];
  
  let totalFiles = 0;
  
  for (const mapping of mappings) {
    console.log(chalk.cyan(`📂 Updating mapping: ${mapping.source} -> ${mapping.target}`));
    
    const copiedFiles = await copyFiles(
      cachePath,
      { ...mapping, forceReplace: options.force || mapping.forceReplace },
      config.workspaceRoot,
      config,
      (source, target) => {
        if (options.verbose) {
          console.log(chalk.gray(`   ${path.relative(config.workspaceRoot, target)}`));
        }
        addFileToManifest(manifest, source, target, mapping);
      }
    );
    
    totalFiles += copiedFiles.length;
    console.log(chalk.green(`✓ Updated ${copiedFiles.length} files`));
  }
  
  // Save manifest
  if (!config.dryRun) {
    await saveManifest(paths.manifestPath, manifest);
    
    // Update lastUpdated timestamp in structure.json
    const myStructurePath = path.join(config.myBasePath, kitName, 'structure.json');
    if (await fs.pathExists(myStructurePath)) {
      const currentStructure = await fs.readJson(myStructurePath);
      currentStructure.lastUpdated = new Date().toISOString();
      await fs.writeJson(myStructurePath, currentStructure, { spaces: 2 });
    }
  }
  
  console.log(chalk.green(`\n✨ Kit "${kitName}" updated successfully!`));
  console.log(chalk.gray(`   Total files: ${totalFiles}`));
}

/**
 * Remove a kit
 */
export async function removeKit(
  kitName: string,
  config: CatalogConfig,
  options: RemoveOptions = {}
): Promise<void> {
  console.log(chalk.blue(`\n🗑️  Removing kit: ${kitName}`));
  
  const paths = getKitPaths(kitName, config, false);
  
  if (!(await fs.pathExists(paths.manifestPath))) {
    throw new Error(`Kit "${kitName}" is not installed`);
  }
  
  // Load manifest to check the repository
  const manifest = await loadManifest(paths.manifestPath, kitName);
  
  // Try to load the structure to get repo URL for safety check
  try {
    const catalogItem = await getCatalogItem(kitName, config);
    if (catalogItem) {
      const isSameRepo = await isCurrentRepository(catalogItem.structure.repo);
      if (isSameRepo) {
        throw new Error(
          `${chalk.red('⛔ Operation not allowed:')}\n` +
          `Cannot remove kit "${kitName}" from the same repository.\n` +
          `This would delete parts of the catalog manager itself.\n` +
          `Please run this operation from a different project.`
        );
      }
    }
  } catch (err: any) {
    // If we can't check the repo (e.g., structure missing), proceed with caution
    // but only if the error is about missing catalog item
    if (!err.message.includes('not found')) {
      throw err;
    }
  }
  
  const trackedFiles = getTrackedFiles(manifest);
  
  console.log(chalk.cyan(`📋 Found ${trackedFiles.length} tracked files`));
  
  // Remove files
  let removedCount = 0;
  for (const filePath of trackedFiles) {
    if (await fs.pathExists(filePath)) {
      if (options.verbose) {
        console.log(chalk.gray(`   Removing: ${path.relative(config.workspaceRoot, filePath)}`));
      }
      
      if (!config.dryRun) {
        await fs.remove(filePath);
      }
      removedCount++;
    }
  }
  
  // Remove manifest and configuration
  if (!config.dryRun) {
    await fs.remove(path.join(config.myBasePath, kitName));
  }
  
  console.log(chalk.green(`\n✨ Kit "${kitName}" removed successfully!`));
  console.log(chalk.gray(`   Removed ${removedCount} files`));
}

/**
 * Evolve a kit (contribute changes back)
 */
export async function evolveKit(
  kitName: string,
  config: CatalogConfig,
  options: EvolveOptions = {}
): Promise<void> {
  console.log(chalk.blue(`\n🚀 Evolving kit: ${kitName}`));
  
  // Get catalog item
  const catalogItem = await getCatalogItem(kitName, config);
  if (!catalogItem) {
    throw new Error(`Kit "${kitName}" not found`);
  }
  
  if (!catalogItem.structure.evolveEnabled) {
    throw new Error(`Kit "${kitName}" does not have evolution enabled`);
  }
  
  const structure = catalogItem.structure;
  const cachePath = getGitCachePath(kitName, structure.branch, config);
  const branchName = options.branchName || `evolve-${kitName}-${Date.now()}`;
  
  // Copy cache to new branch location
  const newCachePath = getGitCachePath(kitName, branchName, config);
  console.log(chalk.cyan(`📋 Copying cache to new branch location...`));
  
  if (!config.dryRun) {
    await fs.copy(cachePath, newCachePath);
  }
  
  // Create new branch
  console.log(chalk.cyan(`🌿 Creating branch: ${branchName}`));
  await createBranch(newCachePath, branchName, config);
  
  // Copy modified files from .my/ to cache (excluding .my/aicc/catalog)
  const myPath = path.join(config.workspaceRoot, '.my');
  const myFiles = await fs.readdir(myPath, { recursive: true, withFileTypes: true });
  
  let copiedCount = 0;
  for (const file of myFiles) {
    if (file.isDirectory()) continue;
    
    const relativePath = path.relative(myPath, file.name);
    
    // Skip .my/aicc/catalog folder
    if (relativePath.startsWith('aicc/catalog') || relativePath.startsWith('aicc\\catalog')) {
      continue;
    }
    
    const sourcePath = path.join(myPath, file.name);
    const targetPath = path.join(newCachePath, '.github', relativePath);
    
    if (options.verbose) {
      console.log(chalk.gray(`   Copying: ${relativePath}`));
    }
    
    if (!config.dryRun) {
      await fs.ensureDir(path.dirname(targetPath));
      await fs.copy(sourcePath, targetPath);
    }
    copiedCount++;
  }
  
  console.log(chalk.green(`✓ Copied ${copiedCount} modified files`));
  
  // Commit and push
  const commitMessage = options.commitMessage || `Evolve ${kitName}: Community contributions`;
  console.log(chalk.cyan(`💾 Committing changes...`));
  await commitAndPush(newCachePath, commitMessage, branchName, config);
  
  console.log(chalk.green(`\n✨ Kit "${kitName}" evolved successfully!`));
  console.log(chalk.gray(`   Branch: ${branchName}`));
  
  if (options.createPR) {
    console.log(chalk.yellow(`\n⚠️  Create pull request manually at:`));
    console.log(chalk.cyan(`   ${structure.repo}/compare/${structure.branch}...${branchName}`));
  }
}
