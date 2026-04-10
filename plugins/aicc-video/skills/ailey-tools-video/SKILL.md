---
id: ailey-tools-video
name: ailey-tools-video
description: Comprehensive video processing toolkit with format conversion, speed adjustment, captioning, cropping, resizing, audio muxing/demuxing, splitting, joining, filters, effects, metadata extraction, multi-file batch processing (arrays, glob patterns), and streaming support (HTTP/HTTPS, RTSP, RTMP, HLS, stdin/stdout). Use when editing videos, converting formats, adding subtitles, adjusting playback speed, extracting frames, batch processing multiple files, downloading web videos, recording IP cameras, or live streaming to platforms.
keywords: [video, ffmpeg, conversion, editing, subtitles, captions, crop, resize, split, join, mux, demux, speed, filters, effects, multimedia, batch, streaming, rtsp, rtmp, hls, glob, multi-file]
tools: [ffmpeg, fluent-ffmpeg, video-processing, commander, dotenv, glob]
---

# AI-ley Video Processing Toolkit

Comprehensive video processing capabilities powered by FFmpeg with an intuitive TypeScript API and CLI.

## Overview

The ailey-tools-video skill provides professional-grade video processing:

- **Format Conversion**: MP4, WebM, AVI, MOV, MKV, FLV, OGG, 3GP
- **Multiple Inputs/Outputs**: Process arrays of files, glob patterns
- **Streaming Support**: HTTP/HTTPS URLs, RTSP (IP cameras), RTMP (live streaming), HLS
- **Playback Speed**: Speed up (0.5x-4x) or slow down with audio pitch correction
- **Captioning & Translation**: Add, translate, and burn subtitles (SRT, VTT, ASS)
- **Resize & Crop**: Scale dimensions, crop regions, aspect ratio adjustment
- **Audio Operations**: Mux/demux audio, volume adjustment, audio replacement
- **Splitting & Joining**: Split at timestamps, concatenate multiple videos
- **Filters**: Brightness, contrast, saturation, blur, sharpen, stabilization
- **Effects**: Watermarks, fade in/out, transitions, picture-in-picture
- **Extraction**: Frames as images, thumbnails, video metadata
- **Advanced**: Rotate, flip, deinterlace, codec conversion, bitrate control

## When to Use

- **Content Creation**: Edit videos for social media, YouTube, presentations
- **Format Compatibility**: Convert videos for different platforms/devices
- **Accessibility**: Add captions, subtitles, audio descriptions
- **Localization**: Translate subtitles to multiple languages
- **Optimization**: Reduce file size, adjust quality, change codecs
- **Batch Processing**: Process multiple videos with consistent settings
- **Extraction**: Get frames for thumbnails, analysis, training data
- **Quality Enhancement**: Stabilize, denoise, adjust colors

## Installation

```bash
cd .github/skills/ailey-tools-video
npm install
```

### Prerequisites

FFmpeg is automatically installed via npm packages. For manual installation:

| Platform | Install Command |
|----------|----------------|
| **macOS** | `brew install ffmpeg` |
| **Linux** | `sudo apt install ffmpeg` (Ubuntu/Debian) or `sudo dnf install ffmpeg` (Fedora) |
| **Windows** | `winget install Gyan.FFmpeg` or `choco install ffmpeg` |

## Quick Start

