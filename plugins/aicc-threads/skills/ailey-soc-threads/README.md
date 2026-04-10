# Threads Content Manager

Comprehensive Threads integration with intelligent account type detection and feature adaptation.

## Features

- ✅ **Account Type Detection** - Automatic detection of Personal/Creator/Business
- ✅ **Post Publishing** - Text, images, videos, carousels
- ✅ **Analytics** - Post and account performance tracking
- ✅ **Reply Management** - Engage with your audience
- ✅ **Rate Limit Handling** - Automatic tracking and management
- ✅ **OAuth 2.0** - Secure authentication via Meta

## Quick Start

### 1. Installation

```bash
cd .github/skills/ailey-soc-threads
npm install
```

### 2. Setup

```bash
# View comprehensive setup instructions
npm run setup

# This will guide you through:
# - Creating Meta app
# - Linking Instagram account
# - Enabling Threads API
# - Configuring OAuth
```

### 3. Authentication

```bash
# Start OAuth flow
npm run auth start

# Test connection
npm test
```

### 4. Detect Account Type

```bash
# Check your account capabilities
npm run detect
```

## Common Tasks

### Post to Threads

```bash
npm run post "Hello Threads! 🧵"
npm run post "Check this out!" -- --image photo.jpg
npm run post "Tutorial time 📹" -- --video tutorial.mp4
```

### View Analytics

```bash
npm run analytics post POST_ID
npm run analytics account -- --days 30
```

### Manage Replies

```bash
npm run replies list POST_ID
npm run replies create POST_ID -- --text "Thanks!"
```

## Documentation

See [SKILL.md](./SKILL.md) for complete documentation.

## Account Types

- **Personal** - Basic posting and engagement (available immediately)
- **Creator** - Enhanced analytics and moderation tools
- **Business** - Full business features and team tools

## Support

- [Threads API Docs](https://developers.facebook.com/docs/threads)
- [Meta for Developers](https://developers.facebook.com/)
- Run `npm run diagnose` for troubleshooting

## License

MIT
