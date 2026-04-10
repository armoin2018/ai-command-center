import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';
import { GeminiClient } from './index';

dotenv.config();

const program = new Command();

// Initialize GeminiClient
const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY,
  projectId: process.env.GEMINI_PROJECT_ID,
  location: process.env.GEMINI_LOCATION || 'us-central1',
  serviceAccountKey: process.env.GEMINI_SERVICE_ACCOUNT_KEY,
  accountType: (process.env.GEMINI_ACCOUNT_TYPE as any) || 'free',
  outputDir: process.env.GEMINI_OUTPUT_DIR || './output'
});

const setupInstructions = `
${chalk.green('Step 1: Create Google Account')}
${chalk.blue('For Free/Pay-as-you-go:')}
- Visit https://aistudio.google.com/
- Sign in with Google account
- Accept terms of service
- No credit card required for Free tier

${chalk.blue('For Enterprise (Vertex AI):')}
- Visit https://cloud.google.com/vertex-ai
- Create or select GCP project
- Enable Vertex AI API
- Set up billing account

${chalk.green('Step 2: Get API Key')}
${chalk.blue('For Free/Pay-as-you-go:')}
- Go to https://aistudio.google.com/app/apikey
- Click "Create API key"
- Select project or create new
- Copy API key

${chalk.blue('For Enterprise (Vertex AI):')}
- Create Service Account in GCP Console
- Grant permissions: aiplatform.user, storage.admin
- Download JSON key file

${chalk.green('Step 3: Configure Environment')}
- Create .env file with:
  GEMINI_API_KEY=AIzaSy...your_api_key
  GEMINI_ACCOUNT_TYPE=free  # or 'paid', 'enterprise'

${chalk.green('Step 4: Configure AI-ley')}
- Add to .github/aicc/aicc.yaml:
  skills:
    gemini:
      type: media
      path: .github/skills/ailey-media-gemini
      config:
        apiKey: \${GEMINI_API_KEY}
        accountType: \${GEMINI_ACCOUNT_TYPE}

${chalk.blue('Resources:')}
- Google AI Studio: https://aistudio.google.com/
- API Docs: https://ai.google.dev/gemini-api/docs
- Pricing: https://ai.google.dev/pricing
`;

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard for Google Gemini')
  .action(() => {
    console.log('\n' + chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('        Google Gemini AI-ley Skill Setup Wizard'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
    console.log(setupInstructions);
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
  });

// Detect command
program
  .command('detect')
  .description('Detect account tier and capabilities')
  .action(async () => {
    try {
      console.log(chalk.yellow('\n→ Detecting Google Gemini account tier...\n'));
      const tier = await client.detectAccountTier();
      
      console.log(chalk.green(`✓ Account Plan: ${chalk.bold(tier.tier)}`));
      console.log(chalk.blue(`  Rate Limit: ${tier.rateLimit} requests/minute`));
      console.log(chalk.blue(`  Daily Limit: ${tier.dailyLimit} requests/day`));
      console.log(chalk.blue(`  Max Image Resolution: ${tier.maxImageResolution}`));
      console.log(chalk.blue(`  Max Video Length: ${tier.maxVideoLength} seconds`));
      console.log(chalk.blue(`  Cost per Image: $${tier.costPerImage}`));
      console.log(chalk.blue(`  Cost per Video: $${tier.costPerVideo}`));
      console.log(chalk.blue(`  Features:`));
      tier.features.forEach(f => {
        console.log(chalk.blue(`    • ${f}`));
      });
      
      if (tier.tier === 'Free') {
        console.log(chalk.yellow('\n  💡 Upgrade to Pay-as-you-go for:'));
        console.log(chalk.yellow('     - Higher rate limits (60/min)'));
        console.log(chalk.yellow('     - 4K resolution support'));
        console.log(chalk.yellow('     - Extended videos (16 sec)'));
        console.log(chalk.yellow('     - Image upscaling'));
      }
      
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Generate command
program
  .command('generate')
  .description('Generate image from text prompt')
  .option('-p, --prompt <text>', 'Text prompt')
  .option('-n, --negative-prompt <text>', 'Negative prompt')
  .option('-a, --aspect-ratio <ratio>', 'Aspect ratio (1:1, 16:9, 9:16)', '1:1')
  .option('-c, --count <number>', 'Number of images', '1')
  .option('-s, --seed <number>', 'Random seed')
  .option('-o, --output <filename>', 'Output filename', 'generated.png')
  .action(async (options) => {
    try {
      if (!options.prompt) {
        console.error(chalk.red('--prompt required'));
        process.exit(1);
      }
      
      console.log(chalk.yellow('\n→ Generating image...\n'));
      console.log(chalk.blue(`  Prompt: ${options.prompt}`));
      console.log(chalk.blue(`  Aspect Ratio: ${options.aspectRatio}`));
      console.log(chalk.blue(`  Count: ${options.count}`));
      
      const result = await client.generateImage({
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        aspectRatio: options.aspectRatio,
        numberOfImages: parseInt(options.count),
        seed: options.seed ? parseInt(options.seed) : undefined
      });
      
      console.log(chalk.green(`\n✓ Generated ${result.images.length} image(s)`));
      
      for (let i = 0; i < result.images.length; i++) {
        const filename = result.images.length > 1
          ? options.output.replace(/(\.[^.]+)$/, `-${i + 1}$1`)
          : options.output;
        
        const path = await client.saveOutput(result.images[i].data, filename);
        console.log(chalk.blue(`  Saved: ${path}`));
      }
      
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Edit command
program
  .command('edit')
  .description('Edit existing image')
  .option('-i, --image <path>', 'Input image path')
  .option('-m, --mask <path>', 'Mask image path')
  .option('-p, --prompt <text>', 'Edit prompt')
  .option('--mode <mode>', 'Edit mode (inpaint, outpaint, style-transfer)', 'inpaint')
  .option('--strength <number>', 'Edit strength (0-1)', '0.8')
  .option('-o, --output <filename>', 'Output filename', 'edited.png')
  .action(async (options) => {
    try {
      if (!options.image || !options.prompt) {
        console.error(chalk.red('--image and --prompt required'));
        process.exit(1);
      }
      
      console.log(chalk.yellow('\n→ Editing image...\n'));
      console.log(chalk.blue(`  Image: ${options.image}`));
      console.log(chalk.blue(`  Prompt: ${options.prompt}`));
      console.log(chalk.blue(`  Mode: ${options.mode}`));
      
      const result = await client.editImage({
        image: options.image,
        mask: options.mask,
        prompt: options.prompt,
        mode: options.mode,
        strength: parseFloat(options.strength)
      });
      
      const path = await client.saveOutput(result.images[0].data, options.output);
      console.log(chalk.green('\n✓ Image edited'));
      console.log(chalk.blue(`  Saved: ${path}\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Upscale command
program
  .command('upscale')
  .description('Upscale image resolution')
  .option('-i, --image <path>', 'Input image path')
  .option('-f, --factor <number>', 'Upscale factor (2 or 4)', '4')
  .option('-o, --output <filename>', 'Output filename', 'upscaled.png')
  .action(async (options) => {
    try {
      if (!options.image) {
        console.error(chalk.red('--image required'));
        process.exit(1);
      }
      
      const tier = await client.detectAccountTier();
      if (tier.tier === 'Free') {
        console.log(chalk.yellow('\n⚠ Upscaling requires Pay-as-you-go or Enterprise plan'));
        console.log(chalk.yellow('  Upgrade at: https://aistudio.google.com/\n'));
        return;
      }
      
      console.log(chalk.yellow('\n→ Upscaling image...\n'));
      console.log(chalk.blue(`  Image: ${options.image}`));
      console.log(chalk.blue(`  Factor: ${options.factor}x`));
      
      const result = await client.upscaleImage({
        image: options.image,
        factor: parseInt(options.factor) as 2 | 4
      });
      
      const path = await client.saveOutput(result.images[0].data, options.output);
      console.log(chalk.green('\n✓ Image upscaled'));
      console.log(chalk.blue(`  Saved: ${path}\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Video command
program
  .command('video')
  .description('Generate video from text prompt')
  .option('-p, --prompt <text>', 'Text prompt')
  .option('-d, --duration <seconds>', 'Video duration in seconds', '8')
  .option('-a, --aspect-ratio <ratio>', 'Aspect ratio (16:9, 9:16, 1:1)', '16:9')
  .option('--fps <number>', 'Frames per second', '30')
  .option('-o, --output <filename>', 'Output filename', 'generated.mp4')
  .action(async (options) => {
    try {
      if (!options.prompt) {
        console.error(chalk.red('--prompt required'));
        process.exit(1);
      }
      
      const tier = await client.detectAccountTier();
      const duration = parseInt(options.duration);
      
      if (duration > tier.maxVideoLength) {
        console.log(chalk.yellow(`\n⚠ Duration ${duration}s exceeds tier limit of ${tier.maxVideoLength}s`));
        console.log(chalk.yellow(`  Reducing to ${tier.maxVideoLength}s\n`));
        options.duration = tier.maxVideoLength.toString();
      }
      
      console.log(chalk.yellow('\n→ Generating video...\n'));
      console.log(chalk.blue(`  Prompt: ${options.prompt}`));
      console.log(chalk.blue(`  Duration: ${options.duration}s`));
      console.log(chalk.blue(`  Aspect Ratio: ${options.aspectRatio}`));
      console.log(chalk.blue(`  FPS: ${options.fps}`));
      console.log(chalk.yellow('  Note: Video generation may take 1-3 minutes...'));
      
      const result = await client.generateVideo({
        prompt: options.prompt,
        duration: parseInt(options.duration),
        aspectRatio: options.aspectRatio,
        fps: parseInt(options.fps)
      });
      
      const path = await client.saveOutput(result.video, options.output);
      console.log(chalk.green('\n✓ Video generated'));
      console.log(chalk.blue(`  Saved: ${path}`));
      console.log(chalk.blue(`  Duration: ${result.duration}s`));
      console.log(chalk.blue(`  Resolution: ${result.resolution}\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// History command
program
  .command('history')
  .description('View generation history')
  .option('-l, --limit <number>', 'Number of recent records', '20')
  .action(async (options) => {
    try {
      console.log(chalk.yellow('\n→ Fetching generation history...\n'));
      const history = await client.getGenerationHistory(parseInt(options.limit));
      
      if (history.length === 0) {
        console.log(chalk.blue('  No generation history\n'));
        return;
      }
      
      console.log(chalk.green(`✓ Found ${history.length} records\n`));
      history.forEach(record => {
        console.log(chalk.blue(`  [${record.type.toUpperCase()}] ${record.id}`));
        console.log(chalk.gray(`    Prompt: ${record.prompt}`));
        console.log(chalk.gray(`    Model: ${record.model}`));
        console.log(chalk.gray(`    Time: ${record.timestamp}`));
        if (record.outputPath) {
          console.log(chalk.gray(`    Output: ${record.outputPath}`));
        }
        console.log('');
      });
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

// Diagnose command
program
  .command('diagnose')
  .description('Run system diagnostics')
  .action(async () => {
    console.log(chalk.yellow('\n→ Running diagnostics...\n'));
    
    const checks = {
      'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
      'GEMINI_ACCOUNT_TYPE': process.env.GEMINI_ACCOUNT_TYPE,
      'GEMINI_OUTPUT_DIR': process.env.GEMINI_OUTPUT_DIR
    };

    console.log(chalk.green('Environment Variables:'));
    Object.entries(checks).forEach(([key, value]) => {
      const status = value ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${key}: ${value ? 'Set' : 'Missing'}`);
    });

    console.log(chalk.green('\nSystem Information:'));
    console.log(`  Node.js: ${process.version}`);
    console.log(`  Platform: ${process.platform}`);
    
    // Check output directory
    const outputDir = process.env.GEMINI_OUTPUT_DIR || './output';
    if (fs.existsSync(outputDir)) {
      console.log(chalk.green(`  Output directory: ${outputDir} (exists)`));
    } else {
      console.log(chalk.yellow(`  Output directory: ${outputDir} (will be created)`));
    }

    console.log('');
  });

program.parse(process.argv);
