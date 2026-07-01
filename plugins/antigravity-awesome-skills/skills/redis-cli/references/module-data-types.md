# Module Data Types

Commands for Redis module data types: JSON, Vector Sets, Probabilistic data structures, TimeSeries, and Full-Text Search (RediSearch).

## Table of Contents

- [JSON (RedisJSON Module)](#json-redisjson-module)
- [Vector Sets (Redis 8.0+)](#vector-sets-redis-80)
- [Bloom Filter](#bloom-filter)
- [Cuckoo Filter](#cuckoo-filter)
- [Top-K](#top-k)
- [Count-Min Sketch](#count-min-sketch)
- [T-Digest](#t-digest)
- [TimeSeries](#timeseries)
- [Full-Text Search (RediSearch)](#full-text-search-redisearch)

## JSON (RedisJSON Module)

```
JSON.SET key $ value [NX|XX]           # Set JSON value at path
JSON.GET key [path [path ...]]         # Get JSON value
JSON.MGET key [key ...] $              # Multi-get
JSON.DEL key [path]                    # Delete JSON value
JSON.TYPE key [path]                   # Get type at path
JSON.STRLEN key [path]                 # String length
JSON.OBJLEN key [path]                 # Object key count
JSON.OBJKEYS key [path]                # Object keys
JSON.ARRLEN key [path]                 # Array length
JSON.ARRAPPEND key path value [...]    # Append to array
JSON.ARRPOP key [path [index]]         # Pop from array
JSON.ARRINSERT key path index value [...]  # Insert into array
JSON.ARRINDEX key path value [start [stop]]  # Find index of value
JSON.ARRTRIM key path start stop       # Trim array to range
JSON.NUMINCRBY key path value          # Increment number
JSON.NUMMULTBY key path value          # Multiply number
JSON.STRAPPEND key [path] value        # Append to string
JSON.STRLEN key [path]                 # String length
JSON.CLEAR key [path]                  # Clear container (array/object)
JSON.FORGET key [path]                 # Alias for JSON.DEL
JSON.MSET key path value [key path value ...]  # Multi-set
JSON.TOGGLE key [path]                 # Toggle boolean value
JSON.MERGE key path value              # Merge JSON
JSON.RESP key [path]                   # Get as RESP protocol
```

## Vector Sets (Redis 8.0+)

Vector sets store elements with associated vectors and support approximate nearest neighbor (ANN) similarity search using an HNSW (Hierarchical Navigable Small World) graph. Ideal for semantic search, recommendation systems, and AI embedding storage.

```
# Write
VADD key [REDUCE dim] (FP32 | VALUES num) vector element [CAS] [NOQUANT|Q8|BIN] [EF ef] [SETATTR json] [M numlinks]
                                        # Add element with vector              O(log(N))

VREM key element                       # Remove element                        O(log(N))

# Similarity search
VSIM key (ELE | FP32 | VALUES num) (vector | element) [WITHSCORES] [WITHATTRIBS] [COUNT n]
        [EPSILON delta] [EF ef] [FILTER expr] [FILTER-EF max] [TRUTH] [NOTHREAD]
                                        # Find similar elements                 O(log(N))

# Read
VEMB key element [RAW]                 # Get vector for element                O(1)
VRANGE key start end [count]           # Lexicographic range iteration         O(log(K)+M)
VCARD key                              # Element count                         O(1)
VDIM key                               # Vector dimensionality                 O(1)
VISMEMBER key element                  # Check element exists                  O(1)
VLINKS key element [WITHSCORES]        # HNSW graph neighbors                  O(1)
VRANDMEMBER key [count]                # Random element(s)                     O(N)
VSETATTR key element "{ json }"        # Set JSON attributes                   O(1)
VGETATTR key element                   # Get JSON attributes                   O(1)
VINFO key                              # Vector set metadata                   O(1)
```

**VADD vector input:**
- `VALUES 3 0.1 1.2 0.5 my-element` — string floats, platform-independent
- `FP32 <blob> my-element` — binary 32-bit float blob, must be little-endian

**VADD quantization options** (mutually exclusive, set on first VADD):
- `NOQUANT` — no quantization, full precision (most memory)
- `Q8` — signed 8-bit int quantization (default, good balance)
- `BIN` — binary quantization (fastest, least memory, lower recall)

**VSIM input modes:**
- `ELE element` — search by existing element in the set
- `VALUES num v1 v2 ...` — search by float vector
- `FP32 <blob>` — search by binary vector

**VSIM key options:**
- `WITHSCORES` — include similarity score (1 = identical, 0 = opposite)
- `WITHATTRIBS` — include JSON attributes for each result
- `COUNT n` — limit results (default 10)
- `EPSILON delta` — only return elements with distance < delta (similarity > 1-delta)
- `EF ef` — search exploration factor (higher = better recall, slower)
- `FILTER expr` — filter by attribute expression (e.g., `".year > 2020"`)
- `TRUTH` — exact linear scan (O(N)), for benchmarking recall quality

**VRANGE iteration** (Redis 8.4+):
Stateless lexicographic iteration. `start`/`end` use `[` inclusive, `(` exclusive, `-` min, `+` max:
```
VRANGE mykey - + 10        # First 10 elements
VRANGE mykey (last + 10    # Next 10 after "last"
VRANGE mykey - + -1        # All elements (caution: may be slow)
```

## Bloom Filter

Probabilistic data structure for membership testing. Returns "possibly in set" or "definitely not in set". Space-efficient with a configurable false-positive rate.

```
# Create with custom parameters (optional — auto-created on first ADD)
BF.RESERVE key error_rate capacity [EXPANSION expansion] [NONSCALING]

# Write
BF.ADD key item                        # Add single item                 O(k)
BF.MADD key item [item ...]            # Add multiple items              O(k*n)

# Query
BF.EXISTS key item                     # Check if item exists            O(k)
BF.MEXISTS key item [item ...]         # Check multiple items            O(k*n)

# Info
BF.INFO key                            # Filter metadata (capacity, size, expansion, etc.)

# Persistence
BF.SCANDUMP key iter                   # Incremental dump (iter 0 = start)
BF.LOADCHUNK key iter data             # Incremental restore
```

**Behavioral notes:**
- `BF.ADD` returns 1 if item was added (new), 0 if it may already exist (false positive on EXISTS doesn't mean it was added)
- Bloom filters can produce false positives but never false negatives
- `BF.RESERVE` lets you control the error rate and capacity upfront; without it, defaults are used
- Use `BF.SCANDUMP`/`BF.LOADCHUNK` for incremental backup/restore of large filters

## Cuckoo Filter

Alternative to Bloom filters with the additional ability to delete items and count occurrences. Supports "definitely in set" or "possibly not in set" semantics.

```
# Create (optional — auto-created on first ADD)
CF.RESERVE key capacity [BUCKETSIZE bucketsize] [MAXITERATIONS maxiterations] [EXPANSION expansion]

# Write
CF.ADD key item                        # Add item                        O(k+i)
CF.ADDNX key item                      # Add only if not exists          O(k+i)

# Delete
CF.DEL key item                        # Delete item                     O(k+i)

# Query
CF.EXISTS key item                     # Check if item exists            O(k+i)
CF.MEXISTS key item [item ...]         # Check multiple items            O(k*n)

# Count
CF.COUNT key item                      # Count occurrences               O(k+i)

# Info
CF.INFO key                            # Filter metadata

# Persistence
CF.SCANDUMP key iter                   # Incremental dump
CF.LOADCHUNK key iter data             # Incremental restore
```

**Behavioral notes:**
- Unlike Bloom filters, Cuckoo filters support deletion (`CF.DEL`)
- Cuckoo filters can contain the same item multiple times
- `CF.ADD` always succeeds (allows duplicates); use `CF.ADDNX` for unique inserts
- `CF.COUNT` returns the number of times an item was added (subject to false positives)

## Top-K

Tracks the K most frequent elements in a data stream. Useful for heavy-hitter detection and trending items.

```
# Create (required before use)
TOPK.RESERVE key topk [width depth decay]

# Write
TOPK.ADD key item [item ...]           # Add items, returns expelled items if any   O(n*k)

# Query
TOPK.QUERY key item [item ...]         # Check if items are in top-K                O(n)
TOPK.COUNT key item [item ...]         # Get estimated counts                       O(n)
TOPK.LIST key                          # Return full top-K list                     O(k)
TOPK.INCRBY key item count [item count ...]  # Increment item counts              O(n*k)

# Info
TOPK.INFO key                          # Sketch metadata (k, width, depth, decay)
```

**Behavioral notes:**
- `TOPK.RESERVE` parameters: `topk` = number of top elements to track, `width`/`depth` = sketch dimensions, `decay` = probability decay
- `TOPK.ADD` returns the expelled element for each addition that enters the top-K, or nil
- Results are approximate — items in the top-K list are not guaranteed to be the actual top-K

## Count-Min Sketch

Estimates item frequencies in a data stream with configurable accuracy. Useful for counting occurrences without storing every item.

```
# Create (required before use, two methods)
CMS.INITBYDIM key width depth          # Create by explicit dimensions
CMS.INITBYPROB key error_rate probability  # Create by error/probability targets

# Write
CMS.INCRBY key item increment [item increment ...]  # Increment counts   O(n)

# Query
CMS.QUERY key item [item ...]          # Get estimated counts            O(n)

# Info
CMS.INFO key                           # Sketch metadata (width, depth, total)

# Merge
CMS.MERGE destkey numkeys key [key ...] [WEIGHTS weight [weight ...]]  # Merge sketches
```

**Behavioral notes:**
- `CMS.INITBYPROB` is preferred — specify desired `error_rate` (accuracy) and `probability` (confidence)
- `CMS.QUERY` returns overestimates (never underestimates) — the count includes false positives from hash collisions
- `CMS.MERGE` combines multiple sketches; useful for aggregating distributed counters

## T-Digest

Estimates quantiles (percentiles) from a data stream. Useful for latency percentiles, value distributions, and histogram analysis.

```
# Create (required before use)
TDIGEST.CREATE key [COMPRESSION compression]

# Write
TDIGEST.ADD key value [value ...]      # Add observations                O(N)

# Quantile queries
TDIGEST.QUANTILE key quantile [quantile ...]   # Value at quantile(s)    O(log(N))
TDIGEST.CDF key value [value ...]              # CDF: P(X <= value)      O(log(N))

# Rank queries
TDIGEST.RANK key value [value ...]             # Approximate rank        O(log(N))
TDIGEST.REVRANK key value [value ...]          # Reverse rank            O(log(N))
TDIGEST.BYRANK key rank [rank ...]             # Value at rank           O(log(N))
TDIGEST.BYREVRANK key rank [rank ...]          # Value at reverse rank   O(log(N))

# Statistics
TDIGEST.MIN key                        # Minimum value                   O(1)
TDIGEST.MAX key                        # Maximum value                   O(1)
TDIGEST.TRIMMED_MEAN key low high      # Mean of values between quantiles  O(N)

# Management
TDIGEST.INFO key                       # Sketch metadata (capacity, merged/unmerged nodes, total weight)
TDIGEST.MERGE destkey numkeys key [key ...]  # Merge sketches           O(N)
TDIGEST.RESET key                      # Reset to empty                  O(1)
```

**Behavioral notes:**
- `COMPRESSION` controls accuracy vs memory (default: 100, higher = more accurate)
- `TDIGEST.QUANTILE 0.5` returns the approximate median
- `TDIGEST.CDF` returns the fraction of observations <= the given value
- After `TDIGEST.MERGE`, the destination sketch provides quantile estimates over the combined data

## TimeSeries

Store and query time series data (sensor readings, metrics, financial data). Timestamps are 64-bit integers in milliseconds. Supports aggregation, compaction rules, and label-based filtering.

```
# Create
TS.CREATE key [RETENTION ms] [ENCODING COMPRESSED|UNCOMPRESSED] [CHUNK_SIZE bytes]
            [DUPLICATE_POLICY BLOCK|FIRST|LAST|MIN|MAX|SUM]
            [IGNORE maxTimeDiff maxValDiff]
            [LABELS label value ...]                              # O(1)

# Write
TS.ADD key timestamp value [RETENTION ms] [ON_DUPLICATE policy]  # O(1), creates series if missing
       [LABELS label value ...]
       # timestamp: Unix ms, or * for server time
TS.MADD key timestamp value [key timestamp value ...]             # O(N), batch add
TS.INCRBY key value [TIMESTAMP ts] [RETENTION ms] [LABELS ...]   # O(1), counter/gauge
TS.DECRBY key value [TIMESTAMP ts] [RETENTION ms] [LABELS ...]   # O(1), decrement

# Single-series query
TS.GET key [LATEST]                                               # Latest sample           O(1)
TS.RANGE key from to [LATEST] [FILTER_BY_TS ts...]               # Range query             O(n/m+k)
          [FILTER_BY_VALUE min max] [COUNT n]
          [ALIGN align] [AGGREGATION fn bucketDuration]
          [BUCKETTIMESTAMP bt] [EMPTY]
TS.REVRANGE key from to [...]                                     # Same, descending order

# Multi-series query (filter by labels)
TS.MGET [LATEST] [WITHLABELS | SELECTED_LABELS lbl...]            # Latest from each series O(N)
        FILTER label=value [...]
TS.MRANGE from to [LATEST] [FILTER_BY_TS ts...]                  # Range across series     O(n/m+k)
          [FILTER_BY_VALUE min max] [WITHLABELS | SELECTED_LABELS lbl...]
          [COUNT n] [ALIGN align] [AGGREGATION fn bucketDuration]
          FILTER label=value [...] [GROUPBY label REDUCE reducer]
TS.MREVRANGE from to [...]                                        # Same, descending order

# Index
TS.QUERYINDEX filterExpr...                                       # List keys by labels     O(N)

# Compaction rules
TS.CREATERULE source dest AGGREGATION fn bucketDuration            # O(1), dest must exist
TS.DELETERULE source dest                                         # O(1)

# Management
TS.ALTER key [RETENTION ms] [LABELS label value ...]              # O(1)
TS.INFO key                                                       # Series metadata         O(1)
TS.DEL key from to                                                # Delete range            O(N)
```

**Aggregation functions:** `AVG`, `SUM`, `MIN`, `MAX`, `RANGE`, `COUNT`, `FIRST`, `LAST`, `STD.P`, `STD.S`, `VAR.P`, `VAR.S`, `TWA` (time-weighted avg), `countNaN`, `countAll` (Redis 8.6+)

**Timestamps:** Use `-` for earliest, `+` for latest in range queries.

**Label filter syntax:** `label=value` (exact), `label!=(value1,value2)` (exclude), `label=(v1,v2)` (OR), `label=` (exists). Filters are conjunctive (AND).

**DUPLICATE_POLICY** (on TS.CREATE): How to handle duplicate timestamps:
- `BLOCK` — reject duplicate (default)
- `FIRST` — keep first value
- `LAST` — keep latest value
- `MIN` / `MAX` / `SUM` — aggregate

**Compaction:** `TS.CREATERULE` automatically computes aggregation as data arrives. Only data added *after* rule creation is processed. Destination key must already exist.

## Full-Text Search (RediSearch)

Full-text search, secondary indexing, and aggregation over Redis hashes and JSON documents.

```
# Index management
FT.CREATE index [ON HASH|JSON] [PREFIX count prefix...]
  [FILTER filter] [LANGUAGE lang] [TEMPORARY seconds]
  [NOOFFSETS] [NOHL] [NOFIELDS] [NOFREQS]
  [STOPWORDS count word...]
  [SKIPINITIALSCAN]
  SCHEMA field [AS alias] TEXT|TAG|NUMERIC|GEO|VECTOR|GEOSHAPE
               [SORTABLE [UNF]] [NOINDEX] [...]                # O(K) create, O(N) scan

FT.ALTER index [SKIPINITIALSCAN] SCHEMA ADD field ...           # Add fields             O(N)
FT.INFO index                                                   # Index stats            O(1)
FT.DROPINDEX index [DD]                                         # Drop index (DD=del docs) O(1)/O(N)

# Aliases
FT.ALIASADD alias index                                         # Create alias           O(1)
FT.ALIASDEL alias                                               # Remove alias           O(1)
FT.ALIASUPDATE alias index                                      # Point alias to index   O(1)

# Search
FT.SEARCH index query [NOCONTENT] [VERBATIM] [WITHSCORES]       # O(N) for single-word
  [FILTER field min max ...] [GEOFILTER field lon lat radius unit]
  [RETURN count field [AS name] ...]
  [SUMMARIZE [FIELDS count field...] [FRAGS n] [LEN n] [SEPARATOR s]]
  [HIGHLIGHT [FIELDS count field...] [TAGS open close]]
  [SLOP slop] [INORDER] [LANGUAGE lang] [EXPANDER exp]
  [SCORER scorer] [EXPLAINSCORE] [PAYLOAD payload]
  [SORTBY field [ASC|DESC]] [LIMIT offset count]
  [PARAMS nargs name value ...] [DIALECT dialect]
  [TIMEOUT ms]

# Aggregation pipeline
FT.AGGREGATE index query [VERBATIM]                             # Non-deterministic
  [LOAD count field ...] [TIMEOUT ms]
  [GROUPBY nargs prop... [REDUCE fn nargs arg... [AS name]]...]
  [SORTBY nargs prop [ASC|DESC]... [MAX n]]
  [APPLY expression AS name]...
  [LIMIT offset count] [FILTER filter]
  [WITHCURSOR [COUNT n] [MAXIDLE ms]]
  [PARAMS nargs name value ...] [DIALECT dialect]

# Dictionary
FT.DICTADD dict word [word ...]                                 # Add words              O(1)
FT.DICTDEL dict word [word ...]                                 # Remove words           O(1)
FT.DICTDUMP dict                                                # List words             O(N)

# Synonyms
FT.SYNUPDATE index groupid [SKIPINITIALSCAN] term [term ...]    # O(1)
FT.SYNDUMP index                                                # O(N)

# Suggestions
FT.SUGADD key string score [INCR] [PAYLOAD payload]             # O(1)
FT.SUGGET key prefix [FUZZY] [WITHSCORES] [WITHPAYLOADS]        # O(n)
      [MAX num] [DIALECT dialect]
FT.SUGDEL key string                                            # O(1)
FT.SUGLEN key                                                   # O(1)

# Other
FT._LIST                                                        # List all indexes       O(N)
FT.TAGVALS index field                                          # Distinct tag values    O(N)
FT.PROFILE index query [LIMITED] [DIALECT dialect]              # Query profiling
FT.EXPLAIN index query [DIALECT dialect]                        # Show query execution plan
FT.SPELLCHECK index query [DISTANCE d] [DIALECT dialect]        # Spell check
FT.CONFIG SET key value                                         # Set runtime config
FT.CONFIG GET key                                               # Get runtime config

# Cursors (for paginated FT.AGGREGATE)
FT.CURSOR READ index cursor [COUNT count]                       # Read next page
FT.CURSOR DEL index cursor                                      # Delete cursor
```

**FT.CREATE field types:**
- `TEXT` — full-text searchable, supports stemming, phonetic matching
- `TAG` — exact match labels (categories, IDs)
- `NUMERIC` — range queries (prices, timestamps)
- `GEO` — geographic coordinates (lon, lat)
- `VECTOR` — vector similarity (KNN, cosine/L2/IP)
- `GEOSHAPE` — geometric shapes (SPHERICAL|FLAT)

**Query syntax (DIALECT 2+):**
- `hello world` — union (OR) of terms
- `"hello world"` — exact phrase
- `@field:term` — field-specific search
- `@price:[100 200]` — numeric range
- `@location:[-122.41 37.77 5 km]` — geo radius
- `*=>[KNN 10 @vec $blob]` — vector similarity (KNN)
- `-term` — exclude term
- `~term` — optional term
- `*` — match all documents

**FT.AGGREGATE pipeline stages:** `GROUPBY` + `REDUCE` → `SORTBY` → `APPLY` → `LIMIT` → `FILTER`. Available reducers: `COUNT`, `SUM`, `MIN`, `MAX`, `AVG`, `COUNT_DISTINCT`, `COUNT_DISTINCTISH`, `QUANTILE`, `STDDEV`, `FIRST_VALUE`, `RANDOM_SAMPLE`, `TOLIST`.

**Behavioral notes:**
- Use `DIALECT 2+` for vector queries and modern query syntax
- `FT.SEARCH` returns `[total_count, doc_id, field, value, ...]` array
- Without `SORTBY`, pagination (`LIMIT`) results are non-deterministic
- `FT.CREATE` with `PREFIX` auto-indexes matching keys; new keys are indexed on write
- In cluster mode, index and documents must be on the same shard (use hash tags)
- `SORTABLE` fields increase memory usage but enable fast sorting
- Maximum 1024 fields per index, 128 TEXT fields
