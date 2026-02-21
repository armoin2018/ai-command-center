---
name: ailey-data-kafka
description: Comprehensive Apache Kafka integration with automatic deployment detection (Confluent Cloud/Platform, Apache Kafka, AWS MSK), producer/consumer APIs, Schema Registry, Kafka Connect, KRaft/Zookeeper, ksqlDB, and RBAC/ACL management. Supports SASL/SCRAM, mTLS, PLAIN authentication.
keywords: [kafka, streaming, event-driven, schema-registry, kafka-connect, ksqldb, confluent, msk, pubsub, messaging]
tools: [kafkajs, @confluentinc/kafka-javascript, @kafkajs/confluent-schema-registry, commander]
---

# AI-ley Apache Kafka Integration

Comprehensive Apache Kafka integration with automatic deployment detection, producer/consumer capabilities, Schema Registry management, Kafka Connect administration, and complete cluster management.

## Overview

The ailey-data-kafka skill provides production-grade Kafka integration supporting:

- **Producer/Consumer**: Publish and consume messages with advanced configurations
- **Schema Registry**: Avro, Protobuf, JSON Schema management and validation
- **Kafka Connect**: Manage connectors, tasks, and plugins
- **ksqlDB**: Stream processing and materialized views
- **Topic Management**: Create, configure, delete, and describe topics
- **Consumer Groups**: Monitor and manage consumer group offsets
- **ACL Management**: Fine-grained access control configuration
- **RBAC**: Role-based access control for Confluent Platform
- **Multi-Auth**: SASL/SCRAM, mTLS (X.509), PLAIN, OAUTHBEARER
- **Deployment Detection**: Automatic detection of Confluent Cloud, Confluent Platform, Apache Kafka, AWS MSK

## When to Use

- **Event Streaming**: Build real-time data pipelines and streaming applications
- **Microservices Communication**: Event-driven architecture between services
- **Data Integration**: Connect data sources and sinks with Kafka Connect
- **Stream Processing**: Transform and aggregate data with ksqlDB
- **Log Aggregation**: Centralized logging and metrics collection
- **CDC (Change Data Capture)**: Capture database changes in real-time
- **Message Queue**: Reliable, scalable message broker
- **Analytics**: Real-time analytics and monitoring

## Kafka Deployment Types

### Apache Kafka (Open Source)
- **API Limit**: Unlimited (self-managed)
- **Authentication**: SASL/PLAIN, SASL/SCRAM, mTLS, Kerberos
- **Features**: Core Kafka, basic security
- **Coordination**: Zookeeper or KRaft
- **Best For**: Self-hosted deployments, full control

### Confluent Platform
- **API Limit**: Unlimited (self-managed)
- **Authentication**: SASL/SCRAM, mTLS, LDAP, RBAC
- **Features**: Schema Registry, Connect, ksqlDB, Control Center, RBAC
- **Coordination**: Zookeeper or KRaft
- **Best For**: Enterprise features with self-hosting

### Confluent Cloud
- **API Limit**: Pay-as-you-go, no hard limits
- **Authentication**: API Keys, OAuth, mTLS
- **Features**: Fully managed, auto-scaling, global availability
- **Coordination**: Managed KRaft
- **Best For**: Serverless, zero-ops streaming

### AWS MSK (Managed Streaming for Kafka)
- **API Limit**: Unlimited (AWS-managed)
- **Authentication**: IAM, SASL/SCRAM, mTLS
- **Features**: AWS integration, automated patching
- **Coordination**: Zookeeper or MSK Serverless
- **Best For**: AWS ecosystem integration

### Azure Event Hubs for Kafka
- **API Limit**: Based on throughput units
- **Authentication**: SAS tokens, Event Hubs SDK
- **Features**: Kafka protocol compatibility, Azure integration
- **Coordination**: Managed
- **Best For**: Azure ecosystem integration

## Installation

```bash
cd .github/skills/ailey-data-kafka
npm install
```

## Setup Instructions

### Step 1: Choose Your Kafka Deployment

#### Option A: Apache Kafka (Self-Hosted)

