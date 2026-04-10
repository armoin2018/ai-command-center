#!/usr/bin/env node
/**
 * Filter Command - Apply Visual Filters
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const filterCommand = new Command('filter')
  .description('Apply visual filters to video')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output video file')
  .option('--brightness <value>', 'Adjust brightness (-1.0 to 1.0)')
  .option('--contrast <value>', 'Adjust contrast (0.0 to 4.0)')
  .option('--saturation <value>', 'Adjust saturation (0.0 to 3.0)')
  .option('--blur <value>', 'Apply blur (1-20)')
  .option('--sharpen <value>', 'Apply sharpening (0.0 to 5.0)')
  .option('--grayscale', 'Convert to grayscale', false)
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);

      console.log('🎨 Applying filters...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);

      const processor = getVideoProcessor();

      const filters: any = {};
      if (options.brightness) filters.brightness = parseFloat(options.brightness);
      if (options.contrast) filters.contrast = parseFloat(options.contrast);
      if (options.saturation) filters.saturation = parseFloat(options.saturation);
      if (options.blur) filters.blur = parseInt(options.blur);
      if (options.sharpen) filters.sharpen = parseFloat(options.sharpen);
      if (options.grayscale) filters.grayscale = true;

      await processor.applyFilter(inputPath, outputPath, filters);

      console.log('✅ Filters applied');
    } catch (error: any) {
      console.error('❌ Filter application failed:', error.message);
      process.exit(1);
    }
  });
