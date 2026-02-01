---
id: 
name: ailey-tools-image
description: Comprehensive image manipulation toolkit with format conversion (BMP, JPG, PNG, GIF, SVG, RAW), animation creation/slicing, editing (rotate, crop, resize, watermark, color swap), metadata extraction/updates, OCR text extraction, web image scraping, and SVG template processing. Use when working with images, creating animations, extracting text from images, processing image batches, or generating images from templates.
---
# AI-ley Image Tool

Modular image manipulation toolkit providing format conversion, animation, editing, metadata management, OCR, web extraction, and SVG templating capabilities.

## Overview

The image-tool skill provides comprehensive image processing through seven specialized modules:

**Format Conversion:**
- Convert between BMP, JPG, PNG, GIF, SVG, WebP, TIFF, AVIF, RAW, PDF, EPS
- True PDF creation using pdf-lib (MIT licensed)
- Multi-page PDF generation from image sequences
- Base64 encoding/decoding
- Batch conversion
- Quality and compression control
- Note: EPS output creates high-quality PNG (true EPS requires Ghostscript)

**Animation:**
- Create GIF, Motion PNG, Animated SVG from image sequences
- Slice animations into individual frames
- Control FPS, quality, loop count, frame delays

**Editing:**
- Rotate, crop, resize images
- Change canvas size with positioning
- Adjust transparency and compression
- Color swapping with tolerance
- Watermarking with positioning control
- Color depth adjustment

**Metadata:**
- Extract EXIF, IPTC, XMP, ICC metadata
- Update metadata fields
- Strip metadata for privacy
- Get image dimensions and format info

**OCR (Optical Character Recognition):**
- Extract text from single images or sequences
- **Supports all image formats**: BMP, JPG, PNG, GIF, WebP, TIFF, AVIF, PDF
- Multi-language support (13+ languages)
- Image preprocessing for better accuracy
- Confidence scoring
- JSON output with word/block positions

**Web Extraction:**
- Download images from websites
- Full-page screenshots
- Element-specific screenshots
- Filter by dimensions
- Include background images

**SVG Templates:**
- Replace {{Variable}} placeholders
- Bulk processing with JSON data
- Extract template variables
- Validate variable mappings

**Modular Design:**
- Each module exports reusable functions
- Can be imported by other skills
- MIT/CC0 licensed dependencies only
- TypeScript with full type safety

## When to Use

Use this skill when:

- **Converting**: Changing image formats or quality
- **Animating**: Creating GIFs or animated SVGs from sequences
- **Editing**: Resizing, cropping, rotating, watermarking images
- **Extracting**: Getting metadata or text (OCR) from images
- **Web Scraping**: Downloading images from websites
- **Template Processing**: Generating multiple images from SVG templates
- **Batch Operations**: Processing multiple images at once
- **Color Manipulation**: Swapping colors or adjusting transparency


### Install Dependencies

```bash
cd .github/skills/ailey-tools-image
npm install
npm run build
```

### Convert Image Format

```bash
tsx scripts/image-tool.ts convert \
  -i photo.jpg \
  -o photo.png \
  -f png \
  -q 95
```

### Create PDF from Image

```bash
tsx scripts/image-tool.ts convert \
  -i document-scan.jpg \
  -o document.pdf \
  -f pdf
```

### Create GIF Animation

```bash
tsx scripts/image-tool.ts create-gif \
  -i frame1.png frame2.png frame3.png \
  -o animation.gif \
  --fps 10
```

### Extract Text (OCR)

```bash
tsx scripts/image-tool.ts ocr \
  -i document.jpg \
  --lang eng \
  --preprocess \
  -o extracted.txt
```

### Extract Text from TIFF

```bash
tsx scripts/image-tool.ts extract-text \
  -i scan.tiff \
  --lang eng \
  --preprocess \
  -o output.txt \
  --format json
```

### Add Watermark

