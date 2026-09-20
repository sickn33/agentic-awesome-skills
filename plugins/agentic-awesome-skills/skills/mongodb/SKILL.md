---
name: mongodb
description: Administer MongoDB databases. Configure replica sets, sharding, and backups.
  Use when managing MongoDB deployments.
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

# MongoDB

Administer, optimize, and secure MongoDB NoSQL databases in development and production environments.

## When to Use

- You need a document-oriented database with flexible schemas.
- Your data is semi-structured or heavily nested (JSON-like documents).
- You need horizontal scaling through sharding.
- Your application benefits from rich querying and aggregation pipelines.

## Prerequisites

- Linux server (Debian/Ubuntu or RHEL-based) or Docker.
- Root or sudo access for package installation.
- MongoDB 7.x recommended for production (6.x still supported).

## Installation and Setup

```bash
# Debian / Ubuntu — MongoDB 7
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
  sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] \
  https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
  sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable
sudo systemctl enable --now mongod

# Verify
mongosh --eval "db.version()"
```

## Initial User Setup

```javascript
// Connect without auth first
// mongosh

use admin

// Create admin user
db.createUser({
  user: "admin",
  pwd: "strong_admin_password",
  roles: [
    { role: "userAdminAnyDatabase", db: "admin" },
    { role: "readWriteAnyDatabase", db: "admin" },
    { role: "clusterAdmin", db: "admin" }
  ]
})

// Create an application-scoped user
use mydb
db.createUser({
  user: "myapp",
  pwd: "strong_app_password",
  roles: [{ role: "readWrite", db: "mydb" }]
})
```

Enable authentication in `/etc/mongod.conf`:

```yaml
security:
  authorization: enabled
```

```bash
sudo systemctl restart mongod
# Now connect with credentials
mongosh -u myapp -p strong_app_password --authenticationDatabase mydb
```

## mongosh Commands Reference

```javascript
// Show databases and collections
show dbs
use mydb
show collections

// Insert documents
db.users.insertOne({ name: "Alice", email: "alice@example.com", age: 30 })
db.users.insertMany([
  { name: "Bob", email: "bob@example.com", age: 25 },
  { name: "Carol", email: "carol@example.com", age: 35 }
])

// Query documents
db.users.find({ age: { $gte: 25 } }).sort({ name: 1 }).limit(10)
db.users.findOne({ email: "alice@example.com" })
db.users.countDocuments({ age: { $gte: 30 } })

// Update
db.users.updateOne(
  { email: "alice@example.com" },
  { $set: { age: 31 }, $currentDate: { updatedAt: true } }
)
db.users.updateMany(
  { age: { $lt: 30 } },
  { $set: { tier: "junior" } }
)

// Delete
db.users.deleteOne({ email: "bob@example.com" })
db.users.deleteMany({ tier: "junior" })
```

## Indexing

```javascript
// Single-field index
db.users.createIndex({ email: 1 }, { unique: true })

// Compound index
db.orders.createIndex({ userId: 1, createdAt: -1 })

// Text index for search
db.articles.createIndex({ title: "text", body: "text" })
db.articles.find({ $text: { $search: "mongodb scaling" } })

// TTL index — auto-delete documents after 30 days
db.sessions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })

// List indexes
db.users.getIndexes()

// Drop an index
db.users.dropIndex("email_1")

// Explain a query to verify index usage
db.orders.find({ userId: 42 }).explain("executionStats")
```

## Aggregation Pipeline Examples

```javascript
// Revenue per status
db.orders.aggregate([
  { $group: {
      _id: "$status",
      totalRevenue: { $sum: "$total" },
      count: { $sum: 1 }
  }},
  { $sort: { totalRevenue: -1 } }
])

// Top 5 customers by order value (with a join)
db.orders.aggregate([
  { $group: {
      _id: "$userId",
      spent: { $sum: "$total" },
      orderCount: { $sum: 1 }
  }},
  { $sort: { spent: -1 } },
  { $limit: 5 },
  { $lookup: {
      from: "users",
      localField: "_id",
      foreignField: "_id",
      as: "user"
  }},
  { $unwind: "$user" },
  { $project: {
      _id: 0,
      name: "$user.name",
      email: "$user.email",
      spent: 1,
      orderCount: 1
  }}
])

// Daily signup trend
db.users.aggregate([
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      signups: { $sum: 1 }
  }},
  { $sort: { _id: 1 } },
  { $limit: 30 }
])
```

## Replica Set Setup

A replica set requires a minimum of three members (or two data-bearing nodes plus an arbiter).

### Configuration File for Each Member

```yaml
# /etc/mongod.conf (adjust port and dbPath per member)
storage:
  dbPath: /var/lib/mongodb
net:
  port: 27017
  bindIp: 0.0.0.0
replication:
  replSetName: rs0
security:
  authorization: enabled
  keyFile: /etc/mongodb-keyfile
```

