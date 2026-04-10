#!/usr/bin/env node
/**
 * Audio Command - Audio Operations (Extract, Replace, Remove)
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const audioCommand = new Command('audio')
  .description('Audio operations');

audioCommand
  .command('extract')
  .description('Extract audio from video')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output audio file')
  .option('--bitrate <bitrate>', 'Audio bitrate (e.g., 320k)')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);

      console.log('🎵 Extracting audio...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);

      const processor = getVideoProcessor();

      await processor.extractAudio(inputPath, outputPath, {
        bitrate: options.bitrate
      });

      console.log('✅ Audio extracted');
    } catch (error: any) {
      console.error('❌ Audio extraction failed:', error.message);
      process.exit(1);
    }
  });

audioCommand
  .command('replace')
  .description('Replace audio in video')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output video file')
  .requiredOption('-a, --audio <file>', 'New audio file')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);
      const audioPath = resolve(options.audio);

      console.log('🎵 Replacing audio...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Audio: ${options.audio}`);
      console.log(`   Output: ${options.output}`);

      const processor = getVideoProcessor();

      await processor.replaceAudio(inputPath, outputPath, audioPath);

      console.log('✅ Audio replaced');
    } catch (error: any) {
      console.error('❌ Audio replacement failed:', error.message);
      process.exit(1);
    }
  });
