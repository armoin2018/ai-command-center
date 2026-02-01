#!/usr/bin/env node

import { Command } from 'commander';
import { InstagramClient, loadConfig } from './instagram-client.js';

const program = new Command();

program
  .name('instagram-engagement')
  .description('Instagram engagement management - comments, mentions, DMs')
  .version('1.0.0');

// ============================================================================
// COMMENTS
// ============================================================================

const comments = program
  .command('comments')
  .description('Manage comments');

comments
  .command('list')
  .description('List comments on media')
  .argument('<media-id>', 'Media ID')
  .action(async (mediaId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getComments(mediaId);
      
      console.log(`Found ${result.data?.length || 0} comments:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

comments
  .command('reply')
  .description('Reply to a comment')
  .argument('<comment-id>', 'Comment ID')
  .option('-m, --message <text>', 'Reply message (required)', '')
  .action(async (commentId: string, options) => {
    try {
      if (!options.message) {
        console.error('Error: --message is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.replyToComment(commentId, options.message);
      
      console.log('Reply posted successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

comments
  .command('delete')
  .description('Delete a comment')
  .argument('<comment-id>', 'Comment ID')
  .option('--confirm', 'Confirm deletion')
  .action(async (commentId: string, options) => {
    try {
      if (!options.confirm) {
        console.error('Error: Add --confirm flag to delete comment');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.deleteComment(commentId);
      
      console.log('Comment deleted successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

comments
  .command('hide')
  .description('Hide a comment')
  .argument('<comment-id>', 'Comment ID')
  .action(async (commentId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.hideComment(commentId, true);
      
      console.log('Comment hidden successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

comments
  .command('unhide')
  .description('Unhide a comment')
  .argument('<comment-id>', 'Comment ID')
  .action(async (commentId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.hideComment(commentId, false);
      
      console.log('Comment unhidden successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MENTIONS
// ============================================================================

const mentions = program
  .command('mentions')
  .description('Manage mentions');

mentions
  .command('list')
  .description('List mentions in stories and posts')
  .option('-l, --limit <number>', 'Limit results', '25')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getMentions(parseInt(options.limit));
      
      console.log(`Found ${result.data?.length || 0} mentions:`);
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
