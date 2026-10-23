"""Multi-language plugin host.

One plugin class covers every migrated language. It detects the language,
runs that language's detection, renders through the shared post-processing and
prints the legacy console report. Anything a language has not implemented yet
raises Unsupported so the wrapper falls back to the Bash renderer instead of
producing a weaker result.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass, field
from pathlib import Path

from ..detection.python_lang import detect_python, has_python_files
from ..render import console
from ..render.csharp_php_lang import (
    detect_csharp,
    detect_php,
    detects_csharp,
    detects_php,
    render_csharp,
    render_php,
)
from ..render.fpv_lang import (
    detect_clojure,
    detect_elixir,
    detect_haskell,
    detects_clojure,
    detects_elixir,
    detects_haskell,
    render_clojure,
    render_elixir,
    render_haskell,
)
from ..render.generic_lang import detect_generic, render_generic
from ..render.go_lang import detect_go, render_go
from ..render.java_lang import detect_java, render_java
from ..render.jvm_lang import (
    detect_kotlin,
    detect_scala,
    detect_swift,
    detects_kotlin,
    detects_scala,
    detects_swift,
    java_major,
    render_kotlin,
    render_scala,
    render_swift,
)
from ..render.node_lang import (
    detect_node,
    detect_spa,
    detects_node,
    is_spa,
    node_image_notes,
    render_node,
    render_spa,
    spa_server_warning,
)
from ..render.python_dockerfile import RenderOptions, build_dockerfile_1, detect_env_names, detect_localhost_defaults
from ..render.ruby_lang import detect_ruby, render_ruby
from ..render.rust_lang import detect_rust, detects_rust, render_rust

FALLBACK_EXIT = 20
LANGUAGE_MANAGERS = ("environment", "project config", "CLI", "legacy dockerfile.conf")


class Unsupported(RuntimeError):
    """The plugin cannot serve this invocation; the caller must fall back."""


@dataclass
class GenerateRequest:
    project_dir: Path
    port: str = ""
    health: str = ""
    stopsignal: str = ""
    health_start: str = "10s"
    extra_copy: str = ""
    extra_run: str = ""
    extra_directives: str = ""
    fast: bool = False
    dry_run: bool = False
    write_dockerfile_2: bool = True
    compose: bool = False
    check: bool = False
    init: bool = False
    all_apps: bool = False
    # Resolved configuration overrides (only values the user actually set).
    images: dict[str, str] = field(default_factory=dict)
    backing: dict[str, str] = field(default_factory=dict)
    emit: list[str] = field(default_factory=list)


# Registry image key -> the facts field it replaces, per language.
IMAGE_FIELDS = {
    "python": {"images.python": "image"},
    "go": {},
    "node": {"images.node": "image", "images.deno": "deno_image", "images.nginx": "nginx_image"},
    "spa": {"images.node": "image", "images.nginx": "nginx_image"},
    "rust": {"images.rust": "image", "images.alpine": "alpine_image"},
    "java": {"images.maven": "builder_image", "images.gradle": "builder_image", "images.java_major": "java_major"},
    "kotlin": {"images.gradle": "builder_image", "images.java_major": "java_major"},
    "scala": {"images.sbt": "builder_image"},
    "ruby": {"images.ruby": "image"},
    "csharp": {"images.dotnet_major": "dotnet_major"},
    "php": {"images.php": "image"},
    "swift": {"images.swift": "image"},
    "elixir": {"images.elixir": "image", "images.alpine": "alpine_image"},
    "clojure": {"images.clojure_lein": "lein_image", "images.clojure_tools_deps": "deps_image"},
    "haskell": {"images.haskell": "image"},
    "generic": {"images.alpine": "alpine_image"},
}


def apply_image_overrides(language: str, facts, images: dict[str, str]) -> None:
    """Apply the resolved images.* overrides to one language's facts."""
    for key, value in (images or {}).items():
        field_name = IMAGE_FIELDS.get(language, {}).get(key)
        if field_name and value:
            setattr(facts, field_name, str(value))


