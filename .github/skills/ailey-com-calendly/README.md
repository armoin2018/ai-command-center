# Calendly Integration Manager

Comprehensive Calendly integration with automatic subscription tier detection, dual authentication methods, and complete scheduling automation.

## Features

- ✅ Personal Access Token authentication
- ✅ OAuth 2.0 authentication with refresh token support
- ✅ Automatic subscription tier detection (Basic → Enterprise)
- ✅ Event type management (create, update, delete, list)
- ✅ Scheduled event operations (list, view, cancel)
- ✅ Availability checking
- ✅ Webhook subscriptions (Professional+ tier)
- ✅ Routing forms (Professional+ tier)
- ✅ Analytics and activity logs (Essentials+ tier)
- ✅ Organization and team management (Teams+ tier)
- ✅ Rate limiting with retry-after support
- ✅ Feature availability checking based on tier

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Authentication

**Option A: Personal Access Token (Quick Setup)**

1. Go to https://calendly.com/integrations/api_webhooks
2. Generate a Personal Access Token
3. Create `.env` in workspace root:

```bash
CALENDLY_ACCESS_TOKEN=your_token_here
```

**Option B: OAuth 2.0 (For Public Apps)**

1. Create OAuth app at https://calendly.com/integrations/api_webhooks
2. Set redirect URI to `http://localhost:3000/callback`
3. Create `.env` in workspace root:

```bash
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret
CALENDLY_REDIRECT_URI=http://localhost:3000/callback
```

4. Run OAuth flow:

```bash
npm run calendly setup -- --oauth
# Follow browser authorization flow
npm run calendly oauth-callback -- --code YOUR_CODE
```

### 3. Detect Your Tier

```bash
npm run calendly detect-tier
```

### 4. Get Started

```bash
# View your profile
npm run calendly me

# List event types
npm run calendly event-types

# List scheduled events
npm run calendly scheduled-events

# List webhooks (Professional+ tier)
npm run calendly webhooks
```

## CLI Commands

### Setup & Authentication

```bash
# Interactive setup
npm run calendly setup

# Setup with Personal Access Token
npm run calendly setup -- --token

# Setup with OAuth
npm run calendly setup -- --oauth

# Exchange OAuth code for token
npm run calendly oauth-callback -- --code YOUR_CODE

# Detect subscription tier
npm run calendly detect-tier

# Get current user info
npm run calendly me
```

### Event Types

```bash
# List all event types
npm run calendly event-types

# List only active event types
npm run calendly event-types -- --active

# List for specific user
npm run calendly event-types -- --user https://api.calendly.com/users/USER_UUID
```

### Scheduled Events

```bash
# List all scheduled events
npm run calendly scheduled-events

# Filter by status
npm run calendly scheduled-events -- --status active
npm run calendly scheduled-events -- --status canceled

# Filter by date range
npm run calendly scheduled-events -- \
  --min 2026-02-01T00:00:00Z \
  --max 2026-02-28T23:59:59Z

# Cancel an event
npm run calendly cancel-event -- \
  --uuid EVENT_UUID \
  --reason "Meeting rescheduled"
```

### Webhooks (Professional+ Tier)

```bash
# List webhooks
npm run calendly webhooks

# Create webhook
npm run calendly create-webhook -- \
  --url https://your-server.com/webhook \
  --events invitee.created,invitee.canceled

# Delete webhook
npm run calendly delete-webhook -- --uuid WEBHOOK_UUID
```

## Subscription Tiers

| Tier | Webhooks | Teams | Routing | Workflows | Custom Fields | Analytics | SSO | Rate Limit |
|------|----------|-------|---------|-----------|---------------|-----------|-----|------------|
| Basic | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | 60/min |
| Essentials | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | 100/min |
| Professional | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | 150/min |
| Teams | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | 200/min |
| Enterprise | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | 300/min |

## Programmatic Usage

```typescript
import { getCalendlyConfig } from './scripts/config.js';
import CalendlyClient from './scripts/calendly-client.js';

// Initialize
const config = getCalendlyConfig();
const client = new CalendlyClient(config);

// Detect tier
const tier = await client.detectTier();
console.log(`Tier: ${tier}`);

// Get user
const user = await client.getCurrentUser();

// List event types
const eventTypes = await client.listEventTypes();

// List scheduled events
const events = await client.listScheduledEvents({
  status: 'active',
  min_start_time: new Date().toISOString(),
});

// Create webhook (Professional+ tier)
const webhook = await client.createWebhookSubscription({
  url: 'https://your-server.com/webhook',
  events: ['invitee.created', 'invitee.canceled'],
  organization: user.resource.current_organization,
  scope: 'organization',
});
```

## Webhook Events

Available events (Professional+ tier):

- `invitee.created` - New booking created
- `invitee.canceled` - Booking canceled
- `invitee_no_show.created` - No-show marked
- `invitee_no_show.deleted` - No-show unmarked
- `routing_form_submission.created` - Routing form submitted

## Environment Variables

```bash
# Personal Access Token (recommended for internal use)
CALENDLY_ACCESS_TOKEN=your_token

# OAuth 2.0 (recommended for public apps)
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret
CALENDLY_REDIRECT_URI=http://localhost:3000/callback

# Optional overrides
CALENDLY_API_URL=https://api.calendly.com
CALENDLY_AUTH_URL=https://auth.calendly.com
CALENDLY_TIER=professional
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key
```

## Error Handling

The client provides helpful error messages:

- **Authentication**: Suggests setting up Personal Access Token or OAuth
- **Tier Restrictions**: Indicates required upgrade for unavailable features
- **Rate Limits**: Provides retry-after duration
- **API Errors**: Includes status code and detailed message

## Documentation

- [SKILL.md](SKILL.md) - Complete feature documentation
- [SETUP.md](SETUP.md) - Detailed setup guide (coming soon)
- [Calendly API Docs](https://developer.calendly.com/api-docs)

## Support

- Issues: File an issue in the parent repository
- API Documentation: https://developer.calendly.com
- Community: https://developer.calendly.com/community

## License

See parent repository LICENSE file.
