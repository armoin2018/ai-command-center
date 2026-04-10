#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { WhatsAppClient, createWhatsAppClient, AccountInfo } from './index';

const program = new Command();

function displayAccountInfo(info: AccountInfo): void {
  console.log(chalk.bold('\n📱 WhatsApp Business Account Information\n'));
  console.log(`${chalk.cyan('Account Tier:')} ${chalk.green(info.tier.charAt(0).toUpperCase() + info.tier.slice(1))}`);
  console.log(`${chalk.cyan('API Access:')} ${info.hasApiAccess ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled')}`);
  console.log(`${chalk.cyan('Phone Number:')} ${info.phoneNumber}`);
  console.log(`${chalk.cyan('Display Name:')} ${info.displayName}`);
  console.log(`${chalk.cyan('Environment:')} ${info.environment}`);
  console.log(`${chalk.cyan('Message Rate:')} ${info.messageRate} messages/second`);

  console.log(chalk.bold('\n📋 Available Features:\n'));
  info.features.forEach(feature => {
    console.log(`  ✅ ${feature.replace(/_/g, ' ')}`);
  });

  if (info.upgradeRequired) {
    console.log(chalk.yellow('\n⚠️  Upgrade Available\n'));
    console.log('Upgrade to Business tier for:');
    console.log('  • Unlimited message templates');
    console.log('  • Advanced contact management');
    console.log('  • Team collaboration');
    console.log('  • Detailed analytics');
  }
}

program
  .name('whatsapp-cli')
  .description('WhatsApp Business Integration CLI')
  .version('1.0.0');

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🚀 WhatsApp Business Setup\n'));
    const client = createWhatsAppClient();
    const accountInfo = await client.detectAccountTier();
    displayAccountInfo(accountInfo);
    if (!accountInfo.hasApiAccess) {
      console.log(chalk.yellow('\n⚠️  Please complete API setup before continuing.\n'));
      process.exit(1);
    }
    console.log(chalk.green('\n✅ Setup complete! Your WhatsApp account is ready to use.\n'));
  });

