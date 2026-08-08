## v7.2.0 - Community PR Harvest & Cleanup (2026-03-08)

**Eight PRs merged: 44 broken skills removed, zebbern attribution restored, Chinese docs, new skills (audit-skills, senior-frontend, shadcn, frontend-slides update, pakistan-payments-stack), and explainable auto-categorization.**

This release cleans up the registry (removal of 44 SKILL.md files that contained only "404: Not Found"), restores `author: zebbern` attribution to 29 security skills, and merges community contributions: Simplified Chinese documentation, audit-skills, senior-frontend and shadcn skills, frontend-slides dependencies and formatting, pakistan-payments-stack for Pakistani SaaS payments, and explainable auto-categorization in the index generator. Bundle references were updated to drop missing skills so reference validation passes.

### New Skills

- **audit-skills** — Audit-safe skills (PR #236)
- **senior-frontend** — React, Next.js, TypeScript, Tailwind (PR #233)
- **shadcn** — shadcn/ui ecosystem (PR #233)
- **pakistan-payments-stack** — JazzCash, Easypaisa, PKR billing (PR #228)

### Improvements

- **Registry cleanup**: 44 broken "404: Not Found" skill files removed (PR #240).
- **Attribution**: `author: zebbern` restored for 29 security skills (PR #238).
- **Docs**: frontend-slides updated with missing deps and formatting (PR #234); Simplified Chinese docs added (PR #232).
- **Index**: Explainable auto-categorization in `generate_index.py` (PR #230).
- **Bundles**: `data/bundles.json` updated to remove references to removed or missing skills; `npm run validate:references` passes.
- **Registry**: Now tracking **1,232** skills.

### Credits

- **@munir-abbasi** for Chinese docs (PR #232)
- **@itsmeares** for senior-frontend, shadcn (PR #233), frontend-slides update (PR #234)
- **@zebbern** for security skills attribution (PR #238)
- Contributors behind PRs #228, #230, #236, #240

---

_Upgrade: `git pull origin main` or `npx agentic-awesome-skills`._
