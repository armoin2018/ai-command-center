#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { MailchimpClient, createMailchimpClient, AccountInfo } from './index';

const program = new Command();

function displayAccountInfo(info: AccountInfo): void {
  console.log(chalk.bold('\n📊 Mailchimp Account Information\n'));
  console.log(`${chalk.cyan('Account Tier:')} ${chalk.green(info.tier.charAt(0).toUpperCase() + info.tier.slice(1))}`);
  console.log(`${chalk.cyan('API Access:')} ${info.hasApiAccess ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled')}`);
  console.log(`${chalk.cyan('Contact Limit:')} ${info.contactLimit.toLocaleString()}`);
  console.log(`${chalk.cyan('Contacts Used:')} ${info.contactsUsed.toLocaleString()}`);
  console.log(`${chalk.cyan('Usage:')} ${((info.contactsUsed / info.contactLimit) * 100).toFixed(1)}%`);

  console.log(chalk.bold('\n📋 Available Features:\n'));
  info.features.forEach(feature => {
    console.log(`  ✅ ${feature}`);
  });

  if (info.upgradeRequired) {
    console.log(chalk.yellow('\n⚠️  Upgrade Required\n'));
    console.log(info.setupInstructions);
  }
}

program
  .name('mailchimp-cli')
  .description('Mailchimp Integration CLI')
  .version('1.0.0');

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🚀 Mailchimp Integration Setup\n'));
    const client = createMailchimpClient();
    const accountInfo = await client.detectAccountTier();
    displayAccountInfo(accountInfo);
    if (!accountInfo.hasApiAccess) {
      console.log(chalk.yellow('\n⚠️  Please complete API key setup before continuing.\n'));
      process.exit(1);
    }
    console.log(chalk.green('\n✅ Setup complete! Your account is ready to use.\n'));
  });

program
  .command('detect')
  .description('Detect account tier and API access')
  .action(async () => {
    try {
      const client = createMailchimpClient();
      const accountInfo = await client.detectAccountTier();
      displayAccountInfo(accountInfo);
    } catch (error) {
      console.error(chalk.red('❌ Detection failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const authCommand = program.command('auth').description('Authentication commands');

authCommand
  .command('verify')
  .description('Verify API key')
  .action(async () => {
    try {
      const client = createMailchimpClient();
      const isValid = await client.verifyApiKey();
      if (isValid) {
        console.log(chalk.green('\n✅ API key is valid\n'));
        const accountInfo = await client.detectAccountTier();
        displayAccountInfo(accountInfo);
      } else {
        console.log(chalk.red('\n❌ API key is invalid\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Verification failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

authCommand
  .command('info')
  .description('Show account info')
  .action(async () => {
    try {
      const client = createMailchimpClient();
      const info = await client.getAccountInfo();
      console.log(chalk.bold('\n📋 Account Information\n'));
      console.log(`${chalk.cyan('Account ID:')} ${info.account_id}`);
      console.log(`${chalk.cyan('Email:')} ${info.email}`);
      console.log(`${chalk.cyan('Plan:')} ${info.plan_name}`);
      console.log(`${chalk.cyan('Contacts:')} ${info.contact_count?.toLocaleString()}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get info:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

authCommand
  .command('test')
  .description('Test API connection')
  .action(async () => {
    try {
      const client = createMailchimpClient();
      const isValid = await client.verifyApiKey();
      if (isValid) {
        console.log(chalk.green('\n✅ API connection successful\n'));
      } else {
        console.log(chalk.red('\n❌ API connection failed\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Connection test failed:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const listCommand = program.command('list').description('List management commands');

listCommand
  .command('all')
  .description('List all lists')
  .action(async () => {
    try {
      const client = createMailchimpClient();
      const lists = await client.getLists();
      console.log(chalk.bold(`\n📧 Mailing Lists (${lists.length})\n`));
      if (lists.length === 0) {
        console.log(chalk.yellow('No lists found\n'));
        return;
      }
      lists.forEach((list, index) => {
        console.log(`${index + 1}. ${chalk.cyan(list.name)}`);
        console.log(`   ID: ${list.id}`);
        console.log(`   Members: ${list.subscribedCount} subscribed, ${list.unsubscribeCount} unsubscribed\n`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list lists:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

listCommand
  .command('get')
  .description('Get list details')
  .requiredOption('--list-id <id>', 'List ID')
  .action(async (options) => {
    try {
      const client = createMailchimpClient();
      const list = await client.getList(options.listId);
      console.log(chalk.bold('\n📧 List Details\n'));
      console.log(`${chalk.cyan('Name:')} ${list.name}`);
      console.log(`${chalk.cyan('ID:')} ${list.id}`);
      console.log(`${chalk.cyan('Members:')} ${list.subscribedCount}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get list:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

listCommand
  .command('create')
  .description('Create new list')
  .requiredOption('--name <name>', 'List name')
  .requiredOption('--from-name <name>', 'Campaign from name')
  .requiredOption('--from-email <email>', 'Campaign from email')
  .option('--permission <text>', 'Permission reminder text')
  .action(async (options) => {
    try {
      const client = createMailchimpClient();
      console.log(chalk.cyan('\n📝 Creating list...\n'));
      const list = await client.createList({
        name: options.name,
        permissionReminder: options.permission || `You signed up for ${options.name}`,
        contact: {
          company: 'Company',
          address1: '123 Main St',
          city: 'City',
          state: 'State',
          zip: '12345',
          country: 'US',
        },
        campaignDefaults: {
          fromName: options.fromName,
          fromEmail: options.fromEmail,
          subject: `Update from ${options.fromName}`,
          language: 'en',
        },
      });
      console.log(chalk.green('✅ List created successfully!'));
      console.log(`${chalk.cyan('List ID:')} ${list.id}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to create list:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('diagnose')
  .description('Run diagnostic checks')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 Running Diagnostics...\n'));
    console.log(chalk.bold('1. Environment Variables'));
    const requiredVars = ['MAILCHIMP_API_KEY', 'MAILCHIMP_SERVER_PREFIX'];
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`   ${chalk.green('✅')} ${varName}`);
      } else {
        console.log(`   ${chalk.red('❌')} ${varName} ${chalk.yellow('(required)')}`);
      }
    });

    console.log(chalk.bold('\n2. API Connection'));
    try {
      const client = createMailchimpClient();
      const isValid = await client.verifyApiKey();
      if (isValid) {
        console.log(`   ${chalk.green('✅')} API connection successful`);
      } else {
        console.log(`   ${chalk.red('❌')} API connection failed`);
      }
    } catch (error) {
      console.log(`   ${chalk.red('❌')} API connection check failed`);
    }

    console.log(chalk.bold('\n3. Account Tier'));
    try {
      const client = createMailchimpClient();
      const accountInfo = await client.detectAccountTier();
      console.log(`   ${chalk.cyan('Tier:')} ${accountInfo.tier}`);
      console.log(`   ${chalk.cyan('API Access:')} ${accountInfo.hasApiAccess ? chalk.green('✅') : chalk.red('❌')}`);
    } catch (error) {
      console.log(`   ${chalk.red('❌')} Account detection failed`);
    }

    console.log(chalk.bold.green('\n✅ Diagnostics complete\n'));
  });

program.parse(process.argv);
