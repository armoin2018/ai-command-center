# Vonage Communications API Integration

**Skill ID:** ailey-com-vonage  
**Version:** 1.0.0  
**Last Updated:** 2026-02-01  
**Status:** Production Ready

---

## Overview

The Vonage Communications API integration provides comprehensive support for SMS, voice calls, number verification, and messaging through the Vonage platform. This skill includes automatic account tier detection, setup wizards, authentication management, and comprehensive API wrappers for all major Vonage services.

**Key Features:**
- 🎯 Automatic account tier detection (Pay-As-You-Go, Starter, Pro, Enterprise)
- 📱 SMS and MMS messaging with rich content support
- ☎️ Voice API for calls and IVR
- ✅ Number verification and carrier validation
- 💬 Conversation API for multi-channel messaging
- 📞 Number lookup and management
- 🔐 Webhook setup and security validation
- 📊 Usage analytics and reporting
- ⚡ Rate limiting and error handling

---

## Account Tier Detection

Vonage accounts have different service levels with varying capabilities and pricing:

### Tier 1: Pay-As-You-Go
- **Pricing Model:** Variable (per message/call)
- **Monthly Minimum:** None
- **API Access:** Basic SMS, Voice, Number Verification
- **Rate Limits:** Standard (10 requests/second)
- **Support:** Community/Email
- **Features:**
  - ✅ SMS sending (single messages)
  - ✅ Voice API (inbound/outbound calls)
  - ✅ Number verification
  - ✅ Webhook management
  - ❌ Conversation API
  - ❌ Dedicated support
  - ❌ SLA guarantees
  - ❌ Custom rate limits

### Tier 2: Starter
- **Pricing Model:** Fixed monthly + usage
- **Monthly Minimum:** $10-25
- **API Access:** All core APIs
- **Rate Limits:** Higher (20+ requests/second)
- **Support:** Priority email
- **Features:**
  - ✅ All Pay-As-You-Go features
  - ✅ Bulk messaging (500+ messages)
  - ✅ Conversation API (limited)
  - ✅ Better SMS rates
  - ✅ Priority support
  - ❌ Dedicated account manager
  - ❌ Conversation API (full)
  - ❌ Advanced analytics

### Tier 3: Pro
- **Pricing Model:** Fixed monthly + volume discounts
- **Monthly Minimum:** $100+
- **API Access:** All APIs with high volume
- **Rate Limits:** Elevated (50+ requests/second)
- **Support:** Dedicated support
- **Features:**
  - ✅ All Starter features
  - ✅ Full Conversation API
  - ✅ Bulk messaging (unlimited)
  - ✅ Advanced analytics
  - ✅ Dedicated account manager
  - ✅ Custom integrations
  - ✅ Webhook signing
  - ✅ Better rates for all services

### Tier 4: Enterprise
- **Pricing Model:** Custom
- **Monthly Minimum:** Negotiated
- **API Access:** All APIs with enterprise scale
- **Rate Limits:** Custom (100+ requests/second)
- **Support:** 24/7 dedicated
- **Features:**
  - ✅ All Pro features
  - ✅ Custom SLAs
  - ✅ Dedicated infrastructure
  - ✅ White-label options
  - ✅ Custom integrations
  - ✅ Technical account manager
  - ✅ 24/7 support
  - ✅ Custom rate limits

### Feature Comparison Matrix

