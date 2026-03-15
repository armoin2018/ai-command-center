---
id: ailey-media-gemini
name: Google Gemini Image & Video Generation
description: Comprehensive Google Gemini integration for AI-powered image and video generation using Imagen 3 and Veo 2. Create, edit, upscale images and generate videos from text prompts.
keywords:
  - gemini
  - google
  - imagen
  - veo
  - image-generation
  - video-generation
  - ai
  - media
---

# Google Gemini Image & Video Generation Skill

Comprehensive Google Gemini integration for AI-powered image and video generation using Imagen 3 and Veo 2. Create, edit, upscale images and generate videos from text prompts.

## Overview

Harness Google's latest generative AI models for visual content creation:

- **Imagen 3**: State-of-the-art text-to-image generation with photorealistic quality
- **Veo 2**: Advanced text-to-video generation with cinematic quality
- **Image Editing**: Inpainting, outpainting, and style transfer
- **Upscaling**: 4x resolution enhancement
- **Multiple Account Tiers**: Free, Pay-as-you-go, and Enterprise (Vertex AI)
- **Flexible Output**: PNG, JPEG, MP4, WebM formats
- **Rate Limit Management**: Automatic tier-based throttling
- **Metadata Tracking**: Generation history and parameters
- **Batch Operations**: Process multiple prompts efficiently

## Account Tiers

### Free Tier
- **Cost**: $0 (with usage limits)
- **Authentication**: API key from Google AI Studio
- **Rate Limits**: 15 requests/minute, 1,500 requests/day
- **Models**: Imagen 3 (basic), Veo 2 (limited)
- **Features**:
  - Text-to-image generation
  - Basic video generation (up to 8 seconds)
  - Standard resolution (up to 1024x1024)
  - Basic editing capabilities
- **Best For**: Hobbyists, testing, personal projects
- **Signup**: https://aistudio.google.com/

### Pay-as-you-go Tier
- **Cost**: Usage-based pricing
  - Imagen 3: $0.020 per image (standard), $0.040 (high quality)
  - Veo 2: $0.30 per video (8 sec), $0.60 (16 sec)
  - Upscaling: $0.010 per image
- **Authentication**: API key from Google AI Studio
- **Rate Limits**: 60 requests/minute, 10,000 requests/day
- **Models**: Full Imagen 3, Veo 2 access
- **Features**:
  - All Free tier features
  - High-quality image generation
  - Extended video generation (up to 16 seconds)
  - 4K resolution support
  - Advanced editing (inpainting, outpainting)
  - Batch operations
  - Priority processing
- **Best For**: Content creators, businesses, production use
- **Signup**: https://aistudio.google.com/ → Enable billing

### Enterprise Tier (Vertex AI)
- **Cost**: Custom pricing, volume discounts
- **Authentication**: Service Account + OAuth
- **Rate Limits**: 300 requests/minute, 100,000+ requests/day
- **Models**: All models + early access to new features
- **Features**:
  - All Pay-as-you-go features
  - 8K resolution support
  - Longer videos (up to 60 seconds)
  - Custom model fine-tuning
  - Advanced safety filters
  - SLA guarantees
  - Dedicated support
  - VPC integration
  - Audit logging
- **Best For**: Enterprises, high-volume production
- **Signup**: https://cloud.google.com/vertex-ai → Contact sales

## Feature Matrix

| Feature | Free | Pay-as-you-go | Enterprise |
|---------|------|---------------|------------|
| Imagen 3 (Text-to-Image) | ✅ Basic | ✅ Full | ✅ Full |
| Veo 2 (Text-to-Video) | ⚠️ Limited | ✅ Full | ✅ Extended |
| Max Image Resolution | 1024x1024 | 2048x2048 | 8192x8192 |
| Max Video Length | 8 seconds | 16 seconds | 60 seconds |
| Image Editing | ✅ Basic | ✅ Advanced | ✅ Advanced |
| Upscaling (4x) | ❌ | ✅ | ✅ |
| Batch Operations | ⚠️ Limited | ✅ | ✅ |
| Rate Limit | 15/min | 60/min | 300/min |
| Daily Limit | 1,500 | 10,000 | 100,000+ |
| Priority Processing | ❌ | ✅ | ✅ |
| Custom Fine-tuning | ❌ | ❌ | ✅ |
| SLA Guarantees | ❌ | ❌ | ✅ |
| Support | Community | Email | Dedicated |

