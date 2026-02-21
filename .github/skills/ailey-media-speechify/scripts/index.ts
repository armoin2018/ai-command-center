#!/usr/bin/env node
/**
 * Speechify CLI Entry Point
 * 
 * Command-line interface for Speechify text-to-speech operations
 */

import { Command } from 'commander';
import { convertCommand } from './convert';
import { voicesCommand } from './voices';
import { batchCommand } from './batch';
import { getSpeechifyClient } from './speechify-client';

const program = new Command();

program
  .name('speechify')
  .description('Speechify text-to-speech CLI for AI-ley toolkit')
  .version('1.0.0');

// Test command
program
  .command('test')
  .description('Test Speechify API connection')
  .action(async () => {
    try {
      console.log('🔍 Testing Speechify API connection...');
      const client = getSpeechifyClient();
      
      const healthy = await client.healthCheck();
      if (healthy) {
        console.log('✅ API connection successful');
        
        const voices = await client.getVoices();
        console.log(`✅ Found ${voices.length} available voices`);
        
        console.log('\nReady to use! Try:');
        console.log('  npm run speechify voices list');
        console.log('  npm run speechify convert file -i test.txt -o test.mp3');
      }
    } catch (error: any) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }
  });

// Convert command
program.addCommand(convertCommand);

// Voices command
program.addCommand(voicesCommand);

// Batch command
program.addCommand(batchCommand);

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
