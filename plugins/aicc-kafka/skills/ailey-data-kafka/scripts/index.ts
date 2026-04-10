#!/usr/bin/env node
import { Command } from 'commander';
import { testConnection } from './test-connection.js';
import { produceMessage } from './producer.js';
import { consumeMessages } from './consumer.js';
import chalk from 'chalk';

const program = new Command();

program
  .name('kafka')
  .description('AI-ley Kafka Integration CLI')
  .version('1.0.0');

// Test connection
program
  .command('test')
  .description('Test Kafka connection and deployment detection')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    try {
      await testConnection(options.verbose);
    } catch (error) {
      console.error(chalk.red('✗ Test failed:'), error);
      process.exit(1);
    }
  });

// Produce messages
program
  .command('produce <topic>')
  .description('Produce messages to a Kafka topic')
  .option('-m, --message <message>', 'Message content')
  .option('-k, --key <key>', 'Message key')
  .option('-f, --file <file>', 'Read messages from file')
  .option('-s, --schema <schema>', 'Schema subject for validation')
  .option('-b, --batch <file>', 'Batch produce from JSON file')
  .option('--transactional', 'Use transactions')
  .option('--transactional-id <id>', 'Transaction ID')
  .option('--compression <type>', 'Compression type (gzip, snappy, lz4, zstd)')
  .action(async (topic, options) => {
    try {
      await produceMessage(topic, options);
      console.log(chalk.green('✓ Message(s) produced successfully'));
    } catch (error) {
      console.error(chalk.red('✗ Production failed:'), error);
      process.exit(1);
    }
  });

// Consume messages
program
  .command('consume <topic>')
  .description('Consume messages from a Kafka topic')
  .option('-g, --group <group>', 'Consumer group ID')
  .option('--from-beginning', 'Start from beginning')
  .option('-f, --filter <filter>', 'Filter messages')
  .option('-o, --output <file>', 'Output to file')
  .option('-m, --max <count>', 'Max messages to consume')
  .option('-w, --workers <count>', 'Number of parallel workers', '1')
  .option('--isolation-level <level>', 'Isolation level (read_uncommitted, read_committed)')
  .action(async (topic, options) => {
    try {
      await consumeMessages(topic, options);
    } catch (error) {
      console.error(chalk.red('✗ Consumption failed:'), error);
      process.exit(1);
    }
  });

// Topic management (delegate to topic-manager.ts)
program
  .command('topic <action>')
  .description('Manage Kafka topics (create, list, describe, update, delete, offsets)')
  .argument('[name]', 'Topic name')
  .option('-p, --partitions <count>', 'Number of partitions')
  .option('-r, --replication-factor <count>', 'Replication factor')
  .option('-c, --config <key=value...>', 'Topic configuration')
  .action(async (action, name, options) => {
    const { topicManager } = await import('./topic-manager.js');
    try {
      await topicManager(action, name, options);
    } catch (error) {
      console.error(chalk.red('✗ Topic operation failed:'), error);
      process.exit(1);
    }
  });

// Consumer group management
program
  .command('group <action>')
  .description('Manage consumer groups (list, describe, lag, reset, delete)')
  .argument('[name]', 'Consumer group name')
  .option('--topic <topic>', 'Topic name for reset')
  .option('--to-earliest', 'Reset to earliest offset')
  .option('--to-latest', 'Reset to latest offset')
  .option('--to-offset <offset>', 'Reset to specific offset')
  .option('--to-datetime <datetime>', 'Reset to datetime')
  .action(async (action, name, options) => {
    const { consumerGroupManager } = await import('./consumer-group.js');
    try {
      await consumerGroupManager(action, name, options);
    } catch (error) {
      console.error(chalk.red('✗ Consumer group operation failed:'), error);
      process.exit(1);
    }
  });

// Schema Registry
program
  .command('schema <action>')
  .description('Manage Schema Registry (register, list, get, check, compatibility, delete)')
  .argument('[subject]', 'Schema subject')
  .option('-t, --type <type>', 'Schema type (AVRO, JSON, PROTOBUF)')
  .option('-s, --schema <file>', 'Schema file path')
  .option('-v, --version <version>', 'Schema version')
  .option('-l, --level <level>', 'Compatibility level')
  .option('--permanent', 'Permanent delete')
  .action(async (action, subject, options) => {
    const { schemaRegistry } = await import('./schema-registry.js');
    try {
      await schemaRegistry(action, subject, options);
    } catch (error) {
      console.error(chalk.red('✗ Schema Registry operation failed:'), error);
      process.exit(1);
    }
  });

// Kafka Connect
program
  .command('connect <action>')
  .description('Manage Kafka Connect (list, create, status, update, restart, pause, resume, delete, plugins)')
  .argument('[name]', 'Connector name')
  .option('-c, --config <file>', 'Connector configuration file')
  .action(async (action, name, options) => {
    const { kafkaConnect } = await import('./kafka-connect.js');
    try {
      await kafkaConnect(action, name, options);
    } catch (error) {
      console.error(chalk.red('✗ Kafka Connect operation failed:'), error);
      process.exit(1);
    }
  });

// ksqlDB
program
  .command('ksql <action>')
  .description('Manage ksqlDB (query, execute, list, describe)')
  .argument('[statement]', 'ksqlDB statement or stream/table name')
  .option('--type <type>', 'Type: streams or tables')
  .action(async (action, statement, options) => {
    const { ksqlDB } = await import('./ksqldb.js');
    try {
      await ksqlDB(action, statement, options);
    } catch (error) {
      console.error(chalk.red('✗ ksqlDB operation failed:'), error);
      process.exit(1);
    }
  });

// ACL management
program
  .command('acl <action>')
  .description('Manage ACLs (create, list, delete)')
  .option('--allow', 'Allow operation')
  .option('--deny', 'Deny operation')
  .option('-p, --principal <principal>', 'Principal (User:username)')
  .option('-o, --operation <operation>', 'Operation (READ, WRITE, CREATE, DELETE, ALTER, DESCRIBE, ALL)')
  .option('-t, --topic <topic>', 'Topic name')
  .option('--topic-prefix <prefix>', 'Topic prefix')
  .option('-g, --group <group>', 'Consumer group')
  .action(async (action, options) => {
    const { aclManager } = await import('./acl-manager.js');
    try {
      await aclManager(action, options);
    } catch (error) {
      console.error(chalk.red('✗ ACL operation failed:'), error);
      process.exit(1);
    }
  });

// RBAC management (Confluent)
program
  .command('rbac <action>')
  .description('Manage RBAC (create, list, delete)')
  .option('-p, --principal <principal>', 'Principal (User:username)')
  .option('-r, --role <role>', 'Role name')
  .option('--resource <resource>', 'Resource (Topic:name, Group:name, etc.)')
  .action(async (action, options) => {
    const { rbacManager } = await import('./rbac-manager.js');
    try {
      await rbacManager(action, options);
    } catch (error) {
      console.error(chalk.red('✗ RBAC operation failed:'), error);
      process.exit(1);
    }
  });

// Cluster management
program
  .command('cluster <action>')
  .description('Manage cluster (info, brokers, broker-config, update-config, metrics)')
  .argument('[id]', 'Broker ID')
  .option('-c, --config <key=value>', 'Configuration')
  .option('-b, --broker <id>', 'Broker ID for config update')
  .action(async (action, id, options) => {
    const { clusterManager } = await import('./cluster-manager.js');
    try {
      await clusterManager(action, id, options);
    } catch (error) {
      console.error(chalk.red('✗ Cluster operation failed:'), error);
      process.exit(1);
    }
  });

program.parse();
