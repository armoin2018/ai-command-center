---
id: ailey-com-outlook
name: Outlook Email and Calendar Manager
description: Send, read, and manage Outlook/Office 365 emails with attachments and templates. Create and manage calendar events, search contacts, organize folders and rules. Uses Microsoft Graph API. Automatically provides setup instructions when connection fails.
keywords:
  - outlook
  - office365
  - email
  - calendar
  - contacts
  - microsoft-graph
  - send-email
  - read-email
tools:
  - microsoft-graph-api
  - azure-ad
  - typescript
  - cli
---

# Outlook Email and Calendar Manager

Comprehensive Outlook and Office 365 integration for email management, calendar events, contacts, and folder organization via Microsoft Graph API.

## Overview

This skill provides:

- **Email Operations**: Send, read, search, delete, move emails with attachments
- **Email Templates**: Handlebars templates for personalized bulk emails
- **Calendar Management**: Create, read, update, delete events with Teams meetings
- **Contact Management**: Search, create, and manage contacts
- **Folder Organization**: Create and manage mail folders
- **Bulk Operations**: Send multiple emails with CSV data
- **Attachment Handling**: Upload and download email attachments

## When to Use

Use this skill when:

- Sending emails programmatically from Outlook/Office 365
- Reading and searching mailbox content
- Managing calendar events and meetings
- Automating email workflows
- Bulk email operations with templates
- Integrating Outlook with other tools
- **Automatic setup help**: Detects connection failures and provides setup instructions

## Installation

```bash
cd .github/skills/ailey-com-outlook
npm install
```

**Prerequisites:**
- Node.js 18+
- Azure AD app registration
- Microsoft Graph API permissions

## Quick Start

```bash
# Show setup instructions
npm run outlook setup

# Test connection
npm run outlook test

# Send email
npm run outlook send send -t user@example.com -s "Test" -b "Hello"

# Read emails
npm run outlook read list --folder inbox --top 10

# Create calendar event
npm run outlook calendar create -s "Meeting" --start "2026-02-01 10:00" --end "2026-02-01 11:00"

# Search contacts
npm run outlook contacts search -q "John"
```

## Workflow 1: Send Emails

Send emails with attachments and formatting.

### Basic Email

```bash
# Simple email
npm run outlook send send \
  -t user@example.com \
  -s "Project Update" \
  -b "The project is on track."

# HTML email
npm run outlook send send \
  -t user@example.com \
  -s "Report" \
  -b "<h1>Q1 Results</h1><p>Revenue: $1M</p>" \
  --html

# With CC and BCC
npm run outlook send send \
  -t user@example.com \
  --cc manager@example.com \
  --bcc tracking@example.com \
  -s "Status Update" \
  -b "Project status attached."

# From file
npm run outlook send send \
  -t user@example.com \
  -s "Documentation" \
  --file email-body.txt
```

### With Attachments

```bash
# Single attachment
npm run outlook send send \
  -t user@example.com \
  -s "Report" \
  -b "See attached report." \
  --attach report.pdf

# Multiple attachments
npm run outlook send send \
  -t user@example.com \
  -s "Files" \
  -b "See attachments." \
  --attach "doc1.pdf,doc2.xlsx,presentation.pptx"
```

### Template Emails

```bash
# Create template (welcome-email.hbs)
cat > templates/welcome.hbs << 'EOF'
<h1>Welcome {{name}}!</h1>
<p>Thank you for joining {{company}}.</p>
<p>Your account details:</p>
<ul>
  <li>Username: {{username}}</li>
  <li>Email: {{email}}</li>
</ul>
EOF

# Create data file
cat > data.json << 'EOF'
{
  "name": "John Doe",
  "company": "Acme Corp",
  "username": "jdoe",
  "email": "jdoe@example.com"
}
EOF

# Send template email
npm run outlook send template \
  -t jdoe@example.com \
  --template templates/welcome.hbs \
  --data data.json \
  -s "Welcome to {{company}}"
```

### Bulk Emails

```bash
# Create CSV file
cat > recipients.csv << 'EOF'
email,name,subject,body
john@example.com,John,Hello John,Welcome to the team
jane@example.com,Jane,Hello Jane,Welcome to the team
EOF

# Send bulk
npm run outlook send bulk \
  --csv recipients.csv \
  --delay 2000

# Bulk with template
npm run outlook send bulk \
  --csv recipients.csv \
  --template templates/welcome.hbs \
  --attach onboarding.pdf
```

