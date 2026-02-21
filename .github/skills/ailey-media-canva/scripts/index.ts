#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { getCanvaConfig } from './config.js';
import CanvaClient from './canva-client.js';

const program = new Command();

program
  .name('canva')
  .description('Canva CLI - Manage designs, assets, and automated content creation')
  .version('1.0.0');

// Setup command
program
  .command('setup')
  .description('Interactive setup for Canva authentication')
  .action(async () => {
    console.log(chalk.blue('Canva Setup'));
    console.log(chalk.gray('─'.repeat(50)));
    
    console.log(chalk.yellow('\nOAuth 2.0 Setup:'));
    console.log('1. Go to: https://www.canva.com/developers/apps');
    console.log('2. Create a new app or select existing app');
    console.log('3. Add redirect URI: http://localhost:3000/callback');
    console.log('4. Copy your Client ID and Client Secret');
    console.log('5. Add credentials to workspace .env:');
    console.log(chalk.cyan('   CANVA_CLIENT_ID=your_client_id'));
    console.log(chalk.cyan('   CANVA_CLIENT_SECRET=your_client_secret'));
    console.log(chalk.cyan('   CANVA_REDIRECT_URI=http://localhost:3000/callback'));
    
    const config = getCanvaConfig();
    if (config.clientId && config.clientSecret) {
      console.log(chalk.green('\n✓ OAuth credentials found'));
      const client = new CanvaClient(config);
      const authUrl = await client.initiateOAuth();
      console.log(chalk.yellow('\nOpened browser for authorization...'));
      console.log('After authorization, you will receive a code.');
      console.log('Exchange it for a token with:');
      console.log(chalk.cyan(`  canva oauth-callback --code YOUR_CODE`));
    }
  });

