#!/usr/bin/env tsx
/**
 * Outlook CLI - Main Entry Point
 */

import { Command } from 'commander';
import { OutlookClient } from './outlook-client.js';

const program = new Command();

program
  .name('ailey-outlook-email')
  .description('Outlook and Office 365 email, calendar, and contacts management')
  .version('1.0.0');

// Test command
program
  .command('test')
  .description('Test Microsoft Graph API connection')
  .action(async () => {
    try {
      console.log('Testing Microsoft Graph API connection...');
      const client = new OutlookClient();
      const isConnected = await client.testConnection();

      if (isConnected) {
        console.log('✅ Microsoft Graph API connection successful!');
        process.exit(0);
      } else {
        console.log('❌ Microsoft Graph API connection failed.');
        console.log('\nRun "npm run outlook setup" for configuration instructions');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      console.log('\n📖 Setup Instructions:');
      console.log('1. Create Azure AD app registration at https://portal.azure.com');
      console.log('2. Add API permissions: Mail.ReadWrite, Mail.Send, Calendars.ReadWrite, Contacts.ReadWrite');
      console.log('3. Set environment variables in ~/.vscode/.env:');
      console.log('   AZURE_TENANT_ID=your-tenant-id');
      console.log('   AZURE_CLIENT_ID=your-client-id');
      console.log('   AZURE_CLIENT_SECRET=your-client-secret');
      console.log('\nSee SETUP.md for detailed instructions');
      process.exit(1);
    }
  });

// Setup guide command
program
  .command('setup')
  .description('Show setup instructions')
  .action(async () => {
    console.log('📖 Outlook Email Skill Setup Instructions\n');
    console.log('=== Step 1: Azure AD App Registration ===');
    console.log('1. Go to https://portal.azure.com');
    console.log('2. Navigate to Azure Active Directory > App registrations');
    console.log('3. Click "New registration"');
    console.log('4. Name: "Outlook Email Skill"');
    console.log('5. Supported account types: Single tenant');
    console.log('6. Click "Register"\n');

    console.log('=== Step 2: Add API Permissions ===');
    console.log('1. In your app, go to "API permissions"');
    console.log('2. Click "Add a permission"');
    console.log('3. Select "Microsoft Graph"');
    console.log('4. Choose "Application permissions" (for daemon apps) or "Delegated permissions" (for user apps)');
    console.log('5. Add these permissions:');
    console.log('   - Mail.Read');
    console.log('   - Mail.ReadWrite');
    console.log('   - Mail.Send');
    console.log('   - Calendars.ReadWrite');
    console.log('   - Contacts.ReadWrite');
    console.log('6. Click "Grant admin consent"\n');

    console.log('=== Step 3: Create Client Secret ===');
    console.log('1. Go to "Certificates & secrets"');
    console.log('2. Click "New client secret"');
    console.log('3. Description: "Outlook Email Skill"');
    console.log('4. Expires: 24 months');
    console.log('5. Click "Add"');
    console.log('6. Copy the secret VALUE (not the ID)\n');

    console.log('=== Step 4: Configure Environment ===');
    console.log('Add to ~/.vscode/.env (or .env):');
    console.log('');
    console.log('AZURE_TENANT_ID=your-tenant-id-here');
    console.log('AZURE_CLIENT_ID=your-client-id-here');
    console.log('AZURE_CLIENT_SECRET=your-client-secret-here');
    console.log('');

    console.log('=== Step 5: Test Connection ===');
    console.log('npm run outlook test\n');

    console.log('📚 For detailed instructions, see SETUP.md');
  });

// Check if user is trying to access subcommands
const command = process.argv[2];

if (command === 'send') {
  const { default: sendProgram } = await import('./send-email.js');
  const args = process.argv.slice(2);
  sendProgram.parse(['node', 'send-email', ...args]);
  process.exit(0);
} else if (command === 'read') {
  const { default: readProgram } = await import('./read-email.js');
  const args = process.argv.slice(2);
  readProgram.parse(['node', 'read-email', ...args]);
  process.exit(0);
} else if (command === 'calendar') {
  const { default: calendarProgram } = await import('./manage-calendar.js');
  const args = process.argv.slice(2);
  calendarProgram.parse(['node', 'manage-calendar', ...args]);
  process.exit(0);
} else if (command === 'contacts') {
  const { default: contactsProgram } = await import('./manage-contacts.js');
  const args = process.argv.slice(2);
  contactsProgram.parse(['node', 'manage-contacts', ...args]);
  process.exit(0);
} else if (command === 'folders') {
  const { default: foldersProgram } = await import('./manage-folders.js');
  const args = process.argv.slice(2);
  foldersProgram.parse(['node', 'manage-folders', ...args]);
  process.exit(0);
}

// Parse remaining commands (test, setup, help, version)
program.parse();