| Feature | Pay-As-You-Go | Starter | Pro | Enterprise |
|---------|---|---|---|---|
| SMS Sending | ✅ | ✅ | ✅ | ✅ |
| Voice API | ✅ | ✅ | ✅ | ✅ |
| Number Verification | ✅ | ✅ | ✅ | ✅ |
| Number Lookup | ✅ | ✅ | ✅ | ✅ |
| Conversation API | ❌ | Limited | ✅ | ✅ |
| Bulk Messaging | ❌ | Limited | ✅ | ✅ |
| Webhook Signing | ❌ | ❌ | ✅ | ✅ |
| Analytics | Basic | Standard | Advanced | Custom |
| Rate Limit | 10 req/s | 20 req/s | 50 req/s | Custom |
| Support | Community | Email | Dedicated | 24/7 |
| Account Manager | ❌ | ❌ | ✅ | ✅ |
| SLA | None | None | 99.5% | Custom |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm 9+
- Vonage account (create at https://dashboard.vonage.com/)
- API Key and Secret from Vonage Dashboard

### Step 1: Create Vonage Account

1. Visit https://dashboard.vonage.com/
2. Click "Sign up" and create your account
3. Verify your email address
4. Add a payment method (required for production)
5. Create a project (optional but recommended)

### Step 2: Get Your API Credentials

1. Log in to https://dashboard.vonage.com/
2. Navigate to **Settings → API Settings**
3. You will see:
   - **API Key:** Your unique account identifier
   - **API Secret:** Your secret credential
4. Copy both values securely

### Step 3: Configure Environment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your credentials:
   ```bash
   VONAGE_API_KEY=your_api_key_here
   VONAGE_API_SECRET=your_api_secret_here
   VONAGE_SENDER_ID=YourBrand
   ```

3. For Voice API, create an application:
   - Go to **Applications** in dashboard
   - Create new application
   - Add Voice capabilities
   - Download private key as PEM
   - Add to `.env`:
     ```bash
     VONAGE_APPLICATION_ID=your_app_id
     VONAGE_PRIVATE_KEY_PATH=/path/to/private.key
     ```

### Step 4: Install Dependencies

```bash
npm install
npm run build
```

### Step 5: Verify Setup

```bash
npm run detect
npm run auth verify
```

---

## Usage

### Detect Account Tier

```bash
npm run detect
```

Returns:
```json
{
  "tier": "Pro",
  "hasApiAccess": true,
  "monthlyLimit": 1000000,
  "rateLimit": 50,
  "features": ["sms", "voice", "verification", "conversation"],
  "setupInstructions": "..."
}
```

### Send SMS

```bash
npm run sms send --to=441632960000 --message="Hello World"
```

### Make Voice Call

```bash
npm run voice call --to=441632960000 --answer-url=https://example.com/answer
```

### Verify Phone Number

```bash
npm run verify request --number=441632960000 --brand="MyApp"
```

### Check Account Usage

```bash
npm run report usage --period=month
```

---

## AI-ley Integration

Add to your `.github/aicc/aicc.yaml`:

```yaml
skills:
  vonage:
    provider: vonage
    enabled: true
    config:
      apiKey: "${VONAGE_API_KEY}"
      apiSecret: "${VONAGE_API_SECRET}"
      senderId: "${VONAGE_SENDER_ID}"
      applicationId: "${VONAGE_APPLICATION_ID}"
      privateKeyPath: "${VONAGE_PRIVATE_KEY_PATH}"
    features:
      - sms
      - voice
      - verification
      - conversation
      - numberLookup
    accountTier: "Pro"
    rateLimit: 50
    webhookUrl: "${VONAGE_WEBHOOK_URL}"
    webhookSigningEnabled: true
```

---

## TypeScript Integration

```typescript
import { VonageClient } from './src/index';

const client = new VonageClient({
  apiKey: process.env.VONAGE_API_KEY!,
  apiSecret: process.env.VONAGE_API_SECRET!,
  senderId: process.env.VONAGE_SENDER_ID!,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKeyPath: process.env.VONAGE_PRIVATE_KEY_PATH
});

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Account Tier: ${account.tier}`);

// Send SMS
const sms = await client.sendSms({
  to: '441632960000',
  text: 'Hello from Vonage!'
});
console.log(`SMS sent: ${sms.messageId}`);

// Make voice call
const call = await client.createCall({
  to: '441632960000',
  from: '14155550123',
  answerUrl: 'https://example.com/answer'
});
console.log(`Call created: ${call.uuid}`);

// Verify phone number
const verification = await client.requestVerification({
  number: '441632960000',
  brand: 'MyApp'
});
console.log(`Verification sent: ${verification.requestId}`);
```

---

## Common Workflows

### Workflow 1: Sending Bulk SMS

```typescript
const recipients = ['441632960001', '441632960002', '441632960003'];

