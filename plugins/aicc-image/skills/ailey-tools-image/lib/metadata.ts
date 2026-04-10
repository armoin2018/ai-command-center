/**
 * Image Metadata Handler
 * Extract and update EXIF and other metadata
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';

export interface ImageMetadata {
  format?: string;
  width?: number;
  height?: number;
  space?: string;
  channels?: number;
  depth?: string;
  density?: number;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: any;
  icc?: any;
  iptc?: any;
  xmp?: any;
  tifftagPhotoshop?: any;
}

export interface MetadataUpdate {
  exif?: Record<string, any>;
  density?: number;
  orientation?: number;
}

export class MetadataHandler {
  /**
   * Extract metadata from image
   */
  async extract(input: string | Buffer): Promise<ImageMetadata> {
    const image = sharp(input);
    const metadata = await image.metadata();
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif,
      icc: metadata.icc,
      iptc: metadata.iptc,
      xmp: metadata.xmp,
      tifftagPhotoshop: metadata.tifftagPhotoshop
    };
  }

  /**
   * Update metadata on image
   */
  async update(
    input: string | Buffer,
    outputPath: string,
    updates: MetadataUpdate
  ): Promise<void> {
    const image = sharp(input);
    
    if (updates.density) {
      image.withMetadata({ density: updates.density });
    }
    
    if (updates.orientation) {
      image.rotate(); // Auto-rotate based on EXIF orientation
    }
    
    if (updates.exif) {
      image.withMetadata({ exif: updates.exif });
    }
    
    await image.toFile(outputPath);
  }

  /**
   * Remove all metadata from image
   */
  async strip(input: string | Buffer, outputPath: string): Promise<void> {
    await sharp(input)
      .withMetadata({
        exif: {},
        icc: undefined,
        iptc: undefined,
        xmp: undefined
      })
      .toFile(outputPath);
  }

  /**
   * Format metadata as JSON
   */
  async extractJson(input: string | Buffer): Promise<string> {
    const metadata = await this.extract(input);
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Get basic info (dimensions, format, size)
   */
  async getBasicInfo(input: string): Promise<{
    width: number;
    height: number;
    format: string;
    fileSize: number;
  }> {
    const metadata = await this.extract(input);
    const stats = await fs.stat(input);
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      fileSize: stats.size
    };
  }
}

export const metadata = new MetadataHandler();
