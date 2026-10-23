# Dockerfile generation

When a task asks you to containerize an application, add or refresh a
Dockerfile, generate `compose.yaml`, add Dockerfiles to a monorepo, or validate
Dockerfile generation, use the `dockerfile-generator` skill instead of writing a
Dockerfile from scratch.

If the skill is installed in this repository, run:

```bash
bash .agents/skills/dockerfile-generator/scripts/generate.sh --dry-run
bash .agents/skills/dockerfile-generator/scripts/generate.sh --no-dockerfile-2 --fast
```

For a global install, replace `.agents/skills` with `~/.agents/skills`.

Rules:

1. Run `--dry-run` first when the repository already has `Dockerfile-1`,
   `Dockerfile-2`, `.dockerignore*`, or `compose.yaml`.
2. Do not overwrite a hand-written Dockerfile without showing the user the
   planned change.
3. Use `--no-dockerfile-2 --fast` for a fast Dockerfile-1-only pass.
4. After generation, inspect the output and run `--check` if a Dockerfile-1
   already exists.
5. Never edit `.agents/skills/dockerfile-generator/vendor/` by hand.

The skill supports Python, Go, Node.js/SPA, Rust, Java, Kotlin, Ruby, C#, PHP,
Swift, Scala, Elixir, Clojure, and Haskell.
