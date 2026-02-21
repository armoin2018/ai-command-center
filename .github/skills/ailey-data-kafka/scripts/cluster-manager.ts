import { Kafka } from 'kafkajs';
import { getKafkaConfig } from './config.js';
import chalk from 'chalk';

export async function clusterManager(action: string, id: string, options: any): Promise<void> {
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
      case 'info':
        await getClusterInfo(admin);
        break;

      case 'brokers':
        await listBrokers(admin);
        break;

      case 'broker-config':
        await getBrokerConfig(admin, id);
        break;

      case 'update-config':
        await updateConfig(admin, options);
        break;

      case 'metrics':
        await getClusterMetrics(admin);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } finally {
    await admin.disconnect();
  }
}

async function getClusterInfo(admin: any): Promise<void> {
  const cluster = await admin.describeCluster();

  console.log(chalk.blue('\nKafka Cluster Information:\n'));
  console.log(`Cluster ID: ${chalk.green(cluster.clusterId)}`);
  console.log(`Controller: Broker ${cluster.controller}`);
  console.log(`Brokers: ${cluster.brokers.length}\n`);

  cluster.brokers.forEach((broker: any) => {
    console.log(chalk.green(`Broker ${broker.nodeId}:`));
    console.log(`  Host: ${broker.host}:${broker.port}`);
    if (broker.rack) {
      console.log(`  Rack: ${broker.rack}`);
    }
    console.log();
  });
}

async function listBrokers(admin: any): Promise<void> {
  const cluster = await admin.describeCluster();

  console.log(chalk.blue(`\nBrokers (${cluster.brokers.length}):\n`));

  cluster.brokers.forEach((broker: any) => {
    const isController = broker.nodeId === cluster.controller;
    const nodeInfo = isController ? chalk.yellow(`${broker.nodeId} (controller)`) : `${broker.nodeId}`;
    
    console.log(`${chalk.green(`Broker ${nodeInfo}`)}:`);
    console.log(`  Endpoint: ${broker.host}:${broker.port}`);
    if (broker.rack) {
      console.log(`  Rack: ${broker.rack}`);
    }
    console.log();
  });
}

async function getBrokerConfig(admin: any, brokerId: string): Promise<void> {
  const configs = await admin.describeConfigs({
    resources: [
      {
        type: 4, // BROKER
        name: brokerId,
      },
    ],
  });

  console.log(chalk.blue(`\nConfiguration for Broker ${brokerId}:\n`));

  const brokerConfig = configs.resources[0];
  if (!brokerConfig) {
    console.log(chalk.yellow('No configuration found'));
    return;
  }

  brokerConfig.configEntries.forEach((entry: any) => {
    if (!entry.isDefault) {
      console.log(`${chalk.green(entry.configName)}: ${entry.configValue}`);
      if (entry.isSensitive) {
        console.log(`  ${chalk.gray('(sensitive)')}`);
      }
    }
  });
}

async function updateConfig(admin: any, options: any): Promise<void> {
  if (!options.config) {
    throw new Error('--config is required (format: key=value)');
  }

  const [key, value] = options.config.split('=');
  
  if (!key || !value) {
    throw new Error('Invalid config format. Use: key=value');
  }

  const resourceType = options.broker ? 4 : 2; // BROKER or TOPIC
  const resourceName = options.broker || 'kafka-cluster';

  await admin.alterConfigs({
    resources: [
      {
        type: resourceType,
        name: resourceName,
        configEntries: [
          {
            name: key,
            value: value,
          },
        ],
      },
    ],
  });

  console.log(chalk.green(`✓ Updated configuration for ${resourceName}`));
  console.log(`  ${key} = ${value}`);
}

async function getClusterMetrics(admin: any): Promise<void> {
  const cluster = await admin.describeCluster();
  const topics = await admin.listTopics();
  const groups = await admin.listGroups();

  console.log(chalk.blue('\nCluster Metrics:\n'));
  console.log(`Cluster ID: ${chalk.green(cluster.clusterId)}`);
  console.log(`Brokers: ${chalk.green(cluster.brokers.length)}`);
  console.log(`Topics: ${chalk.green(topics.length)}`);
  console.log(`Consumer Groups: ${chalk.green(groups.groups.length)}`);

  // Get topic partition counts
  let totalPartitions = 0;
  for (const topic of topics.slice(0, 10)) {
    const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
    totalPartitions += metadata.topics[0].partitions.length;
  }

  console.log(`Partitions (sample): ${chalk.green(totalPartitions)}`);
  console.log();
}
