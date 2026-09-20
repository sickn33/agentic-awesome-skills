---
name: redis
description: Configure Redis for caching and data storage. Set up clustering, persistence,
  and Sentinel. Use when implementing Redis caching or queues.
category: devops
risk: critical
source: https://github.com/BagelHole/DevOps-Security-Agent-Skills
source_repo: BagelHole/DevOps-Security-Agent-Skills
source_type: community
date_added: '2026-09-20'
license: MIT
license_source: https://github.com/BagelHole/DevOps-Security-Agent-Skills/blob/main/LICENSE
compatibility: Requires the relevant OS/platform tooling and privileged access where
  noted. Docs-only; helper scripts and templates not bundled.
metadata:
  author: devops-skills
  version: '1.0'
---

# Redis

Configure, operate, and optimize Redis for caching, queues, rate limiting, and real-time data storage.

## When to Use

- You need a low-latency in-memory cache to reduce database load.
- Your application requires rate limiting, session storage, or leaderboards.
- You need pub/sub messaging between services.
- You want a distributed lock or job queue backed by an in-memory store.

## Prerequisites

- Linux server or Docker.
- Root or sudo access for package installation.
- Redis 7.x recommended for production.

## Installation and Setup

```bash
# Debian / Ubuntu
sudo apt update
sudo apt install -y redis-server

# RHEL / Amazon Linux
sudo dnf install -y redis

# Start and enable
sudo systemctl enable --now redis-server

# Verify
redis-cli ping
# Expected output: PONG
```

## Core Configuration

Edit `/etc/redis/redis.conf`:

```ini
# Network
bind 0.0.0.0
port 6379
protected-mode yes
requirepass strong_redis_password

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru

# Connections
maxclients 10000
timeout 300
tcp-keepalive 60

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security — disable dangerous commands in production
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command DEBUG ""
```

```bash
sudo systemctl restart redis-server
```

## redis-cli Commands Reference

```bash
# Connect with authentication
redis-cli -a strong_redis_password

# Connect to a remote host
redis-cli -h 10.0.0.5 -p 6379 -a strong_redis_password
```

### String Operations

```
SET user:1:name "Alice"
GET user:1:name

# Set with TTL (seconds)
SETEX session:abc123 3600 '{"userId":1}'

# Set only if key does not exist (distributed lock pattern)
SET lock:order:42 "worker-1" NX EX 30

# Increment counters
INCR page:views:/home
INCRBY api:quota:user:1 -1
```

### Hash Operations

```
HSET user:1 name "Alice" email "alice@example.com" plan "pro"
HGET user:1 email
HGETALL user:1
HINCRBY user:1 login_count 1
```

### List Operations (Queues)

```
LPUSH queue:emails '{"to":"alice@example.com","subject":"Welcome"}'
RPOP queue:emails
LLEN queue:emails

# Blocking pop (worker pattern)
BRPOP queue:emails 30
```

### Set and Sorted Set Operations

```
# Sets — unique tags
SADD article:1:tags "redis" "database" "caching"
SMEMBERS article:1:tags
SISMEMBER article:1:tags "redis"

# Sorted sets — leaderboards
ZADD leaderboard 1500 "player:1" 2300 "player:2" 1800 "player:3"
ZREVRANGE leaderboard 0 9 WITHSCORES
ZINCRBY leaderboard 100 "player:1"
ZRANK leaderboard "player:2"
```

### Key Management

```
KEYS user:*             # avoid in production — use SCAN instead
SCAN 0 MATCH user:* COUNT 100
TTL session:abc123
PERSIST session:abc123
DEL user:old
EXPIRE user:1 86400
TYPE user:1
```

## Persistence

### RDB Snapshots

```ini
# redis.conf — save snapshots at intervals
save 900 1       # snapshot if >= 1 key changed in 900 seconds
save 300 10      # snapshot if >= 10 keys changed in 300 seconds
save 60 10000    # snapshot if >= 10000 keys changed in 60 seconds

dbfilename dump.rdb
dir /var/lib/redis
rdbcompression yes
```

### AOF (Append-Only File)

```ini
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec    # good balance of safety and performance
# Options: always (safest, slowest), everysec (recommended), no (OS decides)

# AOF rewrite thresholds
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### Recommended Production Strategy

Use both RDB and AOF together. RDB provides fast restarts and compact backups. AOF provides durability down to 1-second granularity.

```ini
save 900 1
save 300 10
appendonly yes
appendfsync everysec
```

## Redis Sentinel (High Availability)

Sentinel monitors Redis instances and performs automatic failover.

### Sentinel Configuration

```ini
# /etc/redis/sentinel.conf
port 26379
sentinel monitor mymaster 10.0.0.1 6379 2
sentinel auth-pass mymaster strong_redis_password
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

Run at least three Sentinel instances for quorum.

```bash
# Start Sentinel
redis-sentinel /etc/redis/sentinel.conf

# Query Sentinel
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL get-master-addr-by-name mymaster
redis-cli -p 26379 SENTINEL replicas mymaster
```

