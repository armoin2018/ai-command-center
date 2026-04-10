#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import * as chalk from 'chalk';
import { CapCutClient } from './index';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
config();

const program = new Command();
program.version('1.0.0').description('CapCut integration CLI');

/**
 * Get configured CapCut client
 */
function getClient(): CapCutClient {
  return new CapCutClient({
    apiKey: process.env.CAPCUT_API_KEY || '',
    apiSecret: process.env.CAPCUT_API_SECRET || '',
    accessToken: process.env.CAPCUT_ACCESS_TOKEN || '',
    userId: process.env.CAPCUT_USER_ID || '',
  });
}

/**
 * Setup command
 */
program
  .command('setup')
  .description('Setup CapCut integration')
  .action(async () => {
    console.log(chalk.blue('🎬 CapCut Integration Setup\n'));

    const setupInstructions = `
${chalk.bold('Get Started with CapCut:')}

${chalk.green('Step 1: Create CapCut Account')}
- Sign up at https://www.capcut.com/
- Download CapCut desktop app
- Verify your email

${chalk.green('Step 2: Get API Access')}
- Go to https://developers.capcut.com/
- Create developer account
- Create new application
- Request API access
- Copy API Key and Secret
- Generate access token

${chalk.green('Step 3: Configure Environment')}
- Create .env file
- Add CAPCUT_API_KEY
- Add CAPCUT_API_SECRET
- Add CAPCUT_ACCESS_TOKEN
- Add CAPCUT_USER_ID

${chalk.yellow('Next steps:')}
1. Run: npm run detect
2. Create your first video project
3. Explore templates and effects
`;

    console.log(setupInstructions);
    console.log(chalk.gray('For detailed documentation, see SKILL.md'));
  });

/**
 * Detect account tier
 */
