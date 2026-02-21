# Kafka Troubleshooting Guide

## Connection Issues

### Cannot Connect to Brokers

**Symptoms:**
- `Connection refused`
- `Timeout` errors
- `UnknownHostException`

**Solutions:**

1. **Verify Broker Accessibility**
   ```bash
   telnet broker-hostname 9092
   # Or
   nc -zv broker-hostname 9092
   ```

2. **Check DNS Resolution**
   ```bash
   nslookup broker-hostname
   ping broker-hostname
   ```

3. **Verify Firewall Rules**
   - Ensure ports 9092-9093 are open
   - Check security groups (AWS)
   - Verify network ACLs

4. **Test with Verbose Logging**
   ```bash
   npm run kafka test --verbose
   ```

### SSL/TLS Connection Failures

**Symptoms:**
- `SSLHandshakeException`
- Certificate validation errors

**Solutions:**

1. **Verify Certificate Chain**
   ```bash
   openssl s_client -connect broker:9093 -CAfile ca-cert.pem -showcerts
   ```

2. **Check Certificate Validity**
   ```bash
   openssl x509 -in client-cert.pem -text -noout
   ```

3. **Verify Hostname in Certificate**
   - Ensure CN or SAN matches broker hostname
   - Use IP SANs if connecting by IP

4. **Disable Hostname Verification (Dev Only)**
   ```bash
   KAFKA_SSL_REJECT_UNAUTHORIZED=false
   ```

## Authentication Issues

### SASL Authentication Failed

**Symptoms:**
- `Authentication failed`
- `Invalid credentials`

**Solutions:**

1. **Verify Credentials**
   ```bash
   # Check .env file
   cat .env | grep KAFKA_SASL
   ```

2. **Check SASL Mechanism**
   ```bash
   # Ensure mechanism matches broker config
   KAFKA_SASL_MECHANISM=SCRAM-SHA-512
   ```

3. **For Confluent Cloud:**
   - Regenerate API keys
   - Ensure API key has correct permissions
   - Check API key is for correct cluster

4. **For AWS MSK IAM:**
   - Verify IAM policy allows kafka-cluster actions
   - Check AWS credentials are valid
   - Ensure region is correct

### mTLS Authentication Failed

**Symptoms:**
- `Certificate verification failed`
- `Unknown CA`

**Solutions:**

1. **Verify CA Certificate**
   ```bash
   openssl verify -CAfile ca-cert.pem client-cert.pem
   ```

2. **Check Key Format**
   ```bash
   # Should not be encrypted
   openssl rsa -in client-key.pem -check
   ```

3. **Decrypt Key if Encrypted**
   ```bash
   openssl rsa -in encrypted-key.pem -out decrypted-key.pem
   ```

## Producer Issues

### Messages Not Appearing in Topic

**Symptoms:**
- No errors but messages missing
- Silent failures

**Solutions:**

1. **Check Topic Exists**
   ```bash
   npm run kafka topic list | grep my-topic
   ```

2. **Verify Auto-Create is Enabled**
   ```bash
   npm run kafka cluster broker-config 1 | grep auto.create.topics
   ```

3. **Check Producer Acks**
   ```bash
   # Ensure acks is set appropriately
   KAFKA_PRODUCER_ACKS=all
   ```

4. **Look for Serialization Errors**
   - Check schema compatibility
   - Verify message format

### Producer Slow/High Latency

**Symptoms:**
- Long publish times
- Timeouts
- Backpressure

**Solutions:**

1. **Optimize Batching**
   ```bash
   KAFKA_PRODUCER_BATCH_SIZE=32768
   KAFKA_PRODUCER_LINGER_MS=10
   ```

2. **Increase Buffer Memory**
   ```bash
   KAFKA_PRODUCER_BUFFER_MEMORY=67108864  # 64MB
   ```

3. **Check Compression**
   ```bash
   # Try different compression types
   KAFKA_PRODUCER_COMPRESSION=lz4
   ```

4. **Monitor Broker Health**
   ```bash
   npm run kafka cluster metrics
   ```

## Consumer Issues

### Consumer Lag Increasing

**Symptoms:**
- Growing lag
- Messages delayed
- Consumer group falling behind

**Solutions:**

1. **Check Consumer Lag**
   ```bash
   npm run kafka group lag my-consumer-group
   ```

2. **Scale Consumer Group**
   ```bash
   # Add more consumer instances
   npm run kafka consume my-topic --group my-group --workers 8
   ```

3. **Optimize Consumer Fetch**
   ```bash
   KAFKA_CONSUMER_FETCH_MIN_BYTES=10240
   KAFKA_CONSUMER_FETCH_MAX_WAIT=500
   ```

4. **Check Processing Time**
   - Profile consumer code
   - Optimize slow operations
   - Consider async processing

### Consumer Rebalancing Frequently

**Symptoms:**
- Frequent `Rebalancing` log messages
- Consumer stops processing periodically

**Solutions:**

1. **Increase Session Timeout**
   ```bash
   KAFKA_CONSUMER_SESSION_TIMEOUT=45000
   KAFKA_CONSUMER_HEARTBEAT_INTERVAL=3000
   ```

2. **Reduce Max Poll Interval**
   ```bash
   KAFKA_CONSUMER_MAX_POLL_INTERVAL=300000  # 5 minutes
   ```

3. **Process Messages Faster**
   - Batch processing
   - Async I/O operations

4. **Check Broker Logs**
   - Look for broker issues causing rebalances

### Messages Being Skipped

**Symptoms:**
- Missing messages in consumer
- Offset gaps

**Solutions:**

1. **Check Offset Management**
   ```bash
   # Don't auto-commit before processing
   KAFKA_CONSUMER_ENABLE_AUTO_COMMIT=false
   ```