### TypeScript API

```typescript
import { OutlookClient } from './scripts/outlook-client.js';

const client = new OutlookClient();

// Send email
await client.sendEmail({
  to: 'user@example.com',
  subject: 'Test',
  body: 'Hello!',
  attachments: ['file.pdf'],
  isHtml: false,
});

// Send to multiple recipients
await client.sendEmail({
  to: ['user1@example.com', 'user2@example.com'],
  cc: ['manager@example.com'],
  subject: 'Team Update',
  body: '<h1>Update</h1>',
  isHtml: true,
});
```

## Workflow 2: Read and Search Emails

Read mailbox content with filtering and search.

### List Emails

```bash
# Inbox (default)
npm run outlook read list

# Specific folder
npm run outlook read list --folder sent
npm run outlook read list --folder drafts

# Filter by sender
npm run outlook read list --from boss@example.com

# Filter by subject
npm run outlook read list --subject "invoice"

# Unread only
npm run outlook read list --unread

# With attachments only
npm run outlook read list --attachments

# Limit results
npm run outlook read list --top 20

# JSON output
npm run outlook read list --format json -o emails.json
```

### View Email Details

```bash
# Show email
npm run outlook read show -i MESSAGE_ID

# Download attachments
npm run outlook read show \
  -i MESSAGE_ID \
  --save-attachments ./downloads/
```

### Manage Emails

```bash
# Mark as read
npm run outlook read mark -i MESSAGE_ID

# Mark as unread
npm run outlook read mark -i MESSAGE_ID --unread

# Delete email
npm run outlook read delete -i MESSAGE_ID --confirm

# Move to folder
npm run outlook read move -i MESSAGE_ID --to FOLDER_ID
```

### TypeScript API

```typescript
// Search emails
const emails = await client.readEmails({
  folder: 'inbox',
  from: 'boss@example.com',
  subject: 'urgent',
  isRead: false,
  hasAttachments: true,
  top: 10,
});

// Get specific email
const email = await client.getEmail(messageId);

// Download attachment
await client.downloadAttachment(
  messageId,
  attachmentId,
  './downloads/file.pdf'
);

// Mark as read
await client.markAsRead(messageId, true);

// Delete email
await client.deleteEmail(messageId);
```

## Workflow 3: Calendar Management

Create and manage calendar events with Teams meetings.

### Create Events

```bash
# Basic event
npm run outlook calendar create \
  -s "Team Meeting" \
  --start "2026-02-01 10:00" \
  --end "2026-02-01 11:00"

# With location
npm run outlook calendar create \
  -s "Client Meeting" \
  --start "2026-02-01 14:00" \
  --end "2026-02-01 15:00" \
  -l "Conference Room A"

# With attendees
npm run outlook calendar create \
  -s "Project Review" \
  --start "2026-02-01 09:00" \
  --end "2026-02-01 10:00" \
  --attendees "john@example.com,jane@example.com"

# Teams online meeting
npm run outlook calendar create \
  -s "Virtual Standup" \
  --start "2026-02-01 09:00" \
  --end "2026-02-01 09:30" \
  --online
```

### List Events

```bash
# Next 7 days (default)
npm run outlook calendar list

# Specific date range
npm run outlook calendar list \
  --start 2026-02-01 \
  --end 2026-02-28

# Custom days ahead
npm run outlook calendar list --days 14
```

### Manage Events

```bash
# View details
npm run outlook calendar show -i EVENT_ID

# Update event
npm run outlook calendar update \
  -i EVENT_ID \
  -s "Updated Title" \
  -l "New Location"

# Delete event
npm run outlook calendar delete -i EVENT_ID --confirm
```

### TypeScript API

```typescript
// Create event
const event = await client.createEvent({
  subject: 'Team Meeting',
  start: new Date('2026-02-01T10:00:00'),
  end: new Date('2026-02-01T11:00:00'),
  location: 'Room A',
  attendees: ['user@example.com'],
  isOnline: true,
});

// List events
const events = await client.listEvents(
  new Date('2026-02-01'),
  new Date('2026-02-28')
);

// Update event
await client.updateEvent(eventId, {
  subject: 'New Title',
  location: 'New Location',
});

// Delete event
await client.deleteEvent(eventId);
```

## Workflow 4: Contact Management

Search and manage contacts.

### Search Contacts

```bash
# Search by name or email
npm run outlook contacts search -q "John"

# JSON output
npm run outlook contacts search -q "example.com" --format json
```

