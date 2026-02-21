# Multi-File and Streaming Support Update

**Date:** February 10, 2026  
**Feature:** Added comprehensive multi-file and streaming capabilities to ailey-tools-video

---

## What Was Added

### 1. Multiple Input/Output Files

The video processor now supports processing multiple files in a single operation:

- **Arrays of files**: Process multiple videos simultaneously
- **Glob patterns**: Use wildcards to match files (*.mp4, **/*.mov)
- **Batch operations**: 1:1 mapping or many-to-one concatenation

### 2. Streaming Support

#### Input Streams:
- **stdin** (`pipe:0`) - Read from standard input
- **HTTP/HTTPS URLs** - Download and process web videos
- **RTSP** - IP cameras and network video streams
- **HLS (m3u8)** - HTTP Live Streaming playlists

#### Output Streams:
- **stdout** (`pipe:1`) - Write to standard output
- **RTMP** - Live streaming (Twitch, YouTube, Facebook Live)
- **RTP/UDP** - Real-time protocols
- **HLS** - Generate adaptive streaming playlists

---

## Updated Files

### Core Implementation

**[scripts/video-processor.ts](./scripts/video-processor.ts)**
- Added `InputSource` and `OutputTarget` types supporting strings, arrays, and streams
- Added `StreamOptions` interface for stream-specific configuration
- Added `resolveInputs()` method to handle glob patterns and URL detection
- Added `isStreamInput()` and `isStreamOutput()` helper methods
- Updated `convert()` to support multiple inputs/outputs with batch processing
- Added `convertSingle()` private method for individual conversions
- Added streaming format detection and configuration

### CLI Updates

**[scripts/convert.ts](./scripts/convert.ts)**
- Changed `-i, --input` to accept multiple files: `<files...>`
- Changed `-o, --output` to accept multiple files: `<files...>`
- Added `--format` option for stream output format
- Added `--input-format` option for stream input format
- Added helpful examples in error messages
- Updated logic to handle arrays of inputs/outputs

### Dependencies

**[package.json](./package.json)**
- Added `glob: ^11.0.0` for pattern matching

### Documentation

**[STREAMING.md](./STREAMING.md)** - NEW FILE
- Complete guide to streaming and multi-file features
- Examples for all stream types (stdin, URLs, RTSP, RTMP, HLS)
- Batch processing patterns
- Multi-camera recording examples
- Live streaming setup guides
- Performance optimization tips
- Troubleshooting section

**[SKILL.md](./SKILL.md)** - UPDATED
- Added streaming support to feature list
- Added glob pattern examples to Quick Start
- Reference to STREAMING.md for advanced usage

**[README.md](./README.md)** - UPDATED
- Added multi-file and streaming to feature highlights
- Updated examples with glob patterns
- Added streaming examples (URL, RTSP, RTMP)
- Reference to STREAMING.md

---

## Usage Examples

### Multiple Files

```bash
# Batch convert (1:1 mapping)
npm run video convert \
  -i video1.mp4 video2.mp4 video3.mp4 \
  -o out1.webm out2.webm out3.webm

# Glob patterns
npm run video convert -i "videos/*.mp4" -o "converted/"

# Concatenate multiple inputs
npm run video convert -i part1.mp4 part2.mp4 part3.mp4 -o complete.mp4
```

### Streaming Input

```bash
# From stdin
cat video.mp4 | npm run video convert -i pipe:0 -o output.webm

# From URL
npm run video convert -i https://example.com/video.mp4 -o local.mp4

# From IP camera (RTSP)
npm run video convert \
  -i rtsp://admin:pass@192.168.1.100/stream \
  -o recording.mp4 \
  --input-format rtsp

# From HLS stream
npm run video convert \
  -i https://example.com/playlist.m3u8 \
  -o video.mp4 \
  --input-format hls
```

### Streaming Output

```bash
# To stdout
npm run video convert -i input.mp4 -o pipe:1 --format mpegts > output.ts

# Live stream to Twitch
npm run video convert \
  -i input.mp4 \
  -o rtmp://live.twitch.tv/app/YOUR_STREAM_KEY \
  --format flv

# Live stream to YouTube
npm run video convert \
  -i input.mp4 \
  -o rtmp://a.rtmp.youtube.com/live2/YOUR_STREAM_KEY \
  --format flv

# Generate HLS playlist
npm run video convert \
  -i input.mp4 \
  -o stream/output.m3u8 \
  --format hls
```

### TypeScript API

```typescript
import { VideoProcessor } from './video-processor';

const processor = new VideoProcessor();

// Multiple files
await processor.convert(
  ['video1.mp4', 'video2.mp4', 'video3.mp4'],
  ['out1.webm', 'out2.webm', 'out3.webm'],
  { quality: 'high' }
);

// Glob pattern
await processor.convert(
  'videos/**/*.mp4',
  'converted/',
  { videoCodec: 'libx265' }
);

// From URL
await processor.convert(
  'https://example.com/video.mp4',
  'local.mp4',
  {}
);

