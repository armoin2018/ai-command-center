---
id: ailey-youtube
name: YouTube Content Manager
description: Comprehensive YouTube integration with quota tier detection, OAuth authentication, video upload/management, analytics, live streaming, comment engagement, and automatic API quota monitoring. Adapts features based on YouTube API quota allocation (10,000 free daily, custom quotas). Use when managing YouTube content, automating uploads, analyzing performance, managing live streams, or checking API capabilities.
keywords: [youtube, video, content, upload, analytics, live streaming, comments, oauth, youtube data api, youtube analytics api, quota detection, creator tools]
tools: [youtube-client, video-upload, analytics, comment-management, live-streaming, quota-detection, playlist-management]
---

# YouTube Content Manager

Comprehensive YouTube integration with intelligent API quota monitoring and multi-tier access support. Automatically detects quota allocation and provides upgrade guidance.

## Overview

YouTube's API operates on a quota system with different allocation levels. This skill:

- **Automatically detects** your API quota allocation
- **Monitors quota usage** in real-time
- **Adapts features** based on available quota
- **Provides upgrade paths** for increased quota
- **Works immediately** with free tier (10,000 units/day)
- **Scales up** with custom quota allocations

## When to Use

- Managing YouTube content across channels
- Automating video uploads and publishing
- Analyzing video and channel performance
- Managing live streams and premieres
- Engaging with audience through comments
- Checking API capabilities and quota status
- Multi-platform content distribution
- Creator workflow automation
- Channel management and optimization

## Installation

```bash
cd .github/skills/ailey-youtube
npm install
```

## Configuration

### 1. Create Google Cloud Project

