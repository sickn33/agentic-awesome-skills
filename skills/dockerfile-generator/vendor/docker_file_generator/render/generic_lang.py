"""Generic fallback detection and rendering.

Port of detect_generic() in legacy/create-dockerfile-legacy.sh: keep an
existing Dockerfile, otherwise adopt a run script as the entrypoint, and be
honest (a TODO comment, a guessed port/health) when nothing is detectable.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import detect_health_endpoint
from .postprocess import Render, RenderOptions, finalize, health_block, sanitize

GENERIC_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
tests/
test/
Dockerfile
Dockerfile-1
Dockerfile-2
.dockerignore-1
docker-compose*.yml
docker-compose*.yaml
compose.yaml
compose.yml
.env
.env.*
environment.sh
.vscode/
.idea/
*.log
"""

ENTRYPOINT_SCRIPTS = ("entrypoint.sh", "run.sh", "start.sh", "server.sh", "app.sh", "main.sh")
SCRIPT_SAFE = re.compile(r"^[A-Za-z0-9._/-]+$")


@dataclass
class GenericFacts:
    language: str = "unknown"
    framework: str = "generic"
    port: str = "8080"
    health_path: str = "/health"
    health_guessed: bool = True
    alpine_image: str = "alpine:3.24.1"
    existing_dockerfile: bool = False
    run_script: str = ""
    chmod: str = ""
    run_cmd: str = ""
    guessed: list[str] = field(default_factory=lambda: ["port", "health", "entrypoint"])
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    fatal: str = ""

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ==="]
        if self.existing_dockerfile:
            lines.append("[PASS] Kept your existing Dockerfile as Dockerfile-1")
        else:
            if self.run_script:
                lines.append(f"[PASS] Entrypoint script: {self.run_script}")
            else:
                lines.append("[WARN] No entrypoint found - edit the TODO CMD in Dockerfile-1")
        for warning in self.warnings:
            lines.append(f"[WARN] {warning}")
        return lines


def detects_generic(root: Path) -> bool:
    """True when no language plugin claims the project."""
    from ..routing import route

    decision = route(root)
    return decision.renderer != "python"


def detect_generic(project_dir: str | Path = ".", *, port_override: str = "", health_override: str | None = None) -> GenericFacts:
    root = Path(project_dir).resolve()
    facts = GenericFacts()
    facts.port = port_override or "8080"
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)

    if (root / "Dockerfile").is_file():
        facts.existing_dockerfile = True
        facts.guessed = ["port", "health", "entrypoint"]
        return facts

    run_script = ""
    for name in ENTRYPOINT_SCRIPTS:
        if (root / name).is_file():
            run_script = name
            break
    if not run_script:
        # find . -maxdepth 2 -name '*.sh' | head -1
        for path in sorted(root.glob("*/*.sh")) + sorted(root.glob("*.sh")):
            if path.is_file():
                run_script = str(path.relative_to(root))
                break
    if run_script:
        if not SCRIPT_SAFE.match(run_script):
            facts.fatal = f"generic entrypoint script path contains unsupported characters: {run_script}"
            return facts
        facts.run_script = run_script
        facts.chmod = f'RUN chmod +x "./{run_script}"'
        facts.run_cmd = f'CMD ["./{run_script}"]'
    else:
        facts.run_cmd = '# TODO: set your start command, e.g. CMD ["./myapp"]'
    return facts


def render_generic(facts: GenericFacts, root: Path, options: RenderOptions) -> Render:
    if facts.existing_dockerfile:
        # The project keeps its own Dockerfile verbatim, but the shared
        # post-processing still runs on it (cheat-sheet, client shape, OCI),
        # exactly like the Bash renderer.
        existing = (root / "Dockerfile").read_text(encoding="utf-8", errors="replace")
        body = existing.rstrip("\n").split("\n")
        return finalize(
            body,
            GENERIC_DOCKERIGNORE,
            root,
            options,
            detected_port=facts.port,
            detected_health=facts.health_path,
            guessed=facts.guessed,
            oci_title=sanitize(root.name),
            append_oci_no_entrypoint=not any(line.startswith("ENTRYPOINT ") for line in body),
        )
    body = [
        f"FROM {facts.alpine_image}",
        "RUN apk add --no-cache tini wget ca-certificates",
        "WORKDIR /app",
        "COPY . .",
        facts.chmod,
        f"EXPOSE {facts.port}",
        "RUN addgroup -S app && adduser -S app -G app",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        'ENTRYPOINT ["/sbin/tini", "--"]',
        facts.run_cmd,
    ]
    return finalize(
        body,
        GENERIC_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        oci_title=sanitize(root.name),
        # No OCI labels in the generic template: it has no LABEL line and Bash
        # only warns about the missing one when asked.
        append_oci_no_entrypoint=False,
    )