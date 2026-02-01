# ailey-com-email

Manage emails using standard protocols (IMAP/SMTP/POP3). Works with Gmail, Yahoo, Outlook.com, and custom email servers.

## Quick Start

```bash
# Setup
npm install
npm run email setup  # Configuration guide
npm run email test   # Test connection

# Send email
npm run email send send -t user@example.com -s "Test" -b "Hello"

# Read inbox
npm run email read list --limit 10

# List folders
npm run email folders list
```

## Features

- ✅ Send emails via SMTP
- ✅ Read emails via IMAP
- ✅ Email templates with Handlebars
- ✅ Bulk email operations from CSV
- ✅ Download attachments
- ✅ Folder management
- ✅ Works with any IMAP/SMTP provider
- ✅ Built-in setup instructions

## Prerequisites

- Node.js 18+
- Email account with IMAP/SMTP access
- App password (for Gmail, Yahoo)

See [SETUP.md](SETUP.md) for provider-specific configuration.

## Provider Support

- ✅ Gmail (requires app password)
- ✅ Yahoo Mail (requires app password)
- ✅ Outlook.com / Hotmail
- ✅ iCloud Mail
- ✅ Custom IMAP/SMTP servers

## Commands

### Setup

```bash
npm run email setup   # Show setup guide
npm run email test    # Test connection
```

### Email

```bash
# Send
npm run email send send -t TO -s SUBJECT -b BODY
npm run email send send --attach file.pdf
npm run email send template --template FILE --data DATA.json

# Bulk
npm run email send bulk --csv FILE.csv --delay 2000

# Read
npm run email read list --folder INBOX --limit 20
npm run email read show -u UID --save-attachments ./downloads
npm run email read mark -u UID
npm run email read delete -u UID --confirm
npm run email read move -u UID --to Archive

# Folders
npm run email folders list
```

## Environment Variables

**Location:** `~/.vscode/.env` (global) or `.env` (project)

```bash
# For Gmail
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**See [SETUP.md](SETUP.md) for other providers.**

## TypeScript API

```typescript
import { EmailClient } from './scripts/email-client.js';

const client = new EmailClient();

// Send email
await client.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  text: 'Hello!',
  attachments: [{
    filename: 'report.pdf',
    path: './report.pdf'
  }]
});

// Read emails
const emails = await client.searchEmails({
  folder: 'INBOX',
  unseen: true,
  limit: 10
});

// List folders
const folders = await client.listFolders();
```

## Email Templates

**Handlebars Template:**
```html
<h1>Welcome {{name}}!</h1>
<p>Your account: {{email}}</p>
```

**Data:**
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Send:**
```bash
npm run email send template -t john@example.com --template welcome.hbs --data data.json
```

## Bulk Email CSV

**recipients.csv:**
```csv
email,name,subject,body
john@example.com,John,Hello,Welcome!
jane@example.com,Jane,Hello,Welcome!
```

**Send:**
```bash
npm run email send bulk --csv recipients.csv --delay 1000
```

## Troubleshooting

**Connection failed:**
```bash
npm run email setup
# Follow provider-specific instructions
```

**Gmail "Invalid credentials":**
- Use App Password, not regular password
- Enable 2-Step Verification
- Generate app password at: https://myaccount.google.com/apppasswords

**Yahoo "Invalid credentials":**
- Must use App Password
- Generate at: https://login.yahoo.com/account/security

## Documentation

- [SKILL.md](SKILL.md) - Complete workflows and examples
- [SETUP.md](SETUP.md) - Provider-specific setup guides
- [references/imap-commands.md](references/imap-commands.md) - IMAP reference
- [references/smtp-setup.md](references/smtp-setup.md) - SMTP configuration

## Limitations

- IMAP does not support calendars/contacts (use ailey-com-outlook for those)
- Rate limits vary by provider
- Gmail free: ~500 emails/day
- Attachment size: typically 25-50 MB max

## License

See main project LICENSE.

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.5
---
