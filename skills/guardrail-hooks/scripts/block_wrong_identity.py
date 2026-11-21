#!/usr/bin/env python3
"""PreToolUse guard for shell commands: never author a git commit with the wrong identity.

A template. Put the addresses that must never author a commit in CONFIG, or set
BLOCKED_GIT_EMAILS="a@example.com,b@example.com" (and optionally GIT_IDENTITY_HINT).
With no addresses configured it allows everything.

Why it exists (receipts, 2026-09 to 2026-10). An agent harness showed the owner's
sign-in address to the agent as "the user's email". On the code host, that address
belonged to a different account, so every commit the agent authored with it was
credited to the wrong person: three repositories, on 2026-09-07, 2026-10-02 and
2026-10-05. A commit, once pushed, cannot be re-credited without rewriting history.

What it blocks (exit 2, reason on stderr, which the agent reads):
  - the address set as an identity: `git config user.email`, `git -c user.email=`,
    GIT_AUTHOR_EMAIL= / GIT_COMMITTER_EMAIL= / EMAIL=
  - the address passed as `--author` on a commit
What it allows: searching for the address (grep, git grep, `git log --author=`),
because finding where it was used is how you clean up after it.

Exit 2 is honored as a block by Claude Code, Codex and Cursor alike (read 2026-10-24).
Input: tool_input.command (Claude Code, Codex) or a top-level "command" (Cursor).
Test after every edit: run the test_hooks.py beside this file (python .claude/hooks/test_hooks.py once installed).
"""
import json
import os
import re
import sys

CONFIG = {
    # EXAMPLE: replace with the address(es) that must never author your commits.
    "blocked_emails": [],
    # What the agent should do instead; shown in the block message.
    "use_instead": "the repository's own git config, or the identity your instructions name",
}

SEGMENT_SPLIT = re.compile(r"&&|\|\||[;|\n]")
# `commit` as git's subcommand, after any global options (-C <path>, -c <k=v>, --no-pager),
# so the word elsewhere (`git log --author=<addr> --grep commit`) doesn't count.
GIT_COMMIT = re.compile(r"""\bgit(?:\s+(?:-[cC]\s+(?:"[^"]*"|'[^']*'|\S+)|-\S+))*\s+commit\b""")


def read_payload():
    """The hook JSON is UTF-8. On Windows, Python decodes a pipe with the ANSI code page
    and writes stderr in it too, so non-ASCII text arrives garbled (observed 2026-10-24,
    Python 3.13, Windows 11: a hook's section sign reached the transcript as U+FFFD).
    Read bytes, decode UTF-8, and write UTF-8."""
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError):
            pass
    try:
        payload = json.loads(sys.stdin.buffer.read().decode("utf-8", errors="replace"))
    except Exception:
        return None
    return payload if isinstance(payload, dict) else None


def blocked_emails():
    env = os.environ.get("BLOCKED_GIT_EMAILS")
    emails = [e.strip() for e in env.split(",")] if env is not None else CONFIG["blocked_emails"]
    return [e for e in emails if e]


def offending(command, email):
    e = re.escape(email)
    for seg in SEGMENT_SPLIT.split(command):
        if re.search(r"\buser\.email\b\s*[= ]\s*['\"]?" + e, seg, re.I):
            return "set as user.email"
        if re.search(r"\b(GIT_AUTHOR_EMAIL|GIT_COMMITTER_EMAIL|EMAIL)\s*=\s*['\"]?" + e, seg, re.I):
            return "set as an identity environment variable"
        if GIT_COMMIT.search(seg) and re.search(r"--author[= ]\s*['\"]?[^'\"\n]{0,80}?" + e, seg, re.I):
            return "passed as a commit's --author"
    return None


def main():
    payload = read_payload()
    if payload is None:
        return 0
    tool_input = payload.get("tool_input")
    command = (tool_input.get("command") if isinstance(tool_input, dict) else None) or payload.get("command")
    if not isinstance(command, str) or not command:
        return 0
    hint = os.environ.get("GIT_IDENTITY_HINT", CONFIG["use_instead"])
    for email in blocked_emails():
        how = offending(command, email)
        if how:
            sys.stderr.write(
                f"Blocked: {email} must never author a commit here ({how}); commits made with it "
                f"are credited to the wrong account. Use {hint}.\n"
            )
            return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
