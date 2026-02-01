#!/usr/bin/env node
/**
 * Demux audio and transcribe in one operation
 */

import { Command } from 'commander';
import { getAudioClient } from './audio-client';
import { existsSync } from 'fs';
import { mkdir } from 'fs/promises';
import { basename, join } from 'path';

const program = new Command();

program
  .name('demux-transcribe')
  .description('Extract audio from video and transcribe')
  .version('1.0.0');

program
  .command('video')
  .description('Extract audio from video and transcribe')
  .requiredOption('-i, --input <path>', 'Input video file')
  .option('-o, --output <dir>', 'Output directory (defaults to ./output)')
  .option('-f, --format <type>', 'Audio format for extraction', 'mp3')
  .option('--slice', 'Slice audio on silence before transcribing')
  .option('--threshold <db>', 'Silence threshold for slicing', '-40')
  .option('--language <code>', 'Language code for transcription')
  .action(async (options: any) => {
    try {
      if (!existsSync(options.input)) {
        console.error(`❌ Input file not found: ${options.input}`);
        process.exit(1);
      }

      const outputDir = options.output || './output';
      await mkdir(outputDir, { recursive: true });

      const client = getAudioClient();
      const audioPath = join(outputDir, `${basename(options.input, '.mp4')}.${options.format}`);

      console.log(`🎬 Processing: ${basename(options.input)}\n`);

      // Step 1: Extract audio
      console.log(`1️⃣  Extracting audio...`);
      await client.extractAudio(options.input, audioPath, options.format);
      console.log(`   ✅ Audio extracted: ${basename(audioPath)}\n`);

      // Step 2: Optionally slice on silence
      let transcriptionInputs = [audioPath];
      if (options.slice) {
        console.log(`2️⃣  Slicing audio on silence...`);
        const sliceDir = join(outputDir, 'slices');
        await mkdir(sliceDir, { recursive: true });
        
        const segments = await client.sliceOnSilence(audioPath, {
          silenceThresholdDb: parseFloat(options.threshold),
          minDuration: 0.5,
          maxDuration: 300,
          outputDir: sliceDir,
        });

        if (segments.length > 0) {
          console.log(`   ✅ Created ${segments.length} segments\n`);
          transcriptionInputs = segments;
        } else {
          console.log(`   ⚠️  No segments created, using full audio\n`);
        }
      }

      // Step 3: Transcribe
      console.log(`3️⃣  Transcription...`);
      console.log(`   ⚠️  Transcription requires OpenAI API key`);
      console.log(`   Use: npm run transcribe file -i ${transcriptionInputs[0]}\n`);

      console.log(`✅ Audio extraction complete`);
      console.log(`   Audio: ${audioPath}`);
      if (options.slice && transcriptionInputs.length > 1) {
        console.log(`   Segments: ${transcriptionInputs.length} files in ${join(outputDir, 'slices')}`);
      }
      console.log(`\n💡 Next: Transcribe with OpenAI Whisper`);
    } catch (error) {
      console.error('❌ Processing failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
