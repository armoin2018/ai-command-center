---
id: ailey-com-calendly
name: Calendly Integration Manager
description: Comprehensive Calendly integration with tier detection, OAuth/Personal Access Token authentication, event management, scheduling, webhooks, and analytics. Use when managing Calendly events, automating scheduling, analyzing booking performance, or integrating Calendly workflows.
keywords: [calendly, scheduling, appointments, events, webhooks, oauth, calendar, booking, availability, meetings]
tools: [calendly-client, event-types, scheduled-events, webhooks, availability, users, routing-forms, analytics]
---

# Calendly Integration Manager

Comprehensive Calendly integration with automatic subscription tier detection, dual authentication methods (Personal Access Token and OAuth 2.0), event type management, scheduled event operations, availability checking, webhook subscriptions, and analytics capabilities.

## Overview

The Calendly Integration Manager provides complete automation for Calendly scheduling workflows:

- **Dual Authentication**: Personal Access Token (quick setup) and OAuth 2.0 (production apps)
- **Tier Detection**: Automatic subscription level detection (Basic, Essentials, Professional, Teams, Enterprise)
- **Event Management**: Create, update, delete event types with custom settings
- **Scheduled Events**: List, view, cancel scheduled bookings
- **Availability**: Check user availability and manage schedules
- **Webhooks**: Subscribe to event notifications (Professional+ tier)
- **Routing Forms**: Manage routing logic for team scheduling (Professional+ tier)
- **Analytics**: Access activity logs and booking metrics (Essentials+ tier)
- **Organization**: Manage team members and memberships (Teams+ tier)

## When to Use

- Automating event type creation and configuration
- Integrating Calendly scheduling into applications
- Building custom booking workflows
- Monitoring scheduled events and cancellations
- Setting up webhook notifications for real-time updates
- Managing team member availability and schedules
- Analyzing booking patterns and performance
- Syncing Calendly data with CRM or other systems

## Installation

```bash
cd .github/skills/ailey-com-calendly
npm install
npm run build
```

## Authentication

### Personal Access Token (Recommended for Internal Tools)

**Fastest setup for personal or internal team use:**

