/**
 * Audio processing client using FFmpeg
 * Provides audio extraction, conversion, and manipulation
 */

import ffmpeg from 'fluent-ffmpeg';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';

/**
 * Load environment variables from multiple locations
 */
function loadEnv(): void {
  const envPaths = [
    join(homedir(), '.vscode', '.env'),
    '.env',
    '.env.local',
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      config({ path: envPath });
    }
  }
}

loadEnv();

export interface AudioFormat {
  codec: string;
  extension: string;
  bitrate?: string;
}

export const AUDIO_FORMATS: Record<string, AudioFormat> = {
  mp3: { codec: 'libmp3lame', extension: 'mp3', bitrate: '192k' },
  mp4: { codec: 'aac', extension: 'm4a', bitrate: '192k' },
  wav: { codec: 'pcm_s16le', extension: 'wav' },
  aiff: { codec: 'pcm_s16be', extension: 'aiff' },
  bwf: { codec: 'pcm_s24le', extension: 'wav' }, // Broadcast Wave Format
  flac: { codec: 'flac', extension: 'flac' },
  alac: { codec: 'alac', extension: 'm4a' }, // Apple Lossless
  wavpack: { codec: 'wavpack', extension: 'wv' },
  aac: { codec: 'aac', extension: 'aac', bitrate: '192k' },
  ogg: { codec: 'libvorbis', extension: 'ogg', bitrate: '192k' },
};

export interface ConversionOptions {
  format: string;
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
  speed?: number;
  compression?: number;
}

export interface SliceOptions {
  silenceThresholdDb: number;
  minDuration: number;
  maxDuration: number;
  outputDir: string;
}

/**
 * Audio processing client
 */
export class AudioClient {
  /**
   * Convert audio to specified format
   */
  async convert(
    inputPath: string,
    outputPath: string,
    options: ConversionOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const format = AUDIO_FORMATS[options.format];
      if (!format) {
        return reject(new Error(`Unsupported format: ${options.format}`));
      }

      let command = ffmpeg(inputPath)
        .audioCodec(format.codec)
        .toFormat(format.extension);

      // Apply bitrate
      if (options.bitrate || format.bitrate) {
        command = command.audioBitrate(options.bitrate || format.bitrate!);
      }

      // Apply sample rate
      if (options.sampleRate) {
        command = command.audioFrequency(options.sampleRate);
      }

      // Apply channels
      if (options.channels) {
        command = command.audioChannels(options.channels);
      }

      // Apply speed adjustment
      if (options.speed && options.speed !== 1.0) {
        command = command.audioFilters(`atempo=${options.speed}`);
      }

      // Apply compression
      if (options.compression) {
        command = command.audioFilters(`acompressor=threshold=${options.compression}dB`);
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  }

  /**
   * Extract audio from video file
   */
  async extractAudio(
    videoPath: string,
    outputPath: string,
    format: string = 'mp3'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioFormat = AUDIO_FORMATS[format];
      if (!audioFormat) {
        return reject(new Error(`Unsupported format: ${format}`));
      }

      ffmpeg(videoPath)
        .noVideo()
        .audioCodec(audioFormat.codec)
        .audioBitrate(audioFormat.bitrate || '192k')
        .toFormat(audioFormat.extension)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  }

  /**
   * Get audio metadata
   */
  async getMetadata(filePath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(err);
        resolve(metadata);
      });
    });
  }

  /**
   * Slice audio based on silence detection
   */
  async sliceOnSilence(
    inputPath: string,
    options: SliceOptions
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const { silenceThresholdDb, minDuration, maxDuration, outputDir } = options;
      
      // Detect silence periods
      const silenceDetect = `silencedetect=n=${silenceThresholdDb}dB:d=${minDuration}`;
      
      const outputFiles: string[] = [];
      let segmentIndex = 0;

      // First pass: detect silence
      ffmpeg(inputPath)
        .audioFilters(silenceDetect)
        .format('null')
        .on('stderr', (stderrLine) => {
          // Parse silence detection output
          if (stderrLine.includes('silence_start')) {
            // Extract silence timestamps for splitting
          }
        })
        .on('end', () => {
          // Second pass: split audio at silence points
          // This is a simplified implementation
          // A full implementation would parse silence timestamps and split accordingly
          resolve(outputFiles);
        })
        .on('error', (err) => reject(err))
        .save('/dev/null');
    });
  }

  /**
   * Mux multiple audio tracks
   */
  async muxAudio(
    inputPaths: string[],
    outputPath: string,
    format: string = 'mp3'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const audioFormat = AUDIO_FORMATS[format];
      if (!audioFormat) {
        return reject(new Error(`Unsupported format: ${format}`));
      }

      let command = ffmpeg();
      
      // Add all input files
      inputPaths.forEach(path => {
        command = command.input(path);
      });

      // Merge audio streams
      command
        .complexFilter([
          `amix=inputs=${inputPaths.length}:duration=longest`
        ])
        .audioCodec(audioFormat.codec)
        .toFormat(audioFormat.extension)
        .on('end', () => resolve())
        .on('error', (err) => reject(err))
        .save(outputPath);
    });
  }

  /**
   * Demux audio tracks from a file
   */
  async demuxAudio(
    inputPath: string,
    outputDir: string,
    format: string = 'mp3'
  ): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const metadata = await this.getMetadata(inputPath);
        const audioStreams = metadata.streams.filter(
          (s: any) => s.codec_type === 'audio'
        );

        const outputFiles: string[] = [];

        for (let i = 0; i < audioStreams.length; i++) {
          const outputPath = join(outputDir, `track_${i}.${AUDIO_FORMATS[format].extension}`);
          
          await new Promise<void>((res, rej) => {
            ffmpeg(inputPath)
              .outputOptions([`-map 0:a:${i}`])
              .audioCodec(AUDIO_FORMATS[format].codec)
              .on('end', () => res())
              .on('error', (err) => rej(err))
              .save(outputPath);
          });

          outputFiles.push(outputPath);
        }

        resolve(outputFiles);
      } catch (error) {
        reject(error);
      }
    });
  }
}

/**
 * Create audio client instance
 */
export function getAudioClient(): AudioClient {
  return new AudioClient();
}

/**
 * Test FFmpeg availability
 */
export async function testFFmpeg(): Promise<void> {
  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) return reject(err);
        console.log('✅ FFmpeg is available');
        console.log(`   Formats: ${Object.keys(formats).length} available`);
        resolve();
      });
    });
  } catch (error) {
    console.error('❌ FFmpeg not available:', (error as Error).message);
    console.error('   Install FFmpeg: https://ffmpeg.org/download.html');
    process.exit(1);
  }
}
