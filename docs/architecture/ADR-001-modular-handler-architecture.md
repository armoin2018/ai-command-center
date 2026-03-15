# ADR-001: Modular Handler Architecture

**Status:** Accepted  
**Date:** 2025-01-15  
**Deciders:** Core team

## Context

The `extension.ts` (1735 lines) and `secondaryPanelProvider.ts` (3091 lines) files had become monolithic, combining activation logic, command registration, webview lifecycle, and message routing in single files. This made navigation difficult, increased merge conflicts, and violated the Single Responsibility Principle.

## Decision

Split monolithic files into modular handler modules:

- **extension.ts** (748 lines) — Thin activation shell delegating to:
  - `src/init/` — Startup and initialization
  - `src/commands/` — Command registration
  - `src/actions/` — Action handlers

- **secondaryPanelProvider.ts** (849 lines) — Webview lifecycle + message router delegating to:
  - `src/views/secondaryPanel/planningHandlers.ts`
  - `src/views/secondaryPanel/ideationHandlers.ts`
  - `src/views/secondaryPanel/mcpHandlers.ts`
  - `src/views/secondaryPanel/aikitHandlers.ts`
  - `src/views/secondaryPanel/intakeHandlers.ts`

A shared `HandlerContext` interface provides each handler module access to `postMessage`, `planGenerator`, `extensionContext`, and other required services without tight coupling.

## Consequences

### Positive
- Each handler module is < 300 lines and focused on one domain
- Faster code navigation and reduced merge conflicts
- Handlers are independently testable with mock `HandlerContext`
- New message types can be added without touching the router

### Negative
- One level of indirection for message routing
- `HandlerContext` must be kept in sync with handler needs

## Alternatives Considered

1. **Keep monolithic files** — Rejected due to maintainability burden
2. **Event bus with dynamic registration** — Over-engineered for the current scale; may revisit for plugin-based handler registration
