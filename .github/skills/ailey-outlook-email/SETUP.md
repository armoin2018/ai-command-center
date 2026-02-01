# Azure AD Setup Guide

Complete guide for configuring Azure Active Directory app registration and Microsoft Graph API permissions for ailey-outlook-email.

## Prerequisites

- Azure subscription with admin access
- Office 365/Outlook account
- Node.js 18+

## Step 1: Create Azure AD App Registration

1. **Navigate to Azure Portal:**
   - Go to https://portal.azure.com
   - Sign in with admin credentials

2. **Register Application:**
   - Search for "Azure Active Directory"
   - Select "App registrations" from left menu
   - Click "New registration"

3. **Configure Registration:**
   - **Name:** `ailey-outlook-email`
   - **Supported account types:** "Accounts in this organizational directory only"
   - **Redirect URI:** Leave blank (daemon app)
   - Click "Register"

4. **Save Credentials:**
   ```
   Application (client) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   Directory (tenant) ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

## Step 2: Configure API Permissions

1. **Add Microsoft Graph Permissions:**
   - In app registration, select "API permissions"
   - Click "Add a permission"
   - Choose "Microsoft Graph"
   - Select "Application permissions" (for app-only access)

2. **Required Permissions:**
   - `Mail.Read` - Read mail in all mailboxes
   - `Mail.ReadWrite` - Read and write mail in all mailboxes
   - `Mail.Send` - Send mail as any user
   - `Calendars.ReadWrite` - Read and write calendars in all mailboxes
   - `Contacts.ReadWrite` - Read and write contacts in all mailboxes

3. **Grant Admin Consent:**
   - Click "Grant admin consent for [your organization]"
   - Confirm with "Yes"
   - Wait for status to show "Granted"

## Step 3: Create Client Secret

1. **Navigate to Certificates & Secrets:**
   - In app registration, select "Certificates & secrets"
   - Click "New client secret"

2. **Create Secret:**
   - **Description:** `ailey-outlook-email-key`
   - **Expires:** Choose duration (recommended: 24 months)
   - Click "Add"

3. **Save Secret Immediately:**
   ```
   Secret Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
   ⚠️ **Warning:** Secret shown only once! Copy immediately.

## Step 4: Configure Environment Variables

### Option A: Global Configuration (~/.vscode/.env)

```bash
# Create global config
mkdir -p ~/.vscode
cat > ~/.vscode/.env << EOF
# Azure AD App Registration
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
EOF

# Secure the file
chmod 600 ~/.vscode/.env
```

### Option B: Project-specific (.env)

```bash
# Navigate to skill directory
cd .github/skills/ailey-outlook-email

# Create .env file
cat > .env << EOF
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
EOF

# Secure the file
chmod 600 .env
```

### Environment File Priority

1. `.env.local` (highest priority, gitignored)
2. `.env` (project-specific)
3. `~/.vscode/.env` (global, shared across projects)

## Step 5: Test Connection

```bash
cd .github/skills/ailey-outlook-email
npm install
npm run outlook test
```

**Expected Output:**
```
✓ Microsoft Graph API connection successful!
```

**If Error Occurs:**
```
npm run outlook setup
# Shows this guide interactively
```

## Authentication Modes

### App-Only (Service/Daemon)

**Use when:**
- Running automated scripts
- Server-side operations
- No user interaction

**Configuration:**
- Requires client secret
- Uses `ClientSecretCredential`
- Accesses all mailboxes (admin permissions)

**Environment:**
```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-secret
```

### User Delegation (Interactive)

**Use when:**
- Running as specific user
- Interactive scenarios
- User-specific mailbox access

**Configuration:**
- No client secret
- Uses `DeviceCodeCredential`
- Prompts for user login

**Environment:**
```bash
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
# Omit AZURE_CLIENT_SECRET
```

**Login Flow:**
```bash
npm run outlook test
# Output: Visit https://microsoft.com/devicelogin
# Enter code: XXXXXXXXX
# Sign in with your account
```

## Permission Details

### Mail.Read

- **Type:** Application
- **Admin Consent:** Required
- **Purpose:** Read emails from all mailboxes
- **Used by:** `read-email.ts`

### Mail.ReadWrite

- **Type:** Application
- **Admin Consent:** Required
- **Purpose:** Create, update, delete emails
- **Used by:** `read-email.ts` (mark as read, delete, move)

### Mail.Send

- **Type:** Application
- **Admin Consent:** Required
- **Purpose:** Send emails from any mailbox
- **Used by:** `send-email.ts`

### Calendars.ReadWrite

- **Type:** Application
- **Admin Consent:** Required
- **Purpose:** Manage calendar events
- **Used by:** `manage-calendar.ts`

### Contacts.ReadWrite

- **Type:** Application
- **Admin Consent:** Required
- **Purpose:** Manage contacts
- **Used by:** `manage-contacts.ts`

## Security Best Practices

### Credential Storage

**DO:**
- Store in `~/.vscode/.env` for global access
- Use `.env.local` for project-specific overrides
- Set file permissions to `600` (owner read/write only)
- Add `.env` and `.env.local` to `.gitignore`

**DON'T:**
- Hardcode credentials in code
- Commit credentials to git
- Share `.env` files via email/chat
- Use production credentials for development

### Secret Rotation

1. **Create new secret in Azure portal**
2. **Update environment variables**
3. **Test connection**
4. **Delete old secret** (after verification)

**Recommended rotation:** Every 6-12 months

### Access Control

- Use app-only mode for service accounts
- Use user delegation for individual users
- Grant minimum required permissions
- Audit permission usage regularly

## Troubleshooting

### Error: "credentials not found"

**Cause:** Missing environment variables

**Solution:**
```bash
# Check environment
echo $AZURE_TENANT_ID
echo $AZURE_CLIENT_ID
echo $AZURE_CLIENT_SECRET

# Verify .env file exists
ls -la ~/.vscode/.env
cat ~/.vscode/.env

# Create if missing
npm run outlook setup
```

### Error: "unauthorized"

**Cause:** Missing API permissions or admin consent

**Solution:**
1. Verify permissions in Azure portal
2. Ensure admin consent granted
3. Wait 5-10 minutes for propagation
4. Test again: `npm run outlook test`

### Error: "invalid client secret"

**Cause:** Secret expired or incorrect

**Solution:**
1. Create new secret in Azure portal
2. Update `AZURE_CLIENT_SECRET` in `.env`
3. Test: `npm run outlook test`

### Error: "AADSTS7000218" (Request body too large)

**Cause:** Attachment over 4 MB

**Solution:**
- Split large files
- Use OneDrive sharing links instead
- Compress attachments

### Rate Limiting

**Symptoms:**
- `429 Too Many Requests`
- Throttling errors

**Solution:**
```bash
# Add delays for bulk operations
npm run outlook send bulk --csv file.csv --delay 2000

# Reduce concurrent requests
# Process in smaller batches
```

## Azure Portal Quick Links

- **App Registrations:** https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps
- **API Permissions:** https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/CallAnAPI
- **Client Secrets:** https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/Credentials

## Support

### Documentation

- [Microsoft Graph Mail API](https://docs.microsoft.com/graph/api/resources/mail-api-overview)
- [Azure AD App Registration](https://docs.microsoft.com/azure/active-directory/develop/quickstart-register-app)
- [Graph API Permissions](https://docs.microsoft.com/graph/permissions-reference)

### Common Commands

```bash
# Show setup guide
npm run outlook setup

# Test connection
npm run outlook test

# Verify environment
env | grep AZURE
```

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.7
---
