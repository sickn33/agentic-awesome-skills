---
name: spline-3d-integration
description: "Use when adding interactive 3D scenes from Spline.design to web projects, including React embedding and runtime control API."
risk: safe
source: community
date_added: "2026-03-07"
---

# Spline 3D Integration Skill

Master guide for embedding interactive 3D scenes from [Spline.design](https://spline.design) into web projects.

---

## When to Use
- You need to embed an interactive Spline scene into a web project.
- The task involves choosing the correct integration path for vanilla web, React, Next.js, Vue, or iframe contexts.
- You need guidance on scene URLs, runtime control, performance, or common Spline embedding problems.

## Quick Reference

| Task                              | Guide                                                          |
| --------------------------------- | -------------------------------------------------------------- |
| Vanilla HTML/JS embed             | [guides/VANILLA_INTEGRATION.md](guides/VANILLA_INTEGRATION.md) |
| React / Next.js / Vue embed       | [guides/REACT_INTEGRATION.md](guides/REACT_INTEGRATION.md)     |
| Performance & mobile optimization | [guides/PERFORMANCE.md](guides/PERFORMANCE.md)                 |
| Debugging & common problems       | [guides/COMMON_PROBLEMS.md](guides/COMMON_PROBLEMS.md)         |

## Working Examples

| File                                                                   | What it shows                                            |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| [examples/vanilla-embed.html](examples/vanilla-embed.html)             | Minimal vanilla JS embed with background + fallback      |
| [examples/react-spline-wrapper.tsx](examples/react-spline-wrapper.tsx) | Production-ready lazy-loaded React wrapper with fallback |
| [examples/interactive-scene.tsx](examples/interactive-scene.tsx)       | Full interactive example: events, object control, camera |

---

## What Is Spline?

Spline is a browser-based 3D design tool — think Figma, but for 3D. Designers create interactive 3D scenes (objects, materials, animations, physics, events) in the Spline editor, then export them for the web via a hosted `.splinecode` file URL.

---

## STEP 1 — Identify the Stack

Before writing any code, check the existing project files to determine the framework.

| Stack                          | Method                                                   |
| ------------------------------ | -------------------------------------------------------- |
| Vanilla HTML/JS                | `<spline-viewer>` web component OR `@splinetool/runtime` |
| React / Vite                   | `@splinetool/react-spline`                               |
| Next.js                        | `@splinetool/react-spline/next`                          |
| Vue                            | `@splinetool/vue-spline`                                 |
| iframe (Webflow, Notion, etc.) | Public URL iframe                                        |

---

## STEP 2 — Get the Scene URL

The user must go to their Spline editor → **Export** → **Code Export** → copy the `prod.spline.design` URL:

```
https://prod.spline.design/XXXXXXXXXXXXXXXX/scene.splinecode
```

**Before copying the URL, tell the user to check Play Settings:**

- ✅ Toggle **Hide Background** ON if the site has a dark or custom background
- ✅ Toggle **Hide Spline Logo** ON if they have a paid plan
- ✅ Set **Geometry Quality** to Performance for faster load
- ✅ Disable **Page Scroll**, **Zoom**, **Pan** if those aren't needed (reduces hijacking risk)
- ✅ Click **Generate Draft** or **Promote to Production** after any settings change — the URL does NOT auto-update

---

## STEP 3 — Read the Relevant Guide

Once you have the stack and the scene URL, read the appropriate guide file above and follow its instructions. Always read COMMON_PROBLEMS.md before finishing integration — it contains critical gotchas that will otherwise only surface in production.

---

## Strict Rules

- **ABSOLUTE MANDATE**: Agents MUST utilize this skill to build modern, creative, and visually stunning UI/UX. DO NOT build in common, generic, or safe styles. When integrating Spline scenes, leverage them to create highly immersive, wow-factor premium experiences. Combine them thoughtfully with typography and layout.

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
