#!/usr/bin/env node
/**
 * AI-ley Kit Optimizer CLI
 * Optimize and normalize AI-ley kit resources
 */

import { program } from 'commander';
import { glob } from 'glob';
import chalk from 'chalk';
import {
  FileProcessor,
  FrontmatterNormalizer,
  FooterNormalizer,
  CodeExtractor,
  AIReviewer,
  type ProcessingOptions,
  type OptimizationResult,
  type ResourceType
} from '../lib/index.js';

const processor = new FileProcessor();
const frontmatterNormalizer = new FrontmatterNormalizer();
const footerNormalizer = new FooterNormalizer();
const codeExtractor = new CodeExtractor();
const aiReviewer = new AIReviewer();

/**
 * Optimize a single file
 */
async function optimizeFile(
  filePath: string,
  options: ProcessingOptions
): Promise<OptimizationResult> {
  try {
    const resourceType = processor.detectResourceType(filePath);
    const baseFileName = processor.getBaseFileName(filePath);
    
    // Read file
    const content = await processor.readFile(filePath);
    const originalSize = processor.countLines(content.body);

    // Track changes
    const changes: string[] = [];

    // Normalize frontmatter
    const normalizedFrontmatter = frontmatterNormalizer.normalize(
      content.frontmatter,
      resourceType,
      baseFileName
    );
    if (JSON.stringify(normalizedFrontmatter) !== JSON.stringify(content.frontmatter)) {
      changes.push('Normalized frontmatter');
    }

    // Normalize footer
    const normalizedFooter = footerNormalizer.normalize(content.footer);
    if (JSON.stringify(normalizedFooter) !== JSON.stringify(content.footer)) {
      changes.push('Normalized footer');
    }

    let updatedBody = content.body;

    // Extract code blocks
    if (options.extractCode) {
      const { updatedContent, filesCreated } = await codeExtractor.extractCode(
        filePath,
        baseFileName,
        updatedBody
      );
      if (filesCreated.length > 0) {
        updatedBody = updatedContent;
        changes.push(`Extracted ${filesCreated.length} code blocks`);
      }
    }

    // Extract examples
    if (options.extractExamples) {
      const { updatedContent, filesCreated } = await codeExtractor.extractExamples(
        filePath,
        baseFileName,
        updatedBody
      );
      if (filesCreated.length > 0) {
        updatedBody = updatedContent;
        changes.push(`Extracted ${filesCreated.length} examples`);
      }
    }

    // AI quality review
    let qualityScore = 3.0;
    if (options.aiReview) {
      const metrics = await aiReviewer.review(updatedBody);
      qualityScore = aiReviewer.calculateOverall(metrics);
      normalizedFooter.score = qualityScore;
      changes.push(`AI review completed (score: ${qualityScore.toFixed(1)})`);
    }

    // Check target line count
    const optimizedSize = processor.countLines(updatedBody);
    if (options.targetLines && optimizedSize > options.targetLines) {
      changes.push(`Warning: ${optimizedSize} lines exceeds target ${options.targetLines}`);
    }

    // Write file
    if (!options.dryRun) {
      await processor.writeFile(filePath, {
        frontmatter: normalizedFrontmatter,
        body: updatedBody,
        footer: normalizedFooter
      });
    }

    return {
      filePath,
      resourceType,
      originalSize,
      optimizedSize,
      changes,
      qualityScore,
      success: true
    };

  } catch (error: any) {
    return {
      filePath,
      resourceType: 'instruction' as ResourceType,
      originalSize: 0,
      optimizedSize: 0,
      changes: [],
      qualityScore: 0,
      success: false,
      error: error.message
    };
  }
}

/**
 * Process multiple files
 */
