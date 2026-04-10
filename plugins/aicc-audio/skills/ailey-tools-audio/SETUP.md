# Audio Tool Setup Guide

Quick setup guide for the ailey-tools-audio skill.

## Prerequisites

### 1. Install FFmpeg

FFmpeg is required for all audio processing operations.

**macOS:**
```bash
brew install ffmpeg
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install ffmpeg
```

**Windows:**

Option 1: Chocolatey
```bash
choco install ffmpeg
```

Option 2: Manual Download
1. Download from https://ffmpeg.org/download.html
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to PATH

**Verify Installation:**
```bash
ffmpeg -version
```

### 2. Install Node.js Dependencies

```bash
cd .github/skills/ailey-tools-audio
npm install
```

Expected output:
```
added 81 packages
found 0 vulnerabilities
```

### 3. Configure OpenAI API Key (For Transcription)

Transcription requires an OpenAI API key.

**Get API Key:**
1. Visit https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the key (starts with `sk-`)

**Configure:**

Create `.env` file:
```bash
# Option 1: Project-specific
echo 'OPENAI_API_KEY=sk-your-key-here' >> .env

# Option 2: Global (all projects)
echo 'OPENAI_API_KEY=sk-your-key-here' >> ~/.vscode/.env

# Option 3: Local (gitignored)
echo 'OPENAI_API_KEY=sk-your-key-here' >> .env.local
```

## 4. Test Installation

```bash
# Test FFmpeg
npm run audio test
```

Expected output:
```
✅ FFmpeg is available
   Formats: 200+ available
```

## Quick Start Examples

### Convert Audio Format

```bash
npm run audio convert file \
  -i input.wav \
  -o output.mp3 \
  -f mp3
```

### Extract Audio from Video

```bash
npm run audio extract file \
  -i video.mp4 \
  -o audio.mp3
```

### Transcribe Audio

```bash
npm run audio transcribe file \
  -i audio.mp3 \
  -o transcript.txt
```

### Slice on Silence

```bash
npm run audio slice file \
  -i podcast.mp3 \
  -o ./slices \
  --threshold -40
```

## Common Issues

### Issue: FFmpeg Not Found

**Error:**
```
❌ FFmpeg not available
```

**Solution:**
1. Install FFmpeg (see Prerequisites)
2. Verify installation: `ffmpeg -version`
3. Restart terminal
4. Test again: `npm run audio test`

### Issue: OpenAI API Key Missing

**Error:**
```
❌ OPENAI_API_KEY not found in environment
```

**Solution:**
1. Create API key at https://platform.openai.com/api-keys
2. Add to `.env` file
3. Test: `npm run audio transcribe file -i test.mp3`

### Issue: Permission Denied

**Error:**
```
EACCES: permission denied
```

**Solution:**
```bash
# macOS/Linux: Fix permissions
chmod +x scripts/*.ts

# Or use npm scripts
npm run audio <command>
```

### Issue: Module Not Found

**Error:**
```
Cannot find module 'fluent-ffmpeg'
```

**Solution:**
```bash
# Reinstall dependencies
cd .github/skills/ailey-tools-audio
rm -rf node_modules package-lock.json
npm install
```

## Environment Variable Priority

The skill checks for environment variables in this order:

1. `.env.local` (gitignored, project-specific)
2. `.env` (project root)
3. `~/.vscode/.env` (global, all projects)

**Example:**

```bash
# Global default
echo 'OPENAI_API_KEY=sk-default-key' >> ~/.vscode/.env

# Project override
echo 'OPENAI_API_KEY=sk-project-key' >> .env.local
```

## Next Steps

- Read full documentation: [SKILL.md](SKILL.md)
- Learn about codecs: [references/ffmpeg-codecs.md](references/ffmpeg-codecs.md)
- Explore Whisper API: [references/whisper-api.md](references/whisper-api.md)

---
