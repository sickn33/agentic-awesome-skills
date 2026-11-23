---
name: "proof-kb"
description: "Maintain a source-linked knowledge base of first-hand SEO evidence and update pages that depend on superseded facts."
category: "marketing"
risk: "safe"
source: "https://github.com/Illyism/seo-skills"
source_repo: "Illyism/seo-skills"
source_type: "community"
license: "MIT"
license_source: "https://github.com/Illyism/seo-skills/blob/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/README.md#license"
author: "Ilias Ism"
upstream_commit: "a158c36a1c2c84a44ee7a1ae69c009caf73e1a35"
date_added: "2026-11-21"
---

# First-hand proof knowledge base (`seo/kb/`)

FAQ schema, fresh `updatedAt` dates, author bios, and word counts no longer separate ranking pages from AI-generated commodity posts, because every competitor copies them in seconds. A proof-backed draft can help readers verify claims in two ways:

1. **Open with a concrete first-hand receipt in the first 2 sentences** (an exact test count, latency delta, dollar figure, or production dataset).
2. **Stack at least 4 of the 5 proof categories** below across the body.

Store every verifiable fact once in `seo/kb/` and wire those atomic proof files into money pages, comparisons, and blog posts. Agents writing from one fact store stop inventing specs and quoting stale prices.

## When to Use

Use when initializing a first-hand evidence library, grounding a draft in verified benchmarks or routing revised metrics across existing pages. Examples use illustrative names and figures. Verify each claim against the project sources.

## Workflow routing decision tree

Walk this tree on every invocation:

```
Does `seo/kb/brand-ssot.md` exist?
├── No -> Workflow 1: `init`, then continue down this tree
└── Yes
    ├── Did the user just ship a benchmark, customer win, pricing change, or release?
    │   └── Yes -> Workflow 4: `route-fact`
    ├── Does the user want a site-wide proof gap audit?
    │   └── Yes -> Workflow 2: `interview` across the top 5 money/blog pages in `seo/kb/pages-index.md`
    └── Is the user drafting or upgrading a specific page?
        ├── Fewer than 4 proof categories in `seo/kb/proof/` match this page's topic?
        │   └── Yes -> Workflow 2: `interview`, then Workflow 3
        └── 4 or more -> Workflow 3: `draft` / `upgrade`
```

## The 5 categories of first-hand proof

Every commercial guide, comparison page, or benchmark post ships with at least **4 of these 5 categories**. One claim type repeated five times still reads as thin marketing copy to buyers and retrieval models.

| Category | Location | Illustrative example |
| --- | --- | --- |
| **1. Benchmarks and controlled tests** | `seo/kb/proof/benchmarks/` | Tested 14 Postgres connection poolers at 10,000 concurrent connections on an `m7g.xlarge`; PgBouncer held p99 at `4.2ms` vs `19.8ms` unpooled. |
| **2. Customer outcomes and migrations** | `seo/kb/proof/customers/` | `invoicekit.io` moved 42,000 recurring billing webhooks from AWS Lambda to `deployfast.dev` workers and cut monthly compute from `$1,840` to `$290`. |
| **3. Real screenshots and short videos** | `public/blog/<slug>/` + proof ID | Real Playwright capture of the terminal trace or a 9-second `<video>` loop of the live dashboard. Never an AI-generated app interface. |
| **4. Proprietary aggregate numbers** | `seo/kb/proof/numbers/` | Across 1.4 million production deploys on `deployfast.dev` in Q3 2026, 78% of failed builds came from unlocked Node.js minor versions. |
| **5. Practitioner failure and edge-case notes** | `seo/kb/proof/workflows/` | Setting `max_client_conn` above `8000` without raising `ulimit -n` drops sockets silently under burst load. |

## Workflow 1: `init` (scaffold `seo/kb/`)

Read `package.json`, pricing config, database schemas, and the existing `/pricing`, `/about`, and `/blog` sources, plus every raw proof source in the repo: benchmark results (`bench/`, `benchmarks/`), analytics or warehouse exports and case-study data (`data/`), and incident postmortems (`docs/runbooks/`, `postmortems/`). Then create these four files. Each proof file names its raw source in a `source:` frontmatter field, so a reviewer can check the number in 1 click.

