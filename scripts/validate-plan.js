const plan = require('../.project/PLAN.json');
console.log('version:', plan.version);
console.log('source:', plan.source);
console.log('projectCode:', plan.metadata.projectCode);
console.log('currentSprint:', plan.metadata.currentSprint);
console.log('ID pattern check:', plan.items.every(i => /^AICC-\d{4}$/.test(i.id)) ? 'PASS' : 'FAIL');
console.log('Item count:', plan.items.length);
const types = {};
plan.items.forEach(i => types[i.type] = (types[i.type]||0)+1);
console.log('Types:', JSON.stringify(types));
console.log('Status counts:', JSON.stringify(plan.statusCounts));

// Verify parent-child consistency
let issues = 0;
const ids = new Set(plan.items.map(i=>i.id));
for (const item of plan.items) {
  if (item.parentId && !ids.has(item.parentId)) { issues++; console.log('Missing parent:', item.id, '->', item.parentId); }
  for (const c of item.children || []) { if (!ids.has(c)) { issues++; console.log('Missing child:', item.id, '->', c); } }
  for (const r of item.linkedRelationships || []) { if (r.itemId && !ids.has(r.itemId)) { issues++; console.log('Bad link:', item.id, '->', r.itemId); } }
}
console.log('Integrity issues:', issues);
console.log('First ID:', plan.items[0].id, 'Last ID:', plan.items[plan.items.length-1].id);

// Verify all required schema fields present
const required = ['version', 'generatedAt', 'source', 'metadata', 'statusCounts', 'items'];
const missing = required.filter(f => !(f in plan));
console.log('Missing required fields:', missing.length ? missing.join(', ') : 'NONE');

// Check metadata
const metaRequired = ['projectName', 'projectCode', 'currentSprint', 'defaultAssignee', 'createdBy', 'updatedBy'];
const metaMissing = metaRequired.filter(f => !(f in plan.metadata));
console.log('Missing metadata fields:', metaMissing.length ? metaMissing.join(', ') : 'NONE');

// Verify projectCode pattern
console.log('ProjectCode pattern:', /^[A-Z]+$/.test(plan.metadata.projectCode) ? 'PASS' : 'FAIL');

// Check for duplicates
const dups = plan.items.filter((item, idx) => plan.items.findIndex(i => i.id === item.id) !== idx);
console.log('Duplicate IDs:', dups.length ? dups.map(d => d.id).join(', ') : 'NONE');
