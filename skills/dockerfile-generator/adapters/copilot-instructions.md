# Dockerfile generation with Docker File Generator

Use the repository-local skill at `.github/skills/dockerfile-generator/` when
the user asks to containerize a project, create or refresh a Dockerfile,
generate `compose.yaml`, or add Dockerfiles to a monorepo.

Preferred commands:

```bash
# Preview; write nothing
bash .github/skills/dockerfile-generator/scripts/generate.sh --dry-run

# Fast Dockerfile-1-only pass
bash .github/skills/dockerfile-generator/scripts/generate.sh --no-dockerfile-2 --fast

# Full generated output
bash .github/skills/dockerfile-generator/scripts/generate.sh
```

Before running against an existing project, check for `Dockerfile-1`,
`Dockerfile-2`, `.dockerignore*`, or `compose.yaml`. Do not replace a
hand-written Dockerfile without confirming the change with the user. Inspect the
generated files afterward and run `--check` when appropriate.

Do not edit the skill's `vendor/` directory; it is a pinned runtime snapshot.
This fallback is for older Copilot setups. Current Copilot releases can load the
native `.github/skills/dockerfile-generator/SKILL.md` directly.