### 1. `seo/kb/brand-ssot.md` (single source of truth)

Exact product mechanics, pricing tiers, supported stack, and what the product does NOT do. Write only facts you found in the codebase or that the user confirmed; mark anything else `[UNVERIFIED]`.

```markdown
# Brand SSOT: QueryBench (querybench.dev)
Last verified: 2026-11-12

## Product mechanics
- Runs Postgres and MySQL query regression benchmarks on every GitHub pull request.
- Spins up an ephemeral copy-on-write database branch in `1.8s` using ZFS snapshots.
- Parses `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` and fails the CI check if p95 execution time regresses by `> 15%` or buffer reads rise by `> 20%`.

## Pricing tiers
- Free: `$0/month` for 3 repositories and 100 PR benchmark runs/month.
- Pro: `$49/month` flat for unlimited repositories, 2,500 PR runs/month, 90-day flamegraph retention.
- Team: `$199/month` flat (no per-seat pricing) with SOC 2 reports, Slack alerts, and custom ZFS runners.

## Boundaries (what we do NOT do)
- No Oracle or Microsoft SQL Server (Postgres 14-17 and MySQL 8.0+ only).
- No persistent daemon inside production RDS instances.
```

### 2. `seo/kb/proof/{benchmarks,customers,numbers,workflows}/<id>.md`

One file per verifiable fact or test. One file per fact lets several pages cite the same number and lets `route-fact` update every dependent page in one pass when the test is re-run.

```markdown
---
id: bench-zfs-branch-spinup-2026
category: benchmarks
date: 2026-11-04
topics: [postgres-branching, ci-database-testing, explain-analyze]
verified: true
source: bench/results/zfs-branch-spinup-2026-11.json
---

# 50GB Postgres branch spin-up: ZFS copy-on-write vs pg_dump restore

## Methodology
- Dataset: `50.4 GB` production-shaped Postgres 16 database (`180M` rows, 42 tables).
- Hardware: AWS `i4i.xlarge` (`4 vCPU`, `32 GB RAM`, NVMe), 50 consecutive cold runs.

## Raw numbers
| Method | Median | p99 | Disk per branch |
| --- | --- | --- | --- |
| `pg_dump` + `pg_restore -j 4` | `14m 22s` | `18m 05s` | `50.4 GB` |
| EBS snapshot clone | `48.6s` | `74.1s` | `50.4 GB` (provisioned) |
| QueryBench ZFS clone | `1.8s` | `2.4s` | `12 MB` delta on creation |

## Failure note
Pin ZFS ARC to at least `50%` of RAM (`zfs_arc_max`). Inside Docker with tight cgroup memory limits, the first sequential scan benchmark runs `3.2x` slower.

## Reusable snippet
In our 50-run benchmark on a `50.4 GB` Postgres 16 dataset (`180M` rows on `i4i.xlarge`), `pg_restore -j 4` took a median of `14m 22s` per PR environment, while a ZFS copy-on-write clone booted in `1.8s` (`2.4s` p99) using `12 MB` of disk.
```

### 3. `seo/kb/competitors/claims-to-beat.md`

The exact numbers ranking competitors cite, each paired with the larger test that beats it. This turns a SERP review into an engineering task list. No SERP or Ahrefs access in this session: fill the "Our stronger test" column from `seo/kb/proof/`, write `[NEEDS SERP]` in the competitor columns, and leave the file in place for the next run (verify these against dated SERP evidence later). Why: an invented competitor claim is a fabricated statistic about someone else.

```markdown
# Competitor claims to beat

| Keyword | Competitor URL | Their claim | Our stronger test | Status |
| --- | --- | --- | --- | --- |
| `postgres ci testing` | `competitor-a.com/blog/ci-db` | 3 Docker setups on a `100 MB` toy DB | 50 runs on a `50.4 GB` DB comparing `pg_restore`, EBS, ZFS (`bench-zfs-branch-spinup-2026`) | Shipped |
| `explain analyze tool` | `competitor-b.io/guides/explain` | 2 static `Seq Scan` examples | 10 real production regressions with before/after index buffer counts | Open |
```

