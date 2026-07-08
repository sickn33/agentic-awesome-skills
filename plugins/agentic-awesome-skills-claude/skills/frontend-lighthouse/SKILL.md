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
> **frontend-architecture** skills: SEO writes the metadata, Lighthouse proves it ships fast.

The goal: every pull request is **blocked unless the production build meets explicit Core Web
Vitals budgets and category score floors**. Budgets live in **one** `lighthouserc.cjs`, runs are
**median-of-N** so the gate doesn't flake, and the same config runs locally and in CI.

## When to Use This Skill

- Use when adding a Lighthouse CI performance gate to a web app.
- Use when setting Core Web Vitals budgets for LCP, CLS, and TBT as the lab proxy for INP.
- Use when configuring category score floors for performance, SEO, accessibility, and best practices.
- Use when debugging flaky Lighthouse runs or making reports visible as CI artifacts.

---

## 0. The five core ideas

1. **One config, one source of truth.** All budgets and assertions live in a single `lighthouserc.cjs`. Named constants for each budget — no magic numbers buried in assertion objects.
2. **Gate the production build, never dev.** Lighthouse runs against `build` + `start` (the real, optimized output). Dev-server numbers are meaningless for a budget.
3. **Median-of-N kills flakiness.** Run 3+ times and assert on the median run, so per-run jitter (cold caches, CI noise) never red-flags a healthy build.
4. **Budgets encode Google's "good" thresholds.** LCP ≤ 2500 ms, INP ≤ 200 ms (gated via the TBT lab proxy), CLS ≤ 0.1 — the values that earn green scores, not "needs improvement".
5. **Blocking in CI, visible as artifacts.** A GitHub Action runs the gate on every PR touching the app and uploads the HTML/JSON reports so failures are debuggable.

---

## 1. Files this skill adds

```
apps/web/                          (or your app root)
├── lighthouserc.cjs               ← the gate: budgets + assertions + collect settings
├── package.json                   ← "lhci": "lhci autorun --config=./lighthouserc.cjs"
└── .github/workflows/lighthouse.yml  ← PR-blocking CI job (build → start → lhci → upload)
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
 * Total Blocking Time (TBT) — Lighthouse's recommended lab proxy — at the same
 * budget, and assert the experimental INP audit directly as a warning where the
 * build exposes it.
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
const INP_BUDGET_MS = 200; // good (TBT lab proxy)
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
      // Median across runs is the value compared against each budget.
      aggregationMethod: "median-run",
      assertions: {
        // --- Core Web Vitals budgets (the contract) ---------------------
        "largest-contentful-paint": [
          "error",
          { maxNumericValue: LCP_BUDGET_MS },
        ],
        "cumulative-layout-shift": ["error", { maxNumericValue: CLS_BUDGET }],
        "total-blocking-time": ["error", { maxNumericValue: INP_BUDGET_MS }],
        // Direct INP audit where the Lighthouse build exposes it (else ignored).
        "interaction-to-next-paint": [
          "warn",
          { maxNumericValue: INP_BUDGET_MS },
        ],

        // --- Category floors (target top Lighthouse scores) -------------
        "categories:performance": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.9 }],
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
- `aggregationMethod: "median-run"` is non-negotiable — single-run gates flake constantly.
- `numberOfRuns` ≥ 3 (odd numbers give a clean median).
- Assert on TBT for INP in the lab; treat the experimental `interaction-to-next-paint` audit as a `warn`, not an `error` (it isn't present in every Lighthouse build).
- Keep `onlyCategories` to exactly what you gate — fewer audits, faster, less noise.

---

## 3. Choosing budget severity and thresholds

| Audit / category            | Severity | Threshold | Why                                                   |
| --------------------------- | -------- | --------- | ----------------------------------------------------- |
| `largest-contentful-paint`  | `error`  | ≤ 2500 ms | Google "good" LCP                                     |
| `cumulative-layout-shift`   | `error`  | ≤ 0.1     | Google "good" CLS                                     |
| `total-blocking-time`       | `error`  | ≤ 200 ms  | INP lab proxy                                         |
| `interaction-to-next-paint` | `warn`   | ≤ 200 ms  | not in all builds; don't hard-fail on a missing audit |
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

- **Flaky LCP/TBT** → raise `numberOfRuns` (5), confirm `median-run`, and make sure nothing else is competing for CPU on the runner.
- **`interaction-to-next-paint` errors** → it should be `warn`, not `error`; the audit is missing in some Lighthouse versions.
- **"server not ready" timeout** → fix `startServerReadyPattern` to match the framework's actual ready log, and raise `startServerReadyTimeout`.
- **Real regressions** → open the uploaded report artifact, read the failed audit's "Opportunities"/"Diagnostics", fix the cause (oversized image, render-blocking JS, layout shift from unsized media) — don't just bump the budget.
- **Desktop vs mobile divergence** → run both form factors; mobile is the stricter gate and should be the default.

---

## 8. Conventions checklist (enforce in review)

- [ ] All budgets are named constants with units and comments — no magic numbers in assertions.
- [ ] Gate runs against the **production** build, never the dev server.
- [ ] `aggregationMethod: "median-run"` with `numberOfRuns` ≥ 3.
- [ ] CWV budgets at Google "good" thresholds (LCP ≤ 2500, TBT ≤ 200, CLS ≤ 0.1).
- [ ] INP gated via TBT (`error`); experimental INP audit is `warn`.
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
