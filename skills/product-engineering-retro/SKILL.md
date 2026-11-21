---
name: product-engineering-retro
description: 'Build a session''s learnings into the setup: its friction, what went wrong and why, then an improved instruction, route, hook or script, verified, or ''no setup change warranted''. Started by name only: /agent-harness:retro in Claude Code, $agent-harness:retro in Codex.'
argument-hint: '<optional: the friction you noticed>'
disable-model-invocation: true
risk: safe
source: https://github.com/phuryn/product-engineering
source_repo: phuryn/product-engineering
source_type: official
license: MIT
license_source: https://github.com/phuryn/product-engineering/blob/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/LICENSE.md
author: Pawel Huryn
upstream_commit: 8ebb50bb1b28dc9e8bc669199493e6020b808cc6
date_added: '2026-11-21'
category: development
---

# Retro — a session's learnings, built into your setup

## Operational boundaries

Keep the scope, sandbox, credentials and approval settings supplied by the user or host. Obtain authorization before delegating, exposing project files to another provider, enabling connectors or hooks, using paid services or deploying. Use synthetic or redacted inputs for examples. Keep security reviews static and defensive, with findings and fixes grounded in source inspection.

## When to Use

Build a session's learnings into the setup: its friction, what went wrong and why, then an improved instruction, route, hook or script, verified, or 'no setup change warranted'. Started by name only: /agent-harness:retro in Claude Code, $agent-harness:retro in Codex.


**Build the session's learnings into the setup before its context goes.** At the end of a session, find what slowed it down or went wrong, why, and what setup change stops it happening again. The output is fixes made and checked, not a list of lessons.

## Invocation

```
product-engineering-retro                             Claude Code, plugin installed
product-engineering-retro it ran the tests against the wrong server twice
product-engineering-retro                             Codex, plugin installed
/retro   ·   $retro                              the skill folder copied into a repository
```

## Steps

### 1. List what actually happened

**List only this session's friction, with the moment each item happened.**

- the owner corrected the agent (quote the correction);
- the agent missed a rule it had;
- work was done twice, or undone;
- an assumption turned out wrong;
- a tool, script or command failed, or needed a workaround;
- the owner waited on something the agent could have done.

**Leave out successes and guesses about the future.** List evidence, not new rules: an item with no moment behind it is not one.

### 2. Find the cause of each

| Cause | What it looks like | The fix goes in |
|---|---|---|
| Missing | nothing told the agent | the entry file when every session needs it; otherwise the file the agent reads at the moment the rule must change a decision, with a router row for that moment (§ 3) |
| Present but not met | the rule existed and the agent didn't apply it when it mattered | the route to it (the instructions' index of what to read when), or code |
| A tool gap | a script, check or wrapper was missing or wrong | the tool |
| A skill's advice | a skill from a plugin or a collection said something wrong, or left a step out | the project's own agent instructions, naming the skill and what to do instead (§ 3) |
| A one-off | it won't recur | nowhere: say so |

### 3. Fix it, code first

**Prefer code, then an improved instruction or route, then a new rule.** Use this order:

1. **Hold the fix in code wherever code can hold it.** Use a script, hook, validation, required argument or test. Prose loses when compliance depends on an agent remembering a sentence at the moment it matters. Apply the `guardrail-hooks` skill for hooks and permission rules.
2. **Improve an existing instruction or route before adding another rule.** Reword the misread rule, or move it where the agent will see it when it applies. Replace or tighten before adding. Removing a rule's text is the owner's decision. Tighten wording without dropping a condition, exception or receipt, or move the rule to its fire point with a pointer left behind. A move is not a removal. You can also add the test or hook that holds it, and propose removal. Apply the `agent-instructions` skill for how instruction files are shaped.
3. **Add a new rule only when this session gave it a receipt.** Include the date and what happened.

**Put each learning where it must change a decision.** The entry file (`AGENTS.md`, or the project's own name) holds what every session needs. Put the rest at its fire point, not its topic home, usually in the file for the area that task touches. Add an entry-file index line saying when to read it.

**Re-read an area's file at the start of every task touching it.** The index must require this, not once a session. After compaction or a long session, the earlier read is gone. If the router doesn't yet say to re-read at every task, add that sentence. Keep the file within budget and give the rule a receipt and, where the repository uses them, a review date (`agent-instructions` § Budgets).

**Make reversible repository fixes and verify each where it applies.** Pipe a sample payload that must trigger into a hook, and one that must not; for a new or rewired hook, also run its canary in a live session where it has one (the `guardrail-hooks` templates do); otherwise report the wiring unchecked. Never run a real one-way door to test it. Open the route where the agent will read it; run the script. Report an unchecked fix as unchecked. Propose changes outside the repository with exact text; don't make them unless the owner says so. This includes the user's own settings and global instructions.

**Keep a skill's correction in the project's own agent instructions.** Put it where the agent reads it while that skill is in use. Use the router row for when the skill runs, or the entry file if it can fire in any task. An installed plugin copy sits outside the repository; a copied skill is overwritten by its next update, so edits to either are lost.

**Draft an upstream issue only when the owner requests one.** Include what the skill says, the receipt and replacement text for the repository its plugin or copy came from. Follow that repository's skill style and name the product by kind. Omit session names, ids, hostnames, paths, account names and values. Leave submission to the owner unless they authorize it.

### 4. Report

**Report each item's incident, cause, fix and verification in one line.** When nothing deserves a change, "no setup change warranted" is valid and better than a rule that will never fire.

**Don't gate what the owner wouldn't want to click for.** A guard that asks too often trains a reflexive yes.

Each rule's origin, the case that taught it, is in `receipts.md` beside this file; read it when a rule's edge is unclear.

## How you can tell it worked

Each fix names the moment it came from and was checked where it applies, and the next session doesn't hit the same friction.

## Limitations

Treat upstream examples as patterns. Validate scope and results against current project constraints, available tools and decisions recorded by the owner.

Adapted from [Pawel Huryn’s upstream skill](https://github.com/phuryn/product-engineering/tree/8ebb50bb1b28dc9e8bc669199493e6020b808cc6/agent-harness/skills/retro).
