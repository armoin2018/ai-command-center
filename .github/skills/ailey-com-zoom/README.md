# Zoom API Integration - Quick Start Guide

Comprehensive Zoom integration with automatic account tier detection and complete meeting management capabilities.

## Features

- ✅ **Account Tier Detection** - Automatic Free/Pro/Business/Enterprise detection
- ✅ **Meeting Management** - Create, list, and manage meetings
- ✅ **Recording Management** - Access and manage video recordings
- ✅ **User Management** - Manage Zoom users
- ✅ **Webinar Hosting** - Create and manage webinars
- ✅ **JWT Authentication** - Secure JWT-based authentication
- ✅ **OAuth Support** - OAuth 2.0 authentication
- ✅ **Analytics** - Meeting reports and statistics
- ✅ **Webhook Support** - Real-time event notifications
- ✅ **Error Handling** - Comprehensive error detection

## Quick Start

### 1. Installation

```bash
cd .github/skills/ailey-com-zoom
npm install
```

### 2. Setup

```bash
# View comprehensive setup instructions
npm run setup

# This will guide you through:
# - Getting API credentials
# - Extracting Client ID and Secret
# - Configuring environment
# - Verifying connection
```

### 3. Get API Credentials

1. Go to [marketplace.zoom.us](https://marketplace.zoom.us/)
2. Click "Develop" → "Build App"
3. Choose "JWT" app type
4. Fill in app details
5. Copy **Client ID** and **Client Secret**

### 4. Configure Environment

```bash
cp .env.example .env

# Edit .env with your credentials:
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
```

### 5. Verify Setup

```bash
# Detect account tier
npm run detect

# Test connection
npm run auth -- verify

# Run diagnostics
npm run diagnose
```

## Account Tiers

### Free (100 Participants)
- ✅ Basic meetings
- ✅ 40-minute limit (3+ participants)
- ✅ Cloud recording (5 GB)
- ✅ Screen sharing
- ❌ Webinars
- **Cost**: Free

### Pro (300 Participants)
- ✅ All Free features
- ✅ Unlimited duration
- ✅ Webinars (100 attendees)
- ✅ Breakout rooms
- ✅ Recording transcription
- **Cost**: $15.99/month per user

### Business (500 Participants)
- ✅ All Pro features
- ✅ Team features
- ✅ Webinars (300 attendees)
- ✅ Dedicated support
- ✅ SSO support
- **Cost**: $19.99+/month (10+ users)

### Enterprise (Unlimited)
- ✅ All Business features
- ✅ Unlimited participants
- ✅ Dedicated support (24/7)
- ✅ Custom integration
- ✅ White-label options
- **Cost**: Custom pricing

## Basic Usage

### Create Meeting

```bash
npm run meeting -- create \
  --topic "Team Standup" \
  --time "2026-02-01T10:00:00Z" \
  --duration 30
```

### List Meetings

```bash
npm run meeting -- list
```

### Get Meeting Details

```bash
npm run meeting -- get --meeting-id MEETING_ID
```

### List Recordings

```bash
npm run recording -- list
```

### Create Webinar

```bash
npm run webinar -- create \
  --topic "Product Launch" \
  --time "2026-02-01T14:00:00Z" \
  --duration 60
```

### List Users

```bash
npm run user -- list
```

## AI-ley Integration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  zoom:
    enabled: true
    clientId: ${ZOOM_CLIENT_ID}
    clientSecret: ${ZOOM_CLIENT_SECRET}
    accountId: ${ZOOM_ACCOUNT_ID}
    accountTier: auto
    authType: jwt
    features:
      - meeting_management
      - recording_management
      - webinar_hosting
      - user_management
      - analytics
```

## TypeScript Usage

```typescript
import { createZoomClient } from '@ailey/com-zoom';

const client = createZoomClient();

// Detect account
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);

// Create meeting
const meeting = await client.createMeeting({
  topic: 'Team Meeting',
  type: 'scheduled',
  start_time: new Date('2026-02-01T10:00:00Z'),
  duration: 30
});

// List recordings
const recordings = await client.listRecordings();
```

## Documentation

- [SKILL.md](SKILL.md) - Complete documentation
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [SUMMARY.md](SUMMARY.md) - Project overview

## Resources

- **Marketplace:** [marketplace.zoom.us](https://marketplace.zoom.us/)
- **API Reference:** [developers.zoom.us/docs/api](https://developers.zoom.us/docs/api)
- **Getting Started:** [Authentication Guide](https://developers.zoom.us/docs/api/rest/authentication/)
- **JWT Guide:** [JWT Authentication](https://developers.zoom.us/docs/api/rest/authentication/#jwt)
- **REST API:** [API Reference](https://developers.zoom.us/docs/api/rest/reference/)
- **Help Center:** [Zoom Support](https://support.zoom.us/)

## Support

For issues:
1. Run `npm run diagnose`
2. Check [Zoom API Documentation](https://developers.zoom.us/docs/api/)
3. Review [API Error Codes](https://developers.zoom.us/docs/api/rest/reference/error-codes/)

---

**Version**: 1.0.0  
**Updated**: 2026-02-01  
**License**: MIT
