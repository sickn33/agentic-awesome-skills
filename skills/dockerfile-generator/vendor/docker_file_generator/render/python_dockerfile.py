"""Python renderer: Dockerfile-1 and .dockerignore-1 for Python projects.

Ported statement by statement from detect_python() in
legacy/create-dockerfile-legacy.sh plus the shared post-processing that runs
after every language (BuildKit secret mounts, EXTRA_* escape hatches, ARG/ENV
passthrough, OCI labels, STOPSIGNAL, cheat-sheet footer, client-shape rewrite).

Byte parity with the Bash renderer is the contract, so the empty-line shape of
the heredoc is reproduced exactly: an unset variable was an empty line there
and is an empty line here.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs
from ..detection.python_lang import PythonFacts

HEALTH_START_DEFAULT = "10s"
POETRY_VENV_ENV = "ENV POETRY_VIRTUALENVS_CREATE=false"
CLIENT_MARKER = "# no HEALTHCHECK: client shape (no port/health detected) - force server shape with PORT=/HEALTH="
SERVER_FALLBACK = {
    "uvicorn": "# fallback server floats on purpose (project pins win when present)\n# hadolint ignore=DL3013,DL3059\nRUN pip install --no-cache-dir --break-system-packages uvicorn",
    "gunicorn": "# fallback server floats on purpose (project pins win when present)\n# hadolint ignore=DL3013,DL3059\nRUN pip install --no-cache-dir --break-system-packages gunicorn",
}
SECRET_FILES = (".npmrc", "pip.conf", ".pypirc", ".netrc", "auth.json", "settings.xml", ".bundle/config")
SECRET_FLAG_IDS = {
    ".npmrc": "npmrc",
    "pip.conf": "pipconf",
    ".pypirc": "pipconf",
    ".netrc": "netrc",
    "auth.json": "composer",
    "settings.xml": "maven",
    ".bundle/config": "bundle",
}
ENV_NAME_DROP = {"PATH", "HOME", "USER", "PWD", "SHLVL", "LANG", "OLDPWD", "_", "HOSTNAME", "TERM", "PORT", "NODE_ENV"}
ENV_PUBLIC_PREFIX = re.compile(r"^(VITE_|NEXT_PUBLIC_|PUBLIC_|REACT_APP_|ARG_)", re.IGNORECASE)
ENV_SECRET = re.compile(r"key|secret|token|password|credential|private|(^|_)url$|(^|_)dsn$|connection", re.IGNORECASE)
ENV_INDEXED = re.compile(r"os\.environ\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\]")
ENV_CALL = re.compile(r"(?:os\.environ\.get|os\.getenv)\(['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]")
ENV_MAX_PUBLIC = 10

DOCKERIGNORE_BASE = """\
.git
.gitignore
README.md
*.md
docs/
tests/
test/
*.test.py
.pytest_cache
.ruff_cache
.mypy_cache
__pycache__
*.pyc
*.pyo
.coverage
htmlcov/
coverage.xml
*.log
.env
.env.*
environment.sh
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.vscode/
.idea/
dist/
build/
*.egg-info/
*.egg
venv/
env/
.venv/
.uv-cache/
.pdm.toml
__pypackages__/
"""


@dataclass
class RenderOptions:
    port: str = ""
    health: str = ""
    stopsignal: str = ""
    health_start: str = HEALTH_START_DEFAULT
    extra_copy: str = ""
    extra_run: str = ""
    extra_directives: str = ""
    app_title: str = "my-app"
    image_source: str = "local"
    vcs_ref: str = "unknown"
    image_tag: str = "my-app"
    write_resolved_config: bool = True


@dataclass
class RenderResult:
    """Language-independent fields every renderer's result carries.

    Mirrors postprocess.Render so one console path serves every language; the
    Python renderer keeps its own build order, so it fills these in directly.
    """

    dockerfile_1: str
    dockerignore_1: str
    secret_flags: str = ""
    registry_notice: str = ""
    env_names: list[str] = field(default_factory=list)
    env_secret_names: list[str] = field(default_factory=list)
    localhost_names: list[str] = field(default_factory=list)
    credential_names: list[str] = field(default_factory=list)
    env_total: int = 0
    client_shape: bool = False
    warnings: list[str] = field(default_factory=list)


def _health_block(port: str, path: str, guessed: bool, start: str) -> str:
    if guessed:
        return (
            "# HEALTHCHECK omitted: no health route found in source - a guessed path would 404 and stay unhealthy forever.\n"
            f"# To enable: add a real health endpoint (e.g. GET {path}) or rerun with HEALTH=/your/path."
        )
    return (
        f"HEALTHCHECK --interval=30s --timeout=5s --start-period={start} --retries=3 \\\n"
        f"  CMD wget -qO- http://localhost:{port}{path} || exit 1"
    )


SOURCE_SUFFIXES = (".py", ".go", ".js", ".ts", ".vue", ".rs", ".java", ".rb", ".php", ".cs", ".kt", ".swift", ".scala", ".ex", ".clj", ".hs")
URL_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9+.-]*://[^ \"']*localhost[^ \"']*|[A-Za-z0-9._-]*localhost:[0-9][^ \"']*")
CREDENTIAL_URL = re.compile(r"^[A-Za-z][A-Za-z0-9+.-]*://[^/]*@")


def detect_localhost_defaults(root: Path, names: list[str]) -> tuple[list[str], list[str], dict[str, str]]:
    """Names whose source default points at localhost, plus their raw URLs.

    Localhost defaults are dead inside containers (no shared localhost with the
    host or sibling services), so the names are warned about and the raw URL is
    kept per name for compose to rewrite the host later. Nothing is changed.
    """
    warned: list[str] = []
    credential_names: list[str] = []
    urls: dict[str, str] = {}
    files = [path for path in sorted(root.rglob("*")) if path.is_file() and path.suffix in SOURCE_SUFFIXES and not any(part in EXCLUDED_DIRS for part in path.parts)]
    for name in names:
        raw_url = ""
        for path in files:
            for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
                if name not in line:
                    continue
                if "localhost" not in line and "127.0.0.1" not in line:
                    continue
                warned.append(name)
                match = URL_PATTERN.search(line)
                if match and not raw_url:
                    raw_url = match.group(0)
                break
            if raw_url:
                break
        if not raw_url:
            continue
        if CREDENTIAL_URL.match(raw_url):
            credential_names.append(name)
        cleaned = re.sub(r"(://)[^/\"' ]*@", r"\1", raw_url)
        urls[name] = cleaned
    return warned, credential_names, urls


def detect_env_names(root: Path) -> tuple[list[str], list[str], list[str]]:
    """(public, secret, all) env names referenced from Python source."""
    names: set[str] = set()
    for path in sorted(root.rglob("*.py")):
        if any(part in {".git", "target", "node_modules", "vendor", "_build", ".venv", "dist", ".stack-work", "deps", ".uv-cache", ".bun", "__pypackages__", "__pycache__"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        names.update(ENV_INDEXED.findall(text))
        names.update(ENV_CALL.findall(text))
    ordered = sorted(name for name in names if name and name not in ENV_NAME_DROP)
    public = sorted({name for name in ordered if ENV_PUBLIC_PREFIX.match(name)} | {name for name in ordered if not ENV_SECRET.search(name)})
    public = public[:ENV_MAX_PUBLIC]
    secret = [name for name in ordered if ENV_SECRET.search(name) and not ENV_PUBLIC_PREFIX.match(name)]
    return public, secret, ordered


def _insert_before_first(lines: list[str], marker: str, block: str) -> list[str]:
    out: list[str] = []
    inserted = False
    for line in lines:
        if not inserted and line.startswith(marker):
            out.extend(block.split("\n"))
            inserted = True
        out.append(line)
    if not inserted:
        out.extend(block.split("\n"))
    return out


def _insert_after_workdir(lines: list[str], block: str) -> list[str]:
    """ARG/ENV passthrough after every WORKDIR (builder + runtime stages)."""
    out: list[str] = []
    for line in lines:
        out.append(line)
        if line.startswith("WORKDIR ") and block:
            out.extend(block.split("\n"))
    return out


def build_dockerfile_1(facts: PythonFacts, options: RenderOptions, root: Path) -> RenderResult:
    port = facts.port
    health = facts.health_path
    guessed_health = facts.health_guessed and not options.health
    health_block = _health_block(port, health, guessed_health, options.health_start)

    uv_head = ""
    deps_copy = ""
    deps_run = ""
    post_copy = ""
    warnings: list[str] = []
    manager = facts.package_manager
    requirements = facts.requirements_file
    if manager == "uv":
        uv_head = "COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/"
        if (root / "pyproject.toml").is_file():
            deps_copy = "COPY pyproject.toml uv.lock ./"
            deps_run = "RUN uv sync --frozen --no-dev --no-cache"
        else:
            warnings.append("uv.lock without pyproject.toml - uv sync needs the project file; runtime image only")
            deps_run = "RUN echo 'WARNING: no pyproject.toml - add it or a requirements file for real deps' >&2"
    elif manager == "uv-nolock":
        uv_head = "COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/"
        if requirements:
            deps_copy = f"COPY {requirements} ./"
            deps_run = f"RUN uv pip install --system --no-cache -r {requirements}"
        else:
            deps_copy = "COPY pyproject.toml ./"
            deps_run = "RUN uv pip install --system --no-cache ."
    elif manager == "poetry":
        deps_copy = "COPY pyproject.toml poetry.lock ./" if (root / "poetry.lock").is_file() else "COPY pyproject.toml ./"
        deps_run = "RUN pip install --no-cache-dir --break-system-packages poetry && poetry install --only main --no-root --no-interaction --no-ansi"
    elif manager == "pipenv":
        if (root / "Pipfile.lock").is_file():
            deps_copy = "COPY Pipfile Pipfile.lock ./"
            deps_run = "RUN pip install --no-cache-dir --break-system-packages pipenv && PIPENV_VENV_IN_PROJECT=1 pipenv install --deploy"
        else:
            deps_copy = "COPY Pipfile ./"
            deps_run = "RUN pip install --no-cache-dir --break-system-packages pipenv && PIPENV_VENV_IN_PROJECT=1 pipenv install"
    elif manager == "pdm":
        deps_copy = "COPY pyproject.toml pdm.lock ./" if (root / "pyproject.toml").is_file() else "COPY pdm.lock ./"
        deps_run = "RUN pip install --no-cache-dir --break-system-packages pdm && pdm install --prod --no-editables"
    elif manager == "pip":
        deps_copy = f"COPY {requirements} ./"
        deps_run = f"RUN pip install --no-cache-dir --break-system-packages -r {requirements}"
    elif manager == "pip-pyproject":
        deps_copy = "COPY pyproject.toml ./"
        post_copy = "RUN pip install --no-cache-dir --break-system-packages ."
    elif manager == "pip-setup":
        # Bash concatenated both lines into one variable, so a setup.cfg-only
        # project kept the leading newline and emits an empty line first.
        if (root / "setup.py").is_file():
            deps_copy += "COPY setup.py ./"
        if (root / "setup.cfg").is_file():
            deps_copy += "\nCOPY setup.cfg ./"
        deps_run = "RUN pip install --no-cache-dir --break-system-packages setuptools wheel"
    elif manager == "conda":
        deps_copy = "COPY environment.yml ./"
        deps_run = "RUN conda env create -f environment.yml"
        if requirements:
            deps_run = f"{deps_run}\nRUN pip install --no-cache-dir -r {requirements}"
            deps_copy = f"COPY environment.yml {requirements} ./"
    else:
        deps_run = "RUN echo 'WARNING: no requirements.txt or pyproject.toml - runtime image only' >&2"

    server_run = "" if facts.server_guaranteed else SERVER_FALLBACK.get(facts.web_server, "")

    image = facts.conda_image if manager == "conda" else facts.image
    python_mod = re.search(r"python:([0-9]+\.[0-9]+)", image)
    site_packages = f"/usr/local/lib/python{python_mod.group(1) if python_mod else '3.12'}/site-packages"

    if manager == "uv" and (root / "pyproject.toml").is_file():
        post_copy = "RUN uv sync --frozen --no-dev --no-cache"
        runtime_copy = "COPY --from=builder /app/.venv /app/.venv\nCOPY --from=builder /app ."
        runtime_env = 'ENV PYTHONDONTWRITEBYTECODE=1 \\\n    PYTHONUNBUFFERED=1 \\\n    PATH="/app/.venv/bin:$PATH"'
    elif manager == "conda":
        post_copy = ""
        runtime_copy = f"COPY --from=builder {facts.conda_prefix} {facts.conda_prefix}\nCOPY --from=builder /app ."
        runtime_env = f'ENV PATH="{facts.conda_prefix}/bin:$PATH" \\\n    PYTHONDONTWRITEBYTECODE=1 \\\n    PYTHONUNBUFFERED=1 \\\n    CONDA_DEFAULT_ENV={facts.conda_env}'
    elif manager == "pip-setup":
        post_copy = "RUN pip install --no-cache-dir --break-system-packages ."
        runtime_copy = f"# Two layers on purpose: site-packages stays cached on source-only changes\nCOPY --from=builder {site_packages} {site_packages}\nCOPY --from=builder /usr/local/bin /usr/local/bin\nCOPY --from=builder /app ."
        runtime_env = "ENV PYTHONDONTWRITEBYTECODE=1 \\\n    PYTHONUNBUFFERED=1\n"
    else:
        venv_env = POETRY_VENV_ENV if manager == "poetry" else ""
        runtime_copy = f"# Two layers on purpose: site-packages stays cached on source-only changes\nCOPY --from=builder {site_packages} {site_packages}\nCOPY --from=builder /usr/local/bin /usr/local/bin\nCOPY --from=builder /app ."
        runtime_env = "ENV PYTHONDONTWRITEBYTECODE=1 \\\n    PYTHONUNBUFFERED=1" + (f"\n{venv_env}" if venv_env else "\n")

    if facts.framework == "fastapi":
        entry = ["ddtrace-run", "uvicorn"] if facts.special_tools else ["uvicorn"]
        cmd = f'CMD [{", ".join(chr(34) + part + chr(34) for part in entry)}, "{facts.module}:{facts.app_var}", "--host", "0.0.0.0", "--port", "{port}"]'
    elif facts.framework == "flask":
        entry = ["ddtrace-run", "gunicorn"] if facts.special_tools else ["gunicorn"]
        cmd = f'CMD [{", ".join(chr(34) + part + chr(34) for part in entry)}, "--bind", "0.0.0.0:{port}", "--workers", "4", "--timeout", "120", "--preload", "{facts.module}:{facts.app_var}"]'
    else:
        cmd = f'CMD ["gunicorn", "--bind", "0.0.0.0:{port}", "--workers", "4", "--timeout", "120", "{facts.module}.wsgi:application"]'

    if manager == "conda":
        body = [
            f"FROM {image} AS builder",
            "WORKDIR /app",
            f'ENV PATH="{facts.conda_prefix}/bin:$PATH"' if manager == "conda" else "",
            deps_copy,
            deps_run,
            server_run,
            "COPY . .",
            facts.django_static,
            "",
            f"FROM {image}",
            "WORKDIR /app",
            "RUN apt-get update && apt-get install -y --no-install-recommends tini wget procps && \\\n    rm -rf /var/lib/apt/lists/*",
            runtime_copy,
            runtime_env,
            f"EXPOSE {port}",
            "RUN useradd -m -s /bin/bash app && chown -R app:app /app",
            "USER app",
            health_block,
            facts.volume_line,
            'ENTRYPOINT ["/usr/bin/tini", "--"]',
            cmd,
        ]
    else:
        body = [
            f"FROM {image} AS builder",
            uv_head,
            "WORKDIR /app",
            deps_copy,
            deps_run,
            server_run,
            "COPY . .",
            post_copy,
            facts.django_static,
            "",
            f"FROM {image}",
            "WORKDIR /app",
            "RUN apk add --no-cache tini wget",
            runtime_copy,
            runtime_env,
            f"EXPOSE {port}",
            "RUN addgroup -S app && adduser -S app -G app",
            "USER app",
            health_block,
            facts.volume_line,
            'ENTRYPOINT ["/sbin/tini", "--"]',
            cmd,
        ]
    text = "\n".join(body) + "\n"

    result = RenderResult(dockerfile_1=text, dockerignore_1=DOCKERIGNORE_BASE)
    secret_flags = ""
    registry_notice = ""
    for name in SECRET_FILES:
        if (root / name).is_file():
            if f"{name}\n" not in result.dockerignore_1:
                result.dockerignore_1 += f"{name}\n"
            secret_flags += f" --secret id={SECRET_FLAG_IDS[name]},src={name}"
            registry_notice += f"{name} "
    result.secret_flags = secret_flags
    result.registry_notice = registry_notice

    if (root / "pip.conf").is_file() or (root / ".pypirc").is_file():
        text = re.sub(r"^RUN pip install (.*)$", r"RUN --mount=type=secret,id=pipconf,target=/etc/pip.conf pip install \1", text, flags=re.MULTILINE)
        if re.search(r"^RUN (uv pip|uv sync|poetry|pipenv|pdm) ", text, re.MULTILINE):
            pipsec = ".pypirc" if (root / ".pypirc").is_file() else "pip.conf"
            warnings.append(f"{pipsec} present but this installer ignores pip.conf - configure its private index manually")

    if options.extra_copy or options.extra_run:
        extra = "\n".join(part for part in (options.extra_copy, options.extra_run) if part)
        text = "\n".join(_insert_before_first(text.split("\n"), "USER ", extra))
    env_public, env_secret, _ = detect_env_names(root)
    if env_public or env_secret:
        block = ""
        for name in env_public:
            block += f"ARG {name}\nENV {name}=${{{name}}}\n"
        for name in env_secret:
            block += f"# ARG {name} (secret-like: pass at deploy with --build-arg or -e, never baked)\n"
        text = "\n".join(_insert_after_workdir(text.split("\n"), block))
    result.env_names = list(env_public)
    result.env_secret_names = list(env_secret)

    labels = (
        f'LABEL org.opencontainers.image.title="{options.app_title}" \\\n'
        f'      org.opencontainers.image.source="{options.image_source}" \\\n'
        f'      org.opencontainers.image.revision="{options.vcs_ref}"'
    )
    text = "\n".join(_insert_before_first(text.split("\n"), "ENTRYPOINT ", labels))
    if options.stopsignal:
        text = "\n".join(_insert_before_first(text.split("\n"), "ENTRYPOINT ", f"STOPSIGNAL {options.stopsignal}"))
    if options.extra_directives:
        text = "\n".join(_insert_before_first(text.split("\n"), "ENTRYPOINT ", options.extra_directives))

    text = _apply_overrides(text, options, facts.port, facts.health_path)
    effective_port = options.port or facts.port
    text += _cheat_sheet(options, result.env_names, result.env_secret_names, result.secret_flags, effective_port, facts)
    result.client_shape = _is_client_shape(facts, options)
    if result.client_shape:
        text = _client_shape_rewrite(text)
    result.dockerfile_1 = text
    result.warnings.extend(warnings)
    return result


def _apply_overrides(text: str, options: RenderOptions, detected_port: str, detected_health: str) -> str:
    """PORT=/HEALTH= rewrites, ported from the D1b override block.

    Only the shapes the legacy seds actually rewrite move: EXPOSE, the uvicorn
    "--port" argument and the health URL. gunicorn's --bind keeps the detected
    port on purpose - rewriting it would silently change every existing
    Flask/Django Dockerfile.
    """
    if options.port:
        text = re.sub(r"^(EXPOSE )[0-9]+(.*)$", rf"\g<1>{options.port}\g<2>", text, flags=re.MULTILINE)
        text = re.sub(r'("--port", ")[0-9]+', rf"\g<1>{options.port}", text)
        text = re.sub(r"listen [0-9]+;", f"listen {options.port};", text)
    if options.port or options.health:
        port = options.port or detected_port
        health = options.health or detected_health
        text = re.sub(r"""http://localhost:[0-9]+[^ "'*]*""", f"http://localhost:{port}{health}", text)
    return text


