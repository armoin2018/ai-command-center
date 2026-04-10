# AI-ley Kafka Setup Guide

Complete setup instructions for different Kafka deployment types.

## Deployment Type Detection

The skill automatically detects your Kafka deployment type based on configuration:

- **Apache Kafka**: Open-source self-hosted
- **Confluent Platform**: Enterprise self-hosted with Schema Registry, Connect, ksqlDB
- **Confluent Cloud**: Fully managed cloud service
- **AWS MSK**: AWS managed Kafka
- **Azure Event Hubs**: Azure Kafka-compatible service

Set `KAFKA_DEPLOYMENT_TYPE` in your `.env` file.

## Getting Started

### Option 1: Confluent Cloud (Easiest)

1. **Sign Up**
   - Go to https://confluent.cloud/
   - Create free account (includes $400 credit)

2. **Create Cluster**
   - Click "Create cluster"
   - Choose "Basic" for development
   - Select region closest to you

3. **Generate API Keys**
   - Navigate to your cluster
   - Go to "Data integration" → "API keys"
   - Click "Create key" → "Global access"
   - Save the API Key and Secret

4. **Configure AI-ley**

Create `~/.vscode/.env`:

```bash
KAFKA_DEPLOYMENT_TYPE=confluent-cloud
KAFKA_BROKERS=pkc-xxxxx.us-east-1.aws.confluent.cloud:9092
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=YOUR_API_KEY
KAFKA_SASL_PASSWORD=YOUR_API_SECRET
KAFKA_SSL_ENABLED=true

# Schema Registry (optional)
SCHEMA_REGISTRY_URL=https://psrc-xxxxx.us-east-1.aws.confluent.cloud
SCHEMA_REGISTRY_API_KEY=SR_API_KEY
SCHEMA_REGISTRY_API_SECRET=SR_API_SECRET
```

5. **Test**
```bash
npm run kafka test
```

### Option 2: Apache Kafka (Self-Hosted)

1. **Download Kafka**

```bash
wget https://downloads.apache.org/kafka/3.7.0/kafka_2.13-3.7.0.tgz
tar -xzf kafka_2.13-3.7.0.tgz
cd kafka_2.13-3.7.0
```

2. **Start Kafka (KRaft Mode - Recommended)**

```bash
# Generate cluster ID
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"

# Format storage
bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c config/kraft/server.properties

# Start Kafka
bin/kafka-server-start.sh config/kraft/server.properties
```

3. **Configure AI-ley**

Create `~/.vscode/.env`:

```bash
KAFKA_DEPLOYMENT_TYPE=apache
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=ailey-kafka-client
```

4. **Test**
```bash
npm run kafka test
```

### Option 3: AWS MSK

1. **Create MSK Cluster**

```bash
aws kafka create-cluster \
  --cluster-name my-kafka-cluster \
  --broker-node-group-info file://broker-info.json \
  --kafka-version 3.5.1 \
  --number-of-broker-nodes 3
```

2. **Get Bootstrap Servers**

```bash
aws kafka get-bootstrap-brokers --cluster-arn <CLUSTER_ARN>
```

3. **Configure IAM Authentication**

Attach policy to your IAM user/role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:Connect",
        "kafka-cluster:AlterCluster",
        "kafka-cluster:DescribeCluster"
      ],
      "Resource": "arn:aws:kafka:*:*:cluster/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:*Topic*",
        "kafka-cluster:WriteData",
        "kafka-cluster:ReadData"
      ],
      "Resource": "arn:aws:kafka:*:*:topic/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kafka-cluster:AlterGroup",
        "kafka-cluster:DescribeGroup"
      ],
      "Resource": "arn:aws:kafka:*:*:group/*"
    }
  ]
}
```

4. **Configure AI-ley**

Create `~/.vscode/.env`:

```bash
KAFKA_DEPLOYMENT_TYPE=aws-msk
KAFKA_BROKERS=b-1.mycluster.xxxxx.kafka.us-east-1.amazonaws.com:9092
KAFKA_SASL_MECHANISM=AWS_MSK_IAM

# AWS Credentials
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY
```

5. **Test**
```bash
npm run kafka test
```

## Authentication Methods

### SASL/SCRAM

```bash
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=admin-secret
```

### mTLS (Mutual TLS)

```bash
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA=/path/to/ca-cert.pem
KAFKA_SSL_CERT=/path/to/client-cert.pem
KAFKA_SSL_KEY=/path/to/client-key.pem
KAFKA_SSL_KEY_PASSWORD=optional
```

### SASL/PLAIN (Confluent Cloud)

```bash
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=API_KEY
KAFKA_SASL_PASSWORD=API_SECRET
KAFKA_SSL_ENABLED=true
```

## Troubleshooting

### Cannot Connect to Brokers

1. Verify brokers are reachable:
```bash
telnet broker-host 9092
```

2. Check authentication:
```bash
npm run kafka test --verbose
```

3. Verify SSL certificates:
```bash
openssl s_client -connect broker:9092 -CAfile ca.pem
```

### Authentication Failed

- Double-check credentials in `.env`
- Verify SASL mechanism matches broker configuration
- For Confluent Cloud, regenerate API keys
- For AWS MSK IAM, verify IAM policy

### Topic Not Found

```bash
# List all topics
npm run kafka topic list

# Create topic
npm run kafka topic create my-topic --partitions 3 --replication-factor 2
```

## Next Steps

After successful setup:

1. Review [SKILL.md](./SKILL.md) for all features
2. Try example workflows
3. Configure Schema Registry (if available)
4. Set up Kafka Connect (if available)
5. Explore ksqlDB (if available)

## Support Resources

- Confluent Cloud: https://support.confluent.io/
- Apache Kafka: https://kafka.apache.org/documentation/
- AWS MSK: https://docs.aws.amazon.com/msk/
- KafkaJS: https://kafka.js.org/
