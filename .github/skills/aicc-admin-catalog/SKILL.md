---
id: aicc-admin-catalog
name: AI Kit Catalog Manager
description: Manage AI Kit catalogs with installation, configuration, updates, and evolution workflows. Install kits from GitHub, track files with surgical removal, apply pattern-based mapping, and contribute changes back to source repositories.
keywords: [catalog, kit-manager, git, automation, dependency-management]
tools: [simple-git, glob, fs-extra, ajv]
---

# AI Kit Catalog Manager

Comprehensive catalog management system for AI kits with git-based distribution, dependency resolution, and evolution workflows.

## Overview

The Catalog Manager provides a complete package management system for AI kits:

- **List & Filter**: Browse available and installed kits
- **Install**: Clone from GitHub with dependency resolution
- **Configure**: Manage kit options and feature flags
- **Update**: Incremental updates with refresh intervals
- **Remove**: Surgical file removal via manifest tracking
- **Evolve**: Contribute changes back to source repositories

## Features

✅ **Git-based Distribution** - Clone and cache kits from GitHub repositories  
✅ **Dependency Resolution** - Automatic installation of required kits  
✅ **Pattern Matching** - Glob patterns for flexible file mapping  
✅ **Agentic System Support** - Filter by copilot, claude, cursor, windsurf, etc.  
✅ **Schema Validation** - JSON Schema validation for kit structures  
✅ **Manifest Tracking** - Surgical file removal with complete audit trail  
✅ **Refresh Intervals** - Automatic updates based on configured intervals  
✅ **Evolution Workflow** - Branch creation and PR generation for contributions  
✅ **Error Recovery** - Exponential backoff and retry logic  
✅ **Dry Run Mode** - Preview changes before applying  
✅ **Self-Protection** - Prevents operations on the same repository to avoid conflicts  

## Installation

```bash
cd .github/skills/aicc-admin-catalog
npm install
```

## Quick Start

### 1. List Available Kits

```bash
npm run catalog list
npm run catalog list -- --installed
npm run catalog list -- --pattern "ailey-*"
```

### 2. Install a Kit

```bash
npm run catalog install ai-ley
npm run catalog install ai-ley -- --verbose
npm run catalog install my-custom-kit -- --force
```

### 3. Update a Kit

```bash
npm run catalog update ai-ley
npm run catalog update ai-ley -- --force
```

### 4. Configure a Kit

```bash
npm run catalog configure ai-ley -- --list
npm run catalog configure ai-ley -- --set apiKey=abc123 enabled=true
npm run catalog configure ai-ley -- --get apiKey
```

### 5. Remove a Kit

```bash
npm run catalog remove ai-ley -- --force
npm run catalog remove ai-ley -- --verbose --dry-run
```

### 6. Evolve a Kit (Contribute Back)

```bash
npm run catalog evolve ai-ley -- --branch my-feature --pr
npm run catalog evolve ai-ley -- --message "Add new templates"
```

## CLI Commands

### `list` - List Catalog Kits

```bash
npm run catalog list [options]

Options:
  -i, --installed         Show only installed kits
  -c, --custom            Show only custom kits
  -p, --pattern <pattern> Filter by name pattern (regex)
  --has-icon              Show only kits with icons
  -v, --verbose           Verbose output
```

### `install` - Install Kit

```bash
npm run catalog install <kitName> [options]

Options:
  -f, --force       Force reinstall if already installed
  --skip-deps       Skip dependency installation
  -v, --verbose     Verbose output
  --dry-run         Preview without making changes
```

### `update` - Update Kit

```bash
npm run catalog update <kitName> [options]

Options:
  -f, --force       Force update regardless of refresh interval
  -v, --verbose     Verbose output
  --dry-run         Preview without making changes
```

### `remove` - Remove Kit

```bash
npm run catalog remove <kitName> [options]

Options:
  -f, --force       Force removal without confirmation
  -v, --verbose     Verbose output
  --dry-run         Preview without making changes
```

### `configure` - Configure Kit

```bash
npm run catalog configure <kitName> [options]

Options:
  -s, --set <key=value...>  Set configuration values
  -g, --get <key>           Get configuration value
  -l, --list                List all configuration values
  -v, --verbose             Verbose output
```

### `evolve` - Contribute Changes