## Getting Started

### Step 1: Create Google Account

**For Free/Pay-as-you-go:**
1. Visit https://aistudio.google.com/
2. Sign in with Google account
3. Accept terms of service
4. No credit card required for Free tier

**For Enterprise (Vertex AI):**
1. Visit https://cloud.google.com/vertex-ai
2. Create or select GCP project
3. Enable Vertex AI API
4. Set up billing account
5. Contact sales for enterprise features

### Step 2: Get API Key

**For Free/Pay-as-you-go:**
1. Go to https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Select project (or create new)
4. Copy API key
5. **Important**: Keep key secure, never commit to version control

**For Enterprise (Vertex AI):**
1. Create Service Account in GCP Console
2. Grant necessary permissions:
   - `aiplatform.user`
   - `storage.admin` (for outputs)
3. Download JSON key file
4. Set environment variable: `GOOGLE_APPLICATION_CREDENTIALS`

### Step 3: Enable Billing (Optional - for Pay-as-you-go)

1. Google AI Studio → Settings → Billing
2. Link Cloud Billing account
3. Set budget alerts (recommended)
4. Monitor usage at https://console.cloud.google.com/billing

### Step 4: Install Skill

```bash
cd .github/skills/ailey-media-gemini
./install.sh
```

### Step 5: Configure API Key

Create `.env` file:

```bash
# For Free/Pay-as-you-go
GEMINI_API_KEY=AIzaSy...your_api_key_here
GEMINI_ACCOUNT_TYPE=free  # or 'paid'

# For Enterprise (Vertex AI)
GEMINI_PROJECT_ID=your-gcp-project
GEMINI_LOCATION=us-central1
GEMINI_SERVICE_ACCOUNT_KEY=/path/to/service-account-key.json
GEMINI_ACCOUNT_TYPE=enterprise
```

**Configure in AI-ley** (`.github/aicc/aicc.yaml`):

```yaml
skills:
  gemini:
    type: media
    path: .github/skills/ailey-media-gemini
    config:
      apiKey: ${GEMINI_API_KEY}
      accountType: ${GEMINI_ACCOUNT_TYPE}
      outputDir: ./output/gemini
      defaultModel: imagen-3.0-generate-001
```

## Usage Examples

### Detect Account Tier
```bash
npm run detect
```

### Generate Image (Text-to-Image)
```bash
npm run generate -- \
  --prompt "A serene mountain landscape at sunset" \
  --aspect-ratio "16:9" \
  --output "mountain.png"
```

### Generate Video (Text-to-Video)
```bash
npm run video -- \
  --prompt "A drone flying over a futuristic city" \
  --duration 8 \
  --output "city-flyover.mp4"
```

### Edit Image (Inpainting)
```bash
npm run edit -- \
  --image "photo.jpg" \
  --mask "mask.png" \
  --prompt "Replace with a sunset sky" \
  --output "edited.png"
```

### Upscale Image
```bash
npm run upscale -- \
  --image "low-res.jpg" \
  --factor 4 \
  --output "high-res.png"
```

### View Generation History
```bash
npm run history -- --limit 20
```

## API Reference

### GeminiClient Class

```typescript
import { GeminiClient } from './.github/skills/ailey-media-gemini/src';

const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY,
  accountType: 'free' // or 'paid', 'enterprise'
});
```

#### Account & Configuration

##### `detectAccountTier(): Promise<AccountTier>`
Detect account tier and capabilities.

**Returns:**
```typescript
{
  tier: 'Free' | 'Pay-as-you-go' | 'Enterprise',
  rateLimit: number,          // requests per minute
  dailyLimit: number,         // requests per day
  maxImageResolution: string, // e.g., "1024x1024"
  maxVideoLength: number,     // seconds
  features: string[]
}
```

#### Image Generation (Imagen 3)

##### `generateImage(options): Promise<GeneratedImage>`
Generate image from text prompt.

