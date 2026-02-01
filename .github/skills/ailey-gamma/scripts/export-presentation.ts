#!/usr/bin/env tsx
/**
 * Export Gamma Presentation
 */

import { Command } from 'commander';
import fs from 'fs';
import { GammaClient } from './gamma-client.js';

const program = new Command();

program
  .name('export-presentation')
  .description('Export Gamma presentation to PowerPoint or PDF')
  .version('1.0.0');

program
  .command('pptx')
  .description('Export presentation to PowerPoint')
  .requiredOption('-p, --project <id>', 'Project ID to export')
  .requiredOption('-o, --output <path>', 'Output file path (.pptx)')
  .action(async (options) => {
    try {
      const client = new GammaClient();

      console.log(`Exporting project ${options.project} to PowerPoint...`);
      
      const buffer = await client.exportPresentation({
        format: 'pptx',
        projectId: options.project,
      });

      // Ensure output has .pptx extension
      let outputPath = options.output;
      if (!outputPath.endsWith('.pptx')) {
        outputPath += '.pptx';
      }

      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✅ PowerPoint exported successfully!`);
      console.log(`Output: ${outputPath}`);
      console.log(`Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('pdf')
  .description('Export presentation to PDF')
  .requiredOption('-p, --project <id>', 'Project ID to export')
  .requiredOption('-o, --output <path>', 'Output file path (.pdf)')
  .action(async (options) => {
    try {
      const client = new GammaClient();

      console.log(`Exporting project ${options.project} to PDF...`);
      
      const buffer = await client.exportPresentation({
        format: 'pdf',
        projectId: options.project,
      });

      // Ensure output has .pdf extension
      let outputPath = options.output;
      if (!outputPath.endsWith('.pdf')) {
        outputPath += '.pdf';
      }

      fs.writeFileSync(outputPath, buffer);
      
      console.log(`✅ PDF exported successfully!`);
      console.log(`Output: ${outputPath}`);
      console.log(`Size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
