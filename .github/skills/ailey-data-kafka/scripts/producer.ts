import { Kafka } from 'kafkajs';
import { getKafkaConfig } from './config.js';
import { readFileSync } from 'fs';

export async function produceMessage(topic: string, options: any): Promise<void> {
  const config = await getKafkaConfig();
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    ssl: config.ssl,
    sasl: config.sasl as any,
  });

  const producer = kafka.producer({
    allowAutoTopicCreation: true,
    transactionalId: options.transactionalId,
  });

  await producer.connect();

  try {
    let messages: any[] = [];

    if (options.batch) {
      const batchData = JSON.parse(readFileSync(options.batch, 'utf-8'));
      messages = batchData.map((item: any) => ({
        key: item.key,
        value: JSON.stringify(item.value),
      }));
    } else if (options.file) {
      const fileData = readFileSync(options.file, 'utf-8');
      messages = fileData.split('\n').filter(line => line.trim()).map(line => ({
        value: line,
      }));
    } else if (options.message) {
      messages = [{
        key: options.key,
        value: options.message,
      }];
    }

    await producer.send({
      topic,
      messages,
      compression: options.compression ? parseInt(options.compression) : undefined,
    });

  } finally {
    await producer.disconnect();
  }
}
