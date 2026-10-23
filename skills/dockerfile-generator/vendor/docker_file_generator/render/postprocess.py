"""Language-independent post-processing.

Every language's Dockerfile goes through the same steps after its own template
is built, in this fixed order:

1. BuildKit secret mounts (and the .dockerignore lines that back them)
2. EXTRA_COPY / EXTRA_RUN, inserted before the first USER
3. ARG/ENV passthrough after every WORKDIR
4. OCI labels before the first ENTRYPOINT
5. STOPSIGNAL, then EXTRA_DIRECTIVES, before the first ENTRYPOINT
6. PORT=/HEALTH= rewrites
7. The build cheat-sheet footer
8. The client-shape rewrite (no port and no health detected)

The order is load-bearing: it is the order the Bash renderer uses and the
order the regression harness expects. Extracted here so each language module
only has to describe its own template.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .python_dockerfile import (
    SECRET_FILES,
    SECRET_FLAG_IDS,
    RenderOptions,
    detect_localhost_defaults,
)

CLIENT_MARKER = "# no HEALTHCHECK: client shape (no port/health detected) - force server shape with PORT=/HEALTH="
SOURCE_SUFFIXES = (".py", ".go", ".js", ".ts", ".vue", ".rs", ".java", ".rb", ".php", ".cs", ".kt", ".swift", ".scala", ".ex", ".clj", ".hs")
EXCLUDED_DIRS = (".git", "target", "node_modules", "vendor", "_build", ".venv", "dist", ".stack-work", "deps", ".uv-cache", ".bun", "__pypackages__", "__pycache__")


@dataclass
class EnvScan:
    """Language-specific environment-name patterns (ported from detect_env_names)."""

    patterns: tuple[tuple[str, str], ...]
    includes: tuple[str, ...] = ("*.py",)
    label: str = "env names"


ENV_MAX_PUBLIC = 10


@dataclass
class Render:
    """Result of post-processing one language template."""

    dockerfile_1: str
    dockerignore_1: str
    secret_flags: str = ""
    registry_notice: str = ""
    env_names: list[str] = field(default_factory=list)
    env_secret_names: list[str] = field(default_factory=list)
    env_total: int = 0
    localhost_names: list[str] = field(default_factory=list)
    credential_names: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    client_shape: bool = False
    oci_skipped: bool = False


def scan_env(root: Path, scan: EnvScan) -> tuple[list[str], list[str], list[str]]:
    """(public, secret, all) names for a language, matching the Bash rules."""
    from .python_dockerfile import ENV_NAME_DROP, ENV_PUBLIC_PREFIX, ENV_SECRET

    names: set[str] = set()
    files = [
        path
        for path in sorted(root.rglob("*"))
        if path.is_file()
        and any(path.match(pattern) for pattern in scan.includes)
        and not any(part in EXCLUDED_DIRS for part in path.parts)
    ]
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        for extract in scan.patterns:
            names.update(extract(text))
    ordered = sorted(name for name in names if name and name not in ENV_NAME_DROP)
    public = sorted({name for name in ordered if ENV_PUBLIC_PREFIX.match(name)} | {name for name in ordered if not ENV_SECRET.search(name)})
    return public[:ENV_MAX_PUBLIC], [name for name in ordered if ENV_SECRET.search(name) and not ENV_PUBLIC_PREFIX.match(name)], ordered


def regex_names(pattern: str, group: int = 1):
    compiled = re.compile(pattern)

    def extract(text: str) -> list[str]:
        return compiled.findall(text)

    return extract


def insert_before_first(lines: list[str], marker: str, block: str) -> list[str]:
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


def insert_after_workdir(lines: list[str], block: str) -> list[str]:
    out: list[str] = []
    for line in lines:
        out.append(line)
        if line.startswith("WORKDIR ") and block:
            out.extend(block.split("\n"))
    return out


def apply_secrets(text: str, root: Path, dockerignore: str) -> tuple[str, str, str]:
    """Add secret files to the ignore list and wire their --secret flags."""
    flags = ""
    for name in SECRET_FILES:
        if not (root / name).is_file():
            continue
        if f"{name}\n" not in dockerignore:
            dockerignore += f"{name}\n"
        flags += f" --secret id={SECRET_FLAG_IDS[name]},src={name}"
    return text, dockerignore, flags


def env_block(public: list[str], secret: list[str], static: bool = False) -> str:
    """ARG/ENV passthrough block.

    `grep -v '^ENV '` drops an ENV line together with its newline, so when the
    ENV line was last the block loses its trailing newline and awk's print
    supplies exactly one. Reproducing that keeps static sites byte-exact.
    """
    lines: list[str] = []
    for name in public:
        lines.append(f"ARG {name}")
        lines.append(f"ENV {name}=${{{name}}}")
    for name in secret:
        lines.append(f"# ARG {name} (secret-like: pass at deploy with --build-arg or -e, never baked)")
    if not lines:
        return ""
    if static:
        lines = [line for line in lines if not line.startswith("ENV ")]
        if not lines:
            return ""
        # The ENV line that followed the last ARG carried the block's trailing
        # newline; grep -v removed both, so the block ends without one.
        return "\n".join(lines)
    return "\n".join(lines) + "\n"


def apply_overrides(text: str, options: RenderOptions, detected_port: str, detected_health: str) -> str:
    if options.port:
        text = re.sub(r"^(EXPOSE )[0-9]+(.*)$", rf"\g<1>{options.port}\g<2>", text, flags=re.MULTILINE)
        text = re.sub(r'("--port", ")[0-9]+', rf"\g<1>{options.port}", text)
        text = re.sub(r"listen [0-9]+;", f"listen {options.port};", text)
        text = re.sub(r"(ASPNETCORE_URLS=http://\+:)[0-9]+", rf"\g<1>{options.port}", text)
    if options.port or options.health:
        port = options.port or detected_port
        health = options.health or detected_health
        text = re.sub(r"""http://localhost:[0-9]+[^ "'*]*""", f"http://localhost:{port}{health}", text)
    return text


