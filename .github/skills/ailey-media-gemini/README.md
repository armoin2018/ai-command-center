# Google Gemini Image & Video Generation AI-ley Skill

AI-powered image and video generation using Google's Imagen 3 and Veo 2 models. Create photorealistic images, edit existing visuals, and generate cinematic videos from text prompts.

## Quick Start

### Free Tier Setup

Perfect for testing and personal projects:

```bash
# 1. Get API key
# Visit: https://aistudio.google.com/app/apikey
# Click "Create API key"
# Copy key

# 2. Install skill
cd .github/skills/ailey-media-gemini
npm install
npm run setup  # Follow credential instructions

# 3. Configure
# Create .env with:
GEMINI_API_KEY=AIzaSy...your_key
GEMINI_ACCOUNT_TYPE=free

# 4. Verify
npm run detect
```

### Pay-as-you-go Setup

For production use with advanced features:

```bash
# 1. Enable billing at https://aistudio.google.com/
# 2. Get API key (same as Free tier)
# 3. Configure .env:
GEMINI_API_KEY=AIzaSy...your_key
GEMINI_ACCOUNT_TYPE=paid

# 4. Verify
npm run detect  # Should show "Pay-as-you-go"
```

## Account Tiers

| Tier | Cost | Rate Limit | Image Res | Video Length |
|------|------|------------|-----------|--------------|
| **Free** | $0 | 15/min | 1024x1024 | 8 sec |
| **Pay-as-you-go** | $0.02/img | 60/min | 2048x2048 | 16 sec |
| **Enterprise** | Custom | 300/min | 8192x8192 | 60 sec |

## Common Commands

### Generate Image
```bash
npm run generate -- \
  --prompt "A serene mountain landscape at sunset" \
  --aspect-ratio "16:9" \
  --output "mountain.png"
```

### Generate Video
```bash
npm run video -- \
  --prompt "Drone flying over futuristic city" \
  --duration 8 \
  --output "city.mp4"
```

### Edit Image
```bash
npm run edit -- \
  --image "photo.jpg" \
  --mask "mask.png" \
  --prompt "Replace sky with sunset" \
  --output "edited.png"
```

### Upscale Image (Paid/Enterprise only)
```bash
npm run upscale -- \
  --image "low-res.jpg" \
  --factor 4 \
  --output "high-res.png"
```

## TypeScript Integration

```typescript
import { GeminiClient } from './.github/skills/ailey-media-gemini/src';

const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  accountType: 'paid'
});

// Generate image
const result = await client.generateImage({
  prompt: "Futuristic cityscape at night",
  aspectRatio: '16:9',
  numberOfImages: 4
});

// Save outputs
for (let i = 0; i < result.images.length; i++) {
  await client.saveOutput(
    result.images[i].data,
    `cityscape-${i + 1}.png`
  );
}

// Generate video
const video = await client.generateVideo({
  prompt: "Drone flying through the city",
  duration: 16,
  fps: 60
});

await client.saveOutput(video.video, 'flyover.mp4');
```

## Getting API Key

### Method 1: Google AI Studio (Free/Paid)
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Select project or create new
4. Copy and save key securely

### Method 2: Vertex AI (Enterprise)
1. Create GCP project at https://console.cloud.google.com/
2. Enable Vertex AI API
3. Create Service Account with `aiplatform.user` role
4. Download JSON key file
5. Set environment: `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`

## Configure in AI-ley

Add to `.github/aicc/aicc.yaml`:

```yaml
skills:
  gemini:
    type: media
    path: .github/skills/ailey-media-gemini
    config:
      apiKey: ${GEMINI_API_KEY}
      accountType: ${GEMINI_ACCOUNT_TYPE}
      outputDir: ./output/gemini
```

## Common Workflows

### Workflow 1: Social Media Content
```bash
# Instagram (1:1)
npm run generate -- --prompt "Food photography" --aspect-ratio "1:1" --output "instagram.png"

# Story (9:16)
npm run generate -- --prompt "Food photography" --aspect-ratio "9:16" --output "story.png"

# YouTube (16:9)
npm run generate -- --prompt "Food photography" --aspect-ratio "16:9" --output "youtube.png"
```

### Workflow 2: Product Demo Video
```bash
# Generate showcase
npm run video -- \
  --prompt "Product rotation, studio lighting" \
  --duration 8 \
  --output "product.mp4"
```

## Pricing (Pay-as-you-go)

- **Imagen 3**: $0.020 per image (standard), $0.040 (high quality)
- **Veo 2**: $0.30 per 8-sec video, $0.60 per 16-sec
- **Upscaling**: $0.010 per image

Free tier: 1,500 requests/day (no cost)

## Resources

- **AI Studio**: https://aistudio.google.com/
- **API Docs**: https://ai.google.dev/gemini-api/docs
- **Pricing**: https://ai.google.dev/pricing
- **Full Docs**: [SKILL.md](SKILL.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Verify key at https://aistudio.google.com/app/apikey |
| "Quota exceeded" | Upgrade to Pay-as-you-go or wait for daily reset |
| "Video too long" | Check tier limit (Free: 8s, Paid: 16s) |
| "Upscaling unavailable" | Upgrade to Pay-as-you-go plan |
