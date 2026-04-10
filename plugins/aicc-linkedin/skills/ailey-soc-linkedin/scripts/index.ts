#!/usr/bin/env node

import { Command } from 'commander';
import { LinkedInClient, loadConfig } from './linkedin-client.js';
import express from 'express';
import open from 'open';

const program = new Command();

program
  .name('linkedin')
  .description('LinkedIn integration for profile management, content sharing, and company pages')
  .version('1.0.0');

// ============================================================================
// SETUP COMMAND
// ============================================================================

program
  .command('setup')
  .description('Show setup instructions')
  .action(() => {
    console.log(`
╔═══════════════════════════════════════════════════════════════════════════╗
║                      LINKEDIN INTEGRATION SETUP                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

📋 SETUP OVERVIEW

This skill provides LinkedIn integration for basic profile access, content
sharing, and company page management using LinkedIn's OAuth 2.0 API.

⚠️  IMPORTANT: LinkedIn heavily restricts API access. This skill provides
    features available WITHOUT LinkedIn Partnership status.

═══════════════════════════════════════════════════════════════════════════

🔓 AVAILABLE FEATURES (No Partnership Required)

✅ OAuth 2.0 authentication
✅ Basic profile information (name, headline, profile picture)
✅ Share text posts, links, and images
✅ Company page management (if admin)
✅ Company page posting

❌ NOT AVAILABLE (Requires Partnership)

Full profile data, connections API, messaging, advanced analytics,
job postings, recruiting, advertising, Sales Navigator integration

═══════════════════════════════════════════════════════════════════════════

📝 STEP 1: Create LinkedIn App

1. Go to https://www.linkedin.com/developers/apps
2. Click "Create app"
3. Fill in required fields:
   - App name: Your app name
   - LinkedIn Page: Select or create a LinkedIn page
   - Privacy policy URL: Your privacy policy
   - App logo: Upload logo (optional)
4. Click "Create app"
5. Note your Client ID and Client Secret

═══════════════════════════════════════════════════════════════════════════

🔐 STEP 2: Configure OAuth Settings

1. In your app, go to "Auth" tab
2. Under "OAuth 2.0 settings":
   - Redirect URLs: Add http://localhost:3000/auth/callback
3. Under "OAuth 2.0 scopes", request:
   ☑️ r_liteprofile (View basic profile)
   ☑️ r_emailaddress (View email address)
   ☑️ w_member_social (Share content)
   ☑️ r_organization_social (View org pages)
   ☑️ w_organization_social (Manage org pages)
4. Save changes

═══════════════════════════════════════════════════════════════════════════

🎫 STEP 3: Get Access Token

OPTION A: OAuth Authorization Code Flow (Recommended)

1. Start OAuth server:
   npm run linkedin auth start

2. Browser will open to LinkedIn authorization page
3. Authorize your app
4. Access token will be saved automatically

OPTION B: Manual OAuth Flow

1. Build authorization URL:
   https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/auth/callback&scope=r_liteprofile%20w_member_social%20r_organization_social%20w_organization_social

2. Visit URL in browser and authorize
3. Copy authorization code from redirect URL
4. Exchange for access token:

curl -X POST https://www.linkedin.com/oauth/v2/accessToken \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  -d 'grant_type=authorization_code' \\
  -d 'code=YOUR_AUTH_CODE' \\
  -d 'client_id=YOUR_CLIENT_ID' \\
  -d 'client_secret=YOUR_CLIENT_SECRET' \\
  -d 'redirect_uri=http://localhost:3000/auth/callback'

5. Save access_token from response

═══════════════════════════════════════════════════════════════════════════

⚙️  STEP 4: Environment Configuration

Create .env file in the skill directory:

# Required
LINKEDIN_ACCESS_TOKEN=your_access_token_here
LINKEDIN_CLIENT_ID=your_client_id_here
LINKEDIN_CLIENT_SECRET=your_client_secret_here

# Optional
LINKEDIN_API_VERSION=v2
LINKEDIN_REDIRECT_URI=http://localhost:3000/auth/callback

You can also configure globally at:
~/.vscode/.env

═══════════════════════════════════════════════════════════════════════════

🧪 STEP 5: Test Connection

npm run linkedin test

This will verify your access token and show your profile information.

═══════════════════════════════════════════════════════════════════════════

📚 QUICK START COMMANDS

# Profile
npm run linkedin profile show
npm run linkedin profile vanity

# Share Content
npm run linkedin share text "Hello LinkedIn!"
npm run linkedin share link --url "https://example.com" --text "Check this out"
npm run linkedin share image photo.jpg --text "My photo"

# Company Pages
npm run linkedin pages list
npm run linkedin pages post ORG_ID --text "Company update"

═══════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING

❌ "Authentication failed"
   → Check access token hasn't expired (60 days max)
   → Regenerate token via OAuth flow
   → Verify token in environment variables

❌ "Permission denied"
   → Verify OAuth scopes are granted
   → Some features require LinkedIn Partnership
   → Check app has required permissions

❌ "Invalid redirect URI"
   → Ensure http://localhost:3000/auth/callback is in app settings
   → Match redirect URI exactly (including protocol)

═══════════════════════════════════════════════════════════════════════════

📖 MORE INFORMATION

LinkedIn API Documentation: https://docs.microsoft.com/en-us/linkedin/
OAuth 2.0: https://docs.microsoft.com/en-us/linkedin/shared/authentication/
Share API: https://docs.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/share-api
Developer Portal: https://www.linkedin.com/developers/

═══════════════════════════════════════════════════════════════════════════
    `);
  });

