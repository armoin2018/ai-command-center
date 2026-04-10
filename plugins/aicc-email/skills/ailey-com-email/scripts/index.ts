#!/usr/bin/env tsx
/**
 * Standard Email CLI
 * 
 * Main entry point with setup instructions
 */

import { Command } from 'commander';
import { EmailClient } from './email-client.js';

const program = new Command();

program
  .name('email')
  .description('Standard email management via IMAP/SMTP')
  .version('1.0.0');

// Test connection
program
  .command('test')
  .description('Test IMAP and SMTP connections')
  .action(async () => {
    try {
      const client = new EmailClient();
      
      console.log('Testing SMTP connection...');
      await client.testSmtpConnection();
      console.log('✓ SMTP connection successful');
      
      console.log('\nTesting IMAP connection...');
      await client.testImapConnection();
      console.log('✓ IMAP connection successful');
      
      console.log('\n✓ All connections successful!');
      
    } catch (error: any) {
      console.error('✗ Connection failed:', error.message);
      console.error('\nRun: npm run email setup');
      process.exit(1);
    }
  });

// Setup instructions
program
  .command('setup')
  .description('Show setup instructions')
  .action(() => {
    console.log(`
📖 Standard Email Skill Setup Instructions

=== Required Environment Variables ===

Add to ~/.vscode/.env (or .env in skill directory):

# IMAP Configuration (for reading emails)
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-password-or-app-password

# SMTP Configuration (for sending emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password-or-app-password

# Or use shared credentials:
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-password-or-app-password


=== Provider-Specific Settings ===

**Gmail:**
- IMAP_HOST: imap.gmail.com
- IMAP_PORT: 993
- SMTP_HOST: smtp.gmail.com
- SMTP_PORT: 587
- Requires App Password (not regular password)
- Enable IMAP in Gmail settings
- Generate App Password at: https://myaccount.google.com/apppasswords

**Outlook.com / Hotmail:**
- IMAP_HOST: outlook.office365.com
- IMAP_PORT: 993
- SMTP_HOST: smtp.office365.com
- SMTP_PORT: 587

**Yahoo Mail:**
- IMAP_HOST: imap.mail.yahoo.com
- IMAP_PORT: 993
- SMTP_HOST: smtp.mail.yahoo.com
- SMTP_PORT: 587
- Requires App Password

**Custom Server:**
- Check your email provider's documentation
- Typically IMAP port 993 (SSL) or 143 (no SSL)
- Typically SMTP port 587 (STARTTLS) or 465 (SSL)


=== Gmail App Password Setup ===

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already enabled)
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and your device
5. Click "Generate"
6. Copy the 16-character password
7. Use this as EMAIL_PASSWORD (not your regular password)


=== Enable IMAP in Gmail ===

1. Go to Gmail Settings
2. Click "Forwarding and POP/IMAP"
3. Select "Enable IMAP"
4. Save changes


=== Test Connection ===

npm run email test


=== Common Issues ===

**Error: "Invalid credentials"**
- Verify username and password
- For Gmail, use App Password, not regular password
- Check IMAP/SMTP are enabled in email settings

**Error: "Connection timeout"**
- Verify host and port settings
- Check firewall isn't blocking ports 993/587
- Try disabling VPN temporarily

**Error: "TLS/SSL error"**
- Set IMAP_TLS=false or SMTP_SECURE=false
- Check certificate settings
- Update Node.js to latest version


📚 For detailed documentation, see SETUP.md
`);
  });

// Delegate to subcommands
program
  .command('send', 'Send emails', { executableFile: 'send-email.ts' })
  .command('read', 'Read emails', { executableFile: 'read-email.ts' })
  .command('folders', 'Manage folders', { executableFile: 'manage-folders.ts' });

program.parse();