### 4. `seo/kb/pages-index.md`

Every commercial page and post mapped to its keyword and proof IDs. `route-fact` reads this file to find which pages a new fact touches.

```markdown
# Proof-to-page index

| File path | URL | Primary keyword | Proof IDs | Categories |
| --- | --- | --- | --- | --- |
| `content/blog/postgres-ci-testing.mdx` | `/blog/postgres-ci-testing` | `postgres ci testing` | `bench-zfs-branch-spinup-2026`, `cust-invoicekit-ci-cut`, `num-q3-regression-causes`, `wf-zfs-arc-limit` | 4/5 |
| `app/pricing/page.tsx` | `/pricing` | `querybench pricing` | `brand-ssot`, `cust-invoicekit-ci-cut` | 2/5 |
```

## Workflow 2: `interview` (fill proof gaps, never invent)

Never invent benchmarks, customer quotes, latency numbers, or incidents. One fabricated "we tested 50 tools" claim that a reader disproves costs the whole domain its trust, and fake customer outcomes create legal exposure.

Run this when a page has fewer than 4 proof categories or leans on generic claims (`"many teams struggle with slow CI"`).

### Step 1: Extract from authorized sources

Use locally available notes or transcripts first. Store only verified excerpts or approved aggregates. Obtain permission before sending recordings, customer information or internal metrics to a service, and confirm publication rights before putting them in public content.

### Step 2: Ask 3-5 bounded founder questions

If recordings are missing or leave gaps, ask exactly 3 to 5 questions that each produce one number or one edge case:

```markdown
To make `/blog/postgres-ci-testing` rank and get cited without inventing data, I need 3 facts:
1. **Metric:** What is the real median boot time and database size for your CI branches today?
2. **Customer win:** One customer (or an anonymized profile like "a 12-person Series A fintech") and their exact before/after metric.
3. **Failure note:** One non-obvious config mistake that broke when you ran this in production.
```

Save answers as atomic files and update `seo/kb/pages-index.md` before writing prose.

If the user cannot answer now, write the questions to `seo/kb/open-questions.md` and put `[NEEDS PROOF: <question>]` markers in the draft where each fact belongs. A visible gap gets filled; an invented number ships.

## Workflow 3: `draft` / `upgrade` (Consensus + Proof Card architecture)

Build every `<h2>` section from two layers:

1. **`[CONSENSUS]`:** the definitions, syntax, and subtopics that 4 or more of the top 5 ranking pages cover. Cover them in as few words as possible, because missing them signals an incomplete page while repeating them adds nothing.
2. **`[PROOF]`:** one or more atomic files from `seo/kb/proof/` (plus a real screenshot or deterministic chart) that no competitor has.

### Outline blueprint (write before prose)

Save it to `seo/kb/outlines/<slug>.md`. The `[CONSENSUS]` and `[PROOF]` tags live in the outline only; the published page carries the prose and numbers, never the tags. Without SERP access, tag consensus lines `[CONSENSUS] [NEEDS SERP]` so the next run checks them against the real top 5.

```markdown
## H2: How ephemeral database branching works in CI
- [CONSENSUS]: copy-on-write blocks vs full file copies; the 6-line GitHub Actions YAML.
- [PROOF -> `bench-zfs-branch-spinup-2026`]: 50.4 GB / 180M-row table (`1.8s` ZFS vs `14m 22s` `pg_restore`).
- [PROOF -> `wf-zfs-arc-limit`]: the `zfs_arc_max` cgroup memory trap and the fix.
```

### Execution rules

