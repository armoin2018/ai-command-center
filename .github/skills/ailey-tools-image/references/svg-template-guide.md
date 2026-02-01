# SVG Template Guide

## Template Syntax

SVG templates use mustache-style `{{Variable}}` placeholders for dynamic content replacement.

### Basic Template

```svg
<svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
  <rect fill="{{backgroundColor}}" width="200" height="100"/>
  <text x="100" y="50" fill="{{textColor}}" text-anchor="middle">
    {{message}}
  </text>
</svg>
```

### Variable Types

**Text Content:**
```svg
<text>{{userName}}</text>
```

**Attributes:**
```svg
<rect fill="{{color}}" width="{{width}}" height="{{height}}"/>
```

**Styles:**
```svg
<circle style="fill:{{fillColor}};stroke:{{strokeColor}};"/>
```

**Paths:**
```svg
<path d="{{pathData}}"/>
```

## Processing Templates

### Single Template

**Template file** (`badge.svg`):
```svg
<svg width="200" height="80">
  <rect fill="#4CAF50" width="200" height="80" rx="5"/>
  <text x="100" y="30" fill="white" text-anchor="middle" font-size="20">
    {{name}}
  </text>
  <text x="100" y="55" fill="white" text-anchor="middle" font-size="14">
    Score: {{score}}
  </text>
</svg>
```

**Process with inline JSON:**
```bash
tsx scripts/image-tool.ts svg-template \
  -t badge.svg \
  -o john-badge.svg \
  -v '{"name":"John Doe","score":"95"}'
```

**Process with JSON file** (`john.json`):
```json
{
  "name": "John Doe",
  "score": "95"
}
```

```bash
tsx scripts/image-tool.ts svg-template \
  -t badge.svg \
  -o john-badge.svg \
  -f john.json
```

### Bulk Processing

**Data file** (`users.json`):
```json
[
  {"name": "Alice", "score": "95", "color": "#4CAF50"},
  {"name": "Bob", "score": "87", "color": "#2196F3"},
  {"name": "Charlie", "score": "92", "color": "#FF9800"}
]
```

**Process all at once:**
```bash
tsx scripts/image-tool.ts svg-bulk \
  -t badge.svg \
  -d users.json \
  -o badges/ \
  --filename "badge_{{name}}.svg"
```

**Output:**
- `badges/badge_Alice.svg`
- `badges/badge_Bob.svg`
- `badges/badge_Charlie.svg`

## Advanced Techniques

### Dynamic Filenames

Use variables in filename template:

```bash
tsx scripts/image-tool.ts svg-bulk \
  -t certificate.svg \
  -d graduates.json \
  -o certificates/ \
  --filename "{{year}}_{{id}}_{{lastName}}.svg"
```

### Index Variable

The `{{index}}` variable is automatically available:

```bash
tsx scripts/image-tool.ts svg-bulk \
  -t item.svg \
  -d data.json \
  -o output/ \
  --filename "item_{{index}}.svg"
```

Generates: `item_1.svg`, `item_2.svg`, `item_3.svg`, ...

### Nested Properties

Access nested JSON properties with dot notation:

**Data:**
```json
{
  "user": {
    "name": "John",
    "email": "john@example.com"
  },
  "score": 95
}
```

**Template:**
```svg
<text>{{user.name}}</text>
<text>{{user.email}}</text>
```

### Conditional Content

Use empty string for optional elements:

**Data:**
```json
{
  "title": "Winner",
  "subtitle": "",
  "name": "John"
}
```

**Template:**
```svg
<text y="20">{{title}}</text>
<text y="40">{{subtitle}}</text>  <!-- Will be empty -->
<text y="60">{{name}}</text>
```

## Variable Extraction

Discover what variables a template requires:

```bash
tsx scripts/image-tool.ts svg-extract-vars \
  -t complex-template.svg
```

**Output:**
```
Template variables:
  - {{name}}
  - {{title}}
  - {{date}}
  - {{backgroundColor}}
  - {{logoUrl}}
```

## Use Cases

### 1. Personalized Badges

**Template** (`event-badge.svg`):
```svg
<svg width="300" height="200">
  <rect fill="{{themeColor}}" width="300" height="200" rx="10"/>
  <text x="150" y="60" fill="white" text-anchor="middle" font-size="24">
    {{eventName}}
  </text>
  <text x="150" y="110" fill="white" text-anchor="middle" font-size="32" font-weight="bold">
    {{attendeeName}}
  </text>
  <text x="150" y="150" fill="white" text-anchor="middle" font-size="16">
    {{role}}
  </text>
</svg>
```

### 2. Certificates

**Template** (`certificate.svg`):
```svg
<svg width="800" height="600">
  <!-- Border -->
  <rect fill="none" stroke="#DAA520" stroke-width="5" width="790" height="590" x="5" y="5"/>
  
  <!-- Title -->
  <text x="400" y="100" fill="#000" text-anchor="middle" font-size="48" font-family="serif">
    Certificate of {{achievementType}}
  </text>
  
  <!-- Recipient -->
  <text x="400" y="250" fill="#000" text-anchor="middle" font-size="32">
    Presented to
  </text>
  <text x="400" y="300" fill="#000" text-anchor="middle" font-size="40" font-weight="bold">
    {{recipientName}}
  </text>
  
  <!-- Details -->
  <text x="400" y="380" fill="#000" text-anchor="middle" font-size="20">
    for {{description}}
  </text>
  
  <!-- Date -->
  <text x="400" y="500" fill="#666" text-anchor="middle" font-size="16">
    Date: {{date}}
  </text>
</svg>
```

