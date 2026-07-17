# Full-Stack Change and Deployment Gate

## Change review

1. Define acceptance criteria and affected UI, API, data, job, and integration surfaces.
2. Preview the exact diff and generated or migrated artifacts.
3. Review permissions, input handling, secrets, privacy, compatibility, failure states, and rollback.
4. Run the project's configured formatting, type, test, security, build, and migration checks; record skipped checks as unknown.

## Before mutation or deployment

Require:

- exact repository, account, environment, cluster context, and namespace;
- explicit authorization and approval for the exact change;
- a reviewed dry run, diff, migration plan, or infrastructure plan;
- preservation of unrelated work plus backup or reversible migration steps;
- rollback commands, owner, abort signals, and post-change checks.

If any item is missing, stop after producing a plan. Repository or credential access does not authorize file writes, migrations, package changes, infrastructure changes, or deployment.
