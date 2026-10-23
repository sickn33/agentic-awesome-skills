# Supported languages and targets

The generator detects the project type from marker files, then renders a
multi-stage Dockerfile. These are the 15 supported targets and the markers the
detector typically looks for. Detection is heuristic: use `--dry-run` to see
what it chose before writing.

| Target | Typical markers | Notes |
| --- | --- | --- |
| **Python** | `pyproject.toml`, `requirements.txt`, `Pipfile`, `setup.py`, `poetry.lock`, `environment.yml` | Supports pip, Poetry, Pipenv, conda, and common WSGI/ASGI layouts. |
| **Go** | `go.mod`, `go.sum` | Multi-stage build with a static runtime image. |
| **Node.js** | `package.json`, lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `bun.lockb`) | Detects Express, Fastify, NestJS, Hapi, Koa, and generic Node servers. |
| **Rust** | `Cargo.toml`, `Cargo.lock` | Multi-stage Cargo build with a slim runtime. |
| **Java** | `pom.xml`, `build.gradle`, `build.gradle.kts`, `settings.gradle` | Maven/Gradle detection; JVM runtime image. |
| **Kotlin** | Gradle files with Kotlin plugins, `settings.gradle.kts` | JVM build path. |
| **Ruby** | `Gemfile`, `Gemfile.lock`, `.ruby-version` | Bundler-based build. |
| **C#** | `*.csproj`, `*.sln`, `global.json` | .NET SDK build and runtime stages. |
| **PHP** | `composer.json`, `composer.lock`, `index.php`, `artisan` | PHP-FPM + nginx under supervisord as a non-root user. |
| **Swift** | `Package.swift`, `*.xcodeproj` | Swift toolchain image. |
| **Scala** | `build.sbt`, `project/plugins.sbt` | SBT build path. |
| **Elixir** | `mix.exs`, `mix.lock` | Mix build/release path. |
| **Clojure** | `deps.edn`, `project.clj`, `build.clj` | Leiningen or deps.edn path. |
| **Haskell** | `*.cabal`, `stack.yaml`, `package.yaml`, `cabal.project` | Cabal/Stack build path. |
| **SPA frameworks** | `vite.config.*`, `vue.config.*`, `next.config.*`, `index.html`, React/Vue dependencies in `package.json` | Vue, Vite, and React-style frontend apps built to static assets and served by nginx. |

## Output variants

- `Dockerfile-1` builds from project source. It is available for all 15
  targets and is the primary output.
- `Dockerfile-2` installs from a package or release registry where the target
  supports it. It is not universal. Use `--no-dockerfile-2` when only
  Dockerfile-1 is needed.
- `.dockerignore` / `.dockerignore-1` / `.dockerignore-2` keep build contexts
  small and exclude common local artifacts.
- `compose.yaml` is written only with `--compose`; it includes the app and
  detected backing services with health-gated dependencies.

## Detection and overrides

The generator usually finds:

- the language and framework from marker files
- the package manager from lockfiles
- the application port from source, framework defaults, or config
- a health endpoint from framework conventions

If detection is wrong, add the expected marker file or supply an explicit
override. For Python-routed runs:

```bash
PORT=8080 HEALTH=/ready \
  bash scripts/generate.sh --project ~/src/app --no-dockerfile-2 --fast
```

For Bash-owned modes (`--compose`, `--check`, `--all`), use `dockerfile.conf`
or the same environment variables. See `FLAGS.md`.

## Not a replacement for project knowledge

The generated Dockerfile is a strong starting point, not a guarantee that the
application builds or runs. Check:

- native build dependencies
- private package registries and credentials
- runtime data directories and file permissions
- non-root user requirements
- database migrations and startup order
- health endpoints that actually exist
- platform-specific base images

Then build the image or run the project's tests before shipping.
