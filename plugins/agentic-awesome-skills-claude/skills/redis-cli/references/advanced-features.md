# Advanced Features

## Table of Contents

- [Lua Scripting](#lua-scripting)
- [Pub/Sub Mode](#pubsub-mode)
- [Pipe Mode](#pipe-mode)
- [CSV and JSON Output](#csv-and-json-output)
- [Getting Input from Other Programs](#getting-input-from-other-programs)
- [Cluster Management](#cluster-management)

## Lua Scripting

Redis supports server-side Lua scripting for atomic multi-command operations.

### Running Scripts

```bash
# Run script from file with --eval
redis-cli --eval /tmp/script.lua key1 key2 , arg1 arg2 arg3

# The comma separates KEYS[] from ARGV[]:
# key1, key2 → KEYS[1], KEYS[2]
# arg1, arg2, arg3 → ARGV[1], ARGV[2], ARGV[3]

# Inline EVAL
redis-cli EVAL "return redis.call('SET', KEYS[1], ARGV[1])" 1 mykey myvalue

# EVALSHA (use SHA1 hash of cached script)
redis-cli EVALSHA <sha1> numkeys key [key ...] arg [arg ...]
```

### Lua Script Examples

```lua
-- Conditional SET (only if value matches)
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
  return redis.call('SET', KEYS[1], ARGV[2])
end
return nil

-- Atomic counter reset
local old = redis.call('GET', KEYS[1])
redis.call('SET', KEYS[1], ARGV[1])
return old

-- Multi-key operation
local results = {}
for i = 1, #KEYS do
  results[i] = redis.call('GET', KEYS[i])
end
return results
```

### Lua Debugger

```bash
# Enable debugger (--ldb)
redis-cli --ldb --eval /tmp/script.lua key1 , arg1

# Synchronous mode (blocks server — for debugging only)
redis-cli --ldb-sync-mode --eval /tmp/script.lua key1 , arg1
```

**Async mode** (default): server continues serving other clients during debugging. Script changes are rolled back from server memory after debugging.

**Sync mode**: server is blocked. Script changes persist in server memory. Use only in development.

### Script Management

```bash
redis-cli SCRIPT EXISTS sha1 [sha1 ...]    # Check if scripts are cached
redis-cli SCRIPT FLUSH [ASYNC|SYNC]        # Clear script cache
redis-cli SCRIPT LOAD script               # Cache script, return SHA1
redis-cli SCRIPT KILL                      # Kill running script (only if no write)
```

### Function API (Redis 7.0+)

Functions are a persistent alternative to scripts:

```bash
redis-cli FUNCTION LOAD "redis.register_function('myfunc', function(keys, args) ... end)"
redis-cli FCALL myfunc 0 arg1 arg2
redis-cli FUNCTION LIST
redis-cli FUNCTION DELETE myfunc
redis-cli FUNCTION FLUSH [ASYNC|SYNC]
redis-cli FUNCTION DUMP                    # Serialize all functions
redis-cli FUNCTION RESTORE serialized-data # Restore functions
```

## Pub/Sub Mode

redis-cli can publish and subscribe to Redis Pub/Sub channels.

### Subscribing

```bash
# Subscribe to specific channels
redis-cli SUBSCRIBE channel1 channel2

# Pattern subscription
redis-cli PSUBSCRIBE '*'

# Read published messages (blocks until Ctrl-C)
# Output format:
# 1) "pmessage"    — message type
# 2) "*"           — pattern matched
# 3) "mychannel"   — channel name
# 4) "mymessage"   — message content
```

### Publishing

```bash
redis-cli PUBLISH mychannel "Hello World"
```

### Inspecting Pub/Sub

```bash
redis-cli PUBSUB CHANNELS [pattern]        # List active channels
redis-cli PUBSUB NUMSUB [channel ...]       # Subscriber count per channel
redis-cli PUBSUB NUMPAT                     # Pattern subscription count
redis-cli PUBSUB SHARDCHANNELS [pattern]    # List shard channels
redis-cli PUBSUB SHARDNUMSUB [channel ...]  # Shard channel subscriber count
```

### Shard Pub/Sub (Redis 7.0+)

Shard Pub/Sub routes messages to the cluster node that owns the channel's slot, providing better scalability:

```bash
redis-cli SSUBSCRIBE shardchannel
redis-cli SUNSUBSCRIBE shardchannel
redis-cli SPUBLISH shardchannel "message"
```

## Pipe Mode

Transfer raw Redis protocol from stdin to the server. This is the fastest way to bulk-insert data.

```bash
# Basic pipe mode
cat data.protocol | redis-cli --pipe

# Custom timeout (seconds)
cat data.protocol | redis-cli --pipe --pipe-timeout 60

# Zero timeout (wait forever)
cat data.protocol | redis-cli --pipe --pipe-timeout 0
```

### Protocol Format

Each command in the pipe file must use Redis protocol:

```
*<number-of-arguments>\r\n
$<length-of-argument>\r\n
<argument-data>\r\n
```

Example — `SET mykey myvalue`:
```
*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n
```

Pipe mode is dramatically faster than individual commands because it batches network round trips. See the [mass insertion guide](https://redis.io/docs/latest/develop/clients/patterns/bulk-loading/) for generating protocol files.

## CSV and JSON Output

### CSV Output

Single-command CSV output for data export:

```bash
redis-cli --csv LRANGE mylist 0 -1
# "d","c","b","a"

redis-cli --csv HGETALL user:1
# "name","Alice","age","30"
```

**Note:** `--csv` works per command, not for exporting entire databases.

### JSON Output

JSON output using RESP3 protocol:

```bash
# JSON output (uses RESP3 by default)
redis-cli --json HGETALL user:1
# {"name": "Alice", "age": "30"}

# Use with RESP2 if needed
redis-cli --json -2 HGETALL user:1

# ASCII-safe quoted strings (no Unicode)
redis-cli --quoted-json GET mykey
```

### Pipe Commands to Other Tools

```bash
# Format and filter output
redis-cli --raw GET mykey | jq .

# Export to file
redis-cli --csv LRANGE mylist 0 -1 > output.csv

# Use with grep
redis-cli MONITOR | grep "SET"
```

## Getting Input from Other Programs

### Read Last Argument from stdin (-x)

```bash
# Set key to contents of a file
cat /etc/services | redis-cli -x SET net_services

# Check the stored value
redis-cli GETRANGE net_services 0 50
```

### Read Tagged Argument from stdin (-X)

```bash
# Dump and restore a key atomically
redis-cli -D "" --raw dump mykey > /tmp/mykey.dump
redis-cli -X dump_tag restore mykey2 0 dump_tag replace < /tmp/mykey.dump
```

### Pipe Multiple Commands

```bash
# Execute commands from a text file
cat /tmp/commands.txt | redis-cli

# commands.txt format (one command per line):
# SET item:3374 100
# INCR item:3374
# APPEND item:3374 xxx
# GET item:3374
```

### Feed Continuous Data

```bash
# Generate keys continuously
while true; do
  echo "SET timestamp:$(date +%s) $(date -Iseconds)"
done | redis-cli --pipe
```

## Cluster Management

redis-cli provides built-in cluster management via `--cluster` subcommands, plus direct cluster commands for lower-level control.

### redis-cli Cluster Operations

```bash
# Create a new cluster (interactive prompts for replication)
redis-cli --cluster create host1:port1 host2:port2 host3:port3 --cluster-replicas 1

# Check cluster state
redis-cli --cluster check host1:port1

# Show cluster info
redis-cli --cluster info host1:port1

# Reshard (move slots between nodes)
redis-cli --cluster reshard host1:port1 --cluster-from <node-id> --cluster-to <node-id> --cluster-slots <n>

# Rebalance slots across all nodes
redis-cli --cluster rebalance host1:port1

# Add a node to the cluster
redis-cli --cluster add-node new-host:new-port existing-host:existing-port
# As replica:
redis-cli --cluster add-node new-host:new-port existing-host:existing-port --cluster-slave --cluster-master-id <id>

# Remove a node
redis-cli --cluster del-node host:port <node-id>

# Fix cluster issues (missing slots, etc.)
redis-cli --cluster fix host:port

# Execute command on all cluster nodes
redis-cli --cluster call host:port <command>

# List all --cluster subcommands
redis-cli --cluster help
```

Use `-c` flag to enable cluster mode in redis-cli (automatically follows `-ASK` and `-MOVED` redirections):

```bash
redis-cli -c -h cluster-node -p 6379
```

### Cluster Commands (Direct)

```bash
# Cluster state and topology
redis-cli CLUSTER INFO                        # Cluster state overview (O(1))
redis-cli CLUSTER NODES                       # Full node topology (O(N))
redis-cli CLUSTER SHARDS                      # Shard/node mapping (O(N), Redis 7.0+)

# Slot management
redis-cli CLUSTER KEYSLOT key                 # Hash slot for a key (O(1))
redis-cli CLUSTER ADDSLOTS slot [slot ...]    # Assign slots to node (O(N))
redis-cli CLUSTER DELSLOTS slot [slot ...]    # Unbind slots (O(N))
redis-cli CLUSTER SETSLOT slot IMPORTING|node-id|MIGRATING|STABLE  # Slot migration (O(1))

# Node management
redis-cli CLUSTER MEET ip port [bus-port]     # Join cluster (O(1))
redis-cli CLUSTER FORGET node-id              # Remove node (O(1))
redis-cli CLUSTER REPLICATE node-id           # Become replica of node (O(1))
redis-cli CLUSTER RESET [HARD|SOFT]           # Reset cluster state (O(N))

# Failover
redis-cli CLUSTER FAILOVER [FORCE|TAKEOVER]   # Manual failover (O(1))
redis-cli CLUSTER SAVECONFIG                  # Save config to disk (O(1))

# Node identification
redis-cli CLUSTER MYID                        # Current node ID (O(1))
redis-cli CLUSTER MYSHARDID                   # Current shard ID (O(1))
```

**Behavioral notes:**
- Redis Cluster has 16384 hash slots distributed across master nodes
- `CLUSTER SLOTS` is deprecated since Redis 7.0 — use `CLUSTER SHARDS` instead
- Use `redis-cli -c` for transparent cluster redirections in interactive mode
- `CLUSTER FORGET` auto-propagates via gossip in Redis 7.2+
