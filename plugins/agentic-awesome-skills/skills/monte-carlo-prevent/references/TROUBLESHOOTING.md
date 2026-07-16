## Troubleshooting

### MCP connection fails:
```bash
# Verify the server is reachable
curl -s -o /dev/null -w "%{http_code}" https://integrations.getmontecarlo.com/mcp/
```

**If using the plugin (OAuth):** Run `/mcp` in Claude Code, select the `monte-carlo` server, and re-authenticate. If the browser flow doesn't complete, copy the callback URL from your browser's address bar into the URL prompt that appears in Claude Code.

**Legacy (header-based auth, for MCP clients without HTTP transport):** Check that `x-mcd-id` and `x-mcd-token` are set correctly in your MCP config. The key format is `<KEY_ID>:<KEY_SECRET>` — these are split across two separate headers.


### Monitor creation errors:

**`montecarlo monitors apply` fails with "Unknown field":**
Monitor definition files must have `montecarlo:` as the root key — do not copy the `validation:` or `custom_sql:` output from the MCP tools directly. Reformat using the `montecarlo: > custom_sql:` structure shown in Workflow 2.

**`montecarlo monitors apply` fails with "Not a Monte Carlo project":**
Ensure `montecarlo.yml` (the project config) exists in the working directory. This file must contain only `version`, `namespace`, and `default_resource` — not monitor definitions.

**`createValidationMonitorMac` fails with a Snowflake error:**
This tool validates the condition SQL against the live table. If the column doesn't exist yet (e.g. you're writing the monitor before deploying the model change), fall back to `createCustomSqlMonitorMac` with an explicit SQL query instead.
