#!/usr/bin/env node

import { Command } from 'commander';
import { SalesforceClient, SalesforceConfig } from './index';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import * as inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import express from 'express';
import open from 'open';
import jsforce from 'jsforce';

dotenv.config();

const program = new Command();

program
  .name('ailey-salesforce')
  .description('Salesforce CRM integration with edition detection and OAuth')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Interactive OAuth setup wizard')
  .action(async () => {
    console.log(chalk.blue.bold('\n☁️  AI-ley Salesforce Setup\n'));

    // Check for existing credentials
    const hasClientId = !!process.env.SALESFORCE_CLIENT_ID;
    const hasClientSecret = !!process.env.SALESFORCE_CLIENT_SECRET;

    if (!hasClientId || !hasClientSecret) {
      console.log(chalk.yellow('⚠️  OAuth credentials not found in .env file\n'));
      console.log(chalk.gray('Please create a Connected App in Salesforce Setup:\n'));
      console.log(chalk.gray('1. Go to Setup → Apps → App Manager'));
      console.log(chalk.gray('2. Click "New Connected App"'));
      console.log(chalk.gray('3. Enable OAuth Settings'));
      console.log(chalk.gray('4. Set Callback URL: http://localhost:3000/oauth/callback'));
      console.log(chalk.gray('5. Add OAuth Scopes: full, refresh_token, api'));
      console.log(chalk.gray('6. Save and get Consumer Key and Consumer Secret\n'));

      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'clientId',
          message: 'Enter Consumer Key (Client ID):',
        },
        {
          type: 'password',
          name: 'clientSecret',
          message: 'Enter Consumer Secret (Client Secret):',
        },
        {
          type: 'list',
          name: 'environment',
          message: 'Select environment:',
          choices: ['Production (login.salesforce.com)', 'Sandbox (test.salesforce.com)'],
        },
      ]);

      // Update .env
      const envPath = path.join(process.cwd(), '.env');
      let envContent = '';
      try {
        envContent = await fs.readFile(envPath, 'utf-8');
      } catch {
        envContent = await fs.readFile(path.join(process.cwd(), '.env.example'), 'utf-8');
      }

      envContent = envContent.replace(/SALESFORCE_CLIENT_ID=.*/, `SALESFORCE_CLIENT_ID=${answers.clientId}`);
      envContent = envContent.replace(/SALESFORCE_CLIENT_SECRET=.*/, `SALESFORCE_CLIENT_SECRET=${answers.clientSecret}`);
      envContent = envContent.replace(
        /SALESFORCE_LOGIN_URL=.*/,
        `SALESFORCE_LOGIN_URL=${answers.environment.includes('Production') ? 'https://login.salesforce.com' : 'https://test.salesforce.com'}`
      );

      await fs.writeFile(envPath, envContent);

      process.env.SALESFORCE_CLIENT_ID = answers.clientId;
      process.env.SALESFORCE_CLIENT_SECRET = answers.clientSecret;
      process.env.SALESFORCE_LOGIN_URL = answers.environment.includes('Production')
        ? 'https://login.salesforce.com'
        : 'https://test.salesforce.com';

      console.log(chalk.green('\n✓ Credentials saved to .env\n'));
    }

    // Start OAuth flow
    console.log(chalk.blue('Starting OAuth authentication...\n'));

    const oauth2 = new jsforce.OAuth2({
      clientId: process.env.SALESFORCE_CLIENT_ID!,
      clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      redirectUri: 'http://localhost:3000/oauth/callback',
      loginUrl: process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com',
    });

    const app = express();

    app.get('/oauth/callback', async (req, res) => {
      const { code } = req.query;

      if (!code) {
        res.send('Error: No authorization code received');
        return;
      }

      try {
        const conn = new jsforce.Connection({ oauth2 });
        await conn.authorize(code as string);

        // Save token
        const tokenDir = path.join(process.cwd(), '.oauth');
        await fs.mkdir(tokenDir, { recursive: true });

        const tokenData = {
          accessToken: conn.accessToken,
          refreshToken: conn.refreshToken,
          instanceUrl: conn.instanceUrl,
        };

        await fs.writeFile(path.join(tokenDir, 'token.json'), JSON.stringify(tokenData, null, 2));

        // Detect edition
        const client = new SalesforceClient({
          clientId: process.env.SALESFORCE_CLIENT_ID!,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
        });

        // Manually set connection
        (client as any).conn = conn;
        const edition = await client.detectEdition();

        res.send(`
          <html>
            <body style="font-family: Arial; padding: 40px; text-align: center;">
              <h1 style="color: #00a1e0;">✓ Authentication Successful!</h1>
              <p>Edition: <strong>${edition.edition}</strong></p>
              <p>API Calls/Day: <strong>${edition.apiCallsPerDay.toLocaleString()}</strong></p>
              <p>Bulk API: <strong>${edition.features.bulkApi ? 'Enabled' : 'Disabled'}</strong></p>
              <p>Streaming API: <strong>${edition.features.streamingApi ? 'Enabled' : 'Disabled'}</strong></p>
              <p style="color: #666; margin-top: 40px;">You can close this window.</p>
            </body>
          </html>
        `);

        console.log(chalk.green.bold('\n✓ Authentication Successful!\n'));
        console.log(chalk.gray(`Edition: ${edition.edition}`));
        console.log(chalk.gray(`API Calls/Day: ${edition.apiCallsPerDay.toLocaleString()}`));
        console.log(chalk.gray(`Bulk API: ${edition.features.bulkApi ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`Streaming API: ${edition.features.streamingApi ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`\nToken saved to .oauth/token.json\n`));

        setTimeout(() => process.exit(0), 2000);
      } catch (error: any) {
        res.send(`Error: ${error.message}`);
        console.error(chalk.red(`\n✗ Authentication failed: ${error.message}\n`));
        process.exit(1);
      }
    });

    const server = app.listen(3000, () => {
      const authUrl = oauth2.getAuthorizationUrl({ scope: 'api refresh_token' });
      console.log(chalk.gray('Opening browser for authentication...\n'));
      open(authUrl);
    });
  });

