#!/usr/bin/env node
// Generate cross-platform hooks and setup scripts for all AICC plugins
// Outputs Node.js setup scripts (not bash) for macOS/Linux/Windows compatibility
const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.resolve(__dirname, '..');

// ──────────────────────────────────────────────────────────
// Plugin definitions
// sys hints use { mac, linux, win } for per-platform install instructions
// ──────────────────────────────────────────────────────────

const plugins = {
  // API-first integrations
  'aicc-amazon': {
    env: [
      ['AMAZON_CLIENT_ID', 'Amazon SP-API OAuth client ID'],
      ['AMAZON_CLIENT_SECRET', 'Amazon SP-API OAuth client secret'],
      ['AMAZON_REFRESH_TOKEN', 'Amazon SP-API refresh token'],
      ['AMAZON_SELLER_ID', 'Your Amazon Seller ID'],
    ],
  },
  'aicc-audio': {
    env: [['OPENAI_API_KEY', 'OpenAI API key (for Whisper transcription)']],
    sys: [['ffmpeg', { mac: 'brew install ffmpeg', linux: 'sudo apt install ffmpeg', win: 'winget install Gyan.FFmpeg' }]],
  },
  'aicc-calendly': {
    env: [['CALENDLY_ACCESS_TOKEN', 'Calendly personal access token (or use OAuth)']],
  },
  'aicc-canva': {
    env: [
      ['CANVA_CLIENT_ID', 'Canva OAuth client ID'],
      ['CANVA_CLIENT_SECRET', 'Canva OAuth client secret'],
      ['CANVA_ACCESS_TOKEN', 'Canva OAuth access token'],
    ],
  },
  'aicc-capcut': {
    env: [
      ['CAPCUT_API_KEY', 'CapCut API key'],
      ['CAPCUT_API_SECRET', 'CapCut API secret'],
      ['CAPCUT_ACCESS_TOKEN', 'CapCut access token'],
    ],
  },
  'aicc-confluence': {
    env: [
      ['ATLASSIAN_URL', 'Atlassian instance URL (e.g. https://yoursite.atlassian.net)'],
      ['ATLASSIAN_USER', 'Atlassian account email'],
      ['ATLASSIAN_APIKEY', 'Atlassian API token'],
    ],
  },
  'aicc-discord': {
    env: [
      ['DISCORD_BOT_TOKEN', 'Discord bot token from Developer Portal'],
      ['DISCORD_CLIENT_ID', 'Discord application client ID'],
    ],
  },
  'aicc-email': {
    env: [
      ['EMAIL_USER', 'Email address'],
      ['EMAIL_PASSWORD', 'Email password or app password'],
      ['SMTP_HOST', 'SMTP server hostname'],
      ['SMTP_PORT', 'SMTP port (usually 587)'],
      ['IMAP_HOST', 'IMAP server hostname'],
      ['IMAP_PORT', 'IMAP port (usually 993)'],
    ],
  },
  'aicc-esp-manager': {
    env: [['ESP_SERIAL_PORT', 'Serial port for ESP device (e.g. /dev/tty.usbserial-0001 or COM3)']],
    sys: [['python3', { mac: 'brew install python3', linux: 'sudo apt install python3', win: 'winget install Python.Python.3' }]],
    pip: [['esptool', 'pip install esptool']],
  },
  'aicc-etsy': {
    env: [
      ['ETSY_API_KEY', 'Etsy API key'],
      ['ETSY_API_SECRET', 'Etsy API secret'],
      ['ETSY_ACCESS_TOKEN', 'Etsy OAuth access token'],
      ['ETSY_SHOP_ID', 'Your Etsy shop ID'],
    ],
  },
  'aicc-facebook': {
    env: [
      ['FACEBOOK_ACCESS_TOKEN', 'Facebook Graph API access token'],
      ['FACEBOOK_APP_ID', 'Facebook application ID'],
      ['FACEBOOK_APP_SECRET', 'Facebook application secret'],
    ],
  },
  'aicc-gamma': {
    env: [['GAMMA_API_KEY', 'Gamma API key from gamma.app']],
  },
  'aicc-gemini': {
    env: [['GOOGLE_API_KEY', 'Google AI API key for Gemini/Imagen/Veo']],
  },
  'aicc-image': {
    sys: [['ffmpeg', { mac: 'brew install ffmpeg', linux: 'sudo apt install ffmpeg', win: 'winget install Gyan.FFmpeg (optional for GIF/animation)' }]],
  },
  'aicc-instagram': {
    env: [
      ['INSTAGRAM_ACCESS_TOKEN', 'Instagram Graph API access token'],
      ['INSTAGRAM_ACCOUNT_ID', 'Instagram business/creator account ID'],
    ],
  },
  'aicc-jira': {
    env: [
      ['ATLASSIAN_URL', 'Atlassian instance URL (e.g. https://yoursite.atlassian.net)'],
      ['ATLASSIAN_USER', 'Atlassian account email'],
      ['ATLASSIAN_APIKEY', 'Atlassian API token'],
    ],
  },
  'aicc-kafka': {
    env: [
      ['KAFKA_BOOTSTRAP_SERVERS', 'Kafka broker addresses (e.g. localhost:9092)'],
      ['KAFKA_CLIENT_ID', 'Kafka client identifier'],
    ],
  },
  'aicc-mailchimp': {
    env: [
      ['MAILCHIMP_API_KEY', 'Mailchimp API key (format: key-us1)'],
      ['MAILCHIMP_SERVER_PREFIX', 'Mailchimp server prefix (e.g. us1)'],
    ],
  },
  'aicc-meetup': {
    env: [
      ['MEETUP_CLIENT_ID', 'Meetup OAuth client ID'],
      ['MEETUP_CLIENT_SECRET', 'Meetup OAuth client secret'],
      ['MEETUP_ACCESS_TOKEN', 'Meetup API access token'],
    ],
  },
  'aicc-model': {
    env: [
      ['PLANTUML_SERVER_URL', 'PlantUML server URL (optional)'],
      ['MERMAID_INK_URL', 'Mermaid.ink render URL (optional)'],
    ],
    optional: true,
  },
  'aicc-openai': {
    env: [['OPENAI_API_KEY', 'OpenAI API key from platform.openai.com']],
  },
  'aicc-outlook': {
    env: [
      ['AZURE_TENANT_ID', 'Azure AD tenant ID'],
      ['AZURE_CLIENT_ID', 'Azure AD application client ID'],
      ['AZURE_CLIENT_SECRET', 'Azure AD client secret'],
    ],
  },
  'aicc-rag': {
    env: [
      ['CHROMADB_HOST', 'ChromaDB server host (default: localhost)'],
      ['CHROMADB_PORT', 'ChromaDB server port (default: 8000)'],
      ['OPENAI_API_KEY', 'OpenAI API key (for embeddings)'],
    ],
  },
  'aicc-salesforce': {
    env: [
      ['SALESFORCE_CLIENT_ID', 'Salesforce Connected App client ID'],
      ['SALESFORCE_CLIENT_SECRET', 'Salesforce Connected App client secret'],
      ['SALESFORCE_LOGIN_URL', 'Salesforce login URL (e.g. https://login.salesforce.com)'],
    ],
  },
  'aicc-sharepoint': {
    env: [
      ['AZURE_TENANT_ID', 'Azure AD tenant ID'],
      ['AZURE_CLIENT_ID', 'Azure AD application client ID'],
      ['AZURE_CLIENT_SECRET', 'Azure AD client secret'],
      ['SHAREPOINT_TENANT', 'SharePoint tenant name'],
    ],
  },
  'aicc-slack': {
    env: [
      ['SLACK_BOT_TOKEN', 'Slack bot token (xoxb-...)'],
      ['SLACK_SIGNING_SECRET', 'Slack app signing secret'],
    ],
  },
  'aicc-speechify': {
    env: [['SPEECHIFY_API_KEY', 'Speechify API key from speechify.com']],
  },
  'aicc-teams': {
    env: [
      ['AZURE_TENANT_ID', 'Azure AD tenant ID'],
      ['AZURE_CLIENT_ID', 'Azure AD application client ID'],
      ['AZURE_CLIENT_SECRET', 'Azure AD client secret'],
    ],
  },
  'aicc-threads': {
    env: [
      ['THREADS_APP_ID', 'Threads/Meta application ID'],
      ['THREADS_APP_SECRET', 'Threads/Meta application secret'],
      ['THREADS_ACCESS_TOKEN', 'Threads API access token'],
    ],
  },
  'aicc-tiktok': {
    env: [
      ['TIKTOK_CLIENT_KEY', 'TikTok application client key'],
      ['TIKTOK_CLIENT_SECRET', 'TikTok application client secret'],
      ['TIKTOK_ACCESS_TOKEN', 'TikTok OAuth access token'],
    ],
  },
  'aicc-timetap': {
    env: [
      ['TIMETAP_API_KEY', 'TimeTap API key'],
      ['TIMETAP_PRIVATE_KEY', 'TimeTap private key for signature'],
    ],
  },
  'aicc-translator': {
    env: [
      ['DEFAULT_SOURCE_LANG', 'Default source language (e.g. en)'],
      ['DEFAULT_TARGET_LANG', 'Default target language (e.g. es)'],
    ],
    sys: [['python3', { mac: 'brew install python3', linux: 'sudo apt install python3', win: 'winget install Python.Python.3' }]],
    pip: [['argostranslate', 'pip install argostranslate']],
    optional: true,
  },
  'aicc-twilio': {
    env: [
      ['TWILIO_ACCOUNT_SID', 'Twilio account SID'],
      ['TWILIO_API_KEY', 'Twilio API key'],
      ['TWILIO_API_SECRET', 'Twilio API secret'],
    ],
  },
  'aicc-twitter': {
    env: [
      ['TWITTER_API_KEY', 'X/Twitter API key'],
      ['TWITTER_API_SECRET', 'X/Twitter API secret'],
      ['TWITTER_ACCESS_TOKEN', 'X/Twitter access token'],
      ['TWITTER_ACCESS_TOKEN_SECRET', 'X/Twitter access token secret'],
    ],
  },
  'aicc-video': {
    sys: [['ffmpeg', { mac: 'brew install ffmpeg', linux: 'sudo apt install ffmpeg', win: 'winget install Gyan.FFmpeg' }]],
  },
  'aicc-vonage': {
    env: [
      ['VONAGE_API_KEY', 'Vonage API key'],
      ['VONAGE_API_SECRET', 'Vonage API secret'],
    ],
  },
  'aicc-web-crawl': {
    // No required env vars, just npm deps
  },
  'aicc-whatsapp': {
    env: [
      ['WHATSAPP_PHONE_ID', 'WhatsApp phone number ID'],
      ['WHATSAPP_BUSINESS_ACCOUNT_ID', 'WhatsApp Business account ID'],
      ['WHATSAPP_ACCESS_TOKEN', 'WhatsApp API access token'],
    ],
  },
  'aicc-woocommerce': {
    env: [
      ['WOOCOMMERCE_URL', 'WooCommerce store URL'],
      ['WOOCOMMERCE_KEY', 'WooCommerce REST API consumer key'],
      ['WOOCOMMERCE_SECRET', 'WooCommerce REST API consumer secret'],
    ],
  },
  'aicc-wordpress': {
    env: [
      ['WORDPRESS_URL', 'WordPress site URL'],
      ['WORDPRESS_USER', 'WordPress username'],
      ['WORDPRESS_PASSWORD', 'WordPress application password'],
    ],
  },
  'aicc-youtube': {
    env: [
      ['YOUTUBE_CLIENT_ID', 'Google OAuth client ID'],
      ['YOUTUBE_CLIENT_SECRET', 'Google OAuth client secret'],
      ['YOUTUBE_REFRESH_TOKEN', 'Google OAuth refresh token'],
    ],
  },
  'aicc-zoom': {
    env: [
      ['ZOOM_ACCOUNT_SID', 'Zoom account ID'],
      ['ZOOM_CLIENT_ID', 'Zoom OAuth client ID'],
      ['ZOOM_CLIENT_SECRET', 'Zoom OAuth client secret'],
    ],
  },
};

