#!/usr/bin/env tsx
/**
 * Manage Folders CLI
 */

import { Command } from 'commander';
import { OutlookClient } from './outlook-client.js';

const program = new Command();

program
  .name('manage-folders')
  .description('Manage Outlook mail folders')
  .version('1.0.0');

program
  .command('list')
  .description('List mail folders')
  .action(async () => {
    try {
      const client = new OutlookClient();

      console.log('Fetching mail folders...');

      const folders = await client.listFolders();

      console.log(`\nFound ${folders.length} folders:\n`);
      console.log('Display Name'.padEnd(40) + 'Unread Count'.padEnd(15) + 'Total Items');
      console.log('-'.repeat(75));

      folders.forEach((folder: any) => {
        const name = (folder.displayName || 'Unknown').padEnd(40);
        const unread = (folder.unreadItemCount?.toString() || '0').padEnd(15);
        const total = folder.totalItemCount || 0;
        console.log(`${name}${unread}${total}`);
        console.log(`  ID: ${folder.id}`);
      });

      console.log(`\nTotal: ${folders.length} folders`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create mail folder')
  .requiredOption('-n, --name <name>', 'Folder name')
  .option('--parent <id>', 'Parent folder ID (optional)')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Creating folder "${options.name}"...`);

      const folder = await client.createFolder(options.name, options.parent);

      console.log('✅ Folder created successfully!');
      console.log(`Name: ${folder.displayName}`);
      console.log(`ID: ${folder.id}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete mail folder')
  .requiredOption('-i, --id <folderId>', 'Folder ID')
  .option('--confirm', 'Confirm deletion', false)
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log('Use --confirm to delete the folder');
        process.exit(1);
      }

      const client = new OutlookClient();

      console.log(`Deleting folder ${options.id}...`);

      await client.deleteFolder(options.id);

      console.log('✅ Folder deleted successfully!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
