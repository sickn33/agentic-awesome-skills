---
name: frontend-lighthouse
description: "Add a portable Lighthouse CI gate for production frontend builds with Core Web Vitals budgets, category floors, median runs, and CI artifacts."
category: frontend
risk: safe
source: community
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: "2026-06-29"
author: stareezy-1
tags: [frontend, lighthouse, performance, core-web-vitals, ci]
tools: [lighthouse, node, github-actions]
license: "MIT"
license_source: "https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE"
---

# Frontend Lighthouse (portable performance gate)

> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes a **CI performance gate** — a Lighthouse CI config plus a workflow — not a
> component library or a visual style. It pairs with the **frontend-seo** and
> **frontend-architecture** skills: SEO writes the metadata, Lighthouse supplies a reproducible lab performance signal.

The goal: every pull request is **blocked unless the production build meets explicit Core Web
Vitals budgets and category score floors**. Budgets live in **one** `lighthouserc.cjs`, runs are
**median-of-N** to reduce noise, and the same config runs locally and in CI.

## When to Use This Skill

- Use when adding a Lighthouse CI performance gate to a web app.
- Use when setting Core Web Vitals budgets for LCP, CLS, and TBT as the lab proxy for INP.
- Use when configuring category score floors for performance, SEO, accessibility, and best practices.
- Use when debugging flaky Lighthouse runs or making reports visible as CI artifacts.

---

Lighthouse category scores and navigation lab metrics are not field Core Web Vitals certification or complete accessibility/SEO verification. Configure the job as a required check in branch protection for actual blocking; a workflow alone does not enforce that. Required checks with path filters can remain pending, so align trigger policy with repository rules. Build/audit code from PRs only with read-only credentials, bounded runtime and no production secrets; reports may contain page content/URLs.

## 0. The five core ideas

1. **One config, one source of truth.** All budgets and assertions live in a single `lighthouserc.cjs`. Named constants for each budget — no magic numbers buried in assertion objects.
2. **Gate the production build, never dev.** Lighthouse runs against `build` + `start` (the real, optimized output). Dev-server numbers are meaningless for a budget.
3. **Multiple runs reduce noise.** Run 3+ times and assert on the median run, to reduce per-run jitter; repeated runs do not eliminate CI noise.
4. **Separate lab budgets from field thresholds.** Use LCP/CLS lab budgets plus a chosen TBT budget; field INP ≤200 ms needs separate representative field monitoring. Lab category scores do not certify field CWV.
5. **Blocking in CI, visible as artifacts.** A GitHub Action runs the gate on every PR touching the app and uploads the HTML/JSON reports so failures are debuggable.

---

## 1. Files this skill adds

```
repository/
├── .github/workflows/lighthouse.yml  ← workflow must be at repository root
└── apps/web/                        ← or your app root
    ├── lighthouserc.cjs              ← budgets, assertions and collect settings
    └── package.json                 ← "lhci": "lhci autorun --config=./lighthouserc.cjs"
```

Plus a dev dependency: `@lhci/cli`.

```bash
pnpm add -D @lhci/cli        # or npm i -D / yarn add -D
```

---

## 2. The config (`lighthouserc.cjs`)

`.cjs` (CommonJS) so it loads without ESM/TS transpilation. Every budget is a **named constant**
with a comment explaining the threshold — never a bare number inside an assertion.

