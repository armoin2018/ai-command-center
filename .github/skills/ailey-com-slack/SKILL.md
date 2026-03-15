---
id: ailey-com-slack
name: Slack Integration Manager
description: Comprehensive Slack integration with workspace tier detection, OAuth authentication, channel management, message operations, file sharing, interactive components (modals, blocks, shortcuts), slash commands, event subscriptions, and workflow automation. Supports Bot Token and User Token scopes with automatic workspace tier detection and feature availability mapping.
keywords:
  - slack
  - channel
  - message
  - workspace
  - bot
  - webhook
  - api
  - integration
  - blocks
  - modal
  - workflow
tools:
  - "@slack/web-api"
  - "@slack/bolt"
  - "@slack/events-api"
  - commander
  - dotenv
---

# Slack Integration Manager

Complete Slack integration for AI-ley enabling channel management, rich messaging with Block Kit, file sharing, interactive components, slash commands, event subscriptions, and workflow automation. Automatically detects workspace tier (Free/Pro/Business+/Enterprise Grid) and maps available features.

## Overview

**Setup Time:** 15-25 minutes
**Difficulty:** Intermediate
**API Rate Limits:** Tier 1 (1/min), Tier 2 (20/min), Tier 3 (50/min), Tier 4 (100/min)
**Pricing:** Free, $8.75/user/month (Pro), $15/user/month (Business+), custom (Enterprise Grid)

## Workspace Tier Detection

### Tier 1: Free
**When:** Free Slack workspace
**Features:**
- ✅ Channels (public and private), 1-to-1 messaging
- ✅ 90-day message history
- ✅ Up to 10 app integrations
- ✅ Incoming webhooks, slash commands, bot users
- ✅ 5 GB file storage per workspace
- ❌ Unlimited message history
- ❌ Slack Connect, shared channels
- ❌ SAML SSO, compliance exports

**Cost:** Free | **Storage:** 5 GB/workspace | **Apps:** 10 max

### Tier 2: Pro
**When:** Pro workspace ($8.75/user/month annual)
**Features:**
- ✅ All Free features
- ✅ Unlimited message history and app integrations
- ✅ Slack Connect (external organizations)
- ✅ Workflow Builder (basic), custom user groups
- ✅ Google/Office 365 SSO, custom retention policies
- ✅ 10 GB per member storage
- ❌ SAML SSO, DLP, compliance exports

**Cost:** $8.75/user/month | **Storage:** 10 GB/user | **Apps:** Unlimited

### Tier 3: Business+
**When:** Business+ workspace ($15/user/month annual)
**Features:**
- ✅ All Pro features
- ✅ SAML-based SSO, SCIM provisioning
- ✅ Data Loss Prevention (DLP), compliance exports
- ✅ Workflow Builder (advanced), 99.99% uptime SLA
- ✅ 20 GB per member storage
- ❌ Enterprise Key Management, multi-workspace org

**Cost:** $15/user/month | **Storage:** 20 GB/user | **Apps:** Unlimited

### Tier 4: Enterprise Grid
**When:** Custom enterprise deployment
**Features:**
- ✅ All Business+ features
- ✅ Enterprise Key Management (EKM), audit logs API
- ✅ Multi-workspace organization, centralized admin
- ✅ HIPAA compliance, dedicated support & SLA
- ✅ 1 TB per member storage

**Cost:** Custom | **Storage:** 1 TB/user | **Apps:** Unlimited

## Feature Availability Matrix

| Feature | Free | Pro | Business+ | Enterprise Grid |
|---------|------|-----|-----------|-----------------|
| Channels | ✅ | ✅ | ✅ | ✅ |
| Message History | 90 days | Unlimited | Unlimited | Unlimited |
| App Integrations | 10 | Unlimited | Unlimited | Unlimited |
| File Storage | 5 GB | 10 GB/user | 20 GB/user | 1 TB/user |
| Webhooks & Bots | ✅ | ✅ | ✅ | ✅ |
| Slash Commands | ✅ | ✅ | ✅ | ✅ |
| Interactive Components | ✅ | ✅ | ✅ | ✅ |
| Workflow Builder | ❌ | Basic | Advanced | Advanced |
| Slack Connect | ❌ | ✅ | ✅ | ✅ |
| SAML SSO | ❌ | ❌ | ✅ | ✅ |
| Compliance Exports | ❌ | ❌ | ✅ | ✅ |
| Audit Logs API | ❌ | ❌ | ❌ | ✅ |
| Enterprise Key Mgmt | ❌ | ❌ | ❌ | ✅ |
| Multi-Workspace | ❌ | ❌ | ❌ | ✅ |
| Uptime SLA | ❌ | ❌ | 99.99% | 99.99% |

