#!/bin/bash
# Thoughtful - Summary Generator
# Fetches messages, analyzes, generates human summary

set -euo pipefail

# Use OpenClaw workdir or fallback to ~/clawd
WORKDIR="${OPENCLAW_WORKDIR:-$HOME/clawd}"
DATA_DIR="$WORKDIR/thoughtful-data"
SKILL_DIR="$WORKDIR/skills/thoughtful"
WACLI="wacli-readonly"

# Default time range
SINCE="${1:-24h}"

# Create data dir if doesn't exist
mkdir -p "$DATA_DIR/context"

echo "🔄 Generating thoughtful summary (since: $SINCE)..."

# 1. Fetch new messages
echo "📥 Fetching messages..."
$WACLI messages list --json --limit 1000 > "$DATA_DIR/context/recent-messages.json"

# 2. Fetch chats
echo "💬 Fetching chats..."
$WACLI chats list --json --limit 100 > "$DATA_DIR/context/recent-chats.json"

# 3. Process data and generate summary
echo "🧠 Analyzing and generating summary..."
node "$SKILL_DIR/scripts/process-and-summarize.js" "$DATA_DIR" "$SINCE"

echo "✅ Summary generated!"