program
  .command('detect')
  .description('Detect account tier and capabilities')
  .action(async () => {
    try {
      const client = getClient();
      const tier = await client.detectAccountTier();

      console.log(chalk.blue('\n🎥 CapCut Account Tier\n'));
      console.log(chalk.bold(`Tier: ${tier.tier}`));
      console.log(chalk.bold(`Storage: ${tier.storage} ${tier.storageUnit}`));
      console.log(chalk.bold(`Max Resolution: ${tier.maxResolution}`));
      console.log(chalk.bold(`Watermark: ${tier.watermark ? 'Applied' : 'None'}`));
      console.log(chalk.bold(`Max Batch/Day: ${tier.maxBatchPerDay}`));
      console.log(chalk.bold(`Support: ${tier.supportLevel}`));
      console.log(chalk.bold('\nFeatures:'));
      tier.features.forEach((f) => console.log(`  ✓ ${f}`));
      console.log();
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Auth commands
 */
const authCmd = program.command('auth').description('Authentication commands');

authCmd
  .command('verify')
  .description('Verify API credentials')
  .action(async () => {
    try {
      const client = getClient();
      const isValid = await client.verifyCredentials();

      if (isValid) {
        console.log(chalk.green('✅ API credentials are valid'));
      } else {
        console.log(chalk.red('❌ API credentials are invalid'));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Verification failed: ${error}`));
      process.exit(1);
    }
  });

authCmd
  .command('info')
  .description('Get account information')
  .action(async () => {
    try {
      const client = getClient();
      const info = await client.getAccountInfo();
      console.log(chalk.blue('\n📋 Account Information\n'));
      console.log(JSON.stringify(info, null, 2));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Project commands
 */
const projectCmd = program.command('project').description('Project management');

projectCmd
  .command('create')
  .description('Create new project')
  .requiredOption('--name <name>', 'Project name')
  .option('--description <description>', 'Project description')
  .option('--resolution <resolution>', 'Resolution (1920x1080)', '1920x1080')
  .action(async (options) => {
    try {
      const [width, height] = options.resolution.split('x').map(Number);
      const client = getClient();
      const project = await client.createProject({
        name: options.name,
        description: options.description,
        width,
        height,
      });

      console.log(chalk.green(`✅ Project created: ${project.id}`));
      console.log(`Name: ${project.name}`);
      console.log(`Resolution: ${project.width}x${project.height}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

projectCmd
  .command('list')
  .description('List projects')
  .option('--limit <limit>', 'Number of projects', '10')
  .option('--sort <sort>', 'Sort by (created, modified, name)', 'modified')
  .action(async (options) => {
    try {
      const client = getClient();
      const projects = await client.listProjects({
        limit: parseInt(options.limit),
        sortBy: options.sort,
      });

      console.log(chalk.blue(`\n🎬 Projects (${projects.length})\n`));
      projects.forEach((p) => {
        console.log(`${p.id} | ${p.name} | ${p.width}x${p.height} | ${p.status}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

projectCmd
  .command('get')
  .description('Get project details')
  .requiredOption('--id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const project = await client.getProject(options.id);

      console.log(chalk.blue('\n🎬 Project Details\n'));
      console.log(`ID: ${project.id}`);
      console.log(`Name: ${project.name}`);
      console.log(`Resolution: ${project.width}x${project.height}`);
      console.log(`Duration: ${project.duration}s`);
      console.log(`Status: ${project.status}`);
      console.log(`Clips: ${project.clips.length}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

projectCmd
  .command('delete')
  .description('Delete project')
  .requiredOption('--id <id>', 'Project ID')
  .action(async (options) => {
    try {
      const client = getClient();
      await client.deleteProject(options.id);
      console.log(chalk.green(`✅ Project deleted: ${options.id}`));
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Video commands
 */
const videoCmd = program.command('video').description('Video editing');

videoCmd
  .command('add-clip')
  .description('Add clip to project')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--file <path>', 'File path or URL')
  .option('--type <type>', 'Type (video, image, audio)', 'video')
  .action(async (options) => {
    try {
      const client = getClient();
      const clip = await client.addClip(options.projectId, {
        fileUrl: options.file,
        type: options.type,
        duration: 5,
      });

      console.log(chalk.green(`✅ Clip added: ${clip.id}`));
      console.log(`Duration: ${clip.duration}s`);
      console.log(`Type: ${clip.type}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

videoCmd
  .command('effect')
  .description('Apply effect to clip')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--clip-id <id>', 'Clip ID')
  .requiredOption('--effect-id <id>', 'Effect ID')
  .option('--intensity <intensity>', 'Effect intensity (0-1)', '0.8')
  .action(async (options) => {
    try {
      const client = getClient();
      const clip = await client.applyEffect(
        options.projectId,
        options.clipId,
        options.effectId,
        { intensity: parseFloat(options.intensity) }
      );

      console.log(chalk.green(`✅ Effect applied to clip: ${clip.id}`));
      console.log(`Effects: ${clip.effects.length}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

videoCmd
  .command('add-music')
  .description('Add music to project')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--music-id <id>', 'Music ID')
  .option('--volume <volume>', 'Volume (0-1)', '1')
  .action(async (options) => {
    try {
      const client = getClient();
      const music = await client.addMusic(options.projectId, options.musicId, {
        volume: parseFloat(options.volume),
      });

      console.log(chalk.green(`✅ Music added: ${music.id}`));
      console.log(`Title: ${music.title}`);
      console.log(`Artist: ${music.artist}`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Asset commands
 */
const assetCmd = program.command('asset').description('Asset management');

assetCmd
  .command('effects')
  .description('List effects')
  .option('--category <category>', 'Effect category')
  .option('--limit <limit>', 'Number of effects', '20')
  .action(async (options) => {
    try {
      const client = getClient();
      const effects = await client.listEffects({
        category: options.category,
        limit: parseInt(options.limit),
      });

      console.log(chalk.blue(`\n✨ Effects (${effects.length})\n`));
      effects.forEach((e) => {
        console.log(`${e.id} | ${e.name} | ${e.category}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

assetCmd
  .command('music-search')
  .description('Search music')
  .requiredOption('--keyword <keyword>', 'Search keyword')
  .option('--limit <limit>', 'Number of results', '10')
  .action(async (options) => {
    try {
      const client = getClient();
      const music = await client.searchMusic(options.keyword);

      console.log(chalk.blue(`\n🎵 Search Results (${music.length})\n`));
      music.slice(0, parseInt(options.limit)).forEach((m) => {
        console.log(`${m.id} | ${m.title} - ${m.artist} | ${m.genre}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

assetCmd
  .command('filters')
  .description('List filters')
  .option('--category <category>', 'Filter category')
  .action(async (options) => {
    try {
      const client = getClient();
      const filters = await client.listFilters(options.category);

      console.log(chalk.blue(`\n🎨 Filters (${filters.length})\n`));
      filters.forEach((f) => {
        console.log(`${f.id} | ${f.name} | ${f.category}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Template commands
 */
const templateCmd = program.command('template').description('Template management');

templateCmd
  .command('list')
  .description('List templates')
  .option('--category <category>', 'Template category')
  .option('--trending', 'Show trending templates')
  .option('--limit <limit>', 'Number of templates', '20')
  .action(async (options) => {
    try {
      const client = getClient();
      const templates = await client.listTemplates({
        category: options.category,
        trending: options.trending,
        limit: parseInt(options.limit),
      });

      console.log(chalk.blue(`\n📽️  Templates (${templates.length})\n`));
      templates.forEach((t) => {
        console.log(`${t.id} | ${t.name} | ${t.category}`);
      });
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

templateCmd
  .command('apply')
  .description('Apply template to project')
  .requiredOption('--project-id <id>', 'Project ID')
  .requiredOption('--template-id <id>', 'Template ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const project = await client.applyTemplate(options.projectId, options.templateId);

      console.log(chalk.green(`✅ Template applied`));
      console.log(`Project: ${project.id}`);
      console.log(`Duration: ${project.duration}s`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Export commands
 */
const exportCmd = program.command('export').description('Export and rendering');

exportCmd
  .command('render')
  .description('Export video')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--format <format>', 'Export format (mp4, mov, webm)', 'mp4')
  .option('--resolution <resolution>', 'Resolution (1080p, 4k, 8k)', '1080p')
  .option('--quality <quality>', 'Quality (low, medium, high, maximum)', 'high')
  .option('--preset <preset>', 'Preset (youtube, tiktok, instagram)', 'youtube')
  .action(async (options) => {
    try {
      const client = getClient();
      const exportJob = await client.exportVideo(options.projectId, {
        format: options.format,
        resolution: options.resolution,
        quality: options.quality,
        preset: options.preset,
      });

      console.log(chalk.green(`✅ Export started`));
      console.log(`Job ID: ${exportJob.jobId}`);
      console.log(`Status: ${exportJob.status}`);
      console.log(`Progress: ${exportJob.progress}%`);
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

exportCmd
  .command('status')
  .description('Get export status')
  .requiredOption('--job-id <id>', 'Export job ID')
  .action(async (options) => {
    try {
      const client = getClient();
      const status = await client.getExportStatus(options.jobId);

      console.log(chalk.blue('\n📊 Export Status\n'));
      console.log(`Job ID: ${status.jobId}`);
      console.log(`Status: ${status.status}`);
      console.log(`Progress: ${status.progress}%`);
      if (status.error) {
        console.log(chalk.red(`Error: ${status.error}`));
      }
    } catch (error) {
      console.error(chalk.red(`❌ Error: ${error}`));
      process.exit(1);
    }
  });

/**
 * Diagnostic command
 */
program
  .command('diagnose')
  .description('Run diagnostics')
  .action(async () => {
    console.log(chalk.blue('\n🔍 CapCut Diagnostics\n'));

    const checks = [
      { name: 'Environment Variables', check: () => !!process.env.CAPCUT_API_KEY },
      { name: 'API Credentials', check: () => !!process.env.CAPCUT_ACCESS_TOKEN },
      { name: 'User ID', check: () => !!process.env.CAPCUT_USER_ID },
      { name: '.env File', check: () => fs.existsSync(path.join(process.cwd(), '.env')) },
    ];

    for (const check of checks) {
      const status = check.check() ? chalk.green('✅') : chalk.red('❌');
      console.log(`${status} ${check.name}`);
    }

    console.log('\n' + chalk.gray('For detailed setup instructions, run: npm run setup'));
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
