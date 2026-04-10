# ailey-tools-audio

Audio processing toolkit with format conversion, transcription, and silence-based slicing.

## Features

- ✅ **Format Conversion**: 10+ formats (mp3, wav, flac, aac, ogg, aiff, alac, etc.)
- ✅ **Audio Extraction**: Extract from video, demux multi-track audio
- ✅ **Transcription**: OpenAI Whisper API integration
- ✅ **Silence Detection**: Intelligent audio slicing
- ✅ **Audio Manipulation**: Bitrate, speed, compression, channels
- ✅ **Batch Processing**: Process multiple files
- ✅ **Demux & Transcribe**: Combined video workflow

## Quick Start

```bash
# Install
cd .github/skills/ailey-tools-audio
npm install

# Prerequisites
brew install ffmpeg  # macOS
# Get OpenAI API key: https://platform.openai.com/api-keys

# Configure
echo 'OPENAI_API_KEY=sk-your-key-here' >> .env

# Test
npm run audio test

# Convert format
npm run audio convert file -i input.wav -o output.mp3 -f mp3

# Extract from video
npm run audio extract file -i video.mp4 -o audio.mp3

# Transcribe
npm run audio transcribe file -i audio.mp3 -o transcript.txt

# Slice on silence
npm run audio slice file -i podcast.mp3 --threshold -40
```

## Documentation

- **[SKILL.md](SKILL.md)**: Complete documentation with workflows
- **[SETUP.md](SETUP.md)**: Setup guide with troubleshooting
- **[FFmpeg Codecs](references/ffmpeg-codecs.md)**: Codec reference
- **[Whisper API](references/whisper-api.md)**: Transcription API guide

## Commands

```bash
# Test FFmpeg
npm run audio test

# Convert audio
npm run audio convert file -i <input> -o <output> -f <format> [options]

# Extract from video
npm run audio extract file -i <video> -o <audio> -f <format>
npm run audio extract demux -i <video> -o <dir> -f <format>

# Transcribe
npm run audio transcribe file -i <audio> -o <output> [options]

# Slice on silence
npm run audio slice file -i <audio> -o <dir> -t <threshold>

# Demux & transcribe
npm run audio demux-transcribe video -i <video> -o <dir> [--slice]
```

## Supported Formats

**Audio Formats**: mp3, mp4/m4a, wav, aiff, bwf, flac, alac, wavpack, aac, ogg

**Video Formats**: mp4, mkv, avi, mov, webm, flv (extract audio only)

**Transcription Outputs**: text, json, srt, vtt

## TypeScript API

```typescript
import { getAudioClient } from './scripts/audio-client';
import OpenAI from 'openai';

// Convert audio
const client = getAudioClient();
await client.convert('input.wav', 'output.mp3', {
  format: 'mp3',
  bitrate: '320k',
  sampleRate: 48000,
});

// Extract from video
await client.extractAudio('video.mp4', 'audio.mp3', 'mp3');

// Transcribe
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const transcription = await openai.audio.transcriptions.create({
  file: createReadStream('audio.mp3'),
  model: 'whisper-1',
});

// Slice on silence
const segments = await client.sliceOnSilence('audio.mp3', {
  silenceThresholdDb: -40,
  minDuration: 0.5,
  maxDuration: 300,
  outputDir: './slices',
});
```

## License

MIT

---