**Download and Install:**
```bash
# Download Kafka
wget https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz
tar -xzf kafka_2.13-3.7.0.tgz
cd kafka_2.13-3.7.0

# Start KRaft (recommended) or Zookeeper
# KRaft mode:
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"
bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c config/kraft/server.properties
bin/kafka-server-start.sh config/kraft/server.properties

# OR Zookeeper mode:
bin/zookeeper-server-start.sh config/zookeeper.properties &
bin/kafka-server-start.sh config/server.properties &
```

**Configure AI-ley:** Create `~/.vscode/.env`, `.env`, or `.env.local`:
```bash
KAFKA_DEPLOYMENT_TYPE=apache
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ailey-kafka-client

# Optional: Enable SASL/SCRAM
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret

# Optional: Enable mTLS
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA=/path/to/ca-cert
KAFKA_SSL_CERT=/path/to/client-cert
KAFKA_SSL_KEY=/path/to/client-key
```

#### Option B: Confluent Platform (Self-Hosted)

**Download and Install:**
```bash
# Download Confluent Platform
wget https://packages.confluent.io/archive/7.6/confluent-7.6.0.tar.gz
tar -xzf confluent-7.6.0.tar.gz
cd confluent-7.6.0

# Start all services
bin/confluent local services start
```

**Configure AI-ley:**
```bash
KAFKA_DEPLOYMENT_TYPE=confluent-platform
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ailey-kafka-client

# Schema Registry
SCHEMA_REGISTRY_URL=http://localhost:8081

# Kafka Connect
KAFKA_CONNECT_URL=http://localhost:8083

# ksqlDB
KSQLDB_URL=http://localhost:8088

# Control Center
CONTROL_CENTER_URL=http://localhost:9021

# RBAC (if enabled)
KAFKA_RBAC_ENABLED=true
KAFKA_MDS_URL=http://localhost:8090
KAFKA_MDS_TOKEN=your-bearer-token

# SASL/SCRAM
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret
```

#### Option C: Confluent Cloud

