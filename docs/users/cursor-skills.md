# Cursor Skills

If you searched for **Cursor skills** on GitHub, this repository is built to be a practical starting point: installable skills, clear usage docs, and a large library that works well with Cursor chat workflows.

Agentic Awesome Skills supports Cursor through the `.cursor/skills/` path and keeps the entry point simple: install once, then invoke the skills you need in chat.

## How to use Agentic Awesome Skills with Cursor

Install the library into Cursor's skills directory, then call skills directly in chat with `@skill-name`. Cursor works especially well when you combine planning, implementation, and validation skills inside one conversation.

## Why use this repo for Cursor

- It supports Cursor directly with a dedicated install flag.
- It works well for UI-heavy and full-stack workflows where Cursor users often want planning, implementation, validation, and debugging in one place.
- It includes bundles and workflows, which are helpful when you do not want to hand-pick from a huge catalog immediately.
- It is broad enough for frontend, backend, infra, testing, product, and growth work without switching repositories.

## Install Cursor Skills

```bash
npx agentic-awesome-skills --cursor
```

### Verify the install

```bash
test -d .cursor/skills || test -d ~/.cursor/skills
```

## Best starter skills for Cursor

- [`frontend-design`](../../skills/frontend-design/): improve UI direction and interaction quality.
- [`react-best-practices`](../../skills/react-best-practices/): tighten React and Next.js implementation patterns.
- [`tailwind-patterns`](../../skills/tailwind-patterns/): structure utility-first UI work cleanly.
- [`testing-patterns`](../../skills/testing-patterns/): add focused unit and integration tests.
- [`api-design-principles`](../../skills/api-design-principles/): define clean interfaces before implementation spreads.

## Example Cursor prompts

```text
@frontend-design redesign this landing page to feel more premium and conversion-focused.
```

```text
@react-best-practices review this component tree and fix the biggest performance problems.
```

```text
@testing-patterns add tests for the checkout state machine in this folder.
```

## What to do next

- Read [`best-cursor-skills-github.md`](best-cursor-skills-github.md) if you want a shortlist of GitHub options for Cursor-compatible skills.
- Use [`bundles.md`](bundles.md) if you want a role-based starting point such as Web Wizard or Full-Stack Developer.
- Open [`usage.md`](usage.md) if you want more prompt examples and execution patterns.
