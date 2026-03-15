---
id: ailey-media-openai
name: OpenAI DALL-E 3 & Sora Image & Video Generation
description: Comprehensive OpenAI integration for AI-powered image and video generation using DALL-E 3 and Sora. Create photorealistic images, edit existing visuals, generate variations, and produce cinematic videos from text prompts.
keywords:
  - openai
  - dalle
  - sora
  - image-generation
  - video-generation
  - ai
  - media
---

# OpenAI DALL-E 3 & Sora Image & Video Generation Skill

Comprehensive OpenAI integration for AI-powered image and video generation using DALL-E 3 and Sora. Create photorealistic images, edit existing visuals, generate variations, and produce cinematic videos from text prompts.

## Overview

Harness OpenAI's cutting-edge generative AI models for visual content creation:

- **DALL-E 3**: Industry-leading text-to-image generation with unprecedented detail and prompt adherence
- **Sora**: Revolutionary text-to-video generation with realistic motion and cinematography
- **Image Editing**: Inpainting with transparent areas for precise control
- **Image Variations**: Generate alternative versions of existing images
- **Usage-Based Tiers**: Automatic tier detection with rate limits
- **HD Quality**: Standard and HD quality options for DALL-E 3
- **Flexible Sizes**: Multiple resolution options (1024x1024, 1024x1792, 1792x1024)
- **Style Control**: Natural and vivid style options
- **Metadata Tracking**: Generation history and parameters
- **Cost Tracking**: Monitor API usage and costs

## Account Tiers

OpenAI uses a usage-based tier system that automatically scales based on your spending:

### Free Trial (New Accounts)
- **Cost**: $5 in free credits (expires after 3 months)
- **Rate Limits**: 3 requests/minute, 200 requests/day
- **Models**: DALL-E 3 (limited), Sora (unavailable)
- **Features**:
  - Basic image generation
  - Standard quality only
  - Limited resolutions
- **Best For**: Testing, evaluation
- **Signup**: https://platform.openai.com/signup

### Tier 1 (Pay-as-you-go)
- **Threshold**: $5+ spent
- **Cost**: 
  - DALL-E 3 Standard: $0.040 per image (1024x1024)
  - DALL-E 3 HD: $0.080 per image (1024x1024)
  - Sora: Not yet available at this tier
- **Rate Limits**: 5 requests/minute, 500 requests/day
- **Features**:
  - All DALL-E 3 features
  - Standard and HD quality
  - All resolutions
  - Image editing and variations
- **Best For**: Light usage, testing production

### Tier 2
- **Threshold**: $50+ spent and 7+ days since first payment
- **Cost**: Same as Tier 1
- **Rate Limits**: 7 requests/minute, 1,000 requests/day
- **Features**: All Tier 1 features
- **Best For**: Regular content creation

### Tier 3
- **Threshold**: $100+ spent and 7+ days since first payment
- **Cost**: Same as Tier 1
- **Rate Limits**: 7 requests/minute, 2,000 requests/day
- **Features**: All Tier 1 features
- **Best For**: Medium-volume production

### Tier 4
- **Threshold**: $250+ spent and 14+ days since first payment
- **Cost**: Same as Tier 1
- **Rate Limits**: 15 requests/minute, 5,000 requests/day
- **Features**:
  - All Tier 1 features
  - Sora access (early access/beta)
- **Best For**: High-volume production

### Tier 5 (Enterprise)
- **Threshold**: $1,000+ spent and 30+ days since first payment
- **Cost**: 
  - Volume discounts available
  - Custom pricing for Sora
- **Rate Limits**: 50 requests/minute, 10,000+ requests/day
- **Features**:
  - All features
  - Full Sora access
  - Priority processing
  - Dedicated support
- **Best For**: Enterprise, high-volume production

## Feature Matrix

| Feature | Free Trial | Tier 1-3 | Tier 4+ | Tier 5 |
|---------|-----------|----------|---------|--------|
| DALL-E 3 (Text-to-Image) | ✅ Limited | ✅ Full | ✅ Full | ✅ Full |
| Sora (Text-to-Video) | ❌ | ❌ | ⚠️ Early Access | ✅ Full |
| Image Resolutions | 1024x1024 | All | All | All |
| HD Quality | ❌ | ✅ | ✅ | ✅ |
| Image Editing | ⚠️ Limited | ✅ | ✅ | ✅ |
| Image Variations | ⚠️ Limited | ✅ | ✅ | ✅ |
| Rate Limit | 3/min | 5-7/min | 15/min | 50/min |
| Daily Limit | 200 | 500-2,000 | 5,000 | 10,000+ |
| Priority Processing | ❌ | ❌ | ✅ | ✅ |
| Dedicated Support | ❌ | ❌ | ❌ | ✅ |

