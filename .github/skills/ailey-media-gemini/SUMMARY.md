# Google Gemini Image & Video Generation - Summary

## Project Overview

**Name**: Google Gemini Image & Video Generation AI-ley Skill  
**ID**: `ailey-media-gemini`  
**Type**: Media Generation Platform Integration  
**Status**: Production Ready  
**Version**: 1.0.0  

Comprehensive Google Gemini integration for AI-powered visual content creation using Imagen 3 (text-to-image) and Veo 2 (text-to-video). Generate photorealistic images, edit existing visuals, upscale resolutions, and create cinematic videos from text prompts.

## Key Capabilities

### Image Generation (Imagen 3)
- Text-to-image generation with photorealistic quality
- Multiple aspect ratios (1:1, 16:9, 9:16, 4:3, 3:4)
- Batch generation (1-4 images per request)
- Seed-based reproducibility
- Negative prompts for precise control
- **Resolution**: Up to 8K (tier-dependent)

### Video Generation (Veo 2)
- Text-to-video with cinematic quality
- Duration: 8-60 seconds (tier-dependent)
- Multiple aspect ratios and frame rates
- Camera movements and temporal consistency
- **Resolution**: Up to 4K

### Image Editing
- Inpainting (replace specific areas)
- Outpainting (extend canvas)
- Style transfer
- Adjustable edit strength

### Image Upscaling
- 2x and 4x resolution enhancement
- Maintains image quality
- **Availability**: Pay-as-you-go and Enterprise tiers

## Account Tiers

| Tier | Monthly Cost | Per-Request Cost | Rate Limit | Best For |
|------|-------------|------------------|------------|----------|
| **Free** | $0 | $0 | 15/min, 1,500/day | Testing, personal projects |
| **Pay-as-you-go** | $0 | $0.02-$0.60 | 60/min, 10,000/day | Content creators, production |
| **Enterprise** | Custom | Custom | 300/min, 100K+/day | High-volume, custom needs |

## Technology Stack

### Core Dependencies
- **Runtime**: Node.js 18+, npm 9+
- **Language**: TypeScript 5.3.3
- **HTTP Client**: axios ^1.6.0
- **CLI Framework**: commander ^11.0.0
- **Styling**: chalk ^5.3.0
- **Environment**: dotenv ^16.3.1
- **Form Data**: form-data ^4.0.0

### Google APIs
- **Primary**: Google AI Studio API / Vertex AI API
- **Authentication**: 
  - API Key (Free/Pay-as-you-go)
  - Service Account + OAuth (Enterprise)
- **Endpoints**:
  - AI Studio: `https://generativelanguage.googleapis.com/v1`
  - Vertex AI: `https://{location}-aiplatform.googleapis.com/v1`
- **Models**:
  - Imagen 3: `imagen-3.0-generate-001`
  - Veo 2: `veo-2.0-generate-001`

## File Structure

```
ailey-media-gemini/
├── package.json              # Dependencies and scripts
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment template
├── .gitignore               # Git exclusions
├── install.sh               # Installation script
├── README.md                # Quick start guide
├── QUICK_REFERENCE.md       # Command reference
├── SKILL.md                 # Full documentation
├── SUMMARY.md               # This file
└── src/
    ├── index.ts             # GeminiClient class
    └── cli.ts               # CLI commands
```

## Getting Started

### Installation

```bash
cd .github/skills/ailey-media-gemini
npm install
npm run setup  # Interactive credential wizard
```

### Get API Key

1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API key"
3. Copy and configure in `.env`:
   ```
   GEMINI_API_KEY=AIzaSy...your_key
   GEMINI_ACCOUNT_TYPE=free
   ```

### First Command

```bash
# Detect account tier
npm run detect

# Generate image
npm run generate -- \
  --prompt "Mountain landscape at sunset" \
  --aspect-ratio "16:9" \
  --output "mountain.png"
```

## Core Methods (GeminiClient)

### Account & Configuration
- `detectAccountTier()` - Detect Free/Paid/Enterprise tier with capabilities

### Image Generation
- `generateImage(options)` - Generate 1-4 images from text prompt
- `editImage(options)` - Edit image (inpaint/outpaint/style-transfer)
- `upscaleImage(options)` - Upscale 2x or 4x (Paid/Enterprise only)

### Video Generation
- `generateVideo(options)` - Generate video from text prompt (8-60 seconds)

### Management
- `saveOutput(data, filename)` - Save generated content to file
- `getGenerationHistory(limit)` - Retrieve generation history
- `clearHistory()` - Clear generation history

## CLI Commands

### Setup & Diagnostics
```bash
npm run setup      # Interactive wizard
npm run detect     # Detect account tier
npm run diagnose   # System diagnostics
```

### Generation
```bash
npm run generate   # Generate images
npm run video      # Generate videos
npm run edit       # Edit images
npm run upscale    # Upscale images (Paid/Enterprise)
```

