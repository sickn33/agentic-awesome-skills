"""Rust detection and rendering.

Port of detect_rust() in legacy/create-dockerfile-legacy.sh: workspace vs
single crate, the dummy-source cache trick with its stale-cache touch guard,
the vendored config copy and the dual-port EXPOSE for the default 9000.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_health_endpoint, port_from
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

RUST_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
target/
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
"""

ENV_SCAN = EnvScan(
    patterns=(
        regex_names(r'(?:env!|var)\("([A-Za-z_][A-Za-z0-9_]*)"'),
    ),
    includes=("*.rs",),
    label="rust env names",
)

# Stale-cache guard: the dummy main compiles target/ outputs NEWER than the real
# sources COPY brings next, so Cargo calls the crate Fresh and ships the dummy.
# Touching every crate source outside target/ marks only local units dirty.
RUST_TOUCH = "find . -path ./target -prune -o -name '*.rs' -exec touch -c {} + 2>/dev/null; "


@dataclass
class RustFacts:
    language: str = "rust"
    alpine_image: str = "alpine:3.24.1"
    framework: str = "rust"
    port: str = "9000"
    health_path: str = "/health"
    health_guessed: bool = True
    image: str = "rust:1.89-alpine"
    image_source: str = "registry default"
    # RUST_VER holds a bare version; the template adds the "rust:" prefix and
    # the console prints the bare value, exactly like Bash.
    image_console: str = "1.89-alpine"
    workspace: bool = False
    main_crate: str = ""
    package: str = ""
    binary: str = ""
    cargo_copy: str = ""
    copy_block: str = ""
    build: str = ""
    expose: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = 'VOLUME ["/data", "/logs"]'
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ==="]
        if self.workspace:
            lines.append("[PASS] Type: workspace")
            lines.append(f"[PASS] Main crate: {self.main_crate}")
        lines.append(f"[PASS] Package: {self.package}")
        lines.append(f"[PASS] Binary: {self.binary}")
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.append(f"[PASS] Framework: {self.framework}")
        lines.extend(self.notes)
        return lines


def detects_rust(root: Path) -> bool:
    return (root / "Cargo.toml").is_file()


