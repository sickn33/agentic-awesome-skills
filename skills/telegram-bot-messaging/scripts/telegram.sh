#!/usr/bin/env bash
# telegram.sh — send/receive Telegram messages via the Bot API.
# Deps: bash, curl, jq. Config: env vars or ~/.config/telegram/config.
set -euo pipefail

API_BASE="https://api.telegram.org"
CONFIG_DIR="${TELEGRAM_CONFIG_DIR:-$HOME/.config/telegram}"
CONFIG_FILE="$CONFIG_DIR/config"

usage() {
  cat >&2 <<'EOF'
Usage: telegram.sh <command> [args]

Commands:
  setup [--bot NAME]
      Guided bot registration (BotFather walkthrough + chat-ID discovery)
  send MESSAGE [--to TARGET] [--bot NAME] [--silent] [--format md|html]
      Send a text message (auto-splits over 4096 chars)
  file PATH [CAPTION] [--to TARGET] [--bot NAME] [--silent]
      Send a document (photos for png/jpg/jpeg/gif/webp)
  ask QUESTION [--options "Yes,No"] [--timeout SECS] [--to TARGET] [--bot NAME]
      Ask with inline buttons, wait for tap or text reply; prints answer.
      Exit 0 = answered, 2 = timeout
  read [--limit N] [--bot NAME] [--all]
      Print new incoming messages since last read

Config: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID env vars, or ~/.config/telegram/config
        Named bots: BOT_<NAME>_TOKEN   Named targets: TARGET_<NAME>=<chat_id>
EOF
  exit 1
}

die() { printf 'telegram.sh: %s\n' "$*" >&2; exit 1; }

check_deps() {
  command -v curl >/dev/null 2>&1 || die "curl is required but not found"
  command -v jq >/dev/null 2>&1 || die "jq is required but not found (brew install jq / apt install jq)"
}

# Env vars win; config file fills in whatever the environment didn't set.
load_config() {
  [ -f "$CONFIG_FILE" ] || return 0
  local key val
  while IFS='=' read -r key val; do
    case "$key" in ''|\#*) continue ;; esac
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [ -z "${!key:-}" ]; then export "$key=$val"; fi
  done < "$CONFIG_FILE"
}

upper_key() { printf '%s' "$1" | tr '[:lower:]-' '[:upper:]_'; }

resolve_bot() {
  local name="${1:-}"
  if [ -z "$name" ]; then
    BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
    BOT_KEY="default"
    [ -n "$BOT_TOKEN" ] || die "no bot token — run 'telegram.sh setup' or set TELEGRAM_BOT_TOKEN"
  else
    local var
    var="BOT_$(upper_key "$name")_TOKEN"
    BOT_TOKEN="${!var:-}"
    BOT_KEY="$name"
    [ -n "$BOT_TOKEN" ] || die "no token for bot '$name' — run 'telegram.sh setup --bot $name' or set $var"
  fi
}

resolve_target() {
  local t="${1:-}"
  if [ -z "$t" ]; then
    CHAT_ID="${TELEGRAM_CHAT_ID:-}"
    [ -n "$CHAT_ID" ] || die "no default chat — run 'telegram.sh setup' or set TELEGRAM_CHAT_ID"
  elif [[ "$t" =~ ^-?[0-9]+$ ]]; then
    CHAT_ID="$t"
  else
    local var
    var="TARGET_$(upper_key "$t")"
    CHAT_ID="${!var:-}"
    [ -n "$CHAT_ID" ] || die "unknown target '$t' — add $var=<chat_id> to $CONFIG_FILE"
  fi
}

# api METHOD [curl args...] — prints the JSON response, dies if .ok != true
api() {
  local method="$1" resp
  shift
  resp=$(curl -sS --max-time "${TELEGRAM_CURL_TIMEOUT:-35}" \
    "$API_BASE/bot$BOT_TOKEN/$method" "$@") || die "network error calling $method"
  [ "$(jq -r '.ok' <<<"$resp")" = "true" ] \
    || die "$method failed: $(jq -r '.description // "unknown error"' <<<"$resp")"
  printf '%s' "$resp"
}

