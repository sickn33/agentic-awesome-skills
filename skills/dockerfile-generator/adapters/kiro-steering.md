---
inclusion: auto
---

# Dockerfile generation

Use the `dockerfile-generator` skill for containerization tasks instead of
writing a Dockerfile from scratch. The skill lives at
`.kiro/skills/dockerfile-generator/` in this repository (global:
`~/.kiro/skills/dockerfile-generator/`).

```bash
# Preview
bash .kiro/skills/dockerfile-generator/scripts/generate.sh --dry-run

# Fast Dockerfile-1-only pass
bash .kiro/skills/dockerfile-generator/scripts/generate.sh --no-dockerfile-2 --fast

# Full output, including Dockerfile-2 where supported
bash .kiro/skills/dockerfile-generator/scripts/generate.sh
```

Run `--dry-run` first when `Dockerfile-1`, `Dockerfile-2`, `.dockerignore*`, or
`compose.yaml` already exists. Do not overwrite a hand-written Dockerfile without
confirming the change. After generation, inspect the output and run `--check` if
a Dockerfile-1 already existed.

Do not edit the skill's `vendor/` directory; it is a pinned runtime snapshot.
This steering file is a fallback for Kiro versions that do not load the native
`.kiro/skills/dockerfile-generator/SKILL.md` layout.
