---
title: Jetski/Cortex + Gemini Integration Guide
description: "Use antigravity-awesome-skills with Jetski/Cortex without hitting context-window overflow with 1.433+ skills."
---

# Jetski/Cortex + Gemini: safe integration with 1,1.433+ skills

This guide shows how to integrate the `antigravity-awesome-skills` repository with an agent based on **Jetski/Cortex + Gemini** (or similar frameworks) **without exceeding the model context window**.

The common error seen in Jetski/Cortex is:

> `TrajectoryChatConverter: could not convert a single message before hitting truncation`

The issue is not with the skills themselves, but **with how they are loaded**.

---

## 1. Anti-pattern to avoid

Never do:

- read **all** `skills/*/SKILL.md` directories at startup;
- concatenate all `SKILL.md` content into a single system prompt;
- re-inject the entire library for **every** request.

With over 1,1.433 skills, this approach fills the context window before user messages are even added, causing truncation.

---

## 2. Recommended pattern

Core principles:

- **Light manifest**: use `data/skills_index.json` to know *which* skills exist without loading full text.
- **Lazy loading**: read `SKILL.md` **only** for skills actually invoked in a conversation (for example, when `@skill-id` appears).
- **Explicit limits**: enforce a maximum number of skills/tokens loaded per turn, with clear fallbacks.
- **Path safety**: verify manifest paths remain inside `SKILLS_ROOT` before reading `SKILL.md`.

The recommended flow is:

1. **Bootstrap**: on agent startup, read `data/skills_index.json` and build an `id -> meta` map.
2. **Message parsing**: before calling the model, extract all `@skill-id` references from user/system messages.
3. **Resolution**: map the found IDs into `SkillMeta` objects using the bootstrap map.
4. **Lazy load**: read `SKILL.md` files only for these IDs (up to a configurable maximum).
5. **Prompt building**: build model system messages including only the selected skill definitions.

---

## 3. Structure of `skills_index.json`

The file `data/skills_index.json` is an array of objects, for example:

```json
{
  "id": "brainstorming",
  "path": "skills/brainstorming",
  "category": "planning",
  "name": "brainstorming",
  "description": "Use before any creative or constructive work.",
  "risk": "safe",
  "source": "official",
  "date_added": "2026-02-27"
}
```

Key fields:

- **`id`**: identifier used in `@id` mentions (for example, `@brainstorming`).
- **`path`**: directory containing `SKILL.md` (for example, `skills/brainstorming/`).

To resolve the path to a skill definition:

- `fullPath = path.join(SKILLS_ROOT, meta.path, "SKILL.md")`.

> Note: `SKILLS_ROOT` is the root directory where you installed the repository (for example, `~/.agent/skills`).

---

## 4. Integration pseudocode (TypeScript)

> Full example in: [`docs/integrations/jetski-gemini-loader/`](../../docs/integrations/jetski-gemini-loader/).

### 4.1. Core Types

```ts
type SkillMeta = {
  id: string;
  path: string;
  name: string;
  description?: string;
  category?: string;
  risk?: string;
};
```

### 4.2. Bootstrap: load the manifest

```ts
function loadSkillIndex(indexPath: string): Map<string, SkillMeta> {
  const raw = fs.readFileSync(indexPath, "utf8");
  const arr = JSON.parse(raw) as SkillMeta[];
  const map = new Map<string, SkillMeta>();
  for (const meta of arr) {
    map.set(meta.id, meta);
  }
  return map;
}
```

### 4.3. Parse messages to find `@skill-id`

```ts
const SKILL_ID_REGEX = /@([a-zA-Z0-9-_./]+)/g;

function resolveSkillsFromMessages(
  messages: { role: string; content: string }[],
  index: Map<string, SkillMeta>,
  maxSkills: number
): SkillMeta[] {
  const found = new Set<string>();

  for (const msg of messages) {
    let match: RegExpExecArray | null;
    while ((match = SKILL_ID_REGEX.exec(msg.content)) !== null) {
      const id = match[1];
      if (index.has(id)) {
        found.add(id);
      }
    }
  }

  const metas: SkillMeta[] = [];
  for (const id of found) {
    const meta = index.get(id);
    if (meta) metas.push(meta);
    if (metas.length >= maxSkills) break;
  }

  return metas;
}
```