## Getting Started

### Step 1: Create OpenAI Account

1. Visit https://platform.openai.com/signup
2. Sign up with email or continue with Google/Microsoft
3. Verify email address
4. Complete phone verification

### Step 2: Add Payment Method

1. Go to https://platform.openai.com/account/billing/overview
2. Click "Add payment details"
3. Enter credit card information
4. Set spending limits (recommended: start with $10/month)

**Note**: Free trial credits expire after 3 months. Add payment to continue.

### Step 3: Get API Key

1. Visit https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name your key (e.g., "AI-ley Skill")
4. Copy key immediately (shown only once)
5. **Important**: Never share or commit your API key

Optional: Get Organization ID
- Go to https://platform.openai.com/account/organization
- Copy Organization ID (for team accounts)

### Step 4: Install Skill

```bash
cd .github/skills/ailey-media-openai
./install.sh
```

### Step 5: Configure API Key

Create `.env` file:

```bash
OPENAI_API_KEY=sk-proj-...your_api_key
OPENAI_ACCOUNT_TYPE=pay-as-you-go
# Optional for team accounts:
OPENAI_ORG_ID=org-...your_org_id
```

**Configure in AI-ley** (`.github/aicc/aicc.yaml`):

```yaml
skills:
  openai:
    type: media
    path: .github/skills/ailey-media-openai
    config:
      apiKey: ${OPENAI_API_KEY}
      accountType: ${OPENAI_ACCOUNT_TYPE}
      outputDir: ./output/openai
```

## Usage Examples

### Detect Account Tier
```bash
npm run detect
```

### Generate Image (DALL-E 3)
```bash
npm run generate -- \
  --prompt "A serene Japanese garden with cherry blossoms" \
  --size "1024x1024" \
  --quality "hd" \
  --output "garden.png"
```

### Edit Image (Inpainting)
```bash
npm run edit -- \
  --image "photo.png" \
  --mask "mask.png" \
  --prompt "Add a sunset sky" \
  --output "edited.png"
```

### Create Variations
```bash
npm run variation -- \
  --image "original.png" \
  --count 3 \
  --output "variation.png"
```

### Generate Video (Sora - Tier 4+)
```bash
npm run video -- \
  --prompt "A cat walking through Tokyo at night" \
  --duration 5 \
  --output "tokyo-cat.mp4"
```

### View Generation History
```bash
npm run history -- --limit 20
```

## API Reference

### OpenAIClient Class

```typescript
import { OpenAIClient } from './.github/skills/ailey-media-openai/src';

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY,
  organizationId: process.env.OPENAI_ORG_ID
});
```

#### Account & Configuration

##### `detectAccountTier(): Promise<AccountTier>`
Detect account tier based on API key permissions and usage.

**Returns:**
```typescript
{
  tier: 'Free Trial' | 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Tier 4' | 'Tier 5',
  rateLimit: number,          // requests per minute
  dailyLimit: number,         // requests per day
  soraAccess: boolean,        // Sora availability
  features: string[]
}
```

#### Image Generation (DALL-E 3)

##### `generateImage(options): Promise<GeneratedImage>`
Generate image from text prompt.

**Parameters:**
```typescript
{
  prompt: string,              // max 4000 characters
  model?: 'dall-e-3' | 'dall-e-2',
  size?: '1024x1024' | '1024x1792' | '1792x1024',
  quality?: 'standard' | 'hd',
  style?: 'vivid' | 'natural',
  n?: number,                  // 1 for dall-e-3
  responseFormat?: 'url' | 'b64_json'
}
```

**Returns:**
```typescript
{
  images: Array<{
    url?: string,
    b64_json?: string,
    revisedPrompt: string,     // DALL-E 3's interpretation
    metadata: {
      model: string,
      size: string,
      quality: string,
      timestamp: string
    }
  }>,
  promptId: string
}
```

##### `editImage(options): Promise<GeneratedImage>`
Edit image using transparent mask (inpainting).

**Parameters:**
```typescript
{
  image: Buffer | string,      // PNG image
  mask: Buffer | string,       // PNG mask (transparent areas to edit)
  prompt: string,
  size?: '1024x1024' | '512x512' | '256x256',
  n?: number,                  // 1-10
  responseFormat?: 'url' | 'b64_json'
}
```

