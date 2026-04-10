#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { WordPressClient } from './index';

dotenv.config();

const program = new Command();

program
  .name('wordpress')
  .description('WordPress Integration CLI')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Interactive setup wizard for WordPress')
  .action(async () => {
    console.log(chalk.blue('\n=== WordPress Integration Setup ===\n'));

    const instructions = `
${chalk.cyan('Choose Your WordPress Setup:')}

${chalk.yellow('Option 1: WordPress.com')}
  1. Visit https://wordpress.com/
  2. Create account or sign in
  3. Visit https://developer.wordpress.com/apps/
  4. Create new OAuth application
  5. Copy Client ID and Client Secret
  6. Add to .env:
     WORDPRESS_COM_CLIENT_ID=your_id
     WORDPRESS_COM_CLIENT_SECRET=your_secret

${chalk.yellow('Option 2: Self-Hosted WordPress')}
  1. Install WordPress on your server (or use existing)
  2. Ensure REST API is enabled (WordPress 4.7+)
  3. Log in as admin to WordPress
  4. Go to: Users → Your Profile
  5. Scroll to "Application Passwords" section
  6. Create new password
  7. Add to .env:
     WORDPRESS_SITE_URL=https://example.com
     WORDPRESS_APP_USERNAME=admin
     WORDPRESS_APP_PASSWORD=xxxx xxxx xxxx xxxx xxxx xxxx

${chalk.cyan('After Setup:')}
  1. Edit .env with your credentials
  2. Run: npm run detect
  3. Run: npm run auth verify
  4. Start managing your WordPress site!

${chalk.yellow('Resources:')}
  - WordPress: https://wordpress.com/
  - Developer Apps: https://developer.wordpress.com/apps/
  - REST API Docs: https://developer.wordpress.org/rest-api/
  - Support: https://support.wordpress.com/
    `;

    console.log(instructions);
  });

// ============================================================================
// DETECT COMMAND
// ============================================================================

