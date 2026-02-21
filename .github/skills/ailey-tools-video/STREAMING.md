# Video Streaming Guide

Advanced streaming capabilities for ailey-tools-video including multiple input/output support, glob patterns, and live streams.

---

## Multiple Files Support

### Batch Processing with Arrays

```bash
# Convert multiple files to multiple outputs (1:1 mapping)
npm run video convert \
  -i video1.mp4 video2.mp4 video3.mp4 \
  -o output1.webm output2.webm output3.webm \
  --quality high

# Convert multiple files to same output directory
npm run video convert \
  -i *.mp4 \
  -o converted/ \
  --video-codec libx265
```

### Glob Patterns

```bash
# Process all MP4 files in directory
npm run video convert -i "videos/*.mp4" -o "converted/*.webm"

# Process nested directories
npm run video convert -i "**/*.mov" -o "converted/"

# Multiple glob patterns
npm run video convert \
  -i "videos/**/*.mp4" "footage/**/*.avi" \
  -o "output/"
```

### TypeScript API - Multiple Files

```typescript
import { VideoProcessor } from './video-processor';

const processor = new VideoProcessor();

// Array of inputs to array of outputs
await processor.convert(
  ['video1.mp4', 'video2.mp4', 'video3.mp4'],
  ['output1.webm', 'output2.webm', 'output3.webm'],
  { quality: 'high' }
);

// Glob pattern
await processor.convert(
  'videos/*.mp4',
  'converted/',
  { videoCodec: 'libx265' }
);

// Multiple inputs to single output (concat)
await processor.convert(
  ['part1.mp4', 'part2.mp4', 'part3.mp4'],
  'complete.mp4',
  {}
);
```

---

## Stream Input

### Standard Input (stdin)

**CLI:**
```bash
# From piped input
cat video.mp4 | npm run video convert \
  -i pipe:0 \
  -o output.webm \
  --input-format mp4

# From FFmpeg output
ffmpeg -i input.avi -f mpegts - | \
  npm run video convert \
    -i pipe:0 \
    -o output.mp4 \
    --input-format mpegts
```

**TypeScript:**
```typescript
import { createReadStream } from 'fs';

const stream = createReadStream('video.mp4');
await processor.convert('pipe:0', 'output.webm', {
  inputFormat: 'mp4'
});
```

### HTTP/HTTPS URLs

**CLI:**
```bash
# From web URL
npm run video convert \
  -i "https://example.com/video.mp4" \
  -o local.mp4

# From multiple URLs
npm run video convert \
  -i "https://cdn.example.com/video1.mp4" \
     "https://cdn.example.com/video2.mp4" \
  -o combined.mp4
```

**TypeScript:**
```typescript
await processor.convert(
  'https://example.com/video.mp4',
  'local.mp4',
  { quality: 'high' }
);
```

### RTSP Streams (IP Cameras)

**CLI:**
```bash
# Capture from IP camera
npm run video convert \
  -i "rtsp://admin:password@192.168.1.100:554/stream" \
  -o camera_feed.mp4 \
  --input-format rtsp

# Multiple cameras
npm run video convert \
  -i "rtsp://camera1.local/stream" \
     "rtsp://camera2.local/stream" \
  -o cam1.mp4 cam2.mp4
```

**TypeScript:**
```typescript
await processor.convert(
  'rtsp://admin:password@192.168.1.100:554/stream',
  'camera_feed.mp4',
  {
    inputFormat: 'rtsp',
    videoCodec: 'libx264',
    quality: 'medium'
  }
);
```

### HLS Streams (m3u8)

**CLI:**
```bash
# From HLS stream
npm run video convert \
  -i "https://example.com/playlist.m3u8" \
  -o video.mp4 \
  --input-format hls
```

**TypeScript:**
```typescript
await processor.convert(
  'https://example.com/playlist.m3u8',
  'video.mp4',
  {
    inputFormat: 'hls',
    videoCodec: 'copy'  // Faster if compatible
  }
);
```

---

## Stream Output

### Standard Output (stdout)

**CLI:**
```bash
# To stdout for piping
npm run video convert \
  -i input.mp4 \
  -o pipe:1 \
  --format mpegts > output.ts

# Pipe to another process
npm run video convert \
  -i input.mp4 \
  -o pipe:1 \
  --format flv | \
  ffplay -
```

**TypeScript:**
```typescript
import { createWriteStream } from 'fs';

const stream = createWriteStream('output.mp4');
await processor.convert('input.mp4', 'pipe:1', {
  format: 'mpegts'
});
```

### RTMP Streaming (Live Broadcasting)

**CLI:**
```bash
# Stream to RTMP server (e.g., YouTube, Twitch)
npm run video convert \
  -i input.mp4 \
  -o "rtmp://live.twitch.tv/app/YOUR_STREAM_KEY" \
  --format flv \
  --video-codec libx264 \
  --audio-codec aac

# Stream from camera to RTMP
npm run video convert \
  -i "rtsp://camera.local/stream" \
  -o "rtmp://live.youtube.com/YOUR_STREAM_KEY" \
  --format flv
```

