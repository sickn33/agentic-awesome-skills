# Setting up ultrafast for an agent

Installing the engine or ffmpeg and adding an MCP server change this
machine and the agent's configuration: do them when the person asks for
them or agrees.

## Install the engine

One binary, `ultrafast`, with `uf` as its short name:

```bash
cargo install ultrafast                    # from crates.io
brew install ultrafastmov/tap/ultrafast    # macOS, prebuilt
docker run --gpus all ghcr.io/ultrafastmov/ultrafast:latest info
```

It renders with Metal on macOS (Apple silicon) and Vulkan on Linux and
Windows (WSL2). `uf info` names the GPU it found. H.264 and HEVC exports
encode on the GPU (Metal, or NVENC on NVIDIA); everything else (ProRes,
AV1, VP9, GIF, PNG and EXR sequences, sound alone) and exports on other
GPUs go through ffmpeg, so install it (`brew install ffmpeg`,
`apt install ffmpeg`).

## Connect a local agent (stdio)

`uf mcp` serves the tools over stdio. Renders run on this machine's GPU and
documents are files on it.

Claude Code:

```bash
claude mcp add ultrafast -- uf mcp
```

Codex (`~/.codex/config.toml`):

```toml
[mcp_servers.ultrafast]
command = "uf"
args = ["mcp"]
tool_timeout_sec = 300
```

Cursor (`.cursor/mcp.json` or `~/.cursor/mcp.json`) and Gemini CLI
(`~/.gemini/settings.json`):

```json
{
  "mcpServers": {
    "ultrafast": { "command": "uf", "args": ["mcp"] }
  }
}
```

Claude Desktop (`claude_desktop_config.json`: on macOS in
`~/Library/Application Support/Claude/`, on Windows in `%APPDATA%\Claude\`,
on Linux in `~/.config/Claude/`): the same `mcpServers` block. Desktop apps
don't see your shell's `PATH`, so give the full path from `which uf`, e.g.
`"command": "/opt/homebrew/bin/uf"`.

Exports of long films can take longer than a client's default tool timeout.
Raise it if exports time out (Codex `tool_timeout_sec`, Claude Code
`MCP_TOOL_TIMEOUT`).

## Connect to a server (Streamable HTTP)

A self-hosted server (`ultrafast serve`, or the Docker image) answers MCP at
`/mcp`, e.g. `https://video.example.com/mcp`. Clients send its API key as a
bearer token.

Claude Code:

```bash
claude mcp add --transport http ultrafast https://video.example.com/mcp \
  --header "Authorization: Bearer $ULTRAFAST_API_KEY"
```

Codex:

```toml
[mcp_servers.ultrafast]
url = "https://video.example.com/mcp"
bearer_token_env_var = "ULTRAFAST_API_KEY"
```

Cursor:

```json
{ "mcpServers": { "ultrafast": { "url": "https://video.example.com/mcp",
  "headers": { "Authorization": "Bearer ${env:ULTRAFAST_API_KEY}" } } } }
```

Gemini CLI:

```json
{ "mcpServers": { "ultrafast": { "httpUrl": "https://video.example.com/mcp",
  "headers": { "Authorization": "Bearer $ULTRAFAST_API_KEY" } } } }
```

The remote tools take documents inline instead of file paths, and exports
come back as download links.

ultrafast Cloud (`https://mcp.ultrafast.mov`, not open yet) serves the same
tools with OAuth sign-in. That is what Claude's connectors (Settings →
Connectors, on web, desktop and mobile) and the ChatGPT app use.

## This skill

This copy is the catalog's. The skill is maintained in `skills/ultrafast/`
of https://github.com/ultrafastmov/ultrafast, which also publishes a Claude
Code plugin that bundles it with the `uf mcp` server. Don't install the
upstream skill or plugin over this copy unless the person asks for it.
