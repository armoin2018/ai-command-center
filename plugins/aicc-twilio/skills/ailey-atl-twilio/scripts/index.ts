#!/usr/bin/env tsx

import { Command } from 'commander';
import chalk from 'chalk';
import { getTwilioConfig, getAuthMethod } from './config.js';
import { TwilioClient } from './twilio-client.js';

const program = new Command();

program
  .name('twilio')
  .description('AI-ley Twilio CLI — SMS, Voice, Verify & Phone Number Management')
  .version('1.0.0');

// ── Helper ──────────────────────────────────────────────────────────

function getClient(): TwilioClient {
  const config = getTwilioConfig();
  return new TwilioClient(config);
}

function print(label: string, data: any): void {
  console.log(chalk.bold.cyan(`\n${label}:`));
  console.log(JSON.stringify(data, null, 2));
}

function success(msg: string): void {
  console.log(chalk.green(`✔ ${msg}`));
}

function fail(msg: string): void {
  console.error(chalk.red(`✘ ${msg}`));
}

// ── Auth ─────────────────────────────────────────────────────────────

program
  .command('auth')
  .description('Verify authentication credentials')
  .action(async () => {
    try {
      const client = getClient();
      const account = await client.getAccount();
      success('Authenticated successfully');
      print('Account', {
        sid: account.sid,
        friendlyName: account.friendly_name,
        type: account.type,
        status: account.status,
        dateCreated: account.date_created,
      });
    } catch (e: any) {
      fail(`Authentication failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── Setup ────────────────────────────────────────────────────────────

program
  .command('setup')
  .description('Interactive setup guide')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔧 Twilio Setup Guide\n'));
    console.log('1. Sign up at https://www.twilio.com/try-twilio');
    console.log('2. Find your Account SID and Auth Token on the Console Dashboard');
    console.log('3. Create an API Key at https://www.twilio.com/console/project/api-keys');
    console.log('4. Set environment variables:');
    console.log(chalk.dim(`
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_API_SECRET=your_api_secret
   TWILIO_FROM_NUMBER=+15551234567
`));
    console.log('5. Run: twilio auth');
  });

// ── Detect Tier ──────────────────────────────────────────────────────

program
  .command('detect-tier')
  .description('Detect account tier and available capabilities')
  .action(async () => {
    try {
      const client = getClient();
      const tier = await client.detectTier();
      success(`Detected tier: ${tier}`);

      const account = await client.getAccount();
      print('Account Info', {
        type: account.type,
        status: account.status,
        friendlyName: account.friendly_name,
      });
    } catch (e: any) {
      fail(`Tier detection failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── SMS ──────────────────────────────────────────────────────────────

program
  .command('sms')
  .description('Send an SMS message')
  .requiredOption('-t, --to <number>', 'Recipient phone number (E.164 format)')
  .option('-f, --from <number>', 'Sender phone number (defaults to TWILIO_FROM_NUMBER)')
  .requiredOption('-b, --body <text>', 'Message body')
  .option('--media <urls...>', 'Media URLs for MMS')
  .action(async (opts) => {
    try {
      const client = getClient();
      const msg = await client.sendMessage({
        to: opts.to,
        from: opts.from,
        body: opts.body,
        mediaUrl: opts.media,
      });
      success(`Message sent: ${msg.sid}`);
      print('Message', {
        sid: msg.sid,
        to: msg.to,
        from: msg.from,
        status: msg.status,
        price: msg.price,
      });
    } catch (e: any) {
      fail(`Send failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── List Messages ────────────────────────────────────────────────────

program
  .command('messages')
  .description('List recent messages')
  .option('-t, --to <number>', 'Filter by recipient')
  .option('-f, --from <number>', 'Filter by sender')
  .option('-n, --limit <count>', 'Max results', '20')
  .action(async (opts) => {
    try {
      const client = getClient();
      const messages = await client.listMessages({
        to: opts.to,
        from: opts.from,
        pageSize: parseInt(opts.limit),
      });
      print(`Messages (${messages.length})`, messages.map((m: any) => ({
        sid: m.sid,
        to: m.to,
        from: m.from,
        body: m.body?.substring(0, 80),
        status: m.status,
        dateSent: m.date_sent,
      })));
    } catch (e: any) {
      fail(`List messages failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── Call ──────────────────────────────────────────────────────────────

program
  .command('call')
  .description('Make an outbound call')
  .requiredOption('-t, --to <number>', 'Recipient phone number (E.164 format)')
  .option('-f, --from <number>', 'Caller phone number')
  .option('--twiml <xml>', 'TwiML instructions for the call')
  .option('--url <url>', 'URL returning TwiML instructions')
  .option('--record', 'Record the call')
  .action(async (opts) => {
    try {
      if (!opts.twiml && !opts.url) {
        fail('Provide --twiml or --url for call instructions');
        process.exit(1);
      }
      const client = getClient();
      const call = await client.createCall({
        to: opts.to,
        from: opts.from,
        twiml: opts.twiml,
        url: opts.url,
        record: opts.record,
      });
      success(`Call initiated: ${call.sid}`);
      print('Call', {
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
      });
    } catch (e: any) {
      fail(`Call failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── List Calls ───────────────────────────────────────────────────────

program
  .command('calls')
  .description('List recent calls')
  .option('-t, --to <number>', 'Filter by recipient')
  .option('-s, --status <status>', 'Filter by status')
  .option('-n, --limit <count>', 'Max results', '20')
  .action(async (opts) => {
    try {
      const client = getClient();
      const calls = await client.listCalls({
        to: opts.to,
        status: opts.status,
        pageSize: parseInt(opts.limit),
      });
      print(`Calls (${calls.length})`, calls.map((c: any) => ({
        sid: c.sid,
        to: c.to,
        from: c.from,
        status: c.status,
        duration: c.duration,
        dateCreated: c.date_created,
      })));
    } catch (e: any) {
      fail(`List calls failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── Phone Numbers ────────────────────────────────────────────────────

program
  .command('numbers')
  .description('List owned phone numbers')
  .action(async () => {
    try {
      const client = getClient();
      const numbers = await client.listPhoneNumbers();
      print(`Phone Numbers (${numbers.length})`, numbers.map((n: any) => ({
        sid: n.sid,
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        capabilities: n.capabilities,
      })));
    } catch (e: any) {
      fail(`List numbers failed: ${e.message}`);
      process.exit(1);
    }
  });

program
  .command('search-numbers')
  .description('Search available phone numbers')
  .requiredOption('-c, --country <code>', 'Country code (e.g., US)')
  .option('-a, --area-code <code>', 'Area code filter')
  .option('--contains <pattern>', 'Number pattern (e.g., 555****)')
  .option('--sms', 'SMS-enabled only')
  .option('--voice', 'Voice-enabled only')
  .option('-n, --limit <count>', 'Max results', '10')
  .action(async (opts) => {
    try {
      const client = getClient();
      const numbers = await client.searchAvailableNumbers(opts.country, {
        areaCode: opts.areaCode ? parseInt(opts.areaCode) : undefined,
        contains: opts.contains,
        smsEnabled: opts.sms,
        voiceEnabled: opts.voice,
        limit: parseInt(opts.limit),
      });
      print(`Available Numbers (${numbers.length})`, numbers.map((n: any) => ({
        phoneNumber: n.phone_number,
        friendlyName: n.friendly_name,
        capabilities: n.capabilities,
        region: n.region,
      })));
    } catch (e: any) {
      fail(`Search failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── Verify ───────────────────────────────────────────────────────────

program
  .command('verify')
  .description('Send a verification code')
  .requiredOption('-t, --to <number>', 'Phone number to verify (E.164 format)')
  .option('-c, --channel <channel>', 'Channel: sms, call, email', 'sms')
  .action(async (opts) => {
    try {
      const client = getClient();
      const result = await client.requestVerification(opts.to, opts.channel);
      success(`Verification sent via ${result.channel} to ${result.to}`);
      print('Verification', {
        sid: result.sid,
        status: result.status,
        channel: result.channel,
        to: result.to,
      });
    } catch (e: any) {
      fail(`Verification failed: ${e.message}`);
      process.exit(1);
    }
  });

program
  .command('verify-check')
  .description('Check a verification code')
  .requiredOption('-t, --to <number>', 'Phone number that was verified')
  .requiredOption('-c, --code <code>', 'Verification code')
  .action(async (opts) => {
    try {
      const client = getClient();
      const result = await client.checkVerification(opts.to, opts.code);
      if (result.status === 'approved') {
        success('Verification approved!');
      } else {
        fail(`Verification status: ${result.status}`);
      }
      print('Result', { sid: result.sid, status: result.status, to: result.to });
    } catch (e: any) {
      fail(`Check failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── Usage ────────────────────────────────────────────────────────────

program
  .command('usage')
  .description('Get usage records')
  .option('-c, --category <category>', 'Usage category (e.g., sms, calls)')
  .option('--start <date>', 'Start date (YYYY-MM-DD)')
  .option('--end <date>', 'End date (YYYY-MM-DD)')
  .action(async (opts) => {
    try {
      const client = getClient();
      const records = await client.getUsageRecords({
        category: opts.category,
        startDate: opts.start,
        endDate: opts.end,
      });
      print(`Usage Records (${records.length})`, records.map((r: any) => ({
        category: r.category,
        count: r.count,
        usage: r.usage,
        price: r.price,
        priceUnit: r.price_unit,
      })));
    } catch (e: any) {
      fail(`Usage query failed: ${e.message}`);
      process.exit(1);
    }
  });

// ── Recordings ───────────────────────────────────────────────────────

program
  .command('recordings')
  .description('List call recordings')
  .option('--call <sid>', 'Filter by call SID')
  .option('-n, --limit <count>', 'Max results', '20')
  .action(async (opts) => {
    try {
      const client = getClient();
      const recordings = await client.listRecordings(opts.call, {
        pageSize: parseInt(opts.limit),
      });
      print(`Recordings (${recordings.length})`, recordings.map((r: any) => ({
        sid: r.sid,
        callSid: r.call_sid,
        duration: r.duration,
        dateCreated: r.date_created,
      })));
    } catch (e: any) {
      fail(`List recordings failed: ${e.message}`);
      process.exit(1);
    }
  });

program.parse();
