#!/usr/bin/env node
/**
 * Generates jira-import.csv from PLAN.json
 * Jira bulk import format: Summary, Issue Type, Priority, Status, Sprint, Story Points, Parent, Description, Labels
 */
const fs = require('fs');
const path = require('path');

const plan = require(path.join(__dirname, '..', '.project', 'PLAN.json'));

const STATUS_MAP = {
  'DONE': 'Done',
  'IN-PROGRESS': 'In Progress',
  'REVIEW': 'In Review',
  'READY': 'To Do',
  'BACKLOG': 'Backlog',
  'BLOCKED': 'Blocked',
  'SKIP': 'Done',
};

const TYPE_MAP = {
  'epic': 'Epic',
  'story': 'Story',
  'task': 'Task',
  'bug': 'Bug',
};

const PRIORITY_MAP = {
  'critical': 'Highest',
  'high': 'High',
  'medium': 'Medium',
  'low': 'Low',
};

function esc(str) {
  if (!str) return '';
  return '"' + String(str).replace(/"/g, '""') + '"';
}

const header = 'Summary,Issue Type,Issue Id,Priority,Status,Sprint,Story Points,Parent Id,Description,Labels';
const rows = [header];

for (const item of plan.items) {
  const summary = esc(item.summary);
  const type = TYPE_MAP[item.type] || 'Story';
  const issueId = item.id;
  const priority = PRIORITY_MAP[item.priority] || 'Medium';
  const status = STATUS_MAP[item.status] || 'Backlog';
  const sprint = esc(item.sprint || '');
  const sp = item.storyPoints || '';
  const parentId = item.parentId || '';
  const desc = esc(item.description || '');
  const labels = esc((item.tags || []).join(' '));

  rows.push(`${summary},${type},${issueId},${priority},${status},${sprint},${sp},${parentId},${desc},${labels}`);
}

const outPath = path.join(__dirname, '..', '.project', 'plan', 'planning', 'jira-import.csv');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, rows.join('\n'));
console.log(`✅ jira-import.csv generated: ${rows.length - 1} rows`);
