/**
 * Fix YAML Command
 * 
 * Automatically fixes common YAML frontmatter errors in AI-ley resources
 */

import { readFile, writeFile } from 'fs/promises';
import { glob } from 'glob';
import chalk from 'chalk';
import { fixYamlFrontmatter, YamlFixResult } from '../../lib/yaml-fixer.js';

export interface FixYamlOptions {
  dryRun?: boolean;
  verbose?: boolean;
  target?: string;
}

interface FixStats {
  total: number;
  fixed: number;
  failed: number;
  unchanged: number;
  changes: number;
}

export async function fixYaml(
  targetPath: string,
  options: FixYamlOptions = {}
): Promise<void> {
  const { dryRun = false, verbose = false } = options;

  console.log(chalk.bold.cyan('\n🔧 AI-ley YAML Frontmatter Fixer\n'));

  if (dryRun) {
    console.log(chalk.yellow('⚠️  DRY RUN MODE - No files will be modified\n'));
  }

  // Determine file pattern based on target
  const pattern = getFilePattern(targetPath);
  
  if (verbose) {
    console.log(chalk.gray(`Pattern: ${pattern}\n`));
  }

  // Find files
  const files = await glob(pattern, { 
    cwd: process.cwd(),
    absolute: true,
    ignore: ['**/node_modules/**', '**/.git/**']
  });

  if (files.length === 0) {
    console.log(chalk.yellow(`⚠️  No files found matching pattern: ${pattern}`));
    return;
  }

  console.log(chalk.cyan(`Found ${files.length} files to process\n`));

  const stats: FixStats = {
    total: files.length,
    fixed: 0,
    failed: 0,
    unchanged: 0,
    changes: 0,
  };

  // Process each file
  for (const filePath of files) {
    await processFile(filePath, dryRun, verbose, stats);
  }

  // Display summary
  displaySummary(stats, dryRun);
}

/**
 * Get glob pattern based on target path
 */
function getFilePattern(target: string): string {
  // Check if it's a specific file
  if (target.endsWith('.md')) {
    return target;
  }

  // Map target types to patterns
  const patterns: Record<string, string> = {
    instructions: '../../../.github/ai-ley/instructions/**/*.instructions.md',
    personas: '../../../.github/ai-ley/personas/**/*.persona.md',
    prompts: '../../../.github/prompts/**/*.prompt.md',
    agents: '../../../.github/agents/**/*.agent.md',
    skills: '../../../.github/skills/**/SKILL.md',
    all: '../../../.github/**/*.md',
  };

  return patterns[target] || target;
}

/**
 * Process a single file
 */
async function processFile(
  filePath: string,
  dryRun: boolean,
  verbose: boolean,
  stats: FixStats
): Promise<void> {
  try {
    // Read file content
    const content = await readFile(filePath, 'utf-8');

    // Fix YAML frontmatter
    const result: YamlFixResult = fixYamlFrontmatter(content);

    if (!result.success) {
      stats.failed++;
      console.log(chalk.red(`✗ ${getRelativePath(filePath)}`));
      if (verbose && result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(chalk.red(`  Error: ${error}`));
        });
      }
      return;
    }

    if (!result.fixed) {
      stats.unchanged++;
      if (verbose) {
        console.log(chalk.gray(`○ ${getRelativePath(filePath)} - No changes needed`));
      }
      return;
    }

    // File has fixes
    stats.fixed++;
    stats.changes += result.changes.length;

    console.log(chalk.green(`✓ ${getRelativePath(filePath)}`));
    
    if (verbose) {
      result.changes.forEach(change => {
        console.log(chalk.gray(`  • ${change}`));
      });
    }

    // Write fixed content (unless dry run)
    if (!dryRun && result.fixedContent) {
      await writeFile(filePath, result.fixedContent, 'utf-8');
    }

  } catch (error) {
    stats.failed++;
    console.log(chalk.red(`✗ ${getRelativePath(filePath)}`));
    if (verbose) {
      console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
}

/**
 * Get relative path for display
 */
function getRelativePath(absolutePath: string): string {
  const parts = absolutePath.split('/');
  const githubIndex = parts.indexOf('.github');
  
  if (githubIndex !== -1) {
    return parts.slice(githubIndex).join('/');
  }
  
  return parts.slice(-3).join('/');
}

/**
 * Display summary statistics
 */
function displaySummary(stats: FixStats, dryRun: boolean): void {
  console.log(chalk.bold.cyan('\n📊 Summary\n'));
  
  console.log(chalk.white(`Total files:     ${stats.total}`));
  console.log(chalk.green(`Fixed:           ${stats.fixed}`));
  console.log(chalk.gray(`Unchanged:       ${stats.unchanged}`));
  console.log(chalk.red(`Failed:          ${stats.failed}`));
  console.log(chalk.cyan(`Total changes:   ${stats.changes}`));

  if (stats.fixed > 0) {
    const percentage = ((stats.fixed / stats.total) * 100).toFixed(1);
    console.log(chalk.green(`\n✅ Success rate: ${percentage}%`));
  }

  if (dryRun && stats.fixed > 0) {
    console.log(chalk.yellow('\n⚠️  Changes previewed but NOT applied (dry run mode)'));
    console.log(chalk.gray('Run without --dry-run to apply fixes\n'));
  } else if (stats.fixed > 0) {
    console.log(chalk.green(`\n✅ ${stats.fixed} file(s) successfully fixed!\n`));
  } else {
    console.log(chalk.gray('\n✓ All files already have valid YAML frontmatter\n'));
  }

  if (stats.failed > 0) {
    console.log(chalk.yellow(`⚠️  ${stats.failed} file(s) could not be processed`));
    console.log(chalk.gray('Run with --verbose to see error details\n'));
  }
}
