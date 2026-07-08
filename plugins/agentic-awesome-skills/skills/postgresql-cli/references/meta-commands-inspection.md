Part of the psql meta-command reference. See also: meta-commands-core.md, meta-commands-formatting.md

# psql Meta-Commands — Object Inspection (\d family)

This document covers all `\d` family commands for inspecting database objects, including tables, indexes, functions, schemas, and more.

## Table of Contents

- [Object Inspection (\d family)](#object-inspection-d-family)
- [Pattern matching rules](#pattern-matching-rules)

---

## Object Inspection (\d family)

All `\d` commands accept these common modifiers:
- `+` — extra info (size, description, ownership)
- `S` — include system objects
- `x` — expanded display (must follow `S` or `+`, NOT immediately after `\d`)

**Important**: The `x` modifier for expanded display must appear after `S` or `+` (e.g., `\dt+x`), because `\dx` is a separate command that lists installed extensions. Writing `\dx` when you meant expanded display will show extensions instead.

All accept a pattern parameter with wildcard matching (`*`, `?`, regex). See Patterns section below.

### `\d[Sx+] [ pattern ]`

Without a pattern: equivalent to `\dtvmsE` (lists all visible tables, views, materialized views, sequences, and foreign tables).

With a pattern: shows columns, types, tablespace, special attributes (NOT NULL, defaults), indexes, constraints, rules, triggers. For foreign tables, shows the foreign server.

`\d+` adds: column comments, OID presence, view definition, replica identity, access method.

### Table-type listing commands

`\dE` / `\di` / `\dm` / `\ds` / `\dt` / `\dv` — List foreign tables, indexes, materialized views, sequences, tables, or views. Combine letters: `\dti` lists both tables and indexes.

`\d+` adds: persistence status (permanent/temporary/unlogged), physical size on disk, description.

### Aggregate and function listings

| Command | Shows |
|---------|-------|
| `\da[Sx] [pattern]` | Aggregate functions with return type and input types |
| `\df[anptwSx+] [pattern [arg_pattern ...]]` | Functions. Filter by type: `a`=agg, `n`=normal, `p`=procedure, `t`=trigger, `w`=window. Additional args match parameter type names. Use `-` as last arg_pattern to prevent matching functions with extra args. Example: `\df * integer` lists functions whose first argument is `integer`. |
| `\do[Sx+] [pattern [arg_pattern [arg_pattern]]]` | Operators with operand/result types. One arg matches prefix operators; two args match binary operators. Use `-` for unused operand. Example: `\do + integer integer` lists `+` operators with two integer args. |

### Schema and type listings

| Command | Shows |
|---------|-------|
| `\dn[Sx+] [pattern]` | Schemas (namespaces) |
| `\dT[Sx+] [pattern]` | Data types (`\dT+` shows internal name, size, enum values, permissions) |
| `\dC[x+] [pattern]` | Type casts (`\dC+` shows leakproof status and description) |
| `\dD[Sx+] [pattern]` | Domains (`\dD+` shows permissions and description) |
| `\dO[Sx+] [pattern]` | Collations (only collations usable with current database encoding — results vary by database) |

### Access method and operator listings

| Command | Shows |
|---------|-------|
| `\dA[x+] [pattern]` | Access methods |
| `\dAc[x+] [am_pattern [type_pattern]]` | Operator classes |
| `\dAf[x+] [am_pattern [type_pattern]]` | Operator families |
| `\dAo[x+] [am_pattern [family_pattern]]` | Operators in families |
| `\dAp[x+] [am_pattern [family_pattern]]` | Support functions in families |

### Configuration and privilege listings

| Command | Shows |
|---------|-------|
| `\dconfig[x+] [pattern]` | Server config parameters. Without a pattern, shows only non-default values. `\dconfig+` adds data type, context, and access privileges. |
| `\dp[Sx] [pattern]` | Table/view/sequence privileges |
| `\ddp[x] [pattern]` | Default access privileges |
| `\drg[Sx] [pattern]` | Granted role memberships (ADMIN, INHERIT, SET options, grantor) |
| `\drds[x] [role_pattern [db_pattern]]` | Per-role and per-database config settings |
| `\z[Sx] [pattern]` | Alias for `\dp` |

### Replication and partition listings

| Command | Shows |
|---------|-------|
| `\dP[itnx+] [pattern]` | Partitioned relations (`t`=tables, `i`=indexes, `n`=nested shows parent) |
| `\dRp[x+] [pattern]` | Replication publications (`\dRp+` shows associated tables/schemas) |
| `\dRs[x+] [pattern]` | Replication subscriptions (`\dRs+` shows additional properties) |

### Extended statistics, extensions, and more

| Command | Shows |
|---------|-------|
| `\dX[x] [pattern]` | Extended statistics. Status column shows `defined` (requested) or NULL (not requested) per statistic kind. Use `pg_stats_ext` to check if `ANALYZE` has been run. |
| `\dx[x+] [pattern]` | Installed extensions (`\dx+` lists all objects in each extension) |
| `\dy[x+] [pattern]` | Event triggers |
| `\dd[Sx] [pattern]` | Object descriptions (comments on constraints, operator classes, operator families, rules, triggers). Other object comments are shown by their respective `\d` commands. |

### Foreign data wrapper listings

| Command | Shows |
|---------|-------|
| `\des[x+] [pattern]` | Foreign servers |
| `\det[x+] [pattern]` | Foreign tables (`\det+` shows options and description) |
| `\deu[x+] [pattern]` | User mappings (CAUTION: `\deu+` may show passwords) |
| `\dew[x+] [pattern]` | Foreign-data wrappers |

### Text search listings

| Command | Shows |
|---------|-------|
| `\dF[x+] [pattern]` | Text search configurations (`\dF+` shows parser and dictionary list per token type) |
| `\dFd[x+] [pattern]` | Text search dictionaries |
| `\dFp[x+] [pattern]` | Text search parsers (`\dFp+` shows functions and recognized token types) |
| `\dFt[x+] [pattern]` | Text search templates |

### Other object listings

| Command | Shows |
|---------|-------|
| `\db[x+] [pattern]` | Tablespaces (`\db+` shows options, size, permissions, description) |
| `\dc[Sx+] [pattern]` | Character-set encoding conversions |
| `\dl[x+]` | Large objects (alias for `\lo_list`) |
| `\dL[Sx+] [pattern]` | Procedural languages |
| `\du[Sx+] [pattern]` / `\dg[Sx+] [pattern]` | Database roles (`\du` = `\dg`, since users and groups were unified into roles) |
| `\l[x+] [pattern]` | Databases (`\l+` shows size, default tablespace, description. Size only available for databases you can connect to.) |
| `\sf[+] func_desc` | Function definition (read-only, `+` numbers lines from body start) |
| `\sv[+] view_name` | View definition (read-only, `+` numbers lines) |

### Pattern matching rules

All `\d` commands that accept a pattern use the same matching system:

1. **Case folding**: Unquoted letters are folded to lowercase (like SQL identifiers). Double quotes prevent folding.
2. **Wildcards**: `*` matches any character sequence, `?` matches any single character. Within double quotes, these are literal.
3. **Dot separator**: A dot (`.`) separates schema from object name. Two dots separate database.schema.object (database must match current connection).
4. **Regex**: Advanced patterns like `[0-9]` work. `.` is a separator (not regex any-char), `*` → `.*`, `?` → `.`, `$` is literal. Within double quotes, all regex specials are literal.
5. **No pattern**: Shows all objects visible in the current schema search path (equivalent to `*`). Use `*.*` to see all objects regardless of visibility.
