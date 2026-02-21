#!/usr/bin/env node
/**
 * Info Command - Get Video Information
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const infoCommand = new Command('info')
  .description('Get video information')
  .requiredOption('-i, --input <file>', 'Input video file')
  .option('--json', 'Output as JSON', false)
  .action(async (options) => {
    try {
      const inputPath = resolve(options.input);

      const processor = getVideoProcessor();
      const info = await processor.getVideoInfo(inputPath);

      if (options.json) {
        console.log(JSON.stringify(info, null, 2));
      } else {
        console.log('\n📹 Video Information\n');
        console.log(`   Duration: ${info.duration.toFixed(2)}s`);
        console.log(`   Format: ${info.format}`);
        console.log(`   Size: ${(info.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Video Codec: ${info.videoCodec}`);
        console.log(`   Audio Codec: ${info.audioCodec || 'None'}`);
        console.log(`   Resolution: ${info.width}x${info.height}`);
        console.log(`   FPS: ${info.fps.toFixed(2)}`);
        console.log(`   Bitrate: ${Math.round(info.bitrate / 1000)} kbps`);
        if (info.audioChannels) {
          console.log(`   Audio Channels: ${info.audioChannels}`);
        }
        if (info.audioSampleRate) {
          console.log(`   Audio Sample Rate: ${info.audioSampleRate} Hz`);
        }
        console.log('');
      }
    } catch (error: any) {
      console.error('❌ Failed to get video info:', error.message);
      process.exit(1);
    }
  });
