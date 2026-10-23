"""Elixir, Clojure and Haskell detection and rendering.

Ported from detect_elixir(), detect_clojure() and detect_haskell() in
legacy/create-dockerfile-legacy.sh: mix release naming, the lein/deps.uberjar
paths with their fail-loud rules, and the GHC image that follows the stack
resolver.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, detect_health_endpoint, port_from, volume_line
from .java_lang import JAR_SELECT_MVN, java_major
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

# ---------- Elixir ----------

ELIXIR_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
_build/
deps/
*.ez
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
"""

# ---------- Clojure ----------

CLOJURE_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
target/
.lein-*
.nrepl-port
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
"""

# ---------- Haskell ----------

HASKELL_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
.stack-work/
dist-newstyle/
*.hi
*.o
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
"""

ELIXIR_ENV_SCAN = EnvScan(patterns=(regex_names(r'System\.get_env\("([A-Za-z_][A-Za-z0-9_]*)"'),), includes=("*.ex", "*.exs"), label="elixir env names")
CLOJURE_ENV_SCAN = EnvScan(patterns=(regex_names(r'System/getenv "([A-Za-z_][A-Za-z0-9_]*)"'),), includes=("*.clj", "*.edn"), label="clojure env names")
HASKELL_ENV_SCAN = EnvScan(patterns=(regex_names(r'(lookupEnv|getEnv) *"([A-Za-z_][A-Za-z0-9_]*)"'),), includes=("*.hs",), label="haskell env names")


def _first_match(root: Path, pattern: str, includes: tuple[str, ...]) -> str:
    for path in sorted(root.rglob("*")):
        if not path.is_file() or not any(path.match(glob) for glob in includes):
            continue
        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if re.search(pattern, line):
                return line
    return ""


def _port(root: Path, pattern: str, includes: tuple[str, ...], default: str, guessed: list[str]) -> str:
    line = _first_match(root, pattern, includes)
    port = port_from(line) if line else ""
    if port:
        return port
    guessed.append("port")
    return default


# ---------- Elixir ----------

@dataclass
class ElixirFacts:
    language: str = "elixir"
    alpine_image: str = "alpine:3.24.1"
    framework: str = "elixir"
    port: str = "4000"
    health_path: str = "/health"
    health_guessed: bool = True
    image: str = "elixir:1.15-alpine"
    image_source: str = "registry default"
    release: str = ""
    deps_copy: str = "COPY mix.exs ./"
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Framework: {self.framework}"]
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.append(f"[PASS] Release: {self.release}")
        for warning in self.warnings:
            lines.append(f"[WARN] {warning}")
        return lines


def detects_elixir(root: Path) -> bool:
    return (root / "mix.exs").is_file()


def elixir_image(root: Path, default: str = "elixir:1.15-alpine") -> tuple[str, str]:
    tool_versions = root / ".tool-versions"
    if tool_versions.is_file():
        for line in tool_versions.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.split("#", 1)[0].split()[:1] == ["elixir"]:
                match = re.match(r"([0-9]+\.[0-9]+)", line.split("#", 1)[0].split()[1])
                if match:
                    return f"elixir:{match.group(1)}-alpine", ".tool-versions"
    return default, "registry default"


def detect_elixir(project_dir: str | Path = ".", *, health_override: str | None = None) -> ElixirFacts:
    root = Path(project_dir).resolve()
    facts = ElixirFacts()
    facts.image, facts.image_source = elixir_image(root)
    mix = root / "mix.exs"
    text = mix.read_text(encoding="utf-8", errors="replace") if mix.is_file() else ""
    facts.framework = "phoenix" if "phoenix" in text else "elixir"
    facts.port = _port(root, r"PORT|http:", ("*.exs", "*.ex"), "4000", facts.guessed)
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")
    match = re.search(r"app:[ \t]*:([A-Za-z0-9_]+)", text)
    facts.release = match.group(1) if match else root.name
    facts.deps_copy = "COPY mix.exs mix.lock ./" if (root / "mix.lock").is_file() else "COPY mix.exs ./"
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)
    if facts.framework == "phoenix":
        facts.warnings.append("Phoenix needs SECRET_KEY_BASE at runtime or it crashes on boot")
    return facts