```bash
tsx scripts/image-tool.ts watermark \
  -i photo.jpg \
  -w logo.png \
  -o watermarked.jpg \
  --position bottom-right \
  --opacity 0.7
```

### Process SVG Template

```bash
tsx scripts/image-tool.ts svg-template \
  -t badge-template.svg \
  -o badge-john.svg \
  -v '{"name":"John","score":"95"}'
```


### Workflow 1: Batch Image Optimization

Resize and compress multiple images for web:

1. **Batch convert to WebP**:
   ```bash
   tsx scripts/image-tool.ts batch-convert \
     -i photos/*.jpg \
     -o optimized/ \
     -f webp \
     -q 85
   ```

2. **Resize for web**:
   ```bash
   for img in optimized/*.webp; do
     tsx scripts/image-tool.ts resize \
       -i "$img" \
       -o "web/$(basename $img)" \
       --width 1920 \
       --fit inside
   done
   ```

3. **Strip metadata for privacy**:
   ```bash
   tsx scripts/image-tool.ts metadata \
     -i web/photo.webp \
     --strip
   ```

### Workflow 2: Create Product Animation

Generate product rotation animation:

1. **Capture frames** (or use existing sequence)

2. **Resize frames uniformly**:
   ```bash
   for i in {1..36}; do
     tsx scripts/image-tool.ts resize \
       -i "frames/product_$i.jpg" \
       -o "resized/frame_$i.png" \
       --width 800 \
       --height 800 \
       --fit contain
   done
   ```

3. **Create GIF**:
   ```bash
   tsx scripts/image-tool.ts create-gif \
     -i resized/frame_*.png \
     -o product-spin.gif \
     --fps 12 \
     --loop 0 \
     --quality 8
   ```

4. **Add watermark**:
   ```bash
   tsx scripts/image-tool.ts watermark \
     -i product-spin.gif \
     -w brand-logo.png \
     -o product-spin-branded.gif \
     --position top-right \
     --margin 20
   ```

### Workflow 3: Extract and Process Document Text

OCR multiple document pages:

1. **Extract text from sequence**:
   ```bash
   tsx scripts/image-tool.ts ocr-batch \
     -i scan_page_*.jpg \
     --lang eng \
     -o document.txt
   ```

2. **Preprocess for better accuracy**:
   ```bash
   tsx scripts/image-tool.ts ocr \
     -i low-quality-scan.jpg \
     --lang eng \
     --preprocess \
     -o extracted.txt
   ```

3. **Multi-language document**:
   ```bash
   tsx scripts/image-tool.ts ocr \
     -i multilingual.jpg \
     --lang eng+fra+spa \
     -o extracted.txt
   ```

### Workflow 4: Web Image Collection

Download and process images from website:

1. **Extract images**:
   ```bash
   tsx scripts/image-tool.ts web-extract \
     -u "https://example.com/gallery" \
     -o downloads/ \
     --min-width 500 \
     --min-height 500 \
     --max-images 50
   ```

2. **Take full-page screenshot**:
   ```bash
   tsx scripts/image-tool.ts screenshot \
     -u "https://example.com" \
     -o screenshot.png \
     --full-page
   ```

3. **Batch convert to thumbnails**:
   ```bash
   tsx scripts/image-tool.ts batch-convert \
     -i downloads/*.jpg \
     -o thumbnails/ \
     -f webp \
     -q 80
   ```

### Workflow 5: SVG Badge Generation

Generate personalized badges from template:

1. **Create template** (`badge.svg`):
   ```svg
   <svg width="200" height="100">
     <rect fill="#4CAF50" width="200" height="100"/>
     <text x="100" y="40" fill="white" text-anchor="middle">{{name}}</text>
     <text x="100" y="70" fill="white" text-anchor="middle">Score: {{score}}</text>
   </svg>
   ```

2. **Prepare data** (`users.json`):
   ```json
   [
     {"name": "Alice", "score": "95"},
     {"name": "Bob", "score": "87"},
     {"name": "Charlie", "score": "92"}
   ]
   ```