## Authentication

### Token Types

| Token Type | Prefix | Purpose |
|-----------|--------|---------|
| Bot Token | `xoxb-` | App actions on behalf of bot user |
| User Token | `xoxp-` | Actions on behalf of installing user |
| App-Level Token | `xapp-` | WebSocket connections (Socket Mode) |

### Common Bot Token Scopes

```
channels:read / channels:manage / channels:history / channels:join
chat:write                    - Send messages
commands                      - Slash commands
files:read / files:write      - File operations
groups:read / groups:write / groups:history  - Private channels
im:read / im:write / im:history             - Direct messages
reactions:read / reactions:write             - Emoji reactions
reminders:read / reminders:write            - Reminders
users:read / users:read.email               - User info
pins:read / pins:write                      - Pinned messages
```

### User Token Scopes (Additional)

```
search:read                   - Search messages and files
users.profile:write           - Set own status/profile
admin.conversations:write     - Manage channels (admin)
```

## Installation & Setup

### Step 1: Create Slack App

1. Visit [Slack API Portal](https://api.slack.com/apps) → **Create New App** → **From scratch**
2. Enter app name, select workspace → **Create App**

### Step 2: Configure Bot Scopes

1. **OAuth & Permissions** → **Bot Token Scopes** → Add: `chat:write`, `channels:read`, `channels:history`, `files:write`, `reactions:write`, `users:read`, `commands`
2. **Install to Workspace** → Authorize → Copy **Bot User OAuth Token** (`xoxb-...`)

### Step 3: Enable Events (Optional)

1. **Event Subscriptions** → Toggle ON → Set Request URL
2. Subscribe: `message.channels`, `app_mention`, `reaction_added`, `member_joined_channel`

### Step 4: Enable Interactivity (Optional)

1. **Interactivity & Shortcuts** → Toggle ON → Set Request URL
2. Add global or message shortcuts as needed

### Step 5: Configure Environment

```bash
cd .github/skills/ailey-com-slack
npm install
cp .env.example .env
```

```env
# Required
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret

# Optional - Socket Mode (no public URL needed)
SLACK_APP_TOKEN=xapp-your-app-level-token

# Optional - OAuth distribution
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# Optional - User Token features (search, profile)
SLACK_USER_TOKEN=xoxp-your-user-token

# Optional - Incoming Webhooks
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxx

# Optional - Default channel
SLACK_DEFAULT_CHANNEL=general
```

### Step 6: Verify Setup

```bash
npm run detect        # Detect workspace tier
npm run auth -- verify  # Verify bot token
npm run diagnose      # Full diagnostics
```

## Commands Reference

### Channel Operations

```bash
npm run channel -- list                              # List public channels
npm run channel -- list --type private --limit 50    # List private channels
npm run channel -- create --name "project-alpha" --public
npm run channel -- create --name "secret-ops" --private
npm run channel -- info --channel C0123456789
npm run channel -- archive --channel C0123456789
npm run channel -- unarchive --channel C0123456789
npm run channel -- invite --channel C0123456789 --user U0123456789
npm run channel -- kick --channel C0123456789 --user U0123456789
npm run channel -- topic --channel C0123456789 --text "Sprint 42"
```

**API Methods:** `conversations.list`, `conversations.create`, `conversations.info`, `conversations.archive`, `conversations.unarchive`, `conversations.invite`, `conversations.kick`, `conversations.setTopic`

### Message Operations

```bash
npm run message -- send --channel C0123456789 --text "Hello, team!"
npm run message -- send --channel C0123456789 --blocks blocks.json
npm run message -- update --channel C0123456789 --ts "1234567890.123456" --text "Updated"
npm run message -- delete --channel C0123456789 --ts "1234567890.123456"
npm run message -- schedule --channel C0123456789 --text "Reminder!" --time "2026-02-22T09:50:00Z"
npm run message -- search --query "deployment plan" --sort timestamp
npm run message -- thread --channel C0123456789 --thread-ts "1234567890.123456" --text "Reply"
```

**API Methods:** `chat.postMessage`, `chat.update`, `chat.delete`, `chat.scheduleMessage`, `search.messages` (user token), `chat.postMessage` (with `thread_ts`)

### File Operations

```bash
npm run file -- upload --channel C0123456789 --path ./report.pdf --title "Q4 Report"
npm run file -- list --channel C0123456789 --types images
npm run file -- delete --file F0123456789
```

**API Methods:** `files.uploadV2`, `files.list`, `files.delete`

### User Operations

```bash
npm run user -- list --limit 100
npm run user -- info --user U0123456789
npm run user -- status --text "In a meeting" --emoji ":calendar:"
npm run user -- lookup --email user@example.com
```

**API Methods:** `users.list`, `users.info`, `users.profile.set` (user token), `users.lookupByEmail`

### Reactions, Reminders & Webhooks

```bash
npm run reaction -- add --channel C0123456789 --ts "1234567890.123456" --emoji "thumbsup"
npm run reaction -- remove --channel C0123456789 --ts "1234567890.123456" --emoji "thumbsup"
npm run reminder -- create --text "Review PR #42" --time "2026-02-22T15:00:00Z"
npm run reminder -- list
npm run webhook -- send --text "Deployment complete ✅"
npm run webhook -- send --blocks webhook-blocks.json
```

### Event Listener

```bash
npm run event -- listen                  # Socket Mode
npm run event -- listen --port 3000      # HTTP mode
```

## Block Kit

### Building Rich Messages

```json
{
  "blocks": [
    { "type": "header", "text": { "type": "plain_text", "text": "🚀 Deployment Report" } },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Service:*\napi-gateway" },
        { "type": "mrkdwn", "text": "*Version:*\nv2.4.1" },
        { "type": "mrkdwn", "text": "*Environment:*\nproduction" },
        { "type": "mrkdwn", "text": "*Status:*\n✅ Success" }
      ]
    },
    { "type": "divider" },
    { "type": "context", "elements": [{ "type": "mrkdwn", "text": "Deployed by <@U0123456789>" }] },
    {
      "type": "actions",
      "elements": [
        { "type": "button", "text": { "type": "plain_text", "text": "View Logs" }, "url": "https://logs.example.com", "action_id": "view_logs" },
        { "type": "button", "text": { "type": "plain_text", "text": "Rollback" }, "style": "danger", "action_id": "rollback_deploy",
          "confirm": { "title": { "type": "plain_text", "text": "Confirm Rollback" }, "text": { "type": "mrkdwn", "text": "Are you sure?" }, "confirm": { "type": "plain_text", "text": "Rollback" }, "deny": { "type": "plain_text", "text": "Cancel" } }
        }
      ]
    }
  ]
}
```

**Block Types:** `header`, `section`, `divider`, `context`, `image`, `actions`, `input`

## Interactive Components

### Modals

```typescript
import { App } from '@slack/bolt';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

app.command('/create-ticket', async ({ ack, body, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: {
      type: 'modal', callback_id: 'ticket_modal',
      title: { type: 'plain_text', text: 'Create Ticket' },
      submit: { type: 'plain_text', text: 'Submit' },
      blocks: [
        { type: 'input', block_id: 'title_block', element: { type: 'plain_text_input', action_id: 'title_input' }, label: { type: 'plain_text', text: 'Title' } },
        { type: 'input', block_id: 'priority_block', element: { type: 'static_select', action_id: 'priority_select', options: [
          { text: { type: 'plain_text', text: '🔴 Critical' }, value: 'critical' },
          { text: { type: 'plain_text', text: '🟡 High' }, value: 'high' },
          { text: { type: 'plain_text', text: '🟢 Normal' }, value: 'normal' }
        ]}, label: { type: 'plain_text', text: 'Priority' } },
        { type: 'input', block_id: 'desc_block', element: { type: 'plain_text_input', action_id: 'desc_input', multiline: true }, label: { type: 'plain_text', text: 'Description' } }
      ]
    }
  });
});

app.view('ticket_modal', async ({ ack, view }) => {
  await ack();
  const title = view.state.values.title_block.title_input.value;
  const priority = view.state.values.priority_block.priority_select.selected_option?.value;
  console.log(`Ticket: ${title} [${priority}]`);
});
```

### Action Handlers & Shortcuts

```typescript
app.action('rollback_deploy', async ({ ack, body, say }) => {
  await ack();
  await say(`🔄 Rollback initiated by <@${body.user.id}>...`);
});

app.shortcut('create_quick_note', async ({ ack, shortcut, client }) => {
  await ack();
  await client.views.open({
    trigger_id: shortcut.trigger_id,
    view: { type: 'modal', callback_id: 'quick_note', title: { type: 'plain_text', text: 'Quick Note' }, submit: { type: 'plain_text', text: 'Save' },
      blocks: [{ type: 'input', element: { type: 'plain_text_input', action_id: 'note', multiline: true }, label: { type: 'plain_text', text: 'Note' } }]
    }
  });
});
```

## Slash Commands

### Registration

1. **App Settings** → **Slash Commands** → **Create New Command**
2. Set command, Request URL, description, usage hint
3. For Socket Mode, ensure `commands` scope is added

### Handling

```typescript
app.command('/deploy', async ({ ack, say, command }) => {
  await ack();
  const [service, version] = command.text.split(' ');
  await say({
    text: `Deploying ${service || 'unknown'}@${version || 'latest'}...`,
    blocks: [{
      type: 'section', text: { type: 'mrkdwn',
        text: `🚀 *Deployment Started*\n*Service:* ${service}\n*Version:* ${version}\n*By:* <@${command.user_id}>`
      }
    }]
  });
});

app.command('/status', async ({ ack, say }) => {
  await ack();
  await say('All systems operational ✅');
});
```

## Event Subscriptions

### Bolt Event Listener

```typescript
// Message in channel
app.message(async ({ message, say }) => {
  if (message.subtype) return;
  console.log(`Message from ${(message as any).user}: ${(message as any).text}`);
});

// App mention (@bot)
app.event('app_mention', async ({ event, say }) => {
  await say(`Hey <@${event.user}>! How can I help?`);
});

// Reaction added
app.event('reaction_added', async ({ event }) => {
  console.log(`:${event.reaction}: by ${event.user} on ${event.item.ts}`);
});

// Member joined channel
app.event('member_joined_channel', async ({ event, say }) => {
  await say(`Welcome, <@${event.user}>! 👋`);
});

(async () => { await app.start(); console.log('⚡ Bolt app running!'); })();
```

### Event Payloads

**message.channels:**
```json
{ "type": "message", "channel": "C0123456789", "user": "U0123456789", "text": "Hello!", "ts": "1645000000.000100" }
```

**app_mention:**
```json
{ "type": "app_mention", "user": "U0123456789", "text": "<@U_BOT> status?", "channel": "C0123456789", "ts": "1645000000.000200" }
```

**reaction_added:**
```json
{ "type": "reaction_added", "user": "U0123456789", "reaction": "thumbsup", "item": { "type": "message", "channel": "C0123456789", "ts": "1645000000.000100" } }
```

## Workflows

### Workflow Builder Integration

Slack Workflow Builder allows no-code automations. Your app can be a step:

```typescript
// Register custom workflow step
app.step('send_report', {
  edit: async ({ ack, step, configure }) => {
    await ack();
    await configure({ blocks: [{ type: 'input', block_id: 'channel', element: { type: 'channels_select', action_id: 'ch' }, label: { type: 'plain_text', text: 'Channel' } }] });
  },
  save: async ({ ack, update, view }) => {
    await ack();
    const channel = view.state.values.channel.ch.selected_channel;
    await update({ inputs: { channel: { value: channel } }, outputs: [{ name: 'report_url', type: 'text', label: 'Report URL' }] });
  },
  execute: async ({ step, complete, fail }) => {
    try {
      const reportUrl = await generateReport();
      await complete({ outputs: { report_url: reportUrl } });
    } catch (e) {
      await fail({ error: { message: 'Report generation failed' } });
    }
  }
});
```

### Integration Examples

```typescript
// Jira → Slack notifications
async function notifyJiraUpdate(issue: { key: string; summary: string; status: string }) {
  await client.chat.postMessage({
    channel: '#jira-updates',
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text: `*<https://jira.example.com/browse/${issue.key}|${issue.key}>*: ${issue.summary}\n*Status:* ${issue.status}` } }]
  });
}