```bash
# Test installation
npm run video test

# Convert video format
npm run video convert -i input.mp4 -o output.webm

# Multiple files
npm run video convert -i video1.mp4 video2.mp4 -o out1.webm out2.webm

# Glob patterns
npm run video convert -i "videos/*.mp4" -o "converted/"

# Stream from URL
npm run video convert -i https://example.com/video.mp4 -o local.mp4

# Stream from IP camera (RTSP)
npm run video convert -i rtsp://camera.local/stream -o recording.mp4 --input-format rtsp

# Speed up video (1.5x)
npm run video speed -i video.mp4 -o fast.mp4 --rate 1.5

# Add subtitles
npm run video caption -i video.mp4 -s subtitles.srt -o captioned.mp4

# Crop video
npm run video crop -i input.mp4 -o cropped.mp4 --width 1280 --height 720

# Extract audio
npm run video extract-audio -i video.mp4 -o audio.mp3

# Split video at timestamps
npm run video split -i long.mp4 -o chunks --times 10,30,60,120

# Join multiple videos
npm run video join -i "video1.mp4,video2.mp4,video3.mp4" -o merged.mp4
```

**📖 See [STREAMING.md](./STREAMING.md) for advanced streaming, multi-file, and glob pattern examples.**

---

## Workflow 1: Format Conversion & Optimization

Convert videos between formats and optimize for different platforms.

### Convert Video Format

```bash
# MP4 to WebM
npm run video convert -i input.mp4 -o output.webm

# AVI to MP4 (H.264)
npm run video convert -i input.avi -o output.mp4 --codec h264

# MOV to MP4 with quality
npm run video convert -i input.mov -o output.mp4 --quality high

# Convert with specific codec
npm run video convert -i input.mp4 -o output.mkv \
  --video-codec hevc \
  --audio-codec aac
```

### Optimize for Platforms

```bash
# YouTube (1080p, H.264)
npm run video optimize -i source.mp4 -o youtube.mp4 \
  --preset youtube \
  --resolution 1920x1080

# Instagram (Square, 1:1)
npm run video optimize -i source.mp4 -o instagram.mp4 \
  --preset instagram \
  --aspect 1:1

# Twitter (720p, optimized)
npm run video optimize -i source.mp4 -o twitter.mp4 \
  --preset twitter

# Web (compressed)
npm run video optimize -i source.mp4 -o web.mp4 \
  --preset web \
  --bitrate 2M
```

### Reduce File Size

```bash
# Compress video (reduce quality)
npm run video compress -i large.mp4 -o small.mp4 --quality medium

# Reduce resolution
npm run video resize -i 4k.mp4 -o 1080p.mp4 --width 1920 --height 1080

# Lower bitrate
npm run video convert -i input.mp4 -o output.mp4 --bitrate 1M

# Two-pass encoding for better compression
npm run video convert -i input.mp4 -o output.mp4 --two-pass --bitrate 1.5M
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Convert format
await processor.convert('input.mp4', 'output.webm', {
  videoCodec: 'vp9',
  audioCodec: 'opus',
  quality: 'high'
});

// Compress video
await processor.compress('large.mp4', 'small.mp4', {
  targetSize: '50MB',
  quality: 'medium'
});
```

---

## Workflow 2: Speed Control & Playback Rate

Adjust video playback speed while maintaining audio quality.

### Speed Up Video

```bash
# 1.5x speed (faster)
npm run video speed -i video.mp4 -o fast.mp4 --rate 1.5

# 2x speed (double speed)
npm run video speed -i video.mp4 -o double.mp4 --rate 2.0

# 3x speed (very fast)
npm run video speed -i video.mp4 -o triple.mp4 --rate 3.0

# With audio pitch correction
npm run video speed -i video.mp4 -o fast.mp4 --rate 1.5 --preserve-pitch
```

### Slow Down Video

```bash
# 0.5x speed (half speed)
npm run video speed -i video.mp4 -o slow.mp4 --rate 0.5

# 0.75x speed (slightly slower)
npm run video speed -i video.mp4 -o slower.mp4 --rate 0.75

# Slow motion with smoothing
npm run video speed -i video.mp4 -o slowmo.mp4 --rate 0.25 --interpolate
```

### Speed Ranges