1. Go to [Calendly Integrations](https://calendly.com/integrations/api_webhooks)
2. Generate a Personal Access Token
3. Add to workspace root `.env` (or `~/.vscode/.env` for global config):

```bash
CALENDLY_ACCESS_TOKEN=your_personal_access_token_here
```

### OAuth 2.0 (Recommended for Public Applications)

**Required for apps distributed to external users:**

1. Go to [Calendly Integrations](https://calendly.com/integrations/api_webhooks)
2. Create a new OAuth application
3. Set redirect URI to `http://localhost:3000/callback` (or your production URI)
4. Add to workspace root `.env` (or `~/.vscode/.env` for global config):

```bash
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret
CALENDLY_REDIRECT_URI=http://localhost:3000/callback
```

5. Run OAuth flow:

```bash
npm run calendly setup -- --oauth
# Browser opens for authorization
# After authorizing, you receive a code
npm run calendly oauth-callback -- --code YOUR_AUTH_CODE
```

## Subscription Tier Detection

The skill automatically detects your Calendly subscription tier and enables/disables features accordingly:

```bash
npm run calendly detect-tier
```

### Tier Capabilities Matrix

| Feature | Basic | Essentials | Professional | Teams | Enterprise |
|---------|-------|------------|--------------|-------|------------|
| Event Types | ✓ | ✓ | ✓ | ✓ | ✓ |
| Scheduled Events | ✓ | ✓ | ✓ | ✓ | ✓ |
| Custom Fields | ✗ | ✓ | ✓ | ✓ | ✓ |
| Analytics | ✗ | ✓ | ✓ | ✓ | ✓ |
| Webhooks | ✗ | ✗ | ✓ | ✓ | ✓ |
| Routing Forms | ✗ | ✗ | ✓ | ✓ | ✓ |
| Workflows | ✗ | ✗ | ✓ | ✓ | ✓ |
| Salesforce Integration | ✗ | ✗ | ✓ | ✓ | ✓ |
| Team Features | ✗ | ✗ | ✗ | ✓ | ✓ |
| Admin Reporting | ✗ | ✗ | ✗ | ✓ | ✓ |
| SSO | ✗ | ✗ | ✗ | ✗ | ✓ |
| API Rate Limit | 60/min | 100/min | 150/min | 200/min | 300/min |

## Quick Start

### Get Current User

```bash
npm run calendly me
```

### List Event Types

```bash
# All event types
npm run calendly event-types

# Active event types only
npm run calendly event-types -- --active
```

### List Scheduled Events

```bash
# All scheduled events
npm run calendly scheduled-events

# Filter by status
npm run calendly scheduled-events -- --status active

# Filter by date range
npm run calendly scheduled-events -- --min 2026-02-01T00:00:00Z --max 2026-02-28T23:59:59Z
```

### Cancel a Scheduled Event

```bash
npm run calendly cancel-event -- --uuid EVENT_UUID --reason "Rescheduling requested"
```

### Webhook Management (Professional+ Tier)

```bash
# List webhooks
npm run calendly webhooks

# Create webhook
npm run calendly create-webhook -- \
  --url https://your-server.com/webhooks \
  --events invitee.created,invitee.canceled

# Delete webhook
npm run calendly delete-webhook -- --uuid WEBHOOK_UUID
```

## Programmatic Usage

### TypeScript/JavaScript Integration

```typescript
import { getCalendlyConfig } from './.github/skills/ailey-com-calendly/scripts/config.js';
import CalendlyClient from './.github/skills/ailey-com-calendly/scripts/calendly-client.js';

// Initialize client
const config = getCalendlyConfig();
const client = new CalendlyClient(config);

// Detect tier
const tier = await client.detectTier();
console.log(`Subscription tier: ${tier}`);

// Get current user
const user = await client.getCurrentUser();
console.log(`Hello, ${user.resource.name}`);

// List event types
const eventTypes = await client.listEventTypes();
for (const eventType of eventTypes.collection) {
  console.log(`${eventType.name} - ${eventType.scheduling_url}`);
}

// List scheduled events
const scheduled = await client.listScheduledEvents({
  status: 'active',
  min_start_time: '2026-02-01T00:00:00Z',
});
console.log(`You have ${scheduled.collection.length} upcoming events`);

// Create webhook (Professional+ tier)
const webhook = await client.createWebhookSubscription({
  url: 'https://your-server.com/webhooks',
  events: ['invitee.created', 'invitee.canceled'],
  organization: user.resource.current_organization,
  scope: 'organization',
});
console.log(`Webhook created with signing key: ${webhook.resource.signing_key}`);
```

## Webhook Events

Available webhook events (Professional+ tier):

- `invitee.created` - New booking created
- `invitee.canceled` - Booking canceled
- `invitee_no_show.created` - No-show marked
- `invitee_no_show.deleted` - No-show unmarked
- `routing_form_submission.created` - Routing form submitted

## Feature Availability

The client automatically checks feature availability based on detected tier:

```typescript
// This will throw an error if webhooks not available in current tier
await client.listWebhookSubscriptions(orgUri);

// Manual feature check
const tier = await client.detectTier();
import { checkFeatureAvailability } from './.github/skills/ailey-com-calendly/scripts/config.js';
const webhooksAvailable = checkFeatureAvailability(tier, 'webhooks');
```

## Rate Limiting

API rate limits vary by tier:

- **Basic**: 60 requests/minute
- **Essentials**: 100 requests/minute
- **Professional**: 150 requests/minute
- **Teams**: 200 requests/minute
- **Enterprise**: 300 requests/minute

The client automatically handles rate limit errors and provides retry-after information.

## Error Handling

The client provides detailed error messages with tier-specific guidance:

```typescript
try {
  await client.createWebhookSubscription(data);
} catch (error) {
  // Error message includes tier upgrade suggestion if feature unavailable
  console.error(error.message);
}
```

## Environment Configuration

All environment variables (checked in order):

1. `~/.vscode/.env` (global configuration)
2. `./.env` (project configuration)
3. `./.env.local` (local overrides)

### Available Variables

```bash
# Personal Access Token Authentication
CALENDLY_ACCESS_TOKEN=your_token

# OAuth 2.0 Authentication
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret
CALENDLY_REDIRECT_URI=http://localhost:3000/callback

# API Endpoints (optional, defaults shown)
CALENDLY_API_URL=https://api.calendly.com
CALENDLY_AUTH_URL=https://auth.calendly.com

# Manual Tier Override (optional, auto-detected if not set)
CALENDLY_TIER=professional

# Webhook Signing Key (from webhook creation)
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key
```

## Troubleshooting

### Authentication Errors

**Problem**: `No authentication configured`

**Solution**: Set either `CALENDLY_ACCESS_TOKEN` or OAuth credentials (`CALENDLY_CLIENT_ID`, `CALENDLY_CLIENT_SECRET`)

### Rate Limit Errors

**Problem**: `Rate limit exceeded`

**Solution**: Implement exponential backoff or upgrade subscription tier for higher limits

### Feature Unavailable Errors

**Problem**: `Feature "webhooks" is not available in basic tier`

**Solution**: Upgrade subscription to Professional or higher tier

### Tier Detection Failures

**Problem**: Cannot auto-detect subscription tier

**Solution**: Manually set `CALENDLY_TIER` environment variable

## Related Skills

- **ailey-com-outlook**: Outlook calendar integration
- **ailey-com-salesforce**: CRM integration for booking data
- **ailey-tools-web-crawl**: Scrape scheduling pages for analysis
- **ailey-admin-manage-plan**: Project planning with scheduled events

## API Reference

Full API documentation: [Calendly API v2](https://developer.calendly.com/api-docs)

## Support

- Calendly API Documentation: https://developer.calendly.com
- Calendly Developer Forum: https://developer.calendly.com/community
- OAuth 2.0 Guide: https://developer.calendly.com/oauth

---
version: 1.0.0
updated: 2026-01-30
reviewed: 2026-01-30
score: 4.7
---