3. **Bulk generate**:
   ```bash
   tsx scripts/image-tool.ts svg-bulk \
     -t badge.svg \
     -d users.json \
     -o badges/ \
     --filename "badge_{{name}}.svg"
   ```

4. **Convert to PNG**:
   ```bash
   for svg in badges/*.svg; do
     tsx scripts/image-tool.ts convert \
       -i "$svg" \
       -o "${svg%.svg}.png" \
       -f png
   done
   ```

### Workflow 6: Color Branding Update

Update brand colors across images:

1. **Swap old brand color to new**:
   ```bash
   tsx scripts/image-tool.ts swap-colors \
     -i old-logo.png \
     -o new-logo.png \
     --from "#FF0000" \
     --to "#4CAF50" \
     --tolerance 10
   ```

2. **Batch process all branded images**:
   ```bash
   for img in branding/*.png; do
     tsx scripts/image-tool.ts swap-colors \
       -i "$img" \
       -o "updated/$(basename $img)" \
       --from "#FF0000" \
       --to "#4CAF50" \
       --tolerance 15
   done
   ```

### Workflow 7: Multi-Page PDF Creation

Create PDF document from scanned pages:

1. **Scan or collect page images**: `page_001.jpg`, `page_002.jpg`, etc.

2. **Create multi-page PDF**:
   ```bash
   tsx scripts/image-tool.ts create-pdf \
     -i page_*.jpg \
     -o document.pdf \
     --page-size A4 \
     --fit-to-page
   ```

3. **Alternative: Letter size**:
   ```bash
   tsx scripts/image-tool.ts create-pdf \
     -i scans/*.png \
     -o report.pdf \
     --page-size Letter \
     --fit-to-page
   ```

4. **Custom page size**:
   ```bash
   tsx scripts/image-tool.ts create-pdf \
     -i images/*.jpg \
     -o custom.pdf \
     --page-size 800x600
   ```

### Workflow 8: TIFF Document Processing with OCR

Process multi-page TIFF documents:

1. **Extract text from TIFF**:
   ```bash
   tsx scripts/image-tool.ts extract-text \
     -i document.tiff \
     --lang eng \
     --preprocess \
     -o document.txt
   ```

2. **Get structured JSON output**:
   ```bash
   tsx scripts/image-tool.ts extract-text \
     -i scan.tiff \
     --lang eng \
     --preprocess \
     -o data.json \
     --format json
   ```

3. **Convert TIFF to searchable PDF**:
   ```bash
   # First convert to PNG for better processing
   tsx scripts/image-tool.ts convert \
     -i document.tiff \
     -o document.png \
     -f png
   
   # Then create PDF
   tsx scripts/image-tool.ts convert \
     -i document.png \
     -o document.pdf \
     -f pdf
   ```

4. **Batch process TIFF files**:
   ```bash
   for tiff in scans/*.tiff; do
     name=$(basename "$tiff" .tiff)
     tsx scripts/image-tool.ts extract-text \
       -i "$tiff" \
       --lang eng \
       --preprocess \
       -o "text/${name}.txt"
   done
   ```


### Convert Commands

```bash
# Convert single image
tsx scripts/image-tool.ts convert \
  -i <input> -o <output> -f <format> \
  [-q <quality>] [-c <compression>] [--progressive] [--lossless]

# Batch convert
tsx scripts/image-tool.ts batch-convert \
  -i <inputs...> -o <output-dir> -f <format> \
  [-q <quality>]

# To base64
tsx scripts/image-tool.ts to-base64 \
  -i <input> [-f <format>] [-o <output>]

# From base64
tsx scripts/image-tool.ts from-base64 \
  -i <base64-file-or-string> -o <output> [-f <format>]
```

**Supported Formats:** bmp, jpg, jpeg, png, gif, webp, tiff, avif, raw, pdf, eps

**Note:** 
- PDF: Full support via pdf-lib (MIT) - creates true PDF documents
- EPS: Converts to high-quality PNG (true EPS requires Ghostscript AGPL)

