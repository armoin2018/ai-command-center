#!/usr/bin/env node
/**
 * PLAN.json Generator
 * Generates a comprehensive project plan from REQUIREMENTS.md analysis.
 * Run: node scripts/generate-plan.js
 */
const fs = require('fs');
const path = require('path');

const NOW = '2026-02-20T12:00:00Z';
const PROJECT_CODE = 'AICC';
let nextId = 1;

function id() {
  return `${PROJECT_CODE}-${String(nextId++).padStart(4, '0')}`;
}

function meta(by = 'blainemcdonnell') {
  return { createdAt: NOW, updatedAt: NOW, createdBy: by, updatedBy: by };
}

function epic(summary, opts = {}) {
  const eid = id();
  return {
    id: eid, type: 'epic', summary,
    description: opts.description || '',
    status: opts.status || 'BACKLOG',
    priority: opts.priority || 'high',
    storyPoints: opts.storyPoints || 21,
    sprint: opts.sprint || '',
    milestone: opts.milestone || '',
    assignee: opts.assignee || 'blainemcdonnell',
    agent: opts.agent || 'AI-ley Orchestrator',
    tags: opts.tags || [],
    acceptanceCriteria: opts.acceptanceCriteria || '',
    linkedRelationships: opts.linkedRelationships || [],
    children: [],
    contexts: opts.contexts || [],
    links: opts.links || [],
    instructions: [],
    personas: [],
    comments: [],
    metadata: meta(),
  };
}

function story(summary, parentEpic, opts = {}) {
  const sid = id();
  parentEpic.children.push(sid);
  return {
    id: sid, type: 'story', summary,
    description: opts.description || '',
    status: opts.status || parentEpic.status,
    priority: opts.priority || 'medium',
    parentId: parentEpic.id,
    storyPoints: opts.storyPoints || 5,
    sprint: opts.sprint || parentEpic.sprint,
    milestone: opts.milestone || parentEpic.milestone,
    assignee: opts.assignee || 'blainemcdonnell',
    agent: opts.agent || '',
    tags: opts.tags || parentEpic.tags,
    acceptanceCriteria: opts.acceptanceCriteria || '',
    linkedRelationships: opts.linkedRelationships || [],
    children: [],
    contexts: opts.contexts || [],
    links: opts.links || [],
    instructions: [],
    personas: [],
    comments: [],
    metadata: meta(),
  };
}

function task(summary, parentStory, opts = {}) {
  const tid = id();
  parentStory.children.push(tid);
  return {
    id: tid, type: 'task', summary,
    description: opts.description || '',
    status: opts.status || parentStory.status,
    priority: opts.priority || 'medium',
    parentId: parentStory.id,
    storyPoints: opts.storyPoints || 2,
    sprint: opts.sprint || parentStory.sprint,
    estimatedHours: opts.estimatedHours || 4,
    assignee: opts.assignee || 'blainemcdonnell',
    agent: opts.agent || '',
    tags: opts.tags || parentStory.tags,
    acceptanceCriteria: opts.acceptanceCriteria || '',
    linkedRelationships: opts.linkedRelationships || [],
    children: [],
    contexts: opts.contexts || [],
    links: opts.links || [],
    instructions: [],
    personas: [],
    comments: [],
    metadata: meta(),
  };
}

function bug(summary, parentStory, opts = {}) {
  const bid = id();
  if (parentStory) parentStory.children.push(bid);
  return {
    id: bid, type: 'bug', summary,
    description: opts.description || '',
    status: opts.status || 'READY',
    priority: opts.priority || 'high',
    parentId: parentStory ? parentStory.id : '',
    storyPoints: opts.storyPoints || 2,
    sprint: opts.sprint || (parentStory ? parentStory.sprint : ''),
    estimatedHours: opts.estimatedHours || 2,
    assignee: opts.assignee || 'blainemcdonnell',
    agent: opts.agent || 'AI-ley Bug Fixer',
    tags: opts.tags || [],
    acceptanceCriteria: opts.acceptanceCriteria || '',
    linkedRelationships: opts.linkedRelationships || [],
    children: [],
    contexts: opts.contexts || [],
    links: opts.links || [],
    instructions: [],
    personas: [],
    comments: [],
    metadata: meta(),
  };
}

const items = [];

// ============================================================================
// EPIC 1: Core Planning System (DONE) — §3.1
// ============================================================================
const e1 = epic('Core Planning System', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 1-5',
  milestone: 'Foundation', storyPoints: 34,
  tags: ['planning', 'core', 'PLAN.json'],
  description: 'Hierarchical planning system (Epic → Story → Task) with full lifecycle management. Covers REQ-PLAN-001 to REQ-PLAN-027.',
  acceptanceCriteria: 'All 27 REQ-PLAN-* requirements implemented and tested.',
  contexts: ['src/planning/', 'src/services/planGenerator.ts'],
});
items.push(e1);

const s1a = story('Three-level hierarchy & CRUD operations', e1, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 1',
  description: 'As a developer, I want Epic → Story → Task hierarchy with full CRUD, so that I can manage project work breakdown.',
  acceptanceCriteria: 'REQ-PLAN-001, REQ-PLAN-002, REQ-PLAN-008 implemented.',
  tags: ['planning', 'crud'],
});
items.push(s1a);

const s1b = story('Status workflow, priorities & estimation', e1, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 2',
  description: 'As a PM, I want configurable status workflow and estimation, so that I can track progress and capacity.',
  acceptanceCriteria: 'REQ-PLAN-003 to REQ-PLAN-007 implemented.',
  tags: ['planning', 'workflow'],
});
items.push(s1b);

const s1c = story('Metadata, relationships & persistence', e1, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 3',
  description: 'As a developer, I want linked relationships, tags, comments, and file-based persistence, so that items are connected and durable.',
  acceptanceCriteria: 'REQ-PLAN-009 to REQ-PLAN-019 implemented.',
  tags: ['planning', 'persistence'],
});
items.push(s1c);

const s1d = story('Schema validation, templates & advanced features', e1, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 4',
  description: 'As a developer, I want schema-validated plan files and planning templates, so that data integrity is guaranteed.',
  acceptanceCriteria: 'REQ-PLAN-020 to REQ-PLAN-027 implemented.',
  tags: ['planning', 'schema'],
});
items.push(s1d);

// ============================================================================
// EPIC 2: WebView UI & Panels (DONE base, bugs planned) — §3.2
// ============================================================================
const e2 = epic('WebView UI & Panels', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 2-6',
  milestone: 'Foundation', storyPoints: 34,
  tags: ['ui', 'webview', 'panels'],
  description: 'Modern interactive UI for planning and project management. Covers REQ-UI-001 to REQ-UI-019. UI bugs tracked separately.',
  contexts: ['media/', 'webview/', 'src/panels/'],
});
items.push(e2);

const s2a = story('Main Planning Panel & Secondary Panel', e2, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 2',
  tags: ['ui', 'panel'],
  acceptanceCriteria: 'REQ-UI-001, REQ-UI-003 implemented.',
});
items.push(s2a);

const s2b = story('Components, context menus & drag-drop', e2, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 3',
  tags: ['ui', 'components'],
  acceptanceCriteria: 'REQ-UI-004 to REQ-UI-006 implemented.',
});
items.push(s2b);

const s2c = story('Filtering, stats, keyboard nav & state persistence', e2, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 4',
  tags: ['ui', 'ux'],
  acceptanceCriteria: 'REQ-UI-007 to REQ-UI-012 implemented.',
});
items.push(s2c);

const s2d = story('Specialized panels & library loading', e2, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 5',
  tags: ['ui', 'libraries'],
  acceptanceCriteria: 'REQ-UI-013 to REQ-UI-019 implemented.',
});
items.push(s2d);

