---
id: ailey-soc-tiktok
name: TikTok Content Manager
description: Comprehensive TikTok integration with multi-tier API access support, OAuth authentication, video upload/management, analytics, comment engagement, and automatic tier detection. Adapts features dynamically based on account API access level (Login Kit, Display API, Content Posting API, Marketing API). Use when managing TikTok content, automating uploads, analyzing performance, engaging with audiences, or checking API capabilities.
keywords: [tiktok, social media, video, upload, content posting, analytics, engagement, comments, oauth, multi-tier api, tier detection, creator tools, tiktok api]
tools: [tiktok-client, video-upload, analytics, comment-management, tier-detection]
---

# TikTok Content Manager

Comprehensive TikTok integration with intelligent multi-tier API access support. Automatically detects account's API tier and adapts available features accordingly.

## Overview

TikTok has a unique multi-tier API system with different approval levels. This skill:

- **Automatically detects** your API access tier
- **Adapts features** based on available capabilities
- **Provides upgrade paths** for unlocking higher tiers
- **Works immediately** with Tier 1 (Login Kit) access
- **Scales up** as you gain Content Posting and Marketing API access

## When to Use

- Managing TikTok content across accounts
- Automating video uploads and publishing
- Analyzing video and account performance
- Engaging with audience through comments
- Checking API capabilities and tier status
- Multi-platform content distribution
- Creator workflow automation

## Installation

```bash
cd .github/skills/ailey-soc-tiktok
npm install
```

## Configuration

### 1. Create TikTok Developer Account

