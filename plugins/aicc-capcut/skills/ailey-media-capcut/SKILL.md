---
id: ailey-media-capcut
name: CapCut Integration
description: Comprehensive CapCut integration for video creation, editing, and publishing. Includes automatic account tier detection (Free, Pro, Business), setup instructions, and AI-ley configuration guidance. Manage projects, edit videos, access templates, effects, and music library.
keywords: [capcut, video-editing, media-production, video-creation, templates, effects, music, editing]
tools: [axios, commander, chalk, dotenv]
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
---

# CapCut Skill for AI-ley

Comprehensive CapCut integration for video creation, editing, and publishing through AI-ley.

## Overview

The CapCut skill provides seamless integration with CapCut's API for video editing, project management, template access, and media asset management. Create, edit, and export professional videos with automatic account tier detection and feature availability mapping.

### Key Features

- **Project Management**: Create, edit, delete, and organize video projects
- **Video Editing**: Apply effects, transitions, adjust clips, add text and stickers
- **Asset Library**: Access effects, music, stickers, and filter collections
- **Templates**: Browse and apply pre-made video templates
- **Media Handling**: Upload, manage, and organize media assets
- **Export & Rendering**: Export videos in multiple formats and resolutions
- **Automatic Tier Detection**: Identifies account tier with capabilities mapping
- **Batch Processing**: Process multiple videos efficiently
- **Effect Gallery**: Access 1000+ effects across categories
- **Music Library**: Access royalty-free music for video projects
- **Filter Collections**: Professional color grading and filters
- **Account Tier Mapping**: Free, Pro, and Business tiers with feature mapping

## Account Tiers

### Free Tier
- Cost: Free
- Storage: 5 GB
- Projects: Unlimited
- Export Resolution: Up to 1080p
- Watermark: CapCut watermark applied
- Cloud Storage: 5 GB
- Batch Processing: Up to 5 videos/day
- Features: Basic editing, limited effects, limited music
- Suitable for: Personal use, hobby creators, testing

### Pro Tier
- Cost: $4.99/month or $59.99/year
- Storage: 100 GB
- Projects: Unlimited
- Export Resolution: Up to 4K
- Watermark: No watermark
- Cloud Storage: 100 GB
- Batch Processing: Up to 50 videos/day
- Features: All free features, premium effects, full music library, advanced filters, priority export
- Suitable for: Content creators, professional bloggers, small businesses

### Business Tier
- Cost: $24.99/month or $249.99/year
- Storage: 1000 GB
- Projects: Unlimited
- Export Resolution: Up to 8K
- Watermark: No watermark
- Cloud Storage: 1000 GB
- Batch Processing: Unlimited
- Features: All Pro features, team collaboration, advanced API access, custom branding, priority support
- Suitable for: Agencies, production companies, large teams

## Feature Availability Matrix

| Feature | Free | Pro | Business |
|---------|------|------|----------|
| Projects | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Storage | ⚠️ 5 GB | ✅ 100 GB | ✅ 1000 GB |
| Video Resolution | ⚠️ Up to 1080p | ✅ Up to 4K | ✅ Up to 8K |
| Watermark | ❌ Applied | ✅ No | ✅ No |
| Effects | ⚠️ Limited (100+) | ✅ Full (1000+) | ✅ Full (1000+) |
| Music Library | ⚠️ Limited (5000) | ✅ Full (50000+) | ✅ Full (50000+) |
| Filters | ⚠️ Basic (50) | ✅ Premium (200+) | ✅ Premium (200+) |
| Export Speed | ⚠️ Standard | ✅ Priority | ✅ Priority |
| Batch Processing | ⚠️ 5/day | ✅ 50/day | ✅ Unlimited |
| Team Collaboration | ❌ | ❌ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ |
| Advanced API | ❌ | ❌ | ✅ |
| Priority Support | ❌ | ❌ | ✅ |

## Getting Started

### Step 1: Create CapCut Account

- Sign up at https://www.capcut.com/
- Download CapCut desktop app or use web editor
- Verify your email address

### Step 2: Get API Access

1. Go to CapCut Developers: https://developers.capcut.com/
2. Create developer account
3. Create new application
4. Request API access
5. Copy API Key and API Secret
6. Generate access token with proper scopes

### Step 3: Configure Environment

Create `.env` file:

```bash
CAPCUT_API_KEY=your_api_key
CAPCUT_API_SECRET=your_api_secret
CAPCUT_ACCESS_TOKEN=your_access_token
CAPCUT_USER_ID=your_user_id
CAPCUT_ACCOUNT_TYPE=pro
```

