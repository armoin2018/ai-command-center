#!/usr/bin/env node
/**
 * Bulk import Jira issues from CSV
 */

import { Command } from 'commander';
import { getJiraClient } from './jira-client';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs/promises';

const program = new Command();

program
  .name('bulk-import')
  .description('Import Jira issues from CSV file')
  .version('1.0.0');

program
  .argument('<file>', 'CSV file path')
  .option('-p, --project <key>', 'Default project key (can be overridden in CSV)')
  .option('--dry-run', 'Preview import without creating issues')
  .option('--skip-errors', 'Continue on errors instead of stopping')
  .action(async (file: string, options) => {
    try {
      const jira = await getJiraClient();
      const csvContent = await fs.readFile(file, 'utf-8');
      
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });

      console.log(`📥 Importing ${records.length} issue(s) from ${file}\n`);

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        try {
          const issue: any = {
            fields: {
              project: { key: record.project || options.project },
              summary: record.summary,
              issuetype: { name: record.type || 'Task' },
              description: record.description || ''
            }
          };

          // Optional fields
          if (record.assignee) issue.fields.assignee = { name: record.assignee };
          if (record.priority) issue.fields.priority = { name: record.priority };
          if (record.labels) {
            issue.fields.labels = record.labels.split(';').map((l: string) => l.trim());
          }
          if (record.components) {
            issue.fields.components = record.components
              .split(';')
              .map((c: string) => ({ name: c.trim() }));
          }

          if (options.dryRun) {
            console.log(`[DRY RUN] Would create: ${record.summary}`);
            successCount++;
          } else {
            const result = await jira.addNewIssue(issue);
            console.log(`✅ Created: ${result.key} - ${record.summary}`);
            successCount++;
          }
        } catch (error) {
          errorCount++;
          const errMsg = `Row ${i + 1}: ${(error as Error).message}`;
          errors.push(errMsg);
          console.error(`❌ ${errMsg}`);
          
          if (!options.skipErrors) {
            throw error;
          }
        }
      }

      console.log(`\n📊 Import Summary:`);
      console.log(`   Total: ${records.length}`);
      console.log(`   Success: ${successCount}`);
      console.log(`   Errors: ${errorCount}`);

      if (errors.length > 0) {
        console.log(`\n   Error Details:`);
        errors.forEach(err => console.log(`   - ${err}`));
      }
    } catch (error) {
      console.error('❌ Import failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
