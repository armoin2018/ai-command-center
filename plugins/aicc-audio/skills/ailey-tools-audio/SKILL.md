---
id: ailey-tools-audio
name: ailey-tools-audio
description: Comprehensive audio processing toolkit with format conversion (mp3, wav, flac, etc.), transcription via OpenAI Whisper, video audio extraction, silence-based slicing, and audio manipulation. Use when converting audio formats, extracting audio from video, transcribing speech to text, or preprocessing audio for transcription.
keywords: [audio, video, transcription, whisper, ffmpeg, conversion, mp3, wav, flac, extract, demux, slice, silence-detection]
tools: [ffmpeg, fluent-ffmpeg, openai, whisper, commander]
---

# AI-ley Audio Tool

Comprehensive audio processing toolkit for format conversion, transcription, extraction, and manipulation.

## Overview

The ailey-tools-audio skill provides complete audio processing capabilities:

- **Format Conversion**: Convert between 10+ audio formats (mp3, wav, flac, aac, ogg, etc.)
- **Audio Extraction**: Extract audio from video files with demuxing support
- **Transcription**: Speech-to-text using OpenAI Whisper API
- **Silence Detection**: Slice audio files based on silence for optimal transcription
- **Audio Manipulation**: Adjust bitrate, speed, compression, channels
- **Batch Processing**: Process multiple files efficiently
- **Demux & Transcribe**: Combined workflow for video transcription

## When to Use

- **Format Conversion**: Convert audio between different formats
- **Video Processing**: Extract audio tracks from video files
- **Speech Recognition**: Transcribe audio/video to text
- **Podcast Processing**: Slice long audio files for faster transcription
- **Audio Optimization**: Adjust quality, speed, or compression
- **Multi-track Audio**: Demux or mux multiple audio streams
- **Transcription Prep**: Pre-process audio with silence detection for faster, more accurate transcription

## Installation

```bash
cd .github/skills/ailey-tools-audio
npm install
```

### Prerequisites

**FFmpeg** (required for audio processing):

| Platform | Install Command |
|----------|----------------|
| **macOS** | `brew install ffmpeg` |
| **Linux** | `sudo apt install ffmpeg` (Ubuntu/Debian) or `sudo dnf install ffmpeg` (Fedora) |
| **Windows** | `winget install ffmpeg` or `choco install ffmpeg` |

**OpenAI API Key** (required for transcription):

```bash
# Add to .env, .env.local, or ~/.vscode/.env
OPENAI_API_KEY=sk-your-api-key-here
```

Get API key: https://platform.openai.com/api-keys

## Quick Start

```bash
# Test FFmpeg availability
npm run audio test

# Convert audio format
npm run audio convert file -i input.wav -o output.mp3 -f mp3

# Extract audio from video
npm run audio extract file -i video.mp4 -o audio.mp3

# Transcribe audio
npm run audio transcribe file -i audio.mp3 -o transcript.txt

# Slice audio on silence
npm run audio slice file -i long-audio.mp3 -t -40 --min 0.5

# Demux + transcribe workflow
npm run audio demux-transcribe video -i video.mp4 --slice
```

---

## Workflow 1: Audio Format Conversion

Convert audio between formats with quality control.

### Supported Formats

| Format | Codec | Extension | Typical Use |
|--------|-------|-----------|-------------|
| MP3 | libmp3lame | .mp3 | General purpose, podcasts |
| WAV | pcm_s16le | .wav | Uncompressed, editing |
| FLAC | flac | .flac | Lossless compression |
| AAC | aac | .aac | Modern compression |
| OGG | libvorbis | .ogg | Open source compression |
| AIFF | pcm_s16be | .aiff | Apple uncompressed |
| BWF | pcm_s24le | .wav | Broadcast Wave Format |
| ALAC | alac | .m4a | Apple Lossless |
| WavPack | wavpack | .wv | Hybrid compression |
| M4A | aac | .m4a | Apple AAC format |

### Convert Single File

