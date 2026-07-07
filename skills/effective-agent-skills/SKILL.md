---
name: effective-agent-skills
description: "Author and review high-quality agent skills with triggers, progressive disclosure, and safety notes."
category: development
risk: safe
source: community
source_repo: davidondrej/skills
source_type: community
date_added: "2026-07-07"
author: davidondrej
tags: [skills, authoring, quality]
tools: [claude, codex]
license: "MIT"
license_source: "https://github.com/davidondrej/skills/blob/main/LICENSE"
---

# Agent Skills: A Complete Guide

## When to Use

- Use when creating, editing, reviewing, or debugging an agent SKILL.md file.
- Use when you need quality guidance for triggers, examples, limitations, and safety notes.

A consolidated reference on what agent skills are, why they exist, how they work, and how to write effective ones.

---

## 1. What agent skills are

An Agent Skill is a folder containing a `SKILL.md` file (YAML frontmatter + markdown instructions), plus optional subfolders for scripts, references, and assets that the agent loads on demand.

```
my-skill/
├── SKILL.md          # Required: metadata + instructions
├── scripts/          # Optional: executable code (CLIs, validators, helpers)
├── references/       # Optional: detailed docs loaded only when needed
└── assets/           # Optional: templates, fonts, static files
```

Skills are an open standard (agentskills.io), originally created by Anthropic and adopted by OpenAI Codex, Cursor, Gemini CLI, Microsoft Agent Framework, Google ADK, and 40+ other agent products. A skill written once works across all compatible agents.

---

## 2. Why this abstraction exists

Base LLMs are generalists. Real work requires procedural knowledge, organizational context, and repeatable workflows. Every prior alternative had a failure mode:

| Approach | Problem |
|---|---|
| Stuff it into the system prompt | Always loaded → context bloat at scale |
| Re-paste instructions each session | No version control, no consistency |
| Fine-tuning | Slow, expensive, opaque, vendor-locked |
| MCP servers alone | Give the agent tools but no workflows for using them |

Skills solve four problems at once:

- **Context efficiency** — instructions load only when relevant
- **Repeatability** — multi-step procedures become auditable workflows
- **Composability** — multiple skills combine at runtime per task
- **Portability** — same files work across vendors and surfaces

Mental model: skills are to LLMs what man pages, runbooks, and team handbooks are to engineers — reference material loaded into working memory only when the task demands it.

---

## 3. How they work — progressive disclosure

The architectural core. Three-stage loading:

**Level 1 — Discovery (~100 tokens per skill, always in context):**
Only `name` + `description` from frontmatter are injected into the system prompt at startup. Agent knows the skill exists and when it applies. You can install dozens of skills with negligible overhead.

**Level 2 — Activation (<5,000 tokens, loaded on match):**
When the user's request matches a skill's description, the agent reads the full `SKILL.md` body into context.

**Level 3 — Execution (unbounded, on demand):**
The agent reads referenced files (`references/foo.md`) or runs scripts (`scripts/validate.py`) only as needed. Scripts can execute without their source being loaded into context at all.

This is why bundled content has no practical limit. Files don't consume tokens until accessed.

---

## 4. SKILL.md anatomy

```markdown
---
name: skill-name
description: What this skill does AND when to use it. Include trigger phrases the user will say.
---

# Skill Name

## Quick start
[Minimal working example]

## Workflow
[Step-by-step procedure with checklists]

## Output format
[What the user/agent should expect back]

## Advanced
[Link to references/ for rarely-needed detail]
```

Frontmatter constraints:
- `name` is lowercase, hyphens only, 1–64 chars, **exactly matches the parent folder name**
- Avoid `<` and `>` in frontmatter (they can inject into the system prompt)
- Invalid YAML silently prevents loading

Optional standard fields:
- `disable-model-invocation: true` — stops the agent from auto-loading the skill based on the conversation; it can only be triggered manually (e.g. `/skill-name`). Now a standard Agent Skills spec field, so it works across spec-compliant clients (Claude Code, Copilot, etc.), not just Claude. Caveat: it prevents auto-invocation, but some clients (Claude Code, open bug) still inject the `description` into context, so it doesn't always save the discovery-level tokens. Use for manual-only utilities you don't want firing automatically.

---

## 5. Two design philosophies

Skills tend to fall into one of two patterns. Both are valid; they solve different problems.

### Pattern A — Capability primitives (tool wrappers)
The skill is a thin wrapper over a deterministic CLI or script. Logic lives in code. SKILL.md teaches the agent how to invoke it.

- **Adds**: new capabilities (search, email, browser, API access)
- **Reliability via**: shell tools, not prompts
- **Typical length**: 30–80 lines, mostly command examples
- **Use when**: the bottleneck is "the agent can't do X"

