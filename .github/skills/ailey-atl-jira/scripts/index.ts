#!/usr/bin/env node
/**
 * Main CLI entry point for ailey-atl-jira skill
 * Orchestrates CRUD, import, export, and sync operations
 */

import { Command } from 'commander';
import { testConnection } from './jira-client';

const program = new Command();

program
  .name('ailey-atl-jira')
  .description('Jira integration with CRUD, bulk operations, and plan synchronization')
  .version('1.0.0');

program
  .command('test')
  .description('Test Jira connection')
  .action(async () => {
    await testConnection();
  });

program
  .command('crud')
  .description('CRUD operations (create, get, update, delete, search)')
  .action(() => {
    console.log('Use: npm run jira crud <command>');
    console.log('Commands: create, get, update, delete, search');
    console.log('Example: npm run jira crud create --project PROJ --summary "Task" --type Task');
  });

program
  .command('import <file>')
  .description('Import issues from CSV')
  .option('-p, --project <key>', 'Default project key')
  .option('--dry-run', 'Preview import')
  .option('--skip-errors', 'Continue on errors')
  .action(() => {
    console.log('Use: npm run import <file> [options]');
    console.log('Example: npm run import issues.csv --project PROJ');
  });

program
  .command('export')
  .description('Export issues to CSV or JSON')
  .requiredOption('-j, --jql <query>', 'JQL query')
  .requiredOption('-o, --output <file>', 'Output file')
  .option('-f, --format <format>', 'Format (csv, json)', 'csv')
  .action(() => {
    console.log('Use: npm run export -- -j "JQL" -o output.csv');
    console.log('Example: npm run export -- -j "project = PROJ" -o issues.csv');
  });

program
  .command('sync')
  .description('Sync with .project/PLAN.json')
  .action(() => {
    console.log('Use: npm run sync pull|push [options]');
    console.log('Pull: npm run sync pull -j "project = PROJ"');
    console.log('Push: npm run sync push --project PROJ');
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
