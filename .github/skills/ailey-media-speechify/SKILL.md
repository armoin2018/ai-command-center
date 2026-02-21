---
id: ailey-media-speechify
name: ailey-media-speechify
description: Convert text to natural speech using Speechify API with 200+ voices in 60+ languages. Generate audiobooks, narrate documents, create podcasts, and produce audio content from text files (MD, TXT, PDF, DOCX). Use when converting text to audio, creating audiobooks, narrating documentation, generating podcast audio, or producing accessible audio content.
keywords: [speechify, text-to-speech, tts, audio, voice, narration, audiobook, podcast, accessibility, speech-synthesis, voice-over]
tools: [speechify-api, axios, commander, dotenv]
---

# AI-ley Speechify Integration

Convert text to natural-sounding speech using Speechify's AI-powered text-to-speech API with 200+ voices across 60+ languages.

## Overview

The ailey-media-speechify skill provides comprehensive text-to-speech capabilities:

- **Text-to-Speech**: Convert text files to high-quality audio
- **Voice Library**: 200+ natural voices (male/female, accents, languages)
- **Document Support**: MD, TXT, PDF, DOCX, EPUB → MP3, WAV, AAC
- **Batch Processing**: Convert multiple files efficiently
- **Voice Customization**: Control speed, pitch, volume
- **Multi-language**: 60+ languages including accents
- **SSML Support**: Advanced speech control with markup
- **Audio Formats**: MP3, WAV, AAC, OGG output

## When to Use

- **Documentation**: Convert technical docs, READMEs to audio
- **Audiobooks**: Create audiobooks from text content
- **Podcasts**: Generate narrated podcast content
- **Learning**: Convert course materials to audio
- **Accessibility**: Make content accessible via audio
- **Content Creation**: Produce voice-overs, narrations
- **Productivity**: Listen to articles, emails, documents

## Installation

```bash
cd .github/skills/ailey-media-speechify
npm install
```

### Prerequisites

**Speechify API Token** (required):

```bash
# Add to .env, .env.local, or ~/.vscode/.env
SPEECHIFY_TOKEN=your-speechify-api-token-here
```

Get API token: https://speechify.com/api

## Quick Start

```bash
# Test connection
npm run speechify test

# List available voices
npm run speechify voices list

# Convert text to speech
npm run speechify convert file -i document.md -o audio.mp3

# Convert with specific voice
npm run speechify convert file -i article.txt -o narration.mp3 --voice george

# Batch convert folder
npm run speechify batch -i ./docs -o ./audiobooks --voice henry

# Convert with custom settings
npm run speechify convert file -i story.txt -o story.mp3 --model simba-multilingual --language en-US
```

---

## Workflow 1: Text-to-Speech Conversion

Convert text files to audio with natural voices.

### Convert Single File

```bash
# Basic conversion
npm run speechify convert file \
  -i document.md \
  -o audio.mp3

# With specific voice
npm run speechify convert file \
  -i article.txt \
  -o narration.mp3 \
  --voice george

# With model and language
npm run speechify convert file \
  -i book.txt \
  -o audiobook.mp3 \
  --voice henry \
  --model simba-multilingual \
  --language en-GB

# High quality output (WAV format)
npm run speechify convert file \
  -i story.md \
  -o story.wav \
  --format wav \
  --sample-rate 48000

# With loudness normalization
npm run speechify convert file \
  -i content.txt \
  -o content.mp3 \
  --voice matilda \
  --model simba-multilingual \
  --language es-ES \
  --normalize
```

### Supported Input Formats

| Format | Extension | Notes |
|--------|-----------|-------|
| Plain Text | .txt | Direct text input |
| Markdown | .md | Formatted text |
| PDF | .pdf | Extracted text content |
| Word | .docx | Extracted text content |
| EPUB | .epub | eBook format |
| HTML | .html | Web content |

### Audio Output Formats

| Format | Quality | File Size | Use Case |
|--------|---------|-----------|----------|
| MP3 | Good | Small | General use, podcasts |
| WAV | Highest | Large | Professional, editing |
| AAC | Good | Medium | Apple ecosystem |
| OGG | Good | Small | Web, open source |
| FLAC | Highest | Medium | Lossless compression |

**TypeScript API:**

```typescript
import { getSpeechifyClient } from './scripts/speechify-client';
import { writeFile } from 'fs/promises';

const client = getSpeechifyClient();

const audio = await client.convertToSpeech('Hello, world!', 'george', {
  audio_format: 'mp3',
  model: 'simba-multilingual',
  language: 'en-US',
  sample_rate: 24000
});

await writeFile('output.mp3', audio);
```

