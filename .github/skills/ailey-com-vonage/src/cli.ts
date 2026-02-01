#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { VonageClient } from './index';

dotenv.config();

const program = new Command();

program
  .name('vonage')
  .description('Vonage Communications API CLI')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Interactive setup wizard for Vonage API')
  .action(async () => {
    console.log(chalk.blue('\n=== Vonage API Setup Wizard ===\n'));

    const instructions = `
${chalk.cyan('Step 1: Create Account')}
  1. Visit https://dashboard.vonage.com/
  2. Click "Sign up" and create your account
  3. Verify your email address
  4. Add a payment method

${chalk.cyan('Step 2: Get API Credentials')}
  1. Log in to https://dashboard.vonage.com/
  2. Navigate to Settings → API Settings
  3. Copy your API Key and API Secret
  4. Store them securely

${chalk.cyan('Step 3: Configure Environment')}
  Create .env file with:
  
  VONAGE_API_KEY=your_api_key_here
  VONAGE_API_SECRET=your_api_secret_here
  VONAGE_SENDER_ID=YourBrand

${chalk.cyan('Step 4: For Voice API')}
  1. Go to Applications in dashboard
  2. Create new application
  3. Add Voice capabilities
  4. Download private key as PEM
  5. Add to .env:
     VONAGE_APPLICATION_ID=your_app_id
     VONAGE_PRIVATE_KEY_PATH=/path/to/private.key

${chalk.cyan('Step 5: Verify Setup')}
  Run: npm run auth verify

${chalk.yellow('Documentation:')} https://developer.vonage.com/
${chalk.yellow('Dashboard:')} https://dashboard.vonage.com/
`;

    console.log(instructions);
  });

// ============================================================================
// DETECT COMMAND
// ============================================================================

