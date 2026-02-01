# OpenAI DALL-E & Sora Skill - Project Summary

**ID:** `ailey-media-openai`  
**Type:** Media Generation Skill  
**Version:** 1.0.0  
**Status:** Production Ready  
**Last Updated:** 2026-01-30

## Overview

Comprehensive TypeScript integration for OpenAI's DALL-E 3 and Sora AI models, enabling high-quality image and video generation through both CLI and programmatic interfaces with automatic account tier detection and cost tracking.

### Key Capabilities

- **DALL-E 3**: State-of-the-art image generation with exceptional prompt adherence
- **DALL-E 2**: Image editing (inpainting) and variations
- **Sora**: Realistic video generation (Tier 4+ early access)
- **Account Tier Detection**: Automatic detection of Trial through Tier 5 accounts
- **Cost Tracking**: Precise cost estimation and total spend tracking
- **Dual Interface**: CLI commands and TypeScript API

## Technology Stack

### Core Dependencies

- **TypeScript**: 5.3.3 (strict mode, ES2020 target)
- **OpenAI SDK**: ^4.20.0 (official TypeScript SDK)
- **axios**: ^1.6.0 (HTTP client fallback)
- **commander**: ^11.0.0 (CLI framework)
- **chalk**: ^5.3.0 (terminal styling)
- **dotenv**: ^16.3.1 (environment variables)
- **form-data**: ^4.0.0 (multipart uploads)

### Build System

- **Compiler**: TypeScript compiler (tsc)
- **Target**: CommonJS modules
- **Scripts**: 8 npm scripts for all operations

## Account Tiers

OpenAI uses usage-based tier progression based on cumulative spending:

| Tier | Requirement | Rate Limit | Daily Limit | Sora Access | Features |
|------|------------|------------|-------------|-------------|----------|
| **Free Trial** | $5 credits (3mo) | 3/min | 200/day | Limited | Testing only |
| **Tier 1** | $5+ spent | 5/min | 500/day | No | Full DALL-E 3 |
| **Tier 2** | $50+ spent + 7 days | 7/min | 1,000/day | No | Higher limits |
| **Tier 3** | $100+ spent + 7 days | 7/min | 2,000/day | No | Higher limits |
| **Tier 4** | $250+ spent + 14 days | 15/min | 5,000/day | **Early Access** | Sora beta |
| **Tier 5** | $1,000+ spent + 30 days | 50/min | 10,000+/day | **Full Access** | Enterprise |

**Tier Progression**: Automatic based on cumulative API spending and age of account

## File Structure

```
ailey-media-openai/
├── package.json                    # NPM configuration with 8 scripts
├── tsconfig.json                   # TypeScript compiler config
├── .env.example                    # Environment template with tier settings
├── .gitignore                      # Git exclusions
├── SKILL.md                        # Complete documentation (17,000+ bytes)
├── README.md                       # Quick start guide
├── QUICK_REFERENCE.md              # Command reference and workflows
├── SUMMARY.md                      # This file
├── install.sh                      # Automated installation script
└── src/
    ├── index.ts                    # OpenAIClient class (500+ lines)
    └── cli.ts                      # CLI commands (8 command groups)
```

## Getting Started

### 1. Prerequisites

- Node.js 18+ and npm 9+
- OpenAI account with payment method
- API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 2. Installation

```bash
cd .github/skills/ailey-media-openai
npm install
./install.sh
```

### 3. Configuration

#### Environment Variables (.env)

```bash
# Required
OPENAI_API_KEY=sk-proj-your_key_here

# Optional
OPENAI_ORG_ID=org-123                     # For team accounts
OPENAI_ACCOUNT_TYPE=pay-as-you-go
OPENAI_OUTPUT_DIR=./output

# Defaults
DALL_E_3_MODEL=dall-e-3
SORA_MODEL=sora-1.0
DEFAULT_SIZE=1024x1024
DEFAULT_QUALITY=standard
DEFAULT_STYLE=vivid
```

#### AI-ley Configuration (.github/aicc/aicc.yaml)

```yaml
skills:
  openai:
    type: media
    path: .github/skills/ailey-media-openai
    config:
      apiKey: ${OPENAI_API_KEY}
      organizationId: ${OPENAI_ORG_ID}
      accountType: pay-as-you-go
      rateLimit: 5
      costTracking: true
```

### 4. Verify Installation

```bash
# Run diagnostics
npm run diagnose

# Check account tier
npm run detect

# View help
npm run setup
```

### 5. First Generation

```bash
# Generate standard image
npm run generate -- --prompt "Mountain landscape at sunset"

# Generate HD image
npm run generate -- \
  --prompt "Futuristic cityscape" \
  --quality hd \
  --size 1792x1024
```

## Core Methods

### OpenAIClient Class

