# TikTok Content Manager (`ailey-soc-tiktok`)

Comprehensive TikTok integration with multi-tier API access support. Automatically detects account capabilities and adapts features accordingly.

## Quick Reference

### Detect Your API Tier

```bash
npm run tiktok detect
```

Shows your current tier (Login Kit, Display API, Content Posting, Marketing) and available features.

### Setup Instructions

```bash
npm run tiktok setup
```

Comprehensive setup guide for all API tiers with application links.

### Test Connection

```bash
npm run tiktok test
```

Verify API connection and view profile.

## API Tiers

| Tier | Features | Approval |
|------|----------|----------|
| **Tier 1: Login Kit** | OAuth, basic profile | ✅ Auto-approved |
| **Tier 2: Display API** | Video display, embeds | ⚠️ 1-2 weeks |
| **Tier 3: Content Posting** | Video uploads, analytics, comments | ⚠️ 2-8 weeks |
| **Tier 4: Marketing API** | Advertising, campaigns | ❌ 3-6 months, partner status |

## Common Commands

```bash
# Tier detection
npm run tiktok detect

# Setup guide
npm run tiktok setup

# Test connection
npm run tiktok test

# OAuth (manual flow)
npm run tiktok auth start

# Upload video (Tier 3+)
npm run tiktok upload video.mp4 --caption "My video"

# List videos (Tier 2+)
npm run tiktok videos list

# Analytics (Tier 3+)
npm run tiktok analytics video VIDEO_ID
npm run tiktok analytics user

# Comments (Tier 3+)
npm run tiktok comments list VIDEO_ID
npm run tiktok comments reply COMMENT_ID "Thanks!"
```

## Configuration

Create `.env` in skill directory:

```env
TIKTOK_CLIENT_KEY=your_client_key_here
TIKTOK_CLIENT_SECRET=your_client_secret_here
TIKTOK_ACCESS_TOKEN=your_access_token_here
TIKTOK_REFRESH_TOKEN=your_refresh_token_here
```

Get credentials from: https://developers.tiktok.com/apps/

## Upgrade Paths

### From Tier 1 → Tier 3 (Recommended)

1. Go to https://developers.tiktok.com/apps/
2. Select your app → "Add products"
3. Select "Content Posting API"
4. Complete application:
   - Use case description
   - Content moderation plan
   - Privacy procedures
   - Expected upload volume
5. Wait for approval (2-8 weeks)
6. Run `npm run tiktok detect` to verify

### From Tier 3 → Tier 4

1. Go to https://ads.tiktok.com/marketing_api/
2. Apply for partner program
3. Requirements:
   - Registered business
   - TikTok Ads experience
   - Technical capabilities
   - Case studies
4. Wait for approval (3-6 months)

## Features by Tier

### Tier 1 (Available Now)

- ✅ OAuth 2.0 authentication
- ✅ Basic user profile
- ✅ Tier detection
- ✅ Connection testing

### Tier 2 (Application Required)

All Tier 1 features plus:
- ✅ List user videos
- ✅ Video information
- ✅ Embed codes

### Tier 3 (Manual Approval - RECOMMENDED)

All Tier 1-2 features plus:
- ✅ Video uploads
- ✅ Video analytics
- ✅ Comment management
- ✅ Audience insights

### Tier 4 (Partner Status)

All Tier 1-3 features plus:
- ✅ Campaign management
- ✅ Ad creation
- ✅ Marketing analytics

## Troubleshooting

**"Permission denied"**
- Check your tier: `npm run tiktok detect`
- Apply for higher tier if needed

**"Access token expired"**
- Re-run OAuth flow: `npm run tiktok auth start`

**"Invalid credentials"**
- Verify `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` in `.env`

**"Upload failed"**
- Ensure you have Tier 3+ access
- Check video format (MP4, 720p+, < 287.6 MB)

## Resources

- Developer Portal: https://developers.tiktok.com/
- API Docs: https://developers.tiktok.com/doc/
- Apply for Content API: https://developers.tiktok.com/apps/
- Marketing Partner: https://ads.tiktok.com/marketing_api/

## Key Innovation

**Automatic Tier Detection** - This skill automatically detects your account's API access level and only shows features you can actually use. No confusing "permission denied" errors - the skill adapts to your capabilities and shows you how to unlock more features.

Run `npm run tiktok detect` to see your current tier and available features.

---

For detailed workflows and examples, see [SKILL.md](SKILL.md).

For complete setup instructions, run `npm run tiktok setup`.
