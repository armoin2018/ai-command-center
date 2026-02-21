#!/usr/bin/env node
/**
 * Crop Command - Crop Video Region
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const cropCommand = new Command('crop')
  .description('Crop video to specific region')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output video file')
  .requiredOption('--width <width>', 'Crop width')
  .requiredOption('--height <height>', 'Crop height')
  .option('--x <x>', 'Crop X offset', '0')
  .option('--y <y>', 'Crop Y offset', '0')
  .option('--center', 'Center crop', false)
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);

      console.log('✂️  Cropping video...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Crop: ${options.width}x${options.height}`);

      const processor = getVideoProcessor();

      await processor.crop(inputPath, outputPath, {
        width: parseInt(options.width),
        height: parseInt(options.height),
        x: parseInt(options.x),
        y: parseInt(options.y),
        center: options.center
      });

      console.log('✅ Crop complete');
    } catch (error: any) {
      console.error('❌ Crop failed:', error.message);
      process.exit(1);
    }
  });
