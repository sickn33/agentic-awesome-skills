#!/usr/bin/env bash
# Per-dir resumable download loop — robust to mid-transfer connection drops.
#
# Each dir is pulled in its own session, so one network blip never loses the rest,
# and rsync reconciles existing local directories on every run. A single `scp -r` of a huge tree dies
# on any blip and does NOT resume — see references/gotchas_universal.md (transfer
# resets). This uses rsync --partial, which resumes a half-pulled dir in place.
#
# Usage (override any var from the environment):
#   LOCAL_TARGET=/path/to/local/final_ckpts \
#   REMOTE_ALIAS=my-gpu-1 \
#   REMOTE_PATH=/durable/final_ckpts \
#     bash download_loop.sh
#
# Always run rsync: directory size alone cannot prove transfer completeness.
# Requires Bash 4+ and rsync with --protect-args on both ends.
set -u
if [ "${BASH_VERSINFO[0]}" -lt 4 ]; then
    echo "Requires Bash 4+ (mapfile); select a supported interpreter." >&2
    exit 1
fi

LOCAL_TARGET="${LOCAL_TARGET:-/path/to/local/final_ckpts}"
REMOTE_ALIAS="${REMOTE_ALIAS:-my-gpu-1}"
REMOTE_PATH="${REMOTE_PATH:-/root/autodl-fs/final_ckpts}"   # override from your profile (durable mount)
case "$REMOTE_ALIAS" in
    ""|-*|*[!a-zA-Z0-9_.@-]*) echo "ERROR: use a configured SSH alias or user@host" >&2; exit 1 ;;
esac
# Quote for the remote POSIX shell; SSH does not preserve local argv boundaries.
shell_quote(){ printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"; }
remote_path_quoted=$(shell_quote "$REMOTE_PATH")

mkdir -p "$LOCAL_TARGET"
cd "$LOCAL_TARGET" || exit 1

echo "Listing remote dirs in $REMOTE_ALIAS:$REMOTE_PATH ..."
# Capture the listing AND its exit status separately. A bare `mapfile < <(ssh ...)`
# discards ssh's exit code, so an unreachable host or a wrong path yields an empty
# array that then reads as "nothing to download" -- a silent success right before a
# pre-teardown pull (principle #3). Fail loud on a listing error instead.
remote_listing=$(ssh -o ConnectTimeout=15 "$REMOTE_ALIAS" "ls -1 -- $remote_path_quoted")
ssh_rc=$?
if [ "$ssh_rc" -ne 0 ]; then
    echo "ERROR: could not list $REMOTE_ALIAS:$REMOTE_PATH (ssh/ls exit $ssh_rc) -- refusing to treat an unreachable host as an empty download." >&2
    exit 1
fi
# mapfile preserves names with spaces; guard the empty string so it yields 0 elems, not 1.
if [ -z "$remote_listing" ]; then remote_dirs=(); else mapfile -t remote_dirs <<< "$remote_listing"; fi
n_total=${#remote_dirs[@]}
echo "Found $n_total remote dirs"
if [ "$n_total" -eq 0 ]; then echo "Remote dir is reachable but empty -- nothing to download."; exit 0; fi

ok=0; skip=0; fail=0
for d in "${remote_dirs[@]}"; do
    [ -n "$d" ] || continue
    # The listing is line-delimited: reject path components that could escape the target.
    case "$d" in ""|.|..|*/*) echo "FAIL: invalid remote entry" >&2; fail=$((fail+1)); continue ;; esac
    echo "DOWNLOADING $d ..."
    if rsync -az --partial --protect-args -e 'ssh -o ConnectTimeout=15 -o ServerAliveInterval=60 -o ServerAliveCountMax=120' \
        "$REMOTE_ALIAS:$REMOTE_PATH/$d" ./ ; then
        echo "OK $d"; ok=$((ok+1))
    else
        echo "FAIL $d"; fail=$((fail+1))
    fi
done

echo
echo "=== Done ===  OK: $ok  SKIP: $skip  FAIL: $fail  (of $n_total expected)"
echo "Local dirs now: $(find . -mindepth 1 -maxdepth 1 -type d | wc -l)"
[ "$fail" -eq 0 ] || { echo "Re-run to retry the failed dirs (resumable)."; exit 1; }
