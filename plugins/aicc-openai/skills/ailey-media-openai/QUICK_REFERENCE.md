# OpenAI Quick Reference

Command reference and workflows for DALL-E 3 and Sora AI generation.

## Installation

```bash
npm install
node install.cjs
```

## CLI Commands

### Setup

```bash
# Interactive setup wizard
npm run setup

# Detect account tier
npm run detect

# Run diagnostics
npm run diagnose
```

### Image Generation (DALL-E 3)

```bash
# Basic generation
npm run generate -- --prompt "Your prompt here"

# HD quality
npm run generate -- \
  --prompt "Cinematic landscape" \
  --quality hd \
  --style vivid

# Specific sizes
npm run generate -- --prompt "Portrait" --size 1024x1792  # Portrait
npm run generate -- --prompt "Landscape" --size 1792x1024  # Landscape
npm run generate -- --prompt "Square" --size 1024x1024     # Square

# Natural style
npm run generate -- \
  --prompt "Realistic portrait" \
  --style natural \
  --quality hd

# Custom output
npm run generate -- \
  --prompt "Logo design" \
  --output my-logo.png
```

### Image Editing (DALL-E 2)

```bash
# Edit with transparent mask
npm run edit -- \
  --image original.png \
  --mask mask.png \
  --prompt "Add sunset sky"

# Different sizes
npm run edit -- \
  --image photo.png \
  --mask mask.png \
  --prompt "Change background" \
  --size 512x512
```

**Mask Requirements:**
- PNG format with transparency
- Transparent areas = regions to edit
- Opaque areas = regions to preserve

### Image Variations (DALL-E 2)

```bash
# Create 3 variations
npm run variation -- --image photo.png --count 3

# Single variation
npm run variation -- --image photo.png --count 1

# Different size
npm run variation -- \
  --image photo.png \
  --size 512x512 \
  --count 5
```

### Video Generation (Sora - Tier 4+)

```bash
# Basic 5-second video
npm run video -- --prompt "Flying through clouds"

# 10-second HD
npm run video -- \
  --prompt "Ocean waves crashing" \
  --duration 10 \
  --resolution 1920x1080

# Vertical for mobile
npm run video -- \
  --prompt "City nightlife" \
  --duration 5 \
  --resolution 1080x1920

# High FPS
npm run video -- \
  --prompt "Fast action scene" \
  --duration 5 \
  --fps 60
```

### History & Costs

```bash
# View recent history
npm run history

# Last 50 records
npm run history -- --limit 50

# Total costs shown at top
```

## TypeScript API

### Basic Usage

```typescript
import { OpenAIClient } from './src/index';

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!,
  organizationId: process.env.OPENAI_ORG_ID,
  outputDir: './output'
});
```

### Account Detection

```typescript
const tier = await client.detectAccountTier();

console.log(tier.tier);          // "Tier 1", "Tier 4", etc.
console.log(tier.rateLimit);     // 5, 15, 50, etc.
console.log(tier.dailyLimit);    // 500, 5000, 10000, etc.
console.log(tier.soraAccess);    // true for Tier 4+
console.log(tier.features);      // Array of available features
```

### Image Generation

```typescript
// DALL-E 3 - HD quality
const result = await client.generateImage({
  prompt: 'A futuristic cityscape at night',
  model: 'dall-e-3',
  size: '1792x1024',
  quality: 'hd',
  style: 'vivid'
});

// Access results
result.images[0].url               // URL (if hosted)
result.images[0].b64_json          // Base64 data
result.images[0].revisedPrompt     // DALL-E 3's interpretation

// Save to file
const path = await client.saveOutput(
  result.images[0].b64_json!,
  'output.png'
);
```

### Image Editing

```typescript
const edited = await client.editImage({
  image: './photo.png',           // Path or Buffer
  mask: './mask.png',             // Transparent PNG
  prompt: 'Add cherry blossoms',
  size: '1024x1024'
});

await client.saveOutput(edited.images[0].b64_json!, 'edited.png');
```

### Image Variations

