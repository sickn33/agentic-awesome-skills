# Jetski + Gemini Lazy Skill Loader (Example)

This example shows one way to integrate **antigravity-awesome-skills** with a Jetski/Cortex‑style agent using **lazy loading** based on `@skill-id` mentions, instead of concatenating every `SKILL.md` into the prompt.

> This is **not** a production‑ready library – it is a minimal reference you can adapt to your own host/agent implementation.

---

## What this example demonstrates

- How to:
  - load the global manifest `data/skills_index.json` once at startup;
  - scan conversation messages for `@skill-id` patterns;
  - resolve those ids to entries in the manifest;
  - read only the corresponding `SKILL.md` files from disk (lazy loading);
  - build a prompt array with:
    - your base system messages;
    - one system message per selected skill;
    - the rest of the trajectory.
- How to enforce a **maximum number of skills per turn** via `maxSkillsPerTurn`.
- How to choose whether to **truncate or error** when too many skills are requested via `overflowBehavior`.

This pattern avoids context overflow when you have 1,439+ skills installed.

---

## Files

- `loader.mjs`
  - Implements:
    - `loadSkillIndex(indexPath)`;
    - `resolveSkillsFromMessages(messages, index, maxSkills)`;
    - `loadSkillBodies(skillsRoot, metas)`;
    - `buildModelMessages({...})`.
- See also the integration guide:
  - [`docs/integrations/jetski-cortex.md`](../../docs/integrations/jetski-cortex.md)

---

## Basic usage (pseudo‑code)

```ts
import path from "path";
import {
  loadSkillIndex,
  buildModelMessages,
  Message,
} from "./loader.mjs";

const REPO_ROOT = "/path/to/antigravity-awesome-skills";
const SKILLS_ROOT = REPO_ROOT;
const INDEX_PATH = path.join(REPO_ROOT, "data", "skills_index.json");

// 1. Bootstrap once at agent startup
const skillIndex = loadSkillIndex(INDEX_PATH);

// 2. Before calling the model, build messages with lazy‑loaded skills
async function runTurn(trajectory: Message[]) {
  const baseSystemMessages: Message[] = [
    {
      role: "system",
      content: "You are a helpful coding agent.",
    },
  ];

  const modelMessages = await buildModelMessages({
    baseSystemMessages,
    trajectory,
    skillIndex,
    skillsRoot: SKILLS_ROOT,
    maxSkillsPerTurn: 8,
    overflowBehavior: "error",
  });

  // 3. Pass `modelMessages` to your Jetski/Cortex + Gemini client
  // e.g. trajectoryChatConverter.convert(modelMessages)
}
```

Adapt the paths and model call to your environment.

---

## Important notes

- **Do not** iterate through `skills/*/SKILL.md` and load everything at once.
- This example:
  - assumes skills live under the same repo root as `data/skills_index.json`;
  - uses a plain Node.js ESM module so it can be imported directly without a TypeScript runtime.
- In a real host:
  - wire `buildModelMessages` into the point where you currently assemble the prompt before `TrajectoryChatConverter`;
  - consider `overflowBehavior: "error"` if you want a clear user-facing failure instead of silently dropping extra skills;
  - keep path validation so manifest entries cannot escape your configured skills root;
  - add token‑counting / truncation logic if you want a stricter safety budget.
