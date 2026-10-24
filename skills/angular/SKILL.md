---
name: angular
description: Modern Angular (v20+) expert with deep knowledge of Signals, Standalone Components, Zoneless applications, SSR/Hydration, and reactive patterns.
risk: safe
source: self
date_added: '2026-02-27'
---

# Angular Expert

Master modern Angular development with Signals, Standalone Components, Zoneless applications, SSR/Hydration, and the latest reactive patterns.

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

- Building new Angular applications (v20+)
- Implementing Signals-based reactive patterns
- Creating Standalone Components and migrating from NgModules
- Configuring Zoneless Angular applications
- Implementing SSR, prerendering, and hydration
- Optimizing Angular performance
- Adopting modern Angular patterns and best practices

## Do Not Use This Skill When

- Migrating from AngularJS (1.x) → use `angular-migration` skill
- Working with legacy Angular apps that cannot upgrade
- General TypeScript issues → use `typescript-expert` skill

## Safety

- Always test changes in development before production
- Gradual migration for existing apps (don't big-bang refactor)
- Keep backward compatibility during transitions

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Example boundaries

Examples are fragments and omit project imports/types/components such as ItemComponent, HeaderDirective, User and Product; supply their actual definitions. `effect` and `toSignal` need an injection context or explicit injector. Route guards improve navigation UX but every server endpoint must enforce authorization; validate returnUrl as an allowed internal route. Do not log real form or account data.

Use template imports and semantic labels/alt text in complete components. Replace the image placeholder with an actual supported data URL or configured loader. Product loading needs cancellation/stale-response handling, error state and lifecycle policy for repeated calls. Read-only signals do not deeply freeze objects. Constructor injection and @Input remain supported patterns; migrate for a concrete benefit. Configure SSR state/cache providers per request to avoid cross-user leakage. The guide has not been compiled or browser-tested.
