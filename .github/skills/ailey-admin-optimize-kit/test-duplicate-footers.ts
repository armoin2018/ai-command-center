#!/usr/bin/env tsx

import { readFileSync } from 'fs';

const filePath = process.argv[2] || '../../../.github/prompts/ailey-admin-assess.prompt.md';

console.log('Testing duplicate footer detection...\n');

const content = readFileSync(filePath, 'utf-8');

// Match full footer blocks (with or without leading ---)
const footerPattern = /(---\s+)?version:[^\n]+\nupdated:[^\n]+\nreviewed:[^\n]+\nscore:[^\n]+\n(---)?/g;
const footers = content.match(footerPattern) || [];

console.log(`Footers found: ${footers.length}\n`);

footers.forEach((footer, i) => {
  console.log(`Footer ${i + 1}:`);
  console.log(footer);
  console.log('---\n');
});

if (footers.length > 1) {
  console.log(`\nWould remove ${footers.length - 1} duplicate footer(s)`);
  console.log(`Keeping: Footer ${footers.length}`);
}
