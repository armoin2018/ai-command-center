---
id: ailey-com-sharepoint
name: SharePoint Online Integration
description: SharePoint Online integration for document library management, list operations, site provisioning, page creation, and search via Microsoft Graph API and SharePoint REST API. Supports site-scoped and tenant-scoped operations with delegated and application permissions.
keywords:
  - sharepoint
  - microsoft
  - document
  - library
  - list
  - site
  - graph-api
  - integration
tools:
  - "@microsoft/microsoft-graph-client"
  - "@azure/identity"
  - "@pnp/sp"
  - commander
  - dotenv
---

# SharePoint Online Integration

Complete SharePoint Online integration for AI-ley enabling site provisioning, document library management, list CRUD operations, modern page creation, content search, and permission management via the Microsoft Graph API and SharePoint REST API. Automatically detects SharePoint plan tier and maps available features.

## Overview

**Setup Time:** 20-30 minutes
**Difficulty:** Intermediate
**API Reference:** [Microsoft Graph — SharePoint API](https://learn.microsoft.com/en-us/graph/api/resources/sharepoint)
**SharePoint REST Reference:** [SharePoint REST API](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)

## License Tier Detection

### Tier 1: SharePoint Online Plan 1
**When:** Standalone Plan 1 or included with Microsoft 365 Business Basic / E1
**Features:**
- ✅ Team sites and communication sites
- ✅ Document libraries with versioning (up to 500 versions)
- ✅ Lists with standard column types
- ✅ 1 TB base + 10 GB/user licensed storage
- ✅ Content search within site collections
- ✅ External sharing (configurable)
- ❌ Advanced compliance (DLP, eDiscovery)
- ❌ In-place records management
- ❌ Advanced search customization

**Cost:** $5/user/month | **Storage:** 1 TB + 10 GB/user

### Tier 2: SharePoint Online Plan 2
**When:** Standalone Plan 2 or included with Microsoft 365 E3 / E5
**Features:**
- ✅ All Plan 1 features
- ✅ Advanced compliance (DLP policies, eDiscovery)
- ✅ In-place records management and retention
- ✅ Advanced search with result sources and query rules
- ✅ Business Connectivity Services (BCS)
- ✅ Unlimited versioning

**Cost:** $10/user/month | **Storage:** 1 TB + 10 GB/user

## Feature Availability Matrix

| Feature | Plan 1 | Plan 2 |
|---------|--------|--------|
| Team Sites | ✅ | ✅ |
| Communication Sites | ✅ | ✅ |
| Document Libraries | ✅ | ✅ |
| Lists | ✅ | ✅ |
| Content Search | ✅ | ✅ |
| External Sharing | ✅ | ✅ |
| Modern Pages | ✅ | ✅ |
| Versioning | 500 max | Unlimited |
| DLP Policies | ❌ | ✅ |
| eDiscovery | ❌ | ✅ |
| In-Place Records Mgmt | ❌ | ✅ |
| Advanced Search | ❌ | ✅ |
| BCS | ❌ | ✅ |

## Authentication

### Permission Models

| Permission Type | Use Case | Consent |
|----------------|----------|---------|
| Delegated | Act on behalf of signed-in user | User or admin consent |
| Application | Daemon / background service | Admin consent only |

### Required Graph API Permissions

```
# Delegated Permissions
Sites.Read.All                  - Read site collections
Sites.ReadWrite.All             - Read/write sites, lists, libraries
Files.ReadWrite.All             - Upload/download documents
User.Read                       - Read own profile

# Application Permissions
Sites.Read.All                  - Read all site collections
Sites.ReadWrite.All             - Full control of all sites
Files.ReadWrite.All             - Full file access
Sites.FullControl.All           - Full control (admin operations)
```

### SharePoint REST API Authentication

The SharePoint REST API uses the same Azure AD tokens. Base URL: `https://{tenant}.sharepoint.com/_api/...`

### Azure AD App Registration

1. Go to [Azure Portal](https://portal.azure.com/) → **Azure Active Directory** → **App registrations** → **New registration**
2. Set redirect URI (e.g., `http://localhost:3000/auth/callback`)
3. Under **API permissions** → **Add a permission** → **Microsoft Graph** → add `Sites.ReadWrite.All`, `Files.ReadWrite.All`
4. Optionally add **SharePoint** → `Sites.FullControl.All` for tenant-scoped operations
5. Under **Certificates & secrets** → **New client secret** → copy value
6. Note the **Application (client) ID** and **Directory (tenant) ID**

## Installation & Setup

### Step 1: Install & Configure

```bash
cd .github/skills/ailey-com-sharepoint
npm install
cp .env.example .env
```

```env
# Required — Azure AD App Registration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret

# Required — SharePoint tenant
SHAREPOINT_TENANT=your-tenant-name
SHAREPOINT_SITE_URL=https://your-tenant.sharepoint.com/sites/your-site

# Optional — Defaults
SHAREPOINT_DEFAULT_SITE=your-default-site-id
SHAREPOINT_DEFAULT_LIBRARY=Documents
```

### Step 2: Verify Setup

```bash
npm run detect          # Detect SharePoint plan tier
npm run auth -- verify  # Verify Graph API credentials
npm run diagnose        # Full diagnostics
```

## Commands Reference

> **Note:** All commands below are stubs. Full implementations are planned for **Sprint 21**.

### Site Operations

```bash
# Coming in Sprint 21
npm run site -- list                                  # List accessible sites
npm run site -- create --name "Project Alpha" --type team --alias project-alpha
npm run site -- info --site <site-id>
```

**Planned API Methods:** `GET /sites`, `POST /sites` (via admin API), `GET /sites/{site-id}`

### Document Library Operations

```bash
# Coming in Sprint 21
npm run library -- list --site <site-id>
npm run library -- create --site <site-id> --name "Design Assets" --description "Design files"
```

**Planned API Methods:** `GET /sites/{site-id}/lists?$filter=list/template eq 'documentLibrary'`, `POST /sites/{site-id}/lists`

### Document Operations

```bash
# Coming in Sprint 21
npm run document -- upload --site <site-id> --library Documents --path ./report.pdf
npm run document -- download --site <site-id> --library Documents --file "report.pdf" --output ./
npm run document -- list --site <site-id> --library Documents --top 50
```

**Planned API Methods:** `PUT /sites/{site-id}/drive/root:/{path}:/content`, `GET /sites/{site-id}/drive/root:/{path}:/content`, `GET /sites/{site-id}/drive/root/children`

### List Operations

```bash
# Coming in Sprint 21
npm run list -- create --site <site-id> --name "Tasks" --template genericList
npm run list -- items --site <site-id> --list <list-id> --top 100
npm run list -- add-item --site <site-id> --list <list-id> --fields '{"Title":"New Task","Status":"Open"}'
```

**Planned API Methods:** `POST /sites/{site-id}/lists`, `GET /sites/{site-id}/lists/{list-id}/items`, `POST /sites/{site-id}/lists/{list-id}/items`

### Page Operations

```bash
# Coming in Sprint 21
npm run page -- create --site <site-id> --name "Welcome" --layout article
npm run page -- list --site <site-id>
```

### Search Operations

```bash
# Coming in Sprint 21
npm run search -- query "quarterly report" --site <site-id>
```

### Permission Operations

```bash
# Coming in Sprint 21
npm run permission -- grant --site <site-id> --user user@example.com --role write
npm run permission -- list --site <site-id>
```

## PnP/SP Integration

[PnPjs](https://pnp.github.io/pnpjs/) (`@pnp/sp`) provides a fluent API for SharePoint operations that simplifies complex REST calls.

### Example Usage (Planned)

```typescript
import { spfi, SPFx } from "@pnp/sp";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";

const sp = spfi("https://tenant.sharepoint.com/sites/mysite").using(SPFx(context));

// Get list items
const items = await sp.web.lists.getByTitle("Tasks").items
  .select("Title", "Status").filter("Status eq 'Active'").top(50)();

// Add item
await sp.web.lists.getByTitle("Tasks").items.add({ Title: "New Task", Status: "Open" });
```

**PnPjs Docs:** [pnp.github.io/pnpjs](https://pnp.github.io/pnpjs/)

## Graph API Reference

| Operation | Method | Endpoint |
|-----------|--------|----------|
| List sites | GET | `/sites?search=*` |
| Get site | GET | `/sites/{site-id}` |
| List drives | GET | `/sites/{site-id}/drives` |
| Upload file (small) | PUT | `/sites/{site-id}/drive/root:/{path}:/content` |
| Upload file (large) | POST | `/sites/{site-id}/drive/root:/{path}:/createUploadSession` |
| Download file | GET | `/sites/{site-id}/drive/items/{item-id}/content` |
| List lists | GET | `/sites/{site-id}/lists` |
| Get list items | GET | `/sites/{site-id}/lists/{list-id}/items` |
| Create list item | POST | `/sites/{site-id}/lists/{list-id}/items` |
| Create page | POST | `/sites/{site-id}/pages` |
| Search | POST | `/search/query` |
| List permissions | GET | `/sites/{site-id}/permissions` |
| Grant permission | POST | `/sites/{site-id}/permissions` |

**Base URL:** `https://graph.microsoft.com/v1.0`

## Roadmap

### Sprint 21 — Planned Features

- [ ] Site discovery and enumeration (list, info, search)
- [ ] Document library management (list, create)
- [ ] Document upload/download/list with progress tracking
- [ ] List CRUD operations (create, read items, add items)
- [ ] Modern page creation and listing
- [ ] Content search (site-scoped and tenant-scoped)
- [ ] Permission grant and listing
- [ ] Plan tier auto-detection
- [ ] PnPjs integration for advanced operations
- [ ] CLI with commander-based subcommands
- [ ] Error handling with automatic setup guidance

## Resources

- **Graph API — SharePoint:** [learn.microsoft.com/graph/sharepoint-concept-overview](https://learn.microsoft.com/en-us/graph/sharepoint-concept-overview)
- **Graph Explorer:** [developer.microsoft.com/graph/graph-explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- **PnPjs:** [pnp.github.io/pnpjs](https://pnp.github.io/pnpjs/)
- **SharePoint REST API:** [learn.microsoft.com/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service](https://learn.microsoft.com/en-us/sharepoint/dev/sp-add-ins/get-to-know-the-sharepoint-rest-service)
- **Throttling:** [learn.microsoft.com/sharepoint/dev/how-to-avoid-getting-throttled](https://learn.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online)

## Support

For issues:
1. Run `npm run diagnose` for diagnostics
2. Check [Microsoft Graph Documentation](https://learn.microsoft.com/en-us/graph/)
3. Review [SharePoint Dev Documentation](https://learn.microsoft.com/en-us/sharepoint/dev/)
4. Ask on [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/tags/sharepoint)

---

version: 0.1.0
updated: 2026-02-21
reviewed: 2026-02-21
score: 3.0

---
