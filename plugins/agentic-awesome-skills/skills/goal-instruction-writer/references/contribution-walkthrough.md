# Contribution walkthrough

- Import Goal Instruction Writer from public commit `1e5d106a2092c1ab8ab4f2f5836cf85167d1b3e7` under its MIT license.
- Preserve all four supporting references and the MIT license; add catalog frontmatter, activation boundaries, examples, limitations, and provenance.
- Omit the optional Codex `agents/openai.yaml` interface and invocation metadata from this catalog copy to comply with the ordinary fork-intake path policy. The canonical upstream package retains that file; the instruction body and four supporting references are unchanged by this packaging adjustment.
- Keep this contribution walkthrough under `references/`, an allowed support directory. This adaptation does not change the repository's intake rules or request a policy exception.
- Complement `goal-loop`: this skill designs and audits the instruction contract, including preview branches, proportional verification, and scheduled-wait checkpoints. Host loop operation remains outside this package.
- [English cases and evidence limits](https://github.com/wu736139669/goal-instruction-writer/blob/main/docs/cases/README.md).
- Waiting/resumption remains documented intent pending a live wait/resume test. No scheduler or new execution authority is added.
