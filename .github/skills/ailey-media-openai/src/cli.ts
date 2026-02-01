import { Command } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import fs from 'fs';
import { OpenAIClient } from './index';

dotenv.config();

const program = new Command();

// Initialize OpenAIClient
const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY || '',
  organizationId: process.env.OPENAI_ORG_ID,
  outputDir: process.env.OPENAI_OUTPUT_DIR || './output'
});

const setupInstructions = `
${chalk.green('Step 1: Create OpenAI Account')}
- Visit https://platform.openai.com/signup
- Sign up with email or Google/Microsoft
- Verify email and phone number

${chalk.green('Step 2: Add Payment Method')}
- Go to https://platform.openai.com/account/billing/overview
- Click "Add payment details"
- Enter credit card information
- Set spending limit (recommended: $10/month to start)

${chalk.green('Step 3: Get API Key')}
- Visit https://platform.openai.com/api-keys
- Click "Create new secret key"
- Name your key (e.g., "AI-ley Skill")
- Copy key immediately (shown only once!)
- Store securely - never commit to version control

${chalk.green('Step 4: Configure Environment')}
- Create .env file with:
  OPENAI_API_KEY=sk-proj-...your_key
  OPENAI_ACCOUNT_TYPE=pay-as-you-go

${chalk.green('Step 5: Configure AI-ley')}
- Add to .github/aicc/aicc.yaml:
  skills:
    openai:
      type: media
      path: .github/skills/ailey-media-openai
      config:
        apiKey: \${OPENAI_API_KEY}

${chalk.blue('Account Tiers (automatic based on spending):')}
- Free Trial: $5 credits, expires in 3 months
- Tier 1: $5+ spent, 5 req/min
- Tier 2: $50+ spent, 7 req/min
- Tier 3: $100+ spent, 7 req/min
- Tier 4: $250+ spent, 15 req/min, Sora access
- Tier 5: $1,000+ spent, 50 req/min, priority support

${chalk.blue('Resources:')}
- Platform: https://platform.openai.com/
- API Keys: https://platform.openai.com/api-keys
- Docs: https://platform.openai.com/docs/guides/images
- Pricing: https://openai.com/pricing
`;

program
  .command('setup')
  .description('Interactive setup wizard for OpenAI')
  .action(() => {
    console.log('\n' + chalk.cyan('═══════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('        OpenAI DALL-E & Sora AI-ley Skill Setup'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
    console.log(setupInstructions);
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));
  });

