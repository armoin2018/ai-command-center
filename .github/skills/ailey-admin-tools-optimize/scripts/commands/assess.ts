/**
 * Assess Command
 * 
 * Based on ailey-admin-assess.prompt.md
 * Scores content quality (0-5 scale), updates summaryScore in frontmatter,
 * generates improvement reports
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { glob } from 'glob';
import { FileProcessor, AIReviewer, SummaryGenerator } from '../../lib/index.js';
import type { OptimizationResult } from '../../lib/types.js';

interface AssessOptions {
  output?: string;
  verbose?: boolean;
}

export function createAssessCommand(): Command {
  const cmd = new Command('assess');
  
  cmd
    .description('Assess content quality and update summaryScore in frontmatter')
    .argument('<target>', 'Target: instructions, personas, prompts, agents, skills, all, or file path')
    .option('-o, --output <path>', 'Output report path (default: .ai-ley/SUGGESTIONS.md)')
    .option('-v, --verbose', 'Verbose output')
    .action(async (target: string, options: AssessOptions) => {
      await executeAssess(target, options);
    });
  
  return cmd;
}

async function executeAssess(target: string, options: AssessOptions): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 AI-LEY Content Assessment\n'));
  
  const files = await resolveFiles(target);
  
  if (files.length === 0) {
    console.log(chalk.yellow('No files found to assess.'));
    return;
  }
  
  console.log(`Assessing ${files.length} file(s)...\n`);
  
  const processor = new FileProcessor();
  const reviewer = new AIReviewer();
  const results: OptimizationResult[] = [];
  
  for (const filePath of files) {
    try {
      if (options.verbose) {
        console.log(chalk.gray(`Processing: ${filePath}`));
      }
      
      // Read file
      const content = await processor.readFile(filePath);
      
      // Run AI quality review
      const metrics = await reviewer.review(content.body, filePath);
      metrics.overall = reviewer.calculateOverall(metrics);
      
      // Update summaryScore in frontmatter
      const oldScore = content.frontmatter.summaryScore || 0;
      content.frontmatter.summaryScore = metrics.overall;
      
      // Update lastUpdated if score changed significantly
      if (Math.abs(metrics.overall - oldScore) > 0.5) {
        content.frontmatter.lastUpdated = new Date().toISOString().split('T')[0];
      }
      
      // Write updated file
      await processor.writeFile(filePath, content);
      
      const changes = [`Updated summaryScore: ${oldScore.toFixed(1)} → ${metrics.overall.toFixed(1)}`];
      
      if (metrics.clarity < 4.0) changes.push('Clarity needs improvement');
      if (metrics.conciseness < 4.0) changes.push('Conciseness needs improvement');
      if (metrics.accuracy < 4.0) changes.push('Accuracy needs improvement');
      if (metrics.noSoftLanguage < 4.0) changes.push('Too much soft language');
      if (metrics.noRepetition < 4.0) changes.push('Repetitive content detected');
      if (metrics.validFilePointers < 4.0) changes.push('Invalid file references found');
      if (metrics.validVariablePointers < 4.0) changes.push('Invalid variable references found');
      
      results.push({
        filePath,
        resourceType: processor.detectResourceType(filePath),
        originalSize: content.body.length,
        optimizedSize: content.body.length,
        changes,
        qualityScore: metrics.overall,
        success: true
      });
      
      const scoreColor = metrics.overall >= 4.5 ? chalk.green : 
                        metrics.overall >= 4.0 ? chalk.blue :
                        metrics.overall >= 3.5 ? chalk.yellow : chalk.red;
      
      console.log(`  ${scoreColor('✓')} ${filePath}: ${scoreColor(metrics.overall.toFixed(1))}`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`  ${chalk.red('✗')} ${filePath}: ${errorMessage}`);
      
      results.push({
        filePath,
        resourceType: processor.detectResourceType(filePath),
        originalSize: 0,
        optimizedSize: 0,
        changes: [],
        qualityScore: 0,
        success: false,
        error: errorMessage
      });
    }
  }
  
  // Generate summary report
  const generator = new SummaryGenerator();
  const summary = generator.generate(results);
  
  console.log(generator.generateTextReport(summary, options.verbose));
  
  // Write markdown report
  const reportPath = options.output || '.ai-ley/SUGGESTIONS.md';
  const reportContent = generator.generateMarkdownReport(summary);
  
  const fs = await import('fs/promises');
  await fs.mkdir('.ai-ley', { recursive: true });
  await fs.writeFile(reportPath, reportContent);
  
  console.log(chalk.green(`\n✓ Assessment report written to: ${reportPath}\n`));
}

async function resolveFiles(target: string): Promise<string[]> {
  // Check if target is a specific file
  if (target.endsWith('.md')) {
    const fs = await import('fs');
    if (fs.existsSync(target)) {
      return [target];
    }
    // Search for file in standard locations
    const searchPaths = [
      `.github/ai-ley/instructions/**/${target}`,
      `.github/ai-ley/personas/**/${target}`,
      `.github/prompts/${target}`,
      `.github/agents/${target}`,
      `.github/skills/**/SKILL.md`
    ];
    
    for (const pattern of searchPaths) {
      const files = await glob(pattern);
      if (files.length > 0) return files;
    }
    
    return [];
  }
  
  // Resolve category
  const patterns: Record<string, string> = {
    'instructions': '.github/ai-ley/instructions/**/*.md',
    'personas': '.github/ai-ley/personas/**/*.md',
    'prompts': '.github/prompts/**/*.md',
    'agents': '.github/agents/**/*.md',
    'skills': '.github/skills/**/SKILL.md',
    'all': '.github/**/*.{md}'
  };
  
  const pattern = patterns[target.toLowerCase()] || target;
  const files = await glob(pattern, {
    ignore: ['**/node_modules/**', '**/README.md', '**/*template*', '**/*example*']
  });
  
  return files;
}
