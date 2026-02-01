# X (Twitter) Integration Manager

Comprehensive X (Twitter) integration with intelligent API tier detection and cost warnings.

## Features

- 🎯 **Tier Detection**: Automatically detects API tier (Free, Basic, Pro, Enterprise)
- 💰 **Cost Warnings**: Clear warnings about tier costs (Pro: $5,000/month!)
- 📊 **Rate Limit Tracking**: Monitors and enforces tier-specific limits
- ✍️ **Tweet Management**: Post, reply, quote, delete tweets
- 🔍 **Search**: Tweet and user search (Basic+)
- 📈 **Analytics**: Metrics and insights (Pro+)
- 💬 **Direct Messages**: Automation (Pro+)
- 🌊 **Streaming**: Real-time tweet streams (Pro+)

## API Tiers

| Tier | Cost | Read | Write | Search | Streaming | DMs |
|------|------|------|-------|--------|-----------|-----|
| **Free** | $0 | 1.5K/mo | 50/mo | ❌ | ❌ | ❌ |
| **Basic** | $100 | 10K/mo | 3K/mo | Limited | ❌ | ❌ |
| **Pro** | $5K ⚠️ | 1M/mo | 100K/mo | ✅ | ✅ | ✅ |
| **Enterprise** | Custom | ∞ | ∞ | ✅ | ✅ | ✅ |

⚠️ **Warning**: Pro tier costs $5,000/month ($60,000/year)!

## Quick Start

```bash
npm install

# Setup guide
npm run twitter setup

# Configure
cp .env.example .env
# Edit with your API keys

# Test
npm run twitter test

# Detect tier
npm run twitter detect

# Post tweet
npm run tweet "Hello X! 🚀"

# Search
npm run search "AI"
```

## Commands

```bash
npm run twitter setup      # Setup instructions
npm run twitter test       # Test connection
npm run twitter detect     # Detect API tier
npm run tweet <text>       # Post tweet
npm run search <query>     # Search tweets (Basic+)
npm run timeline [user]    # Get timeline
```

## Configuration

```env
# Required
X_API_KEY=your_api_key
X_API_SECRET=your_api_secret
X_ACCESS_TOKEN=your_access_token
X_ACCESS_SECRET=your_access_secret

# Optional
X_BEARER_TOKEN=your_bearer_token
```

Get credentials at: https://developer.twitter.com/en/portal/dashboard

## Tier Detection Example

```bash
$ npm run twitter detect

🎯 API Tier: FREE ACCESS
   Cost: $0/month

Rate Limits:
  📖 Read: 1,500 tweets/month
  ✍️  Write: 50 tweets/month

Available Capabilities:
  ✅ Post tweets
  ❌ Post with media (requires Basic+)
  ❌ Search tweets (requires Basic+)

📈 Upgrade to Basic ($100/month) for:
  • Post with media
  • Basic search
  • 10K read / 3K write per month
```

## Upgrade Costs

- **Free → Basic**: $100/month - Worth it for practical automation
- **Basic → Pro**: $5,000/month ⚠️ - Only if you need search/streaming/DMs
- **Pro → Enterprise**: Custom (~$42K/month) - Large enterprises only

**Always check tier costs before upgrading!**

## Resources

- **Developer Portal**: https://developer.twitter.com
- **API Docs**: https://developer.twitter.com/en/docs
- **Pricing**: https://developer.twitter.com/en/pricing

## License

Part of the ai-ley kit.
