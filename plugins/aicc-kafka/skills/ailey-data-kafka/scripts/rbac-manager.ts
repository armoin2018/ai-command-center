import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';

export async function rbacManager(action: string, options: any): Promise<void> {
  const mdsUrl = process.env.KAFKA_MDS_URL;
  const token = process.env.KAFKA_MDS_TOKEN;

  if (!mdsUrl || !token) {
    throw new Error('RBAC requires KAFKA_MDS_URL and KAFKA_MDS_TOKEN in .env file (Confluent Platform/Cloud only)');
  }

  const client = axios.create({
    baseURL: mdsUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  switch (action) {
    case 'create':
      await createRoleBinding(client, options);
      break;

    case 'list':
      await listRoleBindings(client, options);
      break;

    case 'delete':
      await deleteRoleBinding(client, options);
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function createRoleBinding(client: AxiosInstance, options: any): Promise<void> {
  if (!options.principal) {
    throw new Error('--principal is required (e.g., User:alice)');
  }
  if (!options.role) {
    throw new Error('--role is required (e.g., DeveloperRead, DeveloperWrite, ResourceOwner)');
  }
  if (!options.resource) {
    throw new Error('--resource is required (e.g., Topic:my-topic)');
  }

  const [resourceType, resourceName] = options.resource.split(':');

  const payload = {
    scope: {
      clusters: {
        'kafka-cluster': process.env.KAFKA_CLUSTER_ID || 'kafka-cluster',
      },
    },
    resourcePatterns: [
      {
        resourceType,
        name: resourceName,
        patternType: 'LITERAL',
      },
    ],
  };

  await client.post(`/security/1.0/principals/${options.principal}/roles/${options.role}/bindings`, payload);
  
  console.log(chalk.green(`✓ Created role binding`));
  console.log(`  Principal: ${options.principal}`);
  console.log(`  Role: ${options.role}`);
  console.log(`  Resource: ${options.resource}`);
}

async function listRoleBindings(client: AxiosInstance, options: any): Promise<void> {
  if (!options.principal) {
    throw new Error('--principal is required');
  }

  const response = await client.get(`/security/1.0/principals/${options.principal}/roles`);
  
  console.log(chalk.blue(`\nRole bindings for ${options.principal}:\n`));

  response.data.forEach((binding: any) => {
    console.log(chalk.green(`Role: ${binding.name}`));
    console.log(`  Scope: ${JSON.stringify(binding.scope)}`);
    if (binding.resourcePatterns) {
      console.log(`  Resources:`);
      binding.resourcePatterns.forEach((pattern: any) => {
        console.log(`    - ${pattern.resourceType}:${pattern.name}`);
      });
    }
    console.log();
  });
}

async function deleteRoleBinding(client: AxiosInstance, options: any): Promise<void> {
  if (!options.principal) {
    throw new Error('--principal is required');
  }
  if (!options.role) {
    throw new Error('--role is required');
  }
  if (!options.resource) {
    throw new Error('--resource is required');
  }

  const [resourceType, resourceName] = options.resource.split(':');

  const payload = {
    scope: {
      clusters: {
        'kafka-cluster': process.env.KAFKA_CLUSTER_ID || 'kafka-cluster',
      },
    },
    resourcePatterns: [
      {
        resourceType,
        name: resourceName,
        patternType: 'LITERAL',
      },
    ],
  };

  await client.delete(`/security/1.0/principals/${options.principal}/roles/${options.role}/bindings`, {
    data: payload,
  });
  
  console.log(chalk.green(`✓ Deleted role binding for ${options.principal}`));
}
