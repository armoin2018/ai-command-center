# Meetup CLI - Quick Reference

Quick command reference for the Meetup Integration skill.

## Installation & Setup

```bash
# Install dependencies
npm install

# Interactive setup
npm run setup

# Detect account tier
npm run detect

# Run diagnostics
npm run diagnose
```

## Authentication

```bash
# Start OAuth flow (opens browser)
npm run auth start

# Verify authentication
npm run auth verify

# Refresh access token
npm run auth refresh

# Show token status
npm run auth status
```

## Event Management

### Create Event

```bash
npm run event create \
  --group "group-urlname" \
  --title "Event Title" \
  --description "Event description" \
  --start "2026-02-15T18:00:00" \
  --duration 120 \
  --capacity 50 \
  --venue-id "123456"  # optional
  --draft  # optional: save as draft
```

### List Events

```bash
# List all upcoming events for a group
npm run event list --group "group-urlname"
```

### Get Event Details

```bash
npm run event get --event-id "event-id"
```

### Update Event

```bash
npm run event update \
  --event-id "event-id" \
  --title "New Title" \
  --description "New description" \
  --start "2026-02-20T19:00:00" \
  --duration 90 \
  --capacity 75
```

### Cancel Event

```bash
npm run event cancel --event-id "event-id"
```

### Get Event RSVPs

```bash
npm run event rsvps --event-id "event-id"
```

## Group Management

### List Your Groups

```bash
npm run group list
```

### Get Group Details

```bash
npm run group get --group "group-urlname"
```

### Get Group Analytics

```bash
npm run group analytics \
  --group "group-urlname" \
  --period "last-30-days"

# Period options:
# - last-7-days
# - last-30-days (default)
# - last-90-days
# - last-year
```

## Custom GraphQL Queries

### Execute Custom Query

```bash
npm run query \
  --query 'query { self { name email } }' \
  --variables '{"key": "value"}'  # optional
```

### Example: Get Group Members

```bash
npm run query \
  --query 'query($urlname: String!) {
    groupByUrlname(urlname: $urlname) {
      members {
        count
      }
    }
  }' \
  --variables '{"urlname": "my-group"}'
```

## Account Tiers Comparison

| Feature | Standard | Meetup Pro |
|---------|----------|------------|
| API Access | ❌ | ✅ |
| Event Creation (Web) | ✅ | ✅ |
| Event Creation (API) | ❌ | ✅ |
| Group Management | ✅ | ✅ |
| Network Management | ❌ | ✅ |
| Advanced Analytics | ❌ | ✅ |
| Attendee Emails | ❌ | ✅ |
| Custom Forms | ❌ | ✅ |
| Branded Pages | ❌ | ✅ |

## Common Workflows

### Create and Promote Event

```bash
# 1. Create event
npm run event create \
  --group "tech-talks" \
  --title "AI Workshop" \
  --description "Hands-on AI development" \
  --start "2026-03-01T14:00:00" \
  --duration 180 \
  --capacity 30

# 2. Monitor RSVPs
npm run event rsvps --event-id "event-id"
```

### Weekly Event Series

```typescript
// Use programmatic API for recurring events
import { MeetupClient } from './src/index';

const client = new MeetupClient({ /* config */ });

// Create 12 weekly events
for (let i = 0; i < 12; i++) {
  const date = new Date('2026-03-05T18:00:00');
  date.setDate(date.getDate() + (i * 7));
  
  await client.createEvent({
    groupUrlname: 'tech-talks',
    title: `Week ${i + 1}: Tech Discussion`,
    description: 'Weekly tech meetup',
    startTime: date,
    duration: 90,
    capacity: 40,
  });
}
```

### Group Analytics Dashboard

```bash
# Get comprehensive analytics
npm run group analytics \
  --group "my-group" \
  --period "last-90-days"
```

## Environment Variables

Required variables in `.env`:

```bash
# OAuth Credentials (required)
MEETUP_CLIENT_ID=your_client_id
MEETUP_CLIENT_SECRET=your_client_secret
MEETUP_REDIRECT_URI=http://localhost:3000/callback

# OAuth Tokens (set by auth flow)
MEETUP_ACCESS_TOKEN=access_token
MEETUP_REFRESH_TOKEN=refresh_token
MEETUP_TOKEN_EXPIRY=2026-12-31T23:59:59Z

# Optional Settings
MEETUP_DEFAULT_TIMEZONE=America/New_York
MEETUP_AUTO_PUBLISH=false
MEETUP_NOTIFY_ON_RSVP=true
```

## AI-ley Configuration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  meetup:
    enabled: true
    account_tier: pro
    oauth:
      client_id: ${MEETUP_CLIENT_ID}
      client_secret: ${MEETUP_CLIENT_SECRET}
      redirect_uri: ${MEETUP_REDIRECT_URI}
      access_token: ${MEETUP_ACCESS_TOKEN}
      refresh_token: ${MEETUP_REFRESH_TOKEN}
    settings:
      default_timezone: America/New_York
      auto_publish: false
      notify_on_rsvp: true
      max_event_capacity: 100
```

## Error Messages

### No API Access

```
❌ Error: No API access detected

Your Meetup account does not have API access enabled.
To use this skill, you need a Meetup Pro subscription.

Visit: https://www.meetup.com/pro/
```

**Solution:** Upgrade to Meetup Pro

### Authentication Required

```
❌ Error: Authentication required

No access token found. Please authenticate first.
```

**Solution:** Run `npm run auth start`

### Rate Limit Exceeded

```
❌ Error: Rate limit exceeded

You've exceeded Meetup's API rate limits.
Rate limit: 30 requests per minute
Reset time: 45 seconds
```

**Solution:** Wait for rate limit to reset (automatic retry implemented)

### Invalid Group

```
❌ Error: Group not found

The group 'invalid-group' does not exist or you don't have access.
```

**Solution:** Verify group URL name and permissions

## Resources

- **API Documentation:** [https://www.meetup.com/api/](https://www.meetup.com/api/)
- **GraphQL Playground:** [https://www.meetup.com/api/playground/](https://www.meetup.com/api/playground/)
- **OAuth Clients:** [https://www.meetup.com/api/oauth/list/](https://www.meetup.com/api/oauth/list/)
- **Meetup Pro:** [https://www.meetup.com/pro/](https://www.meetup.com/pro/)
- **Help Center:** [https://help.meetup.com/](https://help.meetup.com/)

## Tips & Tricks

### Check Token Expiry

```bash
npm run auth status
```

### Test Authentication

```bash
npm run auth verify
```

### Get All Groups with Events

```bash
# List all groups
npm run group list

# For each group, list events
npm run event list --group "group-1"
npm run event list --group "group-2"
```

### Custom Analytics Query

```bash
npm run query --query '
  query($urlname: String!) {
    groupByUrlname(urlname: $urlname) {
      name
      members { count }
      upcomingEvents {
        count
        edges {
          node {
            title
            going
          }
        }
      }
    }
  }
' --variables '{"urlname": "my-group"}'
```

## Version

**Version:** 1.0.0  
**Last Updated:** 2026-02-01

---

For complete documentation, see [SKILL.md](./SKILL.md)
