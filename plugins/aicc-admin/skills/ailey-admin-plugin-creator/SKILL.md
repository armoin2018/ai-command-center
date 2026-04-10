---
name: ailey-admin-plugin-creator
description: Guide for creating agent plugins compatible with both VS Code Copilot and Anthropic Claude Code. Use when users want to create a new plugin, bundle skills/agents/hooks/MCP servers into a distributable plugin, set up a plugin marketplace, or need guidance on plugin structure and cross-platform compatibility.
---
# AI-ley Plugin Creator

Create agent plugins that work across both VS Code Copilot and Anthropic Claude Code, bundling skills, agents, hooks, and MCP servers into distributable packages via plugin marketplaces.

## Plugin vs Skill — When to Use What

| Need | Use |
|------|-----|
| Single capability (e.g., PDF processing) | Skill |
| Bundle of related capabilities | Plugin |
| Distribute to team/community | Plugin |
| Include hooks or MCP servers | Plugin |
| Include custom agents | Plugin |

## Plugin Anatomy

Every plugin follows this structure (compatible with both platforms):

```
plugin-name/
├── .claude-plugin/           # Metadata directory
│   └── plugin.json           # Plugin manifest (required field: name)
├── skills/                   # Skills with SKILL.md
│   ├── skill-one/
│   │   ├── SKILL.md
│   │   ├── scripts/          # Optional executable code
│   │   └── references/       # Optional reference docs
│   └── skill-two/
│       └── SKILL.md
├── agents/                   # Agent definitions
│   ├── reviewer.md           # Claude Code format (auto-detected by VS Code)
│   └── tester.md
├── commands/                 # Slash commands (simple markdown)
│   └── status.md
├── hooks/                    # Lifecycle hooks
│   └── hooks.json
├── output-styles/            # Output formatting
│   └── terse.md
├── bin/                      # Executables added to PATH
├── scripts/                  # Hook and utility scripts
├── .mcp.json                 # MCP server definitions
├── .lsp.json                 # LSP server configurations (Claude Code)
├── settings.json             # Default settings
├── LICENSE
└── CHANGELOG.md
```

### What Goes Where

| Component | Location | Format |
|-----------|----------|--------|
| Manifest | `.claude-plugin/plugin.json` | JSON with `name` required |
| Skills | `skills/<name>/SKILL.md` | Markdown with YAML frontmatter |
| Agents | `agents/<name>.md` | Markdown with YAML frontmatter |
| Commands | `commands/<name>.md` | Simple markdown files |
| Hooks | `hooks/hooks.json` | JSON event configuration |
| MCP servers | `.mcp.json` | JSON MCP server definitions |
| LSP servers | `.lsp.json` | JSON LSP configuration |
| Output styles | `output-styles/<name>.md` | Markdown style definitions |
| Executables | `bin/` | Shell/node scripts (added to PATH) |
| Settings | `settings.json` | Default plugin settings |

**Critical**: Components must be at the plugin root, NOT inside `.claude-plugin/`. Only `plugin.json` goes in `.claude-plugin/`.

## Plugin Creation Process

### Step 1: Define Plugin Scope

Determine what the plugin bundles:
- Which skills? (domain-specific capabilities)
- Which agents? (specialized AI personas)
- Any hooks? (lifecycle automation)
- Any MCP servers? (external tool integrations)
- Any user configuration? (API keys, endpoints)

Group by domain coherence — a plugin should serve one logical purpose.

### Step 2: Initialize Plugin

```bash
# Create plugin directory structure
mkdir -p plugins/my-plugin/.claude-plugin
mkdir -p plugins/my-plugin/{skills,agents,commands,hooks,scripts,bin}
```

### Step 3: Create Plugin Manifest

Create `.claude-plugin/plugin.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Brief description of what this plugin provides",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://github.com/author"
  },
  "homepage": "https://docs.example.com/my-plugin",
  "repository": "https://github.com/author/my-plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"]
}
```

**Required fields**: Only `name` (kebab-case, no spaces).

**Optional metadata**: `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`.

**Component path overrides** (only if using non-default locations):

