#!/usr/bin/env tsx
/**
 * Export Gamma Presentation
 * Downloads an export file from a Gamma export URL.
 * In the new API, exports are part of the generation request (exportAs param).
 * This command is for downloading from an exportUrl after generation.
 */

import { Command } from 'commander';
import fs from 'fs';
import { GammaClient } from './gamma-client.js';

const program = new Command();

program
  .name('export-presentation')
  .description('Download a Gamma export from a URL')
  .version('1.0.0');

program
  .command('download')
  .description('Download export from a Gamma export URL')
  .requiredOption('-u, --url <url>', 'Export URL from a completed generation')
  .requiredOption('-o, --output <path>', 'Output file path')
  .action(async (options) => {
    try {
      const client = new GammaClient();

      console.log(`Downloading export to ${options.output}...`);
      await client.downloadExport(options.url, options.output);

      const stats = fs.statSync(options.output);
      console.log(`✅ Downloaded successfully!`);
      console.log(`Output: ${options.output}`);
      console.log(`Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check status of a generation by ID')
  .requiredOption('-g, --generation-id <id>', 'Generation ID to check')
  .action(async (options) => {
    try {
      const client = new GammaClient();

      console.log(`Checking generation ${options.generationId}...`);
      const status = await client.getGenerationStatus(options.generationId);

      console.log(`\nStatus: ${status.status}`);
      if (status.gammaUrl) console.log(`View: ${status.gammaUrl}`);
      if (status.exportUrl) console.log(`Export URL: ${status.exportUrl}`);
      if (status.credits) {
        console.log(`Credits used: ${status.credits.deducted} (${status.credits.remaining} remaining)`);
      }
      if (status.error) console.log(`Error: ${status.error.message}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