```bash
# Basic conversion
npm run audio convert file \
  -i input.wav \
  -o output.mp3 \
  -f mp3

# High-quality conversion
npm run audio convert file \
  -i input.wav \
  -o output.mp3 \
  -f mp3 \
  --bitrate 320k

# Convert with resampling
npm run audio convert file \
  -i input.wav \
  -o output.mp3 \
  -f mp3 \
  --sample-rate 48000

# Convert to mono
npm run audio convert file \
  -i stereo.mp3 \
  -o mono.mp3 \
  -f mp3 \
  --channels 1

# Convert with speed adjustment
npm run audio convert file \
  -i input.mp3 \
  -o fast.mp3 \
  -f mp3 \
  --speed 1.5
```

**TypeScript API:**

```typescript
import { getAudioClient } from './scripts/audio-client';

const client = getAudioClient();

await client.convert('input.wav', 'output.mp3', {
  format: 'mp3',
  bitrate: '320k',
  sampleRate: 48000,
  channels: 2,
  speed: 1.0,
});
```

### Quality Settings

**Bitrate Recommendations:**

- **64k-96k**: Voice, podcasts (low quality)
- **128k-192k**: General music, audiobooks
- **256k-320k**: High-quality music
- **Lossless**: FLAC, ALAC, WAV for archival

**Sample Rates:**

- **44100 Hz**: CD quality (default)
- **48000 Hz**: Professional audio
- **96000 Hz**: High-resolution audio

---

## Workflow 2: Audio Extraction from Video

Extract audio tracks from video files.

### Extract Single Audio Track

```bash
# Extract as MP3
npm run audio extract file \
  -i video.mp4 \
  -o audio.mp3 \
  -f mp3

# Extract as high-quality WAV
npm run audio extract file \
  -i video.mp4 \
  -o audio.wav \
  -f wav

# Extract as FLAC (lossless)
npm run audio extract file \
  -i video.mkv \
  -o audio.flac \
  -f flac
```

### Demux All Audio Tracks

For videos with multiple audio tracks (e.g., multi-language, commentary):

```bash
npm run audio extract demux \
  -i movie.mkv \
  -o ./audio_tracks \
  -f mp3
```

**Output:**
```
audio_tracks/
  track_0.mp3  # Main audio
  track_1.mp3  # Commentary
  track_2.mp3  # Foreign language
```

**TypeScript API:**

```typescript
import { getAudioClient } from './scripts/audio-client';

const client = getAudioClient();

// Extract single track
await client.extractAudio('video.mp4', 'audio.mp3', 'mp3');

// Demux all tracks
const tracks = await client.demuxAudio('video.mkv', './output', 'mp3');
console.log(`Extracted ${tracks.length} tracks`);
```

---

## Workflow 3: Audio Transcription

Transcribe audio/video to text using OpenAI Whisper.

### Transcribe Single File

```bash
# Basic transcription
npm run audio transcribe file \
  -i audio.mp3 \
  -o transcript.txt

# Transcribe with language hint
npm run audio transcribe file \
  -i audio.mp3 \
  -o transcript.txt \
  --language en

# Export as JSON with timestamps
npm run audio transcribe file \
  -i audio.mp3 \
  -o transcript.json \
  --format json

# Export as SRT subtitles
npm run audio transcribe file \
  -i audio.mp3 \
  -o subtitles.srt \
  --format srt

# Export as VTT (WebVTT)
npm run audio transcribe file \
  -i audio.mp3 \
  -o subtitles.vtt \
  --format vtt
```

### Language Codes

Common language codes for `--language` option:

- `en` - English
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ru` - Russian
- `ja` - Japanese
- `zh` - Chinese
- `ko` - Korean

[Full list](https://github.com/openai/whisper#available-models-and-languages)

### Output Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| text | .txt | Plain text transcript |
| json | .json | JSON with timestamps and metadata |
| srt | .srt | SubRip subtitle format |
| vtt | .vtt | WebVTT subtitle format |

**TypeScript API:**

```typescript
import OpenAI from 'openai';
import { createReadStream } from 'fs';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const transcription = await openai.audio.transcriptions.create({
  file: createReadStream('audio.mp3'),
  model: 'whisper-1',
  language: 'en',
  response_format: 'text',
});

