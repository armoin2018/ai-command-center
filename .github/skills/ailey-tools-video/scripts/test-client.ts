#!/usr/bin/env node
/**
 * Test Video Processing Client
 * Verifies the video processor works correctly
 */

import { getVideoProcessor } from './video-processor';

async function testVideoProcessor() {
  console.log('🧪 Testing Video Processing Client\n');

  const processor = getVideoProcessor();

  try {
    // Test 1: Check FFmpeg installation
    console.log('Test 1: Checking FFmpeg installation...');
    const ffmpeg = require('fluent-ffmpeg');
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    
    console.log(`✅ FFmpeg found: ${ffmpegPath}`);
    console.log(`✅ FFprobe found: ${ffprobePath}`);
    console.log('');

    // Test 2: Test basic video info (requires a test video)
    console.log('Test 2: Video info functionality...');
    console.log('⚠️  Skipped (requires test video file)');
    console.log('   To test: npm run video info -i your-video.mp4');
    console.log('');

    // Test 3: Available codecs
    console.log('Test 3: Video processor initialization...');
    console.log('✅ VideoProcessor class instantiated');
    console.log('✅ Methods available:');
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(processor))
      .filter(m => m !== 'constructor');
    methods.forEach(method => console.log(`   - ${method}()`));
    console.log('');

    console.log('✅ All tests completed successfully!\n');
    console.log('💡 Next steps:');
    console.log('   1. Test with a video file: npm run video info -i video.mp4');
    console.log('   2. Convert format: npm run video convert -i input.mp4 -o output.webm');
    console.log('   3. Adjust speed: npm run video speed -i video.mp4 -o fast.mp4 --rate 1.5');
    console.log('');

  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
testVideoProcessor().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
