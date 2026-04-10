# Vonage Communications API - Quick Start Guide

Get started with Vonage Communications API for SMS, voice, and messaging in minutes.

## Features

✅ **SMS & MMS**: Send and receive text and multimedia messages  
✅ **Voice API**: Make and receive calls, IVR, and call recording  
✅ **Number Verification**: Two-factor authentication and number validation  
✅ **Number Lookup**: Carrier, roaming, and number type information  
✅ **Conversation API**: Multi-channel messaging (Pro/Enterprise)  
✅ **Webhook Management**: Real-time callbacks for messages and calls  
✅ **Account Tier Detection**: Auto-detect features based on account type  
✅ **Analytics**: Track usage and costs

## Quick Setup

### 1. Prerequisites

- Node.js 18+ and npm 9+
- Vonage account (https://dashboard.vonage.com/)
- API Key and Secret from dashboard

### 2. Installation

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Set up environment
cp .env.example .env
# Edit .env with your credentials
```

### 3. Configure Credentials

Edit `.env`:
```bash
VONAGE_API_KEY=your_api_key_from_dashboard
VONAGE_API_SECRET=your_api_secret_from_dashboard
VONAGE_SENDER_ID=YourBrand
```

### 4. Verify Setup

```bash
npm run auth verify
npm run detect
```

## Account Tiers

| Tier | Features | Rate Limit | Support |
|------|----------|-----------|---------|
| **Pay-As-You-Go** | SMS, Voice, Verify | 10 req/s | Community |
| **Starter** | + Bulk SMS, Conversation API (limited) | 20 req/s | Email |
| **Pro** | Full Conversation API, Advanced analytics | 50 req/s | Dedicated |
| **Enterprise** | Custom SLA, white-label, 24/7 support | 100+ req/s | 24/7 |

## Common Commands

### Send SMS
```bash
npm run sms send --to=441632960000 --message="Hello from Vonage"
```

### Make Voice Call
```bash
npm run voice call --to=441632960000 --from=14155550123 --answer-url=https://example.com/answer
```

### Verify Phone Number
```bash
npm run verify request --number=441632960000 --brand="MyApp"
npm run verify check --request-id=request-id --code=123456
```

### Lookup Number Info
```bash
npm run number lookup --number=441632960000
```

### Check Account Status
```bash
npm run detect
npm run auth info
npm run auth test
```

## TypeScript Integration

```typescript
import { VonageClient } from './src/index';

const client = new VonageClient({
  apiKey: process.env.VONAGE_API_KEY!,
  apiSecret: process.env.VONAGE_API_SECRET!,
  senderId: process.env.VONAGE_SENDER_ID!
});

// Detect account tier
const account = await client.detectAccountTier();
console.log(`Tier: ${account.tier}`);

// Send SMS
const sms = await client.sendSms({
  to: '441632960000',
  text: 'Hello from Vonage!'
});
console.log(`Message ID: ${sms.messageId}`);

// Verify phone
const verification = await client.requestVerification({
  number: '441632960000',
  brand: 'MyApp'
});
```

## Getting API Credentials

### Step 1: Create Account
Visit https://dashboard.vonage.com/ and sign up

### Step 2: Get API Key & Secret
1. Log in to dashboard
2. Go to Settings → API Settings
3. Copy API Key and API Secret
4. Add payment method (for production)

### Step 3: For Voice API
1. Go to Applications
2. Create new application
3. Add Voice capabilities
4. Download private key
5. Set in `.env`: `VONAGE_PRIVATE_KEY_PATH=/path/to/key.pem`

## Common Workflows

### Two-Factor Authentication
```typescript
// Request verification
const verify = await client.requestVerification({
  number: userPhoneNumber,
  brand: 'MyApp'
});

// User enters code
const check = await client.checkVerification({
  requestId: verify.requestId,
  code: userCode
});

if (check.status === 'verified') {
  // User authenticated
}
```

### Bulk SMS Campaign
```typescript
const recipients = ['441632960001', '441632960002'];

for (const phone of recipients) {
  await client.sendSms({
    to: phone,
    text: 'Special offer just for you!'
  });
}
```

### Voice IVR
```typescript
const call = await client.createCall({
  to: '441632960000',
  from: '14155550123',
  answerUrl: 'https://example.com/ncco'
});
```

## API Reference

### Core Methods

- `detectAccountTier()` - Get account tier and features
- `verifyApiKey()` - Verify credentials
- `getAccountInfo()` - Get balance and account settings
- `sendSms(options)` - Send SMS message
- `sendMms(options)` - Send MMS message
- `createCall(options)` - Make voice call
- `requestVerification(options)` - Request phone verification
- `checkVerification(options)` - Check verification code
- `lookupNumber(number)` - Get number information
- `sendConversationMessage(options)` - Send multi-channel message
- `setupWebhook(options)` - Configure webhooks

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for detailed CLI commands.

## Resources

- **Official Docs**: https://developer.vonage.com/
- **Dashboard**: https://dashboard.vonage.com/
- **API Reference**: https://developer.vonage.com/apis
- **Community**: https://community.vonage.com/
- **Support**: https://support.vonage.com/

## Troubleshooting

### "Invalid credentials" error
- Verify API Key and Secret in dashboard
- Check for extra whitespace in `.env`
- Ensure account is active

### "Insufficient balance" error
- Add payment method to account
- Check balance in dashboard
- Consider upgrading tier

### "Rate limit exceeded"
- Reduce request frequency
- Implement backoff/retry logic
- Contact support for higher limits

## Next Steps

1. ✅ Setup complete? Run: `npm run detect`
2. 📱 Send your first SMS: `npm run sms send --to=441632960000 --message="Test"`
3. 📖 Read API docs: https://developer.vonage.com/
4. 🔧 Integrate into your app: See TypeScript Integration section
5. 🚀 Deploy to production

---

**More Help?**
- See [SKILL.md](SKILL.md) for full documentation
- See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for all CLI commands
- Visit https://developer.vonage.com/ for API documentation
