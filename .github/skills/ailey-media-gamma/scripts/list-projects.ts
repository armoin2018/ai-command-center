#!/usr/bin/env tsx
/**
 * List Gamma Projects
 */

import { Command } from 'commander';
import { GammaClient } from './gamma-client.js';

const program = new Command();

program
  .name('list-projects')
  .description('List Gamma projects')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: table, json, list', 'table')
  .option('-o, --output <path>', 'Save output to file')
  .option('--type <type>', 'Filter by type: presentation, document, webpage')
  .action(async (options) => {
    try {
      const client = new GammaClient();
      
      console.log('Fetching projects...\n');
      let projects = await client.listProjects();

      // Filter by type if specified
      if (options.type) {
        projects = projects.filter(p => p.type === options.type);
      }

      if (projects.length === 0) {
        console.log('No projects found.');
        return;
      }

      let output = '';

      if (options.format === 'json') {
        output = JSON.stringify(projects, null, 2);
      } else if (options.format === 'list') {
        output = projects.map(p => `${p.id}: ${p.name} (${p.type})`).join('\n');
      } else {
        // Table format
        console.log(`Found ${projects.length} projects:\n`);
        console.log('ID'.padEnd(25) + 'Name'.padEnd(30) + 'Type'.padEnd(15) + 'Created');
        console.log('-'.repeat(100));
        projects.forEach(project => {
          const id = (project.id || '').padEnd(25);
          const name = (project.name || '').substring(0, 28).padEnd(30);
          const type = (project.type || '').padEnd(15);
          const created = new Date(project.created_at).toLocaleDateString();
          console.log(`${id}${name}${type}${created}`);
        });
        console.log(`\nTotal: ${projects.length} projects`);
        return; // Don't save table format
      }

      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, output);
        console.log(`\nProjects saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
