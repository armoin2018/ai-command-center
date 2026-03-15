# ADR-003: Content Security Policy Nonce Strategy

**Status:** Accepted  
**Date:** 2025-01-15  
**Deciders:** Core team

## Context

VS Code webviews require Content Security Policy (CSP) headers to prevent XSS attacks. Early implementations used `'unsafe-eval'` and `'unsafe-inline'` to simplify development, but these directives significantly weaken CSP protection.

## Decision

Adopt a strict nonce-based CSP for all webview panels:

```
script-src 'nonce-${nonce}';
style-src ${webview.cspSource} 'nonce-${nonce}';
```

- Every `<script>` and `<style>` tag must include `nonce="${nonce}"`
- The nonce is generated per-render via a cryptographic random function
- `'unsafe-eval'` is **never** used — Mermaid and other libraries are loaded from pre-bundled files
- `'unsafe-inline'` is **never** used — all inline scripts use nonces

Applies to:
- `mainPanel.ts` (primary webview)
- `mermaidPanel.ts` (diagram rendering)
- `swagger.ts` (API documentation)
- `media/components/index.html` (component library)

## Consequences

### Positive
- Eliminates XSS attack vectors through eval/inline injection
- Complies with VS Code Marketplace security requirements
- Each render cycle generates a unique nonce, preventing replay attacks

### Negative
- Every inline script/style requires nonce injection at render time
- Third-party libraries that depend on `eval()` must be pre-bundled
- Slightly more complex HTML generation in panel providers

## Alternatives Considered

1. **Keep `unsafe-eval`** — Rejected as it allows arbitrary code execution
2. **Hash-based CSP** — Requires computing hashes at build time; nonces are more flexible for dynamic content
