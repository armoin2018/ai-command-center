import path from 'path';
import fs from 'fs-extra';
import simpleGit, { SimpleGit, GitError } from 'simple-git';
import type { CatalogConfig } from './config.js';
import type { RetryOptions, GitOperationResult } from './types.js';

/**
 * Get the current repository URL (normalized)
 * Returns null if not in a git repository
 */
export async function getCurrentRepositoryUrl(): Promise<string | null> {
  try {
    const git: SimpleGit = simpleGit();
    const remotes = await git.getRemotes(true);
    
    if (remotes.length === 0) {
      return null;
    }
    
    // Get origin remote URL, or first remote if origin doesn't exist
    const origin = remotes.find((r: any) => r.name === 'origin') || remotes[0];
    if (!origin || !origin.refs || !origin.refs.fetch) {
      return null;
    }
    
    // Normalize the URL (convert SSH to HTTPS format for comparison)
    return normalizeGitUrl(origin.refs.fetch);
  } catch {
    return null;
  }
}

/**
 * Normalize git URL for comparison
 * Converts both SSH and HTTPS URLs to a standard format
 */
export function normalizeGitUrl(url: string): string {
  // Remove trailing .git
  let normalized = url.replace(/\.git$/, '');
  
  // Convert SSH format (git@github.com:user/repo) to HTTPS format
  normalized = normalized.replace(/^git@([^:]+):/, 'https://$1/');
  
  // Remove protocol for comparison
  normalized = normalized.replace(/^https?:\/\//, '');
  normalized = normalized.replace(/^ssh:\/\//, '');
  normalized = normalized.replace(/^git:\/\//, '');
  
  // Convert to lowercase for case-insensitive comparison
  return normalized.toLowerCase();
}

/**
 * Check if the kit repository matches the current repository
 */
export async function isCurrentRepository(kitRepoUrl: string): Promise<boolean> {
  const currentRepo = await getCurrentRepositoryUrl();
  if (!currentRepo) {
    return false;
  }
  
  const normalizedKitRepo = normalizeGitUrl(kitRepoUrl);
  return currentRepo === normalizedKitRepo;
}

/**
 * Retry wrapper with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    backoffBase = 2,
    maxBackoff = 30,
    onRetry,
  } = options;

  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxAttempts) {
        const backoffTime = Math.min(
          backoffBase * Math.pow(2, attempt - 1),
          maxBackoff
        );
        
        if (onRetry) {
          onRetry(attempt, lastError);
        }
        
        await sleep(backoffTime * 1000);
      }
    }
  }
  
  throw lastError || new Error('Operation failed after retries');
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get git cache path for a kit
 */
export function getGitCachePath(kitName: string, branch: string, config: CatalogConfig): string {
  return path.join(config.gitCacheDir, `${kitName}_${branch}`);
}

/**
 * Check if git cache exists and is valid
 */
export async function isCacheValid(cachePath: string): Promise<boolean> {
  try {
    const gitDir = path.join(cachePath, '.git');
    return await fs.pathExists(gitDir);
  } catch {
    return false;
  }
}

/**
 * Clone repository to cache
 */
export async function cloneRepository(
  repoUrl: string,
  branch: string,
  cachePath: string,
  config: CatalogConfig
): Promise<GitOperationResult> {
  return retryOperation(
    async () => {
      if (config.verbose) {
        console.log(`Cloning ${repoUrl} (${branch}) to ${cachePath}...`);
      }
      
      if (config.dryRun) {
        console.log('[DRY RUN] Would clone repository');
        return { success: true };
      }
      
      await fs.ensureDir(path.dirname(cachePath));
      await fs.remove(cachePath); // Clean up any partial clones
      
      const git: SimpleGit = simpleGit();
      await git.clone(repoUrl, cachePath, ['--branch', branch, '--single-branch', '--depth', '1']);
      
      // Update lastUpdated timestamp
      const timestampFile = `${cachePath}.lastUpdated`;
      await fs.writeFile(timestampFile, Date.now().toString());
      
      return { success: true };
    },
    {
      maxAttempts: config.maxRetryAttempts,
      backoffBase: config.retryBackoffBase,
      maxBackoff: config.maxBackoffTime,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}: ${error.message}`);
      },
    }
  );
}

/**
 * Update existing git cache
 */
export async function updateRepository(
  cachePath: string,
  config: CatalogConfig
): Promise<GitOperationResult> {
  return retryOperation(
    async () => {
      if (config.verbose) {
        console.log(`Updating repository at ${cachePath}...`);
      }
      
      if (config.dryRun) {
        console.log('[DRY RUN] Would update repository');
        return { success: true };
      }
      
      const git: SimpleGit = simpleGit(cachePath);
      await git.fetch(['--depth', '1']);
      await git.reset(['--hard', 'origin/HEAD']);
      
      // Update lastUpdated timestamp
      const timestampFile = `${cachePath}.lastUpdated`;
      await fs.writeFile(timestampFile, Date.now().toString());
      
      return { success: true };
    },
    {
      maxAttempts: config.maxRetryAttempts,
      backoffBase: config.retryBackoffBase,
      maxBackoff: config.maxBackoffTime,
      onRetry: (attempt, error) => {
        console.log(`Retry ${attempt}: ${error.message}`);
      },
    }
  );
}

/**
 * Check if cache needs refresh based on interval
 */
export async function shouldRefresh(
  cachePath: string,
  refreshInterval: string | number
): Promise<boolean> {
  try {
    const timestampFile = `${cachePath}.lastUpdated`;
    
    if (!(await fs.pathExists(timestampFile))) {
      return true;
    }
    
    const lastUpdated = parseInt(await fs.readFile(timestampFile, 'utf-8'));
    const interval = typeof refreshInterval === 'string' ? parseInt(refreshInterval) : refreshInterval;
    const now = Date.now();
    
    return (now - lastUpdated) / 1000 >= interval;
  } catch {
    return true;
  }
}

/**
 * Create new branch in repository
 */
export async function createBranch(
  cachePath: string,
  branchName: string,
  config: CatalogConfig
): Promise<GitOperationResult> {
  return retryOperation(
    async () => {
      if (config.verbose) {
        console.log(`Creating branch ${branchName} in ${cachePath}...`);
      }
      
      if (config.dryRun) {
        console.log('[DRY RUN] Would create branch');
        return { success: true };
      }
      
      const git: SimpleGit = simpleGit(cachePath);
      await git.checkoutLocalBranch(branchName);
      
      return { success: true };
    },
    {
      maxAttempts: config.maxRetryAttempts,
      backoffBase: config.retryBackoffBase,
      maxBackoff: config.maxBackoffTime,
    }
  );
}

/**
 * Commit and push changes
 */
export async function commitAndPush(
  cachePath: string,
  commitMessage: string,
  branchName: string,
  config: CatalogConfig
): Promise<GitOperationResult> {
  return retryOperation(
    async () => {
      if (config.verbose) {
        console.log(`Committing and pushing to ${branchName}...`);
      }
      
      if (config.dryRun) {
        console.log('[DRY RUN] Would commit and push');
        return { success: true };
      }
      
      const git: SimpleGit = simpleGit(cachePath);
      await git.add('.');
      await git.commit(commitMessage);
      await git.push('origin', branchName, ['--set-upstream']);
      
      return { success: true };
    },
    {
      maxAttempts: config.maxRetryAttempts,
      backoffBase: config.retryBackoffBase,
      maxBackoff: config.maxBackoffTime,
    }
  );
}
