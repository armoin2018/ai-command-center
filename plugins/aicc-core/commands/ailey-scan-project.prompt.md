---
id: ailey-scan-project
name: scanProject
description: Comprehensive project scanner that analyzes architecture, code quality, security, performance, documentation, AI resources, and generates detailed interactive HTML reports (SUMMARY.html). Use when performing project audits, health checks, competitive analysis, pitch deck generation, go-to-market strategy, or when asked to scan, analyze, or summarize a project.
---

# Project Scanner & Report Generator

Perform comprehensive project analysis and generate interactive single-file HTML reports covering architecture, code quality, security, performance, AI resources, business strategy, and actionable recommendations.

## When to Use

- Scan and analyze a project's full structure and health
- Generate interactive `SUMMARY.html` report with findings and recommendations
- Perform security audits and vulnerability scanning
- Analyze code quality, performance, and documentation coverage
- Catalog AI resources (agents, personas, skills, prompts, instructions)
- Create pitch decks, competitive analysis, or go-to-market strategies
- Produce scorecard summaries with prioritized action items

## Quick Start

When asked to scan a project, execute the following workflow:

1. **Gather Context** — Read project config files (package.json, ai-ley.json, README)
2. **Scan Architecture** — Map source directories, modules, dependencies
3. **Catalog AI Resources** — Count and categorize agents, personas, skills, prompts, instructions
4. **Analyze Code** — Security, performance, quality, documentation coverage
5. **Generate Report** — Produce single-file interactive HTML with all findings

## Workflow: Full Project Scan

### Phase 1: Context Gathering

Collect project metadata:

- Read `package.json` for name, version, dependencies, commands, configuration
- Read `.github/ai-ley/ai-ley.json` for folder structure and file mappings
- Read `README.md` for project description and features
- Read `tsconfig.json` for TypeScript configuration
- Count files by type, total lines of code

### Phase 2: Architecture Analysis

Map the project structure:

- Identify entry points (extension.ts, main modules)
- Map service layer (src/services/), integrations, panels, views
- Document MCP server architecture (tools, transports, endpoints)
- Identify planning system (entities, managers, validators)
- Map webview/media architecture
- Document dependency graph

### Phase 3: AI Resource Catalog

Enumerate all AI-ley resources:

- **Agents**: Count and list from `.github/**/*.agent.md`
- **Personas**: Count by category from `.github/**/*.persona.md`
- **Instructions**: Count by category from `.github/**/*.instruction.md`
- **Skills**: Count and categorize from `.github/**/SKILL.md`
- **Prompts**: Count and list from `.github/**/*.prompt.md`

### Phase 4: Security Scan

Analyze for vulnerabilities:

- Check CSP policies for `unsafe-eval`, `unsafe-inline`
- Scan for `child_process` usage without sanitization
- Check for hardcoded secrets or credentials
- Validate `new RegExp()` usage for ReDoS risk
- Check input validation on user-facing endpoints
- Verify authentication on MCP/HTTP endpoints

### Phase 5: Code Quality Analysis

Assess code health:

- Count `: any` type usage (type safety)
- Count TODO/FIXME/HACK annotations
- Measure JSDoc coverage vs total functions
- Check error handling (try-catch vs async functions)
- Identify files exceeding complexity thresholds (>500 lines)
- Check for console.log vs proper logger usage

### Phase 6: Performance Analysis

Identify performance concerns:

- Check for synchronous file I/O in async paths
- Identify large file processing without streaming
- Check for missing debounce on frequent operations
- Validate caching strategies
- Check WebSocket/event listener cleanup

### Phase 7: Documentation Scan

Evaluate documentation coverage:

- JSDoc comment coverage percentage
- README completeness (install, usage, API, examples)
- Inline code comments quality
- User guide and configuration docs
- API documentation completeness

### Phase 8: Report Generation

Generate single-file interactive HTML report (SUMMARY.html):

- Use Bootstrap CSS (inline), Chart.js (inline), Mermaid (inline)
- All images as inline SVG
- No external includes or CDN references
- Tabbed navigation with sidebar
- Interactive charts and diagrams
- Collapsible sections for detailed findings
- Prioritized action items with severity ratings

## Report Sections

The generated SUMMARY.html includes these sections:

1. **Project Description** — Name, version, purpose, key features
2. **Architecture** — Module map, dependency graph, data flow
3. **How to Use** — Installation, configuration, quick start
4. **Instruction Sets** — Categories, counts, coverage
5. **Personas** — Categories, domain experts, counts
6. **Skills** — Categories, capabilities, integration points
7. **Agents** — Specialized agents, roles, capabilities
8. **Prompts** — Workflow prompts, categories, usage
9. **AI Command Center** — Features, commands, panels
10. **Scorecard Summary** — Overall health score with breakdowns
11. **Security Scan** — Vulnerabilities, severity, recommendations
12. **Performance Analysis** — Bottlenecks, optimizations
13. **Code Quality** — Metrics, patterns, improvements
14. **Documentation & Logging** — Coverage, gaps, recommendations
15. **Issues** — Prioritized bugs, TODOs, technical debt
16. **Innovation Suggestions** — Feature ideas, improvements
17. **Competitive Analysis** — Market position, differentiators
18. **Pitch Deck** — Value proposition, market, traction
19. **Go-to-Market Strategy** — Channels, pricing, launch plan
20. **Priority Actions** — Ordered action items by severity

## Output Format

- Single self-contained HTML file
- All CSS, JS, fonts, and images inline
- Responsive design (desktop + tablet)
- Dark theme matching VS Code aesthetic
- Print-friendly styles
- Interactive charts with tooltips
- Collapsible detail sections
- Copy-to-clipboard for code snippets

---
version: 1.0.0
updated: 2026-02-26
reviewed: 2026-02-26
score: 4.5
---
