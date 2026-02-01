# Zoom API Integration - Quick Reference

Complete command reference for the Zoom API CLI.

## Setup & Configuration

```bash
npm run setup           # Interactive setup wizard
npm run detect          # Detect account tier
npm run diagnose        # Run diagnostics
```

## Authentication

```bash
npm run auth -- verify  # Verify API key
npm run auth -- info    # Show account info
npm run auth -- test    # Test connection
```

## Meeting Management

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
npm run meeting -- get --meeting-id YOUR_MEETING_ID
```

## Recording Management

### List Recordings

```bash
npm run recording -- list
```

### Get Recording Details

```bash
npm run recording -- get --recording-id YOUR_RECORDING_ID
```

## User Management

### List Users

```bash
npm run user -- list
```

## Webinar Management

### Create Webinar

```bash
npm run webinar -- create \
  --topic "Product Launch" \
  --time "2026-02-01T14:00:00Z" \
  --duration 60
```

## Environment Variables

### Required

```bash
ZOOM_CLIENT_ID=your_client_id              # From App Dashboard
ZOOM_CLIENT_SECRET=your_client_secret      # From App Dashboard
```

### Optional

```bash
ZOOM_ACCOUNT_ID=your_account_id            # From Account Settings
ZOOM_USER_EMAIL=user@example.com           # Default user for testing
ZOOM_WEBHOOK_SECRET=your_webhook_secret    # For webhook verification
ZOOM_TIMEOUT=30000                         # Request timeout (ms)
ZOOM_RATE_LIMIT=10                         # Requests per second
ZOOM_SUBDOMAIN=zoom.us                     # Zoom API subdomain
ZOOM_AUTH_TYPE=jwt                         # jwt or oauth
```

## Common Workflows

### Schedule Meeting with Recording

```bash
# 1. Create meeting
npm run meeting -- create \
  --topic "Team Meeting" \
  --time "2026-02-01T10:00:00Z" \
  --duration 30

# 2. Copy Meeting ID from response

# 3. Meeting recordings are automatically stored
# 4. List recordings
npm run recording -- list

# 5. Get specific recording
npm run recording -- get --recording-id RECORDING_ID
```

### Host Webinar

```bash
# 1. Create webinar
npm run webinar -- create \
  --topic "Product Demo" \
  --time "2026-02-01T14:00:00Z" \
  --duration 60

# 2. Copy webinar ID and join URL

# 3. Share link with registrants

# 4. After webinar, check recording
npm run recording -- list
```

## Account Tiers

| Feature | Free | Pro | Business | Enterprise |
|---------|------|-----|----------|------------|
| Meetings | ✅ | ✅ | ✅ | ✅ |
| Duration | 40 min | Unlimited | Unlimited | Unlimited |
| Participants | 100 | 300 | 500 | Unlimited |
| Webinars | ❌ | ✅ | ✅ | ✅ |
| Recording | ✅ | ✅ | ✅ | ✅ |
| Transcription | ❌ | ✅ | ✅ | ✅ |
| API Access | Limited | ✅ | ✅ | ✅ |
| Webhooks | ❌ | ✅ | ✅ | ✅ |

## Troubleshooting

### Invalid Credentials

```bash
# Regenerate JWT token:
# 1. Visit: https://marketplace.zoom.us/develop/create
# 2. Go to your app
# 3. Click "View JWT Token" or generate new
# 4. Update .env with new credentials
```

### Meeting Not Creating

```bash
# 1. Verify time format (ISO 8601)
npm run meeting -- create \
  --topic "Test" \
  --time "2026-02-01T10:00:00Z" \
  --duration 30

# 2. Check account tier supports required features
npm run detect

# 3. Verify API access is enabled
npm run auth -- verify
```

### Recording Not Found

```bash
# 1. List all recordings
npm run recording -- list

# 2. Check recording completed
# Recordings take time to process after meeting ends

# 3. Verify storage quota
npm run auth -- info
```

## Resources

- **Marketplace:** [marketplace.zoom.us](https://marketplace.zoom.us/)
- **API Docs:** [developers.zoom.us/docs/api](https://developers.zoom.us/docs/api)
- **Getting Started:** [Authentication Guide](https://developers.zoom.us/docs/api/rest/authentication/)
- **JWT Guide:** [JWT Authentication](https://developers.zoom.us/docs/api/rest/authentication/#jwt)
- **OAuth Guide:** [OAuth Authentication](https://developers.zoom.us/docs/api/rest/authentication/#oauth)
- **API Reference:** [REST API Reference](https://developers.zoom.us/docs/api/rest/reference/)
- **Help Center:** [Zoom Support](https://support.zoom.us/)

## Scopes Required

When setting up your Zoom app, enable these scopes:
- `meeting:create` - Create meetings
- `meeting:read` - Read meeting details
- `meeting:update` - Modify meetings
- `meeting:delete` - Delete meetings
- `user:read` - Read user info
- `user:read:admin` - Read all users (admin)
- `recording:read` - Access recordings
- `webinar:read` - Read webinar info
- `webinar:create` - Create webinars
