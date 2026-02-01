# Gamma Skill Setup Guide

Complete setup guide for the ailey-gamma skill.

## Prerequisites

### 1. Node.js

**Required:** Node.js 18 or higher

**Check Version:**
```bash
node --version
```

**Install/Update:**

**macOS (Homebrew):**
```bash
brew install node
```

**Ubuntu/Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Windows (Chocolatey):**
```bash
choco install nodejs
```

### 2. Gamma API Key

**Get API Key:**

1. Go to https://gamma.app
2. Sign up or log in
3. Navigate to Settings → API
4. Click "Generate API Key"
5. Copy the key (starts with `gamma_`)

**Note:** Keep your API key secure. Never commit it to version control.

## Installation

### 1. Install Dependencies

```bash
cd .github/skills/ailey-gamma
npm install
```

**Expected Output:**
```
added 45 packages, and audited 46 packages in 3s

6 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

### 2. Configure API Key

Choose one of three methods:

**Method 1: Global Configuration (Recommended)**

```bash
# Create or edit ~/.vscode/.env
echo "GAMMA_API_KEY=gamma_your_api_key_here" >> ~/.vscode/.env
```

**Method 2: Project Configuration**

```bash
# Create or edit .env in project root
echo "GAMMA_API_KEY=gamma_your_api_key_here" >> ../../../.env
```

**Method 3: Skill-Specific Configuration**

```bash
# Create .env.local in skill directory
echo "GAMMA_API_KEY=gamma_your_api_key_here" > .env.local
```

**Priority:** `.env.local` > `.env` > `~/.vscode/.env`

### 3. Test Installation

```bash
npm run gamma test
```

**Expected Output:**
```
Testing Gamma API connection...
✅ Gamma API connection successful!
```

**If Test Fails:**
```
❌ Gamma API connection failed. Check your API key.
```

See [Troubleshooting](#troubleshooting) section below.

## Quick Start

### Test Basic Commands

```bash
# List available themes
npm run gamma themes

# List your projects
npm run gamma projects

# Create test presentation
echo "# Test Presentation\n\nThis is a test." > test.md
npm run gamma create file -i test.md

# Export to PowerPoint (use project ID from previous command)
npm run gamma export pptx -p PROJECT_ID -o test.pptx
```

## Environment Variables

### GAMMA_API_KEY

**Format:** `gamma_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Where to Set:**
- `~/.vscode/.env` - Global for all projects
- `.env` - Project-specific
- `.env.local` - Skill-specific (not committed to git)

**Example .env file:**
```bash
# Gamma API Configuration
GAMMA_API_KEY=gamma_abc123def456ghi789jkl012mno345pqr

# Optional: Set default theme
GAMMA_DEFAULT_THEME=modern
```

## Common Issues

### Issue 1: API Key Not Found

**Error:**
```
Error: Gamma API key not found. Set GAMMA_API_KEY in:
  - ~/.vscode/.env
  - .env
  - .env.local
Or pass as constructor parameter.
```

**Solution:**
```bash
# Check if API key is set
cat ~/.vscode/.env | grep GAMMA_API_KEY

# If not found, add it
echo "GAMMA_API_KEY=your-key-here" >> ~/.vscode/.env

# Test again
npm run gamma test
```

### Issue 2: Invalid API Key

**Error:**
```
❌ Gamma API connection failed. Check your API key.
```

**Solution:**
1. Verify API key format starts with `gamma_`
2. Check for extra spaces or newlines in .env file
3. Generate new API key at https://gamma.app/api
4. Update .env file and test again

### Issue 3: Module Not Found

**Error:**
```
Error: Cannot find module 'axios'
```

**Solution:**
```bash
# Reinstall dependencies
npm install

# If still failing, clear cache
rm -rf node_modules package-lock.json
npm install
```

### Issue 4: Permission Denied

**Error:**
```
Error: EACCES: permission denied
```

**Solution:**
```bash
# Fix npm permissions (macOS/Linux)
sudo chown -R $USER ~/.npm
sudo chown -R $USER node_modules

# Or use npm prefix
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

### Issue 5: File Not Found

**Error:**
```
Error: Input file not found: content.md
```

**Solution:**
```bash
# Use absolute path
npm run gamma create file -i /full/path/to/content.md

# Or verify file exists
ls -l content.md

# Check current directory
pwd
```

### Issue 6: Export Fails

**Error:**
```
Failed to export presentation: Project not found
```

**Solution:**
```bash
# List projects to verify ID
npm run gamma projects

# Use correct project ID
npm run gamma export pptx -p correct-id -o output.pptx
```

## Verify Installation

Run the full test suite:

```bash
# Test API connection
npm run gamma test

# List themes (should show 10+ themes)
npm run gamma themes

# List projects
npm run gamma projects

# Create test presentation
echo "# Test\n\nContent" > test.md
npm run gamma create file -i test.md
rm test.md
```

**All tests passed?** You're ready to use ailey-gamma! 🎉

## Next Steps

1. **Read the full documentation**: [SKILL.md](SKILL.md)
2. **Explore workflows**: See [Workflow 1](SKILL.md#workflow-1-create-presentation-from-file) for creating presentations
3. **Browse themes**: [Gamma Themes Reference](references/themes.md)
4. **API details**: [Gamma API Reference](references/gamma-api.md)

## Additional Resources

- **Gamma Documentation**: https://gamma.app/docs
- **Gamma API**: https://gamma.app/api
- **Support**: https://gamma.app/support

---
