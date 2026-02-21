# Speechify API Quick Reference

## Setup

```bash
# 1. Install dependencies
cd .github/skills/ailey-media-speechify
npm install

# 2. Set API token
export SPEECHIFY_TOKEN=your_token_here

# 3. Test connection
npm run speechify voices list
```

## Common Commands

### Convert Text File
```bash
npm run speechify convert file -i input.txt -o output.mp3 --voice george
```

### Convert with Model & Language
```bash
npm run speechify convert file -i doc.md -o audio.mp3 \
  --voice henry \
  --model simba-multilingual \
  --language en-GB
```

### Batch Convert Folder
```bash
npm run speechify batch -i ./docs -o ./audio \
  --voice matilda \
  --model simba-english \
  --parallel 4
```

### List Voices
```bash
npm run speechify voices list
npm run speechify voices list --language en
npm run speechify voices search "british"
```

### Preview Voice
```bash
npm run speechify voices preview george
npm run speechify voices info henry
```

## TypeScript API

```typescript
import { getSpeechifyClient } from './scripts/speechify-client';
import { writeFile } from 'fs/promises';

const client = getSpeechifyClient();

// Convert text to speech
const audio = await client.convertToSpeech(
  'Hello, world!',
  'george',
  {
    audio_format: 'mp3',
    model: 'simba-multilingual',
    language: 'en-US',
    sample_rate: 24000
  }
);

await writeFile('output.mp3', audio);

// Convert file
const fileAudio = await client.convertFileToSpeech(
  './input.txt',
  'henry',
  { audio_format: 'mp3', model: 'simba-english' }
);

// Get voices
const voices = await client.getVoices({ language: 'en', gender: 'female' });
console.log(`Found ${voices.length} voices`);

// Preview voice
const preview = await client.previewVoice('matilda');
await writeFile('preview.mp3', preview);
```

## API Parameters

### ConversionOptions
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `audio_format` | string | `'mp3'` | mp3, wav, aac, ogg, flac |
| `model` | string | `'simba-multilingual'` | simba-english, simba-multilingual, simba-turbo |
| `language` | string | - | Locale: en-US, fr-FR, de-DE, etc. |
| `sample_rate` | number | `24000` | 8000-48000 Hz |
| `options.loudness_normalization` | boolean | `false` | Enable normalization |

### Voices
Popular voices:
- `george` - American male
- `henry` - British male  
- `matilda` - British female
- `cliff` - American male
- `gwyneth` - American female
- `snoop` - American male

### Models
- `simba-english` - Optimized for English (fastest)
- `simba-multilingual` - 60+ languages (recommended)
- `simba-turbo` - Ultra-fast, good quality

### Audio Formats
- `mp3` - Good quality, small size
- `wav` - Highest quality, large size
- `aac` - Good quality, Apple ecosystem
- `ogg` - Good quality, open source
- `flac` - Lossless compression

## SSML Examples

### Speed Control
```xml
<speak>
  <prosody rate="slow">Slow speech</prosody>
  <prosody rate="120%">120% speed</prosody>
  <prosody rate="fast">Fast speech</prosody>
</speak>
```

### Pitch Control
```xml
<speak>
  <prosody pitch="low">Lower pitch</prosody>
  <prosody pitch="+20%">20% higher</prosody>
  <prosody pitch="high">Higher pitch</prosody>
</speak>
```

### Volume Control
```xml
<speak>
  <prosody volume="soft">Quiet</prosody>
  <prosody volume="loud">Loud</prosody>
  <prosody volume="+6dB">Increase 6dB</prosody>
</speak>
```

### Combined Controls
```xml
<speak>
  <prosody rate="slow" pitch="-10%" volume="soft">
    Slow, low-pitched, quiet speech
  </prosody>
</speak>
```

### Emphasis & Breaks
```xml
<speak>
  <emphasis level="strong">Important!</emphasis>
  <break time="500ms"/>
  Normal speech continues.
  <break time="1s"/>
  After a longer pause.
</speak>
```

## Troubleshooting

### Token Not Found
```bash
# Check token is set
echo $SPEECHIFY_TOKEN

# Set in .env file
echo "SPEECHIFY_TOKEN=your_token" >> .env
```

### Voice Not Found
```bash
# List all voices
npm run speechify voices list

# Search for voice
npm run speechify voices search "male english"
```

### Build Errors
```bash
# Rebuild TypeScript
npm run build

# Check for errors
npx tsc --noEmit
```

## API Limits

- Free tier: Limited requests/day
- Paid plans: Higher limits
- See: https://speechify.com/pricing

## Documentation

- **Skill Docs**: [SKILL.md](./SKILL.md)
- **API Update**: [API_UPDATE_SUMMARY.md](./API_UPDATE_SUMMARY.md)
- **Official API**: https://docs.sws.speechify.com
- **Get Token**: https://speechify.com/api
