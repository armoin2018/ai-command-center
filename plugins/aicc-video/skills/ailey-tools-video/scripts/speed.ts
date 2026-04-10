#!/usr/bin/env node
/**
 * Speed Command - Adjust Video Playback Speed
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const speedCommand = new Command('speed')
  .description('Adjust video playback speed')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output video file')
  .requiredOption('--rate <rate>', 'Speed rate (0.25-4.0)')
  .option('--preserve-pitch', 'Preserve audio pitch', false)
  .option('--interpolate', 'Interpolate frames for smoother slow motion', false)
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);
      const rate = parseFloat(options.rate);

      console.log('🎬 Adjusting video speed...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Rate: ${rate}x`);

      const processor = getVideoProcessor();

      await processor.adjustSpeed(inputPath, outputPath, {
        rate,
        preservePitch: options.preservePitch,
        interpolate: options.interpolate
      });

      console.log('✅ Speed adjustment complete');
    } catch (error: any) {
      console.error('❌ Speed adjustment failed:', error.message);
      process.exit(1);
    }
  });
