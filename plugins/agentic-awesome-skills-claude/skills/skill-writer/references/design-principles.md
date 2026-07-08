# Design Principles

## Write for agent behavior

- Use imperative instructions that tell the agent what to do.
- Put trigger language in the frontmatter description, not only in the body.
- Keep SKILL.md as a navigation layer when the skill has many modes.
- Put optional depth, examples, rubrics, and tool-specific details in references.

## Keep the context budget healthy

- Prefer checklists, tables, and short decision rules over long essays.
- Do not duplicate the same rule in SKILL.md and references unless it is a safety-critical reminder.
- Include only files the agent may actually load during work.

## Balance depth and concision

- Add detail where mistakes are costly, repeated, or hard to detect.
- Compress detail where the model already has general knowledge.
- Make every required artifact explicit: files, commands, reports, comments, commits, or validation outputs.

## Safety and provenance

- Label risky, destructive, credential-handling, financial, medical, legal, or security guidance clearly.
- Preserve source provenance when adapting external content.
- Prefer safe commands and explicit prerequisites over remote execution shortcuts.
