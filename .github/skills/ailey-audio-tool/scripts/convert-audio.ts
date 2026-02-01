#!/usr/bin/env node
/**
 * Audio format conversion
 */

import { Command } from 'commander';
import { getAudioClient, AUDIO_FORMATS } from './audio-client';
import { existsSync } from 'fs';
import { basename } from 'path';

const program = new Command();

program
  .name('convert-audio')
  .description('Convert audio between formats')
  .version('1.0.0');

program
  .command('file')
  .description('Convert a single audio file')
  .requiredOption('-i, --input <path>', 'Input audio file')
  .requiredOption('-o, --output <path>', 'Output audio file')
  .requiredOption('-f, --format <type>', `Output format (${Object.keys(AUDIO_FORMATS).join(', ')})`)
  .option('-b, --bitrate <rate>', 'Audio bitrate (e.g., 192k, 320k)')
  .option('-r, --sample-rate <rate>', 'Sample rate in Hz (e.g., 44100, 48000)', parseInt)
  .option('-c, --channels <num>', 'Number of channels (1=mono, 2=stereo)', parseInt)
  .option('-s, --speed <factor>', 'Speed adjustment factor (e.g., 0.5, 1.5, 2.0)', parseFloat)
  .option('--compression <db>', 'Compression threshold in dB', parseInt)
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

      console.log(`🔄 Converting: ${basename(options.input)}`);
      console.log(`   Format: ${options.format}`);
      if (options.bitrate) console.log(`   Bitrate: ${options.bitrate}`);
      if (options.sampleRate) console.log(`   Sample rate: ${options.sampleRate} Hz`);
      if (options.channels) console.log(`   Channels: ${options.channels}`);
      if (options.speed) console.log(`   Speed: ${options.speed}x`);
      if (options.compression) console.log(`   Compression: ${options.compression} dB`);

      await client.convert(options.input, options.output, {
        format: options.format,
        bitrate: options.bitrate,
        sampleRate: options.sampleRate,
        channels: options.channels,
        speed: options.speed,
        compression: options.compression,
      });

      console.log(`✅ Conversion complete`);
      console.log(`   Output: ${options.output}`);
    } catch (error) {
      console.error('❌ Conversion failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Convert multiple audio files')
  .requiredOption('-i, --input <dir>', 'Input directory')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .requiredOption('-f, --format <type>', `Output format (${Object.keys(AUDIO_FORMATS).join(', ')})`)
  .option('-b, --bitrate <rate>', 'Audio bitrate')
  .option('--pattern <glob>', 'File pattern (e.g., "*.mp3")', '**/*')
  .action(async (options: any) => {
    console.log('⚠️  Batch conversion not yet implemented');
    console.log('   Use the "file" command in a loop for now');
  });

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
