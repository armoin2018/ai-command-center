# YouTube Content Manager - AI-ley Integration

This document explains how to integrate the YouTube Content Manager skill with the AI-ley toolkit.

## Configuration

### 1. Add to AI-ley Config

Edit `.github/aicc/aicc.yaml`:

```yaml
integrations:
  youtube:
    enabled: true
    clientId: ${YOUTUBE_CLIENT_ID}
    clientSecret: ${YOUTUBE_CLIENT_SECRET}
    accessToken: ${YOUTUBE_ACCESS_TOKEN}
    refreshToken: ${YOUTUBE_REFRESH_TOKEN}
    redirectUri: ${YOUTUBE_REDIRECT_URI}
    apiKey: ${YOUTUBE_API_KEY}  # Optional
    
    # Quota Management
    quotaMonitoring: true
    quotaWarningThreshold: 80  # Warn at 80% usage
    quotaLimit: 10000  # Daily quota (update if you have custom quota)
    
    # Default Settings
    defaultPrivacy: private  # Default video privacy
    defaultCategory: 22  # Default category (People & Blogs)
    autoUploadPlaylist: null  # Optional: Auto-add uploads to playlist
    
    # Feature Flags
    features:
      upload: true
      analytics: true
      liveStreaming: true
      comments: true
      playlists: true
      captions: true
```

### 2. Environment Variables

The integration will read from these environment variables:

```env
# OAuth Credentials
YOUTUBE_CLIENT_ID=your_client_id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_ACCESS_TOKEN=your_access_token
YOUTUBE_REFRESH_TOKEN=your_refresh_token
YOUTUBE_REDIRECT_URI=http://localhost:3000/oauth2callback

# Optional
YOUTUBE_API_KEY=your_api_key
YOUTUBE_QUOTA_MONITORING=true
YOUTUBE_QUOTA_WARNING_THRESHOLD=80
```

### 3. Skill Registration

The skill is automatically registered when present in `.github/skills/ailey-youtube/`.

Verify registration:

```bash
# From project root
cd .github/skills/ailey-youtube
npm test
```

## Usage in AI-ley

### As a Chat Command

```
@copilot upload this video to YouTube with title "My Tutorial"
```

The AI-ley orchestrator will:
1. Detect the YouTube skill is available
2. Parse the command and extract parameters
3. Call the YouTube upload function
4. Return the result with video URL

### In Workflows

Create workflow files in `.github/aicc/workflows/`:

#### Auto-Upload Workflow

`.github/aicc/workflows/youtube-auto-upload.yaml`:

```yaml
name: YouTube Auto Upload
description: Automatically upload processed videos to YouTube

trigger:
  type: file_created
  pattern: ./exports/final/**/*.mp4

conditions:
  - file.size > 1048576  # > 1MB
  - file.extension == 'mp4'

actions:
  - name: Check quota
    skill: ailey-youtube
    command: detect
    
  - name: Upload to YouTube
    skill: ailey-youtube
    command: upload
    args:
      file: ${trigger.file.path}
      title: ${trigger.file.basename}
      description: Auto-uploaded via AI-ley
      tags:
        - automated
        - ai-generated
        - ${date.year}
      privacy: private  # Review before making public
      thumbnail: ${trigger.file.path.replace('.mp4', '_thumb.jpg')}
      
  - name: Log result
    action: log
    message: "Uploaded ${youtube.video_id}: ${youtube.url}"
    
  - name: Notify
    action: webhook
    url: ${env.NOTIFICATION_WEBHOOK}
    data:
      event: youtube_upload
      video_id: ${youtube.video_id}
      url: ${youtube.url}
      title: ${youtube.title}
```

#### Daily Analytics Workflow

`.github/aicc/workflows/youtube-daily-analytics.yaml`:

```yaml
name: YouTube Daily Analytics
description: Generate daily analytics reports

trigger:
  type: schedule
  cron: "0 9 * * *"  # 9 AM daily

actions:
  - name: Get channel stats
    skill: ailey-youtube
    command: analytics
    args:
      type: channel
      days: 1
      
  - name: Export to file
    action: write_file
    path: ./reports/youtube-${date.iso}.json
    content: ${youtube.analytics}
    
  - name: Check milestones
    conditions:
      - ${youtube.analytics.subscribers} % 1000 == 0
    actions:
      - name: Celebrate milestone
        action: webhook
        url: ${env.CELEBRATION_WEBHOOK}
        data:
          milestone: subscribers
          count: ${youtube.analytics.subscribers}
```

