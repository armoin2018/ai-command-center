#!/usr/bin/env node
/**
 * Video Processor - Core FFmpeg wrapper
 * Provides TypeScript API for video operations
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffprobeInstaller from '@ffprobe-installer/ffprobe';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { mkdir } from 'fs/promises';
import { glob } from 'glob';

// Configure FFmpeg paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

export type InputSource = string | string[] | 'pipe:0' | NodeJS.ReadableStream;
export type OutputTarget = string | string[] | 'pipe:1' | NodeJS.WritableStream;

export interface StreamOptions {
  format?: string;
  inputFormat?: string;
  protocol?: 'rtsp' | 'rtmp' | 'http' | 'https' | 'hls' | 'file';
  bufferSize?: number;
}

export interface VideoInfo {
  duration: number;
  format: string;
  size: number;
  videoCodec: string;
  audioCodec?: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  audioChannels?: number;
  audioSampleRate?: number;
}

export interface ConvertOptions {
  videoCodec?: string;
  audioCodec?: string;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: string;
  twoPass?: boolean;
}

export interface SpeedOptions {
  rate: number;
  preservePitch?: boolean;
  interpolate?: boolean;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspect?: boolean;
  scale?: string;
}

export interface CropOptions {
  width: number;
  height: number;
  x?: number;
  y?: number;
  center?: boolean;
}

export interface SubtitleOptions {
  subtitleFile: string;
  burn?: boolean;
  style?: {
    fontName?: string;
    fontSize?: number;
    primaryColor?: string;
    backgroundColor?: string;
  };
}

export interface AudioOptions {
  format?: string;
  bitrate?: string;
  volume?: number;
}

export interface SplitOptions {
  times: number[];
  prefix?: string;
}

export interface JoinOptions {
  transition?: 'fade' | 'dissolve' | 'none';
  transitionDuration?: number;
  reEncode?: boolean;
}

export class VideoProcessor {
  /**
   * Resolve input sources - supports files, globs, URLs, and streams
   */
  private async resolveInputs(input: InputSource): Promise<string[]> {
    if (Array.isArray(input)) {
      // Handle array of inputs
      const resolved: string[] = [];
      for (const item of input) {
        const items = await this.resolveInputs(item);
        resolved.push(...items);
      }
      return resolved;
    }

    if (typeof input === 'string') {
      // Check if it's a stream identifier
      if (input === 'pipe:0' || input.startsWith('pipe:')) {
        return [input];
      }

      // Check if it's a URL (http, https, rtsp, rtmp)
      if (/^(https?|rtsp|rtmp):\/\//i.test(input)) {
        return [input];
      }

      // Check if it's a glob pattern
      if (input.includes('*') || input.includes('?') || input.includes('[')) {
        const matches = await glob(input);
        if (matches.length === 0) {
          throw new Error(`No files matched pattern: ${input}`);
        }
        return matches;
      }

      // Regular file path
      if (!existsSync(input)) {
        throw new Error(`Input file not found: ${input}`);
      }
      return [input];
    }

    throw new Error('Unsupported input type');
  }

  /**
   * Check if input is a stream
   */
  private isStreamInput(input: string): boolean {
    return input === 'pipe:0' || 
           input.startsWith('pipe:') ||
           /^(https?|rtsp|rtmp):\/\//i.test(input);
  }

  /**
   * Check if output is a stream
   */
  private isStreamOutput(output: string): boolean {
    return output === 'pipe:1' || 
           output.startsWith('pipe:') ||
           /^(rtmp|rtp|udp):\/\//i.test(output);
  }

  /**
   * Get video information
   */
  async getVideoInfo(inputPath: string): Promise<VideoInfo> {
    if (!existsSync(inputPath)) {
      throw new Error(`Video file not found: ${inputPath}`);
    }

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video info: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        const info: VideoInfo = {
          duration: metadata.format.duration || 0,
          format: metadata.format.format_name || '',
          size: metadata.format.size || 0,
          videoCodec: videoStream.codec_name || '',
          audioCodec: audioStream?.codec_name,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          fps: eval(videoStream.r_frame_rate || '0') || 0,
          bitrate: metadata.format.bit_rate || 0,
          audioChannels: audioStream?.channels,
          audioSampleRate: audioStream?.sample_rate
        };

        resolve(info);
      });
    });
  }

  /**
   * Convert video format
   * Supports multiple inputs, outputs, and streaming
   */
  async convert(
    input: InputSource,
    output: OutputTarget,
    options: ConvertOptions & StreamOptions = {}
  ): Promise<void> {
    const inputs = await this.resolveInputs(input);
    
    // Normalize outputs to array of strings
    let outputs: string[];
    if (Array.isArray(output)) {
      outputs = output.filter((o): o is string => typeof o === 'string');
    } else if (typeof output === 'string') {
      outputs = [output];
    } else {
      throw new Error('Stream outputs not yet supported, use string paths or pipe:1');
    }

    // Handle batch conversion (multiple inputs -> multiple outputs)
    if (inputs.length > 1 && outputs.length > 1) {
      if (inputs.length !== outputs.length) {
        throw new Error(`Input count (${inputs.length}) must match output count (${outputs.length})`);
      }

      for (let i = 0; i < inputs.length; i++) {
        await this.convertSingle(inputs[i], outputs[i], options);
      }
      return;
    }

    // Handle single conversion or multiple inputs to one output
    if (inputs.length === 1) {
      for (const out of outputs) {
        await this.convertSingle(inputs[0], out, options);
      }
    } else {
      // Multiple inputs to single output - concatenate
      await this.join(inputs, outputs[0], {});
    }
  }

  /**
   * Convert single video
   */
  private async convertSingle(
    inputPath: string,
    outputPath: string,
    options: ConvertOptions & StreamOptions = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Set input format for streams
      if (this.isStreamInput(inputPath) && options.inputFormat) {
        command = command.inputFormat(options.inputFormat);
      }

      // Set codecs
      if (options.videoCodec) {
        command = command.videoCodec(options.videoCodec);
      }
      if (options.audioCodec) {
        command = command.audioCodec(options.audioCodec);
      }

      // Set quality/bitrate
      if (options.quality) {
        const crf = options.quality === 'high' ? 18 : options.quality === 'medium' ? 23 : 28;
        command = command.outputOptions([`-crf ${crf}`]);
      }
      if (options.bitrate) {
        command = command.videoBitrate(options.bitrate);
      }

      // Set output format for streams
      if (this.isStreamOutput(outputPath) && options.format) {
        command = command.format(options.format);
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Conversion failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Adjust playback speed
   */
  async adjustSpeed(
    inputPath: string,
    outputPath: string,
    options: SpeedOptions
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    if (options.rate <= 0 || options.rate > 4) {
      throw new Error('Speed rate must be between 0 and 4');
    }

    return new Promise((resolve, reject) => {
      const videoFilter = `setpts=${1 / options.rate}*PTS`;
      const audioFilter = options.preservePitch
        ? `atempo=${options.rate}`
        : `asetrate=44100*${options.rate},aresample=44100`;

      ffmpeg(inputPath)
        .videoFilters(videoFilter)
        .audioFilters(audioFilter)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Speed adjustment failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Resize video
   */
  async resize(
    inputPath: string,
    outputPath: string,
    options: ResizeOptions
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise((resolve, reject) => {
      let scale: string;

      if (options.scale) {
        scale = options.scale;
      } else if (options.width && options.height) {
        scale = options.maintainAspect
          ? `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease`
          : `scale=${options.width}:${options.height}`;
      } else if (options.width) {
        scale = `scale=${options.width}:-1`;
      } else if (options.height) {
        scale = `scale=-1:${options.height}`;
      } else {
        reject(new Error('Must specify width, height, or scale'));
        return;
      }

      ffmpeg(inputPath)
        .videoFilters(scale)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Resize failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Crop video
   */
  async crop(
    inputPath: string,
    outputPath: string,
    options: CropOptions
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise(async (resolve, reject) => {
      let x = options.x || 0;
      let y = options.y || 0;

      if (options.center) {
        const info = await this.getVideoInfo(inputPath);
        x = (info.width - options.width) / 2;
        y = (info.height - options.height) / 2;
      }

      const cropFilter = `crop=${options.width}:${options.height}:${x}:${y}`;

      ffmpeg(inputPath)
        .videoFilters(cropFilter)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Crop failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Extract audio from video
   */
  async extractAudio(
    inputPath: string,
    outputPath: string,
    options: AudioOptions = {}
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath).noVideo();

      if (options.bitrate) {
        command = command.audioBitrate(options.bitrate);
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Audio extraction failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Replace audio in video
   */
  async replaceAudio(
    inputPath: string,
    outputPath: string,
    audioPath: string
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    if (!existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .input(audioPath)
        .outputOptions(['-map 0:v', '-map 1:a', '-c:v copy', '-shortest'])
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Audio replacement failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Split video at timestamps
   */
  async split(
    inputPath: string,
    outputDir: string,
    options: SplitOptions
  ): Promise<string[]> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Create output directory
    await mkdir(resolve(outputDir), { recursive: true });

    const info = await this.getVideoInfo(inputPath);
    const times = [0, ...options.times.sort((a, b) => a - b), info.duration];
    const outputs: string[] = [];
    const prefix = options.prefix || 'chunk_';

    for (let i = 0; i < times.length - 1; i++) {
      const start = times[i];
      const end = times[i + 1];
      const duration = end - start;
      const outputPath = resolve(outputDir, `${prefix}${String(i).padStart(2, '0')}.mp4`);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputPath)
          .setStartTime(start)
          .setDuration(duration)
          .outputOptions(['-c copy'])
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`Split failed: ${err.message}`)))
          .save(outputPath);
      });

      outputs.push(outputPath);
    }

    return outputs;
  }

  /**
   * Join multiple videos
   */
  async join(
    inputPaths: string[],
    outputPath: string,
    options: JoinOptions = {}
  ): Promise<void> {
    for (const path of inputPaths) {
      if (!existsSync(path)) {
        throw new Error(`Input file not found: ${path}`);
      }
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg();

      // Add all inputs
      inputPaths.forEach(path => {
        command = command.input(path);
      });

      // Concatenate
      const filterComplex = inputPaths
        .map((_, i) => `[${i}:v][${i}:a]`)
        .join('') + `concat=n=${inputPaths.length}:v=1:a=1[outv][outa]`;

      command
        .complexFilter(filterComplex)
        .outputOptions(['-map [outv]', '-map [outa]'])
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Join failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Add subtitles to video
   */
  async addSubtitles(
    inputPath: string,
    outputPath: string,
    options: SubtitleOptions
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }
    if (!existsSync(options.subtitleFile)) {
      throw new Error(`Subtitle file not found: ${options.subtitleFile}`);
    }

    return new Promise((resolve, reject) => {
      if (options.burn) {
        // Burn subtitles into video
        ffmpeg(inputPath)
          .videoFilters(`subtitles=${options.subtitleFile}`)
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`Subtitle burn failed: ${err.message}`)))
          .save(outputPath);
      } else {
        // Add as separate track
        ffmpeg(inputPath)
          .input(options.subtitleFile)
          .outputOptions(['-c copy', '-c:s mov_text'])
          .on('end', () => resolve())
          .on('error', (err) => reject(new Error(`Subtitle addition failed: ${err.message}`)))
          .save(outputPath);
      }
    });
  }

  /**
   * Apply visual filter
   */
  async applyFilter(
    inputPath: string,
    outputPath: string,
    filters: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
      blur?: number;
      sharpen?: number;
      grayscale?: boolean;
    }
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const filterArray: string[] = [];

    if (filters.brightness !== undefined) {
      filterArray.push(`eq=brightness=${filters.brightness}`);
    }
    if (filters.contrast !== undefined) {
      filterArray.push(`eq=contrast=${filters.contrast}`);
    }
    if (filters.saturation !== undefined) {
      filterArray.push(`eq=saturation=${filters.saturation}`);
    }
    if (filters.blur) {
      filterArray.push(`boxblur=${filters.blur}:${filters.blur}`);
    }
    if (filters.sharpen) {
      filterArray.push(`unsharp=5:5:${filters.sharpen}:5:5:${filters.sharpen}`);
    }
    if (filters.grayscale) {
      filterArray.push('hue=s=0');
    }

    if (filterArray.length === 0) {
      throw new Error('No filters specified');
    }

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoFilters(filterArray.join(','))
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Filter application failed: ${err.message}`)))
        .save(outputPath);
    });
  }

  /**
   * Extract frames from video
   */
  async extractFrames(
    inputPath: string,
    outputDir: string,
    options: {
      every?: number;
      fps?: number;
      times?: number[];
      format?: 'png' | 'jpg';
    } = {}
  ): Promise<string[]> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    await mkdir(resolve(outputDir), { recursive: true });

    const format = options.format || 'png';
    const outputs: string[] = [];

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (options.fps) {
        command = command.fps(options.fps);
      } else if (options.every) {
        command = command.fps(1 / options.every);
      }

      const outputPattern = resolve(outputDir, `frame_%04d.${format}`);

      command
        .on('end', () => resolve(outputs))
        .on('error', (err) => reject(new Error(`Frame extraction failed: ${err.message}`)))
        .save(outputPattern);
    });
  }

  /**
   * Generate thumbnail
   */
  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    options: {
      time?: number;
      width?: number;
      height?: number;
    } = {}
  ): Promise<void> {
    if (!existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath).screenshots({
        timestamps: [options.time || '50%'],
        filename: outputPath,
        folder: '.',
        size: options.width && options.height ? `${options.width}x${options.height}` : undefined
      });

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)));
    });
  }
}

export function getVideoProcessor(): VideoProcessor {
  return new VideoProcessor();
}
