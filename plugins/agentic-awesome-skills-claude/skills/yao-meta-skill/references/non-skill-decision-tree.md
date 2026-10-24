# Non-Skill Decision Tree

> Catalog scope: this is upstream design guidance. Referenced scripts, commands,
> reports, fixtures and security policies are not bundled here. They describe
> proposed/manual output contracts or a separately reviewed upstream toolchain,
> not verified capabilities of this installation. Do not execute missing or
> unreviewed code, or claim unrun gates passed. Current user scope and host policy
> take precedence; metadata alone grants no runtime permission.


Do not build a skill when the user really wants a direct answer or a lightweight artifact.

## Use A Direct Answer Instead

Prefer a normal response when the job is:

- explain a concept
- summarize a document
- translate text
- brainstorm ideas without packaging
- answer a one-off question

## Use A Document Instead

Prefer a document or note when the output is:

- wiki or knowledge-base content
- a reusable-looking document with no agent execution
- a policy memo
- a handoff note

## Use A Script Instead

Prefer a script without a full skill when:

- the task is deterministic
- routing is not the hard part
- the user wants a utility, not a routed capability

## Promote To A Skill Only When

- the job is recurring
- discoverability matters
- the workflow needs a boundary
- the process benefits from reusable instructions or checks

If there is doubt, start with `Scaffold` and upgrade only after reuse becomes real.
