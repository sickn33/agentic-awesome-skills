# dockerfile-generator

A portable AI skill for generating production-ready Dockerfiles from a project
tree. It wraps the Docker File Generator runtime for 15 languages and targets:

> Python, Go, Node.js, Rust, Java, Kotlin, Ruby, C#, PHP, Swift, Scala,
> Elixir, Clojure, Haskell, and SPA frameworks (Vue, Vite, React-style).

The skill follows the open Agent Skills format: a `SKILL.md` file plus
supporting scripts, references, and a pinned runtime snapshot. One package works
with Claude Code, OpenAI Codex, Cursor, GitHub Copilot, Google Antigravity,
Devin Desktop, OpenCode, Cline, and Kiro.

## What it does

- Detects the language, framework, package manager, port, and health endpoint.
- Writes a multi-stage `Dockerfile-1` built from project source.
- Writes `Dockerfile-2` for release/package-registry installs where supported.
- Writes `.dockerignore` files and optional `compose.yaml`.
- Supports monorepos with `--all`.
- Verifies generated output with `--check`.
- Works offline for generation; Docker/hadolint verification is optional.

## Requirements

| Requirement | Needed for |
| --- | --- |
| `bash` 4.4+ | Wrapper and legacy renderer |
| `python3` 3.10+ | Python plugins and routing |
| `click`, `PyYAML`, `Jinja2` | Python runtime |
| `docker` + `hadolint` | Optional build/lint verification |
| `git` | Optional repository metadata |

Install the Python dependencies:

```bash
python3 -m pip install -r requirements.txt
```

On Debian/Ubuntu, distro packages also work:

```bash
sudo apt install python3-yaml python3-jinja2 python3-click
```

## Install

Clone the package, then run the installer from the repository root:

```bash
git clone https://github.com/rafaabou/dockerfile-generator-skill.git
cd dockerfile-generator-skill
bash scripts/install.sh --platform <agent> --scope project
```

The installer copies the complete skill folder, including `scripts/` and the
vendored runtime, so the installed skill is self-contained.

The default scope is `project` and the default project root is the current
directory. Use `--project-root /path/to/repo` to install into another
repository, or `--scope global` for a user-level installation.

### Install matrix

| Agent | Project path | Global path |
| --- | --- | --- |
| **Claude Code** | `.claude/skills/dockerfile-generator/` | `~/.claude/skills/dockerfile-generator/` |
| **OpenAI Codex** | `.agents/skills/dockerfile-generator/` | `~/.agents/skills/dockerfile-generator/` |
| **Cursor** | `.cursor/skills/dockerfile-generator/` or `.agents/skills/...` | `~/.cursor/skills/...` or `~/.agents/skills/...` |
| **GitHub Copilot** | `.github/skills/dockerfile-generator/` | Not officially supported; use project scope |
| **Google Antigravity** | `.agents/skills/dockerfile-generator/` | `~/.gemini/config/skills/dockerfile-generator/` |
| **Devin Desktop** | `.devin/skills/dockerfile-generator/` (legacy `.windsurf/skills/` is still read) | `~/.codeium/windsurf/skills/dockerfile-generator/` |
| **OpenCode** | `.opencode/skills/dockerfile-generator/` | `~/.config/opencode/skills/dockerfile-generator/` |
| **Cline** | `.cline/skills/dockerfile-generator/` (also `.clinerules/skills/`, `.claude/skills/`) | `~/.cline/skills/dockerfile-generator/` |
| **Kiro** | `.kiro/skills/dockerfile-generator/` | `~/.kiro/skills/dockerfile-generator/` |
| **Generic** | `.agents/skills/dockerfile-generator/` + `adapters/AGENTS.md` | `~/.agents/skills/dockerfile-generator/` |

Notes:

- GitHub Copilot reads project skills from `.github/skills/`, `.claude/skills/`,
  and `.agents/skills/`. It has no official user-level skills directory; use
  project scope, or install the generic skill into a repository.
- Devin Desktop is the renamed Windsurf. New project installs use
  `.devin/skills/`; existing Windsurf project setups may still use
  `.windsurf/skills/`. The global data directory remains
  `~/.codeium/windsurf/skills/`.
- Cline also reads `.clinerules/skills/` and `.claude/skills/`.
- Codex, Cursor, Antigravity, and the generic fallback may all use
  `.agents/skills/`. A single install there can serve several tools.
- The paths above are the native skill locations for current releases. If a
  tool changes its layout, use `--target` to place the folder explicitly.

### Installer examples

```bash
# Install for Claude Code in the current repository
bash scripts/install.sh --platform claude --scope project

# Install globally for OpenCode
bash scripts/install.sh --platform opencode --scope global

# Install for every supported layout in this repository
bash scripts/install.sh --platform all --scope project

# Install to a custom path
bash scripts/install.sh --platform codex \
  --target /path/to/repo/.agents/skills/dockerfile-generator

# Preview without copying
bash scripts/install.sh --platform antigravity --scope global --dry-run

# Symlink instead of copy (useful while developing the skill)
bash scripts/install.sh --platform cline --scope project --link

# List all destinations
bash scripts/install.sh --list
```

