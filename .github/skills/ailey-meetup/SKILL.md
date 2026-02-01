# Meetup Integration Manager

Comprehensive Meetup integration with account tier detection (Standard vs Pro), OAuth authentication, GraphQL API access, event management, group administration, RSVP tracking, and member engagement. Automatically detects account capabilities and provides setup instructions.

## Overview

The Meetup Integration Manager provides comprehensive access to Meetup's GraphQL API for managing groups, events, members, and RSVPs. The skill automatically detects your account tier and adapts functionality based on available API access.

**Key Features:**
- Account tier detection (Standard vs Meetup Pro)
- OAuth 2.0 authentication flow
- GraphQL query/mutation support
- Event creation and management
- Group administration
- RSVP tracking and analytics
- Member engagement tools
- Real-time notifications
- Automated setup instructions when access is missing

## Account Tiers

Meetup offers different account tiers with varying API access levels:

### Standard Account
**API Access:** ❌ No API access
**Features:**
- Web-based event creation
- Basic group management
- Manual RSVP tracking
- Limited analytics

**Limitations:**
- No API access
- No programmatic automation
- No custom integrations
- No bulk operations

### Meetup Pro Account
**API Access:** ✅ Full GraphQL API access
**Features:**
- Complete API access
- Network management (multiple groups)
- Advanced analytics
- Access to attendee emails
- Custom attendance forms
- SEO-friendly branded pages
- Programmatic event creation
- Automated RSVP management
- Custom integrations

**Pricing:** Varies by network size and features (contact Meetup sales)

## Prerequisites

### Required for All Features
- Meetup account
- Meetup Pro subscription (for API access)
- OAuth client credentials
- Node.js 18+ and npm

### Environment Setup
Create a `.env` file in the skill directory:

```bash
# Meetup OAuth Configuration
MEETUP_CLIENT_ID=your_oauth_client_id
MEETUP_CLIENT_SECRET=your_oauth_client_secret
MEETUP_REDIRECT_URI=http://localhost:3000/callback

# Meetup Account
MEETUP_ACCESS_TOKEN=your_access_token_after_auth
MEETUP_REFRESH_TOKEN=your_refresh_token
MEETUP_TOKEN_EXPIRY=token_expiration_timestamp
```

## Setup Instructions

### Step 1: Check Your Account Tier

Run the detection command to check your current account capabilities:

```bash
npm run detect
```

This will show:
- Current account tier (Standard vs Pro)
- API access availability
- Required upgrades (if any)
- Setup instructions

### Step 2: Upgrade to Meetup Pro (if needed)

If you have a Standard account, you'll need to upgrade to Meetup Pro for API access:

