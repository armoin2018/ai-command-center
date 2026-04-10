#!/usr/bin/env node
/**
 * Slice audio files based on silence detection
 */

import { Command } from 'commander';
import { getAudioClient } from './audio-client';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { basename, join, dirname } from 'path';

const program = new Command();

program
  .name('slice-audio')
  .description('Slice audio files based on silence detection')
  .version('1.0.0');

program
  .command('file')
  .description('Slice a single audio file at silence points')
  .requiredOption('-i, --input <path>', 'Input audio file')
  .option('-o, --output <dir>', 'Output directory (defaults to input directory)')
  .option('-t, --threshold <db>', 'Silence threshold in dB', '-40')
  .option('--min <seconds>', 'Minimum silence duration in seconds', '0.5')
  .option('--max <seconds>', 'Maximum segment duration in seconds', '300')
  .action(async (options: any) => {
    try {
      if (!existsSync(options.input)) {
        console.error(`❌ Input file not found: ${options.input}`);
        process.exit(1);
      }

      const outputDir = options.output || join(dirname(options.input), `${basename(options.input, '.mp3')}_sliced`);
      
      await mkdir(outputDir, { recursive: true });

      const client = getAudioClient();

      console.log(`✂️  Slicing: ${basename(options.input)}`);
      console.log(`   Silence threshold: ${options.threshold} dB`);
      console.log(`   Min duration: ${options.min}s`);
      console.log(`   Max duration: ${options.max}s`);
      console.log(`   Output: ${outputDir}`);

      const segments = await client.sliceOnSilence(options.input, {
        silenceThresholdDb: parseFloat(options.threshold),
        minDuration: options.min,
        maxDuration: options.max,
        outputDir,
      });

      console.log(`✅ Slicing complete`);
      console.log(`   Segments created: ${segments.length}`);
      
      if (segments.length > 0) {
        console.log(`\n   Segments:`);
        segments.forEach((seg, i) => {
          console.log(`   ${i + 1}. ${basename(seg)}`);
        });
      }

      console.log(`\n💡 Tip: Use sliced segments for faster transcription`);
    } catch (error) {
      console.error('❌ Slicing failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
