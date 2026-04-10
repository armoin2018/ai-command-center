# AI-ley Kafka Integration

Comprehensive Apache Kafka skill for AI-ley providing producer/consumer capabilities, Schema Registry, Kafka Connect, ksqlDB, and complete cluster management.

## Quick Setup

### 1. Install Dependencies

```bash
cd .github/skills/ailey-data-kafka
npm install
```

### 2. Configure Connection

Create one of these files with your Kafka configuration:
- `~/.vscode/.env` (global configuration)
- `.env` (project-level)
- `.env.local` (project-level, gitignored)

**Minimum Configuration:**

```bash
KAFKA_DEPLOYMENT_TYPE=confluent-cloud
KAFKA_BROKERS=pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=YOUR_API_KEY
KAFKA_SASL_PASSWORD=YOUR_API_SECRET
KAFKA_SSL_ENABLED=true
```

### 3. Test Connection

```bash
npm run kafka test
```

## Common Commands

```bash
# Produce a message
npm run kafka produce my-topic --message "Hello Kafka"

# Consume messages
npm run kafka consume my-topic --from-beginning

# List topics
npm run kafka topic list

# Create a topic
npm run kafka topic create my-topic --partitions 3 --replication-factor 2
```

## Full Documentation

See [SKILL.md](./SKILL.md) for complete documentation including:
- All supported Kafka deployments (Apache, Confluent, AWS MSK, Azure)
- Authentication methods (SASL/SCRAM, mTLS, IAM, OAuth)
- Complete workflow examples
- Schema Registry integration
- Kafka Connect management
- ksqlDB operations
- ACL and RBAC configuration
- Troubleshooting guide

## Getting Access

### Confluent Cloud (Recommended for Quick Start)

1. Sign up at [confluent.cloud](https://confluent.cloud/)
2. Create a cluster (free tier available)
3. Generate API keys
4. Configure `.env` with your credentials

### Self-Hosted Apache Kafka

1. Download from [kafka.apache.org](https://kafka.apache.org/downloads)
2. Follow setup instructions in [SKILL.md](./SKILL.md)
3. Configure local broker settings

### AWS MSK

1. Access AWS Console
2. Create MSK cluster
3. Configure authentication (IAM recommended)
4. Use provided bootstrap servers

## Support

- Full documentation: [SKILL.md](./SKILL.md)
- Kafka docs: [kafka.apache.org/documentation](https://kafka.apache.org/documentation/)
- Confluent docs: [docs.confluent.io](https://docs.confluent.io/)
- KafkaJS docs: [kafka.js.org](https://kafka.js.org/)