```bash
npm run catalog evolve <kitName> [options]

Options:
  -b, --branch <name>    Branch name for evolution
  -m, --message <msg>    Commit message
  --pr                   Show PR creation instructions
  -v, --verbose          Verbose output
  --dry-run              Preview without making changes
```

## Kit Structure Schema

Kits are defined by a `structure.json` file conforming to `structure.v1.schema.json`:

```json
{
  "$schema": "../../../aicc/schemas/structure.v1.schema.json",
  "version": "1.0.0",
  "name": "my-kit",
  "repo": "https://github.com/user/my-kit",
  "branch": "main",
  "description": "My awesome AI kit",
  "author": "Your Name",
  "refreshEnabled": true,
  "refreshInterval": 86400,
  "evolveEnabled": true,
  "icon": "icon.png",
  "dependencies": ["ai-ley"],
  "folderMapping": [
    {
      "source": ".github",
      "target": ".github",
      "type": "folder",
      "recursionDepth": -1,
      "forceReplace": false,
      "supportedAgentic": ["copilot", "claude"],
      "exclude": ["*.log", "node_modules/**"]
    },
    {
      "source": "templates",
      "target": ".github/templates",
      "type": "pattern",
      "pattern": "**/*.md",
      "rename": {
        "pattern": "^(.+)\\.template\\.md$",
        "replacement": "$1.md"
      },
      "supportedAgentic": "*"
    }
  ]
}
```

### Folder Mapping Types

**1. `folder` - Copy entire directory**

```json
{
  "source": ".github/prompts",
  "target": ".github/prompts",
  "type": "folder",
  "recursionDepth": 2,
  "exclude": ["*.bak"]
}
```

**2. `file` - Copy single file**

```json
{
  "source": "README.md",
  "target": ".github/README.md",
  "type": "file"
}
```

**3. `pattern` - Copy files matching glob**

```json
{
  "source": "skills",
  "target": ".github/skills",
  "type": "pattern",
  "pattern": "**/*.md",
  "exclude": ["**/node_modules/**"]
}
```

### Pattern-Based Renaming

```json
{
  "rename": {
    "pattern": "^(.+)\\.template\\.md$",
    "replacement": "$1.md"
  }
}
```

### Agentic System Support

Filter mappings by agentic system:

```json
{
  "supportedAgentic": ["copilot", "claude", "cursor"]
}
```

Supported systems:
- `copilot` - GitHub Copilot
- `claude` - Claude Code
- `cursor` - Cursor AI
- `windsurf` - Windsurf
- `codex` - OpenAI Codex
- `gemini` - Google Gemini
- `custom` - Custom systems
- `*` - All systems (default)

## Directory Structure

```
.github/aicc/
  catalog/
    ai-ley/
      structure.json         # Kit definition
      icon.png               # Kit icon (optional)
    my-kit/
      structure.json
  schemas/
    structure.v1.schema.json # Schema definition

.my/aicc/
  catalog/
    ai-ley/
      structure.json         # Installed kit config
      config.json            # Kit configuration schema
      config.values.json     # User config values
      manifest.json          # File tracking manifest

~/.vscode/cache/
  ai-ley_main/               # Git cache
    .git/
    .github/
  ai-ley_main.lastUpdated    # Timestamp file
```

## Manifest Tracking

Every installed kit creates a manifest tracking all copied files:

```json
{
  "kitName": "ai-ley",
  "version": "1.0.0",
  "installedAt": 1706832000000,
  "updatedAt": 1706918400000,
  "files": [
    {
      "source": "/cache/ai-ley/.github/prompts/example.md",
      "target": "/workspace/.github/prompts/example.md",
      "hash": "abc123...",
      "timestamp": 1706832000000,
      "mapping": { /* folder mapping object */ }
    }
  ]
}
```

This enables:
- Surgical removal of kit files
- Detection of modified files
- Audit trail of changes
- Selective updates

## Error Recovery

All git operations include retry logic with exponential backoff:

```typescript
// Configured via environment
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_BASE=2
MAX_BACKOFF_TIME=30
```

**Retry Strategy:**
1. Attempt 1: Immediate
2. Attempt 2: Wait 2s
3. Attempt 3: Wait 4s
4. Attempt 4: Wait 8s (capped at MAX_BACKOFF_TIME)

## Evolution Workflow

Contribute changes back to kit repositories:

