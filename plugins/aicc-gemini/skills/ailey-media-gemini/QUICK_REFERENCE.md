# Google Gemini Quick Reference

## CLI Commands

### Setup & Diagnostics

```bash
# Interactive setup wizard
npm run setup

# Detect account tier
npm run detect

# Run diagnostics
npm run diagnose
```

### Image Generation

```bash
# Basic generation
npm run generate -- \
  --prompt "Your prompt here" \
  --output "image.png"

# With options
npm run generate -- \
  --prompt "Mountain landscape at sunset" \
  --negative-prompt "people, buildings" \
  --aspect-ratio "16:9" \
  --count 4 \
  --seed 12345 \
  --output "landscape.png"

# Multiple variations
npm run generate -- \
  --prompt "Abstract art" \
  --count 4 \
  --output "art.png"
# Outputs: art-1.png, art-2.png, art-3.png, art-4.png
```

**Aspect Ratios**: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`

### Image Editing

```bash
# Inpainting (replace area)
npm run edit -- \
  --image "photo.jpg" \
  --mask "mask.png" \
  --prompt "Blue sky with clouds" \
  --mode "inpaint" \
  --output "edited.png"

# Outpainting (extend image)
npm run edit -- \
  --image "photo.jpg" \
  --prompt "Continue the scene" \
  --mode "outpaint" \
  --output "extended.png"

# Style transfer
npm run edit -- \
  --image "photo.jpg" \
  --prompt "Van Gogh style" \
  --mode "style-transfer" \
  --strength 0.8 \
  --output "styled.png"
```

**Edit Modes**: `inpaint`, `outpaint`, `style-transfer`  
**Strength**: 0-1 (0 = subtle, 1 = strong)

### Image Upscaling (Paid/Enterprise)

```bash
# 4x upscale
npm run upscale -- \
  --image "low-res.jpg" \
  --factor 4 \
  --output "high-res.png"

# 2x upscale
npm run upscale -- \
  --image "image.jpg" \
  --factor 2 \
  --output "upscaled.png"
```

**Upscale Factors**: `2`, `4`

### Video Generation

```bash
# Basic video
npm run video -- \
  --prompt "Drone flying over city" \
  --duration 8 \
  --output "video.mp4"

# With options
npm run video -- \
  --prompt "Ocean waves at sunset" \
  --duration 16 \
  --aspect-ratio "16:9" \
  --fps 60 \
  --output "ocean.mp4"
```

**Durations**: Free (8s), Paid (16s), Enterprise (60s)  
**FPS**: 24, 30, 60  
**Aspect Ratios**: `16:9`, `9:16`, `1:1`

### History

```bash
# View recent generations
npm run history

# Limit results
npm run history -- --limit 50
```

## Account Tiers

| Feature | Free | Pay-as-you-go | Enterprise |
|---------|------|---------------|------------|
| Rate Limit | 15/min | 60/min | 300/min |
| Daily Limit | 1,500 | 10,000 | 100,000+ |
| Image Resolution | 1024x1024 | 2048x2048 | 8192x8192 |
| Video Length | 8 sec | 16 sec | 60 sec |
| Image Cost | $0 | $0.02 | Custom |
| Video Cost | $0 | $0.30 | Custom |
| Upscaling | ❌ | ✅ | ✅ |
| Priority Processing | ❌ | ✅ | ✅ |
| Custom Fine-tuning | ❌ | ❌ | ✅ |

## Common Workflows

### Workflow 1: Social Media Set

```bash
# Instagram post (1:1)
npm run generate -- \
  --prompt "Food photography, overhead shot" \
  --aspect-ratio "1:1" \
  --output "instagram.png"

# Instagram story (9:16)
npm run generate -- \
  --prompt "Food photography, overhead shot" \
  --aspect-ratio "9:16" \
  --output "story.png"

# Twitter/X (16:9)
npm run generate -- \
  --prompt "Food photography, overhead shot" \
  --aspect-ratio "16:9" \
  --output "twitter.png"
```

### Workflow 2: Product Photography

```bash
# Generate hero image
npm run generate -- \
  --prompt "Professional product photo, smartwatch on marble" \
  --aspect-ratio "16:9" \
  --count 4 \
  --output "product.png"

