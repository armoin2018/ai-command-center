#!/usr/bin/env tsx
/**
 * List Gamma Themes
 */

import { Command } from 'commander';
import { GammaClient } from './gamma-client.js';

const program = new Command();

program
  .name('list-themes')
  .description('List available Gamma themes')
  .version('1.0.0')
  .option('-f, --format <format>', 'Output format: table, json, list', 'table')
  .option('-q, --query <query>', 'Search themes by keyword')
  .option('-o, --output <path>', 'Save output to file')
  .action(async (options) => {
    try {
      const client = new GammaClient();
      
      console.log('Fetching available themes...\n');
      const themes = await client.listThemes(options.query);

      if (themes.length === 0) {
        console.log('No themes found.');
        return;
      }

      let output = '';

      if (options.format === 'json') {
        output = JSON.stringify(themes, null, 2);
      } else if (options.format === 'list') {
        output = themes.map(t => `${t.id}: ${t.name}`).join('\n');
      } else {
        // Table format
        console.log(`Found ${themes.length} themes:\n`);
        console.log('ID'.padEnd(40) + 'Name'.padEnd(30) + 'Keywords');
        console.log('-'.repeat(100));
        themes.forEach(theme => {
          const id = (theme.id || '').padEnd(40);
          const name = (theme.name || '').padEnd(30);
          const keywords = [...(theme.colorKeywords || []), ...(theme.toneKeywords || [])].join(', ');
          console.log(`${id}${name}${keywords}`);
        });
        return; // Don't save table format
      }

      if (options.output) {
        const fs = await import('fs');
        fs.writeFileSync(options.output, output);
        console.log(`\nThemes saved to: ${options.output}`);
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
