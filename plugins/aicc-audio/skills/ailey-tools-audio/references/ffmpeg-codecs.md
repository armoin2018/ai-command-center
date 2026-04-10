# FFmpeg Audio Codecs Reference

Quick reference for audio codecs and formats supported by ailey-tools-audio.

## Supported Formats

| Format | Codec | Extension | Compression | Quality | Use Case |
|--------|-------|-----------|-------------|---------|----------|
| **MP3** | libmp3lame | .mp3 | Lossy | Good | General purpose, podcasts, music |
| **MP4/M4A** | aac | .m4a | Lossy | Good | Apple devices, modern compression |
| **WAV** | pcm_s16le | .wav | None | Perfect | Editing, archival, CD quality |
| **AIFF** | pcm_s16be | .aiff | None | Perfect | Apple uncompressed |
| **BWF** | pcm_s24le | .wav | None | Perfect | Broadcast, professional audio |
| **FLAC** | flac | .flac | Lossless | Perfect | Archival, audiophile |
| **ALAC** | alac | .m4a | Lossless | Perfect | Apple Lossless |
| **WavPack** | wavpack | .wv | Hybrid | Perfect | Hybrid lossy/lossless |
| **AAC** | aac | .aac | Lossy | Good | Modern compression |
| **OGG** | libvorbis | .ogg | Lossy | Good | Open source, streaming |

## Codec Details

### MP3 (MPEG Audio Layer III)

**Codec:** `libmp3lame`  
**Compression:** Lossy  
**Typical Bitrates:** 128k, 192k, 256k, 320k

**Pros:**
- Universal compatibility
- Small file sizes
- Good quality at high bitrates

**Cons:**
- Lossy compression
- Outdated compared to modern codecs

**Best For:**
- Podcasts
- General music distribution
- Web streaming

**Example:**
```bash
npm run audio convert file -i input.wav -o output.mp3 -f mp3 --bitrate 320k
```

### AAC (Advanced Audio Coding)

**Codec:** `aac`  
**Compression:** Lossy  
**Typical Bitrates:** 128k, 192k, 256k

**Pros:**
- Better quality than MP3 at same bitrate
- Modern compression
- Apple ecosystem support

**Cons:**
- Licensing restrictions
- Less universal than MP3

**Best For:**
- Apple devices
- Modern streaming
- High-quality compression

**Example:**
```bash
npm run audio convert file -i input.wav -o output.m4a -f mp4 --bitrate 256k
```

### WAV (Waveform Audio File Format)

**Codec:** `pcm_s16le` (16-bit PCM)  
**Compression:** None (uncompressed)  
**Sample Rates:** 44100 Hz (CD), 48000 Hz (professional)

**Pros:**
- Perfect quality
- Universal compatibility
- Easy to edit

**Cons:**
- Very large file sizes
- No metadata support

**Best For:**
- Audio editing
- Mastering
- Archival (short-term)

**Example:**
```bash
npm run audio convert file -i input.mp3 -o output.wav -f wav --sample-rate 48000
```

### FLAC (Free Lossless Audio Codec)

**Codec:** `flac`  
**Compression:** Lossless (typically 50-70% of original)

**Pros:**
- Perfect quality
- Smaller than WAV
- Free and open source

**Cons:**
- Limited hardware support
- Larger than lossy formats

**Best For:**
- Music archival
- Audiophile collections
- Long-term storage

**Example:**
```bash
npm run audio convert file -i input.wav -o output.flac -f flac
```

### ALAC (Apple Lossless Audio Codec)

**Codec:** `alac`  
**Compression:** Lossless (typically 50-70% of original)

**Pros:**
- Perfect quality
- Apple ecosystem support
- Smaller than WAV

**Cons:**
- Proprietary format
- Limited non-Apple support

**Best For:**
- Apple Music library
- iTunes
- iOS/macOS devices

**Example:**
```bash
npm run audio convert file -i input.wav -o output.m4a -f alac
```

### OGG Vorbis

**Codec:** `libvorbis`  
**Compression:** Lossy  
**Typical Bitrates:** 128k, 192k, 256k

**Pros:**
- Free and open source
- Better quality than MP3 at same bitrate
- Good for streaming

**Cons:**
- Limited hardware support
- Less common than MP3

**Best For:**
- Open source projects
- Game audio
- Streaming (open source alternative to MP3)

**Example:**
```bash
npm run audio convert file -i input.wav -o output.ogg -f ogg --bitrate 192k
```

## Quality Guidelines

### Bitrate Recommendations

