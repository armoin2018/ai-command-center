# Kafka Examples

This directory contains example configurations and schemas for the ailey-data-kafka skill.

## Directory Structure

```
examples/
├── schemas/              # Schema Registry examples
│   ├── user.avsc        # Avro user schema
│   ├── order.avsc       # Avro order schema with nested types
│   └── config.json      # JSON Schema example
├── connectors/          # Kafka Connect configurations
│   ├── postgres-source.json       # Debezium PostgreSQL source
│   └── elasticsearch-sink.json    # Elasticsearch sink
└── batch-messages.json  # Batch message example
```

## Usage Examples

### Schema Registry

**Register Avro Schema:**
```bash
npm run kafka schema register user-value --type AVRO --schema @examples/schemas/user.avsc
```

**Register JSON Schema:**
```bash
npm run kafka schema register config-value --type JSON --schema @examples/schemas/config.json
```

**Produce with Schema Validation:**
```bash
npm run kafka produce users --schema user-value --message '{"id": 1, "username": "alice", "email": "alice@example.com", "created_at": 1706832000000, "active": true}'
```

### Kafka Connect

**Create PostgreSQL Source Connector:**
```bash
npm run kafka connect create @examples/connectors/postgres-source.json
```

**Create Elasticsearch Sink Connector:**
```bash
npm run kafka connect create @examples/connectors/elasticsearch-sink.json
```

**Check Connector Status:**
```bash
npm run kafka connect status postgres-source-connector
```

### Batch Production

**Produce Multiple Messages:**
```bash
npm run kafka produce user-events --batch @examples/batch-messages.json
```

## Creating Your Own Examples

### Custom Avro Schema

Create a new `.avsc` file with your schema definition:

```json
{
  "type": "record",
  "name": "MyRecord",
  "namespace": "com.mycompany",
  "fields": [
    {"name": "field1", "type": "string"},
    {"name": "field2", "type": "int"}
  ]
}
```

### Custom Connector

Create a new connector JSON file:

```json
{
  "name": "my-connector",
  "config": {
    "connector.class": "com.example.MyConnector",
    "tasks.max": "1",
    "topics": "my-topic"
  }
}
```

## Best Practices

1. **Schema Evolution**: Use compatible schema changes (add optional fields, not remove required ones)
2. **Connector Configuration**: Always test connectors in development first
3. **Batch Size**: Keep batch messages under 1MB for optimal performance
4. **Error Handling**: Configure dead letter queues for connector errors

## Resources

- [Avro Schema Documentation](https://avro.apache.org/docs/current/spec.html)
- [JSON Schema Documentation](https://json-schema.org/)
- [Kafka Connect Connectors](https://www.confluent.io/hub/)
- [Debezium Connectors](https://debezium.io/documentation/reference/connectors/)
