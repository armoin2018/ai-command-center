#!/usr/bin/env node
/**
 * Audio transcription using OpenAI Whisper API
 */

import { Command } from 'commander';
import OpenAI from 'openai/index.mjs';
import { createReadStream, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { basename } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: ['.env', '.env.local', process.env.HOME + '/.vscode/.env'] });

const program = new Command();

program
  .name('transcribe-audio')
  .description('Transcribe audio files using OpenAI Whisper')
  .version('1.0.0');

program
  .command('file')
  .description('Transcribe a single audio file')
  .requiredOption('-i, --input <path>', 'Input audio file')
  .option('-o, --output <path>', 'Output text file (defaults to input.txt)')
  .option('-l, --language <code>', 'Language code (e.g., en, es, fr)')
  .option('-f, --format <type>', 'Output format (text, json, srt, vtt)', 'text')
  .option('--model <name>', 'Whisper model', 'whisper-1')
  .action(async (options: any) => {
    try {
      if (!existsSync(options.input)) {
        console.error(`❌ File not found: ${options.input}`);
        process.exit(1);
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ OPENAI_API_KEY not found in environment');
        console.error('   Set in .env file or ~/.vscode/.env');
        process.exit(1);
      }

      const openai = new OpenAI({ apiKey });

      console.log(`🎤 Transcribing: ${basename(options.input)}`);
      console.log(`   Model: ${options.model}`);
      if (options.language) {
        console.log(`   Language: ${options.language}`);
      }

      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(options.input),
        model: options.model,
        language: options.language,
        response_format: options.format === 'json' ? 'verbose_json' : options.format,
      });

      // Determine output path
      const outputPath = options.output || options.input.replace(/\.[^.]+$/, '.txt');

      // Format output based on response type
      let outputText: string;
      if (typeof transcription === 'string') {
        outputText = transcription;
      } else if ('text' in transcription) {
        if (options.format === 'json') {
          outputText = JSON.stringify(transcription, null, 2);
        } else {
          outputText = transcription.text;
        }
      } else {
        outputText = JSON.stringify(transcription, null, 2);
      }

      await writeFile(outputPath, outputText, 'utf-8');

      console.log(`✅ Transcription complete`);
      console.log(`   Output: ${outputPath}`);
      console.log(`   Length: ${outputText.length} characters`);

      // Show preview
      if (options.format === 'text') {
        const preview = outputText.substring(0, 200);
        console.log(`\n   Preview: ${preview}${outputText.length > 200 ? '...' : ''}\n`);
      }
    } catch (error) {
      console.error('❌ Transcription failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('batch')
  .description('Transcribe multiple audio files')
  .requiredOption('-i, --input <pattern>', 'Input file pattern or directory')
  .option('-o, --output <dir>', 'Output directory (defaults to input directory)')
  .option('-l, --language <code>', 'Language code')
  .option('-f, --format <type>', 'Output format (text, json, srt, vtt)', 'text')
  .option('--model <name>', 'Whisper model', 'whisper-1')
  .action(async (options: any) => {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('❌ OPENAI_API_KEY not found in environment');
        process.exit(1);
      }

      console.log('⚠️  Batch transcription not yet implemented');
      console.log('   Use the "file" command in a loop for now');
    } catch (error) {
      console.error('❌ Batch transcription failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
