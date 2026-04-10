#!/usr/bin/env node
/**
 * Main CLI entry point for ailey-tools-audio
 */

import { Command } from 'commander';
import { testFFmpeg } from './audio-client';

const program = new Command();

program
  .name('ailey-tools-audio')
  .description('Audio processing toolkit with conversion, transcription, and slicing')
  .version('1.0.0');

program
  .command('test')
  .description('Test FFmpeg availability')
  .action(async () => {
    await testFFmpeg();
  });

program
  .command('convert')
  .description('Convert audio formats (file, batch)')
  .argument('[subcommand]', 'Subcommand: file, batch')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: convertProgram } = await import('./convert-audio');
    const args = process.argv.slice(process.argv.indexOf('convert') + 1);
    convertProgram.parse(['node', 'convert', ...args]);
  });

program
  .command('extract')
  .description('Extract audio from video (file, demux)')
  .argument('[subcommand]', 'Subcommand: file, demux')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: extractProgram } = await import('./extract-audio');
    const args = process.argv.slice(process.argv.indexOf('extract') + 1);
    extractProgram.parse(['node', 'extract', ...args]);
  });

program
  .command('transcribe')
  .description('Transcribe audio to text (file, batch)')
  .argument('[subcommand]', 'Subcommand: file, batch')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: transcribeProgram } = await import('./transcribe-audio');
    const args = process.argv.slice(process.argv.indexOf('transcribe') + 1);
    transcribeProgram.parse(['node', 'transcribe', ...args]);
  });

program
  .command('slice')
  .description('Slice audio on silence (file)')
  .argument('[subcommand]', 'Subcommand: file')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: sliceProgram } = await import('./slice-audio');
    const args = process.argv.slice(process.argv.indexOf('slice') + 1);
    sliceProgram.parse(['node', 'slice', ...args]);
  });

program
  .command('demux-transcribe')
  .description('Extract audio and transcribe (video)')
  .argument('[subcommand]', 'Subcommand: video')
  .allowUnknownOption()
  .action(async (subcommand: string, options: any, command: Command) => {
    const { program: demuxProgram } = await import('./demux-transcribe');
    const args = process.argv.slice(process.argv.indexOf('demux-transcribe') + 1);
    demuxProgram.parse(['node', 'demux-transcribe', ...args]);
  });

// Show help if no command specified
if (process.argv.length === 2) {
  program.help();
}

program.parse();
