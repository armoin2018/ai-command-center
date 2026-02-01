# OpenAI DALL-E & Sora Skill for AI-ley

Generate stunning images with DALL-E 3 and realistic videos with Sora through the OpenAI API.

## Features

- **DALL-E 3**: HD-quality images from text prompts
- **DALL-E 2**: Image editing and variations
- **Sora**: Realistic video generation (Tier 4+)
- **Account Tier Detection**: Automatic tier and capability detection
- **Cost Tracking**: Track generation costs
- **TypeScript & CLI**: Dual interfaces

## Account Tiers

OpenAI uses usage-based tier progression:

| Tier | Requirement | Rate Limit | Sora Access | 
|------|------------|------------|-------------|
| Free Trial | $5 credits | 3/min | Limited |
| Tier 1 | $5+ spent | 5/min | No |
| Tier 2 | $50+ spent + 7 days | 7/min | No |
| Tier 3 | $100+ spent + 7 days | 7/min | No |
| Tier 4 | $250+ spent + 14 days | 15/min | **Early Access** |
| Tier 5 | $1,000+ spent + 30 days | 50/min | **Full Access** |

## Quick Start

### 1. Get API Key

1. Create account at [platform.openai.com/signup](https://platform.openai.com/signup)
2. Add payment method at [platform.openai.com/account/billing](https://platform.openai.com/account/billing)
3. Get API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### 2. Install

```bash
cd .github/skills/ailey-media-openai
npm install
./install.sh
```

### 3. Configure

```bash
# Edit .env
OPENAI_API_KEY=sk-proj-...
OPENAI_ACCOUNT_TYPE=pay-as-you-go

# Add to .github/aicc/aicc.yaml
skills:
  openai:
    type: media
    path: .github/skills/ailey-media-openai
    config:
      apiKey: ${OPENAI_API_KEY}
```

## Common Commands

```bash
# Detect account tier
npm run detect

# Generate HD image
npm run generate -- --prompt "Mountain sunset" --quality hd

# Generate specific size
npm run generate -- --prompt "Portrait" --size 1024x1792

# Edit with inpainting
npm run edit -- --image photo.png --mask mask.png --prompt "Add trees"

# Create variations
npm run variation -- --image photo.png --count 3

# Generate video (Tier 4+)
npm run video -- --prompt "Flying through clouds" --duration 10

# View history with costs
npm run history
```

## TypeScript Integration

```typescript
import { OpenAIClient } from './src/index';

const client = new OpenAIClient({
  apiKey: process.env.OPENAI_API_KEY!
});

// Check tier
const tier = await client.detectAccountTier();
console.log(`Tier: ${tier.tier}, Sora: ${tier.soraAccess}`);

// Generate HD image
const result = await client.generateImage({
  prompt: 'A serene mountain lake at sunset',
  model: 'dall-e-3',
  size: '1792x1024',
  quality: 'hd',
  style: 'vivid'
});

console.log(`Cost: $${client.estimateCost('image', {
  model: 'dall-e-3',
  size: '1792x1024',
  quality: 'hd',
  n: 1
})}`);

// Track total costs
console.log(`Total spent: $${client.getTotalCost()}`);
```

## Workflows

### 1. Marketing Assets

```bash
# Generate HD hero image
npm run generate -- \
  --prompt "Modern tech startup office" \
  --quality hd \
  --size 1792x1024

# Create variations
npm run variation -- --image hero.png --count 3
```

### 2. Social Media Content

```bash
# Square for Instagram
npm run generate -- --prompt "Coffee art" --size 1024x1024

# Portrait for Stories
npm run generate -- --prompt "Coffee art" --size 1024x1792
```

### 3. Video Content (Tier 4+)

```bash
# Short video
npm run video -- \
  --prompt "Ocean waves at sunset" \
  --duration 5 \
  --resolution 1920x1080

# High-quality vertical
npm run video -- \
  --prompt "City nightlife" \
  --duration 10 \
  --resolution 1080x1920 \
  --fps 60
```

## Pricing

- **DALL-E 3**: $0.040-$0.120 per image
- **DALL-E 2**: $0.016-$0.020 per image
- **Sora**: ~$0.50-$2.00 per video (estimated)

See [SKILL.md](./SKILL.md) for complete pricing details.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| API key invalid | Regenerate at platform.openai.com/api-keys |
| Quota exceeded | Upgrade tier or wait for reset |
| Sora not available | Requires Tier 4+ ($250+ spent) |
| Low quality | Use `--quality hd` with DALL-E 3 |

## Documentation

- [SKILL.md](./SKILL.md) - Complete documentation
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Command reference
- [SUMMARY.md](./SUMMARY.md) - Project overview

## Resources

- [OpenAI Platform](https://platform.openai.com/)
- [API Documentation](https://platform.openai.com/docs/guides/images)
- [Pricing](https://openai.com/pricing)
- [Sora Information](https://openai.com/sora)
