#!/usr/bin/env node
/**
 * Join Command - Concatenate Multiple Videos
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const joinCommand = new Command('join')
  .description('Join multiple videos')
  .requiredOption('-i, --input <files>', 'Comma-separated input files')
  .requiredOption('-o, --output <file>', 'Output video file')
  .option('--transition <type>', 'Transition type (fade, dissolve, none)', 'none')
  .option('--transition-duration <duration>', 'Transition duration in seconds', '1.0')
  .option('--re-encode', 'Re-encode video (slower but ensures compatibility)', false)
  .action(async (options) => {
    try {
      const inputPaths = options.input.split(',').map((f: string) => resolve(f.trim()));
      const outputPath = resolve(options.output);

      console.log('🔗 Joining videos...');
      console.log(`   Inputs: ${inputPaths.length} files`);
      console.log(`   Output: ${options.output}`);
      console.log(`   Transition: ${options.transition}`);

      const processor = getVideoProcessor();

      await processor.join(inputPaths, outputPath, {
        transition: options.transition as 'fade' | 'dissolve' | 'none',
        transitionDuration: parseFloat(options.transitionDuration),
        reEncode: options.reEncode
      });

      console.log('✅ Join complete');
    } catch (error: any) {
      console.error('❌ Join failed:', error.message);
      process.exit(1);
    }
  });
