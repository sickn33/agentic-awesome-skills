# Correct

Run at close, and whenever the person says a mistake came back. Assume every contributor is an agent that sees only the files it opened, copies the nearest example and takes the shortest path that compiles. Make a change that looks right from one file be right for the whole repo.

## Find the classes

Read the run's reverts, `blocked` and rework rows, review comments, `decisions.tsv`, and comments that explain a workaround. Group them. A class counts once it has happened twice. One-offs are ignored.

## Fix each class at the highest level that works

1. **Architecture.** One owner per piece of state, one supported way per task, internals unreachable so the wrong import fails, one source of truth instead of hand-synced lists, the old module deleted so no one copies it.
2. **Types, then a lint rule** whose message names the fix ("use `Text`, see docs"). If the pattern is already common, fail only when a change adds more.
3. **A test** of the behaviour.
4. **Docs or brief text last**, and only for judgment calls. Nothing fails when an agent skips them.

Each ban ships with its check in the same change. The check is proven to fail on a real past case before it counts. Exceptions go on the offending line with a reason, an expiry date and the name of the person who allowed it. A ban that exists only as a line in a brief is listed as unenforced.

## The rule table

Keep it in the system's agent instructions.

| Rule | Enforced by | Proven against |
|---|---|---|
| Exact edits, no `sed -i` | hook, `land.mjs` named paths | a run where most agents used it after a prose ban |
| No curly quotes in payload strings | element exemption, byte compare with base | a copied prompt with a curly apostrophe |
| Table controls reachable inside the scroller | verifier measurement at four widths | no row control in view while a window-based script passed |
| Named page widths (wide, hub) equal legacy at 1280 | width table plus a measured content box | a visible shift from two different wide tokens |
| Upload `accept` matches MIME as well as extension | `parity.mjs` class, a lint on `accept=` | a file refused for having no extension |
| Request bodies equal before and after, or an announced change | `land.mjs --bodies-check` with intended change rows | a pair joined from two runs that passed and was reverted |
| A shared file changes only its own rows | `land.mjs --also` | a ratchet recomputed over a folder that carried other workers' files |
| No live run before every write is seen blocked | `capture.mjs --writes`, `capture-guard.mjs prove` | an abort filter on the wrong URL shape that created real records |

When a rule is already in the table and nothing enforces it, that is a repeat. Fix it at a higher level in the same change. Drop a rule once its mistake cannot happen.

## Reply

Each class with its evidence, the level chosen, and why a higher level did not work. Proposals for token or lint changes wait for a person, except ratcheted additions.