- **0.25x - 0.5x**: Slow motion (learning, analysis)
- **0.5x - 0.8x**: Slower (comprehension, accessibility)
- **1.0x**: Normal speed
- **1.1x - 1.5x**: Faster (productivity, time-saving)
- **1.5x - 3.0x**: Very fast (skimming, previews)
- **3.0x - 4.0x**: Ultra fast (time-lapse effect)

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Speed up 1.5x
await processor.adjustSpeed('video.mp4', 'fast.mp4', {
  rate: 1.5,
  preservePitch: true
});

// Slow motion
await processor.adjustSpeed('video.mp4', 'slow.mp4', {
  rate: 0.5,
  interpolate: true  // Smoother slow motion
});
```

---

## Workflow 3: Subtitles & Captioning

Add, translate, and burn subtitles into videos.

### Add Subtitles

```bash
# Add SRT subtitles
npm run video caption -i video.mp4 -s subtitles.srt -o captioned.mp4

# Add VTT subtitles
npm run video caption -i video.mp4 -s subtitles.vtt -o captioned.mp4

# Burn subtitles (permanently embedded)
npm run video caption -i video.mp4 -s subtitles.srt -o burned.mp4 --burn

# Add with custom style
npm run video caption -i video.mp4 -s subtitles.srt -o styled.mp4 \
  --font Arial \
  --font-size 24 \
  --color white \
  --background black
```

### Generate Subtitles (Auto-captioning)

```bash
# Generate from audio (requires Whisper/Speech-to-Text)
npm run video generate-captions -i video.mp4 -o subtitles.srt

# Generate with language
npm run video generate-captions -i video.mp4 -o subtitles.srt --language en-US

# Generate and burn in one step
npm run video generate-captions -i video.mp4 -o captioned.mp4 --burn
```

### Translate Subtitles

```bash
# Translate SRT file
npm run video translate-srt -i english.srt -o spanish.srt --to es

# Translate and add to video
npm run video caption -i video.mp4 -s english.srt -o spanish.mp4 \
  --translate es --burn
```

**Subtitle File Formats:**

| Format | Extension | Description |
|--------|-----------|-------------|
| SubRip | .srt | Most common, simple text format |
| WebVTT | .vtt | Web standard, supports styling |
| ASS/SSA | .ass | Advanced styling, anime subtitles |
| SCC | .scc | Closed captions (broadcast) |

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Add subtitles
await processor.addSubtitles('video.mp4', 'captioned.mp4', {
  subtitleFile: 'subtitles.srt',
  burn: true,  // Permanently embed
  style: {
    fontName: 'Arial',
    fontSize: 24,
    primaryColor: '#FFFFFF',
    backgroundColor: '#000000'
  }
});

// Generate captions from audio
await processor.generateCaptions('video.mp4', 'subtitles.srt', {
  language: 'en-US',
  model: 'whisper'
});
```

---

## Workflow 4: Resize, Crop & Transform

Adjust video dimensions and orientation.

### Resize Video

```bash
# Resize to specific dimensions
npm run video resize -i input.mp4 -o output.mp4 --width 1920 --height 1080

# Resize maintaining aspect ratio
npm run video resize -i input.mp4 -o output.mp4 --width 1280 --maintain-aspect

# Scale to percentage
npm run video resize -i input.mp4 -o output.mp4 --scale 50%

# Common presets
npm run video resize -i input.mp4 -o 4k.mp4 --preset 4k      # 3840x2160
npm run video resize -i input.mp4 -o 1080p.mp4 --preset 1080p  # 1920x1080
npm run video resize -i input.mp4 -o 720p.mp4 --preset 720p   # 1280x720
npm run video resize -i input.mp4 -o 480p.mp4 --preset 480p   # 854x480
```

### Crop Video

