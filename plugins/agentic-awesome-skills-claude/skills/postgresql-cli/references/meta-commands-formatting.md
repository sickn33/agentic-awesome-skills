Part of the psql meta-command reference. See also: meta-commands-core.md, meta-commands-inspection.md

# psql Meta-Commands — Output Formatting & Pipeline Mode

## Table of Contents

- [Output Formatting](#output-formatting)
- [Pipeline Mode](#pipeline-mode)
- [Session Management](#session-management)

---

## Output Formatting

### `\pset [ option [ value ] ]`

Sets options affecting query result table output. Without arguments, displays current settings.

| Option | Values | Description |
|--------|--------|-------------|
| `border` | 0-2 (3 for latex) | Border/line style. Higher = more lines. |
| `columns` | integer | Target width for wrapped format. 0 = use `COLUMNS` env or screen width. Non-zero also wraps output when sent to file or pipe (normally file/pipe output is unwrapped). |
| `csv_fieldsep` | character | CSV field separator (default: comma) |
| `expanded` (or `x`) | `on`, `off`, `auto` | Vertical display. `auto` uses expanded when wider than screen. Note: `auto` is only effective in `aligned` and `wrapped` formats. |
| `fieldsep` | string | Field separator for unaligned output (default: `\|`) |
| `fieldsep_zero` | — | Set field separator to NUL byte |
| `footer` | `on`, `off` | Toggle row count footer display |
| `format` | `aligned`, `asciidoc`, `csv`, `html`, `latex`, `latex-longtable`, `troff-ms`, `unaligned`, `wrapped` | Output format. See format descriptions below. |
| `linestyle` | `ascii`, `old-ascii`, `unicode` | Border character style. `ascii` uses `+`, `-`, `|` characters. `old-ascii` uses `:` and `;` for borders. `unicode` uses Unicode box-drawing characters. |
| `null` | string | Display string for NULL values (default: empty) |
| `numericlocale` | `on`, `off` | Locale-specific number formatting |
| `pager` | `on`, `off`, `always` | Pager control. Uses `PSQL_PAGER` or `PAGER` env. For `\watch` output, `PSQL_WATCH_PAGER` takes precedence over both. |
| `pager_min_lines` | integer | Minimum lines before pager activates (default: 0) |
| `recordsep` | string | Record separator for unaligned mode (default: newline) |
| `recordsep_zero` | — | Set record separator to NUL byte |
| `tableattr` (or `T`) | string | HTML: table tag attributes (e.g., `border=1`). latex-longtable: whitespace-separated proportional column widths (e.g., `'0.2 0.2 0.6'`). |
| `title` (or `C`) | string | Table title. Unset with no value. |
| `tuples_only` (or `t`) | `on`, `off` | Show only data, no headers/footers |
| `unicode_border_linestyle` | `single`, `double` | Unicode border drawing |
| `unicode_column_linestyle` | `single`, `double` | Unicode column drawing |
| `unicode_header_linestyle` | `single`, `double` | Unicode header drawing |
| `xheader_width` | `full`, `column`, `page`, or integer | Max width of expanded output header |

### Format Descriptions

| Format | Description |
|--------|-------------|
| `aligned` | Standard human-readable table with column alignment (default). |
| `wrapped` | Like `aligned` but long values wrap to fit column width. Headers with underscores are not repeated on continuation rows. |
| `unaligned` | All columns on one line, separated by `fieldsep`. Useful for script output. |
| `csv` | RFC 4180 compliant CSV output. Uses `csv_fieldsep` (default: comma). Safe for import into spreadsheets and other tools. |
| `html` | HTML `<table>` markup. |
| `asciidoc` | AsciiDoc table format for documentation. |
| `latex` | LaTeX tabular format. |
| `latex-longtable` | LaTeX longtable format for multi-page tables. Supports proportional column widths via `\pset tableattr` (e.g., `'0.2 0.2 0.6'`). |
| `troff-ms` | troff ms macros table format. |

### Formatting shortcuts

| Shortcut | Equivalent |
|----------|-----------|
| `\a` | `\pset format unaligned` (toggle) |
| `\C [title]` | `\pset title` |
| `\f [string]` | `\pset fieldsep` |
| `\H` | `\pset format html` (toggle) |
| `\t` | `\pset tuples_only` (toggle) |
| `\T table_options` | `\pset tableattr` |
| `\x [on\|off\|auto]` | `\pset expanded` |

---

## Pipeline Mode

Pipeline mode batches SQL statements into fewer network round trips for better performance. Available in PostgreSQL 14+.

### Pipeline commands

| Command | Description |
|---------|-------------|
| `\startpipeline` | Begin a pipeline block |
| `\endpipeline` | End a pipeline block and process remaining results |
| `\sendpipeline` | Append current query buffer to pipeline without waiting for results |
| `\syncpipeline` | Send a sync message without ending the pipeline |
| `\flushrequest` | Request server flush without sync |
| `\flush` | Manually push unsent data to server |
| `\getresults [N]` | Read pending results (N=0 or omitted = all) |

### Pipeline rules

- All queries in pipeline mode use the extended query protocol
- Queries are appended with semicolons or `\sendpipeline`
- Allowed meta-commands: `\bind`, `\bind_named`, `\parse`, `\close_prepared`
- NOT allowed: `\g`, `\gx`, `\gdesc` (and other result-consuming commands)
- `COPY` is not supported in pipeline mode
- A `%P` prompt variable is available to show pipeline status (`on`, `off`, or `abort`)

### Example

```sql
\startpipeline
  SELECT * FROM pg_class;
  SELECT 1 \bind \sendpipeline
  \flushrequest
  \getresults
\endpipeline
```

---

## Session Management

### `\e` / `\edit [ filename ] [ line_number ]`

Opens the query buffer (or a file) in the external editor. On save, the buffer is re-parsed. Complete queries are immediately executed. The cursor is positioned on the specified line number. See `$EDITOR` / `$VISUAL` for editor configuration.

### `\ef [ function_description [ line_number ] ]`

Edits a function or procedure definition as a `CREATE OR REPLACE FUNCTION/PROCEDURE` command. Specify function by name or name and argument types. Without arguments, shows a blank template. Line number positions within the function body.

Unlike most meta-commands, the entire line is the argument — no variable interpolation.

### `\ev [ view_name [ line_number ] ]`

Edits a view definition as a `CREATE OR REPLACE VIEW` command. Without arguments, shows a blank template.

### `\cd [ directory ]`

Changes the current working directory. Without an argument, changes to the home directory.

```sql
\cd /tmp
\! pwd           -- /tmp
\cd              -- back to home directory
```

### `\r` / `\reset`

Clears the query buffer.

### `\s [ filename ]`

Prints command history to file or stdout. Requires Readline support.

### `\timing [ on | off ]`

Toggles (or explicitly sets) display of query execution time. Shown in milliseconds; intervals > 1s also show minutes:seconds, hours, days as needed.

### `\errverbose`

Repeats the most recent server error message at maximum verbosity (as if `VERBOSITY=verbose` and `SHOW_CONTEXT=always`).

### `\restrict restrict_key` / `\unrestrict restrict_key`

Enter/exit restricted mode where only `\unrestrict` is allowed. Key must be alphanumeric. Primarily used by `pg_dump`/`pg_restore`.
