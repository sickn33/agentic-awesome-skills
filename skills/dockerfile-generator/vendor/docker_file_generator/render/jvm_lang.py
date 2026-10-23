"""Kotlin, Swift and Scala detection and rendering.

Ported from detect_kotlin(), detect_swift() and detect_scala() in
legacy/create-dockerfile-legacy.sh: the three Kotlin packaging shapes, the
Swift executableTarget binary name, and Scala's frozen sbt bootstrap with its
dist/stage/package flows.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, detect_health_endpoint, port_from, volume_line
from .java_lang import JAR_SELECT_GRADLE, gradle_version, java_major
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

# ---------- Kotlin ----------

KT_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
build/
.gradle/
*.class
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

# ---------- Swift ----------

SWIFT_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
.build/
Packages/
*.xcodeproj
DerivedData/
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

# ---------- Scala ----------

SCALA_DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
target/
project/target/
.bsp/
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

SBT_BOOTSTRAP = """RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && \\
    rm -rf /var/lib/apt/lists/* && \\
    curl -fsSL https://github.com/sbt/sbt/releases/download/v1.9.9/sbt-1.9.9.tgz -o /tmp/sbt.tgz && \\
    echo 'c57cae60c2122ca1bba77184dfb4d0d25fc6c18805394ab36ab6208b0c0f262f  /tmp/sbt.tgz' | sha256sum -c - && \\
    tar -xzf /tmp/sbt.tgz -C /opt && \\
    ln -s /opt/sbt/bin/sbt /usr/local/bin/sbt"""

JVM_ENV_SCAN = EnvScan(
    patterns=(regex_names(r"System\.getenv\(\"([A-Za-z_][A-Za-z0-9_]*)\""),),
    includes=("*.kt",),
    label="kotlin env names",
)


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


def _port(root: Path, pattern: str, includes: tuple[str, ...], default: str, facts_port: list[str]) -> str:
    line = _first_match(root, pattern, includes)
    port = port_from(line) if line else ""
    if port:
        return port
    facts_port.append("port")
    return default


# ---------- Kotlin ----------

@dataclass
class KotlinFacts:
    language: str = "kotlin"
    framework: str = "kotlin"
    port: str = "8080"
    health_path: str = "/health"
    health_guessed: bool = True
    java_major: str = "21"
    gradle_version: str = "8.5"
    builder_image: str = ""
    files_copy: str = "COPY build.gradle.kts ./"
    gradle_copy: str = ""
    gradle_chmod: str = ""
    src_copy: str = "COPY src ./src"
    build: str = ""
    artifact: str = ""
    run_cmd: str = ""
    gradle_cmd: str = "gradle"
    ktor_app: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ===", f"[PASS] Framework: {self.framework}"]
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        lines.extend(self.notes)
        for warning in self.warnings:
            lines.append(f"[WARN] {warning}")
        return lines


def detects_kotlin(root: Path) -> bool:
    return (root / "build.gradle.kts").is_file()


def detect_kotlin(project_dir: str | Path = ".", *, health_override: str | None = None) -> KotlinFacts:
    root = Path(project_dir).resolve()
    facts = KotlinFacts()
    facts.java_major = java_major(root)
    facts.gradle_version = gradle_version(root)

    kts = root / "build.gradle.kts"
    text = kts.read_text(encoding="utf-8", errors="replace") if kts.is_file() else ""
    if "io.ktor" in text:
        facts.framework = "ktor"
    elif "org.springframework" in text:
        facts.framework = "spring"
    else:
        facts.framework = "kotlin"

    facts.port = _port(root, r"port|PORT", ("*.kt", "*.properties", "*.yml"), "8080", facts.guessed)
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    gradlew = root / "gradlew"
    if gradlew.is_file():
        facts.gradle_cmd = "./gradlew"
        facts.gradle_copy = "COPY gradlew ./"
        facts.gradle_chmod = "RUN chmod +x ./gradlew"
        if (root / "gradle").is_dir():
            facts.gradle_copy += "\nCOPY gradle/ ./gradle/"
    else:
        facts.gradle_cmd = "gradle"
        facts.gradle_copy = ""

    if (root / "settings.gradle.kts").is_file() or (root / "settings.gradle").is_file():
        facts.files_copy += "\nCOPY settings.gradle* ./"

    settings = [path for path in (root / "settings.gradle.kts", root / "settings.gradle") if path.is_file()]
    if any(re.search(r"^\s*include", path.read_text(encoding="utf-8", errors="replace"), re.MULTILINE) for path in settings):
        facts.notes.append("[PASS] Multi-project gradle: full-context copy")
        facts.files_copy = "COPY . ."
        facts.gradle_copy = ""
        facts.src_copy = ""

    if facts.framework == "spring":
        facts.build = f"RUN {facts.gradle_cmd} bootJar --no-daemon && {JAR_SELECT_GRADLE}"
        facts.artifact = "COPY --from=builder /app/app.jar /app/app.jar"
        facts.run_cmd = 'CMD ["java", "-jar", "/app/app.jar"]'
    elif facts.framework == "ktor":
        app = ""
        for path in settings:
            match = re.search(r'rootProject\.name\s*=\s*"([^"]+)"', path.read_text(encoding="utf-8", errors="replace"))
            if match:
                app = match.group(1)
                break
        facts.ktor_app = app or root.name
        facts.build = f"RUN {facts.gradle_cmd} installDist --no-daemon"
        facts.artifact = f"COPY --from=builder /app/build/install/{facts.ktor_app} /app/install"
        facts.run_cmd = f'CMD ["/app/install/bin/{facts.ktor_app}"]'
        facts.notes.append(f"[PASS] Ktor app: {facts.ktor_app}")
    else:
        facts.build = f"RUN {facts.gradle_cmd} build --no-daemon && {JAR_SELECT_GRADLE}"
        facts.artifact = "COPY --from=builder /app/app.jar /app/app.jar"
        main_file = None
        src_dir = root / "src"
        if src_dir.is_dir():
            main_file = next(iter(sorted(src_dir.rglob("*.kt"))), None)
        if main_file is not None:
            content = main_file.read_text(encoding="utf-8", errors="replace")
            package = re.search(r"^\s*package\s+([A-Za-z0-9_.]+)", content, re.MULTILINE)
            prefix = f"{package.group(1)}." if package else ""
            base = main_file.stem
            if re.search(r"(^|\s)(class|object)\s+Main(\s|\{|:)", content):
                entry = f"{prefix}Main"
            else:
                entry = f"{prefix}{base}Kt"
            facts.run_cmd = f'CMD ["java", "-cp", "/app/*", "{entry}"]'
            facts.notes.append(f"[PASS] Plain Kotlin entry: {entry}")
        else:
            facts.run_cmd = 'CMD ["java", "-jar", "/app/app.jar"]'
            facts.warnings.append("Plain Kotlin has no source entrypoint; verify the jar manifest")
    return facts


def render_kotlin(facts: KotlinFacts, root: Path, options: RenderOptions) -> Render:
    gradle_image = facts.builder_image or f"gradle:{facts.gradle_version}-jdk{facts.java_major}"
    body = [
        f"FROM {gradle_image} AS builder",
        "WORKDIR /app",
        facts.files_copy,
        facts.gradle_copy,
        facts.gradle_chmod,
        facts.src_copy,
        facts.build,
        "",
        f"FROM eclipse-temurin:{facts.java_major}-jre-alpine",
        "RUN apk add --no-cache tini wget",
        facts.artifact,
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
        KT_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=JVM_ENV_SCAN,
        oci_title=sanitize(root.name),
    )


# ---------- Swift ----------

@dataclass
class SwiftFacts:
    language: str = "swift"
    framework: str = "swift"
    port: str = "8080"
    health_path: str = "/health"
    health_guessed: bool = True
    image: str = "swift:5.10-amazonlinux2"
    image_source: str = "registry default"
    binary: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)

    def detective_lines(self) -> list[str]:
        return ["=== Detective Results ===", f"[PASS] Framework: {self.framework}", f"[PASS] Port: {self.port}", f"[PASS] Health: {self.health_path}"]


def detects_swift(root: Path) -> bool:
    return (root / "Package.swift").is_file()


def swift_image(root: Path, default: str = "swift:5.10-amazonlinux2") -> tuple[str, str]:
    package = root / "Package.swift"
    if package.is_file():
        match = re.search(r"swift-tools-version:\s*([0-9]+\.[0-9]+)", package.read_text(encoding="utf-8", errors="replace"))
        if match:
            version = match.group(1)
            if version in {"5.9", "5.10"}:
                return default, "registry default"
            if version.startswith("6."):
                return f"swift:{version}-amazonlinux2", "Package.swift"
    return default, "registry default"


def detect_swift(project_dir: str | Path = ".", *, health_override: str | None = None) -> SwiftFacts:
    root = Path(project_dir).resolve()
    facts = SwiftFacts()
    facts.image, facts.image_source = swift_image(root)
    package = root / "Package.swift"
    text = package.read_text(encoding="utf-8", errors="replace") if package.is_file() else ""
    facts.framework = "vapor" if "vapor" in text else "swift"
    facts.port = _port(root, r"PORT|listen|bind", ("*.swift",), "8080", facts.guessed)
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")
    match = re.search(r'executableTarget\s*\(\s*name\s*:\s*"([^"]+)"', text)
    facts.binary = match.group(1) if match else root.name.lower()
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)
    return facts


def render_swift(facts: SwiftFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM {facts.image} AS builder",
        "WORKDIR /app",
        "COPY Package.swift ./",
        "RUN swift package resolve",
        "COPY . .",
        "RUN swift build -c release",
        "",
        f"FROM {facts.image}",
        "RUN yum install -y --skip-broken wget shadow-utils && yum clean all",
        "WORKDIR /app",
        f"COPY --from=builder /app/.build/release/{facts.binary} /usr/local/bin/{facts.binary}",
        "# WORKDIR above lets the env-name inserter anchor here (absolute COPY",
        "# destinations are unaffected by it).",
        f"EXPOSE {facts.port}",
        "RUN useradd -m app",
        "USER app",
        health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
        facts.volume_line,
        # The Bash heredoc escapes $ so the image shell expands it at runtime.
        'ENTRYPOINT ["/bin/sh", "-c", "exec \\"$@\\"", "--"]',
        f'CMD ["{facts.binary}"]',
    ]
    return finalize(
        body,
        SWIFT_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=EnvScan(patterns=(regex_names(r"""environment\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]"""),), includes=("*.swift",), label="swift env names"),
        oci_title=sanitize(root.name),
    )


# ---------- Scala ----------

@dataclass
class ScalaFacts:
    language: str = "scala"
    framework: str = "scala"
    port: str = "9000"
    health_path: str = "/health"
    health_guessed: bool = True
    java_major: str = "21"
    builder_image: str = "eclipse-temurin:11-jdk"
    bootstrap: str = SBT_BOOTSTRAP
    project_copy: str = ""
    binary: str = "server"
    build: str = ""
    artifact: str = ""
    run_cmd: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    fatal: str = ""
    gradle_cmd: str = "gradle"
    ktor_app: str = ""
    packaging: str = ""
    java_pinned: bool = False
    pre_binary_warnings: list[str] = field(default_factory=list)

    def scala_detective_lines(self) -> list[str]:
        # Binary is printed after the packaging note; the sbt warning comes
        # before it, the builder override after.
        lines = ["=== Detective Results ===", f"[PASS] Framework: {self.framework}"]
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.health_path}")
        # Two warning sources with different positions: the sbt-version check
        # runs before Binary is resolved, mainClass after.
        for warning in self.pre_binary_warnings:
            lines.append(f"[WARN] {warning}")
        lines.append(f"[PASS] Binary: {self.binary}")
        for warning in self.warnings:
            lines.append(f"[WARN] {warning}")
        for note in self.notes:
            lines.append(note)
        return lines



def detects_scala(root: Path) -> bool:
    return (root / "build.sbt").is_file()


def detect_scala(project_dir: str | Path = ".", *, health_override: str | None = None, sbt_image: str | None = None, java_pinned: bool = False) -> ScalaFacts:
    root = Path(project_dir).resolve()
    facts = ScalaFacts()
    sbt = root / "build.sbt"
    text = sbt.read_text(encoding="utf-8", errors="replace") if sbt.is_file() else ""
    if "play" in text:
        facts.framework = "play"
    elif "akka-http" in text:
        facts.framework = "akka"
    elif "http4s" in text:
        facts.framework = "http4s"
    else:
        facts.framework = "scala"

    facts.port = _port(root, r"port|PORT", ("*.scala", "*.conf"), "9000", facts.guessed)
    facts.health_path, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")
    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    if (root / "project").is_dir():
        facts.project_copy = "COPY project/ ./project/"

    # sbt itself fetches scalaVersion, but an old sbt or JDK breaks new builds:
    # freeze JDK 11 + sbt 1.9.9 and warn when the project asks for another sbt.
    if sbt_image:
        facts.builder_image = sbt_image
        facts.bootstrap = ""
    else:
        properties = root / "project" / "build.properties"
        if properties.is_file():
            match = re.search(r"^sbt\.version\s*=\s*([0-9]+\.[0-9]+)", properties.read_text(encoding="utf-8", errors="replace"), re.MULTILINE)
            version = match.group(1) if match else ""
            # Bash: case "" | 1.5) no warning ;; *) warn
            if version and version != "1.5":
                facts.pre_binary_warnings.append(f"project/build.properties sbt {version}: frozen builder ships sbt 1.5.5 - override with SBT_IMAGE=<tag> if needed")

    if java_pinned and facts.java_major != "11":
        if not sbt_image:
            facts.fatal = f"Scala project pins Java {facts.java_major}, but the default SBT builder uses Java 11; set SBT_IMAGE to a compatible builder"
            return facts
        facts.notes.append(f"[PASS] Scala builder override: {facts.builder_image}")

    match = re.search(r'^\s*name\s*:=\s*"([^"]+)"', text, re.MULTILINE)
    facts.binary = re.sub(r"[^a-z0-9_-]", "", match.group(1).lower()) if match else "server"

    sbt_files = [sbt] + sorted((root / "project").glob("*.sbt")) + sorted((root / "project").glob("*.scala"))
    sbt_text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in sbt_files if path.is_file())
    if "PlayScala" in sbt_text or "PlayJava" in sbt_text:
        facts.packaging = "dist"
        facts.notes.append("[PASS] Scala packaging: dist (Play)")
        facts.build = "RUN sbt dist"
        facts.artifact = "COPY --from=builder /app/target/universal/*.zip .\nRUN unzip ./*.zip && mv -- */ /app"
        facts.run_cmd = f'CMD ["/app/bin/{facts.binary}"]'
    elif "JavaAppPackaging" in sbt_text or "sbt-native-packager" in sbt_text:
        facts.packaging = "stage"
        facts.notes.append("[PASS] Scala packaging: stage (native-packager)")
        facts.build = "RUN sbt stage"
        facts.artifact = f"COPY --from=builder /app/target/universal/stage /app/stage\nRUN chmod +x /app/stage/bin/{facts.binary}"
        facts.run_cmd = f'CMD ["/app/stage/bin/{facts.binary}"]'
    else:
        facts.packaging = "package"
        main = re.search(r'mainClass\s*:=\s*Some\("([^"]+)"\)', text)
        facts.build = "RUN sbt package"
        facts.artifact = "COPY --from=builder /app/target/scala-*/*.jar /app/"
        if main:
            facts.run_cmd = f'CMD ["java", "-cp", "/app/*", "{main.group(1)}"]'
        else:
            facts.run_cmd = '# TODO: set mainClass in build.sbt, then use: CMD ["java", "-cp", "/app/*", "com.example.Main"]'
            facts.warnings.append("No mainClass in build.sbt - CMD left as TODO")
        facts.notes.append("[PASS] Scala packaging: package (plain)")
    return facts


def render_scala(facts: ScalaFacts, root: Path, options: RenderOptions) -> Render:
    body = [
        f"FROM {facts.builder_image} AS builder",
        facts.bootstrap,
        "WORKDIR /app",
        "COPY build.sbt ./",
        facts.project_copy,
        "RUN sbt update",
        "COPY . .",
        facts.build,
        "",
        "FROM eclipse-temurin:11-jre-alpine",
        "RUN apk add --no-cache bash tini wget unzip",
        "WORKDIR /app",
        facts.artifact,
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
        SCALA_DOCKERIGNORE,
        root,
        options,
        detected_port=facts.port,
        detected_health=facts.health_path,
        guessed=facts.guessed,
        env_scan=EnvScan(patterns=(regex_names(r'sys\.env(\.get)?\("([A-Za-z_][A-Za-z0-9_]*)"'),), includes=("*.scala",), label="scala env names"),
        oci_title=sanitize(root.name),
    )