def header_lines(emit: list[str], request: GenerateRequest) -> None:
    """Console up to (and including) the GENERATING DOCKERFILE banner."""
    emit.extend(console.identity_lines())
    if request.dry_run:
        emit.append("(dry-run: files will be removed after preview)")
    emit.append(console.BAR)
    emit.append("UNIVERSAL DOCKERFILE GENERATOR")
    emit.append(console.BAR)
    emit.append("")
    if not request.fast:
        emit.extend(console.host_tools_lines())


def footer_lines(emit: list[str], request: GenerateRequest, root: Path, result, *, language: str, framework: str, port: str, health: str, guessed: list[str]) -> None:
    """Console from the D2 banner to the end of the run."""
    emit.append("")
    emit.append("=== Checking for GitHub repository ===")
    emit.append("(--no-dockerfile-2: skipping)")
    emit.append("")

    if not request.dry_run:
        (root / "Dockerfile-1").write_text(result.dockerfile_1, encoding="utf-8")
        (root / ".dockerignore-1").write_text(result.dockerignore_1, encoding="utf-8")
    emit.append("Created: Dockerfile-1")
    emit.append("Created: .dockerignore-1")
    emit.extend(console.activate_dockerignore(root, request.dry_run))
    emit.append("")
    emit.append("")

    emit.append(console.BAR)
    emit.append("DOCKERFILE CONTENT (Dockerfile-1)")
    emit.append(console.BAR)
    emit.append("")
    emit.extend(result.dockerfile_1.splitlines())
    emit.append("")

    emit.extend(console.summary_lines_raw(language, framework, port, health, guessed))
    if not request.init:
        emit.extend(
            console.next_steps_lines(
                port,
                health,
                result.env_names,
                result.env_secret_names,
                result.secret_flags,
                result.registry_notice,
                framework,
            )
        )
        if not request.dry_run:
            emit.extend(console.static_check_lines(root, request.fast))


def write_init(root: Path, language: str, manager: str, port: str, health: str, dry_run: bool) -> list[str]:
    # The Bash renderer only records a package manager for Python and Node.
    manager_note = f" manager={manager}" if language in {"python", "node"} and manager else ""
    text = (
        "# dockerfile.conf - overrides for create-dockerfile.sh (edit + re-run to apply)\n"
        f"# Detected: language={language}{manager_note} (info only - only PORT/HEALTH/STOPSIGNAL below are applied)\n"
        f"PORT={port}\n"
        f"HEALTH={health}\n"
        "# STOPSIGNAL=SIGTERM (uncomment to pin; empty = Docker default SIGTERM)\n"
        "# D2_ASSET_URL=https://get.example.com/app-v$TAG-linux-$ARCH_SUBSTR.tar.gz (uncomment when\n"
        "#   releases live outside GitHub Assets; $TAG/$ARCH_SUBSTR expand at image build time)\n"
        "# D2_ASSET_SHA_URL=https://get.example.com/app-v$TAG-linux-$ARCH_SUBSTR.tar.gz.sha256sum\n"
    )
    if not dry_run:
        (root / "dockerfile.conf").write_text(text, encoding="utf-8")
    return ["Wrote dockerfile.conf - edit values and re-run to apply."]


UNKNOWN_LANGUAGE_WARNING = (
    "[WARN] Language not detected - using generic fallback.",
    "       Expected one of: requirements.txt, pyproject.toml, go.mod,",
    "       package.json, Cargo.toml, build.gradle.kts, pom.xml, Gemfile,",
    "       *.csproj, composer.json, Package.swift, build.sbt, mix.exs,",
    "       project.clj, deps.edn, *.cabal, stack.yaml",
)


def begin(request: GenerateRequest, emit: list[str], language: str) -> None:
    """Console preamble up to and including the GENERATING DOCKERFILE banner."""
    _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
    header_lines(emit, request)
    if language == "generic":
        # The unknown-language warning precedes the Input Validation banner.
        emit.extend(UNKNOWN_LANGUAGE_WARNING)
    emit.append("=== Input Validation ===")
    emit.append(f"[PASS] Language detected: {language}")
    emit.append("")
    emit.append(console.BAR)
    emit.append("GENERATING DOCKERFILE")
    emit.append(console.BAR)
    emit.append("")


