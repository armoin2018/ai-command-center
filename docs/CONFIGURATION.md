# Configuration System Documentation

## Overview

The AI Command Center configuration system provides a robust, multi-layered configuration management framework with validation, presets, and version migration capabilities.

## Architecture

### Components

1. **ConfigManager** (`src/configManager.ts`)
   - Central configuration management
   - 2-level cascade: YAML defaults → VS Code settings
   - Singleton pattern for global access

2. **ConfigValidator** (`src/config/configValidator.ts`)
   - Configuration validation with errors and warnings
   - Health score calculation (0-100)
   - Configuration recommendations

3. **ConfigPresets** (`src/config/configPresets.ts`)
   - Pre-configured templates
   - 4 presets: minimal, development, production, enterprise
   - Preset comparison and export

4. **ConfigMigration** (`src/config/configMigration.ts`)
   - Version-based configuration migration
   - Automatic backup creation
   - Rollback support

## Configuration Structure

```typescript
interface AICommandCenterConfig {
    planning: PlanningConfig;
    logging: LoggingConfig;
    integrations: IntegrationsConfig;
    mcp: MCPConfig;
    ui: UIConfig;
    performance: PerformanceConfig;
}
```

### Planning Configuration

```yaml
planning:
  planPath: ".project/plan"          # Path to planning files
  autoSaveInterval: 30               # Auto-save interval (seconds), 0 to disable
  storyPointScale: "fibonacci"       # "fibonacci" or "linear"
  sprintDurationWeeks: 2             # Sprint duration (1-8 weeks)
```

### Logging Configuration

```yaml
logging:
  level: "info"                      # "debug", "info", "warn", "error"
  fileLoggingEnabled: true           # Enable file logging
  retentionDays: 7                   # Log retention (days)
  maxFileSizeMB: 5                   # Max log file size
```

### Integrations Configuration

```yaml
integrations:
  jira:
    enabled: false
    baseUrl: ""                      # Jira instance URL
    email: ""                        # Jira user email
  confluence:
    enabled: false
    baseUrl: ""                      # Confluence instance URL
  gamma:
    enabled: false
    apiKey: ""                       # Gamma API key
```

### MCP Configuration

```yaml
mcp:
  enabled: true
  port: 3000                         # MCP server port (0 for stdio only)
  protocol: "stdio"                  # "stdio" or "http"
```

### UI Configuration

```yaml
ui:
  showWelcomeMessage: true
  theme: "auto"                      # "auto", "light", "dark"
  confirmDelete: true                # Confirm before delete
```

### Performance Configuration

```yaml
performance:
  activationTimeoutMs: 5000          # Extension activation timeout
  apiTimeoutMs: 30000                # API request timeout
  trackPerformance: true             # Enable performance tracking
```

## Usage

### Getting Configuration

```typescript
import { ConfigManager } from './configManager';

// Get entire configuration
const config = ConfigManager.getInstance().getConfig();

// Get specific value by path
const planPath = ConfigManager.getInstance().get<string>('planning.planPath');
const logLevel = ConfigManager.getInstance().get<string>('logging.level');
```

### Validating Configuration

```typescript
const manager = ConfigManager.getInstance();

// Validate current configuration
const result = manager.validate();
if (!result.isValid) {
    console.error('Configuration errors:', result.errors);
    console.warn('Configuration warnings:', result.warnings);
}

// Get health score
const healthScore = manager.getHealthScore(); // 0-100

// Get recommendations
const recommendations = manager.getRecommendations();
```

### Applying Presets

```typescript
const manager = ConfigManager.getInstance();

// Apply preset
await manager.applyPreset('development');

// Available presets:
// - 'minimal': Bare minimum configuration
// - 'development': Development-optimized settings
// - 'production': Production-ready configuration
// - 'enterprise': Full-featured enterprise setup
```

### Preset Details

#### Minimal Preset
- Logging: warn level, 10MB max file
- Auto-save: disabled
- Integrations: all disabled
- MCP: disabled
- Performance tracking: disabled

#### Development Preset
- Logging: debug level, 50MB max file, 7-day retention
- Auto-save: 30 seconds
- Integrations: disabled
- MCP: enabled (stdio)
- Performance tracking: enabled

#### Production Preset
- Logging: info level, 20MB max file, 30-day retention
- Auto-save: 60 seconds
- Integrations: disabled
- MCP: enabled (stdio)
- Performance tracking: enabled

#### Enterprise Preset
- Logging: info level, 50MB max file, 90-day retention
- Auto-save: 60 seconds
- Integrations: Jira and Confluence enabled (requires configuration)
- MCP: enabled (http protocol)
- Performance tracking: enabled

### Configuration Migration

```typescript
const manager = ConfigManager.getInstance();

// Check if migration needed
const needsMigration = await manager.needsMigration('.project/aicc.yaml');

// Migrate configuration
if (needsMigration) {
    await manager.migrateConfiguration('.project/aicc.yaml', true); // with backup
}

// Get version history
const history = manager.getVersionHistory();
```

### Saving Configuration

```typescript
const manager = ConfigManager.getInstance();

// Save current configuration to file
await manager.saveConfiguration('.project/aicc.yaml');
```

## VS Code Settings

Configuration can also be managed through VS Code settings. Settings defined in VS Code override the defaults from `aicc.yaml`.

### Available Settings

