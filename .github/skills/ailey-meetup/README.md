# Meetup Integration Manager

> Comprehensive Meetup integration with GraphQL API access, account detection, and OAuth authentication

## Quick Links

- **Main Documentation:** [SKILL.md](./SKILL.md)
- **Quick Reference:** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **Summary:** [SUMMARY.md](./SUMMARY.md)

## Overview

The Meetup Integration Manager provides comprehensive access to Meetup's GraphQL API for managing groups, events, members, and RSVPs. The skill automatically detects your account tier (Standard vs Pro) and provides setup instructions when API access is missing.

## Features

✅ **Account Tier Detection** - Automatically detects Standard vs Meetup Pro
✅ **OAuth 2.0 Authentication** - Secure authentication with token refresh
✅ **Event Management** - Create, update, cancel, and track events
✅ **Group Administration** - Manage groups and members
✅ **RSVP Tracking** - Monitor and manage event RSVPs
✅ **Analytics** - Group and event performance metrics
✅ **GraphQL Support** - Full access to Meetup's GraphQL API
✅ **Setup Instructions** - Automatic guidance when access is missing

## Prerequisites

- **Meetup Pro subscription** (required for API access)
- Node.js 18+ and npm
- OAuth client credentials from Meetup

> **Note:** Standard Meetup accounts do not have API access. You must upgrade to Meetup Pro to use this skill.

## Installation

```bash
# Navigate to skill directory
cd .github/skills/ailey-meetup

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run interactive setup
npm run setup
```

## Quick Start

### 1. Check Account Tier

```bash
npm run detect
```

If you have a Standard account, you'll see upgrade instructions.

### 2. Upgrade to Meetup Pro (if needed)

Visit [https://www.meetup.com/pro/](https://www.meetup.com/pro/) and sign up for Meetup Pro.

### 3. Create OAuth Client

1. Visit [https://www.meetup.com/api/oauth/list/](https://www.meetup.com/api/oauth/list/)
2. Click "Create New OAuth Consumer"
3. Fill in application details
4. Copy Client ID and Client Secret

### 4. Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your credentials
MEETUP_CLIENT_ID=your_client_id
MEETUP_CLIENT_SECRET=your_client_secret
MEETUP_REDIRECT_URI=http://localhost:3000/callback
```

### 5. Authenticate

```bash
npm run auth start
```

This will:
- Open your browser
- Guide you through OAuth flow
- Save tokens automatically
- Verify API access

### 6. Verify Setup

```bash
npm run detect
```

You should see "Meetup Pro" account tier with API access enabled.

## Usage Examples

### Create Event

```bash
npm run event create \
  --group "my-group-urlname" \
  --title "Tech Meetup" \
  --description "Monthly tech discussion" \
  --start "2026-02-15T18:00:00" \
  --duration 120 \
  --capacity 50
```

### List Events

```bash
npm run event list --group "my-group-urlname"
```

### Get Event RSVPs

```bash
npm run event rsvps --event-id "event-id"
```

### List Groups

```bash
npm run group list
```

### Get Group Analytics

```bash
npm run group analytics \
  --group "my-group-urlname" \
  --period "last-30-days"
```

## AI-ley Configuration

Add Meetup credentials to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  meetup:
    enabled: true
    account_tier: pro
    oauth:
      client_id: ${MEETUP_CLIENT_ID}
      client_secret: ${MEETUP_CLIENT_SECRET}
      access_token: ${MEETUP_ACCESS_TOKEN}
    settings:
      default_timezone: America/New_York
      auto_publish: false
      notify_on_rsvp: true
```

## Programmatic Usage

```typescript
import { MeetupClient } from './src/index';

const client = new MeetupClient({
  clientId: process.env.MEETUP_CLIENT_ID!,
  clientSecret: process.env.MEETUP_CLIENT_SECRET!,
  redirectUri: process.env.MEETUP_REDIRECT_URI!,
  accessToken: process.env.MEETUP_ACCESS_TOKEN,
});

// Detect account tier
const accountInfo = await client.detectAccountTier();
console.log(`Account: ${accountInfo.tier}`);

// Create event
const event = await client.createEvent({
  groupUrlname: 'my-group',
  title: 'Tech Meetup',
  description: 'Monthly tech discussion',
  startTime: new Date('2026-02-15T18:00:00'),
  duration: 120,
  capacity: 50,
});

console.log(`Event created: ${event.link}`);

// Get analytics
const analytics = await client.getGroupAnalytics('my-group', {
  period: 'last-30-days',
});

console.log(`Engagement rate: ${analytics.engagementRate}%`);
```

## CLI Commands

### Setup & Diagnostics
- `npm run setup` - Interactive setup wizard
- `npm run detect` - Detect account tier
- `npm run diagnose` - Run diagnostic checks

### Authentication
- `npm run auth start` - Start OAuth flow
- `npm run auth verify` - Verify authentication
- `npm run auth refresh` - Refresh access token
- `npm run auth status` - Show token status

### Event Management
- `npm run event create` - Create new event
- `npm run event list` - List events
- `npm run event get` - Get event details
- `npm run event update` - Update event
- `npm run event cancel` - Cancel event
- `npm run event rsvps` - Get event RSVPs

### Group Management
- `npm run group list` - List your groups
- `npm run group get` - Get group details
- `npm run group analytics` - Get group analytics

### Custom Queries
- `npm run query` - Execute custom GraphQL query

## Troubleshooting

### "No API access" error

**Solution:** Upgrade to Meetup Pro
1. Visit [https://www.meetup.com/pro/](https://www.meetup.com/pro/)
2. Sign up for Meetup Pro
3. Create OAuth client
4. Run `npm run auth start`

### OAuth flow fails

**Solution:**
1. Verify Client ID and Client Secret are correct
2. Check redirect URI matches exactly
3. Ensure Meetup Pro subscription is active
4. Clear browser cookies and try again

### Token expired

**Solution:**
```bash
npm run auth refresh
```

### Rate limit exceeded

**Solution:**
- Meetup has rate limits (typically 30 requests/minute)
- Wait for the rate limit to reset
- The skill implements automatic retry with backoff

## Documentation

- **[SKILL.md](./SKILL.md)** - Complete skill documentation with all workflows
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick command reference
- **[SUMMARY.md](./SUMMARY.md)** - Project summary and architecture

## Support

- **Meetup API Docs:** [https://www.meetup.com/api/](https://www.meetup.com/api/)
- **GraphQL Playground:** [https://www.meetup.com/api/playground/](https://www.meetup.com/api/playground/)
- **Meetup Pro:** [https://www.meetup.com/pro/](https://www.meetup.com/pro/)
- **Help Center:** [https://help.meetup.com/](https://help.meetup.com/)

## Version

**Version:** 1.0.0  
**Last Updated:** 2026-02-01

## License

MIT

---

**Next Steps:**
1. Run `npm install` to install dependencies
2. Run `npm run setup` for interactive setup
3. Run `npm run detect` to verify account tier
4. Create OAuth client if needed
5. Run `npm run auth start` to authenticate
6. Start managing events and groups!