def rust_image(root: Path, default: str = "rust:1.89-alpine") -> tuple[str, str]:
    toolchain = root / "rust-toolchain.toml"
    if toolchain.is_file():
        match = re.search(r'^channel\s*=\s*"([^"]+)"', toolchain.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        if match:
            version = re.match(r"([0-9]+\.[0-9]+)", match.group(1))
            if version:
                # RUST_VER is a bare version; the template prefixes "rust:".
                return f"rust:{version.group(1)}-alpine", "registry default"
    return default, "registry default"


def _kv_value(key: str, path: Path) -> str:
    """Portable `name = "value"` extractor, matching the Bash kv_value."""
    if not path.is_file():
        return ""
    pattern = re.compile(rf'^{re.escape(key)}[ \t]*=[ \t]*"([^"]+)"', re.MULTILINE)
    match = pattern.search(path.read_text(encoding="utf-8", errors="replace"))
    return match.group(1) if match else ""


def detect_rust(project_dir: str | Path = ".", *, health_override: str | None = None) -> RustFacts:
    root = Path(project_dir).resolve()
    facts = RustFacts()
    facts.image, facts.image_source = rust_image(root)
    facts.image_console = facts.image.removeprefix("rust:")
    cargo = root / "Cargo.toml"
    text = cargo.read_text(encoding="utf-8", errors="replace") if cargo.is_file() else ""

    if "[workspace]" in text:
        facts.workspace = True
        # Bash: grep -A5 -E "default-run|\[\[bin\]\]" | grep "name" | head -1
        lines = text.splitlines()
        main_crate = ""
        for index, line in enumerate(lines):
            if not re.search(r"default-run|\[\[bin\]\]", line):
                continue
            for follow in lines[index:index + 6]:
                if "name" not in follow:
                    continue
                match = re.search(r'"([^"]+)"', follow)
                if match:
                    main_crate = match.group(1)
                    break
            if main_crate:
                break
        if not main_crate:
            # Bash: sed -nE '/members/,/]\]/p' prints FROM the members line,
            # so an inline members = ["a", "b"] resolves on that same line.
            in_members = False
            for line in lines:
                if not in_members and re.match(r"\s*members", line):
                    in_members = True
                if in_members:
                    match = re.search(r'"([^"]+)"', line)
                    if match:
                        main_crate = match.group(1)
                        break
                    if "]" in line:
                        break
        facts.main_crate = main_crate or root.name

        crate_manifest = root / facts.main_crate / "Cargo.toml"
        if crate_manifest.is_file():
            facts.package = _kv_value("name", crate_manifest)
            facts.binary = _kv_value("default-run", crate_manifest) or facts.main_crate
        else:
            # Root-package workspace: the real name lives in the root manifest.
            facts.package = _kv_value("name", cargo) or facts.main_crate
            facts.binary = _kv_value("default-run", cargo) or facts.package
    else:
        facts.package = _kv_value("name", cargo)
        facts.binary = _kv_value("default-run", cargo) or facts.package
    if not facts.package:
        facts.package = root.name
    if not facts.binary:
        facts.binary = facts.package

    port_line = ""
    for path in sorted(root.rglob("*")):
        if not path.is_file() or not any(path.match(glob) for glob in ("*.rs", "*.toml")):
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if "target/" in line or ".git/" in line:
                continue
            if re.search(r"DEFAULT_PORT|DEFAULT_ADDRESS|:9000|:9001|bind|listen|PORT", line):
                port_line = line
                break
        if port_line:
            break
    port = port_from(port_line) if port_line else ""
    if port:
        facts.port = port
    else:
        facts.port = "9000"
        facts.guessed.append("port")

    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    for name, marker in (("actix", "actix"), ("rocket", "rocket"), ("axum", "axum"), ("warp", "warp")):
        if marker in text:
            facts.framework = name
            break

    config = root / ".cargo" / "config.toml"
    legacy_config = root / ".cargo" / "config"
    if config.is_file():
        facts.cargo_copy = "COPY .cargo/config.toml ./.cargo/config.toml"
        facts.notes.append("[PASS] Cargo config: .cargo/config.toml copied early")
    elif legacy_config.is_file():
        facts.cargo_copy = "COPY .cargo/config ./.cargo/config"
        facts.notes.append("[PASS] Cargo config: .cargo/config copied early")

    # RustFS always wants /data and /logs, independent of the context tree.
    facts.data_dirs = ["data", "logs"]
    facts.volume_line = 'VOLUME ["/data", "/logs"]'

    if facts.workspace:
        facts.copy_block = "COPY . ."
        locked = " --locked" if (root / "Cargo.lock").is_file() else ""
        facts.build = f"RUN cargo build --release{locked} --package {facts.package}"
        facts.expose = "EXPOSE 9000 9001" if facts.port == "9000" else f"EXPOSE {facts.port}"
    else:
        # The Bash heredoc is unquoted, so \"fn main(){}\" collapses to plain
        # double quotes in the generated file.
        dummy = 'RUN mkdir src && echo "fn main(){}" > src/main.rs && echo "" > src/lib.rs && cargo build --release && rm -rf src'
        # ${RUST_CARGO_COPY} is its own heredoc line, so a project without
        # .cargo/config.toml keeps the empty line.
        if (root / "Cargo.lock").is_file():
            facts.copy_block = f"{facts.cargo_copy}\nCOPY Cargo.toml Cargo.lock ./\n{dummy}\nCOPY . ."
            facts.build = f"RUN {RUST_TOUCH}cargo build --release --locked"
        else:
            facts.copy_block = f"{facts.cargo_copy}\nCOPY Cargo.toml ./\n{dummy}\nCOPY . ."
            facts.build = f"RUN {RUST_TOUCH}cargo build --release"
        facts.expose = f"EXPOSE {facts.port}"
    return facts


def render_rust(facts: RustFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM {facts.image} AS builder",
        "# openssl-libs-static: musl links the final binary statically, so the linker",
        "# needs libssl.a/libcrypto.a - openssl-dev alone only satisfies the header",
        '# step (dependency rlibs still build, then the real bin fails with',
        '# "cannot find -lssl"). Verified live: without this, only the dummy main',
        "# links, which is exactly what hid the stale-cache bug.",
        "RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static",
        "WORKDIR /app",
        facts.copy_block,
        facts.build,
        "",
        f"FROM {facts.alpine_image}",
        "# openssl runtime libs (dep-solver pulls libssl3): musl builds against",
        "# system openssl link dynamically - without these, any native-tls handshake",
        "# dies at runtime. Harmless for pure-rustls binaries. ca-certificates covers",
        "# the native-roots branch the same way.",
        "RUN apk add --no-cache tini ca-certificates wget openssl",
        f"COPY --from=builder /app/target/release/{facts.binary} /usr/local/bin/{facts.binary}",
        facts.expose,
        "RUN addgroup -S app && adduser -S app -G app && \\\n    mkdir -p /data /logs && \\\n    chown -R app:app /data /logs && \\\n    chmod 0750 /data /logs",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        'ENTRYPOINT ["/sbin/tini", "--"]',
        f'CMD ["{facts.binary}"]',
    ]
    return finalize(
        body,
        RUST_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=ENV_SCAN,
        oci_title=sanitize(root.name),
    )