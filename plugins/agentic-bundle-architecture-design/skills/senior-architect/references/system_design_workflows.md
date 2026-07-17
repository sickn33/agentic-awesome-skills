# System Design and Deployment Review

## Review sequence

1. Confirm scope, owners, users, sensitive data, dependencies, and success criteria.
2. Draw current and proposed boundaries and flows; mark trust and failure boundaries.
3. Test the design against peak load, dependency failure, partial rollout, stale data, privilege abuse, and recovery scenarios.
4. Record assumptions, evidence, alternatives, unresolved decisions, and validation work.

## Mutation gate

Before a write, migration, or deployment, require all of the following:

- exact repository, account, environment, cluster context, and namespace;
- authorization and explicit approval for the exact change;
- reviewed diff or dry-run plan with unrelated resources excluded;
- backup or reversible migration, rollback commands, owner, and abort signals;
- relevant tests and security checks with recorded results;
- post-change health checks and an evidence record.

If any item is missing, stop at a review plan. Access to a repository, credential, or cluster is not approval to mutate it.
