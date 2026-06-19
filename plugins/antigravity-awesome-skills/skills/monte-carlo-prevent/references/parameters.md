# MCP Parameter Notes

Important parameter details for Monte Carlo MCP tools. Consult when making API
calls to avoid common mistakes.

---

## `getAlerts` — use snake_case parameters

The MCP tool uses Python snake_case, **not** the camelCase params from the MC web UI:

```
✓ created_after    (not createdTime.after)
✓ created_before   (not createdTime.before)
✓ order_by         (not orderBy)
✓ table_mcons      (not tableMcons)
```

Always provide `created_after` and `created_before`. Max window is 60 days.
Use `getCurrentTime()` to get the current ISO timestamp when needed.

---

## `search` — finding the right table identifier

MC uses MCONs (Monte Carlo Object Names) as table identifiers. Always use
`search` first to resolve a table name to its MCON before calling `getTable`,
`getAssetLineage`, or `getAlerts`.

```
search(query="orders_status") → returns mcon, full_table_id, warehouse
```
