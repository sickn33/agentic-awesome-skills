# Production Code Audit - Detailed Guide

> This file contains the detailed procedure and reference material extracted from `SKILL.md` for focused loading. The root skill defines activation, examples, safety constraints, and limitations.

## Scope and Workflow

1. Resolve repository instructions, requested audit versus implementation intent, exact base/head and target environment. Inventory tracked source/config/docs, entrypoints and dependencies. Read every in-scope file completely; record binary/generated/vendor exclusions and unavailable material. Do not print secrets or read unrelated private files to claim whole-codebase coverage.
2. Trace behavior across callers, boundaries, persistence and error paths. For each hypothesis, identify a concrete trigger and evidence. Line counts, TODOs, coverage percentages, missing caches or dependency cycles are prompts for investigation, not automatic defects.
3. Prioritize correctness, authorization, data loss and confirmed exposure. Document risk and a minimal repair. For an audit-only request, deliver findings; when repairs are requested, implement scoped reversible fixes and preserve product behavior.
4. Test meaningful affected paths using isolated synthetic fixtures. Inspect repository scripts/plugins before running untrusted code; no production secrets. Record commands, results and head. Check negative/denied cases for access-control changes and compare realistic workloads for performance changes.
5. Report files read, concrete findings, changes, actual validation and remaining risks. A passing test suite or security scan does not establish production readiness of untested infrastructure or dependencies. Do not invent grades, counts, performance or coverage deltas.

## Repair Decisions

- Parameterize database queries with the actual driver and assess authorization separately.
- Removing a hardcoded secret requires owner-managed rotation/revocation; never echo the secret.
- Password-hash migration needs existing-user compatibility and a verified upgrade/reset path; replacing MD5 with bcrypt in one line can lock users out. Select a current supported KDF under the project’s requirements.
- Validate allowed fields at trust boundaries. Never store a raw password because a schema accepted it; hash through the existing credential service and avoid logging sensitive bodies.
- Add indexes only from query-plan/workload evidence, with migration/locking/cost assessment. Add caching only with defined key scope, invalidation and privacy behavior.
- Authentication middleware is incomplete without object/tenant authorization and session/token validation.
- Existing event buses or durable workflows do not remove external side-effect transaction gaps; preserve idempotency and recovery behavior.
- Monitoring, error trackers, Redis, CI and cloud changes are architectural/operational choices with cost/data effects. Prepare a concrete proposal and implement only within the authorized scope, rather than adding them as generic “enterprise” polish.

## Readiness Criteria

Use criteria agreed for the application: target workload/SLO, supported runtime/dependencies, tested critical and denied paths, data migration/backup/recovery, secrets and access controls, operational ownership and rollback. Treat fixed 200ms, 200KB or 80% coverage numbers as possible local targets, not universal production standards. Readiness remains conditional on observed evidence and unresolved dependencies.

## Common Pitfalls

### Problem: Too Many Issues
**Symptoms:** Team paralyzed by 200+ issues
**Solution:** Focus on critical/high priority only, create sprints

### Problem: False Positives
**Symptoms:** Flagging non-issues
**Solution:** Understand context, verify manually, ask developers

### Problem: No Follow-Up
**Symptoms:** Audit report ignored
**Solution:** Deliver prioritized follow-up drafts; publish/assign only with authorization


## Audit Report Template

```markdown
# Scoped Production Audit
Project and exact base/head:
Purpose and requested scope:
Files fully read / excluded / unavailable:

Findings (ordered by justified impact):
- File:line; trigger; evidence; effect; confidence; minimal fix.

Changes made:
- Behavior changed and compatibility considerations.

Validation:
- Environment, command, result and evidence location.
- Tests or deployment surfaces not checked.

Remaining risks and owner actions:
- Specific blockers, proposed next steps and what would verify them.
```

Do not publish issues, assign people or schedule recurring audits merely because this template recommends follow-up; prepare drafts unless those external actions are authorized.

## Related Skills

- `@code-review-checklist` - Code review guidelines
- `@api-security-best-practices` - API security patterns
- `@web-performance-optimization` - Performance optimization
- `@systematic-debugging` - Debug production issues
- `@senior-architect` - Architecture patterns


## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Google Engineering Practices](https://google.github.io/eng-practices/)
- [SonarQube Quality Gates](https://docs.sonarqube.org/latest/user-guide/quality-gates/)
- [Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Pro Tip:** Schedule regular audits (quarterly) to maintain code quality. Prevention is cheaper than fixing production bugs!
