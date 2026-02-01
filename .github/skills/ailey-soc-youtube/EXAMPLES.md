# YouTube Content Manager - Example Workflows

## Complete Setup Workflow

```bash
# 1. Navigate to skill directory
cd .github/skills/ailey-soc-youtube

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Get setup instructions
npm run setup

# 5. Configure Google Cloud (follow setup output)
# - Create project at https://console.cloud.google.com/
# - Enable YouTube Data API v3 & YouTube Analytics API
# - Create OAuth credentials
# - Add credentials to .env

# 6. Authenticate
npm run auth start
# Visit the URL, authorize, copy the code

npm run auth token YOUR_CODE_HERE

# 7. Test connection
npm test

# 8. Check quota
npm run detect
```

## Daily Content Creator Workflow

### Morning: Plan & Check Status

```bash
# Check quota availability
npm run detect

# Check channel stats
npm run youtube channel stats

# Review yesterday's performance
npm run analytics channel -- --days 1
```

### Content Upload

```bash
# Upload today's video
npm run upload todays-video.mp4 -- \
  --title "Daily Vlog - $(date +%B\ %d,\ %Y)" \
  --description "Today's adventures and updates!" \
  --tags "daily,vlog,lifestyle,$(date +%Y)" \
  --category 22 \
  --privacy public \
  --thumbnail todays-thumbnail.jpg \
  --playlist "PLxxxxxxxxx"  # Your daily series playlist ID

# Add to multiple playlists
VIDEO_ID="abc123"  # From upload output
npm run youtube playlists add PLAYLIST_2_ID $VIDEO_ID
npm run youtube playlists add PLAYLIST_3_ID $VIDEO_ID
```

### Engagement Management

```bash
# Check new comments
npm run comments list LATEST_VIDEO_ID | head -20

# Reply to top comments
npm run comments reply COMMENT_ID_1 -- --text "Thanks so much! More coming soon!"
npm run comments reply COMMENT_ID_2 -- --text "Great question! I'll cover that next week."

# Moderate spam
npm run youtube comments moderate LATEST_VIDEO_ID -- --spam-filter aggressive
```

### Evening: Analytics Review

```bash
# Check video performance
npm run analytics video TODAYS_VIDEO_ID

# Check traffic sources
npm run youtube analytics traffic TODAYS_VIDEO_ID

# Export daily report
npm run youtube analytics export -- \
  --format csv \
  --start-date $(date +%Y-%m-%d) \
  --end-date $(date +%Y-%m-%d) \
  --output daily-report-$(date +%Y%m%d).csv
```

## Series Launch Workflow

### 1. Create Series Playlist

```bash
# Create playlist for series
PLAYLIST_ID=$(npm run youtube playlists create -- \
  --title "Complete Tutorial Series 2026" \
  --description "10-part comprehensive tutorial series" \
  --privacy unlisted | grep -o 'PL[a-zA-Z0-9_-]*')

echo "Playlist ID: $PLAYLIST_ID"
```

### 2. Batch Upload Episodes

```bash
# Upload all episodes (private first for review)
for i in {1..10}; do
  echo "Uploading Episode $i..."
  
  npm run upload "episode-$i.mp4" -- \
    --title "Tutorial Series - Part $i: [Topic]" \
    --description "Episode $i of our comprehensive tutorial series..." \
    --tags "tutorial,series,education,part$i" \
    --category 27 \
    --privacy private \
    --thumbnail "episode-$i-thumb.jpg" \
    --playlist "$PLAYLIST_ID" \
    --position $(($i - 1))
  
  sleep 2  # Rate limiting
done
```

### 3. Review & Publish

```bash
# List all videos in playlist
npm run youtube playlists videos $PLAYLIST_ID

# After review, make public
for VIDEO_ID in $(npm run youtube playlists videos $PLAYLIST_ID | grep -o 'video_id: .*' | cut -d' ' -f2); do
  npm run youtube videos update $VIDEO_ID -- --privacy public
  echo "Published: $VIDEO_ID"
done

# Update playlist to public
npm run youtube playlists update $PLAYLIST_ID -- --privacy public
```

