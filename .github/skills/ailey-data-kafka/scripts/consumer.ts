import { Kafka } from 'kafkajs';
import { getKafkaConfig } from './config.js';

export async function consumeMessages(topic: string, options: any): Promise<void> {
  const config = await getKafkaConfig();
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    ssl: config.ssl,
    sasl: config.sasl as any,
  });

  const consumer = kafka.consumer({
    groupId: options.group || `ailey-consumer-${Date.now()}`,
  });

  await consumer.connect();
  await consumer.subscribe({ 
    topic, 
    fromBeginning: options.fromBeginning || false 
  });

  let messageCount = 0;
  const maxMessages = options.max ? parseInt(options.max) : Infinity;

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        key: message.key?.toString(),
        value: message.value?.toString(),
      });

      messageCount++;
      if (messageCount >= maxMessages) {
        await consumer.disconnect();
        process.exit(0);
      }
    },
  });
}
