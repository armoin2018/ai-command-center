# OpenAI Whisper API Reference

Comprehensive guide to using OpenAI Whisper for audio transcription with ailey-audio-tool.

## Overview

**Whisper** is OpenAI's automatic speech recognition (ASR) system trained on 680,000 hours of multilingual data. It provides:

- **Multilingual support**: 99 languages
- **Automatic language detection**
- **Timestamps**: Word-level and segment-level timing
- **Multiple output formats**: Text, JSON, SRT, VTT
- **Punctuation and capitalization**
- **Speaker diarization**: Limited support

## Pricing

### API Costs (as of 2024)

| Model | Price | Audio Length Limit | Best For |
|-------|-------|-------------------|----------|
| whisper-1 | $0.006 / minute | 25 MB max file size | General transcription |

**Cost Examples:**
- 1-hour podcast: $0.36
- 2-hour meeting: $0.72
- 10-minute video: $0.06

**Cost Optimization:**
See the [Silence-Based Slicing workflow](../SKILL.md#workflow-4-silence-based-audio-slicing) for 20%+ savings.

## API Configuration

### API Key Setup

**Method 1: Global Environment (.env in home)**

```bash
# ~/.vscode/.env
OPENAI_API_KEY=sk-your-api-key-here
```

**Method 2: Project Environment (.env)**

```bash
# ai-command-center/.env
OPENAI_API_KEY=sk-your-api-key-here
```

**Method 3: Skill-Specific (.env.local)**

```bash
# .github/skills/ailey-audio-tool/.env.local
OPENAI_API_KEY=sk-your-api-key-here
```

**Priority:** .env.local > .env > ~/.vscode/.env

### Get API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy key and save to .env file
5. Test with: `npm run audio transcribe file -i test.mp3`

## Supported Languages

### Full Language List (99 languages)

Afrikaans, Albanian, Amharic, Arabic, Armenian, Assamese, Azerbaijani, Bashkir, Basque, Belarusian, Bengali, Bosnian, Breton, Bulgarian, Burmese, Castilian, Catalan, Chinese, Croatian, Czech, Danish, Dutch, English, Estonian, Faroese, Finnish, Flemish, French, Galician, Georgian, German, Greek, Gujarati, Haitian, Haitian Creole, Hausa, Hawaiian, Hebrew, Hindi, Hungarian, Icelandic, Indonesian, Italian, Japanese, Javanese, Kannada, Kazakh, Khmer, Korean, Lao, Latin, Latvian, Letzeburgesch, Lingala, Lithuanian, Luxembourgish, Macedonian, Malagasy, Malay, Malayalam, Maltese, Maori, Marathi, Moldavian, Moldovan, Mongolian, Myanmar, Nepali, Norwegian, Nynorsk, Occitan, Panjabi, Pashto, Persian, Polish, Portuguese, Punjabi, Pushto, Romanian, Russian, Sanskrit, Serbian, Shona, Sindhi, Sinhala, Sinhalese, Slovak, Slovenian, Somali, Spanish, Sundanese, Swahili, Swedish, Tagalog, Tajik, Tamil, Tatar, Telugu, Thai, Tibetan, Turkish, Turkmen, Ukrainian, Urdu, Uzbek, Valencian, Vietnamese, Welsh, Yiddish, Yoruba

### Popular Languages

| Language | Code | Quality | Notes |
|----------|------|---------|-------|
| English | en | Excellent | Best accuracy |
| Spanish | es | Excellent | High quality |
| French | fr | Excellent | High quality |
| German | de | Excellent | High quality |
| Chinese | zh | Very Good | Simplified & Traditional |
| Japanese | ja | Very Good | |
| Korean | ko | Very Good | |
| Portuguese | pt | Very Good | Brazilian & European |
| Russian | ru | Very Good | |
| Italian | it | Very Good | |
| Arabic | ar | Good | Multiple dialects |
| Hindi | hi | Good | |

## Output Formats

### Text Format

**Description:** Plain text transcription without timestamps or metadata.

**Use Case:** Simple transcripts, blog posts, notes

**Example:**
```bash
npm run audio transcribe file \
  -i podcast.mp3 \
  -o transcript.txt \
  --format text
```

**Output:**
```
This is the transcribed text from the audio file. It includes punctuation and capitalization but no timestamps or speaker information.
```

### JSON Format

**Description:** Structured output with segments, timestamps, and confidence scores.

**Use Case:** Detailed analysis, searchable transcripts, programmatic processing

**Example:**
```bash
npm run audio transcribe file \
  -i meeting.mp3 \
  -o meeting.json \
  --format json
```

**Output:**
```json
{
  "text": "Full transcription text",
  "segments": [
    {
      "id": 0,
      "seek": 0,
      "start": 0.0,
      "end": 5.5,
      "text": "This is the first segment.",
      "tokens": [50364, 50414, ...],
      "temperature": 0.0,
      "avg_logprob": -0.25,
      "compression_ratio": 1.5,
      "no_speech_prob": 0.001
    }
  ],
  "language": "en"
}
```

**JSON Fields:**
- `text`: Full transcription
- `segments[].start`: Segment start time (seconds)
- `segments[].end`: Segment end time (seconds)
- `segments[].text`: Segment transcription
- `segments[].avg_logprob`: Average log probability (confidence)
- `segments[].no_speech_prob`: Probability of no speech
- `language`: Detected language code

### SRT Format (SubRip)

**Description:** Subtitle format with sequential numbering and timestamps.

**Use Case:** Video subtitles, YouTube captions, video players

**Example:**
```bash
npm run audio transcribe file \
  -i video-audio.mp3 \
  -o subtitles.srt \
  --format srt
```

**Output:**
```
1
00:00:00,000 --> 00:00:05,500
This is the first subtitle segment.

2
00:00:05,500 --> 00:00:10,250
This is the second subtitle segment.

3
00:00:10,250 --> 00:00:15,000
And this is the third subtitle segment.
```

**SRT Format:**
- Sequential numbering (1, 2, 3...)
- Timestamps: HH:MM:SS,mmm --> HH:MM:SS,mmm
- Text on new line after timestamp
- Blank line between segments

### VTT Format (WebVTT)

**Description:** Web Video Text Tracks format, similar to SRT but web-optimized.

**Use Case:** HTML5 video, web players, modern video platforms

**Example:**
```bash
npm run audio transcribe file \
  -i webinar.mp3 \
  -o captions.vtt \
  --format vtt
```

**Output:**
```
WEBVTT

00:00:00.000 --> 00:00:05.500
This is the first caption segment.

00:00:05.500 --> 00:00:10.250
This is the second caption segment.

00:00:10.250 --> 00:00:15.000
And this is the third caption segment.
```

**VTT Format:**
- Header: WEBVTT
- Timestamps: HH:MM:SS.mmm --> HH:MM:SS.mmm
- Optional cue identifiers
- Supports styling and positioning

## Transcription Workflows

### Workflow 1: Simple Transcription

**Scenario:** Transcribe a single audio file

```bash
# Audio file → Text transcription
npm run audio transcribe file -i podcast.mp3 -o transcript.txt --format text
```

**Best For:**
- Podcasts
- Interviews
- Lectures
- Simple note-taking

### Workflow 2: Video Transcription with Subtitles

**Scenario:** Extract audio from video and create subtitles

```bash
# Step 1: Extract audio from video
npm run audio extract file -i lecture.mp4 -o lecture-audio.mp3 -f mp3

# Step 2: Transcribe to SRT
npm run audio transcribe file -i lecture-audio.mp3 -o lecture.srt --format srt
```

**Best For:**
- YouTube videos
- Educational content
- Accessibility compliance
- Video editing

### Workflow 3: Meeting Transcription with Timestamps

**Scenario:** Transcribe meeting with detailed timestamps

```bash
# Extract audio from meeting recording
npm run audio extract file -i meeting.mp4 -o meeting-audio.wav -f wav

# Transcribe to JSON for timestamps
npm run audio transcribe file -i meeting-audio.wav -o meeting.json --format json
```

**Best For:**
- Business meetings
- Depositions
- Research interviews
- Detailed analysis

### Workflow 4: Large File Transcription (Cost Optimization)

**Scenario:** Transcribe large file with silence-based slicing for cost savings

```bash
# Step 1: Extract audio
npm run audio extract file -i conference.mp4 -o conference.wav -f wav

# Step 2: Slice on silence to remove dead air
npm run audio slice file \
  -i conference.wav \
  -o slices/ \
  --threshold -40 \
  --min 1 \
  --max 60

# Step 3: Batch transcribe slices (manual process)
for file in slices/*.wav; do
  npm run audio transcribe file -i "$file" -o "${file%.wav}.txt" --format text
done

# Step 4: Combine transcripts
cat slices/*.txt > conference-full-transcript.txt
```

**Benefits:**
- 20-30% cost reduction by removing silence
- Faster transcription (parallel processing)
- Better accuracy (shorter segments)
- Easier error recovery (re-transcribe failed slices)

### Workflow 5: Multi-Language Transcription

**Scenario:** Transcribe content in multiple languages

```bash
# Automatic language detection
npm run audio transcribe file -i multilingual.mp3 -o output.txt --format text

# Specify language hint for better accuracy
npm run audio transcribe file \
  -i spanish.mp3 \
  -o spanish.txt \
  --format text \
  --language es
```

**Best For:**
- International content
- Language learning
- Multilingual meetings
- Translation preparation

## Advanced Features

### Language Detection

Whisper automatically detects the spoken language:

```bash
# Automatic detection
npm run audio transcribe file -i unknown-language.mp3 -o output.json --format json
# Check "language" field in JSON output
```

### Language Hints

Improve accuracy by providing a language hint:

```bash
npm run audio transcribe file \
  -i french-podcast.mp3 \
  -o french.txt \
  --format text \
  --language fr
```

**When to Use:**
- Known language improves accuracy
- Mixed-language content (hint for primary language)
- Accented speech

### Timestamp Precision

**Segment-Level Timestamps (JSON/SRT/VTT):**
- Precision: ~0.5-2 seconds
- Automatically generated
- Suitable for most use cases

**Word-Level Timestamps:**
- Currently not supported directly by Whisper API
- Use JSON segments and estimate from text length
- Third-party libraries may offer word-level timing

### Confidence Scores

JSON output includes confidence metrics:

```json
{
  "segments": [
    {
      "avg_logprob": -0.25,
      "no_speech_prob": 0.001
    }
  ]
}
```

**Metrics:**
- `avg_logprob`: Average log probability (higher = more confident)
  - Good: > -0.5
  - Acceptable: -0.5 to -1.0
  - Poor: < -1.0
- `no_speech_prob`: Probability segment is not speech (lower = better)
  - Good: < 0.1
  - Acceptable: 0.1-0.3
  - Poor: > 0.3

## Optimization Strategies

### File Size Optimization

**25 MB Limit:**

```bash
# Check file size
ls -lh audio.mp3

# If > 25 MB, compress or slice
npm run audio convert file -i large.wav -o compressed.mp3 -f mp3 --bitrate 64k
# OR
npm run audio slice file -i large.mp3 -o segments/ --threshold -40 --max 60
```

### Quality vs. Cost

| Approach | Quality | Cost | Speed |
|----------|---------|------|-------|
| High-quality WAV | Best | Highest | Slowest |
| MP3 320k | Excellent | High | Medium |
| MP3 192k | Very Good | Medium | Medium |
| MP3 128k | Good | Low | Fast |
| MP3 64k | Acceptable | Lowest | Fastest |

**Recommendation:** MP3 128k for most use cases (good quality, reasonable cost)

### Parallel Processing

Process multiple files in parallel for faster results:

```bash
# Bash parallel processing
for file in *.mp3; do
  npm run audio transcribe file -i "$file" -o "${file%.mp3}.txt" --format text &
done
wait
```

**Benefits:**
- 3-5x faster for multiple files
- Better resource utilization
- Ideal for batch transcription

### Error Handling

**Common Errors:**

1. **File Too Large (> 25 MB)**
   ```
   Error: File size exceeds 25 MB limit
   ```
   **Solution:** Compress or slice audio
   ```bash
   npm run audio convert file -i large.wav -o compressed.mp3 -f mp3 --bitrate 128k
   ```

2. **Invalid API Key**
   ```
   Error: Invalid API key
   ```
   **Solution:** Check .env file, verify key at https://platform.openai.com/api-keys

3. **Unsupported File Format**
   ```
   Error: Unsupported file type
   ```
   **Solution:** Convert to supported format (MP3, MP4, WAV, etc.)
   ```bash
   npm run audio convert file -i input.ogg -o output.mp3 -f mp3
   ```

4. **Rate Limit Exceeded**
   ```
   Error: Rate limit exceeded
   ```
   **Solution:** Wait 1 minute and retry, or upgrade API plan

5. **Network Timeout**
   ```
   Error: Request timeout
   ```
   **Solution:** Check internet connection, try smaller file

## Integration Examples

### Integration with ailey-tag-n-rag

Index transcripts in RAG system:

```bash
# Step 1: Transcribe
npm run audio transcribe file -i lecture.mp3 -o lecture.txt --format text

# Step 2: Index in RAG (from ailey-tag-n-rag skill)
npm run rag tag -i lecture.txt -t "lecture,education,AI" -c "AI Command Center"
```

### Integration with ailey-data-converter

Convert transcription to other formats:

```bash
# Step 1: Transcribe to JSON
npm run audio transcribe file -i podcast.mp3 -o podcast.json --format json

# Step 2: Convert JSON to CSV (from ailey-data-converter skill)
npm run convert -i podcast.json -o podcast.csv -f csv
```

### Combined Demux + Transcribe

Full video-to-transcript workflow:

```bash
# Single command extracts audio, optionally slices, and prepares for transcription
npm run audio demux-transcribe video -i webinar.mp4 -o webinar-output/

# Then transcribe
npm run audio transcribe file \
  -i webinar-output/audio.mp3 \
  -o webinar-transcript.txt \
  --format text
```

## Best Practices

### Audio Quality

**For Best Transcription Results:**
1. Use clear audio with minimal background noise
2. Prefer higher bitrates (128k+ for MP3)
3. Use WAV or FLAC for critical transcriptions
4. Ensure audio is audible (not too quiet)
5. Remove or reduce music/sound effects

### Language Hints

**When to Specify Language:**
- Known language improves accuracy by 5-10%
- Mixed-language content (specify primary language)
- Accented speech
- Technical jargon in specific language

### Format Selection

| Format | When to Use |
|--------|-------------|
| **Text** | Simple notes, blog posts, no timestamps needed |
| **JSON** | Programmatic processing, detailed analysis, searchable transcripts |
| **SRT** | Video subtitles, YouTube, most video players |
| **VTT** | HTML5 video, modern web players, web accessibility |

### Cost Management

**Strategies to Reduce Costs:**

1. **Slice on Silence**: Remove dead air (20-30% savings)
   ```bash
   npm run audio slice file -i audio.mp3 -o slices/ --threshold -40 --max 60
   ```

2. **Compress Audio**: Use lower bitrate (10-20% savings)
   ```bash
   npm run audio convert file -i input.wav -o compressed.mp3 -f mp3 --bitrate 64k
   ```

3. **Batch Processing**: Transcribe during off-peak hours

4. **Preview First**: Test with first minute before full transcription
   ```bash
   ffmpeg -i audio.mp3 -t 60 sample.mp3
   npm run audio transcribe file -i sample.mp3 -o sample.txt --format text
   ```

## API Limits

### Current Limits (as of 2024)

| Limit | Value | Notes |
|-------|-------|-------|
| **File Size** | 25 MB max | Per request |
| **Rate Limit** | 50 requests/min | Free tier |
| **Rate Limit** | Higher | Paid tier (check plan) |
| **Audio Length** | No official limit | Constrained by file size |
| **Concurrent Requests** | 5-10 | Depends on plan |

### Rate Limit Handling

```bash
# Sequential processing (respects rate limits)
for file in *.mp3; do
  npm run audio transcribe file -i "$file" -o "${file%.mp3}.txt" --format text
  sleep 1  # 1-second delay between requests
done
```

## Additional Resources

- **OpenAI Whisper API Docs**: https://platform.openai.com/docs/guides/speech-to-text
- **Whisper GitHub**: https://github.com/openai/whisper
- **Language Support**: https://github.com/openai/whisper#available-models-and-languages
- **Pricing**: https://openai.com/pricing

---