// OAuth callback
program
  .command('oauth-callback')
  .description('Exchange OAuth authorization code for access token')
  .requiredOption('--code <code>', 'Authorization code from OAuth callback')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      const tokens = await client.exchangeCodeForToken(options.code);
      
      console.log(chalk.green('✓ Successfully obtained access token'));
      console.log('\nAdd to your workspace .env:');
      console.log(chalk.cyan(`CANVA_ACCESS_TOKEN=${tokens.access_token}`));
      console.log(chalk.cyan(`CANVA_REFRESH_TOKEN=${tokens.refresh_token}`));
      console.log(chalk.gray(`\nToken expires in: ${tokens.expires_in} seconds`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Detect tier
program
  .command('detect-tier')
  .description('Detect current Canva subscription tier')
  .action(async () => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      const tier = await client.detectTier();
      
      console.log(chalk.green('✓ Detected tier:'), chalk.cyan(tier));
      
      const { getTierCapabilities } = await import('./config.js');
      const capabilities = getTierCapabilities(tier);
      
      console.log(chalk.yellow('\nAvailable features:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(`${capabilities.brandKit ? chalk.green('✓') : chalk.red('✗')} Brand Kit`);
      console.log(`${capabilities.magicResize ? chalk.green('✓') : chalk.red('✗')} Magic Resize`);
      console.log(`${capabilities.backgroundRemover ? chalk.green('✓') : chalk.red('✗')} Background Remover`);
      console.log(`${capabilities.customFonts ? chalk.green('✓') : chalk.red('✗')} Custom Fonts`);
      console.log(`${capabilities.folders ? chalk.green('✓') : chalk.red('✗')} Folders`);
      console.log(chalk.cyan(`  Templates: ${capabilities.templates.toLocaleString()}`));
      console.log(chalk.cyan(`  Storage: ${capabilities.storage === -1 ? 'Unlimited' : capabilities.storage + ' GB'}`));
      console.log(chalk.cyan(`  Team Members: ${capabilities.teamMembers === -1 ? 'Unlimited' : capabilities.teamMembers}`));
      console.log(chalk.cyan(`  API Rate Limit: ${capabilities.apiRateLimit}/min`));
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Get current user
program
  .command('me')
  .description('Get current user information')
  .action(async () => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      const user = await client.getCurrentUser();
      
      console.log(chalk.green('✓ User:'), user.display_name || user.email);
      console.log(chalk.gray('─'.repeat(50)));
      console.log('User ID:', user.id);
      console.log('Email:', user.email);
      if (user.team_id) console.log('Team ID:', user.team_id);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List designs
program
  .command('designs')
  .description('List all designs')
  .option('--query <query>', 'Search query')
  .option('--ownership <type>', 'Ownership filter (owned, shared, all)')
  .option('--limit <number>', 'Number of results', '10')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      const params: any = { limit: parseInt(options.limit) };
      if (options.query) params.query = options.query;
      if (options.ownership) params.ownership = options.ownership;
      
      const result = await client.listDesigns(params);
      
      console.log(chalk.green(`✓ Found ${result.items?.length || 0} design(s)`));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const design of result.items || []) {
        console.log(chalk.cyan(design.title || 'Untitled'));
        console.log('  ID:', design.id);
        console.log('  Type:', design.design_type);
        console.log('  URL:', design.urls?.view_url);
        console.log('  Updated:', new Date(design.updated_at).toLocaleString());
        console.log('');
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Create design
program
  .command('create-design')
  .description('Create a new design')
  .requiredOption('--type <type>', 'Design type (e.g., presentation, social, poster)')
  .option('--title <title>', 'Design title')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      const design = await client.createDesign({
        design_type: options.type,
        title: options.title,
      });
      
      console.log(chalk.green('✓ Design created successfully'));
      console.log('ID:', design.id);
      console.log('URL:', design.urls?.view_url);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Export design
program
  .command('export')
  .description('Export a design')
  .requiredOption('--id <designId>', 'Design ID')
  .requiredOption('--format <format>', 'Export format (PNG, JPG, PDF, MP4, GIF, PPTX)')
  .option('--quality <quality>', 'Quality (low, medium, high)', 'high')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      const exportJob = await client.exportDesign(options.id, options.format.toUpperCase(), {
        quality: options.quality,
      });
      
      console.log(chalk.green('✓ Export job started'));
      console.log('Job ID:', exportJob.job.id);
      console.log('Status:', exportJob.job.status);
      
      if (exportJob.job.status === 'success') {
        console.log('Download URL:', exportJob.job.urls?.get_url);
      } else {
        console.log(chalk.yellow('\nCheck export status with:'));
        console.log(chalk.cyan(`  canva export-status --job ${exportJob.job.id}`));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Export status
program
  .command('export-status')
  .description('Check export job status')
  .requiredOption('--job <jobId>', 'Export job ID')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      const job = await client.getExportJob(options.job);
      
      console.log(chalk.green('✓ Export Job Status'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log('Job ID:', job.id);
      console.log('Status:', job.status);
      console.log('Created:', new Date(job.created_at).toLocaleString());
      
      if (job.status === 'success' && job.urls?.get_url) {
        console.log(chalk.green('\n✓ Export complete!'));
        console.log('Download URL:', job.urls.get_url);
      } else if (job.status === 'failed') {
        console.log(chalk.red('\n✗ Export failed'));
        if (job.error) console.log('Error:', job.error.message);
      } else {
        console.log(chalk.yellow('\nExport in progress...'));
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// List assets
program
  .command('assets')
  .description('List all assets')
  .option('--query <query>', 'Search query')
  .option('--type <type>', 'Asset type (IMAGE, VIDEO, AUDIO)')
  .option('--limit <number>', 'Number of results', '10')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      const params: any = { limit: parseInt(options.limit) };
      if (options.query) params.query = options.query;
      if (options.type) params.asset_type = options.type;
      
      const result = await client.listAssets(params);
      
      console.log(chalk.green(`✓ Found ${result.items?.length || 0} asset(s)`));
      console.log(chalk.gray('─'.repeat(50)));
      
      for (const asset of result.items || []) {
        console.log(chalk.cyan(asset.name || 'Untitled'));
        console.log('  ID:', asset.id);
        console.log('  Type:', asset.asset_type);
        console.log('  Size:', asset.size_bytes ? `${(asset.size_bytes / 1024 / 1024).toFixed(2)} MB` : 'N/A');
        console.log('  Uploaded:', new Date(asset.created_at).toLocaleString());
        console.log('');
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Upload asset
program
  .command('upload')
  .description('Upload an asset')
  .requiredOption('--file <path>', 'File path')
  .requiredOption('--type <type>', 'Asset type (IMAGE, VIDEO, AUDIO)')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      console.log(chalk.yellow('Uploading asset...'));
      const result = await client.uploadAsset(options.file, options.type);
      
      console.log(chalk.green('✓ Asset uploaded successfully'));
      console.log('Asset ID:', result.asset_id);
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Brand operations
program
  .command('brand')
  .description('View brand kit')
  .option('--colors', 'Show brand colors')
  .option('--fonts', 'Show brand fonts')
  .option('--logos', 'Show brand logos')
  .action(async (options) => {
    try {
      const config = getCanvaConfig();
      const client = new CanvaClient(config);
      
      if (options.colors || (!options.fonts && !options.logos)) {
        const colors = await client.getBrandColors();
        console.log(chalk.green('✓ Brand Colors'));
        console.log(chalk.gray('─'.repeat(50)));
        for (const color of colors.items || []) {
          console.log(`${color.hex_code} - ${color.name || 'Unnamed'}`);
        }
      }
      
      if (options.fonts) {
        const fonts = await client.getBrandFonts();
        console.log(chalk.green('\n✓ Brand Fonts'));
        console.log(chalk.gray('─'.repeat(50)));
        for (const font of fonts.items || []) {
          console.log(`${font.name} - ${font.family}`);
        }
      }
      
      if (options.logos) {
        const logos = await client.getBrandLogos();
        console.log(chalk.green('\n✓ Brand Logos'));
        console.log(chalk.gray('─'.repeat(50)));
        for (const logo of logos.items || []) {
          console.log(`${logo.name} - ${logo.asset_id}`);
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

program.parse();
