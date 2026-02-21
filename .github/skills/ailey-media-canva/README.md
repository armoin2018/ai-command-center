# Canva Integration Manager

Comprehensive Canva integration with automatic subscription tier detection, OAuth 2.0 authentication, and complete design automation.

## Features

- ✅ OAuth 2.0 authentication with refresh token support
- ✅ Automatic subscription tier detection (Free → Enterprise)
- ✅ Design management (create, list, view, delete)
- ✅ Asset operations (upload, list, manage)
- ✅ Folder organization
- ✅ Export to multiple formats (PNG, JPG, PDF, MP4, GIF, PPTX)
- ✅ Brand kit access (Pro+ tier)
- ✅ Autofill API for data-driven designs
- ✅ Comments and collaboration
- ✅ Rate limiting with retry-after support
- ✅ Feature availability checking based on tier

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Authentication

**Create OAuth App:**

1. Go to https://www.canva.com/developers/apps
2. Create a new app
3. Set redirect URI to `http://localhost:3000/callback`
4. Copy Client ID and Client Secret

**Add to workspace `.env`:**

```bash
CANVA_CLIENT_ID=your_client_id
CANVA_CLIENT_SECRET=your_client_secret
CANVA_REDIRECT_URI=http://localhost:3000/callback
```

### 3. Authorize

```bash
npm run canva setup
# Follow browser authorization flow
npm run canva oauth-callback -- --code YOUR_CODE
```

Add the returned tokens to `.env`:

```bash
CANVA_ACCESS_TOKEN=your_access_token
CANVA_REFRESH_TOKEN=your_refresh_token
```

### 4. Detect Your Tier

```bash
npm run canva detect-tier
```

### 5. Get Started

```bash
# View your profile
npm run canva me

# List designs
npm run canva designs

# Create design
npm run canva create-design -- --type presentation --title "My Design"

# Export design
npm run canva export -- --id DESIGN_ID --format PNG

# List assets
npm run canva assets

# Upload asset
npm run canva upload -- --file ./image.png --type IMAGE

# View brand kit (Pro+ tier)
npm run canva brand
```

## CLI Commands

### Setup & Authentication

```bash
# Interactive setup
npm run canva setup

# Exchange OAuth code for tokens
npm run canva oauth-callback -- --code YOUR_CODE

# Detect subscription tier
npm run canva detect-tier

# Get current user info
npm run canva me
```

### Design Management

```bash
# List all designs
npm run canva designs

# Search designs
npm run canva designs -- --query "social media"

# Filter by ownership
npm run canva designs -- --ownership owned --limit 20

# Create design
npm run canva create-design -- --type presentation --title "Q1 Report"
npm run canva create-design -- --type social --title "Instagram Post"
```

### Exports

```bash
# Export to PNG
npm run canva export -- --id DESIGN_ID --format PNG --quality high

# Export to PDF
npm run canva export -- --id DESIGN_ID --format PDF

# Export to video
npm run canva export -- --id DESIGN_ID --format MP4

# Check export status
npm run canva export-status -- --job JOB_ID
```

### Assets

```bash
# List all assets
npm run canva assets

# Search assets
npm run canva assets -- --query "logo" --type IMAGE

# Upload asset
npm run canva upload -- --file ./logo.png --type IMAGE
npm run canva upload -- --file ./video.mp4 --type VIDEO
```

### Brand Kit (Pro+ Tier)

```bash
# View brand colors
npm run canva brand -- --colors

# View brand fonts
npm run canva brand -- --fonts

# View brand logos
npm run canva brand -- --logos

# View all brand assets
npm run canva brand
```

## Subscription Tiers

| Tier | Templates | Storage | Brand Kit | Magic Resize | Team | API Limit |
|------|-----------|---------|-----------|--------------|------|-----------|
| Free | 250,000 | 5 GB | ✗ | ✗ | ✗ | 60/min |
| Pro | 610,000 | 1 TB | ✓ | ✓ | ✗ | 120/min |
| Teams | 610,000 | 1 TB | ✓ | ✓ | ✓ | 200/min |
| Enterprise | 610,000 | Unlimited | ✓ | ✓ | ✓ | 300/min |

## Programmatic Usage

```typescript
import { getCanvaConfig } from './scripts/config.js';
import CanvaClient from './scripts/canva-client.js';

// Initialize
const config = getCanvaConfig();
const client = new CanvaClient(config);

// Detect tier
const tier = await client.detectTier();
console.log(`Tier: ${tier}`);

// List designs
const designs = await client.listDesigns({ limit: 10 });

// Create design
const design = await client.createDesign({
  design_type: 'presentation',
  title: 'My Presentation',
});

// Export design
const exportJob = await client.exportDesign(design.id, 'PDF');

// Upload asset
const asset = await client.uploadAsset('./logo.png', 'IMAGE');

// Brand kit (Pro+ tier)
const colors = await client.getBrandColors();
const fonts = await client.getBrandFonts();
```

## Export Formats

- **PNG** - High-quality raster images
- **JPG** - Compressed images
- **PDF** - Print-ready documents
- **MP4** - Video exports
- **GIF** - Animated images
- **PPTX** - PowerPoint presentations

## Environment Variables

```bash
# OAuth Credentials
CANVA_CLIENT_ID=your_client_id
CANVA_CLIENT_SECRET=your_client_secret
CANVA_REDIRECT_URI=http://localhost:3000/callback

# Access Tokens
CANVA_ACCESS_TOKEN=your_access_token
CANVA_REFRESH_TOKEN=your_refresh_token

# Optional
CANVA_API_URL=https://api.canva.com/rest/v1
CANVA_AUTH_URL=https://www.canva.com/api/oauth
CANVA_TIER=pro
CANVA_BRAND_ID=your_brand_id
CANVA_TEAM_ID=your_team_id
```

## Documentation

- [SKILL.md](SKILL.md) - Complete feature documentation
- [Canva API Docs](https://www.canva.dev/docs/connect/)
- [Canva Developers](https://www.canva.com/developers/)

## Support

- Issues: File an issue in the parent repository
- API Documentation: https://www.canva.dev/docs/connect/
- Community: https://community.canva.dev/

## License

See parent repository LICENSE file.
