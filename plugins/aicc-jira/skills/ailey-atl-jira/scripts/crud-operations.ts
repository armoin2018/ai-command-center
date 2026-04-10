#!/usr/bin/env node
/**
 * CRUD operations for Jira issues
 * Create, Read, Update, Delete Jira issues via CLI
 */

import { Command } from 'commander';
import { getJiraClient } from './jira-client';
import type { JiraApi } from 'jira-client';

const program = new Command();

program
  .name('jira-crud')
  .description('CRUD operations for Jira issues')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new Jira issue')
  .requiredOption('-p, --project <key>', 'Project key')
  .requiredOption('-s, --summary <text>', 'Issue summary')
  .requiredOption('-t, --type <type>', 'Issue type (Story, Task, Bug, Epic)')
  .option('-d, --description <text>', 'Issue description')
  .option('--assignee <username>', 'Assignee username')
  .option('--priority <name>', 'Priority (Highest, High, Medium, Low, Lowest)')
  .option('--labels <labels>', 'Comma-separated labels')
  .option('--components <names>', 'Comma-separated component names')
  .action(async (options) => {
    try {
      const jira = await getJiraClient();
      
      const issue: any = {
        fields: {
          project: { key: options.project },
          summary: options.summary,
          issuetype: { name: options.type },
          description: options.description || ''
        }
      };

      if (options.assignee) {
        issue.fields.assignee = { name: options.assignee };
      }

      if (options.priority) {
        issue.fields.priority = { name: options.priority };
      }

      if (options.labels) {
        issue.fields.labels = options.labels.split(',').map((l: string) => l.trim());
      }

      if (options.components) {
        issue.fields.components = options.components
          .split(',')
          .map((c: string) => ({ name: c.trim() }));
      }

      const result = await jira.addNewIssue(issue);
      console.log(`✅ Created issue: ${result.key}`);
      console.log(`   URL: ${process.env.ATLASSIAN_URL}/browse/${result.key}`);
    } catch (error) {
      console.error('❌ Failed to create issue:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('get')
  .description('Get a Jira issue by key')
  .argument('<key>', 'Issue key (e.g., PROJ-123)')
  .option('-f, --fields <fields>', 'Comma-separated fields to retrieve', '*all')
  .action(async (key, options) => {
    try {
      const jira = await getJiraClient();
      const issue = await jira.findIssue(key, options.fields);
      
      console.log(`\n📋 ${issue.key}: ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Priority: ${issue.fields.priority?.name || 'None'}`);
      console.log(`   Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
      console.log(`   Reporter: ${issue.fields.reporter?.displayName}`);
      console.log(`   Created: ${new Date(issue.fields.created).toLocaleDateString()}`);
      console.log(`   Updated: ${new Date(issue.fields.updated).toLocaleDateString()}`);
      
      if (issue.fields.labels?.length > 0) {
        console.log(`   Labels: ${issue.fields.labels.join(', ')}`);
      }
      
      if (issue.fields.description) {
        console.log(`\n   Description:\n   ${issue.fields.description}\n`);
      }
    } catch (error) {
      console.error('❌ Failed to get issue:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('update')
  .description('Update a Jira issue')
  .argument('<key>', 'Issue key (e.g., PROJ-123)')
  .option('-s, --summary <text>', 'New summary')
  .option('-d, --description <text>', 'New description')
  .option('--assignee <username>', 'New assignee')
  .option('--priority <name>', 'New priority')
  .option('--status <name>', 'New status (requires transition)')
  .option('--labels <labels>', 'Comma-separated labels (replaces existing)')
  .action(async (key, options) => {
    try {
      const jira = await getJiraClient();
      const update: any = { fields: {} };

      if (options.summary) update.fields.summary = options.summary;
      if (options.description) update.fields.description = options.description;
      if (options.assignee) update.fields.assignee = { name: options.assignee };
      if (options.priority) update.fields.priority = { name: options.priority };
      if (options.labels) {
        update.fields.labels = options.labels.split(',').map((l: string) => l.trim());
      }

      await jira.updateIssue(key, update);
      console.log(`✅ Updated issue: ${key}`);

      // Handle status transition separately
      if (options.status) {
        const transitions = await jira.listTransitions(key);
        const transition = transitions.transitions.find(
          (t: any) => t.to.name.toLowerCase() === options.status.toLowerCase()
        );

        if (transition) {
          await jira.transitionIssue(key, { transition: { id: transition.id } });
          console.log(`   Transitioned to: ${options.status}`);
        } else {
          console.warn(`⚠️  Status '${options.status}' not available for this issue`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update issue:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('delete')
  .description('Delete a Jira issue')
  .argument('<key>', 'Issue key (e.g., PROJ-123)')
  .option('-f, --force', 'Skip confirmation')
  .action(async (key, options) => {
    try {
      if (!options.force) {
        console.log(`⚠️  This will permanently delete issue ${key}`);
        console.log('   Use --force to confirm deletion');
        process.exit(1);
      }

      const jira = await getJiraClient();
      await jira.deleteIssue(key);
      console.log(`✅ Deleted issue: ${key}`);
    } catch (error) {
      console.error('❌ Failed to delete issue:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search Jira issues with JQL')
  .argument('<jql>', 'JQL query (e.g., "project = PROJ AND status = Open")')
  .option('-l, --limit <number>', 'Maximum results', '50')
  .option('-f, --fields <fields>', 'Comma-separated fields', 'summary,status,assignee')
  .action(async (jql, options) => {
    try {
      const jira = await getJiraClient();
      const results = await jira.searchJira(jql, {
        maxResults: parseInt(options.limit),
        fields: options.fields.split(',')
      });

      console.log(`\n🔍 Found ${results.total} issue(s) (showing ${results.issues.length}):\n`);
      
      results.issues.forEach((issue: any) => {
        console.log(`   ${issue.key}: ${issue.fields.summary}`);
        console.log(`   Status: ${issue.fields.status.name}`);
        if (issue.fields.assignee) {
          console.log(`   Assignee: ${issue.fields.assignee.displayName}`);
        }
        console.log('');
      });
    } catch (error) {
      console.error('❌ Search failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