console.log(transcription);
```

---

## Workflow 4: Silence-Based Audio Slicing

Slice long audio files at silence points for faster, more accurate transcription.

### Why Slice Audio?

**Benefits:**
- **Faster Transcription**: Parallel processing of smaller chunks
- **Better Accuracy**: Smaller segments reduce context drift
- **Cost Optimization**: Process only non-silent portions
- **Error Recovery**: Failed chunks don't affect entire file

### Slice Single File

```bash
# Basic slicing with default settings
npm run audio slice file \
  -i long-podcast.mp3 \
  -o ./slices

# Custom silence threshold
npm run audio slice file \
  -i audio.mp3 \
  -o ./slices \
  --threshold -30

# Control segment duration
npm run audio slice file \
  -i audio.mp3 \
  -o ./slices \
  --threshold -40 \
  --min 0.5 \
  --max 300
```

### Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--threshold` | -40 | Silence threshold in dB (lower = quieter counts as silence) |
| `--min` | 0.5 | Minimum silence duration in seconds |
| `--max` | 300 | Maximum segment duration in seconds (5 minutes) |

**Threshold Guidelines:**

- **-20 dB**: Very loud silence (only very quiet moments)
- **-30 dB**: Moderate silence (pauses in speech)
- **-40 dB**: Quiet silence (most pauses) - **recommended**
- **-50 dB**: Very quiet (almost any pause)

**TypeScript API:**

```typescript
import { getAudioClient } from './scripts/audio-client';

const client = getAudioClient();

const segments = await client.sliceOnSilence('long-audio.mp3', {
  silenceThresholdDb: -40,
  minDuration: 0.5,
  maxDuration: 300,
  outputDir: './slices',
});

console.log(`Created ${segments.length} segments`);
```

---

## Workflow 5: Combined Demux & Transcribe

Extract audio from video and transcribe in one workflow.

### Basic Usage

```bash
# Extract and prepare for transcription
npm run audio demux-transcribe video \
  -i video.mp4 \
  -o ./output

# With silence-based slicing
npm run audio demux-transcribe video \
  -i video.mp4 \
  -o ./output \
  --slice

# Custom settings
npm run audio demux-transcribe video \
  -i lecture.mp4 \
  -o ./lecture_output \
  --slice \
  --threshold -35 \
  --format wav \
  --language en
```

### Workflow Steps

1. **Extract Audio**: Demux audio from video
2. **Slice (Optional)**: Split audio at silence points
3. **Prepare**: Output ready for transcription

**Output Structure:**

```
output/
  video.mp3           # Extracted audio
  slices/             # If --slice used
    segment_001.mp3
    segment_002.mp3
    ...
```

### Full Video Transcription Example

```bash
# Step 1: Extract and slice
npm run audio demux-transcribe video \
  -i meeting.mp4 \
  -o ./meeting \
  --slice \
  --threshold -40

# Step 2: Transcribe segments
for file in meeting/slices/*.mp3; do
  npm run audio transcribe file -i "$file" -o "${file%.mp3}.txt"
done

# Step 3: Combine transcripts
cat meeting/slices/*.txt > meeting/full_transcript.txt
```

**TypeScript Automation:**

```typescript
import { getAudioClient } from './scripts/audio-client';
import OpenAI from 'openai';
import { readdir, writeFile } from 'fs/promises';
import { createReadStream } from 'fs';

const client = getAudioClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Extract audio
await client.extractAudio('video.mp4', './output/audio.mp3', 'mp3');

// Slice on silence
const segments = await client.sliceOnSilence('./output/audio.mp3', {
  silenceThresholdDb: -40,
  minDuration: 0.5,
  maxDuration: 300,
  outputDir: './output/slices',
});

// Transcribe each segment
const transcripts = [];
for (const segment of segments) {
  const result = await openai.audio.transcriptions.create({
    file: createReadStream(segment),
    model: 'whisper-1',
  });
  transcripts.push(result.text);
}

// Combine
const fullTranscript = transcripts.join('\n\n');
await writeFile('./output/transcript.txt', fullTranscript);
```

---

## Advanced Usage

### Audio Manipulation

**Adjust Speed:**

