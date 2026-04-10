---
id: ailey-com-email
name: Standard Email Manager (IMAP/SMTP)
description: Send, read, and manage emails using standard protocols (IMAP, SMTP, POP3). Works with Gmail, Yahoo, Outlook.com, and custom email servers. Includes template support, bulk operations, attachment handling, and folder management. Automatically provides setup instructions on connection failure.
keywords:
  - email
  - imap
  - smtp
  - pop3
  - gmail
  - yahoo
  - mail
  - standard-protocols
tools:
  - imap
  - smtp
  - nodemailer
  - typescript
  - cli
---

# Standard Email Manager (IMAP/SMTP)

Comprehensive email management using standard protocols (IMAP, SMTP, POP3). Works with any email provider supporting these protocols - Gmail, Yahoo, Outlook.com, custom servers, etc.

## Overview

This skill provides:

- **Email Operations**: Send, read, search, delete, move emails
- **SMTP Sending**: Compatible with any SMTP server
- **IMAP Reading**: Full mailbox access and management
- **Email Templates**: Handlebars templates for personalized emails
- **Bulk Operations**: Send multiple emails with CSV data
- **Attachment Handling**: Upload and download attachments
- **Folder Management**: List and organize mailbox folders
- **Provider Agnostic**: Works with Gmail, Yahoo, Outlook.com, custom servers

## When to Use

Use this skill when:

- Working with standard email providers (Gmail, Yahoo, etc.)
- Need email automation without cloud-only dependencies
- Managing emails via IMAP/SMTP protocols
- Bulk email operations with templates
- Downloading attachments from emails
- Working with custom email servers
- **Automatic setup help**: Detects connection failures and provides setup instructions

## Installation

```bash
cd .github/skills/ailey-com-email
npm install
```

**Prerequisites:**
- Node.js 18+
- Email account with IMAP/SMTP access
- App password (for Gmail, Yahoo)

## Quick Start

```bash
# Show setup instructions
npm run email setup

# Test connection
npm run email test

# Send email
npm run email send send -t user@example.com -s "Test" -b "Hello"

# Read emails
npm run email read list --folder INBOX --limit 10

# List folders
npm run email folders list
```

## Workflow 1: Send Emails

Send emails via SMTP to any recipient.

### Basic Email

```bash
# Simple text email
npm run email send send \
  -t user@example.com \
  -s "Project Update" \
  -b "The project is on track."

# HTML email
npm run email send send \
  -t user@example.com \
  -s "Report" \
  -b "<h1>Q1 Results</h1><p>Revenue: $1M</p>" \
  --html

# With CC and BCC
npm run email send send \
  -t user@example.com \
  --cc manager@example.com \
  --bcc tracking@example.com \
  -s "Status Update" \
  -b "Project status attached."

# From file
npm run email send send \
  -t user@example.com \
  -s "Documentation" \
  --file email-body.txt
```

### With Attachments

```bash
# Single attachment
npm run email send send \
  -t user@example.com \
  -s "Report" \
  -b "See attached report." \
  --attach report.pdf

# Multiple attachments
npm run email send send \
  -t user@example.com \
  -s "Files" \
  -b "See attachments." \
  --attach "doc1.pdf,doc2.xlsx,presentation.pptx"
```

### Template Emails

```bash
# Create template (welcome.hbs)
cat > templates/welcome.hbs << 'EOF'
<h1>Welcome {{name}}!</h1>
<p>Thank you for signing up with {{company}}.</p>
<p>Your account: {{email}}</p>
EOF

# Create data
cat > data.json << 'EOF'
{
  "name": "John Doe",
  "company": "Acme Corp",
  "email": "john@example.com"
}
EOF

# Send
npm run email send template \
  -t john@example.com \
  --template templates/welcome.hbs \
  --data data.json \
  -s "Welcome to {{company}}"
```

### Bulk Emails

```bash
# Create CSV
cat > recipients.csv << 'EOF'
email,name,subject,body
john@example.com,John,Hello John,Welcome!
jane@example.com,Jane,Hello Jane,Welcome!
EOF

# Send bulk
npm run email send bulk \
  --csv recipients.csv \
  --delay 2000

# Bulk with template
npm run email send bulk \
  --csv recipients.csv \
  --template templates/welcome.hbs \
  --attach onboarding.pdf
```

### TypeScript API

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
```

## Workflow 2: Read and Search Emails

Read mailbox content via IMAP with filtering and search.

### List Emails

```bash
# Inbox (default)
npm run email read list

# Specific folder
npm run email read list --folder Sent
npm run email read list --folder Drafts

# Filter by sender
npm run email read list --from boss@example.com

# Filter by subject
npm run email read list --subject "invoice"

# Unread only
npm run email read list --unseen

# Limit results
npm run email read list --limit 50

# JSON output
npm run email read list --format json -o emails.json
```

### View Email Details

```bash
# Show email (get UID from list command)
npm run email read show -u 12345

# Download attachments
npm run email read show \
  -u 12345 \
  --save-attachments ./downloads/
```

### Manage Emails

```bash
# Mark as read
npm run email read mark -u 12345

