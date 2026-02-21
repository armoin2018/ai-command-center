#!/usr/bin/env node

/**
 * Example: Bulk Social Media Post Generator
 * 
 * This script demonstrates how to:
 * 1. Load data from CSV/JSON
 * 2. Use Autofill API to generate multiple designs
 * 3. Export designs for different platforms
 * 4. Organize by campaign/platform
 * 
 * Use case: Generate 50+ social media posts from a data file
 */

import { getCanvaConfig } from '../scripts/config.js';
import CanvaClient from '../scripts/canva-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SocialPost {
  platform: 'instagram' | 'facebook' | 'twitter' | 'linkedin';
  headline: string;
  description: string;
  imageUrl?: string;
  cta?: string;
  hashtags?: string[];
  scheduledDate?: string;
}

interface Campaign {
  name: string;
  templateId: string; // Canva design template ID
  posts: SocialPost[];
}

async function generateBulkSocialMedia(campaign: Campaign): Promise<void> {
  const config = getCanvaConfig();
  const client = new CanvaClient(config);

  console.log(chalk.blue(`🚀 Bulk Social Media Generator: ${campaign.name}\n`));

  // Create output directory
  const outputDir = path.resolve(__dirname, `./output/${campaign.name.replace(/\s+/g, '_')}`);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = {
    total: campaign.posts.length,
    successful: 0,
    failed: 0,
    designs: [] as any[],
  };

  // Process each post
  for (let i = 0; i < campaign.posts.length; i++) {
    const post = campaign.posts[i];
    const postNum = i + 1;

    console.log(chalk.cyan(`\n[${postNum}/${campaign.posts.length}] Creating ${post.platform} post...`));
    console.log(`  📝 ${post.headline}`);

    try {
      // Step 1: Create design using autofill (if available) or template
      const design = await client.createDesign({
        design_type: getPlatformDesignType(post.platform),
        title: `${campaign.name} - ${post.platform} - ${postNum}`,
      });

      console.log(chalk.green(`  ✓ Design created: ${design.id}`));

      // Step 2: Export for the platform
      const format = getPlatformFormat(post.platform);
      const exportJob = await client.exportDesign(design.id, format, {
        quality: 'high',
      });

      // Step 3: Poll for completion
      let status = await client.getExportStatus(exportJob.job.id);
      let attempts = 0;

      while (status.job.status === 'in_progress' && attempts < 20) {
        await sleep(2000);
        status = await client.getExportStatus(exportJob.job.id);
        attempts++;
      }

      if (status.job.status === 'success') {
        // Download the file
        const url = status.job.urls?.[0];
        if (url) {
          const filename = `${post.platform}_${postNum}.${format.toLowerCase()}`;
          const filepath = path.join(outputDir, filename);
          await downloadFile(url, filepath);
          
          console.log(chalk.green(`  ✓ Exported: ${filename}`));

          results.successful++;
          results.designs.push({
            designId: design.id,
            filename,
            post,
          });
        }
      } else {
        throw new Error(`Export failed: ${status.job.error?.message || 'Unknown error'}`);
      }

    } catch (error: any) {
      console.log(chalk.red(`  ✗ Failed: ${error.message}`));
      results.failed++;
    }
  }

  // Generate summary report
  console.log(chalk.blue('\n📊 Campaign Summary:\n'));
  console.log(`  Total posts: ${results.total}`);
  console.log(chalk.green(`  Successful: ${results.successful}`));
  console.log(chalk.red(`  Failed: ${results.failed}`));
  console.log(`  Output directory: ${outputDir}`);

  // Generate metadata file
  const metadata = {
    campaign: campaign.name,
    generated: new Date().toISOString(),
    results,
  };

  fs.writeFileSync(
    path.join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  console.log(chalk.green('\n✨ Bulk generation complete!'));
}

function getPlatformDesignType(platform: string): string {
  const types: Record<string, string> = {
    instagram: 'instagram_post',
    facebook: 'facebook_post',
    twitter: 'twitter_post',
    linkedin: 'linkedin_post',
  };
  return types[platform] || 'social';
}

function getPlatformFormat(platform: string): 'PNG' | 'JPG' | 'MP4' {
  // Most platforms prefer PNG for quality
  return 'PNG';
}

async function downloadFile(url: string, filepath: string): Promise<void> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(filepath, Buffer.from(buffer));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Example campaign data
const springCampaign: Campaign = {
  name: 'Spring Sale 2024',
  templateId: 'DAGQGfBz8Qk', // Your Canva template ID
  posts: [
    {
      platform: 'instagram',
      headline: '🌸 Spring Sale - 40% Off Everything!',
      description: 'Limited time offer. Shop now and save big on your favorite items.',
      cta: 'Shop Now',
      hashtags: ['#SpringSale', '#SaveBig', '#LimitedTime'],
      scheduledDate: '2024-03-15T10:00:00Z',
    },
    {
      platform: 'facebook',
      headline: 'Spring Into Savings - 40% Off Sitewide',
      description: 'Our biggest sale of the season is here! Don\'t miss out on incredible deals.',
      cta: 'Shop the Sale',
      hashtags: ['#SpringSale', '#Sale', '#Shopping'],
      scheduledDate: '2024-03-15T14:00:00Z',
    },
    {
      platform: 'twitter',
      headline: '🌼 SPRING SALE: 40% OFF',
      description: 'Time to refresh your wardrobe! Limited time only.',
      cta: 'Shop Now →',
      hashtags: ['#SpringSale', '#Deals'],
      scheduledDate: '2024-03-15T16:00:00Z',
    },
    {
      platform: 'linkedin',
      headline: 'Spring Collection Now Available',
      description: 'Discover our new spring collection with exclusive professional styles. 40% off for a limited time.',
      cta: 'Browse Collection',
      scheduledDate: '2024-03-16T09:00:00Z',
    },
  ],
};

// Run the generator
generateBulkSocialMedia(springCampaign).catch(error => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  process.exit(1);
});
