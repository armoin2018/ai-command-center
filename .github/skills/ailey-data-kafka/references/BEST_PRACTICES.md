# Kafka Best Practices

## Production Configuration

### Producer Best Practices

1. **Enable Idempotence**
   ```bash
   KAFKA_PRODUCER_ENABLE_IDEMPOTENCE=true
   ```
   - Prevents duplicate messages
   - Ensures exactly-once semantics

2. **Optimize Batching**
   ```bash
   KAFKA_PRODUCER_BATCH_SIZE=16384
   KAFKA_PRODUCER_LINGER_MS=10
   ```
   - Batch size: 16-32KB typical
   - Linger: 5-20ms for better throughput

3. **Use Compression**
   ```bash
   KAFKA_PRODUCER_COMPRESSION=snappy
   ```
   - Options: gzip, snappy, lz4, zstd
   - Snappy: Good balance of speed/compression
   - LZ4: Fastest, lowest CPU
   - GZIP: Best compression, highest CPU

4. **Set Appropriate Acks**
   ```bash
   KAFKA_PRODUCER_ACKS=all
   ```
   - `acks=0`: No acknowledgment (fastest, least reliable)
   - `acks=1`: Leader acknowledgment (balanced)
   - `acks=all`: All replicas (slowest, most reliable)

### Consumer Best Practices

1. **Use Consumer Groups**
   - Enables parallel processing
   - Automatic partition assignment
   - Fault tolerance

2. **Manage Offsets Carefully**
   ```bash
   KAFKA_CONSUMER_ENABLE_AUTO_COMMIT=false
   ```
   - Commit after processing, not before
   - Use manual commits for exactly-once

3. **Handle Rebalancing**
   ```bash
   KAFKA_CONSUMER_SESSION_TIMEOUT=30000
   KAFKA_CONSUMER_HEARTBEAT_INTERVAL=3000
   ```
   - Session timeout > 3x heartbeat interval
   - Increase for long-running processing

4. **Monitor Consumer Lag**
   ```bash
   npm run kafka group lag my-group
   ```
   - Track lag regularly
   - Scale consumers if lag increases

## Topic Configuration

### Partitioning Strategy

1. **Calculate Partitions**
   - Formula: `max(target throughput / partition throughput, consumer count)`
   - Example: 100MB/s target, 10MB/s per partition = 10 partitions
   - Over-partition for future growth

2. **Choose Partition Key Wisely**
   - Use key for related message ordering
   - Distribute evenly across partitions
   - Avoid hot partitions

### Retention Policies

1. **Time-Based Retention**
   ```bash
   npm run kafka topic create my-topic --config retention.ms=604800000  # 7 days
   ```

2. **Size-Based Retention**
   ```bash
   npm run kafka topic create my-topic --config retention.bytes=1073741824  # 1GB
   ```

3. **Compacted Topics**
   ```bash
   npm run kafka topic create user-profiles --config cleanup.policy=compact
   ```
   - For key-value stores
   - Keeps latest value per key

## Schema Management

### Schema Evolution Rules

1. **Backward Compatible** (Recommended)
   - Add optional fields
   - Remove optional fields
   - Widen field types
   
2. **Forward Compatible**
   - Remove optional fields
   - Add optional fields with defaults

3. **Full Compatible**
   - Intersection of backward and forward
   - Most restrictive, safest

### Schema Best Practices

1. **Use Meaningful Namespaces**
   ```json
   {
     "namespace": "com.company.domain.v1",
     "name": "User"
   }
   ```

2. **Document Fields**
   ```json
   {
     "name": "email",
     "type": "string",
     "doc": "User's primary email address"
   }
   ```

3. **Version Your Schemas**
   - Use semantic versioning
   - Test compatibility before deployment

## Performance Optimization

### Producer Performance

1. **Batch Size and Linger**
   - Larger batches = better throughput
   - Higher linger = more latency but better batching

2. **Buffer Memory**
   ```bash
   KAFKA_PRODUCER_BUFFER_MEMORY=33554432  # 32MB
   ```

3. **Max In-Flight Requests**
   ```bash
   KAFKA_PRODUCER_MAX_IN_FLIGHT=5
   ```

### Consumer Performance