// Plugins to skip (no deps, no env vars)
const SKIP = new Set([
  'aicc-core',
  'aicc-data-converter',
  'aicc-linkedin',
  'aicc-reddit',
  'aicc-diskimager',
  'aicc-seo-report',
]);

// ──────────────────────────────────────────────────────────
// Generators — output cross-platform Node.js scripts
// ──────────────────────────────────────────────────────────

function generateSetupScript(pluginName, config) {
  const configObj = {
    pluginName,
  };
  if (config.env && config.env.length > 0) configObj.env = config.env;
  if (config.sys && config.sys.length > 0) configObj.sys = config.sys;
  if (config.pip && config.pip.length > 0) configObj.pip = config.pip;

  return `#!/usr/bin/env node
/**
 * Auto-generated cross-platform setup script for ${pluginName}
 * Works on macOS, Linux, and Windows — requires only Node.js
 */
const path = require('path');
const { setup } = require(path.join(__dirname, '..', '..', '_shared', 'setup-env.js'));

setup(${JSON.stringify(configObj, null, 2)});
`;
}

function generateHooksJson() {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [
          {
            hooks: [
              {
                type: 'command',
                command: 'node ${CLAUDE_PLUGIN_ROOT}/scripts/setup.js',
              },
            ],
          },
        ],
      },
    },
    null,
    2
  ) + '\n';
}