program
  .command('detect')
  .description('Detect WordPress account tier')
  .action(async () => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Detecting WordPress Account ===\n'));

      const tier = await client.detectAccountTier();

      console.log(chalk.green('✓ Account Tier:'), tier.tier);
      console.log(chalk.green('✓ Site Type:'), tier.siteType === 'wordpress-com' ? 'WordPress.com' : 'Self-Hosted');
      console.log(chalk.green('✓ Storage:'), tier.storage);
      console.log(chalk.green('✓ API Access:'), tier.apiAccess ? 'Enabled' : 'Disabled');
      console.log(chalk.green('✓ Custom Domain:'), tier.customDomain ? 'Yes' : 'No');
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
  .description('Authentication commands');

authCmd
  .command('verify')
  .description('Verify WordPress credentials')
  .action(async () => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD
      });

      console.log(chalk.blue('\n=== Verifying Credentials ===\n'));

      const valid = await client.verifyCredentials();

      if (valid) {
        console.log(chalk.green('✓ Credentials are valid\n'));
      } else {
        console.log(chalk.red('✗ Credentials are invalid\n'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

authCmd
  .command('info')
  .description('Get site information')
  .action(async () => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Site Information ===\n'));

      const info = await client.getSiteInfo();

      console.log(chalk.green('✓ Site Name:'), info.name || info.title);
      console.log(chalk.green('✓ Site URL:'), info.URL || info.url);
      console.log(chalk.green('✓ Description:'), info.description);
      console.log(chalk.green('✓ Posts:'), info.post_count || 'N/A');
      console.log(chalk.green('✓ Plan:'), info.plan?.name || 'N/A');
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// POST COMMAND
// ============================================================================

const postCmd = program
  .command('post')
  .description('Post management commands');

postCmd
  .command('create')
  .description('Create new post')
  .option('--title <text>', 'Post title')
  .option('--content <text>', 'Post content')
  .option('--status <status>', 'Post status (publish, draft, pending)')
  .action(async (options) => {
    try {
      if (!options.title || !options.content) {
        console.error(chalk.red('✗ Error: --title and --content are required'));
        process.exit(1);
      }

      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Creating Post ===\n'));

      const post = await client.createPost({
        title: options.title,
        content: options.content,
        status: options.status || 'draft'
      });

      console.log(chalk.green('✓ Post Created'));
      console.log(chalk.green('✓ ID:'), post.id);
      console.log(chalk.green('✓ Title:'), post.title);
      console.log(chalk.green('✓ Status:'), post.status);
      console.log(chalk.green('✓ URL:'), post.url);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

postCmd
  .command('list')
  .description('List posts')
  .option('--limit <number>', 'Number of posts to retrieve')
  .option('--status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Listing Posts ===\n'));

      const posts = await client.getPosts({
        limit: parseInt(options.limit) || 10,
        status: options.status
      });

      console.log(chalk.green(`✓ Found ${posts.length} posts\n`));

      posts.forEach(post => {
        console.log(`${post.id} - ${post.title}`);
        console.log(`   Status: ${post.status} | URL: ${post.url}`);
      });

      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

postCmd
  .command('update')
  .description('Update post')
  .option('--id <id>', 'Post ID')
  .option('--title <text>', 'New title')
  .option('--content <text>', 'New content')
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error(chalk.red('✗ Error: --id is required'));
        process.exit(1);
      }

      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Updating Post ===\n'));

      const post = await client.updatePost(parseInt(options.id), {
        title: options.title,
        content: options.content
      });

      console.log(chalk.green('✓ Post Updated'));
      console.log(chalk.green('✓ ID:'), post.id);
      console.log(chalk.green('✓ Title:'), post.title);
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

postCmd
  .command('delete')
  .description('Delete post')
  .option('--id <id>', 'Post ID')
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error(chalk.red('✗ Error: --id is required'));
        process.exit(1);
      }

      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Deleting Post ===\n'));

      await client.deletePost(parseInt(options.id));

      console.log(chalk.green('✓ Post Deleted\n'));
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// USER COMMAND
// ============================================================================

const userCmd = program
  .command('user')
  .description('User management commands');

userCmd
  .command('list')
  .description('List site users')
  .action(async () => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Site Users ===\n'));

      const users = await client.getUsers();

      users.forEach(user => {
        console.log(`${user.id} - ${user.name} (${user.username})`);
        console.log(`   Email: ${user.email} | Roles: ${user.roles.join(', ')}`);
      });

      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

userCmd
  .command('get')
  .description('Get user details')
  .option('--id <id>', 'User ID')
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error(chalk.red('✗ Error: --id is required'));
        process.exit(1);
      }

      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== User Details ===\n'));

      const user = await client.getUser(parseInt(options.id));

      console.log(chalk.green('✓ ID:'), user.id);
      console.log(chalk.green('✓ Username:'), user.username);
      console.log(chalk.green('✓ Name:'), user.name);
      console.log(chalk.green('✓ Email:'), user.email);
      console.log(chalk.green('✓ Roles:'), user.roles.join(', '));
      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// COMMENT COMMAND
// ============================================================================

const commentCmd = program
  .command('comment')
  .description('Comment management commands');

commentCmd
  .command('list')
  .description('List comments')
  .option('--post-id <id>', 'Filter by post ID')
  .option('--status <status>', 'Filter by status (approved, hold, spam)')
  .action(async (options) => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Comments ===\n'));

      const comments = await client.getComments({
        postId: options.postId ? parseInt(options.postId) : undefined,
        status: options.status
      });

      comments.forEach(comment => {
        console.log(`${comment.id} - ${comment.author}`);
        console.log(`   Status: ${comment.status} | Post: ${comment.postId}`);
        console.log(`   ${comment.content.substring(0, 60)}...`);
      });

      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

commentCmd
  .command('approve')
  .description('Approve comment')
  .option('--id <id>', 'Comment ID')
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error(chalk.red('✗ Error: --id is required'));
        process.exit(1);
      }

      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Approving Comment ===\n'));

      await client.approveComment(parseInt(options.id));

      console.log(chalk.green('✓ Comment Approved\n'));
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

commentCmd
  .command('spam')
  .description('Mark comment as spam')
  .option('--id <id>', 'Comment ID')
  .action(async (options) => {
    try {
      if (!options.id) {
        console.error(chalk.red('✗ Error: --id is required'));
        process.exit(1);
      }

      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Marking Comment as Spam ===\n'));

      await client.spamComment(parseInt(options.id));

      console.log(chalk.green('✓ Comment Marked as Spam\n'));
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// PLUGIN COMMAND
// ============================================================================

const pluginCmd = program
  .command('plugin')
  .description('Plugin management commands');

pluginCmd
  .command('list')
  .description('List installed plugins')
  .action(async () => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Installed Plugins ===\n'));

      const plugins = await client.getPlugins();

      plugins.forEach(plugin => {
        const status = plugin.active ? chalk.green('✓ Active') : chalk.red('✗ Inactive');
        console.log(`${status} ${plugin.name} (v${plugin.version})`);
        console.log(`   ${plugin.description}`);
      });

      console.log();
    } catch (error) {
      console.error(chalk.red('✗ Error:'), error);
      process.exit(1);
    }
  });

// ============================================================================
// THEME COMMAND
// ============================================================================

const themeCmd = program
  .command('theme')
  .description('Theme management commands');

themeCmd
  .command('list')
  .description('List available themes')
  .action(async () => {
    try {
      const client = new WordPressClient({
        siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
        siteUrl: process.env.WORDPRESS_SITE_URL,
        clientId: process.env.WORDPRESS_COM_CLIENT_ID,
        clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
        appUsername: process.env.WORDPRESS_APP_USERNAME,
        appPassword: process.env.WORDPRESS_APP_PASSWORD,
        siteId: process.env.WORDPRESS_SITE_ID
      });

      console.log(chalk.blue('\n=== Available Themes ===\n'));

      const themes = await client.getThemes();

      themes.forEach(theme => {
        const status = theme.active ? chalk.green('✓ Active') : '  ';
        console.log(`${status} ${theme.name} (v${theme.version})`);
        console.log(`   ${theme.description}`);
      });

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
  .description('Run diagnostics')
  .action(async () => {
    console.log(chalk.blue('\n=== WordPress Integration Diagnostics ===\n'));

    const checks = [
      {
        name: 'Environment Variables',
        check: () => {
          const hasWordPressComVars = process.env.WORDPRESS_COM_CLIENT_ID && process.env.WORDPRESS_COM_CLIENT_SECRET;
          const hasSelfHostedVars = process.env.WORDPRESS_SITE_URL && process.env.WORDPRESS_APP_USERNAME;
          return (hasWordPressComVars || hasSelfHostedVars) ? 'Configured' : 'Missing';
        }
      },
      {
        name: 'Credentials',
        check: async () => {
          try {
            const client = new WordPressClient({
              siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
              siteUrl: process.env.WORDPRESS_SITE_URL,
              clientId: process.env.WORDPRESS_COM_CLIENT_ID,
              clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
              appUsername: process.env.WORDPRESS_APP_USERNAME,
              appPassword: process.env.WORDPRESS_APP_PASSWORD,
              siteId: process.env.WORDPRESS_SITE_ID
            });
            const valid = await client.verifyCredentials();
            return valid ? 'Valid' : 'Invalid';
          } catch {
            return 'Error';
          }
        }
      },
      {
        name: 'Account Tier',
        check: async () => {
          try {
            const client = new WordPressClient({
              siteType: (process.env.WORDPRESS_SITE_URL ? 'self-hosted' : 'wordpress-com') as any,
              siteUrl: process.env.WORDPRESS_SITE_URL,
              clientId: process.env.WORDPRESS_COM_CLIENT_ID,
              clientSecret: process.env.WORDPRESS_COM_CLIENT_SECRET,
              appUsername: process.env.WORDPRESS_APP_USERNAME,
              appPassword: process.env.WORDPRESS_APP_PASSWORD,
              siteId: process.env.WORDPRESS_SITE_ID
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
