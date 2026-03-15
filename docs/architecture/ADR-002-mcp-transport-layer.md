# ADR-002: MCP Transport Layer Design

**Status:** Accepted  
**Date:** 2025-01-15  
**Deciders:** Core team

## Context

The Model Context Protocol (MCP) server needs to support multiple transports to serve different client types: VS Code extension host (stdio), local web UIs (HTTP), and remote tooling (HTTPS with TLS).

## Decision

Implement a layered transport architecture:

- **`mcpServer.ts`** — Core MCP protocol handler (resources, tools, prompts) with planning domain logic
- **`httpTransport.ts`** — HTTP/HTTPS server with CORS, authentication, and request validation
- **`securityManager.ts`** — TLS certificate generation and auth token management
- **`mcpCache.ts`** — Response caching and request batching for performance

The HTTP transport wraps the core server, adding web-specific concerns (CORS headers, localhost origin checks, API key validation) without polluting the MCP protocol layer.

AI Kit API endpoints (`/api/ai-kits/*`) are co-hosted on the HTTP transport, delegating to `AIKitLoaderService` for inventory fetching, installation, and uninstallation.

## Consequences

### Positive
- Clean separation between protocol logic and transport concerns
- Each transport can be independently enabled/disabled via configuration
- Security policies (CORS, auth) apply consistently at the transport layer
- AI Kit operations are accessible from both webview and external clients

### Negative
- Two HTTP handler chains (MCP + AI Kit API) on the same port
- TLS certificates are self-signed (acceptable for localhost development)

## Alternatives Considered

1. **Single transport (stdio only)** — Would prevent web UI and remote access
2. **Separate ports for MCP and AI Kit API** — Adds configuration complexity; co-hosting is simpler for the webview
