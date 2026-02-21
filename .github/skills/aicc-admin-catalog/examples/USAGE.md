# Example Usage Scenarios

## Scenario 1: Install AI-ley Kit

```bash
# List available kits
npm run catalog list

# Install ai-ley with dependencies
npm run catalog install ai-ley --verbose

# Verify installation
npm run catalog list -- --installed
```

**Expected Output:**
```
📦 Installing kit: ai-ley

📋 Checking dependencies...
📥 Cloning repository...
✓ Using cached repository
📂 Processing mapping: .github -> .github
✓ Copied 245 files

✨ Kit "ai-ley" installed successfully!
   Total files: 245
```

## Scenario 2: Create and Install Custom Kit

```bash
# 1. Create custom kit structure
mkdir -p .my/aicc/catalog/my-automation-kit

cat > .my/aicc/catalog/my-automation-kit/structure.json << 'EOF'
{
  "name": "my-automation-kit",
  "repo": "https://github.com/yourname/automation-kit",
  "branch": "main",
  "description": "Custom automation scripts and templates",
  "refreshEnabled": true,
  "refreshInterval": "86400",
  "folderMapping": {
    "source": "scripts",
    "target": ".github/scripts/automation",
    "type": "pattern",
    "pattern": "**/*.sh",
    "supportedAgentic": ["*"]
  }
}
EOF

# 2. Install the kit
npm run catalog install my-automation-kit
```

## Scenario 3: Update Kit with Refresh Interval

```bash
# Check if update is needed (respects refreshInterval)
npm run catalog update ai-ley

# Force update regardless of interval
npm run catalog update ai-ley --force --verbose
```

**Expected Output:**
```
🔄 Updating kit: ai-ley

🔄 Updating repository...
📂 Updating mapping: .github -> .github
✓ Updated 12 files

✨ Kit "ai-ley" updated successfully!
   Total files: 12
```

## Scenario 4: Configure Kit Settings

```bash
# List current configuration
npm run catalog configure ai-ley -- --list

# Set multiple values
npm run catalog configure ai-ley -- --set \
  apiKey=abc123 \
  enabled=true \
  features='["search","analyze"]'

# Get specific value
npm run catalog configure ai-ley -- --get apiKey
```

**Expected Output:**
```
⚙️  Configuration for ai-ley:

apiKey: "abc123"
enabled: true
features: ["search", "analyze"]
```

## Scenario 5: Evolve Kit (Contribute Back)

```bash
# 1. Make changes in .my/ folder
echo "# My Custom Template" > .my/prompts/custom.prompt.md

# 2. Evolve the kit
npm run catalog evolve ai-ley -- \
  --branch feature/add-custom-template \
  --message "Add custom prompt template" \
  --pr

# 3. Follow PR creation URL
```

**Expected Output:**
```
🚀 Evolving kit: ai-ley

📋 Copying cache to new branch location...
🌿 Creating branch: feature/add-custom-template
✓ Copied 15 modified files
💾 Committing changes...

✨ Kit "ai-ley" evolved successfully!
   Branch: feature/add-custom-template

⚠️  Create pull request manually at:
   https://github.com/armoin2018/ai-ley/compare/dev...feature/add-custom-template
```

## Scenario 6: Remove Kit

```bash
# Dry run to see what would be removed
npm run catalog remove old-kit -- --dry-run --verbose

# Remove kit with confirmation
npm run catalog remove old-kit -- --force
```

**Expected Output:**
```
🗑️  Removing kit: old-kit

📋 Found 127 tracked files
   Removing: .github/prompts/old-template.md
   Removing: .github/skills/old-skill/package.json
   ...

✨ Kit "old-kit" removed successfully!
   Removed 127 files
```

## Scenario 7: Filter and Bulk Operations

```bash
# List installed kits only
npm run catalog list -- --installed

# List custom kits
npm run catalog list -- --custom

# List kits matching pattern
npm run catalog list -- --pattern "ailey-*"

# Update all installed kits (bash)
npm run catalog list -- --installed | grep -v "^$" | while read line; do
  kit=$(echo "$line" | awk '{print $2}')
  npm run catalog update "$kit"
done
```

## Scenario 8: Agentic System Filtering

```bash
# Set agentic system in environment
export AGENTIC_SYSTEM=claude

# Install kit (only mappings supporting claude will be copied)
npm run catalog install multi-platform-kit

# Switch to different system
export AGENTIC_SYSTEM=copilot
npm run catalog update multi-platform-kit --force
```

## Scenario 9: Pattern-Based File Mapping

Example kit with advanced patterns:

```json
{
  "name": "template-kit",
  "repo": "https://github.com/user/template-kit",
  "branch": "main",
  "folderMapping": [
    {
      "source": "templates",
      "target": ".github/templates",
      "type": "pattern",
      "pattern": "**/*.template.md",
      "exclude": ["**/draft/**", "**/*.backup.*"],
      "rename": {
        "pattern": "^(.+)\\.template\\.md$",
        "replacement": "$1.md"
      }
    }
  ]
}
```

```bash
npm run catalog install template-kit
```

**Result:**
- `templates/prompt.template.md` → `.github/templates/prompt.md`
- `templates/skill.template.md` → `.github/templates/skill.md`
- `templates/draft/test.template.md` → **EXCLUDED**

## Scenario 10: Dependency Chain Installation

```bash
# Kit A depends on Kit B, which depends on Kit C
# Installing Kit A automatically installs B and C

npm run catalog install kit-a

# Skip dependencies for manual control
npm run catalog install kit-a -- --skip-deps
```

**Expected Output:**
```
📦 Installing kit: kit-a

📋 Checking dependencies...
⚠️  Installing dependency: kit-b
📦 Installing kit: kit-b
   ...
⚠️  Installing dependency: kit-c
📦 Installing kit: kit-c
   ...
✓ Dependency kit-c already installed
✓ Dependency kit-b already installed

📥 Cloning repository...
...
✨ Kit "kit-a" installed successfully!
```

## Troubleshooting Examples

### Fix Git Authentication

```bash
# HTTPS with credential caching
git config --global credential.helper 'cache --timeout=3600'

# SSH key
ssh-add ~/.ssh/id_rsa
ssh -T git@github.com
```

### Clear Corrupted Cache

```bash
rm -rf ~/.vscode/cache/ai-ley_main
rm ~/.vscode/cache/ai-ley_main.lastUpdated

npm run catalog install ai-ley
```

### Validate Kit Structure

```bash
npm install -g ajv-cli

ajv validate \
  -s .github/aicc/schemas/structure.v1.schema.json \
  -d .my/aicc/catalog/my-kit/structure.json
```

### Debug Installation Issues

```bash
# Enable verbose mode and dry run
export VERBOSE=true
export DRY_RUN=true

npm run catalog install problematic-kit -- --verbose --dry-run
```