## Live Streaming Workflow

### Setup Weekly Live Stream

```bash
# Create scheduled broadcast
BROADCAST_ID=$(npm run youtube live create -- \
  --title "Weekly Q&A - $(date +%B\ %d,\ %Y)" \
  --description "Join me for this week's Q&A session!" \
  --scheduled-start "$(date -v+fri -v15H -v0M -v0S +%Y-%m-%dT%H:%M:%SZ)" \
  | grep -o 'broadcast_id: .*' | cut -d' ' -f2)

echo "Broadcast ID: $BROADCAST_ID"

# Get stream key for OBS/streaming software
npm run youtube live stream-key $BROADCAST_ID
```

### During Stream

```bash
# Start the broadcast
npm run youtube live start $BROADCAST_ID

# Monitor stream health
watch -n 10 "npm run youtube live health $BROADCAST_ID"

# Manage live chat (in another terminal)
npm run youtube live chat $BROADCAST_ID -- --message "Welcome everyone!"
npm run youtube live chat $BROADCAST_ID -- --message "Drop your questions below!"
```

### Post-Stream

```bash
# End the broadcast
npm run youtube live stop $BROADCAST_ID

# Get stream analytics
npm run analytics video $BROADCAST_ID

# Export chat transcript
npm run youtube live export-chat $BROADCAST_ID -- --output chat-transcript.txt
```

## Multi-Channel Management Workflow

### Switch Between Channels

```bash
# Channel 1 (Main)
export YOUTUBE_ACCESS_TOKEN="main_channel_token"
export YOUTUBE_REFRESH_TOKEN="main_refresh_token"

npm run youtube channel info
npm run upload main-content.mp4 -- --title "Main Channel Video"

# Channel 2 (Secondary)
export YOUTUBE_ACCESS_TOKEN="second_channel_token"
export YOUTUBE_REFRESH_TOKEN="second_refresh_token"

npm run youtube channel info
npm run upload secondary-content.mp4 -- --title "Second Channel Video"
```

### Cross-Channel Analytics

```bash
# Create combined report
for CHANNEL in "main" "secondary" "gaming"; do
  export YOUTUBE_ACCESS_TOKEN="${CHANNEL}_token"
  export YOUTUBE_REFRESH_TOKEN="${CHANNEL}_refresh"
  
  npm run analytics channel -- --days 30 > "${CHANNEL}-analytics.json"
done

# Combine reports
echo "Combined Channel Analytics" > all-channels-report.txt
cat main-analytics.json secondary-analytics.json gaming-analytics.json >> all-channels-report.txt
```

## Content Optimization Workflow

### A/B Test Thumbnails

```bash
# Upload video unlisted
VIDEO_ID=$(npm run upload test-video.mp4 -- \
  --title "Test Video" \
  --privacy unlisted \
  --thumbnail thumbnail-A.jpg | grep -o 'id: .*' | cut -d' ' -f2)

# Wait 24 hours, check performance
sleep 86400
npm run analytics video $VIDEO_ID > thumbnail-A-stats.json

# Try thumbnail B
npm run youtube videos update-thumbnail $VIDEO_ID thumbnail-B.jpg

# Wait another 24 hours
sleep 86400
npm run analytics video $VIDEO_ID > thumbnail-B-stats.json

# Compare results
echo "Thumbnail A CTR: $(cat thumbnail-A-stats.json | grep ctr)"
echo "Thumbnail B CTR: $(cat thumbnail-B-stats.json | grep ctr)"
```

### Keyword Research