---

## Workflow 2: Voice Management

Discover and select from 200+ natural voices.

### List All Voices

```bash
# List all available voices
npm run speechify voices list

# Filter by language
npm run speechify voices list --language en

# Filter by gender
npm run speechify voices list --gender female

# Search voices
npm run speechify voices search "british"
```

### Voice Categories

**Popular English Voices:**
- `george` - American male (natural, clear)
- `henry` - British male (professional)
- `matilda` - British female (warm, friendly)
- `snoop` - American male (distinctive)
- `gwyneth` - American female (smooth)
- `cliff` - American male (authoritative)

**Models:**
- `simba-english` - Optimized for English (fastest)
- `simba-multilingual` - 60+ languages (recommended)
- `simba-turbo` - Ultra-fast, good quality

**Language Support:**
Supports 60+ languages using locale codes (en-US, fr-FR, de-DE, es-ES, ja-JP, zh-CN, etc.)
Use `--language` parameter with voice for multi-language synthesis.

### Voice Preview

```bash
# Preview a voice
npm run speechify voices preview george

# Preview with custom text
npm run speechify voices preview henry \
  --text "Hello, this is a voice preview test"

# Get voice information
npm run speechify voices info matilda
```

**TypeScript API:**

```typescript
import { getSpeechifyClient } from './scripts/speechify-client';

const client = getSpeechifyClient();

// Get all voices
const voices = await client.getVoices();

// Filter voices
const femaleVoices = voices.filter(v => v.gender === 'female');
const englishVoices = voices.filter(v => v.language.startsWith('en'));

console.log(`Available voices: ${voices.length}`);
```

---

## Workflow 3: Batch Processing

Convert multiple files to audio efficiently.

### Batch Convert Folder

```bash
# Convert all text files in folder
npm run speechify batch \
  -i ./documents \
  -o ./audiobooks \
  --voice george

# With custom settings
npm run speechify batch \
  -i ./content \
  -o ./audio \
  --voice henry \
  --model simba-multilingual \
  --format mp3

# Filter by pattern
npm run speechify batch \
  -i ./docs \
  -o ./narrations \
  --pattern "*.md" \
  --voice matilda

# Parallel processing with normalization
npm run speechify batch \
  -i ./books \
  -o ./audiobooks \
  --parallel 4 \
  --voice george \
  --normalize
```

### Batch with File Mapping

```bash
# Custom output naming
npm run speechify batch \
  -i ./chapters \
  -o ./audiobook \
  --prefix "Chapter_" \
  --voice henry
```

**Output Structure:**

```
audiobook/
  Chapter_01.mp3
  Chapter_02.mp3
  Chapter_03.mp3
  ...
```

**TypeScript API:**

```typescript
import { getSpeechifyClient } from './scripts/speechify-client';
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const client = getSpeechifyClient();

const files = await readdir('./documents');
const textFiles = files.filter(f => f.endsWith('.txt') || f.endsWith('.md'));

for (const file of textFiles) {
  const audio = await client.convertFileToSpeech(
    join('./documents', file),
    'george',
    {
      audio_format: 'mp3',
      model: 'simba-multilingual',
      language: 'en-US'
    }
  );
  
  const outputName = file.replace(/\.(txt|md)$/, '.mp3');
  await writeFile(join('./audiobooks', outputName), audio);
  console.log(`✅ Converted: ${file} → ${outputName}`);
}
```

---

## Workflow 4: Advanced Speech Control

Fine-tune speech output with SSML and custom settings.

### SSML Support

```bash
# Convert with SSML markup
npm run speechify convert ssml \
  -i marked-up.xml \
  -o speech.mp3 \
  --voice en-US-neural-female
```

**SSML Example:**

```xml
<speak>
  <p>
    Welcome to <emphasis level="strong">Speechify</emphasis>.
  </p>
  <break time="1s"/>
  <p>
    This is a <prosody rate="slow">slower section</prosody> of text.
  </p>
  <p>
    And this is <prosody pitch="+20%">higher pitched</prosody>.
  </p>
</speak>
```

### Speech Rate Control (via SSML)

Speechify uses SSML for advanced speech control. Speed, pitch, and volume are controlled via SSML markup, not CLI parameters.

**SSML Prosody Example:**

