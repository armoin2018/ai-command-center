#!/usr/bin/env node
/**
 * PLAN.json Management Tool
 * 
 * Provides CRUD operations, jq-style queries, and schema evolution for PLAN.json
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import shared modules from data-converter
import type { 
  SchemaValidator, 
  SchemaEvolver, 
  QueryExecutor, 
  CRUDOperations 
} from '../lib/plan-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

// Default paths
const DEFAULT_PLAN_PATH = join(process.cwd(), '.project/PLAN.json');
const DEFAULT_SCHEMA_DIR = join(process.cwd(), '.github/aicc/schemas');

program
  .name('manage-plan')
  .description('Manage PLAN.json with CRUD, queries, and schema evolution')
  .version('1.0.0');

// Create command
program
  .command('create')
  .description('Create a new PLAN.json or add items')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('-s, --schema <version>', 'Schema version (e.g., v1)', 'v1')
  .option('-p, --path <jq-path>', 'Path to create item')
  .option('-v, --value <json>', 'JSON value to create')
  .option('--init', 'Initialize empty PLAN.json from schema')
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    if (options.init) {
      await manager.initialize(options.schema);
      console.log(`✅ Initialized ${options.file} with schema ${options.schema}`);
    } else if (options.path && options.value) {
      const value = JSON.parse(options.value);
      await manager.create(options.path, value);
      console.log(`✅ Created item at ${options.path}`);
    } else {
      console.error('❌ Specify --init or both --path and --value');
      process.exit(1);
    }
  });

// Read command
program
  .command('read')
  .description('Read items from PLAN.json')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('-p, --path <jq-path>', 'Path to read')
  .option('-q, --query <jq>', 'jq-style query')
  .option('-i, --id <id>', 'Search by ID')
  .option('-n, --name <name>', 'Search by name (partial match)')
  .option('-o, --output <format>', 'Output format (json, yaml, table)', 'json')
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    let result;
    if (options.id) {
      result = await manager.findById(options.id);
    } else if (options.name) {
      result = await manager.findByName(options.name);
    } else if (options.query) {
      result = await manager.query(options.query);
    } else if (options.path) {
      result = await manager.read(options.path);
    } else {
      result = await manager.readAll();
    }
    
    console.log(manager.format(result, options.output));
  });

// Update command
program
  .command('update')
  .description('Update items in PLAN.json')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('-p, --path <jq-path>', 'Path to update')
  .option('-v, --value <json>', 'New value (JSON)')
  .option('-q, --query <jq>', 'Query to select items')
  .option('--set <jq>', 'Set expression (jq)')
  .option('-i, --id <id>', 'Update by ID')
  .option('--validate', 'Validate after update', true)
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    if (options.id) {
      const value = JSON.parse(options.value);
      await manager.updateById(options.id, value, options.validate);
      console.log(`✅ Updated item ${options.id}`);
    } else if (options.query && options.set) {
      const count = await manager.updateByQuery(options.query, options.set, options.validate);
      console.log(`✅ Updated ${count} item(s)`);
    } else if (options.path && options.value) {
      const value = JSON.parse(options.value);
      await manager.update(options.path, value, options.validate);
      console.log(`✅ Updated ${options.path}`);
    } else {
      console.error('❌ Specify --id and --value, or --query and --set, or --path and --value');
      process.exit(1);
    }
  });

// Delete command
program
  .command('delete')
  .description('Delete items from PLAN.json')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('-p, --path <jq-path>', 'Path to delete')
  .option('-q, --query <jq>', 'Query to select items for deletion')
  .option('-i, --id <id>', 'Delete by ID')
  .option('--validate', 'Validate after deletion', true)
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    if (options.id) {
      await manager.deleteById(options.id, options.validate);
      console.log(`✅ Deleted item ${options.id}`);
    } else if (options.query) {
      const count = await manager.deleteByQuery(options.query, options.validate);
      console.log(`✅ Deleted ${count} item(s)`);
    } else if (options.path) {
      await manager.delete(options.path, options.validate);
      console.log(`✅ Deleted ${options.path}`);
    } else {
      console.error('❌ Specify --id, --query, or --path');
      process.exit(1);
    }
  });

// Query command
program
  .command('query')
  .description('Query PLAN.json with jq-style syntax')
  .argument('<expression>', 'jq-style query expression')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('-o, --output <format>', 'Output format (json, yaml, table)', 'json')
  .option('--compact', 'Compact output')
  .action(async (expression, options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    const result = await manager.query(expression);
    console.log(manager.format(result, options.output, options.compact));
  });

// Schema commands
const schema = program.command('schema').description('Schema management operations');

schema
  .command('validate')
  .description('Validate PLAN.json against schema')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('-s, --schema <version>', 'Schema version', 'v1')
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    const isValid = await manager.validate(options.schema);
    if (isValid) {
      console.log(`✅ PLAN.json is valid against schema ${options.schema}`);
    } else {
      console.error(`❌ PLAN.json validation failed`);
      process.exit(1);
    }
  });

schema
  .command('evolve')
  .description('Check schema evolution and compatibility')
  .option('--from <version>', 'Old schema version (e.g., v1)')
  .option('--to <version>', 'New schema version (e.g., v2)')
  .option('-c, --check <mode>', 'Compatibility mode (forward, backward, full, none)', 'backward')
  .option('--report', 'Generate evolution report')
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(DEFAULT_PLAN_PATH, DEFAULT_SCHEMA_DIR);
    
    const result = await manager.checkCompatibility(options.from, options.to, options.check);
    
    if (options.report) {
      console.log(manager.generateEvolutionReport(result));
    } else {
      if (result.compatible) {
        console.log(`✅ Schemas are ${options.check} compatible`);
      } else {
        console.error(`❌ Schemas are NOT ${options.check} compatible`);
        console.error('Issues:', result.issues);
        process.exit(1);
      }
    }
  });

schema
  .command('migrate')
  .description('Migrate PLAN.json to new schema version')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .option('--from <version>', 'Current schema version')
  .option('--to <version>', 'Target schema version')
  .option('-o, --output <path>', 'Output file (defaults to same file)')
  .option('--backup', 'Create backup before migration', true)
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    await manager.migrate(options.from, options.to, options.output, options.backup);
    console.log(`✅ Migrated from ${options.from} to ${options.to}`);
  });

// Stats command
program
  .command('stats')
  .description('Show statistics about PLAN.json')
  .option('-f, --file <path>', 'PLAN.json path', DEFAULT_PLAN_PATH)
  .action(async (options) => {
    const { PlanManager } = await import('../lib/plan-manager.js');
    const manager = new PlanManager(options.file, DEFAULT_SCHEMA_DIR);
    
    const stats = await manager.getStats();
    console.log('📊 PLAN.json Statistics');
    console.log('━'.repeat(50));
    console.log(`Version: ${stats.version}`);
    console.log(`Total Items: ${stats.totalItems}`);
    console.log(`Status Counts:`);
    for (const [status, count] of Object.entries(stats.statusCounts)) {
      console.log(`  ${status}: ${count}`);
    }
    console.log(`Last Updated: ${stats.lastUpdated}`);
    console.log(`Schema Version: ${stats.schemaVersion || 'Unknown'}`);
  });

// Parse and execute
program.parse(process.argv);

export { program };
