# CapCut Integration Skill

Comprehensive CapCut integration for video creation and editing through AI-ley.

## Features

✅ Project management (create, edit, delete, organize)
✅ Video editing (effects, transitions, text, music)
✅ Asset library (1000+ effects, 50000+ music tracks)
✅ Template support (trending and category-based)
✅ Video export (multiple formats and resolutions)
✅ Batch processing (Pro/Business tiers)
✅ Automatic account tier detection
✅ API-based video creation and editing
✅ Royalty-free music integration
✅ Professional color grading and filters

## Quick Setup

### 1. Create CapCut Account

- Sign up at https://www.capcut.com/
- Download CapCut desktop app
- Verify your email

### 2. Get API Access

- Go to https://developers.capcut.com/
- Create developer account
- Create new application
- Request API access
- Copy API Key, Secret, and Access Token

### 3. Configure Environment

Create `.env` file:
```bash
CAPCUT_API_KEY=your_api_key
CAPCUT_API_SECRET=your_api_secret
CAPCUT_ACCESS_TOKEN=your_access_token
CAPCUT_USER_ID=your_user_id
CAPCUT_ACCOUNT_TYPE=pro
```

### 4. Test Connection

```bash
npm run build
npm run auth -- verify
npm run detect
```

## Account Tiers

### Free
- Storage: 5 GB
- Resolution: Up to 1080p
- Watermark: Applied
- Batch: 5 videos/day
- Effects: 100+
- Music: 5000 tracks

### Pro ($4.99/month)
- Storage: 100 GB
- Resolution: Up to 4K
- Watermark: None
- Batch: 50 videos/day
- Effects: 1000+
- Music: 50000+ tracks
- Priority export

### Business ($24.99/month)
- Storage: 1000 GB
- Resolution: Up to 8K
- Watermark: None
- Batch: Unlimited
- All Pro features
- Team collaboration
- Custom branding
- 24/7 support

## Common Commands

```bash
# Detect tier and capabilities
npm run detect

# Create video project
npm run project -- create --name "My Video" --resolution 1920x1080

# List projects
npm run project -- list --limit 20

# Search for music
npm run asset -- music-search --keyword "upbeat"

# List templates
npm run template -- list --category trending

# Export video
npm run export -- render --project-id <ID> --preset youtube
```

## TypeScript Integration

```typescript
import { CapCutClient } from './src/index';

const client = new CapCutClient({
  apiKey: process.env.CAPCUT_API_KEY,
  apiSecret: process.env.CAPCUT_API_SECRET,
  accessToken: process.env.CAPCUT_ACCESS_TOKEN,
  userId: process.env.CAPCUT_USER_ID
});

// Detect tier
const tier = await client.detectAccountTier();

// Create project
const project = await client.createProject({
  name: 'Social Media Video',
  width: 1080,
  height: 1920
});

// Search and add music
const music = await client.searchMusic('upbeat');
await client.addMusic(project.id, music[0].id);

// Export video
const exportJob = await client.exportVideo(project.id, {
  format: 'mp4',
  resolution: '1080p',
  preset: 'instagram'
});
```

## Workflows

### Create Social Media Video
1. Create project with social media preset
2. Apply trending template
3. Add background music
4. Add effects and transitions
5. Export optimized for platform

### Batch Process Videos
1. Create multiple projects from template
2. Add unique content to each
3. Batch export all at once
4. Download all videos

### Create YouTube Intro
1. Create 1920x1080 project
2. Apply intro template
3. Customize text and colors
4. Add background music
5. Export in maximum quality

## API Reference

**Project Operations**
- `createProject()` - Create new video project
- `listProjects()` - List all projects
- `getProject()` - Get project details
- `updateProject()` - Update project information
- `deleteProject()` - Delete project

**Video Editing**
- `addClip()` - Add media to project
- `applyEffect()` - Apply effect to clip
- `addText()` - Add text overlay
- `addMusic()` - Add background music

**Assets**
- `listEffects()` - List available effects
- `listMusic()` - List music tracks
- `searchMusic()` - Search music library
- `listFilters()` - List color filters

**Templates**
- `listTemplates()` - List video templates
- `getTemplate()` - Get template details
- `applyTemplate()` - Apply template to project

**Export**
- `exportVideo()` - Export finished video
- `getExportStatus()` - Check export progress

## Resources

- [CapCut Official](https://www.capcut.com/)
- [Developer Portal](https://developers.capcut.com/)
- [API Docs](https://developers.capcut.com/docs)
- [Help Center](https://support.capcut.com/)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
