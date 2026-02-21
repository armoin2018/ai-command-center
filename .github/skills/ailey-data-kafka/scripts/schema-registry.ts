import axios, { AxiosInstance } from 'axios';
import { getSchemaRegistryConfig } from './config.js';
import { readFileSync } from 'fs';
import chalk from 'chalk';

export async function schemaRegistry(action: string, subject: string, options: any): Promise<void> {
  const config = getSchemaRegistryConfig();
  
  if (!config) {
    throw new Error('Schema Registry not configured. Set SCHEMA_REGISTRY_URL in .env file');
  }

  const client = createSchemaRegistryClient(config);

  switch (action) {
    case 'register':
      await registerSchema(client, subject, options);
      break;

    case 'list':
      await listSubjects(client);
      break;

    case 'get':
      await getSchema(client, subject, options);
      break;

    case 'check':
      await checkCompatibility(client, subject, options);
      break;

    case 'compatibility':
      await updateCompatibility(client, subject, options);
      break;

    case 'delete':
      await deleteSchema(client, subject, options);
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

function createSchemaRegistryClient(config: any): AxiosInstance {
  const headers: any = { 'Content-Type': 'application/vnd.schemaregistry.v1+json' };
  
  if (config.auth) {
    const authString = Buffer.from(`${config.auth.username}:${config.auth.password}`).toString('base64');
    headers.Authorization = `Basic ${authString}`;
  }

  return axios.create({
    baseURL: config.url,
    headers,
  });
}

async function registerSchema(client: AxiosInstance, subject: string, options: any): Promise<void> {
  if (!options.schema) {
    throw new Error('--schema is required');
  }

  let schemaContent: string;
  
  // Load schema from file if path starts with @
  if (options.schema.startsWith('@')) {
    const filePath = options.schema.substring(1);
    schemaContent = readFileSync(filePath, 'utf-8');
  } else {
    schemaContent = options.schema;
  }

  const schemaType = options.type || 'AVRO';
  
  const payload: any = {
    schema: schemaContent,
    schemaType,
  };

  const response = await client.post(`/subjects/${subject}/versions`, payload);
  
  console.log(chalk.green(`✓ Registered schema for subject ${subject}`));
  console.log(`  Schema ID: ${response.data.id}`);
  console.log(`  Version: ${response.data.version}`);
}

async function listSubjects(client: AxiosInstance): Promise<void> {
  const response = await client.get('/subjects');
  const subjects = response.data;

  console.log(chalk.blue(`Found ${subjects.length} subjects:\n`));
  
  for (const subject of subjects) {
    const versions = await client.get(`/subjects/${subject}/versions`);
    console.log(`${chalk.green(subject)} (${versions.data.length} versions)`);
  }
}

async function getSchema(client: AxiosInstance, subject: string, options: any): Promise<void> {
  const version = options.version || 'latest';
  const response = await client.get(`/subjects/${subject}/versions/${version}`);
  
  console.log(chalk.blue(`\nSchema for ${subject} (version ${response.data.version}):\n`));
  console.log(`ID: ${response.data.id}`);
  console.log(`Type: ${response.data.schemaType || 'AVRO'}`);
  console.log(`\nSchema:`);
  console.log(JSON.stringify(JSON.parse(response.data.schema), null, 2));
}

async function checkCompatibility(client: AxiosInstance, subject: string, options: any): Promise<void> {
  if (!options.schema) {
    throw new Error('--schema is required');
  }

  let schemaContent: string;
  
  if (options.schema.startsWith('@')) {
    const filePath = options.schema.substring(1);
    schemaContent = readFileSync(filePath, 'utf-8');
  } else {
    schemaContent = options.schema;
  }

  const payload = {
    schema: schemaContent,
  };

  const response = await client.post(`/compatibility/subjects/${subject}/versions/latest`, payload);
  
  if (response.data.is_compatible) {
    console.log(chalk.green(`✓ Schema is compatible with subject ${subject}`));
  } else {
    console.log(chalk.red(`✗ Schema is NOT compatible with subject ${subject}`));
  }
}

async function updateCompatibility(client: AxiosInstance, subject: string, options: any): Promise<void> {
  if (!options.level) {
    throw new Error('--level is required (BACKWARD, BACKWARD_TRANSITIVE, FORWARD, FORWARD_TRANSITIVE, FULL, FULL_TRANSITIVE, NONE)');
  }

  const payload = {
    compatibility: options.level,
  };

  await client.put(`/config/${subject}`, payload);
  
  console.log(chalk.green(`✓ Updated compatibility level for ${subject} to ${options.level}`));
}

async function deleteSchema(client: AxiosInstance, subject: string, options: any): Promise<void> {
  if (options.permanent) {
    // Hard delete
    await client.delete(`/subjects/${subject}?permanent=true`);
    console.log(chalk.green(`✓ Permanently deleted all versions of ${subject}`));
  } else if (options.version) {
    // Soft delete specific version
    await client.delete(`/subjects/${subject}/versions/${options.version}`);
    console.log(chalk.green(`✓ Soft deleted version ${options.version} of ${subject}`));
  } else {
    // Soft delete all versions
    await client.delete(`/subjects/${subject}`);
    console.log(chalk.green(`✓ Soft deleted all versions of ${subject}`));
  }
}