def cheat_sheet(tag: str, env_names: list[str], secret_names: list[str], secret_flags: str, port: str, client_shape: bool) -> str:
    build = f"# docker build -t {tag}:1 -f Dockerfile-1"
    for name in env_names:
        build += f" --build-arg {name}=..."
    build += secret_flags
    build += " ."
    lines = ["# --- build & run (generated cheat-sheet, safe to delete) ---", build]
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


def client_shape_rewrite(text: str) -> str:
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
    text = "\n".join(line for line in text.split("\n") if line != 'VOLUME ["/data", "/logs"]')
    # No VOLUME left means nothing needs drawers: collapse the Rust user-setup
    # RUN back to bare user creation (its 4-line form only exists for /data).
    if not any(line.startswith("VOLUME ") for line in text.split("\n")) and "mkdir -p /data /logs" in text:
        collapsed: list[str] = []
        skip = 0
        for line in text.split("\n"):
            if skip:
                skip -= 1
                continue
            if line.startswith("RUN addgroup -S app && adduser -S app -G app && \\"):
                collapsed.append("RUN addgroup -S app && adduser -S app -G app")
                skip = 3
                continue
            collapsed.append(line)
        text = "\n".join(collapsed)
    return text


def finalize(
    body: list[str],
    dockerignore: str,
    root: Path,
    options: RenderOptions,
    *,
    detected_port: str,
    detected_health: str,
    guessed: list[str],
    env_scan: EnvScan | None = None,
    oci_title: str = "",
    oci_source: str = "local",
    oci_revision: str = "unknown",
    secret_rewrites: tuple[tuple[str, str, int], ...] = (),
    extra_notes: tuple[str, ...] = (),
    tail: str = "",
    static_env: bool = False,
    append_oci_no_entrypoint: bool = False,
) -> Render:
    """Apply every shared post-processing step to one language's template."""
    text = "\n".join(body) + "\n"
    text, dockerignore, secret_flags = apply_secrets(text, root, dockerignore)
    registry_notice = "".join(f"{name} " for name in SECRET_FILES if (root / name).is_file())

    for pattern, replacement, flags in secret_rewrites:
        text = re.sub(pattern, replacement, text, flags=flags)

    if tail:
        # Some languages end with one big heredoc (PHP's runtime block) that
        # already carries ENV/EXPOSE/USER/ENTRYPOINT/CMD. Splice it on before
        # the insertion steps so EXTRA_*/env/OCI still land in the right place.
        text = text.rstrip("\n") + "\n" + tail
    if options.extra_copy or options.extra_run:
        extra = "\n".join(part for part in (options.extra_copy, options.extra_run) if part)
        text = "\n".join(insert_before_first(text.split("\n"), "USER ", extra))

    public: list[str] = []
    secret: list[str] = []
    localhost: list[str] = []
    credentials: list[str] = []
    env_total = 0
    if env_scan is not None:
        public, secret, all_names = scan_env(root, env_scan)
        env_total = len(all_names)
        if static_env:
            secret = []
        if public or secret:
            localhost, credentials, _urls = detect_localhost_defaults(root, public + secret)
            block = env_block(public, secret, static=static_env)
            if block:
                text = "\n".join(insert_after_workdir(text.split("\n"), block))

    if oci_title:
        labels = (
            f'LABEL org.opencontainers.image.title="{oci_title}" \\\n'
            f'      org.opencontainers.image.source="{oci_source}" \\\n'
            f'      org.opencontainers.image.revision="{oci_revision}"'
        )
        if append_oci_no_entrypoint:
            # Templates without an ENTRYPOINT (nginx static sites) cannot host
            # the insert: Bash writes nothing and only warns, so nothing is
            # appended here either.
            pass
        else:
            text = "\n".join(insert_before_first(text.split("\n"), "ENTRYPOINT ", labels))
    if options.stopsignal:
        text = "\n".join(insert_before_first(text.split("\n"), "ENTRYPOINT ", f"STOPSIGNAL {options.stopsignal}"))
    if options.extra_directives:
        text = "\n".join(insert_before_first(text.split("\n"), "ENTRYPOINT ", options.extra_directives))

    text = apply_overrides(text, options, detected_port, detected_health)
    port = options.port or detected_port
    client = "port" in guessed and "health" in guessed and not options.port and not options.health
    text += cheat_sheet(options.image_tag, public, secret, secret_flags, port, client)
    if client:
        text = client_shape_rewrite(text)

    return Render(
        dockerfile_1=text,
        dockerignore_1=dockerignore,
        secret_flags=secret_flags,
        registry_notice=registry_notice,
        env_names=public,
        env_secret_names=secret,
        env_total=env_total,
        localhost_names=localhost,
        credential_names=credentials,
        notes=list(extra_notes),
        client_shape=client,
        oci_skipped=bool(append_oci_no_entrypoint and oci_title),
    )


def health_block(port: str, path: str, guessed: bool, start: str = "10s") -> str:
    if guessed:
        return (
            "# HEALTHCHECK omitted: no health route found in source - a guessed path would 404 and stay unhealthy forever.\n"
            f"# To enable: add a real health endpoint (e.g. GET {path}) or rerun with HEALTH=/your/path."
        )
    return (
        f"HEALTHCHECK --interval=30s --timeout=5s --start-period={start} --retries=3 \\\n"
        f"  CMD wget -qO- http://localhost:{port}{path} || exit 1"
    )


def sanitize(value: str) -> str:
    """APP_TITLE rule: only [A-Za-z0-9._-] survives."""
    return "".join(char for char in value if char.isalnum() or char in "._-") or "my-app"


def image_tag(name: str) -> str:
    return sanitize(name.lower())