Visit [TikTok Developers](https://developers.tiktok.com/) and create account.

### 2. Create App

1. Go to https://developers.tiktok.com/apps/
2. Click "Create an app"
3. Fill in app details (name, privacy policy, terms)
4. Copy Client Key and Client Secret

### 3. Configure OAuth

1. In app dashboard → "Login Kit"
2. Add redirect URI: `http://localhost:3000/auth/callback`
3. Select scopes based on tier (see below)

### 4. Environment Setup

Create `.env` file:

```env
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
TIKTOK_ACCESS_TOKEN=your_access_token_here
TIKTOK_REFRESH_TOKEN=your_refresh_token_here
TIKTOK_REDIRECT_URI=http://localhost:3000/auth/callback
```

## API Tiers

### Tier 1: Login Kit (Auto-Approved)

**What you get:**
- ✅ OAuth 2.0 authentication
- ✅ Basic user profile (name, avatar, bio)
- ✅ User consent management

**No approval required** - available immediately.

**Scopes:**
- `user.info.basic`
- `user.info.profile`
- `user.info.stats`

### Tier 2: Display API (Application Required)

**Additional features:**
- ✅ Display user videos on external sites
- ✅ Video embed codes
- ✅ Basic video information

**Approval:** 1-2 weeks
**Note:** Being phased out - recommend focusing on Tier 3.

**Additional scopes:**
- `video.list`

### Tier 3: Content Posting API (Manual Approval - RECOMMENDED)

**Additional features:**
- ✅ Video uploads via API
- ✅ Post scheduling
- ✅ Video analytics (views, likes, shares)
- ✅ Comment management (read, reply, delete)
- ✅ Audience insights

**Approval:** 2-8 weeks
**How to apply:** https://developers.tiktok.com/apps/ → Add products → Content Posting API

**Additional scopes:**
- `video.upload`
- `video.publish`
- `comment.list`
- `comment.list.manage`

### Tier 4: Marketing API (Partner Program)

**Additional features:**
- ✅ Campaign management
- ✅ Ad creation and targeting
- ✅ Marketing analytics
- ✅ Budget management
- ✅ ROI tracking

**Approval:** 3-6 months, partner status required
**How to apply:** https://ads.tiktok.com/marketing_api/

## Quick Start

### Detect Your API Tier

```bash
npm run tiktok detect
```

This will show:
- Your current API tier
- Available features
- Upgrade path recommendations

### Setup Help

```bash
npm run tiktok setup
```

Displays comprehensive setup instructions for all tiers.

### Test Connection

```bash
npm run tiktok test
```

Verifies API connection and shows your profile.

## Workflows

### Workflow 1: Check API Capabilities (All Tiers)

**Use when:** Starting work, checking account status, verifying approvals.

```bash
# Detect tier and capabilities
npm run tiktok detect

# Expected output:
# 🎯 API Tier: CONTENT POSTING
# ✅ Video uploads
# ✅ Analytics & insights
# ✅ Comment management
# ❌ Marketing (requires Partner status)
```

**What it does:**
1. Tests API connection
2. Detects highest available tier
3. Lists available features
4. Suggests upgrade path if applicable

**When tier is detected:**
- **Login Kit:** Shows how to apply for Content API
- **Content Posting:** All creator features available
- **Marketing API:** Full advertising capabilities

### Workflow 2: OAuth Authentication (Tier 1+)

**Use when:** First setup, token expired, re-authorizing account.

```bash
# Start OAuth flow (manual for now)
npm run tiktok auth start

# Test authentication
npm run tiktok test
```

**OAuth Flow:**
1. Generate authorization URL with required scopes
2. User visits URL and grants permissions
3. TikTok redirects with authorization code
4. Exchange code for access token
5. Store token in `.env`

**Required scopes by tier:**
- **Tier 1:** `user.info.basic`
- **Tier 2:** + `video.list`
- **Tier 3:** + `video.upload,video.publish,comment.list`
- **Tier 4:** + `ad.management,campaign.create`

### Workflow 3: Upload Video (Tier 3+ Required)

**Use when:** Publishing content, automating uploads, multi-platform distribution.

```bash
# Upload video with caption
npm run tiktok upload video.mp4 --caption "My amazing video! #trending"

# Upload with privacy settings
npm run tiktok upload video.mp4 \
  --caption "Check this out!" \
  --privacy SELF_ONLY \
  --disable-comment

# Upload with content settings
npm run tiktok upload video.mp4 \
  --caption "Brand collaboration" \
  --brand-content \
  --disable-duet \
  --disable-stitch
```

**Video Upload Options:**
- `--caption TEXT` - Video caption/description
- `--privacy LEVEL` - PUBLIC_TO_EVERYONE, MUTUAL_FOLLOW_FRIENDS, SELF_ONLY
- `--disable-comment` - Disable comments
- `--disable-duet` - Disable duet feature
- `--disable-stitch` - Disable stitch feature
- `--brand-content` - Mark as branded content
- `--brand-organic` - Mark as brand organic content

**Upload Process:**
1. Skill detects if Tier 3+ access available
2. Uploads video file to TikTok
3. Applies caption and settings
4. Publishes or saves as draft
5. Returns video ID and URL

**If Tier 1/2 (no upload access):**
```
❌ Video uploads require Content Posting API (Tier 3)

To unlock this feature:
1. Apply for Content Posting API
2. https://developers.tiktok.com/apps/
3. Approval takes 2-8 weeks
```

### Workflow 4: View Video Analytics (Tier 3+ Required)

**Use when:** Tracking performance, analyzing engagement, optimizing content.

```bash
# Video analytics
npm run tiktok analytics video VIDEO_ID

# Account analytics
npm run tiktok analytics user

# Expected output:
# Video Analytics:
# Views: 15,234
# Likes: 1,892
# Comments: 234
# Shares: 156
# Avg watch time: 8.4s
# Completion rate: 62%
```

**Available Metrics:**
- **Video Level:**
  - Views, likes, comments, shares
  - Watch time, completion rate
  - Traffic sources
  - Audience demographics

- **Account Level:**
  - Total followers, following
  - Total video count
  - Engagement rate
  - Growth trends

**If Tier 1/2 (no analytics access):**
```
❌ Analytics require Content Posting API (Tier 3)
```

### Workflow 5: Manage Comments (Tier 3+ Required)

**Use when:** Engaging with audience, moderating content, community management.

```bash
# List video comments
npm run tiktok comments list VIDEO_ID

# Reply to comment
npm run tiktok comments reply COMMENT_ID "Thanks for watching!"

# Delete comment
npm run tiktok comments delete COMMENT_ID
```

**Comment Operations:**
- List all comments on video (paginated)
- Reply to specific comments
- Delete inappropriate comments
- Filter by date, engagement

**Use cases:**
- Automated moderation (filter spam)
- Engagement responses
- Community management
- Crisis response

### Workflow 6: List User Videos (Tier 2+ Required)

**Use when:** Auditing content, bulk operations, analytics collection.

```bash
# List my videos
npm run tiktok videos list

# With limit
npm run tiktok videos list --limit 50

# Expected output:
# Your TikTok Videos:
# 1. "Amazing sunset..." (ID: 123456789)
#    Posted: 2 days ago | Views: 15.2K
#
# 2. "Check out this..." (ID: 987654321)
#    Posted: 5 days ago | Views: 8.7K
```

**Information returned:**
- Video ID (for other operations)
- Caption/title
- Post date
- View count (if Tier 3+)
- Share URL

### Workflow 7: Apply for Higher Tier

**Use when:** Need video uploads, analytics, or marketing features.

**To apply for Tier 3 (Content Posting API):**

1. **Prepare application:**
   - Clear use case description
   - Content moderation plan
   - Privacy/data handling procedures
   - Expected upload volume
   - Sample integration screenshots

2. **Submit application:**
   - Go to https://developers.tiktok.com/apps/
   - Select your app
   - Click "Add products"
   - Select "Content Posting API"
   - Complete form and submit

3. **Wait for approval:**
   - Check email for status updates
   - Typical approval: 2-8 weeks
   - May require additional information

4. **After approval:**
   - Update OAuth scopes in app dashboard
   - Re-run `npm run tiktok detect` to verify
   - New features automatically available

**Tips for approval:**
- **Clear use case:** Explain exactly how you'll use the API
- **Compliance:** Show how you'll follow TikTok guidelines
- **Data protection:** Detail privacy and security measures
- **User benefit:** Emphasize value to TikTok users
- **Moderation:** Describe content review process

## Examples

### Example 1: Automated Content Publishing

```bash
#!/bin/bash
# Batch upload videos from directory

for video in /path/to/videos/*.mp4; do
  filename=$(basename "$video" .mp4)
  npm run tiktok upload "$video" \
    --caption "$filename #automation #contentcreator" \
    --privacy PUBLIC_TO_EVERYONE
  
  echo "Uploaded: $filename"
  sleep 60  # Rate limiting
done
```

### Example 2: Weekly Performance Report

```bash
#!/bin/bash
# Generate weekly analytics report

echo "Weekly TikTok Performance Report"
echo "================================="
echo ""

# Account overview
npm run tiktok analytics user

echo ""
echo "Top Videos This Week:"
echo "---------------------"

# Could be enhanced to query videos and sort by performance
npm run tiktok videos list --limit 10
```

### Example 3: Comment Moderation

```bash
#!/bin/bash
# Automated comment moderation (pseudocode)

# List recent comments
npm run tiktok comments list VIDEO_ID > comments.json

# Filter spam (would require parsing)
# Delete spam comments
# Reply to legitimate questions
```

### Example 4: Tier Detection in Scripts

```typescript
import { TikTokClient, loadConfig } from './tiktok-client.js';

async function uploadVideo(videoPath: string) {
  const client = new TikTokClient(loadConfig());
  
  // Check tier before attempting upload
  const canUpload = await client.checkFeatureAvailability('video_upload');
  
  if (!canUpload.available) {
    console.error(`Cannot upload: ${canUpload.reason}`);
    
    // Get upgrade instructions
    const upgrade = await client.getTierUpgradePath();
    console.log(`To unlock uploads: ${upgrade.description}`);
    return;
  }
  
  // Proceed with upload
  const result = await client.uploadVideo({
    video: videoPath,
    caption: 'My video',
    privacy: 'PUBLIC_TO_EVERYONE'
  });
  
  console.log(`Uploaded: ${result.share_url}`);
}
```

## Integration Patterns

### Pattern 1: Multi-Platform Publishing

Use with other social media skills for unified publishing:

```bash
# Upload to TikTok
npm run tiktok upload video.mp4 --caption "Check this out!"

# Also publish to Instagram Reels (if ailey-soc-instagram available)
npm run instagram content publish reel video.mp4 --caption "Check this out!"

# And Facebook (if ailey-soc-facebook available)
npm run facebook content publish video video.mp4 --message "Check this out!"
```

### Pattern 2: Content Calendar Automation

Combine with scheduling tools:

```bash
#!/bin/bash
# content-calendar.sh

# Schedule uploads for optimal times
if [ "$(date +%H)" -eq "18" ]; then  # 6 PM posting
  npm run tiktok upload /content/daily/$(date +%Y%m%d).mp4 \
    --caption "Daily update for $(date +%B %d)! #daily"
fi
```

### Pattern 3: Analytics Dashboard

Aggregate metrics across platforms:

```bash
#!/bin/bash
# Generate cross-platform analytics

echo "Social Media Dashboard - $(date)"
echo "=================================="

echo ""
echo "TikTok:"
npm run tiktok analytics user

echo ""
echo "Instagram:"
npm run instagram analytics account

echo ""
echo "Facebook:"
npm run facebook analytics page
```

## Tier Comparison Table

| Feature | Login Kit (Tier 1) | Display API (Tier 2) | Content API (Tier 3) | Marketing API (Tier 4) |
|---------|-------------------|---------------------|---------------------|----------------------|
| **OAuth** | ✅ | ✅ | ✅ | ✅ |
| **User Profile** | ✅ | ✅ | ✅ | ✅ |
| **List Videos** | ❌ | ✅ | ✅ | ✅ |
| **Upload Videos** | ❌ | ❌ | ✅ | ✅ |
| **Analytics** | ❌ | ❌ | ✅ | ✅ |
| **Comments** | ❌ | ❌ | ✅ | ✅ |
| **Advertising** | ❌ | ❌ | ❌ | ✅ |
| **Approval** | Auto | 1-2 weeks | 2-8 weeks | 3-6 months |

## Troubleshooting

### "API tier not detected"

```bash
# Re-run detection
npm run tiktok detect

# Check credentials
# Verify TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in .env

# Test connection
npm run tiktok test
```

### "Permission denied - requires Content Posting API"

You're attempting Tier 3+ features with Tier 1/2 access.

**Solution:**
1. Apply for Content Posting API: https://developers.tiktok.com/apps/
2. Wait for approval (2-8 weeks)
3. Re-run `npm run tiktok detect` after approval
4. Features will automatically unlock

### "Access token expired"

```bash
# Re-authenticate
npm run tiktok auth start

# Or use refresh token (if implemented)
# Tokens typically valid for 24 hours
```

### "Invalid client credentials"

Check your `.env` file:
- `TIKTOK_CLIENT_KEY` matches app dashboard
- `TIKTOK_CLIENT_SECRET` matches app dashboard
- No extra spaces or quotes

### "Video upload failed"

Ensure:
- Video meets TikTok requirements:
  - Format: MP4
  - Resolution: 720p minimum
  - Duration: 3 seconds to 10 minutes
  - File size: < 287.6 MB
- You have Tier 3+ access
- Access token is valid

## Resources

- **Developer Portal:** https://developers.tiktok.com/
- **API Documentation:** https://developers.tiktok.com/doc/
- **Login Kit Guide:** https://developers.tiktok.com/doc/login-kit-web/
- **Content Posting:** https://developers.tiktok.com/doc/content-posting-api-get-started/
- **OAuth Guide:** https://developers.tiktok.com/doc/oauth-user-access-token-management/
- **Community Support:** https://developers.tiktok.com/community/

## Best Practices

1. **Start with Tier 1** - Get OAuth working first
2. **Apply for Tier 3 early** - Approval takes 2-8 weeks
3. **Test tier detection** - Run `detect` regularly
4. **Rate limiting** - Respect API limits (varies by tier)
5. **Error handling** - Check tier before feature usage
6. **Security** - Never commit `.env` files
7. **Content guidelines** - Follow TikTok community standards

## Unique Features

- **Automatic tier detection** - Adapts to account capabilities
- **Upgrade path guidance** - Clear instructions for unlocking features
- **Graceful degradation** - Works with any tier level
- **Feature availability checks** - Proactive permission validation
- **Comprehensive setup guide** - Multi-tier configuration support

---

version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.7
---
