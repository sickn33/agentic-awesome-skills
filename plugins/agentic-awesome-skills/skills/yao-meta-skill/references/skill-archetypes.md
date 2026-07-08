# Skill Archetypes

Use these archetypes to decide what kind of skill you are building before you decide how many files or gates to add.

## Scaffold

Purpose:

- quick packaging for a real but still exploratory workflow

Default assets:

- `SKILL.md`
- `agents/interface.yaml`

Use when:

- reuse is plausible but not proven
- failure cost is low
- the workflow is still changing

## Production

Purpose:

- compact skill for team reuse

Default assets:

- lean `SKILL.md`
- `agents/interface.yaml`
- selective `references/`
- selective `evals/`

Use when:

- route mistakes waste team time
- a checklist or focused script improves reliability

## Library

Purpose:

- shared capability with visible evidence and portability expectations

Default assets:

- route evals
- packaging checks
- manifest metadata
- public reports

Use when:

- the skill will be reused across teams or clients
- the skill is likely to have near-neighbor route collisions

## Governed

Purpose:

- high-trust skill with explicit ownership and review

Default assets:

- lifecycle metadata
- governance score
- review cadence
- regression history
- governed examples or policy references

Use when:

- the skill is operationally sensitive
- the skill influences incident, release, compliance, or organizational standards

## Anti-Archetypes

Do not force a request into a skill archetype when it is really:

- a one-off answer
- a document
- a brainstorm
- an implementation task with no reusable process

See [Non-Skill Decision Tree](non-skill-decision-tree.md).
