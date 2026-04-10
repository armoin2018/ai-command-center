---
id: wp-site
name: wpSite
description: Get WordPress site information, detect account tier, verify API credentials, and run diagnostics.
keywords: [wordpress, site, info, tier, status, diagnostics, health]
tools: [execute, read, edit, search]
agent: AI-ley WordPress
---

## References

**Skill:** `skills/ailey-web-wordpress/SKILL.md`

**Persona:** `personas/wordpress-developer.md`

## Task

WordPress site information and diagnostics:

### Actions

1. **Info** — Get site title, description, URL, timezone, language, and WordPress version
2. **Tier** — Detect account tier and available features (Free, Personal, Premium, Business, eCommerce, Self-Hosted, Pro)
3. **Verify** — Test API credentials and connection status
4. **Diagnose** — Run diagnostic checks (API connectivity, authentication, permissions, REST API availability)
5. **Stats** — Get site statistics and analytics (if available based on tier)

### Workflow

1. Check environment variables for WordPress credentials
2. If missing, provide clear setup instructions
3. Connect and execute the requested diagnostic or info action
4. Report results with clear status indicators
