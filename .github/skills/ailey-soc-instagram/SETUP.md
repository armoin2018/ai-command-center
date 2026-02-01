# Instagram Setup Guide

Complete authentication setup for Instagram Graph API integration.

## Prerequisites

1. **Instagram Business or Creator Account**
   - Personal accounts are not supported
   - Must be converted to Business or Creator account
   - Conversion: Instagram > Settings > Account > Switch to Professional Account

2. **Facebook Page**
   - Instagram must be linked to a Facebook Page
   - You must be admin of the Page
   - Create page at: [facebook.com/pages/create](https://www.facebook.com/pages/create)

3. **Facebook Developer Account**
   - Free account at [developers.facebook.com](https://developers.facebook.com)
   - Complete identity verification if required

---

## Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/apps/)

2. Click **"Create App"**

3. Choose **"Business"** app type (comprehensive access)

4. Fill in app details:
   - **App Name**: Choose a descriptive name
   - **App Contact Email**: Your email address
   - **Business Account**: Select or create business account

5. Click **"Create App"**

6. Complete security check

---

## Step 2: Add Instagram Product

1. In **App Dashboard**, find **"Add Products"** section

2. Locate **"Instagram"** product

3. Click **"Set Up"**

4. Navigate to **Instagram > Basic Display**

5. Configure settings:
   - **Valid OAuth Redirect URIs**: Add `https://localhost:3000/auth/callback`
   - Note your **App ID** and **App Secret**

6. Save changes

---

## Step 3: Link Instagram to Facebook Page

1. Go to your [Facebook Page](https://www.facebook.com/pages/)

2. Navigate to **Settings > Instagram**

3. Click **"Connect Account"**

4. Log in to your Instagram Business/Creator account

5. Authorize the connection

6. Verify link is active (green checkmark)

---

## Step 4: Get Access Token

### Option A: Graph API Explorer (Testing - 1 Hour)

**Best for**: Quick testing, development

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

2. Select your app from dropdown

3. Click **"Generate Access Token"**

4. Select permissions:
   - ☑️ `instagram_basic`
   - ☑️ `instagram_content_publish`
   - ☑️ `instagram_manage_comments`
   - ☑️ `instagram_manage_insights`
   - ☑️ `pages_read_engagement`
   - ☑️ `pages_show_list`

5. Click **"Generate Access Token"**

6. Grant permissions when prompted

7. **Copy the token** (expires in 1 hour)

---

### Option B: Long-Lived User Token (60 Days)

**Best for**: Automation, production use

1. Get short-lived token from Graph API Explorer (Step 4A)

2. Exchange for long-lived token:

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_TOKEN"
```

Replace:
- `YOUR_APP_ID`: App ID from Facebook App
- `YOUR_APP_SECRET`: App Secret from Facebook App
- `SHORT_LIVED_TOKEN`: Token from Graph API Explorer

3. Response contains `access_token` (valid 60 days)

4. **Save this token securely**

---

### Option C: Page Access Token (Never Expires)

**Best for**: Long-running automation, production

1. Get long-lived user token (Option B)

2. Get your Facebook Pages:

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/me/accounts?access_token=LONG_LIVED_USER_TOKEN"
```

3. Find your page in response, copy the `access_token` field

4. This **Page Access Token never expires** (recommended for automation)

5. Use this token for all Instagram API calls

---

## Step 5: Get Instagram Account ID

### Method 1: Using This Skill (Recommended)

```bash
# Replace with your values
npm run instagram auth get-account-id \
  --page-id YOUR_FACEBOOK_PAGE_ID

# This will output your Instagram Account ID
```

### Method 2: Graph API Explorer

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)

2. Enter your **Page Access Token**

3. Make request:
```
GET /{page-id}?fields=instagram_business_account
```

4. Copy the `id` from `instagram_business_account` object

### Method 3: Manual API Call

```bash
curl -i -X GET "https://graph.facebook.com/v18.0/YOUR_PAGE_ID?fields=instagram_business_account&access_token=YOUR_PAGE_TOKEN"
```

Response:
```json
{
  "instagram_business_account": {
    "id": "17841400008460056"  ← This is your Instagram Account ID
  },
  "id": "12345678901234"
}
```

---

## Step 6: Configure Environment

Create `.env` file in skill directory:

```bash
# Required
INSTAGRAM_ACCESS_TOKEN=your_page_access_token_here
INSTAGRAM_ACCOUNT_ID=your_instagram_business_account_id

# Optional
INSTAGRAM_API_VERSION=v18.0
FACEBOOK_PAGE_ID=your_facebook_page_id  # For reference
```

**Global Configuration (Recommended)**:

Create `~/.vscode/.env`:

```bash
# Instagram Integration
INSTAGRAM_ACCESS_TOKEN=your_token
INSTAGRAM_ACCOUNT_ID=your_account_id
INSTAGRAM_API_VERSION=v18.0
```

This makes credentials available to all skills.

---

## Step 7: Test Connection

```bash
npm run instagram test
```

**Expected output**:
```
Testing Instagram API connection...

✅ Connection successful!

Your Instagram Account:
  ID: 17841400008460056
  Username: @yourhandle
  Name: Your Business Name
  Followers: 1,234
  Following: 567
  Posts: 89

Instagram API is configured correctly.
You can now use all Instagram commands.
```

**If connection fails**:
- Verify `INSTAGRAM_ACCESS_TOKEN` is set correctly
- Verify `INSTAGRAM_ACCOUNT_ID` is correct
- Check token hasn't expired
- Ensure all permissions are granted
- Run `npm run instagram setup` for troubleshooting

---

## Security Best Practices

### Token Storage

**✅ DO**:
- Store tokens in `.env` files (ignored by git)
- Use environment variables
- Use secrets management (AWS Secrets Manager, Azure Key Vault)
- Rotate tokens regularly

**❌ DON'T**:
- Commit tokens to version control
- Share tokens via email/Slack
- Hardcode tokens in scripts
- Use short-lived tokens in production

### Token Refresh

Implement automatic token refresh:

```javascript
// Check token expiration
const checkTokenExpiry = async (token) => {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/debug_token?input_token=${token}&access_token=${token}`
  );
  const data = await response.json();
  
  if (data.data.expires_at) {
    const expiresAt = new Date(data.data.expires_at * 1000);
    const daysUntilExpiry = (expiresAt - new Date()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilExpiry < 7) {
      console.warn(`Token expires in ${Math.floor(daysUntilExpiry)} days!`);
      // Trigger refresh workflow
    }
  }
};
```

---

## Permission Reference

| Permission | Purpose | Required For |
|-----------|---------|-------------|
| `instagram_basic` | Access account info | All operations |
| `instagram_content_publish` | Publish photos/videos/stories | Content publishing |
| `instagram_manage_comments` | Reply/delete/hide comments | Engagement management |
| `instagram_manage_insights` | Access analytics data | Analytics, insights |
| `pages_read_engagement` | Read page engagement | Account linking |
| `pages_show_list` | List pages you manage | Account discovery |

---

## Troubleshooting

### "Invalid OAuth access token"

**Causes**:
- Token expired (1 hour for short-lived, 60 days for long-lived)
- Token revoked or invalidated
- Permissions removed

**Solutions**:
1. Regenerate token via Graph API Explorer
2. Exchange for long-lived token
3. Use Page Access Token (never expires)
4. Verify permissions are still granted

---

### "Instagram Account not found"

**Causes**:
- Instagram account not linked to Facebook Page
- Account is Personal (not Business/Creator)
- Using wrong Page ID
- Permissions not granted

**Solutions**:
1. Verify Instagram is linked: Page Settings > Instagram
2. Convert to Business/Creator account
3. Check Page ID is correct
4. Re-grant permissions in Graph API Explorer

---

### "Permission denied"

**Causes**:
- Missing required permissions
- App not approved for advanced permissions
- Business verification required

**Solutions**:
1. Request permissions via Graph API Explorer
2. Submit app for review (for advanced features)
3. Complete business verification

---

### "Rate limit exceeded"

**Causes**:
- Too many API calls (200/hour limit)
- Concurrent requests from multiple sources

**Solutions**:
1. Implement request throttling
2. Add delays between API calls
3. Cache data where possible
4. Use batch requests for multiple operations

---

### "Media publishing failed"

**Causes**:
- Media URL not publicly accessible
- Media format not supported
- Media doesn't meet requirements (size, aspect ratio)
- CORS issues

**Solutions**:
1. Verify media URL is publicly accessible (HTTPS)
2. Check media format:
   - Photos: JPG, min 320px
   - Videos: MP4/MOV, max 60s
3. Verify aspect ratio: 4:5 to 1.91:1
4. Test URL in browser first

---

## Testing Checklist

- [ ] App created in Facebook Developer Portal
- [ ] Instagram product added to app
- [ ] Instagram account linked to Facebook Page
- [ ] Access token generated with all permissions
- [ ] Instagram Account ID obtained
- [ ] `.env` file configured
- [ ] `npm run instagram test` passes
- [ ] Can publish test photo
- [ ] Can retrieve account insights
- [ ] Can list recent media

---

## FAQ

**Q: Can I use a personal Instagram account?**

A: No. Instagram Graph API requires Business or Creator account. Convert in Instagram settings.

---

**Q: How long do tokens last?**

A: 
- Short-lived: 1 hour
- Long-lived: 60 days
- Page Access Token: Never expires (recommended)

---

**Q: How many API calls can I make?**

A: 200 calls per hour per user. Implement rate limiting for production use.

---

**Q: Can I schedule posts for future?**

A: No. Instagram Graph API does not support scheduled publishing. Posts are published immediately. Use third-party schedulers or cron jobs to trigger publishing at specific times.

---

**Q: What about Instagram Shopping?**

A: Requires:
1. Instagram Business Account
2. Facebook Shop or product catalog
3. Products approved for Instagram Shopping
4. Commerce Manager setup
5. Eligible country/region

---

**Q: Can I access Instagram DMs?**

A: Limited. Instagram Messaging API is in beta and requires app review. Current implementation does not include DM management.

---

**Q: What about analytics for older posts?**

A: Instagram provides insights for posts from the last 2 years. Story insights are only available for 24 hours.

---

## Resources

- **Instagram Graph API**: https://developers.facebook.com/docs/instagram-api
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **App Dashboard**: https://developers.facebook.com/apps/
- **Content Publishing Guide**: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
- **Insights Reference**: https://developers.facebook.com/docs/instagram-api/reference/ig-user/insights
- **Business Tools**: https://www.facebook.com/business/instagram

---

**Need Help?**

Run `npm run instagram setup` for interactive setup wizard or check [SKILL.md](SKILL.md) for comprehensive documentation.