**TypeScript:**
```typescript
// Stream to YouTube Live
await processor.convert(
  'input.mp4',
  'rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY',
  {
    format: 'flv',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    bitrate: '4500k'
  }
);

// Stream to multiple platforms
await processor.convert(
  'input.mp4',
  [
    'rtmp://live.twitch.tv/app/TWITCH_KEY',
    'rtmp://a.rtmp.youtube.com/live2/YOUTUBE_KEY'
  ],
  { format: 'flv' }
);
```

### HLS Output (Adaptive Streaming)

**CLI:**
```bash
# Generate HLS playlist
npm run video convert \
  -i input.mp4 \
  -o output.m3u8 \
  --format hls \
  --video-codec libx264
```

**TypeScript:**
```typescript
await processor.convert(
  'input.mp4',
  'stream/output.m3u8',
  {
    format: 'hls',
    videoCodec: 'libx264',
    quality: 'high'
  }
);
```

---

## Advanced Streaming Patterns

### Multi-Camera Recording

```typescript
// Record multiple IP cameras simultaneously
const cameras = [
  'rtsp://camera1.local/stream',
  'rtsp://camera2.local/stream',
  'rtsp://camera3.local/stream',
  'rtsp://camera4.local/stream'
];

const outputs = cameras.map((_, i) => `camera${i + 1}.mp4`);

await processor.convert(cameras, outputs, {
  inputFormat: 'rtsp',
  videoCodec: 'libx264',
  quality: 'medium'
});
```

### Download and Convert Web Videos

```typescript
// Download multiple videos and convert
const urls = [
  'https://cdn.example.com/video1.mp4',
  'https://cdn.example.com/video2.mp4',
  'https://cdn.example.com/video3.mp4'
];

await processor.convert(
  urls,
  'output/',  // Save to directory
  {
    videoCodec: 'libx265',
    quality: 'high'
  }
);
```

### Transcoding Pipeline

```bash
# Chain conversions
npm run video convert -i input.avi -o temp.mp4 --quality high && \
npm run video convert -i temp.mp4 -o output.webm --video-codec vp9
```

### Live Stream Recording

```typescript
// Record live stream for specific duration
import { setTimeout } from 'timers/promises';

const recordPromise = processor.convert(
  'rtsp://camera.local/stream',
  'recording.mp4',
  {
    inputFormat: 'rtsp',
    videoCodec: 'libx264'
  }
);

// Stop after 1 hour
await setTimeout(3600000);
// Note: You'd need to implement cancellation in VideoProcessor
```

### Multi-Quality Encoding

```typescript
// Generate multiple quality versions
const input = 'source.mp4';
const qualities = [
  { output: '1080p.mp4', bitrate: '5000k', width: 1920, height: 1080 },
  { output: '720p.mp4', bitrate: '2500k', width: 1280, height: 720 },
  { output: '480p.mp4', bitrate: '1000k', width: 854, height: 480 }
];

for (const quality of qualities) {
  await processor.convert(input, quality.output, {
    videoCodec: 'libx264',
    bitrate: quality.bitrate
  });
  
  await processor.resize(quality.output, quality.output, {
    width: quality.width,
    height: quality.height
  });
}
```

---

## Performance Tips

### Batch Processing Optimization

1. **Parallel Processing**: Process multiple files in parallel (use Promise.all)
2. **Hardware Acceleration**: Use hardware codecs (h264_videotoolbox on macOS)
3. **Smart Encoding**: Use `-c:v copy` when re-encoding not needed

```typescript
// Parallel batch processing
const inputs = ['video1.mp4', 'video2.mp4', 'video3.mp4'];
const outputs = ['out1.webm', 'out2.webm', 'out3.webm'];

await Promise.all(
  inputs.map((input, i) =>
    processor.convert(input, outputs[i], { quality: 'high' })
  )
);
```

### Streaming Optimization

1. **Buffer Size**: Adjust buffer for network streams
2. **Codec Selection**: Use appropriate codec for streaming (flv for RTMP)
3. **Bitrate Control**: Set consistent bitrate for live streaming

---

## Troubleshooting

### "No files matched pattern"
- Check glob pattern syntax
- Ensure files exist in specified path
- Use absolute paths if relative paths fail

### "Stream input failed"
- Verify URL/stream is accessible
- Check inputFormat matches stream type
- Ensure network connectivity for remote streams

### "RTMP connection refused"
- Verify RTMP server URL and stream key
- Check firewall settings
- Ensure proper codec settings (flv format required)

### "Multiple input count mismatch"
- When using arrays, input and output counts must match
- Or use single output for concatenation
- Check array lengths before processing

---

## Examples Summary

**Basic Multi-File:**
```bash
npm run video convert -i *.mp4 -o converted/ --quality high
```

**Stream from URL:**
```bash
npm run video convert -i https://example.com/video.mp4 -o local.mp4
```

**Live Stream to RTMP:**
```bash
npm run video convert \
  -i input.mp4 \
  -o rtmp://live.twitch.tv/app/KEY \
  --format flv
```

**IP Camera Recording:**
```bash
npm run video convert \
  -i rtsp://camera.local/stream \
  -o recording.mp4 \
  --input-format rtsp
```

---

version: 1.0.0
created: 2026-02-10
