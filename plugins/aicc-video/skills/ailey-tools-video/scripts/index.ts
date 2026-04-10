#!/usr/bin/env node
/**
 * Video Processing CLI
 * Main entry point for ailey-tools-video
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { convertCommand } from './convert';
import { speedCommand } from './speed';
import { captionCommand } from './caption';
import { resizeCommand } from './resize';
import { cropCommand } from './crop';
import { audioCommand } from './audio';
import { splitCommand } from './split';
import { joinCommand } from './join';
import { filterCommand } from './filter';
import { extractCommand } from './extract';
import { infoCommand } from './info';

// Load environment variables
config();

const program = new Command();

program
  .name('ailey-video')
  .description('AI-ley Video Processing Toolkit')
  .version('1.0.0');

// Add commands
program.addCommand(convertCommand);
program.addCommand(speedCommand);
program.addCommand(captionCommand);
program.addCommand(resizeCommand);
program.addCommand(cropCommand);
program.addCommand(audioCommand);
program.addCommand(splitCommand);
program.addCommand(joinCommand);
program.addCommand(filterCommand);
program.addCommand(extractCommand);
program.addCommand(infoCommand);

// Test command
program
  .command('test')
  .description('Test FFmpeg installation')
  .action(async () => {
    try {
      const ffmpeg = require('fluent-ffmpeg');
      const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
      const ffprobePath = require('@ffprobe-installer/ffprobe').path;

      ffmpeg.setFfmpegPath(ffmpegPath);
      ffmpeg.setFfprobePath(ffprobePath);

      console.log('🧪 Testing FFmpeg installation...\n');
      console.log(`✅ FFmpeg: ${ffmpegPath}`);
      console.log(`✅ FFprobe: ${ffprobePath}`);
      console.log('\n✅ Installation successful!');
    } catch (error: any) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  });

program.parse();
