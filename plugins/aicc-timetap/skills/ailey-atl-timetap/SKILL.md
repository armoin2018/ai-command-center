---
id: ailey-atl-timetap
name: TimeTap Scheduling Integration
description: Comprehensive TimeTap appointment scheduling integration with account tier detection, API Key/session token authentication, appointment management, client management, staff management, services, locations, availability, webhooks, and reporting. Use when managing TimeTap appointments, automating scheduling workflows, managing clients or staff, checking availability, or integrating TimeTap into applications.
keywords: [timetap, scheduling, appointments, booking, clients, staff, services, locations, availability, webhooks, calendar, classes]
tools: [timetap-client, appointments, clients, staff, services, locations, availability, webhooks, reports]
---

# TimeTap Scheduling Integration

Comprehensive TimeTap integration with automatic account tier detection, API Key + session token authentication, appointment CRUD, client management, staff management, services, locations, availability checking, class schedules, webhooks, and reporting.

## Overview

- **Authentication**: API Key + MD5 signature → session token (4-hour TTL, auto-refresh)
- **Tier Detection**: Automatic account level detection (Free Trial, Professional, Business, Enterprise)
- **Appointments**: Create, update, cancel, complete, no-show, waitlist, recurring, round robin
- **Clients**: CRUD, search, merge, dupe-check, tags, custom fields
- **Staff**: CRUD, working hours, service assignments, availability
- **Services**: CRUD, classes, courses, add-ons, quotas, pricing
- **Locations**: CRUD, location groups, super groups
- **Availability**: Date-based availability slots, resource availability checks
- **Webhooks**: Appointment event notifications to external endpoints
- **Reports**: Appointment counts, status breakdowns, paginated reporting
- **Enterprise**: Multi-business child management, cross-account staff blocking

## When to Use

- Managing appointments, bookings, or class schedules via TimeTap
- Automating client intake workflows
- Checking staff/location/resource availability
- Building custom scheduling interfaces
- Setting up webhook notifications for appointment events
- Managing multi-location and multi-staff businesses
- Syncing TimeTap data with CRM or other systems
- Generating appointment reports and analytics

## Installation

```bash
cd .github/skills/ailey-atl-timetap
npm install
npm run build
```

## Authentication

### API Key + Session Token

TimeTap uses a two-step authentication process:

1. **API Key Setup**: Go to TimeTap Back Office → Settings → Integrations → API Key
   - Ensure the `allowAPIKeys` flag is enabled on your account
   - Generate an API Key (public key for requests)
   - Store the Private Key (used only for signature generation, never sent in requests)

2. **Session Token Generation**:
   - Compute MD5 hash of `apiKey + privateKey` → signature
   - GET `/sessionToken?apiKey={apiKey}&timestamp={epochSeconds}&signature={signature}`
   - Returns session token (e.g., `st:api:api:0164ebb6d9c74d87b4b6edd9544166ec`)

3. **Authenticate Requests**: Set `Authorization: Bearer {sessionToken}` header

Add credentials to workspace root `.env` (or `~/.vscode/.env` for global config):

```bash
TIMETAP_API_KEY=your_api_key
TIMETAP_PRIVATE_KEY=your_private_key
```

**Note**: Session tokens expire after 4 hours of inactivity. The client auto-refreshes on 401 errors.

## Account Tier Detection

The skill automatically detects your TimeTap account tier:

```bash
npm run timetap detect-tier
```

### Tier Capabilities Matrix

| Feature | Free Trial | Professional | Business | Enterprise |
|---------|-----------|--------------|----------|------------|
| Appointments | ✓ | ✓ | ✓ | ✓ |
| Clients | ✓ | ✓ | ✓ | ✓ |
| Staff | ✓ (1) | ✓ (5) | ✓ (Unlimited) | ✓ (Unlimited) |
| Locations | ✓ (1) | ✓ (3) | ✓ (Unlimited) | ✓ (Unlimited) |
| Services | ✓ | ✓ | ✓ | ✓ |
| Classes | ✗ | ✓ | ✓ | ✓ |
| Recurring Appts | ✗ | ✓ | ✓ | ✓ |
| Waitlist | ✗ | ✗ | ✓ | ✓ |
| Custom Fields | ✗ | ✓ | ✓ | ✓ |
| Webhooks | ✗ | ✗ | ✓ | ✓ |
| Reports API | ✗ | ✓ | ✓ | ✓ |
| Enterprise Children | ✗ | ✗ | ✗ | ✓ |
| Round Robin | ✗ | ✗ | ✓ | ✓ |
| Payment Integration | ✗ | ✓ | ✓ | ✓ |
| Disclaimer Forms | ✗ | ✗ | ✓ | ✓ |
| API Rate Limit | 30/min | 60/min | 120/min | 300/min |

## API Base URL

| Environment | URI Prefix |
|-------------|-----------|
| Production | `https://api.timetap.com/live` |

## Quick Start

### Get Session Token

```bash
npm run timetap auth
```

### List Appointments

```bash
# All appointments (paginated)
npm run timetap appointments -- --page 1 --size 25

# Filter by date range
npm run timetap appointments -- --start 2026-04-01 --end 2026-04-30

# Filter by status
npm run timetap appointments -- --status OPEN,CONFIRMED
```

### Create Appointment

```bash
npm run timetap create-appointment -- \
  --locationId 12345 \
  --staffId 67890 \
  --reasonId 11111 \
  --clientId 22222 \
  --date 2026-04-15 \
  --startTime 1400 \
  --endTime 1500
```

### Cancel Appointment

