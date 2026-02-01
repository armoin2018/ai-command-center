# CapCut Skill Summary

CapCut integration for AI-ley providing comprehensive video creation and editing.

## Project Information

- **Version**: 1.0.0
- **Status**: Production Ready
- **Type**: Media/Video Editing Integration
- **Language**: TypeScript 5.3.3
- **License**: MIT

## Overview

The CapCut skill provides seamless integration with CapCut's API for video creation, editing, and publishing. Manage projects, edit videos, access templates, effects, and the music library through a unified TypeScript API.

## Key Capabilities

### Project Management
- Create, read, update, delete video projects
- Organize projects with tags and descriptions
- Multiple resolution and FPS configurations
- Project status tracking

### Video Editing
- Add video, image, and audio clips
- Apply effects and transitions
- Add text overlays and titles
- Integrate background music and sound effects
- Adjust clip timing and positioning
- Multiple filter and color grading options

### Asset Library Access
- 1000+ professional effects
- 50000+ royalty-free music tracks
- 200+ premium filters
- Categorized and searchable assets
- Genre and mood-based music discovery

### Template System
- Trending video templates
- Category-based template browsing
- One-click template application
- Customizable template parameters

### Export & Rendering
- Multiple export formats (MP4, MOV, WebM, GIF)
- Multiple resolution options (1080p, 4K, 8K)
- Platform-specific presets (YouTube, TikTok, Instagram)
- Quality settings (Low, Medium, High, Maximum)
- Batch processing support
- Progress tracking

### Account Tiers
- **Free**: 5GB storage, 1080p max, watermark, 5 batch/day
- **Pro**: 100GB storage, 4K max, no watermark, 50 batch/day
- **Business**: 1000GB storage, 8K max, no watermark, unlimited batch

## Technology Stack

- **Language**: TypeScript 5.3.3
- **Framework**: Node.js 18+
- **HTTP Client**: axios ^1.6.0
- **CLI**: commander.js ^11.0.0
- **Terminal Styling**: chalk ^5.3.0
- **Environment**: dotenv ^16.3.1
- **Build**: TypeScript Compiler (tsc)

## Account Tiers

### Free Tier
- Cost: Free
- Storage: 5 GB
- Max Resolution: 1080p
- Watermark: Applied
- Batch Processing: 5 videos/day
- Effects: 100+
- Music Tracks: 5000
- Export Speed: Standard
- Support: Community

### Pro Tier
- Cost: $4.99/month or $59.99/year
- Storage: 100 GB
- Max Resolution: 4K
- Watermark: None
- Batch Processing: 50 videos/day
- Effects: 1000+
- Music Tracks: 50000+
- Export Speed: Priority
- Support: Email
- Team: Single user

### Business Tier
- Cost: $24.99/month or $249.99/year
- Storage: 1000 GB
- Max Resolution: 8K
- Watermark: None
- Batch Processing: Unlimited
- Effects: 1000+
- Music Tracks: 50000+
- Export Speed: Priority
- Support: 24/7 Priority
- Team: Collaboration features
- Custom Branding: Yes

## File Structure

```
ailey-media-capcut/
├── package.json              # npm scripts and dependencies
├── tsconfig.json            # TypeScript configuration
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── SKILL.md                 # Comprehensive documentation
├── README.md                # Quick start guide
├── QUICK_REFERENCE.md       # Command reference
├── SUMMARY.md               # This file
├── src/
│   ├── index.ts             # CapCutClient class (600+ lines)
│   └── cli.ts               # CLI commands (450+ lines)
├── dist/                    # Compiled JavaScript (generated)
└── install.sh               # Installation script
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- CapCut account (https://www.capcut.com/)
- Developer API access (https://developers.capcut.com/)

### Installation

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Verify setup
npm run detect
```

## Core Methods

**Account Tier Detection**
```typescript
const tier = await client.detectAccountTier();
// Returns: AccountTier with tier, storage, features
```

**Project Operations**
```typescript
await client.createProject(options);    // Create project
await client.listProjects(filters);     // List projects
await client.getProject(id);            // Get project details
await client.updateProject(id, updates); // Update project
await client.deleteProject(id);         // Delete project
```

**Video Editing**
```typescript
await client.addClip(projectId, clipData);     // Add media
await client.applyEffect(projectId, clipId, effectId); // Add effect
await client.addText(projectId, textData);     // Add text overlay
await client.addMusic(projectId, musicId);     // Add background music
```

**Asset Management**
```typescript
await client.listEffects(filters);   // List effects
await client.listMusic(filters);     // List music
await client.searchMusic(keyword);   // Search music
await client.listFilters(category);  // List filters
```

**Templates**
```typescript
await client.listTemplates(filters);     // List templates
await client.getTemplate(id);            // Get template details
await client.applyTemplate(projectId, templateId); // Apply template
```

**Export**
```typescript
await client.exportVideo(projectId, options); // Export video
await client.getExportStatus(jobId);         // Check export progress
```

