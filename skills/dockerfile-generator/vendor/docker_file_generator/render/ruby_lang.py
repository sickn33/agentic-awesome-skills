"""Ruby detection and rendering.

Port of detect_ruby() in legacy/create-dockerfile-legacy.sh: framework
selection, the BUNDLED WITH pin, vendor/cache offline installs, the
.bundle/config BuildKit secret and the Rails asset precompile.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, detect_health_endpoint, port_from, volume_line
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

MARKERS = ("Gemfile",)
DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
vendor/*
!vendor/cache/
!vendor/cache/**
vendor/bundle/
.bundle/
.vscode/
.idea/
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
log/
tmp/
"""

ENV_SCAN = EnvScan(
    patterns=(regex_names(r"ENV\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\]"),),
    includes=("*.rb", "*.ru"),
    label="ruby env names",
)


@dataclass
class RubyFacts:
    language: str = "ruby"
    framework: str = "ruby"
    port: str = "3000"
    health_path: str = "/health"
    health_guessed: bool = True
    entry: str = "config.ru"
    image: str = "ruby:3.2-alpine"
    image_source: str = "registry default"
    deps_copy: str = "COPY Gemfile ./"
    bundler_pin: str = ""
    bundle_local: str = ""
    run_prefix: str = "RUN"
    run_cmd: str = ""
    precompile: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    private_registry: bool = False
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Framework: {self.framework}"]
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.append(f"[PASS] Entry point: {self.entry}")
        # The .bundle/config note is printed by the detect_* body (it sits with
        # the other secrets notes), not after the multi-project style ones.
        lines.extend(note for note in self.notes if note.startswith("[PASS] Private registry"))
        lines.extend(note for note in self.notes if not note.startswith("[PASS] Private registry"))
        return lines


def detects(root: Path) -> bool:
    return (root / "Gemfile").is_file()


def ruby_image(root: Path, default: str = "ruby:3.2-alpine") -> tuple[str, str]:
    gemfile = root / "Gemfile"
    if gemfile.is_file():
        match = re.search(r"^\s*ruby\s+['\"]([0-9]+\.[0-9]+)", gemfile.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        if match:
            return f"ruby:{match.group(1)}-alpine", "Gemfile ruby directive"
    tool_versions = root / ".tool-versions"
    if tool_versions.is_file():
        for line in tool_versions.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.split("#", 1)[0].split()[:1] == ["ruby"]:
                match = re.match(r"([0-9]+\.[0-9]+)", line.split("#", 1)[0].split()[1])
                if match:
                    return f"ruby:{match.group(1)}-alpine", ".tool-versions"
    version_file = root / ".ruby-version"
    if version_file.is_file():
        raw = version_file.read_text(encoding="utf-8", errors="replace").strip()
        raw = re.sub(r"^ruby-", "", raw)
        match = re.match(r"([0-9]+\.[0-9]+)", raw)
        if match:
            return f"ruby:{match.group(1)}-alpine", ".ruby-version"
    return default, "registry default"


def detect_ruby(project_dir: str | Path = ".", *, health_override: str | None = None) -> RubyFacts:
    root = Path(project_dir).resolve()
    facts = RubyFacts()
    facts.image, facts.image_source = ruby_image(root)

    gemfile = root / "Gemfile"
    text = gemfile.read_text(encoding="utf-8", errors="replace") if gemfile.is_file() else ""
    if "rails" in text:
        facts.framework = "rails"
    elif "sinatra" in text:
        facts.framework = "sinatra"
    elif "roda" in text:
        facts.framework = "roda"
    else:
        facts.framework = "ruby"

    port_line = ""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix not in {".rb", ".ru"}:
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if re.search(r"PORT|listen|bind", line):
                port_line = line
                break
        if port_line:
            break
    port = port_from(port_line) if port_line else ""
    if not port or len(port) > 5:
        facts.port = "3000"
        facts.guessed.append("port")
    else:
        facts.port = port

    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    facts.entry = "config.ru" if (root / "config.ru").is_file() or not (root / "app.rb").is_file() else "app.rb"
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    lock = root / "Gemfile.lock"
    facts.deps_copy = "COPY Gemfile Gemfile.lock ./" if lock.is_file() else "COPY Gemfile ./"
    if lock.is_file():
        match = re.search(r"^BUNDLED WITH\n\s+([0-9]+\.[0-9]+\.[0-9]+)", lock.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        if match:
            facts.bundler_pin = f"RUN gem install bundler -v {match.group(1)} --no-document"
            facts.notes.append(f"[PASS] Bundler pin: {match.group(1)} (from Gemfile.lock)")
    if (root / "vendor" / "cache").is_dir():
        facts.bundle_local = " --local"
        facts.notes.append("[PASS] Vendored gems: vendor/cache found, installing offline")
    if (root / ".bundle" / "config").is_file():
        facts.run_prefix = "RUN --mount=type=secret,id=bundle,target=/app/.bundle/config"
        facts.private_registry = True

    if facts.framework == "rails":
        facts.run_cmd = f'CMD ["ruby", "bin/rails", "server", "-p", "{facts.port}", "-b", "0.0.0.0"]'
    elif facts.framework == "sinatra":
        facts.run_cmd = f'CMD ["ruby", "app.rb", "-p", "{facts.port}", "-o", "0.0.0.0"]'
    else:
        facts.run_cmd = f'CMD ["rackup", "-p", "{facts.port}", "-o", "0.0.0.0"]'

    if facts.framework == "rails" and (root / "app" / "assets").is_dir():
        facts.precompile = "RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile"
        facts.notes.append("[PASS] Rails assets: precompile at build")
    if facts.private_registry:
        # Printed right after the entry point, before the bundler/vendor notes.
        facts.notes.insert(0, "[PASS] Private registry: .bundle/config via BuildKit secret (not in image)")
    return facts


def render_ruby(facts: RubyFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM {facts.image} AS builder",
        "RUN apk add --no-cache build-base",
        "WORKDIR /app",
        facts.deps_copy,
        facts.bundler_pin,
        f"{facts.run_prefix} bundle config set --local without 'test development' && bundle install{facts.bundle_local}",
        "COPY . .",
        facts.precompile,
        "",
        f"FROM {facts.image}",
        "RUN apk add --no-cache tini wget",
        "WORKDIR /app",
        "# Two layers on purpose: bundle stays cached on source-only changes",
        "COPY --from=builder /usr/local/bundle /usr/local/bundle",
        "COPY --from=builder /app .",
        f"EXPOSE {facts.port}",
        "RUN addgroup -S app && adduser -S app -G app",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        'ENTRYPOINT ["/sbin/tini", "--"]',
        facts.run_cmd,
    ]
    return finalize(
        body,
        DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=ENV_SCAN,
        oci_title=sanitize(root.name),
    )