```bash
# 1.5x speed
npm run audio convert file \
  -i input.mp3 \
  -o fast.mp3 \
  -f mp3 \
  --speed 1.5

# 0.75x speed (slow down)
npm run audio convert file \
  -i input.mp3 \
  -o slow.mp3 \
  -f mp3 \
  --speed 0.75
```

**Compress Dynamic Range:**

```bash
npm run audio convert file \
  -i input.mp3 \
  -o compressed.mp3 \
  -f mp3 \
  --compression -20
```

### Mux Audio Tracks

Combine multiple audio files:

```typescript
import { getAudioClient } from './scripts/audio-client';

const client = getAudioClient();

await client.muxAudio(
  ['track1.mp3', 'track2.mp3', 'track3.mp3'],
  'mixed.mp3',
  'mp3'
);
```

### Get Audio Metadata

```typescript
import { getAudioClient } from './scripts/audio-client';

const client = getAudioClient();
const metadata = await client.getMetadata('audio.mp3');

console.log(`Duration: ${metadata.format.duration}s`);
console.log(`Bitrate: ${metadata.format.bit_rate} bps`);
console.log(`Sample Rate: ${metadata.streams[0].sample_rate} Hz`);
console.log(`Channels: ${metadata.streams[0].channels}`);
```

---

## Integration with AI-ley Ecosystem

### With ailey-tools-tag-n-rag

Index transcripts for RAG:

```bash
# Transcribe
npm run audio transcribe file -i video.mp3 -o transcript.txt

# Index with tag-n-rag
cd ../ailey-tools-tag-n-rag
npm run process file ../ailey-tools-audio/transcript.txt --collection transcripts
```

### With ailey-tools-data-converter

Convert transcription JSON to other formats:

```bash
# Export as JSON
npm run audio transcribe file -i audio.mp3 -o transcript.json --format json

# Convert to CSV
cd ../ailey-tools-data-converter
npm run convert file transcript.json output.csv json csv
```

---

## Troubleshooting

### FFmpeg Not Found

```
❌ FFmpeg not available
```

**Solution:**

```bash
# macOS
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt install ffmpeg

# Windows
winget install ffmpeg
# or: choco install ffmpeg

# Verify
npm run audio test
```

### OpenAI API Key Missing

```
❌ OPENAI_API_KEY not found in environment
```

**Solution:**

```bash
# Add to .env
echo 'OPENAI_API_KEY=sk-your-key-here' >> .env

# Or global
echo 'OPENAI_API_KEY=sk-your-key-here' >> ~/.vscode/.env
```

### Transcription Fails on Large Files

**Cause**: Whisper API has file size limits

**Solution**: Use silence-based slicing first:

```bash
npm run audio slice file -i large-audio.mp3 -o ./slices
```

### Audio Quality Issues

**Low Quality Output:**

- Increase bitrate: `--bitrate 320k`
- Use lossless format: `-f flac`
- Higher sample rate: `--sample-rate 48000`

**File Too Large:**

- Lower bitrate: `--bitrate 128k`
- Use compressed format: `-f mp3` or `-f aac`
- Convert to mono: `--channels 1`

### Silence Detection Not Working

**Too Many/Few Segments:**

Adjust threshold:
- Too many segments: Lower threshold (e.g., `-50` → `-40`)
- Too few segments: Raise threshold (e.g., `-40` → `-30`)

---

## Reference Documentation

- **[FFmpeg Codec Guide](references/ffmpeg-codecs.md)**: Complete codec and format reference
- **[Whisper API Guide](references/whisper-api.md)**: OpenAI Whisper API documentation

---

## Cost Optimization

### Transcription Costs

OpenAI Whisper pricing: $0.006 per minute

**Optimization Strategies:**

1. **Slice on Silence**: Remove silent portions
2. **Batch Processing**: Process multiple files in parallel
3. **Format Selection**: Use compressed formats (MP3) to reduce upload time
4. **Language Hint**: Specify language for better accuracy

**Example:**

```bash
# 60-minute podcast
# Full file: 60 min × $0.006 = $0.36

# With silence slicing (removes ~20% silence):
# 48 min × $0.006 = $0.288
# Savings: $0.072 (20%)
```

---

version: 1.1.0
updated: 2026-03-03
reviewed: 2026-03-03
score: 4.5
---