### Step 4: Configure AI-ley

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
      accountType: pro
      timeout: 30000
    features:
      projects: true
      editing: true
      templates: true
      effects: true
      music: true
      export: true
```

## Common Usage Examples

### Create Video Project
```bash
npm run project -- create --name "Social Media Campaign" --description "Q1 marketing videos"
```

### List Available Templates
```bash
npm run template -- list --category "trending" --limit 20
```

### Add Effect to Video
```bash
npm run video -- effect --project-id abc123 --clip-id clip1 --effect-id effect_glow --intensity 0.8
```

### Export Video
```bash
npm run export -- render --project-id abc123 --format mp4 --resolution 1080p --output ./videos/final.mp4
```

### Search Music
```bash
npm run asset -- music-search --keyword "upbeat" --genre "pop" --limit 10
```

## API Reference

### Project Operations

#### createProject(options)
Create new video project

**Parameters:**
- `name` (string, required): Project name
- `description` (string): Project description
- `width` (number): Video width (default: 1920)
- `height` (number): Video height (default: 1080)
- `fps` (number): Frames per second (default: 30)
- `tags` (string[]): Project tags

**Returns:** Project object with ID and metadata

#### listProjects(filters)
List user's projects

**Parameters:**
- `limit` (number): Max results (default: 10)
- `offset` (number): Pagination offset
- `sortBy` (string): created, modified, name
- `filterBy` (string): all, favorites, recent

**Returns:** Array of project objects

#### getProject(id)
Get project details

**Parameters:**
- `id` (string, required): Project ID

**Returns:** Complete project object with metadata

#### updateProject(id, updates)
Update project information

**Parameters:**
- `id` (string, required): Project ID
- `updates` (object): Fields to update

**Returns:** Updated project object

#### deleteProject(id)
Delete project

**Parameters:**
- `id` (string, required): Project ID

**Returns:** Success confirmation

### Video Editing Operations

#### addClip(projectId, clipData)
Add media clip to project

**Parameters:**
- `projectId` (string, required): Project ID
- `clipData` (object): Clip information including file path/URL, duration, position

**Returns:** Clip object with ID

#### applyEffect(projectId, clipId, effectId, options)
Apply effect to video clip

**Parameters:**
- `projectId` (string, required): Project ID
- `clipId` (string, required): Clip ID
- `effectId` (string, required): Effect ID
- `options` (object): Effect parameters (intensity, duration, etc.)

**Returns:** Updated clip with effect applied

#### addText(projectId, textData)
Add text overlay to video

**Parameters:**
- `projectId` (string, required): Project ID
- `textData` (object): Text content, position, style, duration

**Returns:** Text object with ID

#### addTransition(projectId, clipId, transitionId, duration)
Add transition between clips

**Parameters:**
- `projectId` (string, required): Project ID
- `clipId` (string, required): Clip ID
- `transitionId` (string, required): Transition ID
- `duration` (number): Transition duration in milliseconds

**Returns:** Updated clip with transition

#### addMusic(projectId, musicId, options)
Add music track to project

**Parameters:**
- `projectId` (string, required): Project ID
- `musicId` (string, required): Music ID from library
- `options` (object): Start time, volume, fade settings

**Returns:** Music object with ID

### Asset Operations

#### listEffects(filters)
List available effects

**Parameters:**
- `category` (string): Effect category
- `limit` (number): Max results
- `search` (string): Search keyword

**Returns:** Array of effect objects

#### listMusic(filters)
List available music tracks

**Parameters:**
- `genre` (string): Music genre
- `mood` (string): Music mood
- `limit` (number): Max results
- `duration` (string): Duration range

**Returns:** Array of music objects

#### searchMusic(keyword)
Search for music by keyword

**Parameters:**
- `keyword` (string, required): Search term

**Returns:** Array of matching music objects

#### listFilters(category)
List available filters

**Parameters:**
- `category` (string): Filter category

**Returns:** Array of filter objects

### Template Operations

#### listTemplates(filters)
List available templates

**Parameters:**
- `category` (string): Template category
- `trending` (boolean): Show trending templates
- `limit` (number): Max results

**Returns:** Array of template objects

#### getTemplate(id)
Get template details

**Parameters:**
- `id` (string, required): Template ID

**Returns:** Template object with metadata and layers

#### applyTemplate(projectId, templateId)
Apply template to project

**Parameters:**
- `projectId` (string, required): Project ID
- `templateId` (string, required): Template ID

**Returns:** Updated project with template applied

### Export Operations

#### exportVideo(projectId, options)
Export video in specified format

**Parameters:**
- `projectId` (string, required): Project ID
- `format` (string): mp4, mov, webm, gif
- `resolution` (string): 1080p, 2k, 4k, 8k
- `quality` (string): low, medium, high, maximum
- `outputPath` (string): Output file path
- `preset` (string): youtube, tiktok, instagram, custom

**Returns:** Export job object with progress tracking

#### getExportStatus(jobId)
Get export job status

**Parameters:**
- `jobId` (string, required): Export job ID

**Returns:** Status object with progress percentage

### Account Operations

#### detectAccountTier()
Detect account tier and capabilities

**Returns:** AccountTier object with tier name and features

#### getAccountInfo()
Get account information and usage statistics

**Returns:** Account object with storage, limits, quotas

## Common Workflows

### Workflow 1: Create Social Media Video
```bash
# Create project for Instagram
npm run project -- create --name "Insta Reel" --resolution 1080x1920

