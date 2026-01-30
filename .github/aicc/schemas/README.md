# AI Command Center Schemas

This directory contains JSON Schema definitions for AI Command Center configuration and data files.

## Available Schemas

### plan.v1.schema.json

Validates the structure of `.project/PLAN.json` - the consolidated planning data file.

**Version:** 1.0.0

**Structure:**
- `version`: Semantic version (e.g., "1.0.0")
- `generatedAt`: ISO 8601 timestamp
- `source`: Source directory path
- `metadata`: Project metadata (name, code, assignees, etc.)
- `statusCounts`: Count of items by status (BACKLOG, READY, IN-PROGRESS, BLOCKED, REVIEW, DONE)
- `items`: Array of plan items (epics, stories, tasks, bugs)

**Plan Item Properties:**
- Core: `id`, `type`, `summary`, `description`, `status`, `priority`
- Assignment: `assignee`, `agent`
- Time: `estimatedHours`, `actualHours`, `order`
- AI Resources: `instructions[]`, `personas[]`
- Context: `contexts[]`, `links[]`, `tags[]`, `variables{}`
- Git: `gitRepoUrl`, `gitRepoBranch`
- Planning: `acceptanceCriteria`, `sprint`, `milestone`, `storyPoints`
- Hierarchy: `parentId`, `children[]`
- Relationships: `linkedRelationships[]`
- Comments: `comments[]`
- Metadata: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

### panel.v1.schema.json

Validates panel configuration YAML files in `.github/aicc/panels/`.

### tab.v1.schema.json

Validates tab configuration YAML files in `.github/aicc/tabs/`.

### component.v1.schema.json

Validates component configuration files.

## Usage

### In PLAN.json

Add a `$schema` property to enable IDE validation and autocomplete:

```json
{
  "$schema": "../.github/aicc/schemas/plan.v1.schema.json",
  "version": "1.0.0",
  ...
}
```

### Validation with AJV

```bash
# Validate PLAN.json
npx ajv-cli validate -s .github/aicc/schemas/plan.v1.schema.json -d .project/PLAN.json

# Validate a panel
npx ajv-cli validate -s .github/aicc/schemas/panel.v1.schema.json -d .github/aicc/panels/All_Planning.panel.yaml
```

### In VS Code

VS Code will automatically use these schemas if:
1. The `$schema` property is set in the JSON/YAML file
2. Or, the schemas are registered in `.vscode/settings.json`:

```json
{
  "json.schemas": [
    {
      "fileMatch": ["**/.project/PLAN.json"],
      "url": "./.github/aicc/schemas/plan.v1.schema.json"
    }
  ]
}
```

## Schema Versioning

Schemas follow semantic versioning:
- **Major**: Breaking changes to structure
- **Minor**: New optional properties
- **Patch**: Documentation or validation improvements

Current schema versions are embedded in the `$id` field of each schema file.

## Contributing

When modifying schemas:

1. Update the schema file
2. Update this README if adding new schemas
3. Validate existing data files against the new schema
4. Update the transformation scripts if needed
5. Increment the schema version in the `$id` field

## References

- [JSON Schema Specification](https://json-schema.org/)
- [AJV JSON Schema Validator](https://ajv.js.org/)
- [VS Code JSON Schema Support](https://code.visualstudio.com/docs/languages/json#_json-schemas-and-settings)
