# Server Administration

## Table of Contents

- [ACL Management](#acl-management)
- [Client Management](#client-management)
- [Configuration](#configuration)
- [Replication Acknowledgment](#replication-acknowledgment)
- [Persistence](#persistence)
- [Replication](#replication)
- [Server Lifecycle](#server-lifecycle)

## ACL Management

Redis ACL (Access Control List) controls which clients can execute which commands and access which keys. Available since Redis 6.0.

### User Management

```bash
# Create/modify user with rules
redis-cli ACL SETUSER username [rule ...]

# Delete user
redis-cli ACL DELUSER username [username ...]

# List all users
redis-cli ACL LIST

# Get detailed user info
redis-cli ACL GETUSER username

# Show current authenticated user
redis-cli ACL WHOAMI
```

### ACL Rules

Rules are applied left-to-right and cumulative (unless using `reset`):

```
# Enable/disable user
on                                    # Enable user
off                                   # Disable user (default for new users)
reset                                 # Remove all rules (clean slate)

# Password
>password                             # Add password (SHA256 hash stored)
<password                             # Remove password
#password                             # Add SHA256 hash directly

# Command permissions
+command                              # Allow specific command
-command                              # Deny specific command
+@category                            # Allow command category (e.g., +@string, +@read)
-@category                            # Deny command category
+@all                                 # Allow all commands
-@all                                 # Deny all commands (default)
+|command                             # Allow command with subcommand (e.g., +|config|get)

# Key permissions
~pattern                              # Allow key pattern (~* = all keys, default: nothing)
%R~pattern                            # Read permission on pattern
%W~pattern                            # Write permission on pattern
~RW~pattern                           # Read+Write permission (same as ~pattern)
allkeys                               # Alias for ~*

# Pub/Sub channel permissions (Redis 6.2+)
&pattern                              # Allow channel pattern
allchannels                          # Allow all channels

# Selectors (Redis 7.0+) — independent permission sets
(+command ~pattern)                   # Additional permission scope
```

### ACL SETUSER Examples

```bash
# Create admin user
redis-cli ACL SETUSER admin on >strongpassword ~* +@all

# Create read-only user
redis-cli ACL SETUSER readonly on >password ~* +@read -@all

# Create user with limited key access
redis-cli ACL SETUSER app1 on >password ~app1:* +@read +@string +@hash -@all

# Reset user completely and redefine
redis-cli ACL SETUSER myuser reset on >newpass ~cache:* +@read +get +set

# User with selectors (Redis 7.0+)
redis-cli ACL SETUSER multi on +GET allkeys (+SET ~app1:*)
```

### ACL Maintenance

```bash
# Dry-run: check if user can execute command
redis-cli ACL DRYRUN username command [arg ...]

# Generate random password
redis-cli ACL GENPASS [bits]           # Default 256 bits

# Save ACLs to config file
redis-cli ACL SAVE

# Load ACLs from config file
redis-cli ACL LOAD

# View ACL audit log
redis-cli ACL LOG [count]
redis-cli ACL LOG RESET                # Clear log

# List command categories
redis-cli ACL CAT [category]           # Without arg: list categories
```

## Client Management

### Client Information

```bash
# List all connected clients
redis-cli CLIENT LIST [TYPE normal|master|replica|pubsub] [ID id [id ...]]

# Get info about current connection
redis-cli CLIENT INFO

# Get current client ID
redis-cli CLIENT ID

# Get client name
redis-cli CLIENT GETNAME
```

`CLIENT LIST` output fields include: `id`, `addr`, `laddr`, `fd`, `name`, `age`, `idle`, `flags`, `db`, `sub`, `psub`, `ssub`, `multi`, `qbuf`, `qbuf-free`, `argv-mem`, `multi-mem`, `obl`, `oll`, `omem`, `tot-mem`, `cmds`, `redir`, `user`, `resp`, `lib-name`, `lib-ver`, `watch`, `io-thread`.

### Client Control

```bash
# Set client name (for identification in CLIENT LIST)
redis-cli CLIENT SETNAME my-app-worker

# Disconnect client
redis-cli CLIENT KILL ADDR ip:port
redis-cli CLIENT KILL ID client-id
redis-cli CLIENT KILL TYPE normal|master|replica|pubsub
redis-cli CLIENT KILL USER username
redis-cli CLIENT KILL SKIPME yes|no     # Skip current connection
redis-cli CLIENT KILL LADDR ip:port     # Kill by local address
redis-cli CLIENT KILL MAXAGE max-age    # Kill connections older than max-age seconds

# Pause/unpause all clients
redis-cli CLIENT PAUSE timeout [WRITE|ALL]    # Milliseconds
redis-cli CLIENT UNPAUSE

# Unblock a client blocked on blocking command
redis-cli CLIENT UNBLOCK client-id [TIMEOUT|ERROR]
```

### Client Tracking (Server-assisted Client Caching, Redis 6.0+)

```bash
# Enable tracking
redis-cli CLIENT TRACKING ON [REDIRECT client-id] [PREFIX prefix [prefix ...]] [BCAST] [OPTIN] [OPTOUT] [NOLOOP]

# Disable tracking
redis-cli CLIENT TRACKING OFF

# Get tracking info
redis-cli CLIENT TRACKINGINFO

# Opt-in/out caching control
redis-cli CLIENT CACHING YES|NO
```

### Client Settings

```bash
# Set client info metadata
redis-cli CLIENT SETINFO LIB-NAME my-client
redis-cli CLIENT SETINFO LIB-VER 1.0.0

# No-touch mode (skip key last-access-time update)
redis-cli CLIENT NO-TOUCH ON|OFF

# No-evict mode (reject eviction during client operations)
redis-cli CLIENT NO-EVICT ON|OFF
```

## Configuration

### Reading Configuration

```bash
# Get specific parameter
redis-cli CONFIG GET maxmemory

# Get with glob patterns (Redis 7.0+ supports multiple)
redis-cli CONFIG GET *max*
redis-cli CONFIG GET maxmemory *timeout*

# Get all configuration
redis-cli CONFIG GET '*'
```

### Modifying Configuration

```bash
# Set parameter at runtime
redis-cli CONFIG SET maxmemory 100mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET timeout 300

# Set multiple parameters in one call (Redis 7.0+)
redis-cli CONFIG SET maxmemory 100mb maxmemory-policy allkeys-lru

# Write current config to redis.conf
redis-cli CONFIG REWRITE
```

Common runtime parameters:
```
maxmemory                   # Max memory (e.g., 100mb, 1gb, 0 = unlimited)
maxmemory-policy            # Eviction: allkeys-lru, volatile-lru, allkeys-lfu, etc.
timeout                     # Client idle timeout (seconds, 0 = disabled)
save                        # RDB save schedule (e.g., "900 1 300 10 60 10000")
appendonly                  # AOF persistence: yes|no
appendfsync                 # AOF sync: always|everysec|no
notify-keyspace-events      # Keyspace notifications (e.g., "Ex" for expired events)
```

### Reset Statistics

```bash
redis-cli CONFIG RESETSTAT            # Reset INFO statistics counters
```

## Replication Acknowledgment

### WAIT

Block until write commands are confirmed by the specified number of replicas.

```bash
# Wait for 2 replicas to confirm, up to 5 seconds
redis-cli SET mykey myvalue
redis-cli WAIT 2 5000
# Returns: number of replicas that confirmed (integer)

# Fire and forget (don't wait)
redis-cli WAIT 0 0
```

Useful for ensuring data durability across replicas before proceeding. The count reflects replicas that acknowledged writes up to the moment WAIT was issued.

### WAITAOF (Redis 7.2+)

Block until writes are confirmed as fsynced to AOF on local and/or replica nodes.

```bash
# Wait for local fsync + 1 replica AOF confirmation, up to 5 seconds
redis-cli WAITAOF 1 1 5000
# Returns: local:aof_fsynced, replicated:aof_fsynced_count
```

Parameters:
- `numlocal` — required local AOF fsync count (0 = don't wait for local)
- `numreplicas` — required replica AOF fsync count (0 = don't wait for replicas)
- `timeout` — milliseconds (0 = wait forever)

## Persistence

### RDB Snapshots

```bash
# Background save (non-blocking, forks a child process)
redis-cli BGSAVE
# Background saving started

# Synchronous save (blocks the server — avoid in production)
redis-cli SAVE

# Check last save time
redis-cli LASTSAVE
# (integer) 1735689600

# Check save progress
redis-cli INFO persistence | grep rdb_last_save_time
```

### AOF Persistence

```bash
# Rewrite AOF in background (compact the append-only file)
redis-cli BGREWRITEAOF
# Background append only file rewriting started

# Check AOF status
redis-cli INFO persistence | grep aof_enabled

# Force AOF rewrite via config
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET appendfsync everysec    # always|everysec|no
```

### Persistence Configuration

```bash
# RDB save schedule: save after N seconds if at least M keys changed
redis-cli CONFIG GET save
redis-cli CONFIG SET save "900 1 300 10 60 10000"

# AOF settings
redis-cli CONFIG GET appendonly
redis-cli CONFIG GET appendfsync
redis-cli CONFIG GET auto-aof-rewrite-percentage
```

## Replication

### Configure Replication

```bash
# Make current instance a replica of another Redis
redis-cli REPLICAOF host port
# OK

# Promote replica back to master
redis-cli REPLICAOF NO ONE
# OK

# Check replication status
redis-cli INFO replication
redis-cli ROLE
```

### Replication Info

```bash
redis-cli INFO replication | grep -E "role|connected_slaves|master_repl_offset"
```

## Server Lifecycle

### Shutdown

```bash
# Save and shutdown (blocks until complete)
redis-cli SHUTDOWN NOSAVE|SAVE

# Shutdown with save (default if not specified)
redis-cli SHUTDOWN SAVE

# Shutdown without saving
redis-cli SHUTDOWN NOSAVE

# Check if server is responding
redis-cli PING
```

### Failover (Redis 7.0+)

```bash
# Coordinated failover via sentinel-like mechanism
redis-cli FAILOVER [TO host port [FORCE]] [ABORT] [TIMEOUT milliseconds]
```
