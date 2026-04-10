import axios, { AxiosInstance } from 'axios';
import { getKafkaConnectConfig } from './config.js';
import { readFileSync } from 'fs';
import chalk from 'chalk';

export async function kafkaConnect(action: string, name: string, options: any): Promise<void> {
  const config = getKafkaConnectConfig();
  
  if (!config) {
    throw new Error('Kafka Connect not configured. Set KAFKA_CONNECT_URL in .env file');
  }

  const client = createKafkaConnectClient(config);

  switch (action) {
    case 'list':
      await listConnectors(client);
      break;

    case 'create':
      await createConnector(client, options);
      break;

    case 'status':
      await getConnectorStatus(client, name);
      break;

    case 'update':
      await updateConnector(client, name, options);
      break;

    case 'restart':
      await restartConnector(client, name);
      break;

    case 'pause':
      await pauseConnector(client, name);
      break;

    case 'resume':
      await resumeConnector(client, name);
      break;

    case 'delete':
      await deleteConnector(client, name);
      break;

    case 'plugins':
      await listPlugins(client);
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function createKafkaConnectClient(config: any): AxiosInstance {
  const headers: any = { 'Content-Type': 'application/json' };
  
  if (config.auth) {
    const authString = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64');
    headers.Authorization = `Basic ${authString}`;
  }

  return axios.create({
    baseURL: config.url,
    headers,
  });
}

async function listConnectors(client: AxiosInstance): Promise<void> {
  const response = await client.get('/connectors');
  const connectors = response.data;

  console.log(chalk.blue(`Found ${connectors.length} connectors:\n`));
  
  for (const connector of connectors) {
    const status = await client.get(`/connectors/${connector}/status`);
    const state = status.data.connector.state;
    const stateColor = state === 'RUNNING' ? chalk.green : chalk.red;
    
    console.log(`${chalk.bold(connector)}: ${stateColor(state)}`);
  }
}

async function createConnector(client: AxiosInstance, options: any): Promise<void> {
  if (!options.config) {
    throw new Error('--config is required (path to connector config JSON)');
  }

  let configPath = options.config;
  if (configPath.startsWith('@')) {
    configPath = configPath.substring(1);
  }

  const configContent = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  const response = await client.post('/connectors', config);
  
  console.log(chalk.green(`✓ Created connector ${response.data.name}`));
  console.log(`  Type: ${response.data.config['connector.class']}`);
  console.log(`  Tasks: ${response.data.tasks.length}`);
}

async function getConnectorStatus(client: AxiosInstance, name: string): Promise<void> {
  const response = await client.get(`/connectors/${name}/status`);
  const status = response.data;

  console.log(chalk.blue(`\nConnector: ${chalk.bold(name)}\n`));
  console.log(`State: ${status.connector.state === 'RUNNING' ? chalk.green(status.connector.state) : chalk.red(status.connector.state)}`);
  console.log(`Worker: ${status.connector.worker_id}`);
  console.log(`\nTasks: ${status.tasks.length}`);

  status.tasks.forEach((task: any, index: number) => {
    const taskState = task.state === 'RUNNING' ? chalk.green(task.state) : chalk.red(task.state);
    console.log(`  Task ${index}: ${taskState} on ${task.worker_id}`);
  });
}

async function updateConnector(client: AxiosInstance, name: string, options: any): Promise<void> {
  if (!options.config) {
    throw new Error('--config is required (path to updated connector config JSON)');
  }

  let configPath = options.config;
  if (configPath.startsWith('@')) {
    configPath = configPath.substring(1);
  }

  const configContent = readFileSync(configPath, 'utf-8');
  const config = JSON.parse(configContent);

  await client.put(`/connectors/${name}/config`, config.config || config);
  
  console.log(chalk.green(`✓ Updated connector ${name}`));
}

async function restartConnector(client: AxiosInstance, name: string): Promise<void> {
  await client.post(`/connectors/${name}/restart`);
  console.log(chalk.green(`✓ Restarted connector ${name}`));
}

async function pauseConnector(client: AxiosInstance, name: string): Promise<void> {
  await client.put(`/connectors/${name}/pause`);
  console.log(chalk.green(`✓ Paused connector ${name}`));
}

async function resumeConnector(client: AxiosInstance, name: string): Promise<void> {
  await client.put(`/connectors/${name}/resume`);
  console.log(chalk.green(`✓ Resumed connector ${name}`));
}

async function deleteConnector(client: AxiosInstance, name: string): Promise<void> {
  await client.delete(`/connectors/${name}`);
  console.log(chalk.green(`✓ Deleted connector ${name}`));
}

async function listPlugins(client: AxiosInstance): Promise<void> {
  const response = await client.get('/connector-plugins');
  const plugins = response.data;

  console.log(chalk.blue(`\nAvailable Connector Plugins:\n`));
  
  plugins.forEach((plugin: any) => {
    console.log(`${chalk.green(plugin.class)}`);
    console.log(`  Type: ${plugin.type}`);
    console.log(`  Version: ${plugin.version}`);
    console.log();
  });
}
