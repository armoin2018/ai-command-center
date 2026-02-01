---
id: ailey-com-zoom
name: Zoom API Integration
description: Comprehensive Zoom API integration with account tier detection, meeting management, user administration, recording management, and webinar capabilities. Supports JWT and OAuth authentication with automatic tier detection and feature availability mapping.
keywords:
  - zoom
  - meeting
  - video
  - conference
  - webinar
  - recording
  - api
  - integration
tools:
  - axios
  - jsonwebtoken
  - commander
  - dotenv
---

# Zoom API Integration

## Overview

Complete Zoom API integration for AI-ley enabling meeting creation and management, user administration, recording access, webinar hosting, and analytics. Automatically detects account tier (Free/Pro/Business/Enterprise) and maps available features accordingly. Supports both JWT and OAuth authentication methods.

**Setup Time:** 20-30 minutes  
**Difficulty:** Intermediate  
**API Rate:** 15 requests/second (standard)  
**Pricing:** Free, $15.99/month (Pro), $19.99/month (Business), custom (Enterprise)

## Account Tier Detection

### Tier 1: Free
**When:** Free Zoom account  
**Features:**
- ✅ Basic meetings (40 min limit for 3+ participants)
- ✅ Unlimited 1-on-1 meetings
- ✅ Cloud recording (5 GB storage)
- ✅ Up to 100 participants
- ✅ Screen sharing
- ✅ Basic webhooks
- ❌ Webinars
- ❌ Breakout rooms
- ❌ Advanced reporting
- ❌ Dedicated support

**Users:** Unlimited  
**Storage:** 5 GB (cloud recordings)  
**API Access:** Limited  
**Cost:** Free  
**Use Case:** Personal, small team testing

### Tier 2: Pro
**When:** Pro Zoom account ($15.99/month per license)  
**Features:**
- ✅ All Free features
- ✅ Unlimited meeting duration
- ✅ Up to 300 participants
- ✅ Webinars (100 attendees)
- ✅ Breakout rooms
- ✅ Polls and Q&A
- ✅ Recording transcription
- ✅ Advanced reporting
- ✅ Custom meeting backgrounds
- ✅ Cloud storage (100 GB)

**Users:** Per license  
**Storage:** 100 GB per user  
**API Access:** Full  
**Cost:** $15.99/month per user  
**Use Case:** Small business, growing teams

### Tier 3: Business
**When:** Business Zoom account ($19.99/month minimum, 10+ users)  
**Features:**
- ✅ All Pro features
- ✅ Up to 500 participants
- ✅ Webinars (300 attendees)
- ✅ Team collaboration features
- ✅ Dedicated account manager
- ✅ SSO (Single Sign-On)
- ✅ Advanced security
- ✅ Custom branding
- ✅ Zoom Rooms support
- ✅ Advanced workflows

**Users:** 10+ users  
**Storage:** 300 GB per user  
**API Access:** Full + webhooks  
**Cost:** $19.99/month minimum  
**Use Case:** Enterprise teams, departments

### Tier 4: Enterprise
**When:** Custom enterprise deployment  
**Features:**
- ✅ All Business features
- ✅ Unlimited participants
- ✅ Unlimited webinars
- ✅ Dedicated support (24/7)
- ✅ Custom integration
- ✅ Advanced security & compliance
- ✅ White-label options
- ✅ Unlimited storage
- ✅ Multi-region deployment
- ✅ SLA guarantee

**Users:** Unlimited  
**Storage:** Unlimited  
**API Access:** Full + custom  
**Cost:** Custom pricing  
**Use Case:** Large enterprises, regulated industries

## Feature Availability Matrix

| Feature | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| Meetings | ✅ | ✅ | ✅ | ✅ |
| Meeting Duration | 40 min | Unlimited | Unlimited | Unlimited |
| Participants | 100 | 300 | 500 | Unlimited |
| Webinars | ❌ | 100 | 300 | Unlimited |
| Breakout Rooms | ❌ | ✅ | ✅ | ✅ |
| Recording | ✅ | ✅ | ✅ | ✅ |
| Transcription | ❌ | ✅ | ✅ | ✅ |
| SSO | ❌ | ❌ | ✅ | ✅ |
| Webhooks | Limited | ✅ | ✅ | ✅ |
| API Access | Limited | ✅ | ✅ | ✅ |
| Dedicated Support | ❌ | ❌ | ✅ | ✅ |
| Custom Branding | ❌ | ❌ | ✅ | ✅ |

