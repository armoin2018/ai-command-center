# YouTube Content Manager

Comprehensive YouTube integration with intelligent quota monitoring and management.

## Features

- ✅ **Quota Detection** - Automatic API quota monitoring
- ✅ **Video Upload** - Upload with full metadata support
- ✅ **Analytics** - Detailed video and channel analytics
- ✅ **Live Streaming** - Create and manage live broadcasts
- ✅ **Comment Management** - Engage with your audience
- ✅ **Playlist Management** - Organize your content
- ✅ **Search** - Find videos, channels, and playlists
- ✅ **Captions** - Add and manage subtitles
- ✅ **OAuth 2.0** - Secure authentication

## Quick Start

### 1. Installation

```bash
cd .github/skills/ailey-youtube
npm install
```

### 2. Setup

```bash
# View comprehensive setup instructions
npm run setup

# This will guide you through:
# - Creating Google Cloud project
# - Enabling YouTube APIs
# - Setting up OAuth credentials
# - Configuring environment variables
```

### 3. Authentication

```bash
# Start OAuth flow
npm run auth start

# Test connection
npm test
```

### 4. Check Quota

```bash
# Detect your quota allocation
npm run detect
```

## Common Tasks

### Upload a Video

```bash
npm run upload video.mp4 -- --title "My Video" --description "Description" --tags "tag1,tag2"
```

### View Analytics

```bash
npm run analytics video VIDEO_ID
npm run analytics channel -- --days 30
```

### Manage Comments

```bash
npm run comments list VIDEO_ID
npm run comments reply COMMENT_ID -- --text "Thanks!"
```

### Create Playlist

```bash
npm run playlists create -- --title "My Series" --privacy public
```

## Documentation

See [SKILL.md](./SKILL.md) for complete documentation.

## Support

- [YouTube Data API Docs](https://developers.google.com/youtube/v3)
- [YouTube Analytics API Docs](https://developers.google.com/youtube/analytics)
- Run `npm run diagnose` for troubleshooting

## License

MIT
