# ailey-tools-video

Comprehensive video processing toolkit for the AI-ley ecosystem with **multi-file** and **streaming** support.

## Quick Start

```bash
# Install dependencies
cd .github/skills/ailey-tools-video
npm install

# Test installation
npm run video test

# Convert video format (single file)
npm run video convert -i input.mp4 -o output.webm

# Convert multiple files
npm run video convert -i video1.mp4 video2.mp4 -o out1.webm out2.webm

# Batch convert with glob patterns
npm run video convert -i "videos/*.mp4" -o "converted/"

# Stream from URL
npm run video convert -i https://example.com/video.mp4 -o local.mp4

# Record from IP camera (RTSP)
npm run video convert -i rtsp://camera.local/stream -o recording.mp4 --input-format rtsp

# Live stream to RTMP (Twitch, YouTube)
npm run video convert -i input.mp4 -o rtmp://live.twitch.tv/app/KEY --format flv

# Change playback speed
npm run video speed -i video.mp4 -o fast.mp4 --rate 1.5

# Add subtitles
npm run video caption -i video.mp4 -s subtitles.srt -o captioned.mp4

# Crop video
npm run video crop -i input.mp4 -o cropped.mp4 --width 1280 --height 720 --x 0 --y 0

# Split video
npm run video split -i long.mp4 -o chunks --times 10,30,60

# Join videos
npm run video join -i "video1.mp4,video2.mp4,video3.mp4" -o merged.mp4
```

## Features

- **Format Conversion**: Convert between MP4, WebM, AVI, MOV, MKV, etc.
- **Multiple Inputs/Outputs**: Arrays of files, glob patterns (*.mp4, **/*.mov)
- **Streaming**: HTTP/HTTPS URLs, RTSP (IP cameras), RTMP (live streaming), HLS, stdin/stdout
- **Speed Control**: Speed up or slow down video playback
- **Captioning**: Add, translate, and burn subtitles
- **Resize & Crop**: Adjust dimensions and crop regions
- **Audio Operations**: Mux, demux, adjust volume
- **Splitting & Joining**: Split at timestamps, concatenate videos
- **Filters**: Brightness, contrast, blur, sharpen, stabilization
- **Effects**: Watermarks, transitions, fade in/out
- **Extraction**: Frames, thumbnails, metadata

## Documentation

- **[SKILL.md](./SKILL.md)** - Complete API and feature documentation
- **[STREAMING.md](./STREAMING.md)** - Advanced streaming, multi-file processing, glob patterns

## Examples

**Batch Processing:**
```bash
# Convert all MP4 files in a directory
npm run video convert -i "videos/**/*.mp4" -o "output/"
```

**Streaming from URL:**
```bash
# Download and convert
npm run video convert -i https://cdn.example.com/video.mp4 -o local.webm
```

**Multi-camera recording:**
```bash
# Record multiple RTSP cameras
npm run video convert \
  -i rtsp://camera1.local/stream rtsp://camera2.local/stream \
  -o cam1.mp4 cam2.mp4 \
  --input-format rtsp
```

See [SKILL.md](./SKILL.md) for complete documentation.
