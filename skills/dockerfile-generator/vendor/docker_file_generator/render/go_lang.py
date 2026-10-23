"""Go detection and rendering.

Port of detect_go() in legacy/create-dockerfile-legacy.sh, including the
self-scan guards (the generator must never match a create-dockerfile.sh copy
inside the project), the ldflags -> ARG mapping, the vendored-build path and
the workspace layout.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, detect_health_endpoint, volume_line
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

GO_MARKERS = ("go.mod",)
HTTPS_PATTERN = r"tls|https|azidentity|azure|mongo.*ssl|crypto/tls|x509|certificate|ssl|InsecureSkipVerify"
CGO_PATTERN = r"cgo|sqlite|mattn|go-sqlite|#cgo|LDFLAGS|CFLAGS|gcc|musl|pkg-config"
LDFLAGS_PATTERN = r"ldflags|version.*="
BUILD_PATTERN = r"go build.*-o"
PORT_RUN_PATTERN = r"router\.Run|\.Run\("
RUN_TEST_SUFFIX = "_test.go"
BUILD_INCLUDES = ("*.go", "Makefile", "*.sh")
BUILD_EXCLUDES = ("create-dockerfile.sh", "Dockerfile*", ".dockerignore*")

DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
*_test.go
test/
tests/
testdata/
*.exe
*.dll
*.so
*.dylib
bin/
dist/
build/
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
# vendor/ is deliberately NOT excluded: vendored builds COPY vendor/ and
# build -mod=vendor from it (bug-048 audit). When the dir is absent the
# line would be a no-op anyway, so excluding it only breaks that case.
Makefile
"""

ENV_SCAN = EnvScan(
    patterns=(regex_names(r"os\.Getenv\(\"([A-Za-z_][A-Za-z0-9_]*)\""),),
    includes=("*.go",),
    label="go env names",
)


@dataclass
class GoFacts:
    language: str = "go"
    alpine_image: str = "alpine:3.24.1"
    version: str = ""
    minor: str = ""
    port: str = "8080"
    port_source: str = "framework default"
    health_path: str = "/health"
    health_guessed: bool = True
    health_source: str = "framework default (no health route in source)"
    https: bool = False
    cgo: bool = False
    ldflags: str = ""
    version_args: str = ""
    binary: str = ""
    binary_source: str = ""
    main_package: str = "."
    deps_copy: str = "COPY go.mod ./"
    vendor_copy: str = ""
    mod_flag: str = ""
    download_run: str = "RUN go mod download"
    build_cmd: str = ""
    builder_apks: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    cargo_copy_note: str = ""
    workspace: bool = False
    vendored: bool = False
    guessed: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    warnings_before_main_package: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    notes_before_port: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Go version: {self.version}"]
        lines.extend(self.notes_before_port)
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.append(f"[PASS] HTTPS: {'YES' if self.https else 'NO'}")
        lines.append(f"[PASS] CGO: {'ENABLED' if self.cgo else 'DISABLED'}")
        lines.append(f"[PASS] ldflags: {'YES' if self.ldflags else 'NO'}")
        lines.append(f"[PASS] Binary: {self.binary}")
        for warning in self.warnings_before_main_package:
            lines.append(f"[WARN] {warning}")
        lines.append(f"[PASS] Main package: {self.main_package}")
        lines.extend(self.notes)
        return lines


def detects(root: Path) -> bool:
    return (root / "go.mod").is_file()


def _source_files(root: Path, includes: tuple[str, ...]) -> list[Path]:
    return [
        path
        for path in sorted(root.rglob("*"))
        if path.is_file()
        and any(path.match(pattern) for pattern in includes)
        and not any(part in EXCLUDED_DIRS for part in path.parts)
    ]


def _first_match(root: Path, pattern: str, includes: tuple[str, ...], *, skip_tests: bool = True, build_guards: bool = False) -> str:
    for path in _source_files(root, includes):
        if build_guards and path.name in BUILD_EXCLUDES:
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if skip_tests and line.endswith(RUN_TEST_SUFFIX):
                continue
            if re.search(pattern, line):
                return line
    return ""


