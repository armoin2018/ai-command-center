# ailey-linkedin

> LinkedIn integration for profile access, content sharing, and company page management using OAuth 2.0 API

⚠️ **API Limitations**: LinkedIn restricts most APIs to Partnership members. This skill provides features available to ALL developers without partnership.

## Quick Start

```bash
# Install
cd .github/skills/ailey-linkedin
npm install

# Setup OAuth
npm run linkedin setup  # View setup instructions
npm run linkedin auth start  # Start OAuth flow
npm run linkedin test  # Test connection

# Share content
npm run linkedin share text "Hello LinkedIn!"
npm run linkedin share link --url "https://example.com" --text "Check this out"
npm run linkedin share image photo.jpg --text "My photo"

# Company pages
npm run linkedin pages list
npm run linkedin pages post ORG_ID --text "Company update"
```

## Available Features

✅ **OAuth 2.0 Authentication**: Secure authorization flow  
✅ **Basic Profile**: Name, headline, profile picture  
✅ **Content Sharing**: Text posts, links/articles, images  
✅ **Company Pages**: Post as organization (if admin)  
✅ **Follower Tracking**: Company page follower counts  

## NOT Available (Requires Partnership)

❌ Full profile data (experience, education, skills)  
❌ Connections API (network management)  
❌ Messaging/InMail  
❌ Advanced analytics  
❌ Job postings & recruiting  
❌ Advertising campaigns  
❌ Sales Navigator integration  

## Commands

### Authentication

```bash
# Start OAuth flow (recommended)
npm run linkedin auth start

# Test connection
npm run linkedin test
```

### Profile

```bash
# Show profile
npm run linkedin profile show

# Get vanity URL
npm run linkedin profile vanity
```

### Share Content

```bash
# Text post
npm run linkedin share text "Your message here"

# Link/article
npm run linkedin share link \
  --url "https://example.com" \
  --text "Check this out" \
  --title "Article Title" \
  --description "Article description"

# Image
npm run linkedin share image photo.jpg \
  --text "Caption for image" \
  --visibility PUBLIC  # or CONNECTIONS
```

### Company Pages

```bash
# List pages you administer
npm run linkedin pages list

# Post to company page
npm run linkedin pages post ORGANIZATION_ID \
  --text "Company update" \
  --url "https://example.com"

# Get follower count
npm run linkedin pages followers ORGANIZATION_ID
```

## Configuration

Create `.env` file:

```bash
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_API_VERSION=v2  # Optional
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/callback  # Optional
```

## OAuth Scopes Required

- `r_liteprofile` - View basic profile
- `r_emailaddress` - View email address  
- `w_member_social` - Share content
- `r_organization_social` - View org pages
- `w_organization_social` - Manage org pages

## Setup Steps

1. **Create LinkedIn App**: https://www.linkedin.com/developers/apps
2. **Configure OAuth**: Add redirect URI, request scopes
3. **Get Access Token**: Run `npm run linkedin auth start`
4. **Test Connection**: Run `npm run linkedin test`

## Limitations

- Access tokens expire after 60 days (must re-authorize)
- No refresh token support in current implementation
- Rate limits apply (throttle requests)
- Some features require LinkedIn Partnership
- Image uploads limited to JPG/PNG formats

## Documentation

- [SKILL.md](SKILL.md) - Comprehensive workflows
- [SETUP.md](SETUP.md) - Detailed OAuth setup
- Run `npm run linkedin setup` - Interactive guide

## Troubleshooting

**"Authentication failed"**: Token expired, regenerate via OAuth

**"Permission denied"**: Missing OAuth scopes or requires Partnership

**"Invalid redirect URI"**: Must match app settings exactly

## Resources

- [LinkedIn API](https://docs.microsoft.com/en-us/linkedin/)
- [OAuth 2.0](https://docs.microsoft.com/en-us/linkedin/shared/authentication/)
- [Share API](https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/)
- [Developer Portal](https://www.linkedin.com/developers/)

---

**License**: MIT  
**Version**: 1.0.0