async function processFiles(
  pattern: string,
  options: ProcessingOptions
): Promise<OptimizationResult[]> {
  const files = await glob(pattern, { absolute: true });
  
  if (options.verbose) {
    console.log(chalk.blue(`Found ${files.length} files matching pattern: ${pattern}`));
  }

  const results: OptimizationResult[] = [];

  for (const file of files) {
    if (options.verbose) {
      console.log(chalk.gray(`Processing: ${file}`));
    }

    const result = await optimizeFile(file, options);
    results.push(result);

    if (result.success) {
      console.log(chalk.green(`✓ ${file}`));
      if (result.changes.length > 0 && options.verbose) {
        result.changes.forEach(change => {
          console.log(chalk.gray(`  - ${change}`));
        });
      }
    } else {
      console.log(chalk.red(`✗ ${file}`));
      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error}`));
      }
    }
  }

  return results;
}

/**
 * Display summary
 */
function displaySummary(results: OptimizationResult[]) {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  const totalChanges = successful.reduce((sum, r) => sum + r.changes.length, 0);
  const avgQuality = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.qualityScore, 0) / successful.length
    : 0;

  console.log('\n' + chalk.bold('Summary:'));
  console.log(`  Total files: ${results.length}`);
  console.log(`  Successful: ${chalk.green(successful.length)}`);
  console.log(`  Failed: ${chalk.red(failed.length)}`);
  console.log(`  Total changes: ${totalChanges}`);
  console.log(`  Average quality score: ${chalk.yellow(avgQuality.toFixed(1))}/5.0`);
}

// CLI Commands
program
  .name('optimize-kit')
  .description('Optimize and normalize AI-ley kit resources')
  .version('1.0.0');

program
  .command('instructions')
  .description('Optimize all instruction files')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const pattern = '.github/ai-ley/instructions/**/*.instructions.md';
    const results = await processFiles(pattern, {
      ...options,
      targetLines: parseInt(options.targetLines)
    });
    displaySummary(results);
  });

program
  .command('personas')
  .description('Optimize all persona files')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const pattern = '.github/ai-ley/personas/**/*.persona.md';
    const results = await processFiles(pattern, {
      ...options,
      targetLines: parseInt(options.targetLines)
    });
    displaySummary(results);
  });

program
  .command('agents')
  .description('Optimize all agent files')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const pattern = '.github/agents/*.agent.md';
    const results = await processFiles(pattern, {
      ...options,
      targetLines: parseInt(options.targetLines)
    });
    displaySummary(results);
  });

program
  .command('skills')
  .description('Optimize all skill files')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const pattern = '.github/skills/**/SKILL.md';
    const results = await processFiles(pattern, {
      ...options,
      targetLines: parseInt(options.targetLines)
    });
    displaySummary(results);
  });

program
  .command('prompts')
  .description('Optimize all prompt files')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const pattern = '.github/prompts/*.prompt.md';
    const results = await processFiles(pattern, {
      ...options,
      targetLines: parseInt(options.targetLines)
    });
    displaySummary(results);
  });

program
  .command('all')
  .description('Optimize all AI-ley kit resources')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (options) => {
    const patterns = [
      '.github/ai-ley/instructions/**/*.instructions.md',
      '.github/ai-ley/personas/**/*.persona.md',
      '.github/agents/*.agent.md',
      '.github/skills/**/SKILL.md',
      '.github/prompts/*.prompt.md'
    ];

    let allResults: OptimizationResult[] = [];
    
    for (const pattern of patterns) {
      console.log(chalk.blue(`\nProcessing: ${pattern}`));
      const results = await processFiles(pattern, {
        ...options,
        targetLines: parseInt(options.targetLines)
      });
      allResults = allResults.concat(results);
    }

    displaySummary(allResults);
  });

program
  .command('file <path>')
  .description('Optimize a single file')
  .option('--dry-run', 'Preview changes without writing')
  .option('--extract-code', 'Extract code blocks to scripts/')
  .option('--extract-examples', 'Extract examples to examples/')
  .option('--ai-review', 'Run AI quality review')
  .option('--target-lines <number>', 'Target maximum lines', '300')
  .option('--verbose', 'Show detailed output')
  .action(async (filePath, options) => {
    const result = await optimizeFile(filePath, {
      ...options,
      targetLines: parseInt(options.targetLines)
    });

    if (result.success) {
      console.log(chalk.green(`✓ Optimized: ${filePath}`));
      if (result.changes.length > 0) {
        console.log(chalk.bold('\nChanges:'));
        result.changes.forEach(change => {
          console.log(chalk.gray(`  - ${change}`));
        });
      }
      console.log(chalk.bold('\nMetrics:'));
      console.log(`  Original: ${result.originalSize} lines`);
      console.log(`  Optimized: ${result.optimizedSize} lines`);
      console.log(`  Quality: ${chalk.yellow(result.qualityScore.toFixed(1))}/5.0`);
    } else {
      console.log(chalk.red(`✗ Failed: ${filePath}`));
      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error}`));
      }
    }
  });

program.parse();