// ============================================================================
// EPIC 3: Configuration System (DONE) — §3.3
// ============================================================================
const e3 = epic('Configuration System', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 3-5',
  milestone: 'Foundation', storyPoints: 21,
  tags: ['config', 'settings', 'presets'],
  description: 'Multi-layer configuration with validation, presets, health scoring, and migration. REQ-CFG-001 to REQ-CFG-011.',
  contexts: ['src/config/', 'src/configManager.ts'],
});
items.push(e3);

const s3a = story('Config hierarchy, presets & health scoring', e3, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 3',
  acceptanceCriteria: 'REQ-CFG-001 to REQ-CFG-005 implemented.',
});
items.push(s3a);

const s3b = story('Config export, comparison & secrets', e3, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 4',
  acceptanceCriteria: 'REQ-CFG-006 to REQ-CFG-011 implemented.',
});
items.push(s3b);

// ============================================================================
// EPIC 4: MCP Server Integration (DONE) — §3.4
// ============================================================================
const e4 = epic('MCP Server Integration', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 4-7',
  milestone: 'Foundation', storyPoints: 34,
  tags: ['mcp', 'server', 'transport'],
  description: 'MCP server with stdio/HTTP/WebSocket transports, 12 tools, 3 resources, 8 prompts. REQ-MCP-001 to REQ-MCP-015.',
  contexts: ['src/mcp/'],
});
items.push(e4);

const s4a = story('MCP transports & core tools', e4, {
  status: 'DONE', storyPoints: 13, sprint: 'Sprint 5',
  acceptanceCriteria: 'REQ-MCP-001 to REQ-MCP-007 implemented.',
});
items.push(s4a);

const s4b = story('Security, config & management commands', e4, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 6',
  acceptanceCriteria: 'REQ-MCP-008 to REQ-MCP-015 implemented.',
});
items.push(s4b);

// ============================================================================
// EPIC 5: Jira Integration (DONE) — §3.5
// ============================================================================
const e5 = epic('Jira Integration', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 6-8',
  milestone: 'Integrations', storyPoints: 21,
  tags: ['jira', 'sync', 'integration'],
  description: 'Bidirectional Jira sync with conflict detection and resolution. REQ-JIRA-001 to REQ-JIRA-011.',
  contexts: ['src/integrations/', 'src/api/jiraClient.ts'],
});
items.push(e5);

const s5a = story('Hierarchy sync & strategies', e5, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 7',
  acceptanceCriteria: 'REQ-JIRA-001 to REQ-JIRA-006 implemented.',
});
items.push(s5a);

const s5b = story('Rate limiting, commands & auth', e5, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 8',
  acceptanceCriteria: 'REQ-JIRA-007 to REQ-JIRA-011 implemented.',
});
items.push(s5b);

// ============================================================================
// EPIC 6: Core Infrastructure (DONE) — §3.7-3.11, 3.13-3.14, 3.25-3.28
// ============================================================================
const e6 = epic('Core Infrastructure Services', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 1-10',
  milestone: 'Foundation', storyPoints: 34,
  tags: ['core', 'services', 'infrastructure'],
  description: 'Search, diagrams, init, file protection, assets, chat participant, logging, collaborative editing, real-time updates, version overrides, plan generator.',
});
items.push(e6);

const s6a = story('Search & discovery (REQ-SRCH-*)', e6, {
  status: 'DONE', storyPoints: 3, sprint: 'Sprint 5',
  tags: ['search'],
});
items.push(s6a);

const s6b = story('Diagram tools (REQ-DIAG-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 6',
  tags: ['diagrams', 'mermaid'],
});
items.push(s6b);

const s6c = story('Init & scaffolding (REQ-INIT-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 4',
  tags: ['init', 'scaffolding'],
});
items.push(s6c);

const s6d = story('File protection & undo (REQ-FP-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 5',
  tags: ['file-protection', 'undo'],
});
items.push(s6d);

const s6e = story('Asset management (REQ-ASSET-*)', e6, {
  status: 'DONE', storyPoints: 2, sprint: 'Sprint 6',
  tags: ['assets'],
});
items.push(s6e);

const s6f = story('Chat participant (REQ-CHAT-*)', e6, {
  status: 'DONE', storyPoints: 3, sprint: 'Sprint 7',
  tags: ['chat', 'copilot'],
});
items.push(s6f);

const s6g = story('Logging & error handling (REQ-LOG-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 2',
  tags: ['logging', 'errors'],
});
items.push(s6g);

const s6h = story('Collaborative editing service (REQ-COLLAB-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 8',
  tags: ['collaborative', 'editing'],
});
items.push(s6h);

const s6i = story('Real-time update system (REQ-RTU-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 8',
  tags: ['real-time', 'file-watcher'],
});
items.push(s6i);

const s6j = story('Version override system (REQ-VOS-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 9',
  tags: ['versions', 'overrides'],
});
items.push(s6j);

const s6k = story('Plan generator service (REQ-PGEN-*)', e6, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 9',
  tags: ['plan-generator'],
});
items.push(s6k);

// ============================================================================
// EPIC 7: AI Kit Catalog (base DONE) — §3.12 core
// ============================================================================
const e7 = epic('AI Kit Catalog - Core', {
  status: 'DONE', priority: 'medium', sprint: 'Sprint 8-10',
  milestone: 'Integrations', storyPoints: 13,
  tags: ['ai-kit', 'catalog'],
  description: 'Core catalog: install, uninstall, refresh, loader, tracking, UI. REQ-KIT-001 to REQ-KIT-006.',
  contexts: ['src/aiKitManager.ts'],
});
items.push(e7);

const s7a = story('Kit install, uninstall & refresh', e7, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 9',
  acceptanceCriteria: 'REQ-KIT-001 to REQ-KIT-005 implemented.',
});
items.push(s7a);

const s7b = story('Kit catalog UI', e7, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 10',
  acceptanceCriteria: 'REQ-KIT-006 implemented.',
});
items.push(s7b);

// ============================================================================
// EPIC 8: Skills Development Program (In Progress) — §4.6, §5.*
// ============================================================================
const e8 = epic('Skills Development Program', {
  status: 'IN-PROGRESS', priority: 'high', sprint: 'Sprint 13-17',
  milestone: 'Skills Expansion Phase 1', storyPoints: 34,
  tags: ['skills', 'platform'],
  description: 'Build 48 skills across 9 domains with standardized 13-file pattern. REQ-SKILL-001 to REQ-SKILL-012, §5.1-5.9.',
  contexts: ['.github/skills/'],
});
items.push(e8);

const s8a = story('Administrative skills (5 skills)', e8, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 13',
  tags: ['skills', 'admin'],
  description: 'As a developer, I want admin skills (catalog, manage-plan, skill-creator, index, optimize), so that I can maintain AI-Ley resources.',
});
items.push(s8a);

const s8b = story('Communication skills (10 skills)', e8, {
  status: 'IN-PROGRESS', storyPoints: 8, sprint: 'Sprint 14',
  tags: ['skills', 'communication'],
  description: 'As a user, I want communication skills (email, calendly, outlook, mailchimp, whatsapp, zoom, vonage, slack, teams, sharepoint), so that I can automate communications.',
  acceptanceCriteria: '8 of 10 done. Slack and Teams/SharePoint planned for Sprint 21.',
});
items.push(s8b);

const s8c = story('Social media skills (10 skills)', e8, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 16',
  tags: ['skills', 'social-media'],
  description: 'As a content creator, I want social media skills (discord, facebook, instagram, linkedin, meetup, reddit, threads, tiktok, twitter, youtube).',
});
items.push(s8c);