def render_elixir(facts: ElixirFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM {facts.image} AS builder",
        "RUN apk add --no-cache build-base",
        "WORKDIR /app",
        facts.deps_copy,
        "RUN mix deps.get --only prod && mix deps.compile",
        "COPY . .",
        "RUN MIX_ENV=prod mix release",
        "",
        f"FROM {facts.alpine_image}",
        "RUN apk add --no-cache tini wget libstdc++ openssl ncurses-libs",
        f"COPY --from=builder /app/_build/prod/rel/{facts.release} /app",
        f"EXPOSE {facts.port}",
        "RUN addgroup -S app && adduser -S app -G app",
        "# O1: Phoenix releases start NO web server without PHX_SERVER=true.",
        "# SECRET_KEY_BASE has no safe default - pass it at runtime (see NEXT STEPS).",
        "ENV PHX_SERVER=true",
        "# ENV SECRET_KEY_BASE=change-me-at-runtime",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        'ENTRYPOINT ["/sbin/tini", "--"]',
        f'CMD ["/app/bin/{facts.release}", "start"]',
    ]
    return finalize(
        body,
        ELIXIR_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=ELIXIR_ENV_SCAN,
        oci_title=sanitize(root.name),
    )


# ---------- Clojure ----------

@dataclass
class ClojureFacts:
    language: str = "clojure"
    build_tool: str = "deps"
    framework: str = "clojure"
    port: str = "3000"
    health_path: str = "/health"
    health_guessed: bool = True
    java_major: str = "21"
    clj_java: str = "11"
    lein_image: str = ""
    deps_image: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        return [
            "=== Detective Results ===",
            f"[PASS] Build tool: {self.build_tool}",
            f"[PASS] Framework: {self.framework}",
            f"[PASS] Port: {self.port}",
            f"[PASS] Health: {self.health_path}",
        ]


def detects_clojure(root: Path) -> bool:
    return (root / "project.clj").is_file() or (root / "deps.edn").is_file()


def detect_clojure(project_dir: str | Path = ".", *, health_override: str | None = None, java_pinned: bool = False, lein_image: str | None = None, deps_image: str | None = None) -> ClojureFacts:
    root = Path(project_dir).resolve()
    facts = ClojureFacts()
    project = root / "project.clj"
    facts.build_tool = "lein" if project.is_file() else "deps"
    if project.is_file():
        text = project.read_text(encoding="utf-8", errors="replace")
        if "ring" in text or "compojure" in text:
            facts.framework = "ring"
        elif "luminus" in text:
            facts.framework = "luminus"
        else:
            facts.framework = "clojure"
    else:
        facts.framework = "clojure"
    facts.port = _port(root, r"PORT|port", ("*.clj", "*.edn"), "3000", facts.guessed)
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    # Builder follows the pinned JDK; the default stays 11 on purpose.
    facts.java_major = java_major(root)
    facts.clj_java = facts.java_major if java_pinned else "11"
    facts.lein_image = lein_image or f"clojure:temurin-{facts.clj_java}-lein"
    facts.deps_image = deps_image or f"clojure:temurin-{facts.clj_java}-tools-deps"
    return facts


def render_clojure(facts: ClojureFacts, root: Path, options: RenderOptions) -> Render:
    if facts.build_tool == "lein":
        build = (
            "RUN lein uberjar && \\\n"
            "    JAR=\"$(find /app/target -type f -name '*.jar' -not -name '*-sources.jar' -not -name '*-javadoc.jar' -printf '%s %p\\n' | sort -nr | head -1 | cut -d' ' -f2-)\" && \\\n"
            '    test -n "$JAR" && cp "$JAR" /app/app.jar'
        )
        builder = [
            f"FROM {facts.lein_image} AS builder",
            "WORKDIR /app",
            "COPY project.clj .",
            "RUN lein deps",
            "COPY . .",
            build,
        ]
    else:
        build = (
            "RUN clojure -T:build uberjar 2>/dev/null || clojure -X:build uberjar 2>/dev/null || \\\n"
            "    (echo 'ERROR: no :build uberjar alias in deps.edn - add tools.build with an uberjar alias' >&2; exit 1) && "
            + JAR_SELECT_MVN
        )
        builder = [
            f"FROM {facts.deps_image} AS builder",
            "WORKDIR /app",
            "COPY deps.edn .",
            "RUN clojure -P",
            "COPY . .",
            build,
        ]
    body = builder + [
        "",
        f"FROM eclipse-temurin:{facts.java_major}-jre-alpine",
        "RUN apk add --no-cache tini wget",
        "COPY --from=builder /app/app.jar /app/app.jar",
        f"EXPOSE {facts.port}",
        "RUN addgroup -S app && adduser -S app -G app",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        'ENTRYPOINT ["/sbin/tini", "--"]',
        'CMD ["java", "-jar", "/app/app.jar"]',
    ]
    return finalize(
        body,
        CLOJURE_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=CLOJURE_ENV_SCAN,
        oci_title=sanitize(root.name),
    )