// CI/CD → Slack deployment alerts
async function notifyDeploy(service: string, version: string, status: 'success' | 'failure') {
  const emoji = status === 'success' ? '✅' : '❌';
  await client.chat.postMessage({ channel: '#deployments', text: `${emoji} ${service} ${version} — ${status}` });
}
```

## Error Handling

### Rate Limit Tiers

| Tier | Rate | Example Methods |
|------|------|-----------------|
| Tier 1 | 1 req/min | `admin.*`, `migration.*` |
| Tier 2 | 20 req/min | `files.upload`, `conversations.create` |
| Tier 3 | 50 req/min | `conversations.list`, `users.list` |
| Tier 4 | 100+ req/min | `chat.postMessage`, `reactions.add` |
| Special | 1/channel/sec | `chat.postMessage` (per channel) |

### Retry Logic

```typescript
import { WebClient, retryPolicies } from '@slack/web-api';
const client = new WebClient(process.env.SLACK_BOT_TOKEN, {
  retryConfig: retryPolicies.fiveRetriesInFiveMinutes,
});
```

### Common Error Codes

| Error | Cause | Solution |
|-------|-------|----------|
| `not_authed` | Missing/invalid token | Verify `SLACK_BOT_TOKEN` |
| `invalid_auth` | Token revoked/expired | Reinstall app to workspace |
| `channel_not_found` | Invalid channel ID | Use `conversations.list` |
| `not_in_channel` | Bot not in channel | `/invite @bot` in channel |
| `missing_scope` | Token lacks scope | Add scope in OAuth settings |
| `ratelimited` | Too many requests | Retry with `Retry-After` header |
| `message_not_found` | Invalid timestamp | Verify `ts` parameter |
| `cant_update_message` | Not message author | Bot can only edit own messages |
| `restricted_action` | Admin restriction | Contact workspace admin |

## Troubleshooting

### Bot Not Responding

1. **Socket Mode:** Verify `SLACK_APP_TOKEN` (`xapp-`) is set
2. **HTTP Mode:** Verify Request URL responds to challenge
3. Ensure events are subscribed in App Settings
4. Invite bot to channel: `/invite @yourbot`
5. Verify required scopes are granted

### Slash Commands Not Working

1. Command registered in App Settings → Slash Commands
2. Request URL matches server endpoint (or Socket Mode enabled)
3. `commands` scope added to bot
4. Reinstall app if scopes changed

### Messages Not Sending

```bash
npm run channel -- info --channel C0123456789  # Verify bot membership
npm run auth -- verify                          # Check scopes
npm run message -- send --channel C0123456789 --text "test"
```

### File Upload Failures

1. Verify `files:write` scope granted
2. Check storage limits (Free: 5 GB, Pro: 10 GB/user)
3. Use `files.uploadV2` (newer API)

## TypeScript Integration

```typescript
import { WebClient } from '@slack/web-api';
import { App } from '@slack/bolt';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

