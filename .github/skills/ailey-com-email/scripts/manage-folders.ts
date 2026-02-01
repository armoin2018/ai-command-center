#!/usr/bin/env tsx
/**
 * Manage Folders CLI
 * 
 * List and manage IMAP folders
 */

import { Command } from 'commander';
import { EmailClient } from './email-client.js';

const program = new Command();

program
  .name('manage-folders')
  .description('Manage email folders via IMAP')
  .version('1.0.0');

// List folders
program
  .command('list')
  .description('List all mailbox folders')
  .action(async () => {
    try {
      const client = new EmailClient();
      const folders = await client.listFolders();
      
      console.log('\n=== Mailbox Folders ===\n');
      folders.forEach(folder => {
        const attrs = folder.attributes.length > 0 ? ` [${folder.attributes.join(', ')}]` : '';
        console.log(`${folder.name}${attrs}`);
      });
      console.log(`\nTotal: ${folders.length} folders`);
      
    } catch (error: any) {
      console.error('Error listing folders:', error.message);
      console.error('\nRun: npm run email setup');
      process.exit(1);
    }
  });

program.parse();