### Management
```bash
npm run history    # View generation history
```

## Common Workflows

### Social Media Content Creation
Generate images for Instagram (1:1), Stories (9:16), and YouTube (16:9) with consistent prompts but different aspect ratios.

### Product Marketing
Generate hero images → Upscale to 4K → Create variations with seeds → Generate product demo videos.

### Image Enhancement Pipeline
Generate base image → Edit specific areas with inpainting → Extend with outpainting → Upscale final result.

### Batch Content Production
Generate multiple variations → Review history → Save best outputs → Track metadata.

## AI-ley Integration

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
      defaultModel: imagen-3.0-generate-001
```

## TypeScript Integration

```typescript
import { GeminiClient } from './.github/skills/ailey-media-gemini/src';

const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  accountType: 'paid'
});

// Generate multiple variations
const result = await client.generateImage({
  prompt: "Futuristic cityscape at night",
  aspectRatio: '16:9',
  numberOfImages: 4,
  seed: 12345
});

// Save all outputs
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

await client.saveOutput(video.video, 'city-flyover.mp4');

// Upscale favorite
const upscaled = await client.upscaleImage({
  image: 'cityscape-1.png',
  factor: 4
});

await client.saveOutput(upscaled.images[0].data, 'cityscape-4k.png');
```

## Pricing

### Free Tier
- **Cost**: $0
- **Limits**: 15 requests/min, 1,500/day
- **Features**: Basic image/video generation

### Pay-as-you-go Tier
- **Imagen 3**: $0.020 per image (standard), $0.040 (high quality)
- **Veo 2**: $0.30 per 8-sec video, $0.60 per 16-sec
- **Upscaling**: $0.010 per image
- **Limits**: 60 requests/min, 10,000/day

### Enterprise Tier
- **Custom Pricing**: Volume discounts available
- **Limits**: 300 requests/min, 100,000+/day
- **Features**: All paid features + SLA, custom fine-tuning

## Security

### Credentials Required
- **Free/Paid**: API key from Google AI Studio
- **Enterprise**: Service Account key + GCP project

### Best Practices
- Store credentials in `.env` (never commit)
- Use environment variables in production
- Rotate API keys periodically
- Enable usage quotas and budget alerts
- Monitor API usage for anomalies

## Performance

### Rate Limits
- **Free**: 15 requests/min, 1,500/day
- **Paid**: 60 requests/min, 10,000/day
- **Enterprise**: 300 requests/min, 100,000+/day

### Optimization
- Implement exponential backoff for rate limits
- Cache tier detection results
- Batch requests when possible
- Use appropriate image resolution for use case
- Monitor generation history for cost tracking

## Content Policy

Google enforces safety filters:
- **Prohibited**: Violence, hate speech, adult content, illegal activities
- **Restricted**: Political figures, copyrighted characters, deepfakes
- **Guidelines**: https://ai.google.dev/gemini-api/docs/safety-settings

## Support & Resources

### Google Resources
- **Google AI Studio**: https://aistudio.google.com/
- **API Keys**: https://aistudio.google.com/app/apikey
- **API Documentation**: https://ai.google.dev/gemini-api/docs
- **Vertex AI**: https://cloud.google.com/vertex-ai
- **Pricing**: https://ai.google.dev/pricing
- **Safety Guidelines**: https://ai.google.dev/gemini-api/docs/safety-settings

### Skill Documentation
- **Full Documentation**: [SKILL.md](SKILL.md)
- **Quick Reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Quick Start**: [README.md](README.md)

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Invalid API key | Verify at https://aistudio.google.com/app/apikey |
| Quota exceeded | Upgrade tier or wait for daily reset |
| Rate limit | Reduce frequency or upgrade tier |
| Generation failed | Refine prompt, check content policy |
| Video too long | Check tier max (Free: 8s, Paid: 16s, Enterprise: 60s) |
| Resolution too high | Check tier max (Free: 1024px, Paid: 2048px, Enterprise: 8192px) |
| Upscaling unavailable | Upgrade to Pay-as-you-go or Enterprise |

## Roadmap

### Current Features ✅
- Account tier detection (Free/Paid/Enterprise)
- Image generation with Imagen 3
- Video generation with Veo 2
- Image editing (inpaint/outpaint/style-transfer)
- Image upscaling (2x/4x)
- Generation history tracking
- Multiple aspect ratios and resolutions

### Planned Features 🚀
- Batch operations with progress tracking
- Advanced safety filter configuration
- Custom model fine-tuning (Enterprise)
- Video editing capabilities
- Style consistency across generations
- Generation templates and presets
- Cost tracking and budget alerts
- Advanced metadata and tagging

## License

MIT License - See LICENSE file for details

## Version History

- **1.0.0** (2026-02-01): Initial release with Imagen 3 and Veo 2 support
