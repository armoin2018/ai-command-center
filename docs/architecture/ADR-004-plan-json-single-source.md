# ADR-004: PLAN.json as Single Source of Truth

**Status:** Accepted  
**Date:** 2025-01-15  
**Deciders:** Core team

## Context

The planning system needs a persistent data store for epics, stories, tasks, and their hierarchical relationships. Options include a database, multiple files per entity, or a single structured JSON document.

## Decision

Use `.project/PLAN.json` as the single source of truth for all planning data, validated against `.github/aicc/schemas/plan.v1.schema.json`.

- **Structure:** `{ epics: [{ stories: [{ tasks: [] }] }] }` — a tree hierarchy
- **CRUD:** All mutations go through `PlanGenerator` service methods (`createPlanItem`, `updatePlanItem`, `savePlanDocument`)
- **File watching:** `SecondaryPanelProvider` watches PLAN.json for external changes and refreshes the webview
- **Self-write guard:** A `_isSelfWrite` flag prevents re-reading when the extension itself wrote the file
- **MCP exposure:** PLAN.json content is served as MCP resources and manipulated via MCP tools
- **Jira sync:** Bidirectional sync maps PLAN.json items to Jira issues via `syncEngine.ts`

## Consequences

### Positive
- Human-readable, git-friendly format
- No database dependency — works in any workspace
- Schema validation ensures data integrity
- Easy to inspect and manually edit if needed
- Natural fit for VS Code file watcher ecosystem

### Negative
- File-level locking; concurrent writes from multiple extensions could conflict
- Large plans (1000+ items) may cause performance issues with full-file reads/writes
- Tree structure requires traversal to find items by ID (mitigated by `flattenPlanItems` utility)

## Alternatives Considered

1. **SQLite database** — Better for large datasets but adds binary dependency and is not git-friendly
2. **Multiple files (one per epic)** — Reduces conflict surface but complicates cross-entity queries
3. **VS Code workspace state** — Not human-readable and limited to the extension's namespace