program
  .command('detect')
  .description('Detect account tier and API access')
  .action(async () => {
    try {
      const client = createWhatsAppClient();
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
      const client = createWhatsAppClient();
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
      const client = createWhatsAppClient();
      const info = await client.getAccountInfo();
      console.log(chalk.bold('\n📋 Account Information\n'));
      console.log(`${chalk.cyan('Phone Number:')} ${info.display_phone_number}`);
      console.log(`${chalk.cyan('Display Name:')} ${info.name}`);
      console.log(`${chalk.cyan('Status:')} ${info.status}`);
      console.log(`${chalk.cyan('Quality Rating:')} ${info.quality_rating || 'N/A'}\n`);
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
      const client = createWhatsAppClient();
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

const sendCommand = program.command('send').description('Send message commands');

sendCommand
  .command('text')
  .description('Send text message')
  .requiredOption('--phone <number>', 'Recipient phone number')
  .requiredOption('--message <text>', 'Message text')
  .action(async (options) => {
    try {
      const client = createWhatsAppClient();
      console.log(chalk.cyan('\n📤 Sending text message...\n'));
      const response = await client.sendTextMessage({
        recipientPhone: options.phone,
        body: options.message,
      });
      console.log(chalk.green('✅ Message sent successfully!'));
      console.log(`${chalk.cyan('Message ID:')} ${response.id}`);
      console.log(`${chalk.cyan('Status:')} ${response.status}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to send message:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

sendCommand
  .command('media')
  .description('Send media message')
  .requiredOption('--phone <number>', 'Recipient phone number')
  .requiredOption('--type <type>', 'Media type (image, video, audio, document)')
  .requiredOption('--url <url>', 'Media URL')
  .option('--caption <text>', 'Media caption')
  .action(async (options) => {
    try {
      const client = createWhatsAppClient();
      console.log(chalk.cyan('\n📤 Sending media message...\n'));
      const response = await client.sendMediaMessage({
        recipientPhone: options.phone,
        type: options.type as any,
        url: options.url,
        caption: options.caption,
      });
      console.log(chalk.green('✅ Media sent successfully!'));
      console.log(`${chalk.cyan('Message ID:')} ${response.id}`);
      console.log(`${chalk.cyan('Status:')} ${response.status}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to send media:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const messageCommand = program.command('message').description('Message management commands');

messageCommand
  .command('template')
  .description('Send template message')
  .requiredOption('--phone <number>', 'Recipient phone number')
  .requiredOption('--template <name>', 'Template name')
  .option('--language <code>', 'Language code (default: en_US)')
  .option('--parameters <json>', 'Template parameters as JSON array')
  .action(async (options) => {
    try {
      const client = createWhatsAppClient();
      console.log(chalk.cyan('\n📤 Sending template message...\n'));
      const parameters = options.parameters ? JSON.parse(options.parameters) : [];
      const response = await client.sendTemplateMessage({
        recipientPhone: options.phone,
        templateName: options.template,
        language: options.language || 'en_US',
        parameters,
      });
      console.log(chalk.green('✅ Template sent successfully!'));
      console.log(`${chalk.cyan('Message ID:')} ${response.id}`);
      console.log(`${chalk.cyan('Status:')} ${response.status}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to send template:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

messageCommand
  .command('list')
  .description('List available templates')
  .action(async () => {
    try {
      const client = createWhatsAppClient();
      console.log(chalk.bold(`\n📋 Available Templates\n`));
      const templates = await client.getTemplates();
      if (templates.length === 0) {
        console.log(chalk.yellow('No templates found\n'));
        return;
      }
      templates.forEach((template, index) => {
        console.log(`${index + 1}. ${chalk.cyan(template.name)}`);
        console.log(`   Status: ${template.status}`);
        console.log(`   Language: ${template.language}`);
        console.log(`   Category: ${template.category}\n`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list templates:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const contactCommand = program.command('contact').description('Contact management commands');

contactCommand
  .command('add')
  .description('Add contact')
  .requiredOption('--phone <number>', 'Phone number')
  .option('--first-name <name>', 'First name')
  .option('--last-name <name>', 'Last name')
  .action(async (options) => {
    try {
      const client = createWhatsAppClient();
      console.log(chalk.cyan('\n👤 Adding contact...\n'));
      const contact = await client.addContact({
        phone: options.phone,
        firstName: options.firstName,
        lastName: options.lastName,
      });
      console.log(chalk.green('✅ Contact added successfully!'));
      console.log(`${chalk.cyan('Phone:')} ${contact.phone}`);
      if (contact.firstName) console.log(`${chalk.cyan('First Name:')} ${contact.firstName}`);
      if (contact.lastName) console.log(`${chalk.cyan('Last Name:')} ${contact.lastName}`);
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Failed to add contact:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

contactCommand
  .command('get')
  .description('Get contact info')
  .requiredOption('--phone <number>', 'Phone number')
  .action(async (options) => {
    try {
      const client = createWhatsAppClient();
      const contact = await client.getContact(options.phone);
      if (!contact) {
        console.log(chalk.yellow('\n❌ Contact not found\n'));
        return;
      }
      console.log(chalk.bold('\n👤 Contact Information\n'));
      console.log(`${chalk.cyan('Phone:')} ${contact.phone}`);
      if (contact.firstName) console.log(`${chalk.cyan('First Name:')} ${contact.firstName}`);
      if (contact.lastName) console.log(`${chalk.cyan('Last Name:')} ${contact.lastName}`);
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Failed to get contact:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const businessCommand = program.command('business').description('Business profile commands');

businessCommand
  .command('profile')
  .description('Set business profile')
  .option('--name <name>', 'Business name')
  .option('--description <text>', 'Business description')
  .option('--category <category>', 'Business category')
  .action(async (options) => {
    try {
      const client = createWhatsAppClient();
      console.log(chalk.cyan('\n🏢 Updating business profile...\n'));
      await client.setBusinessProfile({
        name: options.name,
        description: options.description,
        category: options.category,
      });
      console.log(chalk.green('✅ Business profile updated successfully!\n'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to update profile:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('diagnose')
  .description('Run diagnostic checks')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 Running Diagnostics...\n'));
    console.log(chalk.bold('1. Environment Variables'));
    const requiredVars = ['WHATSAPP_API_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_BUSINESS_ACCOUNT_ID'];
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
      const client = createWhatsAppClient();
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
      const client = createWhatsAppClient();
      const accountInfo = await client.detectAccountTier();
      console.log(`   ${chalk.cyan('Tier:')} ${accountInfo.tier}`);
      console.log(`   ${chalk.cyan('API Access:')} ${accountInfo.hasApiAccess ? chalk.green('✅') : chalk.red('❌')}`);
    } catch (error) {
      console.log(`   ${chalk.red('❌')} Account detection failed`);
    }

    console.log(chalk.bold.green('\n✅ Diagnostics complete\n'));
  });

program.parse(process.argv);
