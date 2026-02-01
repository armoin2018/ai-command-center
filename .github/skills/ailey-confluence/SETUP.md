# Confluence Skill Setup Guide

Quick setup guide for the ailey-confluence skill.

## Prerequisites

- Node.js 18+ installed
- Access to Atlassian Confluence (Cloud or Data Center)
- Confluence API token or password

## 1. Generate API Token

**Recommended**: Use API tokens instead of passwords for better security.

1. Visit: https://id.atlassian.com/manage-profile/security/api-tokens
2. Click **"Create API token"**
3. Give it a name (e.g., "ailey-confluence")
4. Click **"Create"**
5. **Copy the token** (you won't see it again)

## 2. Configure Environment Variables

Create a `.env` file in one of these locations:

- **Global** (all projects): `~/.vscode/.env`
- **Project** (this repo): `.env`
- **Local** (gitignored): `.env.local`

```bash
# Your Confluence instance URL (Cloud or Data Center)
# Cloud: https://your-domain.atlassian.net
# Data Center: https://confluence.your-company.com
ATLASSIAN_URL=https://your-domain.atlassian.net

# Your Confluence email/username
ATLASSIAN_USER=your-email@example.com

# API token (recommended) - from step 1
ATLASSIAN_APIKEY=your-api-token-here

# OR password (less secure)
# ATLASSIAN_PASSWORD=your-password
```

**Important**: 
- Use `ATLASSIAN_APIKEY` (not `ATLASSIAN_PASSWORD`) for Cloud
- Do NOT include `/wiki` in the URL
- Add `.env` and `.env.local` to `.gitignore`

## 3. Install Dependencies

```bash
cd .github/skills/ailey-confluence
npm install
```

Expected output:
```
added 138 packages, and audited 139 packages in 18s

found 0 vulnerabilities
```

## 4. Test Connection

```bash
npm run confluence test
```

Expected output:
```
✅ Connection successful!
   Connected to: https://your-domain.atlassian.net
   Spaces found: 5
```

If you see an error:
- ❌ Check `ATLASSIAN_URL` is correct
- ❌ Verify `ATLASSIAN_USER` and `ATLASSIAN_APIKEY`
- ❌ Ensure API token is valid (not expired)
- ❌ Check network connectivity

## 5. Quick Start Examples

### List Available Spaces

```bash
npm run confluence query spaces
```

### Create a Simple Page

```bash
npm run confluence crud create \
  --space YOUR_SPACE_KEY \
  --title "Test Page" \
  --content "<p>This is a test page created by ailey-confluence</p>"
```

Replace `YOUR_SPACE_KEY` with your actual space key (e.g., `DEV`, `DOCS`, `KB`).

### Import a Markdown File

```bash
npm run confluence import file \
  --file README.md \
  --space YOUR_SPACE_KEY \
  --title "Project Documentation"
```

### Export a Page to Markdown

First, get a page ID by listing pages:

```bash
npm run confluence crud list --space YOUR_SPACE_KEY
```

Then export:

```bash
npm run confluence export page \
  --id PAGE_ID \
  --output exported.md \
  --format markdown
```

### Search for Pages

```bash
npm run confluence query search \
  --query 'space = "YOUR_SPACE_KEY" AND type = page'
```

## 6. Common Issues

### Issue: "Cannot find module 'dotenv'"

**Cause**: Dependencies not installed

**Solution**:
```bash
cd .github/skills/ailey-confluence
npm install
```

### Issue: "401 Unauthorized"

**Cause**: Invalid credentials

**Solution**:
1. Verify `ATLASSIAN_USER` is your email (for Cloud) or username (for Data Center)
2. Regenerate API token at https://id.atlassian.com/manage-profile/security/api-tokens
3. Update `ATLASSIAN_APIKEY` in `.env`
4. Test with: `npm run confluence test`

### Issue: "404 Not Found"

**Cause**: Incorrect URL or space doesn't exist

**Solution**:
1. Check `ATLASSIAN_URL` does NOT include `/wiki`
   - ✅ Correct: `https://your-domain.atlassian.net`
   - ❌ Wrong: `https://your-domain.atlassian.net/wiki`
2. Verify space key exists: `npm run confluence query spaces`

### Issue: "403 Forbidden"

**Cause**: Insufficient permissions

**Solution**:
- Verify you have permissions in the target space
- For creating pages: Need "Create" permission
- For updating pages: Need "Edit" permission
- For deleting pages: Need "Delete" permission
- Ask your Confluence admin to grant permissions

### Issue: "version: Stale page version"

**Cause**: Page was updated by someone else since you last fetched it

**Solution**: Get the latest version before updating:

```bash
# Get current version
npm run confluence crud get --id PAGE_ID

# Update with correct version
npm run confluence crud update \
  --id PAGE_ID \
  --title "Updated Title" \
  --file updated-content.html
```

### Issue: Rate Limiting

**Cause**: Too many requests in short time

**Solution**:
- Reduce batch sizes when importing directories
- Add delays between requests
- Use CQL queries to filter instead of retrieving all pages

## 7. Environment Variable Priority

The skill checks for environment variables in this order:

1. `~/.vscode/.env` (global, shared across all projects)
2. `.env` (project root)
3. `.env.local` (gitignored, local overrides)

**Example Setup:**

**`~/.vscode/.env`** (global defaults):
```bash
ATLASSIAN_URL=https://company.atlassian.net
ATLASSIAN_USER=john.doe@company.com
ATLASSIAN_APIKEY=global-token-here
```

**`.env.local`** (project-specific override):
```bash
# Override for this project only
ATLASSIAN_APIKEY=project-specific-token
```

## 8. Next Steps

- Read full documentation: [SKILL.md](SKILL.md)
- Learn CQL: [references/cql-guide.md](references/cql-guide.md)
- Understand Storage Format: [references/storage-format-guide.md](references/storage-format-guide.md)
- Explore examples in SKILL.md workflows

## 9. Support

For issues:
1. Check troubleshooting section above
2. Review [SKILL.md](SKILL.md) troubleshooting section
3. Test connection: `npm run confluence test`
4. Verify credentials are correct
5. Check Confluence permissions

---

**Quick Reference:**

```bash
# Test
npm run confluence test

# CRUD
npm run confluence crud <create|get|update|delete|list> [options]

# Import
npm run confluence import <file|directory|markdown> [options]

# Export
npm run confluence export <page|space|search|attachments> [options]

# Query
npm run confluence query <search|pages|recent|labels|spaces|examples> [options]
```

---