#### Comment Moderation Workflow

`.github/aicc/workflows/youtube-comment-moderation.yaml`:

```yaml
name: YouTube Comment Moderation
description: Auto-moderate and respond to comments

trigger:
  type: schedule
  cron: "*/30 * * * *"  # Every 30 minutes

actions:
  - name: Get recent videos
    skill: ailey-youtube
    command: videos.list
    args:
      maxResults: 5
      
  - name: Process each video
    forEach: ${youtube.videos}
    actions:
      - name: Get new comments
        skill: ailey-youtube
        command: comments.list
        args:
          videoId: ${item.id}
          maxResults: 100
          
      - name: Filter spam
        skill: ailey-youtube
        command: comments.moderate
        args:
          videoId: ${item.id}
          spamFilter: aggressive
          autoDelete: true
          
      - name: Auto-reply to subscribers
        skill: ailey-youtube
        command: comments.auto-reply
        args:
          videoId: ${item.id}
          template: "Thanks for watching! 🎉"
          onlyNew: true
          onlySubscribers: true
          delay: 60  # seconds between replies
```

### In Custom Agents

Create custom agents that use YouTube skill:

`.github/agents/youtube-manager.agent.md`:

```markdown
# YouTube Manager Agent

**Role:** Specialized YouTube content management and optimization agent

**Capabilities:**
- Upload and manage videos
- Monitor analytics and performance
- Engage with audience through comments
- Optimize content for discovery
- Manage playlists and series

**Skills:**
- ailey-youtube (primary)
- ailey-tools-image (for thumbnails)
- ailey-tools-audio (for audio processing)
- ailey-seo-report (for optimization)

**Workflows:**

## Daily Tasks
1. Check quota status
2. Upload scheduled content
3. Respond to new comments
4. Review analytics
5. Optimize underperforming videos

## Weekly Tasks
1. Generate performance reports
2. Research trending topics
3. Plan next week's content
4. A/B test thumbnails
5. Update series playlists

## Optimization Process
1. Analyze top-performing videos
2. Identify success patterns
3. Apply learnings to new content
4. Test variations
5. Measure impact
```

Usage:

```
@copilot /agent youtube-manager optimize my recent videos
```

## API Integration

### Direct API Usage

```typescript
// In your TypeScript code
import YouTubeClient from './.github/skills/ailey-youtube';

const client = new YouTubeClient({
  clientId: process.env.YOUTUBE_CLIENT_ID!,
  clientSecret: process.env.YOUTUBE_CLIENT_SECRET!,
  accessToken: process.env.YOUTUBE_ACCESS_TOKEN,
  refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
  redirectUri: process.env.YOUTUBE_REDIRECT_URI!,
});

// Upload video
const video = await client.uploadVideo('video.mp4', {
  title: 'My Video',
  description: 'Video description',
  tags: ['tutorial', 'howto'],
  privacyStatus: 'public',
});

console.log(`Uploaded: ${video.id}`);
console.log(`URL: https://youtube.com/watch?v=${video.id}`);

// Check quota
const quota = await client.detectQuota();
console.log(`Remaining quota: ${quota.remaining} units`);
```

### Webhook Integration

Set up webhooks for YouTube events:

```javascript
// webhook-handler.js
const express = require('express');
const app = express();

app.post('/youtube/webhook', (req, res) => {
  const event = req.body;
  
  switch(event.type) {
    case 'video.uploaded':
      console.log(`New video: ${event.video_id}`);
      // Trigger cross-posting workflow
      break;
      
    case 'comment.new':
      console.log(`New comment on ${event.video_id}`);
      // Trigger moderation workflow
      break;
      
    case 'quota.warning':
      console.log(`Quota at ${event.percentage}%`);
      // Alert administrators
      break;
  }
  
  res.sendStatus(200);
});

app.listen(3000);
```

## Monitoring & Alerts

### Quota Monitoring

```yaml
# .github/aicc/monitors/youtube-quota.yaml
name: YouTube Quota Monitor
type: metric
interval: 1h

check:
  skill: ailey-youtube
  command: detect
  
