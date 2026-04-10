#!/usr/bin/env node
/**
 * Bulk export Jira issues to CSV or JSON
 */

import { Command } from 'commander';
import { getJiraClient } from './jira-client';
import { stringify } from 'csv-stringify/sync';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('bulk-export')
  .description('Export Jira issues to CSV or JSON')
  .version('1.0.0');

program
  .requiredOption('-j, --jql <query>', 'JQL query for issues to export')
  .requiredOption('-o, --output <file>', 'Output file path')
  .option('-f, --format <format>', 'Output format (csv, json)', 'csv')
  .option('-l, --limit <number>', 'Maximum results', '1000')
  .option('--fields <fields>', 'Comma-separated fields to export', 
    'key,summary,type,status,priority,assignee,reporter,created,updated,labels,description')
  .action(async (options) => {
    try {
      const jira = await getJiraClient();
      
      console.log(`🔍 Searching Jira with: ${options.jql}`);
      
      const fieldList = options.fields.split(',');
      const results = await jira.searchJira(options.jql, {
        maxResults: parseInt(options.limit),
        fields: fieldList
      });

      console.log(`   Found ${results.total} issue(s) (exporting ${results.issues.length})\n`);

      // Transform issues for export
      const exportData = results.issues.map((issue: any) => {
        const data: any = {
          key: issue.key
        };

        if (fieldList.includes('summary')) data.summary = issue.fields.summary;
        if (fieldList.includes('type')) data.type = issue.fields.issuetype.name;
        if (fieldList.includes('status')) data.status = issue.fields.status.name;
        if (fieldList.includes('priority')) data.priority = issue.fields.priority?.name || '';
        if (fieldList.includes('assignee')) {
          data.assignee = issue.fields.assignee?.name || '';
        }
        if (fieldList.includes('reporter')) {
          data.reporter = issue.fields.reporter?.name || '';
        }
        if (fieldList.includes('created')) {
          data.created = new Date(issue.fields.created).toISOString();
        }
        if (fieldList.includes('updated')) {
          data.updated = new Date(issue.fields.updated).toISOString();
        }
        if (fieldList.includes('labels')) {
          data.labels = issue.fields.labels?.join(';') || '';
        }
        if (fieldList.includes('description')) {
          data.description = issue.fields.description || '';
        }

        return data;
      });

      // Write to file
      const outputPath = path.resolve(options.output);
      
      if (options.format === 'json') {
        await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));
      } else {
        const csv = stringify(exportData, {
          header: true,
          quoted: true
        });
        await fs.writeFile(outputPath, csv);
      }

      console.log(`✅ Exported ${exportData.length} issue(s) to: ${outputPath}`);
      console.log(`   Format: ${options.format.toUpperCase()}`);
    } catch (error) {
      console.error('❌ Export failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