`--platform all --scope project` installs one copy per unique project path
(`.opencode`, `.claude`, `.agents`, `.cursor`, `.github`, `.devin`, `.cline`,
`.kiro`). A single `.agents` copy serves Codex, Antigravity, and the generic
fallback.
`--platform all --scope global` installs one copy per unique global path
(`~/.config/opencode`, `~/.claude`, `~/.agents`, `~/.cursor`,
`~/.gemini/config`, `~/.codeium/windsurf`, `~/.cline`, `~/.kiro`).

The installer refuses to overwrite an existing destination unless `--force` is
given. Use `--dry-run` first. `--target` is the exact skill folder, not the
parent skills directory.

### Manual install

Copy the entire package directory into a folder named
`dockerfile-generator/`. Do not copy only `SKILL.md`; the script and `vendor/`
runtime are required.

```bash
mkdir -p .claude/skills/dockerfile-generator
cp -a /path/to/dockerfile-generator-skill/. .claude/skills/dockerfile-generator/
```

### Fallback adapters

Some older agent versions do not scan a native skills directory. Copy or merge
the matching adapter:

| Adapter | Destination |
| --- | --- |
| `adapters/AGENTS.md` | `AGENTS.md` in the repository root (merge if one exists) |
| `adapters/copilot-instructions.md` | `.github/copilot-instructions.md` |
| `adapters/cline-rule.md` | `.clinerules/dockerfile-generator.md` |
| `adapters/kiro-steering.md` | `.kiro/steering/dockerfile-generator.md` |

These are fallbacks, not a replacement for the native skill install. Current
releases of all nine agents can load `SKILL.md` from the paths in the matrix.

## Use

From a project directory:

```bash
SKILL_DIR=/path/to/dockerfile-generator

# Preview
bash "$SKILL_DIR/scripts/generate.sh" --dry-run

# Dockerfile-1 only, no Docker/hadolint checks
bash "$SKILL_DIR/scripts/generate.sh" --no-dockerfile-2 --fast

# Full output, including Dockerfile-2 where supported
bash "$SKILL_DIR/scripts/generate.sh"

# Also write compose.yaml
bash "$SKILL_DIR/scripts/generate.sh" --compose

# Verify Dockerfile-1 still matches detection
bash "$SKILL_DIR/scripts/generate.sh" --check

# Monorepo
bash "$SKILL_DIR/scripts/generate.sh" --all
```

The wrapper accepts `--project /path/to/app` to run against another directory.
It also forwards generator flags such as `--config`, `--explain`,
`--print-config`, `--validate-config`, and `--no-config`.

For the upstream `create-dockerfile.sh` help text:

```bash
bash "$SKILL_DIR/scripts/generate.sh" --upstream-help
```

## Package layout

The repository root is the skill folder:

```text
dockerfile-generator/
├── SKILL.md                 # Agent Skills entry point
├── README.md
├── LICENSE                  # MIT for the package, including the vendor snapshot
├── NOTICE                   # vendored runtime provenance and license scope
├── requirements.txt
├── adapters/                # fallbacks for older/non-native agent setups
├── references/              # flags, languages, troubleshooting, upstream notes
├── scripts/
│   ├── generate.sh          # portable wrapper around the vendored runtime
│   └── install.sh           # per-agent installer
├── tests/
│   └── smoke.sh             # self-contained smoke suite
└── vendor/                  # pinned Docker File Generator snapshot
    ├── create-dockerfile.sh
    ├── docker_file_generator/
    ├── legacy/create-dockerfile-legacy.sh
    ├── config/defaults.yaml
    └── UPSTREAM.txt
```

## Test

The smoke suite checks frontmatter, shell syntax, Python imports, help and
dependency paths, five language fixtures, dry-run/check/compose/monorepo modes,
configuration resolution, path handling, and install behavior:

```bash
bash tests/smoke.sh
```

It uses temporary directories and cleans them up on success. Docker is not
required because the suite uses `--fast` and `--no-dockerfile-2` where
appropriate.

The skill does not require automatic GitHub Actions. Run the smoke suite
locally, or trigger any workflow manually.

Useful individual checks:

```bash
bash -n scripts/generate.sh scripts/install.sh tests/smoke.sh
bash scripts/generate.sh --check-deps
bash scripts/install.sh --list
python3 - <<'PY'
import yaml
text = open("SKILL.md", encoding="utf-8").read()
front = text.split("---", 2)[1]
print(yaml.safe_load(front))
PY
```

## License and provenance

This package, including the vendored runtime snapshot, is MIT licensed. See
`LICENSE` and `NOTICE`.

`vendor/` is a pinned snapshot of
`https://github.com/rafaabou/docker-file-generator` at commit `2c0fbaf`. The
upstream repository remains private and does not separately declare a license.
The copyright holder has authorized distribution of this snapshot under the MIT
license as part of this package. That authorization applies to the snapshot as
distributed here, not to the upstream repository itself.

Third-party Python dependencies are not vendored. Install them from
`requirements.txt`.