```bash
# Crop to specific region
npm run video crop -i input.mp4 -o cropped.mp4 \
  --width 1280 \
  --height 720 \
  --x 100 \
  --y 50

# Center crop
npm run video crop -i input.mp4 -o cropped.mp4 \
  --width 1280 \
  --height 720 \
  --center

# Crop to aspect ratio
npm run video crop -i input.mp4 -o cropped.mp4 --aspect 16:9
npm run video crop -i input.mp4 -o square.mp4 --aspect 1:1  # Instagram
npm run video crop -i input.mp4 -o vertical.mp4 --aspect 9:16  # TikTok/Stories
```

### Rotate & Flip

```bash
# Rotate 90° clockwise
npm run video rotate -i input.mp4 -o rotated.mp4 --degrees 90

# Rotate 180°
npm run video rotate -i input.mp4 -o rotated.mp4 --degrees 180

# Flip horizontal
npm run video flip -i input.mp4 -o flipped.mp4 --horizontal

# Flip vertical
npm run video flip -i input.mp4 -o flipped.mp4 --vertical
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Resize
await processor.resize('input.mp4', 'output.mp4', {
  width: 1920,
  height: 1080,
  maintainAspect: true
});

// Crop
await processor.crop('input.mp4', 'cropped.mp4', {
  width: 1280,
  height: 720,
  x: 100,
  y: 50
});

// Rotate
await processor.rotate('input.mp4', 'rotated.mp4', { degrees: 90 });
```

---

## Workflow 5: Audio Operations

Mux, demux, and manipulate audio tracks.

### Extract Audio

```bash
# Extract audio as MP3
npm run video extract-audio -i video.mp4 -o audio.mp3

# Extract audio as WAV
npm run video extract-audio -i video.mp4 -o audio.wav

# Extract audio as AAC
npm run video extract-audio -i video.mp4 -o audio.aac

# Extract with quality
npm run video extract-audio -i video.mp4 -o audio.mp3 --bitrate 320k
```

### Remove Audio

```bash
# Remove audio track
npm run video remove-audio -i video.mp4 -o silent.mp4
```

### Replace Audio

```bash
# Replace audio track
npm run video replace-audio -i video.mp4 -a new-audio.mp3 -o output.mp4

# Mix audio tracks
npm run video mix-audio -i video.mp4 -a background.mp3 -o output.mp4 --volume 0.3
```

### Add Audio

```bash
# Add audio track (multi-track)
npm run video add-audio -i video.mp4 -a audio.mp3 -o output.mp4

# Add background music
npm run video add-audio -i video.mp4 -a music.mp3 -o output.mp4 \
  --volume 0.2 \
  --loop
```

### Adjust Audio Volume

```bash
# Increase volume 50%
npm run video adjust-volume -i video.mp4 -o louder.mp4 --volume 1.5

# Decrease volume 50%
npm run video adjust-volume -i video.mp4 -o quieter.mp4 --volume 0.5

# Normalize audio
npm run video normalize-audio -i video.mp4 -o normalized.mp4
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Extract audio
await processor.extractAudio('video.mp4', 'audio.mp3', {
  format: 'mp3',
  bitrate: '320k'
});

// Replace audio
await processor.replaceAudio('video.mp4', 'output.mp4', {
  audioFile: 'new-audio.mp3'
});

// Adjust volume
await processor.adjustVolume('video.mp4', 'output.mp4', {
  volume: 1.5  // 150%
});
```

---

## Workflow 6: Split & Join Videos

Split videos at timestamps or join multiple videos.

### Split Video

```bash
# Split at specific times (array of seconds)
npm run video split -i long.mp4 -o chunks --times 10,30,60,120

# Split into equal segments (duration in seconds)
npm run video split -i long.mp4 -o segments --segment-duration 30

# Split at scene changes
npm run video split -i video.mp4 -o scenes --detect-scenes

# Split with custom naming
npm run video split -i video.mp4 -o parts --times 30,60 --prefix "part_"
```

**Output Structure:**
```
chunks/
  chunk_00.mp4  # 0:00 - 0:10
  chunk_01.mp4  # 0:10 - 0:30
  chunk_02.mp4  # 0:30 - 1:00
  chunk_03.mp4  # 1:00 - 2:00
  chunk_04.mp4  # 2:00 - end
```

