# Threads Content Manager - Quick Reference

## Setup (First Time)

```bash
# 1. Install
cd .github/skills/ailey-soc-threads
npm install

# 2. View setup instructions
npm run setup

# 3. Create .env from example
cp .env.example .env
# Edit .env with your Meta app credentials

# 4. Authenticate
npm run auth start
# Visit URL, authorize, copy code
npm run auth token <CODE>

# 5. Test
npm test
```

## Common Commands

### Account & Status
```bash
npm run detect              # Check account type & features
npm run diagnose            # Full diagnostics
npm test                    # Test connection
```

### Authentication
```bash
npm run auth start          # Start OAuth flow
npm run auth token <CODE>   # Exchange code for tokens
```

### Post Content
```bash
# Text post
npm run post "Hello Threads! 🧵"

# Image post
npm run post "Check this out!" -- --image photo.jpg

# Video post
npm run post "Tutorial time" -- --video tutorial.mp4

# Carousel (multiple images)
npm run post "Gallery" -- --images "img1.jpg,img2.jpg,img3.jpg"

# Post with link
npm run post "New article!" -- --link "https://example.com"
```

### Analytics (Creator/Business)
```bash
npm run analytics post POST_ID
npm run analytics account -- --days 30
npm run analytics audience
npm run analytics top -- --metric likes --days 7
```

### Manage Replies
```bash
npm run replies list POST_ID
npm run replies create POST_ID -- --text "Thanks!"
npm run replies hide REPLY_ID
npm run replies unhide REPLY_ID
npm run replies delete REPLY_ID
```

### Profile
```bash
npm run profile
npm run profile update -- --bio "New bio"
npm run followers count
npm run following count
```

### Search
```bash
npm run search "keyword" -- --mine
npm run search "#hashtag"
npm run search "@username"
```

## Account Types

### Personal (Default)
- ✅ Basic posting (text, images, videos)
- ✅ Reply to posts
- ✅ Basic analytics
- 📊 200 requests/hour, 500 posts/day

### Creator
- ✅ All Personal features
- ✅ Enhanced analytics
- ✅ Reply management tools
- ✅ Audience insights
- 📊 500 requests/hour, 1000 posts/day

### Business
- ✅ All Creator features
- ✅ Advanced analytics
- ✅ Team management
- ✅ Business verification
- 📊 1000 requests/hour, unlimited posts

## Post Limits

| Type | Limit |
|------|-------|
| Text | 500 characters |
| Images | Max 10 per post |
| Video | Max 5 minutes |
| Daily posts (Personal) | 500 |
| Daily posts (Business) | Unlimited |

## Image Requirements

- Format: JPG, PNG, WebP
- Max size: 8MB per image
- Aspect ratio: 4:5 to 1.91:1
- Min width: 1080px

## Video Requirements

- Format: MP4, MOV
- Max duration: 5 minutes
- Max size: 500MB
- Aspect ratio: 4:5 to 16:9

## Environment Variables

```env
THREADS_APP_ID=                      # From Meta for Developers
THREADS_APP_SECRET=                  # From Meta for Developers
THREADS_ACCESS_TOKEN=                # From OAuth flow
THREADS_USER_ID=                     # From OAuth flow
THREADS_INSTAGRAM_ACCOUNT_ID=        # Instagram account ID
THREADS_ACCOUNT_TYPE=auto-detect     # or: personal, creator, business
```

## AI-ley Configuration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  threads:
    enabled: true
    appId: ${THREADS_APP_ID}
    appSecret: ${THREADS_APP_SECRET}
    accessToken: ${THREADS_ACCESS_TOKEN}
    userId: ${THREADS_USER_ID}
    accountType: auto-detect
```

## Upgrade Account

### To Creator:
1. Open Instagram app
2. Settings → Account → Switch to Creator Account
3. Enable Threads in Instagram settings
4. Run: `npm run auth start` (reconnect API)

### To Business:
1. Open Instagram app
2. Settings → Account → Switch to Business Account
3. Link Facebook Business Page
4. Enable Threads for business
5. Run: `npm run auth start` (reconnect API)

## Troubleshooting

### "Invalid access token"
```bash
npm run auth start  # Re-authenticate
```

### "Insufficient permissions"
```bash
# Upgrade account type or re-auth with more scopes
npm run auth start
```

### "Rate limit exceeded"
```bash
npm run detect  # Check rate limit status
# Wait for reset or upgrade account
```

### Setup not working
```bash
npm run diagnose  # Run full diagnostics
```

## Request More Features

### Upgrade to Creator:
- Enhanced analytics
- Reply management
- Audience insights
- Higher rate limits

### Upgrade to Business:
- All Creator features
- Team collaboration
- Advanced reporting
- Unlimited posting

## Support

- **Documentation**: see SKILL.md
- **Threads API**: https://developers.facebook.com/docs/threads
- **Meta Developers**: https://developers.facebook.com/
