import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';
import type { KitManifest, ManifestEntry, FolderMapping } from './types.js';

/**
 * Create or load a kit manifest
 */
export async function loadManifest(manifestPath: string, kitName: string): Promise<KitManifest> {
  if (await fs.pathExists(manifestPath)) {
    return await fs.readJSON(manifestPath);
  }
  
  return {
    kitName,
    version: '1.0.0',
    installedAt: Date.now(),
    updatedAt: Date.now(),
    files: [],
  };
}

/**
 * Save kit manifest
 */
export async function saveManifest(manifestPath: string, manifest: KitManifest): Promise<void> {
  await fs.ensureDir(path.dirname(manifestPath));
  manifest.updatedAt = Date.now();
  await fs.writeJSON(manifestPath, manifest, { spaces: 2 });
}

/**
 * Add file entry to manifest
 */
export function addFileToManifest(
  manifest: KitManifest,
  source: string,
  target: string,
  mapping: FolderMapping
): void {
  const hash = generateFileHash(target);
  
  // Remove existing entry if present
  manifest.files = manifest.files.filter(f => f.target !== target);
  
  // Add new entry
  manifest.files.push({
    source,
    target,
    hash,
    timestamp: Date.now(),
    mapping,
  });
}

/**
 * Remove file entry from manifest
 */
export function removeFileFromManifest(manifest: KitManifest, target: string): void {
  manifest.files = manifest.files.filter(f => f.target !== target);
}

/**
 * Get all files tracked in manifest
 */
export function getTrackedFiles(manifest: KitManifest): string[] {
  return manifest.files.map(f => f.target);
}

/**
 * Check if file has been modified since installation
 */
export async function isFileModified(entry: ManifestEntry): Promise<boolean> {
  try {
    if (!(await fs.pathExists(entry.target))) {
      return true; // File was deleted
    }
    
    const currentHash = generateFileHash(entry.target);
    return currentHash !== entry.hash;
  } catch {
    return true;
  }
}

/**
 * Generate SHA-256 hash of file content
 */
export function generateFileHash(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } catch {
    return '';
  }
}

/**
 * Get modified files in manifest
 */
export async function getModifiedFiles(manifest: KitManifest): Promise<ManifestEntry[]> {
  const modified: ManifestEntry[] = [];
  
  for (const entry of manifest.files) {
    if (await isFileModified(entry)) {
      modified.push(entry);
    }
  }
  
  return modified;
}

/**
 * Clean up orphaned entries (files that no longer exist in target)
 */
export async function cleanupOrphanedEntries(manifest: KitManifest): Promise<void> {
  const validFiles: ManifestEntry[] = [];
  
  for (const entry of manifest.files) {
    if (await fs.pathExists(entry.target)) {
      validFiles.push(entry);
    }
  }
  
  manifest.files = validFiles;
}