1. Visit [Meetup Pro](https://www.meetup.com/pro/)
2. Click "Sign up" or "Learn more"
3. Choose your network size and features
4. Complete the subscription process
5. Contact Meetup support if you need custom pricing

**Note:** Meetup Pro is designed for organizations managing multiple groups or requiring advanced features. Individual event organizers may not need API access.

### Step 3: Create OAuth Client

Once you have Meetup Pro:

1. **Log in to Meetup**
   - Visit [https://www.meetup.com/](https://www.meetup.com/)
   - Log in with your Pro account credentials

2. **Create OAuth Client**
   - Navigate to [OAuth Clients](https://www.meetup.com/api/oauth/list/)
   - Click "Create New OAuth Consumer"
   
3. **Configure OAuth App**
   ```
   Application Name: AI-ley Meetup Integration
   Website: http://localhost:3000 (or your domain)
   Redirect URI: http://localhost:3000/callback
   Description: AI-ley Meetup skill integration
   ```

4. **Copy Credentials**
   - Save your **Client ID**
   - Save your **Client Secret**
   - Add to `.env` file

### Step 4: Authenticate

Run the authentication flow:

```bash
npm run auth start
```

This will:
1. Open your browser to Meetup's OAuth page
2. Prompt you to authorize the application
3. Redirect to callback URL with authorization code
4. Exchange code for access token
5. Save tokens to `.env` file
6. Verify API access

## AI-ley Configuration

Add Meetup credentials to your AI-ley configuration:

### Option 1: YAML Configuration

Edit `.github/aicc/aicc.yaml`:

```yaml
integrations:
  meetup:
    enabled: true
    account_tier: pro  # or 'standard'
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

### Option 2: Environment Variables Only

If you prefer not to use YAML configuration, the skill will automatically read from `.env`:

```bash
# .env file
MEETUP_CLIENT_ID=abc123
MEETUP_CLIENT_SECRET=secret456
MEETUP_REDIRECT_URI=http://localhost:3000/callback
MEETUP_ACCESS_TOKEN=your_token
MEETUP_REFRESH_TOKEN=your_refresh
```

## Installation

```bash
cd .github/skills/ailey-meetup
npm install
npm run setup  # Interactive setup wizard
```

## Usage

### Account Detection

Check your account tier and API access:

```bash
# Detect account capabilities
npm run detect

# Output example:
# ✅ Meetup Pro Account Detected
# 
# Account Tier: Pro
# API Access: ✅ Enabled
# Network Groups: 5
# 
# Available Features:
# ✅ GraphQL API access
# ✅ Event creation/management
# ✅ Group administration
# ✅ RSVP tracking
# ✅ Member engagement
# ✅ Advanced analytics
# ✅ Attendee email access
```

### Authentication

```bash
# Start OAuth flow
npm run auth start

# Verify authentication
npm run auth verify

# Refresh access token
npm run auth refresh

# Show current token info
npm run auth status
```

### Event Management

```bash
# Create event
npm run event create \
  --group "my-group-urlname" \
  --title "Tech Meetup" \
  --description "Monthly tech discussion" \
  --start "2026-02-15T18:00:00" \
  --duration 120 \
  --venue-id "123456" \
  --capacity 50

# List upcoming events
npm run event list --group "my-group-urlname"

# Get event details
npm run event get --event-id "abc123"

# Update event
npm run event update \
  --event-id "abc123" \
  --title "Updated Title" \
  --capacity 75

# Cancel event
npm run event cancel --event-id "abc123"

# Get event RSVPs
npm run event rsvps --event-id "abc123"

# Export event attendees
npm run event export \
  --event-id "abc123" \
  --format csv \
  --output attendees.csv
```

### Group Management

```bash
# List your groups
npm run group list

# Get group details
npm run group get --group "my-group-urlname"

# Update group settings
npm run group update \
  --group "my-group-urlname" \
  --description "New description" \
  --topics "tech,coding,ai"

# Get group members
npm run group members --group "my-group-urlname"

# Get group analytics
npm run group analytics \
  --group "my-group-urlname" \
  --period "last-30-days"
```

### RSVP Management

```bash
# Get RSVPs for event
npm run rsvp list --event-id "abc123"

# RSVP to event (as authenticated user)
npm run rsvp create \
  --event-id "abc123" \
  --response "yes" \
  --guests 2

# Update RSVP
npm run rsvp update \
  --event-id "abc123" \
  --response "no"

# Send RSVP reminders
npm run rsvp remind --event-id "abc123"
```

### Member Engagement

```bash
# Send announcement to group
npm run announce send \
  --group "my-group-urlname" \
  --subject "Important Update" \
  --message "Event time changed"

# Get member activity
npm run member activity \
  --member-id "123456" \
  --group "my-group-urlname"

# Export member list
npm run member export \
  --group "my-group-urlname" \
  --format csv \
  --output members.csv
```

### Analytics & Reports

```bash
# Get event analytics
npm run analytics event \
  --event-id "abc123" \
  --metrics rsvps,attendance,demographics

# Get group analytics
npm run analytics group \
  --group "my-group-urlname" \
  --period "last-90-days" \
  --metrics growth,engagement,events

# Generate attendance report
npm run report attendance \
  --group "my-group-urlname" \
  --start "2026-01-01" \
  --end "2026-01-31" \
  --format pdf \
  --output report.pdf

# Generate member demographics
npm run report demographics \
  --group "my-group-urlname" \
  --output demographics.json
```

### Programmatic Usage (TypeScript/JavaScript)

```typescript
import { MeetupClient } from './src/index';

const client = new MeetupClient({
  clientId: process.env.MEETUP_CLIENT_ID!,
  clientSecret: process.env.MEETUP_CLIENT_SECRET!,
  redirectUri: process.env.MEETUP_REDIRECT_URI!,
  accessToken: process.env.MEETUP_ACCESS_TOKEN,
  refreshToken: process.env.MEETUP_REFRESH_TOKEN,
});

// Detect account tier
const accountInfo = await client.detectAccountTier();
console.log(`Account Tier: ${accountInfo.tier}`);
console.log(`API Access: ${accountInfo.hasApiAccess ? '✅' : '❌'}`);

if (!accountInfo.hasApiAccess) {
  console.log('\n📋 Setup Instructions:');
  console.log(client.getSetupInstructions());
  process.exit(1);
}

// Create event
const event = await client.createEvent({
  groupUrlname: 'my-group',
  title: 'Tech Meetup',
  description: 'Monthly tech discussion',
  startTime: new Date('2026-02-15T18:00:00'),
  duration: 120, // minutes
  venueId: '123456',
  capacity: 50,
});

console.log(`Event created: ${event.id}`);
console.log(`Event URL: ${event.link}`);

// Get event RSVPs
const rsvps = await client.getEventRsvps(event.id);
console.log(`RSVPs: ${rsvps.yes} yes, ${rsvps.no} no, ${rsvps.waitlist} waitlist`);

// Get group analytics
const analytics = await client.getGroupAnalytics('my-group', {
  period: 'last-30-days',
  metrics: ['growth', 'engagement', 'events'],
});

console.log(`Member growth: ${analytics.memberGrowth}`);
console.log(`Event attendance: ${analytics.eventAttendance}`);
console.log(`Engagement rate: ${analytics.engagementRate}%`);
```

## GraphQL Queries

The skill provides easy access to Meetup's GraphQL API:

### Custom Queries

```typescript
// Execute custom GraphQL query
const result = await client.query(`
  query {
    groupByUrlname(urlname: "my-group") {
      name
      members {
        count
      }
      upcomingEvents {
        count
        edges {
          node {
            title
            dateTime
            rsvps {
              totalCount
            }
          }
        }
      }
    }
  }
`);

console.log(result);
```

### Custom Mutations

```typescript
// Execute custom GraphQL mutation
const result = await client.mutate(`
  mutation($input: CreateEventInput!) {
    createEvent(input: $input) {
      event {
        id
        title
        link
      }
    }
  }
`, {
  input: {
    groupId: 'group-id',
    title: 'New Event',
    description: 'Event description',
    startDateTime: '2026-02-15T18:00:00',
  },
});

console.log(result);
```

## Workflows

### Workflow 1: Create and Promote Event

**Use Case:** Create a new event and send announcements to group members

**Steps:**
1. Detect account tier to ensure API access
2. Create event with details
3. Add event to group calendar
4. Send announcement to members
5. Monitor RSVPs

**Example:**
```bash
# 1. Verify account
npm run detect

# 2. Create event
npm run event create \
  --group "tech-enthusiasts" \
  --title "AI Workshop" \
  --description "Hands-on AI development workshop" \
  --start "2026-03-01T14:00:00" \
  --duration 180 \
  --capacity 30

# 3. Send announcement
npm run announce send \
  --group "tech-enthusiasts" \
  --subject "New Event: AI Workshop" \
  --message "Join us for a hands-on AI workshop!"

# 4. Monitor RSVPs
npm run event rsvps --event-id "abc123"
```

### Workflow 2: Manage Multiple Groups

**Use Case:** Manage events across multiple groups in a Meetup Pro network

**Steps:**
1. List all groups in network
2. Create recurring events for each group
3. Track attendance across groups
4. Generate network-wide analytics

**Example:**
```bash
# 1. List all groups
npm run group list --network

# 2. Create event in each group
for group in $(npm run group list --network --format ids); do
  npm run event create \
    --group "$group" \
    --title "Monthly Meetup" \
    --start "2026-03-01T18:00:00" \
    --duration 120
done

# 3. Generate network analytics
npm run analytics network \
  --period "last-90-days" \
  --output network-report.pdf
```

### Workflow 3: RSVP Tracking and Follow-up

**Use Case:** Track RSVPs and send reminders to attendees

**Steps:**
1. Get event RSVP list
2. Filter by response type
3. Send targeted reminders
4. Export attendee list

**Example:**
```bash
# 1. Get RSVPs
npm run rsvp list --event-id "abc123" --response yes

# 2. Send reminder to confirmed attendees
npm run rsvp remind \
  --event-id "abc123" \
  --response yes \
  --message "Reminder: Event tomorrow at 6 PM!"

# 3. Export attendee list
npm run event export \
  --event-id "abc123" \
  --format csv \
  --output attendees.csv
```

### Workflow 4: Member Engagement Analysis

**Use Case:** Analyze member engagement and identify active participants

**Steps:**
1. Get group member list
2. Analyze activity patterns
3. Identify top contributors
4. Generate engagement report

**Example:**
```bash
# 1. Get member activity
npm run member activity \
  --group "tech-enthusiasts" \
  --period "last-90-days"

# 2. Generate engagement report
npm run report engagement \
  --group "tech-enthusiasts" \
  --metrics "attendance,rsvps,comments" \
  --output engagement-report.pdf
```

### Workflow 5: Automated Event Series

**Use Case:** Create and manage recurring event series

**Steps:**
1. Define event template
2. Generate recurring events
3. Auto-publish to calendar
4. Track series attendance

**Example:**
```typescript
import { MeetupClient } from './src/index';

const client = new MeetupClient({ /* credentials */ });

// Event template
const template = {
  groupUrlname: 'tech-talks',
  title: 'Weekly Tech Talk',
  description: 'Weekly discussion on latest tech trends',
  duration: 90,
  capacity: 40,
  venueId: '123456',
};

// Create series (every Wednesday at 6 PM for 12 weeks)
const events = [];
const startDate = new Date('2026-03-05T18:00:00');

for (let i = 0; i < 12; i++) {
  const eventDate = new Date(startDate);
  eventDate.setDate(startDate.getDate() + (i * 7));
  
  const event = await client.createEvent({
    ...template,
    startTime: eventDate,
  });
  
  events.push(event);
  console.log(`Created event ${i + 1}/12: ${event.link}`);
}

console.log(`\nCreated ${events.length} events in series`);
```

### Workflow 6: Event Analytics Dashboard

**Use Case:** Build real-time dashboard with event and group metrics

**Steps:**
1. Fetch event analytics
2. Fetch group analytics
3. Calculate KPIs
4. Export to dashboard format

**Example:**
```typescript
import { MeetupClient } from './src/index';

const client = new MeetupClient({ /* credentials */ });

async function generateDashboard(groupUrlname: string) {
  // Get group info
  const group = await client.getGroup(groupUrlname);
  
  // Get upcoming events
  const events = await client.listEvents(groupUrlname, { status: 'upcoming' });
  
  // Get analytics
  const analytics = await client.getGroupAnalytics(groupUrlname, {
    period: 'last-30-days',
  });
  
  // Build dashboard data
  const dashboard = {
    group: {
      name: group.name,
      members: group.memberCount,
      upcomingEvents: events.length,
    },
    analytics: {
      memberGrowth: analytics.memberGrowth,
      eventAttendance: analytics.eventAttendance,
      engagementRate: analytics.engagementRate,
    },
    events: events.map(e => ({
      title: e.title,
      date: e.dateTime,
      rsvps: e.rsvpCount,
      capacity: e.capacity,
      fillRate: (e.rsvpCount / e.capacity) * 100,
    })),
  };
  
  return dashboard;
}

const data = await generateDashboard('tech-enthusiasts');
console.log(JSON.stringify(data, null, 2));
```

## Error Handling

The skill provides comprehensive error handling with actionable messages:

### Common Errors

**No API Access:**
```
❌ Error: No API access detected

Your Meetup account does not have API access enabled.

To use this skill, you need a Meetup Pro subscription.

Setup Instructions:
1. Visit https://www.meetup.com/pro/
2. Sign up for Meetup Pro
3. Create OAuth client at https://www.meetup.com/api/oauth/list/
4. Run: npm run auth start

For more info: https://www.meetup.com/api/
```

**Authentication Required:**
```
❌ Error: Authentication required

No access token found. Please authenticate first.

Run: npm run auth start
```

**Rate Limit Exceeded:**
```
❌ Error: Rate limit exceeded

You've exceeded Meetup's API rate limits.

Rate limit: 30 requests per minute
Reset time: 45 seconds

Retry after: 45s
```

**Invalid Group:**
```
❌ Error: Group not found

The group 'invalid-group' does not exist or you don't have access.

Please check:
- Group URL name is correct
- You are a member/organizer of the group
- Group is part of your Pro network
```

## API Reference

### MeetupClient Class

```typescript
class MeetupClient {
  // Account Management
  detectAccountTier(): Promise<AccountInfo>
  getSetupInstructions(): string
  
  // Authentication
  startOAuthFlow(): Promise<{ authUrl: string }>
  handleCallback(code: string): Promise<TokenResponse>
  refreshAccessToken(): Promise<TokenResponse>
  verifyAuthentication(): Promise<boolean>
  
  // Event Management
  createEvent(options: CreateEventOptions): Promise<Event>
  updateEvent(eventId: string, updates: UpdateEventOptions): Promise<Event>
  getEvent(eventId: string): Promise<Event>
  listEvents(groupUrlname: string, filters?: EventFilters): Promise<Event[]>
  cancelEvent(eventId: string): Promise<boolean>
  getEventRsvps(eventId: string): Promise<RsvpSummary>
  exportEventAttendees(eventId: string, format: 'csv' | 'json'): Promise<string>
  
  // Group Management
  listGroups(): Promise<Group[]>
  getGroup(groupUrlname: string): Promise<Group>
  updateGroup(groupUrlname: string, updates: UpdateGroupOptions): Promise<Group>
  getGroupMembers(groupUrlname: string): Promise<Member[]>
  getGroupAnalytics(groupUrlname: string, options: AnalyticsOptions): Promise<Analytics>
  
  // RSVP Management
  listRsvps(eventId: string, filters?: RsvpFilters): Promise<Rsvp[]>
  createRsvp(eventId: string, options: CreateRsvpOptions): Promise<Rsvp>
  updateRsvp(eventId: string, response: 'yes' | 'no'): Promise<Rsvp>
  sendRsvpReminders(eventId: string, filters?: RsvpFilters): Promise<boolean>
  
  // Member Engagement
  sendAnnouncement(groupUrlname: string, options: AnnouncementOptions): Promise<boolean>
  getMemberActivity(memberId: string, groupUrlname: string): Promise<Activity>
  exportMembers(groupUrlname: string, format: 'csv' | 'json'): Promise<string>
  
  // GraphQL
  query(query: string, variables?: any): Promise<any>
  mutate(mutation: string, variables?: any): Promise<any>
}
```

### Type Definitions

```typescript
interface AccountInfo {
  tier: 'standard' | 'pro'
  hasApiAccess: boolean
  networkGroups: number
  features: string[]
  upgradeRequired: boolean
}

interface Event {
  id: string
  title: string
  description: string
  dateTime: string
  duration: number // minutes
  venueId?: string
  capacity?: number
  link: string
  rsvpCount: number
  waitlistCount: number
  groupUrlname: string
}

interface Group {
  id: string
  urlname: string
  name: string
  description: string
  memberCount: number
  organizerName: string
  topics: string[]
  link: string
}

interface Rsvp {
  eventId: string
  memberId: string
  memberName: string
  response: 'yes' | 'no' | 'waitlist'
  guests: number
  updated: string
}

interface Analytics {
  memberGrowth: number
  eventAttendance: number
  engagementRate: number
  averageRsvps: number
  topEvents: Event[]
}
```

## Troubleshooting

### Authentication Issues

**Problem:** OAuth flow fails or returns error

**Solution:**
1. Verify OAuth client credentials are correct
2. Check redirect URI matches exactly (including protocol and port)
3. Ensure Meetup Pro subscription is active
4. Clear browser cookies and try again
5. Check that client ID and secret are not expired

**Problem:** Access token expired

**Solution:**
```bash
npm run auth refresh
```

### API Access Issues

**Problem:** "No API access" error despite having Meetup Pro

**Solution:**
1. Confirm Meetup Pro subscription is active
2. Verify you're logged in with the Pro account
3. Check that OAuth client was created with Pro account
4. Contact Meetup support if issue persists

### Rate Limiting

**Problem:** Too many requests error

**Solution:**
- Meetup has rate limits (typically 30 requests/minute)
- The skill implements automatic retry with backoff
- For bulk operations, use batch endpoints when available
- Consider caching frequently accessed data

### Event Creation Issues

**Problem:** Event creation fails with validation error

**Solution:**
1. Verify all required fields are provided (title, startTime, groupUrlname)
2. Check that venue ID exists (if provided)
3. Ensure start time is in the future
4. Verify capacity is within group limits
5. Check that you have organizer permissions for the group

## Support & Resources

- **Meetup API Documentation:** [https://www.meetup.com/api/](https://www.meetup.com/api/)
- **GraphQL Playground:** [https://www.meetup.com/api/playground/](https://www.meetup.com/api/playground/)
- **Meetup Pro:** [https://www.meetup.com/pro/](https://www.meetup.com/pro/)
- **OAuth Clients:** [https://www.meetup.com/api/oauth/list/](https://www.meetup.com/api/oauth/list/)
- **Meetup Help Center:** [https://help.meetup.com/](https://help.meetup.com/)
- **API Terms of Service:** [https://help.meetup.com/hc/articles/360028705532](https://help.meetup.com/hc/articles/360028705532)

## Limitations

- **API Access:** Requires Meetup Pro subscription
- **Rate Limits:** 30 requests per minute (subject to change)
- **GraphQL Depth:** Nested queries have depth limits
- **Network Limits:** Pro features limited by subscription tier
- **Historical Data:** Analytics limited to subscription tier capabilities

## Version History

- **1.0.0** (2026-02-01): Initial release with full GraphQL API support

---

**Next Steps:**
1. Run `npm run detect` to check account tier
2. Upgrade to Meetup Pro if needed
3. Create OAuth client credentials
4. Run `npm run auth start` to authenticate
5. Start managing events and groups programmatically

For questions or issues, refer to the [Meetup API Documentation](https://www.meetup.com/api/) or contact Meetup support.

---
version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
---