const s8d = story('Media & content skills (6 skills)', e8, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 14',
  tags: ['skills', 'media'],
  description: 'As a content creator, I want media skills (canva, capcut, gamma, gemini, openai, speechify).',
});
items.push(s8d);

const s8e = story('E-commerce & CRM skills (4 skills)', e8, {
  status: 'DONE', storyPoints: 3, sprint: 'Sprint 14',
  tags: ['skills', 'ecommerce'],
});
items.push(s8e);

const s8f = story('Data & infrastructure skills (1 skill)', e8, {
  status: 'DONE', storyPoints: 2, sprint: 'Sprint 14',
  tags: ['skills', 'data', 'kafka'],
});
items.push(s8f);

const s8g = story('Developer tools & utilities (11 skills)', e8, {
  status: 'IN-PROGRESS', storyPoints: 8, sprint: 'Sprint 15',
  tags: ['skills', 'tools'],
  description: '9 done (audio, data-converter, image, model, rag-search, seo-report, tag-n-rag, video, web-crawl). Translator and ESP manager planned.',
});
items.push(s8g);

const s8h = story('Atlassian skills (2 skills)', e8, {
  status: 'DONE', storyPoints: 3, sprint: 'Sprint 15',
  tags: ['skills', 'atlassian', 'jira', 'confluence'],
});
items.push(s8h);

const s8i = story('Web & CMS skills (1 skill)', e8, {
  status: 'DONE', storyPoints: 2, sprint: 'Sprint 15',
  tags: ['skills', 'wordpress'],
});
items.push(s8i);

const s8j = story('Skill MCP registration & Swagger files', e8, {
  status: 'BACKLOG', storyPoints: 8, sprint: 'Sprint 25',
  tags: ['skills', 'mcp', 'swagger'],
  description: 'As a developer, I want each skill to include mcp.json and swagger.json, so that skills are automatically available as MCP tools and REST endpoints.',
  acceptanceCriteria: 'REQ-SKILL-010, REQ-SKILL-011, REQ-SKILL-012 implemented.',
});
items.push(s8j);

// ============================================================================
// EPIC 9: AI-Ley Toolset (DONE) — §4.1-4.5, 4.7-4.11
// ============================================================================
const e9 = epic('AI-Ley Toolset Framework', {
  status: 'DONE', priority: 'high', sprint: 'Sprint 1-10',
  milestone: 'Foundation', storyPoints: 21,
  tags: ['ai-ley', 'framework', 'agents', 'personas', 'instructions', 'prompts'],
  description: 'Core framework, agent system, personas, instructions, prompts, intake, flows, indexes, templates, schemas. §4.1-4.11.',
  contexts: ['.github/ai-ley/', '.github/agents/', '.github/prompts/'],
});
items.push(e9);

const s9a = story('Core framework & configuration (REQ-AILEY-*)', e9, {
  status: 'DONE', storyPoints: 5, sprint: 'Sprint 1',
});
items.push(s9a);

const s9b = story('Agent system — 22 agents (REQ-AGENT-*)', e9, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 2',
});
items.push(s9b);

const s9c = story('Personas, instructions, prompts & indexes', e9, {
  status: 'DONE', storyPoints: 8, sprint: 'Sprint 3',
});
items.push(s9c);

// ============================================================================
// EPIC 10: UI Bugs & Improvements — §3.2 bugs
// ============================================================================
const e10 = epic('Planning Item Detail UI Bugs & Improvements', {
  status: 'READY', priority: 'high', sprint: 'Sprint 16',
  milestone: 'Quality', storyPoints: 13,
  tags: ['ui', 'bugs', 'planning-detail'],
  description: 'Fix 2 bugs and implement 5 improvements in the planning item detail tabs. REQ-UI-BUG-001/002, REQ-UI-020 to REQ-UI-024.',
  contexts: ['media/secondaryPanel/', 'media/components/'],
});
items.push(e10);

const s10a = story('Fix comment tab navigation and icon bugs', e10, {
  status: 'READY', storyPoints: 3, sprint: 'Sprint 16', priority: 'high',
  tags: ['ui', 'bugs', 'comments'],
  description: 'As a user, I want comment tab to stay active after suppression and show visible toggle icons.',
  acceptanceCriteria: 'REQ-UI-BUG-001, REQ-UI-BUG-002 fixed.',
});
items.push(s10a);

const b1 = bug('Comment suppress jumps to Description tab', s10a, {
  sprint: 'Sprint 16', priority: 'high',
  description: 'REQ-UI-BUG-001: When suppressing a comment, view jumps to Description tab instead of staying on Comments tab.',
  acceptanceCriteria: 'After suppressing a comment, the Comments tab remains active.',
  tags: ['ui', 'comments'],
  contexts: ['media/secondaryPanel/app.js'],
});
items.push(b1);

const b2 = bug('Suppressed comment toggle icon invisible on light background', s10a, {
  sprint: 'Sprint 16', priority: 'high',
  description: 'REQ-UI-BUG-002: Show/hide toggle icon is white eye on light background. Should be red crossed-through eye.',
  acceptanceCriteria: 'Toggle icon uses bi-eye-slash with text-danger class.',
  tags: ['ui', 'comments', 'accessibility'],
});
items.push(b2);

const s10b = story('Remove redundant Details tab', e10, {
  status: 'READY', storyPoints: 2, sprint: 'Sprint 16',
  tags: ['ui', 'cleanup'],
  description: 'As a user, I want only the Edit tab (not both Details and Edit) to avoid redundancy.',
  acceptanceCriteria: 'REQ-UI-020: Details tab removed, Edit tab is sufficient.',
});
items.push(s10b);

const s10c = story('Info and Relationship tab layout improvements', e10, {
  status: 'READY', storyPoints: 3, sprint: 'Sprint 16',
  tags: ['ui', 'layout'],
  description: 'As a user, I want two-column layouts on Info and Relationship tabs for better use of space.',
  acceptanceCriteria: 'REQ-UI-021, REQ-UI-022 implemented.',
});
items.push(s10c);

const s10d = story('Reorder tabs and add Jira link button', e10, {
  status: 'READY', storyPoints: 3, sprint: 'Sprint 16',
  tags: ['ui', 'jira'],
  description: 'As a user, I want GitHub tab after Edit and a cloud button to open Jira issues in browser.',
  acceptanceCriteria: 'REQ-UI-023, REQ-UI-024 implemented.',
});
items.push(s10d);

// ============================================================================
// EPIC 11: UI Consolidation & Cleanup — §3.22
// ============================================================================
const e11 = epic('UI Consolidation & Cleanup', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 18',
  milestone: 'Quality', storyPoints: 13,
  tags: ['ui', 'cleanup', 'keybindings'],
  description: 'Remove legacy views, add advanced toggle, remove conflicting keybindings. REQ-UICL-001 to REQ-UICL-006.',
  contexts: ['package.json', 'src/extension.ts'],
});
items.push(e11);

const s11a = story('Remove legacy sidebar and editor webview', e11, {
  storyPoints: 5, sprint: 'Sprint 18', priority: 'high',
  description: 'As a developer, I want only the Secondary Panel UI surface, removing unused sidebar tree view and legacy editor webview.',
  acceptanceCriteria: 'REQ-UICL-001, REQ-UICL-002 implemented. No duplicate UI surfaces.',
});
items.push(s11a);

const s11b = story('Advanced capabilities toggle', e11, {
  storyPoints: 3, sprint: 'Sprint 18',
  acceptanceCriteria: 'REQ-UICL-003, REQ-UICL-004, REQ-UICL-005 implemented.',
});
items.push(s11b);

