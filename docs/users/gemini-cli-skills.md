# Gemini CLI Skills

If you are evaluating **Gemini CLI skills** on GitHub, this repository is a strong broad starting point: installable skills, large coverage, and clear onboarding for day-one use.

Antigravity Awesome Skills supports Gemini CLI through the `.gemini/skills/` path and combines general engineering playbooks with specialized skills for AI systems, integrations, infrastructure, testing, product, and growth.

## How to use Antigravity Awesome Skills with Gemini CLI

Install into the Gemini skills path, then ask Gemini to apply one skill at a time to a specific task. This works best when you keep the active set small and choose a clear workflow-oriented skill for the job in front of you.

## Why use this repo for Gemini CLI

- It installs directly into the expected Gemini skills path.
- It includes both core software engineering skills and deeper agent/LLM-oriented skills.
- It helps new users get started with bundles and workflows rather than forcing a cold start from 1,433+ files.
- It is useful whether you want a broad internal skill library or a single repo to test many workflows quickly.

## Install Gemini CLI Skills

```bash
npx antigravity-awesome-skills --gemini
```

### Verify the install

```bash
test -d .gemini/skills || test -d ~/.gemini/skills
```

## Best starter skills for Gemini CLI

- [`brainstorming`](../../skills/brainstorming/): turn vague goals into clearer implementation specs.
- [`prompt-engineering`](../../skills/prompt-engineering/): improve prompting quality and task framing.
- [`rag-engineer`](../../skills/rag-engineer/): build and evaluate retrieval systems.
- [`langgraph`](../../skills/langgraph/): design stateful agent workflows.
- [`mcp-builder`](../../skills/mcp-builder/): add tool integrations and external capabilities.

## Example Gemini CLI prompts

```text
Use @prompt-engineering to improve this system prompt for a coding assistant.
```

```text
Use @langgraph to design a stateful agent workflow for support triage.
```

```text
Use @mcp-builder to plan the tools needed for a GitHub + Slack integration.
```

## What to do next

- Start with [`bundles.md`](bundles.md) if you want a smaller curated subset by role.
- Read [`ai-agent-skills.md`](ai-agent-skills.md) if you are comparing general-purpose agent skill libraries.
- Use [`usage.md`](usage.md) if you want more examples of how to invoke skills in real prompts.
