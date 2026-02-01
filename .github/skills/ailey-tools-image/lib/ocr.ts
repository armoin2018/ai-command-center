/**
 * OCR (Optical Character Recognition)
 * Extract text from images using Tesseract.js
 * Supports: BMP, JPG, PNG, GIF, WebP, TIFF, AVIF, PDF
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';

export interface OcrOptions {
  lang?: string; // Language code (e.g., 'eng', 'spa', 'fra')
  psm?: number; // Page segmentation mode (0-13)
  oem?: number; // OCR Engine mode (0-3)
  whitelist?: string; // Characters to recognize
  blacklist?: string; // Characters to ignore
  preprocess?: boolean; // Apply image preprocessing
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  blocks: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

export class OCR {
  /**
   * Get supported image formats for OCR
   */
  getSupportedFormats(): string[] {
    return [
      'bmp', 'jpg', 'jpeg', 'png', 'gif', 'webp',
      'tiff', 'tif', 'avif', 'pdf'
    ];
  }

  /**
   * Extract text from single image (supports all image formats)
   */
  async extractText(
    input: string | Buffer,
    options: OcrOptions = {}
  ): Promise<OcrResult> {
    // Preprocess image if requested
    let processedInput = input;
    if (options.preprocess) {
      processedInput = await this.preprocessImage(input);
    }
    
    // Configure Tesseract
    const config: any = {
      lang: options.lang || 'eng',
    };
    
    if (options.psm !== undefined) {
      config.tessedit_pageseg_mode = options.psm;
    }
    
    if (options.oem !== undefined) {
      config.tessedit_ocr_engine_mode = options.oem;
    }
    
    if (options.whitelist) {
      config.tessedit_char_whitelist = options.whitelist;
    }
    
    if (options.blacklist) {
      config.tessedit_char_blacklist = options.blacklist;
    }
    
    // Perform OCR
    const result = await Tesseract.recognize(processedInput, config.lang, {
      logger: () => {} // Suppress logs
    });
    
    return {
      text: result.data.text,
      confidence: result.data.confidence,
      words: result.data.words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: w.bbox
      })),
      blocks: result.data.blocks.map(b => ({
        text: b.text,
        confidence: b.confidence,
        bbox: b.bbox
      }))
    };
  }

  /**
   * Extract text from multiple images (sequence)
   */
  async extractTextBatch(
    inputs: string[],
    options: OcrOptions = {}
  ): Promise<OcrResult[]> {
    const results: OcrResult[] = [];
    
    for (const input of inputs) {
      const result = await this.extractText(input, options);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Extract text and combine from sequence
   */
  async extractTextSequence(
    inputs: string[],
    options: OcrOptions = {},
    separator: string = '\n\n--- Page Break ---\n\n'
  ): Promise<string> {
    const results = await this.extractTextBatch(inputs, options);
    return results.map(r => r.text).join(separator);
  }

  /**
   * Preprocess image for better OCR results
   */
  private async preprocessImage(input: string | Buffer): Promise<Buffer> {
    return sharp(input)
      .grayscale() // Convert to grayscale
      .normalize() // Normalize contrast
      .sharpen() // Sharpen edges
      .threshold(128) // Apply threshold for binary image
      .toBuffer();
  }

  /**
   * Get available languages
   */
  async getAvailableLanguages(): Promise<string[]> {
    // Common Tesseract languages
    return [
      'eng', // English
      'spa', // Spanish
      'fra', // French
      'deu', // German
      'ita', // Italian
      'por', // Portuguese
      'rus', // Russian
      'chi_sim', // Chinese Simplified
      'chi_tra', // Chinese Traditional
      'jpn', // Japanese
      'kor', // Korean
      'ara', // Arabic
      'hin', // Hindi
    ];
  }
}

export const ocr = new OCR();
