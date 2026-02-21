# Kafka Quick Reference

## Setup
```bash
cd .github/skills/ailey-data-kafka
npm install
cp .env.example .env
# Edit .env with your credentials
npm run kafka test
```

## Common Commands

### Produce
```bash
# Simple message
npm run kafka produce my-topic --message "Hello"

# JSON with key
npm run kafka produce events --key user-123 --message '{"event": "login"}'

# Batch from file
npm run kafka produce logs --batch messages.json
```

### Consume
```bash
# From beginning
npm run kafka consume my-topic --from-beginning

# With consumer group
npm run kafka consume my-topic --group my-group

# Limited messages
npm run kafka consume my-topic --max 100
```

### Topics
```bash
# List
npm run kafka topic list

# Create
npm run kafka topic create my-topic --partitions 3 --replication-factor 2

# Describe
npm run kafka topic describe my-topic

# Delete
npm run kafka topic delete my-topic
```

### Consumer Groups
```bash
# List groups
npm run kafka group list

# Describe group
npm run kafka group describe my-group

# Check lag
npm run kafka group lag my-group

# Reset offsets
npm run kafka group reset my-group --topic my-topic --to-latest
```

### Schema Registry
```bash
# List subjects
npm run kafka schema list

# Register schema
npm run kafka schema register user-value --type AVRO --schema @user.avsc

# Get schema
npm run kafka schema get user-value --version latest
```

### Kafka Connect
```bash
# List connectors
npm run kafka connect list

# Create connector
npm run kafka connect create @postgres-source.json

# Get status
npm run kafka connect status postgres-source

# Restart
npm run kafka connect restart postgres-source
```

### ksqlDB
```bash
# Execute query
npm run kafka ksql query "SHOW STREAMS;"

# Create stream
npm run kafka ksql execute "CREATE STREAM..."

# List streams
npm run kafka ksql list streams
```

## Authentication Quick Config

### Confluent Cloud
```bash
KAFKA_DEPLOYMENT_TYPE=confluent-cloud
KAFKA_BROKERS=pkc-xxx.aws.confluent.cloud:9092
KAFKA_SASL_MECHANISM=PLAIN
KAFKA_SASL_USERNAME=API_KEY
KAFKA_SASL_PASSWORD=API_SECRET
KAFKA_SSL_ENABLED=true
```

### Apache Kafka (Local)
```bash
KAFKA_DEPLOYMENT_TYPE=apache
KAFKA_BROKERS=localhost:9092
```

### AWS MSK (IAM)
```bash
KAFKA_DEPLOYMENT_TYPE=aws-msk
KAFKA_BROKERS=b-1.xxx.kafka.us-east-1.amazonaws.com:9092
KAFKA_SASL_MECHANISM=AWS_MSK_IAM
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
```

### Self-Hosted (SASL/SCRAM)
```bash
KAFKA_DEPLOYMENT_TYPE=apache
KAFKA_BROKERS=kafka1:9092,kafka2:9092
KAFKA_SASL_MECHANISM=SCRAM-SHA-512
KAFKA_SASL_USERNAME=admin
KAFKA_SASL_PASSWORD=secret
```

### Self-Hosted (mTLS)
```bash
KAFKA_DEPLOYMENT_TYPE=apache
KAFKA_BROKERS=kafka1:9093
KAFKA_SSL_ENABLED=true
KAFKA_SSL_CA=/path/to/ca.pem
KAFKA_SSL_CERT=/path/to/client-cert.pem
KAFKA_SSL_KEY=/path/to/client-key.pem
```

## Troubleshooting

### Connection Fails
```bash
# Test verbose
npm run kafka test --verbose

# Check broker reachability
telnet broker-host 9092

# Verify SSL
openssl s_client -connect broker:9092 -CAfile ca.pem
```

### Auth Fails
- Double-check credentials in .env
- Regenerate API keys (Confluent Cloud)
- Verify IAM policy (AWS MSK)
- Check SASL mechanism matches broker

### Topic Not Found
```bash
# List topics
npm run kafka topic list

# Create topic
npm run kafka topic create my-topic --partitions 3
```

## Resources
- Full docs: [SKILL.md](./SKILL.md)
- Setup guide: [SETUP.md](./SETUP.md)
- Kafka docs: https://kafka.apache.org/documentation/
- KafkaJS: https://kafka.js.org/
