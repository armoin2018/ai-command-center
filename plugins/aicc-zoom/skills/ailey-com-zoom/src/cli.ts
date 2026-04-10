#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { ZoomClient, createZoomClient, AccountInfo } from './index';

const program = new Command();

function displayAccountInfo(info: AccountInfo): void {
  console.log(chalk.bold('\n🎥 Zoom Account Information\n'));
  console.log(`${chalk.cyan('Account Tier:')} ${chalk.green(info.tier.charAt(0).toUpperCase() + info.tier.slice(1))}`);
  console.log(`${chalk.cyan('API Access:')} ${info.hasApiAccess ? chalk.green('✅ Enabled') : chalk.red('❌ Disabled')}`);
  console.log(`${chalk.cyan('Account Name:')} ${info.accountName}`);
  console.log(`${chalk.cyan('Hosts:')} ${info.hostCount}`);
  console.log(`${chalk.cyan('Max Participants:')} ${info.maxParticipants}`);
  console.log(`${chalk.cyan('Storage:')} ${info.storageGB} GB`);

  console.log(chalk.bold('\n📋 Available Features:\n'));
  info.features.forEach(feature => {
    console.log(`  ✅ ${feature.replace(/_/g, ' ')}`);
  });

  if (info.upgradeRequired) {
    console.log(chalk.yellow('\n⚠️  Upgrade Available\n'));
    console.log('Upgrade to Pro tier for:');
    console.log('  • Unlimited meeting duration');
    console.log('  • Webinar hosting (100 attendees)');
    console.log('  • Breakout rooms');
    console.log('  • Recording transcription');
  }
}

program
  .name('zoom-cli')
  .description('Zoom API Integration CLI')
  .version('1.0.0');

program
  .command('setup')
  .description('Interactive setup wizard')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🚀 Zoom API Setup\n'));
    const client = createZoomClient();
    const accountInfo = await client.detectAccountTier();
    displayAccountInfo(accountInfo);
    if (!accountInfo.hasApiAccess) {
      console.log(chalk.yellow('\n⚠️  Please complete API setup before continuing.\n'));
      process.exit(1);
    }
    console.log(chalk.green('\n✅ Setup complete! Your Zoom account is ready to use.\n'));
  });