```js
/**
 * Lighthouse CI configuration — Core Web Vitals budgets for the marketing surface.
 *
 * Enforces Google's mobile "good" CWV thresholds:
 *   - Largest Contentful Paint (LCP) ≤ 2500 ms
 *   - Cumulative Layout Shift (CLS)  ≤ 0.1
 *   - Interaction to Next Paint (INP) ≤ 200 ms
 *
 * INP is a *field* metric with no direct lab audit, so in the lab we gate on
 * Total Blocking Time (TBT) with a separately selected budget. There is no
 * experimental INP audit assumed here; measure INP with field instrumentation.
 *
 * Collection runs against the *production* server (build + start) on Lighthouse's
 * default mobile (Moto G4 / slow 4G) emulation.
 */

/** The fixed port the production server is started on for the audit. */
const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

/** Pages whose budgets are enforced in CI. */
const MARKETING_URLS = [`${BASE_URL}/`];

/**
 * Core Web Vitals budgets on mobile — Google's "good" thresholds.
 * These are the values that earn the best Lighthouse scores.
 */
const LCP_BUDGET_MS = 2500; // good
const TBT_BUDGET_MS = 200; // Chosen lab budget; not an INP measurement
const CLS_BUDGET = 0.1; // good

module.exports = {
  ci: {
    collect: {
      // Build is run separately in CI; here we only serve the production output.
      startServerCommand: `pnpm start --port ${PORT}`,
      startServerReadyPattern: "Ready in", // framework's "server ready" log line
      startServerReadyTimeout: 120000,
      url: MARKETING_URLS,
      // Median of multiple runs keeps the gate stable against per-run jitter.
      numberOfRuns: 3,
      settings: {
        // Default mobile emulation; opt into desktop via env for a second run.
        preset:
          process.env.LHCI_FORM_FACTOR === "desktop" ? "desktop" : undefined,
        // Only gate the categories we care about; skip PWA category noise.
        onlyCategories: [
          "performance",
          "seo",
          "accessibility",
          "best-practices",
        ],
      },
    },
    assert: {
      // Per-audit median aggregation is configured on each assertion.
      // Set aggregationMethod per assertion below.
      assertions: {
        // --- Core Web Vitals budgets (the contract) ---------------------
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: LCP_BUDGET_MS, aggregationMethod: "median" },
        ],
        "cumulative-layout-shift": ["error", { maxNumericValue: CLS_BUDGET, aggregationMethod: "median" }],
        "total-blocking-time": ["error", { maxNumericValue: TBT_BUDGET_MS, aggregationMethod: "median" }],
        // --- Category floors (target top Lighthouse scores) -------------
        "categories:performance": ["error", { minScore: 0.9, aggregationMethod: "median" }],
        "categories:seo": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:accessibility": ["error", { minScore: 0.95, aggregationMethod: "median" }],
        "categories:best-practices": ["error", { minScore: 0.9, aggregationMethod: "median" }],
      },
    },
    upload: {
      // Keep reports in the CI run's filesystem; no external LHCI server.
      target: "filesystem",
      outputDir: "./.lighthouseci",
    },
  },
};
```

**Hard rules:**

- Every budget is a named constant with a unit in its name (`LCP_BUDGET_MS`) and a comment.
- `aggregationMethod: "median"` is non-negotiable — single-run gates flake constantly.
- `numberOfRuns` ≥ 3 (odd numbers give a clean median).
- TBT is a lab diagnostic correlated with responsiveness, not an INP threshold guarantee. Do not configure a nonexistent INP audit; measure field INP separately.
- Keep `onlyCategories` to exactly what you gate — fewer audits, faster, less noise.

---

## 3. Choosing budget severity and thresholds

| Audit / category            | Severity | Threshold | Why                                                   |
| --------------------------- | -------- | --------- | ----------------------------------------------------- |
| `largest-contentful-paint`  | `error`  | ≤ 2500 ms | Google "good" LCP                                     |
| `cumulative-layout-shift`   | `error`  | ≤ 0.1     | Google "good" CLS                                     |
| `total-blocking-time`       | `error`  | ≤ 200 ms  | INP lab proxy                                         |
| Field INP | separate monitoring | ≤ 200 ms | Not supplied by default Lighthouse navigation audit |
| `categories:performance`    | `error`  | ≥ 0.9     | top (green) band                                      |
| `categories:seo`            | `error`  | ≥ 0.95    | SEO is cheap to keep perfect                          |
| `categories:accessibility`  | `error`  | ≥ 0.95    | a11y regressions must block                           |
| `categories:best-practices` | `error`  | ≥ 0.9     | green band                                            |

Use `error` for contracts that must hold and `warn` for audits that are environment-dependent or
aspirational. **Start strict and only loosen with a recorded reason** — a budget you keep raising
to make CI pass is a budget that no longer protects anything.

---

## 4. The npm script

```jsonc
// package.json
{
  "scripts": {
    "lhci": "lhci autorun --config=./lighthouserc.cjs"
  }
}
```

`lhci autorun` runs `collect` → `assert` → `upload` in sequence. Run it locally before pushing to
reproduce exactly what CI does:

```bash
pnpm build && pnpm lhci
# desktop form factor:
LHCI_FORM_FACTOR=desktop pnpm build && LHCI_FORM_FACTOR=desktop pnpm lhci
```

---

## 5. The GitHub Actions workflow

Runs on PRs that touch the app or the workflow itself. Builds the production output, runs the
gate, and **always** uploads the reports (even on failure) so a red check is debuggable.

```yaml
name: Lighthouse CWV

on:
  pull_request:
    branches: [main]
    paths:
      - "apps/web/**"
      - ".github/workflows/lighthouse.yml"
      - "package.json"
      - "pnpm-lock.yaml"
      - "pnpm-workspace.yaml"

permissions:
  contents: read

jobs:
  lighthouse:
    name: Lighthouse CWV (marketing pages)
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: apps/web
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4 # version comes from root package.json packageManager

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        working-directory: .
        run: pnpm install --frozen-lockfile

      - name: Build web app
        run: pnpm build

      # build + start the production server, run Lighthouse on mobile emulation,
      # fail the job if any budget in lighthouserc.cjs is exceeded.
      - name: Run Lighthouse CI
        run: pnpm lhci

      - name: Upload Lighthouse reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-reports
          path: apps/web/.lighthouseci
          if-no-files-found: ignore
```