### Join Videos

```bash
# Join multiple videos
npm run video join -i "video1.mp4,video2.mp4,video3.mp4" -o merged.mp4

# Join with transitions
npm run video join -i "v1.mp4,v2.mp4,v3.mp4" -o merged.mp4 \
  --transition fade \
  --duration 1.0

# Join from file list
npm run video join --file-list videos.txt -o merged.mp4

# Join and re-encode
npm run video join -i "v1.mp4,v2.mp4" -o merged.mp4 --re-encode
```

**File List Format (videos.txt):**
```
file 'video1.mp4'
file 'video2.mp4'
file 'video3.mp4'
```

### Trim Video

```bash
# Trim from start to end time
npm run video trim -i video.mp4 -o trimmed.mp4 --start 10 --end 60

# Trim from start (duration)
npm run video trim -i video.mp4 -o trimmed.mp4 --start 10 --duration 30

# Trim end only
npm run video trim -i video.mp4 -o trimmed.mp4 --end 120
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Split at timestamps
await processor.split('long.mp4', 'chunks', {
  times: [10, 30, 60, 120],  // seconds
  prefix: 'chunk_'
});

// Join videos
await processor.join(['video1.mp4', 'video2.mp4', 'video3.mp4'], 'merged.mp4', {
  transition: 'fade',
  transitionDuration: 1.0
});

// Trim
await processor.trim('video.mp4', 'trimmed.mp4', {
  start: 10,
  end: 60
});
```

---

## Workflow 7: Filters & Effects

Apply visual filters and effects to enhance videos.

### Visual Filters

```bash
# Adjust brightness
npm run video filter -i video.mp4 -o bright.mp4 --brightness 0.2

# Adjust contrast
npm run video filter -i video.mp4 -o contrast.mp4 --contrast 1.5

# Adjust saturation
npm run video filter -i video.mp4 -o vivid.mp4 --saturation 1.5

# Blur
npm run video filter -i video.mp4 -o blurred.mp4 --blur 5

# Sharpen
npm run video filter -i video.mp4 -o sharp.mp4 --sharpen 2

# Grayscale
npm run video filter -i video.mp4 -o bw.mp4 --grayscale

# Sepia
npm run video filter -i video.mp4 -o sepia.mp4 --sepia
```

### Stabilization

```bash
# Stabilize shaky video
npm run video stabilize -i shaky.mp4 -o stable.mp4

# Stabilize with strength
npm run video stabilize -i shaky.mp4 -o stable.mp4 --strength high

# Two-pass stabilization
npm run video stabilize -i shaky.mp4 -o stable.mp4 --two-pass
```

### Watermark

```bash
# Add image watermark
npm run video watermark -i video.mp4 -o watermarked.mp4 \
  --image logo.png \
  --position bottom-right \
  --opacity 0.5

# Add text watermark
npm run video watermark -i video.mp4 -o watermarked.mp4 \
  --text "© 2026 Company" \
  --position bottom-center \
  --font-size 24
```

### Fade Effects

```bash
# Fade in (3 seconds)
npm run video fade -i video.mp4 -o faded.mp4 --fade-in 3

# Fade out (2 seconds)
npm run video fade -i video.mp4 -o faded.mp4 --fade-out 2

# Both fade in and out
npm run video fade -i video.mp4 -o faded.mp4 --fade-in 3 --fade-out 2
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Apply filters
await processor.applyFilter('video.mp4', 'filtered.mp4', {
  brightness: 0.2,
  contrast: 1.5,
  saturation: 1.3
});

// Stabilize
await processor.stabilize('shaky.mp4', 'stable.mp4', {
  strength: 'high'
});

// Add watermark
await processor.addWatermark('video.mp4', 'watermarked.mp4', {
  image: 'logo.png',
  position: 'bottom-right',
  opacity: 0.5
});
```