async function detectWorkspaceTier(): Promise<string> {
  const info = await client.team.info();
  return (info.team as any)?.plan || 'free';
}

async function listChannels() {
  const result = await client.conversations.list({ types: 'public_channel,private_channel', limit: 100 });
  return result.channels || [];
}

async function sendMessage(channel: string, text: string) {
  return client.chat.postMessage({ channel, text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] });
}

async function uploadFile(channel: string, filePath: string, title: string) {
  return client.filesUploadV2({ channel_id: channel, file: filePath, title });
}
```

## AI-ley Configuration

Add to `.github/aicc/aicc.yaml`:

```yaml
integrations:
  slack:
    enabled: true
    botToken: ${SLACK_BOT_TOKEN}
    signingSecret: ${SLACK_SIGNING_SECRET}
    appToken: ${SLACK_APP_TOKEN}
    workspaceTier: auto
    features:
      - channel_management
      - messaging
      - file_sharing
      - interactive_components
      - slash_commands
      - event_subscriptions
      - workflow_automation
      - incoming_webhooks
```

## Resources

- **API Portal:** [api.slack.com](https://api.slack.com/)
- **Bolt Framework:** [slack.dev/bolt-js](https://slack.dev/bolt-js/)
- **Block Kit Builder:** [app.slack.com/block-kit-builder](https://app.slack.com/block-kit-builder)
- **Web API Methods:** [api.slack.com/methods](https://api.slack.com/methods)
- **Events API:** [api.slack.com/events-api](https://api.slack.com/events-api)
- **Scopes Reference:** [api.slack.com/scopes](https://api.slack.com/scopes)
- **Rate Limits:** [api.slack.com/docs/rate-limits](https://api.slack.com/docs/rate-limits)

## Support

For issues:
1. Run `npm run diagnose` for diagnostics
2. Check [Slack API Documentation](https://api.slack.com/docs)
3. Review [API Changelog](https://api.slack.com/changelog)
4. Ask in [Slack Community](https://community.slack.com/)

---

version: 1.0.0
updated: 2026-02-21
reviewed: 2026-02-21
score: 4.5

---