```json
{
  "name": "my-plugin",
  "commands": ["./custom/commands/"],
  "agents": ["./custom/agents/"],
  "skills": ["./custom/skills/"],
  "hooks": "./config/hooks.json",
  "mcpServers": "./mcp-config.json",
  "outputStyles": "./styles/",
  "lspServers": "./.lsp.json"
}
```

Custom paths REPLACE default directories. To keep defaults AND add more:
```json
{
  "commands": ["./commands/", "./extras/deploy.md"]
}
```

### Step 4: Add User Configuration (Optional)

For plugins requiring user-provided values (API keys, endpoints):

```json
{
  "name": "my-plugin",
  "userConfig": {
    "api_endpoint": {
      "description": "Your API endpoint URL",
      "sensitive": false
    },
    "api_token": {
      "description": "API authentication token",
      "sensitive": true
    }
  }
}
```

- Non-sensitive values stored in `settings.json`
- Sensitive values stored in system keychain (~2KB limit)
- Available as `${user_config.KEY}` in MCP/LSP configs and hook commands
- Exported as `CLAUDE_PLUGIN_OPTION_<KEY>` environment variables

### Step 5: Add Skills

Create skills following the ai-ley skill standard:

```markdown
---
name: skill-name
description: What the skill does AND when to use it. Include triggers.
---

# Skill Instructions

[Skill body with procedures, examples, references]
```

Skills auto-discovered from `skills/` directory. Each skill is a directory with `SKILL.md`.

### Step 6: Add Agents (Optional)

Create agent definitions in `agents/`:

```markdown
---
name: agent-name
description: What this agent specializes in and when to invoke it
model: sonnet
effort: medium
maxTurns: 20
---

Detailed system prompt describing the agent's role, expertise, and behavior.
```

