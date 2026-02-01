# CapCut Skill Quick Reference

## Setup & Configuration

```bash
npm run setup              # Interactive setup
npm run build             # Compile TypeScript
npm run dev              # Watch mode
```

## Authentication

```bash
npm run auth -- verify    # Verify credentials
npm run auth -- info      # Get account info
npm run detect            # Detect tier and features
```

## Project Management

### Create Project
```bash
npm run project -- create \
  --name "My Video" \
  --description "Social media content" \
  --resolution 1920x1080
```

### List Projects
```bash
npm run project -- list --limit 20 --sort modified
```

### Get Project Details
```bash
npm run project -- get --id abc123def456
```

### Delete Project
```bash
npm run project -- delete --id abc123def456
```

## Video Editing

### Add Clip
```bash
npm run video -- add-clip \
  --project-id abc123 \
  --file video.mp4 \
  --type video
```

### Apply Effect
```bash
npm run video -- effect \
  --project-id abc123 \
  --clip-id clip1 \
  --effect-id effect_glow \
  --intensity 0.8
```

### Add Music
```bash
npm run video -- add-music \
  --project-id abc123 \
  --music-id music_upbeat \
  --volume 0.9
```

## Asset Management

### List Effects
```bash
npm run asset -- effects --category transition --limit 50
```

### Search Music
```bash
npm run asset -- music-search --keyword "upbeat" --limit 20
```

### List Filters
```bash
npm run asset -- filters --category color
```

## Template Operations

### List Templates
```bash
npm run template -- list --category trending --limit 20
```

### Apply Template
```bash
npm run template -- apply \
  --project-id abc123 \
  --template-id template_trending_001
```

## Export & Rendering

### Export Video
```bash
npm run export -- render \
  --project-id abc123 \
  --format mp4 \
  --resolution 1080p \
  --quality high \
  --preset youtube
```

### Check Export Status
```bash
npm run export -- status --job-id export_job_123
```

## Environment Variables

```bash
CAPCUT_API_KEY=your_api_key
CAPCUT_API_SECRET=your_api_secret
CAPCUT_ACCESS_TOKEN=your_access_token
CAPCUT_USER_ID=your_user_id
CAPCUT_ACCOUNT_TYPE=pro
CAPCUT_API_VERSION=v1
CAPCUT_TIMEOUT=30000
```

## Account Tier Features

| Feature | Free | Pro | Business |
|---------|------|------|----------|
| Projects | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Storage | 5 GB | 100 GB | 1000 GB |
| Resolution | 1080p | 4K | 8K |
| Watermark | ❌ Applied | ✅ No | ✅ No |
| Effects | 100+ | 1000+ | 1000+ |
| Music | 5000 | 50000+ | 50000+ |
| Filters | 50 | 200+ | 200+ |
| Batch/Day | 5 | 50 | Unlimited |
| Export Speed | Standard | Priority | Priority |
| Collaboration | ❌ | ❌ | ✅ |

## Common Workflows

### Workflow 1: Create Instagram Reel
```bash
# Create project
npm run project -- create --name "Insta Reel" --resolution 1080x1920

# Apply trending template
npm run template -- list --category trending --limit 1
npm run template -- apply --project-id <ID> --template-id <TEMPLATE_ID>

# Add music
npm run asset -- music-search --keyword "upbeat"
npm run video -- add-music --project-id <ID> --music-id <MUSIC_ID>

# Export for Instagram
npm run export -- render --project-id <ID> --preset instagram
```

### Workflow 2: Create YouTube Video
```bash
# Create project
npm run project -- create --name "YouTube Video" --resolution 1920x1080

# Add effects
npm run video -- effect --project-id <ID> --clip-id clip1 --effect-id effect_intro

# Add background music
npm run asset -- music-search --keyword "cinematic"
npm run video -- add-music --project-id <ID> --music-id <MUSIC_ID>

# Export in maximum quality
npm run export -- render --project-id <ID> --quality maximum --preset youtube
```

### Workflow 3: Batch Process Videos
```bash
# Create multiple projects
for i in {1..5}; do
  npm run project -- create --name "Batch Video $i"
done

# List all projects
npm run project -- list --limit 100

# Export each one
npm run export -- render --project-id proj1 --preset youtube
npm run export -- render --project-id proj2 --preset youtube
npm run export -- render --project-id proj3 --preset youtube
```

### Workflow 4: Explore Effects and Filters
```bash
# List all transition effects
npm run asset -- effects --category transition

# List color filters
npm run asset -- filters --category color

# List trending effects
npm run asset -- effects --category trending --limit 50

# Apply trending effect to clip
npm run video -- effect --project-id <ID> --clip-id clip1 --effect-id <EFFECT_ID>
```

### Workflow 5: Music Discovery and Integration
```bash
# Search for specific mood
npm run asset -- music-search --keyword "relaxing"

# Get more upbeat options
npm run asset -- music-search --keyword "energetic"

# Add to project with custom volume
npm run video -- add-music \
  --project-id <ID> \
  --music-id <MUSIC_ID> \
  --volume 0.75

# Export with music included
npm run export -- render --project-id <ID> --format mp4
```

## Tips & Best Practices

- **Before first use**: Always run `npm run auth -- verify` to test credentials
- **Check tier**: Use `npm run detect` to see available features for your account
- **Template search**: Browse trending templates with `npm run template -- list --trending`
- **Music library**: Use music search to find tracks matching your video mood
- **Export presets**: Use preset option (youtube, tiktok, instagram) for platform-optimized exports
- **Resolution guide**:
  - Instagram Reels: 1080x1920
  - TikTok: 1080x1920
  - YouTube: 1920x1080
  - Twitter: 16:9 or 1:1

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Authentication failed | Verify API credentials at https://developers.capcut.com/ |
| Project not found | Check project ID with `npm run project -- list` |
| Export failed | Ensure project has video content before exporting |
| Effect not applying | Verify effect is compatible with clip type |
| Storage full | Check tier limits with `npm run detect` |
| Music unavailable | Try alternative search term or check region restrictions |
| Batch limit exceeded | Free tier: 5/day, Pro: 50/day, Business: unlimited |

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