2. **Verify Offset Commits**
   - Commit after successful processing
   - Use transactions for exactly-once

3. **Check for Deserialization Errors**
   - Catch and log errors
   - Don't skip on error

4. **Reset Offsets if Needed**
   ```bash
   npm run kafka group reset my-group --topic my-topic --to-datetime "2026-02-01T00:00:00Z"
   ```

## Schema Registry Issues

### Schema Not Found

**Symptoms:**
- `Subject not found`
- Serialization errors

**Solutions:**

1. **List Available Subjects**
   ```bash
   npm run kafka schema list
   ```

2. **Register Schema**
   ```bash
   npm run kafka schema register my-subject-value --type AVRO --schema @schema.avsc
   ```

3. **Check Schema Registry URL**
   ```bash
   curl $SCHEMA_REGISTRY_URL/subjects
   ```

### Schema Compatibility Error

**Symptoms:**
- `Incompatible schema`
- Schema registration fails

**Solutions:**

1. **Check Compatibility**
   ```bash
   npm run kafka schema check my-subject --schema @new-schema.avsc
   ```

2. **Update Compatibility Level**
   ```bash
   npm run kafka schema compatibility my-subject --level BACKWARD_TRANSITIVE
   ```

3. **Make Schema Compatible**
   - Add optional fields only
   - Don't remove required fields
   - Don't change field types

## Kafka Connect Issues

### Connector Failing

**Symptoms:**
- Connector state: `FAILED`
- Tasks failing

**Solutions:**

1. **Check Connector Status**
   ```bash
   npm run kafka connect status my-connector
   ```

2. **Review Connector Logs**
   - Check Connect worker logs
   - Look for error stack traces

3. **Common Issues:**
   - Database connectivity
   - Invalid credentials
   - Missing permissions
   - Topic not found

4. **Restart Connector**
   ```bash
   npm run kafka connect restart my-connector
   ```

### Connector Not Processing Data

**Symptoms:**
- Connector running but no data flowing
- No errors shown

**Solutions:**

1. **Check Source Database**
   - Verify data exists
   - Check table permissions
   - Ensure CDC is enabled

2. **Verify Topic Creation**
   ```bash
   npm run kafka topic list
   ```

3. **Check Converter Configuration**
   - Ensure correct converters
   - Verify schema compatibility

4. **Examine Offset Storage**
   - Check offset topic exists
   - Verify permissions

## ksqlDB Issues

### Query Execution Fails

**Symptoms:**
- Query errors
- Syntax errors

**Solutions:**

1. **Validate SQL Syntax**
   ```bash
   npm run kafka ksql execute "SHOW STREAMS;"
   ```

2. **Check Stream/Table Exists**
   ```bash
   npm run kafka ksql list streams
   npm run kafka ksql list tables
   ```

3. **Verify Topic Availability**
   ```bash
   npm run kafka topic list
   ```

4. **Check ksqlDB Server Logs**
   - Look for detailed error messages
   - Check for resource constraints

### Stream Processing Slow

**Symptoms:**
- High latency
- Processing delays

**Solutions:**

1. **Scale ksqlDB Servers**
   - Add more ksqlDB instances
   - Increase ksqlDB threads

2. **Optimize Queries**
   - Add WHERE clauses
   - Limit JOINs
   - Use windowing appropriately

3. **Check Topic Partitions**
   - More partitions = more parallelism

## ACL Issues

### Permission Denied

**Symptoms:**
- `Not authorized to access topic`
- `Access denied`

**Solutions:**

1. **List ACLs for Principal**
   ```bash
   npm run kafka acl list --principal User:myapp
   ```

2. **Grant Required Permissions**
   ```bash
   npm run kafka acl create --allow \
     --principal User:myapp \
     --operation READ \
     --topic my-topic
   ```

3. **Check Consumer Group ACLs**
   ```bash
   npm run kafka acl create --allow \
     --principal User:myapp \
     --operation READ \
     --group my-consumer-group
   ```

## Performance Issues

### High CPU on Brokers

**Symptoms:**
- Broker CPU at 100%
- Slow responses

**Solutions:**

1. **Check Compression**
   - Use appropriate compression
   - Monitor compression ratio

2. **Monitor Request Rates**
   - Look for spike in requests
   - Check for DoS attacks

3. **Optimize Topic Configuration**
   - Reduce replication factor (if acceptable)
   - Tune segment size

### High Disk I/O

**Symptoms:**
- Disk saturation
- Slow writes

**Solutions:**

1. **Use Faster Disks**
   - SSDs preferred
   - RAID 10 for redundancy

2. **Optimize Retention**
   ```bash
   npm run kafka topic update my-topic --config retention.ms=259200000  # 3 days
   ```

3. **Enable Compression**
   - Reduces disk writes
   - Saves storage space

### High Network Usage

**Symptoms:**
- Network saturation
- Slow data transfer

**Solutions:**

1. **Enable Compression**
   - Reduces network traffic
   - Especially for high-throughput topics

2. **Optimize Replication**
   - Balance replication factor vs. throughput
   - Use rack awareness

3. **Monitor Replica Fetcher Threads**
   - Tune num.replica.fetchers

## Getting Help

### Enable Verbose Logging

```bash
npm run kafka test --verbose
```

### Collect Diagnostic Information

1. **Broker Logs**
2. **Client Logs**
3. **Network Traces**
4. **Configuration Files**

### Community Resources

- [Apache Kafka Users Mailing List](https://kafka.apache.org/contact)
- [Confluent Community Forum](https://forum.confluent.io/)
- [Kafka on Stack Overflow](https://stackoverflow.com/questions/tagged/apache-kafka)

---

For more information, see:
- [SKILL.md](../SKILL.md)
- [BEST_PRACTICES.md](./BEST_PRACTICES.md)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
