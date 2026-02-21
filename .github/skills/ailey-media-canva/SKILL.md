---
id: ailey-media-canva
name: Canva Integration Manager
description: Comprehensive Canva integration with tier detection, OAuth authentication, design management, asset operations, brand kit access, exports, and automated content creation. Use when creating designs, managing assets, exporting content, or automating design workflows.
keywords: [canva, design, graphics, templates, brand-kit, export, automation, assets, folders, media, visual-content]
tools: [canva-client, designs, assets, folders, exports, brand-kit, autofill, comments]
---

# Canva Integration Manager

Comprehensive Canva integration with automatic subscription tier detection, OAuth 2.0 authentication, design management, asset operations, brand kit access, export capabilities, and automated design workflows.

## Overview

The Canva Integration Manager provides complete automation for Canva design workflows:

- **OAuth 2.0 Authentication**: Secure authorization with access and refresh tokens
- **Tier Detection**: Automatic subscription level detection (Free, Pro, Teams, Enterprise)
- **Design Management**: Create, list, view, delete designs
- **Asset Operations**: Upload, manage, and organize media assets
- **Folder Management**: Organize designs and assets in folders
- **Export Capabilities**: Export to PNG, JPG, PDF, MP4, GIF, PPTX
- **Brand Kit Access**: Access brand colors, fonts, and logos (Pro+ tier)
- **Autofill API**: Populate designs with data programmatically
- **Comments**: Manage design comments and collaboration
- **Bulk Operations**: Batch design creation and export

## When to Use

- Automating design creation from templates
- Batch exporting designs for marketing campaigns
- Managing brand assets and ensuring brand consistency
- Integrating Canva into content workflows
- Programmatic design generation from data
- Social media content automation
- E-commerce product image generation
- Automated presentation creation

## Installation

```bash
cd .github/skills/ailey-media-canva
npm install
```

## Authentication

### OAuth 2.0 Setup

**Required for accessing Canva API:**

