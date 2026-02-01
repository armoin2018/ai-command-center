#!/usr/bin/env node
/**
 * Extract audio from video files
 */

import { Command } from 'commander';
import { getAudioClient, AUDIO_FORMATS } from './audio-client';
import { existsSync } from 'fs';
import { basename } from 'path';

const program = new Command();

program
  .name('extract-audio')
  .description('Extract audio from video files')
  .version('1.0.0');

program
  .command('file')
  .description('Extract audio from a single video file')
  .requiredOption('-i, --input <path>', 'Input video file')
  .requiredOption('-o, --output <path>', 'Output audio file')
  .option('-f, --format <type>', `Audio format (${Object.keys(AUDIO_FORMATS).join(', ')})`, 'mp3')
  .action(async (options: any) => {
    try {
      if (!existsSync(options.input)) {
        console.error(`❌ Input file not found: ${options.input}`);
        process.exit(1);
      }

      if (!AUDIO_FORMATS[options.format]) {
        console.error(`❌ Unsupported format: ${options.format}`);
        console.error(`   Supported: ${Object.keys(AUDIO_FORMATS).join(', ')}`);
        process.exit(1);
      }

      const client = getAudioClient();

      console.log(`🎬 Extracting audio from: ${basename(options.input)}`);
      console.log(`   Format: ${options.format}`);

      await client.extractAudio(options.input, options.output, options.format);

      console.log(`✅ Extraction complete`);
      console.log(`   Output: ${options.output}`);
    } catch (error) {
      console.error('❌ Extraction failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('demux')
  .description('Demux all audio tracks from a video file')
  .requiredOption('-i, --input <path>', 'Input video file')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-f, --format <type>', `Audio format (${Object.keys(AUDIO_FORMATS).join(', ')})`, 'mp3')
  .action(async (options: any) => {
    try {
      if (!existsSync(options.input)) {
        console.error(`❌ Input file not found: ${options.input}`);
        process.exit(1);
      }

      const client = getAudioClient();

      console.log(`🎬 Demuxing audio tracks from: ${basename(options.input)}`);

      const outputFiles = await client.demuxAudio(
        options.input,
        options.output,
        options.format
      );

      console.log(`✅ Demux complete`);
      console.log(`   Tracks extracted: ${outputFiles.length}`);
      outputFiles.forEach((file, i) => {
        console.log(`   Track ${i + 1}: ${basename(file)}`);
      });
    } catch (error) {
      console.error('❌ Demux failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