**Parameters:**
```typescript
{
  prompt: string,
  negativePrompt?: string,
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4',
  model?: 'imagen-3.0-generate-001' | 'imagen-3.0-fast-001',
  numberOfImages?: number, // 1-4 (tier-dependent)
  seed?: number,           // for reproducibility
  outputFormat?: 'png' | 'jpeg'
}
```

**Returns:**
```typescript
{
  images: Array<{
    data: Buffer,
    mimeType: string,
    metadata: {
      model: string,
      prompt: string,
      seed: number,
      timestamp: string
    }
  }>,
  promptId: string
}
```

##### `editImage(options): Promise<GeneratedImage>`
Edit existing image (inpainting/outpainting).

**Parameters:**
```typescript
{
  image: Buffer | string,      // image data or path
  mask?: Buffer | string,      // mask for inpainting
  prompt: string,
  mode: 'inpaint' | 'outpaint' | 'style-transfer',
  strength?: number,           // 0-1, edit intensity
  outputFormat?: 'png' | 'jpeg'
}
```

##### `upscaleImage(options): Promise<GeneratedImage>`
Upscale image resolution (4x).

**Parameters:**
```typescript
{
  image: Buffer | string,
  factor: 2 | 4,
  outputFormat?: 'png' | 'jpeg'
}
```

#### Video Generation (Veo 2)

##### `generateVideo(options): Promise<GeneratedVideo>`
Generate video from text prompt.

**Parameters:**
```typescript
{
  prompt: string,
  duration: number,            // seconds (tier-dependent max)
  aspectRatio?: '16:9' | '9:16' | '1:1',
  model?: 'veo-2.0-generate-001',
  fps?: number,                // 24, 30, 60
  outputFormat?: 'mp4' | 'webm'
}
```

**Returns:**
```typescript
{
  video: Buffer,
  mimeType: string,
  duration: number,
  resolution: string,
  fps: number,
  metadata: {
    model: string,
    prompt: string,
    timestamp: string
  }
}
```

#### History & Management

##### `getGenerationHistory(limit?: number): Promise<GenerationRecord[]>`
Retrieve generation history.

##### `saveOutput(data: Buffer, filename: string): Promise<string>`
Save generated content to file.

## Workflows

### Workflow 1: Create Marketing Image

```bash
# 1. Generate hero image
npm run generate -- \
  --prompt "Professional product photo of smartwatch on marble surface" \
  --aspect-ratio "16:9" \
  --output "hero.png"

# 2. Upscale for print
npm run upscale -- \
  --image "hero.png" \
  --factor 4 \
  --output "hero-4k.png"

# 3. Create variations
npm run generate -- \
  --prompt "Professional product photo of smartwatch on marble surface" \
  --aspect-ratio "16:9" \
  --seed 12345 \
  --output "hero-v2.png"
```

### Workflow 2: Generate Social Media Content

```bash
# Instagram post (1:1)
npm run generate -- \
  --prompt "Vibrant food photography, overhead shot" \
  --aspect-ratio "1:1" \
  --output "instagram.png"

# Instagram story (9:16)
npm run generate -- \
  --prompt "Vibrant food photography, overhead shot" \
  --aspect-ratio "9:16" \
  --output "story.png"

# YouTube thumbnail (16:9)
npm run generate -- \
  --prompt "Vibrant food photography, overhead shot" \
  --aspect-ratio "16:9" \
  --output "youtube.png"
```

### Workflow 3: Create Product Demo Video

```bash
# 1. Generate product showcase video
npm run video -- \
  --prompt "Smooth product rotation of smartphone, studio lighting" \
  --duration 8 \
  --aspect-ratio "16:9" \
  --output "product-demo.mp4"

# 2. Generate B-roll footage
npm run video -- \
  --prompt "Close-up details of smartphone features and interface" \
  --duration 8 \
  --output "b-roll.mp4"
```

### Workflow 4: Image Editing Pipeline

```bash
# 1. Generate base image
npm run generate -- \
  --prompt "Modern office interior" \
  --output "base.png"

# 2. Edit specific area (inpainting)
npm run edit -- \
  --image "base.png" \
  --mask "window-mask.png" \
  --prompt "Large windows with city view" \
  --mode "inpaint" \
  --output "edited.png"

# 3. Expand canvas (outpainting)
npm run edit -- \
  --image "edited.png" \
  --mode "outpaint" \
  --prompt "Continue the office space" \
  --output "expanded.png"
```

