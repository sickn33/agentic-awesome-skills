# Inspection and Monitoring

## Table of Contents

- [INFO Command](#info-command)
- [Continuous Stats Mode](#continuous-stats-mode)
- [MONITOR Command](#monitor-command)
- [Latency Analysis](#latency-analysis)
- [RDB Backup](#rdb-backup)
- [Replica Mode](#replica-mode)
- [LRU Simulation](#lru-simulation)
- [Slow Log](#slow-log)

## INFO Command

Returns server information and statistics as key-value pairs organized in sections.

```bash
# All default sections
redis-cli INFO

# Specific sections
redis-cli INFO server
redis-cli INFO memory
redis-cli INFO keyspace
redis-cli INFO replication
redis-cli INFO clients
redis-cli INFO stats
redis-cli INFO persistence
redis-cli INFO cpu
redis-cli INFO commandstats
redis-cli INFO latencystats
redis-cli INFO cluster
redis-cli INFO modules

# Multiple sections (Redis 7.0+)
redis-cli INFO memory keyspace

# All sections including hidden ones
redis-cli INFO all

# Everything including debug sections
redis-cli INFO everything
```

### Key INFO Sections

**server** — Redis version, process ID, uptime, architecture, TCP port, config file
**memory** — Used memory, peak memory, fragmentation ratio, total system memory
**keyspace** — Key counts per database (e.g., `db0:keys=1000,expires=50,avg_ttl=3600`)
**clients** — Connected clients, blocked clients, max clients
**replication** — Role (master/replica), connected replicas, replication offset
**stats** — Total connections, commands processed, keyspace hits/misses
**persistence** — RDB/AOF status, last save time, current save progress
**cpu** — User/system CPU time consumed by Redis

### Useful INFO Queries

```bash
# Check memory usage and fragmentation
redis-cli INFO memory | grep -E "used_memory_human|fragmentation_ratio"

# Monitor keyspace changes
redis-cli INFO keyspace

# Check replication health
redis-cli INFO replication | grep -E "role|connected_slaves|master_repl_offset"

# Track hit rate
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"

# Watch specific metric over time
redis-cli -r -1 -i 5 INFO memory | grep used_memory_human
```

## Continuous Stats Mode

Rolling display of server statistics updated every second (configurable with `-i`).

```bash
redis-cli --stat

# Change update interval
redis-cli --stat -i 5    # every 5 seconds
```

Output columns:
```
------- data ------ --------------------- load -------------------- - child -
keys       mem      clients blocked requests            connections
506        1015.00K 1       0       24 (+0)             7
506        1015.00K 1       0       25 (+1)             7
```

- **keys**: Total key count
- **mem**: Memory usage
- **clients**: Connected clients
- **blocked**: Blocked clients
- **requests**: Total processed requests (+delta since last line)
- **connections**: Total connections since startup

The delta in parentheses makes it easy to spot sudden traffic spikes.

## MONITOR Command

Streams all commands processed by the Redis server in real time.

```bash
redis-cli MONITOR
```

Output format:
```
1460100081.165665 [0 127.0.0.1:51706] "set" "shipment:8000736522714:status" "sorting"
1460100083.053365 [0 127.0.0.1:51707] "get" "shipment:8000736522714:status"
```

Fields: `timestamp [db client_addr] "command" "arg1" "arg2" ...`

**Warning:** MONITOR adds significant overhead (each command is also sent to MONITOR clients). Avoid running it for extended periods on busy production servers.

Useful for debugging — pipe through grep to filter:
```bash
redis-cli MONITOR | grep "SET"
redis-cli MONITOR | grep "user:"
```

## Latency Analysis

Redis provides multiple latency tools for different diagnostic scenarios.

### Basic Latency (--latency)

Continuously sends PING and measures round-trip time (100 samples/sec):

```bash
redis-cli --latency
# min: 0, max: 1, avg: 0.19 (427 samples)
```

Stats are in milliseconds. When not in a TTY (or with `--raw`), samples for 1 second then exits with a single output line.

### Latency History (--latency-history)

Same as `--latency` but resets statistics every 15 seconds (configurable):

```bash
redis-cli --latency-history
redis-cli --latency-history -i 30    # 30-second windows
```

### Latency Distribution (--latency-dist)

Color-coded spectrum visualization of latency distribution:

```bash
redis-cli --latency-dist
```

Requires xterm 256-color terminal. Default 1-second interval, change with `-i`.

### Intrinsic Latency (--intrinsic-latency)

Measures the baseline latency of the system (kernel scheduler, hypervisor), not Redis itself.

```bash
# Run ON THE SAME MACHINE as Redis, not remotely
redis-cli --intrinsic-latency 5
```

The argument is the test duration in seconds. Output:
```
Max latency so far: 739 microseconds.
65433042 total runs (avg latency: 0.0764 microseconds).
Worst run took 9671x longer than the average latency.
```

This tells you the minimum achievable latency on this system. Redis cannot outperform this baseline.

### LATENCY Command (Redis Internal)

Redis also tracks slow events internally:

```bash
redis-cli LATENCY LATEST              # Latest latency spikes per event
redis-cli LATENCY HISTORY event-name  # Time-series data for an event
redis-cli LATENCY GRAPH event-name    # ASCII graph of latency over time
redis-cli LATENCY RESET [event ...]   # Reset latency data
redis-cli LATENCY DOCTOR              # Diagnose latency issues
```

Common event names: `command`, `fork`, `rdb-unlink`, `aof-write`, `aof-fsync-always`.

## RDB Backup

Transfer an RDB dump file from a remote Redis instance to the local machine.

```bash
redis-cli --rdb /tmp/dump.rdb
# SYNC sent to master, writing 13256 bytes to '/tmp/dump.rdb'
# Transfer finished with success.
```

Check exit code for errors:
```bash
redis-cli --rdb /tmp/dump.rdb
echo $?    # 0 = success, non-zero = error
```

**Functions-only RDB** (skip key data):
```bash
redis-cli --functions-rdb /tmp/functions.rdb
```

Useful for automated backup scripts and cron jobs. The RDB file can be loaded by any Redis instance.

## Replica Mode

Simulates a replica to inspect the replication stream from a master:

```bash
redis-cli --replica
```

Output shows commands as they are replicated in CSV format:
```
SYNC with master, discarding 13256 bytes of bulk transfer...
SYNC done. Logging commands from master.
"PING"
"SELECT","0"
"SET","last_name","Enigk"
"INCR","mycounter"
```

Useful for debugging replication issues and understanding what data is being sent to replicas.

## LRU Simulation

Simulates cache behavior to help determine the optimal `maxmemory` setting.

```bash
# Simulate 10 million keys with LRU eviction
redis-cli --lru-test 10000000
```

Prerequisites:
- Configure `maxmemory` (e.g., `100mb`) in redis.conf
- Set `maxmemory-policy` to `allkeys-lru`
- **WARNING**: This test uses pipelining and stresses the server — never use on production instances

Output shows hit/miss rates:
```
156000 Gets/sec | Hits: 4552 (2.92%) | Misses: 151448 (97.08%)
153750 Gets/sec | Hits: 12906 (8.39%) | Misses: 140844 (91.61%)
```

Use this to find the right `maxmemory` value for your key count and access pattern (80-20 power law distribution). A miss rate >10% usually means more memory is needed.

## Slow Log

The slow log records commands that exceed a configured execution time threshold. This is the first tool to reach for when debugging unexplained latency.

### Configuration

```bash
# Check current slowlog settings
redis-cli CONFIG GET slowlog*

# slowlog-log-slower-than: threshold in microseconds (negative = disabled)
# slowlog-max-len: maximum number of entries to keep (ring buffer)
redis-cli CONFIG SET slowlog-log-slower-than 10000   # 10ms
redis-cli CONFIG SET slowlog-max-len 128
```

### Querying

```bash
# Get recent slow log entries (default: 10)
redis-cli SLOWLOG GET
redis-cli SLOWLOG GET 20              # Last 20 entries

# Each entry format:
# 1) id            — unique entry ID
# 2) timestamp     — Unix timestamp
# 3) duration      — execution time in microseconds
# 4) command       — array: [cmd, arg1, arg2, ...]
# 5) client        — client address:port
# 6) client_name   — client name (via CLIENT SETNAME)

# Get entry count
redis-cli SLOWLOG LEN

# Reset (clear all entries)
redis-cli SLOWLOG RESET
```

### Useful SLOWLOG Queries

```bash
# Find slowest commands
redis-cli SLOWLOG GET 50 | grep -E "^\d+\)|^\d+\) \(integer\)"

# Monitor slow log continuously
redis-cli -r -1 -i 10 SLOWLOG GET 5

# Combine with LATENCY for deeper analysis
redis-cli LATENCY LATEST
redis-cli SLOWLOG GET 10
```
