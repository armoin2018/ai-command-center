#!/usr/bin/env tsx
/**
 * Create Gamma Presentation from File
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { GammaClient } from './gamma-client.js';

const program = new Command();

program
  .name('create-presentation')
  .description('Create Gamma presentation from content file')
  .version('1.0.0');

program
  .command('file')
  .description('Create presentation from a single file')
  .requiredOption('-i, --input <path>', 'Input file path (markdown, text, etc.)')
  .option('-o, --output <path>', 'Output file path for exported file (e.g. output.pptx)')
  .option('-t, --title <title>', 'Presentation title (defaults to filename)')
  .option('--theme <theme>', 'Theme ID')
  .option('--type <type>', 'Content type: presentation, document, social, webpage', 'presentation')
  .option('--text-mode <mode>', 'Text mode: generate, condense, preserve', 'preserve')
  .option('--export-as <format>', 'Export format: pptx, pdf, png')
  .option('--num-cards <n>', 'Number of cards/slides', parseInt)
  .action(async (options) => {
    try {
      // Validate input file
      if (!fs.existsSync(options.input)) {
        throw new Error(`Input file not found: ${options.input}`);
      }

      // Initialize client
      const client = new GammaClient();

      console.log(`Creating ${options.type} from ${options.input}...`);

      // Create presentation (async with polling)
      const result = await client.createPresentationFromFile(options.input, {
        title: options.title,
        theme: options.theme,
        type: options.type,
        textMode: options.textMode,
        exportAs: options.exportAs,
        numCards: options.numCards,
      });

      console.log(`✅ ${options.type} created successfully!`);
      if (result.gammaUrl) console.log(`\nView: ${result.gammaUrl}`);
      if (result.credits) {
        console.log(`Credits used: ${result.credits.deducted} (${result.credits.remaining} remaining)`);
      }

      // Download export if available and output path specified
      if (result.exportUrl && options.output) {
        console.log(`\nDownloading export...`);
        await client.downloadExport(result.exportUrl, options.output);
        const stats = fs.statSync(options.output);
        console.log(`✅ Saved to: ${options.output} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      } else if (result.exportUrl) {
        console.log(`\nExport URL (expires in ~1 week): ${result.exportUrl}`);
      }

      // Save result info if output is a JSON file
      if (options.output && options.output.endsWith('.json')) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(`\nResult info saved to: ${options.output}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Create presentations from multiple files')
  .requiredOption('-i, --input <pattern>', 'Input file pattern (glob)')
  .option('-o, --output-dir <path>', 'Output directory for exported files')
  .option('--theme <theme>', 'Theme ID for all presentations')
  .option('--type <type>', 'Content type: presentation, document, webpage', 'presentation')
  .action(async () => {
    console.log('Batch presentation creation coming soon!');
    process.exit(0);
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