```bash
# Search for trending topics
npm run search -- \
  --query "AI tutorial" \
  --max-results 50 \
  --order viewCount \
  --published-after "$(date -v-7d +%Y-%m-%dT%H:%M:%SZ)"

# Analyze competitor tags
COMPETITOR_VIDEO_ID="xyz123"
npm run youtube videos get $COMPETITOR_VIDEO_ID | grep tags

# Find related videos
npm run search related $COMPETITOR_VIDEO_ID
```

## Automation & Scripting

### Automated Daily Upload

```bash
#!/bin/bash
# daily-upload.sh

DATE=$(date +%Y-%m-%d)
VIDEO_FILE="/path/to/automated/videos/${DATE}.mp4"
THUMBNAIL="/path/to/automated/thumbnails/${DATE}.jpg"

if [ -f "$VIDEO_FILE" ]; then
  echo "Uploading video for $DATE..."
  
  npm run upload "$VIDEO_FILE" -- \
    --title "Daily Update - $DATE" \
    --description "Automated daily content for $DATE" \
    --tags "daily,automated,$(date +%Y)" \
    --privacy public \
    --thumbnail "$THUMBNAIL" \
    --playlist "PLxxxxxx"  # Daily playlist
  
  if [ $? -eq 0 ]; then
    echo "✅ Upload successful for $DATE"
    # Send notification
    curl -X POST https://your-webhook.com/notify \
      -d "message=Video uploaded for $DATE"
  else
    echo "❌ Upload failed for $DATE"
  fi
else
  echo "⚠️  No video found for $DATE"
fi
```

### Batch Comment Moderation

```bash
#!/bin/bash
# moderate-comments.sh

# Get all videos from last 7 days
VIDEOS=$(npm run youtube videos list -- --published-after "$(date -v-7d +%Y-%m-%dT%H:%M:%SZ)")

for VIDEO_ID in $VIDEOS; do
  echo "Moderating comments for $VIDEO_ID..."
  
  # Auto-reply to new comments
  npm run youtube comments auto-reply $VIDEO_ID -- \
    --template "Thanks for watching! Subscribe for more content!" \
    --only-new \
    --delay 60
  
  # Filter spam
  npm run youtube comments moderate $VIDEO_ID -- \
    --spam-filter aggressive \
    --auto-delete
done
```

### Weekly Analytics Report

```bash
#!/bin/bash
# weekly-report.sh

WEEK_START=$(date -v-mon -v-7d +%Y-%m-%d)
WEEK_END=$(date -v-mon -v-1d +%Y-%m-%d)

echo "Generating weekly report: $WEEK_START to $WEEK_END"

# Generate HTML report
npm run youtube analytics report -- \
  --start-date "$WEEK_START" \
  --end-date "$WEEK_END" \
  --output "reports/week-$(date +%Y%U).html"

# Generate CSV export
npm run youtube analytics export -- \
  --format csv \
  --start-date "$WEEK_START" \
  --end-date "$WEEK_END" \
  --metrics "views,watch-time,subscribers,likes,comments" \
  --dimensions "video,date" \
  --output "reports/week-$(date +%Y%U).csv"

# Email report
mail -s "Weekly YouTube Analytics" your@email.com < "reports/week-$(date +%Y%U).html"
```

## Quota Management Workflow

### Monitor Quota Throughout Day

```bash
#!/bin/bash
# quota-monitor.sh

while true; do
  QUOTA=$(npm run detect --json)
  PERCENT=$(echo $QUOTA | jq -r '.percentageUsed')
  
  if (( $(echo "$PERCENT > 80" | bc -l) )); then
    echo "⚠️  Quota warning: ${PERCENT}% used"
    # Send alert
    curl -X POST https://your-webhook.com/alert \
      -d "quota=${PERCENT}"
  fi
  
  sleep 3600  # Check every hour
done
```

### Request Quota Increase

```bash
# Generate usage analysis
npm run youtube quota analyze -- --days 30 > quota-usage-analysis.txt

# This creates a report showing:
# - Average daily usage
# - Peak usage days
# - Operations breakdown
# - Projected needs

# Use this report when requesting quota increase at:
# https://console.cloud.google.com/ → APIs & Services → Quotas
```

