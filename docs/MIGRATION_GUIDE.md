# AI Command Center - Migration Guide

This guide helps you migrate between major versions of AI Command Center.

---

## v1.0.x → v1.1.x Migration

### Overview

Version 1.1.x introduces significant enhancements and breaking changes based on Section 21 of the requirements. Please review this guide carefully before upgrading.

### Breaking Changes

#### 1. Configuration File Changes

**File Location:**
- **Old**: `.aicc/config.yaml`
- **New**: `.my/aicc.yaml` (preferred) or `.aicc/config.yaml` (legacy support)

**Migration Steps:**
```bash
# Backup your existing configuration
cp .aicc/config.yaml .aicc/config.yaml.backup

# Create new location
mkdir -p .my
cp .aicc/config.yaml .my/aicc.yaml
```

**Configuration Structure Changes:**

```yaml
# OLD v1.0.x
planning:
  path: .project/plan
  
# NEW v1.1.x
planning:
  planPath: .project/plan  # Renamed for clarity
  autoSaveInterval: 5000   # New: Auto-save every 5 seconds
  enableVersioning: true   # New: Enable evolution tracking
```

#### 2. Planning File Structure

**Epic/Story/Task Files:**
- No changes to file format
- Backward compatible with v1.0.x files
- New optional fields added (see below)

**New Optional Fields:**
```yaml
# epic-001.md frontmatter
metadata:
  createdFrom: template  # New: Track template origin
  templateId: feature-development  # New: Template identifier
```

#### 3. MCP Server Configuration

**Transport Changes:**
```yaml
# OLD v1.0.x
mcp:
  enabled: true
  port: 3000

# NEW v1.1.x  
mcp:
  enabled: true
  transport: http  # New: http, websocket, or stdio
  http:
    port: 3000
    ssl: false
  websocket:
    enabled: false
    port: 3001
```

**Migration Steps:**
1. Update config to specify `transport: http`
2. Move `port` to `http.port`
3. Add WebSocket config if needed

#### 4. File Protection System (v1.0.25+)

**Automatic Backups:**
- All file operations now create automatic backups
- Backups stored with timestamp: `{filename}.{YYYYMMDD-HHMMSS}.backup`
- Retention: 30 days, max 50 backups (configurable)

**No Action Required:**
- File protection is automatic
- Configure retention via `aicc.fileProtection.configure` command

#### 5. Command Changes

**Renamed Commands:**
- No commands renamed in v1.1.x

**New Commands (v1.0.24-v1.0.30):**
```
# File Protection (v1.0.25)
aicc.fileProtection.showLogs
aicc.fileProtection.listBackups
aicc.fileProtection.restoreBackup
aicc.fileProtection.configure

# Undo System (v1.0.26)
aicc.undo.showHistory
aicc.undo.last
aicc.undo.panel
aicc.undo.since

# Diagram Features (v1.0.27-v1.0.28)
aicc.mermaid.preview
aicc.mermaid.previewSelection
aicc.convertPlantUML
aicc.convertPlantUMLSelection

# Planning Templates (v1.0.29)
aicc.planning.useTemplate
aicc.planning.listTemplates

# Global Search (v1.0.30)
aicc.search.global
aicc.search.byType
```

**Deprecated Commands:**
- None in v1.1.x

### New Features

#### 1. Planning Templates (v1.0.29)

**Quick Start:**
1. Run `AI Command Center: Use Planning Template`
2. Select from 8 pre-defined templates
3. Customize epic name
4. Automatic creation of epic, stories, and tasks

**Available Templates:**
- Feature Development (5 stories)
- Bug Fix (1 story, 6 tasks)
- Sprint Planning (4 stories)
- Research Spike (3 stories)
- Documentation (3 stories)
- Refactoring (3 stories)
- API Integration (3 stories)
- UI Component (3 stories)

#### 2. Global Search (v1.0.30)

**Quick Start:**
1. Run `AI Command Center: Global Search`
2. Enter search terms
3. View results with relevance scoring

**Features:**
- Search across all epics, stories, tasks
- Filter by type, status, priority, assignee
- Full-text search in names and descriptions
- Context snippets showing match location

#### 3. Keyboard Shortcuts (v1.0.30)

**New Shortcuts:**
- `Cmd+Shift+E` (Ctrl+Shift+E) - Create Epic
- `Cmd+Shift+S` (Ctrl+Shift+S) - Create Story
- `Cmd+Shift+T` (Ctrl+Shift+T) - Create Task
- `Cmd+Shift+F` (Ctrl+Shift+F) - Global Search

#### 4. Diagram Converter (v1.0.28)

**Quick Start:**
1. Open PlantUML file or select PlantUML code
2. Run `AI Command Center: Convert PlantUML to Mermaid`
3. Result shown in new document

