# Microsoft Graph API Permissions

Complete guide to Microsoft Graph API permissions required for ailey-outlook-email.

## Overview

This skill requires **Application permissions** for server-side operations. All permissions require admin consent.

## Required Permissions

### Mail.Read

**Type:** Application  
**Admin Consent:** Required  
**Purpose:** Read mail in all mailboxes

**Grants Access To:**
- List messages in mailboxes
- Read message content
- Read message metadata (sender, subject, date)
- Access message attachments

**Used By:**
- `read-email.ts` - List and show commands
- `outlook-client.ts` - `readEmails()`, `getEmail()`

**Graph API Endpoints:**
```
GET /users/{id}/messages
GET /users/{id}/messages/{id}
GET /users/{id}/mailFolders/{id}/messages
```

---

### Mail.ReadWrite

**Type:** Application  
**Admin Consent:** Required  
**Purpose:** Read and write mail in all mailboxes

**Grants Access To:**
- All Mail.Read capabilities
- Mark messages as read/unread
- Delete messages
- Move messages between folders
- Update message properties

**Used By:**
- `read-email.ts` - Mark, delete, move commands
- `outlook-client.ts` - `markAsRead()`, `deleteEmail()`, `moveEmail()`

**Graph API Endpoints:**
```
PATCH /users/{id}/messages/{id}
DELETE /users/{id}/messages/{id}
POST /users/{id}/messages/{id}/move
```

---

### Mail.Send

**Type:** Application  
**Admin Consent:** Required  
**Purpose:** Send mail as any user

**Grants Access To:**
- Send emails from any mailbox
- Send on behalf of users
- Add attachments to sent mail

**Used By:**
- `send-email.ts` - All send commands
- `outlook-client.ts` - `sendEmail()`

**Graph API Endpoints:**
```
POST /users/{id}/sendMail
```

**Size Limits:**
- Email body: 4 MB
- Attachments: 4 MB per file
- Total request: 4 MB

---

### Calendars.ReadWrite

**Type:** Application  
**Admin Consent:** Required  
**Purpose:** Read and write calendars in all mailboxes

**Grants Access To:**
- Create calendar events
- Read event details
- Update events
- Delete events
- Create online meetings (Teams)
- Manage event attendees

**Used By:**
- `manage-calendar.ts` - All calendar commands
- `outlook-client.ts` - `createEvent()`, `listEvents()`, `updateEvent()`, `deleteEvent()`

**Graph API Endpoints:**
```
GET /users/{id}/events
POST /users/{id}/events
GET /users/{id}/events/{id}
PATCH /users/{id}/events/{id}
DELETE /users/{id}/events/{id}
```

---

### Contacts.ReadWrite

**Type:** Application  
**Admin Consent:** Required  
**Purpose:** Read and write contacts in all mailboxes

**Grants Access To:**
- Search contacts
- Create new contacts
- Read contact details
- Update contact information
- Delete contacts

**Used By:**
- `manage-contacts.ts` - All contact commands
- `outlook-client.ts` - `searchContacts()`, `createContact()`, `deleteContact()`

**Graph API Endpoints:**
```
GET /users/{id}/contacts
POST /users/{id}/contacts
GET /users/{id}/contacts/{id}
PATCH /users/{id}/contacts/{id}
DELETE /users/{id}/contacts/{id}
```

---

## Permission Comparison

### Application vs. Delegated

| Permission Type | Use Case | Requires User | Access Scope |
|----------------|----------|---------------|--------------|
| **Application** | Daemon/service | No | All mailboxes |
| **Delegated** | Interactive apps | Yes | User's mailbox only |

**This skill uses Application permissions** for automated server-side operations.

### Delegated Equivalents

If implementing user delegation (DeviceCodeCredential):

| Application | Delegated |
|------------|-----------|
| Mail.Read | Mail.Read |
| Mail.ReadWrite | Mail.ReadWrite |
| Mail.Send | Mail.Send |
| Calendars.ReadWrite | Calendars.ReadWrite |
| Contacts.ReadWrite | Contacts.ReadWrite |

