/**
 * Plan Manager Library
 * 
 * Manages PLAN.json with schema evolution, CRUD operations, and jq-style queries
 * Leverages shared modules from ailey-tools-data-converter skill
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

// Import shared modules from data-converter (these will be created as exports)
// For now, we'll implement core functionality here and refactor shared code later

export interface PlanDocument {
  $schema?: string;
  version: string;
  generatedAt: string;
  source: string;
  metadata: PlanMetadata;
  statusCounts: StatusCounts;
  items: PlanItem[];
}

export interface PlanMetadata {
  projectName?: string;
  projectCode?: string;
  currentSprint?: string;
  currentMilestone?: string;
  defaultAssignee?: string;
  defaultAgent?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface StatusCounts {
  BACKLOG: number;
  READY: number;
  'IN-PROGRESS': number;
  BLOCKED: number;
  REVIEW: number;
  DONE: number;
  SKIP: number;
}

export interface PlanItem {
  id: string;
  type: string;
  summary: string;
  description: string;
  status: string;
  priority: string;
  [key: string]: any;
}

export interface EvolutionResult {
  compatible: boolean;
  mode: 'forward' | 'backward' | 'full' | 'none';
  issues: string[];
  changes: SchemaChange[];
}

export interface SchemaChange {
  type: 'add' | 'remove' | 'modify';
  path: string;
  description: string;
  breaking: boolean;
}

export class PlanManager {
  private planPath: string;
  private schemaDir: string;
  private ajv: Ajv;
  private data: PlanDocument | null = null;

  constructor(planPath: string, schemaDir: string) {
    this.planPath = planPath;
    this.schemaDir = schemaDir;
    this.ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(this.ajv);
  }

  /**
   * Initialize empty PLAN.json from schema
   */
  async initialize(schemaVersion: string = 'v1'): Promise<void> {
    const schemaPath = join(this.schemaDir, `plan.${schemaVersion}.schema.json`);
    
    if (!existsSync(schemaPath)) {
      throw new Error(`Schema not found: ${schemaPath}`);
    }

    const emptyPlan: PlanDocument = {
      $schema: `../.github/aicc/schemas/plan.${schemaVersion}.schema.json`,
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      source: '.project/plan',
      metadata: {},
      statusCounts: {
        BACKLOG: 0,
        READY: 0,
        'IN-PROGRESS': 0,
        BLOCKED: 0,
        REVIEW: 0,
        DONE: 0,
        SKIP: 0
      },
      items: []
    };

    this.data = emptyPlan;
    this.save();
  }

  /**
   * Load PLAN.json
   */
  private load(): PlanDocument {
    if (this.data) return this.data;
    
    if (!existsSync(this.planPath)) {
      throw new Error(`PLAN.json not found at ${this.planPath}. Use 'create --init' to initialize.`);
    }

    const content = readFileSync(this.planPath, 'utf-8');
    this.data = JSON.parse(content);
    return this.data!;
  }

  /**
   * Save PLAN.json
   */
  private save(): void {
    writeFileSync(this.planPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  /**
   * Create item at path
   */
  async create(path: string, value: any): Promise<void> {
    const data = this.load();
    this.applyPath(data, path, value, 'create');
    this.save();
  }

  /**
   * Read all data
   */
  async readAll(): Promise<PlanDocument> {
    return this.load();
  }

  /**
   * Read data at path
   */
  async read(path: string): Promise<any> {
    const data = this.load();
    return this.resolvePath(data, path);
  }

  /**
   * Update item at path
   */
  async update(path: string, value: any, validate: boolean = true): Promise<void> {
    const data = this.load();
    this.applyPath(data, path, value, 'update');
    
    if (validate) {
      await this.validate();
    }
    
    this.save();
  }

  /**
   * Delete item at path
   */
  async delete(path: string, validate: boolean = true): Promise<void> {
    const data = this.load();
    this.applyPath(data, path, undefined, 'delete');
    
    if (validate) {
      await this.validate();
    }
    
    this.save();
  }

  /**
   * Find item by ID
   */
  async findById(id: string): Promise<PlanItem | null> {
    const data = this.load();
    return data.items.find(item => item.id === id) || null;
  }

  /**
   * Find items by name (partial match)
   */
  async findByName(name: string): Promise<PlanItem[]> {
    const data = this.load();
    const lowerName = name.toLowerCase();
    return data.items.filter(item => 
      item.summary?.toLowerCase().includes(lowerName) ||
      item.description?.toLowerCase().includes(lowerName)
    );
  }

  /**
   * Update item by ID
   */
  async updateById(id: string, updates: Partial<PlanItem>, validate: boolean = true): Promise<void> {
    const data = this.load();
    const index = data.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item not found: ${id}`);
    }

    data.items[index] = { ...data.items[index], ...updates };
    
    if (validate) {
      await this.validate();
    }
    
    this.save();
  }

  /**
   * Delete item by ID
   */
  async deleteById(id: string, validate: boolean = true): Promise<void> {
    const data = this.load();
    const index = data.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      throw new Error(`Item not found: ${id}`);
    }

    data.items.splice(index, 1);
    
    if (validate) {
      await this.validate();
    }
    
    this.save();
  }

  /**
   * Query with jq-style syntax (simplified implementation)
   */
  async query(expression: string): Promise<any> {
    const data = this.load();
    
    // Simple jq-style query parser
    // For full implementation, would use jq library or port
    // This is a basic implementation for common patterns
    
    // Handle .items[] pattern
    if (expression.startsWith('.items[]')) {
      const rest = expression.slice(8).trim();
      if (rest.startsWith('|')) {
        return this.applyFilter(data.items, rest.slice(1).trim());
      }
      return data.items;
    }

    // Handle direct property access
    if (expression.startsWith('.')) {
      return this.resolvePath(data, expression);
    }

    throw new Error(`Unsupported query expression: ${expression}`);
  }

  /**
   * Update items by query
   */
  async updateByQuery(query: string, setExpression: string, validate: boolean = true): Promise<number> {
    const items = await this.query(query);
    const itemsArray = Array.isArray(items) ? items : [items];
    
    // Parse set expression (simplified)
    const updates = this.parseSetExpression(setExpression);
    
    let count = 0;
    for (const item of itemsArray) {
      if (item.id) {
        await this.updateById(item.id, updates, false);
        count++;
      }
    }

    if (validate && count > 0) {
      await this.validate();
    }

    return count;
  }

  /**
   * Delete items by query
   */
  async deleteByQuery(query: string, validate: boolean = true): Promise<number> {
    const items = await this.query(query);
    const itemsArray = Array.isArray(items) ? items : [items];
    
    let count = 0;
    for (const item of itemsArray) {
      if (item.id) {
        await this.deleteById(item.id, false);
        count++;
      }
    }

    if (validate && count > 0) {
      await this.validate();
    }

    return count;
  }

  /**
   * Validate against schema
   */
  async validate(schemaVersion?: string): Promise<boolean> {
    const data = this.load();
    
    // Detect schema version from $schema property or parameter
    let version = schemaVersion;
    if (!version && data.$schema) {
      const match = data.$schema.match(/plan\.(v\d+)\.schema\.json/);
      version = match ? match[1] : 'v1';
    }
    version = version || 'v1';

    const schemaPath = join(this.schemaDir, `plan.${version}.schema.json`);
    
    if (!existsSync(schemaPath)) {
      throw new Error(`Schema not found: ${schemaPath}`);
    }

    const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
    const validate = this.ajv.compile(schema);
    const valid = validate(data);

    if (!valid) {
      console.error('Validation errors:', validate.errors);
      return false;
    }

    return true;
  }

  /**
   * Check schema compatibility
   */
  async checkCompatibility(fromVersion: string, toVersion: string, mode: string): Promise<EvolutionResult> {
    const fromSchema = JSON.parse(readFileSync(join(this.schemaDir, `plan.${fromVersion}.schema.json`), 'utf-8'));
    const toSchema = JSON.parse(readFileSync(join(this.schemaDir, `plan.${toVersion}.schema.json`), 'utf-8'));

    // Simplified compatibility check
    // Full implementation would do deep schema analysis
    const changes: SchemaChange[] = [];
    const issues: string[] = [];

    // Check for breaking changes based on mode
    // This is a placeholder - full implementation would analyze schemas deeply
    
    return {
      compatible: issues.length === 0,
      mode: mode as any,
      issues,
      changes
    };
  }

  /**
   * Generate evolution report
   */
  generateEvolutionReport(result: EvolutionResult): string {
    let report = `Schema Evolution Report\n${'='.repeat(50)}\n\n`;
    report += `Compatibility Mode: ${result.mode}\n`;
    report += `Compatible: ${result.compatible ? '✅ Yes' : '❌ No'}\n\n`;

    if (result.changes.length > 0) {
      report += `Changes:\n`;
      for (const change of result.changes) {
        const icon = change.breaking ? '⚠️' : '✓';
        report += `  ${icon} ${change.type.toUpperCase()}: ${change.path} - ${change.description}\n`;
      }
    }

    if (result.issues.length > 0) {
      report += `\nIssues:\n`;
      for (const issue of result.issues) {
        report += `  ❌ ${issue}\n`;
      }
    }

    return report;
  }

  /**
   * Migrate to new schema version
   */
  async migrate(fromVersion: string, toVersion: string, outputPath?: string, backup: boolean = true): Promise<void> {
    const data = this.load();

    // Create backup
    if (backup) {
      const backupPath = `${this.planPath}.${fromVersion}.backup`;
      copyFileSync(this.planPath, backupPath);
      console.log(`📦 Backup created: ${backupPath}`);
    }

    // Update schema reference
    data.$schema = `../.github/aicc/schemas/plan.${toVersion}.schema.json`;

    // Apply migrations (placeholder - would contain version-specific migrations)
    // Example: if migrating v1 -> v2, apply v2 migrations
    
    // Save
    const savePath = outputPath || this.planPath;
    writeFileSync(savePath, JSON.stringify(data, null, 2), 'utf-8');
    
    // Validate
    this.data = data;
    const valid = await this.validate(toVersion);
    if (!valid) {
      throw new Error('Migration failed validation');
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    const data = this.load();
    
    return {
      version: data.version,
      totalItems: data.items.length,
      statusCounts: data.statusCounts,
      lastUpdated: data.generatedAt,
      schemaVersion: data.$schema?.match(/plan\.(v\d+)\.schema\.json/)?.[1] || null
    };
  }

  /**
   * Format output
   */
  format(data: any, format: string, compact: boolean = false): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, compact ? 0 : 2);
      case 'yaml':
        // Simplified YAML output
        return JSON.stringify(data, null, 2); // Would use yaml library
      case 'table':
        return this.formatTable(data);
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Format as table
   */
  private formatTable(data: any): string {
    if (!Array.isArray(data)) {
      data = [data];
    }

    if (data.length === 0) return 'No results';

    const keys = Object.keys(data[0]);
    let table = keys.join('\t') + '\n';
    table += '─'.repeat(80) + '\n';
    
    for (const row of data) {
      table += keys.map(k => String(row[k] || '')).join('\t') + '\n';
    }

    return table;
  }

  /**
   * Apply filter to array
   */
  private applyFilter(items: any[], filter: string): any[] {
    // Simplified filter parser
    // select(.status == "BACKLOG")
    const selectMatch = filter.match(/select\(\.(\w+)\s*(==|!=|>|<|>=|<=)\s*"([^"]+)"\)/);
    
    if (selectMatch) {
      const [, field, op, value] = selectMatch;
      return items.filter(item => this.compareValues(item[field], op, value));
    }

    return items;
  }

  /**
   * Compare values based on operator
   */
  private compareValues(a: any, op: string, b: any): boolean {
    switch (op) {
      case '==': return a == b;
      case '!=': return a != b;
      case '>': return a > b;
      case '<': return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      default: return false;
    }
  }

  /**
   * Parse set expression
   */
  private parseSetExpression(expr: string): any {
    // Simplified: .field = value
    const parts = expr.split('=').map(s => s.trim());
    if (parts.length === 2) {
      const field = parts[0].replace(/^\./, '');
      let value: any = parts[1].replace(/^["']|["']$/g, '');
      
      // Try to parse as number
      if (!isNaN(Number(value))) {
        value = Number(value);
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      return { [field]: value };
    }

    throw new Error(`Invalid set expression: ${expr}`);
  }

  /**
   * Resolve path in object
   */
  private resolvePath(obj: any, path: string): any {
    const parts = path.split('.').filter(p => p);
    let current = obj;

    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      
      // Handle array index
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, prop, index] = arrayMatch;
        current = current[prop]?.[parseInt(index)];
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Apply path operation
   */
  private applyPath(obj: any, path: string, value: any, operation: 'create' | 'update' | 'delete'): void {
    const parts = path.split('.').filter(p => p);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (current[part] === undefined) {
        current[part] = {};
      }
      
      current = current[part];
    }

    const lastPart = parts[parts.length - 1];

    switch (operation) {
      case 'create':
      case 'update':
        current[lastPart] = value;
        break;
      case 'delete':
        delete current[lastPart];
        break;
    }
  }
}

// Export types for use by other modules
export type { SchemaValidator, SchemaEvolver, QueryExecutor, CRUDOperations };
