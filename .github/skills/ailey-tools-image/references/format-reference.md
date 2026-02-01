# Image Format Reference

## Supported Formats

### Raster Formats

**BMP (Bitmap)**
- **Extension**: `.bmp`
- **Type**: Lossless, uncompressed
- **Best For**: Windows applications, simple graphics
- **Limitations**: Large file sizes
- **Color Depth**: 1, 4, 8, 16, 24, 32-bit

**JPEG/JPG (Joint Photographic Experts Group)**
- **Extension**: `.jpg`, `.jpeg`
- **Type**: Lossy compression
- **Best For**: Photographs, complex images
- **Quality Range**: 1-100 (recommended: 80-95)
- **Features**: Progressive rendering support
- **Limitations**: No transparency, lossy

**PNG (Portable Network Graphics)**
- **Extension**: `.png`
- **Type**: Lossless compression
- **Best For**: Graphics with transparency, screenshots
- **Features**: Alpha channel, lossless
- **Color Depth**: 8-bit, 16-bit
- **Compression**: 0-9 (9 = best compression)

**GIF (Graphics Interchange Format)**
- **Extension**: `.gif`
- **Type**: Lossless, indexed color
- **Best For**: Simple animations, logos
- **Features**: Animation, transparency (binary)
- **Limitations**: 256 colors max
- **Animation**: Frame delays, loop control

**WebP**
- **Extension**: `.webp`
- **Type**: Lossy or lossless
- **Best For**: Web optimization
- **Features**: Alpha channel, animation, smaller sizes
- **Quality**: 1-100
- **Browser Support**: Modern browsers

**TIFF (Tagged Image File Format)**
- **Extension**: `.tiff`, `.tif`
- **Type**: Lossless or lossy
- **Best For**: Professional photography, printing, document archival
- **Features**: Multi-page support, multiple compression schemes, high quality
- **Color Depth**: Up to 16-bit per channel
- **Compression**: None, LZW, ZIP, JPEG, PackBits
- **OCR Support**: Excellent - commonly used for scanned documents
- **Multi-Page**: Supports multiple images in one file

**AVIF (AV1 Image File Format)**
- **Extension**: `.avif`
- **Type**: Lossy or lossless
- **Best For**: Next-gen web images
- **Features**: Superior compression, HDR support
- **Browser Support**: Modern browsers (2021+)

**RAW**
- **Extension**: `.raw`, various proprietary
- **Type**: Uncompressed sensor data
- **Best For**: Professional photography
- **Features**: Maximum editing flexibility
- **Note**: Format-specific processing required

**PDF (Portable Document Format)**
- **Extension**: `.pdf`
- **Type**: Document format, can contain raster/vector
- **Best For**: Documents, multi-page layouts
- **Features**: Multi-page, text, images, vector graphics
- **Libraries**: pdf-lib (manipulation), pdfkit (generation)
- **Support**: Full PDF creation from images, multi-page documents
- **Note**: Uses pdf-lib (MIT) for true PDF output

### Vector Formats

**EPS (Encapsulated PostScript)**
- **Extension**: `.eps`
- **Type**: Vector, PostScript-based
- **Best For**: Print graphics, logos
- **Features**: Scalable, professional print
- **Limitations**: Requires PostScript interpreter
- **Note**: Tool outputs high-quality PNG for EPS conversion

**SVG (Scalable Vector Graphics)**
- **Extension**: `.svg`
- **Type**: Vector, XML-based
- **Best For**: Logos, icons, scalable graphics
- **Features**: Infinite scaling, text editing, CSS styling
- **Animation**: Native animation support

## Format Conversion Matrix

