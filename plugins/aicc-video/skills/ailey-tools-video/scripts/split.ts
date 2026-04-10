#!/usr/bin/env node
/**
 * Split Command - Split Video at Timestamps
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const splitCommand = new Command('split')
  .description('Split video at specific timestamps')
  .requiredOption('-i, --input <file>', 'Input video file')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .requiredOption('--times <times>', 'Comma-separated timestamps in seconds (e.g., 10,30,60)')
  .option('--prefix <prefix>', 'Output file prefix', 'chunk_')
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputDir = resolve(options.output);
      const times = options.times.split(',').map((t: string) => parseFloat(t.trim()));

      console.log('✂️  Splitting video...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Timestamps: ${times.join(', ')}`);

      const processor = getVideoProcessor();

      const outputs = await processor.split(inputPath, outputDir, {
        times,
        prefix: options.prefix
      });

      console.log('✅ Split complete');
      console.log(`   Created ${outputs.length} segments`);
      outputs.forEach(file => console.log(`   - ${file}`));
    } catch (error: any) {
      console.error('❌ Split failed:', error.message);
      process.exit(1);
    }
  });
