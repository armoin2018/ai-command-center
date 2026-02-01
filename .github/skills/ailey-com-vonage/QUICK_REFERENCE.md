# Vonage Communications API - Quick Reference

Complete command reference for Vonage Communications API CLI.

## Table of Contents
- [Setup Commands](#setup-commands)
- [Authentication Commands](#authentication-commands)
- [SMS Commands](#sms-commands)
- [Voice Commands](#voice-commands)
- [Verification Commands](#verification-commands)
- [Number Lookup Commands](#number-lookup-commands)
- [Reporting Commands](#reporting-commands)
- [Environment Variables](#environment-variables)
- [Common Workflows](#common-workflows)

---

## Setup Commands

### Setup Wizard
```bash
npm run setup
```
Interactive setup guide with dashboard links and step-by-step instructions.

---

## Authentication Commands

### Verify Credentials
```bash
npm run auth verify
```
Test that API key and secret are valid.

### Get Account Information
```bash
npm run auth info
```
Display current account balance and settings.

### Run Full Test
```bash
npm run auth test
```
Complete authentication test with balance, usage stats, and account info.

---

## SMS Commands

### Send SMS
```bash
npm run sms send --to=441632960000 --message="Hello World"
npm run sms send --to=441632960000 --message="Hello" --from=YourBrand
```

**Options:**
- `--to` (required): Recipient phone number in international format
- `--message` (required): Text message (up to 160 characters, auto-split if longer)
- `--from` (optional): Sender ID (alphanumeric max 11 chars or number)

**Output:**
- Message ID
- Status (success/failed)
- Network
- Message price
- Remaining balance

**Example:**
```bash
npm run sms send --to=441632960000 --message="Your verification code is 123456"
```

---

## Voice Commands

### Make Outbound Call
```bash
npm run voice call --to=441632960000 --from=14155550123 --answer-url=https://example.com/answer
```

**Options:**
- `--to` (required): Recipient phone number
- `--from` (required): Caller phone number (must be verified)
- `--answer-url` (required): NCCO (Nexmo Call Control Objects) URL

**Output:**
- UUID (unique call ID)
- Status
- Direction

**Example - Voice Notification:**
```bash
npm run voice call \
  --to=441632960000 \
  --from=14155550123 \
  --answer-url=https://example.com/notifications/ncco
```

**Prerequisites:**
- Voice API enabled in dashboard
- Application ID configured
- Private key configured
- Answer URL must return valid NCCO JSON

---

## Verification Commands

### Request Verification
```bash
npm run verify request --number=441632960000 --brand="MyApp"
```

**Options:**
- `--number` (required): Phone number to verify
- `--brand` (required): Brand name shown to user

**Output:**
- Request ID (needed for checking code)
- Status (sent)

**Example:**
```bash
npm run verify request --number=441632960000 --brand="MyCompany"
# Returns: Request ID: 44a111e1-8e4c-4f0e-a25b-40b2222f50cc
```

### Check Verification Code
```bash
npm run verify check --request-id=44a111e1-8e4c-4f0e-a25b-40b2222f50cc --code=123456
```

**Options:**
- `--request-id` (required): Request ID from verification request
- `--code` (required): 6-digit code from SMS

**Output:**
- Status (verified)
- Event ID

**Example - 2FA Flow:**
```bash
# Step 1: Request verification
REQUEST=$(npm run verify request --number=441632960000 --brand="MyApp")
# User receives SMS with code

# Step 2: Check code
npm run verify check --request-id=request-id-here --code=user-entered-code
```

---

## Number Lookup Commands

### Lookup Number Information
```bash
npm run number lookup --number=441632960000
```

**Options:**
- `--number` (required): Phone number to lookup

**Output:**
- Number (international format)
- Country name and code
- Carrier information
- Number type (mobile/landline)
- Valid status
- Roaming information

**Example:**
```bash
npm run number lookup --number=441632960000
# Output:
# ✓ Number: +441632960000
# ✓ Country: United Kingdom (GB)
# ✓ Carrier: Vodafone
# ✓ Type: mobile
# ✓ Valid: Yes
```

---

## Reporting Commands

### Get Usage Statistics
```bash
npm run report usage
```

**Output:**
- Monthly SMS count
- Monthly voice call count
- Monthly verification requests
- Cost month-to-date (MTD)
- Estimated cost month-to-month (MTM)

**Example:**
```bash
npm run report usage
# ✓ Monthly SMS: 1,234
# ✓ Monthly Voice: 56
# ✓ Monthly Verify: 89
# ✓ Cost MTD: €12.34
# ✓ Estimated Cost MTM: €45.67
```

---

## Detect & Diagnostics

### Detect Account Tier
```bash
npm run detect
```

**Output:**
- Account tier (Pay-As-You-Go/Starter/Pro/Enterprise)
- API access status
- Monthly limit
- Rate limit (requests/second)
- Available features
- Setup instructions

### Run Diagnostics
```bash
npm run diagnose
```

**Checks:**
- Environment variables configured
- API credentials valid
- Account balance
- Account tier
- Connection status

---

## Environment Variables

### Required
```bash
VONAGE_API_KEY=your_api_key
VONAGE_API_SECRET=your_api_secret
```

### Optional
```bash
VONAGE_SENDER_ID=YourBrand                    # Default SMS sender
VONAGE_APPLICATION_ID=app_id                  # For Voice API
VONAGE_PRIVATE_KEY_PATH=/path/to/key.pem     # For Voice API
VONAGE_ACCOUNT_ID=account_id                  # Account identifier
VONAGE_DEFAULT_RECIPIENT=441632960000         # Default test number
VONAGE_WEBHOOK_URL=https://example.com        # Webhook endpoint
VONAGE_TIMEOUT=30000                          # Request timeout (ms)
VONAGE_RATE_LIMIT=10                          # Requests per second
VONAGE_SUBDOMAIN=api.vonage.com              # Custom endpoint
```

---

## Common Workflows

### Workflow 1: Two-Factor Authentication (2FA)

```bash
# Step 1: Request verification SMS
npm run verify request --number=441632960000 --brand="MyApp"
# User receives SMS with 6-digit code

# Step 2: User enters code, verify it
npm run verify check --request-id=<request-id> --code=123456

# Output shows: ✓ Status: verified
```

### Workflow 2: Send Marketing SMS Campaign

```bash
# Send to multiple recipients
npm run sms send --to=441632960001 --message="Exclusive offer: 50% OFF!"
npm run sms send --to=441632960002 --message="Exclusive offer: 50% OFF!"
npm run sms send --to=441632960003 --message="Exclusive offer: 50% OFF!"

# Check usage
npm run report usage
```

### Workflow 3: Automated Voice Notifications

```bash
# Setup NCCO endpoint at https://example.com/notifications/ncco
# Returns JSON like:
# [{
#   "action": "talk",
#   "text": "Hello, your appointment is tomorrow at 2 PM"
# }]

# Make call
npm run voice call \
  --to=441632960000 \
  --from=14155550123 \
  --answer-url=https://example.com/notifications/ncco
```

### Workflow 4: Phone Validation

```bash
# Check if number is valid and mobile
npm run number lookup --number=441632960000

# Output shows carrier, type (mobile/landline), roaming status
# Use for validation before SMS/voice campaign
```

### Workflow 5: Account Health Check

```bash
# Run complete diagnostics
npm run diagnose

# Shows: environment setup, credentials, balance, account tier
# Verify before production deployment
```

---

## Account Tier Feature Matrix

| Feature | Pay-As-You-Go | Starter | Pro | Enterprise |
|---------|:---:|:---:|:---:|:---:|
| SMS | ✅ | ✅ | ✅ | ✅ |
| Voice API | ✅ | ✅ | ✅ | ✅ |
| Verification | ✅ | ✅ | ✅ | ✅ |
| Number Lookup | ✅ | ✅ | ✅ | ✅ |
| Conversation API | ❌ | Limited | ✅ | ✅ |
| Bulk Messaging | ❌ | Limited | ✅ | ✅ |
| Webhook Signing | ❌ | ❌ | ✅ | ✅ |
| Rate Limit | 10 req/s | 20 req/s | 50 req/s | 100+ req/s |
| Support | Community | Email | Dedicated | 24/7 |

---

## Exit Codes

- `0` - Command successful
- `1` - Command failed (check error message)

---

## Tips & Best Practices

### Phone Number Format
Always use international format with country code:
```bash
# ✅ Correct
+441632960000
441632960000

# ❌ Wrong
01632 960000
0163 2960000
```

### Rate Limiting
Vonage enforces rate limits based on account tier. Implement backoff:
```typescript
// Retry with exponential backoff
let delay = 100;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    await client.sendSms(options);
    break;
  } catch (error) {
    if (error.includes('rate limit')) {
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}
```

### Cost Optimization
- Use `npm run report usage` to track costs
- Verify phone numbers before campaigns
- Use bulk APIs for large volumes
- Consider upgrading to Pro tier for better rates

### Testing
- Use test numbers from dashboard
- Enable webhook signing for security
- Monitor balance to avoid service interruption
- Keep API credentials secure

---

## Troubleshooting

### "Invalid credentials"
```bash
# Verify credentials
npm run auth verify

# Check .env file
cat .env | grep VONAGE_API

# Ensure no extra whitespace
```

### "Insufficient balance"
```bash
# Check balance
npm run auth info

# Add payment method in dashboard
# https://dashboard.vonage.com/billing
```

### "Rate limit exceeded"
- Reduce request frequency
- Upgrade account tier
- Implement exponential backoff
- Contact support for higher limits

### "Webhook signing failed"
- Verify webhook URL is correct
- Check timestamp (must be within 5 minutes)
- Ensure correct signing algorithm

---

## Resources

- **Full Documentation**: [SKILL.md](SKILL.md)
- **Quick Start**: [README.md](README.md)
- **Official API Docs**: https://developer.vonage.com/
- **Dashboard**: https://dashboard.vonage.com/
- **Support**: https://support.vonage.com/
- **Community**: https://community.vonage.com/