| Use Case | Format | Bitrate | File Size (per minute) |
|----------|--------|---------|------------------------|
| Voice, low quality | MP3 | 64k-96k | ~0.5-0.7 MB |
| Podcasts, audiobooks | MP3/AAC | 128k-192k | ~1-1.5 MB |
| Music, good quality | MP3/AAC | 192k-256k | ~1.5-2 MB |
| Music, high quality | MP3/AAC | 256k-320k | ~2-2.5 MB |
| Archival, lossless | FLAC/ALAC | N/A | ~5-7 MB |
| Editing, uncompressed | WAV | N/A | ~10 MB |

### Sample Rate Selection

| Sample Rate | Quality | Use Case |
|-------------|---------|----------|
| 8000 Hz | Phone quality | Telephony |
| 16000 Hz | Narrowband | Voice calls |
| 22050 Hz | Low quality | Old games |
| 44100 Hz | CD quality | Standard music |
| 48000 Hz | Professional | Film, video, professional audio |
| 96000 Hz | High-res | Audiophile, mastering |

### Channel Configuration

| Channels | Description | Use Case |
|----------|-------------|----------|
| 1 | Mono | Voice, podcasts, narration |
| 2 | Stereo | Music, most audio content |
| 5.1 | Surround | Home theater, movies |
| 7.1 | Surround | Advanced home theater |

## Format Comparison

### File Size Comparison (1 minute of CD-quality audio)

| Format | Typical Size | Compression Ratio |
|--------|--------------|-------------------|
| WAV (uncompressed) | ~10 MB | 1:1 (baseline) |
| FLAC (lossless) | ~5-7 MB | ~2:1 |
| ALAC (lossless) | ~5-7 MB | ~2:1 |
| MP3 320k | ~2.5 MB | ~4:1 |
| MP3 192k | ~1.5 MB | ~7:1 |
| AAC 256k | ~2 MB | ~5:1 |
| OGG 192k | ~1.5 MB | ~7:1 |

### Quality vs Size Trade-off

**For Maximum Quality:**
1. WAV (uncompressed, editing)
2. FLAC/ALAC (lossless, archival)
3. MP3/AAC 320k (lossy, very high quality)

**For Balance:**
1. MP3/AAC 192k-256k (good quality, reasonable size)
2. OGG 192k (open source alternative)

**For Minimum Size:**
1. MP3/AAC 96k-128k (acceptable for voice/podcasts)
2. MP3 64k (low quality, very small)

## Conversion Workflows

### Archival Workflow

```bash
# Original → Lossless archival
npm run audio convert file -i original.wav -o archive.flac -f flac

# Archival → Distribution
npm run audio convert file -i archive.flac -o release.mp3 -f mp3 --bitrate 320k
```

### Podcast Workflow

```bash
# Recording (WAV) → Editing (WAV) → Distribution (MP3)
npm run audio convert file -i recording.wav -o podcast.mp3 -f mp3 --bitrate 128k
```

### Music Workflow

```bash
# Master (WAV) → Lossless (FLAC) → Streaming (MP3)
npm run audio convert file -i master.wav -o lossless.flac -f flac
npm run audio convert file -i lossless.flac -o streaming.mp3 -f mp3 --bitrate 320k
```

## Advanced Codec Options

### Speed Adjustment

Adjust playback speed without changing pitch:

```bash
npm run audio convert file -i input.mp3 -o fast.mp3 -f mp3 --speed 1.5
```

### Compression

Apply dynamic range compression:

```bash
npm run audio convert file -i input.wav -o compressed.mp3 -f mp3 --compression -20
```

### Resampling

Change sample rate:

```bash
npm run audio convert file -i 48k.wav -o 44.1k.wav -f wav --sample-rate 44100
```

### Channel Conversion

Stereo to mono:

```bash
npm run audio convert file -i stereo.mp3 -o mono.mp3 -f mp3 --channels 1
```

## FFmpeg Codec Names

| Format | FFmpeg Codec | Notes |
|--------|--------------|-------|
| MP3 | libmp3lame | LAME encoder, high quality |
| AAC | aac | Native FFmpeg AAC encoder |
| WAV | pcm_s16le | 16-bit PCM, little-endian |
| AIFF | pcm_s16be | 16-bit PCM, big-endian |
| BWF | pcm_s24le | 24-bit PCM, broadcast wave |
| FLAC | flac | Free Lossless Audio Codec |
| ALAC | alac | Apple Lossless |
| WavPack | wavpack | Hybrid lossless/lossy |
| OGG | libvorbis | Vorbis encoder for OGG |

## Additional Resources

- **FFmpeg Documentation**: https://ffmpeg.org/documentation.html
- **Audio Codec Comparison**: https://en.wikipedia.org/wiki/Comparison_of_audio_coding_formats
- **LAME MP3 Encoder**: https://lame.sourceforge.io/
- **FLAC**: https://xiph.org/flac/

---
