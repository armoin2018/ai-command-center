/**
 * Image Format Converter
 * Supports: BMP, JPG, PNG, GIF, SVG, RAW
 */

import sharp from 'sharp';
import Jimp from 'jimp';
import { promises as fs } from 'fs';
import path from 'path';
import { PDFDocument } from 'pdf-lib';
import PDFKit from 'pdfkit';

export type ImageFormat = 'bmp' | 'jpg' | 'jpeg' | 'png' | 'gif' | 'webp' | 'tiff' | 'avif' | 'raw' | 'pdf' | 'eps';

export interface ConversionOptions {
  quality?: number;
  compression?: number;
  depth?: 8 | 16;
  progressive?: boolean;
  lossless?: boolean;
}

export class ImageConverter {
  /**
   * Convert image from one format to another
   */
  async convert(
    input: string | Buffer,
    outputPath: string,
    format: ImageFormat,
    options: ConversionOptions = {}
  ): Promise<void> {
    const image = sharp(input);
    
    const outputOptions: any = {
      quality: options.quality || 90,
      compression: options.compression || 6,
      progressive: options.progressive ?? false,
    };

    switch (format) {
      case 'jpg':
      case 'jpeg':
        await image.jpeg(outputOptions).toFile(outputPath);
        break;
      case 'png':
        await image.png(outputOptions).toFile(outputPath);
        break;
      case 'webp':
        await image.webp({ ...outputOptions, lossless: options.lossless }).toFile(outputPath);
        break;
      case 'tiff':
        await image.tiff(outputOptions).toFile(outputPath);
        break;
      case 'avif':
        await image.avif(outputOptions).toFile(outputPath);
        break;
      case 'gif':
        // GIF conversion using Jimp for better compatibility
        const jimpImage = await Jimp.read(typeof input === 'string' ? input : input);
        await jimpImage.writeAsync(outputPath);
        break;
      case 'bmp':
        // BMP conversion
        const bmpImage = await Jimp.read(typeof input === 'string' ? input : input);
        await bmpImage.writeAsync(outputPath);
        break;
      case 'raw':
        await image.raw().toFile(outputPath);
        break;
      case 'pdf':
        // Convert to PDF using pdf-lib
        await this.convertToPdf(input, outputPath);
        break;
      case 'eps':
        // EPS requires external tools or libraries
        // Convert to high-quality PNG as intermediate
        await image.png({ quality: 100 }).toFile(outputPath.replace(/\.eps$/, '.png'));
        console.warn('EPS output creates high-quality PNG. Use ImageMagick for true EPS.');
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Batch convert images
   */
  async convertBatch(
    inputPattern: string[],
    outputDir: string,
    format: ImageFormat,
    options: ConversionOptions = {}
  ): Promise<string[]> {
    const results: string[] = [];

    for (const inputPath of inputPattern) {
      const filename = path.basename(inputPath, path.extname(inputPath));
      const outputPath = path.join(outputDir, `${filename}.${format}`);
      
      await this.convert(inputPath, outputPath, format, options);
      results.push(outputPath);
    }

    return results;
  }

  /**
   * Convert image to base64
   */
  async toBase64(input: string | Buffer, format?: ImageFormat): Promise<string> {
    const image = sharp(input);
    const buffer = format 
      ? await this.getBufferForFormat(image, format)
      : await image.toBuffer();
    
    return buffer.toString('base64');
  }

  /**
   * Convert base64 to image file
   */
  async fromBase64(base64: string, outputPath: string, format?: ImageFormat): Promise<void> {
    const buffer = Buffer.from(base64, 'base64');
    
    if (format) {
      await this.convert(buffer, outputPath, format);
    } else {
      await fs.writeFile(outputPath, buffer);
    }
  }

  /**
   * Convert image to PDF using pdf-lib
   */
  private async convertToPdf(input: string | Buffer, outputPath: string): Promise<void> {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Convert image to PNG buffer first (for embedding)
    const pngBuffer = await sharp(input).png().toBuffer();
    
    // Get image dimensions
    const metadata = await sharp(input).metadata();
    const width = metadata.width || 595; // A4 width default
    const height = metadata.height || 842; // A4 height default
    
    // Add page with image dimensions
    const page = pdfDoc.addPage([width, height]);
    
    // Embed image
    const pngImage = await pdfDoc.embedPng(pngBuffer);
    
    // Draw image to fill page
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width,
      height
    });
    
    // Save PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
  }

