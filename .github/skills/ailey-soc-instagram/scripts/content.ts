#!/usr/bin/env node

import { Command } from 'commander';
import { InstagramClient, loadConfig } from './instagram-client.js';
import fs from 'fs';

const program = new Command();

program
  .name('instagram-content')
  .description('Instagram content management - publish, schedule, edit')
  .version('1.0.0');

// ============================================================================
// PHOTO PUBLISHING
// ============================================================================

const photo = program
  .command('photo')
  .description('Publish photo posts');

photo
  .command('publish')
  .description('Publish a photo')
  .option('-u, --url <url>', 'Image URL (required)', '')
  .option('-c, --caption <text>', 'Post caption')
  .option('-l, --location <id>', 'Location ID')
  .action(async (options) => {
    try {
      if (!options.url) {
        console.error('Error: --url is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.publishPhoto(options.url, {
        caption: options.caption,
        locationId: options.location
      });
      
      console.log('Photo published successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// VIDEO PUBLISHING
// ============================================================================

const video = program
  .command('video')
  .description('Publish video posts');

video
  .command('publish')
  .description('Publish a video')
  .option('-u, --url <url>', 'Video URL (required)', '')
  .option('-c, --caption <text>', 'Post caption')
  .option('-l, --location <id>', 'Location ID')
  .action(async (options) => {
    try {
      if (!options.url) {
        console.error('Error: --url is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.publishVideo(options.url, {
        caption: options.caption,
        locationId: options.location
      });
      
      console.log('Video published successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// CAROUSEL PUBLISHING
// ============================================================================

const carousel = program
  .command('carousel')
  .description('Publish carousel posts (multiple images/videos)');

carousel
  .command('publish')
  .description('Publish a carousel post')
  .option('-i, --images <urls>', 'Comma-separated image URLs')
  .option('-v, --videos <urls>', 'Comma-separated video URLs')
  .option('-c, --caption <text>', 'Post caption')
  .action(async (options) => {
    try {
      const images = options.images?.split(',').map((url: string) => ({ imageUrl: url.trim() })) || [];
      const videos = options.videos?.split(',').map((url: string) => ({ videoUrl: url.trim(), isVideo: true })) || [];
      
      const mediaItems = [...images, ...videos];
      
      if (mediaItems.length === 0) {
        console.error('Error: At least one image or video URL is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.publishCarousel(mediaItems, options.caption);
      
      console.log('Carousel published successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// REEL PUBLISHING
// ============================================================================

const reel = program
  .command('reel')
  .description('Publish Reels');

reel
  .command('publish')
  .description('Publish a Reel')
  .option('-u, --url <url>', 'Video URL (required)', '')
  .option('-c, --caption <text>', 'Reel caption')
  .option('--cover <url>', 'Cover image URL')
  .option('--feed', 'Share to feed', true)
  .action(async (options) => {
    try {
      if (!options.url) {
        console.error('Error: --url is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.publishReel(
        options.url,
        options.caption,
        options.cover,
        options.feed
      );
      
      console.log('Reel published successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// STORY PUBLISHING
// ============================================================================

const story = program
  .command('story')
  .description('Publish Stories');

story
  .command('publish')
  .description('Publish a Story')
  .option('-u, --url <url>', 'Media URL (required)', '')
  .option('-t, --type <type>', 'Media type: IMAGE or VIDEO', 'IMAGE')
  .action(async (options) => {
    try {
      if (!options.url) {
        console.error('Error: --url is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.publishStory({
        mediaUrl: options.url,
        mediaType: options.type
      });
      
      console.log('Story published successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

// ============================================================================
// MEDIA MANAGEMENT
// ============================================================================

const media = program
  .command('media')
  .description('Manage existing media');

media
  .command('list')
  .description('List media posts')
  .option('-l, --limit <number>', 'Limit results', '25')
  .option('-o, --output <file>', 'Export to JSON file')
  .action(async (options) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getAccountMedia(parseInt(options.limit));
      
      console.log(`Found ${result.data?.length || 0} media items:`);
      console.log(JSON.stringify(result, null, 2));
      
      if (options.output) {
        fs.writeFileSync(options.output, JSON.stringify(result, null, 2));
        console.log(`\nExported to ${options.output}`);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

media
  .command('get')
  .description('Get media details')
  .argument('<media-id>', 'Media ID')
  .action(async (mediaId: string) => {
    try {
      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.getMedia(mediaId);
      
      console.log('Media details:');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

media
  .command('update')
  .description('Update media caption')
  .argument('<media-id>', 'Media ID')
  .option('-c, --caption <text>', 'New caption (required)', '')
  .action(async (mediaId: string, options) => {
    try {
      if (!options.caption) {
        console.error('Error: --caption is required');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.updateCaption(mediaId, options.caption);
      
      console.log('Caption updated successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

media
  .command('delete')
  .description('Delete media')
  .argument('<media-id>', 'Media ID')
  .option('--confirm', 'Confirm deletion')
  .action(async (mediaId: string, options) => {
    try {
      if (!options.confirm) {
        console.error('Error: Add --confirm flag to delete media');
        process.exit(1);
      }

      const config = loadConfig();
      const client = new InstagramClient(config);
      
      const result = await client.deleteMedia(mediaId);
      
      console.log('Media deleted successfully!');
      console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
