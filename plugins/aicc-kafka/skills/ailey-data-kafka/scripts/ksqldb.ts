import axios, { AxiosInstance } from 'axios';
import { getKsqlDBConfig } from './config.js';
import chalk from 'chalk';

export async function ksqlDB(action: string, statement: string, options: any): Promise<void> {
  const config = getKsqlDBConfig();
  
  if (!config) {
    throw new Error('ksqlDB not configured. Set KSQLDB_URL in .env file');
  }

  const client = createKsqlDBClient(config);

  switch (action) {
    case 'query':
      await executeQuery(client, statement);
      break;

    case 'execute':
      await executeStatement(client, statement);
      break;

    case 'list':
      await listResources(client, options);
      break;

    case 'describe':
      await describeResource(client, statement);
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function createKsqlDBClient(config: any): AxiosInstance {
  const headers: any = { 'Content-Type': 'application/vnd.ksql.v1+json' };
  
  if (config.auth) {
    const authString = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64');
    headers.Authorization = `Basic ${authString}`;
  }

  return axios.create({
    baseURL: config.url,
    headers,
  });
}

async function executeQuery(client: AxiosInstance, sql: string): Promise<void> {
  const payload = {
    ksql: sql,
    streamsProperties: {},
  };

  const response = await client.post('/query', payload, {
    responseType: 'stream',
  });

  console.log(chalk.blue('Query Results:\n'));

  let buffer = '';
  response.data.on('data', (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    lines.forEach(line => {
      if (line.trim()) {
        try {
          const data = JSON.parse(line);
          if (data.row) {
            console.log(JSON.stringify(data.row.columns, null, 2));
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    });
  });

  response.data.on('end', () => {
    console.log(chalk.green('\n✓ Query completed'));
  });
}

async function executeStatement(client: AxiosInstance, sql: string): Promise<void> {
  const payload = {
    ksql: sql,
    streamsProperties: {},
  };

  const response = await client.post('/ksql', payload);
  
  console.log(chalk.green('✓ Statement executed successfully'));
  
  if (response.data && response.data.length > 0) {
    console.log(JSON.stringify(response.data, null, 2));
  }
}

async function listResources(client: AxiosInstance, options: any): Promise<void> {
  const type = options.type || 'streams';
  const sql = type === 'streams' ? 'SHOW STREAMS;' : 'SHOW TABLES;';

  const payload = {
    ksql: sql,
    streamsProperties: {},
  };

  const response = await client.post('/ksql', payload);
  const results = response.data[0];

  if (!results || !results.streams && !results.tables) {
    console.log(chalk.yellow(`No ${type} found`));
    return;
  }

  const items = results.streams || results.tables;
  
  console.log(chalk.blue(`\n${type.charAt(0).toUpperCase() + type.slice(1)}:\n`));
  
  items.forEach((item: any) => {
    console.log(`${chalk.green(item.name)}`);
    console.log(`  Topic: ${item.topic}`);
    console.log(`  Format: ${item.format}`);
    console.log();
  });
}

async function describeResource(client: AxiosInstance, name: string): Promise<void> {
  const sql = `DESCRIBE ${name};`;

  const payload = {
    ksql: sql,
    streamsProperties: {},
  };

  const response = await client.post('/ksql', payload);
  
  console.log(chalk.blue(`\nDescription of ${name}:\n`));
  console.log(JSON.stringify(response.data, null, 2));
}
