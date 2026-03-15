---
id: ailey-com-teams
name: Microsoft Teams Integration
description: Microsoft Teams integration with channel management, chat messaging, meeting scheduling, file sharing, and adaptive card support via Microsoft Graph API. Supports personal, team, and organizational scopes with delegated and application permissions.
keywords:
  - teams
  - microsoft
  - chat
  - meeting
  - channel
  - adaptive-card
  - graph-api
  - integration
tools:
  - "@microsoft/microsoft-graph-client"
  - "@azure/identity"
  - commander
  - dotenv
---

# Microsoft Teams Integration

Complete Microsoft Teams integration for AI-ley enabling team and channel management, chat messaging, meeting scheduling, file sharing, adaptive card delivery, and incoming webhook support via the Microsoft Graph API. Automatically detects Microsoft 365 license tier and maps available features.

## Overview

**Setup Time:** 20-30 minutes
**Difficulty:** Intermediate
**API Reference:** [Microsoft Graph — Teams API](https://learn.microsoft.com/en-us/graph/api/resources/teams-api-overview)
**Rate Limits:** Service-specific throttling per app + per tenant ([details](https://learn.microsoft.com/en-us/graph/throttling-limits#microsoft-teams-service-limits))

## License Tier Detection

### Tier 1: Microsoft 365 Business Basic
**When:** Business Basic license ($6/user/month)
**Features:**
- ✅ Teams chat, channels, and meetings (up to 300 participants)
- ✅ File sharing via SharePoint/OneDrive (1 TB/user)
- ✅ Incoming/outgoing webhooks
- ✅ Standard connectors and tabs
- ✅ Guest access
- ❌ Webinars and town halls
- ❌ Advanced compliance (eDiscovery, DLP)
- ❌ Teams Phone / calling plans

**Cost:** $6/user/month | **Storage:** 1 TB/user | **Meeting Cap:** 300

### Tier 2: Microsoft 365 E3
**When:** Enterprise E3 license ($36/user/month)
**Features:**
- ✅ All Business Premium features
- ✅ Unlimited meetings (up to 1,000 participants)
- ✅ eDiscovery (Standard), DLP
- ✅ Information barriers
- ✅ 5 TB/user OneDrive storage
- ❌ Teams Phone (add-on)
- ❌ Advanced eDiscovery (Premium)
- ❌ Auto-expanding archive

**Cost:** $36/user/month | **Storage:** 5 TB/user | **Meeting Cap:** 1,000


## Feature Availability Matrix

| Feature | Business Basic | E3 | E5 |
|---------|---------------|----|----|
| Chat & Channels | ✅ | ✅ | ✅ |
| Meetings | 300 | 1,000 | 1,000 |
| File Sharing | 1 TB | 5 TB | 5 TB |
| Webhooks | ✅ | ✅ | ✅ |
| Adaptive Cards | ✅ | ✅ | ✅ |
| Webinars | ❌ | ✅ | ✅ |
| DLP | ❌ | ✅ | ✅ |
| eDiscovery | ❌ | Standard | Premium |
| Teams Phone | ❌ | Add-on | ✅ |

## Authentication

### Permission Models

| Permission Type | Use Case | Consent |
|----------------|----------|---------|
| Delegated | Act on behalf of signed-in user | User or admin consent |
| Application | Daemon / background service | Admin consent only |

### Required Graph API Permissions

```
# Delegated Permissions
Team.ReadBasic.All              - Read team info
Channel.ReadBasic.All           - Read channel info
ChannelMessage.Send             - Send channel messages
Chat.ReadWrite                  - Read/write chats
OnlineMeetings.ReadWrite        - Create/manage meetings
Files.ReadWrite.All             - Upload/manage files
User.Read                       - Read own profile

# Application Permissions
Team.ReadBasic.All              - Read all teams
Channel.ReadBasic.All           - Read all channels
ChannelMessage.Read.All         - Read channel messages
Chat.Read.All                   - Read all chats
OnlineMeetings.Read.All         - Read all meetings
Files.ReadWrite.All             - Manage files
```

### Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com/) → **Azure Active Directory** → **App registrations** → **New registration**
2. Set redirect URI (e.g., `http://localhost:3000/auth/callback`)
3. Under **API permissions** → **Add a permission** → **Microsoft Graph** → add scopes above
4. Under **Certificates & secrets** → **New client secret** → copy value
5. Note the **Application (client) ID** and **Directory (tenant) ID**

## Installation & Setup

### Step 1: Install Dependencies

```bash
cd .github/skills/ailey-com-teams
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

```env
# Required — Azure AD App Registration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Optional — Incoming Webhook (no Azure AD needed)
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/...

# Optional — Defaults
TEAMS_DEFAULT_TEAM=your-default-team-id
TEAMS_DEFAULT_CHANNEL=General
```

### Step 3: Verify Setup

```bash
npm run detect          # Detect license tier
npm run auth -- verify  # Verify Graph API credentials
npm run diagnose        # Full diagnostics
```

## Commands Reference

> **Note:** All commands below are stubs. Full implementations are planned for **Sprint 21**.

### Team Operations

```bash
# Coming in Sprint 21
npm run team -- list                                  # List joined teams
npm run team -- create --name "Project Alpha" --description "Alpha team"
npm run team -- info --team <team-id>
```

**Planned API Methods:** `GET /me/joinedTeams`, `POST /teams`, `GET /teams/{id}`

### Channel Operations

```bash
# Coming in Sprint 21
npm run channel -- list --team <team-id>
npm run channel -- create --team <team-id> --name "design" --description "Design channel"
npm run channel -- message --team <team-id> --channel <channel-id> --text "Hello!"
```

**Planned API Methods:** `GET /teams/{id}/channels`, `POST /teams/{id}/channels`, `POST /teams/{id}/channels/{id}/messages`

### Chat Operations

```bash
# Coming in Sprint 21
npm run chat -- send --user user@example.com --text "Quick question"
npm run chat -- list --top 20
```

**Planned API Methods:** `POST /chats`, `GET /me/chats`, `POST /chats/{id}/messages`

### Meeting Operations

```bash
# Coming in Sprint 21
npm run meeting -- create --subject "Sprint Review" --start "2026-02-25T10:00:00Z" --end "2026-02-25T11:00:00Z"
npm run meeting -- list --top 10
```

**Planned API Methods:** `POST /me/onlineMeetings`, `GET /me/onlineMeetings`

### Adaptive Card Operations

```bash
# Coming in Sprint 21
npm run card -- send --team <team-id> --channel <channel-id> --card card.json
```

**Planned API Methods:** `POST /teams/{id}/channels/{id}/messages` with `attachments[].contentType = "application/vnd.microsoft.card.adaptive"`

### File Operations

```bash
# Coming in Sprint 21
npm run file -- upload --team <team-id> --channel <channel-id> --path ./report.pdf
npm run file -- list --team <team-id> --channel <channel-id>
```

**Planned API Methods:** `PUT /teams/{id}/channels/{id}/filesFolder/content`, `GET /teams/{id}/channels/{id}/filesFolder/children`

### Webhook Operations

```bash
# Coming in Sprint 21
npm run webhook -- send --url "$TEAMS_WEBHOOK_URL" --text "Build passed ✅"
npm run webhook -- send --url "$TEAMS_WEBHOOK_URL" --card card.json
```

**Planned API Methods:** HTTP POST to incoming webhook URL (no Graph API required)

## Adaptive Cards

Adaptive Cards are the Teams equivalent of Slack's Block Kit. They provide rich, interactive UI elements inside messages.

### Supported Card Elements

- **TextBlock** — Headings and body text with weight/size/color
- **FactSet** — Key-value pairs for structured data
- **Image** — Inline images with size and alignment
- **ColumnSet** — Multi-column layouts
- **Action.OpenUrl** — Link buttons
- **Action.Submit** — Interactive form submissions

**Designer:** [Adaptive Cards Designer](https://adaptivecards.io/designer/) | **Schema:** v1.4+

## Graph API Reference

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List joined teams | GET | `/me/joinedTeams` |
| Create team | POST | `/teams` |
| Get team | GET | `/teams/{team-id}` |
| List channels | GET | `/teams/{team-id}/channels` |
| Create channel | POST | `/teams/{team-id}/channels` |
| Send channel message | POST | `/teams/{team-id}/channels/{channel-id}/messages` |
| Create chat | POST | `/chats` |
| Send chat message | POST | `/chats/{chat-id}/messages` |
| List chats | GET | `/me/chats` |
| Create meeting | POST | `/me/onlineMeetings` |
| List meetings | GET | `/me/onlineMeetings` |
| Upload file | PUT | `/teams/{team-id}/channels/{channel-id}/filesFolder/content` |
| List files | GET | `/teams/{team-id}/channels/{channel-id}/filesFolder/children` |

**Base URL:** `https://graph.microsoft.com/v1.0`

## Roadmap

### Sprint 21 — Planned Features

- [ ] Team CRUD operations (list, create, info, archive)
- [ ] Channel management (list, create, send messages)
- [ ] 1:1 and group chat messaging
- [ ] Online meeting creation and listing
- [ ] Adaptive card builder and delivery
- [ ] File upload and listing via channel file folders
- [ ] Incoming webhook message and card delivery
- [ ] License tier auto-detection
- [ ] CLI with commander-based subcommands
- [ ] Error handling with automatic setup guidance

## Resources

- **Graph API — Teams:** [learn.microsoft.com/graph/teams-concept-overview](https://learn.microsoft.com/en-us/graph/teams-concept-overview)
- **Graph Explorer:** [developer.microsoft.com/graph/graph-explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- **Adaptive Cards:** [adaptivecards.io](https://adaptivecards.io/)
- **Teams Developer Docs:** [learn.microsoft.com/microsoftteams/platform](https://learn.microsoft.com/en-us/microsoftteams/platform/)
- **Throttling Limits:** [learn.microsoft.com/graph/throttling](https://learn.microsoft.com/en-us/graph/throttling)

## Support

For issues:
1. Run `npm run diagnose` for diagnostics
2. Check [Microsoft Graph Documentation](https://learn.microsoft.com/en-us/graph/)
3. Review [Graph API Changelog](https://developer.microsoft.com/en-us/graph/changelog)
4. Ask on [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/tags/microsoft-graph)

---

version: 0.1.0
updated: 2026-02-21
reviewed: 2026-02-21
score: 3.0

---
