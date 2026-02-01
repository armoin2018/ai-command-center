# Meetup Integration Manager - Summary

## Overview

The **Meetup Integration Manager** is a comprehensive skill for the AI-ley toolkit that provides full access to Meetup's GraphQL API. It enables automated event management, group administration, RSVP tracking, and member engagement for Meetup Pro accounts.

## Key Features

### 🎯 Account Detection
- Automatic tier detection (Standard vs Meetup Pro)
- API access verification
- Upgrade guidance when Pro subscription is missing
- Feature availability based on account type

### 🔐 OAuth Authentication
- OAuth 2.0 authentication flow
- Automatic token refresh
- Secure credential storage
- Local callback server for auth flow
- Interactive browser-based authorization

### 📅 Event Management
- Create, update, and cancel events
- List upcoming events by group
- Get detailed event information
- Track RSVPs and waitlists
- Export attendee lists
- Draft and published event states
- Venue and capacity management

### 👥 Group Administration
- List all groups in network
- Get detailed group information
- View member counts
- Manage group topics
- Track group analytics
- Multi-group network support

### 📊 Analytics & Reporting
- Group performance metrics
- Event attendance tracking
- Member engagement rates
- RSVP analytics
- Historical trends
- Custom time periods (7/30/90/365 days)

### 🔌 GraphQL API Access
- Full GraphQL query support
- Custom mutations
- Batch operations
- Real-time data access
- Schema-based operations

## Technical Architecture

### Core Components

**MeetupClient Class** (`src/index.ts`)
- Main API client with GraphQL support
- OAuth 2.0 authentication
- Account tier detection
- Event and group management methods
- Token refresh logic
- Error handling and retry mechanisms

**CLI Interface** (`src/cli.ts`)
- Commander.js-based CLI
- Interactive authentication flow
- Event management commands
- Group administration commands
- Analytics and reporting
- Diagnostic tools
- Custom query execution

### Technologies Used

- **Language:** TypeScript 5.3.3
- **Runtime:** Node.js 18+
- **API:** Meetup GraphQL API
- **Auth:** OAuth 2.0 with PKCE
- **HTTP Client:** Axios 1.6.5
- **CLI Framework:** Commander 12.0.0
- **Terminal UI:** Chalk 4.1.2
- **Local Server:** Express 4.18.2

## Project Structure

```
ailey-meetup/
├── src/
│   ├── index.ts          # MeetupClient class & types
│   └── cli.ts            # CLI implementation
├── dist/                  # Compiled JavaScript (generated)
├── SKILL.md              # Complete documentation
├── README.md             # Quick start guide
├── QUICK_REFERENCE.md    # Command reference
├── SUMMARY.md            # This file
├── package.json          # Dependencies & scripts
├── tsconfig.json         # TypeScript configuration
├── .env.example          # Environment template
├── .gitignore            # Git ignore rules
└── install.sh            # Installation script
```

## Account Tiers

### Standard Account
- ❌ No API access
- ✅ Web-based event creation
- ✅ Basic group management
- ❌ No programmatic automation

### Meetup Pro Account
- ✅ Full GraphQL API access
- ✅ Network management (multiple groups)
- ✅ Advanced analytics
- ✅ Attendee email access
- ✅ Custom attendance forms
- ✅ Programmatic automation
- ✅ SEO-friendly branded pages

**Pricing:** Contact Meetup sales for Pro pricing

## Setup Requirements