## Granting Permissions

### Step 1: Add Permissions

1. Azure Portal → App registrations
2. Select your app
3. API permissions → Add a permission
4. Microsoft Graph → Application permissions
5. Search and select each permission
6. Click "Add permissions"

### Step 2: Grant Admin Consent

**Important:** Application permissions require admin consent.

1. API permissions page
2. Click "Grant admin consent for [organization]"
3. Confirm with "Yes"
4. Wait for status to show "Granted"

**Verification:**
- Status column shows green checkmark
- "Granted for [organization]" text visible

### Step 3: Wait for Propagation

- Permissions may take 5-10 minutes to propagate
- Test connection: `npm run outlook test`
- Retry if "insufficient permissions" error occurs

## Security Considerations

### Least Privilege

**Current Permissions:** All required features

**If only sending emails:**
```
Mail.Send only
```

**If only reading emails:**
```
Mail.Read only
```

**If managing calendar only:**
```
Calendars.ReadWrite only
```

### Audit Logging

Application permission usage is logged:
- Azure AD audit logs
- Microsoft 365 compliance center
- Office 365 Security & Compliance

**View Logs:**
1. Azure Portal → Azure Active Directory
2. Audit logs
3. Filter: Service = Microsoft Graph
4. Review activities

### Access Restrictions

**Limit mailbox access:**
1. Create app access policy
2. Restrict to specific mailboxes
3. Use Exchange Online PowerShell

```powershell
# Connect to Exchange Online
Connect-ExchangeOnline

# Create access policy
New-ApplicationAccessPolicy `
  -AppId "your-client-id" `
  -PolicyScopeGroupId "allowed-users@example.com" `
  -AccessRight RestrictAccess `
  -Description "Outlook Email Skill Access"

# Test policy
Test-ApplicationAccessPolicy `
  -AppId "your-client-id" `
  -Identity "user@example.com"
```

## Troubleshooting

### Error: "Insufficient privileges"

**Cause:** Permission not granted or not yet propagated

**Solution:**
1. Verify permission added in Azure portal
2. Ensure admin consent granted (green checkmark)
3. Wait 5-10 minutes for propagation
4. Test: `npm run outlook test`

### Error: "Forbidden"

**Cause:** App access policy restriction or mailbox permissions

**Solution:**
1. Check Exchange Online app access policies
2. Verify mailbox-level permissions
3. Ensure user mailbox is enabled

### Error: "Unauthorized"

**Cause:** Invalid client secret or expired credentials

**Solution:**
1. Verify `AZURE_CLIENT_SECRET` in .env
2. Check secret expiration in Azure portal
3. Create new secret if expired

## Permission Changes

### Adding New Permissions

1. Add permission in Azure portal
2. Grant admin consent
3. Wait for propagation
4. No code changes needed (same auth flow)

### Removing Permissions

1. Remove from Azure portal (API permissions)
2. Update documentation
3. Test affected features

### Secret Rotation

**Recommended:** Every 6-12 months

1. Create new secret (don't delete old one yet)
2. Update `.env` with new secret
3. Test connection
4. Delete old secret after verification

## Best Practices

1. **Minimal Permissions:** Request only required permissions
2. **Regular Audits:** Review permission usage quarterly
3. **Secret Management:** Rotate secrets regularly
4. **Access Policies:** Restrict mailbox access when possible
5. **Logging:** Enable audit logs for compliance
6. **Documentation:** Keep permission list updated

## References

- [Microsoft Graph Permissions Reference](https://docs.microsoft.com/graph/permissions-reference)
- [Application Permissions Best Practices](https://docs.microsoft.com/azure/active-directory/develop/v2-permissions-and-consent)
- [Exchange Online App Access Policies](https://docs.microsoft.com/graph/auth-limit-mailbox-access)

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.7
---