---

## Workflow 8: Frame Extraction & Thumbnails

Extract frames and generate thumbnails.

### Extract Frames

```bash
# Extract every frame
npm run video extract-frames -i video.mp4 -o frames --all

# Extract every Nth frame
npm run video extract-frames -i video.mp4 -o frames --every 30

# Extract at specific times
npm run video extract-frames -i video.mp4 -o frames --times 10,30,60

# Extract frames per second
npm run video extract-frames -i video.mp4 -o frames --fps 1

# Extract with format
npm run video extract-frames -i video.mp4 -o frames --format png --quality high
```

**Output Structure:**
```
frames/
  frame_0001.png
  frame_0002.png
  frame_0003.png
  ...
```

### Generate Thumbnails

```bash
# Single thumbnail at 50% point
npm run video thumbnail -i video.mp4 -o thumb.jpg

# Multiple thumbnails
npm run video thumbnail -i video.mp4 -o thumbs --count 10

# Thumbnail at specific time
npm run video thumbnail -i video.mp4 -o thumb.jpg --time 30

# Thumbnail grid (contact sheet)
npm run video thumbnail -i video.mp4 -o grid.jpg --grid 4x4
```

### Create Video from Images

```bash
# Create video from image sequence
npm run video from-images -i "frames/*.png" -o video.mp4 --fps 24

# Create slideshow
npm run video slideshow -i "photos/*.jpg" -o slideshow.mp4 \
  --duration 3 \
  --transition fade
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Extract frames
await processor.extractFrames('video.mp4', 'frames', {
  every: 30,  // Every 30th frame
  format: 'png'
});

// Generate thumbnail
await processor.generateThumbnail('video.mp4', 'thumb.jpg', {
  time: 30,  // 30 seconds in
  width: 1280,
  height: 720
});

// Create video from images
await processor.createFromImages('frames/*.png', 'video.mp4', {
  fps: 24
});
```

---

## Workflow 9: Metadata & Information

Extract and modify video metadata.

### Get Video Info

```bash
# Get video information
npm run video info -i video.mp4

# Get info as JSON
npm run video info -i video.mp4 --json

# Get specific properties
npm run video info -i video.mp4 --properties duration,resolution,codec
```

**Output:**
```json
{
  "duration": 120.5,
  "format": "mp4",
  "size": "50.3 MB",
  "videoCodec": "h264",
  "audioCodec": "aac",
  "resolution": "1920x1080",
  "fps": 30,
  "bitrate": "3500 kbps",
  "audioChannels": 2,
  "audioSampleRate": 48000
}
```

### Modify Metadata

```bash
# Set title
npm run video metadata -i video.mp4 -o output.mp4 --title "My Video"

# Set metadata
npm run video metadata -i video.mp4 -o output.mp4 \
  --title "Video Title" \
  --author "Creator Name" \
  --description "Video description" \
  --date "2026-02-10"
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';

const processor = new VideoProcessor();

// Get video info
const info = await processor.getVideoInfo('video.mp4');
console.log(`Duration: ${info.duration}s`);
console.log(`Resolution: ${info.width}x${info.height}`);

// Modify metadata
await processor.setMetadata('video.mp4', 'output.mp4', {
  title: 'My Video',
  author: 'Creator',
  description: 'Video description'
});
```

---

## Integration with AI-ley Ecosystem

### With ailey-tools-audio

Process video audio separately:

```bash
# 1. Extract audio
npm run video extract-audio -i video.mp4 -o audio.mp3

# 2. Process with ailey-tools-audio
cd ../ailey-tools-audio
npm run audio convert -i audio.mp3 -o processed.mp3 --denoise --normalize

# 3. Replace audio
cd ../ailey-tools-video
npm run video replace-audio -i video.mp4 -a processed.mp3 -o final.mp4
```