```xml
<speak>
  <p>This is normal speed.</p>
  <p><prosody rate="slow">This is slower speech.</prosody></p>
  <p><prosody rate="fast">This is faster speech.</prosody></p>
  <p><prosody rate="80%">This is 80% of normal speed.</prosody></p>
  <p><prosody rate="120%">This is 120% of normal speed.</prosody></p>
</speak>
```

**Rate Values:**
- `x-slow`, `slow`, `medium`, `fast`, `x-fast`
- Percentage: `50%` to `200%`
- Absolute: `0.5` to `2.0`

### Pitch & Volume Control (via SSML)

```xml
<speak>
  <!-- Pitch control -->
  <p><prosody pitch="low">Lower pitch voice.</prosody></p>
  <p><prosody pitch="high">Higher pitch voice.</prosody></p>
  <p><prosody pitch="+20%">20% higher pitch.</prosody></p>
  <p><prosody pitch="-10%">10% lower pitch.</prosody></p>
  
  <!-- Volume control -->
  <p><prosody volume="loud">Louder volume.</prosody></p>
  <p><prosody volume="soft">Softer volume.</prosody></p>
  <p><prosody volume="+6dB">Increased by 6dB.</prosody></p>
  
  <!-- Combined -->
  <p>
    <prosody rate="slow" pitch="low" volume="soft">
      Slow, low-pitched, quiet speech.
    </prosody>
  </p>
</speak>
```

---

## Workflow 5: Document Processing

Convert various document formats to audio.

### PDF to Audio

```bash
npm run speechify convert file \
  -i document.pdf \
  -o audiobook.mp3 \
  --voice george \
  --model simba-multilingual
```

### Word Document to Audio

```bash
npm run speechify convert file \
  -i report.docx \
  -o narration.mp3 \
  --voice henry
```

### Markdown to Audio

```bash
npm run speechify convert file \
  -i README.md \
  -o readme-audio.mp3 \
  --voice matilda
```

### EPUB to Audiobook

```bash
npm run speechify convert file \
  -i book.epub \
  -o audiobook.mp3 \
  --voice cliff \
  --model simba-english
```

---

## Integration with AI-ley Ecosystem

### With ailey-tools-audio

Post-process Speechify output:

```bash
# Generate speech
npm run speechify convert file -i story.txt -o narration.mp3

# Apply audio effects
cd ../ailey-tools-audio
npm run audio convert file -i narration.mp3 -o final.mp3 --compression -10
```

### With ailey-tools-tag-n-rag

Create searchable audio library:

```bash
# Convert documents to audio
npm run speechify batch -i ./docs -o ./audio-docs

# Index audio transcripts
cd ../ailey-tools-tag-n-rag
npm run process folder ../ailey-media-speechify/audio-docs --collection audio-library
```

### With ailey-media-canva

Create multimedia content:

```bash
# Generate narration
npm run speechify convert file -i script.txt -o voiceover.mp3

# Combine with visuals (manual import to Canva)
```

---

## Advanced Usage

### Custom Voice Profiles

```typescript
import { getSpeechifyClient } from './scripts/speechify-client';

const client = getSpeechifyClient();

// Create custom voice profile
const profile = {
  baseVoice: 'en-US-neural-female',
  speed: 1.1,
  pitch: 1.0,
### Voice Profiles

```typescript
// Create reusable voice configuration
const voiceProfile = {
  voice_id: 'george',
  audio_format: 'mp3' as const,
  model: 'simba-multilingual' as const,
  language: 'en-US',
  sample_rate: 24000,
  options: {
    loudness_normalization: true
  }
};

const audio = await client.convertToSpeech(text, voiceProfile.voice_id, {
  audio_format: voiceProfile.audio_format,
  model: voiceProfile.model,
  language: voiceProfile.language,
  sample_rate: voiceProfile.sample_rate,
  options: voiceProfile.options
});
```

### Multi-voice Narration

```typescript
// Different voices for different speakers
const narrator = await client.convertToSpeech(narration, 'george', {
  audio_format: 'mp3',
  model: 'simba-english'
});

const dialogue = await client.convertToSpeech(character, 'matilda', {
  audio_format: 'mp3',
  model: 'simba-english'
});

// Combine with ailey-tools-audio mux
```

### Progress Tracking

```typescript
import { getSpeechifyClient } from './scripts/speechify-client';
import { readFile, writeFile } from 'fs/promises';

const client = getSpeechifyClient();

const files = ['chapter1.txt', 'chapter2.txt', 'chapter3.txt'];

