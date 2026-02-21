import { config } from 'dotenv';
import { existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// Load environment variables from multiple locations
const envPaths = [
  join(homedir(), '.vscode', '.env'),
  join(process.cwd(), '.env.local'),
  join(process.cwd(), '.env'),
];

for (const path of envPaths) {
  if (existsSync(path)) {
    config({ path });
    break;
  }
}

export interface KafkaConfig {
  deploymentType: 'apache' | 'confluent-platform' | 'confluent-cloud' | 'aws-msk' | 'azure-eventhubs';
  brokers: string[];
  clientId: string;
  ssl?: {
    rejectUnauthorized: boolean;
    ca?: Buffer[];
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
  };
  sasl?: {
    mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512' | 'aws' | 'oauthbearer';
    username?: string;
    password?: string;
  };
  connectionTimeout?: number;
  requestTimeout?: number;
  retry?: {
    retries: number;
    initialRetryTime: number;
  };
}

export interface SchemaRegistryConfig {
  url: string;
  auth?: {
    username: string;
    password: string;
  };
}

export interface KafkaConnectConfig {
  url: string;
  auth?: {
    username: string;
    password: string;
  };
}

export interface KsqlDBConfig {
  url: string;
  auth?: {
    username: string;
    password: string;
  };
}

export async function getKafkaConfig(): Promise<KafkaConfig> {
  const deploymentType = (process.env.KAFKA_DEPLOYMENT_TYPE || 'apache') as KafkaConfig['deploymentType'];
  
  const config: KafkaConfig = {
    deploymentType,
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'ailey-kafka-client',
    connectionTimeout: parseInt(process.env.KAFKA_CONNECTION_TIMEOUT || '10000'),
    requestTimeout: parseInt(process.env.KAFKA_REQUEST_TIMEOUT || '30000'),
    retry: {
      retries: parseInt(process.env.KAFKA_RETRY_RETRIES || '5'),
      initialRetryTime: parseInt(process.env.KAFKA_RETRY_INITIAL_RETRY_TIME || '300'),
    },
  };

  // SSL configuration
  if (process.env.KAFKA_SSL_ENABLED === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false',
    };

    if (process.env.KAFKA_SSL_CA) {
      const fs = await import('fs');
      config.ssl.ca = [fs.readFileSync(process.env.KAFKA_SSL_CA)];
    }
    if (process.env.KAFKA_SSL_CERT) {
      const fs = await import('fs');
      config.ssl.cert = fs.readFileSync(process.env.KAFKA_SSL_CERT);
    }
    if (process.env.KAFKA_SSL_KEY) {
      const fs = await import('fs');
      config.ssl.key = fs.readFileSync(process.env.KAFKA_SSL_KEY);
    }
    if (process.env.KAFKA_SSL_KEY_PASSWORD) {
      config.ssl.passphrase = process.env.KAFKA_SSL_KEY_PASSWORD;
    }
  }

  // SASL configuration
  if (process.env.KAFKA_SASL_MECHANISM) {
    const mechanism = process.env.KAFKA_SASL_MECHANISM.toLowerCase();
    config.sasl = {
      mechanism: mechanism as any,
      username: process.env.KAFKA_SASL_USERNAME,
      password: process.env.KAFKA_SASL_PASSWORD,
    };
  }

  return config;
}

export function getSchemaRegistryConfig(): SchemaRegistryConfig | null {
  if (!process.env.SCHEMA_REGISTRY_URL) {
    return null;
  }

  const config: SchemaRegistryConfig = {
    url: process.env.SCHEMA_REGISTRY_URL,
  };

  if (process.env.SCHEMA_REGISTRY_API_KEY && process.env.SCHEMA_REGISTRY_API_SECRET) {
    config.auth = {
      username: process.env.SCHEMA_REGISTRY_API_KEY,
      password: process.env.SCHEMA_REGISTRY_API_SECRET,
    };
  }

  return config;
}

export function getKafkaConnectConfig(): KafkaConnectConfig | null {
  if (!process.env.KAFKA_CONNECT_URL) {
    return null;
  }

  const config: KafkaConnectConfig = {
    url: process.env.KAFKA_CONNECT_URL,
  };

  if (process.env.KAFKA_CONNECT_AUTH_USERNAME && process.env.KAFKA_CONNECT_AUTH_PASSWORD) {
    config.auth = {
      username: process.env.KAFKA_CONNECT_AUTH_USERNAME,
      password: process.env.KAFKA_CONNECT_AUTH_PASSWORD,
    };
  }

  return config;
}

export function getKsqlDBConfig(): KsqlDBConfig | null {
  if (!process.env.KSQLDB_URL) {
    return null;
  }

  const config: KsqlDBConfig = {
    url: process.env.KSQLDB_URL,
  };

  if (process.env.KSQLDB_API_KEY && process.env.KSQLDB_API_SECRET) {
    config.auth = {
      username: process.env.KSQLDB_API_KEY,
      password: process.env.KSQLDB_API_SECRET,
    };
  }

  return config;
}