1. Go to [Canva Developers](https://www.canva.com/developers/apps)
2. Create a new app or select existing app
3. Add redirect URI: `http://localhost:3000/callback`
4. Copy Client ID and Client Secret
5. Add to workspace `.env`:

```bash
CANVA_CLIENT_ID=your_client_id
CANVA_CLIENT_SECRET=your_client_secret
CANVA_REDIRECT_URI=http://localhost:3000/callback
```

6. Run OAuth flow:

```bash
npm run canva setup
# Browser opens for authorization
# After authorizing, you receive a code
npm run canva oauth-callback -- --code YOUR_AUTH_CODE
```

7. Add tokens to `.env`:

```bash
CANVA_ACCESS_TOKEN=your_access_token
CANVA_REFRESH_TOKEN=your_refresh_token
```

## Subscription Tier Detection

The skill automatically detects your Canva subscription tier and enables/disables features accordingly:

```bash
npm run canva detect-tier
```

### Tier Capabilities Matrix

| Feature | Free | Pro | Teams | Enterprise |
|---------|------|-----|-------|------------|
| Templates | 250,000 | 610,000 | 610,000 | 610,000 |
| Storage | 5 GB | 1 TB | 1 TB | Unlimited |
| Brand Kit | ✗ | ✓ | ✓ | ✓ |
| Magic Resize | ✗ | ✓ | ✓ | ✓ |
| Background Remover | ✗ | ✓ | ✓ | ✓ |
| Custom Fonts | ✗ | ✓ | ✓ | ✓ |
| Team Members | 0 | 0 | 50 | Unlimited |
| Brand Kit Sharing | ✗ | ✗ | ✓ | ✓ |
| Priority Support | ✗ | ✗ | ✓ | ✓ |
| SSO | ✗ | ✗ | ✗ | ✓ |
| API Rate Limit | 60/min | 120/min | 200/min | 300/min |

## Quick Start

### Get Current User

```bash
npm run canva me
```

### List Designs

```bash
# All designs
npm run canva designs

# Search designs
npm run canva designs -- --query "social media"

# Filter by ownership
npm run canva designs -- --ownership owned
```

### Create Design

```bash
npm run canva create-design -- --type presentation --title "Q1 Report"
```

### Export Design

```bash
# Export to PNG
npm run canva export -- --id DESIGN_ID --format PNG --quality high

# Export to PDF
npm run canva export -- --id DESIGN_ID --format PDF

# Check export status
npm run canva export-status -- --job JOB_ID
```

### Manage Assets

```bash
# List assets
npm run canva assets

# Search assets
npm run canva assets -- --query "logo" --type IMAGE

# Upload asset
npm run canva upload -- --file ./image.png --type IMAGE
```

### Brand Kit (Pro+ Tier)

```bash
# View brand colors
npm run canva brand -- --colors

# View brand fonts
npm run canva brand -- --fonts

# View brand logos
npm run canva brand -- --logos
```

## Programmatic Usage

### TypeScript/JavaScript Integration

```typescript
import { getCanvaConfig } from './.github/skills/ailey-media-canva/scripts/config.js';
import CanvaClient from './.github/skills/ailey-media-canva/scripts/canva-client.js';

// Initialize client
const config = getCanvaConfig();
const client = new CanvaClient(config);

// Detect tier
const tier = await client.detectTier();
console.log(`Subscription tier: ${tier}`);

// Get current user
const user = await client.getCurrentUser();
console.log(`Hello, ${user.display_name}`);

// List designs
const designs = await client.listDesigns({ limit: 10 });
for (const design of designs.items) {
  console.log(`${design.title} - ${design.urls.view_url}`);
}

// Create design
const newDesign = await client.createDesign({
  design_type: 'presentation',
  title: 'My Presentation',
});
console.log(`Design created: ${newDesign.urls.view_url}`);

// Export design
const exportJob = await client.exportDesign(newDesign.id, 'PDF', {
  quality: 'high',
});
console.log(`Export job ID: ${exportJob.job.id}`);

// Check export status
const job = await client.getExportJob(exportJob.job.id);
if (job.status === 'success') {
  console.log(`Download: ${job.urls.get_url}`);
}

// Upload asset
const asset = await client.uploadAsset('./logo.png', 'IMAGE');
console.log(`Asset ID: ${asset.asset_id}`);

// Access brand kit (Pro+ tier)
const colors = await client.getBrandColors();
for (const color of colors.items) {
  console.log(`${color.hex_code} - ${color.name}`);
}
```

## Export Formats

Available export formats:

- **PNG**: High-quality raster images
- **JPG**: Compressed raster images
- **PDF**: Document and print-ready format
- **MP4**: Video exports (for video designs)
- **GIF**: Animated images
- **PPTX**: PowerPoint presentations

## Feature Availability

The client automatically checks feature availability based on detected tier:

```typescript
// This will throw an error if brand kit not available in current tier
await client.getBrandColors();

// Manual feature check
const tier = await client.detectTier();
import { checkFeatureAvailability } from './.github/skills/ailey-media-canva/scripts/config.js';
const brandKitAvailable = checkFeatureAvailability(tier, 'brandKit');
```

## Rate Limiting

API rate limits vary by tier:

- **Free**: 60 requests/minute
- **Pro**: 120 requests/minute
- **Teams**: 200 requests/minute
- **Enterprise**: 300 requests/minute

The client automatically handles rate limit errors and provides retry-after information.

## Environment Configuration

All environment variables (checked in order):

1. `~/.vscode/.env` (global configuration)
2. `<workspace-root>/.env` (project configuration)
3. `<workspace-root>/.env.local` (local overrides)

### Available Variables

```bash
# OAuth 2.0 Authentication
CANVA_CLIENT_ID=your_client_id
CANVA_CLIENT_SECRET=your_client_secret
CANVA_REDIRECT_URI=http://localhost:3000/callback

# Access Tokens
CANVA_ACCESS_TOKEN=your_access_token
CANVA_REFRESH_TOKEN=your_refresh_token

# API Endpoints (optional, defaults shown)
CANVA_API_URL=https://api.canva.com/rest/v1
CANVA_AUTH_URL=https://www.canva.com/api/oauth

# Manual Tier Override (optional, auto-detected if not set)
CANVA_TIER=pro

# Brand and Team IDs (optional)
CANVA_BRAND_ID=your_brand_id
CANVA_TEAM_ID=your_team_id
```

## Troubleshooting

### Authentication Errors

**Problem**: `No authentication configured`

**Solution**: Complete OAuth setup and add `CANVA_ACCESS_TOKEN` to `.env`

### Rate Limit Errors

**Problem**: `Rate limit exceeded`

**Solution**: Implement exponential backoff or upgrade subscription tier for higher limits

### Feature Unavailable Errors

**Problem**: `Feature "brandKit" is not available in free tier`

**Solution**: Upgrade subscription to Pro or higher tier

### Tier Detection Failures

**Problem**: Cannot auto-detect subscription tier

**Solution**: Manually set `CANVA_TIER` environment variable

## Related Skills

- **ailey-media-gamma**: Presentation creation
- **ailey-media-capcut**: Video editing
- **ailey-tools-image**: Image manipulation and conversion
- **ailey-soc-instagram**: Social media publishing
- **ailey-soc-facebook**: Social media content distribution

## API Reference

Full API documentation: [Canva Connect APIs](https://www.canva.dev/docs/connect/)

## Support

- Canva Developers: https://www.canva.com/developers/
- Community Forum: https://community.canva.dev/
- Support Portal: https://canva-external.atlassian.net/servicedesk/

---
version: 1.0.0
updated: 2026-02-03
reviewed: 2026-02-03
score: 4.6
---
