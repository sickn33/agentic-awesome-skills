# Working rules — the discipline every app's instruction file carries

Section 1 of an app repository's instruction file carries a short list of working rules: how the agent reads, reports, commits and comments. Each below has its reason and, where it came from an incident, its receipt. They were learned on SaaS repositories built with coding agents; they hold on any stack.

## Read the instruction file before the first plan

The plan is where an unread rule does its damage: a plan built without the ownership model or the stage's done-when is rebuilt later. For an app, the plan that introduces the database names the workspace table, the authorization functions and the first migration (the `app-lifecycle` and `saas-authorization` skills).

## No play-by-play

Plan, build, summarize once. Narration spends the owner's attention on progress instead of on the decisions that need them, and buries the one line that matters. Status lines only when blocked or when a run will take long.

## Apply defaults; record the owner's choices

Use the defaults without a questionnaire; unavailable builder or other non-reviewer models or CLIs without a usable product fallback and irreversible or outward-facing actions are the points that need the owner, as `SKILL.md` § The working rules says. Reviewers always fall back as the `independent-review` skill requires. Record standing departures once in the entry file or user-level instructions, so another agent can find them. (Owner, `2026-11-05`: "Don't want to overcomplicate that.")

## Commit messages go through a heredoc

`git commit -F -` with a heredoc, never `git commit -m "…"`.

- **Reason:** commit messages in these repositories are full of backticked identifiers, and a backtick inside a `-m` argument is command substitution: the shell runs the word and replaces it with its output, which is usually nothing. The text is deleted **silently**, nothing warns you, and the message cannot be fixed after a push without a rewrite.
- **Receipt:** a commit in a sibling repository landed reading *"Grok sends , so"*.
- **The same trap, elsewhere:** a file generated through a shell into an interpreter is rewritten the same way, as silently. Read the bytes it produced.

```bash
git commit -F - <<'EOF'
Fix `resolveRoom` returning a closed room to `requireVisitor`
EOF
```

The quoted delimiter (`'EOF'`) is what stops the shell from expanding anything inside.

## A fix that carries an exclusion says why the excluded case does not need it

When a fix carves out a case, the comment must say why that case does not need the fix. A comment that describes the bug being fixed leaves the carve-out invisible to everyone who reads it afterwards — including the next pass over the same bug. **That sentence is the thing a later reader can check and find false.**

## A comment stating an invariant protects only the file it is in

A comment that states an invariant about a value — *never parse, reflect or store X* — protects only the file it is written in. List every route that can receive that value and check each one, because the comment cannot. A vendor may send a credential to more of your URLs than the one you registered as its callback. When one validates the parameter for its own meaning, **a rejection there is a dead end, not a validation success**: strip the parameter and carry on (a redirect also takes the credential out of the address bar, history and referrer). Keep not-found for a well-formed value that names nothing.

- **Receipt:** `2026-09-22`, a live Q&A product's install route kept such an invariant while its home page parsed the meeting vendor's OAuth code as its own code, rejected it and answered not-found on every fresh install in production.

## When a flag's meaning widens, rename it to what it does

A prop named for one reason (`busy`) becomes a sentence the next reader has to decode at the second call site. Name the behaviour (`undismissable`) and keep each call site's reason in a comment.

- **Receipt:** `2026-09-20`, a live Q&A product's dialog took a second, unrelated reason to refuse dismissal (a secret shown once, which dies when the dialog closes).

## When the instruction file is silent, the skills' defaults apply; past them, decide and say so

The skills' defaults cover what neither section of the file does; the agent decides what they don't cover either, and says what it decided in the summary, so the owner can correct it and the file can learn it. **When a library's default conflicts with the file, the file wins** — vendored skills and quickstarts teach their own defaults, and the file is where the product's choices against them are written.

## A doc that disagrees with code you did not change is reported, not resolved

Say so in the summary and let the owner decide which side moves. The agent does not know whether the doc is stale or the code is wrong; picking a side silently either deletes a requirement or blesses a bug. At a release, the read-only checks the owner picks, which list every mismatch between docs, coverage map and code — and write nothing — make the list complete (the `document-app` and `derive-tests` skills, each in `check` mode).

## Tests and docs are part of the change

A bug fix lands with a regression test that fails on the broken behaviour and passes with the fix. Any other behaviour change lands with the tests the test rules ask for, in the harness whose *runs* column says where it runs — in the gate, outside it, or by hand — and the summary says which. Every change updates the doc lines it made false. (The `test-harness` skill.)

## Rules that belong to other skills, which Section 1 still names in a line

These are working discipline too; their depth lives elsewhere, and Section 1 carries the sentence and the pointer:

- **Read the exit code from the log, never the notification** — a background wrapper can report exit 0 while the command inside it failed (`test-harness`).
- **An inherited report is a claim, not evidence** — re-run the gate yourself before repeating a count, and take a release's subject from git, not prose (`release-gate`, `independent-review`).
- **The coverage map is written by whoever ran the gate, by nobody else** (`test-harness`).
- **The session that wrote the code never clears it.** Get a fresh independent review before every deploying push and promotion. Apply `independent-review` for the bar and `release-gate` § Stage and phase close for the checks. Name the phase split, cadence and rough builder hours in the plan. Keep stage commits local or on a non-deploying branch until the phase clears.
- **If a delegation brief would be nearly as long as the diff, write the diff** (`delegation`, `codex-agents`).
- **Before handing the owner a task, do every part of it you can** — through an API, a CLI, a key you hold — and pass up only what needs a person: a dashboard-only click, money, taste. A delegate's "commands for the owner" are a claim about who can run them (`delegation`).
- **A generated secret is generated, written into `.env` and named in the summary**, never left as an empty placeholder nobody can look up (`environments`).
