# 01 — Single-Turn Intake

Ask every open question in **one numbered message** with a default for each. Skip anything already answered by the prompt, attached files, or `PRODUCT.md`/`DESIGN.md`.

If the user replies `"defaults"` or `"go ahead"`, or already gave a clear spec, skip asking and proceed immediately.

## Questions & Defaults

| # | Question | Default |
|---|---|---|
| 1 | **Scope, Mode & Business Kind:** `Persuade` (marketing/landing), `Experience` (story/editorial/interactive brand showcase), `Operate` (app/dashboard/tool), `Read` (docs/article UI), or `3D` (Three.js/WebGL/shaders)? If `Persuade`/`Experience`, what kind (`software \| gaming \| tech \| product \| service \| place`)? | Infer from prompt (`Operate` if existing codebase has app UI, else `Persuade`); infer business kind or `n/a` for `Operate`/`Read`. |
| 2 | **Stack:** Match the repo's existing stack, or build fresh static HTML/CSS / Next.js / React+Tailwind? | Inspect `package.json`, Tailwind/CSS tokens, and UI primitives directly (or use the optional upstream stack probe in `yashh1323/atelier-ui` at commit `a58151b66421769e1d59f0df3ed04b8c596481f7`); use static HTML+CSS if the folder is empty. |
| 3 | **Direction & Material:** Specific aesthetic/theme, brand tokens, or reference images? Real photos/screenshots available? | For `Operate`/`Read` in an existing repo, preserve incumbent tokens (`DESIGN.md`, `globals.css`, Tailwind config). For greenfield `Persuade`/`Experience`, deal a fresh trade-appropriate theme from [resources/themes.json](../resources/themes.json). Never invent fake metrics or logos. |
| 4 | **QA & Budget Depth:** `fast` (lint + 1 browser check), `critic` (add 1 zero-context visual review pass), or `deep` (bounded multi-round loop)? | `critic` for new sites/visuals; `fast` for surgical edits to existing apps; `deep` defaults to `cap: 3 rounds`. |

*(Optional: If the user asks to align on complex product architecture before UI design, ask 2–3 sharp trade-off questions in one round before locking the brief.)*

## Persist `.atelier/BRIEF.md`

Immediately after intake, write `.atelier/BRIEF.md` (and keep it updated across context resets):

```markdown
# Atelier Brief: [Project]
Mode: [Persuade | Experience | Operate | Read | 3D]
Business Kind: [software | gaming | tech | product | service | place | n/a]
Stack: [detected stack]
Direction: [theme id | existing tokens / DESIGN.md]
QA Depth: [fast | critic | deep] (cap: [e.g. 1 pass or 3 rounds])
Constraints: [user bans, must-include items, permissions]
```

After writing `.atelier/BRIEF.md`, **do not ask clarifying questions again** unless blocked by missing credentials or destructive actions.