## Integration Examples

### With AI-ley Workflows

```yaml
# .github/aicc/workflows/auto-youtube.yaml
name: Auto YouTube Upload
trigger: file_created
pattern: ./exports/final/*.mp4

action:
  - name: Upload to YouTube
    skill: ailey-soc-youtube
    command: upload
    args:
      file: ${file.path}
      title: ${file.basename}
      description: Auto-generated content
      tags: ai-generated,automated
      privacy: private
      playlist: PLxxxxxx

  - name: Notify
    action: webhook
    url: https://your-webhook.com/notify
    data:
      video_id: ${youtube.video_id}
      status: uploaded
```

### With Social Media Cross-Posting

```bash
#!/bin/bash
# cross-post.sh

VIDEO_ID=$1

# Get video details
VIDEO_INFO=$(npm run youtube videos get $VIDEO_ID)
TITLE=$(echo $VIDEO_INFO | jq -r '.snippet.title')
URL="https://youtube.com/watch?v=${VIDEO_ID}"

# Post to Twitter
cd ../ailey-soc-twitter
npm run tweet "New video: $TITLE $URL #YouTube"

# Post to Facebook
cd ../ailey-soc-facebook
npm run post "Check out my new video: $TITLE" --link $URL

# Post to Instagram (story link)
cd ../ailey-soc-instagram
npm run story "New video up!" --link $URL
```

## Troubleshooting Workflows

### Diagnose All Issues

```bash
# Run comprehensive diagnostics
npm run diagnose

# Check specific components
npm run youtube verify-apis        # Verify API enablement
npm run youtube test-quota         # Test quota tracking
npm run youtube test-upload        # Test upload capability
npm run youtube test-analytics     # Test analytics access
```

### Recover from Quota Exhaustion

```bash
# Check when quota resets
npm run detect

# Schedule uploads for after reset
for video in pending/*.mp4; do
  echo "at midnight" npm run upload "$video" >> /tmp/youtube-queue
done

# Or spread uploads over multiple days
VIDEOS=(pending/*.mp4)
VIDEOS_PER_DAY=5

for ((i=0; i<${#VIDEOS[@]}; i+=VIDEOS_PER_DAY)); do
  DAY=$((i / VIDEOS_PER_DAY))
  echo "Day $DAY uploads:"
  for ((j=0; j<VIDEOS_PER_DAY && i+j<${#VIDEOS[@]}; j++)); do
    echo "  - ${VIDEOS[i+j]}"
  done
done
```

---

## Tips & Best Practices

### Quota Optimization

```bash
# Bad: Multiple individual updates
npm run youtube videos update VIDEO_ID -- --title "New Title"
npm run youtube videos update VIDEO_ID -- --description "New Desc"
npm run youtube videos update VIDEO_ID -- --tags "new,tags"
# Cost: 150 units (50 × 3)

# Good: Single combined update
npm run youtube videos update VIDEO_ID -- \
  --title "New Title" \
  --description "New Desc" \
  --tags "new,tags"
# Cost: 50 units
```

### Error Handling

```bash
# Retry on failure with exponential backoff
upload_with_retry() {
  local file=$1
  local max_attempts=3
  local attempt=1
  local delay=1
  
  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt/$max_attempts..."
    
    if npm run upload "$file" -- "${@:2}"; then
      echo "✅ Success!"
      return 0
    fi
    
    echo "❌ Failed, waiting ${delay}s..."
    sleep $delay
    delay=$((delay * 2))
    attempt=$((attempt + 1))
  done
  
  echo "❌ All attempts failed"
  return 1
}

# Usage
upload_with_retry video.mp4 --title "My Video" --privacy public
```

---

See [SKILL.md](./SKILL.md) for complete documentation.
