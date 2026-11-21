# Data, backups, incidents and the log

What the product holds, how long it keeps it, how it would get it back, and what to do when something breaks or leaks. Each section is a heading in the product's environments doc, filled in as the product gains the thing it describes — and saying plainly what it lacks until then.

## Data that expires

- **State the retention the product promises**, where it is recorded on the row, and whether a job enforces it.
- **Until the job exists, no screen and no legal page may promise automatic deletion.** The gap goes in the backlog.
- **Say what deleting a workspace cascades to, and prove the cascade in an integration fixture.**

## What we hold about people

- **Hold the minimum**: the identity provider's ids for members; for the anonymous public, a token hash and whatever display fields the product adds.
- **No stored emails, IP addresses, profile copies, or message bodies in logs.** A leaked database should hold ids and hashes, not identities; logs hold ids, never bodies (`saas-authorization`, the threat model).
- **List every table that holds something a person wrote**, because the privacy page has to name each one and the erasure path has to reach it.
- **The identity provider's deletion webhooks** (Clerk's `user.deleted` and `organization.deleted`) arrive with the PII capability, before the first paying customer or the first deletion request; until then, say in the doc that they are absent, and keep their secret empty with no webhook route.

## Backups and restore

- **Decided from a stated recovery point**: how much data the product can afford to lose, said first. Read the provider's actual posture (on Supabase, `supabase backups list`, `supabase-production`) rather than assuming it.
- **A restore drill into an isolated project**, with its date and result recorded.
- **Until a drill has run, write *not verified*** rather than repeating the provider's schedule as if it were evidence.
- **A database backup is not the system.** Keep a table of what no database backup holds, where each lives, and how it comes back:
  - each box's state and environment files, certificates and SSH host keys;
  - Worker secrets and the host's secret variables, which are write-only, so they come back only from the operator's files;
  - the operator's files themselves, and the keys that cannot be replaced without breaking stored data (`variables.md § The kinds of variable`);
  - the identity provider's users, organizations and settings, which your database holds only by id;
  - DNS records and dashboard-only settings, which have no export.

  Anything whose only copy is one machine or one dashboard is a risk to rank, with its backlog row. (`2026-10-24`, a monitoring product's infrastructure pass found operator files, plain-text keys and DNS that existed nowhere but their one holder.)
- **Once the product runs more than its host builds, keep a runbook for rebuilding from nothing** (`rebuild-from-nothing.md`).

## Incident basics

**Where it hurts first:**

- **`/health`** reports configuration and database status, and is what the uptime monitor probes; a public status page, where the owner chose one, is linked from the footer (`release-gate`, `references/go-live.md`). **Every other runtime needs its own outside check**, because the app's `/health` says nothing about a Worker or a box, and a dead-man switch runs outside the system it watches. (`2026-10-24`, a monitoring product's top-ranked risk: nothing outside watched production, and its watchdog read only its own probes.)
- **Read database logs and advisors in the provider's dashboard.** A separate development project may use a read-only MCP connection for these diagnostics. For production or its development branch, use the dashboard (`supabase-production` § The choices).
- **Error tracking** (Sentry, for example) is absent until it is wired; say so rather than implying it.
- **A symptom table**, once there is more than one runtime: symptom · first look (a command or a console, read-only) · usual causes, one row per thing a person would notice. Write it while the causes are fresh, not during the incident.

**Panic buttons available today** — list them in the doc as the code gains them. Typical ones:

- freezing or closing the primary resource;
- rotating the database secret key or the identity provider's secret key in the provider;
- rotating the anonymous cookie secret — every visitor becomes a new visitor; their old rows are orphaned, not lost;
- stopping one worker or Worker, when the others can take its load;
- tightening the edge limits, which is a deploy (`release-gate`, `references/netlify.md`).

## A leaked key

**The rotation order, done at once:** the new value into every holder in the variables doc's copies table, operator files included, each holder deployed, checked, then the old value revoked, and a row in the log (`variables.md § Rotating`). **If the key is being used against you, revoke first** and accept that every holder fails until it has the new one.

- **A secret that ever sat in a public variable during a build or a dev server was served**: treat it as leaked (`variables.md`).
- **A build-time value needs a rebuild** to change anything (`release-gate`, rollback).
- **A deploy from an operator file that still holds the old value puts it back**: that file changes first.

## The log

The last section of the environments doc: **one row per environment event** — a migration applied to production, a rotation, a deploy of a runtime the push does not redeploy (with the commit it was built from, the only later record of what that runtime runs), an incident — with dates, refs, counts and the command that produced them. **A receipt, not a summary.**

| Date | What |
|---|---|

A release itself is not an environment event: it is recorded in the product's plan, and in the release history at the next release (`release-gate`). Only the environment events a release *caused* — a migration applied to production, a rotation, a runtime deployed by hand — get a row here.
