#!/usr/bin/env node
/**
 * Convert Command - Text to Speech Conversion
 * 
 * Convert text files to speech audio
 */

import { Command } from 'commander';
import { getSpeechifyClient, ConversionOptions } from './speechify-client';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

export const convertCommand = new Command('convert')
  .description('Convert text to speech');

convertCommand
  .command('file')
  .description('Convert text file to speech')
  .requiredOption('-i, --input <file>', 'Input text file')
  .requiredOption('-o, --output <file>', 'Output audio file')
  .option('-v, --voice <voice>', 'Voice ID', 'george')
  .option('-f, --format <format>', 'Audio format (mp3, wav, aac, ogg, flac)', 'mp3')
  .option('-m, --model <model>', 'Model (simba-english, simba-multilingual, simba-turbo)', 'simba-multilingual')
  .option('-l, --language <language>', 'Language locale (en-US, fr-FR, etc.)')
  .option('-r, --sample-rate <rate>', 'Sample rate (8000-48000)', '24000')
  .option('--normalize', 'Enable loudness normalization', false)
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);
      const outputPath = resolve(options.output);

      console.log('🔄 Converting text to speech...');
      console.log(`   Input: ${options.input}`);
      console.log(`   Voice: ${options.voice}`);
      console.log(`   Model: ${options.model}`);
      console.log(`   Format: ${options.format}`);

      const client = getSpeechifyClient();

      const conversionOptions = {
        audio_format: options.format as 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac',
        model: options.model as 'simba-english' | 'simba-multilingual' | 'simba-turbo',
        ...(options.language && { language: options.language }),
        sample_rate: parseInt(options.sampleRate),
        ...(options.normalize && { options: { loudness_normalization: true } }),
      };

      const audioBuffer = await client.convertFileToSpeech(inputPath, options.voice, conversionOptions);
      await writeFile(outputPath, audioBuffer);

      console.log('✅ Conversion complete');
      console.log(`   Output: ${options.output}`);
      console.log(`   Size: ${(audioBuffer.length / 1024).toFixed(2)} KB`);
    } catch (error: any) {
      console.error('❌ Conversion failed:', error.message);
      process.exit(1);
    }
  });

convertCommand
  .command('text')
  .description('Convert text string to speech')
  .requiredOption('-t, --text <text>', 'Text to convert')
  .requiredOption('-o, --output <file>', 'Output audio file')
  .option('-v, --voice <voice>', 'Voice ID', 'george')
  .option('-f, --format <format>', 'Audio format (mp3, wav, aac, ogg, flac)', 'mp3')
  .option('-m, --model <model>', 'Model (simba-english, simba-multilingual, simba-turbo)', 'simba-multilingual')
  .option('-l, --language <language>', 'Language locale (en-US, fr-FR, etc.)')
  .action(async (options) => {
    try {
      const outputPath = resolve(options.output);

      console.log('🔄 Converting text to speech...');
      console.log(`   Text: "${options.text.substring(0, 50)}..."`);
      console.log(`   Voice: ${options.voice}`);
      console.log(`   Model: ${options.model}`);

      const client = getSpeechifyClient();

      const conversionOptions = {
        audio_format: options.format as 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac',
        model: options.model as 'simba-english' | 'simba-multilingual' | 'simba-turbo',
        ...(options.language && { language: options.language }),
      };

      const audioBuffer = await client.convertToSpeech(options.text, options.voice, conversionOptions);
      await writeFile(outputPath, audioBuffer);

      console.log('✅ Conversion complete');
      console.log(`   Output: ${options.output}`);
    } catch (error: any) {
      console.error('❌ Conversion failed:', error.message);
      process.exit(1);
    }
  });
