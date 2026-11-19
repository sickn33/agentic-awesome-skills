# Migrate

1. Confirm the mode. Audit unless the ask names the migration or the person replied `Go, <budget>`.
2. Confirm the readiness audits from `design-how-build-design-system` hold. If they do not, stop at the audit and list the open rows.
3. Run `design-how-migrate-design-system` through its steps. In audit mode it writes only under `.design-system/`, commits nothing and ends at the plan and the offer.
4. Brief every worker with its MAY EDIT list and the lessons that apply (`design-how-migrate-design-system`, lessons).
5. Judge each return from `git diff` and its verdict file, never from its message. A verdict counts only from an agent that did not write the code.
6. At close, run the correct step and the comment review. Triage again with `legacy.mjs --inventory`.
7. Report unanswered defaults first, then counts from commands, then a ranked table of what was found and not fixed.

Done when `legacy.mjs --zero` exits 0 at the final commit, every surface is `verified` at that commit, and the correct step has run. Audit mode is done at step 3.
