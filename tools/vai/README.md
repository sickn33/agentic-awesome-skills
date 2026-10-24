# vai — Uninhibited CLI Agent for Venice AI

A zero-filler CLI agent and MCP bridge that connects Venice AI's uninhibited inference to your local filesystem and CPU.

## The Levers
1. **`include_venice_system_prompt: false`**: Completely strips Venice's default wrapper.
2. **Invisible Steering**: System/developer message isolation keeps user prompts pristine.
3. **Silent Refusal Detection**: Discards hedges in the first 200 characters and re-rolls quietly up the attitude ladder (`chill -> spicy -> unhinged -> nuclear`).
4. **Safety Checkpoints (`--commit`)**: Atomic git snapshots after every mutating tool execution with one-line rollbacks (`vai undo`).
5. **MCP Server**: Stdio bridge for Claude Code, Cursor, and Codex (`vai mcp`).

## Install
```bash
pip install -e tools/vai
```

## Quick Start
```bash
# Login (Web session or API key)
vai login

# Check status
vai status

# Run with spicy attitude (default)
vai "inspect the repo structure and list top 5 files"

# Nuclear mode
vai --attitude nuclear "is this architecture salvageable, be blunt"

# Auto-execute with git commit snapshots
vai --auto --commit "refactor src/utils.py and check tests"

# Undo the last action
vai undo

# Interactive REPL
vai repl

# MCP Server for Claude Code
claude mcp add vai -- vai mcp --root .
```