for (const recipient of recipients) {
  const sms = await client.sendSms({
    to: recipient,
    text: 'Your verification code is 123456'
  });
  console.log(`SMS to ${recipient}: ${sms.status}`);
}
```

### Workflow 2: Two-Factor Authentication

```typescript
// Request verification
const verification = await client.requestVerification({
  number: userPhoneNumber,
  brand: 'MyApp'
});

// Check verification code
const verified = await client.checkVerification({
  requestId: verification.requestId,
  code: userProvidedCode
});

if (verified.status === '0') {
  console.log('Phone verified successfully');
}
```

### Workflow 3: Automated Voice Notifications

```typescript
const clients = [
  { name: 'John', phone: '441632960001' },
  { name: 'Jane', phone: '441632960002' }
];

for (const client of clients) {
  await vonageClient.createCall({
    to: client.phone,
    from: '14155550123',
    answerUrl: 'https://example.com/notifications/answer',
    eventUrl: 'https://example.com/notifications/events'
  });
  console.log(`Call to ${client.name}: initiated`);
}
```

### Workflow 4: Multi-Channel Messaging

```typescript
const message = {
  content: 'Important update for you',
  sender: 'MyCompany'
};

// Send via SMS
await vonageClient.sendSms({
  to: userPhone,
  text: message.content
});

// Send via Conversation API (if on Pro/Enterprise)
if (account.features.includes('conversation')) {
  await vonageClient.sendConversationMessage({
    conversationId: convId,
    content: message
  });
}
```

---

## API Reference

### VonageClient Class

#### Constructor
```typescript
new VonageClient(config: VonageConfig)
```

#### Methods

**detectAccountTier()**
- Returns: `AccountTier`
- Detects current account tier based on API permissions

**verifyApiKey()**
- Returns: `boolean`
- Verifies API credentials are valid

**sendSms(options: SmsOptions)**
- Returns: `SmsResponse`
- Sends SMS message

**sendMms(options: MmsOptions)**
- Returns: `MmsResponse`
- Sends MMS message with media

**createCall(options: CallOptions)**
- Returns: `CallResponse`
- Creates outbound voice call

**requestVerification(options: VerificationOptions)**
- Returns: `VerificationResponse`
- Requests number verification

**checkVerification(options: CheckVerificationOptions)**
- Returns: `VerificationCheckResponse`
- Checks verification code

**lookupNumber(number: string)**
- Returns: `NumberLookupResponse`
- Looks up number details and carrier

**sendConversationMessage(options: ConversationMessageOptions)**
- Returns: `ConversationMessageResponse`
- Sends message via Conversation API

**getAccountInfo()**
- Returns: `AccountInfo`
- Gets account details and balance

**getAccountUsage()**
- Returns: `AccountUsage`
- Gets usage statistics

**setupWebhook(options: WebhookOptions)**
- Returns: `WebhookResponse`
- Configures webhook for receiving callbacks

---

## Troubleshooting

### "Invalid credentials" error
- Verify API Key and Secret in dashboard
- Ensure they're correctly set in `.env`
- Check for extra whitespace

### "Insufficient balance" error
- Add payment method to account
- Check account balance in dashboard
- Consider upgrading to Starter tier

### "Rate limit exceeded" error
- Reduce request frequency
- Implement exponential backoff
- Contact support for higher limits

### "Invalid number format" error
- Use international format (country code + number)
- Include leading zeros if applicable
- Use `+` prefix for clarity

### "Webhook signing failed" error
- Verify webhook signing key in dashboard
- Ensure timestamp is fresh (within 5 minutes)
- Check signature calculation algorithm

---

## Resources

- **Official Documentation:** https://developer.vonage.com/
- **API Reference:** https://developer.vonage.com/apis
- **Dashboard:** https://dashboard.vonage.com/
- **Community:** https://community.vonage.com/
- **Support:** https://support.vonage.com/

---

## Support & Issues

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Contact Vonage support at https://support.vonage.com/
4. Join community at https://community.vonage.com/

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6

---