def detect_go(project_dir: str | Path = ".", *, health_override: str | None = None) -> GoFacts:
    root = Path(project_dir).resolve()
    facts = GoFacts()
    directory_name = root.name

    go_mod = root / "go.mod"
    text = go_mod.read_text(encoding="utf-8", errors="replace") if go_mod.is_file() else ""
    version = ""
    toolchain = ""
    for line in text.splitlines():
        if line.startswith("go ") and not version:
            version = line.split()[1] if len(line.split()) > 1 else ""
        if line.startswith("toolchain ") and not toolchain:
            parts = line.split()
            toolchain = parts[1].removeprefix("go") if len(parts) > 1 else ""
    if toolchain:
        version = toolchain
    facts.version = version
    match = re.match(r"([0-9]*\.[0-9]*)", version)
    facts.minor = match.group(1) if match else version

    port_line = _first_match(root, PORT_RUN_PATTERN, ("*.go",))
    port_match = re.search(r'":([0-9]{2,5})', port_line or "")
    if port_match:
        facts.port = port_match.group(1)
        facts.port_source = "port literal in .Run() call"
    else:
        facts.port = "8080"
        facts.port_source = "framework default (no .Run() port in source)"
        facts.guessed.append("port")

    facts.health_path, facts.health_guessed, facts.health_source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")

    facts.https = bool(_first_match(root, HTTPS_PATTERN, ("*.go",)))
    facts.cgo = bool(_first_match(root, CGO_PATTERN, ("*.go",)))

    ldflags_line = _first_match(root, LDFLAGS_PATTERN, BUILD_INCLUDES, build_guards=True)
    if ldflags_line:
        symbols = re.findall(r"-X ([A-Za-z0-9_./-]+)", ldflags_line)[:5]
        if symbols:
            flags = ""
            has_version = has_revision = False
            for symbol in symbols:
                if re.search(r"[Vv]ersion", symbol):
                    flags += f" -X {symbol}=${{APP_VERSION}}"
                    has_version = True
                elif re.search(r"[Rr]evision|Commit|SHA", symbol):
                    flags += f" -X {symbol}=${{REVISION}}"
                    has_revision = True
                else:
                    flags += f" -X {symbol}="
            facts.ldflags = f'-ldflags="-s -w{flags}"'
            args = ""
            if has_version:
                args = "ARG APP_VERSION=latest"
            if has_revision:
                args = f"{args}\n" if args else ""
                args = f"{args}ARG REVISION=latest"
            facts.version_args = args
        else:
            facts.ldflags = '-ldflags="-s -w -X main.version=${APP_VERSION}"'
            facts.version_args = "ARG APP_VERSION=latest"

    build_line = _first_match(root, BUILD_PATTERN, BUILD_INCLUDES, build_guards=True)
    if not build_line:
        facts.binary = directory_name
        facts.binary_source = "directory name (no build line found)"
    else:
        match = re.search(r"-o\s+(\S+)", build_line)
        binary = match.group(1) if match else ""
        if not binary or any(char in binary for char in "$(") or " " in binary:
            facts.binary = directory_name
            facts.binary_source = "directory name (-o target is a variable)"
        else:
            facts.binary = binary
            facts.binary_source = "project build line"

    main_package = "."
    if (root / "cmd" / facts.binary / "main.go").is_file():
        main_package = f"./cmd/{facts.binary}"
    else:
        cmd_dir = root / "cmd"
        mains = sorted(str(path.relative_to(root)) for path in cmd_dir.glob("*/main.go")) if cmd_dir.is_dir() else []
        if len(mains) == 1:
            main_package = f"./{Path(mains[0]).parent}"
        elif len(mains) > 1:
            facts.warnings.append("Ambiguous cmd/ layout (multiple mains) - defaulted to '.', fix GO_MAIN_PKG manually if the build fails")
    facts.main_package = main_package
    facts.warnings_before_main_package = [warning for warning in facts.warnings]

    if facts.cgo:
        # cgo needs a C toolchain and the default (dynamic-capable) build.
        facts.build_cmd = f"RUN go build {facts.ldflags} -o {facts.binary} {main_package}"
        facts.builder_apks = "RUN apk add --no-cache git gcc musl-dev"
    else:
        facts.build_cmd = f"RUN CGO_ENABLED=0 go build {facts.ldflags} -o {facts.binary} {main_package}"
        facts.builder_apks = "RUN apk add --no-cache git"

    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    deps_copy = "COPY go.mod go.sum ./" if (root / "go.sum").is_file() else "COPY go.mod ./"
    if (root / "go.work").is_file():
        facts.notes.append("[PASS] Type: workspace")
        deps_copy += "\nCOPY go.work ./"
        if (root / "go.work.sum").is_file():
            deps_copy += "\nCOPY go.work.sum ./"
    facts.deps_copy = deps_copy

    if (root / "vendor" / "modules.txt").is_file():
        facts.notes.append("[PASS] Type: vendored")
        facts.vendor_copy = "COPY vendor/ ./vendor/"
        facts.mod_flag = "-mod=vendor"
        facts.download_run = ""
        facts.build_cmd = re.sub(r"^RUN (\S+ )?go build ", lambda match: f"{match.group(0)}{facts.mod_flag} ", facts.build_cmd)
        facts.build_cmd = re.sub(r"[ ]{2,}", " ", facts.build_cmd)
        facts.vendored = True
    return facts


def render_go(facts: GoFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM golang:{facts.minor}-alpine AS builder",
        facts.builder_apks,
        "WORKDIR /app",
        "# Version stamp for -X symbols (ldflags line below); override with --build-arg",
        facts.version_args,
        facts.deps_copy,
        facts.vendor_copy,
        facts.download_run,
        "COPY . .",
        facts.build_cmd,
        "",
        f"FROM {facts.alpine_image}",
        "RUN apk add --no-cache tini ca-certificates wget",
        f"COPY --from=builder /app/{facts.binary} /usr/local/bin/{facts.binary}",
        f"EXPOSE {facts.port}",
        "RUN addgroup -S app && adduser -S app -G app",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        'ENTRYPOINT ["/sbin/tini", "--"]',
        f'CMD ["{facts.binary}"]',
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
        oci_source="local",
        oci_revision="unknown",
        extra_notes=(),
    )