### 4.4. Lazy loading `SKILL.md` files

```ts
async function loadSkillBodies(
  skillsRoot: string,
  metas: SkillMeta[]
): Promise<string[]> {
  const bodies: string[] = [];

  for (const meta of metas) {
    const fullPath = path.join(skillsRoot, meta.path, "SKILL.md");
    const text = await fs.promises.readFile(fullPath, "utf8");
    bodies.push(text);
  }

  return bodies;
}
```

### 4.5. Build the Jetski/Cortex prompt

Pseudocode for the pre-processing phase before `TrajectoryChatConverter`:

```ts
async function buildModelMessages(
  baseSystemMessages: { role: "system"; content: string }[],
  trajectory: { role: "user" | "assistant" | "system"; content: string }[],
  skillIndex: Map<string, SkillMeta>,
  skillsRoot: string,
  maxSkillsPerTurn: number,
  overflowBehavior: "truncate" | "error" = "truncate"
): Promise<{ role: string; content: string }[]> {
  const referencedSkills = resolveSkillsFromMessages(
    trajectory,
    skillIndex,
    Number.MAX_SAFE_INTEGER
  );
  if (
    overflowBehavior === "error" &&
    referencedSkills.length > maxSkillsPerTurn
  ) {
    throw new Error(
      `Too many skills requested in a single turn. Reduce @skill-id usage to ${maxSkillsPerTurn} or fewer.`
    );
  }

  const selectedMetas = resolveSkillsFromMessages(
    trajectory,
    skillIndex,
    maxSkillsPerTurn
  );

  const skillBodies = await loadSkillBodies(skillsRoot, selectedMetas);

  const skillMessages = skillBodies.map((body) => ({
    role: "system" as const,
    content: body,
  }));

  return [...baseSystemMessages, ...skillMessages, ...trajectory];
}
```

> Tip: Add token estimation to trim or summarize `SKILL.md` files when the context window approaches its limit.
> This repository's reference loader also supports an explicit fallback: `overflowBehavior: "error"`.

---

## 5. Context overflow handling

To avoid unclear errors for the user, set:

- a **safety threshold** (for example, 70–80% of the context window);
- a **maximum number of skills per turn** (for example, 5–10).

Strategies when the threshold is exceeded:

- reduce the number of included skills (for example, by recency or priority); or
- return a clear error to the user, for example:

> "Too many skills were requested in a single turn. Reduce the number of `@skill-id` references in your message or split them into multiple turns."

---

## 6. Recommended test scenarios

- **Scenario 1 – Simple message ("hi")**
  - No `@skill-id` → no `SKILL.md` loaded → prompt remains small → no error.
- **Scenario 2 – Few skills**
  - Message with 1–2 `@skill-id` references → only related `SKILL.md` files are loaded → no overflow.
- **Scenario 3 – Many skills**
  - Message with many `@skill-id` references → `maxSkillsPerTurn` or token guardrails trigger → no silent overflow.

---

## 7. Skill subsets and bundles

For additional control:

- move unnecessary skills into `skills/.disabled/` to exclude them in certain environments;
- use the **bundles** described in [`docs/users/bundles.md`](../users/bundles.md) to load only focused groups.

## 8. Windows crash-loop recovery

If the host keeps reopening the same corrupted trajectory after a truncation error:

- remove the problematic skill or package;
- clear Antigravity Local Storage / Session Storage / IndexedDB;
- clear `%TEMP%`;
- restart with lazy loading and explicit limits.

Complete guide:

- [`docs/users/windows-truncation-recovery.md`](../users/windows-truncation-recovery.md)

To prevent recurrence:

- keep `overflowBehavior: "error"` when you prefer explicit failure;
- continue validating that resolved paths remain inside `skillsRoot`.

---

## 9. Summary

- Do not concatenate all `SKILL.md` files into a single prompt.
- Use `data/skills_index.json` as a lightweight manifest.
- Load skills **on demand** based on `@skill-id`.
- Set clear limits (max skills per turn, token threshold).

Following this pattern, Jetski/Cortex + Gemini can use the full `antigravity-awesome-skills` library safely, at scale, and within modern model context-window limits.