1. **Write the introduction last.** Draft every body section first, then open with the single sharpest `[PROOF]` receipt in the first 2 sentences. You only know your strongest number after assembling the body, and readers and retrieval systems judge authority in the first 40 words.
   - *Bad:* `"In modern software development, testing database migrations in CI has become increasingly important for engineering teams."`
   - *Good:* `"Restoring a 50.4 GB Postgres dump in GitHub Actions takes a median of 14 minutes and 22 seconds. A ZFS copy-on-write branch boots the same 180-million-row dataset in 1.8 seconds. Below: the benchmark across 50 cold runs, the Docker memory trap that slows scans by 3.2x, and how to wire sub-2-second branching into your PR pipeline."`
2. **Count proof categories.** If the finished draft has fewer than 4 of 5, go back to Workflow 2. Do not ship at 3.
3. **Register the page.** Add or update its row in `seo/kb/pages-index.md` so future facts route to it.

## Workflow 4: `route-fact` (multi-page propagation)

When a new benchmark, case study, price, or release lands, push it to every page that depends on it in one change:

1. **Write the source file:** `seo/kb/proof/<category>/<new-id>.md`, or edit `seo/kb/brand-ssot.md` for pricing and feature changes. A re-run of an existing test gets a new dated ID (`bench-zfs-branch-spinup-2026-12`) with `supersedes: <old-id>` in its frontmatter; add `superseded_by: <new-id>` to the old file and keep it. Why: the old number stays citable as history ("down from 1.8s in November") and the diff shows exactly which test moved. If a release caused the change, update the mechanism line in `brand-ssot.md` too.
2. **Find dependents:** read `seo/kb/pages-index.md`, then grep the repo for the topic tags, the superseded proof ID, and the old number itself (pages added outside the index still quote it):

   ```bash
   grep -rnF --exclude-dir={node_modules,.next,.git,dist,build} -e '1.8s' -e '1.8 s' -e 'bench-zfs-branch-spinup-2026' .
   ```

   Use `-F` and exclude build output. Why: an unescaped `1.8s` regex also matches `1x8s`, and `node_modules` plus `.next` bury the real hits under dozens of false ones. Open every hit and confirm it is the same metric on the same workload. The same number can measure something else (a page's `1.8s` LCP is not a `1.8s` branch spin-up): skip it and note it in that page's `pages-index.md` row so the next run skips it too. Raw result files under `bench/` stay untouched.
3. **Edit every match in place:**
   - Replace the stale number or generic paragraph with a snippet backed by `<new-id>`, rewritten for that page's context.
   - Never paste the same sentence into more than one URL; identical boilerplate across pages reads as templated.
   - Bump `updatedAt` / `lastModified` only on pages where a fact changed.
4. **Update `seo/kb/pages-index.md`** with `<new-id>` against every touched file, and swap the old ID in `seo/kb/outlines/` and `seo/kb/competitors/claims-to-beat.md`.

### Example summary

```
NEW PROOF: seo/kb/proof/customers/cust-invoicekit-ci-cut.md
Matched 3 pages:
├── content/blog/postgres-ci-testing.mdx (42,000-webhook migration outcome under H2 #3)
├── app/vs/branchbase/page.tsx (compute spend row: $1,840 -> $290/mo)
└── app/pricing/page.tsx (ROI callout above the Pro tier card)
```

## Verification checklist

- [ ] `seo/kb/brand-ssot.md` and `seo/kb/pages-index.md` exist and reflect this run's edits.
- [ ] Every number or customer outcome on touched pages traces to `seo/kb/proof/` or `seo/kb/brand-ssot.md`, or carries a `[NEEDS PROOF]` marker listed in `seo/kb/open-questions.md`.
- [ ] Touched articles open with a first-hand receipt in the first 2 sentences.
- [ ] Touched long-form pages stack 4 or more proof categories.
- [ ] Zero fabricated statistics in created or edited files.

## Limitations

The proof count is an editorial heuristic. Citation or ranking changes cannot establish that the page edits caused the change. Keep private sources outside public repos and leave unsupported claims as review markers in drafts.

Adapted from [Ilias Ism’s upstream skill](https://github.com/Illyism/seo-skills/tree/a158c36a1c2c84a44ee7a1ae69c009caf73e1a35/seo/proof-kb).