// ──────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────

console.log('Generating cross-platform hooks for AICC plugins...\n');

let generated = 0;
let skipped = 0;
let cleaned = 0;

// Get all aicc-* dirs
const allPlugins = fs
  .readdirSync(PLUGINS_DIR)
  .filter((d) => d.startsWith('aicc-') && fs.statSync(path.join(PLUGINS_DIR, d)).isDirectory())
  .sort();

for (const pluginName of allPlugins) {
  if (SKIP.has(pluginName)) {
    console.log(`⏭  ${pluginName} (skipped — no dependencies)`);
    skipped++;
    continue;
  }

  const config = plugins[pluginName];
  if (!config) {
    console.log(`⏭  ${pluginName} (skipped — not configured)`);
    skipped++;
    continue;
  }

  const pluginDir = path.join(PLUGINS_DIR, pluginName);
  const scriptsDir = path.join(pluginDir, 'scripts');
  const hooksDir = path.join(pluginDir, 'hooks');

  // Create directories
  fs.mkdirSync(scriptsDir, { recursive: true });
  fs.mkdirSync(hooksDir, { recursive: true });

  // Write setup.js (cross-platform Node.js)
  const setupScript = generateSetupScript(pluginName, config);
  fs.writeFileSync(path.join(scriptsDir, 'setup.js'), setupScript, { mode: 0o755 });

  // Remove old setup.sh if it exists
  const oldBash = path.join(scriptsDir, 'setup.sh');
  if (fs.existsSync(oldBash)) {
    fs.unlinkSync(oldBash);
    cleaned++;
  }

  // Write hooks.json (references setup.js via node)
  const hooksJson = generateHooksJson();
  fs.writeFileSync(path.join(hooksDir, 'hooks.json'), hooksJson);

  console.log(`🔧 ${pluginName} — scripts/setup.js + hooks/hooks.json`);
  generated++;
}

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`  Generated: ${generated} plugins with cross-platform hooks`);
console.log(`  Skipped:   ${skipped} plugins (no dependencies)`);
console.log(`  Cleaned:   ${cleaned} old bash scripts removed`);
console.log(`  Total:     ${generated + skipped} plugins processed`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
