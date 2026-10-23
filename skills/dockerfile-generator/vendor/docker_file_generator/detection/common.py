"""Shared detection helpers.

Every rule here is a deliberate port of the Bash renderer in
legacy/create-dockerfile-legacy.sh. Where the Bash version has a quirk that
changes output (see APP_VAR in python_lang.py) the port keeps it and says so:
detection must not drift from the legacy renderer while both are in use.
"""

from __future__ import annotations

import re
from pathlib import Path

EXCLUDED_DIRS = (
    ".git",
    "target",
    "node_modules",
    "vendor",
    "_build",
    ".venv",
    "dist",
    ".stack-work",
    "deps",
    ".uv-cache",
    ".bun",
    "__pypackages__",
    "__pycache__",
)

HEALTH_PATHS = (
    "/health",
    "/healthz",
    "/health/live",
    "/health/ready",
    "/ping",
    "/ping/health",
    "/api/health",
    "/status",
    "/status/health",
)

HEALTH_INCLUDES = (
    "*.py",
    "*.go",
    "*.js",
    "*.ts",
    "*.rs",
    "*.java",
    "*.rb",
    "*.cs",
    "*.php",
    "*.kt",
    "*.swift",
    "*.scala",
    "*.ex",
    "*.clj",
    "*.hs",
    "*.yaml",
    "*.yml",
    "*.json",
    "*.toml",
    "*.conf",
)

# grep -vE line filters of detect_health_endpoint, ported one for one.
HEALTH_NOISE = re.compile(
    r"(^|/)(tests?|docs?|examples?)(/|:)"
    r"|(^|:[ \t]*)(#|//|/\*|<!--)"
    r"|^[ \t]*\*"
    r"|https?://"
    r"|localhost"
    r"|127\.0\.0\.1"
    r"|\.(md|html|css|lock)(:|$)"
)
HEALTH_DOCKERFILE = re.compile(r"(^|/)Dockerfile")

KNOWN_PORTS = ("3000", "3001", "3333", "4000", "4001", "4567", "5000", "5001", "8000", "8080", "8501", "9000", "9001", "9292")
PORT_TOKEN = re.compile(r"(?<![0-9])([0-9]{2,5})(?![0-9])")

DATA_DIRS = ("data", "db", "storage", "uploads", "logs", "tmp")


def iter_files(root: Path, includes: tuple[str, ...], excluded_dirs: tuple[str, ...] = EXCLUDED_DIRS) -> list[Path]:
    """Every matching file below root, in a stable (sorted) order.

    Bash `grep -r` walks in readdir order; sorting keeps the Python port
    deterministic. Fixtures hold one signal each, so the order cannot change a
    verdict - but an unstable walk would make --check flaps possible.
    """
    patterns = set(includes)
    found: list[Path] = []
    for path in sorted(root.rglob("*")):
        if any(part in excluded_dirs for part in path.relative_to(root).parts[:-1]):
            continue
        if path.name in excluded_dirs:
            continue
        if any(path.match(pattern) for pattern in patterns):
            found.append(path)
    return found


def port_from(text: str) -> str:
    """First known service port in text, else empty.

    Whitelist-only on purpose: free guessing grabs junk (error codes, ASN1
    bytes). Data ports (5432, 6379, 27017) belong to backing services, never
    to EXPOSE.
    """
    for match in PORT_TOKEN.finditer(text):
        value = match.group(1)
        if value in KNOWN_PORTS:
            return value
    return ""


def detect_health_endpoint(root: Path, override: str | None = None) -> tuple[str, bool, str]:
    """Return (path, guessed, source)."""
    if override:
        return override, False, "HEALTH override"
    for candidate in HEALTH_PATHS:
        for path in iter_files(root, HEALTH_INCLUDES):
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for line in text.splitlines():
                if candidate not in line:
                    continue
                relative = path.relative_to(root)
                tagged = f"{relative}:{line}"
                if HEALTH_NOISE.search(tagged) or HEALTH_DOCKERFILE.search(tagged):
                    continue
                return candidate, False, str(relative)
    return "/health", True, "framework default (no health route in source)"


def detect_data_dirs(root: Path) -> list[str]:
    """Existing data directories, in the fixed detection order.

    A VOLUME is only declared for a directory that exists in the build
    context: a bare word match in source is not a mount point.
    """
    return [name for name in DATA_DIRS if (root / name).is_dir()]


def volume_line(data_dirs: list[str]) -> str:
    if not data_dirs:
        return ""
    joined = ",".join(f'"/app/{name}"' for name in data_dirs)
    return f"VOLUME [{joined}]"


def python_image(root: Path, default: str = "python:3.12.4-alpine") -> tuple[str, bool, str]:
    """Python base image plus (pinned, provenance). Legacy L4 precedence."""
    version_file = root / ".python-version"
    if version_file.is_file():
        first = version_file.read_text(encoding="utf-8", errors="replace").splitlines()[:1]
        match = re.match(r"^([0-9]+\.[0-9]+)", first[0].strip()) if first else None
        if match:
            return f"python:{match.group(1)}-alpine", True, ".python-version"
    runtime_file = root / "runtime.txt"
    if runtime_file.is_file():
        raw = runtime_file.read_text(encoding="utf-8", errors="replace").strip()
        raw = re.sub(r"^python-", "", raw)
        match = re.match(r"^([0-9]+\.[0-9]+)", raw)
        if match:
            return f"python:{match.group(1)}-alpine", True, "runtime.txt"
    tool_versions = root / ".tool-versions"
    if tool_versions.is_file():
        for line in tool_versions.read_text(encoding="utf-8", errors="replace").splitlines():
            parts = line.split("#", 1)[0].split()
            if len(parts) >= 2 and parts[0] == "python" and re.match(r"^[0-9]", parts[1]):
                version = re.match(r"^([0-9]+\.[0-9]+)", parts[1])
                if version:
                    return f"python:{version.group(1)}-alpine", True, ".tool-versions"
    pyproject = root / "pyproject.toml"
    if pyproject.is_file():
        match = re.search(r'^requires-python[ \t]*=[ \t]*"[^0-9]*([0-9]+\.[0-9]+)', pyproject.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        if match:
            return f"python:{match.group(1)}-alpine", False, "pyproject.toml requires-python"
    pipfile = root / "Pipfile"
    if pipfile.is_file():
        match = re.search(r'^python_version[ \t]*=[ \t]*"([0-9]+\.[0-9]+)"', pipfile.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        if match:
            return f"python:{match.group(1)}-alpine", True, "Pipfile python_version"
    return default, False, "registry default"