# SQLite fixtures

Load this reference only when inspecting or seeding local T3 state directly.

## Select the correct database

When `--base-dir` or `--home-dir` is explicit, runtime state lives under `<base-dir>/userdata` and the database path is `<base-dir>/userdata/state.sqlite`. The `<base-dir>/dev` state directory is only the fallback for an implicit development home, preventing an ordinary `vp run dev` from touching production state.

Start the target runtime once before seeding so all migrations have run. Use an isolated base directory. Stop the server before writes to avoid racing application state or an active projection.

## Use the helper

List tables:

```bash
node apps/server/scripts/t3-sqlite-state.ts query \
  --base-dir <base-dir> \
  --sql "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name"
```

Inspect current columns before writing a fixture:

```bash
node apps/server/scripts/t3-sqlite-state.ts query \
  --base-dir <base-dir> \
  --sql "PRAGMA table_info(projection_threads)"
```

Apply a SQL fixture from a file:

```bash
node apps/server/scripts/t3-sqlite-state.ts exec \
  --base-dir <base-dir> \
  --file /tmp/t3-seed.sql
```

Use one statement per invocation for both `query` and `exec`; the helper wraps writes in a transaction and prints the backup path after a successful mutation. Use a single insert with multiple value rows when a fixture needs several records.

## Seed projection data carefully

The web UI primarily reads these projection tables:

- `projection_projects`
- `projection_threads`
- `projection_thread_messages`
- `projection_thread_activities`
- `projection_thread_sessions`
- `projection_turns`
- `projection_pending_approvals`
- `projection_thread_proposed_plans`

Inspect `PRAGMA table_info(<table>)` and the current migrations under `apps/server/src/persistence/Migrations/` before constructing inserts. Keep identifiers unique, timestamps as ISO strings, JSON columns valid, and related project/thread/turn IDs consistent.

For a substantial current example, inspect `seedDatabase` in `scripts/mobile-showcase-environment.ts`. Adapt its column set to the target database instead of assuming copied SQL remains current.

Direct projection writes are appropriate for ephemeral visual states, edge-case counts, long titles, activity lists, and similar UI fixtures. They do not create a coherent orchestration event history. Do not modify `orchestration_events` unless the test specifically exercises projector internals, and do not use direct projection writes to claim backend business behavior works.

Use the app's commands or APIs for behavior tests. Use `node apps/server/src/bin.ts auth ...` for auth state rather than editing `auth_pairing_links` or `auth_sessions`.