**Note**: Image editing uses DALL-E 2, not DALL-E 3.

##### `createVariation(options): Promise<GeneratedImage>`
Generate variations of an existing image.

**Parameters:**
```typescript
{
  image: Buffer | string,      // PNG image
  n?: number,                  // 1-10
  size?: '1024x1024' | '512x512' | '256x256',
  responseFormat?: 'url' | 'b64_json'
}
```

**Note**: Variations use DALL-E 2, not DALL-E 3.

#### Video Generation (Sora - Tier 4+)

##### `generateVideo(options): Promise<GeneratedVideo>`
Generate video from text prompt.

**Parameters:**
```typescript
{
  prompt: string,
  duration?: number,           // 5-20 seconds
  resolution?: '1920x1080' | '1080x1920' | '1280x720',
  fps?: number,                // 24, 30, 60
  style?: 'realistic' | 'cinematic' | 'animated'
}
```

**Returns:**
```typescript
{
  video: Buffer,
  url?: string,
  duration: number,
  resolution: string,
  fps: number,
  metadata: {
    model: 'sora-1.0',
    prompt: string,
    timestamp: string
  }
}
```

**Note**: Sora access requires Tier 4+ (early access) or Tier 5 (full access).

#### History & Management

##### `getGenerationHistory(limit?: number): Promise<GenerationRecord[]>`
Retrieve generation history.

##### `saveOutput(data: Buffer, filename: string): Promise<string>`
Save generated content to file.

##### `estimateCost(operation, options): number`
Estimate cost for an operation.

## Workflows

### Workflow 1: Create Marketing Assets

```bash
# Generate hero image (HD quality)
npm run generate -- \
  --prompt "Professional product photography, smartwatch on marble" \
  --size "1792x1024" \
  --quality "hd" \
  --style "vivid" \
  --output "hero.png"

# Create variations for A/B testing
npm run variation -- \
  --image "hero.png" \
  --count 3 \
  --output "hero-variant.png"

# Edit specific area
npm run edit -- \
  --image "hero.png" \
  --mask "background-mask.png" \
  --prompt "Luxury gold background" \
  --output "hero-gold.png"
```

### Workflow 2: Social Media Content

```bash
# Instagram post (square)
npm run generate -- \
  --prompt "Vibrant food photography, overhead shot, bright colors" \
  --size "1024x1024" \
  --quality "hd" \
  --output "instagram.png"

# Instagram story (portrait)
npm run generate -- \
  --prompt "Vibrant food photography, overhead shot, bright colors" \
  --size "1024x1792" \
  --quality "standard" \
  --output "story.png"

# Twitter/X header (landscape)
npm run generate -- \
  --prompt "Vibrant food photography, overhead shot, bright colors" \
  --size "1792x1024" \
  --quality "standard" \
  --output "twitter.png"
```

### Workflow 3: Video Content (Tier 4+)

```bash
# Product showcase video
npm run video -- \
  --prompt "Smartphone rotating slowly on reflective surface, studio lighting" \
  --duration 5 \
  --resolution "1920x1080" \
  --fps 30 \
  --output "product.mp4"

# Short-form social video
npm run video -- \
  --prompt "Dynamic aerial view of city at sunset" \
  --duration 10 \
  --resolution "1080x1920" \
  --fps 60 \
  --output "aerial.mp4"
```

### Workflow 4: Iterative Design

```bash
# 1. Generate initial concept
npm run generate -- \
  --prompt "Modern office interior, natural light, plants" \
  --output "office-v1.png"

# 2. Create variations
npm run variation -- \
  --image "office-v1.png" \
  --count 4 \
  --output "office-variant.png"

# 3. Edit best variant
npm run edit -- \
  --image "office-variant-2.png" \
  --mask "window-mask.png" \
  --prompt "Floor-to-ceiling windows with city view" \
  --output "office-final.png"

# 4. Generate HD version
npm run generate -- \
  --prompt "Modern office interior, floor-to-ceiling windows, city view" \
  --quality "hd" \
  --size "1792x1024" \
  --output "office-hd.png"
```

### Workflow 5: Batch Content Creation

```typescript
import { OpenAIClient } from './.github/skills/ailey-media-openai/src';

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!
});

const prompts = [
  "Minimalist product photo, white background",
  "Lifestyle product photo, modern home",
  "Action shot, outdoor adventure"
];

for (const prompt of prompts) {
  const result = await client.generateImage({
    prompt,
    quality: 'hd',
    size: '1024x1024'
  });
  
  const filename = `${prompt.split(',')[0].replace(/\s+/g, '-')}.png`;
  await client.saveOutput(result.images[0].b64_json!, filename);
  
  // Estimate cost
  console.log(`Cost: $${client.estimateCost('image', { quality: 'hd' })}`);
}
```