cmd_send() {
  local msg="" to="" bot="" silent="false" format=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --to) to="$2"; shift 2 ;;
      --bot) bot="$2"; shift 2 ;;
      --silent) silent="true"; shift ;;
      --format) format="$2"; shift 2 ;;
      -*) die "unknown flag for send: $1" ;;
      *) if [ -z "$msg" ]; then msg="$1"; else die "unexpected argument: $1"; fi; shift ;;
    esac
  done
  [ -n "$msg" ] || die "send needs a message (telegram.sh help)"
  resolve_bot "$bot"
  resolve_target "$to"

  local parse_mode=""
  case "$format" in
    '') ;;
    md) parse_mode="MarkdownV2" ;;
    html) parse_mode="HTML" ;;
    *) die "--format must be md or html" ;;
  esac

  local chunk
  while [ -n "$msg" ]; do
    chunk="${msg:0:4096}"
    msg="${msg:4096}"
    send_chunk "$chunk" "$parse_mode" "$silent"
  done
}

# send_chunk TEXT PARSE_MODE SILENT — one sendMessage; formatted sends fall
# back to plain text if Telegram rejects the markup, so alerts never get lost.
send_chunk() {
  local text="$1" parse_mode="$2" silent="$3" resp
  if [ -n "$parse_mode" ]; then
    resp=$(curl -sS --max-time "${TELEGRAM_CURL_TIMEOUT:-35}" \
      "$API_BASE/bot$BOT_TOKEN/sendMessage" \
      -d "chat_id=$CHAT_ID" --data-urlencode "text=$text" \
      -d "disable_notification=$silent" -d "parse_mode=$parse_mode") \
      || die "network error calling sendMessage"
    if [ "$(jq -r '.ok' <<<"$resp")" = "true" ]; then return 0; fi
  fi
  api sendMessage -d "chat_id=$CHAT_ID" --data-urlencode "text=$text" \
    -d "disable_notification=$silent" >/dev/null
}

cmd_file() {
  local path="" caption="" to="" bot="" silent="false"
  while [ $# -gt 0 ]; do
    case "$1" in
      --to) to="$2"; shift 2 ;;
      --bot) bot="$2"; shift 2 ;;
      --silent) silent="true"; shift ;;
      -*) die "unknown flag for file: $1" ;;
      *)
        if [ -z "$path" ]; then path="$1"
        elif [ -z "$caption" ]; then caption="$1"
        else die "unexpected argument: $1"; fi
        shift ;;
    esac
  done
  [ -n "$path" ] || die "file needs a path (telegram.sh help)"
  [ -f "$path" ] || die "file not found: $path"
  resolve_bot "$bot"
  resolve_target "$to"

  local ext method="sendDocument" field="document"
  ext=$(printf '%s' "${path##*.}" | tr '[:upper:]' '[:lower:]')
  case "$ext" in
    png|jpg|jpeg|gif|webp) method="sendPhoto" field="photo" ;;
  esac
  api "$method" -F "chat_id=$CHAT_ID" -F "$field=@$path" \
    -F "caption=$caption" -F "disable_notification=$silent" >/dev/null
}

offset_file() { printf '%s/offset.%s' "$CONFIG_DIR" "$BOT_KEY"; }

get_offset() { cat "$(offset_file)" 2>/dev/null || printf '0'; }

save_offset() {
  ( umask 077; mkdir -p "$CONFIG_DIR"; printf '%s' "$1" > "$(offset_file)" )
}

# Chat IDs we accept incoming messages from: the default chat plus every
# TARGET_* value in the config file and the environment. Strangers who
# message a public bot never match.
allowed_chats() {
  {
    printf '%s\n' "${TELEGRAM_CHAT_ID:-}"
    if [ -f "$CONFIG_FILE" ]; then
      grep -E '^TARGET_[A-Za-z0-9_]+=' "$CONFIG_FILE" | cut -d= -f2 || true
    fi
    env | grep -E '^TARGET_[A-Za-z0-9_]+=' | cut -d= -f2 || true
  } | grep -E '^-?[0-9]+$' | sort -u || true
}