### With ailey-media-speechify

Add narration to videos:

```bash
# 1. Generate narration from script
cd ../ailey-media-speechify
npm run speechify convert file -i script.txt -o narration.mp3 --voice george

# 2. Add to video
cd ../ailey-tools-video
npm run video add-audio -i video.mp4 -a narration.mp3 -o narrated.mp4
```

### With ailey-tools-tag-n-rag

Index video content for retrieval:

```typescript
import { VideoProcessor } from './ailey-tools-video/scripts/video-processor';
import { TagNRag } from './ailey-tools-tag-n-rag/scripts/tag-n-rag';

const processor = new VideoProcessor();
const rag = new TagNRag();

// Extract frames
await processor.extractFrames('video.mp4', 'frames', { every: 100 });

// Generate captions
await processor.generateCaptions('video.mp4', 'captions.srt');

// Index for RAG
await rag.indexFiles(['frames/*.png', 'captions.srt'], 'video-content');
```

---

## Advanced Features

### Codec Conversion

```bash
# Change video codec
npm run video convert -i input.mp4 -o output.mp4 --video-codec hevc

# Change audio codec
npm run video convert -i input.mp4 -o output.mp4 --audio-codec opus

# Both codecs
npm run video convert -i input.mp4 -o output.mkv \
  --video-codec vp9 \
  --audio-codec opus
```

**Supported Codecs:**
- Video: h264, h265/hevc, vp8, vp9, av1, mpeg4
- Audio: aac, mp3, opus, vorbis, flac, ac3

### Frame Rate Conversion

```bash
# Change frame rate
npm run video fps -i 30fps.mp4 -o 60fps.mp4 --fps 60

# Convert to 24fps (cinema)
npm run video fps -i video.mp4 -o cinema.mp4 --fps 24

# Interpolate frames (smooth)
npm run video fps -i 30fps.mp4 -o 60fps.mp4 --fps 60 --interpolate
```

### Deinterlace

```bash
# Deinterlace video
npm run video deinterlace -i interlaced.mp4 -o progressive.mp4
```

### Reverse Video

```bash
# Reverse playback
npm run video reverse -i video.mp4 -o reversed.mp4

# Reverse with audio
npm run video reverse -i video.mp4 -o reversed.mp4 --reverse-audio
```

### Loop Video

```bash
# Loop 3 times
npm run video loop -i video.mp4 -o looped.mp4 --times 3

# Loop for specific duration (seconds)
npm run video loop -i video.mp4 -o looped.mp4 --duration 60
```

### Green Screen / Chroma Key

```bash
# Remove green background
npm run video chroma-key -i greenscreen.mp4 -o transparent.mp4 \
  --color green \
  --similarity 0.3

# Replace background
npm run video chroma-key -i greenscreen.mp4 -o composite.mp4 \
  --color green \
  --background background.jpg
```

### Picture-in-Picture

```bash
# Add small video overlay
npm run video pip -i main.mp4 -o pip.mp4 \
  --overlay small.mp4 \
  --position bottom-right \
  --size 25%
```

### Silent Section Removal

```bash
# Detect and remove silent sections
npm run video remove-silence -i video.mp4 -o trimmed.mp4

# With threshold
npm run video remove-silence -i video.mp4 -o trimmed.mp4 \
  --threshold -50dB \
  --min-duration 1.0
```

### Scene Detection

```bash
# Detect scene changes
npm run video detect-scenes -i video.mp4 -o scenes.json

# Split at scenes
npm run video split -i video.mp4 -o scenes --detect-scenes
```

---

## Batch Processing

Process multiple videos with the same settings:

```bash
# Batch convert directory
npm run video batch convert -i "videos/*.mp4" -o converted --format webm

# Batch resize
npm run video batch resize -i "videos/*.mp4" -o resized --width 1280 --height 720

# Batch add watermark
npm run video batch watermark -i "videos/*.mp4" -o watermarked \
  --image logo.png \
  --position bottom-right

# Batch with custom script
npm run video batch --script process.json -i "videos/*.mp4" -o processed
```