class PythonPlugin:
    name = "python"
    language = "python"

    def detects(self, project_dir: Path) -> bool:
        return has_python_files(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "python")

        facts = detect_python(root, health_override=request.health or None)
        apply_image_overrides("python", facts, request.images)
        if facts.image != console.DEFAULT_PYTHON_IMAGE:
            emit.append(f"[PASS] Python image: {facts.image} (from version file)")
        # The Bash renderer prints the conda image line inside the manager
        # case, i.e. after the Detective Results banner - not up here.

        emit.extend(console.detective_lines(facts))

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = RenderOptions(
            port=request.port,
            health=request.health,
            stopsignal=request.stopsignal,
            health_start=request.health_start,
            extra_copy=request.extra_copy,
            extra_run=request.extra_run,
            extra_directives=request.extra_directives,
            app_title=console.sanitize_title(root.name),
            image_tag=console.image_tag(root.name),
        )
        result = build_dockerfile_1(facts, options, root)
        emit.extend(_python_notes(request, root, facts, result, emit_already=False))

        guessed = _apply_guesses(facts.guessed, request)
        if "port" in guessed and "health" in guessed:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        if request.init:
            footer_lines(emit, request, root, result, language="python", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
            emit.extend(write_init(root, "python", facts.package_manager, effective_port, effective_health, request.dry_run))
            return result

        footer_lines(emit, request, root, result, language="python", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
        return result


def _python_notes(request: GenerateRequest, root: Path, facts, result, *, emit_already: bool) -> list[str]:
    """Registry / escape-hatch / env / OCI / stopsignal console notes."""
    lines: list[str] = []
    registry_notice = "".join(f"{name} " for name in _secret_files(root))
    if "pip.conf" in registry_notice or ".pypirc" in registry_notice:
        pipsec = ".pypirc" if (root / ".pypirc").is_file() else "pip.conf"
        lines.append(f"[PASS] Private registry: {pipsec} via BuildKit secret (not in image)")
        lines.extend(f"[WARN] {warning}" for warning in result.warnings if "ignores pip.conf" in warning)
    if request.extra_copy or request.extra_run:
        lines.append("[PASS] Extra lines inserted before USER")
    public, secret, _ = detect_env_names(root)
    if public or secret:
        localhost, credentials, _urls = detect_localhost_defaults(root, public + secret)
        lines.extend(console.env_lines(public, secret, localhost, credentials))
        lines.append("[PASS] Env passthrough inserted after WORKDIR (all stages)")
    lines.append(f"[PASS] OCI labels: {console.sanitize_title(root.name)} / unknown")
    if request.stopsignal:
        lines.append("[PASS] Stopsignal inserted before ENTRYPOINT")
    if request.extra_directives:
        lines.append("[PASS] Extra directives inserted before ENTRYPOINT")
    lines.append("[PASS] Build cheat-sheet appended to Dockerfile-1")
    return lines


def _secret_files(root: Path) -> list[str]:
    from ..render.python_dockerfile import SECRET_FILES

    return [name for name in SECRET_FILES if (root / name).is_file()]


def _apply_guesses(guessed: list[str], request: GenerateRequest) -> list[str]:
    remaining = list(guessed)
    if request.port:
        remaining = [word for word in remaining if word != "port"]
    if request.health:
        remaining = [word for word in remaining if word != "health"]
    return remaining


def _refuse_unsupported(request: GenerateRequest, d2_reason: str) -> None:
    if request.write_dockerfile_2:
        raise Unsupported(f"{d2_reason} is still owned by the Bash renderer")
    if request.compose:
        raise Unsupported("compose.yaml generation is still owned by the Bash renderer")
    if request.check:
        raise Unsupported("--check drift detection is still owned by the Bash renderer")
    if request.all_apps:
        raise Unsupported("monorepo mode is still owned by the Bash renderer")


class GoPlugin:
    name = "go"
    language = "go"

    def detects(self, project_dir: Path) -> bool:
        return (root := Path(project_dir)) and (root / "go.mod").is_file()

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
        emit = request.emit
        begin(request, emit, "go")

        facts = detect_go(root, health_override=request.health or None)
        apply_image_overrides("go", facts, request.images)
        emit.extend(facts.detective_lines())

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = RenderOptions(
            port=request.port,
            health=request.health,
            stopsignal=request.stopsignal,
            health_start=request.health_start,
            extra_copy=request.extra_copy,
            extra_run=request.extra_run,
            extra_directives=request.extra_directives,
            app_title=console.sanitize_title(root.name),
            image_tag=console.image_tag(root.name),
        )
        result = render_go(facts, root, options)
        _emit_common_notes(emit, request, root, result)

        guessed = _apply_guesses(facts.guessed, request)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        if request.init:
            footer_lines(emit, request, root, result, language="go", framework="", port=effective_port, health=effective_health, guessed=guessed)
            emit.extend(write_init(root, "go", "go", effective_port, effective_health, request.dry_run))
            return result

        footer_lines(emit, request, root, result, language="go", framework="", port=effective_port, health=effective_health, guessed=guessed)
        return result


def _emit_common_notes(emit: list[str], request: GenerateRequest, root: Path, result, *, private_registry: bool | None = None, skip_registry: bool = False) -> None:
    """The post-processing notes every language shares, in file order."""
    from ..render.postprocess import SECRET_FILES

    if skip_registry:
        registry = []
    elif private_registry is None:
        registry = [name for name in SECRET_FILES if (root / name).is_file()]
        if registry:
            emit.append(f"[PASS] Private registry: {registry[0]} via BuildKit secret (not in image)")
    elif private_registry:
        emit.append("[PASS] Private registry: settings.xml via BuildKit secret (not in image)")
    if request.extra_copy or request.extra_run:
        emit.append("[PASS] Extra lines inserted before USER")
    if result.env_names or result.env_secret_names:
        emit.extend(console.env_lines(result.env_names, result.env_secret_names, result.localhost_names, result.credential_names, result.env_total))
        emit.append("[PASS] Env passthrough inserted after WORKDIR (all stages)")
    if result.oci_skipped:
        emit.append("[WARN] No ENTRYPOINT line found - OCI labels skipped")
    else:
        emit.append(f"[PASS] OCI labels: {console.sanitize_title(root.name)} / unknown")
    if request.stopsignal:
        emit.append("[PASS] Stopsignal inserted before ENTRYPOINT")
    if request.extra_directives:
        emit.append("[PASS] Extra directives inserted before ENTRYPOINT")
    emit.append("[PASS] Build cheat-sheet appended to Dockerfile-1")



JVM_LANGUAGES = ("java", "kotlin", "scala", "clojure")
JVM_HEALTH_START = "60s"


def jvm_grace_note(language: str) -> str | None:
    """JVM apps boot slowly: 60s grace instead of 10s (I3)."""
    return "[PASS] Health grace: 60s (JVM)" if language in JVM_LANGUAGES else None


class JavaPlugin:
    name = "java"
    language = "java"

    def detects(self, project_dir: Path) -> bool:
        root = Path(project_dir)
        return (root / "pom.xml").is_file() or (root / "build.gradle").is_file()

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
        emit = request.emit
        begin(request, emit, "java")

        facts = detect_java(root, health_override=request.health or None)
        apply_image_overrides("java", facts, request.images)
        if facts.java_major != "21":
            emit.append(f"[PASS] Java major: {facts.java_major} (from .java-version)")
        if facts.gradle_version != "8.5":
            emit.append(f"[PASS] Gradle: {facts.gradle_version} (from wrapper properties)")
        note = jvm_grace_note("java")
        if note:
            emit.append(note)
        emit.extend(facts.detective_lines())

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = RenderOptions(
            port=request.port,
            health=request.health,
            stopsignal=request.stopsignal,
            health_start=request.health_start if request.health_start != "10s" else JVM_HEALTH_START,
            extra_copy=request.extra_copy,
            extra_run=request.extra_run,
            extra_directives=request.extra_directives,
            app_title=console.sanitize_title(root.name),
            image_tag=console.image_tag(root.name),
        )
        result = render_java(facts, root, options)
        _emit_common_notes(emit, request, root, result, private_registry=facts.private_registry)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        if request.init:
            footer_lines(emit, request, root, result, language="java", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request))
            emit.extend(write_init(root, "java", facts.build_tool, effective_port, effective_health, request.dry_run))
            return result

        footer_lines(emit, request, root, result, language="java", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request))
        return result



