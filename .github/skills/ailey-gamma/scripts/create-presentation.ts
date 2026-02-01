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
  .option('-o, --output <path>', 'Output file path for project ID')
  .option('-t, --title <title>', 'Presentation title (defaults to filename)')
  .option('--theme <theme>', 'Theme ID or name (defaults to Gamma default)')
  .option('--type <type>', 'Content type: presentation, document, webpage', 'presentation')
  .action(async (options) => {
    try {
      // Validate input file
      if (!fs.existsSync(options.input)) {
        throw new Error(`Input file not found: ${options.input}`);
      }

      // Initialize client
      const client = new GammaClient();

      console.log(`Creating ${options.type} from ${options.input}...`);
      
      // Create presentation
      const project = await client.createPresentationFromFile(options.input, {
        title: options.title,
        theme: options.theme,
        type: options.type,
      });

      console.log(`✅ ${options.type} created successfully!`);
      console.log(`\nProject ID: ${project.id}`);
      console.log(`Name: ${project.name}`);
      console.log(`Type: ${project.type}`);
      console.log(`URL: ${project.url}`);
      console.log(`Created: ${project.created_at}`);

      // Save project info if output specified
      if (options.output) {
        const outputData = {
          projectId: project.id,
          name: project.name,
          type: project.type,
          url: project.url,
          created_at: project.created_at,
        };
        fs.writeFileSync(options.output, JSON.stringify(outputData, null, 2));
        console.log(`\nProject info saved to: ${options.output}`);
      }

      console.log(`\nNext steps:`);
      console.log(`  - View online: ${project.url}`);
      console.log(`  - Export to PowerPoint: npm run gamma export pptx -p ${project.id} -o presentation.pptx`);
      console.log(`  - Export to PDF: npm run gamma export pdf -p ${project.id} -o presentation.pdf`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Create presentations from multiple files')
  .requiredOption('-i, --input <pattern>', 'Input file pattern (glob)')
  .option('-o, --output-dir <path>', 'Output directory for project info files')
  .option('--theme <theme>', 'Theme ID or name for all presentations')
  .option('--type <type>', 'Content type: presentation, document, webpage', 'presentation')
  .action(async () => {
    console.log('Batch presentation creation coming soon!');
    process.exit(0);
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
