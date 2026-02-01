#!/usr/bin/env node

import { Command } from 'commander';
import { FacebookClient, loadConfig } from './facebook-client.js';
import fs from 'fs';

const program = new Command();

program
  .name('facebook-personal')
  .description('Facebook personal features management')
  .version('1.0.0');

// ============================================================================
// PROFILE COMMANDS
// ============================================================================

const profile = program
  .command('profile')
  .description('Manage user profile');

profile
  .command('show')
  .description('Show user profile information')
  .option('-u, --user-id <id>', 'User ID (default: me)')
  .option('-f, --fields <fields>', 'Comma-separated fields to retrieve')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const fields = options.fields?.split(',');
      const profile = await client.getUserProfile(options.userId || 'me', fields);
      
      console.log(JSON.stringify(profile, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// POST COMMANDS
// ============================================================================

const posts = program
  .command('posts')
  .description('Manage posts on timeline');

posts
  .command('create')
  .description('Create a new post')
  .option('-m, --message <message>', 'Post message/text')
  .option('-l, --link <url>', 'Link to share')
  .option('-s, --schedule <datetime>', 'Schedule for future (ISO 8601 format)')
  .option('--draft', 'Save as draft (unpublished)')
  .action(async (options) => {
    try {
      if (!options.message && !options.link) {
        console.error('Error: Either --message or --link is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.createPost({
        message: options.message,
        link: options.link,
        scheduled: options.schedule ? new Date(options.schedule) : undefined,
        published: !options.draft
      });
      
      console.log('Post created successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// PHOTO COMMANDS
// ============================================================================

const photos = program
  .command('photos')
  .description('Manage photos and albums');

photos
  .command('upload')
  .description('Upload a photo')
  .argument('<file>', 'Path to photo file')
  .option('-m, --message <message>', 'Photo caption')
  .option('-a, --album <id>', 'Album ID to upload to')
  .action(async (file, options) => {
    try {
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.uploadPhoto(file, options.message, options.album);
      
      console.log('Photo uploaded successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// FRIENDS COMMANDS
// ============================================================================

const friends = program
  .command('friends')
  .description('Manage friends');

friends
  .command('list')
  .description('List friends')
  .option('-u, --user-id <id>', 'User ID (default: me)')
  .option('-l, --limit <number>', 'Limit results', '25')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getFriends(
        options.userId || 'me',
        parseInt(options.limit)
      );
      
      console.log(`Found ${result.data?.length || 0} friends:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// GROUPS COMMANDS
// ============================================================================

const groups = program
  .command('groups')
  .description('Manage groups');

groups
  .command('list')
  .description('List groups you belong to')
  .option('-u, --user-id <id>', 'User ID (default: me)')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getGroups(options.userId || 'me');
      
      console.log(`Found ${result.data?.length || 0} groups:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

groups
  .command('post')
  .description('Post to a group')
  .argument('<group-id>', 'Group ID')
  .option('-m, --message <message>', 'Post message (required)', '')
  .option('-l, --link <url>', 'Link to share')
  .action(async (groupId, options) => {
    try {
      if (!options.message) {
        console.error('Error: --message is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.postToGroup(groupId, options.message, options.link);
      
      console.log('Posted to group successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// EVENTS COMMANDS
// ============================================================================

const events = program
  .command('events')
  .description('Manage events');

events
  .command('list')
  .description('List events')
  .option('-u, --user-id <id>', 'User ID (default: me)')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.getEvents(options.userId || 'me');
      
      console.log(`Found ${result.data?.length || 0} events:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

events
  .command('create')
  .description('Create an event')
  .option('-n, --name <name>', 'Event name (required)', '')
  .option('-s, --start-time <datetime>', 'Start time (ISO 8601 format, required)', '')
  .option('-d, --description <description>', 'Event description')
  .option('-l, --location <location>', 'Event location')
  .action(async (options) => {
    try {
      if (!options.name || !options.startTime) {
        console.error('Error: --name and --start-time are required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new FacebookClient(config);
      
      const result = await client.createEvent(
        options.name,
        new Date(options.startTime),
        options.description,
        options.location
      );
      
      console.log('Event created successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
