---
name: ghost-record
description: "Record a React component interaction as a replayable Ghost Cursor demo. Use only when the user explicitly invokes ghost-record."
category: development
risk: critical
source: community
source_type: community
source_repo: imuratalpay/ghost-cursor
author: Murat Alpay
license: MIT
license_source: https://github.com/imuratalpay/ghost-cursor/blob/9b20099d1cbad4872920502374c28ac5a7023a2f/LICENSE
date_added: "2026-11-24"
disable-model-invocation: true
---

# ghost-record

Adapted from [imuratalpay/ghost-cursor](https://github.com/imuratalpay/ghost-cursor/tree/9b20099d1cbad4872920502374c28ac5a7023a2f/skills/ghost-record) at `9b20099d1cbad4872920502374c28ac5a7023a2f`. See [LICENSE](LICENSE).

## When to Use

Run when the user explicitly requests a Ghost Cursor recording with `/ghost-record` or `$ghost-record`. For example, record a local React like button being hovered and clicked, then return the replay snippet.

## Operational boundaries

Use trusted local projects or explicitly authorized test pages with demo data. Recording replays real UI inputs, may start the project's dev script, and writes a take and a temporary Next.js route. Avoid production actions, real credentials and sensitive text. Agree on changes to dependency manifests before installing packages and use the project's existing package manager. When a take already exists, choose a fresh `--out` path unless its replacement is authorized.

## Limitations

Automatic staging requires the Next.js App Router. Other environments need a page that already embeds the recorder. Replay verification compares a subset of DOM state and does not verify visual parity.

Follow the requested interaction and leave application pages unchanged after recording.

## 1. Find the component

Search the project with `rg` for the noun phrase before the colon ("like button"). Rank matches top to bottom and take the first rank that has a hit:

```
An exported component whose name is the phrase in PascalCase (LikeButton)?
├── Yes → it
└── No → a file whose name is the phrase in kebab-case (like-button.tsx)?
    ├── Yes → its main export
    └── No → a component whose JSX text or aria-label contains the phrase
        ├── Yes → the one with the fewest other matches in its file
        └── No → ask the user which component to record
```

Skip `*.test.*`, `*.stories.*` and anything under `node_modules`. They render outside the app.

## 2. Write the steps

Read the component, then map each verb in the sentence to one step. Aim at elements by what's stable: `@name` for `data-ghost-id`, then `role=button[name=Like]`, then `text=Most popular`. Never aim by class name, because classes change with styling.

## 3. Run it

The project needs the package and Playwright. Check `package.json` first and install only what's missing:

```bash
npm install @imuratalpay/ghost-cursor motion
npm install --save-dev playwright
npx playwright install chromium
```

Then run the script from the project root. It sits next to this file, in `scripts/`:

```bash
node <this skill's folder>/scripts/ghost-record.mjs \
  --component components/like-button.tsx#LikeButton \
  'hover @like' 'click @like' 'click role=button[name=Share]' 'click text=Copy link'
```

That's `/ghost-record like button: hover, click, then open the share menu and copy the link`. When it ends with two ✓ lines, show the user the snippet it printed and where to paste it. Don't edit their pages.

## Defaults

| Thing | Default | Why |
| --- | --- | --- |
| Where it records | The page that has the component as the direct child of a `<GhostCursor>`, otherwise a temporary `/ghost-stage` route | Recording in place keeps the page's layout and props; the temporary route is deleted at the end |
| Dev server | The one in `.next/dev/lock`, then ports 3000 to 3003, otherwise it starts one and stops it at the end | Next 16 refuses a second dev server for the same app |
| Box height | 320px on the temporary route, the embed's height in place | The take stores coordinates relative to the box |
| Props | None. Pass `--props '{"label":"Save"}'` when the component requires some | The temporary route mounts the component alone |
| Output | `<component>.take.json` next to the component | Use a fresh output path to preserve an existing take |
| Verification | Preview replays the take; the final DOM must match the live run | Text, structure and attributes are compared, not styles |
| Content that changes by itself | Left out of the comparison, found by comparing two snapshots 1s apart | Clocks and counters can't match between two runs |
| Retries | 3 takes: full speed, then 85%, then 75%, each with 400ms more settle time, up to 1400ms | Most mismatches are animations still running at the check |

## Failure modes

| Output | What to do |
| --- | --- |
| `<target> isn't in the box at this point in the take` | Re-read the component. The element may only exist after an earlier step opens it, or the name is wrong. Fix the step and rerun |
| `three takes failed` with a diff | The component reacts differently to a replay than to real input, usually because it checks `event.isTrusted` or needs real focus. Tell the user which line differs |
| `no Next.js app contains this component` | Pass `--url` to a page that renders the component inside a `<GhostCursor>` |
| `the page threw during the take` | A replayed `setPointerCapture` throws for the synthetic pointer. Tell the user; don't work around it |
| `some targets are CSS paths` | The take works now but breaks when the markup changes. Suggest adding `data-ghost-id` to the elements in the steps |
