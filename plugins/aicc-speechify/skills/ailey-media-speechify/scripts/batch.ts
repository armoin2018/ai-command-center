#!/usr/bin/env node
/**
 * Batch Command - Batch Text to Speech Conversion
 * 
 * Convert multiple text files to speech
 */

import { Command } from 'commander';
import { getSpeechifyClient, ConversionOptions } from './speechify-client';
import { readdir, writeFile, readFile, mkdir } from 'fs/promises';
import { resolve, join, basename, extname } from 'path';
import { existsSync } from 'fs';

export const batchCommand = new Command('batch')
  .description('Batch convert multiple files to speech')
  .requiredOption('-i, --input <dir>', 'Input directory')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-v, --voice <voice>', 'Voice ID', 'george')
  .option('-f, --format <format>', 'Audio format (mp3, wav, aac, ogg, flac)', 'mp3')
  .option('-m, --model <model>', 'Model (simba-english, simba-multilingual, simba-turbo)', 'simba-multilingual')
  .option('-l, --language <language>', 'Language locale (en-US, fr-FR, etc.)')
  .option('-p, --pattern <pattern>', 'File pattern (e.g., *.txt, *.md)', '*')
  .option('--parallel <count>', 'Number of parallel conversions', '1')
  .option('--prefix <prefix>', 'Output file prefix', '')
  .option('--normalize', 'Enable loudness normalization', false)
  .action(async (options) => {
    try {
      const inputDir = resolve(options.input);
      const outputDir = resolve(options.output);

      if (!existsSync(inputDir)) {
        throw new Error(`Input directory not found: ${inputDir}`);
      }

      // Create output directory if it doesn't exist
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      console.log('🔄 Starting batch conversion...');
      console.log(`   Input: ${inputDir}`);
      console.log(`   Output: ${outputDir}`);
      console.log(`   Voice: ${options.voice}`);
      console.log(`   Model: ${options.model}`);
      console.log(`   Format: ${options.format}`);
      console.log('');

      const client = getSpeechifyClient();

      // Get all files in directory
      const allFiles = await readdir(inputDir);
      
      // Filter by pattern
      const pattern = options.pattern === '*' ? /\.(txt|md)$/ : new RegExp(options.pattern.replace('*', '.*'));
      const files = allFiles.filter(file => pattern.test(file));

      if (files.length === 0) {
        console.log('⚠️  No matching files found');
        return;
      }

      console.log(`Found ${files.length} files to convert\n`);

      const conversionOptions = {
        audio_format: options.format as 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac',
        model: options.model as 'simba-english' | 'simba-multilingual' | 'simba-turbo',
        ...(options.language && { language: options.language }),
        ...(options.normalize && { options: { loudness_normalization: true } }),
      };

      const parallelCount = parseInt(options.parallel);
      let completed = 0;
      let failed = 0;

      // Process files in batches
      for (let i = 0; i < files.length; i += parallelCount) {
        const batch = files.slice(i, i + parallelCount);
        
        await Promise.all(batch.map(async (file) => {
          try {
            const inputPath = join(inputDir, file);
            const outputName = `${options.prefix}${basename(file, extname(file))}.${options.format}`;
            const outputPath = join(outputDir, outputName);

            console.log(`[${completed + failed + 1}/${files.length}] Converting: ${file}...`);

            const text = await readFile(inputPath, 'utf-8');
            const audioBuffer = await client.convertToSpeech(text, options.voice, conversionOptions);
            await writeFile(outputPath, audioBuffer);

            console.log(`   ✅ ${outputName} (${(audioBuffer.length / 1024).toFixed(2)} KB)`);
            completed++;
          } catch (error: any) {
            console.error(`   ❌ Failed: ${file} - ${error.message}`);
            failed++;
          }
        }));
      }

      console.log('');
      console.log('✅ Batch conversion complete');
      console.log(`   Completed: ${completed}`);
      if (failed > 0) {
        console.log(`   Failed: ${failed}`);
      }
    } catch (error: any) {
      console.error('❌ Batch conversion failed:', error.message);
      process.exit(1);
    }
  });