# Mark as unread
npm run email read mark -u 12345 --unread

# Delete email
npm run email read delete -u 12345 --confirm

# Move to folder
npm run email read move -u 12345 --to Archive
```

### TypeScript API

```typescript
// Search emails
const emails = await client.searchEmails({
  folder: 'INBOX',
  from: 'boss@example.com',
  unseen: true,
  limit: 10
});

// Get specific email
const email = await client.getEmail(12345);

// Download attachment
await client.downloadAttachment(
  12345,
  'report.pdf',
  './downloads/report.pdf'
);

// Mark as read
await client.markAsRead(12345, true);

// Delete email
await client.deleteEmail(12345);
```

## Workflow 3: Folder Management

List and organize mailbox folders via IMAP.

### List Folders

```bash
npm run email folders list
```

**Output:**
```
=== Mailbox Folders ===

INBOX
Sent
Drafts
Trash
Archive
Projects/2026
Projects/2025

Total: 7 folders
```

### TypeScript API

```typescript
// List all folders
const folders = await client.listFolders();

folders.forEach(folder => {
  console.log(folder.name, folder.attributes);
});
```

## Provider Configuration

### Gmail

```bash
# ~/.vscode/.env or .env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

**Requirements:**
- Enable IMAP in Gmail settings
- Generate App Password (not regular password)
- 2-Step Verification must be enabled

**App Password:**
1. https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Copy 16-character password
4. Use as EMAIL_PASSWORD

### Outlook.com / Hotmail

```bash
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Yahoo Mail

```bash
IMAP_HOST=imap.mail.yahoo.com
IMAP_PORT=993
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

**Requires App Password:**
- Account Settings → Security → Generate app password

### Custom Server

```bash
IMAP_HOST=mail.yourserver.com
IMAP_PORT=993
SMTP_HOST=mail.yourserver.com
SMTP_PORT=587
EMAIL_USER=your-email@yourserver.com
EMAIL_PASSWORD=your-password
```

## Advanced Usage

### Environment Configuration

**Priority:** `.env.local` > `.env` > `~/.vscode/.env`

```bash
# Global config (~/.vscode/.env)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=user@gmail.com
IMAP_PASSWORD=app-password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=user@gmail.com
SMTP_PASSWORD=app-password

# Or use shared credentials
EMAIL_USER=user@gmail.com
EMAIL_PASSWORD=app-password
```

### Error Handling

```typescript
try {
  await client.sendEmail(options);
} catch (error) {
  if (error.message.includes('IMAP not configured')) {
    console.error('Run: npm run email setup');
  } else if (error.message.includes('Invalid credentials')) {
    console.error('Check EMAIL_USER and EMAIL_PASSWORD');
  } else {
    console.error('Error:', error);
  }
}
```

## Integration

### With ailey-tools-tag-n-rag

Index email content:

```bash
# Save emails to JSON
npm run email read list --format json -o emails.json

# Index in RAG
npm run rag tag -i emails.json -t "email,archive"
```

### CI/CD Notifications

```yaml
- name: Send build notification
  run: |
    cd .github/skills/ailey-com-email
    npm run email send send \
      -t team@example.com \
      -s "Build ${{ github.run_number }}" \
      -b "Status: ${{ job.status }}"
```

## Troubleshooting

### Connection Failures

**Automatic Help:**
```bash
npm run email test
# Shows setup instructions if connection fails
```

**Manual Setup:**
```bash
npm run email setup
# Displays complete configuration guide
```

### Common Issues

**Error:** `Invalid credentials`

**Solution:**
- Gmail/Yahoo: Use App Password, not regular password
- Verify EMAIL_USER and EMAIL_PASSWORD in .env
- Check 2-Step Verification enabled (Gmail)

**Error:** `Connection timeout`

**Solution:**
- Verify IMAP_HOST and SMTP_HOST
- Check ports: IMAP 993, SMTP 587
- Disable VPN temporarily
- Check firewall settings

**Error:** `IMAP not enabled`

**Solution (Gmail):**
1. Gmail Settings → Forwarding and POP/IMAP
2. Enable IMAP
3. Save changes
4. Wait 5 minutes, test again

## Limitations

- IMAP does not support calendar/contacts (use ailey-com-outlook for those)
- Some providers limit IMAP access (check provider documentation)
- Rate limits vary by provider (Gmail: ~500 emails/day for free accounts)
- Attachment size limits (typically 25-50 MB)

## Best Practices

1. **App Passwords**: Always use app-specific passwords for Gmail/Yahoo
2. **Rate Limits**: Add delays for bulk operations (--delay 2000)
3. **Attachments**: Keep under 25 MB total
4. **Security**: Store credentials in environment files, not code
5. **Folders**: Use standard folder names (INBOX, Sent, Trash)

## References

- [SETUP.md](SETUP.md) - Complete setup guide for all providers
- [references/imap-commands.md](references/imap-commands.md) - IMAP protocol reference
- [references/smtp-setup.md](references/smtp-setup.md) - SMTP configuration guide

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.5
---
