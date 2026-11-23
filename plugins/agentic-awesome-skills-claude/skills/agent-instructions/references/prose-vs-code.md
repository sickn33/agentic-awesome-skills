# Prose vs. code — where a rule actually belongs

**The test, before encoding any rule:** does compliance depend on an agent holding this sentence in working memory at the decisive moment? If yes, prose will lose — it is competing with everything else the agent has read — and the rule belongs in a **code path**: a required argument, a script, a validation, a check that runs.

A reviewing model's diagnosis of one agent-run repository, verified against that repository: *"a writer's exoskeleton that answers every failure by writing, in a medium where only scripts are load-bearing."*

## The evidence

Filed `2026-07-25`, after an audit day of one agent-run content repository where the pattern held without a single exception. Everything implemented as **code** worked; everything implemented as **prose obligation** decayed:

| Implemented as | Outcome |
|---|---|
| a reconcile script | backfilled faithfully, every time |
| a script that writes each item's performance record | recorded the failures as diligently as the successes — no survivorship filter |
| a *rule* to emit a record at ship time | failed **26 of 43** ships; a reconcile job silently covered for it, which taught the system that skipping was free |
| hit/miss verdicts, an obligation no script computed | blank on **28 of 46** rows |
| a retirement convention (move retired files to a folder) | **zero** such folders anywhere; never once executed |
| an experiment tag, written into doctrine | ran seven weeks with **zero** treatment rows |
| required metadata fields on each record | 56 filled in one month, **1** the next — which made the next month's analysis impossible to run |

## The sharpest instance

On `2026-06-15` a real two-line code defect was found in a notification script: its arguments were silently discarded in non-interactive containers. The response was to write a *convention* into the agents' instructions telling future agents to pipe the message through stdin instead. The convention decayed. Five weeks later that exact bug killed a scheduled ingest job for five days, invisibly — because the job's failure alerts went through the broken path. **A confirmed code bug was answered with prose.** The patch, when finally written, was two lines.

## Corollary — writing it down feels like fixing it

That is why the reflex is invisible from the inside: the artifact it produces looks exactly like diligence. Dated, well argued, filed in the right place, and inert.

Same-day proof that this is not hindsight: the fix for a telemetry file that was not being committed was first specified as "tell each of the eleven scheduled jobs' prompts to commit the file" — and that was the one part that broke. It was corrected to a `--commit` flag inside the logging script itself.

## So

- **Prefer the code path.** When you catch yourself writing a rule to prevent a recurrence, ask what would make the recurrence *impossible* instead.
- **A confirmed code bug is fixed in code**, never answered with a convention for working around it.
- **When prose is genuinely the only option** — taste, judgement, voice — keep it short, route to it rather than restating it, and expect it to need reinforcement.
- **A rule a test or a script can hold gets one**, and the instruction file says what the test asserts, so a reader knows the rule is held and where.

## What a code path looks like in an app repository

Examples from SaaS repositories built with coding agents, each a rule that used to be (or would have been) a sentence:

- **A configuration rule held at build time.** Every environment variable has a line in a schema that fails when it is missing, and the schema runs from the framework's config at build and dev start — not only at boot — because a public variable is inlined into the client bundle when the build runs, and a boot check comes after the leak. It checks each key's shape where the vendor gives one. (`2026-10-10`, a product's `.env` held the identity provider's secret key in the publishable variable; the shape check caught it before anything was built with it.)
- **A source guard.** A unit test refuses any currency literal under the source tree, so no price is ever copied into code; another refuses per-page share-card keys, so a page cannot silently discard its preview image; another refuses colour literals in the component kit's stylesheet.
- **A test that pins documentation to code.** A legal page is checked by a test that fails when the code reaches a provider the privacy policy does not name; an MCP server's tools are checked by a test that every argument has a description and every tool an output schema.
- **A wrapper that refuses.** A review wrapper refuses a range with no commits and a clean tree, and fails loudly when a round comes back too short to have run, instead of trusting the agent to notice a suspiciously short "all clear". An operator script refuses every option its command does not read, with a list per command, and never echoes the value it refused. (`2026-10-24`, a monitoring product: a deploy command ignored `--dry-run` and deployed development's alert sender for real; the refusal that fixed it echoed `--name=value`, which could print a pasted connection string's password; and one list shared by every command let another project's ref through to a command that deployed this checkout's environment anyway.)
- **A required argument.** A shipping script that will not record a release without the fields the analysis needs, instead of a rule asking agents to fill them in.
- **A validator for the instructions themselves.** A check that every doc is reachable from the entry file (`scripts/check_reachable.py` in this skill), and, for a collection of skills, one that checks frontmatter and refuses private names leaking into published text.

When the entry file states such a rule, it says what holds it: "the env schema runs at build; a test refuses currency literals". The sentence then documents a guarantee instead of asking for one.
