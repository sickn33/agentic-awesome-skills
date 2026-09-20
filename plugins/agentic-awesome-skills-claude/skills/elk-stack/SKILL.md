---
name: elk-stack
description: Deploy and manage the ELK Stack (Elasticsearch, Logstash, Kibana) for
  log aggregation and analysis.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant platform CLIs (kubectl, helm, terraform, git,
  CI runners) and authorized access to the target environment. Docs-only; helper scripts
  and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# ELK Stack

Centralize and analyze logs with Elasticsearch, Logstash, and Kibana.

## When to Use This Skill

Use this skill when:
- Centralizing logs from multiple sources
- Building log search and analytics platforms
- Creating log-based dashboards and alerts
- Implementing full-text search for logs
- Processing and transforming log data

## Prerequisites

- Docker or server infrastructure
- Sufficient disk space for log storage
- Network access from log sources

## Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    volumes:
      - ./logstash/pipeline:/usr/share/logstash/pipeline
      - ./logstash/config:/usr/share/logstash/config
    ports:
      - "5044:5044"
      - "5000:5000"
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

  filebeat:
    image: docker.elastic.co/beats/filebeat:8.11.0
    user: root
    volumes:
      - ./filebeat/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - logstash

volumes:
  elasticsearch-data:
```

## Elasticsearch Configuration

### Index Templates

```json
PUT _index_template/logs-template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.lifecycle.name": "logs-policy"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "message": { "type": "text" },
        "level": { "type": "keyword" },
        "service": { "type": "keyword" },
        "host": { "type": "keyword" },
        "trace_id": { "type": "keyword" }
      }
    }
  }
}
```

### Index Lifecycle Management

```json
PUT _ilm/policy/logs-policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

## Logstash Pipeline

### Basic Pipeline

```ruby
# logstash/pipeline/main.conf
input {
  beats {
    port => 5044
  }
  
  tcp {
    port => 5000
    codec => json_lines
  }
}

filter {
  # Parse JSON logs
  if [message] =~ /^\{/ {
    json {
      source => "message"
    }
  }
  
  # Parse timestamp
  date {
    match => ["timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss"]
    target => "@timestamp"
  }
  
  # Add environment tag
  mutate {
    add_field => { "environment" => "production" }
  }
  
  # Grok pattern for nginx logs
  if [type] == "nginx" {
    grok {
      match => {
        "message" => '%{IPORHOST:client_ip} - %{USER:user} \[%{HTTPDATE:timestamp}\] "%{WORD:method} %{URIPATHPARAM:request} HTTP/%{NUMBER:http_version}" %{NUMBER:status} %{NUMBER:bytes}'
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }
}
```

### Advanced Filtering

```ruby
filter {
  # Parse application logs
  grok {
    match => {
      "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:level} \[%{DATA:service}\] %{GREEDYDATA:log_message}"
    }
  }
  
  # Extract trace ID from message
  if [log_message] =~ /trace_id=/ {
    grok {
      match => { "log_message" => "trace_id=%{UUID:trace_id}" }
    }
  }
  
  # GeoIP lookup
  if [client_ip] {
    geoip {
      source => "client_ip"
      target => "geoip"
    }
  }
  
  # Drop debug logs in production
  if [level] == "DEBUG" and [environment] == "production" {
    drop {}
  }
  
  # Enrich with lookup
  translate {
    field => "status"
    destination => "status_description"
    dictionary => {
      "200" => "OK"
      "404" => "Not Found"
      "500" => "Internal Server Error"
    }
  }
}
```

## Filebeat Configuration

```yaml
# filebeat/filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - '/var/lib/docker/containers/*/*.log'
    processors:
      - add_docker_metadata:
          host: "unix:///var/run/docker.sock"

  - type: log
    enabled: true
    paths:
      - /var/log/nginx/*.log
    tags: ["nginx"]
    fields:
      type: nginx

output.logstash:
  hosts: ["logstash:5044"]

logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
```

## Elasticsearch Queries

### Basic Queries

