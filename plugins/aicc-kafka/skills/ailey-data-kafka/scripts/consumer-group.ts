import { Kafka } from 'kafkajs';
import { getKafkaConfig } from './config.js';
import chalk from 'chalk';

export async function consumerGroupManager(action: string, name: string, options: any): Promise<void> {
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
      case 'list':
        await listConsumerGroups(admin);
        break;

      case 'describe':
        await describeConsumerGroup(admin, name);
        break;

      case 'lag':
        await getConsumerGroupLag(admin, name);
        break;

      case 'reset':
        await resetConsumerGroupOffsets(admin, name, options);
        break;

      case 'delete':
        await deleteConsumerGroup(admin, name);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } finally {
    await admin.disconnect();
  }
}

async function listConsumerGroups(admin: any): Promise<void> {
  const groups = await admin.listGroups();
  
  console.log(chalk.blue(`Found ${groups.groups.length} consumer groups:\n`));
  
  groups.groups.forEach((group: any) => {
    console.log(`${chalk.green(group.groupId)} (${group.protocolType})`);
  });
}

async function describeConsumerGroup(admin: any, groupId: string): Promise<void> {
  const description = await admin.describeGroups([groupId]);
  const group = description.groups[0];

  console.log(chalk.blue(`\nConsumer Group: ${chalk.bold(groupId)}\n`));
  console.log(`State: ${chalk.green(group.state)}`);
  console.log(`Protocol Type: ${group.protocolType}`);
  console.log(`Protocol: ${group.protocol}`);
  console.log(`Members: ${group.members.length}\n`);

  if (group.members.length > 0) {
    console.log(chalk.blue('Members:'));
    group.members.forEach((member: any, index: number) => {
      console.log(`\n${chalk.gray(`Member ${index + 1}:`)}`);
      console.log(`  ID: ${member.memberId}`);
      console.log(`  Client ID: ${member.clientId}`);
      console.log(`  Host: ${member.clientHost}`);
      
      if (member.memberAssignment) {
        const assignment = JSON.parse(member.memberAssignment.toString());
        console.log(`  Assigned Partitions: ${JSON.stringify(assignment)}`);
      }
    });
  }
}

async function getConsumerGroupLag(admin: any, groupId: string): Promise<void> {
  const offsets = await admin.fetchOffsets({ groupId });
  
  console.log(chalk.blue(`\nConsumer Group Lag: ${chalk.bold(groupId)}\n`));

  for (const topic of offsets) {
    console.log(chalk.green(`Topic: ${topic.topic}`));
    
    for (const partition of topic.partitions) {
      const offset = partition.offset;
      console.log(`  Partition ${partition.partition}: offset ${offset}`);
    }
    console.log();
  }
}

async function resetConsumerGroupOffsets(admin: any, groupId: string, options: any): Promise<void> {
  if (!options.topic) {
    throw new Error('--topic is required for reset operation');
  }

  let topicOffsets: any = { topic: options.topic, partitions: [] };

  if (options.toEarliest) {
    // Reset to earliest offset
    topicOffsets.partitions = await getEarliestOffsets(admin, options.topic);
  } else if (options.toLatest) {
    // Reset to latest offset
    topicOffsets.partitions = await getLatestOffsets(admin, options.topic);
  } else if (options.toOffset) {
    // Reset to specific offset
    const partitionCount = await getPartitionCount(admin, options.topic);
    topicOffsets.partitions = Array.from({ length: partitionCount }, (_, i) => ({
      partition: i,
      offset: options.toOffset,
    }));
  } else if (options.toDatetime) {
    // Reset to datetime
    const timestamp = new Date(options.toDatetime).getTime();
    topicOffsets.partitions = await getOffsetsByTimestamp(admin, options.topic, timestamp);
  } else {
    throw new Error('Specify one of: --to-earliest, --to-latest, --to-offset, --to-datetime');
  }

  await admin.setOffsets({
    groupId,
    topic: options.topic,
    partitions: topicOffsets.partitions,
  });

  console.log(chalk.green(`✓ Reset offsets for consumer group ${groupId} on topic ${options.topic}`));
}

async function deleteConsumerGroup(admin: any, groupId: string): Promise<void> {
  await admin.deleteGroups([groupId]);
  console.log(chalk.green(`✓ Deleted consumer group ${groupId}`));
}

async function getEarliestOffsets(admin: any, topic: string): Promise<any[]> {
  const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
  const partitions = metadata.topics[0].partitions;
  
  return partitions.map((p: any) => ({
    partition: p.partitionId,
    offset: '0',
  }));
}

async function getLatestOffsets(admin: any, topic: string): Promise<any[]> {
  const offsets = await admin.fetchTopicOffsets(topic);
  return offsets.map((o: any) => ({
    partition: o.partition,
    offset: o.high,
  }));
}

async function getPartitionCount(admin: any, topic: string): Promise<number> {
  const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
  return metadata.topics[0].partitions.length;
}

async function getOffsetsByTimestamp(admin: any, topic: string, timestamp: number): Promise<any[]> {
  const metadata = await admin.fetchTopicMetadata({ topics: [topic] });
  const partitions = metadata.topics[0].partitions;
  
  return partitions.map((p: any) => ({
    partition: p.partitionId,
    offset: timestamp.toString(),
  }));
}
