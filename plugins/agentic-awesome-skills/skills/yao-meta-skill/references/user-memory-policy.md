# User Memory Policy

This skill treats user preference memory as local, explicit, and reviewable.

## Principles

- **Explicit source only**: adaptive scans require a user-provided file path.
- **Local first**: no network access is needed for preference extraction.
- **No implicit private logs**: shell history, browser history, mail, and hidden chat logs are blocked by default.
- **Repeated signals only**: one-off statements are recorded as discarded signals unless they meet the configured support threshold.
- **Redacted evidence**: stored excerpts must remove secrets, tokens, email addresses, and local absolute paths.
- **Proposal before patch**: preference memory can generate proposals, not automatic source edits.

## Allowed Inputs

Recommended inputs are curated JSONL, Markdown, or text files prepared for review. JSONL records should use a field such as `text`, `message`, `content`, `excerpt`, `prompt`, `note`, or `body`.

## Blocked By Default

The scanner refuses common shell history files such as `.zsh_history`, `.bash_history`, and `.fish_history` unless an explicit override is added for a controlled test. Even with an override, the output remains redacted and proposal-only.

## Retention

Generated reports store only summarized patterns and short redacted excerpts. They should not be treated as a full transcript, chat archive, or durable personal memory store.

## Upgrade Path

A future patch-application stage must add:

- human approval ledger;
- allowlisted target files;
- dry-run diffs;
- regression command execution;
- rollback artifacts;
- reviewer-visible audit trail.
