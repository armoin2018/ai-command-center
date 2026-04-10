---
id: ailey-atl-twilio
name: Twilio Communications Integration
description: Comprehensive Twilio integration for SMS, MMS, voice calls, phone number management, verification, and messaging with automatic account tier detection, webhook security, and multi-channel support. Use when sending SMS/MMS messages, making voice calls, verifying phone numbers, managing Twilio phone numbers, setting up webhooks, or analyzing usage.
keywords: [twilio, sms, mms, voice, calls, messaging, verification, phone, webhook, twiml]
tools: [twilio-client, messaging, voice, verify, phone-numbers, usage, webhooks]
---

# Twilio Communications Integration

Comprehensive Twilio integration with automatic account tier detection, dual authentication (API Key or Account SID/Auth Token), SMS/MMS messaging, voice calls, phone number management, Verify API, webhook handling, and usage analytics.

## Overview

- **Authentication**: API Key + Secret (recommended) or Account SID + Auth Token (testing)
- **Tier Detection**: Automatic plan detection (Free Trial, Pay-As-You-Go, Production)
- **Messaging**: SMS, MMS, WhatsApp, bulk messaging, messaging services
- **Voice**: Outbound/inbound calls, IVR, TwiML, call recordings, conferencing
- **Verify**: Phone verification via SMS, voice, email, TOTP, push
- **Phone Numbers**: Search, buy, configure, release numbers
- **Webhooks**: Inbound message/call handling, status callbacks, request validation
- **Usage**: Records, triggers, billing, analytics
- **Serverless**: Twilio Functions and Assets

## When to Use

- Sending SMS/MMS messages programmatically
- Making or receiving voice calls
- Implementing phone number verification (2FA/MFA)
- Managing Twilio phone number inventory
- Setting up IVR (Interactive Voice Response) flows
- Building webhook handlers for inbound messages/calls
- Monitoring usage and billing
- Building multi-channel communication workflows

## Installation

```bash
cd .github/skills/ailey-atl-twilio
npm install
npm run build
```

## Authentication

### API Key + Secret (Recommended for Production)