class RubyPlugin:
    name = "ruby"
    language = "ruby"

    def detects(self, project_dir: Path) -> bool:
        return (Path(project_dir) / "Gemfile").is_file()

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
        emit = request.emit
        begin(request, emit, "ruby")

        facts = detect_ruby(root, health_override=request.health or None)
        apply_image_overrides("ruby", facts, request.images)
        if facts.image != console.DEFAULT_RUBY_IMAGE:
            emit.append(f"[PASS] Ruby image: {facts.image} (from version file)")
        emit.extend(facts.detective_lines())

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = RenderOptions(
            port=request.port,
            health=request.health,
            stopsignal=request.stopsignal,
            health_start=request.health_start,
            extra_copy=request.extra_copy,
            extra_run=request.extra_run,
            extra_directives=request.extra_directives,
            app_title=console.sanitize_title(root.name),
            image_tag=console.image_tag(root.name),
        )
        result = render_ruby(facts, root, options)
        # The private-registry note is emitted with the other detect_* notes.
        _emit_common_notes(emit, request, root, result, skip_registry=True)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        if request.init:
            footer_lines(emit, request, root, result, language="ruby", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request))
            emit.extend(write_init(root, "ruby", "bundler", effective_port, effective_health, request.dry_run))
            return result

        footer_lines(emit, request, root, result, language="ruby", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request))
        return result