### 3. Social Media Graphics

**Template** (`social-post.svg`):
```svg
<svg width="1200" height="630">
  <!-- Background -->
  <rect fill="{{brandColor}}" width="1200" height="630"/>
  
  <!-- Quote -->
  <text x="600" y="250" fill="white" text-anchor="middle" font-size="48" font-style="italic">
    "{{quote}}"
  </text>
  
  <!-- Author -->
  <text x="600" y="400" fill="white" text-anchor="middle" font-size="28">
    — {{author}}
  </text>
  
  <!-- Hashtag -->
  <text x="600" y="550" fill="white" text-anchor="middle" font-size="20">
    {{hashtag}}
  </text>
</svg>
```

### 4. Data Visualizations

**Template** (`bar-chart.svg`):
```svg
<svg width="400" height="300">
  <!-- Title -->
  <text x="200" y="30" text-anchor="middle" font-size="20">{{chartTitle}}</text>
  
  <!-- Bar -->
  <rect x="50" y="{{barY}}" width="300" height="{{barHeight}}" fill="{{barColor}}"/>
  
  <!-- Label -->
  <text x="200" y="{{labelY}}" text-anchor="middle">{{value}}{{unit}}</text>
</svg>
```

### 5. Product Labels

**Template** (`product-label.svg`):
```svg
<svg width="250" height="150">
  <!-- Product Name -->
  <text x="125" y="40" text-anchor="middle" font-size="24" font-weight="bold">
    {{productName}}
  </text>
  
  <!-- SKU -->
  <text x="125" y="70" text-anchor="middle" font-size="12" fill="#666">
    SKU: {{sku}}
  </text>
  
  <!-- Price -->
  <text x="125" y="110" text-anchor="middle" font-size="32" fill="#E91E63">
    ${{price}}
  </text>
  
  <!-- Barcode placeholder -->
  <rect x="75" y="120" width="100" height="20" fill="white" stroke="black"/>
  <text x="125" y="145" text-anchor="middle" font-size="10">{{barcode}}</text>
</svg>
```

## Best Practices

### Variable Naming

**Use descriptive names:**
- ✅ `{{userName}}`, `{{eventDate}}`, `{{backgroundColor}}`
- ❌ `{{v1}}`, `{{x}}`, `{{temp}}`

**Follow conventions:**
- camelCase: `{{firstName}}`, `{{totalScore}}`
- snake_case: `{{first_name}}`, `{{total_score}}`

### Template Organization

**Group related variables:**
```svg
<!-- User Info -->
{{userName}}
{{userEmail}}
{{userRole}}

<!-- Styling -->
{{primaryColor}}
{{secondaryColor}}
{{fontSize}}
```

### Color Management

**Use consistent color variables:**
```svg
<defs>
  <style>
    .primary { fill: {{primaryColor}}; }
    .secondary { fill: {{secondaryColor}}; }
    .text { fill: {{textColor}}; }
  </style>
</defs>
```

### Responsive Sizing

**Make dimensions variable:**
```svg
<svg width="{{width}}" height="{{height}}" viewBox="0 0 {{width}} {{height}}">
```

### Default Values

**Provide fallbacks in data:**
```json
{
  "name": "John Doe",
  "title": "Participant",
  "subtitle": "",
  "themeColor": "#4CAF50"
}
```

## Validation

Check template before processing:

```bash
# Extract variables
tsx scripts/image-tool.ts svg-extract-vars -t template.svg

# Compare with your data structure
```

**Ensure:**
- All required variables are in data
- Variable names match exactly (case-sensitive)
- No typos in variable names

## Converting to Raster

After generating SVGs, convert to PNG/JPG:

```bash
# Single file
tsx scripts/image-tool.ts convert \
  -i badge.svg \
  -o badge.png \
  -f png \
  -q 95

# Batch convert
for svg in output/*.svg; do
  tsx scripts/image-tool.ts convert \
    -i "$svg" \
    -o "${svg%.svg}.png" \
    -f png
done
```

## Integration Examples

### With CSV Data

Convert CSV to JSON first:

```bash
# Using ailey-tools-data-converter
tsx .github/skills/ailey-tools-data-converter/scripts/convert.ts \
  -i users.csv \
  -o users.json \
  -f json
  
# Then process templates
tsx scripts/image-tool.ts svg-bulk \
  -t badge.svg \
  -d users.json \
  -o badges/
```

### With API Data

Fetch data and generate:

```bash
# Fetch data
curl https://api.example.com/users > users.json

# Generate graphics
tsx scripts/image-tool.ts svg-bulk \
  -t user-card.svg \
  -d users.json \
  -o cards/
```

## Troubleshooting

### Missing Variables

**Error:** `Variable 'xyz' not found in data`

**Solution:**
1. Extract variables: `svg-extract-vars -t template.svg`
2. Compare with data file
3. Add missing variables or remove from template

### Encoding Issues

**Problem:** Special characters not rendering

**Solution:**
- Ensure JSON is UTF-8 encoded
- Use HTML entities if needed: `&amp;`, `&lt;`, `&gt;`

### File Not Found

**Problem:** Template or data file not found

**Solution:**
- Use absolute paths or relative to current directory
- Check file permissions
- Verify file extensions match
