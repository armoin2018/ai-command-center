# ailey-outlook-email

Manage Outlook/Office 365 emails, calendar events, and contacts via Microsoft Graph API.

## Quick Start

```bash
# Setup
npm install
npm run outlook setup  # Azure AD configuration guide
npm run outlook test   # Test connection

# Send email
npm run outlook send send -t user@example.com -s "Test" -b "Hello"

# Read inbox
npm run outlook read list --top 10

# Create calendar event
npm run outlook calendar create -s "Meeting" --start "2026-02-01 10:00" --end "2026-02-01 11:00"

# Search contacts
npm run outlook contacts search -q "John"
```

## Features

- ✅ Send emails with attachments
- ✅ Email templates with Handlebars
- ✅ Bulk email operations
- ✅ Read and search emails
- ✅ Download attachments
- ✅ Calendar events with Teams meetings
- ✅ Contact management
- ✅ Folder organization
- ✅ Built-in setup instructions

## Prerequisites

- Node.js 18+
- Azure AD app registration
- Microsoft Graph API permissions

See [SETUP.md](SETUP.md) for complete Azure AD configuration.

## Commands

### Setup

```bash
npm run outlook setup   # Show setup guide
npm run outlook test    # Test connection
```

### Email

```bash
# Send
npm run outlook send send -t TO -s SUBJECT -b BODY
npm run outlook send send --attach file.pdf
npm run outlook send template --template FILE --data DATA.json

# Bulk
npm run outlook send bulk --csv FILE.csv --delay 2000

# Read
npm run outlook read list --folder inbox --top 20
npm run outlook read show -i MESSAGE_ID --save-attachments ./downloads
npm run outlook read mark -i MESSAGE_ID
npm run outlook read delete -i MESSAGE_ID --confirm
npm run outlook read move -i MESSAGE_ID --to FOLDER_ID
```

### Calendar

```bash
npm run outlook calendar create -s "Meeting" --start "2026-02-01 10:00" --end "2026-02-01 11:00"
npm run outlook calendar list --days 7
npm run outlook calendar show -i EVENT_ID
npm run outlook calendar update -i EVENT_ID -s "New Title"
npm run outlook calendar delete -i EVENT_ID --confirm

# Teams meeting
npm run outlook calendar create -s "Virtual Meeting" --start "2026-02-01 14:00" --end "2026-02-01 15:00" --online
```

### Contacts

```bash
npm run outlook contacts search -q "John"
npm run outlook contacts create -n "John Doe" -e john@example.com -p "+1-555-0100"
npm run outlook contacts show -i CONTACT_ID
npm run outlook contacts delete -i CONTACT_ID --confirm
```

### Folders

```bash
npm run outlook folders list
npm run outlook folders create -n "Projects"
npm run outlook folders delete -i FOLDER_ID --confirm
```

## Environment Variables

**Location:** `~/.vscode/.env` (global) or `.env` (project)

```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
```

## TypeScript API

```typescript
import { OutlookClient } from './scripts/outlook-client.js';

const client = new OutlookClient();

// Send email
await client.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  body: 'Hello!',
  attachments: ['file.pdf'],
});

// Read emails
const emails = await client.readEmails({
  folder: 'inbox',
  from: 'boss@example.com',
  isRead: false,
  top: 10,
});

// Create calendar event
await client.createEvent({
  subject: 'Meeting',
  start: new Date('2026-02-01T10:00:00'),
  end: new Date('2026-02-01T11:00:00'),
  isOnline: true,
});

// Search contacts
const contacts = await client.searchContacts('John');
```

## Email Templates

**Handlebars Template (templates/welcome.hbs):**
```html
<h1>Welcome {{name}}!</h1>
<p>Your account: {{email}}</p>
```

**Data (data.json):**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Send:**
```bash
npm run outlook send template -t john@example.com --template templates/welcome.hbs --data data.json -s "Welcome {{name}}"
```

## Bulk Email CSV

**recipients.csv:**
```csv
email,name,subject,body
john@example.com,John,Hello John,Welcome!
jane@example.com,Jane,Hello Jane,Welcome!
```

**Send:**
```bash
npm run outlook send bulk --csv recipients.csv --delay 1000
```

## Permission Requirements

- `Mail.Read` - Read emails
- `Mail.ReadWrite` - Manage emails
- `Mail.Send` - Send emails
- `Calendars.ReadWrite` - Manage calendar
- `Contacts.ReadWrite` - Manage contacts

See [SETUP.md](SETUP.md) for permission configuration.

## Troubleshooting

**Connection failed:**
```bash
npm run outlook setup
# Follow Azure AD setup instructions
```

**Permission errors:**
- Verify permissions in Azure portal
- Ensure admin consent granted
- Wait 5-10 minutes for propagation

**Rate limiting:**
```bash
# Add delays for bulk operations
npm run outlook send bulk --csv file.csv --delay 2000
```

## Documentation

- [SKILL.md](SKILL.md) - Complete workflows and examples
- [SETUP.md](SETUP.md) - Azure AD configuration guide
- [references/graph-api.md](references/graph-api.md) - Microsoft Graph API reference
- [references/permissions.md](references/permissions.md) - Permission details

## Integration Examples

### With ailey-tag-n-rag
```bash
# Index emails
npm run outlook read list --format json -o emails.json
npm run rag tag -i emails.json -t "email" -c "Email Archive"
```

### CI/CD Notifications
```yaml
- run: |
    npm run outlook send send \
      -t team@example.com \
      -s "Build ${{ github.run_number }}" \
      -b "Status: ${{ job.status }}"
```

## License

See main project LICENSE.

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.5
---
