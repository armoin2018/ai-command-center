#!/usr/bin/env tsx
/**
 * List Gamma Projects
 * NOTE: The Gamma public API v1.0 does not expose a list-projects endpoint.
 * This command is a placeholder for future API support.
 */

import { Command } from 'commander';

const program = new Command();

program
  .name('list-projects')
  .description('List Gamma projects (not available in current API)')
  .version('1.0.0')
  .action(async () => {
    console.log('⚠️  The Gamma public API v1.0 does not support listing projects.');
    console.log('Use the Gamma web interface at https://gamma.app to manage your projects.');
    process.exit(0);
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
