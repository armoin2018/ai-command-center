---
id: ailey-twitter
name: X (Twitter) Integration Manager
description: Comprehensive X (Twitter) integration with tier detection (Free, Basic, Pro, Enterprise), posting, search, streaming, and analytics. Automatically detects API tier and adapts features with cost warnings.
keywords: [twitter, x, api, tier-detection, social-media, posting, search, streaming, analytics]
tools: [twitter-api-v2, OAuth 2.0, REST API, streaming API]
---

# X (Twitter) Integration Manager

Comprehensive X (Twitter) integration with intelligent API tier detection. Automatically adapts to your API access level and provides upgrade guidance with clear cost warnings.

## Overview

- **4-Tier API Detection**: FREE → BASIC → PRO → ENTERPRISE
- **Automatic Tier Detection**: Tests API capabilities to determine access level
- **Feature Gating**: Shows only available features for current tier
- **Cost Warnings**: Proactive warnings about tier costs (Pro: $5,000/month!)
- **Rate Limit Tracking**: Monitors and enforces tier-specific limits
- **Comprehensive Features**: Posting, search, streaming, DMs, analytics

## When to Use

- Posting tweets programmatically
- Automating X content and engagement
- Searching and monitoring tweets/hashtags
- Real-time tweet streaming (Pro+)
- Direct message automation (Pro+)
- Social media analytics and metrics (Pro+)
- Brand monitoring and sentiment analysis

## Installation

```bash
cd .github/skills/ailey-twitter
npm install
```

## Quick Start

```bash
npm run twitter setup       # Show setup guide
cp .env.example .env        # Configure credentials
npm run twitter test        # Test connection
npm run twitter detect      # Detect tier
npm run tweet "Hello X!"    # Post tweet
```

## API Tier Overview

| Tier | Cost/Month | Read Limit | Write Limit | Key Features |
|------|------------|------------|-------------|--------------|
| **Free** | $0 | 1,500/month | 50/month | Testing only |
| **Basic** | $100 | 10,000/month | 3,000/month | Media, limited search |
| **Pro** | $5,000 ⚠️ | 1M/month | 100K/month | Full search, streaming, DMs |
| **Enterprise** | ~$42K+ | Unlimited | Unlimited | Firehose, historical data |

⚠️ **Cost Warning**: Pro tier costs $5,000/month = $60,000/year!

## Workflows

### Workflow 1: Tier Detection

```bash
npm run twitter detect
```

Shows current tier, rate limits, available features, and upgrade options with cost warnings.

### Workflow 2: Post Tweets

```bash
# Simple tweet
npm run tweet "Posted via X API!"

# Reply to tweet
npm run tweet "Thanks!" -- --reply 1234567890

# Quote tweet
npm run tweet "Great point!" -- --quote 1234567890
```

### Workflow 3: Search (Basic+ Required)

```bash
npm run search "artificial intelligence"
npm run search "AI" -- --number 10
```

### Workflow 4: User Timeline

```bash
npm run timeline              # Your timeline
npm run timeline username     # Another user's timeline
```

## Resources

- Developer Portal: https://developer.twitter.com
- API Documentation: https://developer.twitter.com/en/docs
- Pricing: https://developer.twitter.com/en/pricing

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.6
---
