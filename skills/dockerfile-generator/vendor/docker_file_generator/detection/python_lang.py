"""Python detection plugin.

Port of detect_python() in legacy/create-dockerfile-legacy.sh (plus the shared
detect_health_endpoint / detect_data_dirs / python_image rules). The facts are
typed and every value carries the source that produced it, so a generated
resolved-config manifest can explain itself.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from .common import (
    detect_data_dirs,
    detect_health_endpoint,
    iter_files,
    port_from,
    python_image,
    volume_line,
)

REQUIREMENTS_FILES = ("requirements.txt", "requirements/prod.txt", "requirements-prod.txt", "requirements/base.txt")

FRAMEWORKS = ("fastapi", "flask", "django")
SERVER_FILES = ("requirements.txt", "pyproject.toml", "Pipfile", "Pipfile.lock", "pdm.lock", "uv.lock", "setup.py", "setup.cfg", "environment.yml")
FRAMEWORK_DEFAULT_PORT = {"fastapi": "5001", "flask": "5000", "django": "8000"}
PYTHON_MARKERS = ("requirements.txt", "requirements/prod.txt", "requirements-prod.txt", "requirements/base.txt", "pyproject.toml", "Pipfile", "Pipfile.lock", "pdm.lock", "uv.lock", "poetry.lock", "setup.py", "setup.cfg", "environment.yml")
UV_HEAD = "COPY --from=ghcr.io/astral-sh/uv:0.6 /uv /uvx /bin/"
DEFAULT_CONDA_IMAGE = "continuumio/miniconda3:24.11.1-0"

# The legacy pipeline is `grep -hn "= FastAPI\|= Flask" MAIN ./*.py | head -1`
# followed by a sed anchored on the first colon. -n leaves a "<lineno>:" prefix,
# so a plain `server = Flask(__name__)` yields "server" while an annotated
# `server: Flask = Flask(...)` never matches (the prefix consumes "N:server:"
# and the rest does not look like NAME =) and falls back to "app". Ported
# verbatim: "fixing" the annotation case would change existing Dockerfiles.
APP_VAR_PATTERN = re.compile(r"^[^:]*:[ \t]*([A-Za-z_][A-Za-z0-9_]*)[ \t]*=")
APP_VAR_MARKERS = ("= FastAPI", "= Flask")
PORT_SCAN_INCLUDES = ("*.py", "*.http", "*.env", "Dockerfile*")
PORT_SCAN_PATTERN = re.compile(r"5001|5000|8000|8080|3000|9000")


@dataclass
class PythonFacts:
    language: str = "python"
    markers: list[str] = field(default_factory=list)
    framework: str = "fastapi"
    framework_source: str = "framework default"
    web_server: str = "uvicorn"
    main_file: str = "main.py"
    module: str = "main"
    app_var: str = "app"
    port: str = "5001"
    port_source: str = "framework default"
    health_path: str = "/health"
    health_guessed: bool = True
    health_source: str = "framework default (no health route in source)"
    special_tools: str = ""
    data_dirs: list[str] = field(default_factory=list)
    volume_line: str = ""
    package_manager: str = "none"
    requirements_file: str = ""
    image: str = "python:3.12.4-alpine"
    image_pinned: bool = False
    image_source: str = "registry default"
    server_guaranteed: bool = False
    django_static: str = ""
    conda_env: str = ""
    conda_prefix: str = ""
    conda_prefix_declared: bool = False
    conda_image: str = DEFAULT_CONDA_IMAGE
    guessed: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    provenance: dict[str, str] = field(default_factory=dict)

    def summary(self) -> dict[str, str]:
        """The [PASS]-style lines the legacy detector prints."""
        lines = {
            "framework": f"[PASS] Framework: {self.framework}",
            "web_server": f"[PASS] Web server: {self.web_server}",
            "module": f"[PASS] Module: {self.module}:{self.app_var}",
            "port": f"[PASS] Port: {self.port}",
            "health": f"[PASS] Health: {self.health_path}",
            "package_manager": f"[PASS] Package manager: {self.package_manager}" + (f" ({self.requirements_file})" if self.requirements_file else ""),
        }
        if self.special_tools:
            lines["special_tools"] = f"[PASS] Special tools: {self.special_tools}"
        return lines


def has_python_files(root: Path) -> bool:
    for marker in PYTHON_MARKERS:
        if marker.endswith("*.txt"):
            if list((root / "requirements").glob("*.txt")) if (root / "requirements").is_dir() else []:
                return True
            continue
        if (root / marker).is_file():
            return True
    return False


def detects(root: Path) -> bool:
    return has_python_files(root)


def _requirements_file(root: Path) -> str:
    for name in REQUIREMENTS_FILES:
        if (root / name).is_file():
            return name
    requirements_dir = root / "requirements"
    if requirements_dir.is_dir():
        for path in sorted(requirements_dir.glob("*.txt")):
            if path.is_file():
                return str(path.relative_to(root))
    return ""


def _detect_framework(root: Path) -> tuple[str, str]:
    hit = ""
    for path in iter_files(root, ("*.py",)):
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if "__pycache__" in line:
                continue
            lowered = line.lower()
            if any(name in lowered for name in FRAMEWORKS):
                hit = line
                break
        if hit:
            break
    if not hit:
        for name in ("requirements.txt", "pyproject.toml"):
            path = root / name
            if not path.is_file():
                continue
            for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
                lowered = line.lower()
                if any(framework in lowered for framework in FRAMEWORKS):
                    hit = line
                    break
            if hit:
                break
    if not hit:
        return "fastapi", "framework default (no framework marker found)"
    lowered = hit.lower()
    for name in FRAMEWORKS:
        if name in lowered:
            return name, "framework marker in source"
    return "fastapi", "framework default"


def _detect_main_file(root: Path) -> str:
    for path in sorted(root.glob("*.py")):
        if "__pycache__" in path.name or not path.is_file():
            continue
        return path.name
    if (root / "src").is_dir():
        candidates = [root / "src" / "__main__.py"]
        candidates.extend(sorted((root / "src").glob("*/__main__.py")))
        candidates.extend(sorted((root / "src").glob("*/main.py")))
        for candidate in candidates:
            if candidate.is_file():
                return str(candidate.relative_to(root))
    return "main.py"


def _detect_app_var(root: Path, main_file: str) -> str:
    targets = [root / main_file]
    targets.extend(sorted(root.glob("*.py")))
    for target in targets:
        if not target.is_file():
            continue
        for number, line in enumerate(target.read_text(encoding="utf-8", errors="replace").splitlines(), 1):
            if "__pycache__" in line:
                continue
            if not any(marker in line for marker in APP_VAR_MARKERS):
                continue
            match = APP_VAR_PATTERN.match(f"{number}:{line}")
            if match:
                return match.group(1)
            return "app"
    return "app"


def _detect_port(root: Path, framework: str) -> tuple[str, str, list[str]]:
    guessed: list[str] = []
    for path in iter_files(root, PORT_SCAN_INCLUDES):
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if "__pycache__" in line or "# " in line:
                continue
            if not PORT_SCAN_PATTERN.search(line):
                continue
            tagged = f"{path.relative_to(root)}:{line}"
            port = port_from(tagged)
            if port:
                return port, f"port literal in {path.relative_to(root)}", guessed
            guessed.append("port")
            return "5001", "framework default (no known service port in source)", guessed
    guessed.append("port")
    return FRAMEWORK_DEFAULT_PORT[framework], "framework default (no known service port in source)", guessed


def _detect_package_manager(root: Path, requirements_file: str) -> str:
    pyproject = root / "pyproject.toml"
    if (root / "uv.lock").is_file():
        return "uv"
    if (root / "poetry.lock").is_file() or (pyproject.is_file() and "[tool.poetry]" in pyproject.read_text(encoding="utf-8", errors="replace")):
        return "poetry"
    if (root / "Pipfile.lock").is_file() or (root / "Pipfile").is_file():
        return "pipenv"
    if (root / "pdm.lock").is_file():
        return "pdm"
    if (root / "environment.yml").is_file():
        return "conda"
    if requirements_file:
        return "pip"
    if pyproject.is_file():
        text = pyproject.read_text(encoding="utf-8", errors="replace")
        return "uv-nolock" if "[tool.uv]" in text else "pip-pyproject"
    if (root / "setup.py").is_file() or (root / "setup.cfg").is_file():
        return "pip-setup"
    return "none"


def _detect_django_static(root: Path) -> str:
    manage = root / "manage.py"
    if not manage.is_file():
        return ""
    targets = [manage, root / "settings.py"]
    targets.extend(sorted(root.glob("*.py")))
    targets.extend(sorted(root.glob("*/settings.py")))
    for target in targets:
        if not target.is_file():
            continue
        if re.search(r"STATIC_ROOT|collectstatic", target.read_text(encoding="utf-8", errors="replace")):
            return "RUN python manage.py collectstatic --noinput"
    return ""


def _detect_conda(root: Path) -> tuple[str, str, bool]:
    environment = root / "environment.yml"
    text = environment.read_text(encoding="utf-8", errors="replace") if environment.is_file() else ""
    name_match = re.search(r'^name:[ \t]*["\']?([^"\'\s#]+)', text, re.MULTILINE)
    name = re.sub(r"[^a-zA-Z0-9_-]", "", name_match.group(1)) if name_match else ""
    name = name or "app"
    prefix_match = re.search(r'^prefix:[ \t]*["\']?([^"\'\s#]+)', text, re.MULTILINE)
    declared = bool(prefix_match)
    prefix = prefix_match.group(1) if prefix_match else f"/opt/conda/envs/{name}"
    return name, prefix, declared


def _server_pinned(root: Path, framework: str, requirements_file: str) -> bool:
    needle = "uvicorn" if framework == "fastapi" else "gunicorn"
    names = list(SERVER_FILES)
    if requirements_file and requirements_file not in names:
        names.append(requirements_file)
    for name in names:
        path = root / name
        if not path.is_file():
            continue
        if needle in path.read_text(encoding="utf-8", errors="replace").lower():
            return True
    return False


def detect_python(project_dir: str | Path = ".", *, health_override: str | None = None, conda_image: str | None = None) -> PythonFacts:
    root = Path(project_dir).resolve()
    facts = PythonFacts()

    facts.markers = [name for name in PYTHON_MARKERS if (root / name).is_file()]
    requirements_dir = root / "requirements"
    if requirements_dir.is_dir():
        facts.markers.extend(str(path.relative_to(root)) for path in sorted(requirements_dir.glob("*.txt")))

    facts.framework, facts.framework_source = _detect_framework(root)
    facts.web_server = "uvicorn" if facts.framework == "fastapi" else "gunicorn"
    facts.provenance["framework"] = facts.framework_source

    facts.main_file = _detect_main_file(root)
    facts.module = facts.main_file[:-3].replace("/", ".") if facts.main_file.endswith(".py") else facts.main_file.replace("/", ".")
    facts.app_var = _detect_app_var(root, facts.main_file)
    facts.provenance["module"] = f"{facts.main_file} (first *.py, else src/ layout)"

    facts.port, facts.port_source, guessed = _detect_port(root, facts.framework)
    facts.guessed.extend(guessed)
    facts.provenance["port"] = facts.port_source

    facts.health_path, facts.health_guessed, facts.health_source = detect_health_endpoint(root, health_override)
    if facts.health_guessed:
        facts.guessed.append("health")
    facts.provenance["health"] = facts.health_source

    requirements = root / "requirements.txt"
    if requirements.is_file() and "ddtrace" in requirements.read_text(encoding="utf-8", errors="replace"):
        facts.special_tools = "ddtrace-run"

    facts.data_dirs = detect_data_dirs(root)
    facts.volume_line = volume_line(facts.data_dirs)

    facts.requirements_file = _requirements_file(root)
    facts.package_manager = _detect_package_manager(root, facts.requirements_file)
    facts.provenance["package_manager"] = "lock/marker precedence (uv > poetry > pipenv > pdm > conda > requirements > pyproject > setup.py)"

    facts.image, facts.image_pinned, facts.image_source = python_image(root)
    facts.provenance["image"] = facts.image_source

    facts.server_guaranteed = _server_pinned(root, facts.framework, facts.requirements_file)
    if facts.framework == "django":
        facts.django_static = _detect_django_static(root)

    if facts.package_manager == "conda":
        facts.conda_env, facts.conda_prefix, facts.conda_prefix_declared = _detect_conda(root)
        facts.conda_image = conda_image or DEFAULT_CONDA_IMAGE
    if facts.package_manager == "uv" and not (root / "pyproject.toml").is_file():
        facts.warnings.append("uv.lock without pyproject.toml - uv sync needs the project file; runtime image only")
    return facts