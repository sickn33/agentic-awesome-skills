---
name: pre-ship-gate
description: "A ship gate that runs before any production deploy: checks the silent failure modes that make a deploy 'succeed' while prod stays broken, then verifies the live revision instead of trusting deploy output."
category: quality
risk: safe
source: community
source_repo: Sharrmavishal/operating-kit
source_type: community
date_added: "2026-07-07"
author: Sharrmavishal
tags: [deployment, quality-gate, verification, ci-cd, production]
tools: [claude, cursor, gemini]
license: MIT
license_source: "https://github.com/Sharrmavishal/operating-kit/blob/main/LICENSE"
---

# Pre-Ship Gate

## Overview

Most bad deploys do not fail loudly. The pipeline goes green, the CLI prints "deployed", and the old or broken version is still what users hit. This skill is the gate you run right before a production deploy and right after, so an agent stops trusting deploy output and starts confirming what is actually live. It exists because "the deploy command exited 0" and "the new version is serving traffic" are two different facts, and agents routinely confuse them.

## When to Use This Skill

- Use before running any command that pushes to a production or staging environment.
- Use when an agent is about to report "shipped", "deployed", or "live".
- Use when a deploy reported success but users still see the old behavior.
- Use when a release involves database migrations, feature flags, or a staged rollout.

## How It Works

The gate has three phases. Do not skip to phase 3.

### Phase 1: Pre-flight (before the deploy runs)

Walk the silent failure catalog. These are the modes that let a deploy "succeed" while production stays broken. For each one, confirm it or flag it. Do not assume.

- **Migrations**: Are schema migrations part of this release, and will they run against the target before the new code serves traffic? A deploy that ships code expecting a column that does not exist yet fails silently for users, not for the pipeline.
- **Feature flags**: Is the flag that gates this change actually enabled in the target environment, not just in dev? Shipped code behind an off flag looks like a no-op deploy.
- **Build cache / stale assets**: Could a cached build or CDN layer serve the previous bundle after deploy? Confirm the artifact hash or asset fingerprint changed.
- **Release pointer**: Does the deploy update the symlink, active revision, or traffic pointer, or does it only upload the new build? Uploading is not releasing.
- **Staged rollout / canary**: If traffic is staged, is it stuck at 0 percent or waiting on a manual promote? A canary that never promotes is not a deploy.
- **Env and secrets**: Are the env vars and secrets the new code needs present in the target, not just locally? Missing config surfaces as runtime errors, not deploy errors.

### Phase 2: Run the deploy

The human or the deploy tooling runs the actual command. This skill does not execute the production deploy itself. It gates it.

### Phase 3: Verify live (before saying "shipped")

Confirm the running system, not the deploy log.

- Fetch the live version or revision identifier from the running service and compare it to the one you intended to ship.
- Hit a health or status endpoint and confirm it returns the expected version, not just HTTP 200.
- Tail production logs for the first errors after cutover.
- Only after the live revision matches the intended revision may you report "shipped". If it does not match, report the mismatch, not success.

## Examples

### Example 1: Verifying the live revision instead of trusting the deploy log

```bash
# You intended to ship this commit
INTENDED="$(git rev-parse --short HEAD)"

# Ask the running service what it is actually serving
LIVE="$(curl -fsS https://your-service.example.com/health | jq -r '.revision')"

if [ "$INTENDED" = "$LIVE" ]; then
  echo "Live revision $LIVE matches intended $INTENDED: verified shipped."
else
  echo "MISMATCH: intended $INTENDED but live is $LIVE. Do not report shipped."
fi
```

### Example 2: Pre-flight verdict format an agent can emit

```markdown
PRE-SHIP GATE, verdict: HOLD

- Migrations: 1 pending (add_users_status_col): NOT yet applied to prod. BLOCK.
- Feature flags: new_checkout flag is OFF in prod. Enabling required post-deploy.
- Build assets: new bundle hash confirmed (a1b2c3 != previous 9f8e7d). OK.
- Release pointer: deploy updates active symlink. OK.
- Rollout: canary at 10%, manual promote required. NOTE.
- Env/secrets: STRIPE_KEY present in prod. OK.

Reason for HOLD: run migration add_users_status_col before cutover, or the
new code will 500 on /orders.
```

## Best Practices

- ✅ Treat "the command exited 0" and "the new version is live" as separate facts, and verify the second one.
- ✅ Emit an explicit verdict (SHIP / HOLD) with the failing item named, not a vague "looks good".
- ✅ Compare a live revision identifier against the intended one after every deploy.
- ✅ Name the specific silent failure mode you are worried about, so a human can override with context.
- ❌ Do not report "shipped" from deploy output alone.
- ❌ Do not skip the pre-flight because the pipeline is green.
- ❌ Do not treat a passing health check as proof the right version is live. Check the version field.

## Limitations

- This skill does not run the production deploy for you. It gates and verifies around it.
- It cannot know your environment's exact health or version endpoint. Wire in the real one before relying on the verification phase.
- The silent failure catalog is common cases, not exhaustive. Systems with unusual release mechanics need their own additions.
- It does not replace environment-specific testing, load testing, or expert review.
- Stop and ask for clarification if the target environment, the intended revision, or the verification endpoint is unknown.

## Common Pitfalls

- **Problem:** Health check returns 200 but users still see the old version.
  **Solution:** The check is hitting a cached edge or the old pod. Verify the revision field in the response, not just the status code.
- **Problem:** Migration runs after the new code is already serving traffic.
  **Solution:** Sequence migrations before cutover, or gate the code path behind a flag until the migration lands.
- **Problem:** Deploy "succeeds" but the canary is stuck at 0 percent.
  **Solution:** Confirm the traffic pointer or promotion step, not just the upload step.

## Security & Safety Notes

- This skill is defensive and read-oriented. Its own commands are verification calls (fetching a version endpoint, tailing logs, comparing revisions). It does not itself mutate production.
- The example commands use `curl -fsS` against a status endpoint and are illustrative. Replace the placeholder host and version field with your own before use.
- The actual production deploy is performed by your existing tooling and is out of this skill's scope. Keep human confirmation on the deploy step.
- No credentials or tokens are embedded. Do not paste secrets into health-check URLs.

## Related Skills

- `@codebase-audit-pre-push`: clean and audit the code before it ever reaches a deploy.
- `@dos-verify-done-claims`: verify a "done" claim against git ground truth after the fact.
