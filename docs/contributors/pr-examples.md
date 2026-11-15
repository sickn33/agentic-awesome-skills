# Examples of useful pull request evidence

Use the three evidence headings in the default PR template. These are illustrative descriptions, not tests performed by AAS. Replace the examples with your own observations; do not paste a successful result you did not obtain. A checkbox list alone or an unfinished field such as `Input: [replace with prompt]` is not evidence.

## New original skill

**Change evidence:** Adds `invoice-field-review` for comparing invoice totals against supplied line items. Existing PDF extraction skills recover text; this skill checks arithmetic and lists unresolved fields. Example input is a synthetic three-line invoice.

**Validation evidence:** Inspected the complete bundle and ran contributor preflight on the committed head against fetched upstream/main; attach the actual full SHAs and command outcome. For the synthetic invoice, expected total was 30 and the illustrative workflow should flag the supplied total of 35. If you actually tested it, report the observed result and agent/tool version. If not, say “Agent task not run; this is an illustrative example, not measured behavior.” Do not turn an expected result into an observed one.

**Source and operational boundaries:** Original prose, `source: self`; no copied upstream material. Works on user-provided invoice text; no account, network call or write required. No affiliation. State any different real requirements for your own skill.

## Small correction

**Change evidence:** Corrects the example port in `skills/my-skill/SKILL.md` from 8080 to 3000 to match the named tool's documented default.

**Validation evidence:** Compared that example against the linked official versioned documentation. Live service not started because this is a documentation correction. Attach the actual preflight outcome or explain why it could not be run.

**Source and operational boundaries:** Existing source and license retained; no new recipients, credentials, writes or costs.

Brief sentences are sufficient. An agent subscription or elaborate benchmark is not required for a typo.

## Upstream update

**Change evidence:** Identify source and affected skill IDs. For Git sources, give the full upstream commit. For a non-Git HTTPS source, give the retrieval date and SHA-256 of the reviewed content with a readable source/comparison; do not invent a commit. List upstream capabilities changed and local safety/compatibility adaptations retained. Link the actual comparison or source, not a mutable branch as a version pin.

**Validation evidence:** Give base/head of your contribution, commands and observed results. State exactly what remains untested and why. A source comparison does not demonstrate a successful provider/API task.

**Source and operational boundaries:** Identify retained LICENSE/NOTICE files, account/connector requirements, data leaving the machine, writes, costs and affiliation. Explain any provenance identity change; maintainers review it separately.

## Keep a contribution reviewable

- Choose one coherent outcome per PR. Several files or skills can form one necessary bundle; explain their dependency. Split unrelated additions, fixes and tooling.
- Inspect the entire `skills/<id>/**` bundle, including nested files. List scripts, dependencies and side effects before seeking the restricted maintainer path. Never rename executable content to bypass policy.
- Avoid generated catalogs, plugin mirrors and credits. A reviewer may request a protected replacement for a valid restricted bundle; this is not permission to bypass checks.
- Fetch upstream before the final preflight. Do not continuously merge/rebase while a maintainer is reviewing; coordinate necessary updates and expect fresh checks on changed heads. Maintainers may still require strict-base alignment.
- Submit the command output or concise truthful summary; redact credentials, transcripts and sensitive inputs. Do not commit local report files or dependency directories.

## Fix feedback in one pass

Read the complete **Contribution readiness** report and failing check output. It can show description, generated-path and fork-boundary problems together; later content checks may discover additional findings. Correct all applicable author-owned findings before pushing again. An absent local body means description admission was not checked, not that it passed.

Use one prepared description with the real preflight:

```sh
npm run pr:preflight -- --contributor --base upstream/main --head HEAD --body-file .tmp/pr-body.md
```

Commit source first and keep the description in an untracked, ignored local file. `--no-run` is only a preview. Unknown options and missing option values are errors; a misspelled flag must not silently select a weaker validation mode. If a fork awaits workflow approval, wait for a maintainer; do not push an unchanged “retry” commit. If a test would cost money or perform a consequential external write, explain its absence instead of running it for admission.