**Supported Diagrams:**
- Sequence diagrams
- Class diagrams
- Flowcharts/Activity diagrams
- State diagrams
- ER diagrams
- Component diagrams (→ flowchart)

#### 5. Mermaid Diagram Previewer (v1.0.27)

**Quick Start:**
1. Open `.mmd` or `.mermaid` file
2. Run `AI Command Center: Preview Mermaid Diagram`
3. Interactive preview with zoom/pan/export

**Features:**
- Zoom controls (keyboard, mouse, toolbar)
- Pan with mouse drag
- Export to SVG/PNG
- Auto-extract from Markdown files

### Upgrade Path

#### Recommended Upgrade Steps

1. **Backup Everything**
   ```bash
   # Backup configuration
   cp -r .aicc .aicc.backup
   
   # Backup planning files
   cp -r .project/plan .project/plan.backup
   ```

2. **Update Configuration**
   ```bash
   # Create new config location
   mkdir -p .my
   
   # Copy and update config
   cp .aicc/config.yaml .my/aicc.yaml
   # Edit .my/aicc.yaml with new structure
   ```

3. **Install v1.1.x**
   - Extension will auto-migrate on first activation
   - Review migration logs in Output panel

4. **Verify Migration**
   ```bash
   # Check config loaded correctly
   AI Command Center: Show Configuration
   
   # Test planning operations
   AI Command Center: Open Planning Panel
   
   # Verify MCP server
   AI Command Center: Start MCP Server
   ```

5. **Clean Up (Optional)**
   ```bash
   # After successful migration
   rm -rf .aicc.backup
   rm -rf .project/plan.backup
   ```

#### Rollback Procedure

If you encounter issues:

1. **Uninstall v1.1.x**
   ```bash
   code --uninstall-extension ai-command-center.ai-command-center
   ```

2. **Restore Backups**
   ```bash
   mv .aicc.backup .aicc
   mv .project/plan.backup .project/plan
   ```

3. **Reinstall v1.0.x**
   ```bash
   code --install-extension ai-command-center-1.0.30.vsix
   ```

### Backward Compatibility

#### What's Compatible

✅ **Planning Files**: v1.1.x reads all v1.0.x planning files  
✅ **Config Structure**: Legacy `.aicc/config.yaml` still supported  
✅ **Commands**: All v1.0.x commands work in v1.1.x  
✅ **MCP Clients**: http transport is backward compatible  

#### What's Not Compatible

❌ **v1.0.x Cannot Read v1.1.x Files**: If you use new features (templates, metadata), files may not work in v1.0.x  
❌ **WebSocket Transport**: New in v1.1.x, not available in v1.0.x  
❌ **File Backups**: Backup files created by v1.1.x use new timestamp format  

### Troubleshooting

#### Issue: Config Not Loading

**Symptoms**: Extension shows "No configuration found"

**Solution**:
1. Check file exists: `ls -la .my/aicc.yaml` or `ls -la .aicc/config.yaml`
2. Validate YAML syntax: `cat .my/aicc.yaml`
3. Run: `AI Command Center: Initialize AICC Configuration`

#### Issue: Planning Files Not Found

**Symptoms**: "No epics/stories/tasks found"

**Solution**:
1. Verify path in config: `planning.planPath`
2. Check files exist: `ls -la .project/plan/`
3. Run: `AI Command Center: Refresh Tree View`

#### Issue: MCP Server Won't Start

**Symptoms**: "Failed to start MCP server"

**Solution**:
1. Check config: `mcp.enabled: true`
2. Verify transport: `mcp.transport: http`
3. Check port not in use: `lsof -i :3000`
4. View logs: Output panel → "AI Command Center"

#### Issue: File Backups Taking Space

**Symptoms**: Too many `.backup` files

**Solution**:
1. Run: `AI Command Center: Configure File Protection`
2. Adjust retention:
   - Max age: 30 days (default)
   - Max backups: 50 (default)
3. Manual cleanup: `find . -name "*.backup" -mtime +30 -delete`

### Performance Considerations

#### v1.1.x Performance Improvements

- **Lazy Loading**: Features load on-demand
- **Code Splitting**: Faster activation time
- **Webpack Bundling**: Optimized file size

#### Expected Metrics

- Activation time: < 500ms (P95)
- Memory usage: < 200MB
- Package size: ~7MB

### Getting Help

**Documentation**:
- User Guide: `docs/USER_GUIDE.md`
- Configuration: `docs/CONFIGURATION.md`
- Requirements: `.project/REQUIREMENTS.md`

**Support**:
- Issues: GitHub repository issues
- Logs: Output panel → "AI Command Center"
- Diagnostics: `AI Command Center: Show Configuration`

---

**Last Updated**: January 11, 2026  
**Version**: 1.0.30  
**Next Review**: February 1, 2026