# Apply trending template
npm run template -- list --category trending --limit 5
npm run template -- apply --project-id <ID> --template-id <TEMPLATE_ID>

# Add music
npm run asset -- music-search --keyword "trending"
npm run video -- add-music --project-id <ID> --music-id <MUSIC_ID>

# Export optimized for Instagram
npm run export -- render --project-id <ID> --preset instagram --format mp4
```

### Workflow 2: Batch Process Videos
```bash
# Create batch job
npm run project -- batch-create --count 5 --template-id trending_001

# Add content to each
for i in {1..5}; do
  npm run video -- add-clip --project-id batch_$i --file video_$i.mp4
done

# Export all
npm run export -- batch --template trending_001 --format mp4 --resolution 1080p
```

### Workflow 3: Create YouTube Video
```bash
# Create project optimized for YouTube
npm run project -- create --name "YouTube Video" --resolution 1920x1080

# Add effects for YouTube audience
npm run video -- effect --project-id <ID> --effect-category "attention-grabbing"

# Add transitions and music
npm run video -- transition --project-id <ID> --transition-id pop --duration 200

# Export for YouTube
npm run export -- render --project-id <ID> --preset youtube --format mp4 --quality maximum
```

### Workflow 4: Extract and Analyze Effects
```bash
# List all trending effects
npm run asset -- effects --category trending --limit 50

# Get effect details
npm run asset -- effect-info --effect-id <EFFECT_ID>

# Apply to test clip
npm run video -- effect --project-id test_proj --effect-id <EFFECT_ID>
```

### Workflow 5: Music and Audio Management
```bash
# Search for background music
npm run asset -- music-search --genre "cinematic" --mood "epic"

# Get music details
npm run asset -- music-info --music-id <MUSIC_ID>

# Add to project with fade
npm run video -- add-music --project-id <ID> --music-id <MUSIC_ID> --fade-in 1000 --fade-out 1000
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
console.log(`Account Tier: ${tier.tier}`);

// Create project
const project = await client.createProject({
  name: 'My Video Project',
  description: 'Professional marketing video',
  width: 1920,
  height: 1080
});

// List effects
const effects = await client.listEffects({ category: 'transition', limit: 20 });

// Apply effect
await client.applyEffect(project.id, 'clip1', effects[0].id, { intensity: 0.8 });

// Export video
const exportJob = await client.exportVideo(project.id, {
  format: 'mp4',
  resolution: '1080p',
  quality: 'high',
  preset: 'youtube'
});
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Authentication failed | Invalid API credentials | Verify keys at https://developers.capcut.com/ |
| Project not found | Project ID incorrect or deleted | Check project ID in list command |
| Export failed | Insufficient storage or export quota | Check account limits with detect command |
| Effect not applied | Effect not compatible with clip | Verify effect category and clip properties |
| Music not available | Region restrictions or license issues | Try alternative music track |
| Batch processing throttled | Rate limit exceeded | Wait before retrying or upgrade tier |
| Template not applicable | Template incompatible with resolution | Check template requirements |

## Resources

- **Official Website**: https://www.capcut.com/
- **Developer Portal**: https://developers.capcut.com/
- **API Documentation**: https://developers.capcut.com/docs
- **Help Center**: https://support.capcut.com/
- **Community**: https://www.reddit.com/r/CapCut/
- **Effects Library**: https://www.capcut.com/template

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
