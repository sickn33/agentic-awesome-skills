# Lessons

Eight lessons, each from a failure in a real migration. A lesson counts here only if it happened and a check can see it. Each says when to apply it, why, where to stop, and what enforces it.

## 1. An edit is the size of its change

**Apply when** a worker edits a shared checkout, or runs a formatter or codemod.
**Why** most workers in one run used `sed -i` after a prose ban, and BSD and GNU forms differ. A formatter on the wrong config rewrote whole files nobody meant to touch.
**Stop** if `git diff --stat` shows a file rewritten whole for a small change. Keep only the real hunks, and run the formatter and config the repo has now, which can change mid-run. A regex over many files is a codemod you diff.
**Enforced by** the host hook or the brief's BANS block, and `land.mjs`, which commits only named paths.

## 2. Payload strings are not copy

**Apply when** a copy rule, formatter or codemod touches a copied prompt, a model prompt, an API example, a clipboard value, text that must stay verbatim (quotes, terms, version strings), data-layer strings or a string a test pins.
**Why** a curly apostrophe landed in a prompt users copy into an assistant. Nothing on the page showed it.
**Stop** before rewording. A migration never changes data-layer or model-prompt text. Flag it for its owner.
**Enforced by** element-scoped exemptions in the check, and a byte comparison of each payload string with the base commit after every sweep.

## 3. A control swap needs a parity table

**Apply when** a number, amount, percent, date or upload control changes.
**Why** an integer field saved 25 for `2.5`, and an upload control refused a file by its extension though its MIME type matched. Every visual check passed.
**Stop** on any differing row nobody approved.
**Enforced by** `parity.mjs` and the classes in `parity.md`, including MIME with and without extension, upper-case extension and a wrong MIME.

## 4. A date-only value is not a moment

**Apply when** a surface shows, parses or sends a date.
**Why** a date-only value serialized through a local-midnight `Date` shifted a day west of UTC, more than once, and some dates were already a day early before the run.
**Stop** on any `new Date("YYYY-MM-DD")` or local-midnight `Date` in a date-only path. Keep the value a string or a UTC date. A bug legacy already had is fixed in its own commit as an `intended change` row and named in the report, never silently.
**Enforced by** `parity.mjs date` under `America/Los_Angeles` and `Asia/Tokyo`.

## 5. Write bodies come from one run

**Apply when** a diff adds, moves or rewraps `mutate(`, `mutateAsync(`, `onSubmit`, `execute(` or a non-GET `fetch`.
**Why** two real runs joined by script produced a pair that passed and had to be reverted.
**Stop** if one logged run did not produce both body files.
**How.** Serve two builds at once on two local ports: the base commit's, from its own worktree, and the run branch's. Wrap both captures in one logged run, each driving the changed write with the same `--states` step, so the guard blocks it and keeps its body:

```
rc=0; node <this skill>/scripts/bodies-check.mjs log .design-system/runs.log start RUN-7
node design-how-build-design-system/scripts/capture.mjs --base http://localhost:5183 --kind before --out .design-system/captures/before --surfaces <tsv> --states <steps.mjs> --writes <file> --run RUN-7 --bodies .design-system/evidence/<surface>/bodies.before.json || rc=1
node design-how-build-design-system/scripts/capture.mjs --base http://localhost:5173 --kind after --out .design-system/captures/after --surfaces <tsv> --states <steps.mjs> --writes <file> --run RUN-7 --bodies .design-system/evidence/<surface>/bodies.after.json || rc=1
node <this skill>/scripts/bodies-check.mjs log .design-system/runs.log end RUN-7 $rc
```

Then land with `--bodies-check "node <this skill>/scripts/bodies-check.mjs .design-system/evidence/$SURFACE --expect <procedures> --before-ports 5183 --after-ports 5173 --log .design-system/runs.log"`. Bodies that differ print `DIFF`. An announced data fix lands only with an `intended change` row in `decisions.tsv` that names the surface and the procedure. Any other difference holds the surface.
**Enforced by** `land.mjs --bodies-check`, which refuses a write diff with no valid pair and any `DIFF` no row explains.

## 6. Capture behind the guard

**Apply when** any script drives a live app.
**Why** a capture leaked a real update call and changed real data. Another script's abort filter matched the wrong URL shape and created real records. Reads are POST in many RPC APIs, so blocking non-GET blocks the app.
**Stop** before any run that can reach a backend until a dry run sent every known write, in the shape the app sends it, and saw each one blocked. Writes are denied by default and reads pass by exact name only.
**Enforced by** `design-how-build-design-system/scripts/capture-guard.mjs prove --writes <file> --read-procedures <names>` (exact names are its default), and `capture.mjs`, which installs the guard before the first navigation, refuses to start without `--writes <file>` or `--no-backend`, refuses while the file has a leak, and writes `guard.log`, with each write's body, beside the captures.

## 7. No write surface on a code read

**Apply when** a verifier cannot run the surface in a browser.
**Why** a grid landed on a code read alone, with no browser pass, and broke.
**Stop** and return `blocked` with the missing evidence and the command to rerun.
**Enforced by** the glossary: only `verified` at the surface's fingerprint lands a write surface.

## 8. Widths are measured inside the scroller

**Apply when** a table, grid or row layout changes.
**Why** no row control was in view while a window-based script passed.
**Stop** if any control reachable before is not reachable at 390, 768, 1280 or 1920. Each width is a fresh navigation, with a long title and more rows than fit.
**Enforced by** the verifier's measurements in its verdict, and `capture.mjs`, which reports a capture under 700 bytes as a blank render, not a capture.