for (let i = 0; i < files.length; i++) {
  console.log(`[${i + 1}/${files.length}] Converting ${files[i]}...`);
  
  const audio = await client.convertFileToSpeech(files[i], 'george', {
    audio_format: 'mp3',
    model: 'simba-multilingual'
  });
  
  await writeFile(files[i].replace('.txt', '.mp3'), audio);
}

console.log('✅ All chapters converted');
```

---

## Troubleshooting

### API Token Not Found

```
❌ SPEECHIFY_TOKEN not found in environment
```

**Solution:**

1. Create API token at https://speechify.com/api
2. Add to `.env` file:
   ```bash
   SPEECHIFY_TOKEN=your-token-here
   ```
3. Or set environment variable:
   ```bash
   export SPEECHIFY_TOKEN=your-token-here
   ```

### API Rate Limits

```
❌ Rate limit exceeded
```

**Solution:**

- Free tier: Limited requests per day
- Upgrade to paid plan for higher limits
- Implement retry logic with delays

### Voice Not Available

```
❌ Voice 'xyz' not found
```

**Solution:**

```bash
# List available voices
npm run speechify voices list

# Search for similar voices
npm run speechify voices search "female english"
```

### Large File Processing

```
⚠️ File too large for single request
```

**Solution:**

```bash
# Split large files first
split -l 1000 large-file.txt chunk_

# Convert chunks
for chunk in chunk_*; do
  npm run speechify convert file -i "$chunk" -o "${chunk}.mp3"
done

# Combine with ailey-tools-audio
cd ../ailey-tools-audio
npm run audio mux chunks chunk_*.mp3 combined.mp3
```

---

## Best Practices

### Quality Optimization

**Voice Selection:**
- Match voice to content type (professional, casual, storytelling)
- Consider target audience accent preferences
- Test multiple voices for best fit

**Speed Settings:**
- Documentation: 1.0-1.1x (clear comprehension)
- Audiobooks: 1.0-1.2x (comfortable listening)
- Podcasts: 1.0-1.15x (engaging pace)
- Learning: 0.9-1.0x (understanding priority)

**Format Selection:**
- MP3: General distribution, podcasts
- WAV: Professional production, editing
- AAC: Apple podcasts, iTunes
- OGG: Web streaming, open platforms

### Cost Optimization

```bash
# Estimate cost before batch processing
npm run speechify estimate -i ./docs --voice en-US-neural-female

# Use lower quality for drafts
npm run speechify convert file -i draft.txt -o preview.mp3 --quality low

# Final production with high quality
npm run speechify convert file -i final.txt -o release.mp3 --quality high
```

### Content Preparation

**Text Cleaning:**
- Remove special characters that don't vocalize
- Expand abbreviations (Dr. → Doctor)
- Add pronunciation hints with SSML
- Insert pauses for clarity

**Structure:**
- Break long texts into chapters
- Add section markers
- Include metadata (title, author, chapter)

---

## API Reference

### Client Methods

```typescript
interface SpeechifyClient {
  // Convert text to speech
  convertToSpeech(text: string, options?: ConversionOptions): Promise<Buffer>;
  
  // Get available voices
  getVoices(filter?: VoiceFilter): Promise<Voice[]>;
  
  // Estimate cost
  estimateCost(text: string, options?: ConversionOptions): Promise<number>;
  
  // Check API status
  healthCheck(): Promise<boolean>;
}

interface ConversionOptions {
  voice?: string;
  format?: 'mp3' | 'wav' | 'aac' | 'ogg';
  speed?: number;    // 0.5 - 2.0
  pitch?: number;    // 0.5 - 2.0
  volume?: number;   // 0.0 - 2.0
  quality?: 'low' | 'medium' | 'high';
}

interface Voice {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  accent?: string;
  description?: string;
}
```

---

## Examples

### Convert README to Audio

```bash
npm run speechify convert file \
  -i README.md \
  -o README.mp3 \
  --voice en-US-neural-female \
  --speed 1.1
```

### Create Multi-chapter Audiobook

```bash
# Convert each chapter
for chapter in chapters/*.md; do
  npm run speechify convert file \
    -i "$chapter" \
    -o "audiobook/$(basename "$chapter" .md).mp3" \
    --voice en-UK-male \
    --speed 1.0
done
```

### Generate Podcast Narration

```bash
npm run speechify convert file \
  -i podcast-script.txt \
  -o episode-narration.mp3 \
  --voice en-US-neural-female \
  --speed 1.15
```

---

**Version:** 1.0.0  
**Last Updated:** 2026-02-09  
**API Version:** Speechify API v1