### PDF Commands

```bash
# Create multi-page PDF from images
tsx scripts/image-tool.ts create-pdf \
  -i page1.jpg page2.jpg page3.jpg \
  -o document.pdf \
  [--page-size <A4|Letter|WxH>] \
  [--fit-to-page]

# Single image to PDF
tsx scripts/image-tool.ts convert \
  -i image.jpg \
  -o document.pdf \
  -f pdf
```

**Page Sizes:**
- `A4` - 595x842 points (default)
- `Letter` - 612x792 points
- `WxH` - Custom size (e.g., `800x600`)

### Animation Commands

```bash
# Create GIF
tsx scripts/image-tool.ts create-gif \
  -i <frames...> -o <output> \
  [--fps <number>] [--delay <ms>] [--loop <count>] \
  [--quality <1-20>] [--width <px>] [--height <px>]

# Create animated SVG
tsx scripts/image-tool.ts create-animated-svg \
  -i <frames...> -o <output> \
  [--fps <number>] [--loop <count>]

# Slice animation into frames
tsx scripts/image-tool.ts slice-animation \
  -i <animation.gif> -o <output-dir> \
  [-f <format>]
```

### Edit Commands

```bash
# Rotate
tsx scripts/image-tool.ts rotate \
  -i <input> -o <output> -d <degrees>

# Crop
tsx scripts/image-tool.ts crop \
  -i <input> -o <output> \
  --left <px> --top <px> --width <px> --height <px>

# Resize
tsx scripts/image-tool.ts resize \
  -i <input> -o <output> \
  [--width <px>] [--height <px>] [--fit <mode>]

# Change canvas
tsx scripts/image-tool.ts canvas \
  -i <input> -o <output> \
  --width <px> --height <px> \
  [--background <hex>] [--position <pos>]

# Compress
tsx scripts/image-tool.ts compress \
  -i <input> -o <output> [-q <quality>]

# Watermark
tsx scripts/image-tool.ts watermark \
  -i <input> -w <watermark> -o <output> \
  [--position <pos>] [--opacity <0-1>] [--margin <px>]

# Swap colors
tsx scripts/image-tool.ts swap-colors \
  -i <input> -o <output> \
  --from <hex> --to <hex> [--tolerance <0-100>]
```

**Resize Fit Modes:** cover, contain, fill, inside, outside  
**Watermark Positions:** top-left, top-right, bottom-left, bottom-right, center

### Metadata Commands

```bash
# Extract metadata
tsx scripts/image-tool.ts metadata \
  -i <input> [-o <output.json>]
```

**Extracted Fields:** format, dimensions, color space, channels, depth, density, EXIF, IPTC, XMP, ICC

### OCR Commands

```bash
# Extract text from any image format
tsx scripts/image-tool.ts ocr \
  -i <input> [--lang <code>] [--preprocess] [-o <output.txt>]

# Extract text with detailed JSON output
tsx scripts/image-tool.ts extract-text \
  -i <input> [--lang <code>] [--preprocess] \
  [-o <output>] [--format <txt|json>]

# Batch OCR
tsx scripts/image-tool.ts ocr-batch \
  -i <inputs...> [--lang <code>] [-o <output.txt>]
```

**Supported Input Formats:** BMP, JPG, PNG, GIF, WebP, TIFF (TIF), AVIF, PDF

**Output Formats:**
- `txt` - Plain text (default)
- `json` - Structured JSON with confidence, word positions, blocks

**Languages:** eng, spa, fra, deu, ita, por, rus, chi_sim, chi_tra, jpn, kor, ara, hin

### Web Extraction Commands

```bash
# Extract images from website
tsx scripts/image-tool.ts web-extract \
  -u <url> -o <output-dir> \
  [--min-width <px>] [--min-height <px>] \
  [--max-images <count>] [--backgrounds]

# Screenshot webpage
tsx scripts/image-tool.ts screenshot \
  -u <url> -o <output> \
  [--full-page] [--width <px>] [--height <px>]
```