class CSharpPlugin:
    name = "csharp"
    language = "csharp"

    def detects(self, project_dir: Path) -> bool:
        return detects_csharp(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
        emit = request.emit
        begin(request, emit, "csharp")

        facts = detect_csharp(root, health_override=request.health or None)
        apply_image_overrides("csharp", facts, request.images)
        if facts.dotnet_major != "8":
            emit.append(f"[PASS] .NET major: {facts.dotnet_major} (from global.json)")
        emit.extend(facts.detective_lines())

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = RenderOptions(
            port=request.port,
            health=request.health,
            stopsignal=request.stopsignal,
            health_start=request.health_start,
            extra_copy=request.extra_copy,
            extra_run=request.extra_run,
            extra_directives=request.extra_directives,
            app_title=console.sanitize_title(root.name),
            image_tag=console.image_tag(root.name),
        )
        result = render_csharp(facts, root, options)
        _emit_common_notes(emit, request, root, result)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        guessed = _apply_guesses(facts.guessed, request)
        if request.init:
            footer_lines(emit, request, root, result, language="csharp", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
            emit.extend(write_init(root, "csharp", "dotnet", effective_port, effective_health, request.dry_run))
            return result
        footer_lines(emit, request, root, result, language="csharp", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
        return result


class PhpPlugin:
    name = "php"
    language = "php"

    def detects(self, project_dir: Path) -> bool:
        return detects_php(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
        emit = request.emit
        begin(request, emit, "php")

        facts = detect_php(root, health_override=request.health or None)
        apply_image_overrides("php", facts, request.images)
        if facts.image != console.DEFAULT_PHP_IMAGE:
            emit.append(f"[PASS] PHP image: {facts.image} (from composer.json)")
        emit.extend(facts.detective_lines())

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = RenderOptions(
            port=request.port,
            health=request.health,
            stopsignal=request.stopsignal,
            health_start=request.health_start,
            extra_copy=request.extra_copy,
            extra_run=request.extra_run,
            extra_directives=request.extra_directives,
            app_title=console.sanitize_title(root.name),
            image_tag=console.image_tag(root.name),
        )
        result = render_php(facts, root, options)
        _emit_common_notes(emit, request, root, result, skip_registry=True)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        guessed = _apply_guesses(facts.guessed, request)
        if request.init:
            footer_lines(emit, request, root, result, language="php", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
            emit.extend(write_init(root, "php", "composer", effective_port, effective_health, request.dry_run))
            return result
        footer_lines(emit, request, root, result, language="php", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
        return result



class NodePlugin:
    """Node servers and SPA static sites.

    SPA detection is ported from detect_node()'s guard: frontend tooling plus a
    real entry HTML, and no server smell. When the guard fires with a server
    warning the project stays on the server template, exactly like Bash.
    """

    name = "node"
    language = "node"

    def detects(self, project_dir: Path) -> bool:
        return detects_node(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        _refuse_unsupported(request, "Dockerfile-2 release-asset rendering")
        emit = request.emit
        begin(request, emit, "node")

        warning = ""
        if is_spa(root):
            warning = spa_server_warning(root)
            if warning is None:
                return self._run_spa(request, root, emit)
        facts = detect_node(root, health_override=request.health or None)
        apply_image_overrides("node", facts, request.images)

        for note in node_image_notes(root, facts.image, facts.image_source):
            emit.append(note)
        # detect_node echoes the banner itself when a server smell kept this
        # project on the server template, so the warning goes after it.
        facts.banner_warning = f"[WARN] {warning}" if warning else ""
        emit.extend(facts.detective_lines())

        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")

        options = _options(request, root)
        result = render_node(facts, root, options)
        _emit_common_notes(emit, request, root, result, skip_registry=True)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")

        guessed = _apply_guesses(facts.guessed, request)
        if request.init:
            footer_lines(emit, request, root, result, language="node", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
            emit.extend(write_init(root, "node", facts.package_manager, effective_port, effective_health, request.dry_run))
            return result
        footer_lines(emit, request, root, result, language="node", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
        return result

    def _run_spa(self, request: GenerateRequest, root: Path, emit: list[str]):
        # header_lines() already emitted the banner; SPA only adds its report.
        facts = detect_spa(root)
        apply_image_overrides("spa", facts, request.images)
        emit.extend(facts.detective_lines(banner=True))

        effective_port = request.port or facts.port
        if request.port:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH=/")
        options = _options(request, root)
        result = render_spa(facts, root, options)
        _emit_common_notes(emit, request, root, result, skip_registry=True)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")
        guessed = _apply_guesses(facts.guessed, request)
        # The SUMMARY shows the SPA framework (vite-spa/vue-spa), not empty.
        framework = facts.framework
        if request.init:
            footer_lines(emit, request, root, result, language="node", framework=framework, port=effective_port, health=facts.health_path, guessed=guessed)
            emit.extend(write_init(root, "node", facts.package_manager, effective_port, facts.health_path, request.dry_run))
            return result
        footer_lines(emit, request, root, result, language="node", framework=framework, port=effective_port, health=facts.health_path, guessed=guessed)
        return result


def _options(request: GenerateRequest, root: Path):
    return RenderOptions(
        port=request.port,
        health=request.health,
        stopsignal=request.stopsignal,
        health_start=request.health_start,
        extra_copy=request.extra_copy,
        extra_run=request.extra_run,
        extra_directives=request.extra_directives,
        app_title=console.sanitize_title(root.name),
        image_tag=console.image_tag(root.name),
    )



class _JVMPluginBase:
    """Shared console wiring for the JVM-family plugins (java/kotlin/scala)."""

    language_label = ""
    manager_label = ""

    def detects(self, project_dir: Path) -> bool:
        raise NotImplementedError

    def _emit_version_notes(self, emit: list[str], facts) -> None:
        pass

    def _finish(self, request: GenerateRequest, root: Path, emit: list[str], result, *, language: str, framework: str, port: str, health: str, guessed: list[str], manager: str, private_registry: bool | None = None, skip_registry: bool = False) -> None:
        _emit_common_notes(emit, request, root, result, private_registry=private_registry, skip_registry=skip_registry)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")
        if request.init:
            footer_lines(emit, request, root, result, language=language, framework=framework, port=port, health=health, guessed=guessed)
            emit.extend(write_init(root, language, manager, port, health, request.dry_run))
            return
        footer_lines(emit, request, root, result, language=language, framework=framework, port=port, health=health, guessed=guessed)


class KotlinPlugin(_JVMPluginBase):
    name = "kotlin"
    language = "kotlin"

    def detects(self, project_dir: Path) -> bool:
        return detects_kotlin(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "kotlin")
        facts = detect_kotlin(root, health_override=request.health or None)
        apply_image_overrides("kotlin", facts, request.images)
        if facts.java_major != "21":
            emit.append(f"[PASS] Java major: {facts.java_major} (from .java-version)")
        if facts.gradle_version != "8.5":
            emit.append(f"[PASS] Gradle: {facts.gradle_version} (from wrapper properties)")
        note = jvm_grace_note("kotlin")
        if note:
            emit.append(note)
        emit.extend(facts.detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_kotlin(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="kotlin", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager="gradle", skip_registry=True)
        return result


class SwiftPlugin(_JVMPluginBase):
    name = "swift"
    language = "swift"

    def detects(self, project_dir: Path) -> bool:
        return detects_swift(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "swift")
        facts = detect_swift(root, health_override=request.health or None)
        apply_image_overrides("swift", facts, request.images)
        if facts.image != console.DEFAULT_SWIFT_IMAGE:
            emit.append(f"[PASS] Swift image: {facts.image} (from swift-tools-version)")
        emit.extend(facts.detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_swift(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="swift", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager="swiftpm", skip_registry=True)
        return result


class ScalaPlugin(_JVMPluginBase):
    name = "scala"
    language = "scala"

    def detects(self, project_dir: Path) -> bool:
        return detects_scala(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "scala")
        version_file = root / ".java-version"
        tool_versions = root / ".tool-versions"
        java_pinned = False
        if version_file.is_file():
            java_pinned = bool(re.search(r"1[17]|21", version_file.read_text(encoding="utf-8", errors="replace")))
        elif tool_versions.is_file():
            java_pinned = "java" in tool_versions.read_text(encoding="utf-8", errors="replace")

        facts = detect_scala(
            root,
            health_override=request.health or None,
            sbt_image=os.environ.get("SBT_IMAGE") or None,
            java_pinned=java_pinned,
        )
        apply_image_overrides("scala", facts, request.images)
        facts.java_major = java_major(root)
        if facts.java_major != "21":
            emit.append(f"[PASS] Java major: {facts.java_major} (from .java-version)")
        note = jvm_grace_note("scala")
        if note:
            emit.append(note)
        if facts.fatal:
            # The Bash renderer owns this exact message and exit path.
            raise Unsupported(facts.fatal)
        emit.extend(facts.scala_detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_scala(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="scala", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager="sbt", skip_registry=True)
        return result



class ElixirPlugin(_JVMPluginBase):
    name = "elixir"
    language = "elixir"

    def detects(self, project_dir: Path) -> bool:
        return detects_elixir(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "elixir")
        facts = detect_elixir(root, health_override=request.health or None)
        apply_image_overrides("elixir", facts, request.images)
        if facts.image != console.DEFAULT_ELIXIR_IMAGE:
            emit.append(f"[PASS] Elixir image: {facts.image} (from .tool-versions)")
        emit.extend(facts.detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_elixir(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="elixir", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager="mix", skip_registry=True)
        return result


class ClojurePlugin(_JVMPluginBase):
    name = "clojure"
    language = "clojure"

    def detects(self, project_dir: Path) -> bool:
        return detects_clojure(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "clojure")
        version_file = root / ".java-version"
        tool_versions = root / ".tool-versions"
        java_pinned = False
        if version_file.is_file():
            java_pinned = bool(re.search(r"1[17]|21", version_file.read_text(encoding="utf-8", errors="replace")))
        elif tool_versions.is_file():
            java_pinned = "java" in tool_versions.read_text(encoding="utf-8", errors="replace")
        facts = detect_clojure(
            root,
            health_override=request.health or None,
            java_pinned=java_pinned,
            lein_image=os.environ.get("CLJ_LEIN_IMAGE") or None,
            deps_image=os.environ.get("CLJ_DEPS_IMAGE") or None,
        )
        apply_image_overrides("clojure", facts, request.images)
        if facts.java_major != "21":
            emit.append(f"[PASS] Java major: {facts.java_major} (from .java-version)")
        note = jvm_grace_note("clojure")
        if note:
            emit.append(note)
        emit.extend(facts.detective_lines())
        # The Clojure builder JDK line comes after the detective report.
        if facts.clj_java != "11":
            emit.append(f"[PASS] Clojure JDK: {facts.clj_java} (from version file)")
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_clojure(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="clojure", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager=facts.build_tool, skip_registry=True)
        return result


class HaskellPlugin(_JVMPluginBase):
    name = "haskell"
    language = "haskell"

    def detects(self, project_dir: Path) -> bool:
        return detects_haskell(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "haskell")
        facts = detect_haskell(root, health_override=request.health or None, haskell_image=os.environ.get("HASKELL_IMAGE") or None)
        apply_image_overrides("haskell", facts, request.images)
        emit.extend(facts.detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_haskell(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="haskell", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager=facts.build_tool, skip_registry=True)
        return result



class RustPlugin(_JVMPluginBase):
    name = "rust"
    language = "rust"

    def detects(self, project_dir: Path) -> bool:
        return detects_rust(Path(project_dir))

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "rust")
        facts = detect_rust(root, health_override=request.health or None)
        apply_image_overrides("rust", facts, request.images)
        if facts.image != console.DEFAULT_RUST_IMAGE:
            emit.append(f"[PASS] Rust image: {facts.image_console} (from rust-toolchain.toml)")
        emit.extend(facts.detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        if request.port or request.health:
            emit.append(f"[PASS] Overrides applied: PORT={effective_port} HEALTH={effective_health}")
        result = render_rust(facts, root, _options(request, root))
        self._finish(request, root, emit, result, language="rust", framework=facts.framework, port=effective_port, health=effective_health, guessed=_apply_guesses(facts.guessed, request), manager="cargo", skip_registry=True)
        return result


class GenericPlugin(_JVMPluginBase):
    """Fallback for projects no language claims.

    Registered last: routing walks plugins in name order, so every real
    language gets first refusal and only then does the generic fallback claim
    the project. Same behaviour as the Bash renderer's detect_generic().
    """

    name = "generic"
    language = "generic"

    def detects(self, project_dir: Path) -> bool:
        # Routing puts the fallback last, so reaching here means no language
        # plugin claimed the project: the generic template applies.
        return True

    def run(self, request: GenerateRequest):
        root = Path(request.project_dir).resolve()
        emit = request.emit
        begin(request, emit, "generic")
        facts = detect_generic(root, port_override=request.port, health_override=request.health or None)
        apply_image_overrides("generic", facts, request.images)
        if facts.fatal:
            raise Unsupported(facts.fatal)
        emit.extend(facts.detective_lines())
        effective_port = request.port or facts.port
        effective_health = request.health or facts.health_path
        result = render_generic(facts, root, _options(request, root))
        _emit_common_notes(emit, request, root, result)
        if result.client_shape:
            emit.append("[WARN] Client shape: no port/health detected - HEALTHCHECK + default VOLUME + drawer setup omitted (PORT=/HEALTH= forces server shape)")
        guessed = _apply_guesses(facts.guessed, request)
        if request.init:
            footer_lines(emit, request, root, result, language="generic", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
            emit.extend(write_init(root, "generic", "shell", effective_port, effective_health, request.dry_run))
            return result
        footer_lines(emit, request, root, result, language="generic", framework=facts.framework, port=effective_port, health=effective_health, guessed=guessed)
        return result


PLUGINS = (PythonPlugin, GoPlugin, JavaPlugin, RubyPlugin, CSharpPlugin, PhpPlugin, NodePlugin, KotlinPlugin, SwiftPlugin, ScalaPlugin, ElixirPlugin, ClojurePlugin, HaskellPlugin, RustPlugin, GenericPlugin)


def plugin_for(language: str):
    for plugin in PLUGINS:
        if plugin.name == language:
            return plugin()
    return None


def register_all(registry) -> None:
    for plugin in PLUGINS:
        registry.register(plugin())