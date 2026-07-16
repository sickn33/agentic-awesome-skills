# Key Management

## Table of Contents

- [SCAN Family](#scan-family)
- [Built-in Scan Modes](#built-in-scan-modes)
- [Big Keys Analysis](#big-keys-analysis)
- [Memory Usage Analysis](#memory-usage-analysis)
- [Combined Analysis](#combined-analysis-keystats)
- [Hot Keys Detection](#hot-keys-detection)
- [Key Expiration Management](#key-expiration-management)
- [Mass Insertion](#mass-insertion)

## SCAN Family

The SCAN family provides production-safe iteration over collections. Unlike `KEYS *` or `SMEMBERS` which block the server on large datasets, SCAN returns small batches incrementally.

### SCAN Command Reference

| Command | Iterates Over | Syntax |
|---------|--------------|--------|
| `SCAN` | Keys in database | `SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]` |
| `SSCAN` | Members of a Set | `SSCAN key cursor [MATCH pattern] [COUNT count]` |
| `HSCAN` | Fields of a Hash | `HSCAN key cursor [MATCH pattern] [COUNT count] [NOVALUES]` |
| `ZSCAN` | Members of a Sorted Set | `ZSCAN key cursor [MATCH pattern] [COUNT count]` |

### How SCAN Works

1. Start iteration with cursor `0`
2. Each call returns `[new_cursor, [elements...]]`
3. Use `new_cursor` in the next call
4. Iteration is complete when cursor returns `0`

```
# Full iteration example
SCAN 0 MATCH user:* COUNT 100
# Returns: 1) "42"  2) ["user:1", "user:5", "user:23"]
SCAN 42 MATCH user:* COUNT 100
# Returns: 1) "0"   2) ["user:88", "user:91"]    ← iteration complete (cursor=0)
```

### SCAN Options

**MATCH pattern** — Glob-style filtering applied *after* retrieval (not server-side filtering):
- `*` matches any sequence
- `?` matches single character
- `[ae]` matches one of the characters
- Important: because MATCH is applied post-retrieval, some iterations may return empty results. Increase `COUNT` to compensate.

**COUNT n** — Hint for number of elements per call (default: 10):
- This is a *hint*, not a guarantee
- For small collections encoded as ziplists/intsets, all elements may be returned in one call regardless of COUNT
- The key space (SCAN) always uses hash tables and respects COUNT more predictably
- You can change COUNT between calls without affecting iteration correctness

**TYPE type** — Filter by data type (SCAN only, Redis 6.0+):
- `SCAN 0 TYPE hash` returns only hash keys
- Type is the same string that `TYPE` command returns: `string`, `list`, `set`, `zset`, `hash`, `stream`
- Like MATCH, this is applied post-retrieval

**NOVALUES** — Return field names only, without values (HSCAN only):
- `HSCAN myhash 0 NOVALUES` returns just field names, saving bandwidth for large hashes

### SCAN Guarantees

A full iteration (cursor 0 → 0) provides:

1. **Completeness**: All elements that existed for the entire duration of the iteration will be returned at least once
2. **No false positives**: Elements that never existed during the iteration are never returned

### SCAN Limitations

- Elements may be returned **multiple times** — handle deduplication in your application
- Elements added or removed during iteration may or may not appear — undefined behavior
- Only valid cursors are `0` (start) or values returned by previous SCAN calls
- An iteration over a collection that grows faster than SCAN progresses may never terminate

### SCAN in Redis Cluster

In cluster mode, SCAN only iterates keys in the current node's slot range. The `--scan` option in redis-cli handles cluster iteration automatically across all nodes.

Pattern matching is optimized for patterns implying a single slot. For example, `{a}h*llo` only scans keys in slot 15495 (hash tag `{a}`).

## Built-in Scan Modes

redis-cli provides built-in scan modes that wrap the SCAN command:

```bash
# List all keys
redis-cli --scan

# Filter by glob pattern
redis-cli --scan --pattern 'user:*'
redis-cli --scan --pattern '*-11*'

# Control batch size
redis-cli --scan --count 100

# Add delay between SCAN calls (reduce server load)
redis-cli --scan --pattern 'user:*' -i 0.01

# Count keys matching a pattern
redis-cli --scan --pattern 'session:*' | wc -l

# Chain with other tools
redis-cli --scan --pattern 'cache:*' | head -20
redis-cli --scan --pattern 'temp:*' | while read key; do redis-cli DEL "$key"; done
```

## Big Keys Analysis

Scans the entire keyspace to find keys with the most elements (complexity-based).

```bash
# Find biggest keys by element count
redis-cli --bigkeys

# Throttle scanning (0.01 sec per 100 SCAN calls)
redis-cli --bigkeys -i 0.01

# Filter by pattern
redis-cli --bigkeys --pattern 'user:*'
```

Output example:
```
# Scanning the entire keyspace...
Biggest   list found "bikes:finished" has 1 items
Biggest string found "all_bikes" has 36 bytes
Biggest   hash found "bike:1:stats" has 3 fields
Biggest stream found "race:france" has 4 entries

-------- summary -------
Total key length in bytes is 495 (avg len 9.00)

1 lists with 1 items (01.82% of keys, avg size 1.00)
16 strings with 149 bytes (29.09% of keys, avg size 9.31)
```

Reports biggest key per type, percentage of keys per type, and average sizes. Works on cluster replicas.

## Memory Usage Analysis

Scans for keys consuming the most memory.

```bash
# Find keys by memory consumption
redis-cli --memkeys

# With throttling
redis-cli --memkeys -i 0.01

# Custom sample count for nested types
redis-cli --memkeys --memkeys-samples 10
```

Output is similar to `--bigkeys` but reports byte sizes instead of element counts.

## Combined Analysis (--keystats)

Combines `--bigkeys` and `--memkeys` with distribution data.

```bash
redis-cli --keystats
redis-cli --keystats --top 20         # Show top 20 keys
redis-cli --keystats --cursor 12345   # Resume from a previous scan
redis-cli --keystats -i 0.01          # Throttled
```

Output includes:
- Top N key sizes ranked by memory
- Biggest key per type (by size and by element count)
- Percentile distribution of key sizes
- Per-type statistics (total keys, percentage, total size, average size)

## Hot Keys Detection

Identifies frequently accessed keys. Requires `maxmemory-policy` to be set to an LFU variant.

```bash
redis-cli --hotkeys
```

## Key Expiration Management

### Setting Expiry

```bash
# Set TTL in seconds
redis-cli EXPIRE mykey 3600

# Set TTL in milliseconds
redis-cli PEXPIRE mykey 5000

# Set expiry at specific Unix timestamp
redis-cli EXPIREAT mykey 1735689600

# Conditional expiry (Redis 7.0+)
redis-cli EXPIRE mykey 3600 NX        # Only if no current expiry
redis-cli EXPIRE mykey 3600 XX        # Only if already has expiry
redis-cli EXPIRE mykey 3600 GT        # Only if new TTL > current TTL
redis-cli EXPIRE mykey 3600 LT        # Only if new TTL < current TTL
```

### Checking Expiry

```bash
redis-cli TTL mykey                    # Seconds remaining (-1=none, -2=not exists)
redis-cli PTTL mykey                   # Milliseconds remaining
redis-cli EXPIRETIME mykey             # Unix timestamp of expiry
```

### Removing Expiry

```bash
redis-cli PERSIST mykey                # Make key permanent
```

### Hash Field Expiry (Redis 7.4+)

```bash
redis-cli HEXPIRE myhash 3600 FIELDS 2 field1 field2
redis-cli HTTL myhash 2 field1 field2
redis-cli HPERSIST myhash FIELDS 2 field1 field2
```

### Expiry Behavior

- Setting a key with `SET`, `GETSET`, or `*STORE` commands clears any existing TTL
- `DEL`, `RENAME`, and `MOVE` transfer or clear the TTL
- `EXPIRE` on a key with existing TTL updates the timeout
- Expired keys are deleted lazily or actively sampled (~10 times/sec, random sample of 20 keys)

## Mass Insertion

For bulk loading data into Redis, use the pipe mode which is significantly faster than individual commands.

```bash
# Generate Redis protocol from data and pipe it
cat data.txt | redis-cli --pipe

# With custom timeout (default 30 seconds)
cat data.txt | redis-cli --pipe --pipe-timeout 60

# The input file must use Redis protocol format:
# *<args>\r\n$<len>\r\n<arg>\r\n...
#
# Example for SET key value:
# *3\r\n$3\r\nSET\r\n$3\r\nkey\r\n$5\r\nvalue\r\n
```

See the [official mass insertion guide](https://redis.io/docs/latest/develop/clients/patterns/bulk-loading/) for generating protocol files from CSV or other data sources.
