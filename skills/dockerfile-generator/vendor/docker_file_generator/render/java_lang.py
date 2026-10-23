"""Java detection and rendering.

Port of detect_java() in legacy/create-dockerfile-legacy.sh: maven/gradle
selection, wrapper preference, multi-module full-context copies, the three
packaging shapes (quarkus-app, micronaut shadowJar, plain fat jar) and the
Spring/Quarkus health-route upgrades.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.common import EXCLUDED_DIRS, detect_data_dirs, detect_health_endpoint, port_from, volume_line
from .postprocess import EnvScan, Render, RenderOptions, finalize, health_block, regex_names, sanitize

MARKERS = ("pom.xml", "build.gradle")
HEALTH_INCLUDES = ("*.java", "*.xml", "*.properties", "*.yml", "*.yaml")
PORT_INCLUDES = ("*.java", "*.properties", "*.yml", "*.yaml")
ACTUATOR_PATTERN = r"actuator"
SMALLRYE_PATTERN = r"smallrye-health|quarkus-smallrye"

JAR_SELECT_MVN = 'JAR=$(ls -t /app/target/*.jar 2>/dev/null | grep -vE \'\\.original$|-sources\\.jar|-javadoc\\.jar\' | head -1); [ -n "$JAR" ] && cp "$JAR" /app/app.jar'
JAR_SELECT_GRADLE = 'JAR=$(ls -t /app/build/libs/*.jar 2>/dev/null | grep -vE -e \'-plain\\.jar$|-sources\\.jar|-javadoc\\.jar\' | head -1); [ -n "$JAR" ] && cp "$JAR" /app/app.jar'

DOCKERIGNORE = """\
.git
.gitignore
README.md
*.md
docs/
target/
build/
.gradle/
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
settings.xml
"""

ENV_SCAN = EnvScan(
    patterns=(
        regex_names(r"System\.getenv\(\"([A-Za-z_][A-Za-z0-9_]*)\""),
    ),
    includes=("*.java",),
    label="java env names",
)


@dataclass
class JavaFacts:
    language: str = "java"
    build_tool: str = ""
    package: str = ""
    port: str = "8080"
    health_path: str = "/health"
    health_guessed: bool = True
    health_note: str = ""
    framework: str = "java"
    java_major: str = "21"
    gradle_version: str = "8.5"
    builder_image: str = ""
    build_cmd: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    run_cmd: str = ""
    detected_health: str = "/health"
    private_registry: bool = False
    guessed: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)
    notes_after_health: list[str] = field(default_factory=list)
    mvn_cmd: str = "mvn"
    mvn_copy: str = ""
    mvn_chmod: str = ""
    gradle_cmd: str = "gradle"
    gradle_copy: str = ""
    gradle_chmod: str = ""
    gradle_files_copy: str = ""
    gradle_src_copy: str = ""
    java_copy1: str = ""
    java_offline: str = ""
    java_copy2: str = ""
    mvn_build: str = ""
    mvn_artifact: str = ""
    gradle_build: str = ""
    gradle_artifact: str = ""
    secret_rewrites: tuple[tuple[str, str, int], ...] = ()

    def detective_lines(self) -> list[str]:
        lines = ["=== Detective Results ==="]
        lines.append(f"[PASS] Build tool: {self.build_tool}")
        lines.append(f"[PASS] Package: {self.package}")
        lines.append(f"[PASS] Port: {self.port}")
        lines.append(f"[PASS] Health: {self.detected_health}")
        lines.append(f"[PASS] Framework: {self.framework}")
        if self.health_note:
            lines.append(self.health_note)
        lines.append(f"[PASS] Build cmd: {self.build_cmd}")
        lines.extend(self.notes)
        lines.extend(self.notes_after_health)
        return lines


def detects(root: Path) -> bool:
    return (root / "pom.xml").is_file() or (root / "build.gradle").is_file()


def _files(root: Path, includes: tuple[str, ...]) -> list[Path]:
    return [
        path
        for path in sorted(root.rglob("*"))
        if path.is_file()
        and any(path.match(pattern) for pattern in includes)
        and not any(part in EXCLUDED_DIRS for part in path.parts)
    ]


def _first_match(root: Path, pattern: str, includes: tuple[str, ...]) -> str:
    for path in _files(root, includes):
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if re.search(pattern, line):
                return line
    return ""


def _any_match(root: Path, pattern: str, includes: tuple[str, ...]) -> bool:
    return bool(_first_match(root, pattern, includes))


def _xml_value(tag: str, path: Path) -> str:
    """Portable <tag>value</tag> extractor, matching the Bash xml_value.

    The Bash helper is a greedy `.*<tag>([^<]+)</tag>.*` sed | head -1:
    `.*` is greedy, so on a line with several tags the LAST closing tag wins,
    and the first matching LINE wins overall.
    """
    if not path.is_file():
        return ""
    pattern = re.compile(rf".*<{tag}>([^<]+)</{tag}>.*")
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        match = pattern.match(line)
        if match:
            return match.group(1)
    return ""


def java_major(root: Path) -> str:
    version_file = root / ".java-version"
    if version_file.is_file():
        match = re.search(r"[0-9]+", version_file.read_text(encoding="utf-8", errors="replace"))
        if match and match.group(0) in {"11", "17", "21"}:
            return match.group(0)
    tool_versions = root / ".tool-versions"
    if tool_versions.is_file():
        for line in tool_versions.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.split("#", 1)[0].split()[:1] == ["java"]:
                match = re.search(r"[0-9]+", line.split("#", 1)[0])
                if match and match.group(0) in {"11", "17", "21"}:
                    return match.group(0)
    return "21"


def gradle_version(root: Path) -> str:
    properties = root / "gradle" / "wrapper" / "gradle-wrapper.properties"
    if properties.is_file():
        match = re.search(r"gradle-([0-9]+\.[0-9]+)", properties.read_text(encoding="utf-8", errors="replace"))
        if match:
            return match.group(1)
    return "8.5"


def detect_java(project_dir: str | Path = ".", *, health_override: str | None = None) -> JavaFacts:
    root = Path(project_dir).resolve()
    facts = JavaFacts()
    facts.java_major = java_major(root)
    facts.gradle_version = gradle_version(root)

    pom = root / "pom.xml"
    gradle = root / "build.gradle"
    if pom.is_file():
        facts.build_tool = "maven"
        facts.package = _xml_value("artifactId", pom)
    elif gradle.is_file():
        facts.build_tool = "gradle"
        match = re.search(r"archivesBaseName\s*=\s*'([^']+)'", gradle.read_text(encoding="utf-8", errors="replace"))
        facts.package = match.group(1) if match else root.name

    port_line = _first_match(root, r"server\.port|PORT", PORT_INCLUDES)
    port = port_from(port_line) if port_line else ""
    if not port or len(port) > 5:
        facts.port = "8080"
        facts.guessed.append("port")
    else:
        facts.port = port

    facts.detected_health, facts.health_guessed, _source = detect_health_endpoint(root, health_override)
    facts.health_path = facts.detected_health
    if facts.health_guessed:
        facts.guessed.append("health")

    manifests = [path for path in (pom, gradle) if path.is_file()]
    manifest_text = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in manifests)
    if "spring" in manifest_text:
        facts.framework = "spring"
    elif "quarkus" in manifest_text:
        facts.framework = "quarkus"
    elif "micronaut" in manifest_text:
        facts.framework = "micronaut"
    else:
        facts.framework = "java"

    # Framework health routes replace a guessed /health only.
    if facts.framework == "spring" and facts.health_path == "/health" and _any_match(root, ACTUATOR_PATTERN, HEALTH_INCLUDES):
        facts.health_path = "/actuator/health"
        facts.health_guessed = False
        facts.guessed = [word for word in facts.guessed if word != "health"]
        facts.health_note = "[PASS] Health: /actuator/health (Spring actuator detected)"
    if facts.framework == "quarkus" and facts.health_path == "/health" and _any_match(root, SMALLRYE_PATTERN, HEALTH_INCLUDES):
        facts.health_path = "/q/health"
        facts.health_guessed = False
        facts.guessed = [word for word in facts.guessed if word != "health"]
        facts.health_note = "[PASS] Health: /q/health (Quarkus smallrye-health detected)"

    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    mvnw = root / "mvnw"
    if mvnw.is_file():
        facts.mvn_cmd = "./mvnw"
        facts.mvn_copy = "COPY mvnw ./"
        facts.mvn_chmod = "RUN chmod +x ./mvnw"
        if (root / ".mvn").is_dir():
            facts.mvn_copy += "\nCOPY .mvn/ ./.mvn/"
    else:
        facts.mvn_cmd = "mvn"
        facts.mvn_copy = ""
        facts.mvn_chmod = ""

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
        facts.gradle_chmod = ""

    facts.build_cmd = facts.mvn_cmd if facts.build_tool == "maven" else facts.gradle_cmd

    gradle_files_copy = "COPY build.gradle ./"
    if (root / "settings.gradle").is_file() or (root / "settings.gradle.kts").is_file():
        gradle_files_copy += "\nCOPY settings.gradle* ./"

    settings = [path for path in (root / "settings.gradle", root / "settings.gradle.kts") if path.is_file()]
    multi_project = any(re.search(r"^\s*include", path.read_text(encoding="utf-8", errors="replace"), re.MULTILINE) for path in settings)
    if multi_project:
        facts.notes_after_health.append("[PASS] Multi-project gradle: full-context copy")
        facts.gradle_files_copy = "COPY . ."
        facts.gradle_copy = ""
        facts.gradle_src_copy = ""
    else:
        facts.gradle_files_copy = gradle_files_copy
        facts.gradle_src_copy = "COPY src ./src"

    poms = [path for path in root.glob("**/pom.xml") if "target" not in path.parts and len(path.relative_to(root).parts) <= 3]
    if len(poms) > 1:
        facts.notes_after_health.append("[PASS] Multi-module maven: full-context copy")
        facts.java_copy1 = "COPY . ."
        facts.java_offline = ""
        facts.java_copy2 = ""
    else:
        facts.java_copy1 = "COPY pom.xml ."
        facts.java_offline = f"RUN {facts.mvn_cmd} dependency:go-offline"
        facts.java_copy2 = "COPY src ./src"

    if facts.framework == "quarkus":
        facts.notes.append("[PASS] Quarkus packaging: quarkus-app runner")
        facts.mvn_build = f"RUN {facts.mvn_cmd} package -DskipTests"
        facts.mvn_artifact = "COPY --from=builder /app/target/quarkus-app /app/quarkus-app"
        facts.gradle_build = f"RUN {facts.gradle_cmd} build --no-daemon"
        facts.gradle_artifact = "COPY --from=builder /app/build/quarkus-app /app/quarkus-app"
        facts.run_cmd = 'CMD ["java", "-jar", "/app/quarkus-app/quarkus-run.jar"]'
    elif facts.framework == "micronaut" and facts.build_tool != "maven":
        facts.notes.append("[PASS] Micronaut packaging: shadowJar fat jar")
        facts.mvn_build = f"RUN {facts.mvn_cmd} package -DskipTests && {JAR_SELECT_MVN}"
        facts.mvn_artifact = "COPY --from=builder /app/app.jar /app/app.jar"
        facts.gradle_build = f"RUN {facts.gradle_cmd} shadowJar --no-daemon && {JAR_SELECT_GRADLE}"
        facts.gradle_artifact = "COPY --from=builder /app/app.jar /app/app.jar"
        facts.run_cmd = 'CMD ["java", "-jar", "/app/app.jar"]'
    else:
        facts.mvn_build = f"RUN {facts.mvn_cmd} package -DskipTests && {JAR_SELECT_MVN}"
        facts.mvn_artifact = "COPY --from=builder /app/app.jar /app/app.jar"
        facts.gradle_build = f"RUN {facts.gradle_cmd} bootJar --no-daemon && {JAR_SELECT_GRADLE}"
        facts.gradle_artifact = "COPY --from=builder /app/app.jar /app/app.jar"
        facts.run_cmd = 'CMD ["java", "-jar", "/app/app.jar"]'

    if (root / "settings.xml").is_file() and facts.build_tool == "maven":
        facts.private_registry = True
        # Two plain rewrites on purpose: a single alternation is not portable.
        facts.secret_rewrites = (
            (r"^RUN (\./mvnw) ", r"RUN --mount=type=secret,id=maven,target=/root/.m2/settings.xml \1 ", re.MULTILINE),
            (r"^RUN (mvn) ", r"RUN --mount=type=secret,id=maven,target=/root/.m2/settings.xml \1 ", re.MULTILINE),
        )
    return facts


def render_java(facts: JavaFacts, root: Path, options: RenderOptions) -> Render:
    maven_image = facts.builder_image or f"maven:3.9-eclipse-temurin-{facts.java_major}"
    gradle_image = facts.builder_image or f"gradle:{facts.gradle_version}-jdk{facts.java_major}"
    if facts.build_tool == "maven":
        body = [
            f"FROM {maven_image} AS builder",
            "WORKDIR /app",
            facts.java_copy1,
            facts.mvn_copy,
            facts.mvn_chmod,
            facts.java_offline,
            facts.java_copy2,
            facts.mvn_build,
            "",
            f"FROM eclipse-temurin:{facts.java_major}-jre-alpine",
            "RUN apk add --no-cache tini wget",
            facts.mvn_artifact,
            f"EXPOSE {facts.port}",
            "RUN addgroup -S app && adduser -S app -G app",
            "USER app",
            health_block(facts.port, facts.health_path, facts.health_guessed, options.health_start),
            facts.volume_line,
            'ENTRYPOINT ["/sbin/tini", "--"]',
            facts.run_cmd,
        ]
    else:
        body = [
            f"FROM {gradle_image} AS builder",
            "WORKDIR /app",
            facts.gradle_files_copy,
            facts.gradle_copy,
            facts.gradle_chmod,
            facts.gradle_src_copy,
            facts.gradle_build,
            "",
            f"FROM eclipse-temurin:{facts.java_major}-jre-alpine",
            "RUN apk add --no-cache tini wget",
            facts.gradle_artifact,
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
        secret_rewrites=facts.secret_rewrites,
    )