```typescript
const variations = await client.createVariation({
  image: './photo.png',
  n: 3,
  size: '1024x1024'
});

// Save all variations
for (let i = 0; i < variations.images.length; i++) {
  await client.saveOutput(
    variations.images[i].b64_json!,
    `variation-${i + 1}.png`
  );
}
```

### Video Generation

```typescript
const video = await client.generateVideo({
  prompt: 'Sunset over mountains with moving clouds',
  duration: 10,
  resolution: '1920x1080',
  fps: 30,
  style: 'cinematic'
});

await client.saveOutput(video.video, 'output.mp4');
```

### Cost Tracking

```typescript
// Estimate before generating
const cost = client.estimateCost('image', {
  model: 'dall-e-3',
  size: '1792x1024',
  quality: 'hd',
  n: 1
});
console.log(`Will cost: $${cost.toFixed(3)}`);

// Get total costs
const total = client.getTotalCost();
console.log(`Total spent: $${total.toFixed(2)}`);

// View history
const history = await client.getGenerationHistory(20);
history.forEach(record => {
  console.log(`${record.type}: ${record.prompt} - $${record.cost}`);
});
```

## Workflows

### Workflow 1: Marketing Hero Image

```typescript
// Generate HD landscape
const hero = await client.generateImage({
  prompt: 'Modern tech workspace with natural lighting',
  model: 'dall-e-3',
  size: '1792x1024',
  quality: 'hd',
  style: 'vivid'
});

await client.saveOutput(hero.images[0].b64_json!, 'hero.png');

// Create variations
const variations = await client.createVariation({
  image: 'hero.png',
  n: 3
});

// Estimate total cost
const totalCost = 
  client.estimateCost('image', { model: 'dall-e-3', size: '1792x1024', quality: 'hd', n: 1 }) +
  client.estimateCost('variation', { n: 3 });

console.log(`Total cost: $${totalCost.toFixed(3)}`);
```

### Workflow 2: Social Media Set

```typescript
const prompts = [
  { size: '1024x1024', desc: 'instagram' },
  { size: '1024x1792', desc: 'story' },
  { size: '1792x1024', desc: 'cover' }
];

const basePrompt = 'Coffee latte art in minimalist cafe';

for (const { size, desc } of prompts) {
  const result = await client.generateImage({
    prompt: basePrompt,
    model: 'dall-e-3',
    size: size as any,
    quality: 'standard',
    style: 'natural'
  });
  
  await client.saveOutput(
    result.images[0].b64_json!,
    `social-${desc}.png`
  );
}

console.log(`Total: $${client.getTotalCost().toFixed(2)}`);
```

### Workflow 3: Video Production (Tier 4+)

```typescript
// Check tier first
const tier = await client.detectAccountTier();

if (!tier.soraAccess) {
  console.log('Sora requires Tier 4+ (spend $250+)');
  process.exit(1);
}

// Generate video
const video = await client.generateVideo({
  prompt: 'Aerial view flying over misty mountains at sunrise',
  duration: 10,
  resolution: '1920x1080',
  fps: 30,
  style: 'cinematic'
});

await client.saveOutput(video.video, 'aerial-shot.mp4');

// Estimate cost
const cost = client.estimateCost('video', {
  duration: 10,
  resolution: '1920x1080'
});
console.log(`Video cost: $${cost.toFixed(2)}`);
```

### Workflow 4: Iterative Design

```typescript
// Start with concept
let current = await client.generateImage({
  prompt: 'Logo for tech startup, minimalist',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'standard'
});

await client.saveOutput(current.images[0].b64_json!, 'concept.png');

// Create variations
const variations = await client.createVariation({
  image: 'concept.png',
  n: 5
});

// Save variations
for (let i = 0; i < variations.images.length; i++) {
  await client.saveOutput(
    variations.images[i].b64_json!,
    `variation-${i + 1}.png`
  );
}

// Choose best and regenerate in HD
const final = await client.generateImage({
  prompt: current.images[0].revisedPrompt || 'Logo for tech startup, minimalist',
  model: 'dall-e-3',
  size: '1024x1024',
  quality: 'hd'
});

await client.saveOutput(final.images[0].b64_json!, 'final-logo.png');
```

### Workflow 5: Batch Generation with Cost Control

