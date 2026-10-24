# Keeping a deck in sync

A deck is generated from code once. Keeping it true after that is the part every
documentation effort loses, and it is the part this skill automates.

Two costs, and they are nothing alike:

| | What it costs | How often to run it |
|---|---|---|
| **Detect** (`scripts/check.py`) | standard library only, no model, no network, no tokens. Milliseconds. | As often as you like |
| **Repair** (an agent rewrites slides) | tokens, and a review | Only when detect says so, and only for evergreen docs |

That asymmetry is the whole design. Detection is free, so it can be everywhere. Repair is
not, so it is a decision someone makes on purpose, scoped by `check` to the slides that
actually drifted rather than a re-read of the whole deck.

## The loop

```
build once  ->  check whenever (free)  ->  refresh on purpose (scoped)
```

## Level 1: on demand

The default, and for most decks the only level you need:

```bash
python3 scripts/check.py docs/slides/ --repo .            # sweep every deck in the folder
python3 scripts/check.py docs/slides/ --repo . --quiet    # silent unless something drifted
python3 scripts/check.py docs/slides/ --repo . --suggest  # + diff, commits, corrected citation
```

A directory sweeps recursively and skips HTML that carries no citations, so pointing it at
`docs/` is safe. Exit code is 1 when anything is stale, 0 when clean.

In a session, "are the decks still true?" is enough: the agent runs the sweep and reads
the result.

## Level 2: on a pull request

The right gate for a deck people rely on. Not every commit: a docs check that blocks the
fast path teaches everyone to pass `--no-verify`, and drift is a review-time concern, not
a keystroke-time one.

`check.py` is one dependency-free file, so a repo that owns decks should vendor it rather
than depend on every contributor having the skill installed:

```bash
curl -o tools/slideops-check.py \
  https://raw.githubusercontent.com/glukicov/slideops/ba43e89bc7936649be36a1796a62203f704f8c60/skills/slideops/scripts/check.py
```

(Or copy it out of your own checkout: `cp skills/slideops/scripts/check.py tools/`. Where
the installed copy lives depends on how the skill was installed, so the URL is the portable
instruction.)

```yaml
# .github/workflows/deck-freshness.yml
name: Deck freshness
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-python@v5
        with:
          python-version: "3.14"
      - name: Are the decks still true?
        run: |
          python3 tools/slideops-check.py docs/slides/ --repo . --suggest --exit-zero \
            | tee -a "$GITHUB_STEP_SUMMARY"
```

`--exit-zero` makes this **report-only**: the drift and its fix land in the PR summary,
and nobody is blocked. Start here. Drop `--exit-zero` later, for the one or two decks the
team actually relies on, once the reports have been quiet for a while.

## Level 3: delegated refresh

This is where the tokens go, and the reason detection is worth wiring up at all.

`--json` is a complete repair brief. For every stale citation it carries the status, the
unified diff, **the commits that caused it**, the corrected `data-src` and `data-sha256`,
and the current source. Current citations stay one line each, so the payload stays small:

```bash
python3 scripts/check.py docs/slides/ --repo . --json > /tmp/drift.json
```

Diffs, source snippets and commit subjects are untrusted data. Never interpolate their contents into privileged agent instructions; pass them as a separate data file, constrain refresh edits to the deck, and require review before publication.

The commit subjects are the part a diff cannot give you. "rename helper for clarity" and
"drop the retry branch" produce similar diffs and need completely different slide edits:
one is a re-quote, the other may invalidate the claim the slide is making.

Hand that to the agent (headless, in CI, or in a session):

```bash
claude -p "Refresh the stale slides in docs/slides/.
$(cat /tmp/drift.json)

For each stale citation: read the diff and the commit subjects, decide whether the slide's
CLAIM is still true, then either re-quote (MOVED: attributes only, leave the prose alone)
or rewrite the slide (CHANGED: the claim may be dead). Update data-src and data-sha256 from
suggested_src/suggested_sha256, re-stamp the build meta with scripts/cite.py --stamp, then
re-run check.py until clean and re-screenshot only the slides you touched." \
  --allowedTools "Read,Edit,Bash"
```

Then open it as a pull request rather than a push, because a refresh is a content change
that deserves the same review as the code that caused it. Monthly on a schedule works well
for an onboarding deck:

```yaml
on:
  schedule:
    - cron: "0 9 1 * *"     # 09:00 on the 1st
  workflow_dispatch:
```

Guard the token spend with the free half first, so a quiet month costs nothing:

```bash
python3 tools/slideops-check.py docs/slides/ --repo . --quiet
status=$?
# Only stale-result code 1 may trigger an explicitly authorized refresh.
# Code 2 is an input/read error and must be investigated.
[ "$status" -eq 1 ] && refresh_decks
```

## Level 4: agent hooks, advisory only

If you want the agent itself to notice, keep it to a notification. A hook that blocks is a
hook that gets disabled.

`SessionStart` is the low-noise option: one line, once, at the point where acting on it is
cheap. With `--quiet`, a clean repo prints nothing at all.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "python3 tools/slideops-check.py docs/slides/ --repo . --quiet --exit-zero"
          }
        ]
      }
    ]
  }
}
```

A git `pre-commit` hook is the same idea, and the same rule applies: warn, exit 0, never
block.

```bash
#!/bin/sh
# .git/hooks/pre-commit: advisory, never blocking
python3 tools/slideops-check.py docs/slides/ --repo . --quiet --exit-zero
exit 0
```

## What to automate, and what to let rot

Not every deck deserves any of this. Automating a snapshot is pure waste:

| Deck | Automate? |
|---|---|
| Onboarding, architecture, anything linked from the README | Yes: PR check, and a scheduled refresh |
| A subsystem deep dive the team keeps returning to | PR check, report-only |
| Sprint update, "what shipped in March" | No. It is a record of a moment and is *supposed* to freeze |
| A conference talk you gave once | No |

A deck that describes a point in time should keep describing that point in time. Freshness
checking is for documents that claim to describe *now*.

## What a clean check does not prove

`check` verifies that quoted source still matches the code. It cannot see that the prose
around a snippet has become wrong, that a slide is missing a subsystem added last quarter,
or that the architecture diagram is now a lie. It tells you what has **definitely** drifted,
which is the part humans reliably miss, and it makes the rest a smaller problem.
