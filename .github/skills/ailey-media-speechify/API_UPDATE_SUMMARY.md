# Speechify API Update Summary

**Date**: February 9, 2026  
**Status**: ✅ Complete

## Overview

Updated the ailey-media-speechify skill to match the actual Speechify API specification from official documentation at https://docs.sws.speechify.com.

## Key Changes

### API Structure Corrections

#### Before (Assumed API):
```typescript
interface ConversionOptions {
  voice?: string;
  format?: 'mp3' | 'wav' | 'aac' | 'ogg';
  speed?: number;      // ❌ Not supported
  pitch?: number;      // ❌ Not supported
  volume?: number;     // ❌ Not supported
  quality?: string;    // ❌ Not supported
}

await client.convertToSpeech(text, options);
```

#### After (Actual API):
```typescript
interface ConversionOptions {
  input: string;                    // Required
  voice_id: string;                 // Required
  model?: 'simba-english' | 'simba-multilingual' | 'simba-turbo';
  audio_format?: 'mp3' | 'wav' | 'aac' | 'ogg' | 'flac';
  sample_rate?: number;             // 8000-48000
  language?: string;                // Locale: en-US, fr-FR, etc.
  options?: {
    loudness_normalization?: boolean;
  };
}

await client.convertToSpeech(text, voiceId, options);
```

### Voice Interface Corrections

#### Before:
```typescript
interface Voice {
  id: string;
  name: string;        // ❌ Wrong property
  language: string;    // ❌ Wrong property
  gender?: string;
  accent?: string;     // ❌ Not in actual API
  description?: string; // ❌ Not in actual API
}
```

#### After:
```typescript
interface Voice {
  id: string;
  display_name?: string;    // ✅ Correct
  locale?: string;          // ✅ Correct (not 'language')
  gender?: string;
  public?: boolean;
  user_id?: string;
  models?: Array<{          // ✅ Models array
    name: string;
    languages?: Array<{
      locale: string;
      preview_audio?: string;
    }>;
  }>;
}
```

## Files Updated

### TypeScript Client (`speechify-client.ts`)
- ✅ Updated `ConversionOptions` interface
- ✅ Updated `Voice` interface  
- ✅ Fixed `convertToSpeech()` method signature: `(text, voiceId, options)`
- ✅ Fixed `convertFileToSpeech()` method signature
- ✅ Added `streamToSpeech()` method for streaming endpoint
- ✅ Updated `getVoices()` filtering logic (locale vs language)
- ✅ Fixed `previewVoice()` method
- ✅ Updated `estimateCost()` parameter handling
- ✅ Removed helper methods (volumeToDb, getModelForQuality)

### CLI Commands (`convert.ts`)
- ✅ Updated file command parameters:
  - Removed: `--speed`, `--pitch`, `--volume`, `--quality`
  - Added: `--model`, `--language`, `--sample-rate`, `--normalize`
- ✅ Changed default voice: `en-US-neural-female` → `george`
- ✅ Updated audio formats to include `flac`
- ✅ Fixed method calls to pass `voiceId` separately

### Voice Management (`voices.ts`)
- ✅ Updated list command to use `locale` instead of `language`
- ✅ Changed property references: `name` → `display_name`
- ✅ Added models display in voice info
- ✅ Updated search command with correct Voice properties
- ✅ Fixed preview command method signature
- ✅ Added TypeScript type annotations

### Batch Processing (`batch.ts`)
- ✅ Updated default voice: `en-US-neural-female` → `george`
- ✅ Removed: `--speed`, `--quality` options
- ✅ Added: `--model`, `--language`, `--normalize` options
- ✅ Updated conversion options structure
- ✅ Fixed `convertToSpeech()` call signature

### Documentation (`SKILL.md`)
- ✅ Updated all CLI examples with correct parameters
- ✅ Replaced voice names (neural voices → actual Speechify voices)
- ✅ Updated voice examples: `george`, `henry`, `matilda`, `cliff`, `snoop`, `gwyneth`
- ✅ Added model documentation: `simba-english`, `simba-multilingual`, `simba-turbo`
- ✅ Replaced speed/pitch/volume sections with SSML prosody controls
- ✅ Added SSML examples for rate, pitch, volume control
- ✅ Updated TypeScript API examples
- ✅ Added FLAC format to supported formats
- ✅ Updated all workflow examples

## Removed Features (Not Supported by API)

The following parameters do NOT exist in the Speechify API as direct parameters:

❌ `speed` - Use SSML `<prosody rate="...">` instead  
❌ `pitch` - Use SSML `<prosody pitch="...">` instead  
❌ `volume` - Use SSML `<prosody volume="...">` instead  
❌ `quality` - Use `model` parameter (`simba-turbo` for fast, `simba-multilingual` for quality)

## Added Features (From Actual API)

✅ **Models**: `simba-english`, `simba-multilingual`, `simba-turbo`  
✅ **Sample Rate Control**: 8000-48000 Hz  
✅ **Language Parameter**: Locale-based (en-US, fr-FR, etc.)  
✅ **Loudness Normalization**: Boolean option  
✅ **Streaming Endpoint**: `/v1/audio/stream` with chunked transfer  
✅ **FLAC Format**: Lossless audio compression  

## API Endpoints Used

- `POST /v1/audio/speech` - Convert text to speech (primary)
- `POST /v1/audio/stream` - Streaming conversion
- `GET /v1/voices` - List available voices
- `POST /v1/auth/token` - OAuth2 authentication (future)

## Authentication

```bash
export SPEECHIFY_TOKEN=your_api_token_here
```

Or in `.env`:
```
SPEECHIFY_TOKEN=your_api_token_here
```

## Voice Examples

Popular Speechify voices:
- `george` - American male (natural, clear)
- `henry` - British male (professional)
- `matilda` - British female (warm, friendly)
- `snoop` - American male (distinctive)
- `gwyneth` - American female (smooth)
- `cliff` - American male (authoritative)

## SSML Support

Speechify supports SSML for advanced control:

```xml
<speak>
  <prosody rate="slow" pitch="+10%" volume="loud">
    This text is spoken slowly, with higher pitch and louder volume.
  </prosody>
  <break time="500ms"/>
  <emphasis level="strong">This is emphasized.</emphasis>
</speak>
```

## Testing

All TypeScript files compile successfully:

```bash
cd .github/skills/ailey-media-speechify
npm run build  # ✅ Success (0 errors)
```

## Migration Guide for Users

If you have existing code using the old interface:

### Before:
```bash
npm run speechify convert file -i doc.md -o audio.mp3 \
  --voice en-US-neural-female --speed 1.2
```

### After:
```bash
npm run speechify convert file -i doc.md -o audio.mp3 \
  --voice george --model simba-multilingual
```

For speed control, use SSML:
```xml
<speak>
  <prosody rate="120%">
    Your text here
  </prosody>
</speak>
```

## References

- **Official Docs**: https://docs.sws.speechify.com
- **API Base URL**: https://api.sws.speechify.com
- **Context7 Library**: `/websites/sws_speechify` (141 code snippets, trust score 10/10)

## Conclusion

The skill now accurately reflects the Speechify API specification. All TypeScript compilation errors resolved. Documentation updated with correct examples. Ready for use with actual Speechify API tokens.