### Create Contacts

```bash
# Basic contact
npm run outlook contacts create \
  -n "John Doe" \
  -e john@example.com

# Full details
npm run outlook contacts create \
  -n "Jane Smith" \
  -e jane@example.com \
  -p "+1-555-0100" \
  -j "Senior Manager" \
  -c "Acme Corp"
```

### Manage Contacts

```bash
# View details
npm run outlook contacts show -i CONTACT_ID

# Delete contact
npm run outlook contacts delete -i CONTACT_ID --confirm
```

### TypeScript API

```typescript
// Search
const contacts = await client.searchContacts('John');

// Create
const contact = await client.createContact({
  displayName: 'John Doe',
  emailAddress: 'john@example.com',
  phoneNumber: '+1-555-0100',
  jobTitle: 'Developer',
  company: 'Acme',
});

// Delete
await client.deleteContact(contactId);
```

## Workflow 5: Folder Management

Organize emails with folders.

### List Folders

```bash
npm run outlook folders list
```

### Create Folders

```bash
# Root folder
npm run outlook folders create -n "Projects"

# Subfolder
npm run outlook folders create \
  -n "2026 Projects" \
  --parent PARENT_FOLDER_ID
```

### Delete Folders

```bash
npm run outlook folders delete -i FOLDER_ID --confirm
```

### TypeScript API

```typescript
// List folders
const folders = await client.listFolders();

// Create folder
const folder = await client.createFolder('Projects');

// Create subfolder
const subfolder = await client.createFolder(
  '2026',
  parentFolderId
);

// Delete folder
await client.deleteFolder(folderId);
```

## Advanced Usage

### Environment Configuration

**Priority:** `.env.local` > `.env` > `~/.vscode/.env`

```bash
# ~/.vscode/.env (global)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

### Authentication Types

**App-only (Service/Daemon):**
```bash
# Requires client secret
AZURE_CLIENT_SECRET=your-secret
```

**User delegation (Interactive):**
```bash
# Omit client secret
# Uses device code flow
```

### Error Handling

```typescript
try {
  await client.sendEmail(options);
} catch (error) {
  if (error.message.includes('credentials')) {
    console.error('Setup required. Run: npm run outlook setup');
  } else if (error.message.includes('permissions')) {
    console.error('Missing API permissions');
  } else {
    console.error('Error:', error);
  }
}
```

## Integration

### With ailey-tools-tag-n-rag

Index email content:

```bash
# Save emails to file
npm run outlook read list --format json -o emails.json

# Index in RAG
npm run rag tag -i emails.json -t "email,work" -c "Email Archive"
```

### CI/CD Email Notifications

```yaml
- name: Send build notification
  run: |
    cd .github/skills/ailey-com-outlook
    npm run outlook send send \
      -t team@example.com \
      -s "Build ${{ github.run_number }} complete" \
      -b "Status: ${{ job.status }}"
```

## Troubleshooting

### Connection Failures

**Automatic Help:**
```bash
npm run outlook test
# Shows setup instructions if connection fails
```

**Manual Setup:**
```bash
npm run outlook setup
# Displays step-by-step Azure AD configuration
```

### Permission Errors

Required Microsoft Graph permissions:
- `Mail.Read` - Read emails
- `Mail.ReadWrite` - Manage emails
- `Mail.Send` - Send emails
- `Calendars.ReadWrite` - Manage calendar
- `Contacts.ReadWrite` - Manage contacts

### Common Issues

**Issue:** `credentials not found`

**Solution:**
```bash
# Check environment variables
echo $AZURE_TENANT_ID
echo $AZURE_CLIENT_ID

# Add to ~/.vscode/.env
vim ~/.vscode/.env
```

**Issue:** `Rate limit exceeded`

**Solution:** Add delays between bulk operations:
```bash
npm run outlook send bulk --csv file.csv --delay 2000
```

## Best Practices

1. **API Limits**: Respect Microsoft Graph rate limits (use delays for bulk)
2. **Templates**: Use Handlebars for personalized emails
3. **Attachments**: Keep under 4 MB per attachment
4. **Security**: Store credentials in environment files, not code
5. **Error Handling**: Always check connection before bulk operations

## References

- [Microsoft Graph API](references/graph-api.md) - Complete API reference
- [Email Templates](references/email-templates.md) - Template examples
- [Permissions Guide](references/permissions.md) - Required permissions

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.6
---
