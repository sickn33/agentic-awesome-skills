# Runtime Conformance Method

Runtime conformance turns platform compatibility from a packaging afterthought into a release gate.

## Purpose

Use this check when a skill is packaged for OpenAI, Claude, Agent Skills, VS Code / Copilot, or generic targets. The goal is not to prove that every runtime behaves identically. The goal is to prove that the package exposes enough metadata, files, and degradation notes for each runtime to consume it safely.

## V0 Checks

- `SKILL.md` exists and has frontmatter `name` and `description`.
- `description` stays within the 1024 character limit used by common Agent Skills clients.
- `manifest.json` includes name, version, owner, maturity, status, review cadence, and target platforms.
- `agents/interface.yaml` includes display text, default prompt, activation mode, execution context, trust metadata, adapter targets, and degradation strategy.
- Skill IR exists and matches the frontmatter name and description.
- Resources named by Skill IR are relative paths and resolve inside the package.
- Unsupported or lossy target behavior is represented by a degradation note.

## Reviewer Gate

A reviewer should be able to see a target matrix with pass/fail status, failures, warnings, and artifact paths. Any failed target blocks library, governed, or team-distributed release for that target.