**Get API Keys:**
1. Go to [Confluent Cloud Console](https://confluent.cloud/)
2. Select your cluster
3. Navigate to **Data integration** → **API keys**
4. Click **Create key** → **Global access**
5. Save the API Key and Secret

**Configure AI-ley:**
```bash
KAFKA_DEPLOYMENT_TYPE=confluent-cloud
KAFKA_BROKERS=pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
KAFKA_CLIENT_ID=ailey-kafka-client

# Confluent Cloud Authentication
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=<API_KEY>
KAFKA_SASL_PASSWORD=<API_SECRET>
KAFKA_SSL_ENABLED=true

# Schema Registry
SCHEMA_REGISTRY_URL=https://psrc-xxxxx.us-east-1.aws.confluent.cloud
SCHEMA_REGISTRY_API_KEY=<SR_API_KEY>
SCHEMA_REGISTRY_API_SECRET=<SR_API_SECRET>

# ksqlDB (if provisioned)
KSQLDB_URL=https://pksqlc-xxxxx.us-east-1.aws.confluent.cloud
KSQLDB_API_KEY=<KSQL_API_KEY>
KSQLDB_API_SECRET=<KSQL_API_SECRET>
```

#### Option D: AWS MSK

**Create MSK Cluster:**
1. Go to [AWS MSK Console](https://console.aws.amazon.com/msk/)
2. Create a cluster with desired configuration
3. Configure client authentication (IAM, SASL/SCRAM, or mTLS)

**Configure AI-ley:**
```bash
KAFKA_DEPLOYMENT_TYPE=aws-msk
KAFKA_BROKERS=b-1.mycluster.xxxxx.kafka.us-east-1.amazonaws.com:9092,b-2.mycluster.xxxxx.kafka.us-east-1.amazonaws.com:9092
KAFKA_CLIENT_ID=ailey-kafka-client

# IAM Authentication
KAFKA_SASL_MECHANISM=AWS_MSK_IAM
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<YOUR_ACCESS_KEY>
AWS_SECRET_ACCESS_KEY=<YOUR_SECRET_KEY>

# OR SASL/SCRAM
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=<USERNAME>
KAFKA_SASL_PASSWORD=<PASSWORD>

# OR mTLS
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA=/path/to/ca-cert
KAFKA_SSL_CERT=/path/to/client-cert
KAFKA_SSL_KEY=/path/to/client-key
```

### Step 2: Test Connection

```bash
npm run kafka test
```

Expected output:
```
✓ Kafka Deployment Detected: Confluent Cloud
✓ Connected to brokers: pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
✓ Schema Registry: Available
✓ Kafka Connect: Not configured
✓ ksqlDB: Available
```

## Quick Start

### Produce Messages

```bash
# Simple message
npm run kafka produce my-topic --message "Hello Kafka"

# JSON message
npm run kafka produce user-events --message '{"userId": 123, "action": "login"}'

# With key
npm run kafka produce user-events --key user-123 --message '{"action": "login"}'

# From file
npm run kafka produce logs --file /path/to/messages.json

# With schema validation (Avro)
npm run kafka produce users --schema user-value --message '{"name": "John", "age": 30}'
```

### Consume Messages

```bash
# Consume from beginning
npm run kafka consume my-topic --from-beginning

# Consume from consumer group
npm run kafka consume my-topic --group my-consumer-group

# Consume with filter
npm run kafka consume user-events --filter 'userId=123'

# Consume to file
npm run kafka consume logs --output /path/to/output.json --max 1000
```

## Workflows

### Workflow 1: Topic Management

**Create Topic:**
```bash
npm run kafka topic create my-topic \
  --partitions 3 \
  --replication-factor 2 \
  --config retention.ms=86400000 \
  --config compression.type=snappy
```

**List Topics:**
```bash
npm run kafka topic list
```

**Describe Topic:**
```bash
npm run kafka topic describe my-topic
```

**Update Topic Config:**
```bash
npm run kafka topic update my-topic \
  --config retention.ms=172800000 \
  --config segment.ms=3600000
```

**Delete Topic:**
```bash
npm run kafka topic delete my-topic
```

**Get Topic Offsets:**
```bash
npm run kafka topic offsets my-topic
```

### Workflow 2: Consumer Group Management

**List Consumer Groups:**
```bash
npm run kafka group list
```

**Describe Consumer Group:**
```bash
npm run kafka group describe my-consumer-group
```

**Get Consumer Group Lag:**
```bash
npm run kafka group lag my-consumer-group
```

**Reset Offsets:**
```bash
# Reset to beginning
npm run kafka group reset my-consumer-group --topic my-topic --to-earliest

# Reset to end
npm run kafka group reset my-consumer-group --topic my-topic --to-latest

# Reset to specific offset
npm run kafka group reset my-consumer-group --topic my-topic --to-offset 1000

# Reset to datetime
npm run kafka group reset my-consumer-group --topic my-topic --to-datetime "2026-02-01T00:00:00Z"
```

**Delete Consumer Group:**
```bash
npm run kafka group delete my-consumer-group
```

### Workflow 3: Schema Registry

**Register Schema:**
```bash
# Avro schema
npm run kafka schema register user-value --type AVRO --schema @schemas/user.avsc

# JSON Schema
npm run kafka schema register config-value --type JSON --schema @schemas/config.json

# Protobuf
npm run kafka schema register event-value --type PROTOBUF --schema @schemas/event.proto
```

**List Subjects:**
```bash
npm run kafka schema list
```

**Get Schema:**
```bash
npm run kafka schema get user-value --version latest
```

**Check Compatibility:**
```bash
npm run kafka schema check user-value --schema @schemas/user-v2.avsc
```

**Update Compatibility Level:**
```bash
npm run kafka schema compatibility user-value --level BACKWARD
```

**Delete Schema:**
```bash
# Soft delete (specific version)
npm run kafka schema delete user-value --version 1

# Hard delete (all versions)
npm run kafka schema delete user-value --permanent
```

### Workflow 4: Kafka Connect

**List Connectors:**
```bash
npm run kafka connect list
```

**Create Connector:**
```bash
npm run kafka connect create @connectors/postgres-source.json
```

Example connector config (`connectors/postgres-source.json`):
```json
{
  "name": "postgres-source",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "database.hostname": "localhost",
    "database.port": "5432",
    "database.user": "postgres",
    "database.password": "postgres",
    "database.dbname": "mydb",
    "database.server.name": "dbserver1",
    "table.include.list": "public.users,public.orders"
  }
}
```

**Get Connector Status:**
```bash
npm run kafka connect status postgres-source
```

**Update Connector:**
```bash
npm run kafka connect update postgres-source @connectors/postgres-source-updated.json
```

**Restart Connector:**
```bash
npm run kafka connect restart postgres-source
```

**Pause/Resume Connector:**
```bash
npm run kafka connect pause postgres-source
npm run kafka connect resume postgres-source
```

**Delete Connector:**
```bash
npm run kafka connect delete postgres-source
```

**List Connector Plugins:**
```bash
npm run kafka connect plugins
```

### Workflow 5: ksqlDB

**Execute Query:**
```bash
npm run kafka ksql query "SELECT * FROM users EMIT CHANGES;"
```

**Create Stream:**
```bash
npm run kafka ksql execute "
CREATE STREAM user_events (
  userId INT,
  action VARCHAR,
  timestamp BIGINT
) WITH (
  KAFKA_TOPIC='user-events',
  VALUE_FORMAT='JSON',
  PARTITIONS=3
);"
```

**Create Table:**
```bash
npm run kafka ksql execute "
CREATE TABLE user_stats AS
  SELECT userId, COUNT(*) as action_count
  FROM user_events
  GROUP BY userId
  EMIT CHANGES;"
```

**List Streams:**
```bash
npm run kafka ksql list streams
```

**List Tables:**
```bash
npm run kafka ksql list tables
```

**Describe Stream:**
```bash
npm run kafka ksql describe user_events
```

**Drop Stream/Table:**
```bash
npm run kafka ksql execute "DROP STREAM user_events DELETE TOPIC;"
```

### Workflow 6: ACL Management

**Create ACL:**
```bash
# Allow user to read from topic
npm run kafka acl create \
  --allow \
  --principal User:alice \
  --operation READ \
  --topic my-topic

# Allow group to consume
npm run kafka acl create \
  --allow \
  --principal User:alice \
  --operation READ \
  --group my-consumer-group

# Allow write to topic
npm run kafka acl create \
  --allow \
  --principal User:bob \
  --operation WRITE \
  --topic my-topic

# Allow all operations on topic pattern
npm run kafka acl create \
  --allow \
  --principal User:admin \
  --operation ALL \
  --topic-prefix prod-
```

**List ACLs:**
```bash
# All ACLs
npm run kafka acl list

# For specific principal
npm run kafka acl list --principal User:alice

# For specific topic
npm run kafka acl list --topic my-topic
```

**Delete ACL:**
```bash
npm run kafka acl delete \
  --principal User:alice \
  --operation READ \
  --topic my-topic
```

### Workflow 7: RBAC (Confluent Platform/Cloud)

**Create Role Binding:**
```bash
npm run kafka rbac create \
  --principal User:alice \
  --role DeveloperRead \
  --resource Topic:my-topic
```

**List Role Bindings:**
```bash
npm run kafka rbac list --principal User:alice
```

**Delete Role Binding:**
```bash
npm run kafka rbac delete \
  --principal User:alice \
  --role DeveloperRead \
  --resource Topic:my-topic
```

**Available Roles** (Confluent Platform):
- `SystemAdmin`: Full cluster access
- `ClusterAdmin`: Cluster configuration
- `SecurityAdmin`: Security configuration
- `UserAdmin`: User management
- `Operator`: Operations (restart, etc.)
- `DeveloperManage`: Full topic access
- `DeveloperRead`: Read-only topic access
- `DeveloperWrite`: Write-only topic access
- `ResourceOwner`: Resource ownership

### Workflow 8: Cluster Management

**Get Cluster Info:**
```bash
npm run kafka cluster info
```

**List Brokers:**
```bash
npm run kafka cluster brokers
```

**Get Broker Config:**
```bash
npm run kafka cluster broker-config 1
```

**Update Broker Config:**
```bash
npm run kafka cluster update-config --broker 1 --config log.retention.hours=48
```

**Get Cluster Metrics:**
```bash
npm run kafka cluster metrics
```

## Authentication Methods

### SASL/PLAIN

```bash
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret
KAFKA_SSL_ENABLED=true  # Usually required with PLAIN
```

### SASL/SCRAM-SHA-256

```bash
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret
```

### SASL/SCRAM-SHA-512

```bash
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret
```

### mTLS (Mutual TLS / X.509)

```bash
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA=/path/to/ca-cert.pem
KAFKA_SSL_CERT=/path/to/client-cert.pem
KAFKA_SSL_KEY=/path/to/client-key.pem
KAFKA_SSL_KEY_PASSWORD=optional-key-password

# Optional: Reject unauthorized
KAFKA_SSL_REJECT_UNAUTHORIZED=true
```

### AWS MSK IAM

```bash
KAFKA_SASL_MECHANISM=AWS_MSK_IAM
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### OAUTHBEARER (Confluent Cloud)

```bash
KAFKA_SASL_MECHANISM=OAUTHBEARER
KAFKA_SASL_OAUTH_TOKEN_ENDPOINT=https://oauth.confluent.cloud/token
KAFKA_SASL_OAUTH_CLIENT_ID=your-client-id
KAFKA_SASL_OAUTH_CLIENT_SECRET=your-client-secret
```

## Advanced Features

### Transactions

```bash
npm run kafka produce my-topic \
  --message '{"id": 1}' \
  --transactional \
  --transactional-id my-transaction-id
```

### Exactly-Once Semantics (EOS)

```bash
npm run kafka consume my-topic \
  --group my-group \
  --isolation-level read_committed
```

### Message Compression

```bash
npm run kafka produce my-topic \
  --message "data" \
  --compression gzip  # gzip, snappy, lz4, zstd
```

### Custom Partitioner

```bash
npm run kafka produce my-topic \
  --key user-123 \
  --message "data" \
  --partitioner murmur2  # murmur2, default, round-robin
```

### Batch Produce

```bash
npm run kafka produce my-topic \
  --batch @messages.json \
  --batch-size 1000 \
  --linger-ms 10
```

### Parallel Consume

```bash
npm run kafka consume my-topic \
  --group my-group \
  --workers 4  # Parallel processing
```

## Configuration Reference

### Complete .env Example

```bash
# === Deployment Type ===
KAFKA_DEPLOYMENT_TYPE=confluent-cloud  # apache, confluent-platform, confluent-cloud, aws-msk, azure-eventhubs

# === Kafka Cluster ===
KAFKA_BROKERS=broker1:9092,broker2:9092,broker3:9092
KAFKA_CLIENT_ID=ailey-kafka-client
KAFKA_REQUEST_TIMEOUT=30000
KAFKA_CONNECTION_TIMEOUT=10000
KAFKA_RETRY_RETRIES=5
KAFKA_RETRY_INITIAL_RETRY_TIME=300

# === Authentication ===
KAFKA_SASL_MECHANISM=SCRAM-SHA-512  # PLAIN, SCRAM-SHA-256, SCRAM-SHA-512, AWS_MSK_IAM, OAUTHBEARER
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret

# === SSL/TLS ===
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA=/path/to/ca-cert.pem
KAFKA_SSL_CERT=/path/to/client-cert.pem
KAFKA_SSL_KEY=/path/to/client-key.pem
KAFKA_SSL_KEY_PASSWORD=optional
KAFKA_SSL_REJECT_UNAUTHORIZED=true

# === Schema Registry ===
SCHEMA_REGISTRY_URL=http://localhost:8081
SCHEMA_REGISTRY_API_KEY=sr-key
SCHEMA_REGISTRY_API_SECRET=sr-secret
SCHEMA_REGISTRY_CACHE_CAPACITY=1000

# === Kafka Connect ===
KAFKA_CONNECT_URL=http://localhost:8083
KAFKA_CONNECT_AUTH_USERNAME=connect-user
KAFKA_CONNECT_AUTH_PASSWORD=connect-password

# === ksqlDB ===
KSQLDB_URL=http://localhost:8088
KSQLDB_API_KEY=ksql-key
KSQLDB_API_SECRET=ksql-secret

# === RBAC (Confluent) ===
KAFKA_RBAC_ENABLED=true
KAFKA_MDS_URL=http://localhost:8090
KAFKA_MDS_TOKEN=bearer-token

# === AWS (for MSK) ===
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# === Producer Defaults ===
KAFKA_PRODUCER_ACKS=all
KAFKA_PRODUCER_COMPRESSION=snappy
KAFKA_PRODUCER_BATCH_SIZE=16384
KAFKA_PRODUCER_LINGER_MS=10

# === Consumer Defaults ===
KAFKA_CONSUMER_SESSION_TIMEOUT=30000
KAFKA_CONSUMER_HEARTBEAT_INTERVAL=3000
KAFKA_CONSUMER_AUTO_COMMIT_INTERVAL=5000
KAFKA_CONSUMER_FETCH_MIN_BYTES=1
KAFKA_CONSUMER_FETCH_MAX_WAIT=500
```

## Troubleshooting

### Connection Issues

**Problem**: Cannot connect to Kafka brokers

**Solutions**:
```bash
# Verify brokers are reachable
telnet broker1 9092

# Check authentication
npm run kafka test --verbose

# Verify SSL certificates
openssl s_client -connect broker1:9092 -CAfile ca-cert.pem
```

### Authentication Errors

**Problem**: SASL authentication failed

**Solutions**:
- Verify credentials in `.env` file
- Check SASL mechanism matches broker configuration
- Ensure user has required permissions
- For Confluent Cloud, regenerate API keys

### Schema Registry Issues

**Problem**: Schema validation failing

**Solutions**:
```bash
# Verify schema compatibility
npm run kafka schema check my-subject --schema @new-schema.avsc

# Update compatibility mode
npm run kafka schema compatibility my-subject --level BACKWARD_TRANSITIVE
```

### Consumer Lag

**Problem**: Consumer group falling behind

**Solutions**:
```bash
# Check lag
npm run kafka group lag my-group

# Increase parallelism
npm run kafka consume my-topic --group my-group --workers 8

# Reset to latest
npm run kafka group reset my-group --topic my-topic --to-latest
```

### Topic Not Found

**Problem**: Topic doesn't exist

**Solutions**:
```bash
# List all topics
npm run kafka topic list

# Create topic
npm run kafka topic create my-topic --partitions 3 --replication-factor 2

# Enable auto.create.topics (if allowed)
npm run kafka cluster update-config --config auto.create.topics.enable=true
```

## API Reference

See [API Documentation](./references/API.md) for complete TypeScript API reference.

## Examples

See [examples/](./examples/) directory for:
- Basic producer/consumer
- Schema Registry integration
- Kafka Connect management
- ksqlDB stream processing
- Transaction examples
- Error handling patterns

## Best Practices

1. **Always use consumer groups** for parallel processing
2. **Enable idempotence** for exactly-once semantics
3. **Use schema validation** for data quality
4. **Monitor consumer lag** regularly
5. **Set appropriate retention** policies
6. **Use compression** for large messages
7. **Implement error handling** and retries
8. **Use transactions** for multi-topic writes
9. **Secure with SASL/SSL** in production
10. **Monitor cluster metrics** proactively

## Resources

- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Documentation](https://docs.confluent.io/)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Schema Registry API](https://docs.confluent.io/platform/current/schema-registry/develop/api.html)
- [Kafka Connect API](https://docs.confluent.io/platform/current/connect/references/restapi.html)
- [ksqlDB Documentation](https://docs.ksqldb.io/)

---

version: 1.0.0
updated: 2026-02-01
reviewed: 2026-02-01
score: 4.7
---