const s11c = story('Remove conflicting keybindings', e11, {
  storyPoints: 2, sprint: 'Sprint 18', priority: 'high',
  acceptanceCriteria: 'REQ-UICL-006: All conflicting keybindings removed from package.json.',
});
items.push(s11c);

// ============================================================================
// EPIC 12: Security & Isolation — §3.23
// ============================================================================
const e12 = epic('Security & Isolation (CSP/CORS)', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 18',
  milestone: 'Quality', storyPoints: 13,
  tags: ['security', 'csp', 'cors'],
  description: 'Strict CSP/CORS, no inline scripts/styles, nonce-based loading. REQ-SECISO-001 to REQ-SECISO-005.',
  contexts: ['src/panels/', 'src/mcp/'],
});
items.push(e12);

const s12a = story('Enforce strict TS/JS/CSS/HTML separation', e12, {
  storyPoints: 8, sprint: 'Sprint 18', priority: 'high',
  acceptanceCriteria: 'REQ-SECISO-001, REQ-SECISO-005 implemented. No inline scripts or styles.',
});
items.push(s12a);

const s12b = story('CSP headers and CORS for all endpoints', e12, {
  storyPoints: 5, sprint: 'Sprint 18', priority: 'high',
  acceptanceCriteria: 'REQ-SECISO-002, REQ-SECISO-003, REQ-SECISO-004 implemented.',
});
items.push(s12b);

// ============================================================================
// EPIC 13: Footer & Status Bar — §3.24
// ============================================================================
const e13 = epic('Footer & Status Bar', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 18',
  milestone: 'Quality', storyPoints: 8,
  tags: ['ui', 'footer', 'status-bar'],
  description: 'Workspace:port display, connection indicators. REQ-FOOT-001 to REQ-FOOT-005.',
});
items.push(e13);

const s13a = story('Panel footer with workspace:port display', e13, {
  storyPoints: 3, sprint: 'Sprint 18',
  acceptanceCriteria: 'REQ-FOOT-001, REQ-FOOT-002, REQ-FOOT-003 implemented.',
});
items.push(s13a);

// ============================================================================
// EPIC 14: Multi-Workspace MCP Architecture — §3.16
// ============================================================================
const e14 = epic('Multi-Workspace MCP Architecture', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 18-19',
  milestone: 'Multi-Workspace MCP', storyPoints: 34,
  tags: ['mcp', 'multi-workspace', 'leader-election'],
  description: 'Shared MCP REST server with leader election, workspace registration, port management, health scanning. REQ-MCPW-001 to REQ-MCPW-013.',
  contexts: ['src/mcp/'],
});
items.push(e14);

const s14a = story('Leader election & port management', e14, {
  storyPoints: 13, sprint: 'Sprint 18', priority: 'high',
  description: 'As a developer, I want automatic leader election via port scanning and health checks, so multiple VS Code windows share one MCP server.',
  acceptanceCriteria: 'REQ-MCPW-001 to REQ-MCPW-003, REQ-MCPW-012 implemented.',
});
items.push(s14a);

const s14b = story('Workspace registration & inventory', e14, {
  storyPoints: 8, sprint: 'Sprint 18',
  acceptanceCriteria: 'REQ-MCPW-004 to REQ-MCPW-008 implemented. MCP inventory schema created.',
});
items.push(s14b);

const s14c = story('Auto-reconnection & graceful shutdown', e14, {
  storyPoints: 5, sprint: 'Sprint 19',
  acceptanceCriteria: 'REQ-MCPW-009 to REQ-MCPW-013 implemented.',
});
items.push(s14c);

// ============================================================================
// EPIC 15: Documentation System — §3.20
// ============================================================================
const e15 = epic('Documentation System', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 19',
  milestone: 'Documentation', storyPoints: 13,
  tags: ['docs', 'documentation', 'help'],
  description: 'Comprehensive auto-surfacing documentation. REQ-DOCS-001 to REQ-DOCS-007.',
});
items.push(e15);

const s15a = story('AI-Ley & AICC documentation content', e15, {
  storyPoints: 8, sprint: 'Sprint 19',
  acceptanceCriteria: 'REQ-DOCS-001, REQ-DOCS-002 implemented.',
});
items.push(s15a);

const s15b = story('Auto-open, help button & version tracking', e15, {
  storyPoints: 5, sprint: 'Sprint 19',
  acceptanceCriteria: 'REQ-DOCS-003 to REQ-DOCS-007 implemented.',
});
items.push(s15b);

// ============================================================================
// EPIC 16: Plan History & Archival — §3.29
// ============================================================================
const e16 = epic('Plan History & Archival', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 19',
  milestone: 'Planning Enhanced', storyPoints: 13,
  tags: ['planning', 'history', 'archive'],
  description: 'Auto-move completed items to PLAN-HISTORY.json, archive for Jira sync. REQ-HIST-001 to REQ-HIST-008.',
});
items.push(e16);

const s16a = story('PLAN-HISTORY.json auto-archival', e16, {
  storyPoints: 8, sprint: 'Sprint 19', priority: 'high',
  acceptanceCriteria: 'REQ-HIST-001 to REQ-HIST-004, REQ-HIST-007 implemented.',
});
items.push(s16a);

const s16b = story('PLAN-ARCHIVE.json for Jira sync removals', e16, {
  storyPoints: 5, sprint: 'Sprint 19',
  acceptanceCriteria: 'REQ-HIST-005, REQ-HIST-006, REQ-HIST-008 implemented.',
});
items.push(s16b);

// ============================================================================
// EPIC 17: Task Scheduler & Actions Framework — §3.17, §3.21
// ============================================================================
const e17 = epic('Task Scheduler & Unified Actions Framework', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 19-20',
  milestone: 'Automation', storyPoints: 34,
  tags: ['scheduler', 'actions', 'automation', 'cron'],
  description: 'Cron-like scheduler tab, unified actions registry, rate limiting, throttling. REQ-SCHED-001 to REQ-SCHED-026, REQ-ACT-001 to REQ-ACT-009.',
  contexts: ['src/services/'],
});
items.push(e17);

const s17a = story('Unified Actions Framework', e17, {
  storyPoints: 8, sprint: 'Sprint 19', priority: 'high',
  description: 'As a developer, I want a centralized actions registry shared across panels, scheduler, MCP, and integrations.',
  acceptanceCriteria: 'REQ-ACT-001 to REQ-ACT-009 implemented.',
  tags: ['actions', 'framework'],
});
items.push(s17a);

const s17b = story('Scheduler tab UI & task management', e17, {
  storyPoints: 8, sprint: 'Sprint 19',
  description: 'As a user, I want a Scheduler tab in the Secondary Panel to add, remove, run, and toggle tasks.',
  acceptanceCriteria: 'REQ-SCHED-001 to REQ-SCHED-014 implemented.',
  tags: ['scheduler', 'ui'],
});
items.push(s17b);

const s17c = story('Scheduling patterns (interval, cron, specific time)', e17, {
  storyPoints: 5, sprint: 'Sprint 20',
  acceptanceCriteria: 'REQ-SCHED-003 to REQ-SCHED-007 implemented.',
  tags: ['scheduler', 'cron'],
});
items.push(s17c);

const s17d = story('Rate limiting, throttling & stuck process handling', e17, {
  storyPoints: 8, sprint: 'Sprint 20', priority: 'high',
  description: 'As a developer, I want rate limiting, concurrency control, and stuck process detection for scheduled tasks.',
  acceptanceCriteria: 'REQ-SCHED-016 to REQ-SCHED-026 implemented.',
  tags: ['scheduler', 'safety'],
});
items.push(s17d);

