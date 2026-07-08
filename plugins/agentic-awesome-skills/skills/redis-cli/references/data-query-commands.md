# Data Query Commands

Complete command reference for querying and manipulating data in Redis, organized by data type. Each entry includes syntax, complexity, and key behavioral notes.

## Table of Contents

- [Strings](#strings)
- [Hashes](#hashes)
- [Lists](#lists)
- [Sets](#sets)
- [Sorted Sets](#sorted-sets)
- [Streams](#streams)
- [Bitmaps and Bitfields](#bitmaps-and-bitfields)
- [HyperLogLog](#hyperloglog)
- [Geospatial](#geospatial)
- [Key Operations](#key-operations)
- [Database Operations](#database-operations)
- [Transactions](#transactions)

## Strings

Strings are the most basic Redis type, holding up to 512MB. They can store text, numbers (for INCR/DECR), or binary data.

```
# Read / Write
GET key                                # Get value                        O(1)
SET key value [EX sec|PX ms|EXAT ts|PXAT ms|KEEPTTL]  # Set with optional expiry  O(1)
SET key value [NX|XX]                  # NX=only if not exists, XX=exists O(1)
SET key value GET                      # Set and return old value         O(1)
GETSET key newvalue                    # [Deprecated 6.2] Use SET key value GET
GETDEL key                             # Get then delete                  O(1)
GETEX key [EX sec|PX ms|PERSIST]       # Get and set/remove expiry        O(1)

# Multi-key
MGET key [key ...]                     # Get multiple values              O(N)
MSET key value [key value ...]         # Set multiple values              O(N)
MSETNX key value [key value ...]       # Set if NONE exist                O(N)

# Numeric operations (value must be integer or float)
INCR key                               # +1                               O(1)
INCRBY key increment                   # +N                               O(1)
INCRBYFLOAT key increment              # +float                           O(1)
DECR key                               # -1                               O(1)
DECRBY key decrement                   # -N                               O(1)

# String manipulation
STRLEN key                             # Length in bytes                  O(1)
GETRANGE key start end                 # Substring                        O(N)
SETRANGE key offset value              # Overwrite at position            O(N)
APPEND key value                       # Append to string                 O(1)
SUBSTR key start end                   # Alias for GETRANGE               O(N)

# Conditional set (Redis 8.4+)
SET key value IFEQ expected-value      # Set only if current value matches
SET key value IFNE expected-value      # Set only if current value differs
SET key value IFDEQ expected-digest    # Set only if digest matches (hash comparison)
SET key value IFDNE expected-digest    # Set only if digest differs
```

**Behavioral notes:**
- `SET` overwrites any existing value regardless of type and clears any existing TTL
- `SET NX` is commonly used for distributed locks
- `INCR`/`DECR` fail if the value is not a valid integer; use `INCRBYFLOAT` for decimals
- `GETRANGE` is 0-indexed; negative indices count from end (-1 = last character)
- Empty string uses ~56 bytes of overhead (`MEMORY USAGE`)

## Hashes

Hashes map string fields to string values — ideal for representing objects. Small hashes are stored in a memory-efficient ziplist encoding.

```
# Read
HGET key field                         # Get field value                  O(1)
HMGET key field [field ...]            # Get multiple fields              O(N)
HGETALL key                            # Get all fields and values        O(N)
HKEYS key                              # Get all field names              O(N)
HVALS key                              # Get all values                   O(N)
HLEN key                               # Number of fields                 O(1)
HEXISTS key field                      # Check field exists               O(1)
HRANDFIELD key [count [WITHVALUES]]    # Random field(s)                  O(N)

# Write
HSET key field value [field value ...] # Set one or more fields           O(N)
HSETNX key field value                 # Set field only if not exists     O(1)
HDEL key field [field ...]             # Delete fields                    O(N)

# Numeric
HINCRBY key field increment            # Increment integer field          O(1)
HINCRBYFLOAT key field increment       # Increment float field            O(1)

# Iterate
HSCAN key cursor [MATCH pat] [COUNT n] [NOVALUES]  # Incremental iterate O(1)/call

# Field-level expiry (Redis 7.4+)
HEXPIRE key seconds [NX|XX|GT|LT] FIELDS numfields field [field ...]  # Set field TTL
HPEXPIRE key milliseconds [NX|XX|GT|LT] FIELDS numfields field [field ...]  # Set field TTL (ms)
HTTL key numfields field [field ...]               # Get field TTL
HPERSIST key [NX|XX|GT|LT] FIELDS numfields field [field ...]  # Remove field TTL
```

**Behavioral notes:**
- `HGETALL` returns alternating field-value pairs: `[field1, value1, field2, value2, ...]`
- `HGETALL` on a non-existent key returns an empty list
- Field order in `HGETALL` and `HKEYS` is non-deterministic
- `HSCAN` with `NOVALUES` returns field names only (saves bandwidth)
- For small hashes, `HGETALL` is efficient; for large ones, prefer `HSCAN`
- Minimum hash length is 0 (empty hash after HDEL of last field)

## Lists

Lists are ordered sequences of strings, implemented as linked lists for fast head/tail operations. Good for queues, stacks, and timelines.

```
# Read
LRANGE key start stop                  # Get range (0 -1 = all)          O(N)
LLEN key                               # List length                      O(1)
LINDEX key index                       # Get by index (0-based)           O(N)
LPOS key value [RANK rank] [COUNT n] [MAXLEN len]  # Find position   O(N)
LMPOP numkeys key [key ...] LEFT|RIGHT [COUNT count]  # Pop from multiple lists  O(N+M)

# Write (push)
LPUSH key element [element ...]        # Push to head                     O(N) for N elements
RPUSH key element [element ...]        # Push to tail                     O(N) for N elements
LPUSHX key element                     # Push to head if exists           O(1)
RPUSHX key element                     # Push to tail if exists           O(1)
LINSERT key BEFORE|AFTER pivot element # Insert relative to pivot        O(N)

# Write (pop)
LPOP key [count]                       # Pop from head                    O(N) for count
RPOP key [count]                       # Pop from tail                    O(N) for count
BLPOP key [key ...] timeout            # Blocking pop from head           O(N)
BRPOP key [key ...] timeout            # Blocking pop from tail           O(N)

# Move
LMOVE source destination LEFT|RIGHT LEFT|RIGHT  # Atomic move       O(1)
BLMOVE src dest L|R L|R timeout       # Blocking move                    O(1)
RPOPLPUSH source destination           # [Deprecated 6.2] Use LMOVE       O(1)

# Modify
LSET key index element                 # Set at index                     O(N)
LREM key count element                 # Remove occurrences               O(N+M)
LTRIM key start stop                   # Keep only range                  O(N)
```

**Behavioral notes:**
- `LRANGE key 0 -1` returns all elements; `LRANGE key 0 9` returns first 10
- Negative indexes count from end: `-1` is last element
- `LPUSH` with multiple elements pushes them left-to-right, so final order is reversed
- `LPOP`/`RPOP` with count (Redis 6.2+) returns an array; without count returns a single element or nil
- `LTRIM` is often combined with `LPUSH` to maintain a capped list
- `BLPOP`/`BRPOP` block the client until data is available or timeout expires (0 = wait forever)

## Sets

Sets are unordered collections of unique strings. Good for membership checking, deduplication, and set operations.

```
# Read
SMEMBERS key                           # Get all members                  O(N)
SCARD key                              # Member count                     O(1)
SISMEMBER key member                   # Check membership                 O(1)
SMISMEMBER key member [member ...]     # Multi-membership check           O(N)
SRANDMEMBER key [count]                # Random member(s)                 O(N)
SSCAN key cursor [MATCH pat] [COUNT n] # Incremental iterate              O(1)/call

# Write
SADD key member [member ...]           # Add members                      O(N)
SREM key member [member ...]           # Remove members                   O(N)
SPOP key [count]                       # Remove and return random         O(N)
SMOVE source dest member               # Move member between sets         O(1)

# Set operations
SINTER key [key ...]                   # Intersection                     O(N*M)
SINTERCARD numkeys key [key ...] [LIMIT limit]  # Intersection cardinality  O(N*M)
SINTERSTORE dest key [key ...]         # Intersection → new set           O(N*M)
SUNION key [key ...]                   # Union                            O(N)
SUNIONSTORE dest key [key ...]         # Union → new set                  O(N)
SDIFF key [key ...]                    # Difference (first - rest)        O(N)
SDIFFSTORE dest key [key ...]          # Difference → new set             O(N)
```

**Behavioral notes:**
- `SMEMBERS` returns all members; for large sets, use `SSCAN`
- `SRANDMEMBER` with positive count returns distinct elements (may be fewer than count if count > set size)
- `SRANDMEMBER` with negative count may return duplicates (always returns exactly count elements)
- `SPOP` removes the element(s) from the set; `SRANDMEMBER` does not
- `SDIFF` computes difference starting from the first key — order matters

## Sorted Sets

Sorted sets (zsets) map members to scores. Members are unique and ordered by score, then lexicographically. Good for leaderboards, rankings, and priority queues.

```
# Read by index
ZRANGE key start stop [WITHSCORES]               # By rank              O(log(N)+M)
ZRANGESTORE dest src start stop                   # Store range          O(log(N)+M)

# Read by score
ZRANGE key min max BYSCORE [WITHSCORES] [LIMIT offset count]  # By score O(log(N)+M)
ZCOUNT key min max                                # Count in score range O(log(N))
ZLEXCOUNT key min max                             # Count in lex range   O(log(N))

# Read by lexicographic order (all members must have same score)
ZRANGE key min max BYLEX [LIMIT offset count]     # By lex              O(log(N)+M)

# Member lookup
ZSCORE key member                                 # Get score            O(1)
ZRANK key member                                  # Get rank (ascending) O(log(N))
ZREVRANK key member                               # Get rank (descending)O(log(N))
ZMSCORE key member [member ...]                   # Multi-score get      O(N)

# Aggregate info
ZCARD key                                         # Member count         O(1)
ZRANDMEMBER key [count [WITHSCORES]]              # Random member(s)     O(N)

# Iterate
ZSCAN key cursor [MATCH pat] [COUNT n]            # Incremental iterate  O(1)/call

# Pop extremes
ZPOPMIN key [count]                               # Remove lowest scored O(log(N)*count)
ZPOPMAX key [count]                               # Remove highest scoredO(log(N)*count)
BZPOPMIN key [key ...] timeout                    # Blocking pop min     O(log(N))
BZPOPMAX key [key ...] timeout                    # Blocking pop max     O(log(N))
ZMPOP numkeys key [key ...] MIN|MAX [COUNT count] # Pop from multiple    O(K)+O(M*log(N))

# Write
ZADD key [NX|XX] [GT|LT] [CH] score member [score member ...]  # Add/update  O(log(N))
ZREM key member [member ...]                      # Remove members       O(M*log(N))
ZINCRBY key increment member                      # Increment score      O(log(N))

# Remove by range
ZREMRANGEBYRANK key start stop                    # Remove by rank       O(log(N)+M)
ZREMRANGEBYSCORE key min max                      # Remove by score      O(log(N)+M)
ZREMRANGEBYLEX key min max                        # Remove by lex        O(log(N)+M)

# Set operations
ZUNIONSTORE dest numkeys key [key ...] [WEIGHTS w...] [AGGREGATE SUM|MIN|MAX]
ZINTERSTORE dest numkeys key [key ...] [WEIGHTS w...] [AGGREGATE SUM|MIN|MAX]
ZUNION numkeys key [key ...] [WITHSCORES]         # Union result
ZINTER numkeys key [key ...] [WITHSCORES]         # Intersection result
ZINTERCARD numkeys key [key ...] [LIMIT limit]    # Intersection count
ZDIFF numkeys key [key ...] [WITHSCORES]          # Difference result
ZDIFFSTORE dest numkeys key [key ...]             # Difference → new set
```

**Behavioral notes:**
- `ZRANGE` replaces `ZRANGEBYSCORE`, `ZRANGEBYLEX`, `ZREVRANGE`, `ZREVRANGEBYSCORE`, `ZREVRANGEBYLEX` (all deprecated since Redis 6.2)
- Index-based: `0` is lowest score, `-1` is highest; `REV` flag reverses order
- Score-based: use `-inf` and `+inf` for unbounded ranges; `(` prefix means exclusive: `(1 10` = scores >1 and <=10
- Lex-based: use `[` for inclusive, `(` for exclusive: `[a (z` = members >= "a" and < "z"
- `ZADD` options: `NX` (only add new), `XX` (only update existing), `GT` (only if new score > current), `LT` (only if new score < current), `CH` (return number of changed elements)
- `WITHSCORES` returns alternating member,score pairs

## Streams

Streams are append-only log data structures with consumer groups for message processing.

```
# Write
XADD key [NOMKSTREAM] [MAXLEN|MINID [=|~] threshold [LIMIT count]] *|ID field value [field value ...]
                                        # Add entry                            O(1)
XADD key [KEEPREF|DELREF|ACKED] ...     # Reference control (Redis 8.2+)
XADD key [IDMPAUTO pid | IDMP pid iid] ...  # Idempotent add (Redis 8.6+)

# Read
XRANGE key start end [COUNT count]                 # Read by ID range     O(N)
XREVRANGE key end start [COUNT count]              # Reverse read         O(N)
XREAD [COUNT count] [BLOCK ms] STREAMS key [key ...] ID [ID ...]  # Read new entries
XLEN key                                           # Entry count          O(1)

# Consumer groups
XGROUP CREATE key groupname ID|$ [MKSTREAM]        # Create group
XREADGROUP GROUP group consumer [COUNT n] [BLOCK ms] [NOACK] STREAMS key [key ...] ID [ID ...]
XPENDING key group                                 # Pending messages info
XACK key group ID [ID ...]                         # Acknowledge message
XCLAIM key group consumer min-idle-time ID [ID ...] [IDLE ms] [TIME ms] [RETRYCOUNT n] [FORCE] [JUSTID]
XAUTOCLAIM key group consumer min-idle-time start [COUNT count] [JUSTID]

# Info
XINFO STREAM key                                   # Stream info
XINFO GROUPS key                                   # Consumer group info
XINFO CONSUMERS key group                          # Consumer info

# Management
XTRIM key MAXLEN|MINID [=|~] threshold [LIMIT count]  # Trim stream
XDEL key ID [ID ...]                               # Delete entries
XSETID key last-idle                               # Set last ID
```

**Behavioral notes:**
- `XADD` with `*` auto-generates an ID in format `TIMESTAMP-SEQUENCE`
- `XRANGE key - +` returns all entries; use `COUNT` to limit
- `XREAD BLOCK 0 STREAMS mystream $` blocks until new entries arrive (`$` = latest ID)
- Consumer groups enable multiple consumers to process a stream collaboratively
- Use `XREADGROUP ... STREAMS key >` to read new unassigned messages

## Bitmaps and Bitfields

Bitmaps are strings treated as arrays of bits. Bitfields provide atomic operations on arbitrary-width integers at bit offsets.

```
# Bitmap operations
SETBIT key offset value                # Set bit at offset                O(1)
GETBIT key offset                      # Get bit at offset                O(1)
BITCOUNT key [start end [BYTE|BIT]]    # Count set bits                   O(N)
BITPOS key bit [start [end [BYTE|BIT]]]  # Find first set/unset bit       O(N)
BITOP AND|OR|XOR|NOT dest key [key ...] # Bitwise operations              O(N)

# Bitfield operations
BITFIELD key [GET type offset] [SET type offset value] [INCRBY type offset increment] [OVERFLOW WRAP|SAT|FAIL]
```

## HyperLogLog

HyperLogLog provides approximate cardinality counting with ~0.81% standard error using constant memory (~12KB).

```
PFADD key element [element ...]        # Add elements                     O(1)
PFCOUNT key [key ...]                  # Estimate unique count            O(1) per key
PFMERGE destkey sourcekey [sourcekey ...]  # Merge HyperLogLogs            O(N)
```

## Geospatial

Geospatial commands operate on sorted sets with GEO-specific wrappers.

```
GEOADD key [NX|XX] longitude latitude member [longitude latitude member ...]  # Add geo entry
GEOPOS key member [member ...]         # Get coordinates                  O(N)
GEODIST key member1 member2 [m|km|ft|mi]  # Distance between two members  O(log(N))
GEOHASH key member [member ...]        # Get geohash strings              O(N)
GEORADIUS key longitude latitude radius m|km|ft|mi [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count] [ASC|DESC]  # [Deprecated 6.2]
GEORADIUSBYMEMBER key member radius m|km|ft|mi [...]  # [Deprecated 6.2]
GEOSEARCH key [FROMMEMBER member|FROMLONLAT lon lat] [BYRADIUS radius m|km|ft|mi|BYBOX width height m|km|ft|mi] [ASC|DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]
GEOSEARCHSTORE dest key [...]          # Store search results             O(N)
```

**Note:** `GEORADIUS` and `GEORADIUSBYMEMBER` are deprecated. Use `GEOSEARCH` instead.

## Key Operations

### Debugging

```
DEBUG OBJECT key                       # Internal debug info (rl:refcount, lru, lru_seconds_idle, etc.)  O(1)
DEBUG SEGFAULT                        # Crash server (debugging only, never in production)
```

`DEBUG OBJECT` returns internal metadata such as reference count, LRU idle time, encoding, and serialized length. Useful for diagnosing memory and eviction issues.

```
EXISTS key [key ...]                   # Check existence (returns count)   O(N) for multi
TYPE key                               # Data type (string|list|set|zset|hash|stream|none) O(1)
RENAME key newkey                      # Rename key                       O(1)
RENAMENX key newkey                    # Rename if target not exists      O(1)
COPY key newkey [DB db] [REPLACE]      # Copy key                        O(N)
DEL key [key ...]                      # Delete keys                      O(N)
UNLINK key [key ...]                   # Async delete (non-blocking)      O(1)
TOUCH key [key ...]                    # Update last access time          O(N)
MOVE key db                            # Move key to another database     O(1)
RANDOMKEY                              # Return a random key              O(1)

# Expiry
EXPIRE key seconds [NX|XX|GT|LT]      # Set TTL in seconds               O(1)
PEXPIRE key milliseconds [NX|XX|GT|LT]# Set TTL in ms                    O(1)
EXPIREAT key timestamp [NX|XX|GT|LT]  # Set expiry at Unix timestamp     O(1)
PEXPIREAT key ms-timestamp [NX|XX|GT|LT]  # Set expiry at ms-timestamp   O(1)
TTL key                                # Get TTL in seconds (-1=none, -2=not exists) O(1)
PTTL key                               # Get TTL in ms                    O(1)
EXPIRETIME key                         # Expiry as Unix timestamp         O(1)
PERSIST key                            # Remove expiry                    O(1)

# Object introspection
DUMP key                               # Serialize value                  O(N)
RESTORE key ttl serialized-value [REPLACE] [ABSTTL] [IDLETIME sec] [FREQ freq]  # Deserialize
OBJECT REFCOUNT key                    # Reference count                  O(1)
OBJECT ENCODING key                    # Internal encoding                O(1)
OBJECT IDLETIME key                    # Seconds since last access        O(1)
OBJECT FREQ key                        # Access frequency (LFU)           O(1)
MEMORY USAGE key [SAMPLES count]       # Memory in bytes                  O(N)
SORT key [BY pattern] [LIMIT offset count] [GET pattern [GET pattern ...]] [ASC|DESC] [ALPHA] [STORE dest]
SORT_RO key [BY pattern] [LIMIT offset count] [GET pattern [GET pattern ...]] [ASC|DESC] [ALPHA]  # Read-only sort (Redis 7.0+)
```

**Expiry options explained:**
- `NX` — set expiry only if key has no expiry
- `XX` — set expiry only if key already has an expiry
- `GT` — set expiry only if new TTL is greater than current
- `LT` — set expiry only if new TTL is less than current

## Database Operations

```
DBSIZE                                 # Total keys in database           O(1)
FLUSHDB [ASYNC|SYNC]                   # Delete all keys in current DB    O(N)
FLUSHALL [ASYNC|SYNC]                  # Delete all keys in all DBs       O(N)
SWAPDB index1 index2                   # Swap two databases               O(N)
SELECT index                           # Switch database                  O(1)
SCAN cursor [MATCH pattern] [COUNT count] [TYPE type]  # Incremental key iteration O(1)/call
```

## Transactions

```
MULTI                                  # Start transaction
... commands ...
EXEC                                   # Execute all queued commands
DISCARD                                # Discard queued commands

WATCH key [key ...]                    # Watch keys for conditional exec
UNWATCH                                # Unwatch all keys
```

**Behavioral notes:**
- Commands between `MULTI` and `EXEC` are queued and executed atomically
- If `WATCH` detects changes to watched keys, `EXEC` returns nil (transaction aborted)
- Redis transactions are not rollback-capable — if one command fails, the rest still execute