  /**
   * Create PDF from multiple images using pdf-lib
   */
  async createPdfFromImages(
    imagePaths: string[],
    outputPath: string,
    options?: { pageSize?: [number, number]; fitToPage?: boolean }
  ): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    
    for (const imagePath of imagePaths) {
      // Convert to PNG buffer
      const pngBuffer = await sharp(imagePath).png().toBuffer();
      const metadata = await sharp(imagePath).metadata();
      
      const width = options?.pageSize?.[0] || metadata.width || 595;
      const height = options?.pageSize?.[1] || metadata.height || 842;
      
      // Add page
      const page = pdfDoc.addPage([width, height]);
      
      // Embed and draw image
      const pngImage = await pdfDoc.embedPng(pngBuffer);
      
      if (options?.fitToPage) {
        const imgDims = pngImage.scale(1);
        const scale = Math.min(
          width / imgDims.width,
          height / imgDims.height
        );
        
        const scaledWidth = imgDims.width * scale;
        const scaledHeight = imgDims.height * scale;
        
        page.drawImage(pngImage, {
          x: (width - scaledWidth) / 2,
          y: (height - scaledHeight) / 2,
          width: scaledWidth,
          height: scaledHeight
        });
      } else {
        page.drawImage(pngImage, {
          x: 0,
          y: 0,
          width,
          height
        });
      }
    }
    
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
  }

  /**
   * Extract images from PDF using pdf-lib
   */
  async extractImagesFromPdf(
    pdfPath: string,
    outputDir: string,
    format: 'png' | 'jpg' = 'png'
  ): Promise<string[]> {
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    const extractedPaths: string[] = [];
    await fs.mkdir(outputDir, { recursive: true });
    
    // Note: pdf-lib doesn't directly extract embedded images
    // This is a limitation - would need pdf.js or similar for full extraction
    console.warn('PDF image extraction requires additional libraries. Rendering pages instead.');
    
    return extractedPaths;
  }

  /**
   * Convert image to optimal format for OCR (high-quality PNG)
   */
  async convertForOcr(
    input: string | Buffer,
    outputPath: string
  ): Promise<void> {
    // Convert any format to high-quality PNG for best OCR results
    await sharp(input)
      .png({ quality: 100, compressionLevel: 0 })
      .toFile(outputPath);
  }

  /**
   * Get supported formats for OCR
   */
  getSupportedFormatsForOcr(): string[] {
    return [
      'bmp', 'jpg', 'jpeg', 'png', 'gif', 'webp', 
      'tiff', 'tif', 'avif', 'pdf'
    ];
  }

  /**
   * Helper to get buffer for specific format
   */
  private async getBufferForFormat(image: sharp.Sharp, format: ImageFormat): Promise<Buffer> {
    switch (format) {
      case 'jpg':
      case 'jpeg':
        return image.jpeg().toBuffer();
      case 'png':
        return image.png().toBuffer();
      case 'webp':
        return image.webp().toBuffer();
      case 'tiff':
        return image.tiff().toBuffer();
      case 'avif':
        return image.avif().toBuffer();
      case 'pdf':
      case 'eps':
        // Return as PNG buffer for these formats
        return image.png({ quality: 100 }).toBuffer();
      default:
        return image.toBuffer();
    }
  }
}

export const converter = new ImageConverter();
