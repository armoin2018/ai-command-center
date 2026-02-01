#!/usr/bin/env tsx
/**
 * Manage Contacts CLI
 */

import { Command } from 'commander';
import fs from 'fs';
import { OutlookClient } from './outlook-client.js';

const program = new Command();

program
  .name('manage-contacts')
  .description('Manage Outlook contacts')
  .version('1.0.0');

program
  .command('search')
  .description('Search contacts')
  .requiredOption('-q, --query <query>', 'Search query (name or email)')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .option('-o, --output <path>', 'Save output to file')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Searching for "${options.query}"...`);

      const contacts = await client.searchContacts(options.query);

      if (contacts.length === 0) {
        console.log('No contacts found.');
        return;
      }

      let output = '';

      if (options.format === 'json') {
        output = JSON.stringify(contacts, null, 2);
      } else {
        console.log(`\nFound ${contacts.length} contacts:\n`);
        console.log('Name'.padEnd(30) + 'Email'.padEnd(35) + 'Phone');
        console.log('-'.repeat(85));

        contacts.forEach((contact: any) => {
          const name = (contact.displayName || 'Unknown').substring(0, 28).padEnd(30);
          const email = (contact.emailAddresses?.[0]?.address || 'No email').substring(0, 33).padEnd(35);
          const phone = contact.mobilePhone || contact.businessPhones?.[0] || 'No phone';
          console.log(`${name}${email}${phone}`);
        });

        console.log(`\nTotal: ${contacts.length} contacts`);
        return;
      }

      if (options.output) {
        fs.writeFileSync(options.output, output);
        console.log(`\nContacts saved to: ${options.output}`);
      } else {
        console.log(output);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create new contact')
  .requiredOption('-n, --name <name>', 'Display name')
  .option('-e, --email <email>', 'Email address')
  .option('-p, --phone <phone>', 'Phone number')
  .option('-j, --job <title>', 'Job title')
  .option('-c, --company <company>', 'Company name')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Creating contact "${options.name}"...`);

      const contact = await client.createContact({
        displayName: options.name,
        emailAddress: options.email,
        phoneNumber: options.phone,
        jobTitle: options.job,
        company: options.company,
      });

      console.log('✅ Contact created successfully!');
      console.log(`Name: ${contact.displayName}`);
      if (contact.emailAddresses?.[0]) console.log(`Email: ${contact.emailAddresses[0].address}`);
      if (contact.mobilePhone) console.log(`Phone: ${contact.mobilePhone}`);
      if (contact.jobTitle) console.log(`Job: ${contact.jobTitle}`);
      if (contact.companyName) console.log(`Company: ${contact.companyName}`);
      console.log(`ID: ${contact.id}`);
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('show')
  .description('Show contact details')
  .requiredOption('-i, --id <contactId>', 'Contact ID')
  .action(async (options) => {
    try {
      const client = new OutlookClient();

      console.log(`Fetching contact ${options.id}...`);

      const contact: any = await client.getContact(options.id);

      console.log('\n=== CONTACT DETAILS ===');
      console.log(`Name: ${contact.displayName || 'Unknown'}`);
      if (contact.emailAddresses && contact.emailAddresses.length > 0) {
        console.log(`Emails:`);
        contact.emailAddresses.forEach((email: any) => {
          console.log(`  - ${email.address}`);
        });
      }
      if (contact.mobilePhone) console.log(`Mobile: ${contact.mobilePhone}`);
      if (contact.businessPhones && contact.businessPhones.length > 0) {
        console.log(`Business: ${contact.businessPhones.join(', ')}`);
      }
      if (contact.jobTitle) console.log(`Job Title: ${contact.jobTitle}`);
      if (contact.companyName) console.log(`Company: ${contact.companyName}`);
      if (contact.businessAddress) {
        console.log(`Address: ${contact.businessAddress.street}, ${contact.businessAddress.city}`);
      }
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete contact')
  .requiredOption('-i, --id <contactId>', 'Contact ID')
  .option('--confirm', 'Confirm deletion', false)
  .action(async (options) => {
    try {
      if (!options.confirm) {
        console.log('Use --confirm to delete the contact');
        process.exit(1);
      }

      const client = new OutlookClient();

      console.log(`Deleting contact ${options.id}...`);

      await client.deleteContact(options.id);

      console.log('✅ Contact deleted successfully!');
    } catch (error) {
      console.error('Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default program;