## CLI Commands

### Authentication
- `npm run auth -- verify` - Verify API credentials
- `npm run auth -- info` - Get account information

### Detection
- `npm run detect` - Detect account tier and features

### Projects
- `npm run project -- create --name "..." --resolution 1920x1080`
- `npm run project -- list --limit 20 --sort modified`
- `npm run project -- get --id <PROJECT_ID>`
- `npm run project -- delete --id <PROJECT_ID>`

### Video Editing
- `npm run video -- add-clip --project-id <ID> --file video.mp4`
- `npm run video -- effect --project-id <ID> --clip-id <ID> --effect-id <ID>`
- `npm run video -- add-music --project-id <ID> --music-id <ID>`

### Assets
- `npm run asset -- effects --category transition`
- `npm run asset -- music-search --keyword "upbeat"`
- `npm run asset -- filters --category color`

### Templates
- `npm run template -- list --category trending`
- `npm run template -- apply --project-id <ID> --template-id <ID>`

### Export
- `npm run export -- render --project-id <ID> --preset youtube`
- `npm run export -- status --job-id <JOB_ID>`

### Utilities
- `npm run diagnose` - Run system diagnostics
- `npm run setup` - Interactive setup wizard

## Common Workflows

### Create Social Media Video
1. Create project with platform resolution
2. Apply trending template
3. Add background music from library
4. Apply effects and transitions
5. Export optimized for platform

### Batch Process Videos
1. Create multiple projects
2. Add unique content to each
3. Apply consistent styling/effects
4. Batch export all together
5. Download completed videos

### YouTube Video Creation
1. Create 1920x1080 project
2. Apply professional template
3. Add cinematic background music
4. Add effects and transitions
5. Export in maximum quality

### Music Discovery
1. Search music library by mood/genre
2. Preview tracks
3. Add selected music to project
4. Adjust volume and timing
5. Test export preview

### Effect Exploration
1. List effects by category
2. Apply effects to test clip
3. Adjust effect intensity
4. Compare different effects
5. Apply final selection to project

## Integration with AI-ley

Add to `.github/aicc/aicc.yaml`:

```yaml
skills:
  capcut:
    type: media
    path: .github/skills/ailey-media-capcut
    enabled: true
    config:
      apiKey: ${CAPCUT_API_KEY}
      apiSecret: ${CAPCUT_API_SECRET}
      accessToken: ${CAPCUT_ACCESS_TOKEN}
      userId: ${CAPCUT_USER_ID}
      timeout: 30000
    features:
      projects: true
      editing: true
      templates: true
      effects: true
      music: true
      export: true
```

## TypeScript Integration

```typescript
import { CapCutClient, AccountTier, Project } from './src/index';

const client = new CapCutClient({
  apiKey: process.env.CAPCUT_API_KEY,
  apiSecret: process.env.CAPCUT_API_SECRET,
  accessToken: process.env.CAPCUT_ACCESS_TOKEN,
  userId: process.env.CAPCUT_USER_ID
});

// Detect tier
const tier: AccountTier = await client.detectAccountTier();
console.log(`Tier: ${tier.tier}, Storage: ${tier.storage}GB`);

// Create project
const project: Project = await client.createProject({
  name: 'Marketing Video',
  width: 1920,
  height: 1080,
  fps: 30
});

// Apply template
await client.applyTemplate(project.id, 'template_trending_001');

// Add music
const music = await client.searchMusic('corporate');
await client.addMusic(project.id, music[0].id);

// Export video
const exportJob = await client.exportVideo(project.id, {
  format: 'mp4',
  resolution: '1080p',
  quality: 'high',
  preset: 'youtube'
});
```

## Security & Performance

- **API Credentials**: Store securely in .env, never commit to version control
- **Rate Limiting**: Respect batch processing limits based on tier
- **Caching**: Implement caching for frequently accessed assets
- **Batch Operations**: Pro tier supports 50/day, Business unlimited
- **Export Optimization**: Use quality and resolution settings appropriately
- **Error Handling**: Implement retry logic with exponential backoff

## Troubleshooting

| Issue | Resolution |
|-------|-----------|
| Authentication error | Verify API credentials at https://developers.capcut.com/ |
| Project not found | Check project ID with `npm run project -- list` |
| Export failed | Ensure project contains video before exporting |
| Effect incompatible | Verify effect works with clip type |
| Storage exceeded | Upgrade tier or delete old projects |
| Music unavailable | Try different search term or check region availability |
| Rate limit exceeded | Wait before retrying, upgrade to higher tier |

## Resources

- **Official Site**: https://www.capcut.com/
- **Developer Portal**: https://developers.capcut.com/
- **API Documentation**: https://developers.capcut.com/docs
- **Help Center**: https://support.capcut.com/
- **Community**: https://www.reddit.com/r/CapCut/
- **Templates**: https://www.capcut.com/template

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