Supported frontmatter: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation`.

**Not supported in plugins**: `hooks`, `mcpServers`, `permissionMode`.

### Step 7: Add Hooks (Optional)

Create `hooks/hooks.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/format.sh"
          }
        ]
      }
    ]
  }
}
```

**Hook events**: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `SubagentStart`, `SubagentStop`, `Stop`, `Notification`, `FileChanged`, `CwdChanged`, and more.

**Hook types**: `command` (shell), `http` (POST request), `prompt` (LLM evaluation), `agent` (agentic verifier).

**Path references**: Always use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths. VS Code expands this at runtime and sets it as an environment variable.

Make hook scripts executable: `chmod +x scripts/*.sh`

### Step 8: Add MCP Servers (Optional)

Create `.mcp.json` at plugin root:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": {
        "DATA_PATH": "${CLAUDE_PLUGIN_DATA}"
      }
    }
  }
}
```

- Use `${CLAUDE_PLUGIN_ROOT}` for bundled files (changes on update)
- Use `${CLAUDE_PLUGIN_DATA}` for persistent state (survives updates)
- Top-level key is `mcpServers` (not `servers`)

### Step 9: Persistent Dependencies

For plugins with npm/pip dependencies, use a `SessionStart` hook:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
          }
        ]
      }
    ]
  }
}
```

This installs dependencies on first run and only re-installs when `package.json` changes.

## Cross-Platform Compatibility

### VS Code Copilot + Claude Code

Both platforms use the same plugin format. Key compatibility notes:

| Feature | VS Code Copilot | Claude Code |
|---------|----------------|-------------|
| Manifest | `.claude-plugin/plugin.json` (auto-detected) | `.claude-plugin/plugin.json` |
| Skills | `skills/<name>/SKILL.md` | `skills/<name>/SKILL.md` |
| Agents | `agents/<name>.md` (auto-detected) | `agents/<name>.md` |
| Hooks | `hooks/hooks.json` (Claude format auto-detected) | `hooks/hooks.json` |
| MCP servers | `.mcp.json` | `.mcp.json` |
| LSP servers | Not supported | `.lsp.json` |
| Matcher in hooks | Parsed but currently ignored | Full matcher support |
| `${CLAUDE_PLUGIN_ROOT}` | Expanded at runtime | Expanded at runtime |
| Marketplace | Git repos via `chat.plugins.marketplaces` | `/plugin marketplace add` |
| Local plugins | `chat.pluginLocations` setting | `claude --plugin-dir` |

### Path Rules

- All paths relative to plugin root, starting with `./`
- No `../` references (files outside plugin root aren't copied on install)
- Symlinks ARE followed during installation (use for shared resources)

## Marketplace Distribution

### Create Marketplace

Create `.claude-plugin/marketplace.json` in a Git repository:

```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Team Name",
    "email": "team@example.com"
  },
  "metadata": {
    "description": "Description of marketplace",
    "version": "1.0.0",
    "pluginRoot": "."
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugins/plugin-name",
      "description": "Plugin description",
      "version": "1.0.0",
      "keywords": ["tag1", "tag2"],
      "category": "category-name"
    }
  ]
}
```

### Plugin Sources

| Source Type | Format | Use When |
|------------|--------|----------|
| Relative path | `"./plugins/name"` | Plugin in same repo |
| GitHub | `{"source": "github", "repo": "owner/repo"}` | Separate GitHub repo |
| Git URL | `{"source": "url", "url": "https://..."}` | Non-GitHub git host |
| Git subdirectory | `{"source": "git-subdir", "url": "...", "path": "..."}` | Monorepo subdirectory |
| npm | `{"source": "npm", "package": "@scope/name"}` | npm distribution |

### Version Management

Follow semver (`MAJOR.MINOR.PATCH`). Set version in EITHER `plugin.json` OR marketplace entry (not both — plugin.json wins silently).

### Installation

```bash
# Claude Code
claude plugin marketplace add owner/repo
claude plugin install my-plugin@my-marketplace

# VS Code
# Add to settings: "chat.plugins.marketplaces": ["owner/repo"]
# Then browse @agentPlugins in Extensions view
```

## AI-ley Plugin Conventions

### Naming

Prefix ai-ley kit plugins with `aicc-`:
- `aicc-core` — Foundation agents and admin skills
- `aicc-communications` — Messaging integrations
- `aicc-social` — Social media integrations

### Skill Symlinks

When organizing existing ai-ley skills into plugins, use symlinks:

```bash
# Symlink existing skill into plugin
ln -sf ../../../.github/skills/ailey-com-slack plugins/aicc-communications/skills/ailey-com-slack
```

Symlinks are followed during plugin installation, so the actual skill files get copied into the plugin cache.

### Category Organization

| Category | Prefix | Description |
|----------|--------|-------------|
| `foundation` | `aicc-core` | Base agents, admin skills, prompts |
| `integrations` | `aicc-atlassian` | Atlassian tools (Jira, Confluence) |
| `communications` | `aicc-communications` | Email, messaging, video |
| `social` | `aicc-social` | Social media platforms |
| `media` | `aicc-media` | Media creation and processing |
| `commerce` | `aicc-commerce` | eCommerce and CRM |
| `scheduling` | `aicc-scheduling` | Calendar and task automation |
| `developer-tools` | `aicc-devtools` | Utilities and data tools |

## Testing and Validation

### Local Testing

```bash
# Claude Code — test from directory
claude --plugin-dir ./plugins/my-plugin

# Claude Code — validate
claude plugin validate ./plugins/my-plugin

# VS Code — register as local plugin
# Add to settings.json:
# "chat.pluginLocations": { "/path/to/my-plugin": true }
```

### Validation Checklist

- [ ] `.claude-plugin/plugin.json` has valid JSON with `name` field
- [ ] `name` is kebab-case, no spaces
- [ ] All component dirs at plugin root (not inside `.claude-plugin/`)
- [ ] Skills have valid YAML frontmatter
- [ ] Agent files have required `name` and `description` frontmatter
- [ ] Hook scripts are executable (`chmod +x`)
- [ ] All paths use `${CLAUDE_PLUGIN_ROOT}` (no absolute paths)
- [ ] No `../` path traversal in any references
- [ ] Version bumped when changes are made (cache uses version for updates)

### Debug

```bash
# Claude Code debug mode
claude --debug

# Check for plugin loading messages, errors, component registration
```

Common issues:
- Plugin not loading → Invalid `plugin.json` JSON
- Commands missing → Wrong directory structure (must be at root)
- Hooks not firing → Script not executable
- MCP server fails → Missing `${CLAUDE_PLUGIN_ROOT}` in paths
- Files not found after install → Absolute paths or `../` traversal

---

version: 1.0.0
updated: 2026-04-05
reviewed: 2026-04-05
score: 4.3
