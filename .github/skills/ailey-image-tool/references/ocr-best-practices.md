# OCR Best Practices

## Optimizing Images for OCR

### Image Quality Requirements

**Resolution:**
- Minimum: 200 DPI
- Recommended: 300 DPI
- For small text: 400-600 DPI

**Contrast:**
- High contrast between text and background
- Black text on white background (ideal)
- Avoid low-contrast color combinations

**Image Format:**
- Preferred: PNG (lossless)
- Acceptable: High-quality JPEG (Q:95+)
- Avoid: Heavily compressed images

### Preprocessing Techniques

**When to Preprocess:**
- Low contrast images
- Noisy or grainy scans
- Skewed or rotated text
- Poor lighting conditions

**Preprocessing Steps:**
1. **Grayscale Conversion**: Simplifies processing
2. **Normalization**: Adjusts contrast uniformly
3. **Sharpening**: Enhances edge definition
4. **Thresholding**: Creates binary (black/white) image

**CLI Example:**
```bash
tsx scripts/image-tool.ts ocr \
  -i low-quality-scan.jpg \
  --lang eng \
  --preprocess \
  -o output.txt
```

## Language Selection

### Supported Languages

**Western European:**
- `eng` - English
- `fra` - French
- `spa` - Spanish
- `deu` - German
- `ita` - Italian
- `por` - Portuguese

**Eastern European:**
- `rus` - Russian
- `pol` - Polish
- `ukr` - Ukrainian

**Asian:**
- `chi_sim` - Chinese Simplified
- `chi_tra` - Chinese Traditional
- `jpn` - Japanese
- `kor` - Korean

**Middle Eastern:**
- `ara` - Arabic
- `heb` - Hebrew

**South Asian:**
- `hin` - Hindi
- `ben` - Bengali

### Multi-Language Documents

Combine language codes with `+`:

```bash
tsx scripts/image-tool.ts ocr \
  -i multilingual.jpg \
  --lang eng+fra+spa \
  -o output.txt
```

## Page Segmentation Modes (PSM)

Configure with `--psm` option:

| PSM | Mode | Use Case |
|-----|------|----------|
| 0 | OSD only | Orientation detection |
| 1 | Auto with OSD | Automatic with orientation |
| 3 | Auto | Default, fully automatic |
| 4 | Single column | Newspaper column |
| 5 | Single vertical block | Asian vertical text |
| 6 | Single uniform block | Clean document page |
| 7 | Single text line | OCR a single line |
| 8 | Single word | OCR a single word |
| 9 | Single word (circle) | Word in circular layout |
| 10 | Single character | OCR individual character |
| 11 | Sparse text | Find text anywhere |
| 12 | Sparse with OSD | Sparse + orientation |
| 13 | Raw line | Bypass layout analysis |

**Example:**
```bash
tsx scripts/image-tool.ts ocr \
  -i single-line.jpg \
  --lang eng \
  --psm 7 \
  -o output.txt
```

## OCR Engine Modes (OEM)

| OEM | Engine | Description |
|-----|--------|-------------|
| 0 | Legacy | Original Tesseract engine |
| 1 | LSTM | Neural network (default, best) |
| 2 | Legacy + LSTM | Combined engines |
| 3 | Default | Based on language |

## Character Whitelisting/Blacklisting

**Whitelist** - Only recognize specific characters:
```bash
tsx scripts/image-tool.ts ocr \
  -i numbers-only.jpg \
  --whitelist "0123456789" \
  -o output.txt
```

**Blacklist** - Ignore specific characters:
```bash
tsx scripts/image-tool.ts ocr \
  -i text.jpg \
  --blacklist "@#$%" \
  -o output.txt
```

## Handling Different Document Types

### Printed Documents

**Characteristics:**
- Clean, uniform text
- Standard fonts
- High contrast

**Settings:**
- PSM: 3 (Auto) or 6 (Single block)
- Preprocess: Usually not needed
- DPI: 300

**Example:**
```bash
tsx scripts/image-tool.ts ocr \
  -i printed-page.jpg \
  --lang eng \
  --psm 6 \
  -o output.txt
```

### Handwritten Documents

