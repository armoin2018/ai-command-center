/**
 * Multi-source content retrieval
 * Supports files, folders, Git repos, URLs, Confluence, Jira
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';

export interface FileEntry {
  path: string;
  type: 'file' | 'folder' | 'git' | 'url' | 'confluence' | 'jira';
  content?: Buffer;
  timestamp?: string;
}

export interface RetrieveOptions {
  depth?: number;
  includeGit?: boolean;
  includeUrls?: boolean;
}

export async function retrieveContent(
  source: string,
  options: RetrieveOptions = {}
): Promise<FileEntry[]> {
  const { depth = 1, includeGit = false, includeUrls = false } = options;

  // Detect source type
  if (source.startsWith('http://') || source.startsWith('https://')) {
    if (source.includes('github.com') && includeGit) {
      return retrieveFromGit(source);
    } else if (includeUrls) {
      return retrieveFromUrl(source);
    }
  }

  if (source.startsWith('confluence://')) {
    return retrieveFromConfluence(source);
  }

  if (source.startsWith('jira://')) {
    return retrieveFromJira(source);
  }

  // Local file or folder
  return retrieveFromFileSystem(source, depth);
}

async function retrieveFromFileSystem(
  source: string,
  depth: number
): Promise<FileEntry[]> {
  const stats = await fs.stat(source);

  if (stats.isFile()) {
    const content = await fs.readFile(source);
    return [{
      path: source,
      type: 'file',
      content,
      timestamp: stats.mtime.toISOString()
    }];
  }

  // Directory - use glob with depth
  const pattern = depth === 1 
    ? path.join(source, '*')
    : path.join(source, '**/*');

  const files = await glob(pattern, {
    nodir: true,
    maxDepth: depth
  });

  const entries: FileEntry[] = [];
  for (const file of files) {
    const stats = await fs.stat(file);
    const content = await fs.readFile(file);
    entries.push({
      path: file,
      type: 'file',
      content,
      timestamp: stats.mtime.toISOString()
    });
  }

  return entries;
}

async function retrieveFromGit(url: string): Promise<FileEntry[]> {
  // TODO: Implement git clone and file retrieval
  console.warn('Git repository support not yet implemented');
  return [];
}

async function retrieveFromUrl(url: string): Promise<FileEntry[]> {
  // TODO: Implement URL fetch
  console.warn('URL retrieval not yet implemented');
  return [];
}

async function retrieveFromConfluence(uri: string): Promise<FileEntry[]> {
  // TODO: Integrate with ailey-confluence skill
  console.warn('Confluence integration not yet implemented');
  return [];
}

async function retrieveFromJira(uri: string): Promise<FileEntry[]> {
  // TODO: Integrate with ailey-jira skill
  console.warn('Jira integration not yet implemented');
  return [];
}
