#!/usr/bin/env node
/**
 * Tests for ailey-index-tool search functionality
 */

import { strict as assert } from 'assert';
import { test } from 'node:test';
import { searchResources, formatResults, loadIndexes } from './search.js';

test('searchResources filters by name', async () => {
  const indexes = await loadIndexes(['skills']);
  const results = searchResources(indexes, { name: 'seo' });
  
  assert.ok(results.length > 0, 'Should find SEO-related resources');
  assert.ok(results.every((r) => r.name.toLowerCase().includes('seo')), 'All results should match name filter');
});

test('searchResources filters by keywords', async () => {
  const indexes = await loadIndexes(['skills']);
  const results = searchResources(indexes, { keywords: ['seo-audit'] });
  
  assert.ok(results.length > 0, 'Should find resources with seo-audit keyword');
  assert.ok(
    results.every((r) => r.keywords.some((k) => k.includes('seo-audit'))),
    'All results should have matching keyword'
  );
});

test('searchResources searches by string', async () => {
  const indexes = await loadIndexes(['skills']);
  const results = searchResources(indexes, { string: 'analysis' });
  
  assert.ok(results.length > 0, 'Should find resources containing "analysis"');
});

test('searchResources filters by regex', async () => {
  const indexes = await loadIndexes(['skills']);
  const results = searchResources(indexes, { regex: 'seo|indexer' });
  
  assert.ok(results.length > 0, 'Should find resources matching regex');
});

test('formatResults produces JSON', () => {
  const resources = [
    {
      name: 'test-resource',
      path: 'test/path',
      description: 'Test description',
      keywords: ['test'],
      version: '1.0.0',
      score: 4.0,
      updated: '2026-01-20'
    }
  ];
  
  const json = formatResults(resources, 'json', false);
  const parsed = JSON.parse(json);
  
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'test-resource');
});

test('formatResults produces names only', () => {
  const resources = [
    {
      name: 'resource1',
      path: 'test/path1',
      description: 'Test 1',
      keywords: [],
      version: null,
      score: null,
      updated: null
    },
    {
      name: 'resource2',
      path: 'test/path2',
      description: 'Test 2',
      keywords: [],
      version: null,
      score: null,
      updated: null
    }
  ];
  
  const names = formatResults(resources, 'json', true);
  
  assert.equal(names, 'resource1\nresource2');
});

test('formatResults produces CSV', () => {
  const resources = [
    {
      name: 'test',
      path: 'path',
      description: 'desc',
      keywords: ['k1', 'k2'],
      version: '1.0',
      score: 4.0,
      updated: '2026-01-20'
    }
  ];
  
  const csv = formatResults(resources, 'csv', false);
  
  assert.ok(csv.includes('name,path,description'), 'Should have CSV header');
  assert.ok(csv.includes('"test"'), 'Should have resource data');
  assert.ok(csv.includes('"k1;k2"'), 'Should have semicolon-separated keywords');
});

console.log('✅ All tests passed');
