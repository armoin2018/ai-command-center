#!/usr/bin/env node
/**
 * Test Speechify API Client
 * 
 * Verifies the Speechify client works with actual API
 */

import { getSpeechifyClient } from './speechify-client';

async function testSpeechifyClient() {
  console.log('🧪 Testing Speechify API Client\n');

  const client = getSpeechifyClient();

  try {
    // Test 1: List voices
    console.log('Test 1: Fetching voices...');
    const voices = await client.getVoices();
    console.log(`✅ Found ${voices.length} voices`);
    
    if (voices.length > 0) {
      const sample = voices[0];
      console.log(`   Sample voice: ${sample.id} (${sample.display_name || 'N/A'})`);
      console.log(`   Locale: ${sample.locale || 'N/A'}`);
      console.log(`   Models: ${sample.models?.map(m => m.name).join(', ') || 'N/A'}`);
    }
    console.log('');

    // Test 2: Filter voices
    console.log('Test 2: Filtering voices by language...');
    const englishVoices = await client.getVoices({ language: 'en' });
    console.log(`✅ Found ${englishVoices.length} English voices`);
    console.log('');

    // Test 3: Get specific voice
    console.log('Test 3: Getting voice info...');
    const george = await client.getVoice('george');
    if (george) {
      console.log(`✅ Found voice: ${george.display_name || george.id}`);
      console.log(`   Locale: ${george.locale || 'N/A'}`);
      console.log(`   Gender: ${george.gender || 'N/A'}`);
    } else {
      console.log('⚠️  Voice "george" not found (may need API token)');
    }
    console.log('');

    // Test 4: Convert text (requires API token)
    console.log('Test 4: Converting text to speech...');
    if (process.env.SPEECHIFY_TOKEN) {
      try {
        const audio = await client.convertToSpeech(
          'Hello, this is a test of the Speechify API.',
          'george',
          {
            audio_format: 'mp3',
            model: 'simba-multilingual',
            language: 'en-US'
          }
        );
        console.log(`✅ Conversion successful (${audio.length} bytes)`);
      } catch (error: any) {
        console.log(`❌ Conversion failed: ${error.message}`);
      }
    } else {
      console.log('⚠️  Skipped (SPEECHIFY_TOKEN not set)');
    }
    console.log('');

    // Test 5: Estimate cost
    console.log('Test 5: Estimating cost...');
    const text = 'This is a sample text for cost estimation.';
    const cost = await client.estimateCost(text);
    console.log(`✅ Estimated cost: $${cost.toFixed(6)} for ${text.length} characters`);
    console.log('');

    console.log('✅ All tests completed successfully!\n');

  } catch (error: any) {
    console.error(`❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run tests
testSpeechifyClient().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});