```json
// Search all logs
GET logs-*/_search
{
  "query": {
    "match_all": {}
  }
}

// Search by keyword
GET logs-*/_search
{
  "query": {
    "match": {
      "message": "error"
    }
  }
}

// Filter by field
GET logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "level": "ERROR" } },
        { "range": { "@timestamp": { "gte": "now-1h" } } }
      ],
      "filter": [
        { "term": { "service": "api-gateway" } }
      ]
    }
  }
}
```

### Aggregations

```json
// Count by log level
GET logs-*/_search
{
  "size": 0,
  "aggs": {
    "log_levels": {
      "terms": { "field": "level" }
    }
  }
}

// Error rate over time
GET logs-*/_search
{
  "size": 0,
  "aggs": {
    "errors_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "fixed_interval": "5m"
      },
      "aggs": {
        "error_count": {
          "filter": { "term": { "level": "ERROR" } }
        }
      }
    }
  }
}
```

## Kibana Setup

### Index Patterns

1. Go to Stack Management → Index Patterns
2. Create pattern: `logs-*`
3. Set time field: `@timestamp`

### Saved Searches

Create saved searches for common queries:
- `level:ERROR` - All errors
- `service:api-gateway AND level:ERROR` - API gateway errors
- `response_time:>1000` - Slow requests

### Visualizations

Common visualization types:
- **Line Chart**: Error rate over time
- **Pie Chart**: Distribution by log level
- **Data Table**: Top error messages
- **Metric**: Total error count

### Dashboard Example

Create dashboard with:
1. Total log count (Metric)
2. Error rate trend (Line chart)
3. Logs by service (Pie chart)
4. Recent errors (Data table)
5. Log stream (Discover panel)

## Alerting

### Watcher (X-Pack)

```json
PUT _watcher/watch/error_alert
{
  "trigger": {
    "schedule": { "interval": "5m" }
  },
  "input": {
    "search": {
      "request": {
        "indices": ["logs-*"],
        "body": {
          "query": {
            "bool": {
              "must": [
                { "match": { "level": "ERROR" } },
                { "range": { "@timestamp": { "gte": "now-5m" } } }
              ]
            }
          }
        }
      }
    }
  },
  "condition": {
    "compare": { "ctx.payload.hits.total.value": { "gt": 100 } }
  },
  "actions": {
    "notify_slack": {
      "webhook": {
        "scheme": "https",
        "host": "hooks.slack.com",
        "port": 443,
        "method": "post",
        "path": "/services/xxx",
        "body": "{\"text\": \"High error rate detected: {{ctx.payload.hits.total.value}} errors in last 5 minutes\"}"
      }
    }
  }
}
```

## Common Issues

### Issue: High Disk Usage
**Problem**: Elasticsearch consuming too much disk
**Solution**: Implement ILM policies, reduce retention

### Issue: Slow Searches
**Problem**: Queries taking too long
**Solution**: Optimize index settings, add more shards, use filters

### Issue: Log Parsing Failures
**Problem**: Logs not parsed correctly
**Solution**: Test grok patterns, check for log format changes

### Issue: Memory Pressure
**Problem**: Elasticsearch OOM errors
**Solution**: Increase heap size (max 50% of RAM), limit field data

## Best Practices

- Implement index lifecycle management
- Use index templates for consistent mappings
- Parse logs at ingestion time
- Limit stored fields to reduce storage
- Use data streams for time-series data
- Monitor cluster health
- Implement proper security (X-Pack)
- Regular index maintenance

## Related Skills

- loki-logging (`loki-logging`) - Alternative logging stack
- prometheus-grafana (`prometheus-grafana`) - Metrics monitoring
- audit-logging (`audit-logging`) - Compliance logging

## Limitations

- Guidance executes against real environments: confirm target, blast radius, and rollback plan before applying anything.
- Never deploy to production without explicit approval. Docs-only import: upstream scripts and templates not bundled.

### Example

```bash
git status && git diff --stat
kubectl diff -f manifest.yaml
```

> Adapted from [BagelHole/DevOps-Security-Agent-Skills](https://github.com/BagelHole/DevOps-Security-Agent-Skills) (MIT); frontmatter, When to Use/Limitations, and safety boundaries added for upstream compliance. Docs-only import: helper scripts and templates not bundled.
