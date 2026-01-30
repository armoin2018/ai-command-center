/**
 * Image Editor
 * Supports: rotate, crop, resize, canvas, transparency, compression, color operations
 */

import sharp from 'sharp';
import Jimp from 'jimp';

export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CanvasOptions {
  width: number;
  height: number;
  background?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export interface ColorSwapOptions {
  from: string; // hex color
  to: string; // hex color
  tolerance?: number; // 0-100
}

export interface WatermarkOptions {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number; // 0-1
  margin?: number;
}

export class ImageEditor {
  /**
   * Rotate image
   */
  async rotate(
    input: string | Buffer,
    outputPath: string,
    degrees: number
  ): Promise<void> {
    await sharp(input)
      .rotate(degrees)
      .toFile(outputPath);
  }

  /**
   * Crop image
   */
  async crop(
    input: string | Buffer,
    outputPath: string,
    options: CropOptions
  ): Promise<void> {
    await sharp(input)
      .extract({
        left: options.left,
        top: options.top,
        width: options.width,
        height: options.height
      })
      .toFile(outputPath);
  }

  /**
   * Resize image
   */
  async resize(
    input: string | Buffer,
    outputPath: string,
    options: ResizeOptions
  ): Promise<void> {
    await sharp(input)
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit || 'cover',
        position: options.position || 'center'
      })
      .toFile(outputPath);
  }

  /**
   * Change canvas size (extend or shrink)
   */
  async changeCanvas(
    input: string | Buffer,
    outputPath: string,
    options: CanvasOptions
  ): Promise<void> {
    const image = sharp(input);
    const metadata = await image.metadata();
    
    await image
      .resize(options.width, options.height, {
        fit: 'contain',
        background: options.background || { r: 255, g: 255, b: 255, alpha: 0 },
        position: options.position || 'center'
      })
      .toFile(outputPath);
  }

  /**
   * Set or change transparency
   */
  async setTransparency(
    input: string | Buffer,
    outputPath: string,
    alpha: number // 0-1
  ): Promise<void> {
    const image = await Jimp.read(typeof input === 'string' ? input : input);
    
    image.opacity(alpha);
    
    await image.writeAsync(outputPath);
  }

  /**
   * Compress image
   */
  async compress(
    input: string | Buffer,
    outputPath: string,
    quality: number = 80
  ): Promise<void> {
    const image = sharp(input);
    const metadata = await image.metadata();
    
    const format = metadata.format;
    
    switch (format) {
      case 'jpeg':
      case 'jpg':
        await image.jpeg({ quality }).toFile(outputPath);
        break;
      case 'png':
        await image.png({ quality, compressionLevel: 9 }).toFile(outputPath);
        break;
      case 'webp':
        await image.webp({ quality }).toFile(outputPath);
        break;
      default:
        await image.toFile(outputPath);
    }
  }

  /**
   * Change color depth
   */
  async changeColorDepth(
    input: string | Buffer,
    outputPath: string,
    depth: 8 | 16
  ): Promise<void> {
    const image = sharp(input);
    
    if (depth === 8) {
      await image
        .toColourspace('srgb')
        .toFile(outputPath);
    } else {
      await image
        .toColourspace('rgb16')
        .toFile(outputPath);
    }
  }

  /**
   * Swap colors with tolerance
   */
  async swapColors(
    input: string | Buffer,
    outputPath: string,
    options: ColorSwapOptions
  ): Promise<void> {
    const image = await Jimp.read(typeof input === 'string' ? input : input);
    const tolerance = options.tolerance || 0;
    
    const fromColor = this.hexToRgb(options.from);
    const toColor = this.hexToRgb(options.to);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, (x, y, idx) => {
      const red = image.bitmap.data[idx];
      const green = image.bitmap.data[idx + 1];
      const blue = image.bitmap.data[idx + 2];
      
      if (this.colorMatch(
        { r: red, g: green, b: blue },
        fromColor,
        tolerance
      )) {
        image.bitmap.data[idx] = toColor.r;
        image.bitmap.data[idx + 1] = toColor.g;
        image.bitmap.data[idx + 2] = toColor.b;
      }
    });
    
    await image.writeAsync(outputPath);
  }

  /**
   * Add watermark to image
   */
  async addWatermark(
    input: string | Buffer,
    watermarkPath: string,
    outputPath: string,
    options: WatermarkOptions = {}
  ): Promise<void> {
    const baseImage = sharp(input);
    const metadata = await baseImage.metadata();
    
    let watermark = sharp(watermarkPath);
    const watermarkMetadata = await watermark.metadata();
    
    // Apply opacity if specified
    if (options.opacity !== undefined) {
      watermark = watermark.composite([{
        input: Buffer.from([255, 255, 255, Math.round(options.opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in'
      }]);
    }
    
    const watermarkBuffer = await watermark.toBuffer();
    
    // Calculate position
    const margin = options.margin || 10;
    const position = this.calculateWatermarkPosition(
      metadata.width!,
      metadata.height!,
      watermarkMetadata.width!,
      watermarkMetadata.height!,
      options.position || 'bottom-right',
      margin
    );
    
    await baseImage
      .composite([{
        input: watermarkBuffer,
        top: position.top,
        left: position.left
      }])
      .toFile(outputPath);
  }

  /**
   * Helper: Calculate watermark position
   */
  private calculateWatermarkPosition(
    baseWidth: number,
    baseHeight: number,
    watermarkWidth: number,
    watermarkHeight: number,
    position: string,
    margin: number
  ): { top: number; left: number } {
    switch (position) {
      case 'top-left':
        return { top: margin, left: margin };
      case 'top-right':
        return { top: margin, left: baseWidth - watermarkWidth - margin };
      case 'bottom-left':
        return { top: baseHeight - watermarkHeight - margin, left: margin };
      case 'bottom-right':
        return { 
          top: baseHeight - watermarkHeight - margin, 
          left: baseWidth - watermarkWidth - margin 
        };
      case 'center':
        return {
          top: Math.floor((baseHeight - watermarkHeight) / 2),
          left: Math.floor((baseWidth - watermarkWidth) / 2)
        };
      default:
        return { top: margin, left: margin };
    }
  }

  /**
   * Helper: Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Helper: Check if colors match within tolerance
   */
  private colorMatch(
    color1: { r: number; g: number; b: number },
    color2: { r: number; g: number; b: number },
    tolerance: number
  ): boolean {
    const distance = Math.sqrt(
      Math.pow(color1.r - color2.r, 2) +
      Math.pow(color1.g - color2.g, 2) +
      Math.pow(color1.b - color2.b, 2)
    );
    
    const maxDistance = Math.sqrt(3 * Math.pow(255, 2));
    const normalizedDistance = (distance / maxDistance) * 100;
    
    return normalizedDistance <= tolerance;
  }
}

export const editor = new ImageEditor();