// Detect command
program
  .command('detect')
  .description('Detect Salesforce edition and features')
  .action(async () => {
    try {
      const client = new SalesforceClient({
        clientId: process.env.SALESFORCE_CLIENT_ID!,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      });

      await client.authenticate();
      const edition = client.getEdition();

      if (edition) {
        console.log(chalk.blue.bold('\n☁️  Salesforce Edition\n'));
        console.log(chalk.gray(`Edition: ${edition.edition}`));
        console.log(chalk.gray(`API Calls/Day: ${edition.apiCallsPerDay.toLocaleString()}`));
        console.log(chalk.gray(`\nFeatures:`));
        console.log(chalk.gray(`  Bulk API: ${edition.features.bulkApi ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`  Streaming API: ${edition.features.streamingApi ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`  Metadata API: ${edition.features.metadataApi ? 'Enabled' : 'Disabled'}`));
        console.log(chalk.gray(`  Custom Objects: ${edition.features.customObjects}`));
        console.log(chalk.gray(`  Custom Fields: ${edition.features.customFields}`));
        console.log(chalk.gray(`  Sandboxes: ${edition.features.sandboxes ? 'Available' : 'Not Available'}\n`));
      }
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Detection failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Query command
program
  .command('query <soql>')
  .description('Execute SOQL query')
  .option('-o, --output <file>', 'Export to CSV file')
  .option('-l, --limit <number>', 'Limit results')
  .option('--all', 'Query all records (with pagination)')
  .option('--format <format>', 'Output format (table, json, csv)', 'table')
  .action(async (soql, options) => {
    try {
      const client = new SalesforceClient({
        clientId: process.env.SALESFORCE_CLIENT_ID!,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      });

      await client.authenticate();

      console.log(chalk.blue.bold('\n☁️  Executing Query\n'));
      console.log(chalk.gray(`SOQL: ${soql}\n`));

      const result = options.all ? await client.queryAll(soql) : await client.query(soql);

      console.log(chalk.green(`✓ Found ${result.totalSize} records\n`));

      if (options.output) {
        await client.exportToCsv(result.records, options.output);
        console.log(chalk.green(`✓ Exported to ${options.output}\n`));
      } else if (options.format === 'json') {
        console.log(JSON.stringify(result.records, null, 2));
      } else {
        console.table(result.records.slice(0, 20));
        if (result.records.length > 20) {
          console.log(chalk.gray(`\n... and ${result.records.length - 20} more records`));
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Query failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Create command
program
  .command('create <object> <data>')
  .description('Create new record')
  .action(async (object, data) => {
    try {
      const client = new SalesforceClient({
        clientId: process.env.SALESFORCE_CLIENT_ID!,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      });

      await client.authenticate();

      const recordData = JSON.parse(data);
      const result = await client.create(object, recordData);

      if (result.success) {
        console.log(chalk.green.bold('\n✓ Record Created\n'));
        console.log(chalk.gray(`ID: ${result.id}\n`));
      } else {
        console.error(chalk.red('\n✗ Create failed\n'));
        console.error(result.errors);
      }
    } catch (error: any) {
      console.error(chalk.red(`\n✗ Create failed: ${error.message}\n`));
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run system diagnostics')
  .action(async () => {
    console.log(chalk.blue.bold('\n☁️  Salesforce Diagnostics\n'));

    // Check Node.js
    console.log(chalk.gray(`Node.js: ${process.version}`));

    // Check environment
    console.log(chalk.gray('\nEnvironment:'));
    console.log(
      process.env.SALESFORCE_CLIENT_ID
        ? chalk.green('✓ SALESFORCE_CLIENT_ID configured')
        : chalk.red('✗ SALESFORCE_CLIENT_ID missing')
    );
    console.log(
      process.env.SALESFORCE_CLIENT_SECRET
        ? chalk.green('✓ SALESFORCE_CLIENT_SECRET configured')
        : chalk.red('✗ SALESFORCE_CLIENT_SECRET missing')
    );

    // Check authentication
    try {
      const client = new SalesforceClient({
        clientId: process.env.SALESFORCE_CLIENT_ID!,
        clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
      });

      await client.authenticate();
      console.log(chalk.green('\n✓ Authentication successful'));

      const edition = client.getEdition();
      if (edition) {
        console.log(chalk.gray(`\nEdition: ${edition.edition}`));
        console.log(chalk.gray(`API Calls/Day: ${edition.apiCallsPerDay.toLocaleString()}`));
      }

      // Check API limits
      const limits = await client.getApiLimits();
      console.log(chalk.gray(`\nAPI Limits:`));
      console.log(
        chalk.gray(`  Daily API Requests: ${limits.DailyApiRequests?.Used || 0}/${limits.DailyApiRequests?.Max || 0}`)
      );
    } catch (error: any) {
      console.log(chalk.red(`\n✗ Authentication failed: ${error.message}`));
      console.log(chalk.yellow('\nRun "npm run setup" to authenticate'));
    }

    console.log(chalk.green.bold('\n✓ Diagnostics Complete\n'));
  });

program.parse();
