#!/usr/bin/env node
/**
 * Caption Command - Add Subtitles/Captions
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const captionCommand = new Command('caption')
  .description('Add subtitles or captions to video')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output video file')
  .requiredOption('-s, --subtitle <file>', 'Subtitle file (.srt, .vtt, .ass)')
  .option('--burn', 'Burn subtitles into video', false)
  .option('--font <font>', 'Font name')
  .option('--font-size <size>', 'Font size')
  .option('--color <color>', 'Text color')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);
      const subtitlePath = resolve(options.subtitle);

      console.log('💬 Adding subtitles...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Subtitles: ${options.subtitle}`);
      console.log(`   Burn: ${options.burn}`);

      const processor = getVideoProcessor();

      await processor.addSubtitles(inputPath, outputPath, {
        subtitleFile: subtitlePath,
        burn: options.burn,
        style: {
          fontName: options.font,
          fontSize: options.fontSize ? parseInt(options.fontSize) : undefined,
          primaryColor: options.color
        }
      });

      console.log('✅ Subtitles added');
    } catch (error: any) {
      console.error('❌ Subtitle addition failed:', error.message);
      process.exit(1);
    }
  });