**Batch Script (process.json):**
```json
{
  "operations": [
    { "type": "resize", "width": 1920, "height": 1080 },
    { "type": "watermark", "image": "logo.png", "position": "bottom-right" },
    { "type": "compress", "quality": "high" }
  ]
}
```

**TypeScript API:**

```typescript
import { VideoProcessor } from './scripts/video-processor';
import { glob } from 'glob';

const processor = new VideoProcessor();

const videos = await glob('videos/*.mp4');

for (const video of videos) {
  const output = video.replace('videos/', 'processed/');
  
  await processor.resize(video, output, {
    width: 1920,
    height: 1080
  });
  
  console.log(`✅ Processed: ${video}`);
}
```

---

## Troubleshooting

### FFmpeg Not Found

```
❌ FFmpeg not found
```

**Solution:**
- macOS: `brew install ffmpeg`
- Ubuntu: `sudo apt install ffmpeg`
- Or use bundled version (automatically installed via npm)

### Codec Not Supported

```
❌ Codec 'xyz' not supported
```

**Solution:**
```bash
# List available codecs
npm run video codecs

# Use alternative codec
npm run video convert -i input.mp4 -o output.mp4 --video-codec h264
```

### Out of Memory

```
⚠️ Processing very large video files
```

**Solution:**
```bash
# Process in segments
npm run video split -i large.mp4 -o segments --segment-duration 60
# Process each segment
# Join results
npm run video join -i "segments/*.mp4" -o final.mp4
```

### Quality Loss

```
⚠️ Noticeable quality degradation
```

**Solution:**
```bash
# Use higher quality settings
npm run video convert -i input.mp4 -o output.mp4 \
  --quality high \
  --bitrate 5M \
  --two-pass
```

---

## CLI Reference

### Common Options

| Option | Description | Default |
|--------|-------------|---------|
| `-i, --input` | Input video file | Required |
| `-o, --output` | Output file/directory | Required |
| `--quality` | Quality (low, medium, high) | medium |
| `--video-codec` | Video codec | h264 |
| `--audio-codec` | Audio codec | aac |
| `--bitrate` | Video bitrate | auto |
| `--fps` | Frame rate | source |
| `--format` | Output format | auto |
| `--overwrite` | Overwrite existing files | false |

### Commands

- `convert` - Convert video format
- `speed` - Adjust playback speed
- `caption` - Add/burn subtitles
- `resize` - Change dimensions
- `crop` - Crop video region
- `rotate` - Rotate video
- `flip` - Flip horizontally/vertically
- `extract-audio` - Extract audio track
- `replace-audio` - Replace audio
- `split` - Split at timestamps
- `join` - Concatenate videos
- `trim` - Trim video
- `filter` - Apply visual filters
- `stabilize` - Stabilize video
- `watermark` - Add watermark
- `fade` - Fade effects
- `extract-frames` - Extract frames
- `thumbnail` - Generate thumbnails
- `info` - Video information
- `batch` - Batch processing

---

## Performance Tips

1. **Use Hardware Acceleration** (when available):
   ```bash
   npm run video convert -i input.mp4 -o output.mp4 --hwaccel
   ```

2. **Two-Pass Encoding** (better quality/size ratio):
   ```bash
   npm run video convert -i input.mp4 -o output.mp4 --two-pass
   ```

3. **Parallel Processing**:
   ```bash
   npm run video batch convert -i "*.mp4" -o converted --parallel 4
   ```

4. **Stream Copy** (when no re-encoding needed):
   ```bash
   npm run video trim -i video.mp4 -o trimmed.mp4 --stream-copy
   ```

---

version: 1.1.0
updated: 2026-03-03
reviewed: 2026-03-03
score: 4.8