// ============================================================================
// EPIC 18: Jira Configuration Panel & Sync — §3.18
// ============================================================================
const e18 = epic('Jira Configuration Panel & Sync', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 20',
  milestone: 'Integrations Enhanced', storyPoints: 21,
  tags: ['jira', 'config', 'sync', 'panel'],
  description: 'In-panel Jira config, filter toggles, PLAN-ARCHIVE, scheduled sync. REQ-JIRACFG-001 to REQ-JIRACFG-014.',
  contexts: ['media/secondaryPanel/', 'src/integrations/'],
  linkedRelationships: [{ type: 'depends-on', itemId: '' }], // will be updated
});
items.push(e18);

const s18a = story('Jira config accordion panel UI', e18, {
  storyPoints: 8, sprint: 'Sprint 20', priority: 'high',
  acceptanceCriteria: 'REQ-JIRACFG-001 to REQ-JIRACFG-007 implemented.',
});
items.push(s18a);

const s18b = story('Test connectivity, sync & scheduled sync', e18, {
  storyPoints: 8, sprint: 'Sprint 20',
  acceptanceCriteria: 'REQ-JIRACFG-008 to REQ-JIRACFG-011 implemented.',
});
items.push(s18b);

const s18c = story('PLAN-ARCHIVE integration with sync', e18, {
  storyPoints: 5, sprint: 'Sprint 20',
  acceptanceCriteria: 'REQ-JIRACFG-012 to REQ-JIRACFG-014 implemented.',
});
items.push(s18c);

// ============================================================================
// EPIC 19: MCP Servers Management Panel — §3.19
// ============================================================================
const e19 = epic('MCP Servers Management Panel', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 20',
  milestone: 'Multi-Workspace MCP', storyPoints: 13,
  tags: ['mcp', 'panel', 'servers'],
  description: 'MCP Servers tab with inventory, health, kill/respawn. REQ-MCPSRV-001 to REQ-MCPSRV-009.',
  contexts: ['media/secondaryPanel/'],
});
items.push(e19);

const s19a = story('MCP Servers tab & inventory display', e19, {
  storyPoints: 8, sprint: 'Sprint 20',
  acceptanceCriteria: 'REQ-MCPSRV-001 to REQ-MCPSRV-006 implemented.',
});
items.push(s19a);

const s19b = story('Health indicators & auto-refresh', e19, {
  storyPoints: 5, sprint: 'Sprint 20',
  acceptanceCriteria: 'REQ-MCPSRV-007 to REQ-MCPSRV-009 implemented.',
});
items.push(s19b);

// ============================================================================
// EPIC 20: Accessibility & Testing — §6.6, §6.7
// ============================================================================
const e20 = epic('Accessibility & Comprehensive Testing', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 20',
  milestone: 'Quality', storyPoints: 13,
  tags: ['accessibility', 'testing', 'a11y'],
  description: 'ARIA labels, keyboard audit, unit tests, integration tests. NFR-A11Y-*, NFR-TEST-*.',
});
items.push(e20);

const s20a = story('Accessibility audit & ARIA implementation', e20, {
  storyPoints: 5, sprint: 'Sprint 20',
  acceptanceCriteria: 'NFR-A11Y-001 to NFR-A11Y-004 implemented.',
});
items.push(s20a);

const s20b = story('Comprehensive unit & integration tests', e20, {
  storyPoints: 8, sprint: 'Sprint 20',
  acceptanceCriteria: 'NFR-TEST-001 to NFR-TEST-005 implemented.',
});
items.push(s20b);

// ============================================================================
// EPIC 21: Microsoft 365 & Communication Skills Expansion — Sprint 21
// ============================================================================
const e21 = epic('Microsoft 365 & Communication Skills', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 21',
  milestone: 'Skills Expansion Phase 2', storyPoints: 13,
  tags: ['skills', 'microsoft', 'teams', 'sharepoint', 'slack'],
  description: 'New skills: Microsoft Teams, SharePoint, Slack. §5.2.',
});
items.push(e21);

const s21a = story('Microsoft Teams skill', e21, {
  storyPoints: 5, sprint: 'Sprint 21',
  tags: ['skills', 'teams'],
  description: 'As a user, I want a Teams skill for channels, messaging, meetings, tabs, bots, and adaptive cards.',
});
items.push(s21a);

const s21b = story('Microsoft SharePoint skill', e21, {
  storyPoints: 5, sprint: 'Sprint 21',
  tags: ['skills', 'sharepoint'],
});
items.push(s21b);

const s21c = story('Slack skill', e21, {
  storyPoints: 3, sprint: 'Sprint 21',
  tags: ['skills', 'slack'],
});
items.push(s21c);

// ============================================================================
// EPIC 22: AI Kit Global Caching & Manifests — §3.12 management
// ============================================================================
const e22 = epic('AI Kit Global Caching & Manifests', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 22',
  milestone: 'Kit System Overhaul', storyPoints: 21,
  tags: ['ai-kit', 'cache', 'manifest'],
  description: 'Global cache at ~/.vscode/cache/, manifest.json tracking, surgical install/uninstall. REQ-KIT-010 to REQ-KIT-021.',
  contexts: ['src/aiKitManager.ts'],
});
items.push(e22);

const s22a = story('Global cache clone/pull mechanism', e22, {
  storyPoints: 8, sprint: 'Sprint 22', priority: 'high',
  acceptanceCriteria: 'REQ-KIT-010, REQ-KIT-011 implemented.',
  tags: ['ai-kit', 'git', 'cache'],
});
items.push(s22a);

const s22b = story('Manifest-based file tracking & surgical removal', e22, {
  storyPoints: 8, sprint: 'Sprint 22', priority: 'high',
  acceptanceCriteria: 'REQ-KIT-012 to REQ-KIT-015 implemented.',
  tags: ['ai-kit', 'manifest'],
});
items.push(s22b);

const s22c = story('Default kit auto-loading & identity detection', e22, {
  storyPoints: 5, sprint: 'Sprint 22',
  acceptanceCriteria: 'REQ-KIT-016 to REQ-KIT-021 implemented.',
  tags: ['ai-kit', 'auto-loading'],
});
items.push(s22c);

// ============================================================================
// EPIC 23: Schema Evolution & PROGRESS Dashboard — Sprint 22
// ============================================================================
const e23 = epic('Schema Evolution & PROGRESS Dashboard', {
  status: 'BACKLOG', priority: 'low', sprint: 'Sprint 22',
  milestone: 'Quality', storyPoints: 8,
  tags: ['schema', 'dashboard', 'reporting'],
  description: 'Plan schema v2, migration tooling, interactive HTML dashboard. REQ-SCHM-006, §8 roadmap.',
});
items.push(e23);

const s23a = story('Schema evolution v1 → v2 migration', e23, {
  storyPoints: 5, sprint: 'Sprint 22',
  tags: ['schema', 'migration'],
});
items.push(s23a);

const s23b = story('PROGRESS.html interactive dashboard', e23, {
  storyPoints: 3, sprint: 'Sprint 22',
  tags: ['dashboard', 'chartjs', 'mermaid'],
});
items.push(s23b);

// ============================================================================
// EPIC 24: AI Kit Component System & Config Form — §3.12
// ============================================================================
const e24 = epic('AI Kit Component System & Configuration Form', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 23',
  milestone: 'Kit System Overhaul', storyPoints: 21,
  tags: ['ai-kit', 'components', 'config-form'],
  description: 'Component toggle system, structure.json update, config form UI. REQ-KIT-050 to REQ-KIT-060, REQ-KIT-030 to REQ-KIT-037.',
  contexts: ['src/aiKitManager.ts', 'media/catalog/'],
});
items.push(e24);