### Workflow 5: Batch Content Creation

```typescript
import { GeminiClient } from './.github/skills/ailey-media-gemini/src';

const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY!
});

const prompts = [
  "Mountain landscape at sunrise",
  "Ocean waves at sunset",
  "Forest path in autumn"
];

for (const prompt of prompts) {
  const result = await client.generateImage({
    prompt,
    aspectRatio: '16:9',
    numberOfImages: 2
  });
  
  result.images.forEach((img, i) => {
    await client.saveOutput(
      img.data,
      `${prompt.replace(/\s+/g, '-')}-${i + 1}.png`
    );
  });
}
```

## Models

### Imagen 3 (Image Generation)

- **Model ID**: `imagen-3.0-generate-001`
- **Fast Model**: `imagen-3.0-fast-001` (lower quality, faster)
- **Max Resolution**: Tier-dependent (1024x1024 to 8192x8192)
- **Aspect Ratios**: 1:1, 16:9, 9:16, 4:3, 3:4
- **Features**: Photorealistic, artistic styles, text rendering

### Veo 2 (Video Generation)

- **Model ID**: `veo-2.0-generate-001`
- **Max Duration**: Tier-dependent (8-60 seconds)
- **Resolution**: Up to 4K (3840x2160)
- **Frame Rates**: 24, 30, 60 FPS
- **Features**: Cinematic quality, camera movements, temporal consistency

## TypeScript Integration

```typescript
import { GeminiClient } from './.github/skills/ailey-media-gemini/src';
import fs from 'fs';

const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  accountType: 'paid'
});

// Generate image
const imageResult = await client.generateImage({
  prompt: "A futuristic cityscape at night",
  aspectRatio: '16:9',
  numberOfImages: 4
});

// Save all variations
for (let i = 0; i < imageResult.images.length; i++) {
  const path = await client.saveOutput(
    imageResult.images[i].data,
    `cityscape-${i + 1}.png`
  );
  console.log(`Saved: ${path}`);
}

// Generate video
const videoResult = await client.generateVideo({
  prompt: "Drone flying through the futuristic city",
  duration: 16,
  aspectRatio: '16:9',
  fps: 60
});

await client.saveOutput(videoResult.video, 'city-flyover.mp4');

// Upscale favorite image
const upscaled = await client.upscaleImage({
  image: 'cityscape-1.png',
  factor: 4
});

await client.saveOutput(upscaled.images[0].data, 'cityscape-4k.png');
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Verify API key at https://aistudio.google.com/app/apikey |
| "Quota exceeded" | Check usage limits, upgrade to Pay-as-you-go, or wait for reset |
| "Rate limit exceeded" | Implement exponential backoff, reduce request frequency |
| "Image generation failed" | Refine prompt, avoid prohibited content, check safety filters |
| "Video too long" | Reduce duration to tier limit (Free: 8s, Paid: 16s, Enterprise: 60s) |
| "Resolution not supported" | Check tier max resolution, downscale request |
| "Service account error" | Verify credentials path, check IAM permissions |
| "Billing not enabled" | Enable billing at https://console.cloud.google.com/billing |

## Safety & Content Policy

Google Gemini enforces content safety filters:

- **Prohibited**: Violence, hate speech, adult content, illegal activities
- **Restricted**: Political figures, copyrighted characters, deepfakes
- **Guidelines**: https://ai.google.dev/gemini-api/docs/safety-settings

## Pricing Reference

### Imagen 3 (per image)
- Standard quality: $0.020
- High quality: $0.040

### Veo 2 (per video)
- 8 seconds: $0.30
- 16 seconds: $0.60
- 60 seconds (Enterprise): $2.40

### Upscaling
- 4x upscale: $0.010 per image

**Note**: Prices current as of February 2026. Check https://ai.google.dev/pricing for latest.

## Resources

- **Google AI Studio**: https://aistudio.google.com/
- **API Documentation**: https://ai.google.dev/gemini-api/docs
- **Vertex AI**: https://cloud.google.com/vertex-ai
- **Pricing**: https://ai.google.dev/pricing
- **Safety Guidelines**: https://ai.google.dev/gemini-api/docs/safety-settings

---
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.5
---
