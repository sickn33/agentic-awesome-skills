---
name: expo-examples
description: Expo's official example projects — the expo/examples repo of ~70 `with-*` integrations (Stripe, Clerk, Supabase, OpenAI, maps, Reanimated, SQLite, Skia, NativeWind, and more). Use when integrating a third-party library or service into an existing Expo app and you want the canonical,...
risk: unknown
source: https://github.com/expo/skills/tree/main/plugins/expo/skills/expo-examples
source_repo: expo/skills
source_type: official
date_added: 2026-07-01
license: MIT
license_source: https://github.com/expo/skills/blob/main/LICENSE
---

# Expo Examples
## When to Use

Use this skill when you need expo's official example projects — the expo/examples repo of ~70 `with-*` integrations (Stripe, Clerk, Supabase, OpenAI, maps, Reanimated, SQLite, Skia, NativeWind, and more). Use when integrating a third-party library or service into an existing Expo app and you want the canonical,...


[expo/examples](https://github.com/expo/examples) is Expo's official library of ~70 **integration examples** — directories named `with-<library>` (e.g. `with-stripe`, `with-maps`), each built around **one** library or service. These are not full apps: they're **managed** projects (no `ios/`/`android/` dirs — native setup is via config plugins), and the typical one is a **single screen of ~100–200 lines**. Mine them for the canonical integration *pattern* — the dependency set, `app.json` config plugins, and minimal wiring Expo maintains against the current SDK — and adapt that into the user's app. Don't expect to lift an application architecture from them.

Reach for an example before hand-rolling an integration. (Kinds — full-stack, showcases, starters — are noted in `./references/catalog.md`.)

## Two modes

1. **Inspiration / adapt** (most common) — the user already has a project. Find the matching example, read its key files, and apply the *pattern* to their code.
2. **Scaffold** — greenfield. Start a fresh project directly from the example.

## Workflow

### 1. Find the right example

Map the user's need to an example name (e.g. payments → `with-stripe`, auth → `with-clerk`). `./references/catalog.md` is a categorized snapshot for fast triage — but it drifts, so confirm against the live list:

```bash
# Live example names:
gh api repos/expo/examples/contents --jq '.[] | select(.type=="dir" and (.name|startswith(".")|not)) | .name'
# Aliases (renamed) + deprecated (dead/moved) examples — check before recommending:
gh api repos/expo/examples/contents/meta.json --jq '.content' | base64 -d
```

`meta.json` is the source of truth for what's renamed or dead (deprecated examples are removed from the repo tree but still listed here, each with a `message`). If an example is in its `deprecated` map, don't recommend it — follow the `message` to the modern path. If it's in `aliases`, use the `destination`.

### 2a. Inspiration mode — study without touching the user's project

The common case: the user already has an app and wants to see how Expo does something. Read the example as **reference** and apply the patterns by hand — never scaffold an example on top of their project.

**First, list the whole example in one call.** Integration code is often nested (e.g. Stripe's server routes live in `app/api/`), so a one-level listing misses the important files:

```bash
gh api 'repos/expo/examples/git/trees/master?recursive=1' \
  --jq '.tree[].path | select(startswith("with-stripe/"))'
```

**Then read the high-signal files first:** `README.md` (setup) → `package.json` (deps) → `app.json` (config plugins / permissions) → the integration code the manifest revealed → `.env` (required secrets). Per file:

```bash
gh api repos/expo/examples/contents/with-stripe/utils/stripe-server.ts --jq '.content' | base64 -d
# No gh? Raw URL (branch is master):
curl -s https://raw.githubusercontent.com/expo/examples/master/with-stripe/utils/stripe-server.ts
```

**Reading more than a couple of files?** Many integrations are spread across server routes, a client provider, and config (Stripe is). Skip the per-file calls — pull the whole example into a **throwaway/gitignored dir (not the user's project)** and read it freely with Grep/Read, then apply by hand:

```bash
npx degit expo/examples/with-stripe /tmp/expo-ref/with-stripe   # clean copy, no git history
# fallback without degit (sparse-checkout, no full ~64 MB clone):
git clone --depth 1 --filter=blob:none --sparse https://github.com/expo/examples.git /tmp/expo-ref/examples \
  && (cd /tmp/expo-ref/examples && git sparse-checkout set with-stripe)
```

Read from there with Grep/Read; delete the scratch dir when done.

### 2b. Scaffold mode — new project from an example

```bash
npx create-expo --example with-stripe   # short form:  npx create-expo -e with-stripe
bun create expo --example with-stripe    # with bun
```

### 3. Adapt into the user's app — non-destructively (critical)

When the user already has an app, **add only what the example introduces; never overwrite their setup.**

- **Version-align — don't copy pinned versions.** Examples track the **latest** SDK, so their `package.json` pins won't match an older project. Add only the *missing* deps with `npx expo install <pkg>` (it resolves SDK-correct versions) instead of copying exact versions.
- **Merge config, don't replace it.** Add only the `app.json`/`app.config.*` plugins and permissions the example introduces that the user lacks — keep their existing config block intact.
- **Port the integration code.**
- **Recreate env vars** from the example's `.env` shape — it holds placeholders, never working secrets.

**Done when** the integration code is ported and every dependency, config plugin, permission, and env var it needs is accounted for in the user's app — not when it merely *looks* wired up.

## Gotchas

- **Default branch is `master`,** not `main` (matters for raw URLs and sparse checkout).
- **Single-click deploy.** Every example has a launch URL: `https://launch.expo.dev/?github=https://github.com/expo/examples/tree/master/<example>`.

## Related skills

- Tailwind / NativeWind styling → `expo-tailwind-setup`
- Native UI components → `building-native-ui`
- Authoring a native module → `expo-module`
- Upgrade the SDK before adopting a latest-SDK example → `upgrading-expo`

## References

- `./references/catalog.md` — categorized snapshot of the example library for fast triage.

## Limitations

- Use this skill only when the task clearly matches its upstream product or API scope.
- Verify commands, API behavior, pricing, quotas, credentials, and deployment effects against current official documentation before making changes.
- Do not treat generated examples as a substitute for environment-specific tests, security review, or user approval for destructive or costly actions.
