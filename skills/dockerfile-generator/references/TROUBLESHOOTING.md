# Troubleshooting

## `python3: command not found`

Install Python 3.10 or newer. On Debian/Ubuntu:

```bash
sudo apt update
sudo apt install -y python3 python3-pip
```

Check:

```bash
python3 --version
```

## `[MISSING] Python packages: click yaml jinja2`

Install the pinned dependencies:

```bash
python3 -m pip install -r requirements.txt
```

On distributions that mark the system Python as externally managed (PEP 668),
use a virtual environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements.txt
```

On Debian/Ubuntu, distro packages are also available:

```bash
sudo apt install python3-yaml python3-jinja2 python3-click
```

Verify:

```bash
bash scripts/generate.sh --check-deps
```

## `[MISSING] vendored runtime`

The skill was copied without its `vendor/` directory. Reinstall or copy the
whole skill folder, not just `SKILL.md`:

```bash
cp -a /path/to/dockerfile-generator .claude/skills/
```

Alternatively, point the wrapper at an upstream checkout:

```bash
DOCKERFILE_GENERATOR_HOME=/path/to/docker-file-generator \
  bash scripts/generate.sh --project ~/src/app --dry-run
```

## `permission denied`

Make the scripts executable:

```bash
chmod +x scripts/generate.sh scripts/install.sh tests/smoke.sh
```

You can always invoke them through `bash`, which does not require the executable
bit:

```bash
bash scripts/generate.sh --help
```

## `Docker` or `hadolint` missing

Generation works without them; verification is skipped. Use `--fast` to make
that explicit:

```bash
bash scripts/generate.sh --project ~/src/app --no-dockerfile-2 --fast
```

Tell the user that build and lint checks were not run. If they want them, install
Docker and hadolint and rerun without `--fast`.

## `shellcheck: command not found`

Shellcheck is optional and is not used by the skill at runtime. The smoke suite
uses `bash -n` only. Install shellcheck separately if you want stricter shell
linting.

## Wrong language detected

Run a preview to see the decision:

```bash
bash scripts/generate.sh --project ~/src/app --dry-run
```

Then:

- add the expected marker file (for example `go.mod`, `requirements.txt`, or
  `Cargo.toml`)
- remove a stale marker file that belongs to another stack
- override `PORT` and `HEALTH` if only those are wrong
- use `dockerfile.yaml` for Python-routed configuration
- for Bash-owned modes, use `dockerfile.conf` and environment variables

If the project legitimately contains multiple apps, run `--all` from the
monorepo root or generate each app separately. Do not expect one Dockerfile to
serve two unrelated runtimes.

## `Dockerfile-2` was not generated

Not every language/target supports a release or package-registry install. Use
`Dockerfile-1` if that is sufficient, or pass `--no-dockerfile-2` to make the
intent explicit. Check the generator output for the reason.

## `--check` reports drift

The existing `Dockerfile-1` no longer matches current detection. Review the
difference, then either regenerate or keep the hand-written file and document
why. `--check` is a detection consistency check, not a full lint.

## `--all cannot be combined with --compose`

Run `--all` first, then run `--compose` separately in each application directory.
This avoids ambiguous ownership of a monorepo-level Compose file.

## `--dry-run and --check cannot be used together`

They have different purposes. Use `--dry-run` to preview generation and
`--check` to verify an existing `Dockerfile-1`.

## The path contains spaces

Quote it:

```bash
bash scripts/generate.sh --project "/home/me/My App" --dry-run
```

The wrapper uses quoted paths and handles spaces. If you are calling the
vendored upstream wrapper directly, quote there too.

## The installer says the destination exists

The installer refuses to overwrite by default. Preview first:

```bash
bash scripts/install.sh --platform claude --scope project --dry-run
```

Then replace only when intentional:

```bash
bash scripts/install.sh --platform claude --scope project --force
```

## GitHub Copilot global install fails

Copilot has no official user-level skills directory. Use project scope:

```bash
bash scripts/install.sh --platform copilot --scope project
```

Or install the generic layout into the repository with
`--platform generic --scope project`.

## The agent does not see the skill

Check the agent's native path in `README.md` and verify the folder contains
`SKILL.md` at its root, not nested one level deeper:

```text
.claude/skills/dockerfile-generator/SKILL.md
```

not:

```text
.claude/skills/dockerfile-generator/dockerfile-generator/SKILL.md
```

Also confirm the agent supports the Agent Skills format. For older versions, use
the matching file in `adapters/`.

## Windows

Use WSL with bash 4.4+ and Python 3.10+. Native Git Bash may not provide a
compatible bash or GNU tar. The vendored runtime is a Bash/Python tool.

## Licensing

This package is MIT licensed, including the pinned `vendor/` snapshot. The
upstream repository remains private and unlicensed; the MIT grant applies to
the snapshot as distributed here. See `NOTICE` and `vendor/UPSTREAM.txt`.
