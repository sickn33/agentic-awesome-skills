# Dockerfile generation

Use the `dockerfile-generator` skill for containerization tasks instead of
hand-writing a Dockerfile. The skill lives at
`.cline/skills/dockerfile-generator/` in this repository (older Cline builds may
read `.clinerules/skills/` or `.claude/skills/`).

```bash
# Preview
bash .cline/skills/dockerfile-generator/scripts/generate.sh --dry-run

# Fast Dockerfile-1-only pass
bash .cline/skills/dockerfile-generator/scripts/generate.sh --no-dockerfile-2 --fast

# Full output, including Dockerfile-2 where supported
bash .cline/skills/dockerfile-generator/scripts/generate.sh
```

Run `--dry-run` first when `Dockerfile-1`, `Dockerfile-2`, `.dockerignore*`, or
`compose.yaml` already exists. Do not overwrite a hand-written Dockerfile without
confirming the change. After generation, inspect the output and run `--check` if
a Dockerfile-1 already existed.

Do not edit the skill's `vendor/` directory; it is a pinned runtime snapshot.
