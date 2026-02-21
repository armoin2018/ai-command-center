#!/usr/bin/env node
/**
 * Convert Command - Video Format Conversion
 */

import { Command } from 'commander';
import { getVideoProcessor } from './video-processor';
import { resolve } from 'path';

export const convertCommand = new Command('convert')
  .description('Convert video format - supports multiple inputs/outputs, globs, and streaming')
  .option('-i, --input <files...>', 'Input video file(s), glob pattern(s), URL(s), or pipe:0 for stdin')
  .option('-o, --output <files...>', 'Output video file(s) or pipe:1 for stdout')
  .option('--video-codec <codec>', 'Video codec (h264, h265, vp9, av1)', 'h264')
  .option('--audio-codec <codec>', 'Audio codec (aac, mp3, opus)')
  .option('--quality <quality>', 'Quality preset (low, medium, high)', 'medium')
  .option('--bitrate <bitrate>', 'Video bitrate (e.g., 2M, 5000k)')
  .option('--two-pass', 'Use two-pass encoding', false)
  .option('--format <format>', 'Output format for stream output (mp4, flv, hls, mpegts)')
  .option('--input-format <format>', 'Input format for stream input (rtsp, hls, mpegts)')
  .action(async (options) => {
    if (!options.input || !options.output) {
      console.error('❌ Error: --input and --output are required');
      console.log('');
      console.log('Examples:');
      console.log('  Single file:   npm run video convert -i input.mp4 -o output.webm');
      console.log('  Multiple:      npm run video convert -i vid1.mp4 vid2.mp4 -o out1.webm out2.webm');
      console.log('  Glob pattern:  npm run video convert -i "videos/*.mp4" -o "converted/"');
      console.log('  From URL:      npm run video convert -i https://example.com/video.mp4 -o local.mp4');
      console.log('  From stdin:    cat video.mp4 | npm run video convert -i pipe:0 -o output.webm');
      console.log('  To stdout:     npm run video convert -i input.mp4 -o pipe:1 --format mpegts > out.ts');
      console.log('  RTSP stream:   npm run video convert -i rtsp://camera/stream -o recording.mp4');
      process.exit(1);
    }

    try {
      // Support both single and multiple inputs/outputs
      const input = options.input.length === 1 ? options.input[0] : options.input;
      const output = options.output.length === 1 ? options.output[0] : options.output;

      console.log('🔄 Converting video...');
      console.log(`   Input: ${JSON.stringify(input)}`);
      console.log(`   Output: ${JSON.stringify(output)}`);
      console.log(`   Codec: ${options.videoCodec}`);
      console.log(`   Quality: ${options.quality}`);

      const processor = getVideoProcessor();

      await processor.convert(input, output, {
        videoCodec: options.videoCodec,
        audioCodec: options.audioCodec,
        quality: options.quality as 'low' | 'medium' | 'high',
        bitrate: options.bitrate,
        twoPass: options.twoPass,
        format: options.format,
        inputFormat: options.inputFormat
      });

      console.log('✅ Conversion complete');
    } catch (error: any) {
      console.error('❌ Conversion failed:', error.message);
      process.exit(1);
    }
  });
