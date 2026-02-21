# AI Kit Catalog Manager

Manage AI kits with git-based distribution, dependency resolution, and evolution workflows.

## Quick Start

```bash
npm install

# List available kits
npm run catalog list

# Install a kit
npm run catalog install ai-ley

# Update a kit  
npm run catalog update ai-ley

# Configure a kit
npm run catalog configure ai-ley -- --list
npm run catalog configure ai-ley -- --set apiKey=abc123

# Remove a kit
npm run catalog remove ai-ley -- --force

# Contribute changes back
npm run catalog evolve ai-ley -- --branch my-feature --pr
```

## Features

- 📦 **Git-based** - Clone and cache from GitHub
- 🔗 **Dependencies** - Automatic resolution
- 🎯 **Pattern Matching** - Glob-based file mapping
- 🤖 **Agentic Filtering** - Support copilot, claude, cursor, etc.
- ✅ **Schema Validation** - JSON Schema compliance
- 📋 **Manifest Tracking** - Surgical file removal
- ⏰ **Auto Updates** - Refresh intervals
- 🚀 **Evolution** - Contribute back to source
- 🔄 **Retry Logic** - Exponential backoff
- 🧪 **Dry Run** - Preview changes

## Commands

```bash
npm run catalog list [options]              # List kits
npm run catalog install <kit> [options]     # Install kit
npm run catalog update <kit> [options]      # Update kit
npm run catalog remove <kit> [options]      # Remove kit
npm run catalog configure <kit> [options]   # Configure kit
npm run catalog evolve <kit> [options]      # Contribute back
```

## Kit Structure

```json
{
  "name": "my-kit",
  "repo": "https://github.com/user/my-kit",
  "branch": "main",
  "dependencies": ["ai-ley"],
  "folderMapping": [
    {
      "source": ".github",
      "target": ".github",
      "type": "folder",
      "supportedAgentic": ["copilot"]
    }
  ]
}
```

## Documentation

See [SKILL.md](./SKILL.md) for complete documentation.

## License

MIT
