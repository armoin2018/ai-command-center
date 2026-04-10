#!/usr/bin/env tsx
/**
 * Gamma CLI - Main Entry Point
 */

import { Command } from 'commander';
import { GammaClient } from './gamma-client.js';

const program = new Command();

program
  .name('ailey-media-gamma')
  .description('Gamma presentation and content creation toolkit')
  .version('1.0.0');

// Test command
program
  .command('test')
  .description('Test Gamma API connection')
  .action(async () => {
    try {
      console.log('Testing Gamma API connection...');
      const client = new GammaClient();
      const isConnected = await client.testConnection();
      
      if (isConnected) {
        console.log('✅ Gamma API connection successful!');
        process.exit(0);
      } else {
        console.log('❌ Gamma API connection failed. Check your API key.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Check if user is trying to access subcommands
const command = process.argv[2];

if (command === 'create') {
  const { default: createProgram } = await import('./create-presentation.js');
  const args = process.argv.slice(3);
  await createProgram.parseAsync(['node', 'create-presentation', ...args]);
  process.exit(0);
} else if (command === 'export') {
  const { default: exportProgram } = await import('./export-presentation.js');
  const args = process.argv.slice(3);
  await exportProgram.parseAsync(['node', 'export-presentation', ...args]);
  process.exit(0);
} else if (command === 'themes') {
  const { default: themesProgram } = await import('./list-themes.js');
  const args = process.argv.slice(3);
  await themesProgram.parseAsync(['node', 'list-themes', ...args]);
  process.exit(0);
} else if (command === 'projects') {
  const { default: projectsProgram } = await import('./list-projects.js');
  const args = process.argv.slice(3);
  await projectsProgram.parseAsync(['node', 'list-projects', ...args]);
  process.exit(0);
}

// Parse remaining commands (test, help, version)
program.parse();
