"""Console output for the Python renderer.

The Bash renderer's stdout is part of its contract: the regression harness
asserts on `[PASS]`/`[WARN]` lines, and users read the detective report. This
module reproduces the Python-relevant sections in the same order with the same
wording, so switching renderers changes nothing a script can see.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

from ..detection.python_lang import PythonFacts

PROJECT_TITLE = "Docker File Generator"
PROJECT_SUBTITLE = "Language Support - Complete command reference for 15 supported languages and targets"
SUPPORTED_TARGETS = "Python, Go, Node.js, Rust, Java, Kotlin, Ruby, C#, PHP, Swift, Scala, Elixir, Clojure, Haskell, SPA frameworks (Vue, Vite, React-style)"
AUTHOR_NAME = "Mohamed Rafaa TOUNEKTI"
AUTHOR_ROLE = "DevOps & DevSecOps Engineer"
AUTHOR_LINKEDIN = "linkedin.com/in/mohamed-rafaa-tounekti"
AUTHOR_EMAIL = "rafaabou@gmail.com"
AUTHOR_GITHUB = "github.com/rafaabou"
AUTHOR_YEAR = "2026"
BAR = "=========================================="
DEFAULT_PYTHON_IMAGE = "python:3.12.4-alpine"
DEFAULT_RUBY_IMAGE = "ruby:3.2-alpine"
DEFAULT_PHP_IMAGE = "php:8.2-fpm-alpine"
DEFAULT_NODE_IMAGE = "node:20-alpine"
DEFAULT_SWIFT_IMAGE = "swift:5.10-amazonlinux2"
DEFAULT_ELIXIR_IMAGE = "elixir:1.15-alpine"
DEFAULT_RUST_IMAGE = "rust:1.89-alpine"
HADOLINT_FILTER = ("DL3018", "DL3008", "DL3033", "DL4006")
SERVER_FALLBACK = {
    "uvicorn": "# fallback server floats on purpose (project pins win when present)\n# hadolint ignore=DL3013,DL3059\nRUN pip install --no-cache-dir --break-system-packages uvicorn",
    "gunicorn": "# fallback server floats on purpose (project pins win when present)\n# hadolint ignore=DL3013,DL3059\nRUN pip install --no-cache-dir --break-system-packages gunicorn",
}


def identity_lines() -> list[str]:
    return [
        PROJECT_TITLE,
        PROJECT_SUBTITLE,
        f"At a glance — 15 supported languages and targets: {SUPPORTED_TARGETS}",
        AUTHOR_NAME,
        AUTHOR_ROLE,
        f"LinkedIn: https://{AUTHOR_LINKEDIN}",
        f"Email: {AUTHOR_EMAIL}",
        f"GitHub: https://{AUTHOR_GITHUB}",
        AUTHOR_YEAR,
    ]


def host_tools_lines() -> list[str]:
    lines = ["--- Host Tools ---"]
    try:
        version = subprocess.run(["bash", "-c", 'echo "${BASH_VERSION:-}"'], capture_output=True, text=True, timeout=10).stdout.strip()
    except (OSError, subprocess.SubprocessError):
        version = ""
    major = version.split(".", 1)[0]
    if major.isdigit() and int(major) >= 4:
        lines.append(f"[OK]   bash {version} (required)")
    else:
        lines.append(f"[WARN] bash {version or 'unknown'} too old - need 4+")
    for command, hint in (
        ("git", "sudo apt-get install -y git"),
        ("docker", "sudo apt-get install -y docker.io"),
        ("hadolint", "sudo apt-get install -y hadolint"),
        ("shellcheck", "sudo apt-get install -y shellcheck"),
    ):
        label = "git" if command == "git" else command
        extra = " (GitHub repo detect)" if command == "git" else " (--check step)" if command == "docker" else " (Dockerfile lint)" if command == "hadolint" else " (script lint)"
        if command == "hadolint":
            extra = " (Dockerfile lint)"
        lines.append(f"[OK]   {label} {extra}" if shutil.which(command) else f"[MISS] {label}{extra} -> {hint}")
    lines.append("")
    return lines


def detective_lines(facts: PythonFacts) -> list[str]:
    lines = ["=== Detective Results ==="]
    lines.append(f"[PASS] Framework: {facts.framework}")
    lines.append(f"[PASS] Web server: {facts.web_server}")
    lines.append(f"[PASS] Module: {facts.module}:{facts.app_var}")
    lines.append(f"[PASS] Port: {facts.port}")
    lines.append(f"[PASS] Health: {facts.health_path}")
    if facts.special_tools:
        lines.append(f"[PASS] Special tools: {facts.special_tools}")
    if facts.package_manager == "conda" and facts.conda_prefix_declared:
        lines.append(f"[PASS] Conda prefix: {facts.conda_prefix} (from environment.yml)")
    for warning in facts.warnings:
        lines.append(f"[WARN] {warning}")
    lines.append(f"[PASS] Package manager: {facts.package_manager}" + (f" ({facts.requirements_file})" if facts.requirements_file else ""))
    if not facts.server_guaranteed:
        block = SERVER_FALLBACK.get(facts.web_server, "")
        if block:
            lines.append(f"[PASS] Server guaranteed: {block}")
    if facts.django_static:
        lines.append("[PASS] Django statics: collectstatic at build")
    return lines


def env_lines(public: list[str], secret: list[str], localhost: list[str] | None = None, credentials: list[str] | None = None, total: int | None = None) -> list[str]:
    # The WARN comes first in the Bash output: detect_env_names warns while it
    # classifies, then reports the public names, then the localhost/credential
    # sweep at the end.
    lines: list[str] = []
    if total and total > 10:
        lines.append(f"[WARN] {total} env names found - keeping first 10, add the rest with EXTRA_* or --build-arg")
    if secret:
        lines.append("[WARN] Secret-like env names found - left commented, pass values at deploy")
    lines.append(f"[PASS] Env names:{' ' + ' '.join(public) if public else ' (none public)'}")
    if localhost:
        lines.append(f"[WARN] Localhost defaults (unreachable from inside containers - pass -e at deploy): {' '.join(localhost)}")
    if credentials:
        lines.append(f"[WARN] Credentialed URLs detected: {' '.join(credentials)} - provide them at runtime; no credentials are written to compose.yaml")
    return lines


def activate_dockerignore(root: Path, dry_run: bool) -> list[str]:
    """Copy .dockerignore-1 over .dockerignore, keeping the first backup."""
    target = root / ".dockerignore"
    generated = root / ".dockerignore-1"
    if dry_run:
        return ["Activated: .dockerignore (from .dockerignore-1)"]
    lines = []
    if target.is_file() and target.read_bytes() != generated.read_bytes():
        if not (root / ".dockerignore.bak").exists():
            target.replace(root / ".dockerignore.bak")
            lines.append("Backed up your .dockerignore to .dockerignore.bak")
        else:
            lines.append("[WARN] .dockerignore.bak already exists - your original stays there, not overwritten")
    shutil.copyfile(generated, target)
    lines.append("Activated: .dockerignore (from .dockerignore-1)")
    return lines


def sanitize_title(value: str) -> str:
    """APP_TITLE rule: only [A-Za-z0-9._-] survives, else my-app."""
    return "".join(char for char in value if char.isalnum() or char in "._-") or "my-app"


def image_tag(value: str) -> str:
    """Cheat-sheet image tag: lowercased, same charset as the title."""
    return sanitize_title(value.lower())


def summary_lines_raw(language: str, framework: str, port: str, health: str, guessed: list[str]) -> list[str]:
    """SUMMARY block for any language (framework empty prints N/A, like Bash)."""
    lines = [BAR, "SUMMARY", BAR, ""]
    lines.append(f"  Language:     {language}")
    lines.append(f"  Framework:    {framework or 'N/A'}")
    lines.append(f"  Port:         {port}")
    lines.append(f"  Health:       {health}")
    if guessed:
        words = " ".join(sorted(set(guessed)))
        lines.append(f"  Guessed:     {words} (fix: PORT=8080 HEALTH=/ping ./create-dockerfile.sh)")
    lines.append("")
    return lines


def summary_lines(facts: PythonFacts, port: str, health: str, guessed: list[str]) -> list[str]:
    lines = [BAR, "SUMMARY", BAR, ""]
    lines.append("  Language:     python")
    lines.append(f"  Framework:    {facts.framework}")
    lines.append(f"  Port:         {port}")
    lines.append(f"  Health:       {health}")
    if guessed:
        words = " ".join(sorted(set(guessed)))
        lines.append(f"  Guessed:     {words} (fix: PORT=8080 HEALTH=/ping ./create-dockerfile.sh)")
    lines.append("")
    return lines


def next_steps_lines(
    port: str,
    health: str,
    env_names: list[str],
    secret_names: list[str],
    secret_flags: str,
    registry_notice: str,
    framework: str,
    compose: bool = False,
    env_created: bool = False,
) -> list[str]:
    lines = [BAR, "NEXT STEPS", BAR, "", "  Dockerfile-1 (build from source):"]
    if registry_notice:
        lines.append(f"    docker build{secret_flags} -t my-app:1 -f Dockerfile-1 .")
        # Bash echoes "${REGISTRY_NOTICE}- never baked..." and REGISTRY_NOTICE
        # already ends in a space (one per detected file).
        lines.append(f"    (private registry files used: {registry_notice}- never baked into the image)")
    else:
        lines.append("    docker build -t my-app:1 -f Dockerfile-1 .")
    lines.append(f"    docker run -d -p {port}:{port} --name my-app my-app:1")
    if env_names:
        lines.append(f"    (detected env names: {' '.join(env_names)} - pass values with --build-arg NAME=value or -e NAME=value)")
    lines.append("")
    lines.append(f"  Verify:  curl -s localhost:{port}{health}")
    lines.append("  Logs:    docker logs my-app")
    lines.append("  Stop:    docker stop my-app")
    if compose:
        suffix = " + .env - random passwords, never overwritten" if env_created else ""
        lines.append(f"  Compose: docker compose up -d   (reads compose.yaml{suffix})")
    # Framework first-boot notes, in the Bash emission order.
    if framework == "rails":
        lines.append("  Migrate: docker exec my-app bundle exec rails db:migrate (before traffic)")
    if framework == "django":
        lines.append("  Migrate: docker exec my-app python manage.py migrate (before traffic)")
    if framework == "phoenix":
        lines.append("  Secret:  docker run -e SECRET_KEY_BASE=$(mix phx.gen.secret) ...")
    if framework == "laravel":
        lines.append("  Secret:  docker run -e APP_KEY=$(php artisan key:generate --show) ...")
    lines.append("")
    return lines


def static_check_lines(root: Path, fast: bool) -> list[str]:
    if fast:
        return ["(--fast: skipping docker build check)", "(--fast: skipping hadolint)", ""]
    lines: list[str] = []
    if shutil.which("docker"):
        command = None
        if subprocess.run(["docker", "build", "--check", "--help"], capture_output=True).returncode == 0:
            command = ["docker", "build", "--check"]
        elif subprocess.run(["docker", "buildx", "build", "--check", "--help"], capture_output=True).returncode == 0:
            command = ["docker", "buildx", "build", "--check"]
        if command:
            result = subprocess.run([*command, "-f", "Dockerfile-1", "."], cwd=root, capture_output=True)
            if result.returncode == 0:
                lines.append("[PASS] docker build --check: Dockerfile-1 OK")
            else:
                lines.append("[WARN] docker build --check flagged Dockerfile-1 (run it yourself to see why)")
        else:
            lines.append("(docker too old for 'build --check' - skipping static check)")
    else:
        lines.append("(docker not found - skipping build check)")
    if shutil.which("hadolint"):
        result = subprocess.run(["hadolint", "--no-fail", "-f", "gnu", "Dockerfile-1"], cwd=root, capture_output=True, text=True)
        findings = [line for line in result.stdout.splitlines() if not any(rule in line for rule in HADOLINT_FILTER)]
        if not findings:
            lines.append("[PASS] hadolint: Dockerfile-1 clean (besides accepted rules)")
        else:
            lines.append("[WARN] hadolint found issues in Dockerfile-1:")
            lines.extend(findings[:5])
    else:
        lines.append("(hadolint not found - skipping Dockerfile lint; install: see Host tools above)")
    lines.append("")
    return lines