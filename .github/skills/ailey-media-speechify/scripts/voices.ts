#!/usr/bin/env node
/**
 * Voices Command - Voice Management
 * 
 * List, search, and preview available voices
 */

import { Command } from 'commander';
import { getSpeechifyClient, VoiceFilter } from './speechify-client';
import { writeFile } from 'fs/promises';
import { resolve } from 'path';

export const voicesCommand = new Command('voices')
  .description('Manage Speechify voices');

voicesCommand
  .command('list')
  .description('List available voices')
  .option('-l, --language <lang>', 'Filter by language code (e.g., en, es, fr)')
  .option('-g, --gender <gender>', 'Filter by gender (male, female, neutral)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.log('🔍 Fetching available voices...\n');

      const client = getSpeechifyClient();

      const filter: VoiceFilter = {
        language: options.language,
        gender: options.gender,
      };

      const voices = await client.getVoices(filter);

      if (options.json) {
        console.log(JSON.stringify(voices, null, 2));
        return;
      }

      if (voices.length === 0) {
        console.log('No voices found matching criteria.');
        return;
      }

      console.log(`Found ${voices.length} voices:\n`);

      // Group by language
      const byLanguage = voices.reduce((acc, voice) => {
        const lang = voice.locale?.split('-')[0] || 'unknown';
        if (!acc[lang]) acc[lang] = [];
        acc[lang].push(voice);
        return acc;
      }, {} as Record<string, typeof voices>);

      for (const [lang, langVoices] of Object.entries(byLanguage)) {
        console.log(`\n${lang.toUpperCase()}:`);
        langVoices.forEach(voice => {
          const gender = voice.gender ? `[${voice.gender}]` : '';
          const locale = voice.locale ? `(${voice.locale})` : '';
          const models = voice.models?.map(m => m.name).join(', ') || '';
          console.log(`  ${voice.id.padEnd(20)} ${voice.display_name?.padEnd(20)} ${gender.padEnd(10)} ${locale}`);
          if (models) {
            console.log(`    Models: ${models}`);
          }
        });
      }

      console.log(`\n✅ Total: ${voices.length} voices`);
    } catch (error: any) {
      console.error('❌ Failed to list voices:', error.message);
      process.exit(1);
    }
  });

voicesCommand
  .command('search')
  .description('Search for voices')
  .argument('<query>', 'Search query')
  .action(async (query: string) => {
    try {
      console.log(`🔍 Searching for voices matching "${query}"...\n`);

      const client = getSpeechifyClient();
      const voices = await client.getVoices({ search: query });

      if (voices.length === 0) {
        console.log('No voices found matching search criteria.');
        return;
      }

      console.log(`Found ${voices.length} matching voices:\n`);

      voices.forEach(voice => {
        console.log(`${voice.id}`);
        console.log(`  Name: ${voice.display_name || voice.id}`);
        console.log(`  Locale: ${voice.locale || 'N/A'}`);
        console.log(`  Gender: ${voice.gender || 'N/A'}`);
        if (voice.models && voice.models.length > 0) {
          console.log(`  Models: ${voice.models.map(m => m.name).join(', ')}`);
        }
        console.log('');
      });
    } catch (error: any) {
      console.error('❌ Search failed:', error.message);
      process.exit(1);
    }
  });

voicesCommand
  .command('preview')
  .description('Preview a voice')
  .argument('<voiceId>', 'Voice ID to preview')
  .option('-t, --text <text>', 'Custom preview text')
  .option('-o, --output <file>', 'Save preview to file', 'preview.mp3')
  .action(async (voiceId: string, options: any) => {
    try {
      console.log(`🔊 Generating preview for voice: ${voiceId}...`);

      const client = getSpeechifyClient();
      const audioBuffer = await client.previewVoice(voiceId, options.text);

      const outputPath = resolve(options.output);
      await writeFile(outputPath, audioBuffer);

      console.log('✅ Preview generated');
      console.log(`   Output: ${options.output}`);
      console.log(`   Play the file to hear the voice`);
    } catch (error: any) {
      console.error('❌ Preview failed:', error.message);
      process.exit(1);
    }
  });

voicesCommand
  .command('info')
  .description('Get detailed information about a voice')
  .argument('<voiceId>', 'Voice ID')
  .action(async (voiceId: string) => {
    try {
      console.log(`🔍 Fetching voice info: ${voiceId}...\n`);

      const client = getSpeechifyClient();
      const voice = await client.getVoice(voiceId);

      if (!voice) {
        console.log(`❌ Voice not found: ${voiceId}`);
        console.log('\nUse "npm run speechify voices list" to see available voices');
        process.exit(1);
      }

      console.log('Voice Information:');
      console.log(`  ID: ${voice.id}`);
      console.log(`  Name: ${voice.display_name || voice.id}`);
      console.log(`  Locale: ${voice.locale || 'N/A'}`);
      console.log(`  Gender: ${voice.gender || 'N/A'}`);
      console.log(`  Public: ${voice.public ? 'Yes' : 'No'}`);
      if (voice.models && voice.models.length > 0) {
        console.log(`  Models:`);
        voice.models.forEach(model => {
          console.log(`    - ${model.name}`);
          if (model.languages) {
            model.languages.forEach(lang => {
              console.log(`      Language: ${lang.locale}`);
            });
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Failed to get voice info:', error.message);
      process.exit(1);
    }
  });