```typescript
class OpenAIClient {
  constructor(config: OpenAIConfig)
  
  // Account Management
  detectAccountTier(): Promise<AccountTier>
  
  // Image Generation (DALL-E 3)
  generateImage(options: GenerateImageOptions): Promise<GeneratedImage>
  
  // Image Editing (DALL-E 2)
  editImage(options: EditImageOptions): Promise<GeneratedImage>
  
  // Image Variations (DALL-E 2)
  createVariation(options: CreateVariationOptions): Promise<GeneratedImage>
  
  // Video Generation (Sora - Tier 4+)
  generateVideo(options: GenerateVideoOptions): Promise<GeneratedVideo>
  
  // Cost Tracking
  estimateCost(operation: string, options: any): number
  getTotalCost(): number
  
  // History
  getGenerationHistory(limit?: number): Promise<GenerationRecord[]>
  clearHistory(): Promise<void>
  
  // File Management
  saveOutput(data: Buffer | string, filename: string): Promise<string>
}
```

## CLI Commands

| Command | Description | Example |
|---------|-------------|---------|
| `setup` | Interactive setup wizard | `npm run setup` |
| `detect` | Detect account tier and capabilities | `npm run detect` |
| `generate` | Generate image with DALL-E 3 | `npm run generate -- --prompt "..." --quality hd` |
| `edit` | Edit image with inpainting | `npm run edit -- --image photo.png --mask mask.png --prompt "..."` |
| `variation` | Create image variations | `npm run variation -- --image photo.png --count 3` |
| `video` | Generate video with Sora (Tier 4+) | `npm run video -- --prompt "..." --duration 10` |
| `history` | View generation history with costs | `npm run history --limit 20` |
| `diagnose` | Run system diagnostics | `npm run diagnose` |

## Common Workflows

### Workflow 1: Marketing Assets

Generate HD hero image → Create variations → Inpaint edits

```bash
npm run generate -- --prompt "Tech office" --quality hd --size 1792x1024
npm run variation -- --image hero.png --count 3
npm run edit -- --image hero.png --mask mask.png --prompt "Add plants"
```

**Cost**: ~$0.30 (1 HD landscape + 3 variations + 1 edit)

### Workflow 2: Social Media Content

Generate multiple aspect ratios for different platforms

```bash
npm run generate -- --prompt "Coffee art" --size 1024x1024     # Instagram
npm run generate -- --prompt "Coffee art" --size 1024x1792     # Stories
npm run generate -- --prompt "Coffee art" --size 1792x1024     # Cover
```

**Cost**: ~$0.16 (3 standard images)

### Workflow 3: Video Content (Tier 4+)

Generate Sora videos for marketing or social media

```bash
npm run video -- --prompt "Ocean sunset" --duration 10 --resolution 1920x1080
```

**Cost**: ~$1.00-$2.00 (10-second 1080p video estimate)

### Workflow 4: Iterative Design

Concept → Variations → Select → HD refinement

```typescript
// Generate concept
const concept = await client.generateImage({
  prompt: 'Logo for tech startup',
  quality: 'standard'
});

// Create variations
const variations = await client.createVariation({
  image: 'concept.png',
  n: 5
});

// Regenerate winner in HD
const final = await client.generateImage({
  prompt: concept.images[0].revisedPrompt,
  quality: 'hd'
});
```

**Cost**: ~$0.18 (1 standard + 5 variations + 1 HD)

### Workflow 5: Batch Creation with Budget Control

```typescript
const budget = 1.00;
let spent = 0;

for (const prompt of prompts) {
  const cost = client.estimateCost('image', {...});
  if (spent + cost > budget) break;
  
  await client.generateImage({...});
  spent += cost;
}

console.log(`Total: $${client.getTotalCost()}`);
```

## Model Details

### DALL-E 3 (October 2023)