**Challenges:**
- Variable letter shapes
- Inconsistent spacing
- Lower accuracy

**Tips:**
- Use highest possible DPI (400-600)
- Preprocess for contrast
- Consider specialized models
- Expect lower accuracy

### Screenshots

**Settings:**
- PSM: 11 (Sparse text)
- No preprocessing needed
- Original resolution usually sufficient

**Example:**
```bash
tsx scripts/image-tool.ts ocr \
  -i screenshot.png \
  --lang eng \
  --psm 11 \
  -o output.txt
```

### Receipts/Invoices

**Characteristics:**
- Mixed fonts and sizes
- Tables and structured data
- Variable quality

**Settings:**
- PSM: 6 (Single block) or 11 (Sparse)
- Preprocess if low quality
- Consider cropping to sections

### TIFF Documents

**Characteristics:**
- High quality scans
- Often multi-page
- Various compression schemes
- Professional document format

**Settings:**
- PSM: 6 (Single block) or 3 (Auto)
- Preprocessing: Usually not needed for quality scans
- DPI: Often pre-scanned at 300+

**Batch Example:**
```bash
for tiff in documents/*.tiff; do
  name=$(basename "$tiff" .tiff)
  tsx scripts/image-tool.ts extract-text \
    -i "$tiff" \
    --lang eng \
    -o "text/${name}.txt" \
    --format json
done
```

**Multi-Page TIFF:**
```bash
# Extract text from all pages
tsx scripts/image-tool.ts ocr \
  -i multipage.tiff \
  --lang eng \
  -o all-pages.txt
```

### Book Pages

**Characteristics:**
- Multi-column layout
- Headers, footers, page numbers
- Consistent formatting

**Settings:**
- PSM: 1 (Auto with OSD) for layout detection
- Process even/odd pages separately if needed

**Batch Example:**
```bash
tsx scripts/image-tool.ts ocr-batch \
  -i page_*.jpg \
  --lang eng \
  -o book.txt
```

## Confidence Scoring

**Interpretation:**
- **90-100%**: Excellent, very reliable
- **80-90%**: Good, mostly accurate
- **70-80%**: Fair, review recommended
- **Below 70%**: Poor, verification required

**Improving Confidence:**
1. Increase image resolution
2. Improve contrast
3. Apply preprocessing
4. Use correct language model
5. Select appropriate PSM mode

## Performance Optimization

**Speed vs. Accuracy:**
- OEM 1 (LSTM): Slower but more accurate
- OEM 0 (Legacy): Faster but less accurate

**Large Documents:**
- Process pages in parallel
- Use batch processing
- Consider page cropping

**Real-time OCR:**
- Use PSM 7 or 8 for specific targets
- Reduce image resolution if acceptable
- Consider character whitelisting

## Common Issues and Solutions

### Issue: Low Confidence Scores

**Solutions:**
- Increase DPI to 300+
- Apply preprocessing
- Check language selection
- Verify image isn't skewed

### Issue: Missing Text

**Solutions:**
- Change PSM mode
- Try PSM 11 (Sparse text)
- Check image quality

### Issue: Garbled Output

**Solutions:**
- Verify correct language
- Check character encoding
- Apply preprocessing
- Increase contrast

### Issue: Slow Processing

**Solutions:**
- Reduce image size
- Use appropriate PSM mode
- Process in batches
- Consider using legacy engine (OEM 0)

## Example Workflows

### High-Quality Scanned Document

```bash
tsx scripts/image-tool.ts ocr \
  -i scan.tiff \
  --lang eng \
  -o output.txt
```

### Poor Quality Photo of Text

```bash
tsx scripts/image-tool.ts ocr \
  -i photo.jpg \
  --lang eng \
  --preprocess \
  --psm 6 \
  -o output.txt
```

### Multi-Page Book

```bash
tsx scripts/image-tool.ts ocr-batch \
  -i book_page_*.jpg \
  --lang eng \
  -o complete-book.txt
```

### Receipt with Numbers

```bash
tsx scripts/image-tool.ts ocr \
  -i receipt.jpg \
  --lang eng \
  --preprocess \
  --psm 11 \
  -o receipt.txt
```
