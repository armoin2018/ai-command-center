#!/usr/bin/env node
/**
 * Resize Command - Change Video Dimensions
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const resizeCommand = new Command('resize')
  .description('Resize video dimensions')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <file>', 'Output video file')
  .option('--width <width>', 'Output width')
  .option('--height <height>', 'Output height')
  .option('--scale <scale>', 'Scale percentage (e.g., 50%)')
  .option('--maintain-aspect', 'Maintain aspect ratio', false)
  .option('--preset <preset>', 'Preset (4k, 1080p, 720p, 480p)')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);

      let width = options.width ? parseInt(options.width) : undefined;
      let height = options.height ? parseInt(options.height) : undefined;

      // Handle presets
      if (options.preset) {
        const presets: Record<string, { width: number; height: number }> = {
          '4k': { width: 3840, height: 2160 },
          '1080p': { width: 1920, height: 1080 },
          '720p': { width: 1280, height: 720 },
          '480p': { width: 854, height: 480 }
        };
        const preset = presets[options.preset];
        if (preset) {
          width = preset.width;
          height = preset.height;
        }
      }

      console.log('📐 Resizing video...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Dimensions: ${width}x${height}`);

      const processor = getVideoProcessor();

      await processor.resize(inputPath, outputPath, {
        width,
        height,
        scale: options.scale,
        maintainAspect: options.maintainAspect
      });

      console.log('✅ Resize complete');
    } catch (error: any) {
      console.error('❌ Resize failed:', error.message);
      process.exit(1);
    }
  });
