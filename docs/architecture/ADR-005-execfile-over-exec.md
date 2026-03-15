# ADR-005: execFile Over exec for Shell Commands

**Status:** Accepted  
**Date:** 2025-01-15  
**Deciders:** Core team

## Context

The extension executes external commands (git, openssl, netstat) for repository management, TLS certificate generation, and port scanning. The Node.js `child_process.exec()` function passes commands through a shell interpreter, which enables shell injection attacks if any argument contains user-controlled data.

## Decision

Replace all `exec()` / `execSync()` calls with `execFile()` / `execFileSync()`:

- **`execFile(command, args[])`** bypasses the shell entirely, passing arguments as an array
- Each argument is treated as a literal value — shell metacharacters (`; | & $()`) are not interpreted
- For cases where pipe/grep functionality was needed (e.g., `netstat -an | grep LISTEN`), the grep logic is reimplemented in JavaScript

### Files affected:
- `aiKitManager.ts` — 6 git command sites
- `securityManager.ts` — 3 openssl command sites
- `mcpHandlers.ts` — 1 netstat site (replaced `execSync('netstat -an | grep LISTEN')` with `execFileSync('netstat', ['-an'])` + JS regex filtering)

## Consequences

### Positive
- Eliminates shell injection vulnerabilities
- Arguments with special characters are handled correctly
- Slightly better performance (no shell process spawned)

### Negative
- Cannot use shell features (pipes, redirects, globbing) — must implement in JS
- Slightly more verbose argument passing (array vs. template string)

## Alternatives Considered

1. **Sanitize shell arguments** — Error-prone; allowlist-based escaping is never comprehensive
2. **`shell: false` option on `exec`** — Not supported; `exec` always uses a shell
3. **Third-party library (execa)** — Adds a dependency for a single concern; `execFile` is built-in
