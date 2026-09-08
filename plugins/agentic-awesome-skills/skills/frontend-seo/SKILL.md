---
name: frontend-seo
description: "A portable, framework-agnostic SEO system for any React or React Native-for-web frontend."
risk: critical
source: https://github.com/stareezy-1/frontend-architecture-skill/tree/main/skills/frontend-seo
source_repo: stareezy-1/frontend-architecture-skill
source_type: community
date_added: 2026-07-01
license: MIT
license_source: https://github.com/stareezy-1/frontend-architecture-skill/blob/main/LICENSE
---

# Frontend SEO (portable, builder-based)

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use

Use this skill when you need a portable, framework-agnostic SEO system for any React or React Native-for-web frontend. Centralizes site metadata in one constants module, derives canonical URLs from a single base, builds per-route metadata (title, description, canonical, Open Graph, Twitter/X cards), generates...


> Portable skill — readable by Claude Code, OpenCode, Codex, Cursor, Windsurf, and others.
> This skill describes an **SEO system** — a set of pure builder functions plus a thin
> framework adapter — not a component library or a visual style.
> It pairs with the **frontend-architecture** skill: the SEO system lives in a single
> service module (`services/seo/`) and is consumed through one barrel.

The goal: every route ships **correct, consistent, machine-readable metadata** without
anyone copy-pasting `<meta>` tags. Site identity lives in **one** constants module, URLs are
**always absolute and canonical**, and search engines get a **sitemap, robots rules, an RSS
feed, and typed JSON-LD** derived from the same content the app already renders.

---

## Limitations

- Use this skill only when the task clearly matches its upstream source and local project context.
- Verify commands, generated code, dependencies, credentials, and external service behavior before applying changes.
- Do not treat examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