## Redis Cluster Mode

Cluster mode distributes data across multiple shards automatically.

```bash
# Create a 6-node cluster (3 masters + 3 replicas)
redis-cli --cluster create \
  10.0.0.1:6379 10.0.0.2:6379 10.0.0.3:6379 \
  10.0.0.4:6379 10.0.0.5:6379 10.0.0.6:6379 \
  --cluster-replicas 1 -a strong_redis_password

# Check cluster status
redis-cli -c -a strong_redis_password CLUSTER INFO
redis-cli -c -a strong_redis_password CLUSTER NODES

# Add a new node
redis-cli --cluster add-node 10.0.0.7:6379 10.0.0.1:6379

# Rebalance slots
redis-cli --cluster rebalance 10.0.0.1:6379
```

```ini
# redis.conf for cluster nodes
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
```

## Common Patterns

### Caching with TTL

```bash
# Cache a database query result for 5 minutes
SET cache:user:42:profile '{"name":"Alice","plan":"pro"}' EX 300

# Cache-aside pattern (pseudocode):
# 1. GET cache:key -> if hit, return
# 2. Query database
# 3. SET cache:key result EX 300
# 4. Return result
```

### Rate Limiting (Sliding Window)

```bash
# Allow 100 requests per minute per user
# Using a sorted set with timestamps as scores
ZADD ratelimit:user:42 1700000000.123 "req-uuid-1"
ZREMRANGEBYSCORE ratelimit:user:42 0 1699999940.000
ZCARD ratelimit:user:42
EXPIRE ratelimit:user:42 60
# If ZCARD >= 100, reject the request
```

### Pub/Sub Messaging

```bash
# Terminal 1 — subscriber
redis-cli -a strong_redis_password
SUBSCRIBE notifications:order-updates

# Terminal 2 — publisher
redis-cli -a strong_redis_password
PUBLISH notifications:order-updates '{"orderId":42,"status":"shipped"}'

# Pattern subscription
PSUBSCRIBE notifications:*
```

### Distributed Locking (Redlock Pattern)

```bash
# Acquire lock
SET lock:resource:42 "worker-abc" NX EX 30
# Returns OK if acquired, nil if already held

# Release lock (use Lua script to ensure atomicity)
redis-cli -a strong_redis_password EVAL "
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  else
    return 0
  end
" 1 lock:resource:42 "worker-abc"
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf:ro
    command: redis-server /usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "strong_redis_password", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis-sentinel:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "26379:26379"
    volumes:
      - ./sentinel.conf:/usr/local/etc/redis/sentinel.conf
    command: redis-sentinel /usr/local/etc/redis/sentinel.conf
    depends_on:
      redis:
        condition: service_healthy

  redis-commander:
    image: rediscommander/redis-commander:latest
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      REDIS_HOSTS: "local:redis:6379:0:strong_redis_password"
    depends_on:
      redis:
        condition: service_healthy

volumes:
  redis_data:
```

```bash
docker compose up -d
redis-cli -h 127.0.0.1 -a strong_redis_password ping
```

## Monitoring

```bash
# Real-time stats
redis-cli -a strong_redis_password INFO stats
redis-cli -a strong_redis_password INFO memory
redis-cli -a strong_redis_password INFO replication

# Key metrics to watch
redis-cli -a strong_redis_password INFO stats | grep -E "keyspace_hits|keyspace_misses"
# Hit ratio = hits / (hits + misses) — aim for > 95%

# Memory usage breakdown
redis-cli -a strong_redis_password MEMORY STATS

# Slow log (queries > 10ms by default)
redis-cli -a strong_redis_password SLOWLOG GET 10
redis-cli -a strong_redis_password SLOWLOG LEN

# Monitor all commands in real time (debugging only — impacts performance)
redis-cli -a strong_redis_password MONITOR

# Connected clients
redis-cli -a strong_redis_password CLIENT LIST
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `OOM command not allowed` | `maxmemory` limit reached | Increase `maxmemory` or set a stricter eviction policy |
| High latency spikes | RDB save or AOF rewrite forking | Use `save ""` to disable RDB if AOF is enabled; tune `auto-aof-rewrite-min-size` |
| `LOADING Redis is loading the dataset in memory` | Large dataset being restored on startup | Wait for load to complete; consider smaller dataset or faster disk |
| Cache hit ratio < 90% | TTLs too short or working set exceeds memory | Increase `maxmemory`; review TTL strategy |
| Sentinel not failing over | Fewer than quorum Sentinels reachable | Ensure >= 3 Sentinels are running and network-connected |
| `CROSSSLOT` error in cluster | Multi-key command spans slots | Use hash tags `{user:42}:profile` to colocate related keys |

## Related Skills

- postgresql (`postgresql-devsec`) - Primary database that Redis caches
- mysql (`mysql`) - Primary database that Redis caches
- mongodb (`mongodb`) - Document database that Redis can front
- database-backups (`database-backups`) - Include RDB files in backup strategy

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