## Models

### DALL-E 3 (Image Generation)
- **Model ID**: `dall-e-3`
- **Release**: October 2023
- **Max Resolution**: 1792x1024
- **Strengths**: Exceptional prompt adherence, photorealism, text rendering
- **Pricing**: $0.040 (standard), $0.080 (HD)

### DALL-E 2 (Legacy - Editing/Variations)
- **Model ID**: `dall-e-2`
- **Max Resolution**: 1024x1024
- **Use Cases**: Image editing, variations
- **Pricing**: $0.020 per image

### Sora (Video Generation - Tier 4+)
- **Model ID**: `sora-1.0`
- **Release**: Early 2024 (limited access)
- **Max Duration**: 20 seconds
- **Max Resolution**: 1920x1080
- **Strengths**: Realistic motion, temporal consistency, cinematography
- **Pricing**: Custom (estimated $0.50-2.00 per video)

## TypeScript Integration

```typescript
import { OpenAIClient } from './.github/skills/ailey-media-openai/src';

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!,
  organizationId: process.env.OPENAI_ORG_ID
});

// Detect tier
const tier = await client.detectAccountTier();
console.log(`Current tier: ${tier.tier}`);

// Generate HD image
const imageResult = await client.generateImage({
  prompt: "A futuristic cityscape at night, neon lights, rain",
  size: '1792x1024',
  quality: 'hd',
  style: 'vivid'
});

console.log(`Revised prompt: ${imageResult.images[0].revisedPrompt}`);
await client.saveOutput(
  Buffer.from(imageResult.images[0].b64_json!, 'base64'),
  'cityscape.png'
);

// Generate variations
const variations = await client.createVariation({
  image: 'cityscape.png',
  n: 3,
  size: '1024x1024'
});

for (let i = 0; i < variations.images.length; i++) {
  await client.saveOutput(
    Buffer.from(variations.images[i].b64_json!, 'base64'),
    `cityscape-v${i + 1}.png`
  );
}

// Generate video (Tier 4+)
if (tier.soraAccess) {
  const video = await client.generateVideo({
    prompt: "Drone flying through the futuristic city at night",
    duration: 10,
    resolution: '1920x1080',
    fps: 60
  });
  
  await client.saveOutput(video.video, 'cityscape-flyover.mp4');
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Incorrect API key" | Verify key at https://platform.openai.com/api-keys |
| "You exceeded your current quota" | Add payment method or increase spending limit |
| "Rate limit exceeded" | Implement exponential backoff, upgrade tier by spending more |
| "Billing hard limit reached" | Increase limit at https://platform.openai.com/account/billing/limits |
| "Content policy violation" | Refine prompt, avoid prohibited content |
| "Sora not available" | Requires Tier 4+ (spend $250+) |
| "Image must be PNG" | Convert image to PNG format before editing/variations |
| "Mask must be transparent" | Ensure mask uses alpha channel transparency |

## Content Policy

OpenAI enforces strict content policies:

- **Prohibited**: Violence, hate, harassment, self-harm, sexual content, illegal activities
- **Restricted**: Political figures, celebrities, minors, copyrighted characters
- **Moderation**: All prompts and images are reviewed
- **Guidelines**: https://openai.com/policies/usage-policies

## Pricing Reference

### DALL-E 3 (per image)
- **1024x1024**:
  - Standard: $0.040
  - HD: $0.080
- **1024x1792 or 1792x1024**:
  - Standard: $0.080
  - HD: $0.120

### DALL-E 2 (per image)
- **1024x1024**: $0.020
- **512x512**: $0.018
- **256x256**: $0.016

### Sora (estimated)
- **5 seconds**: ~$0.50
- **10 seconds**: ~$1.00
- **20 seconds**: ~$2.00

**Note**: Prices current as of February 2026. Check https://openai.com/pricing for latest.

## Resources

- **Platform**: https://platform.openai.com/
- **API Keys**: https://platform.openai.com/api-keys
- **Documentation**: https://platform.openai.com/docs/guides/images
- **Pricing**: https://openai.com/pricing
- **Usage**: https://platform.openai.com/account/usage
- **Content Policy**: https://openai.com/policies/usage-policies

---
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.5
---