# Upscale best one (Paid/Enterprise)
npm run upscale -- \
  --image "product-2.png" \
  --factor 4 \
  --output "product-4k.png"

# Create variations
npm run generate -- \
  --prompt "Professional product photo, smartwatch on marble" \
  --seed 12345 \
  --count 4 \
  --output "product-v2.png"
```

### Workflow 3: Marketing Video

```bash
# Product demo (Free tier)
npm run video -- \
  --prompt "Smartphone rotation, studio lighting" \
  --duration 8 \
  --fps 30 \
  --output "demo.mp4"

# Extended version (Paid tier)
npm run video -- \
  --prompt "Smartphone rotation, studio lighting" \
  --duration 16 \
  --fps 60 \
  --output "demo-long.mp4"

# B-roll footage
npm run video -- \
  --prompt "Close-up of smartphone features" \
  --duration 8 \
  --output "broll.mp4"
```

### Workflow 4: Image Enhancement

```bash
# Generate base
npm run generate -- \
  --prompt "Modern office interior" \
  --output "base.png"

# Edit specific area
npm run edit -- \
  --image "base.png" \
  --mask "window-mask.png" \
  --prompt "Large windows with city view" \
  --mode "inpaint" \
  --output "edited.png"

# Upscale final (Paid/Enterprise)
npm run upscale -- \
  --image "edited.png" \
  --factor 4 \
  --output "final-4k.png"
```

### Workflow 5: Batch Generation

```bash
# Create multiple variations at once
npm run generate -- \
  --prompt "Abstract art, vibrant colors" \
  --count 4 \
  --aspect-ratio "1:1" \
  --output "art.png"

# Review history
npm run history -- --limit 10
```

## Environment Variables

```bash
# Required
GEMINI_API_KEY=AIzaSy...your_api_key
GEMINI_ACCOUNT_TYPE=free  # or 'paid', 'enterprise'

# Optional
GEMINI_OUTPUT_DIR=./output
GEMINI_DEFAULT_ASPECT_RATIO=16:9
GEMINI_VERBOSE_LOG=false

# For Vertex AI (Enterprise)
GEMINI_PROJECT_ID=your-gcp-project
GEMINI_LOCATION=us-central1
GEMINI_SERVICE_ACCOUNT_KEY=/path/to/key.json
```

## Models

### Imagen 3 (Image Generation)
- **Model ID**: `imagen-3.0-generate-001`
- **Fast Model**: `imagen-3.0-fast-001`
- **Features**: Photorealistic, artistic styles, text rendering

### Veo 2 (Video Generation)
- **Model ID**: `veo-2.0-generate-001`
- **Features**: Cinematic quality, camera movements, temporal consistency

## Pricing (Pay-as-you-go)

### Images
- Standard: $0.020 per image
- High quality: $0.040 per image
- Upscaling: $0.010 per image

### Videos
- 8 seconds: $0.30
- 16 seconds: $0.60
- 60 seconds (Enterprise): $2.40

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Verify at https://aistudio.google.com/app/apikey |
| "Quota exceeded" | Upgrade tier or wait for daily reset |
| "Rate limit" | Reduce request frequency or upgrade tier |
| "Generation failed" | Refine prompt, check content policy |
| "Video too long" | Check tier limits (Free: 8s, Paid: 16s, Enterprise: 60s) |
| "Resolution not supported" | Check tier max (Free: 1024px, Paid: 2048px, Enterprise: 8192px) |
| "Upscaling unavailable" | Upgrade to Pay-as-you-go or Enterprise |
| "Billing error" | Enable billing at https://console.cloud.google.com/billing |

## Content Policy

Google enforces safety filters:
- **Prohibited**: Violence, hate speech, adult content, illegal activities
- **Restricted**: Political figures, copyrighted characters
- **Guidelines**: https://ai.google.dev/gemini-api/docs/safety-settings

## Resources

- **Google AI Studio**: https://aistudio.google.com/
- **API Keys**: https://aistudio.google.com/app/apikey
- **API Docs**: https://ai.google.dev/gemini-api/docs
- **Pricing**: https://ai.google.dev/pricing
- **Full Documentation**: [SKILL.md](SKILL.md)