1. **Modify files** in `.my/` (excluding `.my/aicc/catalog`)
2. **Run evolve**: `npm run catalog evolve ai-ley -- --branch my-feature`
3. **Creates**:
   - New cache copy at `~/.vscode/cache/ai-ley_my-feature`
   - New git branch `my-feature`
   - Copies `.my/**` to cache `.github/**`
   - Commits and pushes changes
4. **Create PR** manually at provided URL

## Environment Variables

```bash
# Default agentic system
AGENTIC_SYSTEM=copilot

# Git cache directory
GIT_CACHE_DIR=~/.vscode/cache

# Retry configuration
MAX_RETRY_ATTEMPTS=3
RETRY_BACKOFF_BASE=2
MAX_BACKOFF_TIME=30

# Logging
VERBOSE=false

# Dry run mode
DRY_RUN=false
```

## Contributing Guidelines

When creating or modifying kits:

1. **Naming Convention**: Use `ailey-*` or `ai-ley` prefix to avoid conflicts
2. **Schema Compliance**: Validate against `structure.v1.schema.json`
3. **Agentic Filtering**: Specify supported systems in mappings
4. **Dependencies**: List required kits in `dependencies` array
5. **Icon**: Provide 256x256 PNG icon for catalog display
6. **Documentation**: Include README.md in kit root
7. **Evolution**: Enable `evolveEnabled: true` for community contributions

## Troubleshooting

### Git Authentication

The tool uses your system's git credentials. Configure beforehand:

```bash
# HTTPS
git config --global credential.helper store

# SSH
ssh-add ~/.ssh/id_rsa
```

### Cache Issues

Clear cache manually if corrupted:

```bash
rm -rf ~/.vscode/cache/kitname_branch
rm ~/.vscode/cache/kitname_branch.lastUpdated
```

### Schema Validation Errors

Validate structure manually:

```bash
npm install -g ajv-cli
ajv validate -s .github/aicc/schemas/structure.v1.schema.json \
             -d .github/aicc/catalog/my-kit/structure.json
```

### Manifest Corruption

Rebuild manifest by reinstalling:

```bash
npm run catalog remove my-kit -- --force
npm run catalog install my-kit
```

## Best Practices

1. **Use Dry Run**: Test operations with `--dry-run` before applying
2. **Version Control**: Keep `.my/` in git for tracking modifications
3. **Dependencies**: Install dependencies explicitly before dependent kits
4. **Refresh Intervals**: Set reasonable intervals (86400s = 24 hours)
5. **Pattern Exclusions**: Exclude build artifacts and node_modules
6. **Agentic Filtering**: Target specific systems when needed
7. **Manifest Cleanup**: Periodically verify manifest accuracy
8. **Separate Projects**: Never run install/update/remove on kits from the same repository

## Safety Features

### Self-Protection

The catalog manager includes built-in protection against modifying itself:

- **Install Protection**: Cannot install kits from the same repository
- **Update Protection**: Cannot update kits from the same repository  
- **Remove Protection**: Cannot remove kits from the same repository

**Example Error:**

```
⛔ Operation not allowed:
Cannot install kit "aicc-admin-catalog" from the same repository.
This would modify the catalog manager itself and could cause conflicts.
Please run this operation from a different project.
```

This prevents accidental corruption or deletion of the catalog manager when running commands from within the ai-command-center repository.

## Examples

### Create Custom Kit

```bash
# 1. Create structure
mkdir -p .my/aicc/catalog/my-kit
cat > .my/aicc/catalog/my-kit/structure.json << 'EOF'
{
  "name": "my-kit",
  "repo": "https://github.com/me/my-kit",
  "branch": "main",
  "folderMapping": {
    "source": ".github",
    "target": ".github",
    "type": "folder",
    "supportedAgentic": ["copilot"]
  }
}
EOF

# 2. Install
npm run catalog install my-kit
```

### Update All Installed Kits

```bash
npm run catalog list -- --installed | while read line; do
  kit=$(echo $line | awk '{print $2}')
  npm run catalog update $kit
done
```

### Export Kit List

```bash
npm run catalog list -- --verbose > kits.txt
```

## See Also

- [Structure Schema](../../../aicc/schemas/structure.v1.schema.json)
- [Git Operations Documentation](./scripts/git-operations.ts)
- [Manifest Tracking](./scripts/manifest.ts)

---

version: 1.0.0
updated: 2026-02-04
reviewed: 2026-02-04
score: 4.7
---