**Hard rules:**

- Trigger on the app path **and** the workflow file so config changes are self-testing.
- `if: always()` on the upload step — you need the report most when the gate fails.
- Gate on the **production** build (`pnpm build` then the `start` server in `collect`).
- Match the CI Node/pnpm versions to the repo's pinned versions to avoid lockfile drift.

---

## 6. Framework adapters

The config is framework-neutral except `startServerCommand` and `startServerReadyPattern`.

| Framework     | `startServerCommand`                                              | `startServerReadyPattern`                   |
| ------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| **Next.js**   | `pnpm start --port 3100` (after `next build`)                     | `"Ready in"`                                |
| **Remix**     | `pnpm start` (serve the built app)                                | server's listening log line                 |
| **Astro**     | `node ./dist/server/entry.mjs` (SSR) or `npx serve dist` (static) | the adapter's ready line / serve's URL line |
| **SvelteKit** | `node build` (node adapter)                                       | `"Listening on"`                            |
| **Vite SPA**  | `npx vite preview --port 3100`                                    | `"Local:"`                                  |

For purely static output you can skip the server and point `collect.staticDistDir` at the build
folder instead of `startServerCommand` — Lighthouse serves it internally.

---

## 7. Debugging failing or flaky runs

- **Flaky LCP/TBT** → raise `numberOfRuns` (5), confirm `median`, and make sure nothing else is competing for CPU on the runner.
- **Unknown audit errors** → remove unsupported audit assertions after checking the pinned Lighthouse audit list; warn does not make a missing audit valid.
- **"server not ready" timeout** → fix `startServerReadyPattern` to match the framework's actual ready log, and raise `startServerReadyTimeout`.
- **Real regressions** → open the uploaded report artifact, read the failed audit's "Opportunities"/"Diagnostics", fix the cause (oversized image, render-blocking JS, layout shift from unsized media) — don't just bump the budget.
- **Desktop vs mobile divergence** → run both form factors; mobile is the stricter gate and should be the default.

---

## 8. Conventions checklist (enforce in review)

- [ ] All budgets are named constants with units and comments — no magic numbers in assertions.
- [ ] Gate runs against the **production** build, never the dev server.
- [ ] `aggregationMethod: "median"` with `numberOfRuns` ≥ 3.
- [ ] Lab budgets explicitly named (LCP ≤2500, chosen TBT ≤200, CLS ≤0.1), with separate field CWV monitoring.
- [ ] TBT is a separately named lab budget; field INP is measured separately.
- [ ] Category floors set as `error` (perf ≥ 0.9, SEO/a11y ≥ 0.95, best-practices ≥ 0.9).
- [ ] `onlyCategories` lists exactly the gated categories.
- [ ] CI triggers on the app path **and** the workflow file; reports upload with `if: always()`.
- [ ] Local `pnpm lhci` reproduces the CI run.
- [ ] Budgets are tightened over time, loosened only with a recorded reason.

---

## 9. How to apply this skill

**Adding the gate to a project:** install `@lhci/cli`, drop in `lighthouserc.cjs` with your URLs
and `startServerCommand`, add the `lhci` script, and add the workflow. Run `pnpm build && pnpm lhci`
locally to confirm it passes before opening a PR.

**Adding a page to the gate:** append its URL to `MARKETING_URLS` (or a second URL array). Each URL
is audited independently against the same budgets.

**Tuning budgets:** change the named constant, not the assertion. Record why in the comment. Prefer
fixing the regression over raising the budget.

**Reviewing performance:** run the checklist in §8. The highest-value catches are a gate that runs
against the dev server (meaningless numbers) and single-run assertions (chronic flakiness).

---

## Publishing / installing this skill

This skill follows the Anthropic `SKILL.md` format and is portable across agents.

1. Keep it under `skills/frontend-lighthouse/SKILL.md` in a public GitHub repo.
2. Keep the frontmatter `name` and high-signal `description` — discovery indexes match against it.
3. Install with: `npx skills add <org>/<repo> --skill "frontend-lighthouse"`.
4. Non-`SKILL.md` agents can be pointed here from `AGENTS.md` / `CLAUDE.md`; Kiro can mirror it as a steering file.

## Limitations

- Lighthouse CI is a lab signal and does not replace field monitoring from real-user metrics.
- Budgets must be tuned to the actual app route, hosting platform, and device/network assumptions.
- A passing Lighthouse gate does not prove business-critical flows, visual correctness, or backend availability.
