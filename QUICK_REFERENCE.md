# AI Command Center - Quick Reference

## 🚀 Common Workflows

### Create Planning Hierarchy
```bash
1. Cmd+Shift+P → "AI Command Center: Create Epic"
2. Cmd+Shift+P → "AI Command Center: Create Story" (select parent epic)
3. Cmd+Shift+P → "AI Command Center: Create Task" (select parent story)
4. Cmd+Shift+P → "AI Command Center: Open Planning Panel" (view all)
```

### Set Up Jira Integration
```bash
1. Generate API token: https://id.atlassian.com/manage-profile/security/api-tokens
2. Cmd+Shift+P → "AI Command Center: Configure Jira Integration"
3. Enter: Base URL, Email, API Token, Project Key
4. Cmd+Shift+P → "AI Command Center: Test Jira Connection"
5. Cmd+Shift+P → "AI Command Center: Sync with Jira"
```

### Resolve Sync Conflicts
```bash
1. Cmd+Shift+P → "AI Command Center: View Jira Sync Status"
2. If conflicts exist:
   Cmd+Shift+P → "AI Command Center: Resolve Jira Conflicts"
3. Choose resolution for each conflict
4. Re-sync: "AI Command Center: Sync with Jira"
```

### Connect Claude Desktop to Planning
```bash
1. Open settings: Cmd+,
2. Set "aicc.mcp.enabled": true
3. Set "aicc.mcp.transport": "stdio"
4. Edit ~/Library/Application Support/Claude/claude_desktop_config.json:
   {
     "mcpServers": {
       "aicc-planning": {
         "command": "node",
         "args": ["/path/to/ai-command-center/out/mcp/mcpServer.js"],
         "env": { "WORKSPACE_ROOT": "/path/to/your/project" }
       }
     }
   }
5. Restart Claude Desktop
```

---

## ⌨️ Command Quick Reference

| Task | Command |
|------|---------|
| Create Epic | `aicc.createEpic` |
| Create Story | `aicc.createStory` |
| Create Task | `aicc.createTask` |
| Open Planning Panel | `aicc.openPlanningPanel` |
| Sync with Jira | `aicc.jira.sync` |
| Push to Jira | `aicc.jira.syncPush` |
| Pull from Jira | `aicc.jira.syncPull` |
| Test Jira Connection | `aicc.jira.testConnection` |
| View Sync Status | `aicc.jira.viewSyncStatus` |
| Resolve Conflicts | `aicc.jira.resolveConflicts` |
| Apply Config Preset | `aicc.config.applyPreset` |
| Show Config Health | `aicc.config.showHealth` |
| Start MCP Server | `aicc.mcp.start` |
| Stop MCP Server | `aicc.mcp.stop` |

---

## 📊 File Structure

```
your-project/
├── .project/plan/
│   ├── epics/
│   │   └── EPIC-001-epic-name/
│   │       ├── README.md
│   │       └── stories/
│   │           └── STORY-001-story-name/
│   │               ├── README.md
│   │               └── tasks/
│   │                   └── TASK-001-task-name.md
│   ├── config/
│   │   ├── sync-state.json
│   │   ├── jira-mappings.json
│   │   └── field-mappings.json
│   ├── evolution/
│   │   └── events.json
│   └── .logs/
│       ├── aicc-2024-01-10.log
│       └── mcp-2024-01-10.log
└── .vscode/
    └── settings.json
```

---

## 🔧 Essential Settings

### Minimal Configuration
```json
{
  "aicc.planPath": ".project/plan",
  "aicc.autoSaveInterval": 30,
  "aicc.logLevel": "info"
}
```

### Jira Integration
```json
{
  "aicc.jira.enabled": true,
  "aicc.jira.baseUrl": "https://your-company.atlassian.net",
  "aicc.jira.email": "your-email@company.com",
  "aicc.jira.apiToken": "YOUR_API_TOKEN",
  "aicc.jira.projectKey": "PROJ",
  "aicc.jira.syncStrategy": "bidirectional",
  "aicc.jira.conflictResolution": "manual"
}
```

### MCP Server
```json
{
  "aicc.mcp.enabled": true,
  "aicc.mcp.transport": "stdio",
  "aicc.mcp.tools.enabled": true,
  "aicc.mcp.resources.enabled": true,
  "aicc.mcp.prompts.enabled": true
}
```

---

## 🐛 Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Planning structure not found | Run `aicc.createEpic` to initialize |
| Jira connection failed | Check API token, URL, and network |
| Sync conflicts | Run `aicc.jira.resolveConflicts` |
| MCP server won't start | Check port 3000 availability |
| WebView blank | Run `npm run compile` |
| High memory usage | Reduce `aicc.mcp.resources.cacheSize` |

**View Logs:**
- Output Panel: View → Output → AI Command Center
- File: `.project/plan/.logs/aicc-YYYY-MM-DD.log`

---

## 📈 Jira Mapping Reference

| Local | Jira | Notes |
|-------|------|-------|
| Epic | Epic | Direct mapping |
| Story | Story | Linked to Epic via `epicKey` |
| Task | Sub-task | Linked to Story via `parentKey` |

**Status Mapping:**
- not-started → To Do / Backlog
- in-progress → In Progress
- completed → Done
- blocked → Blocked

**Priority Mapping:**
- High → High
- Medium → Medium
- Low → Low

---

## 💡 Best Practice Tips

### Planning
✅ Use descriptive epic names  
✅ Keep stories 3-8 points  
✅ Break tasks into 1-4 hour chunks  
✅ Assign tasks to specific people  

### Jira Sync
✅ Start with manual sync  
✅ Test with few items first  
✅ Use manual conflict resolution  
✅ Document team sync schedule  
❌ Avoid concurrent edits  

### MCP Server
✅ Use stdio for local AI (most secure)  
✅ Enable caching for performance  
✅ Set reasonable timeouts  
❌ Don't expose HTTP publicly without security  

---

## 🔐 Security Checklist

- [ ] API tokens stored securely (not in version control)
- [ ] `.vscode/settings.json` excludes sensitive data
- [ ] MCP HTTP mode only on trusted networks
- [ ] Webhook secret configured (if using webhooks)
- [ ] Log files excluded from version control
- [ ] Team members use individual API tokens

---

## 📱 Support & Resources

- **Documentation**: `docs/USER_GUIDE.md`
- **Issues**: GitHub Issues
- **Version**: Check `package.json`
- **Logs**: `.project/plan/.logs/`
- **Health Check**: `aicc.config.showHealth`

---

**Tip**: Press `Cmd+Shift+P` and type "AICC" to see all available commands!