1. **Meetup Pro Subscription**
   - Required for API access
   - Sign up at [meetup.com/pro](https://www.meetup.com/pro/)

2. **OAuth Client Credentials**
   - Create at [meetup.com/api/oauth/list](https://www.meetup.com/api/oauth/list/)
   - Obtain Client ID and Client Secret
   - Configure redirect URI

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Add OAuth credentials
   - Configure default settings

4. **Authentication**
   - Run `npm run auth start`
   - Complete OAuth flow in browser
   - Tokens saved automatically

## Usage Patterns

### CLI Usage

```bash
# Detect account tier
npm run detect

# Authenticate
npm run auth start

# Create event
npm run event create \
  --group "my-group" \
  --title "Tech Meetup" \
  --start "2026-02-15T18:00:00" \
  --duration 120

# List events
npm run event list --group "my-group"

# Get analytics
npm run group analytics \
  --group "my-group" \
  --period "last-30-days"
```

### Programmatic Usage

```typescript
import { MeetupClient } from './src/index';

const client = new MeetupClient({
  clientId: process.env.MEETUP_CLIENT_ID!,
  clientSecret: process.env.MEETUP_CLIENT_SECRET!,
  redirectUri: process.env.MEETUP_REDIRECT_URI!,
  accessToken: process.env.MEETUP_ACCESS_TOKEN,
});

// Create event
const event = await client.createEvent({
  groupUrlname: 'my-group',
  title: 'Tech Meetup',
  description: 'Monthly discussion',
  startTime: new Date('2026-02-15T18:00:00'),
  duration: 120,
  capacity: 50,
});

// Get analytics
const analytics = await client.getGroupAnalytics('my-group', {
  period: 'last-30-days',
});
```

## Common Workflows

### 1. Create and Promote Event
- Create event via API
- Monitor RSVPs
- Send announcements
- Track attendance

### 2. Manage Event Series
- Create recurring events
- Track series attendance
- Analyze engagement trends
- Adjust future events based on data

### 3. Network Analytics
- Track metrics across multiple groups
- Compare group performance
- Identify growth opportunities
- Generate reports

### 4. Automated RSVP Management
- Monitor RSVP changes
- Send reminders to attendees
- Manage waitlists
- Export attendee data

### 5. Member Engagement
- Analyze member activity
- Identify active participants
- Send targeted communications
- Track engagement trends

## API Capabilities

### Events
- Create/update/delete events
- List upcoming events
- Get event details
- Track RSVPs
- Export attendee lists
- Manage waitlists
- Set capacity limits

### Groups
- List user's groups
- Get group details
- View member counts
- Track group analytics
- Manage topics
- Network administration

### RSVPs
- Get RSVP summaries
- Track response changes
- Send reminders
- Manage waitlists
- Export attendee data

### Analytics
- Member growth trends
- Event attendance rates
- Engagement metrics
- Top performing events
- Custom time periods

### GraphQL
- Execute custom queries
- Run mutations
- Batch operations
- Real-time data access

## Integration Points

### AI-ley Configuration

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

### Environment Variables

```bash
MEETUP_CLIENT_ID=oauth_client_id
MEETUP_CLIENT_SECRET=oauth_client_secret
MEETUP_REDIRECT_URI=http://localhost:3000/callback
MEETUP_ACCESS_TOKEN=access_token
MEETUP_REFRESH_TOKEN=refresh_token
```

## Error Handling

The skill provides comprehensive error handling:

- **No API Access:** Provides upgrade instructions
- **Authentication Failed:** Guides through OAuth flow
- **Rate Limiting:** Automatic retry with backoff
- **Invalid Credentials:** Clear error messages
- **Network Errors:** Retry logic with exponential backoff
- **GraphQL Errors:** Detailed error reporting

## Limitations

- **API Access:** Requires Meetup Pro subscription
- **Rate Limits:** 30 requests per minute (typical)
- **GraphQL Depth:** Nested query depth limits
- **Historical Data:** Limited by subscription tier
- **Network Features:** Pro-only capabilities

## Future Enhancements

Potential improvements:
- Webhook support for real-time updates
- Bulk event operations
- Advanced filtering options
- Custom report templates
- Integration with calendar systems
- Automated event recommendations
- ML-based attendance predictions

## Resources

- **API Documentation:** [meetup.com/api](https://www.meetup.com/api/)
- **GraphQL Playground:** [meetup.com/api/playground](https://www.meetup.com/api/playground/)
- **Meetup Pro:** [meetup.com/pro](https://www.meetup.com/pro/)
- **OAuth Clients:** [meetup.com/api/oauth/list](https://www.meetup.com/api/oauth/list/)
- **Help Center:** [help.meetup.com](https://help.meetup.com/)

## Support

For issues or questions:
1. Check [SKILL.md](./SKILL.md) for detailed documentation
2. Run `npm run diagnose` for diagnostic information
3. Review [Meetup API documentation](https://www.meetup.com/api/)
4. Contact Meetup support for account-specific issues

## Version Information

- **Version:** 1.0.0
- **Release Date:** 2026-02-01
- **Node.js:** >=18.0.0
- **TypeScript:** 5.3.3
- **API Version:** GraphQL (latest)

## Contributors

Developed by the AI-ley Team for the AI Command Center ecosystem.

---

**Last Updated:** 2026-02-01  
**Status:** Production Ready  
**License:** MIT