| From/To | BMP | JPG | PNG | GIF | WebP | TIFF | AVIF | PDF | EPS | SVG |
|---------|-----|-----|-----|-----|------|------|------|-----|-----|-----|
| BMP     | -   | ✅  | ✅  | ✅  | ✅   | ✅   | ✅   | ⚠️  | ⚠️  | ❌  |
| JPG     | ✅  | -   | ✅  | ✅  | ✅   | ✅   | ✅   | ⚠️  | ⚠️  | ❌  |
| PNG     | ✅  | ✅  | -   | ✅  | ✅   | ✅   | ✅   | ⚠️  | ⚠️  | ❌  |
| GIF     | ✅  | ✅  | ✅  | -   | ✅   | ✅   | ✅   | ⚠️  | ⚠️  | ❌  |
| WebP    | ✅  | ✅  | ✅  | ✅  | -    | ✅   | ✅   | ⚠️  | ⚠️  | ❌  |
| TIFF    | ✅  | ✅  | ✅  | ✅  | ✅   | -    | ✅   | ⚠️  | ⚠️  | ❌  |
| AVIF    | ✅  | ✅  | ✅  | ✅  | ✅   | ✅   | -    | ⚠️  | ⚠️  | ❌  |
| PDF     | ✅  | ✅  | ✅  | ✅  | ✅   | ✅   | ✅   | -   | ⚠️  | ❌  |
| EPS     | ✅  | ✅  | ✅  | ✅  | ✅   | ✅   | ✅   | ⚠️  | -   | ❌  |
| SVG     | ✅  | ✅  | ✅  | ✅  | ✅   | ✅   | ✅   | ⚠️  | ⚠️  | -   |

**Legend:**
- ✅ Fully supported
- ⚠️ Partial support (converts to high-quality PNG)
- ❌ Not supported

*Notes:*
- *SVG to raster conversion requires rendering*
- *PDF/EPS output creates high-quality PNG (use specialized tools for true vector output)*
- *PDF/EPS input requires external libraries or ImageMagick*

## Recommended Settings

### Web Optimization

**Hero Images:**
- Format: WebP or AVIF (fallback: JPEG)
- Quality: 85-90
- Max Width: 1920px

**Thumbnails:**
- Format: WebP
- Quality: 75-80
- Dimensions: 300x300px or smaller

**Icons/Logos:**
- Format: SVG (preferred) or PNG
- PNG: 24-bit with alpha

**Product Photos:**
- Format: WebP or JPEG
- Quality: 85-90
- Progressive: enabled

### Print

**High Quality:**
- Format: TIFF or PNG
- Color Depth: 16-bit
- DPI: 300

**Standard:**
- Format: JPEG or PNG
- Quality: 95-100
- DPI: 150-300

### Archival

**Long-term Storage:**
- Format: PNG or TIFF
- Compression: Lossless
- Metadata: Preserved

## File Size Comparison

Example: 1920x1080 photograph

| Format | Size    | Quality | Notes                    |
|--------|---------|---------|--------------------------|
| BMP    | 6.2 MB  | Lossless| Uncompressed             |
| PNG    | 2.1 MB  | Lossless| Compressed               |
| JPEG   | 450 KB  | Q:90    | Good quality             |
| JPEG   | 180 KB  | Q:75    | Acceptable quality       |
| WebP   | 320 KB  | Q:90    | Better than JPEG         |
| WebP   | 1.8 MB  | Lossless| Better than PNG          |
| AVIF   | 220 KB  | Q:90    | Best compression         |
| GIF    | 1.5 MB  | 256 col | Not suitable for photos  |
| PDF    | Varies  | -       | Document format          |
| EPS    | Varies  | Vector  | Print format             |

## Metadata Support

| Format | EXIF | IPTC | XMP | ICC |
|--------|------|------|-----|-----|
| JPEG   | ✅   | ✅   | ✅  | ✅  |
| PNG    | ✅   | ❌   | ✅  | ✅  |
| TIFF   | ✅   | ✅   | ✅  | ✅  |
| WebP   | ✅   | ❌   | ✅  | ✅  |
| GIF    | ❌   | ❌   | ❌  | ❌  |
| BMP    | ❌   | ❌   | ❌  | ❌  |

## Browser Support

| Format | Chrome | Firefox | Safari | Edge |
|--------|--------|---------|--------|------|
| JPEG   | ✅     | ✅      | ✅     | ✅   |
| PNG    | ✅     | ✅      | ✅     | ✅   |
| GIF    | ✅     | ✅      | ✅     | ✅   |
| WebP   | ✅     | ✅      | ✅     | ✅   |
| AVIF   | ✅     | ✅      | ✅     | ✅   |
| SVG    | ✅     | ✅      | ✅     | ✅   |
| TIFF   | ❌     | ❌      | ❌     | ❌   |