thresholds:
  - level: warning
    condition: ${quota.percentageUsed} > 80
    actions:
      - notify: slack
        message: "YouTube quota at ${quota.percentageUsed}%"
        
  - level: critical
    condition: ${quota.percentageUsed} > 95
    actions:
      - notify: slack
        channel: "#alerts"
        message: "🚨 YouTube quota at ${quota.percentageUsed}%!"
      - notify: email
        to: admin@example.com
        subject: "YouTube quota critical"
```

### Performance Monitoring

```yaml
# .github/aicc/monitors/youtube-performance.yaml
name: YouTube Performance Monitor
type: analytics
interval: 24h

check:
  skill: ailey-youtube
  command: analytics
  args:
    type: channel
    days: 7
    
thresholds:
  - metric: views
    condition: ${analytics.views.change} < -20%
    actions:
      - notify: slack
        message: "Views down ${analytics.views.change}% this week"
        
  - metric: subscribers
    condition: ${analytics.subscribers} % 1000 == 0
    actions:
      - notify: slack
        message: "🎉 Milestone: ${analytics.subscribers} subscribers!"
```

## Error Handling

The YouTube skill integrates with AI-ley's error handling:

### Automatic Retries

```yaml
# Configured in .github/aicc/aicc.yaml
integrations:
  youtube:
    errorHandling:
      retries: 3
      backoff: exponential  # 1s, 2s, 4s
      retryOn:
        - rateLimitExceeded
        - internalServerError
        - serviceUnavailable
```

### Fallback Actions

```yaml
# In workflows
actions:
  - name: Upload video
    skill: ailey-youtube
    command: upload
    onError:
      - action: log
        level: error
        message: "Upload failed: ${error.message}"
        
      - action: webhook
        url: ${env.ERROR_WEBHOOK}
        data:
          skill: youtube
          error: ${error}
          
      - action: retry
        delay: 3600  # Retry in 1 hour
```

## Security Best Practices

### 1. Credential Management

- Store credentials in `.env` (never commit)
- Use environment variables in config files
- Rotate tokens regularly
- Use OAuth refresh tokens

### 2. Quota Protection

- Enable quota monitoring
- Set warning thresholds
- Implement rate limiting in workflows
- Request quota increases before scaling

### 3. Access Control

- Use service accounts for automation
- Limit OAuth scopes to required permissions
- Audit API access regularly
- Monitor for unauthorized usage

## Testing

### Test YouTube Integration

```bash
# From project root
cd .github/skills/ailey-youtube

# Run tests
npm test

# Test specific features
npm run youtube detect
npm run youtube test
npm run diagnose
```

### Integration Tests

Create test workflows:

```yaml
# .github/aicc/tests/youtube-integration.yaml
name: YouTube Integration Test
type: integration_test

tests:
  - name: Test authentication
    skill: ailey-youtube
    command: test
    expect:
      status: success
      
  - name: Test quota detection
    skill: ailey-youtube
    command: detect
    expect:
      status: success
      quota.dailyQuota: 10000
      
  - name: Test video list
    skill: ailey-youtube
    command: videos.list
    args:
      maxResults: 1
    expect:
      status: success
```

Run tests:

```bash
npm run aicc test youtube-integration
```

## Troubleshooting

### Common Integration Issues

**Issue: Skill not detected by AI-ley**

```bash
# Verify skill is in correct location
ls .github/skills/ailey-youtube/

# Rebuild skill
cd .github/skills/ailey-youtube
npm run build

# Check AI-ley config
cat .github/aicc/aicc.yaml | grep youtube
```

**Issue: Credentials not loading**

```bash
# Check environment variables
env | grep YOUTUBE

# Verify .env file
cat .github/skills/ailey-youtube/.env

# Test connection directly
cd .github/skills/ailey-youtube
npm test
```

**Issue: Workflow not triggering**

```bash
# Validate workflow syntax
npm run aicc validate youtube-auto-upload

# Check workflow logs
npm run aicc logs youtube-auto-upload

# Test workflow manually
npm run aicc run youtube-auto-upload
```

## Support & Resources

- **Skill Documentation**: [SKILL.md](./SKILL.md)
- **Examples**: [EXAMPLES.md](./EXAMPLES.md)
- **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- **YouTube API Docs**: https://developers.google.com/youtube/v3
- **AI-ley Documentation**: [../../aicc/README.md](../../aicc/README.md)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
---
