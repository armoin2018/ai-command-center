import { Kafka, AclResourceTypes, AclOperationTypes, AclPermissionTypes, ResourcePatternTypes } from 'kafkajs';
import { getKafkaConfig } from './config.js';
import chalk from 'chalk';

export async function aclManager(action: string, options: any): Promise<void> {
  const config = await getKafkaConfig();
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    ssl: config.ssl,
    sasl: config.sasl as any,
  });

  const admin = kafka.admin();
  await admin.connect();

  try {
    switch (action) {
      case 'create':
        await createAcl(admin, options);
        break;

      case 'list':
        await listAcls(admin, options);
        break;

      case 'delete':
        await deleteAcl(admin, options);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } finally {
    await admin.disconnect();
  }
}

async function createAcl(admin: any, options: any): Promise<void> {
  if (!options.principal) {
    throw new Error('--principal is required (e.g., User:alice)');
  }
  if (!options.operation) {
    throw new Error('--operation is required (READ, WRITE, CREATE, DELETE, ALTER, DESCRIBE, ALL)');
  }

  const resourceType = options.topic ? AclResourceTypes.TOPIC : 
                      options.group ? AclResourceTypes.GROUP : 
                      AclResourceTypes.CLUSTER;

  const resourceName = options.topic || options.group || 'kafka-cluster';
  const patternType = options.topicPrefix ? ResourcePatternTypes.PREFIXED : ResourcePatternTypes.LITERAL;

  const acl = {
    resourceType,
    resourceName,
    resourcePatternType: patternType,
    principal: options.principal,
    host: '*',
    operation: AclOperationTypes[options.operation as keyof typeof AclOperationTypes],
    permissionType: options.allow ? AclPermissionTypes.ALLOW : AclPermissionTypes.DENY,
  };

  await admin.createAcls({ acl: [acl] });
  
  console.log(chalk.green(`✓ Created ACL`));
  console.log(`  Principal: ${options.principal}`);
  console.log(`  Operation: ${options.operation}`);
  console.log(`  Resource: ${resourceType}:${resourceName}`);
  console.log(`  Permission: ${options.allow ? 'ALLOW' : 'DENY'}`);
}

async function listAcls(admin: any, options: any): Promise<void> {
  const filter: any = {};

  if (options.principal) {
    filter.principal = options.principal;
  }
  if (options.topic) {
    filter.resourceType = AclResourceTypes.TOPIC;
    filter.resourceName = options.topic;
  }
  if (options.group) {
    filter.resourceType = AclResourceTypes.GROUP;
    filter.resourceName = options.group;
  }

  const result = await admin.describeAcls(filter);
  
  console.log(chalk.blue(`\nFound ${result.resources.length} ACL(s):\n`));

  result.resources.forEach((resource: any) => {
    console.log(chalk.green(`Resource: ${resource.resourceType}:${resource.resourceName}`));
    console.log(`  Pattern: ${resource.resourcePatternType}`);
    
    resource.acls.forEach((acl: any) => {
      console.log(`  - Principal: ${acl.principal}`);
      console.log(`    Operation: ${acl.operation}`);
      console.log(`    Permission: ${acl.permissionType}`);
      console.log(`    Host: ${acl.host}`);
      console.log();
    });
  });
}

async function deleteAcl(admin: any, options: any): Promise<void> {
  if (!options.principal) {
    throw new Error('--principal is required');
  }
  if (!options.operation) {
    throw new Error('--operation is required');
  }

  const resourceType = options.topic ? AclResourceTypes.TOPIC : 
                      options.group ? AclResourceTypes.GROUP : 
                      AclResourceTypes.CLUSTER;

  const resourceName = options.topic || options.group || 'kafka-cluster';

  const filter = {
    resourceType,
    resourceName,
    resourcePatternType: ResourcePatternTypes.LITERAL,
    principal: options.principal,
    host: '*',
    operation: AclOperationTypes[options.operation as keyof typeof AclOperationTypes],
    permissionType: options.allow ? AclPermissionTypes.ALLOW : AclPermissionTypes.DENY,
  };

  await admin.deleteAcls({ filters: [filter] });
  
  console.log(chalk.green(`✓ Deleted ACL for ${options.principal}`));
}