cmd_read() {
  local limit=20 bot="" all="false"
  while [ $# -gt 0 ]; do
    case "$1" in
      --limit) limit="$2"; shift 2 ;;
      --bot) bot="$2"; shift 2 ;;
      --all) all="true"; shift ;;
      *) die "unknown flag for read: $1" ;;
    esac
  done
  [[ "$limit" =~ ^[0-9]+$ ]] || die "--limit must be a whole number"
  resolve_bot "$bot"

  local offset=0 resp
  if [ "$all" != "true" ]; then offset=$(get_offset); fi
  resp=$(api getUpdates -d "offset=$offset" -d "limit=$limit")

  jq -r --arg allowed "$(allowed_chats)" '
    ($allowed | split("\n")) as $ok
    | .result[]
    | select(.message.text != null)
    | select((.message.chat.id | tostring) as $c | $ok | index($c) != null)
    | "[\(.message.chat.id)] \(.message.from.first_name // "?"): \(.message.text)"
  ' <<<"$resp"

  local last
  last=$(jq -r '.result | if length > 0 then (.[-1].update_id + 1 | tostring) else "" end' <<<"$resp")
  if [ -n "$last" ] && [ "$all" != "true" ]; then
    save_offset "$last"
  fi
}

cmd_ask() {
  local question="" options="Yes,No" timeout=300 to="" bot=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --options) options="$2"; shift 2 ;;
      --timeout) timeout="$2"; shift 2 ;;
      --to) to="$2"; shift 2 ;;
      --bot) bot="$2"; shift 2 ;;
      -*) die "unknown flag for ask: $1" ;;
      *) if [ -z "$question" ]; then question="$1"; else die "unexpected argument: $1"; fi; shift ;;
    esac
  done
  [ -n "$question" ] || die "ask needs a question (telegram.sh help)"
  [[ "$timeout" =~ ^[0-9]+$ ]] || die "--timeout must be a whole number of seconds"
  resolve_bot "$bot"
  resolve_target "$to"

  # Flush pending updates so stale messages can't answer the question.
  local offset resp last
  offset=$(get_offset)
  resp=$(api getUpdates -d "offset=$offset" -d "timeout=0" -d "limit=100")
  last=$(jq -r '.result | if length > 0 then (.[-1].update_id + 1 | tostring) else "" end' <<<"$resp")
  if [ -n "$last" ]; then offset="$last"; save_offset "$offset"; fi

  local keyboard msg_id
  keyboard=$(jq -cn --arg opts "$options" \
    '{inline_keyboard: [[$opts | split(",")[] | {text: ., callback_data: .}]]}')
  resp=$(api sendMessage -d "chat_id=$CHAT_ID" \
    --data-urlencode "text=$question" --data-urlencode "reply_markup=$keyboard")
  msg_id=$(jq -r '.result.message_id' <<<"$resp")

  local deadline now remain answer cb
  deadline=$(( $(date +%s) + timeout ))
  while :; do
    now=$(date +%s)
    remain=$(( deadline - now ))
    if [ "$remain" -le 0 ]; then break; fi
    if [ "$remain" -gt 25 ]; then remain=25; fi

    resp=$(api getUpdates -d "offset=$offset" -d "timeout=$remain")
    last=$(jq -r '.result | if length > 0 then (.[-1].update_id + 1 | tostring) else "" end' <<<"$resp")
    if [ -n "$last" ]; then offset="$last"; save_offset "$offset"; fi

    # Button tap on our question message?
    cb=$(jq -r --argjson mid "$msg_id" --argjson chat "$CHAT_ID" '
      [.result[]
       | select(.callback_query.message.message_id == $mid)
       | select(.callback_query.message.chat.id == $chat)
       | .callback_query]
      | if length > 0 then "\(.[0].data)\t\(.[0].id)" else "" end' <<<"$resp")
    if [ -n "$cb" ]; then
      answer="${cb%%$'\t'*}"
      api answerCallbackQuery -d "callback_query_id=${cb##*$'\t'}" >/dev/null
      api editMessageText -d "chat_id=$CHAT_ID" -d "message_id=$msg_id" \
        --data-urlencode "text=$question
✅ $answer" >/dev/null
      printf '%s\n' "$answer"
      return 0
    fi

    # Free-text reply from the asked chat?
    answer=$(jq -r --argjson chat "$CHAT_ID" '
      [.result[]
       | select(.message.chat.id == $chat)
       | select(.message.text != null)
       | .message.text]
      | if length > 0 then .[0] else "" end' <<<"$resp")
    if [ -n "$answer" ]; then
      api editMessageText -d "chat_id=$CHAT_ID" -d "message_id=$msg_id" \
        --data-urlencode "text=$question
💬 $answer" >/dev/null
      printf '%s\n' "$answer"
      return 0
    fi
  done

  api editMessageText -d "chat_id=$CHAT_ID" -d "message_id=$msg_id" \
    --data-urlencode "text=$question
⏰ timed out" >/dev/null || true
  return 2
}

set_config_key() {
  local key="$1" val="$2" tmp
  ( umask 077; mkdir -p "$CONFIG_DIR"; touch "$CONFIG_FILE" )
  tmp=$(mktemp "$CONFIG_DIR/.config.XXXXXX")
  grep -v "^$key=" "$CONFIG_FILE" > "$tmp" || true
  printf '%s=%s\n' "$key" "$val" >> "$tmp"
  mv "$tmp" "$CONFIG_FILE"
  chmod 600 "$CONFIG_FILE"
}

cmd_setup() {
  local bot=""
  while [ $# -gt 0 ]; do
    case "$1" in
      --bot) bot="$2"; shift 2 ;;
      *) die "unknown flag for setup: $1" ;;
    esac
  done

  printf 'Telegram bot setup%s\n\n' "${bot:+ (named bot: $bot)}" >&2
  printf '  1. Open https://t.me/BotFather in Telegram\n' >&2
  printf '  2. Send /newbot and follow the prompts (display name, then a username ending in "bot")\n' >&2
  printf '  3. BotFather replies with an HTTP API token\n\n' >&2
  printf 'Paste the token here: ' >&2
  local token
  read -r token
  [ -n "$token" ] || die "no token entered"

  BOT_TOKEN="$token"
  local username
  username=$(api getMe | jq -r '.result.username')
  printf 'Token valid — bot is @%s\n\n' "$username" >&2

  printf 'Now send any message to https://t.me/%s then press Enter... ' "$username" >&2
  read -r _ || true
  local chat_id
  chat_id=$(api getUpdates | jq -r \
    '[.result[] | .message.chat.id | select(. != null)] | if length > 0 then (.[-1] | tostring) else "" end')
  [ -n "$chat_id" ] || die "no message found — send a message to @$username and rerun setup"

  if [ -z "$bot" ]; then
    set_config_key TELEGRAM_BOT_TOKEN "$token"
    set_config_key TELEGRAM_CHAT_ID "$chat_id"
  else
    set_config_key "BOT_$(upper_key "$bot")_TOKEN" "$token"
    if ! grep -q '^TELEGRAM_CHAT_ID=' "$CONFIG_FILE" 2>/dev/null; then
      set_config_key TELEGRAM_CHAT_ID "$chat_id"
    fi
  fi

  CHAT_ID="$chat_id"
  api sendMessage -d "chat_id=$chat_id" \
    --data-urlencode "text=✅ telegram.sh setup complete for @$username" >/dev/null
  printf 'Config written to %s (chat %s) — confirmation sent.\n' "$CONFIG_FILE" "$chat_id" >&2
}

main() {
  check_deps
  load_config
  [ $# -ge 1 ] || usage
  local cmd="$1"
  shift
  case "$cmd" in
    setup) cmd_setup "$@" ;;
    send) cmd_send "$@" ;;
    file) cmd_file "$@" ;;
    ask) cmd_ask "$@" ;;
    read) cmd_read "$@" ;;
    -h|--help|help) usage ;;
    *) die "unknown command: $cmd (telegram.sh help)" ;;
  esac
}

main "$@"
