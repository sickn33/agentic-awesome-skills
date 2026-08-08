Part of the psql meta-command reference. See also: meta-commands-inspection.md, meta-commands-formatting.md

# psql Meta-Commands — Core Reference

Comprehensive reference for all psql backslash commands, organized by category. This covers every meta-command from the official PostgreSQL documentation.

## Table of Contents

- [The Query Buffer](#the-query-buffer)
- [Meta-Command Argument Parsing](#meta-command-argument-parsing)
- [General](#general)
- [Connection Management](#connection-management)
- [Query Execution](#query-execution)
- [Data Import/Export](#data-importexport)
- [Large Objects](#large-objects)
- [Scripting and Control Flow](#scripting-and-control-flow)
- [Help and Information](#help-and-information)

---

## The Query Buffer

psql maintains an internal **query buffer** — a working area where SQL commands are assembled before being sent to the server. Understanding how the buffer works clarifies the behavior of many meta-commands:

- **Typing SQL** (without a terminating semicolon) appends text to the query buffer.
- **Semicolon (`;`)** sends the buffer contents to the server and clears it.
- **`\r` / `\reset`** discards the buffer without executing it.
- **`\p` / `\print`** displays the current buffer contents.
- **`\w` / `\write`** writes the buffer to a file or pipe.
- **`\e` / `\edit`** opens the buffer in an external editor; when the editor closes, the modified content is re-parsed — complete queries (those ending with `;`) are executed immediately, and any remaining text stays in the buffer.
- **`\g`** sends the buffer like a semicolon but accepts optional formatting and output-redirection arguments.
- Many meta-commands that operate on "the query buffer" fall back to the most recently executed query if the buffer is empty (e.g., `\g`, `\gdesc`, `\p`).

---

## Meta-Command Argument Parsing

Most meta-commands accept arguments. Understanding how psql parses these arguments is essential for using them correctly, especially in scripts.

### Quoting Rules

Arguments are separated by whitespace. To include whitespace in an argument:

- **Single quotes**: `'hello world'` — the argument is `hello world`. Single quotes prevent variable interpolation and backquote expansion.
- **Double quotes**: `"hello world"` — the argument is `hello world`. Variable interpolation (`:varname`) IS performed inside double quotes, but backquote expansion is NOT.
- **Unquoted**: Arguments are delimited by whitespace; no quoting needed for single tokens.

### C-like Escape Sequences

Within single-quoted strings, these C-like escape sequences are recognized:

| Escape | Meaning |
|--------|---------|
| `\n` | Newline |
| `\t` | Tab |
| `\b` | Backspace |
| `\r` | Carriage return |
| `\f` | Form feed |
| `\digits` | Octal byte value |
| `\xhexdigits` | Hexadecimal byte value |

A backslash followed by any other character is treated as that character literally (e.g., `\\` → `\`, `\'` → `'`).

### Variable Interpolation in Arguments

psql variable references (`:varname`) are expanded in meta-command arguments wherever they appear, EXCEPT inside single-quoted strings. Double-quoted strings DO expand variable references.

```sql
\set dest '/tmp/output.txt'
\echo :dest              -- expands to /tmp/output.txt
\echo ':dest'            -- literal :dest (no expansion)
\echo ":dest"            -- expands to /tmp/output.txt
```

### Testing Variable Existence with `:{?varname}`

The syntax `:{?variable_name}` tests whether a variable is defined. It expands to `TRUE` or `FALSE` (literally), making it useful in `\if` conditions:

```sql
\if :{?myvar}
  \echo 'myvar is defined'
\else
  \echo 'myvar is not defined'
\endif
```

### Backquote Expansion

Text enclosed in backquotes (`` ` ``) within meta-command arguments is executed as a shell command, and its standard output (with trailing newlines removed) replaces the backquoted text. This is useful for injecting dynamic values:

```sql
\echo `date`                    -- shows current date
\echo `whoami`                  -- shows current OS user
\set mydate `date +%Y%m%d`
\echo :mydate                   -- e.g., 20260402
```

Backquote expansion is NOT performed inside single-quoted strings or in lines that are skipped by `\if`/`\else`/`\elif`.

**Variable interpolation inside backquotes**: psql variable references (`:varname`, `:'varname'`) are expanded within backquoted text before the shell command is executed. This means you can use psql variables in shell commands:

```sql
\set logfile /tmp/query.log
\echo `cat :logfile`              -- expands :logfile before running cat
\echo `echo :'%varname'`          -- :'...' form is preferred for shell safety
```

The `:'varname'` form (quoted) is preferred inside backquotes because it properly escapes special characters. However, `:'varname'` will error if the variable value contains carriage return (`\r`) or line feed (`\n`) characters.

### SQL Identifier Arguments

Some meta-commands take arguments that describe database objects (e.g., `\df`, `\ef`). These follow special rules:

- Unquoted names are folded to lowercase (matching SQL identifier behavior)
- Double-quoted names preserve case: `\df "MyFunction"`
- Mixed quoting: unquoted parts are folded, double-quoted parts are preserved. `FOO"BAR"BAZ` becomes `fooBARbaz`
- Trailing `()` with optional type names specifies argument types: `\df my_func(integer, text)`
- `*` matches all: `\df *`

### Argument Parsing Stop Rules

- The entire remainder of the line is taken as the argument for commands like `\!`, `\copy`, `\o |command`, `\echo` (after processing quoting and interpolation).
- A `\\` (double backslash) anywhere in the argument text causes psql to stop parsing at that point — everything before `\\` is the argument, everything after is ignored. This is useful for adding inline comments:
  ```sql
  \echo hello \\ this is a comment
  -- outputs: hello
  ```

---

## General

### `\;`

Appends a semicolon to the query buffer without triggering command execution. This allows combining multiple SQL statements into a single server request:

```sql
select 1\; select 2\; select 3;
```

All three statements are sent in one request when the non-backslashed semicolon is reached. The server executes them as a single transaction unless explicit `BEGIN`/`COMMIT` is included.

### `\! [command]`

With no argument, escapes to a sub-shell (psql resumes when sub-shell exits). With an argument, executes the shell command. The entire remainder of the line is taken as the command — no variable interpolation or backquote expansion.

```sql
\! ls -la /tmp
\! pwd
```

### `\copyright`

Shows the copyright and distribution terms of PostgreSQL.

---

## Connection Management

### `\c` or `\connect [ -reuse-previous=on|off ] [ dbname [ username ] [ host ] [ port ] | conninfo ]`

Establishes a new connection to a PostgreSQL server. If the connection succeeds, the previous connection is closed.

**Positional syntax:**
```sql
\c mydb myuser host.dom 6432
\c - - newhost -              -- change only the host
```

**Connection string syntax:**
```sql
\c service=foo
\c "host=localhost port=5432 dbname=mydb connect_timeout=10 sslmode=disable"
\c postgresql://tom@localhost/mydb?application_name=myapp
```

**`-reuse-previous` flag:**
- By default, parameters are re-used in positional syntax, but NOT with conninfo strings
- Pass `-reuse-previous=on` to re-use all unspecified parameters from the current connection
- Pass `-reuse-previous=off` to prevent re-use

```sql
\c -reuse-previous=on sslmode=require    -- changes only sslmode
```

**Behavior on failure:**
- Interactive mode: previous connection is kept
- Script mode: previous connection is closed; all database commands fail until next successful `\c`

### `\conninfo`

Outputs connection information including database, user, host, port, and SSL status. The `Client User` field shows the user at connection time; `Superuser` shows whether the current execution context has superuser privileges (may differ after `SET ROLE`).

### `\encoding [ encoding ]`

Sets the client character set encoding. Without an argument, shows the current encoding.

### `\password [ username ]`

Changes the password for the specified user (default: current user). Prompts for the new password, encrypts it, and sends it as `ALTER ROLE`. The new password does NOT appear in command history, server log, or anywhere else.

---

## Query Execution

### `\g [ (option=value [...]) ] [ filename ]` / `\g [ (option=value [...]) ] [ |command ]`

Sends the current query buffer to the server for execution.

- Without arguments: equivalent to a semicolon
- With a filename: output written to file (only if the query succeeds and returns zero or more tuples)
- With `|command`: output piped to shell command (no variable interpolation in command). Only written if the query succeeds and returns zero or more tuples.

**Note**: The file or command is written to only if the query successfully returns zero or more tuples — not if the query fails or is a non-data-returning SQL command. This means even an empty result set (0 rows) will trigger output.

```sql
SELECT * FROM users \g (format=csv footer=off) /tmp/users.csv
SELECT count(*) FROM users \g | wc -l
```

If the query buffer is empty, the most recently sent query is re-executed.

### `\gx [ (option=value [...]) ] [ filename ]`

Like `\g`, but forces expanded output mode for this query (as if `expanded=on` were included).

### `\gdesc`

Shows the column names and data types of the result without actually executing the query. Syntax errors are still reported. If the query buffer is empty, describes the most recently sent query.

### `\gset [ prefix ]`

Executes the query and stores the result in psql variables. The query must return exactly one row. Each column becomes a variable named after the column (optionally prefixed). NULL columns unset the variable rather than setting it. If the query fails or does not return one row, no variables are changed.

```sql
SELECT 'hello' AS var1, 10 AS var2
\gset result_
\echo :result_var1 :result_var2
-- outputs: hello 10
```

### `\gexec`

Executes the current query, then treats each column of each row as a SQL statement to execute. NULL fields are ignored. Generated queries are sent literally — no psql meta-commands or variable references. Execution continues on error unless `ON_ERROR_STOP` is set. Setting `ECHO` to `all` or `queries` is recommended when using `\gexec` to see what's being executed.

```sql
SELECT format('CREATE INDEX ON my_table(%I)', attname)
FROM pg_attribute
WHERE attrelid = 'my_table'::regclass AND attnum > 0
ORDER BY attnum
\gexec
```

### `\crosstabview [ colV [ colH [ colD [ sortcolH ] ] ] ]`

Executes the query and displays results as a crosstab (pivot table). The query must return at least three columns. Column specs can be column numbers (1-based) or names.

- `colV` — vertical header (default: column 1)
- `colH` — horizontal header (default: column 2, must differ from colV)
- `colD` — data displayed in the grid (default: the remaining column)
- `sortcolH` — optional sort column for horizontal header (must be integers)

Error is reported if multiple rows map to the same cell.

### `\bind [ parameter ] ...`

Sets query parameters for the next query execution. Uses the extended query protocol. Can be combined with `\g`, `\gx`, or `\gset`:

```sql
INSERT INTO tbl1 VALUES ($1, $2) \bind 'first value' 'second value' \g
SELECT * FROM tbl1 WHERE id = $1 \bind 'first value' \gx
SELECT id, name FROM tbl1 WHERE id = $1 \bind 'first value' \gset result_
```

### `\bind_named statement_name [ parameter ] ...`

Like `\bind`, but takes the name of an existing prepared statement as the first parameter.

```sql
INSERT INTO tbls1 VALUES ($1, $2) \parse stmt1
\bind_named stmt1 'first value' 'second value' \g
```

### `\parse statement_name`

Creates a prepared statement from the current query buffer. An empty string denotes the unnamed prepared statement.

```sql
SELECT $1 \parse stmt1
```

### `\close_prepared statement_name`

Closes the specified prepared statement. No-op if it doesn't exist.

```sql
SELECT $1 \parse stmt1
\close_prepared stmt1
```

---

## Data Import/Export

### `\copy`

Performs a client-side copy. Unlike SQL `COPY`, this runs with the client's filesystem and permissions (no superuser required).

```
\copy { table [(column_list)] } FROM { 'filename' | program 'command' | stdin | pstdin }
      [ [ WITH ] ( option [, ...] ) ] [ WHERE condition ]

\copy { table [(column_list)] | (query) } TO { 'filename' | program 'command' | stdout | pstdout }
      [ [ WITH ] ( option [, ...] ) ]
```

**Key behaviors:**
- The entire remainder of the line is always taken as arguments (no variable interpolation or backquote expansion)
- For `FROM stdin`, data continues until `\.` or EOF
- `pstdin`/`pstdout` always use psql's actual stdin/stdout regardless of `\o` setting
- All options other than source/destination are as specified for SQL `COPY`

**WARNING**: `program 'command'` executes a shell command with client user privileges. Never concatenate untrusted input.

**Tip**: For multi-line copy or variable interpolation, use `COPY ... TO STDOUT` terminated with `\g filename` or `\g |command`.

---

## Large Objects

### `\lo_export loid filename`

Reads the large object with the given OID from the database and writes it to the specified file. Uses client-side permissions (unlike server-side `lo_export`).

### `\lo_import filename [ comment ]`

Imports a file as a large object. Returns the OID assigned. Always provide a human-readable comment.

```sql
\lo_import '/home/user/photo.jpg' 'product photo'
-- Returns: lo_import 152801
```

### `\lo_list[x+]`

Lists all large objects in the database with their comments. `+` shows permissions.

### `\lo_unlink loid`

Deletes the large object with the specified OID.

---

## Scripting and Control Flow

### `\i` / `\include` filename

Reads and executes input from the file. Relative to current working directory. Use `-` for stdin.

**stdin behavior**: When using `\i -`, psql reads from standard input until an EOF indication or `\q` meta-command. This can be used to intersperse interactive input with input from files. Note that Readline editing is only available at the outermost level — it is not active when reading from a nested file.

### `\ir` / `\include_relative` filename

Like `\i`, but resolves relative paths from the directory of the currently executing script (not the working directory). Prefer `\ir` for portable scripts.

### `\o` / `\out [ filename ]` / `\o [ |command ]`

Redirects query output to file or pipe. `\o` without arguments resets to stdout. When argument starts with `|`, the rest is passed literally to the shell (no variable interpolation).

**What gets redirected**: "Query results" includes tables, command responses, notices, and output from `\d` commands — but **not error messages**. Error messages always go to stderr.

**What doesn't get redirected**: `\echo` outputs to stdout (not affected by `\o`); use `\qecho` for redirected output.

**Tip**: To intersperse text between query results in a redirected output file, use `\qecho`.

### `\echo text [ ... ]`

Prints arguments to stdout, separated by spaces, followed by a newline. If first argument is unquoted `-n`, no trailing newline is written.

### `\qecho text [ ... ]`

Like `\echo` but outputs to the query output channel (set by `\o`).

### `\warn text [ ... ]`

Like `\echo` but outputs to stderr.

### `\set [ name [ value [ ... ] ] ]`

Sets a psql variable. Multiple values are concatenated. `\set` without arguments shows all variables. Variable names are case-sensitive, can contain letters, digits, underscores.

This is unrelated to the SQL `SET` command.

### `\unset name`

Unsets (deletes) a psql variable. Most control variables cannot be truly unset; they revert to defaults.

### `\prompt [ text ] name`

Prompts the user for input and stores it in the named variable. For multiword prompts, surround with single quotes.

**Behavior with `-f` flag**: When psql is invoked with `-f` (reading commands from a file), `\prompt` reads from stdin/stdout rather than the terminal. In interactive mode, it uses the terminal directly.

### `\getenv psql_var env_var`

Reads an environment variable and stores it in a psql variable. No change if the env var is undefined.

```sql
\getenv home HOME
\echo :home
-- outputs: /home/postgres
```

### `\setenv name [ value ]`

Sets or unsets an environment variable from within psql.

```sql
\setenv PAGER less
\setenv LESS -imx4F
```

### `\p` / `\print`

Prints the current query buffer to stdout. If the buffer is empty, prints the most recently executed query.

### `\w` / `\write` filename / `\w |command`

Writes the current query buffer to a file or pipes it to a shell command. If the buffer is empty, writes the most recently executed query. When argument starts with `|`, rest is passed literally to the shell.

### `\if` / `\elif` / `\else` / `\endif`

Nestable conditional blocks. `\if` and `\elif` evaluate their argument as a boolean (true/false/1/0/on/off/yes/no, case-insensitive). All backslash commands in a conditional block must appear in the same source file.

```sql
SELECT EXISTS(SELECT 1 FROM customer WHERE customer_id = 123) as is_customer,
       EXISTS(SELECT 1 FROM employee WHERE employee_id = 456) as is_employee
\gset
\if :is_customer
    SELECT * FROM customer WHERE customer_id = 123;
\elif :is_employee
    \echo 'is not a customer but is an employee'
    SELECT * FROM employee WHERE employee_id = 456;
\else
    \echo 'not a customer or employee'
\endif
```

Variable references in skipped lines are NOT expanded. Backquote expansion is NOT performed in skipped lines.

---

## Help and Information

### `\? [ topic ]`

Shows psql help. Topics:
- `commands` (default) — backslash commands
- `options` — command-line options
- `variables` — configuration variables

### `\h` / `\help [ command ]`

SQL syntax help. Without arguments, lists available commands. `*` shows help for all commands. Multi-word commands don't need quoting: `\h ALTER TABLE`.

Unlike most meta-commands, the entire line is the argument — no variable interpolation.