- `aicc.planPath`: Planning directory path
- `aicc.autoSaveInterval`: Auto-save interval (seconds)
- `aicc.storyPointScale`: Story point scale type
- `aicc.sprintDurationWeeks`: Sprint duration
- `aicc.logLevel`: Logging level
- `aicc.fileLoggingEnabled`: Enable file logging
- `aicc.retentionDays`: Log retention period
- `aicc.maxFileSizeMB`: Maximum log file size

### Setting Configuration via VS Code

```json
{
  "aicc.planPath": ".aicc",
  "aicc.logLevel": "debug",
  "aicc.autoSaveInterval": 60,
  "aicc.fileLoggingEnabled": true
}
```

## Validation Rules

### Planning Validation
- `planPath`: Must not be empty
- `autoSaveInterval`: Must be >= 0
- `storyPointScale`: Must be 'fibonacci' or 'linear'
- `sprintDurationWeeks`: Must be 1-8

### Logging Validation
- `level`: Must be 'debug', 'info', 'warn', or 'error'
- `retentionDays`: Must be >= 1
- `maxFileSizeMB`: Must be 1-100

### Integrations Validation
- Jira/Confluence `baseUrl`: Must be valid URL when enabled
- Jira `email`: Should be set when enabled (warning)
- Gamma `apiKey`: Must be set when enabled

### MCP Validation
- `port`: Must be 1024-65535 (or 0 for stdio only)
- `protocol`: Must be 'stdio' or 'http'

### UI Validation
- `theme`: Must be 'auto', 'light', or 'dark'

### Performance Validation
- `activationTimeoutMs`: Must be 100-30000
- `apiTimeoutMs`: Must be 1000-120000

## Health Scoring

The configuration health score (0-100) is calculated based on:

- **Errors**: Each error reduces score by 20 points
- **Warnings**: Each warning reduces score by 5 points
- **Starting Score**: 100 points

A score below 70 indicates configuration issues that should be addressed.

## Recommendations

The system provides automatic recommendations including:

### Security Recommendations
- Use non-standard MCP ports
- Enable auto-save with reasonable intervals
- Configure log retention

### Performance Recommendations
- Adjust API timeouts for slow networks
- Configure appropriate log file sizes
- Enable performance tracking in development

### Integration Recommendations
- Complete integration configuration when enabled
- Verify integration URLs
- Set up proper authentication

## Migration System

### Version History

- **0.1.0**: Initial configuration schema
- **0.2.0**: Added MCP configuration section
- **0.3.0**: Enhanced integration configuration

### Migration Process

1. **Backup**: Creates timestamped backup before migration
2. **Sequential Migration**: Applies migrations in order
3. **Validation**: Validates migrated configuration
4. **Notification**: Shows success/failure message

### Backward Compatibility

The migration system maintains backward compatibility by:

- Detecting deprecated fields
- Providing migration warnings
- Supporting rollback to previous versions
- Preserving unknown fields

## Best Practices

### Development
1. Use the `development` preset as a starting point
2. Enable debug logging for troubleshooting
3. Set low auto-save intervals (30s)
4. Enable performance tracking

### Production
1. Use the `production` preset
2. Configure appropriate log retention
3. Set reasonable auto-save intervals (60s)
4. Monitor configuration health scores

### Enterprise
1. Use the `enterprise` preset
2. Enable all required integrations
3. Configure longer log retention (90 days)
4. Use HTTP protocol for MCP
5. Regularly check recommendations

## Troubleshooting

### Configuration Not Loading

1. Check if `aicc.yaml` exists in the expected location
2. Verify YAML syntax is valid
3. Check extension logs for errors
4. Try reloading the configuration

```typescript
ConfigManager.getInstance().reload();
```

### Validation Errors

1. Use `validate()` to see specific errors
2. Check `getRecommendations()` for guidance
3. Apply a preset to reset to known-good state
4. Consult validation rules above

### Migration Issues

1. Check if backup was created
2. Review migration logs
3. Manually rollback using backup file if needed
4. Report migration failures with version details

## API Reference

### ConfigManager

- `getInstance()`: Get singleton instance
- `getConfig()`: Get current configuration
- `reload()`: Reload configuration
- `get<T>(path)`: Get value by dot-notation path
- `validate()`: Validate configuration
- `getHealthScore()`: Get health score (0-100)
- `getRecommendations()`: Get recommendations
- `applyPreset(name)`: Apply configuration preset
- `saveConfiguration(path)`: Save to file
- `needsMigration(path)`: Check migration status
- `migrateConfiguration(path, backup)`: Migrate configuration
- `getVersionHistory()`: Get version history

### ConfigValidator

- `validate(config)`: Validate configuration
- `validatePartial(partial)`: Validate partial update
- `getHealthScore(config)`: Calculate health score
- `getRecommendations(config)`: Get recommendations

### ConfigPresets

- `getPreset(name)`: Get preset configuration
- `savePreset(preset, path)`: Save preset to file
- `listPresets()`: List available presets
- `comparePresets(name1, name2)`: Compare two presets

### ConfigMigration

- `needsMigration(path)`: Check if migration needed
- `migrate(path, backup)`: Migrate to latest version
- `rollback(path, targetVersion)`: Rollback to version
- `getVersionHistory()`: Get version history
- `validateCompatibility(config)`: Check compatibility

## Related Documentation

- [Extension Configuration](../README.md#configuration)
- [Planning System](../planning/README.md)
- [Logging System](../logger.ts)
- [MCP Server](../mcp/README.md)
