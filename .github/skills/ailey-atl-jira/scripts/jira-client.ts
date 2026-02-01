/**
 * Jira API client with authentication and configuration
 */

import JiraApi from 'jira-client';
import { config } from 'dotenv';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

// Load environment variables from multiple possible locations
async function loadEnv(): Promise<void> {
  const envPaths = [
    path.join(os.homedir(), '.vscode', '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), '.env.local')
  ];

  for (const envPath of envPaths) {
    try {
      await fs.access(envPath);
      config({ path: envPath });
      console.log(`📄 Loaded environment from: ${envPath}`);
      break;
    } catch {
      // File doesn't exist, try next
    }
  }
}

export interface JiraConfig {
  host: string;
  username: string;
  password?: string;
  apiToken?: string;
  protocol: 'https' | 'http';
  apiVersion: string;
  strictSSL: boolean;
}

export async function getJiraClient(): Promise<JiraApi> {
  await loadEnv();

  const host = process.env.ATLASSIAN_URL;
  const username = process.env.ATLASSIAN_USER;
  const password = process.env.ATLASSIAN_PASSWORD;
  const apiToken = process.env.ATLASSIAN_APIKEY;

  if (!host || !username) {
    throw new Error(
      'Missing required environment variables. Set ATLASSIAN_URL and ATLASSIAN_USER in .env file'
    );
  }

  if (!password && !apiToken) {
    throw new Error(
      'Missing authentication. Set either ATLASSIAN_PASSWORD or ATLASSIAN_APIKEY in .env file'
    );
  }

  // Extract hostname from URL
  const hostname = host.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const jiraConfig: JiraApi.JiraApiOptions = {
    protocol: host.startsWith('https') ? 'https' : 'http',
    host: hostname,
    username: username,
    password: apiToken || password,
    apiVersion: '2',
    strictSSL: true
  };

  return new JiraApi(jiraConfig);
}

export async function testConnection(): Promise<boolean> {
  try {
    const jira = await getJiraClient();
    const serverInfo = await jira.getServerInfo();
    console.log(`✅ Connected to Jira: ${serverInfo.serverTitle}`);
    console.log(`   Version: ${serverInfo.version}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Jira:', (error as Error).message);
    return false;
  }
}

export { JiraApi };