# ---------- Haskell ----------

@dataclass
class HaskellFacts:
    language: str = "haskell"
    build_tool: str = "cabal"
    framework: str = "haskell"
    port: str = "8080"
    health_path: str = "/health"
    health_guessed: bool = True
    image: str = "haskell:9.4"
    image_note: str = ""
    binary: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Build tool: {self.build_tool}"]
        lines.append(f"[PASS] Framework: {self.framework}")
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        if self.image_note:
            lines.append(self.image_note)
        return lines


def detects_haskell(root: Path) -> bool:
    return any(root.glob("*.cabal")) or (root / "stack.yaml").is_file()


def detect_haskell(project_dir: str | Path = ".", *, health_override: str | None = None, haskell_image: str | None = None) -> HaskellFacts:
    root = Path(project_dir).resolve()
    facts = HaskellFacts()
    stack = root / "stack.yaml"
    facts.build_tool = "stack" if stack.is_file() else "cabal"

    manifests = sorted(root.glob("*.cabal")) + ([stack] if stack.is_file() else [])
    text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in manifests if path.is_file())
    if "yesod" in text:
        facts.framework = "yesod"
    elif "servant" in text:
        facts.framework = "servant"
    elif "scotty" in text:
        facts.framework = "scotty"
    else:
        facts.framework = "haskell"

    facts.port = _port(root, r"PORT|port", ("*.hs", "*.yaml"), "8080", facts.guessed)
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    for path in sorted(root.glob("*.cabal")):
        match = re.search(r"^executable\s+([A-Za-z0-9_-]+)", path.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        if match:
            facts.binary = match.group(1)
            break
    facts.binary = facts.binary or root.name
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    # GHC follows the stack resolver: lts-22 needs 9.6, building with the
    # wrong --system-ghc fails.
    if haskell_image:
        facts.image = haskell_image
        facts.image_note = f"[PASS] GHC image: {facts.image} (from HASKELL_IMAGE env)"
    elif facts.build_tool == "stack" and stack.is_file():
        match = re.search(r"^resolver:[ \t]*lts-([0-9]+)", stack.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
        lts = match.group(1) if match else ""
        image = {"22": "haskell:9.6", "21": "haskell:9.4", "20": "haskell:9.2"}.get(lts, "haskell:9.4")
        facts.image = image
        if image != "haskell:9.4":
            facts.image_note = f"[PASS] GHC image: {facts.image} (from stack.yaml resolver)"
    return facts


def render_haskell(facts: HaskellFacts, root: Path, options: RenderOptions) -> Render:
    if facts.build_tool == "stack":
        builder = [
            f"FROM {facts.image} AS builder",
            "WORKDIR /app",
            "COPY *.cabal stack.yaml ./",
            'RUN stack build --system-ghc --dependencies-only || echo "WARNING: dependency prime failed - full build will retry" >&2',
            "COPY . .",
            "RUN stack build --system-ghc --copy-bins",
        ]
        copy_line = f"COPY --from=builder /root/.local/bin/{facts.binary} /usr/local/bin/{facts.binary}"
    else:
        builder = [
            f"FROM {facts.image} AS builder",
            "WORKDIR /app",
            "COPY *.cabal ./",
            "RUN cabal update",
            "COPY . .",
            f"RUN cabal build all --enable-optimization && \\\n    BIN=$(find dist-newstyle -type f -name \"{facts.binary}\" -print -quit) && \\\n    cp \"$BIN\" /tmp/{facts.binary}",
        ]
        copy_line = f"COPY --from=builder /tmp/{facts.binary} /usr/local/bin/{facts.binary}"
    body = builder + [
        "",
        f"FROM {facts.image}",
        "RUN useradd -m app",
        "WORKDIR /app",
        copy_line,
        f"EXPOSE {facts.port}",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        # The image shell expands $@ at runtime.
        'ENTRYPOINT ["/bin/sh", "-c", "exec \\"$@\\"", "--"]',
        f'CMD ["{facts.binary}"]',
    ]
    return finalize(
        body,
        HASKELL_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=HASKELL_ENV_SCAN,
        oci_title=sanitize(root.name),
    )