### Pattern B — Process primitives (cognitive disciplines)
The skill encodes a methodology the agent should follow. Pure prompt engineering — no scripts needed.

- **Adds**: structured workflows (TDD, code review, design alignment, debugging loops)
- **Reliability via**: explicit procedure, checklists, validation loops
- **Use when**: the bottleneck is "the agent's output quality or process is bad"

A mature setup uses both. Pattern A gives the agent better tools. Pattern B gives it better methods for using them.

---

## 6. How to write effective skills — do this

### Description as routing contract
The description is the only thing the agent sees before deciding to load the skill. If your skill doesn't trigger, the description is wrong 95% of the time, not the body.

Include three elements:
1. **What** the skill does (one phrase)
2. **When** to use it (trigger phrases, situations)
3. **Differentiator** vs related skills (prevents routing conflicts)

Pattern: `"X via Y. Use for [situations]. [Differentiator: no Z required / faster than W / handles edge case V]."`

**Never summarize the full workflow in the description.** If the description contains a step-by-step summary of *how* the skill works, the agent tends to follow that summary and skip loading the body. Describe *what* and *when*, never *how*. The description answers "should I open this skill now?" — not "what are the steps?"

### Keep SKILL.md lean
- Beyond a certain length, you're usually encoding logic that should be in a script or referenced file

### Bash-first, prose-second
Concrete command examples with inline comments beat prose explanations. The agent pattern-matches on syntax. Show, don't describe.

### Push determinism into code
Anything fragile, repetitive, or where variation is a bug → script. Use markdown only for tasks requiring judgment.

### Match strictness to task fragility (degrees of freedom)
Scale instruction rigidity to how costly a wrong move is:
- **Loose natural-language heuristics** when many approaches are valid (e.g. code review).
- **Pseudocode or templates** when there's a preferred pattern but variation is acceptable (e.g. report format).
- **Exact scripts and strict step lists** when the workflow is fragile, error-prone, or consistency-critical (e.g. migrations, document patching).

### Build validation loops
The single biggest output quality improvement: state a verify → fix → re-verify loop explicitly.

- Document skills: visual QA pass before delivery
- Code skills: tests pass + zero type errors before completion
- Data skills: schema validation before output

### State-check before action
Don't assume setup is done. Instruct the agent to verify state, then branch:
```
First check if X is configured: [command]
If not, walk the user through setup: [steps]
```

### Just-in-time loading with explicit pointers
Tell the agent exactly when to read each referenced file:
```
For standard cases, follow the steps below.
For [specific edge case], read references/edge-cases.md first.
```

### Keep references one level deep
Link referenced files directly from SKILL.md. Never build chains (SKILL.md → advanced.md → details.md → actual.md) — the agent may preview nested files only partially and miss critical instructions. Add a table of contents to any reference file longer than 100 lines.

### Document output formats
If your script returns structured data, show the agent what it looks like. Enables reliable downstream parsing.

### Defer to --help for completeness
List the 80% common operations in SKILL.md. Tell the agent to run `tool --help` for the rest. Keeps SKILL.md small without losing functionality.

### Compose primitives, don't bundle workflows
One skill = one capability or one discipline. Resist bundling concerns into "the X workflow." Multiple small skills combine at runtime; one large skill is rigid.

### Cite established principles when applicable
If your skill encodes a known engineering methodology (TDD, DDD, red-green-refactor), name the source. Gives the agent a coherent model to align with and gives users a way to verify the design.

### Persistent artifacts for cross-session memory
Skills can write to repo-level files (CONTEXT.md, ADRs, decision logs) that future agent sessions read. This is how you fight the "agents have no memory" problem at the architecture level.

---

## 7. What not to do — anti-patterns

### Don't re-teach what the model already knows
Every line in SKILL.md should provide context the model doesn't already have. No Python syntax tutorials. No "what is git." Challenge every paragraph.

### Don't include human-facing docs
No README.md, no CHANGELOG.md, no INSTALLATION_GUIDE.md inside the skill folder. Skills are for agents.

### Don't write vague descriptions
- Bad: "A helpful skill for documents"
- Good: "Fill PDF form fields, extract form data, flatten completed PDFs. Use when the user mentions PDF forms, fillable forms, or programmatic field population."

### Don't bundle library code
If you need a parsing library, install via npm/pip. Don't paste source into the skill.

### Don't write monolithic mega-skills
If one skill does design + planning + implementation + testing + deployment, you've built a framework, not a skill. Split it.

