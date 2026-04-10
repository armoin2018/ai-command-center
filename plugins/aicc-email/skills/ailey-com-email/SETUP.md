# Standard Email Setup Guide

Complete guide for configuring IMAP/SMTP access with Gmail, Yahoo, Outlook.com, and custom email servers.

## Prerequisites

- Email account with IMAP/SMTP access
- Node.js 18+
- For Gmail/Yahoo: App Password (not regular password)

## Quick Setup

### Step 1: Choose Your Email Provider

- [Gmail](#gmail-setup)
- [Outlook.com / Hotmail](#outlookcom-setup)
- [Yahoo Mail](#yahoo-mail-setup)
- [Custom Server](#custom-server-setup)

### Step 2: Configure Environment Variables

Create `~/.vscode/.env` (global) or `.env` (project-specific):

```bash
# IMAP Configuration (for reading)
IMAP_HOST=your-imap-server
IMAP_PORT=993
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password-or-app-password

# SMTP Configuration (for sending)
SMTP_HOST=your-smtp-server
SMTP_PORT=587
SMTP_SECURE=false
```

### Step 3: Test Connection

```bash
cd .github/skills/ailey-com-email
npm install
npm run email test
```

---

## Gmail Setup

### 1. Enable IMAP

1. Open Gmail → Settings (gear icon)
2. Click "See all settings"
3. Go to "Forwarding and POP/IMAP" tab
4. Select "Enable IMAP"
5. Click "Save Changes"

### 2. Enable 2-Step Verification

**Required for App Passwords:**

1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification"
3. Follow setup wizard
4. Verify with phone number

### 3. Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "Standard Email Skill"
5. Click "Generate"
6. Copy the 16-character password (shown once!)

### 4. Configure Environment

```bash
# ~/.vscode/.env or .env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # App Password (remove spaces)
```

### 5. Test

```bash
npm run email test
```

**Expected Output:**
```
Testing SMTP connection...
✓ SMTP connection successful

Testing IMAP connection...
✓ IMAP connection successful

✓ All connections successful!
```

---

## Outlook.com Setup

### 1. Enable IMAP (Usually Enabled)

1. Go to Outlook.com → Settings
2. View all Outlook settings
3. Mail → Sync email
4. Verify "IMAP" is enabled

### 2. Configure Environment

```bash
# ~/.vscode/.env or .env
IMAP_HOST=outlook.office365.com
IMAP_PORT=993
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

**Note:** Outlook.com typically works with regular password. If 2FA is enabled, you may need an app password.

### 3. Test

```bash
npm run email test
```

---

## Yahoo Mail Setup

### 1. Generate App Password

**Required for all IMAP/SMTP access:**

1. Go to https://login.yahoo.com/account/security
2. Click "Generate app password"
3. Select "Other App"
4. Enter name: "Standard Email Skill"
5. Click "Generate"
6. Copy the password (shown once!)

### 2. Configure Environment

```bash
# ~/.vscode/.env or .env
IMAP_HOST=imap.mail.yahoo.com
IMAP_PORT=993
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

### 3. Test

```bash
npm run email test
```

---

## Custom Server Setup

### 1. Get Server Details

Contact your email provider or check documentation for:
- IMAP hostname and port
- SMTP hostname and port
- SSL/TLS requirements

**Common Settings:**
- **IMAP:** Port 993 (SSL) or 143 (no SSL)
- **SMTP:** Port 587 (STARTTLS), 465 (SSL), or 25 (no SSL)

### 2. Configure Environment

```bash
# ~/.vscode/.env or .env
IMAP_HOST=mail.yourserver.com
IMAP_PORT=993
SMTP_HOST=mail.yourserver.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@yourserver.com
EMAIL_PASSWORD=your-password
```

### 3. Test

```bash
npm run email test
```

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `IMAP_HOST` | IMAP server hostname | `imap.gmail.com` |
| `IMAP_PORT` | IMAP server port | `993` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `EMAIL_USER` | Email address | `user@gmail.com` |
| `EMAIL_PASSWORD` | Password or app password | `abcdefghijklmnop` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `IMAP_USER` | IMAP username (if different) | `EMAIL_USER` |
| `IMAP_PASSWORD` | IMAP password (if different) | `EMAIL_PASSWORD` |
| `SMTP_USER` | SMTP username (if different) | `EMAIL_USER` |
| `SMTP_PASSWORD` | SMTP password (if different) | `EMAIL_PASSWORD` |
| `SMTP_SECURE` | Use SSL/TLS for SMTP | `false` |
| `IMAP_TLS` | Use TLS for IMAP | `true` |

### Environment File Locations

**Priority (highest first):**
1. `.env.local` (gitignored, project-specific)
2. `.env` (project-specific)
3. `~/.vscode/.env` (global, all projects)

**Example `.env.local`:**
```bash
# Local override for testing
EMAIL_USER=test@example.com
EMAIL_PASSWORD=test-password
```

---

## Provider Settings Table

| Provider | IMAP Host | IMAP Port | SMTP Host | SMTP Port | SSL |
|----------|-----------|-----------|-----------|-----------|-----|
| Gmail | imap.gmail.com | 993 | smtp.gmail.com | 587 | No (STARTTLS) |
| Outlook.com | outlook.office365.com | 993 | smtp.office365.com | 587 | No (STARTTLS) |
| Yahoo | imap.mail.yahoo.com | 993 | smtp.mail.yahoo.com | 587 | No (STARTTLS) |
| iCloud | imap.mail.me.com | 993 | smtp.mail.me.com | 587 | No (STARTTLS) |
| AOL | imap.aol.com | 993 | smtp.aol.com | 587 | No (STARTTLS) |

---

## Troubleshooting

### Error: "Invalid credentials"

**Gmail:**
- Use App Password, not regular password
- Ensure 2-Step Verification is enabled
- Remove spaces from app password
- Check EMAIL_USER matches Gmail address exactly

**Yahoo:**
- Must use App Password (regular password doesn't work)
- Generate new app password if old one expired

**Outlook.com:**
- Try regular password first
- If 2FA enabled, generate app password

### Error: "Connection timeout"

**Solutions:**
1. Verify host/port settings are correct
2. Check firewall isn't blocking ports 993/587
3. Disable VPN temporarily
4. Try different network (mobile hotspot)

### Error: "IMAP not enabled"

**Gmail:**
1. Settings → Forwarding and POP/IMAP
2. Enable IMAP
3. Save and wait 5-10 minutes
4. Test again

**Other providers:**
- Check account settings for IMAP/POP access
- Some free accounts may not support IMAP

### Error: "TLS/SSL error"

**Solution:**
```bash
# Disable strict TLS verification
IMAP_TLS=false
SMTP_SECURE=false
```

Or update Node.js to latest version.

### Error: "Rate limit exceeded"

**Gmail:** Free accounts limited to ~500 emails/day

**Solution:**
- Add delays: `--delay 2000`
- Use G Suite/Workspace for higher limits
- Spread sends across multiple days

### Error: "Mailbox locked"

**Cause:** Another IMAP connection is active

**Solution:**
- Close other email clients
- Wait 5 minutes for timeout
- Check for background sync processes

---

## Security Best Practices

### Credential Storage

**DO:**
- Store in environment files (`.env`, `~/.vscode/.env`)
- Use app-specific passwords
- Set file permissions: `chmod 600 .env`
- Add `.env` to `.gitignore`

**DON'T:**
- Hardcode credentials in code
- Commit credentials to git
- Share credentials via email/chat
- Use production credentials for testing

### Password Rotation

**Gmail/Yahoo App Passwords:**
1. Revoke old app password
2. Generate new app password
3. Update `.env` file
4. Test connection
5. Recommended: Every 6-12 months

### Network Security

- Use encrypted connections (TLS/SSL)
- Avoid public WiFi for email operations
- Consider VPN for sensitive emails

---

## Testing

### Test Commands

```bash
# Test both connections
npm run email test

# Test send only
npm run email send send -t yourself@example.com -s "Test" -b "Hello"

# Test read only
npm run email read list --limit 5

# Test folders
npm run email folders list
```

### Verification Checklist

- [ ] SMTP connection successful
- [ ] IMAP connection successful
- [ ] Can send email to self
- [ ] Can read emails from inbox
- [ ] Can list folders
- [ ] Can download attachments (if testing with existing email)

---

## Next Steps

After setup:

1. **Send Test Email:**
   ```bash
   npm run email send send -t yourself@example.com -s "Test" -b "Setup complete!"
   ```

2. **Read Emails:**
   ```bash
   npm run email read list --limit 10
   ```

3. **Try Templates:**
   - See [SKILL.md](SKILL.md) for template examples

4. **Bulk Operations:**
   - See [SKILL.md](SKILL.md) for CSV bulk sending

---

## Support

### Documentation

- [IMAP Protocol](https://tools.ietf.org/html/rfc3501)
- [SMTP Protocol](https://tools.ietf.org/html/rfc5321)
- [Gmail IMAP](https://support.google.com/mail/answer/7126229)
- [Outlook.com IMAP](https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353)

### Common Commands

```bash
# Show setup guide
npm run email setup

# Test connection
npm run email test

# Check environment
env | grep -E 'IMAP|SMTP|EMAIL'
```

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.7
---