```bash
npm run timetap cancel-appointment -- --id 99999 --notifyStaff --notifyClient
```

### List Clients

```bash
npm run timetap clients -- --page 1 --size 25
```

### List Services

```bash
npm run timetap services
```

### Check Availability

```bash
npm run timetap availability -- --date 2026-04-15 --locationId 12345
```

### Webhook Management (Business+ Tier)

```bash
# Configure webhook URL in TimeTap Back Office:
# Settings → Integrations → Webhook → Activate → Enter endpoint URL
```

## Programmatic Usage

### TypeScript/JavaScript Integration

```typescript
import { getTimeTapConfig } from './.github/skills/ailey-atl-timetap/scripts/config.js';
import TimeTapClient from './.github/skills/ailey-atl-timetap/scripts/timetap-client.js';

const config = getTimeTapConfig();
const client = new TimeTapClient(config);

// Authenticate (auto-managed, but can be called explicitly)
await client.authenticate();

// Detect tier
const tier = await client.detectTier();
console.log(`Account tier: ${tier}`);

// List appointments
const appointments = await client.listAppointments({
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  statusList: 'OPEN,CONFIRMED',
  pageNumber: 1,
  pageSize: 25,
});
console.log(`Found ${appointments.count} appointments`);

// Create appointment
const newAppt = await client.createAppointment({
  businessId: config.apiKey,
  location: { locationId: 12345 },
  staff: { professionalId: 67890 },
  reason: { reasonId: 11111 },
  client: { clientId: 22222 },
  clientStartDate: '2026-04-15',
  clientEndDate: '2026-04-15',
  startDate: '2026-04-15',
  endDate: '2026-04-15',
  clientStartTime: 1400,
  clientEndTime: 1500,
  startTime: 1400,
  endTime: 1500,
  status: 'OPEN',
  clientReminderHours: 24,
  staffReminderHours: 24,
  remindClientSmsHrs: 0,
  remindStaffSmsHrs: 0,
  sendConfirmationToClient: true,
  sendConfirmationToStaff: true,
});

// List clients
const clients = await client.listClients({ pageNumber: 1, pageSize: 25 });

// Search clients
const found = await client.searchClients('john@example.com');

// Create client
const newClient = await client.createClient({
  firstName: 'John',
  lastName: 'Doe',
  emailAddress: 'john@example.com',
  status: 'Active',
});

// List services
const services = await client.listServices();

// Check availability
const slots = await client.getAvailability('2026', '04', '15', {
  locationId: 12345,
  reasonId: 11111,
});
```

## Appointment Statuses

| Status | Description |
|--------|------------|
| OPEN | Active, confirmed appointment |
| PENDING | Awaiting processing |
| PENDING_CONFIRMATION | Awaiting staff confirmation |
| PENDING_WAITLIST | On waitlist |
| CONFIRMED | Client confirmed attendance |
| CHECKEDIN | Client checked in |
| INPROGRESS | Appointment in progress |
| COMPLETED | Finished |
| NO_SHOW | Client didn't show |
| CANCELLED | Cancelled |

## Date/Time Formatting

- **Dates**: `YYYY-MM-DD` (e.g., `2026-04-15`)
- **Times**: Military format integer (e.g., `1430` = 2:30 PM, `800` = 8:00 AM, `0` = 12:00 AM)
- **Timestamps**: Milliseconds since January 1, 1970 UTC

## Webhook Events

Webhooks fire on any appointment change (create, update, delete). Configure endpoint URL in TimeTap Back Office → Settings → Integrations → Webhook.

The webhook POST payload is a full appointment JSON object including nested reason, client, staff, location, and custom fields objects.

## Environment Configuration

Variables checked in order:

1. `~/.vscode/.env` (global configuration)
2. `./.env` (project configuration)
3. `./.env.local` (local overrides)

### Available Variables

```bash
# Authentication (required)
TIMETAP_API_KEY=your_api_key
TIMETAP_PRIVATE_KEY=your_private_key

# API Endpoint (optional, default shown)
TIMETAP_API_URL=https://api.timetap.com/live

# Manual Tier Override (optional, auto-detected if not set)
TIMETAP_TIER=business
```

## Troubleshooting

### Authentication Errors

**Problem**: `401 Authentication error` or `No API key configured`

**Solution**:
1. Verify `TIMETAP_API_KEY` and `TIMETAP_PRIVATE_KEY` are set
2. Ensure `allowAPIKeys` is enabled: TimeTap Back Office → Settings → Integrations → API Key
3. Session tokens expire after 4 hours of inactivity — client auto-refreshes

### Feature Unavailable

**Problem**: `API integration is only available on Business or Enterprise accounts`

**Solution**: Upgrade to Business or Enterprise plan at [timetap.com](https://www.timetap.com)

### Rate Limit Errors

**Problem**: `429 Rate limit exceeded`

**Solution**: Reduce request frequency or upgrade tier for higher limits

### Pagination

**Problem**: Missing data in results

**Solution**: Use `pageNumber` and `pageSize` parameters (max `pageSize` is 50). Use `reportWithCount` endpoints for total count.

## Related Skills

- **ailey-com-calendly**: Alternative scheduling platform integration
- **ailey-com-outlook**: Outlook calendar sync
- **ailey-atl-jira**: Jira integration for project scheduling
- **ailey-com-salesforce**: CRM integration for client data

## API Reference

Full API documentation: [TimeTap API Guide](https://timetap.atlassian.net/wiki/spaces/TTAPI/overview)

---
version: 1.0.0
updated: 2026-04-02
reviewed: 2026-04-02
score: 4.5
---
