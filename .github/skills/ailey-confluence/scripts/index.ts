#!/usr/bin/env node
/**
 * Main CLI entry point for ailey-confluence
 * Routes to subcommands: test, crud, import, export, query
 */

import { Command } from 'commander';
import { testConnection } from './confluence-client';

const program = new Command();

program
  .name('ailey-confluence')
  .description('Confluence integration for AI-ley kit')
  .version('1.0.0');

program
  .command('test')
  .description('Test Confluence connection')
  .action(async () => {
    await testConnection();
  });

program
  .command('crud')
  .description('Page CRUD operations (create, get, update, delete, list)')
  .argument('[subcommand]', 'Subcommand: create, get, update, delete, list')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: crudProgram } = await import('./crud-operations');
    // Re-parse with crud subcommand
    const args = process.argv.slice(process.argv.indexOf('crud') + 1);
    crudProgram.parse(['node', 'crud', ...args]);
  });

program
  .command('import')
  .description('Import content to Confluence (file, directory, markdown)')
  .argument('[subcommand]', 'Subcommand: file, directory, markdown')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: importProgram } = await import('./import-content');
    const args = process.argv.slice(process.argv.indexOf('import') + 1);
    importProgram.parse(['node', 'import', ...args]);
  });

program
  .command('export')
  .description('Export content from Confluence (page, space, search, attachments)')
  .argument('[subcommand]', 'Subcommand: page, space, search, attachments')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: exportProgram } = await import('./export-content');
    const args = process.argv.slice(process.argv.indexOf('export') + 1);
    exportProgram.parse(['node', 'export', ...args]);
  });

program
  .command('query')
  .description('Query Confluence with CQL (search, pages, recent, labels, spaces, examples)')
  .argument('[subcommand]', 'Subcommand: search, pages, recent, labels, spaces, examples')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: queryProgram } = await import('./query-confluence');
    const args = process.argv.slice(process.argv.indexOf('query') + 1);
    queryProgram.parse(['node', 'query', ...args]);
  });

// Show help if no command specified
if (process.argv.length === 2) {
  program.help();
}

program.parse();
