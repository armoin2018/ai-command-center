import { Kafka } from 'kafkajs';
import { getKafkaConfig } from './config.js';

export async function topicManager(action: string, name: string, options: any): Promise<void> {
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
        await admin.createTopics({
          topics: [{
            topic: name,
            numPartitions: parseInt(options.partitions || '1'),
            replicationFactor: parseInt(options.replicationFactor || '1'),
            configEntries: options.config || [],
          }],
        });
        console.log(`Topic ${name} created`);
        break;

      case 'list':
        const topics = await admin.listTopics();
        topics.forEach(topic => console.log(topic));
        break;

      case 'describe':
        const metadata = await admin.fetchTopicMetadata({ topics: [name] });
        console.log(JSON.stringify(metadata, null, 2));
        break;

      case 'delete':
        await admin.deleteTopics({ topics: [name] });
        console.log(`Topic ${name} deleted`);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } finally {
    await admin.disconnect();
  }
}
