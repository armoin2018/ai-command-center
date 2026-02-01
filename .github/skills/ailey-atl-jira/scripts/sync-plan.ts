#!/usr/bin/env node
/**
 * Bidirectional sync between Jira and .project/PLAN.json
 */

import { Command } from 'commander';
import { getJiraClient } from './jira-client';
import * as fs from 'fs/promises';
import * as path from 'path';

const program = new Command();

program
  .name('sync-plan')
  .description('Synchronize Jira issues with .project/PLAN.json')
  .version('1.0.0');

interface PlanItem {
  id: string;
  name: string;
  type: 'epic' | 'story' | 'task';
  status: string;
  priority?: string;
  assignee?: string;
  description?: string;
  jiraKey?: string;
  labels?: string[];
  acceptanceCriteria?: string[];
  dependencies?: string[];
}

interface Plan {
  version: string;
  epics: PlanItem[];
  stories: PlanItem[];
  tasks: PlanItem[];
}

program
  .command('pull')
  .description('Pull Jira issues into PLAN.json')
  .requiredOption('-j, --jql <query>', 'JQL query for issues to pull')
  .option('-p, --plan <file>', 'Path to PLAN.json', '.project/PLAN.json')
  .option('--merge', 'Merge with existing plan (default: replace)')
  .action(async (options) => {
    try {
      const jira = await getJiraClient();
      const planPath = path.resolve(options.plan);

      console.log(`📥 Pulling issues from Jira...`);
      const results = await jira.searchJira(options.jql, {
        maxResults: 1000,
        fields: ['summary', 'issuetype', 'status', 'priority', 'assignee', 
                'description', 'labels', 'parent']
      });

      console.log(`   Found ${results.total} issue(s)\n`);

      // Load existing plan if merging
      let existingPlan: Plan | null = null;
      if (options.merge) {
        try {
          const content = await fs.readFile(planPath, 'utf-8');
          existingPlan = JSON.parse(content);
        } catch {
          console.log('   No existing plan found, creating new');
        }
      }

      const plan: Plan = existingPlan || {
        version: '1.0',
        epics: [],
        stories: [],
        tasks: []
      };

      // Group issues by type
      for (const issue of results.issues) {
        const item: PlanItem = {
          id: issue.key.replace(/-/g, '_').toLowerCase(),
          name: issue.fields.summary,
          type: mapIssueTypeToType(issue.fields.issuetype.name),
          status: mapJiraStatusToStatus(issue.fields.status.name),
          jiraKey: issue.key,
          description: issue.fields.description || '',
          assignee: issue.fields.assignee?.name,
          priority: issue.fields.priority?.name?.toLowerCase(),
          labels: issue.fields.labels || []
        };

        // Skip if already exists in plan (when merging)
        const existingItem = findItemByJiraKey(plan, issue.key);
        if (options.merge && existingItem) {
          console.log(`   Updating: ${issue.key} - ${issue.fields.summary}`);
          Object.assign(existingItem, item);
        } else {
          console.log(`   Adding: ${issue.key} - ${issue.fields.summary}`);
          if (item.type === 'epic') plan.epics.push(item);
          else if (item.type === 'story') plan.stories.push(item);
          else plan.tasks.push(item);
        }
      }

      // Write plan file
      await fs.mkdir(path.dirname(planPath), { recursive: true });
      await fs.writeFile(planPath, JSON.stringify(plan, null, 2));

      console.log(`\n✅ Synced ${results.issues.length} issue(s) to: ${planPath}`);
      console.log(`   Epics: ${plan.epics.length}`);
      console.log(`   Stories: ${plan.stories.length}`);
      console.log(`   Tasks: ${plan.tasks.length}`);
    } catch (error) {
      console.error('❌ Pull failed:', (error as Error).message);
      process.exit(1);
    }
  });

program
  .command('push')
  .description('Push PLAN.json items to Jira')
  .option('-p, --plan <file>', 'Path to PLAN.json', '.project/PLAN.json')
  .requiredOption('--project <key>', 'Jira project key')
  .option('--dry-run', 'Preview changes without updating Jira')
  .option('--create-missing', 'Create Jira issues for items without jiraKey')
  .action(async (options) => {
    try {
      const jira = await getJiraClient();
      const planPath = path.resolve(options.plan);

      console.log(`📤 Pushing changes to Jira from: ${planPath}\n`);

      const content = await fs.readFile(planPath, 'utf-8');
      const plan: Plan = JSON.parse(content);

      const allItems = [...plan.epics, ...plan.stories, ...plan.tasks];
      let updatedCount = 0;
      let createdCount = 0;

      for (const item of allItems) {
        if (item.jiraKey) {
          // Update existing issue
          const update: any = {
            fields: {
              summary: item.name,
              description: item.description || ''
            }
          };

          if (item.priority) update.fields.priority = { name: capitalize(item.priority) };
          if (item.assignee) update.fields.assignee = { name: item.assignee };
          if (item.labels) update.fields.labels = item.labels;

          if (options.dryRun) {
            console.log(`[DRY RUN] Would update: ${item.jiraKey} - ${item.name}`);
          } else {
            await jira.updateIssue(item.jiraKey, update);
            console.log(`✅ Updated: ${item.jiraKey} - ${item.name}`);
            updatedCount++;
          }
        } else if (options.createMissing) {
          // Create new issue
          const issue: any = {
            fields: {
              project: { key: options.project },
              summary: item.name,
              issuetype: { name: mapTypeToIssueType(item.type) },
              description: item.description || ''
            }
          };

          if (item.priority) issue.fields.priority = { name: capitalize(item.priority) };
          if (item.assignee) issue.fields.assignee = { name: item.assignee };
          if (item.labels) issue.fields.labels = item.labels;

          if (options.dryRun) {
            console.log(`[DRY RUN] Would create: ${item.name}`);
          } else {
            const result = await jira.addNewIssue(issue);
            item.jiraKey = result.key;
            console.log(`✅ Created: ${result.key} - ${item.name}`);
            createdCount++;
          }
        }
      }

      // Save updated plan with new Jira keys
      if (!options.dryRun && createdCount > 0) {
        await fs.writeFile(planPath, JSON.stringify(plan, null, 2));
        console.log(`\n   Updated ${planPath} with new Jira keys`);
      }

      console.log(`\n📊 Push Summary:`);
      console.log(`   Updated: ${updatedCount}`);
      console.log(`   Created: ${createdCount}`);
    } catch (error) {
      console.error('❌ Push failed:', (error as Error).message);
      process.exit(1);
    }
  });

// Helper functions
function mapIssueTypeToType(issueType: string): 'epic' | 'story' | 'task' {
  const lower = issueType.toLowerCase();
  if (lower.includes('epic')) return 'epic';
  if (lower.includes('story')) return 'story';
  return 'task';
}

function mapTypeToIssueType(type: string): string {
  if (type === 'epic') return 'Epic';
  if (type === 'story') return 'Story';
  return 'Task';
}

function mapJiraStatusToStatus(jiraStatus: string): string {
  const lower = jiraStatus.toLowerCase();
  if (lower.includes('done') || lower.includes('closed')) return 'done';
  if (lower.includes('progress') || lower.includes('develop')) return 'in-progress';
  return 'not-started';
}

function findItemByJiraKey(plan: Plan, jiraKey: string): PlanItem | null {
  const allItems = [...plan.epics, ...plan.stories, ...plan.tasks];
  return allItems.find(item => item.jiraKey === jiraKey) || null;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run if executed directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export { program };
