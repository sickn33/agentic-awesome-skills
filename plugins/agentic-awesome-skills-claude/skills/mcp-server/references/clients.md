# Clients: how each connects, and what to verify

**A client works with the server only once a happy path with it is recorded**: the date, the client and its version where it shows one, who ran it, against which environment, and which tools were called. Write it in the product's distribution record. Route tests, a directory's scan and another product's record are not that record: a product built with all of this in hand still lists every client as untested for itself until it has its own.

| Client | How it connects | What to verify |
|---|---|---|
| **Claude** (claude.ai custom connector) | add the endpoint URL; Clerk sign-in, consent, organization picker | sign in, choose the organization, call a read and a write; note whether Claude registered by CIMD or DCR |
| **ChatGPT** (custom connector) | add the endpoint URL; OAuth as above | the same, and which tools were called |
| **ChatGPT** (directory plugin) | the plugin package; no sign-in for an anonymous surface | before approval, every tool against production through a custom MCP server (Plugins → + → Add custom MCP server → Create as a plugin, with the plugin's own authentication); the listed plugin once approved (the `chatgpt-plugin` skill) |
| **Claude Code** | `claude mcp add --transport http <name> <url>`, then `/mcp` and choose the server to sign in; or `--header 'Authorization: Bearer ${TOKEN}'`, single-quoted so the config holds the variable's name, not its value, with `TOKEN` set in the environment Claude Code starts in (unset, the literal text goes out and the connection fails) | both ways in |
| **Claude Desktop** | a desktop bundle (`.mcpb`) from the package, which asks for the token and stores it as a secret; or the third-party `mcp-remote` bridge in Desktop's local config with the bearer header | both ways in |
| **Cursor**, **VS Code** | a one-click install link | that the link installs and a call works |
| **MCP Inspector** | its CLI, which registers itself by DCR | a full run; an automated Playwright grant can take its place for OAuth (`references/server.md § Proving it`) |
| **Windsurf, Cline and other JSON-configured clients** | the stdio package, `npx -y <package>` with the token in `env` | a call through the package |

## Notes per client

- **Claude, and where Clerk lives.** A production grant with Clerk's production instance on the product's own subdomain (`clerk.<domain>`) worked with Claude (October 2026). A reported risk was that Claude misbehaves when the authorization server is on a different domain, which a development instance on Clerk's shared domain is; that case has not been tried with Claude, only with the automated grant. Clerk advertises CIMD, so expect Claude to use it; that is unverified, so record which it used.
- **ChatGPT as a custom connector over Clerk OAuth**, in developer mode against a production instance (a sign-in late on 2026-10-26 UTC, a second connection the next morning): the owner signed in once, and read-only tool calls returned and rendered. It registered by CIMD: every call's verified client id was `https://chatgpt.com/oauth/client.json`, the stable id ChatGPT uses with an authorization server that returns `iss` (the `chatgpt-plugin` skill). It asked for `offline_access` beside the instance's default scopes, and its access token lived 24 hours. The second and third connections opened with a `2026-07-28` request that the server refused `400` and fell back to `initialize` on `2025-11-25` within a few seconds (one to four) (`references/server.md § The route`); the first connection's refusal was most likely the same (inferred). The first sent `initialize` three times before `tools/list`; the later two sent `initialize` twice and no `tools/list` before calling, so it may reuse a list it already has (inferred). What its calls carried: the `chatgpt-plugin` skill.
- **ChatGPT before approval.** An unapproved plugin runs only as a local install (ChatGPT's desktop app, Codex), so on the web test it and record its review video through a custom MCP server pointed at production. A plugin ZIP uploaded as a personal plugin only offered "Open in desktop app" on the web (October 2026).
- **Claude Code with a token:** single-quoted, the configuration holds only the variable's name; a value typed in instead is written into the MCP configuration, so tell the user to keep that file out of shared project configuration and out of source control.
- **Claude Desktop through `mcp-remote`**: the bridge is a third party and receives the token; say so where the configuration is documented. The entry runs `npx -y mcp-remote <url> --header "Authorization: Bearer ${TOKEN}"` with the token in the entry's `env`, then a restart of Desktop.
- **The desktop bundle** is the package's, built and released by `references/companion-repo.md`; it carries the package's tools and needs a token.
- **ChatGPT** reaches a server from OpenAI's servers, and Claude from Anthropic's, so many users share a few addresses: a per-IP limit must be sized for that (`references/server.md § Limits`).
- **Cursor's link** is `https://cursor.com/en/install-mcp?name=<name>&config=<base64 of {"url":"<endpoint>"}>`; **VS Code's** is `https://insiders.vscode.dev/redirect/mcp/install?name=<name>&config=<URL-encoded {"type":"http","url":"<endpoint>"}>` (October 2026).
- **MCP Inspector 2.9.0** requires Node 22.19.0 or later. Its default OAuth callback is `http://127.0.0.1:6276/oauth/callback`; keep that port free. For a run against a development tunnel, start Next with `APP_URL` set to the tunnel's HTTPS origin: the token's audience is that exact URL, and a tunnel that changes origin invalidates every token already issued.
- **Codex** reads the same tool metadata ChatGPT reads, which makes it a cheap routing check for a ChatGPT plugin before review (`references/tools.md § The tests`). That is evidence about the descriptions, never about ChatGPT.
- **Directories are clients too**: Smithery's scanner over OAuth, Glama's connector check with a test token, an awesome list's unauthenticated probe, OpenAI's portal scan (`references/directories.md`). Their traffic shows up in the per-call log.
- **Clients own refresh and disconnect.** The server stores no access or refresh token; a revoked grant can work until the token expires (a day by default), while a removed or demoted member is refused on the next call.

## Writing setup instructions

- One section per client, from that client's own current documentation, dated; the commands copied from a run, not from memory.
- Sign-in first, a token second, the local package third.
- Say what each way stores and where, and that a token is a password.
- A client without a recorded happy path is described as untested, never as supported.