1. Log in to [Twilio Console](https://www.twilio.com/console)
2. Navigate to **Account → API Keys & Tokens**
3. Create a new API key (Standard or Restricted)
4. Add to workspace root `.env` (or `~/.vscode/.env` for global config):

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_key_secret
```

### Account SID + Auth Token (Local Testing Only)

1. Find credentials at [Twilio Console Dashboard](https://www.twilio.com/console)
2. Add to `.env`:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
```

**Security Note**: API Keys are strongly recommended for production. If compromised, individual keys can be revoked without affecting the entire account. Account SID + Auth Token gives full account access.

### API Key Types

| Type | Access Level | Revocable |
|------|-------------|-----------|
| Main | Full access (equivalent to Account SID + Auth Token) | No |
| Standard | All resources except Accounts and Keys management | Yes |
| Restricted | Fine-grained per-resource access control | Yes |

## Account Tier Detection

```bash
npm run twilio detect-tier
```

### Tier Capabilities Matrix

| Feature | Free Trial | Pay-As-You-Go | Production |
|---------|-----------|---------------|------------|
| SMS Sending | ✓ (verified numbers only) | ✓ | ✓ |
| MMS Sending | ✓ (verified numbers only) | ✓ | ✓ |
| Voice Calls | ✓ (verified numbers only) | ✓ | ✓ |
| Phone Number Purchase | ✗ | ✓ | ✓ |
| Verify API | ✓ (limited) | ✓ | ✓ |
| Messaging Services | ✗ | ✓ | ✓ |
| WhatsApp | ✗ | ✓ (sandbox) | ✓ |
| Call Recording | ✓ | ✓ | ✓ |
| Webhooks | ✓ | ✓ | ✓ |
| Usage API | ✓ | ✓ | ✓ |
| Serverless | ✗ | ✓ | ✓ |
| Flex Contact Center | ✗ | ✗ | ✓ |
| Custom Caller ID | ✗ | ✓ | ✓ |
| Toll-Free Numbers | ✗ | ✓ | ✓ |
| Short Codes | ✗ | ✗ | ✓ |
| SLA | None | None | Custom |
| Concurrent Calls | 1 | Account-based | Custom |

## API Base URL

```
https://api.twilio.com/2010-04-01
```

**Content Type**: `application/x-www-form-urlencoded` (POST requests)

## Quick Start

### Send SMS

```bash
npm run twilio sms -- --to +15558675310 --from +14155552344 --body "Hello from Twilio!"
```

### Make Voice Call

```bash
npm run twilio call -- --to +15558675310 --from +14155552344 --twiml "<Response><Say>Hello!</Say></Response>"
```

### List Phone Numbers

```bash
npm run twilio numbers
```

### Search Available Numbers

```bash
npm run twilio search-numbers -- --country US --areaCode 415
```

### Send Verification Code

```bash
npm run twilio verify -- --to +15558675310 --channel sms
```

### Check Usage

```bash
npm run twilio usage -- --category sms --start 2026-04-01 --end 2026-04-30
```

## Programmatic Usage

### TypeScript/JavaScript Integration

```typescript
import { getTwilioConfig } from './.github/skills/ailey-atl-twilio/scripts/config.js';
import TwilioClient from './.github/skills/ailey-atl-twilio/scripts/twilio-client.js';

const config = getTwilioConfig();
const client = new TwilioClient(config);

// Detect tier
const tier = await client.detectTier();
console.log(`Account tier: ${tier}`);

// Send SMS
const message = await client.sendMessage({
  to: '+15558675310',
  from: '+14155552344',
  body: 'Hello from Twilio!',
});
console.log(`Message SID: ${message.sid}`);

// Send MMS
const mms = await client.sendMessage({
  to: '+15558675310',
  from: '+14155552344',
  body: 'Check this out!',
  mediaUrl: ['https://example.com/image.jpg'],
});

// Make voice call
const call = await client.createCall({
  to: '+15558675310',
  from: '+14155552344',
  twiml: '<Response><Say>Hello from Twilio!</Say></Response>',
});
console.log(`Call SID: ${call.sid}`);

// List messages
const messages = await client.listMessages({ limit: 20 });

// Search for available phone numbers
const numbers = await client.searchAvailableNumbers('US', {
  areaCode: 415,
  smsEnabled: true,
  voiceEnabled: true,
});

// Buy a phone number
const purchased = await client.buyPhoneNumber('+14155551234');

// Request verification
const verification = await client.requestVerification('+15558675310', 'sms');

// Check verification code
const check = await client.checkVerification('+15558675310', '123456');

// Get usage records
const usage = await client.getUsageRecords({
  category: 'sms',
  startDate: '2026-04-01',
  endDate: '2026-04-30',
});
```

## TwiML Reference

TwiML (Twilio Markup Language) controls voice call behavior:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Welcome to our service.</Say>
  <Gather input="dtmf" numDigits="1" action="/handle-key">
    <Say>Press 1 for sales. Press 2 for support.</Say>
  </Gather>
  <Say>We didn't receive any input. Goodbye!</Say>
</Response>
```

### Common TwiML Verbs

| Verb | Description |
|------|------------|
| `<Say>` | Read text to caller |
| `<Play>` | Play audio file |
| `<Gather>` | Collect DTMF/speech input |
| `<Dial>` | Connect to another number |
| `<Record>` | Record the call |
| `<Redirect>` | Redirect to another TwiML URL |
| `<Pause>` | Wait silently |
| `<Enqueue>` | Add caller to queue |
| `<Hangup>` | End the call |
| `<Reject>` | Reject incoming call |

## Webhook Security

Validate incoming webhook requests to prevent spoofing:

```typescript
import { validateRequest } from './.github/skills/ailey-atl-twilio/scripts/twilio-client.js';

// In your webhook handler
const isValid = validateRequest(
  authToken,
  twilioSignature,  // X-Twilio-Signature header
  webhookUrl,       // Your webhook URL
  requestParams     // POST body parameters
);
```

## Message Statuses

| Status | Description |
|--------|------------|
| queued | Message queued for sending |
| sending | Twilio is sending the message |
| sent | Message successfully sent to carrier |
| delivered | Carrier confirmed delivery |
| undelivered | Carrier could not deliver |
| failed | Message failed to send |
| received | Inbound message received |

## Environment Configuration

Variables checked in order:

1. `~/.vscode/.env` (global configuration)
2. `./.env` (project configuration)
3. `./.env.local` (local overrides)

### Available Variables

```bash
# Authentication - API Key (recommended)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_key_secret

# Authentication - Auth Token (testing only)
# TWILIO_AUTH_TOKEN=your_auth_token

# Default sender number (optional)
TWILIO_FROM_NUMBER=+14155552344

# Messaging Service SID (optional, for messaging services)
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Verify Service SID (optional, for Verify API)
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Webhook URL (optional)
TWILIO_WEBHOOK_URL=https://your-server.com/webhooks/twilio

# Manual Tier Override (optional, auto-detected if not set)
TWILIO_TIER=pay-as-you-go
```

## Troubleshooting

### Authentication Errors

**Problem**: `401 Unauthorized` or `No authentication configured`

**Solution**:
1. Verify `TWILIO_ACCOUNT_SID` plus either API Key credentials or Auth Token are set
2. Check credentials at [Twilio Console](https://www.twilio.com/console)
3. For API Keys, ensure the key hasn't been revoked

### Trial Account Limitations

**Problem**: `Cannot send to unverified numbers`

**Solution**: On Free Trial, you can only send to [verified caller IDs](https://www.twilio.com/console/phone-numbers/verified). Upgrade to Pay-As-You-Go to send to any number.

### Rate Limiting

**Problem**: `429 Too Many Requests`

**Solution**: Implement exponential backoff. SMS rate limits:
- 1 message/second per long code number
- 10 messages/second per toll-free number
- 100 messages/second per short code

### Content Type Errors

**Problem**: Unexpected API behavior on POST requests

**Solution**: Twilio APIs expect `application/x-www-form-urlencoded`, not JSON. The client handles this automatically.

## Related Skills

- **ailey-com-vonage**: Alternative communications platform
- **ailey-com-whatsapp**: WhatsApp Business API
- **ailey-com-slack**: Slack messaging integration
- **ailey-com-email**: Email communication

## API Reference

- Twilio REST API: https://www.twilio.com/docs/usage/api
- Messaging API: https://www.twilio.com/docs/messaging
- Voice API: https://www.twilio.com/docs/voice
- Verify API: https://www.twilio.com/docs/verify/api
- SDKs: https://www.twilio.com/docs/libraries

---
version: 1.0.0
updated: 2026-04-02
reviewed: 2026-04-02
score: 4.5
---