program
  .command('detect')
  .description('Detect account tier and features')
  .action(async () => {
    try {
      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!,
        senderId: process.env.VONAGE_SENDER_ID,
        applicationId: process.env.VONAGE_APPLICATION_ID,
        privateKeyPath: process.env.VONAGE_PRIVATE_KEY_PATH
      });

      console.log(chalk.blue('\n=== Detecting Account Tier ===\n'));

      const tier = await client.detectAccountTier();

      console.log(chalk.green('✓ Account Tier:'), tier.tier);
      console.log(chalk.green('✓ API Access:'), tier.hasApiAccess ? 'Enabled' : 'Disabled');
      console.log(chalk.green('✓ Monthly Limit:'), tier.monthlyLimit.toLocaleString());
      console.log(chalk.green('✓ Rate Limit:'), `${tier.rateLimit} req/s`);
      console.log(chalk.green('✓ Features:'), tier.features.join(', '));
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// AUTH COMMAND
// ============================================================================

const authCmd = program
  .command('auth')
  .description('Authentication and verification commands');

authCmd
  .command('verify')
  .description('Verify API credentials')
  .action(async () => {
    try {
      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Verifying API Credentials ===\n'));

      const valid = await client.verifyApiKey();

      if (valid) {
        console.log(chalk.green('✓ API credentials are valid\n'));
      } else {
        console.log(chalk.red('✗ API credentials are invalid\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

authCmd
  .command('info')
  .description('Get account information')
  .action(async () => {
    try {
      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Account Information ===\n'));

      const info = await client.getAccountInfo();

      console.log(chalk.green('✓ Account ID:'), info.accountId);
      console.log(chalk.green('✓ Balance:'), `€${info.balance.toFixed(2)}`);
      console.log(chalk.green('✓ Auto Reload:'), info.autoReload ? 'Enabled' : 'Disabled');
      console.log(chalk.green('✓ Small Account Limit:'), `€${info.smallAccountLimit.toFixed(2)}`);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

authCmd
  .command('test')
  .description('Run authentication test')
  .action(async () => {
    try {
      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Running Authentication Test ===\n'));

      const valid = await client.verifyApiKey();
      const info = await client.getAccountInfo();
      const usage = await client.getAccountUsage();

      console.log(chalk.green('✓ Authentication:'), 'Passed');
      console.log(chalk.green('✓ Account ID:'), info.accountId);
      console.log(chalk.green('✓ Balance:'), `€${info.balance.toFixed(2)}`);
      console.log(chalk.green('✓ Monthly SMS:'), usage.monthlyTotalSms.toLocaleString());
      console.log(chalk.green('✓ Monthly Voice:'), usage.monthlyTotalVoice.toLocaleString());
      console.log(chalk.green('✓ Cost MTD:'), `€${usage.costMtd.toFixed(2)}`);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// SMS COMMAND
// ============================================================================

const smsCmd = program
  .command('sms')
  .description('SMS messaging commands');

smsCmd
  .command('send')
  .description('Send SMS message')
  .option('--to <number>', 'Recipient phone number')
  .option('--message <text>', 'Message text')
  .option('--from <sender>', 'Sender ID (optional)')
  .action(async (options) => {
    try {
      if (!options.to || !options.message) {
        console.error(chalk.red('✗ Error: --to and --message are required'));
        process.exit(1);
      }

      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!,
        senderId: process.env.VONAGE_SENDER_ID
      });

      console.log(chalk.blue('\n=== Sending SMS ===\n'));

      const response = await client.sendSms({
        to: options.to,
        text: options.message,
        from: options.from
      });

      console.log(chalk.green('✓ SMS Sent'));
      console.log(chalk.green('✓ Message ID:'), response.messageId);
      console.log(chalk.green('✓ Status:'), response.status);
      console.log(chalk.green('✓ Recipient:'), response.to);
      console.log(chalk.green('✓ Network:'), response.network);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// VOICE COMMAND
// ============================================================================

const voiceCmd = program
  .command('voice')
  .description('Voice calling commands');

voiceCmd
  .command('call')
  .description('Make outbound voice call')
  .option('--to <number>', 'Recipient phone number')
  .option('--from <number>', 'Caller phone number')
  .option('--answer-url <url>', 'NCCO answer URL')
  .action(async (options) => {
    try {
      if (!options.to || !options.from || !options.answerUrl) {
        console.error(chalk.red('✗ Error: --to, --from, and --answer-url are required'));
        process.exit(1);
      }

      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!,
        applicationId: process.env.VONAGE_APPLICATION_ID,
        privateKeyPath: process.env.VONAGE_PRIVATE_KEY_PATH
      });

      console.log(chalk.blue('\n=== Making Voice Call ===\n'));

      const response = await client.createCall({
        to: options.to,
        from: options.from,
        answerUrl: options.answerUrl
      });

      console.log(chalk.green('✓ Call Created'));
      console.log(chalk.green('✓ UUID:'), response.uuid);
      console.log(chalk.green('✓ Status:'), response.status);
      console.log(chalk.green('✓ Direction:'), response.direction);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// VERIFY COMMAND
// ============================================================================

const verifyCmd = program
  .command('verify')
  .description('Number verification commands');

verifyCmd
  .command('request')
  .description('Request phone number verification')
  .option('--number <number>', 'Phone number to verify')
  .option('--brand <name>', 'Brand name')
  .action(async (options) => {
    try {
      if (!options.number || !options.brand) {
        console.error(chalk.red('✗ Error: --number and --brand are required'));
        process.exit(1);
      }

      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Requesting Verification ===\n'));

      const response = await client.requestVerification({
        number: options.number,
        brand: options.brand
      });

      console.log(chalk.green('✓ Verification Sent'));
      console.log(chalk.green('✓ Request ID:'), response.requestId);
      console.log(chalk.green('✓ Status:'), response.status);
      console.log(chalk.yellow('⚠ Check phone for verification code\n'));
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

verifyCmd
  .command('check')
  .description('Check verification code')
  .option('--request-id <id>', 'Request ID from verification request')
  .option('--code <code>', 'Verification code')
  .action(async (options) => {
    try {
      if (!options.requestId || !options.code) {
        console.error(chalk.red('✗ Error: --request-id and --code are required'));
        process.exit(1);
      }

      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Checking Verification Code ===\n'));

      const response = await client.checkVerification({
        requestId: options.requestId,
        code: options.code
      });

      console.log(chalk.green('✓ Verification Successful'));
      console.log(chalk.green('✓ Status:'), response.status);
      console.log(chalk.green('✓ Event ID:'), response.eventId);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// NUMBER COMMAND
// ============================================================================

const numberCmd = program
  .command('number')
  .description('Number lookup and management commands');

numberCmd
  .command('lookup')
  .description('Lookup number information')
  .option('--number <number>', 'Phone number to lookup')
  .action(async (options) => {
    try {
      if (!options.number) {
        console.error(chalk.red('✗ Error: --number is required'));
        process.exit(1);
      }

      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Number Lookup ===\n'));

      const response = await client.lookupNumber(options.number);

      console.log(chalk.green('✓ Lookup Complete'));
      console.log(chalk.green('✓ Number:'), response.internationalFormatNumber);
      console.log(chalk.green('✓ Country:'), response.countryName, `(${response.countryCode})`);
      console.log(chalk.green('✓ Carrier:'), response.carrier);
      console.log(chalk.green('✓ Type:'), response.type);
      console.log(chalk.green('✓ Valid:'), response.validNumber === '1' ? 'Yes' : 'No');
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// REPORT COMMAND
// ============================================================================

const reportCmd = program
  .command('report')
  .description('Reporting and analytics commands');

reportCmd
  .command('usage')
  .description('Get account usage statistics')
  .action(async () => {
    try {
      const client = new VonageClient({
        apiKey: process.env.VONAGE_API_KEY!,
        apiSecret: process.env.VONAGE_API_SECRET!
      });

      console.log(chalk.blue('\n=== Account Usage Statistics ===\n'));

      const usage = await client.getAccountUsage();

      console.log(chalk.green('✓ Monthly SMS:'), usage.monthlyTotalSms.toLocaleString());
      console.log(chalk.green('✓ Monthly Voice:'), usage.monthlyTotalVoice.toLocaleString());
      console.log(chalk.green('✓ Monthly Verify:'), usage.monthlyTotalVerify.toLocaleString());
      console.log(chalk.green('✓ Cost MTD:'), `€${usage.costMtd.toFixed(2)}`);
      console.log(chalk.green('✓ Estimated Cost MTM:'), `€${usage.estimatedCostMtm.toFixed(2)}`);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// DIAGNOSE COMMAND
// ============================================================================

program
  .command('diagnose')
  .description('Run diagnostic checks')
  .action(async () => {
    console.log(chalk.blue('\n=== Running Diagnostics ===\n'));

    const checks = [
      {
        name: 'Environment Variables',
        check: () => {
          const apiKey = process.env.VONAGE_API_KEY;
          const apiSecret = process.env.VONAGE_API_SECRET;
          return (apiKey && apiSecret) ? 'Configured' : 'Missing';
        }
      },
      {
        name: 'API Credentials',
        check: async () => {
          try {
            const client = new VonageClient({
              apiKey: process.env.VONAGE_API_KEY!,
              apiSecret: process.env.VONAGE_API_SECRET!
            });
            const valid = await client.verifyApiKey();
            return valid ? 'Valid' : 'Invalid';
          } catch {
            return 'Error';
          }
        }
      },
      {
        name: 'Account Balance',
        check: async () => {
          try {
            const client = new VonageClient({
              apiKey: process.env.VONAGE_API_KEY!,
              apiSecret: process.env.VONAGE_API_SECRET!
            });
            const info = await client.getAccountInfo();
            return `€${info.balance.toFixed(2)}`;
          } catch {
            return 'Error';
          }
        }
      },
      {
        name: 'Account Tier',
        check: async () => {
          try {
            const client = new VonageClient({
              apiKey: process.env.VONAGE_API_KEY!,
              apiSecret: process.env.VONAGE_API_SECRET!,
              senderId: process.env.VONAGE_SENDER_ID
            });
            const tier = await client.detectAccountTier();
            return tier.tier;
          } catch {
            return 'Error';
          }
        }
      }
    ];

    for (const check of checks) {
      try {
        const result = await check.check();
        const status = result === 'Valid' || result !== 'Error' ? chalk.green('✓') : chalk.red('✗');
        console.log(`${status} ${check.name}:`, chalk.cyan(result));
      } catch (error) {
        console.log(chalk.red('✗'), check.name + ':', chalk.red('Error'));
      }
    }

    console.log();
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
