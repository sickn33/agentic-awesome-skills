# Details (moved from SKILL.md)

> Extended reference content for `runbook-creation`, kept under `references/` so the entrypoint stays within the audit budget.

## Versioning Strategy

```yaml
versioning:
  storage: "Git repository — one directory per service, one file per runbook"
  naming: "runbooks/<service>/<operation>.md"
  branching: "PRs required for all changes; reviewed by service owner"

  version_scheme:
    format: "MAJOR.MINOR"
    major_bump: "Procedure changes that alter the steps or their order"
    minor_bump: "Clarifications, typo fixes, updated contact info"

  directory_layout: |
    runbooks/
      api-server/
        deploy.md
        rollback.md
        scale-up.md
      database/
        failover.md
        backup-restore.md
        vacuum-maintenance.md
      infrastructure/
        dns-update.md
        certificate-renewal.md
        disk-cleanup.md

  review_requirements:
    - PR must be approved by the service owner
    - CI must pass (shellcheck for scripts, markdown lint)
    - Reviewer confirms they can follow the steps independently

  retention: "Git history serves as full audit trail — never delete old versions"
```


## Runbook Index Template

Keep a top-level index so engineers can find the right runbook quickly.

```markdown
# Runbook Index

| Service | Runbook | Severity | Owner | Last Tested |
|---------|---------|----------|-------|-------------|
| API Server | [Deploy] (api-server/deploy.md) | — | @platform | 2025-05-01 |
| API Server | [Rollback] (api-server/rollback.md) | SEV1 | @platform | 2025-05-01 |
| Database | [Failover] (database/failover.md) | SEV1 | @dba | 2025-04-15 |
| Database | [Backup Restore] (database/backup-restore.md) | SEV2 | @dba | 2025-04-15 |
| Infra | [DNS Update] (infrastructure/dns-update.md) | SEV2 | @sre | 2025-06-01 |
| Infra | [Cert Renewal] (infrastructure/certificate-renewal.md) | SEV3 | @sre | 2025-06-01 |
```


## Best Practices

- Write runbooks for the engineer at 3 AM — clear, sequential, copy-pasteable
- Include expected output so the operator knows if a step succeeded
- Always provide a rollback path; every action should be reversible
- Test runbooks in staging before they are needed in production
- Keep runbooks in version control alongside the code they support
- Assign an owner to every runbook; ownerless runbooks rot fast
- After every incident, update the relevant runbook with lessons learned
- Automate repetitive runbook steps into scripts, but keep the runbook as
  the orchestration guide so operators understand the "why"

