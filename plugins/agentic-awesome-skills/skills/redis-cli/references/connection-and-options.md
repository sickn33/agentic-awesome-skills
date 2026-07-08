# Connection and CLI Options

## Table of Contents

- [Connection Methods](#connection-methods)
- [CLI Flags Reference](#cli-flags-reference)
- [Environment Variables](#environment-variables)
- [SSL/TLS Configuration](#ssltls-configuration)
- [Interactive Mode](#interactive-mode)
- [String Quoting and Escaping](#string-quoting-and-escaping)

## Connection Methods

### Basic Connection

By default, redis-cli connects to `127.0.0.1:6379` with no password.

```bash
# Default connection
redis-cli

# Custom host and port
redis-cli -h redis15.localnet.org -p 6390 PING

# Password authentication
redis-cli -a myUnguessablePazzzzzword123 PING

# ACL-style authentication (Redis 6+)
redis-cli --user admin --pass myPassword PING

# Specific database number
redis-cli -n 2 DBSIZE
```

### URI Connection

```bash
# Full URI format
redis-cli -u redis://user:password@host:port/dbnum PING

# Without username (use "default")
redis-cli -u redis://default:password@localhost:6379/0 PING

# TLS scheme
redis-cli -u rediss://default:password@redis.example.com:6380/0 PING

# Minimal URI
redis-cli -u redis://localhost:6379 PING
```

User, password, and dbnum are optional in the URI. For TLS, use the `rediss://` scheme.

### IPv4/IPv6 Preference

```bash
redis-cli -4 PING   # Prefer IPv4
redis-cli -6 PING   # Prefer IPv6
```

## CLI Flags Reference

```
Usage: redis-cli [OPTIONS] [cmd [arg [arg ...]]]

Connection:
  -h <hostname>      Server hostname (default: 127.0.0.1)
  -p <port>          Server port (default: 6379)
  -t <timeout>       Connection timeout in seconds (decimals allowed, default: 0 = no limit)
  -s <socket>        Unix socket (overrides hostname and port)
  -a <password>      Password (also via REDISCLI_AUTH env var)
  --user <username>  ACL username (requires -a)
  --pass <password>  Alias of -a
  --askpass          Prompt for password from STDIN (ignores -a and REDISCLI_AUTH)
  -u <uri>           Connection URI: redis://user:password@host:port/dbnum
  -n <db>            Database number

Protocol:
  -2                 Start in RESP2 protocol mode
  -3                 Start in RESP3 protocol mode

Execution:
  -r <repeat>        Execute command N times (-1 for infinite)
  -i <interval>      Seconds between repeated commands (supports decimals like 0.1)
                     Also used in --scan, --stat, --bigkeys, --memkeys, --keystats
  -x                 Read last argument from STDIN
  -X <tag>           Read tagged argument from STDIN

Output:
  --raw              Raw output (no type prefixes, default when not TTY)
  --no-raw           Force human-readable output even when piping
  --csv              CSV output format
  --json             JSON output (default RESP3, use -2 for RESP2)
  --quoted-json      JSON with ASCII-safe quoted strings
  -d <delimiter>     Delimiter between response bulks in raw mode (default: \n)
  -D <delimiter>     Delimiter between responses in raw mode (default: \n)

Cluster:
  -c                 Enable cluster mode (follow -ASK and -MOVED redirections)

Behavior:
  -e                 Return non-zero exit code on command failure
  --verbose          Verbose output
  --no-auth-warning  Suppress password-on-CLI warning
  --quoted-input     Force input handling as quoted strings
  --show-pushes <yn> Print RESP3 PUSH messages (default: yes in TTY)

Special Modes:
  --stat             Continuous server stats
  --latency          Continuous latency sampling
  --latency-history  Latency tracking over time (15s windows, change with -i)
  --latency-dist     Latency spectrum visualization (requires xterm 256 colors)
  --lru-test <keys>  Simulate LRU cache workload
  --replica          Simulate replica, show commands from master
  --rdb <filename>   Transfer RDB dump from remote server
  --functions-rdb <filename>  RDB dump with functions only
  --pipe             Transfer raw Redis protocol from stdin
  --pipe-timeout <n> Pipe mode timeout in seconds (default: 30, 0 = forever)
  --bigkeys          Scan for keys with many elements
  --memkeys          Scan for keys consuming memory
  --memkeys-samples <n>  Memory sampling count
  --keystats         Combined bigkeys + memkeys with distribution
  --keystats-samples <n> Key stats sampling count
  --hotkeys          Find hot keys (requires *lfu maxmemory-policy)
  --scan             List keys using SCAN
  --pattern <pat>    Pattern for --scan, --bigkeys, --memkeys, --keystats, --hotkeys
  --quoted-pattern <pat>  Same as --pattern, but accepts quoted binary-safe strings
  --count <count>    COUNT hint for scan operations
  --cursor <n>       Start scan at cursor (after Ctrl-C)
  --top <n>          Display top N key sizes (default: 10, with --keystats)
  --intrinsic-latency <sec>  Measure system baseline latency
  --eval <file>      Execute Lua script
  --ldb              Enable Lua debugger with --eval
  --ldb-sync-mode    Synchronous Lua debugger (blocks server)
  --cluster <cmd>    Cluster management command

Examples:
  redis-cli -u redis://default:PASSWORD@localhost:6379/0
  cat /etc/passwd | redis-cli -x set mypasswd
  redis-cli -D "" --raw dump key > key.dump && redis-cli -X dump_tag restore key2 0 dump_tag replace < key.dump
  redis-cli -r 100 lpush mylist x
  redis-cli -r 100 -i 1 info | grep used_memory_human:
  redis-cli --eval myscript.lua key1 key2 , arg1 arg2 arg3
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `REDISCLI_AUTH` | Password for authentication (preferred over `-a` flag) |
| `REDISCLI_HISTFILE` | Custom history file path (default: `~/.rediscli_history`, set to `/dev/null` to disable) |
| `REDISCLI_RCFILE` | Custom preferences file path (default: `~/.redisclirc`) |
| `HOME` | Base directory for `.rediscli_history` and `.redisclirc` |

**Security tip**: Always prefer `REDISCLI_AUTH` over `-a <password>`. The `-a` flag exposes the password in shell history and process listings (`ps aux`).

## SSL/TLS Configuration

```bash
# Enable TLS with trusted CA
redis-cli --tls --cacert /path/to/ca.crt -h redis.example.com PING

# CA certificate directory
redis-cli --tls --cacertdir /etc/ssl/certs -h redis.example.com PING

# Client certificate authentication (mutual TLS)
redis-cli --tls --cacert /path/to/ca.crt \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  -h redis.example.com PING
```

## Interactive Mode

### Startup

Run `redis-cli` without arguments to enter interactive mode:

```
$ redis-cli
127.0.0.1:6379> PING
PONG
```

The prompt shows `host:port[db_number]` and updates when you switch databases or connect to a different server.

### Connection Management

```
CONNECT <host> <port>    # Connect to different instance
SELECT <db>              # Switch database (prompt updates to show db number)
QUIT                     # Exit redis-cli
```

On disconnection, redis-cli automatically attempts to reconnect. It re-selects the last database but loses other state (e.g., MULTI/EXEC transactions).

### Editing and History

- **Line editing**: Built-in linenoise library — no external dependencies
- **History**: Arrow keys (up/down) access previous commands. Stored in `~/.rediscli_history`
- **Tab completion**: Press TAB to complete command names
- **Syntax hints**: Shown after entering a command name (toggle with `:set hints` / `:set nohints`)
- **Reverse search**: `Ctrl+R` for history search

### Preferences

Set via `:set` command in interactive mode or in `~/.redisclirc`:

```
:set hints          # Enable syntax hints
:set nohints        # Disable syntax hints
```

### Help System

```
HELP @<category>     # Show all commands in a category
HELP <command>       # Show help for a specific command

# Available categories:
# @generic, @string, @list, @set, @sorted_set, @hash,
# @pubsub, @transactions, @connection, @server, @scripting,
# @hyperloglog, @cluster, @geo, @stream
```

### Screen Control

```
CLEAR               # Clear terminal screen
```

### Repeating Commands

Prefix any command with a number to repeat it:

```
5 INCR mycounter    # Execute INCR mycounter 5 times
```

## String Quoting and Escaping

When a string value contains whitespace or non-printable characters, use quoting:

**Double-quoted strings** support escape sequences:
- `\"` `\\` `\n` `\r` `\t` `\b` `\a` `\xhh` (hex)

**Single-quoted strings** are literal, only escaping:
- `\'` `\\`

```
SET mykey "Hello\nWorld"           # Two lines: Hello / World
GET mykey
# Hello
# World

AUTH user ">^8T>6Na{u|jp>+v\"55\@_"  # Escaped quotes in password
```

When the output target is not a terminal, redis-cli automatically uses raw output mode (no type prefixes like `(integer)`). Force with `--raw` or `--no-raw`.