Visit [Google Cloud Console](https://console.cloud.google.com/) and create a project.

### 2. Enable YouTube APIs

1. Go to **APIs & Services** → **Library**
2. Enable these APIs:
   - **YouTube Data API v3** (required)
   - **YouTube Analytics API** (for detailed analytics)
   - **YouTube Reporting API** (optional, for bulk reports)

### 3. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application** or **Desktop app**
4. Add authorized redirect URIs: `http://localhost:3000/oauth2callback`
5. Download credentials JSON

### 4. Environment Setup

Create `.env` file:

```env
YOUTUBE_CLIENT_ID=your_client_id_here
YOUTUBE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_ACCESS_TOKEN=your_access_token_here
YOUTUBE_REFRESH_TOKEN=your_refresh_token_here
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback
YOUTUBE_API_KEY=your_api_key_here  # Optional, for some read-only operations
```

### 5. Add to AI-ley Configuration

Edit `.github/aicc/aicc.yaml`:

```yaml
integrations:
  youtube:
    enabled: true
    clientId: ${YOUTUBE_CLIENT_ID}
    clientSecret: ${YOUTUBE_CLIENT_SECRET}
    accessToken: ${YOUTUBE_ACCESS_TOKEN}
    refreshToken: ${YOUTUBE_REFRESH_TOKEN}
    redirectUri: ${YOUTUBE_REDIRECT_URI}
    apiKey: ${YOUTUBE_API_KEY}
    quotaMonitoring: true
    quotaWarningThreshold: 80  # Warn at 80% quota usage
```

## API Quota System

### Free Tier (Auto-Approved)

**What you get:**
- ✅ 10,000 quota units per day
- ✅ All YouTube Data API v3 features
- ✅ OAuth 2.0 authentication
- ✅ Video uploads, analytics, comments
- ✅ Live streaming capabilities
- ✅ Playlist management

**No approval required** - available immediately.

**Daily quota breakdown (approximate):**
- Video upload: ~1,600 units each
- Video list: ~1 unit per video
- Video update: ~50 units each
- Comment insert: ~50 units each
- Search: ~100 units per query
- Channel info: ~3 units
- Analytics query: ~0-200 units (Analytics API separate quota)

**Typical daily capacity:**
- ~6 video uploads + basic operations
- ~200 comment replies + basic operations
- ~50 video metadata updates
- Hundreds of read operations

### Custom Quota (Application Required)

**When you need more:**
- High-frequency uploads (>6/day)
- Heavy automation workflows
- Multi-channel management at scale
- Comment moderation at scale
- Extensive analytics queries

**How to request:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Quotas**
3. Find **YouTube Data API v3** → **Queries per day**
4. Click **EDIT QUOTAS**
5. Fill out quota increase request form
6. Explain your use case and expected usage

**Approval time:** 2-7 business days
**Typical increases:** 100,000 - 1,000,000 units/day based on justification

### YouTube Analytics API (Separate Quota)

**Default quota:**
- 50,000 queries per day (separate from Data API)
- No cost-based limits

**Features:**
- Detailed video/channel analytics
- Demographic data
- Traffic source reports
- Playback location data
- Device type breakdowns

**No separate approval needed** - available when API enabled.

## Quick Start

### Detect Your API Quota

```bash
npm run youtube detect
```

This will show:
- Current quota allocation
- Used vs. available units today
- Estimated operations remaining
- Upgrade recommendations if needed

Output example:
```
🎯 YouTube API Quota Status

Daily Quota: 10,000 units
Used Today: 2,450 units (24.5%)
Remaining: 7,550 units (75.5%)

Estimated Remaining Operations:
  📹 Video uploads: ~4-5
  💬 Comment replies: ~150
  🔍 Search queries: ~75
  📊 Metadata updates: ~150

⚠️ Note: This is the free tier. For higher volume,
   request quota increase in Google Cloud Console.
```

### Setup Help

```bash
npm run youtube setup
```

Displays comprehensive setup instructions including:
- Google Cloud project creation
- API enablement steps
- OAuth credential setup
- Environment configuration
- AI-ley integration setup
- Quota increase request process

### Test Connection

```bash
npm run youtube test
```

Verifies API connection and shows your channel info.

---

## Workflows

### Workflow 1: Check API Quota & Capabilities (All Users)

**Use when:** Starting work, monitoring quota usage, planning bulk operations.

```bash
# Detect quota and capabilities
npm run youtube detect

# Expected output:
# 🎯 YouTube API Quota Status
# Daily Quota: 10,000 units
# Used Today: 1,234 units (12.3%)
# Remaining: 8,766 units (87.7%)
# 
# ✅ All features available
# 📊 Quota sufficient for today's operations
```

**What it does:**
1. Tests API connection
2. Retrieves current quota allocation
3. Shows usage statistics for today
4. Estimates remaining operation capacity
5. Warns if approaching quota limits
6. Suggests quota increase if needed

**Quota warnings:**
- **80%+ used:** ⚠️ Approaching daily limit
- **95%+ used:** 🚨 Nearly exhausted
- **100% used:** ❌ Quota exceeded, operations blocked until reset

### Workflow 2: OAuth Authentication Setup

**Use when:** First setup, token expired, re-authorizing account.

```bash
# Start OAuth flow
npm run youtube auth start

# This will:
# 1. Open browser for Google login
# 2. Request YouTube permissions
# 3. Save tokens to .env
# 4. Test connection

# Test authentication
npm run youtube test
```

**OAuth Flow:**
1. Generate authorization URL with required scopes
2. User visits URL and logs into Google
3. User grants YouTube permissions
4. Google redirects with authorization code
5. Exchange code for access & refresh tokens
6. Store tokens in `.env` and AI-ley config

**Required scopes:**
```
https://www.googleapis.com/auth/youtube
https://www.googleapis.com/auth/youtube.upload
https://www.googleapis.com/auth/youtube.force-ssl
https://www.googleapis.com/auth/yt-analytics.readonly
```

**Scope breakdown:**
- `youtube`: Manage YouTube account
- `youtube.upload`: Upload and manage videos
- `youtube.force-ssl`: Full account access via SSL
- `yt-analytics.readonly`: Read analytics data

### Workflow 3: Upload Video

**Use when:** Publishing content, automating uploads, multi-platform distribution.

```bash
# Basic upload
npm run youtube upload video.mp4 \
  --title "Amazing Tutorial" \
  --description "Learn something new today!"

# Upload with full metadata
npm run youtube upload video.mp4 \
  --title "Complete Guide to YouTube" \
  --description "Everything you need to know" \
  --tags "tutorial,guide,youtube" \
  --category 22 \
  --privacy private

# Upload with thumbnail
npm run youtube upload video.mp4 \
  --title "My Video" \
  --description "Description here" \
  --thumbnail thumbnail.jpg

# Upload with playlist
npm run youtube upload video.mp4 \
  --title "Episode 1" \
  --playlist "My Series" \
  --position 0

# Upload with advanced settings
npm run youtube upload video.mp4 \
  --title "Brand Video" \
  --description "Sponsored content" \
  --tags "brand,sponsored" \
  --made-for-kids false \
  --embeddable true \
  --license youtube \
  --public-stats-viewable true
```

**Upload Options:**

**Basic Metadata:**
- `--title TEXT` - Video title (required)
- `--description TEXT` - Video description
- `--tags TAGS` - Comma-separated tags
- `--category ID` - Category ID (see categories below)

**Privacy:**
- `--privacy LEVEL` - public, private, unlisted
- `--publish-at DATETIME` - Schedule publish time

**Advanced:**
- `--thumbnail PATH` - Custom thumbnail image
- `--playlist NAME` - Add to playlist
- `--position NUM` - Position in playlist
- `--made-for-kids BOOL` - COPPA compliance
- `--embeddable BOOL` - Allow embedding
- `--license TYPE` - youtube or creativeCommon
- `--public-stats-viewable BOOL` - Show view count publicly
- `--recording-date DATE` - Video recording date
- `--location LAT,LNG` - Video location coordinates

**Category IDs:**
- 1: Film & Animation
- 2: Autos & Vehicles
- 10: Music
- 15: Pets & Animals
- 17: Sports
- 19: Travel & Events
- 20: Gaming
- 22: People & Blogs
- 23: Comedy
- 24: Entertainment
- 25: News & Politics
- 26: Howto & Style
- 27: Education
- 28: Science & Technology

**Quota cost:** ~1,600 units per upload

**Upload Process:**
1. Skill checks quota availability
2. Uploads video file to YouTube
3. Applies metadata and settings
4. Publishes or schedules video
5. Returns video ID and URL
6. Updates quota usage tracking

### Workflow 4: Manage Videos

**Use when:** Updating video info, organizing content, managing catalog.

```bash
# List your videos
npm run youtube videos list --max-results 50

# Get video details
npm run youtube videos get VIDEO_ID

# Update video metadata
npm run youtube videos update VIDEO_ID \
  --title "New Title" \
  --description "Updated description" \
  --tags "new,tags"

# Update privacy
npm run youtube videos update VIDEO_ID --privacy public

# Delete video
npm run youtube videos delete VIDEO_ID

# Batch update (CSV)
npm run youtube videos batch-update videos.csv
```

**CSV format for batch update:**
```csv
video_id,title,description,tags,privacy
abc123,New Title 1,New desc 1,"tag1,tag2",public
def456,New Title 2,New desc 2,"tag3,tag4",unlisted
```

**Quota costs:**
- List: ~1 unit per video
- Get details: ~1 unit
- Update: ~50 units per video
- Delete: ~50 units per video

### Workflow 5: Video Analytics

**Use when:** Tracking performance, analyzing engagement, optimizing content.

```bash
# Video analytics
npm run youtube analytics video VIDEO_ID

# Output:
# 📊 Video Analytics
# Views: 15,234
# Watch time: 42.5 hours
# Likes: 1,892
# Dislikes: 23 (if public)
# Comments: 234
# Shares: 156
# Avg view duration: 8m 34s
# Avg percentage viewed: 62%
# Click-through rate: 4.2%

# Channel analytics
npm run youtube analytics channel --days 30

# Output:
# 📈 Channel Analytics (Last 30 Days)
# Views: 125,456
# Watch time: 3,245 hours
# Subscribers gained: 1,234
# Subscribers lost: 45
# Estimated revenue: $156.78
# Top videos: ...

# Demographics
npm run youtube analytics demographics VIDEO_ID

# Traffic sources
npm run youtube analytics traffic VIDEO_ID

# Device types
npm run youtube analytics devices VIDEO_ID

# Geography
npm run youtube analytics geography VIDEO_ID

# Date range analytics
npm run youtube analytics channel \
  --start-date 2026-01-01 \
  --end-date 2026-01-31
```

**Available Metrics:**

**Video Level:**
- Views, watch time, average view duration
- Likes, comments, shares
- Click-through rate (CTR)
- Average percentage viewed
- Traffic sources (browse, search, suggested, external)
- Demographics (age, gender, geography)
- Device types (mobile, desktop, TV)
- Playback locations (YouTube, embedded)

**Channel Level:**
- Subscribers gained/lost
- Total views, watch time
- Estimated revenue (if monetized)
- Top videos by various metrics
- Real-time performance
- Growth trends

**Quota cost (Analytics API):** Separate quota, typically 0-200 units per query

### Workflow 6: Manage Comments

**Use when:** Engaging with audience, moderating discussions, customer service.

```bash
# List video comments
npm run youtube comments list VIDEO_ID

# List with replies
npm run youtube comments list VIDEO_ID --include-replies

# Reply to comment
npm run youtube comments reply COMMENT_ID \
  --text "Thanks for watching!"

# Update comment
npm run youtube comments update COMMENT_ID \
  --text "Updated text"

# Delete comment
npm run youtube comments delete COMMENT_ID

# Mark as spam
npm run youtube comments spam COMMENT_ID

# Moderate comments (batch)
npm run youtube comments moderate VIDEO_ID \
  --auto-approve \
  --spam-filter aggressive

# Export comments to CSV
npm run youtube comments export VIDEO_ID --output comments.csv
```

**Comment Operations:**
- **List:** ~1 unit per page (100 comments)
- **Reply:** ~50 units per reply
- **Update:** ~50 units per update
- **Delete:** ~50 units per delete
- **Mark spam:** ~50 units per action

**Moderation features:**
- Auto-approve comments from subscribers
- Spam filtering (off, moderate, aggressive)
- Keyword blacklist/whitelist
- Bulk operations
- Export for analysis

### Workflow 7: Playlist Management

**Use when:** Organizing content, creating series, curating collections.

```bash
# Create playlist
npm run youtube playlists create \
  --title "My Tutorial Series" \
  --description "Complete tutorial series" \
  --privacy public

# List playlists
npm run youtube playlists list

# Add video to playlist
npm run youtube playlists add PLAYLIST_ID VIDEO_ID

# Remove video from playlist
npm run youtube playlists remove PLAYLIST_ID PLAYLIST_ITEM_ID

# Update playlist
npm run youtube playlists update PLAYLIST_ID \
  --title "Updated Title" \
  --description "New description"

# Delete playlist
npm run youtube playlists delete PLAYLIST_ID

# Reorder videos
npm run youtube playlists reorder PLAYLIST_ID \
  --video VIDEO_ID \
  --position 0
```

**Quota costs:**
- Create: ~50 units
- List: ~1 unit per playlist
- Add item: ~50 units
- Remove: ~50 units
- Update: ~50 units
- Delete: ~50 units

### Workflow 8: Live Streaming

**Use when:** Broadcasting live, managing premieres, scheduled streams.

```bash
# Create live broadcast
npm run youtube live create \
  --title "Live Stream Title" \
  --description "Stream description" \
  --scheduled-start "2026-02-05T15:00:00Z"

# List live broadcasts
npm run youtube live list

# Start live stream
npm run youtube live start BROADCAST_ID

# End live stream
npm run youtube live stop BROADCAST_ID

# Get stream key
npm run youtube live stream-key BROADCAST_ID

# Monitor stream health
npm run youtube live health BROADCAST_ID

# Manage live chat
npm run youtube live chat BROADCAST_ID --message "Hello viewers!"
```

**Stream Management:**
- Create scheduled broadcasts
- Start/stop streaming
- Monitor stream health (bitrate, resolution, errors)
- Manage live chat messages
- Enable/disable features (chat, DVR)
- Set stream delay
- Configure monetization

**Quota costs:**
- Create broadcast: ~1,600 units
- Update: ~50 units
- Start/stop: ~50 units each

### Workflow 9: Search and Discovery

**Use when:** Finding content, researching competitors, content ideas.

```bash
# Search videos
npm run youtube search \
  --query "machine learning tutorial" \
  --max-results 25

# Search by channel
npm run youtube search \
  --query "AI" \
  --channel-id CHANNEL_ID

# Search with filters
npm run youtube search \
  --query "cooking" \
  --type video \
  --video-duration medium \
  --video-definition hd \
  --order viewCount

# Search channels
npm run youtube search \
  --query "tech review" \
  --type channel

# Related videos
npm run youtube search related VIDEO_ID
```

**Search Filters:**
- `--type` - video, channel, playlist
- `--video-duration` - short, medium, long
- `--video-definition` - sd, hd
- `--order` - date, rating, relevance, title, videoCount, viewCount
- `--published-after DATE`
- `--published-before DATE`

**Quota cost:** ~100 units per search query

### Workflow 10: Channel Management

**Use when:** Managing channel settings, branding, subscriptions.

```bash
# Get channel info
npm run youtube channel info

# Update channel description
npm run youtube channel update \
  --description "New channel description"

# Get channel statistics
npm run youtube channel stats

# List subscriptions
npm run youtube subscriptions list

# Subscribe to channel
npm run youtube subscriptions add CHANNEL_ID

# Unsubscribe
npm run youtube subscriptions remove SUBSCRIPTION_ID

# Get channel branding
npm run youtube channel branding

# Update channel banner
npm run youtube channel update-banner banner.jpg

# Update channel watermark
npm run youtube channel update-watermark watermark.png
```

### Workflow 11: Captions/Subtitles

**Use when:** Adding accessibility, multi-language support, SEO.

```bash
# Upload caption file
npm run youtube captions upload VIDEO_ID \
  --file captions.srt \
  --language en \
  --name "English"

# Auto-generate captions
npm run youtube captions generate VIDEO_ID --language en

# List captions
npm run youtube captions list VIDEO_ID

# Download caption track
npm run youtube captions download CAPTION_ID --output captions.srt

# Update caption track
npm run youtube captions update CAPTION_ID --file updated.srt

# Delete caption track
npm run youtube captions delete CAPTION_ID
```

**Supported formats:**
- SRT (SubRip)
- VTT (WebVTT)
- TTML
- SBV (YouTube format)

### Workflow 12: Content ID & Copyright

**Use when:** Managing copyright claims, content matches, monetization.

```bash
# List copyright claims
npm run youtube copyright claims

# View claim details
npm run youtube copyright claim CLAIM_ID

# Dispute claim
npm run youtube copyright dispute CLAIM_ID \
  --reason "fair_use" \
  --message "Explanation here"

# List content matches
npm run youtube copyright matches VIDEO_ID

# Monetization status
npm run youtube monetization status VIDEO_ID
```

---

## Quota Management

### Monitor Quota Usage

```bash
# Real-time quota status
npm run youtube quota status

# Quota usage history
npm run youtube quota history --days 7

# Quota projections
npm run youtube quota forecast
```

### Quota-Aware Operations

The skill automatically:
- Checks quota before operations
- Warns when approaching limits
- Suggests batch operations to save quota
- Provides quota-efficient alternatives

**Example:**
```bash
# Upload 10 videos (would use ~16,000 units)
npm run youtube batch-upload *.mp4

# Warning:
# ⚠️ This operation requires ~16,000 quota units
# 🚨 Your daily quota is 10,000 units
# 
# Suggestions:
# - Upload 6 videos today (9,600 units)
# - Schedule remaining 4 for tomorrow
# - Request quota increase for bulk operations
```

### Request Quota Increase

```bash
# Generate quota increase request
npm run youtube quota request-increase

# This generates:
# - Usage analysis document
# - Justification template
# - Direct link to quota request form
```

---

## Error Handling

### Common Errors

**Quota Exceeded:**
```
Error: quotaExceeded
Message: The request cannot be completed because you have exceeded your quota.

Solution:
- Wait until quota resets (midnight Pacific Time)
- Request quota increase
- Optimize operations to use less quota
```

**Insufficient Permissions:**
```
Error: insufficientPermissions
Message: The request failed because the user doesn't have sufficient permissions.

Solution:
- Re-run: npm run youtube auth start
- Ensure all required scopes are granted
- Check channel ownership/permissions
```

**Video Not Found:**
```
Error: videoNotFound
Message: The video that you are trying to update cannot be found.

Solution:
- Verify video ID is correct
- Check if video was deleted
- Ensure you have access to the video
```

### Automatic Retry

The skill automatically retries failed requests:
- Rate limit errors: Exponential backoff
- Temporary errors: 3 retry attempts
- Quota errors: No retry (wait for reset)

---

## Advanced Features

### Batch Operations

```bash
# Batch upload from folder
npm run youtube batch-upload ./videos/*.mp4 \
  --metadata-csv metadata.csv

# Batch update from CSV
npm run youtube batch-update videos.csv

# Batch analytics export
npm run youtube batch-analytics video_ids.txt \
  --output analytics_report.csv
```

### Webhooks & Notifications

```bash
# Subscribe to channel events
npm run youtube webhook subscribe CHANNEL_ID \
  --callback https://myapp.com/webhook

# Receive notifications for:
# - New video uploads
# - Live stream starts
# - Comments on your videos
```

### Integration with AI-ley

**Automatic uploads from content pipeline:**
```yaml
# .github/aicc/workflows/auto-upload.yaml
name: Auto Upload to YouTube
trigger: file_created
pattern: ./exports/*.mp4
action: youtube_upload
metadata:
  title: ${filename}
  description: Auto-generated content
  tags: ai-generated,automated
  privacy: private
```

---

## Troubleshooting

### Setup Not Working?

```bash
# Run comprehensive diagnostics
npm run youtube diagnose

# Checks:
# - Environment variables configured
# - OAuth tokens valid
# - API quota available
# - Network connectivity
# - API enablement status
```

### Missing Features?

```bash
# Verify API enablement
npm run youtube verify-apis

# Ensures these APIs are enabled:
# ✅ YouTube Data API v3
# ✅ YouTube Analytics API
# ⚠️ YouTube Reporting API (optional)
```

### Still Having Issues?

```bash
# Generate support package
npm run youtube support-package

# Creates diagnostic bundle with:
# - Configuration (redacted secrets)
# - Recent error logs
# - Quota usage stats
# - API test results
```

---

## Examples

### Example 1: Daily Content Upload Automation

```bash
# Morning: Check quota
npm run youtube detect

# Upload today's video
npm run youtube upload daily-video.mp4 \
  --title "Daily Update $(date +%Y-%m-%d)" \
  --description "Today's content" \
  --tags "daily,vlog" \
  --privacy public \
  --thumbnail thumbnail.jpg \
  --playlist "Daily Series"

# Post-upload: Check analytics
npm run youtube analytics channel --days 1
```

### Example 2: Multi-Video Series Launch

```bash
# Create series playlist
PLAYLIST_ID=$(npm run youtube playlists create \
  --title "Complete Tutorial Series" \
  --description "10-part tutorial" \
  --privacy public | grep -o 'PL[a-zA-Z0-9_-]*')

# Upload all episodes
for video in episode_*.mp4; do
  npm run youtube upload "$video" \
    --title "Series - ${video%.*}" \
    --playlist "$PLAYLIST_ID" \
    --privacy unlisted  # Unlisted until all ready
done

# After review, make public
npm run youtube playlists update "$PLAYLIST_ID" --privacy public
```

### Example 3: Live Stream Setup

```bash
# Create scheduled stream
BROADCAST_ID=$(npm run youtube live create \
  --title "Weekly Live Q&A" \
  --description "Ask me anything!" \
  --scheduled-start "2026-02-05T19:00:00Z" | grep -o 'broadcast_id: .*' | cut -d' ' -f2)

# Get stream key
npm run youtube live stream-key "$BROADCAST_ID"

# Start streaming (from your encoder)
# When ready:
npm run youtube live start "$BROADCAST_ID"

# Monitor health during stream
npm run youtube live health "$BROADCAST_ID"

# End stream
npm run youtube live stop "$BROADCAST_ID"
```

### Example 4: Comment Engagement Bot

```bash
# List recent comments
npm run youtube comments list VIDEO_ID --max-results 100 > comments.json

# Auto-reply to new comments
npm run youtube comments auto-reply VIDEO_ID \
  --template "Thanks for watching! Subscribe for more!" \
  --only-new \
  --delay 60  # Wait 60s between replies

# Monitor for spam
npm run youtube comments moderate VIDEO_ID \
  --spam-filter aggressive \
  --auto-delete
```

### Example 5: Analytics Dashboard Export

```bash
# Generate weekly report
npm run youtube analytics report \
  --start-date "2026-01-25" \
  --end-date "2026-02-01" \
  --output weekly_report.html

# Export to spreadsheet
npm run youtube analytics export \
  --format csv \
  --metrics views,watch-time,subscribers \
  --dimensions video,date \
  --output analytics.csv
```

---

## Best Practices

### Quota Optimization

1. **Use batch operations** when possible
2. **Cache read-only data** (channel info, video details)
3. **Schedule heavy operations** during off-peak hours
4. **Monitor quota usage** throughout the day
5. **Request increases** before scaling

### Content Management

1. **Use descriptive titles** with keywords
2. **Write comprehensive descriptions** (200+ words)
3. **Add relevant tags** (10-15 per video)
4. **Create custom thumbnails** (1280x720px)
5. **Organize into playlists** for better discovery
6. **Add captions** for accessibility and SEO
7. **Set proper categories** for accurate classification

### Analytics & Optimization

1. **Track metrics daily** for trend analysis
2. **Compare videos** to identify what works
3. **Monitor traffic sources** to optimize distribution
4. **Analyze audience retention** to improve content
5. **Study demographics** to refine targeting
6. **A/B test thumbnails** and titles
7. **Review competitor performance** for insights

### Engagement

1. **Reply to comments** within 24 hours
2. **Heart top comments** to encourage engagement
3. **Pin important comments** for visibility
4. **Moderate spam** regularly
5. **Encourage subscriptions** in videos and descriptions
6. **Use end screens** and cards effectively

---

## API Reference

### Core Methods

**Authentication:**
- `auth.start()` - Initiate OAuth flow
- `auth.refresh()` - Refresh access token
- `auth.revoke()` - Revoke access

**Videos:**
- `videos.upload()` - Upload video file
- `videos.list()` - List videos
- `videos.get()` - Get video details
- `videos.update()` - Update video metadata
- `videos.delete()` - Delete video
- `videos.rate()` - Like/dislike video

**Analytics:**
- `analytics.video()` - Video analytics
- `analytics.channel()` - Channel analytics
- `analytics.demographics()` - Audience demographics
- `analytics.traffic()` - Traffic sources
- `analytics.devices()` - Device breakdown

**Comments:**
- `comments.list()` - List comments
- `comments.reply()` - Reply to comment
- `comments.update()` - Update comment
- `comments.delete()` - Delete comment
- `comments.moderate()` - Moderate comments

**Playlists:**
- `playlists.create()` - Create playlist
- `playlists.list()` - List playlists
- `playlists.update()` - Update playlist
- `playlists.delete()` - Delete playlist
- `playlists.addItem()` - Add video to playlist

**Live Streaming:**
- `live.create()` - Create broadcast
- `live.start()` - Start streaming
- `live.stop()` - Stop streaming
- `live.health()` - Stream health status

**Search:**
- `search.videos()` - Search videos
- `search.channels()` - Search channels
- `search.playlists()` - Search playlists

**Channel:**
- `channel.info()` - Channel information
- `channel.update()` - Update channel
- `channel.stats()` - Channel statistics
- `channel.subscriptions()` - Subscriptions list

---

## Support

### Getting Help

**Setup Issues:**
```bash
npm run youtube setup
```

**Quota Questions:**
```bash
npm run youtube quota help
```

**API Documentation:**
- [YouTube Data API v3](https://developers.google.com/youtube/v3)
- [YouTube Analytics API](https://developers.google.com/youtube/analytics)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)

**Community:**
- [YouTube API Forum](https://support.google.com/youtube/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/youtube-api)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.7
---
