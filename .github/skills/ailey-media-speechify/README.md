# AI-ley Speechify Integration

Convert text to natural speech using Speechify's AI-powered text-to-speech API.

## Quick Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add API token:**
   ```bash
   # Add to .env, .env.local, or ~/.vscode/.env
   SPEECHIFY_TOKEN=your-api-token-here
   ```
   Get your token at: https://speechify.com/api

3. **Test connection:**
   ```bash
   npm run speechify test
   ```

## Quick Commands

```bash
# List available voices
npm run speechify voices list

# Convert text to speech
npm run speechify convert file -i document.md -o audio.mp3

# Batch convert folder
npm run speechify batch -i ./docs -o ./audiobooks --voice en-US-neural-female
```

## Features

- ✅ 200+ natural voices in 60+ languages
- ✅ Multiple audio formats (MP3, WAV, AAC, OGG)
- ✅ Speed, pitch, and volume control
- ✅ Batch processing support
- ✅ Document format support (TXT, MD, PDF, DOCX)

See [SKILL.md](SKILL.md) for complete documentation.