const s24a = story('Component definition & toggle behavior', e24, {
  storyPoints: 8, sprint: 'Sprint 23', priority: 'high',
  acceptanceCriteria: 'REQ-KIT-050 to REQ-KIT-057 implemented.',
  tags: ['ai-kit', 'components'],
});
items.push(s24a);

const s24b = story('Component refresh, dependencies & conflict detection', e24, {
  storyPoints: 5, sprint: 'Sprint 23',
  acceptanceCriteria: 'REQ-KIT-058 to REQ-KIT-060 implemented.',
  tags: ['ai-kit', 'components'],
});
items.push(s24b);

const s24c = story('Kit configuration form UI & save/reset', e24, {
  storyPoints: 8, sprint: 'Sprint 23',
  acceptanceCriteria: 'REQ-KIT-030 to REQ-KIT-037 implemented.',
  tags: ['ai-kit', 'config-form'],
});
items.push(s24c);

// ============================================================================
// EPIC 25: Reactive Event Bus — §3.33
// ============================================================================
const e25 = epic('Reactive Event Bus', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 23',
  milestone: 'Platform Architecture', storyPoints: 13,
  tags: ['event-bus', 'pubsub', 'architecture'],
  description: 'Internal pub/sub EventBus with typed channels for planning, MCP, scheduler, skill, and file events. REQ-EVBUS-001 to REQ-EVBUS-011.',
  contexts: ['src/services/'],
});
items.push(e25);

const s25a = story('EventBus core & planning/MCP events', e25, {
  storyPoints: 8, sprint: 'Sprint 23', priority: 'high',
  acceptanceCriteria: 'REQ-EVBUS-001 to REQ-EVBUS-004, REQ-EVBUS-008 implemented.',
});
items.push(s25a);

const s25b = story('Skill, integration & file events + RealTimeUpdateSystem bridge', e25, {
  storyPoints: 5, sprint: 'Sprint 23',
  acceptanceCriteria: 'REQ-EVBUS-005 to REQ-EVBUS-007, REQ-EVBUS-009 to REQ-EVBUS-011 implemented.',
});
items.push(s25b);

// ============================================================================
// EPIC 26: MCP Full CRUD & Resource Discovery — §3.30, §3.31
// ============================================================================
const e26 = epic('MCP Full CRUD & Resource Discovery', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 23',
  milestone: 'MCP Completeness', storyPoints: 21,
  tags: ['mcp', 'crud', 'discovery'],
  description: 'Complete story/task/bug MCP tools, resource discovery meta-tools. REQ-MCPC-001 to REQ-MCPC-007, REQ-MCPD-001 to REQ-MCPD-007.',
  contexts: ['src/mcp/'],
});
items.push(e26);

const s26a = story('Story, Task, Bug MCP CRUD tools', e26, {
  storyPoints: 8, sprint: 'Sprint 23', priority: 'high',
  acceptanceCriteria: 'REQ-MCPC-001 to REQ-MCPC-004 implemented.',
  tags: ['mcp', 'crud'],
});
items.push(s26a);

const s26b = story('Bulk status updates & re-parenting', e26, {
  storyPoints: 3, sprint: 'Sprint 23',
  acceptanceCriteria: 'REQ-MCPC-005 to REQ-MCPC-007 implemented.',
  tags: ['mcp', 'bulk'],
});
items.push(s26b);

const s26c = story('MCP resource discovery tools', e26, {
  storyPoints: 8, sprint: 'Sprint 23',
  description: 'As an AI agent, I want discover_resources, get_agent_info, get_skill_info, list_personas, list_instructions tools.',
  acceptanceCriteria: 'REQ-MCPD-001 to REQ-MCPD-007 implemented.',
  tags: ['mcp', 'discovery'],
});
items.push(s26c);

// ============================================================================
// EPIC 27: Ideation System & Jira Sync — §3.45
// ============================================================================
const e27 = epic('Ideation System & Jira Sync', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 24',
  milestone: 'Ideation', storyPoints: 34,
  tags: ['ideation', 'ideas', 'voting', 'jira'],
  description: 'Ideation tab, IDEAS.json, voting, comments, clone-to-story/epic, Jira sync. REQ-IDEA-001 to REQ-IDEA-073.',
  contexts: ['media/secondaryPanel/'],
});
items.push(e27);

const s27a = story('Ideation tab UI & idea management', e27, {
  storyPoints: 8, sprint: 'Sprint 24', priority: 'high',
  acceptanceCriteria: 'REQ-IDEA-001 to REQ-IDEA-013 implemented.',
  tags: ['ideation', 'ui'],
});
items.push(s27a);

const s27b = story('IDEAS.json data model & persistence', e27, {
  storyPoints: 5, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-IDEA-020 to REQ-IDEA-024 implemented.',
  tags: ['ideation', 'data'],
});
items.push(s27b);

const s27c = story('Clone-to-Story & Clone-to-Epic', e27, {
  storyPoints: 5, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-IDEA-030 to REQ-IDEA-035 implemented.',
  tags: ['ideation', 'planning'],
});
items.push(s27c);

const s27d = story('Ideation Jira sync & scheduling', e27, {
  storyPoints: 8, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-IDEA-040 to REQ-IDEA-052 implemented.',
  tags: ['ideation', 'jira', 'sync'],
});
items.push(s27d);

const s27e = story('Ideation event bus & MCP tools', e27, {
  storyPoints: 5, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-IDEA-060 to REQ-IDEA-073 implemented.',
  tags: ['ideation', 'mcp', 'events'],
});
items.push(s27e);

// ============================================================================
// EPIC 28: Natural Language Planning — §3.39
// ============================================================================
const e28 = epic('Natural Language Planning', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 24',
  milestone: 'AI Intelligence', storyPoints: 13,
  tags: ['nlp', 'chat', 'planning'],
  description: 'Chat participant NL → structured planning items. REQ-NLP-001 to REQ-NLP-007.',
  contexts: ['src/chatParticipant.ts'],
});
items.push(e28);

const s28a = story('NL → Epic/Story creation with attribute extraction', e28, {
  storyPoints: 8, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-NLP-001 to REQ-NLP-004 implemented.',
});
items.push(s28a);

const s28b = story('Planning queries & pipeline triggers via chat', e28, {
  storyPoints: 5, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-NLP-005 to REQ-NLP-007 implemented.',
});
items.push(s28b);

// ============================================================================
// EPIC 29: Git Branch Auto-Linking — §3.40
// ============================================================================
const e29 = epic('Git Branch Auto-Linking', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 24',
  milestone: 'Developer Experience', storyPoints: 13,
  tags: ['git', 'branch', 'automation'],
  description: 'Auto-detect git branches matching item IDs, update status/links. REQ-GITL-001 to REQ-GITL-008.',
});
items.push(e29);

const s29a = story('Branch pattern detection & auto-linking', e29, {
  storyPoints: 8, sprint: 'Sprint 24', priority: 'high',
  acceptanceCriteria: 'REQ-GITL-001 to REQ-GITL-005 implemented.',
});
items.push(s29a);

const s29b = story('Branch merge detection & multi-branch support', e29, {
  storyPoints: 5, sprint: 'Sprint 24',
  acceptanceCriteria: 'REQ-GITL-006 to REQ-GITL-008 implemented.',
});
items.push(s29b);

