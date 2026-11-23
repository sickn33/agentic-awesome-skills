# The promotion checklist

Preconditions, go/no-go, promote, verify, record — in that order, for every promotion to production. Going live (the first promotion) adds the steps in `go-live.md`. The plan, the backlog, the coverage map and the other records are the ones `SKILL.md § The product's records` describes; read each, and each script name, as your product's own.

## 1. Preconditions — no-go if any is false

Post every box with its evidence. A box the owner waives is recorded as **waived**, never ticked.

- [ ] **The full applicable gate passed locally on the exact commit.** Compare its scripts with the `test-harness` contract and record any owner-chosen omissions from the plan. This is also the default at every phase end and before every deploying push, development included. Read every exit code from the log rather than the task notification (`SKILL.md § What counts as evidence`). There is no hosted CI unless wired as its own change (`go-live.md § Guards and hosted CI`); the local gate includes the authenticated mile. **A failure that was red before the release is still a failure**: carried, not caused, and still owed a fix before promotion. (`2026-09-14`, a live Q&A product promoted with two browser tests that had been red at the previous promotion too; its own record now says pre-existing failures still block promotion: fix them, re-run the full gate, finish the acceptance checks, then ask for the go.)
- [ ] **No suite flaking.** "Usually passes" is a no-go. A red run followed by a green one is recorded as both, never as cancelled (`test-harness`).
- [ ] **The independent review ran on the whole unreleased range against a still tree.** Follow `SKILL.md` § The independent review for the command, manual fallback, required follow-up rounds and finding disposition. Require the last round to produce no INTRODUCED finding above Low after `independent-review` § Triage, and no High or Critical of any age. Compute round 1's range from git (`origin/<product>-prod..HEAD` in the review checkout, plus its working tree). At the first release, before the production branch exists, it is the whole product (`go-live.md`, step 2).
- [ ] **The docs describe the code as it is**, the coverage map included — written in the change by whoever ran the gate. Run the phase's `document-app` check and close its plan line as in `SKILL.md` § Stage and phase close. Propose `derive-tests` in check mode beside the static audits. Both checks take a repository path, not a git range, and write nothing; they list disagreements among docs, coverage and code. Fix each mismatch before the go, on the side the owner picks; record any owner-declined check as declined. If both are declined, the box rests on the change's docs, coverage evidence and the phrase sweep below; say "checks declined: no mismatch list". With one declined, name the unchecked half. **A stale doc is never deferred.** **When the release changes a state every doc describes** — production now exists, a capability went live, a service moved — grep every doc for the phrases of the old state and fix them in one pass, not the one line a reviewer names. (`2026-10-24`, a monitoring product: eight review rounds each found another line still calling production unbuilt; the fifth round's fix was the first swept by phrase, and three later rounds still found more.)
- [ ] **When the product sells or promises anything, everything sold as live is built.** The paid-launch test passed on the exact commit (`go-live.md` § The paid-launch check). Each area this release makes live has its flag and claims updated.
- [ ] **Every backlog entry whose revisit trigger this release fires is acted on, or re-set with a new trigger and the reason** — never left firing. (`2026-10-24`, a monitoring product: an entry triggered by "the first deploy" fired at five promotions in a row; each release record said *smoke: not run*, and nothing was built.)
- [ ] **Proposed to the owner, never run unasked:** the `security-audit-static` and `performance-audit-static` skills on `<range>`, where `<range>` is `origin/<product>-prod..<cleared>`, the commit the review checkout holds, plus `changes` when the tree is dirty. The first release has no production branch yet, so its audits are the whole-repository pass. A whole-repository pass (no argument) is proposed only on the first release, after a large refactor, or when the owner asks. They are steered passes beside the independent review, never instead of it. Each writes its report under `reports/`, which is gitignored — a security report does not belong in the repository's history. What they found is fixed or in the backlog; a pass the owner declines is recorded as declined. A recommendation from either to run a writing mode of `document-app`, `derive-tests` or `ship-check` is declined (`SKILL.md § Static audits`).
- [ ] **The agent instructions reviewed** for this release — obsolete parts proposed to the owner for removal, parts that belong in the docs moved there with a pointer, this phase's lessons added — and the status in the plan current, with the few status lines the instructions carry updated with it (`agent-instructions`).
- [ ] **Read the collection's [release notes](https://github.com/phuryn/product-engineering/releases) since this product's last release**; for each changed rule the product's code touches, check the code or run the test the rule names; otherwise write *n/a — no changed rule touches this product*.
- [ ] **When the release adds or changes a model call — an embedded agent, its prompt or its model, or any single call the product makes to a model:** its live check (`npm run agents:live`, or the call's own) passed on the exact commit against real inputs and is recorded in the coverage map, with the call's time and tokens. It calls the real model and costs money, which is why it is here and not in the gate (`embedded-agents-messages-api`, `embedded-agents-agent-sdk`).
- [ ] **When the release touches a page carrying an analytics tag, or the tag:** the running-tag browser test (`product-analytics`) passed with the test project's id on the exact commit; otherwise *n/a — no tagged page or tag changed*.
- [ ] **`.env.example` and the variables doc list every variable the code reads**, and the deployment has values for them (`environments`, `references/variables.md`).
- [ ] **Every schema change is a migration file**; no applied migration edited; the dashboard untouched.
- [ ] **Production's migration ledger shows nothing pending** — or the pending rows are named by a dry run, which is the evidence here. Nothing is applied in § 1: the rows are applied by CLI after the go, as § 3's first step, and the ledger read again. **Every production command, the ledger read included, reaches production through its connection string only** (`--db-url` on the Supabase CLI); the CLI is never linked, because a linked command can follow the link rather than the ref you typed (`SKILL.md § Migrations`). The commands are in `supabase-production`; the window this opens is in `environments`.
- [ ] **Changed dashboard configuration has a current screenshot**, linked from the integrations doc. (A screenshot records the intended configuration, not the live value — `go-live.md § Rollback`.)
- [ ] **The done-whens this release closes, performed by a person**, on a real phone where it says phone, and listed.
- [ ] **A person explored changed journeys, screens and affected shared surfaces.** Include copy and third-party render changes. At go-live or after a broad UI change, expand the pass to every screen and lifecycle state, every theme, phone through the widest display anyone uses, and third-party surfaces. Within the chosen scope, check the applicable states, themes and widths, signed in as **each affected role from one organization** (in the individual shape, as its user) and signed out where applicable. At the full sweep, include all roles and the signed-out surface. For later releases with no screen or rendered surface change, write *n/a — no screen or rendered surface changed*. The capture spec is a checklist and can only see what it names. Keep its release set bounded, open every image it writes, and add discoveries to the spec before release. **A green capture run proves the captures completed, not that the screens look right.** Apply `ui-design` § Complete phase visual checks before its review series and owner preview and `test-harness` for capture maintenance.
- [ ] **The applicable `ui-design` checks are complete.** Apply its § Complete phase visual checks before its review series and owner preview. A rendered check covers ordinary screen changes. A new or materially changed journey, a kit change or the owner's request also requires the newcomer walkthrough, screenshot critique and scored audit. Fix the audit's P0 and P1 findings and record the scores where it runs. If no visual checks apply, say why.
- [ ] **What was left out is stated, not hidden.**

## 2. Go / no-go

The agent posts the checklist with its evidence and **one paragraph**: what ships, what changed in the database, what changed in dashboards, what to watch, and any rollback this release might need that has never been rehearsed (`go-live.md § Rollback`). Once the product has users, that paragraph also names the migrations window — anything that breaks between the migration and the build going live, and any one-time data effect (`environments`, the migrations window).

**Name every suite that did not run in the go message.** Give the reason, any owner decision and the trigger for its next run; counts alone are incomplete evidence. For example: "Unit and integration passed. `e2e` and `e2e:auth` did not run: browser launch blocked; rerun once browser access is restored." Such a gap remains open unless the owner explicitly accepts the narrower gate in the plan. (`2026-11-14`, an evals product: go messages named only passing counts while its gate omitted both browser suites.)

**Name every visible phase the owner has not tried in the go message.** Use the plan's phase preview status, so the owner can judge what remains unseen. A pending preview alone does not block coding; design direction, artboards, options, legal text and release go remain owner decisions. (`2026-11-16`, a live Q&A product: the owner was usually away and wanted phase previews after checks without blocking the next phase.)

The owner answers **go** or **no-go**, **in the chat**. **Silence is not go**, and a go given elsewhere — the owner's decisions page, a ticket — does not clear the agent harness's permission check for a production push; ask for it in the chat. (`2026-10-24`, a monitoring product: a go given on the owner's decisions page had to be typed again in the chat.)

## 3. Promote

`<cleared>` is the commit the last clean review round reviewed, never the branch tip, which may hold work committed while the round ran (`independent-review` § Keep the subject still). Run § 1's dry run and this apply from a clean checkout at `<cleared>` (`git switch --detach <cleared>`), so `db push` sees only its migrations.

**First, apply pending migrations after the go and read the ledger again.** If § 1's dry run named pending rows, apply `supabase-production` § Applying a migration with production as the named target. Load `PROD_DB_URL` from the production operator file into each command alone, and use the unlinked CLI. This is the first production write of the release.

Then promote:

```sh
git switch <product>-prod && git merge --ff-only <cleared> && git push --no-follow-tags origin <product>-prod
```

Or, when something is running from the working tree and must not see it change:

```sh
git merge-base --is-ancestor origin/<product>-prod <cleared> && git push --no-follow-tags origin <cleared>:<product>-prod && git branch -f <product>-prod <cleared>
```

- **`--ff-only` refuses a diverged branch — fix it, never force.**
- The production branch is the one connected to the host; on Netlify its build command is the plain build, set in the repository's build file (`netlify.md`).
- **Whether this push also applies migrations is a setting** (`SKILL.md § Migrations`): with the provider's git integration deploying on push, the build and the migration run start at once with nothing ordering them; without it, nothing reaches the database. Applying by CLI after the go and before the push (§ 3) makes the push find nothing pending in both cases. A migration that drops and recreates something the old code calls breaks that code between the apply and the build finishing — name that window in the go/no-go once the product has users.
- **A failed build never goes live** — Netlify keeps serving the previous deploy. That is why § 4 starts by proving which build is serving.

## 4. Verify

In this order. The principles are in `SKILL.md § Verify`; this is the procedure.

1. **The new build is the one serving.** Before anything else, read off the production response something this release both **adds** and **removes**, chosen from the diff, not from the landing page: Next names assets by content hash, so a page whose code the release did not touch serves identical bytes and can never show the change. Count occurrences with `grep -o … | wc -l`, never `grep -c` — it counts lines, and a production document is one line. An addition alone can be served by a cache holding two builds; a removal cannot. A release that changes no served byte is **unprobeable by content**: write that down rather than quoting a generic `200`, and read the framework's build id off the page instead (Next.js embeds one; it changes with every build, so the old id leaving is the removal). (`2026-09-19` and `2026-09-21`, a live Q&A product: a chunk-hash probe that could never move, then a removal probe that could never reach zero. `2026-10-24`, a monitoring product: a release no page showed was proved by Next's build id on `/`, replaced 64 seconds after the push.) **Behind a CDN, probe a path it never caches.**
2. **Code and schema agree.** The ledger check in § 1 was taken *before* the promotion, so it cannot prove the deployed code met the deployed schema. The proof is one read that reaches the database through an unguessable id that cannot exist: a public route answering **404** with the product's own not-found went to Postgres and back. Anything else has not proved it: record the probe as failed, with its status and the error code in its body, and find the cause before any production write. A change to the function or the route that follows goes through the normal path (a reviewed commit, a new migration, the owner's go), never as part of this check. What the common codes can and cannot mean: `supabase-production`, `gotchas.md`. Name that route in the coverage map, and check every entry point that reads through the same function. One request, no account, no write. (The product's own not-found is its own code and message in what the route returns, `PT404` on Supabase; check that the route passes them through — `supabase-production`, `gotchas.md`.)
3. **Every runtime the push does not build is current.** Keep a table in the architecture doc — each runtime, what it bundles from the shared code, how it is deployed, and how to read whether it is behind — and walk it after every push and every promotion (`SKILL.md § Verify`):
   - **A local scheduled job runs the released copy.** Where applicable, read the scheduler's configured command and verify that it points at the released copy for this promotion.
   - **Move the operator checkout to the release tip first** (`git fetch origin && git checkout --detach origin/<product>-prod`). A promotion does not move it and `git pull` does not move a detached one; the deploy and status commands refuse a tree that is not the tip or has local changes.
   - **Read each runtime's build identity** against the build this tree makes (a bundle hash, a release id the runtime reports). Where a runtime reports none, list the inputs of its bundle that changed since the commit it was last deployed from — a bundler's metafile against the diff. Write its output outside the checkout, or the tree has local changes and the deploy that follows refuses it. Compare repository paths: a bundler names its inputs relative to where it ran, and git relative to the repository root, so a raw comparison from a subfolder matches nothing and reads as current. When nothing matches at all, treat the runtime as behind. A dependency moves the bundle without changing a tracked input, so a changed lockfile counts as behind too. The check exits non-zero when behind, so its exit code is the evidence. For example, with esbuild (tried `2026-10-25` from the root and from a subfolder):

     ```sh
     out="$(mktemp -d)"    # outside the checkout, which the deploy needs clean
     npx esbuild <entry> --bundle --platform=node --metafile="$out/meta.json" --outfile="$out/bundle.js"
     node -e '
     const { execSync: x } = require("child_process"), p = require("path");
     const root = x("git rev-parse --show-toplevel").toString().trim();
     const rel = (f) => p.relative(root, p.resolve(f)).split(p.sep).join("/");
     const ins = new Set(Object.keys(require(process.argv[1]).inputs).map(rel));
     const lock = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/;
     const list = (c) => x(c).toString().split("\n").filter(Boolean);
     const changed = list("git diff --name-only " + process.argv[2] + "..HEAD").filter((f) => ins.has(f) || lock.test(f));
     const behind = list("git ls-files --full-name :/").some((f) => ins.has(f)) ? changed : ["no input matched a tracked file, so treat it as changed"];
     console.log(behind.length ? "BEHIND:\n" + behind.join("\n") : "current: nothing in the bundle changed");
     process.exitCode = behind.length ? 1 : 0;
     ' "$out/meta.json" <deployed-commit>
     ```

   - **Deploy the ones behind, a fleet one host at a time**, each read ready (current build, its health check, its peers) before the next, then read the identity again. A dry run is its own command, never a flag (`runbook.md § One list`).
   - **Record each of these deploys, with the commit it was built from**, in the environments doc's log: the next behind-check starts from that commit, and nothing else records what a runtime runs. (`2026-10-24`, a monitoring product: a handoff said development's probes ran the new check code, which was true, but no log line said so.)
4. **Hardening controls re-verified.** A deploy can change behaviour nothing in your diff touched, and the local gate has no edge. An unpinned adapter such as `@netlify/plugin-nextjs` is an untracked release input that rebuilds the edge chain; ask about versions before changing code when behaviour moves without a diff. An opt-in smoke command's exit code reaches no gate, so the release procedure must call it. **A transient control is worse than an absent one**, because the passing run is the one you quote. (`2026-09-17` and `2026-09-18`, identical edge configuration enforced, stopped enforcing, then enforced again.)
5. **Share cards**, when the release touched metadata: read `og:image` off the **raw** production response of every public page, never the DOM (`test-harness`, `references/vendor-surfaces.md`). **A vendor component rendered in the browser** (a pricing table, a sign-in card) still needs a real-browser render check on development before the push, recorded with its result. (`2026-10-24`, a monitoring product's pricing cards.) **Its data is readable** through the vendor's API: on Clerk, the `clerk-production` skill's instance-against-the-file test reads development's plans through `GET /v1/billing/plans` (read `2026-11-07`); read production with `npx clerk config pull --instance prod --keys billing` (that skill's § Billing, step 5), never with a production key in a test, and hold both against the launch list and the gated slugs. (`2026-11-07`, a live Q&A product: its adoption pass found a paid feature advertised on Free and production's gated features left unverified because the table needed a browser.)
6. **The smoke, last:** `npm run smoke -- <url>` — `/health` and the deployed edge limits. It runs last because it refuses your own address on the member surface for a minute (`netlify.md § Verifying it`).
7. **Update every published MCP package or listing after a tool-surface change.** This includes changes to a tool, a description, a schema or the server's instructions. Update each shipped surface from what production serves (`mcp-server`).

### Tag and record

- **Tag `<phase>-<date>` after the checks, never before.**
- **The coverage map** records the gate run, the review rounds and these checks: the smoke output, the code-and-schema probe with the route it used, the status it returned and the error code in its body, each runtime read current or deployed, and the share cards read from the raw response (`test-harness`, `references/coverage-map.md`).
- **The plan** gets the new status — the one place status is written. The previous release's narrative moves out of it into the release history, and finished stage briefs move into the history too (`agent-instructions` says why the status must not grow).
- **The environments doc's log** records only the environment events the release caused — a migration applied to production, a rotation, each runtime deployed outside the push with the commit it was built from — never the release itself.

### The release history

One section per release, newest first, headed `## Release <tag>` so other documents can link to it:

- **Shipped** — what users received, in a sentence or two.
- **Database** — migrations applied to production (by CLI, with the target), and any window where the deployed code met the new schema.
- **Rounds and gates** — what the independent review and the gate found, what was fixed, and what was accepted, with its backlog entry.
- **Rules it taught** — each one already moved into the agent instructions or the docs; name it here with a pointer rather than restating it.
- **Evidence** — the coverage-map section that records the runs.

**A receipt, not a summary:** dated, with refs, and never rewritten afterwards. A correction goes in as a dated correction beside the sentence it corrects. The history exists so that a session that needs the story goes looking for it, and a session that does not never pays for it.