```bash
# Generate a shared keyfile for internal auth
openssl rand -base64 756 > /etc/mongodb-keyfile
chmod 400 /etc/mongodb-keyfile
chown mongodb:mongodb /etc/mongodb-keyfile
# Copy this file to all replica set members
```

### Initialize the Replica Set

```javascript
// Connect to the first member
// mongosh --port 27017

rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongo1:27017", priority: 2 },
    { _id: 1, host: "mongo2:27017", priority: 1 },
    { _id: 2, host: "mongo3:27017", priority: 1 }
  ]
})

// Check status
rs.status()

// View replication lag per member
rs.printReplicationInfo()
rs.printSecondaryReplicationInfo()
```

## Backup and Restore

```bash
# Full dump of all databases
mongodump --uri="mongodb://admin:secret@localhost:27017" --out=/backups/full_$(date +%F)

# Single database
mongodump --uri="mongodb://myapp:secret@localhost:27017/mydb" --out=/backups/mydb_$(date +%F)

# Compressed dump
mongodump --uri="mongodb://admin:secret@localhost:27017" --gzip --out=/backups/gz_$(date +%F)

# Restore all databases
mongorestore --uri="mongodb://admin:secret@localhost:27017" /backups/full_2025-01-15/

# Restore a single database, dropping existing data first
mongorestore --uri="mongodb://admin:secret@localhost:27017" \
  --drop --db mydb /backups/mydb_2025-01-15/mydb/

# Restore compressed dump
mongorestore --uri="mongodb://admin:secret@localhost:27017" --gzip /backups/gz_2025-01-15/
```

## Docker Compose Setup

```yaml
# docker-compose.yml
version: "3.9"

services:
  mongo1:
    image: mongo:7
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secret
    volumes:
      - mongo1_data:/data/db
      - ./mongo-keyfile:/etc/mongodb-keyfile:ro
    command: >
      mongod
        --replSet rs0
        --keyFile /etc/mongodb-keyfile
        --bind_ip_all
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongo2:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo2_data:/data/db
      - ./mongo-keyfile:/etc/mongodb-keyfile:ro
    command: >
      mongod
        --replSet rs0
        --keyFile /etc/mongodb-keyfile
        --bind_ip_all

  mongo3:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo3_data:/data/db
      - ./mongo-keyfile:/etc/mongodb-keyfile:ro
    command: >
      mongod
        --replSet rs0
        --keyFile /etc/mongodb-keyfile
        --bind_ip_all

  mongo-init:
    image: mongo:7
    restart: "no"
    depends_on:
      mongo1:
        condition: service_healthy
    entrypoint: >
      mongosh --host mongo1 -u admin -p secret --authenticationDatabase admin --eval '
        rs.initiate({
          _id: "rs0",
          members: [
            { _id: 0, host: "mongo1:27017", priority: 2 },
            { _id: 1, host: "mongo2:27017", priority: 1 },
            { _id: 2, host: "mongo3:27017", priority: 1 }
          ]
        })
      '

volumes:
  mongo1_data:
  mongo2_data:
  mongo3_data:
```

```bash
# Generate keyfile before starting
openssl rand -base64 756 > mongo-keyfile
chmod 400 mongo-keyfile

docker compose up -d

# Connect
mongosh "mongodb://admin:secret@127.0.0.1:27017/?replicaSet=rs0&authSource=admin"
```

## Monitoring Queries

```javascript
// Server status summary
db.serverStatus().connections
db.serverStatus().opcounters

// Current operations (look for long-running queries)
db.currentOp({ secs_running: { $gte: 5 } })

// Collection stats
db.orders.stats()

// Index sizes
db.orders.stats().indexSizes

// Profiler — log slow queries (> 100ms)
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)

// Replica set lag
rs.printSecondaryReplicationInfo()
```

## Configuration Tuning

```yaml
# /etc/mongod.conf — production recommendations
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 4          # ~50% of RAM, leave rest for OS cache
    collectionConfig:
      blockCompressor: snappy
net:
  port: 27017
  bindIp: 0.0.0.0
  maxIncomingConnections: 500
operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `COLLSCAN` in explain output | Missing index on queried field | Create an appropriate index |
| Replica member stuck in `RECOVERING` | Oplog window exceeded | Resync by removing data and restarting the member |
| `too many open files` | OS file descriptor limit too low | Set `ulimit -n 65535` in service file |
| High memory usage | WiredTiger cache too large | Reduce `cacheSizeGB` in config |
| Slow aggregation pipelines | No index on `$match` stage fields | Add index; place `$match` as early as possible in pipeline |
| Authentication failure | Wrong `authenticationDatabase` | Specify `--authenticationDatabase admin` for admin users |

## Related Skills

- redis (`redis`) - Caching layer in front of MongoDB
- database-backups (`database-backups`) - Automated backup strategies
- postgresql (`postgresql-devsec`) - Alternative relational database

## Limitations

- Infrastructure commands can disrupt services: confirm target host/scope and have backups/snapshots before mutating state.
- Docs-only import: upstream scripts and templates not bundled.

