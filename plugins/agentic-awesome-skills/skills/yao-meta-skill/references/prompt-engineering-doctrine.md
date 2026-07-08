# Prompt Engineering Doctrine

Use this doctrine when a skill creates, improves, audits, or relies on prompts, role instructions, conversation scripts, writing systems, teaching guides, analysis instructions, or reusable task templates.

## Principle

Prompt quality is a skill-design input, not a long prompt to paste into `SKILL.md`.

The useful abstraction is not a fixed RTF template. The useful abstraction is a compact reasoning layer:

- understand the real need behind the request
- choose the right task type and complexity
- map role, task, and format into skill structure
- score the prompt-facing behavior before the skill is treated as reusable

## Need Model

Before writing a prompt-heavy skill, identify:

- explicit need: what the user clearly asked for
- implicit need: what the context suggests but the user did not name
- scenario: where and how the output will be used
- user level: beginner, practitioner, expert, reviewer, or operator
- success standard: what proves the output worked

If any of these change the package boundary, ask one focused clarification. If they only affect implementation detail, record the assumption in a report instead of interrupting the user.

## Task Families

- creative generation: content, ideas, campaigns, variants, concepts
- analytical reasoning: diagnosis, comparison, synthesis, decision support
- execution operation: workflow steps, task completion, standardized operations
- teaching guidance: explanation, curriculum, walkthrough, coaching
- dialogue interaction: support, interview, roleplay, discovery, coaching
- prompt engineering: prompt creation, prompt improvement, prompt review, prompt libraries

## Complexity

- simple: one output, few constraints, low ambiguity
- medium: multiple steps, some judgment, moderate standards
- complex: multiple inputs, tradeoffs, high-quality output expectations
- expert: domain expertise, evaluation, governance, or safety-sensitive use

Complexity should control how much structure is added. It should not justify bloating the entrypoint.

## RTF To Skill Mapping

| Prompt Layer | Skill Layer | Reviewer Question |
| --- | --- | --- |
| Role | operating stance, expertise, tone | Does the agent identity match the job and user level? |
| Task | workflow, gates, scripts, references | Are the steps executable and verifiable? |
| Format | output contract, examples, reports | Is the hand-back useful, readable, and testable? |

## Quality Matrix

Score prompt-facing behavior on:

- completeness: enough context, constraints, and outputs are specified
- clarity: wording is unambiguous and easy to execute
- consistency: role, task, format, examples, and boundaries agree
- practicality: the output can be used without hidden assumptions
- specificity: language fits the user's domain instead of generic prompt jargon

Treat innovation as optional. A reusable skill should first be clear, reliable, and specific.

## Anti-Patterns

- copying a full meta-prompt into `SKILL.md`
- adding an elaborate persona when the workflow only needs a narrow capability
- asking the user for every possible field instead of the few fields that change design
- producing a polished prompt that lacks tests, examples, or output checks
- using RTF labels as decoration without tying them to skill behavior

## Reviewer Rule

For prompt-heavy skills, reviewers should see the need model, task family, complexity, RTF-to-skill mapping, and quality matrix. If those are absent, the package may still run but its prompt behavior is not governed.