```typescript
const prompts = [
  'Sunset over ocean',
  'Mountain landscape',
  'Forest trail',
  'Desert dunes',
  'Arctic glacier'
];

const budget = 1.00; // $1 budget
let spent = 0;

for (const prompt of prompts) {
  const cost = client.estimateCost('image', {
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard',
    n: 1
  });
  
  if (spent + cost > budget) {
    console.log(`Budget exceeded. Stopping at ${spent.toFixed(2)}`);
    break;
  }
  
  const result = await client.generateImage({
    prompt,
    model: 'dall-e-3',
    size: '1024x1024',
    quality: 'standard'
  });
  
  const filename = prompt.toLowerCase().replace(/\s+/g, '-') + '.png';
  await client.saveOutput(result.images[0].b64_json!, filename);
  
  spent += cost;
  console.log(`Generated: ${filename} ($${cost.toFixed(3)})`);
}

console.log(`\nTotal spent: $${client.getTotalCost().toFixed(2)}`);
```

## Account Tiers

| Tier | Requirement | Rate Limit | Daily Limit | Sora | Cost/Image |
|------|------------|------------|-------------|------|------------|
| Free Trial | $5 credits | 3/min | 200 | Limited | $0.040+ |
| Tier 1 | $5+ spent | 5/min | 500 | No | $0.040+ |
| Tier 2 | $50+ / 7d | 7/min | 1,000 | No | $0.040+ |
| Tier 3 | $100+ / 7d | 7/min | 2,000 | No | $0.040+ |
| Tier 4 | $250+ / 14d | 15/min | 5,000 | **Early** | $0.040+ |
| Tier 5 | $1,000+ / 30d | 50/min | 10,000+ | **Full** | $0.035+ |

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-proj-...

# Optional
OPENAI_ORG_ID=org-...          # For team accounts
OPENAI_ACCOUNT_TYPE=pay-as-you-go
OPENAI_OUTPUT_DIR=./output

# Defaults
DALL_E_3_MODEL=dall-e-3
SORA_MODEL=sora-1.0
DEFAULT_SIZE=1024x1024
DEFAULT_QUALITY=standard
DEFAULT_STYLE=vivid

# Rate limiting
RATE_LIMIT_PER_MIN=5           # Auto-detected from tier
MAX_DAILY_REQUESTS=500         # Auto-detected from tier

# Features
ENABLE_DALLE=true
ENABLE_SORA=true
ENABLE_EDITING=true
ENABLE_VARIATIONS=true

# Output
OUTPUT_FORMAT=png
SAVE_METADATA=true
```

## Pricing Reference

### DALL-E 3

| Size | Standard | HD |
|------|----------|-----|
| 1024×1024 | $0.040 | $0.080 |
| 1024×1792 | $0.080 | $0.120 |
| 1792×1024 | $0.080 | $0.120 |

### DALL-E 2

| Size | Cost |
|------|------|
| 1024×1024 | $0.020 |
| 512×512 | $0.018 |
| 256×256 | $0.016 |

### Sora (Estimated)

| Duration | Resolution | Cost |
|----------|-----------|------|
| 5 sec | 1080p | ~$0.50 |
| 10 sec | 1080p | ~$1.00 |
| 20 sec | 1080p | ~$2.00 |

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid API key | Key missing/wrong | Regenerate at platform.openai.com/api-keys |
| Quota exceeded | Rate limit hit | Wait for reset or upgrade tier |
| Insufficient quota | Daily limit reached | Upgrade tier or wait 24h |
| Sora not available | Tier 1-3 account | Spend $250+ to reach Tier 4 |
| Content policy | Prohibited content | Revise prompt to comply |
| Invalid size | Unsupported size | Use 1024x1024, 1024x1792, 1792x1024 |
| PNG required | Wrong format | Convert to PNG for editing/variations |
| Mask invalid | No transparency | Ensure mask has transparent regions |

## Resources

- Platform: https://platform.openai.com/
- API Keys: https://platform.openai.com/api-keys
- Documentation: https://platform.openai.com/docs/guides/images
- Pricing: https://openai.com/pricing
- Sora: https://openai.com/sora
- Usage Tracking: https://platform.openai.com/usage
