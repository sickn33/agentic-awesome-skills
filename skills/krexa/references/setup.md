# Connect Krexa to your agent

Endpoint: `https://www.krexa.xyz/mcp` (Streamable HTTP). Use `www`: bare
`krexa.xyz` redirects, and most clients drop the key on a redirect. The old
URL `https://api.krexa.xyz/api/v1/mcp` still works.
Auth: `Authorization: Bearer <kxm_ key>`. Get the key at
`https://krexa.xyz/mcp/link?client=<your client name>`.

Keep the key in an env var (`KREXA_AGENT_KEY`), not in a config file as text.

## OpenClaw

```bash
openclaw mcp set krexa '{"url":"https://www.krexa.xyz/mcp","transport":"streamable-http","requestTimeoutMs":60000,"headers":{"Authorization":"Bearer ${KREXA_AGENT_KEY}"}}'
openclaw mcp doctor krexa --probe
```

- `transport` must be set. OpenClaw uses `sse` when it is missing, and that
  fails.
- Keep the single quotes. OpenClaw fills `${KREXA_AGENT_KEY}` from the env.
- Put the key in `openclaw.json` under `skills.entries.krexa.apiKey`, or export
  `KREXA_AGENT_KEY`.

## Hermes

```yaml
# ~/.hermes/config.yaml
mcp_servers:
  krexa:
    url: "https://www.krexa.xyz/mcp"
    headers:
      Authorization: "Bearer ${KREXA_AGENT_KEY}"
```

- Put `KREXA_AGENT_KEY=kxm_...` in `~/.hermes/.env`.
- Run `/reload-mcp`. Tools show as `mcp_krexa_<tool>`.
- Do not set `timeout` below the default (300 s).

## Claude Code, Cursor and other MCP clients

```json
{ "mcpServers": { "krexa": { "type": "http", "url": "https://www.krexa.xyz/mcp",
  "headers": { "Authorization": "Bearer ${KREXA_AGENT_KEY}" } } } }
```

Or: `claude mcp add --transport http krexa https://www.krexa.xyz/mcp --header "Authorization: Bearer $KREXA_AGENT_KEY"`
(the shell writes the key into the config as text).

## Revoke a key

Open `https://krexa.xyz/mcp/link`, log in, and press Revoke next to the
connection under "Connected agents". A revoked key
returns `not_logged_in` on the next call.
