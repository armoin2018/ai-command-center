#!/usr/bin/env node
/**
 * Extract Command - Extract Frames and Thumbnails
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const extractCommand = new Command('extract')
  .description('Extract frames or thumbnails');

extractCommand
  .command('frames')
  .description('Extract frames from video')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('--every <n>', 'Extract every Nth frame')
  .option('--fps <fps>', 'Extract at specific FPS')
  .option('--format <format>', 'Image format (png, jpg)', 'png')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputDir = resolve(options.output);

      console.log('🖼️  Extracting frames...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);

      const processor = getVideoProcessor();

      await processor.extractFrames(inputPath, outputDir, {
        every: options.every ? parseInt(options.every) : undefined,
        fps: options.fps ? parseFloat(options.fps) : undefined,
        format: options.format as 'png' | 'jpg'
      });

      console.log('✅ Frames extracted');
    } catch (error: any) {
      console.error('❌ Frame extraction failed:', error.message);
      process.exit(1);
    }
  });

extractCommand
  .command('thumbnail')
  .description('Generate video thumbnail')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output image file')
  .option('--time <seconds>', 'Timestamp for thumbnail (seconds)', '0')
  .option('--width <width>', 'Thumbnail width')
  .option('--height <height>', 'Thumbnail height')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);

      console.log('📸 Generating thumbnail...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Time: ${options.time}s`);

      const processor = getVideoProcessor();

      await processor.generateThumbnail(inputPath, outputPath, {
        time: parseFloat(options.time),
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined
      });

      console.log('✅ Thumbnail generated');
    } catch (error: any) {
      console.error('❌ Thumbnail generation failed:', error.message);
      process.exit(1);
    }
  });