1. **Fetch Size**
   ```bash
   KAFKA_CONSUMER_FETCH_MIN_BYTES=1
   KAFKA_CONSUMER_FETCH_MAX_WAIT=500
   ```

2. **Parallel Processing**
   ```bash
   npm run kafka consume my-topic --group my-group --workers 4
   ```

3. **Partition Assignment**
   - Round-robin (default)
   - Sticky (preferred for rebalancing)
   - Custom partitioners for specific needs

## Security Best Practices

### Authentication

1. **Use SASL/SCRAM in Production**
   - SHA-512 preferred over SHA-256
   - Rotate credentials regularly

2. **Enable TLS/SSL**
   - Always use SSL in production
   - Use mutual TLS (mTLS) for critical systems

3. **Implement ACLs**
   ```bash
   # Least privilege principle
   npm run kafka acl create --allow --principal User:app1 \
     --operation READ --topic app1-events
   ```

### Data Protection

1. **Encrypt Sensitive Data**
   - Use field-level encryption
   - Don't rely solely on transport encryption

2. **Implement Audit Logging**
   - Log all produce/consume operations
   - Monitor for anomalies

## Monitoring and Alerting

### Key Metrics

1. **Producer Metrics**
   - Record send rate
   - Record error rate
   - Request latency

2. **Consumer Metrics**
   - Consumer lag
   - Records consumed rate
   - Rebalance frequency

3. **Broker Metrics**
   - Disk usage
   - Network I/O
   - Request queue size

### Alert Thresholds

```yaml
alerts:
  consumer_lag:
    warning: 10000
    critical: 50000
  
  disk_usage:
    warning: 80%
    critical: 90%
  
  under_replicated_partitions:
    warning: 1
    critical: 5
```

## Error Handling

### Producer Error Handling

1. **Retry Configuration**
   ```bash
   KAFKA_RETRY_RETRIES=10
   KAFKA_RETRY_INITIAL_RETRY_TIME=300
   ```

2. **Error Handling Strategy**
   - Transient errors: Retry
   - Serialization errors: Log and skip
   - Network errors: Exponential backoff

### Consumer Error Handling

1. **Dead Letter Queue**
   - Send failed messages to DLQ topic
   - Process separately for debugging

2. **Circuit Breaker**
   - Stop consuming after N failures
   - Prevent cascade failures

## Disaster Recovery

### Backup Strategies

1. **MirrorMaker 2**
   - Replicate to secondary cluster
   - Configure for disaster recovery

2. **Topic Snapshots**
   - Export critical topics periodically
   - Store in object storage

### Recovery Procedures

1. **Consumer Offset Reset**
   ```bash
   npm run kafka group reset my-group --topic my-topic --to-datetime "2026-02-01T00:00:00Z"
   ```

2. **Topic Recreation**
   - Document topic configurations
   - Automate with infrastructure as code

## Testing Best Practices

### Integration Testing

1. **Use Testcontainers**
   - Spin up Kafka in Docker
   - Test with real Kafka, not mocks

2. **Test Schema Evolution**
   - Test backward/forward compatibility
   - Validate schema registry integration

### Load Testing

1. **kafka-producer-perf-test**
   ```bash
   kafka-producer-perf-test \
     --topic test \
     --num-records 1000000 \
     --record-size 1024 \
     --throughput -1 \
     --producer-props bootstrap.servers=localhost:9092
   ```

2. **Monitor During Load**
   - Watch CPU, memory, disk I/O
   - Identify bottlenecks early

## Cost Optimization

### Confluent Cloud

1. **Right-Size Clusters**
   - Start with Basic, upgrade if needed
   - Monitor usage patterns

2. **Optimize Retention**
   - Don't retain indefinitely
   - Use tiered storage for old data

3. **Compress Data**
   - Reduces storage costs
   - Reduces network egress

### Self-Hosted

1. **Hardware Selection**
   - Fast SSDs for brokers
   - Adequate RAM for page cache
   - Network bandwidth > disk bandwidth

2. **Capacity Planning**
   - Plan for 2-3x current load
   - Monitor growth trends

---

For more details, see:
- [SKILL.md](../SKILL.md)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [Confluent Best Practices](https://docs.confluent.io/platform/current/kafka/deployment.html)
