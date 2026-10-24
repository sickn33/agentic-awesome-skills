---
name: autonomous-agent-patterns
description: "Design patterns for building autonomous coding agents, inspired by [Cline](https://github.com/cline/cline) and [OpenAI Codex](https://github.com/openai/codex)."
risk: critical
source: community
date_added: "2026-02-27"
---

# 🕹️ Autonomous Agent Patterns

> Design patterns for building autonomous coding agents, inspired by [Cline](https://github.com/cline/cline) and [OpenAI Codex](https://github.com/openai/codex).

## Detailed Guide

Read [the detailed guide](references/detailed-guide.md) before executing this skill. It retains the complete procedure and reference material. Treat its safety, prerequisites, and validation requirements as mandatory. For focused work, load the relevant sections; for end-to-end work, read the guide completely.

## When to Use This Skill

Use this skill when:

- Building autonomous AI agents
- Designing tool/function calling APIs
- Implementing permission and approval systems
- Creating browser automation for agents
- Designing human-in-the-loop workflows

---

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.

## Authorization and implementation limits

These classes are conceptual fragments with missing imports/types/adapters/helpers, not working Cline/Codex/MCP implementations. response.to_history_message is an adapter contract to implement for the actual provider, not a standard SDK method. MCP clients need an actual transport/session and lifecycle; the Server(config) sketch is not a valid client handshake. Generated server code stays inert until reviewed.

Tool-name session approval authorizes too broadly: bind authorization to the concrete action, target, data and limits, reusing existing user authorization within scope. Read tools can expose secrets, and npm/python/node/git can execute arbitrary code; allowlisting their names or setting cwd/HOME does not sandbox them. Enforce filesystem/network/process boundaries outside model control, reject escaping/symlink paths, validate schemas and budget all tool/LLM calls and outputs. Approval UI and substring command checks alone provide no security boundary.

File edits need original-content conflict checks and atomic safe replacement; checkpoints require validated session IDs, private atomic files and a real workspace snapshot/restore strategy. Git status/ref alone cannot restore uncommitted content. Bound file sizes/context, exclude credentials and mark external content as untrusted data. Browser TreeWalker text is not an accessibility tree or guaranteed visible text; networkidle and approximate coordinates do not establish action correctness. Use current observed UI targets and verify results. No agent, tool, browser or generated server ran during review.
