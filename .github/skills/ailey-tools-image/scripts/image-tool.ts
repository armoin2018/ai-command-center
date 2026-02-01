#!/usr/bin/env node
/**
 * AI-ley Image Tool CLI
 * Comprehensive image manipulation tool
 */

import { Command } from 'commander';
import { converter } from '../lib/converter.js';
import { animator } from '../lib/animator.js';
import { editor } from '../lib/editor.js';
import { metadata } from '../lib/metadata.js';
import { ocr } from '../lib/ocr.js';
import { webExtractor } from '../lib/web-extractor.js';
import { svgTemplate } from '../lib/svg-template.js';
import { promises as fs } from 'fs';
import path from 'path';

const program = new Command();

program
  .name('image-tool')
  .description('Comprehensive image manipulation toolkit')
  .version('1.0.0');

// ============================================================================
// CONVERT Command
// ============================================================================
program
  .command('convert')
  .description('Convert image between formats')
  .requiredOption('-i, --input <path>', 'Input image path')
  .requiredOption('-o, --output <path>', 'Output image path')
  .requiredOption('-f, --format <format>', 'Output format (bmp, jpg, png, gif, webp, tiff, avif, raw, pdf, eps)')
  .option('-q, --quality <number>', 'Quality (1-100)', '90')
  .option('-c, --compression <number>', 'Compression level (0-9)', '6')
  .option('--progressive', 'Progressive rendering')
  .option('--lossless', 'Lossless compression (for webp)')
  .action(async (options) => {
    try {
      await converter.convert(
        options.input,
        options.output,
        options.format,
        {
          quality: parseInt(options.quality),
          compression: parseInt(options.compression),
          progressive: options.progressive,
          lossless: options.lossless
        }
      );
      console.log(`✅ Converted to ${options.output}`);
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// BATCH CONVERT Command
// ============================================================================
program
  .command('batch-convert')
  .description('Batch convert images')
  .requiredOption('-i, --input <pattern...>', 'Input image paths')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .requiredOption('-f, --format <format>', 'Output format')
  .option('-q, --quality <number>', 'Quality (1-100)', '90')
  .action(async (options) => {
    try {
      const results = await converter.convertBatch(
        options.input,
        options.output,
        options.format,
        { quality: parseInt(options.quality) }
      );
      console.log(`✅ Converted ${results.length} images to ${options.output}`);
    } catch (error) {
      console.error('❌ Batch conversion failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// BASE64 Commands
// ============================================================================
program
  .command('to-base64')
  .description('Convert image to base64')
  .requiredOption('-i, --input <path>', 'Input image path')
  .option('-f, --format <format>', 'Output format')
  .option('-o, --output <path>', 'Output file path (optional)')
  .action(async (options) => {
    try {
      const base64 = await converter.toBase64(options.input, options.format);
      if (options.output) {
        await fs.writeFile(options.output, base64, 'utf-8');
        console.log(`✅ Base64 saved to ${options.output}`);
      } else {
        console.log(base64);
      }
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      process.exit(1);
    }
  });

program
  .command('from-base64')
  .description('Convert base64 to image')
  .requiredOption('-i, --input <path>', 'Input base64 file or string')
  .requiredOption('-o, --output <path>', 'Output image path')
  .option('-f, --format <format>', 'Output format')
  .action(async (options) => {
    try {
      let base64 = options.input;
      if (options.input.length < 1000 && await fs.stat(options.input).catch(() => null)) {
        base64 = await fs.readFile(options.input, 'utf-8');
      }
      await converter.fromBase64(base64, options.output, options.format);
      console.log(`✅ Image saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Conversion failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// ANIMATION Commands
// ============================================================================
program
  .command('create-gif')
  .description('Create GIF animation from images')
  .requiredOption('-i, --input <paths...>', 'Input image paths (in order)')
  .requiredOption('-o, --output <path>', 'Output GIF path')
  .option('--fps <number>', 'Frames per second', '10')
  .option('--delay <number>', 'Delay between frames (ms)')
  .option('--loop <number>', 'Loop count (0=infinite, -1=no loop)', '0')
  .option('--quality <number>', 'Quality (1-20, lower is better)', '10')
  .option('--width <number>', 'Output width')
  .option('--height <number>', 'Output height')
  .action(async (options) => {
    try {
      await animator.createGif(options.input, options.output, {
        fps: parseInt(options.fps),
        delay: options.delay ? parseInt(options.delay) : undefined,
        loop: parseInt(options.loop),
        quality: parseInt(options.quality),
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined
      });
      console.log(`✅ GIF created: ${options.output}`);
    } catch (error) {
      console.error('❌ GIF creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('create-animated-svg')
  .description('Create animated SVG from images')
  .requiredOption('-i, --input <paths...>', 'Input image paths')
  .requiredOption('-o, --output <path>', 'Output SVG path')
  .option('--fps <number>', 'Frames per second', '10')
  .option('--loop <number>', 'Loop count', '0')
  .action(async (options) => {
    try {
      await animator.createAnimatedSvg(options.input, options.output, {
        fps: parseInt(options.fps),
        loop: parseInt(options.loop)
      });
      console.log(`✅ Animated SVG created: ${options.output}`);
    } catch (error) {
      console.error('❌ Animated SVG creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('slice-animation')
  .description('Slice animation into frames')
  .requiredOption('-i, --input <path>', 'Input animation (GIF)')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('-f, --format <format>', 'Output format (png, jpg)', 'png')
  .action(async (options) => {
    try {
      const frames = await animator.sliceAnimation(options.input, options.output, options.format);
      console.log(`✅ Extracted ${frames.length} frames to ${options.output}`);
    } catch (error) {
      console.error('❌ Slicing failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// EDIT Commands
// ============================================================================
program
  .command('rotate')
  .description('Rotate image')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-o, --output <path>', 'Output image')
  .requiredOption('-d, --degrees <number>', 'Rotation degrees')
  .action(async (options) => {
    try {
      await editor.rotate(options.input, options.output, parseFloat(options.degrees));
      console.log(`✅ Rotated image saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Rotation failed:', error);
      process.exit(1);
    }
  });

program
  .command('crop')
  .description('Crop image')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-o, --output <path>', 'Output image')
  .requiredOption('--left <number>', 'Left position')
  .requiredOption('--top <number>', 'Top position')
  .requiredOption('--width <number>', 'Crop width')
  .requiredOption('--height <number>', 'Crop height')
  .action(async (options) => {
    try {
      await editor.crop(options.input, options.output, {
        left: parseInt(options.left),
        top: parseInt(options.top),
        width: parseInt(options.width),
        height: parseInt(options.height)
      });
      console.log(`✅ Cropped image saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Crop failed:', error);
      process.exit(1);
    }
  });

program
  .command('resize')
  .description('Resize image')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-o, --output <path>', 'Output image')
  .option('--width <number>', 'Target width')
  .option('--height <number>', 'Target height')
  .option('--fit <mode>', 'Fit mode (cover, contain, fill, inside, outside)', 'cover')
  .action(async (options) => {
    try {
      await editor.resize(options.input, options.output, {
        width: options.width ? parseInt(options.width) : undefined,
        height: options.height ? parseInt(options.height) : undefined,
        fit: options.fit
      });
      console.log(`✅ Resized image saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Resize failed:', error);
      process.exit(1);
    }
  });

program
  .command('canvas')
  .description('Change canvas size')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-o, --output <path>', 'Output image')
  .requiredOption('--width <number>', 'Canvas width')
  .requiredOption('--height <number>', 'Canvas height')
  .option('--background <color>', 'Background color (hex)', '#FFFFFF')
  .option('--position <pos>', 'Image position', 'center')
  .action(async (options) => {
    try {
      await editor.changeCanvas(options.input, options.output, {
        width: parseInt(options.width),
        height: parseInt(options.height),
        background: options.background,
        position: options.position
      });
      console.log(`✅ Canvas changed, saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Canvas change failed:', error);
      process.exit(1);
    }
  });

program
  .command('compress')
  .description('Compress image')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-o, --output <path>', 'Output image')
  .option('-q, --quality <number>', 'Quality (1-100)', '80')
  .action(async (options) => {
    try {
      await editor.compress(options.input, options.output, parseInt(options.quality));
      console.log(`✅ Compressed image saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Compression failed:', error);
      process.exit(1);
    }
  });

program
  .command('watermark')
  .description('Add watermark to image')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-w, --watermark <path>', 'Watermark image')
  .requiredOption('-o, --output <path>', 'Output image')
  .option('--position <pos>', 'Position (top-left, top-right, bottom-left, bottom-right, center)', 'bottom-right')
  .option('--opacity <number>', 'Opacity (0-1)', '1')
  .option('--margin <number>', 'Margin (pixels)', '10')
  .action(async (options) => {
    try {
      await editor.addWatermark(options.input, options.watermark, options.output, {
        position: options.position,
        opacity: parseFloat(options.opacity),
        margin: parseInt(options.margin)
      });
      console.log(`✅ Watermarked image saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Watermark failed:', error);
      process.exit(1);
    }
  });

program
  .command('swap-colors')
  .description('Swap colors in image')
  .requiredOption('-i, --input <path>', 'Input image')
  .requiredOption('-o, --output <path>', 'Output image')
  .requiredOption('--from <color>', 'Source color (hex)')
  .requiredOption('--to <color>', 'Target color (hex)')
  .option('--tolerance <number>', 'Color tolerance (0-100)', '0')
  .action(async (options) => {
    try {
      await editor.swapColors(options.input, options.output, {
        from: options.from,
        to: options.to,
        tolerance: parseFloat(options.tolerance)
      });
      console.log(`✅ Colors swapped, saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Color swap failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// METADATA Commands
// ============================================================================
program
  .command('metadata')
  .description('Extract image metadata')
  .requiredOption('-i, --input <path>', 'Input image')
  .option('-o, --output <path>', 'Output JSON file')
  .action(async (options) => {
    try {
      const meta = await metadata.extract(options.input);
      const json = JSON.stringify(meta, null, 2);
      
      if (options.output) {
        await fs.writeFile(options.output, json, 'utf-8');
        console.log(`✅ Metadata saved to ${options.output}`);
      } else {
        console.log(json);
      }
    } catch (error) {
      console.error('❌ Metadata extraction failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// OCR Commands
// ============================================================================
program
  .command('ocr')
  .description('Extract text from image')
  .requiredOption('-i, --input <path>', 'Input image')
  .option('--lang <code>', 'Language code (eng, spa, fra, etc.)', 'eng')
  .option('--preprocess', 'Apply image preprocessing')
  .option('-o, --output <path>', 'Output text file')
  .action(async (options) => {
    try {
      const result = await ocr.extractText(options.input, {
        lang: options.lang,
        preprocess: options.preprocess
      });
      
      if (options.output) {
        await fs.writeFile(options.output, result.text, 'utf-8');
        console.log(`✅ Text saved to ${options.output}`);
      } else {
        console.log(result.text);
      }
      console.log(`\nConfidence: ${result.confidence.toFixed(2)}%`);
    } catch (error) {
      console.error('❌ OCR failed:', error);
      process.exit(1);
    }
  });

program
  .command('ocr-batch')
  .description('Extract text from multiple images')
  .requiredOption('-i, --input <paths...>', 'Input images')
  .option('--lang <code>', 'Language code', 'eng')
  .option('-o, --output <path>', 'Output text file')
  .action(async (options) => {
    try {
      const text = await ocr.extractTextSequence(options.input, {
        lang: options.lang
      });
      
      if (options.output) {
        await fs.writeFile(options.output, text, 'utf-8');
        console.log(`✅ Text saved to ${options.output}`);
      } else {
        console.log(text);
      }
    } catch (error) {
      console.error('❌ OCR batch failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// PDF Commands
// ============================================================================
program
  .command('create-pdf')
  .description('Create PDF from multiple images')
  .requiredOption('-i, --input <paths...>', 'Input image paths (in order)')
  .requiredOption('-o, --output <path>', 'Output PDF path')
  .option('--page-size <size>', 'Page size (A4, Letter, or WxH)', 'A4')
  .option('--fit-to-page', 'Fit images to page size')
  .action(async (options) => {
    try {
      let pageSize: [number, number] | undefined;
      
      if (options.pageSize === 'A4') {
        pageSize = [595, 842];
      } else if (options.pageSize === 'Letter') {
        pageSize = [612, 792];
      } else if (options.pageSize.includes('x')) {
        const [w, h] = options.pageSize.split('x').map(Number);
        pageSize = [w, h];
      }
      
      await converter.createPdfFromImages(options.input, options.output, {
        pageSize,
        fitToPage: options.fitToPage
      });
      
      console.log(`✅ PDF created: ${options.output} (${options.input.length} pages)`);
    } catch (error) {
      console.error('❌ PDF creation failed:', error);
      process.exit(1);
    }
  });

program
  .command('extract-text')
  .description('Extract text from any image format (alias for ocr)')
  .requiredOption('-i, --input <path>', 'Input file (BMP, JPG, PNG, GIF, WebP, TIFF, AVIF, PDF)')
  .option('--lang <code>', 'Language code', 'eng')
  .option('--preprocess', 'Apply preprocessing for better accuracy')
  .option('-o, --output <path>', 'Output text file')
  .option('--format <format>', 'Output format (txt, json)', 'txt')
  .action(async (options) => {
    try {
      const result = await ocr.extractText(options.input, {
        lang: options.lang,
        preprocess: options.preprocess
      });
      
      let output = result.text;
      
      if (options.format === 'json') {
        output = JSON.stringify({
          text: result.text,
          confidence: result.confidence,
          wordCount: result.words.length,
          blockCount: result.blocks.length,
          words: result.words,
          blocks: result.blocks
        }, null, 2);
      }
      
      if (options.output) {
        await fs.writeFile(options.output, output, 'utf-8');
        console.log(`✅ Text extracted and saved to ${options.output}`);
      } else {
        console.log(output);
      }
      
      console.log(`\nFormat: ${path.extname(options.input).slice(1).toUpperCase()}`);
      console.log(`Confidence: ${result.confidence.toFixed(2)}%`);
      console.log(`Words: ${result.words.length} | Blocks: ${result.blocks.length}`);
    } catch (error) {
      console.error('❌ Text extraction failed:', error);
      process.exit(1);
    }
  });

// ============================================================================
// WEB EXTRACT Commands
// ============================================================================
program
  .command('web-extract')
  .description('Extract images from website')
  .requiredOption('-u, --url <url>', 'Website URL')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('--min-width <number>', 'Minimum image width', '0')
  .option('--min-height <number>', 'Minimum image height', '0')
  .option('--max-images <number>', 'Maximum images to download')
  .option('--backgrounds', 'Include background images')
  .action(async (options) => {
    try {
      const images = await webExtractor.extractFromUrl(options.url, options.output, {
        minWidth: parseInt(options.minWidth),
        minHeight: parseInt(options.minHeight),
        maxImages: options.maxImages ? parseInt(options.maxImages) : undefined,
        includeBackgrounds: options.backgrounds
      });
      
      await webExtractor.close();
      
      console.log(`✅ Extracted ${images.length} images to ${options.output}`);
      images.forEach((img, i) => {
        console.log(`  ${i + 1}. ${img.localPath} (${img.width}x${img.height})`);
      });
    } catch (error) {
      console.error('❌ Web extraction failed:', error);
      await webExtractor.close();
      process.exit(1);
    }
  });

program
  .command('screenshot')
  .description('Take screenshot of webpage')
  .requiredOption('-u, --url <url>', 'Website URL')
  .requiredOption('-o, --output <path>', 'Output image path')
  .option('--full-page', 'Capture full page')
  .option('--width <number>', 'Viewport width', '1920')
  .option('--height <number>', 'Viewport height', '1080')
  .action(async (options) => {
    try {
      await webExtractor.screenshotPage(options.url, options.output, {
        fullPage: options.fullPage,
        viewport: {
          width: parseInt(options.width),
          height: parseInt(options.height)
        }
      });
      
      await webExtractor.close();
      
      console.log(`✅ Screenshot saved to ${options.output}`);
    } catch (error) {
      console.error('❌ Screenshot failed:', error);
      await webExtractor.close();
      process.exit(1);
    }
  });

// ============================================================================
// SVG TEMPLATE Commands
// ============================================================================
program
  .command('svg-template')
  .description('Process SVG template with variables')
  .requiredOption('-t, --template <path>', 'SVG template file')
  .requiredOption('-o, --output <path>', 'Output SVG file')
  .option('-v, --vars <json>', 'Variables as JSON string')
  .option('-f, --vars-file <path>', 'Variables JSON file')
  .action(async (options) => {
    try {
      let variables = {};
      
      if (options.vars) {
        variables = JSON.parse(options.vars);
      } else if (options.varsFile) {
        const content = await fs.readFile(options.varsFile, 'utf-8');
        variables = JSON.parse(content);
      }
      
      await svgTemplate.process(options.template, options.output, variables);
      console.log(`✅ SVG processed and saved to ${options.output}`);
    } catch (error) {
      console.error('❌ SVG template processing failed:', error);
      process.exit(1);
    }
  });

program
  .command('svg-bulk')
  .description('Bulk process SVG template')
  .requiredOption('-t, --template <path>', 'SVG template file')
  .requiredOption('-d, --data <path>', 'JSON data file (array of objects)')
  .requiredOption('-o, --output <dir>', 'Output directory')
  .option('--filename <template>', 'Filename template', 'output_{{index}}.svg')
  .action(async (options) => {
    try {
      const results = await svgTemplate.processBulkFromJson(
        options.template,
        options.data,
        options.output,
        options.filename
      );
      console.log(`✅ Processed ${results.length} SVG files to ${options.output}`);
    } catch (error) {
      console.error('❌ Bulk SVG processing failed:', error);
      process.exit(1);
    }
  });

program
  .command('svg-extract-vars')
  .description('Extract variables from SVG template')
  .requiredOption('-t, --template <path>', 'SVG template file')
  .action(async (options) => {
    try {
      const vars = await svgTemplate.extractVariables(options.template);
      console.log('Template variables:');
      vars.forEach(v => console.log(`  - {{${v}}}`));
    } catch (error) {
      console.error('❌ Variable extraction failed:', error);
      process.exit(1);
    }
  });

// Parse and execute
program.parse(process.argv);