### SVG Template Commands

```bash
# Process template
tsx scripts/image-tool.ts svg-template \
  -t <template.svg> -o <output.svg> \
  [-v <json>] [-f <vars.json>]

# Bulk process
tsx scripts/image-tool.ts svg-bulk \
  -t <template.svg> -d <data.json> -o <output-dir> \
  [--filename <template>]

# Extract variables
tsx scripts/image-tool.ts svg-extract-vars \
  -t <template.svg>
```

## Module Integration

All modules are exportable for use in other skills:

```typescript
// Import specific modules
import { converter } from '.github/skills/ailey-tools-image/lib/converter.js';
import { editor } from '.github/skills/ailey-tools-image/lib/editor.js';
import { ocr } from '.github/skills/ailey-tools-image/lib/ocr.js';

// Example: Convert and resize
await converter.convert('input.jpg', 'temp.png', 'png');
await editor.resize('temp.png', 'output.png', { width: 800 });

// Example: Extract text
const result = await ocr.extractText('document.jpg', { 
  lang: 'eng',
  preprocess: true 
});
console.log(result.text);
```

**Available Modules:**
- [lib/converter.ts](lib/converter.ts) - Format conversion, base64
- [lib/animator.ts](lib/animator.ts) - Animation creation/slicing
- [lib/editor.ts](lib/editor.ts) - Image editing operations
- [lib/metadata.ts](lib/metadata.ts) - Metadata extraction/updates
- [lib/ocr.ts](lib/ocr.ts) - Text extraction
- [lib/web-extractor.ts](lib/web-extractor.ts) - Web image downloads
- [lib/svg-template.ts](lib/svg-template.ts) - SVG templating

## License Compliance

All dependencies use permissive open-source licenses:

**MIT Licensed:**
- **jimp** (MIT) - Alternative image processing
- **gif-encoder-2** (MIT) - GIF creation
- **omggif** (MIT) - GIF parsing
- **pdf-lib** (MIT) - PDF creation and manipulation
- **pdfkit** (MIT) - PDF generation
- **commander** (MIT) - CLI framework

**Apache 2.0 Licensed:**
- **sharp** (Apache 2.0) - High-performance image processing
- **tesseract.js** (Apache 2.0) - OCR engine
- **puppeteer** (Apache 2.0) - Web automation

**Note:** Apache 2.0 is permissive and commercially friendly. For strict MIT/CC0 requirements, consider alternatives for sharp, tesseract.js, and puppeteer.

## Performance Considerations

**Optimization Tips:**
- Use WebP format for best compression/quality ratio
- Set appropriate quality levels (80-90 for most use cases)
- Resize images before other operations for faster processing
- Use batch operations when processing multiple images
- Enable preprocessing for OCR only when needed
- Close web extractor after operations to free resources

**Typical Performance:**
- Convert: 50-200ms per image
- Resize: 30-100ms per image
- OCR: 500-2000ms per image
- GIF creation: 100-500ms for 10-frame animation
- Web extract: 2-10 seconds depending on page

## Error Handling

The tool provides clear error messages:

```bash
❌ Conversion failed: Unsupported format: xyz
❌ OCR failed: Language 'xyz' not found
❌ Web extraction failed: Network timeout
❌ SVG template processing failed: Variable 'name' not found
```

## Resources

- **CLI Script**: [scripts/image-tool.ts](scripts/image-tool.ts) - Main command-line interface
- **Library Modules**: [lib/](lib/) - Reusable TypeScript modules
- **References**: [references/](references/) - Format specs, OCR guides, templating docs

## Related Skills

- **ailey-tools-data-converter**: Schema and data format conversions
- **ailey-pdf-converter**: PDF to image conversion
- **ailey-video**: Video frame extraction and processing

---

**Version**: 1.0.0  
**Created**: 2026-01-29  
**Score**: 4.5

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.2
---