## Installation

```bash
cd .github/skills/ailey-com-zoom
npm install
npm run build
```

## Setup Instructions

### Step 1: Create Zoom App

1. Visit [Zoom Marketplace](https://marketplace.zoom.us/)
2. Sign in or create a Zoom account
3. Click "Develop" → "Build App"
4. Choose "JWT" or "OAuth" app type:
   - **JWT:** Simpler, no user interaction required
   - **OAuth:** More secure, supports delegation
5. Enter app name and basic information
6. Accept terms and create app

### Step 2: Get API Credentials

**For JWT Authentication:**

1. Go to app dashboard
2. Click "View JWT Token" or "JWT Token" tab
3. Copy your **Client ID** and **Client Secret**
4. Keep token generation secret secure

**For OAuth Authentication:**

1. Go to OAuth settings
2. Add redirect URI: `https://your-domain.com/callback`
3. Copy **Client ID** and **Client Secret**
4. Set up OAuth flow in your application

### Step 3: Enable API Permissions

1. In app dashboard, go to "Scopes"
2. Add required scopes:
   - `meeting:create` - Create meetings
   - `meeting:read` - Read meeting info
   - `meeting:update` - Modify meetings
   - `meeting:delete` - Delete meetings
   - `user:read` - Read user info
   - `recording:read` - Access recordings
   - `webinar:read` - Read webinar info
3. Click "Save" to confirm

### Step 4: Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your credentials:
ZOOM_CLIENT_ID=your_client_id_here
ZOOM_CLIENT_SECRET=your_client_secret_here
ZOOM_ACCOUNT_ID=your_account_id_here
ZOOM_AUTH_TYPE=jwt  # or 'oauth'
```

**Finding Your Credentials:**

| Credential | Location | Format |
|-----------|----------|--------|
| Client ID | App Dashboard → Basic Information | UUID format |
| Client Secret | App Dashboard → Basic Information | Long string |
| Account ID | Account Settings → Advanced → Account ID | UUID format |

### Step 5: Verify Setup

```bash
# Test connection
npm run detect

# Verify API access
npm run auth -- verify

# Run full diagnostics
npm run diagnose
```

### Step 6: Configure Webhooks (Optional)

For receiving meeting events:

```bash
npm run webhook -- setup \
  --url "https://your-domain.com/zoom/webhook" \
  --secret "your_webhook_secret"

# Subscribe to events
npm run webhook -- events \
  --enable "meeting.started,meeting.ended,recording.completed"
```

## Quick Start

### Create a Meeting

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
npm run meeting -- get --meeting-id YOUR_MEETING_ID
```

### Start Recording

```bash
npm run recording -- start --meeting-id YOUR_MEETING_ID
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
  --duration 60 \
  --registrants 100
```

## API Reference

### Meeting Management

```bash
npm run meeting -- create \
  --topic "Meeting Name" \
  --time "2026-02-01T10:00:00Z" \
  --duration 30

npm run meeting -- list --status scheduled

npm run meeting -- get --meeting-id ID

npm run meeting -- update --meeting-id ID --topic "New Topic"

npm run meeting -- delete --meeting-id ID

npm run meeting -- invite --meeting-id ID --emails "user@example.com,user2@example.com"
```

### Recording Management

```bash
npm run recording -- list

npm run recording -- get --meeting-id MEETING_ID

npm run recording -- download --recording-id RECORDING_ID

npm run recording -- delete --recording-id RECORDING_ID
```

### User Management

```bash
npm run user -- list

npm run user -- get --email user@example.com

npm run user -- create --email user@example.com --first-name John --last-name Doe
```

### Webinar Management

```bash
npm run webinar -- create \
  --topic "Webinar Name" \
  --time "2026-02-01T14:00:00Z" \
  --duration 60 \
  --registrants 100

npm run webinar -- list

npm run webinar -- get --webinar-id ID
```

## TypeScript Integration

```typescript
import { createZoomClient } from '@ailey/com-zoom';

const client = createZoomClient();

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);
console.log(`Features: ${account.features.join(', ')}`);

// Create meeting
const meeting = await client.createMeeting({
  topic: 'Team Meeting',
  type: 'scheduled',
  start_time: new Date('2026-02-01T10:00:00Z'),
  duration: 30,
  settings: {
    host_video: true,
    participant_video: true,
    join_before_host: false,
    mute_upon_entry: false,
    waiting_room: false
  }
});

// List recordings
const recordings = await client.listRecordings();

// Create webinar
const webinar = await client.createWebinar({
  topic: 'Product Launch',
  type: 'scheduled',
  start_time: new Date('2026-02-01T14:00:00Z'),
  duration: 60,
  settings: {
    host_video: true,
    participant_video: true,
    registrants_confirmation_email: true
  }
});
```

## Workflows

### Workflow 1: Schedule Team Meeting with Recording

```bash
# 1. Create meeting
npm run meeting -- create \
  --topic "Team Standup" \
  --time "2026-02-01T10:00:00Z" \
  --duration 30

# 2. Start recording
npm run recording -- start --meeting-id MEETING_ID

# 3. Invite participants
npm run meeting -- invite \
  --meeting-id MEETING_ID \
  --emails "team@example.com"

# 4. After meeting, retrieve recording
npm run recording -- get --meeting-id MEETING_ID
```

### Workflow 2: Host Product Webinar

```bash
# 1. Create webinar
npm run webinar -- create \
  --topic "Product Demo" \
  --time "2026-02-01T14:00:00Z" \
  --duration 60 \
  --registrants 500

# 2. Start recording
npm run recording -- start --webinar-id WEBINAR_ID

# 3. Manage attendees
npm run webinar -- attendees --webinar-id WEBINAR_ID

# 4. Get meeting report
npm run report -- webinar --webinar-id WEBINAR_ID
```

### Workflow 3: Automated Meeting Reports

```bash
# List all meetings from past week
npm run meeting -- list --from "2026-01-25" --to "2026-02-01"

# Get meeting reports
npm run report -- meeting --meeting-id MEETING_ID

# Export to CSV
npm run report -- export --format csv --output meetings.csv
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Invalid API Key | Expired or incorrect credentials | Regenerate JWT token or OAuth token |
| Meeting Not Found | Invalid meeting ID | List meetings: `npm run meeting -- list` |
| Participant Limit Exceeded | Plan doesn't support participant count | Upgrade account tier |
| Recording Not Available | Recording processing or deleted | Check recording status |
| Webhook Failed | Invalid URL or secret | Verify webhook configuration |

## Troubleshooting

### Connection Issues

```bash
# 1. Verify credentials
npm run auth -- verify

# 2. Test API connection
npm run auth -- test

# 3. Run diagnostics
npm run diagnose
```

### Meeting Not Creating

```bash
# 1. Check meeting time format (ISO 8601)
npm run meeting -- create \
  --topic "Test" \
  --time "2026-02-01T10:00:00Z" \
  --duration 30

# 2. Verify account tier supports required features
npm run detect

# 3. Check participant limit for your plan
```

### Recording Issues

```bash
# 1. Verify recording is enabled
npm run meeting -- get --meeting-id MEETING_ID

# 2. Check recording status
npm run recording -- list

# 3. Verify storage quota
npm run report -- account-info
```

## AI-ley Configuration

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
      - webhook_events
      - reporting
```

## Resources

- **Marketplace:** [marketplace.zoom.us](https://marketplace.zoom.us/)
- **API Reference:** [developers.zoom.us/docs/api](https://developers.zoom.us/docs/api)
- **Getting Started:** [Getting Started Guide](https://developers.zoom.us/docs/api/rest/authentication/)
- **JWT Guide:** [JWT Authentication](https://developers.zoom.us/docs/api/rest/authentication/#jwt)
- **OAuth Guide:** [OAuth Authentication](https://developers.zoom.us/docs/api/rest/authentication/#oauth)
- **SDK Reference:** [Zoom REST API](https://developers.zoom.us/docs/api/rest/reference/)
- **Help Center:** [Zoom Support](https://support.zoom.us/)

## Support

For issues:
1. Run `npm run diagnose` for diagnostics
2. Check [Zoom API Documentation](https://developers.zoom.us/docs/api/)
3. Review [API Error Codes](https://developers.zoom.us/docs/api/rest/reference/error-codes/)
4. Contact Zoom Support through your account

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.8

---
