/**
 * Web Image Extractor
 * Extract images from websites using Puppeteer
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';

export interface WebExtractOptions {
  minWidth?: number;
  minHeight?: number;
  maxImages?: number;
  includeBackgrounds?: boolean;
  timeout?: number;
  userAgent?: string;
}

export interface ExtractedImage {
  url: string;
  localPath?: string;
  width: number;
  height: number;
  alt?: string;
  format?: string;
}

export class WebExtractor {
  private browser?: Browser;

  /**
   * Initialize browser
   */
  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  /**
   * Extract images from URL
   */
  async extractFromUrl(
    url: string,
    outputDir: string,
    options: WebExtractOptions = {}
  ): Promise<ExtractedImage[]> {
    await this.init();
    
    const page = await this.browser!.newPage();
    
    if (options.userAgent) {
      await page.setUserAgent(options.userAgent);
    }
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: options.timeout || 30000
    });
    
    // Extract image URLs
    const imageData = await page.evaluate((opts) => {
      const images: any[] = [];
      
      // Get all <img> elements
      document.querySelectorAll('img').forEach((img: HTMLImageElement) => {
        const rect = img.getBoundingClientRect();
        images.push({
          url: img.src,
          width: rect.width || img.naturalWidth,
          height: rect.height || img.naturalHeight,
          alt: img.alt
        });
      });
      
      // Get background images if requested
      if (opts.includeBackgrounds) {
        document.querySelectorAll('*').forEach((el: Element) => {
          const style = window.getComputedStyle(el);
          const bgImage = style.backgroundImage;
          
          if (bgImage && bgImage !== 'none') {
            const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (urlMatch) {
              const rect = el.getBoundingClientRect();
              images.push({
                url: urlMatch[1],
                width: rect.width,
                height: rect.height,
                isBackground: true
              });
            }
          }
        });
      }
      
      return images;
    }, options);
    
    await page.close();
    
    // Filter by dimensions
    const minWidth = options.minWidth || 0;
    const minHeight = options.minHeight || 0;
    const filtered = imageData.filter(img => 
      img.width >= minWidth && img.height >= minHeight
    );
    
    // Limit count
    const maxImages = options.maxImages || filtered.length;
    const toDownload = filtered.slice(0, maxImages);
    
    // Download images
    await fs.mkdir(outputDir, { recursive: true });
    
    const results: ExtractedImage[] = [];
    
    for (let i = 0; i < toDownload.length; i++) {
      const img = toDownload[i];
      
      try {
        const response = await fetch(img.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Detect format
        const metadata = await sharp(buffer).metadata();
        const ext = metadata.format || 'jpg';
        
        const filename = `image_${i + 1}.${ext}`;
        const localPath = path.join(outputDir, filename);
        
        await fs.writeFile(localPath, buffer);
        
        results.push({
          url: img.url,
          localPath,
          width: img.width,
          height: img.height,
          alt: img.alt,
          format: ext
        });
      } catch (error) {
        console.error(`Failed to download ${img.url}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Extract specific image by selector
   */
  async extractBySelector(
    url: string,
    selector: string,
    outputPath: string,
    options: { timeout?: number } = {}
  ): Promise<ExtractedImage | null> {
    await this.init();
    
    const page = await this.browser!.newPage();
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: options.timeout || 30000
    });
    
    const element = await page.$(selector);
    
    if (!element) {
      await page.close();
      return null;
    }
    
    const screenshot = await element.screenshot({ type: 'png' });
    await fs.writeFile(outputPath, screenshot);
    
    const metadata = await sharp(screenshot).metadata();
    
    await page.close();
    
    return {
      url,
      localPath: outputPath,
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: 'png'
    };
  }

  /**
   * Take full page screenshot
   */
  async screenshotPage(
    url: string,
    outputPath: string,
    options: {
      fullPage?: boolean;
      viewport?: { width: number; height: number };
      timeout?: number;
    } = {}
  ): Promise<void> {
    await this.init();
    
    const page = await this.browser!.newPage();
    
    if (options.viewport) {
      await page.setViewport(options.viewport);
    }
    
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: options.timeout || 30000
    });
    
    await page.screenshot({
      path: outputPath,
      fullPage: options.fullPage ?? true
    });
    
    await page.close();
  }
}

export const webExtractor = new WebExtractor();