- **Max Resolution**: 1792×1024 or 1024×1792
- **Quality**: Standard or HD (2x cost)
- **Styles**: Vivid (hyper-real) or Natural (authentic)
- **Special Feature**: Revised prompt capture (model's interpretation)
- **Limitations**: 1 image per request
- **Strengths**: Exceptional prompt adherence, fine detail

### DALL-E 2 (Legacy)

- **Max Resolution**: 1024×1024
- **Features**: Editing (inpainting) and variations
- **Batch**: Up to 10 images per request
- **Use Cases**: Iterative refinement, batch variations

### Sora (Early 2024 - Limited Access)

- **Max Duration**: 20 seconds
- **Resolutions**: 1080p, 1920×1080, 1080×1920
- **FPS**: 24, 30, 60
- **Access**: Tier 4+ ($250+ spent + 14 days)
- **Status**: Early access / limited availability
- **Strengths**: Realistic motion, temporal consistency

## TypeScript Integration

### Basic Example

```typescript
import { OpenAIClient } from './src/index';

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!
});

// Generate image
const result = await client.generateImage({
  prompt: 'Serene mountain lake',
  model: 'dall-e-3',
  quality: 'hd'
});

// Track costs
console.log(`Cost: $${client.estimateCost('image', {
  model: 'dall-e-3',
  quality: 'hd',
  n: 1
})}`);
```

### With Tier Detection

```typescript
const tier = await client.detectAccountTier();

if (tier.soraAccess) {
  const video = await client.generateVideo({
    prompt: 'Flying through clouds',
    duration: 10
  });
}
```

## Security & Best Practices

### API Key Management

- **Never commit** API keys to version control
- Store in `.env` file (gitignored)
- Rotate keys periodically
- Use separate keys for dev/prod
- For teams: Use organization ID

### Content Policy

OpenAI enforces strict content moderation:

- No violence, hate speech, or illegal content
- No explicit sexual content
- No harassment or abuse
- No generation of public figures
- No copyrighted characters

**Violations**: Can result in account suspension

### Rate Limiting

- Respect tier-based rate limits (3-50/min)
- Implement exponential backoff on errors
- Monitor daily quotas (200-10,000+/day)
- Track costs to avoid surprises

### Performance

- Use `standard` quality for drafts (half the cost)
- Batch variations for efficiency (DALL-E 2)
- Cache frequently used images
- Use appropriate sizes (smaller = faster + cheaper)

## Pricing & Cost Management

### DALL-E 3 Pricing

| Size | Standard | HD |
|------|----------|-----|
| 1024×1024 | $0.040 | $0.080 |
| 1024×1792 | $0.080 | $0.120 |
| 1792×1024 | $0.080 | $0.120 |

### DALL-E 2 Pricing

| Size | Cost |
|------|------|
| 1024×1024 | $0.020 |
| 512×512 | $0.018 |
| 256×256 | $0.016 |

### Sora Pricing (Estimated)

- 5 seconds: ~$0.50
- 10 seconds: ~$1.00
- 20 seconds: ~$2.00

**Note**: Sora pricing not yet public; estimates based on beta feedback

### Cost Tracking

```typescript
// Before generating
const cost = client.estimateCost('image', {...});
console.log(`Will cost: $${cost}`);

// After generating
const total = client.getTotalCost();
console.log(`Total spent: $${total}`);

// View history with costs
const history = await client.getGenerationHistory();
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| **API key invalid** | Missing/incorrect key | Regenerate at platform.openai.com/api-keys |
| **Quota exceeded** | Rate limit hit | Wait for minute reset or upgrade tier |
| **Insufficient quota** | Daily limit reached | Wait 24h or upgrade tier |
| **Sora not available** | Tier 1-3 account | Spend $250+ to reach Tier 4 |
| **Content policy violation** | Prohibited content | Revise prompt to comply with policies |
| **Low image quality** | Using standard quality | Use `--quality hd` for DALL-E 3 |
| **PNG format error** | JPEG/other format | Convert to PNG for editing/variations |
| **Mask not working** | No transparency | Ensure mask PNG has transparent regions |

## Resources

### OpenAI Platform

- **Main Platform**: https://platform.openai.com/
- **API Keys**: https://platform.openai.com/api-keys
- **Billing**: https://platform.openai.com/account/billing
- **Usage Tracking**: https://platform.openai.com/usage

### Documentation

- **Image Generation**: https://platform.openai.com/docs/guides/images
- **API Reference**: https://platform.openai.com/docs/api-reference/images
- **Sora**: https://openai.com/sora
- **Pricing**: https://openai.com/pricing

### Support

- **Documentation**: https://platform.openai.com/docs
- **Community**: https://community.openai.com
- **Status Page**: https://status.openai.com

## Development

### Build

```bash
npm run build        # Compile TypeScript
npm run dev          # Watch mode
```

### Testing

```bash
npm run diagnose     # System check
npm run detect       # Tier detection
npm run history      # View past generations
```

### Deployment

1. Build TypeScript: `npm run build`
2. Verify: `npm run diagnose`
3. Test: Generate sample image
4. Deploy: Copy to production environment
5. Configure: Update .env with production API key

## Changelog

### Version 1.0.0 (2026-01-30)

**Initial Release**

- ✅ DALL-E 3 integration with HD quality and styles
- ✅ DALL-E 2 editing and variations
- ✅ Sora placeholder (API pending public release)
- ✅ Account tier detection (Trial through Tier 5)
- ✅ Cost tracking system with estimation
- ✅ CLI interface with 8 command groups
- ✅ TypeScript API with full type safety
- ✅ Comprehensive documentation
- ✅ Installation automation

## License

MIT License - See LICENSE file for details

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## Support

For issues or questions:

1. Check [SKILL.md](./SKILL.md) documentation
2. Review [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
3. Run `npm run diagnose` for system check
4. Check OpenAI status at status.openai.com
5. Open issue in repository

---

**Project**: AI-ley Kit  
**Skill**: OpenAI DALL-E & Sora Media Generation  
**Maintained by**: AI Command Center Team  
**Last Updated**: 2026-01-30