// ============================================================================
// TEST COMMAND
// ============================================================================

program
  .command('test')
  .description('Test LinkedIn API connection')
  .action(async () => {
    try {
      console.log('Testing LinkedIn API connection...\n');
      
      const config = loadConfig();
      const client = new LinkedInClient(config);
      
      const profile = await client.getProfile();
      
      console.log('✅ Connection successful!\n');
      console.log('Your LinkedIn Profile:');
      console.log(`  ID: ${profile.id}`);
      console.log(`  Name: ${profile.firstName} ${profile.lastName}`);
      console.log(`  Headline: ${profile.headline || '(not set)'}\n`);
      
      console.log('LinkedIn API is configured correctly.');
      console.log('You can now use all LinkedIn commands.\n');
      
    } catch (error: any) {
      console.error('❌ Connection failed!\n');
      console.error('Error:', error.message);
      console.error('\nPlease check your configuration:');
      console.error('1. Verify LINKEDIN_ACCESS_TOKEN is set in .env');
      console.error('2. Ensure token has not expired (60 days max)');
      console.error('3. Check token has required OAuth scopes\n');
      console.error('Run "npm run linkedin setup" for detailed setup instructions.\n');
      process.exit(1);
    }
  });

// ============================================================================
// AUTH COMMANDS
// ============================================================================

const auth = program
  .command('auth')
  .description('Authentication helpers');

auth
  .command('start')
  .description('Start OAuth authorization flow')
  .action(async () => {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    const redirectUri = process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/auth/callback';

    if (!clientId || !clientSecret) {
      console.error('Error: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET must be set in .env');
      process.exit(1);
    }

    const app = express();
    const port = 3000;

    console.log('Starting OAuth server on http://localhost:3000...\n');

    app.get('/auth/callback', async (req, res) => {
      const code = req.query.code as string;
      const error = req.query.error as string;

      if (error) {
        res.send(`<h1>Authorization Failed</h1><p>${error}</p>`);
        console.error('Authorization failed:', error);
        process.exit(1);
      }

      if (!code) {
        res.send('<h1>No authorization code received</h1>');
        console.error('No authorization code in callback');
        process.exit(1);
      }

      try {
        // Exchange code for access token
        const axios = (await import('axios')).default;
        const response = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', null, {
          params: {
            grant_type: 'authorization_code',
            code: code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        });

        const accessToken = response.data.access_token;
        const expiresIn = response.data.expires_in;

        res.send(`
          <h1>✅ Authorization Successful!</h1>
          <p>Your access token:</p>
          <pre>${accessToken}</pre>
          <p>Expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 86400)} days)</p>
          <p>Add this to your .env file as LINKEDIN_ACCESS_TOKEN</p>
        `);

        console.log('\n✅ Authorization successful!\n');
        console.log('Access Token:', accessToken);
        console.log(`Expires in: ${expiresIn} seconds (${Math.floor(expiresIn / 86400)} days)\n`);
        console.log('Add this to your .env file:');
        console.log(`LINKEDIN_ACCESS_TOKEN=${accessToken}\n`);

        setTimeout(() => process.exit(0), 2000);
      } catch (error: any) {
        res.send(`<h1>Token Exchange Failed</h1><p>${error.message}</p>`);
        console.error('Token exchange failed:', error.message);
        process.exit(1);
      }
    });

    const server = app.listen(port, () => {
      const scope = 'r_liteprofile%20w_member_social%20r_organization_social%20w_organization_social';
      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`;

      console.log('Opening LinkedIn authorization page...\n');
      console.log('If browser doesn\'t open, visit this URL:');
      console.log(authUrl);
      console.log('\nWaiting for authorization...\n');

      open(authUrl);
    });
  });

// ============================================================================
// COMMAND ROUTING
// ============================================================================

program
  .command('profile')
  .description('Profile management')
  .action(() => {
    console.log('Use: npm run linkedin profile <command>');
    console.log('Available commands: show, vanity');
    console.log('Run with --help for more details');
  });

program
  .command('share')
  .description('Share content to LinkedIn')
  .action(() => {
    console.log('Use: npm run linkedin share <command>');
    console.log('Available commands: text, link, image');
    console.log('Run with --help for more details');
  });

program
  .command('pages')
  .description('Company page management')
  .action(() => {
    console.log('Use: npm run linkedin pages <command>');
    console.log('Available commands: list, post, followers');
    console.log('Run with --help for more details');
  });

program.parse();