program
  .command('detect')
  .description('Detect account tier and capabilities')
  .action(async () => {
    try {
      console.log(chalk.yellow('\n→ Detecting OpenAI account tier...\n'));
      const tier = await client.detectAccountTier();
      
      console.log(chalk.green(`✓ Account Tier: ${chalk.bold(tier.tier)}`));
      console.log(chalk.blue(`  Rate Limit: ${tier.rateLimit} requests/minute`));
      console.log(chalk.blue(`  Daily Limit: ${tier.dailyLimit} requests/day`));
      console.log(chalk.blue(`  Sora Access: ${tier.soraAccess ? 'Available' : 'Not Available'}`));
      console.log(chalk.blue(`  Cost per Image: $${tier.costPerImage}`));
      console.log(chalk.blue(`  Features:`));
      tier.features.forEach(f => console.log(chalk.blue(`    • ${f}`)));
      
      if (!tier.soraAccess) {
        console.log(chalk.yellow('\n  💡 Sora video generation requires Tier 4+ (spend $250+)'));
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('generate')
  .description('Generate image from text prompt')
  .option('-p, --prompt <text>', 'Text prompt (max 4000 chars)')
  .option('-m, --model <model>', 'Model (dall-e-3, dall-e-2)', 'dall-e-3')
  .option('-s, --size <size>', 'Size (1024x1024, 1024x1792, 1792x1024)', '1024x1024')
  .option('-q, --quality <quality>', 'Quality (standard, hd)', 'standard')
  .option('--style <style>', 'Style (vivid, natural)', 'vivid')
  .option('-o, --output <filename>', 'Output filename', 'generated.png')
  .action(async (options) => {
    try {
      if (!options.prompt) {
        console.error(chalk.red('--prompt required'));
        process.exit(1);
      }
      
      console.log(chalk.yellow('\n→ Generating image...\n'));
      console.log(chalk.blue(`  Prompt: ${options.prompt}`));
      console.log(chalk.blue(`  Model: ${options.model}`));
      console.log(chalk.blue(`  Size: ${options.size}`));
      console.log(chalk.blue(`  Quality: ${options.quality}`));
      
      const result = await client.generateImage({
        prompt: options.prompt,
        model: options.model,
        size: options.size,
        quality: options.quality,
        style: options.style
      });
      
      const path = await client.saveOutput(result.images[0].b64_json!, options.output);
      const cost = client.estimateCost('image', {
        model: options.model,
        size: options.size,
        quality: options.quality,
        n: 1
      });
      
      console.log(chalk.green('\n✓ Image generated'));
      console.log(chalk.blue(`  Saved: ${path}`));
      if (result.images[0].revisedPrompt) {
        console.log(chalk.blue(`  Revised prompt: ${result.images[0].revisedPrompt}`));
      }
      console.log(chalk.blue(`  Cost: $${cost.toFixed(3)}\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('edit')
  .description('Edit image with transparent mask')
  .option('-i, --image <path>', 'Input image (PNG)')
  .option('-m, --mask <path>', 'Mask image (PNG with transparency)')
  .option('-p, --prompt <text>', 'Edit prompt')
  .option('-s, --size <size>', 'Size (1024x1024, 512x512, 256x256)', '1024x1024')
  .option('-o, --output <filename>', 'Output filename', 'edited.png')
  .action(async (options) => {
    try {
      if (!options.image || !options.mask || !options.prompt) {
        console.error(chalk.red('--image, --mask, and --prompt required'));
        process.exit(1);
      }
      
      console.log(chalk.yellow('\n→ Editing image...\n'));
      console.log(chalk.blue(`  Image: ${options.image}`));
      console.log(chalk.blue(`  Mask: ${options.mask}`));
      console.log(chalk.blue(`  Prompt: ${options.prompt}`));
      
      const result = await client.editImage({
        image: options.image,
        mask: options.mask,
        prompt: options.prompt,
        size: options.size
      });
      
      const path = await client.saveOutput(result.images[0].b64_json!, options.output);
      console.log(chalk.green('\n✓ Image edited'));
      console.log(chalk.blue(`  Saved: ${path}\n`));
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('variation')
  .description('Create variations of an image')
  .option('-i, --image <path>', 'Input image (PNG)')
  .option('-c, --count <number>', 'Number of variations', '3')
  .option('-s, --size <size>', 'Size (1024x1024, 512x512, 256x256)', '1024x1024')
  .option('-o, --output <filename>', 'Output filename pattern', 'variation.png')
  .action(async (options) => {
    try {
      if (!options.image) {
        console.error(chalk.red('--image required'));
        process.exit(1);
      }
      
      console.log(chalk.yellow('\n→ Creating variations...\n'));
      console.log(chalk.blue(`  Image: ${options.image}`));
      console.log(chalk.blue(`  Count: ${options.count}`));
      
      const result = await client.createVariation({
        image: options.image,
        n: parseInt(options.count),
        size: options.size
      });
      
      console.log(chalk.green(`\n✓ Created ${result.images.length} variations`));
      
      for (let i = 0; i < result.images.length; i++) {
        const filename = result.images.length > 1
          ? options.output.replace(/(\.[^.]+)$/, `-${i + 1}$1`)
          : options.output;
        
        const path = await client.saveOutput(result.images[i].b64_json!, filename);
        console.log(chalk.blue(`  Saved: ${path}`));
      }
      console.log('');
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

program
  .command('video')
  .description('Generate video (Tier 4+ only - Sora early access)')
  .option('-p, --prompt <text>', 'Text prompt')
  .option('-d, --duration <seconds>', 'Duration in seconds', '5')
  .option('-r, --resolution <res>', 'Resolution (1920x1080, 1080x1920)', '1920x1080')
  .option('--fps <number>', 'FPS (24, 30, 60)', '30')
  .option('-o, --output <filename>', 'Output filename', 'generated.mp4')
  .action(async (options) => {
    try {
      if (!options.prompt) {
        console.error(chalk.red('--prompt required'));
        process.exit(1);
      }
      
      const tier = await client.detectAccountTier();
      if (!tier.soraAccess) {
        console.log(chalk.yellow('\n⚠ Sora requires Tier 4+ (spend $250+)'));
        console.log(chalk.yellow('  Current tier: ' + tier.tier));
        console.log(chalk.yellow('  Visit: https://openai.com/sora\n'));
        return;
      }
      
      console.log(chalk.yellow('\n→ Generating video...\n'));
      console.log(chalk.blue(`  Prompt: ${options.prompt}`));
      console.log(chalk.yellow('  Note: Sora API is in limited access'));
      
      try {
        const result = await client.generateVideo({
          prompt: options.prompt,
          duration: parseInt(options.duration),
          resolution: options.resolution,
          fps: parseInt(options.fps)
        });
        
        const path = await client.saveOutput(result.video, options.output);
        console.log(chalk.green('\n✓ Video generated'));
        console.log(chalk.blue(`  Saved: ${path}\n`));
      } catch (error: any) {
        console.log(chalk.yellow(`\n⚠ ${error.message}\n`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Error: ${error}`));
      process.exit(1);
    }
  });

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
      
      const totalCost = client.getTotalCost();
      console.log(chalk.green(`✓ Found ${history.length} records`));
      console.log(chalk.blue(`  Total cost: $${totalCost.toFixed(2)}\n`));
      
      history.forEach(record => {
        console.log(chalk.blue(`  [${record.type.toUpperCase()}] ${record.id}`));
        console.log(chalk.gray(`    Prompt: ${record.prompt}`));
        console.log(chalk.gray(`    Model: ${record.model}`));
        if (record.cost) {
          console.log(chalk.gray(`    Cost: $${record.cost.toFixed(3)}`));
        }
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

program
  .command('diagnose')
  .description('Run system diagnostics')
  .action(() => {
    console.log(chalk.yellow('\n→ Running diagnostics...\n'));
    
    const checks = {
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
      'OPENAI_ACCOUNT_TYPE': process.env.OPENAI_ACCOUNT_TYPE,
      'OPENAI_OUTPUT_DIR': process.env.OPENAI_OUTPUT_DIR
    };

    console.log(chalk.green('Environment Variables:'));
    Object.entries(checks).forEach(([key, value]) => {
      const status = value ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${key}: ${value ? 'Set' : 'Missing'}`);
    });

    console.log(chalk.green('\nSystem Information:'));
    console.log(`  Node.js: ${process.version}`);
    console.log(`  Platform: ${process.platform}`);
    
    const outputDir = process.env.OPENAI_OUTPUT_DIR || './output';
    if (fs.existsSync(outputDir)) {
      console.log(chalk.green(`  Output directory: ${outputDir} (exists)`));
    } else {
      console.log(chalk.yellow(`  Output directory: ${outputDir} (will be created)`));
    }

    console.log('');
  });

program.parse(process.argv);
