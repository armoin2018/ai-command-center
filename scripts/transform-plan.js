#!/usr/bin/env node

/**
 * Transform PLAN.json to new structure
 */

const fs = require('fs');
const path = require('path');

const planPath = path.join(__dirname, '..', '.project', 'PLAN.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

// Helper to inherit from parent
function findParentItem(items, parentId) {
  return items.find(item => item.id === parentId);
}

// Transform each item
function transformItem(item, allItems) {
  const transformed = {
    id: item.id,
    type: item.type,
    summary: item.summary,
    description: item.description,
    status: item.status ? item.status.toUpperCase() : 'BACKLOG',
    priority: item.priority,
    assignee: null,
    agent: null,
    order: 0,
    estimatedHours: 0,
    actualHours: 0,
    acceptanceCriteria: '',
    variables: {},
    instructions: [],
    personas: [],
    contexts: [],
    links: [],
    tags: [],
    gitRepoUrl: '',
    gitRepoBranch: '',
    metadata: {
      createdAt: item.metadata?.createdAt || new Date().toISOString(),
      updatedAt: item.metadata?.updatedAt || new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    },
    comments: []
  };

  // Handle parent relationship
  if (item.parent) {
    transformed.parentId = item.parent;
    
    // Inherit instructions, personas, and agent from parent
    const parent = findParentItem(allItems, item.parent);
    if (parent) {
      transformed.instructions = parent.instructions || [];
      transformed.personas = parent.personas || [];
      transformed.agent = parent.agent || null;
    }
  }

  // Handle children
  if (item.children && item.children.length > 0) {
    transformed.children = item.children;
  }

  return transformed;
}

// Transform all items
const transformedItems = plan.items.map(item => transformItem(item, plan.items));

// Update the plan
const transformedPlan = {
  $schema: '../.github/aicc/schemas/plan.v1.schema.json',
  version: plan.version,
  generatedAt: new Date().toISOString(),
  source: plan.source,
  metadata: {
    ...plan.metadata,
    createdBy: 'system',
    updatedBy: 'system'
  },
  statusCounts: {
    BACKLOG: plan.statusCounts.backlog || plan.statusCounts.BACKLOG || 0,
    READY: plan.statusCounts.ready || plan.statusCounts.READY || 0,
    'IN-PROGRESS': plan.statusCounts['in-progress'] || plan.statusCounts['IN-PROGRESS'] || 0,
    BLOCKED: plan.statusCounts.blocked || plan.statusCounts.BLOCKED || 0,
    REVIEW: plan.statusCounts.review || plan.statusCounts.REVIEW || 0,
    DONE: plan.statusCounts.done || plan.statusCounts.DONE || 0,
    SKIP: plan.statusCounts.skip || plan.statusCounts.SKIP || 0
  },
  items: transformedItems
};

// Write the transformed plan
fs.writeFileSync(planPath, JSON.stringify(transformedPlan, null, 2), 'utf8');

console.log(`✅ Transformed ${transformedItems.length} items in PLAN.json`);
console.log('📋 Changes applied:');
console.log('  - Removed sourcePath from items');
console.log('  - Added variables key-value structure');
console.log('  - Added createdBy and updatedBy to metadata');
console.log('  - Added comments array');
console.log('  - Renamed parent to parentId');
console.log('  - Added instructions array');
console.log('  - Added personas array');
console.log('  - Added agent field');
console.log('  - Added contexts array');
console.log('  - Added links array');
console.log('  - Removed projectNumber');
console.log('  - Changed status to uppercase');
console.log('  - Added assignee');
console.log('  - Added estimatedHours and actualHours');
console.log('  - Added order');
console.log('  - Added gitRepoUrl and gitRepoBranch');
console.log('  - Added tags array');
console.log('  - Added acceptanceCriteria field');