def _is_client_shape(facts: PythonFacts, options: RenderOptions) -> bool:
    """Port+health both defaulted means worker/client shape, no server door."""
    return "port" in facts.guessed and "health" in facts.guessed and not options.port and not options.health


def _client_shape_rewrite(text: str) -> str:
    """Strip the health block and the default VOLUME, leaving a marker."""
    out: list[str] = []
    skip_next = False
    for line in text.split("\n"):
        if line.startswith("HEALTHCHECK ") or line.startswith("# HEALTHCHECK omitted:"):
            out.append(CLIENT_MARKER)
            skip_next = True
            continue
        if skip_next:
            skip_next = False
            continue
        out.append(line)
    text = "\n".join(out)
    return "\n".join(line for line in text.split("\n") if line != 'VOLUME ["/data", "/logs"]')


def _cheat_sheet(options: RenderOptions, env_names: list[str], secret_names: list[str], secret_flags: str, port: str, facts: PythonFacts) -> str:
    tag = options.image_tag or "my-app"
    build = f"# docker build -t {tag}:1 -f Dockerfile-1"
    for name in env_names:
        build += f" --build-arg {name}=..."
    build += secret_flags
    build += " ."
    lines = ["# --- build & run (generated cheat-sheet, safe to delete) ---", build]
    client_shape = "port" in facts.guessed and "health" in facts.guessed and not options.port and not options.health
    run_envs = "".join(f" -e {name}=..." for name in list(env_names) + list(secret_names))
    if run_envs:
        lines.append(f"# docker run --rm {tag}:1 \\")
        if client_shape:
            lines.append(f"# {run_envs}")
        else:
            lines.append(f"# {run_envs} \\")
            lines.append(f"#   -p {port}:{port}")
    elif client_shape:
        lines.append(f"# docker run --rm {tag}:1")
    else:
        lines.append(f"# docker run --rm {tag}:1 -p {port}:{port}")
    return "\n".join(lines) + "\n"


def render_python(project_dir: str | Path = ".", options: RenderOptions | None = None) -> tuple[RenderResult, PythonFacts]:
    from ..detection.python_lang import detect_python

    root = Path(project_dir).resolve()
    facts = detect_python(root)
    opts = options or RenderOptions()
    if not facts.volume_line:
        facts.volume_line = ""
    data_dirs = detect_data_dirs(root)
    if data_dirs and not facts.volume_line:
        joined = ",".join(f'"/app/{name}"' for name in data_dirs)
        facts.volume_line = f"VOLUME [{joined}]"
    return build_dockerfile_1(facts, opts, root), facts