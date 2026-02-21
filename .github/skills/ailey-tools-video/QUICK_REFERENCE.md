# ailey-tools-video: Multi-File & Streaming Quick Reference

Fast reference for new multi-file and streaming capabilities.

---

## Multi-File Processing

| Pattern | Command | Description |
|---------|---------|-------------|
| **Arrays** | `-i file1.mp4 file2.mp4` | Multiple specific files |
| **Glob** | `-i "*.mp4"` | All MP4 in current dir |
| **Recursive** | `-i "**/*.mp4"` | All MP4 in subdirs |
| **Multiple Globs** | `-i "dir1/*.mp4" "dir2/*.avi"` | Multiple patterns |
| **1:1 Conversion** | `-i a.mp4 b.mp4 -o x.webm y.webm` | Each input → output |
| **Concatenate** | `-i a.mp4 b.mp4 c.mp4 -o merged.mp4` | Many → one |
| **Multi-output** | `-i video.mp4 -o out1.webm out2.mp4` | One → many |

---

## Streaming Input

| Type | Format | Example |
|------|--------|---------|
| **stdin** | `pipe:0` | `cat video.mp4 \| npm run video convert -i pipe:0 -o out.webm` |
| **HTTP** | URL | `npm run video convert -i https://example.com/video.mp4 -o local.mp4` |
| **HTTPS** | URL | `npm run video convert -i https://cdn.example.com/video.mp4 -o local.mp4` |
| **RTSP** | `rtsp://` | `npm run video convert -i rtsp://camera/stream -o rec.mp4 --input-format rtsp` |
| **HLS** | `.m3u8` | `npm run video convert -i https://example.com/playlist.m3u8 -o video.mp4 --input-format hls` |

---

## Streaming Output

| Type | Format | Example |
|------|--------|---------|
| **stdout** | `pipe:1` | `npm run video convert -i input.mp4 -o pipe:1 --format mpegts > out.ts` |
| **RTMP** | `rtmp://` | `npm run video convert -i input.mp4 -o rtmp://live.twitch.tv/app/KEY --format flv` |
| **HLS** | `.m3u8` | `npm run video convert -i input.mp4 -o stream/output.m3u8 --format hls` |

---

## Live Streaming Platforms

| Platform | RTMP URL | Format |
|----------|----------|--------|
| **Twitch** | `rtmp://live.twitch.tv/app/STREAM_KEY` | `--format flv` |
| **YouTube** | `rtmp://a.rtmp.youtube.com/live2/STREAM_KEY` | `--format flv` |
| **Facebook** | `rtmp://live-api-s.facebook.com:80/rtmp/STREAM_KEY` | `--format flv` |

---

## Common Patterns

### Batch Convert Directory
```bash
npm run video convert -i "videos/*.mp4" -o "converted/" --quality high
```

### Download & Convert
```bash
npm run video convert -i https://cdn.example.com/video.mp4 -o local.webm
```

### Record IP Camera
```bash
npm run video convert \
  -i rtsp://admin:password@192.168.1.100/stream \
  -o recording.mp4 \
  --input-format rtsp
```

### Live Stream to Twitch
```bash
npm run video convert \
  -i input.mp4 \
  -o rtmp://live.twitch.tv/app/YOUR_STREAM_KEY \
  --format flv \
  --video-codec libx264 \
  --audio-codec aac
```

### Multi-Camera Recording
```bash
npm run video convert \
  -i rtsp://camera1/stream rtsp://camera2/stream rtsp://camera3/stream \
  -o cam1.mp4 cam2.mp4 cam3.mp4 \
  --input-format rtsp
```

### Stream to Multiple Platforms
```bash
npm run video convert \
  -i input.mp4 \
  -o rtmp://live.twitch.tv/app/TWITCH_KEY \
     rtmp://a.rtmp.youtube.com/live2/YOUTUBE_KEY \
  --format flv
```

---

## TypeScript API

```typescript
import { VideoProcessor } from './video-processor';

const processor = new VideoProcessor();

// Multiple files
await processor.convert(
  ['video1.mp4', 'video2.mp4'],
  ['out1.webm', 'out2.webm'],
  { quality: 'high' }
);

// Glob pattern
await processor.convert('videos/*.mp4', 'converted/', {});

// URL
await processor.convert('https://example.com/video.mp4', 'local.mp4', {});

// RTSP
await processor.convert(
  'rtsp://camera.local/stream',
  'recording.mp4',
  { inputFormat: 'rtsp' }
);

// RTMP Live Stream
await processor.convert(
  'input.mp4',
  'rtmp://live.twitch.tv/app/KEY',
  { format: 'flv', videoCodec: 'libx264', audioCodec: 'aac' }
);
```

---

## Options Reference

| Option | Description | Example |
|--------|-------------|---------|
| `-i, --input <files...>` | Input files/URLs/streams | `-i video1.mp4 video2.mp4` |
| `-o, --output <files...>` | Output files/streams | `-o out1.webm out2.webm` |
| `--input-format <format>` | Input stream format | `--input-format rtsp` |
| `--format <format>` | Output stream format | `--format flv` |
| `--video-codec <codec>` | Video codec | `--video-codec libx264` |
| `--audio-codec <codec>` | Audio codec | `--audio-codec aac` |
| `--quality <preset>` | Quality (low/medium/high) | `--quality high` |
| `--bitrate <bitrate>` | Video bitrate | `--bitrate 4500k` |

---

## Format Reference

### Input Formats
- `rtsp` - RTSP streams (IP cameras)
- `hls` - HLS/m3u8 streams
- `mpegts` - MPEG Transport Stream
- `mp4`, `avi`, `mov`, `mkv` - Standard video files

### Output Formats
- `flv` - Flash Video (required for RTMP)
- `hls` - HTTP Live Streaming
- `mpegts` - MPEG-TS (for stdout)
- `mp4`, `webm`, `avi`, `mov` - Standard video files

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| No files matched | Check glob syntax, use quotes around patterns |
| Stream failed | Verify URL accessible, check `--input-format` |
| RTMP refused | Verify stream key, use `--format flv` |
| Count mismatch | Input/output arrays must have equal length |

---

**Full Documentation:**
- [STREAMING.md](./STREAMING.md) - Complete streaming guide
- [SKILL.md](./SKILL.md) - Full feature documentation
- [README.md](./README.md) - Quick start guide