### Don't assume the agent will infer
Be explicit about every step that matters.
- Bad: "Then deploy it."
- Good: "Run `npm run deploy:staging` and wait for HTTP 200 from /healthz before reporting success."

### Don't write style-only variants
A skill that just changes tone or formatting belongs in user preferences or a system prompt, not a skill.

### Don't ignore failure modes
For every workflow step that can fail, document what failure looks like and what to do. Happy-path-only skills break in production.

### Don't include time-sensitive information
"As of Q4 2024..." rots fast. Fetch live data via script or omit.

### Don't use absolute paths
Always relative. Forward slashes regardless of OS. Use runtime placeholders for skill-directory references.

### Don't trust unfamiliar skills
Skills can execute arbitrary code and steer agent behavior. A malicious skill is a data exfiltration vector. Audit `scripts/` for unexpected network calls, file access outside expected scope, or hidden instructions in references. Watch for typosquatted skill names. Sandbox execution environments.

---

## 8. Authoring workflow

1. **Identify the gap.** Run your agent on real tasks. Where does it consistently fail or need re-prompting? That's a skill candidate.
2. **Decide the pattern.** Capability primitive (need new tools) or process primitive (need better methodology)?
3. **Draft the description first.** What + when + differentiator. Read it back: would the agent know when to fire it?
4. **Write the smallest body that works.** Add only when testing reveals gaps.
5. **Move detail to references/ once SKILL.md grows too long.**
6. **Test triggering.** Ask the agent something the skill should handle without invoking it explicitly. If it doesn't fire, fix the description.
7. **Test execution.** Invoke explicitly. If output is wrong, fix the body.
8. **Adversarial test.** Have another LLM ask: "What edge cases break this skill?" Patch the gaps.
9. **Version control.** Treat skills as code. Tag, branch, review.

---

## 9. Testing and debugging

- **"Which skill did you use?"** — ask the agent post-task. Fastest routing debug.
- **Routing fails → description problem.** Add specific trigger phrases.
- **Execution fails → body problem.** Add explicit steps, examples, or validation.
- **Skills snapshot at session start.** Edits during a session require a restart.
- **Test against the weakest model you'll deploy on.** Stronger models forgive vague skills; weaker models expose them.
- **Run an eval suite.** A handful of representative prompts that should and shouldn't trigger the skill, with expected outputs.

---

## 10. Composition

Skills compose at runtime — the agent loads multiple skills as needed for a single task. Design for this:

- **One skill = one concern.** Resist bundling.
- **Define interfaces between skills.** If skill A produces artifacts that skill B consumes, document the shape.
- **Use a repo-level config substrate.** A shared file (e.g., AGENTS.md, CONTEXT.md, settings.json) that multiple skills read and write coordinates them without explicit handoffs.
- **Loops over menus.** A coordinated set of skills forming a workflow (align → spec → build → verify → refactor) drives adoption far better than an unrelated catalog of capabilities.

---

## 11. Security checklist

Before installing any third-party skill:

- Read every file in the folder
- Audit `scripts/` for outbound network calls, file access outside expected scope, command execution
- Check references for prompt injection ("ignore previous instructions...")
- Verify the skill name isn't typosquatting a popular one
- Run in a sandboxed environment first
- Pin to a specific version/commit, not `latest`

---

## 12. Ship checklist

Before publishing a skill:

- [ ] Frontmatter `name` matches folder name
- [ ] Description includes what + when + differentiator
- [ ] Description includes likely user trigger phrases
- [ ] No human-facing docs inside the skill folder
- [ ] No time-sensitive information
- [ ] Relative paths only
- [ ] State-check before action where applicable
- [ ] Validation loop documented
- [ ] Output format documented if relevant
- [ ] Tested with weak and strong models
- [ ] Tested for both correct triggering and correct execution
- [ ] Skill does one thing
- [ ] Composes cleanly with related skills
- [ ] Version controlled

---

## 13. First principles, compressed

1. **The description routes; the body executes.** Get both right independently.
2. **Tokens are scarce; files are cheap.** Push detail out of context until it's needed.
3. **Determinism comes from code; judgment comes from prompts.** Put each in its right place.
4. **One skill, one concern.** Composition beats bundling.
5. **Agents have no memory.** Use persistent artifacts to give them one.
6. **The model knows a lot.** Don't re-teach. Only add what's missing.
7. **Validate before completing.** Self-correction loops dominate output quality.
8. **Skills are code.** Version, test, audit, and review them as such.

## Limitations

- Adapted from `davidondrej/skills`; verify local paths, tools, credentials, and agent features before acting.
- For commands, remote access, scheduling, browser automation, or file-changing workflows, get explicit user approval and confirm the target environment first.