program
  .command('detect')
  .description('Detect account tier and API access')
  .action(async () => {
    try {
      const client = createZoomClient();
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
      const client = createZoomClient();
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
      const client = createZoomClient();
      const info = await client.getAccountInfo();
      console.log(chalk.bold('\n📋 Account Information\n'));
      console.log(`${chalk.cyan('Account ID:')} ${info.account_id}`);
      console.log(`${chalk.cyan('Account Name:')} ${info.account_name}`);
      console.log(`${chalk.cyan('Hosts:')} ${info.host_count}`);
      console.log(`${chalk.cyan('Max Participants:')} ${info.max_participants}\n`);
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
      const client = createZoomClient();
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

const meetingCommand = program.command('meeting').description('Meeting management commands');

meetingCommand
  .command('create')
  .description('Create a new meeting')
  .requiredOption('--topic <topic>', 'Meeting topic')
  .option('--time <time>', 'Start time (ISO 8601 format)')
  .option('--duration <minutes>', 'Duration in minutes')
  .action(async (options) => {
    try {
      const client = createZoomClient();
      console.log(chalk.cyan('\n📅 Creating meeting...\n'));
      const meeting = await client.createMeeting({
        topic: options.topic,
        type: 'scheduled',
        start_time: options.time ? new Date(options.time) : new Date(),
        duration: parseInt(options.duration || '30'),
      });
      console.log(chalk.green('✅ Meeting created successfully!'));
      console.log(`${chalk.cyan('Meeting ID:')} ${meeting.id}`);
      console.log(`${chalk.cyan('Join URL:')} ${meeting.join_url}`);
      console.log(`${chalk.cyan('Start Time:')} ${meeting.start_time}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to create meeting:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

meetingCommand
  .command('list')
  .description('List all meetings')
  .action(async () => {
    try {
      const client = createZoomClient();
      console.log(chalk.bold(`\n📅 Your Meetings\n`));
      const meetings = await client.listMeetings();
      if (meetings.length === 0) {
        console.log(chalk.yellow('No meetings found\n'));
        return;
      }
      meetings.forEach((meeting, index) => {
        console.log(`${index + 1}. ${chalk.cyan(meeting.topic)}`);
        console.log(`   ID: ${meeting.id}`);
        console.log(`   Start: ${meeting.start_time}`);
        console.log(`   Duration: ${meeting.duration} minutes\n`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list meetings:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

meetingCommand
  .command('get')
  .description('Get meeting details')
  .requiredOption('--meeting-id <id>', 'Meeting ID')
  .action(async (options) => {
    try {
      const client = createZoomClient();
      const meeting = await client.getMeeting(options.meetingId);
      console.log(chalk.bold('\n📅 Meeting Details\n'));
      console.log(`${chalk.cyan('Topic:')} ${meeting.topic}`);
      console.log(`${chalk.cyan('ID:')} ${meeting.id}`);
      console.log(`${chalk.cyan('Start:')} ${meeting.start_time}`);
      console.log(`${chalk.cyan('Duration:')} ${meeting.duration} minutes`);
      console.log(`${chalk.cyan('Join URL:')} ${meeting.join_url}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to get meeting:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const recordingCommand = program.command('recording').description('Recording management commands');

recordingCommand
  .command('list')
  .description('List all recordings')
  .action(async () => {
    try {
      const client = createZoomClient();
      console.log(chalk.bold(`\n🎬 Your Recordings\n`));
      const recordings = await client.listRecordings();
      if (recordings.length === 0) {
        console.log(chalk.yellow('No recordings found\n'));
        return;
      }
      recordings.forEach((recording, index) => {
        console.log(`${index + 1}. ${chalk.cyan(recording.topic)}`);
        console.log(`   Meeting ID: ${recording.meeting_id}`);
        console.log(`   Start: ${recording.start_time}`);
        console.log(`   Duration: ${recording.duration} minutes\n`);
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list recordings:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

recordingCommand
  .command('get')
  .description('Get recording details')
  .requiredOption('--recording-id <id>', 'Recording ID')
  .action(async (options) => {
    try {
      const client = createZoomClient();
      const recording = await client.getRecording(options.recordingId);
      console.log(chalk.bold('\n🎬 Recording Details\n'));
      console.log(`${chalk.cyan('Topic:')} ${recording.topic}`);
      console.log(`${chalk.cyan('Start:')} ${recording.start_time}`);
      console.log(`${chalk.cyan('Duration:')} ${recording.duration} minutes`);
      if (recording.files && recording.files.length > 0) {
        console.log(`${chalk.cyan('Files:')}`);
        recording.files.forEach(file => {
          console.log(`  - ${file.type}: ${file.file_size} bytes`);
        });
      }
      console.log();
    } catch (error) {
      console.error(chalk.red('❌ Failed to get recording:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const userCommand = program.command('user').description('User management commands');

userCommand
  .command('list')
  .description('List all users')
  .action(async () => {
    try {
      const client = createZoomClient();
      console.log(chalk.bold(`\n👥 Zoom Users\n`));
      const users = await client.listUsers();
      if (users.length === 0) {
        console.log(chalk.yellow('No users found\n'));
        return;
      }
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${chalk.cyan(user.email)}`);
        if (user.first_name || user.last_name) {
          console.log(`   Name: ${user.first_name} ${user.last_name}`);
        }
        console.log();
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list users:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

const webinarCommand = program.command('webinar').description('Webinar management commands');

webinarCommand
  .command('create')
  .description('Create a webinar')
  .requiredOption('--topic <topic>', 'Webinar topic')
  .option('--time <time>', 'Start time (ISO 8601 format)')
  .option('--duration <minutes>', 'Duration in minutes')
  .action(async (options) => {
    try {
      const client = createZoomClient();
      console.log(chalk.cyan('\n📹 Creating webinar...\n'));
      const webinar = await client.createWebinar({
        topic: options.topic,
        start_time: options.time ? new Date(options.time) : new Date(),
        duration: parseInt(options.duration || '60'),
      });
      console.log(chalk.green('✅ Webinar created successfully!'));
      console.log(`${chalk.cyan('Webinar ID:')} ${webinar.id}`);
      console.log(`${chalk.cyan('Join URL:')} ${webinar.join_url}\n`);
    } catch (error) {
      console.error(chalk.red('❌ Failed to create webinar:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('diagnose')
  .description('Run diagnostic checks')
  .action(async () => {
    console.log(chalk.bold.cyan('\n🔍 Running Diagnostics...\n'));
    console.log(chalk.bold('1. Environment Variables'));
    const requiredVars = ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'];
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
      const client = createZoomClient();
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
      const client = createZoomClient();
      const accountInfo = await client.detectAccountTier();
      console.log(`   ${chalk.cyan('Tier:')} ${accountInfo.tier}`);
      console.log(`   ${chalk.cyan('API Access:')} ${accountInfo.hasApiAccess ? chalk.green('✅') : chalk.red('❌')}`);
    } catch (error) {
      console.log(`   ${chalk.red('❌')} Account detection failed`);
    }

    console.log(chalk.bold.green('\n✅ Diagnostics complete\n'));
  });

program.parse(process.argv);
