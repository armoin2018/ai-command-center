import { Kafka, logLevel } from 'kafkajs';
import { getKafkaConfig, getSchemaRegistryConfig, getKafkaConnectConfig, getKsqlDBConfig } from './config.js';
import chalk from 'chalk';
import axios from 'axios';

export async function testConnection(verbose: boolean = false): Promise<void> {
  const config = await getKafkaConfig();
  
  console.log(chalk.blue('Testing Kafka connection...'));
  console.log(chalk.gray(`Deployment Type: ${config.deploymentType}`));
  console.log(chalk.gray(`Brokers: ${config.brokers.join(', ')}`));
  
  // Create Kafka client
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    ssl: config.ssl,
    sasl: config.sasl as any,
    connectionTimeout: config.connectionTimeout,
    requestTimeout: config.requestTimeout,
    retry: config.retry,
    logLevel: verbose ? logLevel.DEBUG : logLevel.ERROR,
  });

  try {
    // Test admin connection
    const admin = kafka.admin();
    await admin.connect();
    
    console.log(chalk.green('✓ Connected to Kafka brokers'));
    
    // Get cluster info
    const cluster = await admin.describeCluster();
    console.log(chalk.green(`✓ Cluster ID: ${cluster.clusterId}`));
    console.log(chalk.gray(`  Brokers: ${cluster.brokers.length}`));
    
    if (verbose) {
      cluster.brokers.forEach(broker => {
        console.log(chalk.gray(`    - Broker ${broker.nodeId}: ${broker.host}:${broker.port}`));
      });
    }
    
    await admin.disconnect();
    
    // Test Schema Registry
    const srConfig = getSchemaRegistryConfig();
    if (srConfig) {
      try {
        const headers: any = {};
        if (srConfig.auth) {
          const authString = Buffer.from(`${srConfig.auth.username}:${srConfig.auth.password}`).toString('base64');
          headers.Authorization = `Basic ${authString}`;
        }
        
        const response = await axios.get(`${srConfig.url}/subjects`, { headers });
        console.log(chalk.green(`✓ Schema Registry: Available (${response.data.length} subjects)`));
      } catch (error) {
        console.log(chalk.yellow('⚠ Schema Registry: Not available'));
        if (verbose) console.log(chalk.gray(`  Error: ${error}`));
      }
    } else {
      console.log(chalk.gray('○ Schema Registry: Not configured'));
      if (verbose) {
        console.log(chalk.gray('  Add SCHEMA_REGISTRY_URL to .env to enable'));
      }
    }
    
    // Test Kafka Connect
    const connectConfig = getKafkaConnectConfig();
    if (connectConfig) {
      try {
        const headers: any = {};
        if (connectConfig.auth) {
          const authString = Buffer.from(`${connectConfig.auth.username}:${connectConfig.auth.password}`).toString('base64');
          headers.Authorization = `Basic ${authString}`;
        }
        
        const response = await axios.get(`${connectConfig.url}/connectors`, { headers });
        console.log(chalk.green(`✓ Kafka Connect: Available (${response.data.length} connectors)`));
      } catch (error) {
        console.log(chalk.yellow('⚠ Kafka Connect: Not available'));
        if (verbose) console.log(chalk.gray(`  Error: ${error}`));
      }
    } else {
      console.log(chalk.gray('○ Kafka Connect: Not configured'));
      if (verbose) {
        console.log(chalk.gray('  Add KAFKA_CONNECT_URL to .env to enable'));
      }
    }
    
    // Test ksqlDB
    const ksqlConfig = getKsqlDBConfig();
    if (ksqlConfig) {
      try {
        const headers: any = { 'Content-Type': 'application/json' };
        if (ksqlConfig.auth) {
          const authString = Buffer.from(`${ksqlConfig.auth.username}:${ksqlConfig.auth.password}`).toString('base64');
          headers.Authorization = `Basic ${authString}`;
        }
        
        const response = await axios.post(
          `${ksqlConfig.url}/ksql`,
          { ksql: 'SHOW STREAMS;' },
          { headers }
        );
        console.log(chalk.green('✓ ksqlDB: Available'));
      } catch (error) {
        console.log(chalk.yellow('⚠ ksqlDB: Not available'));
        if (verbose) console.log(chalk.gray(`  Error: ${error}`));
      }
    } else {
      console.log(chalk.gray('○ ksqlDB: Not configured'));
      if (verbose) {
        console.log(chalk.gray('  Add KSQLDB_URL to .env to enable'));
      }
    }
    
    console.log(chalk.green('\n✓ Connection test completed successfully'));
    
  } catch (error) {
    console.error(chalk.red('✗ Connection test failed:'), error);
    
    // Provide helpful troubleshooting tips
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log(chalk.gray('1. Verify brokers are reachable'));
    console.log(chalk.gray('2. Check authentication credentials'));
    console.log(chalk.gray('3. Verify SSL/TLS certificates (if enabled)'));
    console.log(chalk.gray('4. Check firewall and network settings'));
    console.log(chalk.gray('5. Review .env configuration'));
    
    throw error;
  }
}
