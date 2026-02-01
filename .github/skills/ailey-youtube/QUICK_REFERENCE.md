# YouTube Content Manager - Quick Reference

## Setup (First Time)

```bash
# 1. Install
cd .github/skills/ailey-youtube
npm install

# 2. View setup instructions
npm run setup

# 3. Create .env from example
cp .env.example .env
# Edit .env with your credentials

# 4. Authenticate
npm run auth start
# Visit URL, authorize, copy code
npm run auth token <CODE>

# 5. Test
npm test
```

## Common Commands

### Quota & Status
```bash
npm run detect              # Check quota usage
npm run diagnose            # Full diagnostics
npm test                    # Test connection
```

### Authentication
```bash
npm run auth start          # Start OAuth flow
npm run auth token <CODE>   # Exchange code for tokens
```

### Upload Video
```bash
# Basic
npm run upload video.mp4 -- --title "My Video"

# With metadata
npm run upload video.mp4 -- \
  --title "Tutorial" \
  --description "Learn XYZ" \
  --tags "tutorial,howto" \
  --privacy public \
  --thumbnail thumb.jpg
```

### Manage Videos
```bash
npm run youtube videos list
npm run youtube videos get VIDEO_ID
npm run youtube videos update VIDEO_ID -- --title "New Title"
npm run youtube videos delete VIDEO_ID
```

### Analytics
```bash
npm run analytics video VIDEO_ID
npm run analytics channel -- --days 30
npm run analytics demographics VIDEO_ID
```

### Comments
```bash
npm run comments list VIDEO_ID
npm run comments reply COMMENT_ID -- --text "Thanks!"
npm run comments delete COMMENT_ID
```

### Playlists
```bash
npm run playlists create -- --title "Series" --privacy public
npm run playlists list
npm run playlists add PLAYLIST_ID VIDEO_ID
```

### Live Streaming
```bash
npm run live create -- --title "Live Stream" --scheduled-start "2026-02-05T15:00:00Z"
npm run live start BROADCAST_ID
npm run live stop BROADCAST_ID
```

### Search
```bash
npm run search -- --query "tutorial" --max-results 25
```

## Quota Costs (Daily Limit: 10,000 units)

| Operation | Units | Per Day |
|-----------|-------|---------|
| Upload video | 1,600 | ~6 |
| Update video | 50 | ~200 |
| Comment reply | 50 | ~200 |
| Search query | 100 | ~100 |
| List videos | 1 | ~10,000 |
| Get video details | 1 | ~10,000 |

## OAuth Scopes

```
https://www.googleapis.com/auth/youtube               # Manage account
https://www.googleapis.com/auth/youtube.upload        # Upload videos
https://www.googleapis.com/auth/youtube.force-ssl     # Full access
https://www.googleapis.com/auth/yt-analytics.readonly # Analytics
```

## Video Categories

- 1: Film & Animation
- 2: Autos & Vehicles
- 10: Music
- 15: Pets & Animals
- 17: Sports
- 19: Travel & Events
- 20: Gaming
- 22: People & Blogs (default)
- 23: Comedy
- 24: Entertainment
- 25: News & Politics
- 26: Howto & Style
- 27: Education
- 28: Science & Technology

## Environment Variables

```env
YOUTUBE_CLIENT_ID=                  # From Google Cloud Console
YOUTUBE_CLIENT_SECRET=              # From Google Cloud Console
YOUTUBE_ACCESS_TOKEN=               # From OAuth flow
YOUTUBE_REFRESH_TOKEN=              # From OAuth flow
YOUTUBE_REDIRECT_URI=               # OAuth redirect (default: http://localhost:3000/oauth2callback)
YOUTUBE_API_KEY=                    # Optional API key
YOUTUBE_QUOTA_MONITORING=true       # Enable quota tracking
YOUTUBE_QUOTA_WARNING_THRESHOLD=80  # Warn at 80%
```

## AI-ley Configuration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  youtube:
    enabled: true
    clientId: ${YOUTUBE_CLIENT_ID}
    clientSecret: ${YOUTUBE_CLIENT_SECRET}
    accessToken: ${YOUTUBE_ACCESS_TOKEN}
    refreshToken: ${YOUTUBE_REFRESH_TOKEN}
    redirectUri: ${YOUTUBE_REDIRECT_URI}
    quotaMonitoring: true
    quotaWarningThreshold: 80
```

## Troubleshooting

### "Quota exceeded"
- Wait until midnight Pacific Time for quota reset
- Request quota increase in Google Cloud Console
- Optimize operations to use less quota

### "Invalid credentials"
- Run: `npm run auth start`
- Ensure .env has correct CLIENT_ID and CLIENT_SECRET

### "Insufficient permissions"
- Re-authenticate with: `npm run auth start`
- Ensure all required scopes are granted

### "API not enabled"
- Visit Google Cloud Console
- Enable YouTube Data API v3
- Enable YouTube Analytics API

## Request Quota Increase

1. Go to https://console.cloud.google.com/
2. Navigate to APIs & Services → Quotas
3. Find YouTube Data API v3 → Queries per day
4. Click EDIT QUOTAS
5. Fill out request form with use case
6. Typical increases: 100,000 - 1,000,000 units/day
7. Approval: 2-7 business days

## Support

- **Documentation**: see SKILL.md
- **YouTube Data API**: https://developers.google.com/youtube/v3
- **YouTube Analytics**: https://developers.google.com/youtube/analytics
- **OAuth Guide**: https://developers.google.com/identity/protocols/oauth2