// ============================================================================
// EPIC 30: Skill-to-MCP Factory & REST Endpoints — §3.32
// ============================================================================
const e30 = epic('Skill-to-MCP Factory & REST Endpoints', {
  status: 'BACKLOG', priority: 'high', sprint: 'Sprint 25',
  milestone: 'Skill Platform', storyPoints: 34,
  tags: ['skills', 'mcp', 'rest', 'swagger', 'factory'],
  description: 'Auto-generate MCP tools from skills, REST POST endpoints, Swagger. REQ-STMCP-001 to REQ-STMCP-036.',
  contexts: ['src/mcp/', '.github/skills/'],
});
items.push(e30);

const s30a = story('Skill introspection & dynamic MCP registration', e30, {
  storyPoints: 8, sprint: 'Sprint 25', priority: 'high',
  acceptanceCriteria: 'REQ-STMCP-001 to REQ-STMCP-007 implemented.',
  tags: ['mcp', 'factory'],
});
items.push(s30a);

const s30b = story('Skill MCP stdio registration in mcp.json', e30, {
  storyPoints: 5, sprint: 'Sprint 25',
  acceptanceCriteria: 'REQ-STMCP-010 to REQ-STMCP-014 implemented.',
  tags: ['mcp', 'stdio'],
});
items.push(s30b);

const s30c = story('Dynamic REST POST endpoints per skill', e30, {
  storyPoints: 8, sprint: 'Sprint 25',
  acceptanceCriteria: 'REQ-STMCP-020 to REQ-STMCP-025 implemented.',
  tags: ['rest', 'skills'],
});
items.push(s30c);

const s30d = story('Per-skill Swagger & aggregated OpenAPI', e30, {
  storyPoints: 8, sprint: 'Sprint 25',
  acceptanceCriteria: 'REQ-STMCP-030 to REQ-STMCP-036 implemented.',
  tags: ['swagger', 'openapi'],
});
items.push(s30d);

// ============================================================================
// EPIC 31: Skill Pipelines — §3.34
// ============================================================================
const e31 = epic('Skill Pipelines', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 25',
  milestone: 'Automation', storyPoints: 13,
  tags: ['skills', 'pipelines', 'workflow'],
  description: 'Declarative multi-skill workflows with YAML definitions. REQ-SPIPE-001 to REQ-SPIPE-010.',
  contexts: ['.github/ai-ley/pipelines/'],
});
items.push(e31);

const s31a = story('Pipeline definition & execution engine', e31, {
  storyPoints: 8, sprint: 'Sprint 25', priority: 'high',
  acceptanceCriteria: 'REQ-SPIPE-001 to REQ-SPIPE-007 implemented.',
});
items.push(s31a);

const s31b = story('Pipeline scheduling, events & MCP tool', e31, {
  storyPoints: 5, sprint: 'Sprint 25',
  acceptanceCriteria: 'REQ-SPIPE-008 to REQ-SPIPE-010 implemented.',
});
items.push(s31b);

// ============================================================================
// EPIC 32: Planning Velocity Engine — §3.35
// ============================================================================
const e32 = epic('Planning Velocity Engine', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 26',
  milestone: 'Analytics', storyPoints: 13,
  tags: ['velocity', 'analytics', 'charts'],
  description: 'Sprint velocity, burndown, cycle time, predictions from PLAN-HISTORY.json. REQ-VEL-001 to REQ-VEL-008.',
});
items.push(e32);

const s32a = story('Velocity computation & charts', e32, {
  storyPoints: 8, sprint: 'Sprint 26',
  acceptanceCriteria: 'REQ-VEL-001 to REQ-VEL-005 implemented.',
});
items.push(s32a);

const s32b = story('Predictive estimates & MCP resource', e32, {
  storyPoints: 5, sprint: 'Sprint 26',
  acceptanceCriteria: 'REQ-VEL-006 to REQ-VEL-008 implemented.',
});
items.push(s32b);

// ============================================================================
// EPIC 33: Workspace Telemetry — §3.36
// ============================================================================
const e33 = epic('Workspace Telemetry', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 26',
  milestone: 'Analytics', storyPoints: 13,
  tags: ['telemetry', 'analytics', 'local'],
  description: 'Local-only command/tool/skill tracking with dashboard. REQ-TELEM-001 to REQ-TELEM-008.',
});
items.push(e33);

const s33a = story('Telemetry tracking & persistence', e33, {
  storyPoints: 5, sprint: 'Sprint 26',
  acceptanceCriteria: 'REQ-TELEM-001 to REQ-TELEM-005 implemented.',
});
items.push(s33a);

const s33b = story('Telemetry dashboard tab & MCP resource', e33, {
  storyPoints: 5, sprint: 'Sprint 26',
  acceptanceCriteria: 'REQ-TELEM-006 to REQ-TELEM-008 implemented.',
});
items.push(s33b);

// ============================================================================
// EPIC 34: Idea Analytics & AI Enrichment — §3.46
// ============================================================================
const e34 = epic('Idea Analytics & AI Enrichment', {
  status: 'BACKLOG', priority: 'low', sprint: 'Sprint 26',
  milestone: 'Ideation', storyPoints: 13,
  tags: ['ideation', 'analytics', 'ai', 'scoring'],
  description: 'Idea scoring, auto-tagging, duplicates, trends, lifecycle automation. REQ-IASCORE/IAAI/IATREND/IALIFE.',
});
items.push(e34);

const s34a = story('Idea scoring & AI-assisted enrichment', e34, {
  storyPoints: 5, sprint: 'Sprint 26',
  acceptanceCriteria: 'REQ-IASCORE-001 to REQ-IASCORE-004, REQ-IAAI-001 to REQ-IAAI-004 implemented.',
});
items.push(s34a);

const s34b = story('Trend analysis & lifecycle automation', e34, {
  storyPoints: 5, sprint: 'Sprint 26',
  acceptanceCriteria: 'REQ-IATREND-001 to REQ-IATREND-004, REQ-IALIFE-001 to REQ-IALIFE-003 implemented.',
});
items.push(s34b);

// ============================================================================
// EPIC 35: Smart Context Engine — §3.38
// ============================================================================
const e35 = epic('Smart Context Engine', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 27',
  milestone: 'AI Intelligence', storyPoints: 13,
  tags: ['context', 'ai', 'matching'],
  description: 'Auto-surface relevant items based on active editor file. REQ-SCTX-001 to REQ-SCTX-007.',
});
items.push(e35);

const s35a = story('Active file detection & tag-based matching', e35, {
  storyPoints: 8, sprint: 'Sprint 27',
  acceptanceCriteria: 'REQ-SCTX-001 to REQ-SCTX-004 implemented.',
});
items.push(s35a);

const s35b = story('Context panel section & thresholds', e35, {
  storyPoints: 5, sprint: 'Sprint 27',
  acceptanceCriteria: 'REQ-SCTX-005 to REQ-SCTX-007 implemented.',
});
items.push(s35b);

// ============================================================================
// EPIC 36: Skill Health Monitor — §3.41
// ============================================================================
const e36 = epic('Skill Health Monitor', {
  status: 'BACKLOG', priority: 'medium', sprint: 'Sprint 27',
  milestone: 'Skill Platform', storyPoints: 13,
  tags: ['skills', 'health', 'monitoring'],
  description: 'Periodic health probes, credential validation, rate limit monitoring. REQ-SKHM-001 to REQ-SKHM-008.',
});
items.push(e36);

const s36a = story('Health probes & credential validation', e36, {
  storyPoints: 8, sprint: 'Sprint 27',
  acceptanceCriteria: 'REQ-SKHM-001 to REQ-SKHM-005 implemented.',
});
items.push(s36a);

const s36b = story('Orchestrator integration & event bus', e36, {
  storyPoints: 5, sprint: 'Sprint 27',
  acceptanceCriteria: 'REQ-SKHM-006 to REQ-SKHM-008 implemented.',
});
items.push(s36b);