// RTSP camera
await processor.convert(
  'rtsp://camera.local/stream',
  'recording.mp4',
  { inputFormat: 'rtsp' }
);

// Live streaming
await processor.convert(
  'input.mp4',
  'rtmp://live.twitch.tv/app/STREAM_KEY',
  { format: 'flv', videoCodec: 'libx264', audioCodec: 'aac' }
);
```

---

## Advanced Use Cases

### Multi-Camera Recording

```typescript
const cameras = [
  'rtsp://camera1.local/stream',
  'rtsp://camera2.local/stream',
  'rtsp://camera3.local/stream',
  'rtsp://camera4.local/stream'
];

await processor.convert(
  cameras,
  cameras.map((_, i) => `camera${i + 1}.mp4`),
  { inputFormat: 'rtsp', quality: 'medium' }
);
```

### Multi-Platform Live Streaming

```typescript
// Stream to multiple platforms simultaneously
await processor.convert(
  'input.mp4',
  [
    'rtmp://live.twitch.tv/app/TWITCH_KEY',
    'rtmp://a.rtmp.youtube.com/live2/YOUTUBE_KEY',
    'rtmp://live-api-s.facebook.com:80/rtmp/FACEBOOK_KEY'
  ],
  { format: 'flv', videoCodec: 'libx264', audioCodec: 'aac' }
);
```

### Batch Web Video Processing

```typescript
const urls = [
  'https://cdn.example.com/video1.mp4',
  'https://cdn.example.com/video2.mp4',
  'https://cdn.example.com/video3.mp4'
];

await processor.convert(
  urls,
  'downloads/',
  { videoCodec: 'libx265', quality: 'high' }
);
```

---

## Technical Details

### Type Definitions

```typescript
export type InputSource = string | string[] | 'pipe:0' | NodeJS.ReadableStream;
export type OutputTarget = string | string[] | 'pipe:1' | NodeJS.WritableStream;

export interface StreamOptions {
  format?: string;          // Output format (mp4, flv, hls, mpegts)
  inputFormat?: string;     // Input format (rtsp, hls, mpegts)
  protocol?: 'rtsp' | 'rtmp' | 'http' | 'https' | 'hls' | 'file';
  bufferSize?: number;      // Stream buffer size
}
```

### Input Resolution Logic

1. **Arrays**: Recursively resolve each item
2. **Streams**: Detect `pipe:0` or stream identifiers
3. **URLs**: Detect http://, https://, rtsp://, rtmp://
4. **Glob patterns**: Detect wildcards (*, ?, []) and expand
5. **Files**: Verify existence and return path

### Conversion Modes

1. **Multiple → Multiple** (equal counts): 1:1 batch conversion
2. **Single → Multiple**: Convert same input to different outputs
3. **Multiple → Single**: Concatenate inputs to single output

---

## Performance Considerations

### Parallel Processing

```typescript
// Process multiple files in parallel
const inputs = ['video1.mp4', 'video2.mp4', 'video3.mp4'];
const outputs = ['out1.webm', 'out2.webm', 'out3.webm'];

await Promise.all(
  inputs.map((input, i) =>
    processor.convert(input, outputs[i], { quality: 'high' })
  )
);
```

### Streaming Best Practices

1. **RTMP Streaming**: Use FLV format, H.264 codec, AAC audio
2. **Camera Recording**: Set appropriate bitrate for storage
3. **Live Streaming**: Use constant bitrate for stability
4. **HLS Generation**: Set segment duration appropriately

---

## Testing

```bash
# Test basic functionality
npm run video test

# Test single file conversion
npm run video convert -i test.mp4 -o output.webm

# Test glob patterns
npm run video convert -i "test/*.mp4" -o "output/"

# Test multiple files
npm run video convert -i test1.mp4 test2.mp4 -o out1.webm out2.webm

# Test URL download
npm run video convert -i https://example.com/sample.mp4 -o local.mp4

# Test stdin (requires piping)
cat test.mp4 | npm run video convert -i pipe:0 -o output.webm
```

---

## Troubleshooting

### "No files matched pattern"
- Verify glob pattern syntax
- Check file paths are correct
- Use absolute paths if needed

### "Stream input failed"
- Verify URL/stream is accessible
- Check `--input-format` matches stream type
- Test network connectivity

### "RTMP connection refused"
- Verify RTMP server URL and stream key
- Check firewall settings
- Ensure FLV format is used

### "Input count must match output count"
- When using arrays, ensure equal lengths
- Or use single output for concatenation

---

## Next Steps

1. **Install dependencies**: `npm install` (adds glob package)
2. **Test basic multi-file**: Try glob patterns with local files
3. **Test streaming**: Try URL download or RTSP camera
4. **Explore advanced features**: See [STREAMING.md](./STREAMING.md)

---

**Status**: ✅ Implementation Complete  
**Compatibility**: Backward compatible (existing single-file usage unchanged)  
**Documentation**: Complete (STREAMING.md, SKILL.md, README.md)

