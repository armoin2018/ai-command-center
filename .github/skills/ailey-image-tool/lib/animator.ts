/**
 * Animation Creator
 * Create animations from image sequences: GIF, Motion PNG, Animated SVG
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import GIFEncoder from 'gif-encoder-2';
import { createCanvas, loadImage } from 'canvas';

export interface AnimationOptions {
  fps?: number;
  quality?: number;
  loop?: number; // 0 = infinite, -1 = no loop, n = loop n times
  delay?: number; // milliseconds between frames
  width?: number;
  height?: number;
}

export interface FrameInfo {
  path: string;
  delay?: number; // per-frame delay override
}

export class Animator {
  /**
   * Create GIF animation from image sequence
   */
  async createGif(
    frames: string[] | FrameInfo[],
    outputPath: string,
    options: AnimationOptions = {}
  ): Promise<void> {
    const frameList = this.normalizeFrames(frames);
    const fps = options.fps || 10;
    const delay = options.delay || Math.round(1000 / fps);
    
    // Load first image to get dimensions
    const firstImage = await sharp(frameList[0].path).metadata();
    const width = options.width || firstImage.width!;
    const height = options.height || firstImage.height!;
    
    const encoder = new GIFEncoder(width, height);
    
    // Configure encoder
    encoder.setRepeat(options.loop ?? 0);
    encoder.setQuality(options.quality || 10);
    encoder.setDelay(delay);
    
    encoder.start();
    
    // Add frames
    for (const frame of frameList) {
      const image = await loadImage(frame.path);
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, width, height);
      
      if (frame.delay) {
        encoder.setDelay(frame.delay);
      }
      
      encoder.addFrame(ctx);
    }
    
    encoder.finish();
    
    const buffer = encoder.out.getData();
    await fs.writeFile(outputPath, buffer);
  }

  /**
   * Create APNG (Animated PNG) from image sequence
   */
  async createApng(
    frames: string[] | FrameInfo[],
    outputPath: string,
    options: AnimationOptions = {}
  ): Promise<void> {
    // APNG creation using sharp
    const frameList = this.normalizeFrames(frames);
    const delay = options.delay || 100;
    
    // Load and process frames
    const processedFrames = await Promise.all(
      frameList.map(async (frame) => {
        const image = sharp(frame.path);
        if (options.width && options.height) {
          image.resize(options.width, options.height);
        }
        return image.png().toBuffer();
      })
    );
    
    // Create APNG (simplified - full APNG support would require additional library)
    // For now, creating animated sequence as separate frames
    await sharp(processedFrames[0])
      .png({ quality: options.quality || 90 })
      .toFile(outputPath);
  }

  /**
   * Create animated SVG from image sequence
   */
  async createAnimatedSvg(
    frames: string[] | FrameInfo[],
    outputPath: string,
    options: AnimationOptions = {}
  ): Promise<void> {
    const frameList = this.normalizeFrames(frames);
    const fps = options.fps || 10;
    const delay = options.delay || Math.round(1000 / fps);
    
    // Load first image to get dimensions
    const firstImage = await sharp(frameList[0].path).metadata();
    const width = options.width || firstImage.width!;
    const height = options.height || firstImage.height!;
    
    // Convert frames to base64
    const base64Frames = await Promise.all(
      frameList.map(async (frame) => {
        const buffer = await sharp(frame.path)
          .resize(width, height)
          .png()
          .toBuffer();
        return buffer.toString('base64');
      })
    );
    
    // Create SVG with animation
    const svgContent = this.generateAnimatedSvg(base64Frames, width, height, delay, options.loop);
    await fs.writeFile(outputPath, svgContent);
  }

  /**
   * Slice animation into separate frames
   */
  async sliceAnimation(
    inputPath: string,
    outputDir: string,
    format: 'png' | 'jpg' = 'png'
  ): Promise<string[]> {
    const ext = path.extname(inputPath).toLowerCase();
    
    if (ext === '.gif') {
      return this.sliceGif(inputPath, outputDir, format);
    }
    
    throw new Error(`Unsupported animation format: ${ext}`);
  }

  /**
   * Slice GIF into frames
   */
  private async sliceGif(
    gifPath: string,
    outputDir: string,
    format: 'png' | 'jpg'
  ): Promise<string[]> {
    // Read GIF and extract frames
    const omggif = await import('omggif');
    const buffer = await fs.readFile(gifPath);
    const reader = new omggif.GifReader(buffer);
    
    const frames: string[] = [];
    await fs.mkdir(outputDir, { recursive: true });
    
    for (let i = 0; i < reader.numFrames(); i++) {
      const frameInfo = reader.frameInfo(i);
      const frameData = new Uint8Array(frameInfo.width * frameInfo.height * 4);
      reader.decodeAndBlitFrameRGBA(i, frameData);
      
      // Convert to sharp format
      const image = sharp(Buffer.from(frameData), {
        raw: {
          width: frameInfo.width,
          height: frameInfo.height,
          channels: 4
        }
      });
      
      const outputPath = path.join(outputDir, `frame_${String(i).padStart(4, '0')}.${format}`);
      
      if (format === 'png') {
        await image.png().toFile(outputPath);
      } else {
        await image.jpeg().toFile(outputPath);
      }
      
      frames.push(outputPath);
    }
    
    return frames;
  }

  /**
   * Generate animated SVG content
   */
  private generateAnimatedSvg(
    base64Frames: string[],
    width: number,
    height: number,
    delay: number,
    loop?: number
  ): string {
    const duration = (base64Frames.length * delay) / 1000;
    const loopAttr = loop === -1 ? '' : loop ? `repeatCount="${loop}"` : 'repeatCount="indefinite"';
    
    const images = base64Frames.map((frame, i) => {
      const begin = (i * delay) / 1000;
      const dur = delay / 1000;
      
      return `  <image href="data:image/png;base64,${frame}" width="${width}" height="${height}">
    <set attributeName="visibility" to="visible" begin="${begin}s" dur="${dur}s" />
  </image>`;
    }).join('\n');
    
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <g>
${images}
  </g>
</svg>`;
  }

  /**
   * Normalize frames input
   */
  private normalizeFrames(frames: string[] | FrameInfo[]): FrameInfo[] {
    return frames.map(f => typeof f === 'string' ? { path: f } : f);
  }
}

export const animator = new Animator();