// ============================================================================
// EPIC 37: Prompt Effectiveness Scoring — §3.37
// ============================================================================
const e37 = epic('Prompt Effectiveness Scoring', {
  status: 'BACKLOG', priority: 'low', sprint: 'Sprint 28',
  milestone: 'AI Intelligence', storyPoints: 8,
  tags: ['prompts', 'scoring', 'analytics'],
  description: 'Track prompt usage, correlate with outcomes, rank by effectiveness. REQ-PEFF-001 to REQ-PEFF-006.',
});
items.push(e37);

const s37a = story('Prompt tracking & effectiveness scoring', e37, {
  storyPoints: 8, sprint: 'Sprint 28',
  acceptanceCriteria: 'REQ-PEFF-001 to REQ-PEFF-006 implemented.',
});
items.push(s37a);

// ============================================================================
// EPIC 38: Offline-First Skill Queue — §3.44
// ============================================================================
const e38 = epic('Offline-First Skill Queue', {
  status: 'BACKLOG', priority: 'low', sprint: 'Sprint 28',
  milestone: 'Resilience', storyPoints: 8,
  tags: ['offline', 'queue', 'resilience'],
  description: 'Queue failed skill executions, drain on reconnect. REQ-OFFQ-001 to REQ-OFFQ-007.',
});
items.push(e38);

const s38a = story('Offline detection, queue & auto-drain', e38, {
  storyPoints: 5, sprint: 'Sprint 28',
  acceptanceCriteria: 'REQ-OFFQ-001 to REQ-OFFQ-005 implemented.',
});
items.push(s38a);

const s38b = story('Event bus integration & dead letter handling', e38, {
  storyPoints: 3, sprint: 'Sprint 28',
  acceptanceCriteria: 'REQ-OFFQ-006, REQ-OFFQ-007 implemented.',
});
items.push(s38b);

// ============================================================================
// EPIC 39: Agent Session Memory — §3.43
// ============================================================================
const e39 = epic('Agent Session Memory', {
  status: 'BACKLOG', priority: 'low', sprint: 'Sprint 29',
  milestone: 'AI Intelligence', storyPoints: 8,
  tags: ['agent', 'memory', 'learning'],
  description: 'Per-agent persistent memory for approach preferences and outcomes. REQ-ASMEM-001 to REQ-ASMEM-006.',
});
items.push(e39);

const s39a = story('Agent memory store & retrieval', e39, {
  storyPoints: 5, sprint: 'Sprint 29',
  acceptanceCriteria: 'REQ-ASMEM-001 to REQ-ASMEM-004 implemented.',
});
items.push(s39a);

const s39b = story('Orchestrator integration & memory export', e39, {
  storyPoints: 3, sprint: 'Sprint 29',
  acceptanceCriteria: 'REQ-ASMEM-005, REQ-ASMEM-006 implemented.',
});
items.push(s39b);

// ============================================================================
// EPIC 40: Cross-Workspace Knowledge Base — §3.42
// ============================================================================
const e40 = epic('Cross-Workspace Knowledge Base', {
  status: 'BACKLOG', priority: 'low', sprint: 'Sprint 29',
  milestone: 'AI Intelligence', storyPoints: 8,
  tags: ['knowledge-base', 'cross-workspace'],
  description: 'Global knowledge store at ~/.aicc/knowledge/. REQ-CWKB-001 to REQ-CWKB-006.',
});
items.push(e40);

const s40a = story('Knowledge store & extraction', e40, {
  storyPoints: 5, sprint: 'Sprint 29',
  acceptanceCriteria: 'REQ-CWKB-001 to REQ-CWKB-004 implemented.',
});
items.push(s40a);

const s40b = story('Knowledge search & deduplication', e40, {
  storyPoints: 3, sprint: 'Sprint 29',
  acceptanceCriteria: 'REQ-CWKB-005, REQ-CWKB-006 implemented.',
});
items.push(s40b);

// ============================================================================
// EPIC 41: Confluence Integration — §3.6
// ============================================================================
const e41 = epic('Confluence Integration', {
  status: 'BACKLOG', priority: 'low', sprint: '',
  milestone: 'Integrations Enhanced', storyPoints: 8,
  tags: ['confluence', 'integration'],
  description: 'Confluence CRUD and format conversion. REQ-CONF-001 to REQ-CONF-004.',
});
items.push(e41);

const s41a = story('Confluence integration & format conversion', e41, {
  storyPoints: 8,
  acceptanceCriteria: 'REQ-CONF-001 to REQ-CONF-004 implemented.',
});
items.push(s41a);

// ============================================================================
// Wire cross-epic dependencies
// ============================================================================
// E18 (Jira Config) depends on E17 (Scheduler/Actions)
e18.linkedRelationships = [{ type: 'depends-on', itemId: e17.id }];
// E19 (MCP Servers Panel) depends on E14 (Multi-Workspace MCP)
e19.linkedRelationships = [{ type: 'depends-on', itemId: e14.id }];
// E25 (Event Bus) is foundational for many others
e27.linkedRelationships.push({ type: 'depends-on', itemId: e25.id }); // Ideation depends on Event Bus
e29.linkedRelationships = [{ type: 'depends-on', itemId: e25.id }]; // Git auto-link depends on Event Bus
e31.linkedRelationships = [{ type: 'depends-on', itemId: e30.id }]; // Pipelines depend on Skill Factory
e32.linkedRelationships = [{ type: 'depends-on', itemId: e16.id }]; // Velocity depends on Plan History
e34.linkedRelationships = [{ type: 'depends-on', itemId: e27.id }]; // Idea Analytics depends on Ideation
e36.linkedRelationships = [{ type: 'depends-on', itemId: e25.id }]; // Skill Health depends on Event Bus
e37.linkedRelationships = [{ type: 'depends-on', itemId: e33.id }]; // Prompt Scoring depends on Telemetry
e38.linkedRelationships = [{ type: 'depends-on', itemId: e25.id }]; // Offline Queue depends on Event Bus
// Kit components depend on Kit caching
e24.linkedRelationships = [{ type: 'depends-on', itemId: e22.id }];

// ============================================================================
// Compute status counts
// ============================================================================
const statusCounts = { BACKLOG: 0, READY: 0, 'IN-PROGRESS': 0, BLOCKED: 0, REVIEW: 0, DONE: 0, SKIP: 0 };
for (const item of items) {
  statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
}

// ============================================================================
// Build PLAN.json
// ============================================================================
const plan = {
  $schema: '.github/aicc/schemas/plan.v1.schema.json',
  version: '1.0.0',
  generatedAt: NOW,
  source: '.project',
  metadata: {
    projectName: 'AI Command Center',
    projectCode: 'AICC',
    currentSprint: 'Sprint 15',
    currentMilestone: 'Skills Expansion Phase 1',
    defaultAssignee: 'blainemcdonnell',
    defaultAgent: 'AI-ley Orchestrator',
    createdBy: 'blainemcdonnell',
    updatedBy: 'blainemcdonnell',
  },
  statusCounts,
  items,
};

// ============================================================================
// Write output
// ============================================================================
const outPath = path.join(__dirname, '..', '.project', 'PLAN.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(plan, null, 2));

console.log(`✅ PLAN.json generated: ${items.length} items`);
console.log(`   Epics: ${items.filter(i => i.type === 'epic').length}`);
console.log(`   Stories: ${items.filter(i => i.type === 'story').length}`);
console.log(`   Tasks: ${items.filter(i => i.type === 'task').length}`);
console.log(`   Bugs: ${items.filter(i => i.type === 'bug').length}`);
console.log(`   Status: ${JSON.stringify(statusCounts)}`);
