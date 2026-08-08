# Pre-release Review Checklist

Use this checklist to find production release risks from a PR or git diff. Report only categories
with confirmed problems or plausible risks that need confirmation.

## Database and data changes

- Schema or ORM model changes without corresponding migration files.
- New columns, enums, constraints, indexes, partitions, triggers, functions, or extensions that need
  deploy-time DDL.
- Destructive migrations, column renames, type changes, constraint tightening, or data rewrites
  without backward-compatible rollout or rollback notes.
- New required data without seed, backfill, admin setup, or one-time SQL.
- Index changes that may lock large tables or need concurrent/online creation.
- Query changes that depend on data shape not guaranteed in production.
- Migration files present but not referenced by the deploy system or migration runner.

## Environment and configuration

- New env var, config key, feature flag, secret name, or runtime option without example/default,
  deployment platform update, or CI/CD secret update.
- Config key rename/removal that may break existing production variables.
- Code that reads production-only values without validation or safe failure behavior.
- Feature flags without documented default state, owner, rollout plan, or kill switch.
- Docker, Kubernetes, Helm, Terraform, Railway, Vercel, GitHub Actions, or similar deploy config
  changes that require manual environment changes.

## Security and sensitive material

- Private keys, tokens, passwords, certificates, cookies, `.pem`, `.key`, `.p12`, `.env`, service
  account JSON, or cloud credentials added to the diff.
- Logs, errors, analytics, webhooks, or traces that may expose PII, tokens, session IDs, or payment
  data.
- Debug endpoints, admin bypasses, permissive CORS, disabled auth, relaxed TLS, or temporary
  development flags.
- IAM, ACL, bucket policy, database role, queue permission, webhook signature, or API key scope
  changes without release coordination.
- Dependency or container changes with known security-sensitive behavior, native binaries, or
  postinstall scripts.

## Cache, CDN, and derived state

- Redis key format, namespace, TTL, serialization, or value shape changes without invalidation or
  backward compatibility.
- Code that assumes warmed cache, precomputed data, materialized views, search indexes, or derived
  tables exist.
- CDN/static asset paths, cache headers, ETags, versioning, or purge requirements changed.
- Rollout can serve mixed old/new cache values during a partial deploy.
- Feature removal leaves stale cache keys that can revive old behavior.

## Queues, events, and schedulers

- New topic, queue, routing key, exchange, subscription, event type, cron job, or scheduled worker.
- Producer and consumer contract changes without compatible deployment order.
- Missing DLQ, retry policy, idempotency, dedupe key, or poison-message handling.
- Worker concurrency, timeout, rate limit, or backpressure changes that may overload dependencies.
- Event payload shape changes without versioning or old-consumer compatibility.

## External services and assets

- New object storage, CDN, S3, OSS, GCS, or static asset references without upload or permissions
  confirmation.
- Email, SMS, push, PDF, image, translation, or notification templates changed without production
  material update.
- Webhook URL, callback domain, redirect URI, CORS origin, OAuth app, payment provider, or third
  party whitelist changes.
- New cloud resource, bucket, DNS record, certificate, API product, SaaS setting, or quota need.
- Frontend build assets depend on backend routes or config that are not deployed yet.

## Service dependencies and deployment order

- API contract changes affecting web, mobile, workers, indexers, schedulers, or third parties.
- Database migration must run before or after specific service versions.
- Worker should be paused, drained, or deployed after producers.
- Read/write compatibility risks during rolling deploys.
- New background jobs, queues, or cache consumers need infrastructure before application deploy.
- Rollback would be unsafe because schema, data, cache, or queue payloads are not backward
  compatible.

## CI/CD and release automation

- Workflow, Dockerfile, build script, deploy script, package manager, lockfile, or artifact path
  changed.
- Required build-time env var, secret, binary, system package, or runtime version changed.
- Tag/release workflow depends on files or outputs not updated in the diff.
- Migration, seed, asset upload, or cache purge step is manual but not documented.
- Tests, linters, or type checks disabled or narrowed for release-critical code.

## Observability and operations

- New critical path without logs, metrics, traces, health checks, dashboards, or alerts.
- Error handling changed without actionable logs or rollback signal.
- Runbook, release checklist, incident response, or support notes missing for operational changes.
- Kill switch, feature flag, or emergency disable path absent for risky functionality.
- SLO, rate limit, quota, or capacity implication not addressed.

## Reportable "unable to verify" cases

- Remote PR diff cannot be fetched.
- Release tag cannot be found and the audit fell back to recent commits.
- Deployment platform config, production secrets, cloud buckets, queues, or external SaaS settings
  are not accessible from the local repository.
- Owner cannot be inferred from blame/log evidence.
- Diff is too large to inspect fully within the available time or tool limits.
