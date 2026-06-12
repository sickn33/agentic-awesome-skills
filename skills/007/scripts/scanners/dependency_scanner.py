"""007 Dependency Scanner -- Supply chain and dependency security analyzer.

Analyzes dependency security across Python and Node.js projects by inspecting
dependency files (requirements.txt, package.json, Dockerfiles, etc.) for version
pinning, known risky patterns, and supply chain best practices.

Usage:
    python dependency_scanner.py --target /path/to/project
    python dependency_scanner.py --target /path/to/project --output json --verbose
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Import from the 007 config hub (parent directory)
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import config  # noqa: E402

# ---------------------------------------------------------------------------
# Logger
# ---------------------------------------------------------------------------
logger = config.setup_logging("007-dependency-scanner")


# ---------------------------------------------------------------------------
# Dependency file patterns
# ---------------------------------------------------------------------------

# Python dependency files
PYTHON_DEP_FILES = {
    "requirements.txt",
    "requirements-dev.txt",
    "requirements_dev.txt",
    "requirements-test.txt",
    "requirements_test.txt",
    "requirements-prod.txt",
    "requirements_prod.txt",
    "setup.py",
    "setup.cfg",
    "pyproject.toml",
    "Pipfile",
    "Pipfile.lock",
}

# Node.js dependency files
NODE_DEP_FILES = {
    "package.json",
    "package-lock.json",
    "yarn.lock",
}

# Docker files (matched by prefix)
DOCKER_PREFIXES = ("Dockerfile", "dockerfile", "docker-compose")

# All dependency file names (for fast lookup)
ALL_DEP_FILES = PYTHON_DEP_FILES | NODE_DEP_FILES

# Regex to match requirements*.txt variants
_REQUIREMENTS_RE = re.compile(
    r"""^requirements[-_]?\w*\.txt$""", re.IGNORECASE
)


# ---------------------------------------------------------------------------
# Python analysis patterns
# ---------------------------------------------------------------------------

# Pinned:   package==1.2.3
# Hashed:   package==1.2.3 --hash=sha256:abc...
# Loose:    package>=1.0  package~=1.0  package!=1.0  package  package<=2
# Comment:  # this is a comment
# Options:  -r other.txt  --find-links  -e .  etc.

_PY_COMMENT_RE = re.compile(r"""^\s*#""")
_PY_OPTION_RE = re.compile(r"""^\s*-""")
_PY_BLANK_RE = re.compile(r"""^\s*$""")

# Matches: package==version  or  package[extras]==version
_PY_PINNED_RE = re.compile(
    r"""^([A-Za-z0-9_][A-Za-z0-9._-]*)(?:\[.*?\])?\s*==\s*[\d]""",
)

# Matches any package line (not comment, not option, not blank)
_PY_PACKAGE_RE = re.compile(
    r"""^([A-Za-z0-9_][A-Za-z0-9._-]*)""",
)

# Hash present
_PY_HASH_RE = re.compile(r"""--hash[=:]""")

# Known risky Python packages or patterns
_RISKY_PYTHON_PACKAGES = {
    "pyyaml": "PyYAML with yaml.load() (without SafeLoader) enables arbitrary code execution",
    "pickle": "pickle module allows arbitrary code execution during deserialization",
    "shelve": "shelve uses pickle internally, same deserialization risks",
    "marshal": "marshal module can execute arbitrary code during deserialization",
    "dill": "dill extends pickle with same arbitrary code execution risks",
    "cloudpickle": "cloudpickle extends pickle with same security concerns",
    "jsonpickle": "jsonpickle can deserialize to arbitrary objects",
    "pyinstaller": "PyInstaller bundles can hide malicious code in executables",
    "subprocess32": "Deprecated subprocess replacement; use stdlib subprocess instead",
}


# ---------------------------------------------------------------------------
# Node.js analysis patterns
# ---------------------------------------------------------------------------

# Exact version:  "1.2.3"
# Pinned prefix:  "1.2.3" (no ^ or ~ or * or > or <)
# Loose:          "^1.2.3"  "~1.2.3"  ">=1.0"  "*"  "latest"

_NODE_EXACT_VERSION_RE = re.compile(
    r"""^\d+\.\d+\.\d+$"""
)

_NODE_LOOSE_INDICATORS = re.compile(
    r"""^[\^~*><=]|latest|next|canary""", re.IGNORECASE
)

# Risky postinstall script patterns
_NODE_RISKY_SCRIPTS = re.compile(
    r"""(?:curl|wget|fetch|http|eval|exec|child_process|\.sh\b|powershell)""",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Dockerfile analysis patterns
# ---------------------------------------------------------------------------

_DOCKER_FROM_RE = re.compile(
    r"""^\s*FROM\s+(\S+)""", re.IGNORECASE
)

_DOCKER_FROM_LATEST_RE = re.compile(
    r"""(?::latest\s*$|^[^:]+\s*$)"""
)

_DOCKER_USER_RE = re.compile(
    r"""^\s*USER\s+""", re.IGNORECASE
)

_DOCKER_COPY_SENSITIVE_RE = re.compile(
    r"""^\s*(?:COPY|ADD)\s+.*?(?:\.env|\.key|\.pem|\.p12|\.pfx|id_rsa|id_ed25519|\.secret)""",
    re.IGNORECASE,
)

_DOCKER_CURL_PIPE_RE = re.compile(
    r"""(?:curl|wget)\s+[^|]*\|\s*(?:bash|sh|zsh|python|perl|ruby|node)""",
    re.IGNORECASE,
)

# Known trusted base images (prefixes)
_DOCKER_TRUSTED_BASES = {
    "python", "node", "golang", "ruby", "openjdk", "amazoncorretto",
    "alpine", "ubuntu", "debian", "centos", "fedora", "archlinux",
    "nginx", "httpd", "redis", "postgres", "mysql", "mongo", "memcached",
    "mcr.microsoft.com/", "gcr.io/", "ghcr.io/", "docker.io/library/",
    "registry.access.redhat.com/",
}


# ---------------------------------------------------------------------------
# Finding builder
# ---------------------------------------------------------------------------

def _make_finding(
    file: str,
    line: int,
    severity: str,
    description: str,
    recommendation: str,
    pattern: str = "dependency",
) -> dict:
    """Create a standardized finding dict.

    Args:
        file:           Absolute path to the dependency file.
        line:           Line number where the issue was found (1-based, 0 if N/A).
        severity:       CRITICAL, HIGH, MEDIUM, or LOW.
        description:    Human-readable description of the issue.
        recommendation: Actionable fix suggestion.
        pattern:        Finding sub-type for aggregation.

    Returns:
        Finding dict compatible with other 007 scanners.
    """
    return {
        "type": "supply_chain",
        "pattern": pattern,
        "severity": severity,
        "file": file,
        "line": line,
        "description": description,
        "recommendation": recommendation,
    }


# ---------------------------------------------------------------------------
# Python dependency analysis
# ---------------------------------------------------------------------------

def analyze_requirements_txt(filepath: Path, verbose: bool = False) -> dict:
    """Analyze a Python requirements.txt file.

    Returns:
        Dict with keys: deps_total, deps_pinned, deps_hashed,
        deps_unpinned, findings.
    """
    findings: list[dict] = []
    file_str = str(filepath)
    deps_total = 0
    deps_pinned = 0
    deps_hashed = 0
    deps_unpinned: list[str] = []

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return {
            "deps_total": 0, "deps_pinned": 0, "deps_hashed": 0,
            "deps_unpinned": [], "findings": findings,
        }

    for line_num, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()

        # Skip comments, options, blanks
        if _PY_COMMENT_RE.match(line) or _PY_OPTION_RE.match(line) or _PY_BLANK_RE.match(line):
            continue

        # Remove inline comments
        line_no_comment = re.sub(r"""\s+#.*$""", "", line)

        pkg_match = _PY_PACKAGE_RE.match(line_no_comment)
        if not pkg_match:
            continue

        pkg_name = pkg_match.group(1).lower()
        deps_total += 1

        # Check pinning
        is_pinned = bool(_PY_PINNED_RE.match(line_no_comment))
        has_hash = bool(_PY_HASH_RE.search(raw_line))

        if is_pinned:
            deps_pinned += 1
        else:
            deps_unpinned.append(pkg_name)
            findings.append(_make_finding(
                file=file_str,
                line=line_num,
                severity="HIGH",
                description=f"Dependency '{pkg_name}' is not pinned to an exact version",
                recommendation=f"Pin to exact version: {pkg_name}==<version>",
                pattern="unpinned_dependency",
            ))

        if has_hash:
            deps_hashed += 1

        # Check risky packages
        if pkg_name in _RISKY_PYTHON_PACKAGES:
            findings.append(_make_finding(
                file=file_str,
                line=line_num,
                severity="MEDIUM",
                description=f"Risky package '{pkg_name}': {_RISKY_PYTHON_PACKAGES[pkg_name]}",
                recommendation=f"Review usage of '{pkg_name}' and ensure safe configuration",
                pattern="risky_package",
            ))

    # Flag if no hashes used at all and there are deps
    if deps_total > 0 and deps_hashed == 0:
        findings.append(_make_finding(
            file=file_str,
            line=0,
            severity="LOW",
            description="No hash verification used for any dependency",
            recommendation="Consider using --hash for supply chain integrity (pip install --require-hashes)",
            pattern="no_hash_verification",
        ))

    # Complexity warning
    if deps_total > 100:
        findings.append(_make_finding(
            file=file_str,
            line=0,
            severity="LOW",
            description=f"High dependency count ({deps_total}). Large dependency trees increase supply chain risk",
            recommendation="Audit dependencies and remove unused packages. Consider dependency-free alternatives",
            pattern="high_dependency_count",
        ))

    return {
        "deps_total": deps_total,
        "deps_pinned": deps_pinned,
        "deps_hashed": deps_hashed,
        "deps_unpinned": deps_unpinned,
        "findings": findings,
    }


def analyze_pyproject_toml(filepath: Path, verbose: bool = False) -> dict:
    """Analyze a pyproject.toml for dependency information.

    Performs best-effort parsing without a TOML library (stdlib only).

    Returns:
        Dict with keys: deps_total, deps_pinned, deps_unpinned, findings.
    """
    findings: list[dict] = []
    file_str = str(filepath)
    deps_total = 0
    deps_pinned = 0
    deps_unpinned: list[str] = []

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return {
            "deps_total": 0, "deps_pinned": 0,
            "deps_unpinned": [], "findings": findings,
        }

    # Best-effort: look for dependency lines in [project.dependencies] or
    # [tool.poetry.dependencies] sections
    in_deps_section = False
    dep_line_re = re.compile(r"""^\s*['"]([A-Za-z0-9_][A-Za-z0-9._-]*)([^'"]*)['\"]""")
    section_re = re.compile(r"""^\s*\[""")

    for line_num, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()

        # Track sections
        if re.match(r"""^\s*\[(?:project\.)?dependencies""", line, re.IGNORECASE):
            in_deps_section = True
            continue
        if re.match(r"""^\s*\[tool\.poetry\.dependencies""", line, re.IGNORECASE):
            in_deps_section = True
            continue
        if section_re.match(line) and in_deps_section:
            in_deps_section = False
            continue

        if not in_deps_section:
            continue

        m = dep_line_re.match(line)
        if not m:
            # Also check for key = "version" style (poetry)
            poetry_re = re.match(
                r"""^([A-Za-z0-9_][A-Za-z0-9._-]*)\s*=\s*['"]([^'"]*)['\"]""",
                line,
            )
            if poetry_re:
                pkg_name = poetry_re.group(1).lower()
                version_spec = poetry_re.group(2)
                if pkg_name in ("python",):
                    continue
                deps_total += 1
                if re.match(r"""^\d+\.\d+""", version_spec):
                    deps_pinned += 1
                else:
                    deps_unpinned.append(pkg_name)
                    findings.append(_make_finding(
                        file=file_str,
                        line=line_num,
                        severity="MEDIUM",
                        description=f"Dependency '{pkg_name}' version spec '{version_spec}' is not an exact pin",
                        recommendation=f"Pin to exact version: {pkg_name} = \"<exact_version>\"",
                        pattern="unpinned_dependency",
                    ))
            continue

        pkg_name = m.group(1).lower()
        version_spec = m.group(2).strip()
        deps_total += 1

        if "==" in version_spec:
            deps_pinned += 1
        else:
            deps_unpinned.append(pkg_name)
            if version_spec:
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="MEDIUM",
                    description=f"Dependency '{pkg_name}' has loose version spec '{version_spec}'",
                    recommendation=f"Pin to exact version with ==",
                    pattern="unpinned_dependency",
                ))
            else:
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="HIGH",
                    description=f"Dependency '{pkg_name}' has no version constraint",
                    recommendation=f"Add exact version pin: {pkg_name}==<version>",
                    pattern="unpinned_dependency",
                ))

    return {
        "deps_total": deps_total,
        "deps_pinned": deps_pinned,
        "deps_unpinned": deps_unpinned,
        "findings": findings,
    }


def analyze_pipfile(filepath: Path, verbose: bool = False) -> dict:
    """Analyze a Pipfile for dependency information (best-effort INI-like parsing).

    Returns:
        Dict with keys: deps_total, deps_pinned, deps_unpinned, findings.
    """
    findings: list[dict] = []
    file_str = str(filepath)
    deps_total = 0
    deps_pinned = 0
    deps_unpinned: list[str] = []

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return {
            "deps_total": 0, "deps_pinned": 0,
            "deps_unpinned": [], "findings": findings,
        }

    in_deps = False
    section_re = re.compile(r"""^\s*\[""")

    for line_num, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()

        if re.match(r"""^\[(?:packages|dev-packages)\]""", line, re.IGNORECASE):
            in_deps = True
            continue
        if section_re.match(line) and in_deps:
            in_deps = False
            continue

        if not in_deps or not line or line.startswith("#"):
            continue

        # package = "version_spec" or package = {version = "...", ...}
        pkg_match = re.match(
            r"""^([A-Za-z0-9_][A-Za-z0-9._-]*)\s*=\s*['"]([^'"]*)['\"]""",
            line,
        )
        if pkg_match:
            pkg_name = pkg_match.group(1).lower()
            version_spec = pkg_match.group(2)
            deps_total += 1

            if version_spec == "*":
                deps_unpinned.append(pkg_name)
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="HIGH",
                    description=f"Dependency '{pkg_name}' uses wildcard version '*'",
                    recommendation=f"Pin to exact version: {pkg_name} = \"==<version>\"",
                    pattern="unpinned_dependency",
                ))
            elif version_spec.startswith("=="):
                deps_pinned += 1
            else:
                deps_unpinned.append(pkg_name)
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="MEDIUM",
                    description=f"Dependency '{pkg_name}' version '{version_spec}' is not exact",
                    recommendation=f"Pin to exact version with ==",
                    pattern="unpinned_dependency",
                ))
            continue

        # Dict-style: package = {version = "...", extras = [...]}
        dict_match = re.match(
            r"""^([A-Za-z0-9_][A-Za-z0-9._-]*)\s*=\s*\{""",
            line,
        )
        if dict_match:
            pkg_name = dict_match.group(1).lower()
            deps_total += 1
            if '==' in line:
                deps_pinned += 1
            else:
                deps_unpinned.append(pkg_name)
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="MEDIUM",
                    description=f"Dependency '{pkg_name}' may not have exact version pin",
                    recommendation="Pin to exact version with ==",
                    pattern="unpinned_dependency",
                ))

    return {
        "deps_total": deps_total,
        "deps_pinned": deps_pinned,
        "deps_unpinned": deps_unpinned,
        "findings": findings,
    }


# ---------------------------------------------------------------------------
# Node.js dependency analysis
# ---------------------------------------------------------------------------

def analyze_package_json(filepath: Path, verbose: bool = False) -> dict:
    """Analyze a package.json for dependency security.

    Returns:
        Dict with keys: deps_total, deps_pinned, deps_unpinned,
        dev_deps_total, findings.
    """
    findings: list[dict] = []
    file_str = str(filepath)
    deps_total = 0
    deps_pinned = 0
    deps_unpinned: list[str] = []
    dev_deps_total = 0

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return {
            "deps_total": 0, "deps_pinned": 0, "deps_unpinned": [],
            "dev_deps_total": 0, "findings": findings,
        }

    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        findings.append(_make_finding(
            file=file_str,
            line=0,
            severity="MEDIUM",
            description=f"Invalid JSON in package.json: {exc}",
            recommendation="Fix JSON syntax errors in package.json",
            pattern="invalid_manifest",
        ))
        return {
            "deps_total": 0, "deps_pinned": 0, "deps_unpinned": [],
            "dev_deps_total": 0, "findings": findings,
        }

    if not isinstance(data, dict):
        return {
            "deps_total": 0, "deps_pinned": 0, "deps_unpinned": [],
            "dev_deps_total": 0, "findings": findings,
        }

    # Helper to find the approximate line number of a key in JSON text
    def _find_line(key: str, section: str = "") -> int:
        """Best-effort line number lookup for a key in the file text."""
        search_term = f'"{key}"'
        for i, file_line in enumerate(text.splitlines(), start=1):
            if search_term in file_line:
                return i
        return 0

    # Analyze dependencies
    for section_name in ("dependencies", "devDependencies"):
        deps = data.get(section_name, {})
        if not isinstance(deps, dict):
            continue

        is_dev = section_name == "devDependencies"

        for pkg_name, version_spec in deps.items():
            if not isinstance(version_spec, str):
                continue

            if is_dev:
                dev_deps_total += 1
            deps_total += 1
            line_num = _find_line(pkg_name, section_name)

            if _NODE_EXACT_VERSION_RE.match(version_spec):
                deps_pinned += 1
            elif _NODE_LOOSE_INDICATORS.match(version_spec):
                deps_unpinned.append(pkg_name)
                severity = "MEDIUM" if is_dev else "HIGH"
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity=severity,
                    description=f"{'Dev d' if is_dev else 'D'}ependency '{pkg_name}' uses loose version '{version_spec}'",
                    recommendation=f"Pin to exact version: \"{pkg_name}\": \"{version_spec.lstrip('^~')}\"",
                    pattern="unpinned_dependency",
                ))
            else:
                # URLs, git refs, file paths, etc. -- flag as non-standard
                deps_unpinned.append(pkg_name)
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="MEDIUM",
                    description=f"Dependency '{pkg_name}' uses non-standard version spec: '{version_spec}'",
                    recommendation="Consider pinning to an exact registry version",
                    pattern="non_standard_version",
                ))

    # Check scripts for risky patterns
    scripts = data.get("scripts", {})
    if isinstance(scripts, dict):
        for script_name, script_cmd in scripts.items():
            if not isinstance(script_cmd, str):
                continue

            if script_name in ("postinstall", "preinstall", "install") and _NODE_RISKY_SCRIPTS.search(script_cmd):
                line_num = _find_line(script_name)
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="CRITICAL",
                    description=f"Risky '{script_name}' lifecycle script: may execute arbitrary code",
                    recommendation=f"Review and audit the '{script_name}' script: {script_cmd[:120]}",
                    pattern="risky_lifecycle_script",
                ))

    # Complexity warning
    if deps_total > 100:
        findings.append(_make_finding(
            file=file_str,
            line=0,
            severity="LOW",
            description=f"High dependency count ({deps_total}). Large dependency trees increase supply chain risk",
            recommendation="Audit dependencies and remove unused packages",
            pattern="high_dependency_count",
        ))

    # Check if devDependencies are mixed into dependencies
    prod_deps = data.get("dependencies", {})
    dev_deps = data.get("devDependencies", {})
    if isinstance(prod_deps, dict) and isinstance(dev_deps, dict):
        _DEV_ONLY_PACKAGES = {
            "jest", "mocha", "chai", "sinon", "nyc", "istanbul",
            "eslint", "prettier", "nodemon", "ts-node",
            "webpack-dev-server", "storybook", "@storybook/react",
        }
        for pkg in prod_deps:
            if pkg.lower() in _DEV_ONLY_PACKAGES:
                line_num = _find_line(pkg)
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="LOW",
                    description=f"'{pkg}' is typically a devDependency but listed in dependencies",
                    recommendation=f"Move '{pkg}' to devDependencies to reduce production bundle size",
                    pattern="misplaced_dependency",
                ))

    return {
        "deps_total": deps_total,
        "deps_pinned": deps_pinned,
        "deps_unpinned": deps_unpinned,
        "dev_deps_total": dev_deps_total,
        "findings": findings,
    }


# ---------------------------------------------------------------------------
# Dockerfile analysis
# ---------------------------------------------------------------------------

def analyze_dockerfile(filepath: Path, verbose: bool = False) -> dict:
    """Analyze a Dockerfile for supply chain security issues.

    Returns:
        Dict with keys: base_images, findings.
    """
    findings: list[dict] = []
    file_str = str(filepath)
    base_images: list[str] = []
    has_user_directive = False

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return {"base_images": [], "findings": findings}

    lines = text.splitlines()

    for line_num, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()

        # Skip comments and blanks
        if not line or line.startswith("#"):
            continue

        # FROM analysis
        from_match = _DOCKER_FROM_RE.match(line)
        if from_match:
            image = from_match.group(1)
            base_images.append(image)

            # Check for :latest or no tag
            image_lower = image.lower()
            # Strip alias (AS builder)
            image_core = image_lower.split()[0] if " " in image_lower else image_lower

            if image_core == "scratch":
                # scratch is fine
                pass
            elif ":" not in image_core or image_core.endswith(":latest"):
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="HIGH",
                    description=f"Base image '{image_core}' uses ':latest' or no version tag",
                    recommendation="Pin base image to a specific version tag (e.g., python:3.12-slim)",
                    pattern="unpinned_base_image",
                ))
            elif "@sha256:" in image_core:
                # Digest pinning is the best practice -- no finding
                pass

            # Check for untrusted base images
            is_trusted = any(
                image_core.startswith(prefix) or image_core.startswith(f"docker.io/library/{prefix}")
                for prefix in _DOCKER_TRUSTED_BASES
            )
            if not is_trusted and image_core != "scratch":
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="MEDIUM",
                    description=f"Base image '{image_core}' is from an unverified source",
                    recommendation="Use official images from Docker Hub or trusted registries",
                    pattern="untrusted_base_image",
                ))

        # USER directive
        if _DOCKER_USER_RE.match(line):
            has_user_directive = True

        # COPY/ADD sensitive files
        if _DOCKER_COPY_SENSITIVE_RE.match(line):
            findings.append(_make_finding(
                file=file_str,
                line=line_num,
                severity="CRITICAL",
                description="COPY/ADD of potentially sensitive file (keys, .env, certificates)",
                recommendation="Use Docker secrets or build args instead of copying sensitive files into images",
                pattern="sensitive_file_in_image",
            ))

        # Remote script piping pattern
        if _DOCKER_CURL_PIPE_RE.search(line):
            findings.append(_make_finding(
                file=file_str,
                line=line_num,
                severity="CRITICAL",
                description="Pipe-to-shell pattern detected (curl|bash). Remote code execution risk",
                recommendation="Download scripts first, verify checksum, then execute",
                pattern="curl_pipe_bash",
            ))

    # Check for running as root
    if base_images and not has_user_directive:
        findings.append(_make_finding(
            file=file_str,
            line=0,
            severity="MEDIUM",
            description="Dockerfile has no USER directive -- container runs as root by default",
            recommendation="Add 'USER nonroot' or 'USER 1000' before the final CMD/ENTRYPOINT",
            pattern="running_as_root",
        ))

    return {"base_images": base_images, "findings": findings}


def analyze_docker_compose(filepath: Path, verbose: bool = False) -> dict:
    """Analyze a docker-compose.yml for supply chain issues (best-effort YAML parsing).

    Returns:
        Dict with keys: services, findings.
    """
    findings: list[dict] = []
    file_str = str(filepath)
    services: list[str] = []

    try:
        text = filepath.read_text(encoding="utf-8", errors="replace")
    except OSError as exc:
        if verbose:
            logger.debug("Cannot read %s: %s", filepath, exc)
        return {"services": [], "findings": findings}

    # Best-effort: look for image: lines
    for line_num, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()

        image_match = re.match(r"""^image:\s*['"]?(\S+?)['"]?\s*$""", line)
        if image_match:
            image = image_match.group(1).lower()
            services.append(image)

            if ":" not in image or image.endswith(":latest"):
                findings.append(_make_finding(
                    file=file_str,
                    line=line_num,
                    severity="HIGH",
                    description=f"Service image '{image}' uses ':latest' or no version tag",
                    recommendation="Pin image to a specific version tag",
                    pattern="unpinned_base_image",
                ))

        # Check for .env file mounts
        if re.match(r"""^-?\s*\.env""", line) or "env_file" in line:
            # This is expected usage, just informational
            pass

    return {"services": services, "findings": findings}


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

def discover_dependency_files(target: Path) -> list[Path]:
    """Recursively find all dependency files under the target directory.

    Respects SKIP_DIRECTORIES from config.
    """
    found: list[Path] = []

    for root, dirs, filenames in os.walk(target):
        dirs[:] = [d for d in dirs if d not in config.SKIP_DIRECTORIES]

        for fname in filenames:
            fpath = Path(root) / fname
            fname_lower = fname.lower()

            # Exact name matches
            if fname in ALL_DEP_FILES:
                found.append(fpath)
                continue

            # requirements*.txt variants
            if _REQUIREMENTS_RE.match(fname):
                found.append(fpath)
                continue

            # Docker files (prefix match)
            if any(fname_lower.startswith(prefix.lower()) for prefix in DOCKER_PREFIXES):
                found.append(fpath)
                continue

    return found


# ---------------------------------------------------------------------------
# Core scan logic
# ---------------------------------------------------------------------------

def scan_dependency_file(filepath: Path, verbose: bool = False) -> dict:
    """Route a dependency file to its appropriate analyzer.

    Returns:
        Analysis result dict including 'findings' key.
    """
    fname = filepath.name.lower()

    # Python: requirements*.txt
    if _REQUIREMENTS_RE.match(filepath.name):
        return analyze_requirements_txt(filepath, verbose=verbose)

    # Python: pyproject.toml
    if fname == "pyproject.toml":
        return analyze_pyproject_toml(filepath, verbose=verbose)

    # Python: Pipfile
    if fname == "pipfile":
        return analyze_pipfile(filepath, verbose=verbose)

    # Python: Pipfile.lock, setup.py, setup.cfg -- detect but minimal analysis
    if fname in ("pipfile.lock", "setup.py", "setup.cfg"):
        # Just count as a detected dep file with no deep analysis for now
        return {"deps_total": 0, "deps_pinned": 0, "deps_unpinned": [], "findings": []}

    # Node.js: package.json
    if fname == "package.json":
        return analyze_package_json(filepath, verbose=verbose)

    # Node.js: package-lock.json, yarn.lock -- lockfiles are generally good
    if fname in ("package-lock.json", "yarn.lock"):
        return {"deps_total": 0, "deps_pinned": 0, "deps_unpinned": [], "findings": []}

    # Docker: Dockerfile*
    if fname.startswith("dockerfile"):
        return analyze_dockerfile(filepath, verbose=verbose)

    # Docker: docker-compose*
    if fname.startswith("docker-compose"):
        return analyze_docker_compose(filepath, verbose=verbose)

    return {"findings": []}


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

SCORE_DEDUCTIONS = {
    "CRITICAL": 15,
    "HIGH": 7,
    "MEDIUM": 3,
    "LOW": 1,
    "INFO": 0,
}


def compute_supply_chain_score(findings: list[dict], pinning_pct: float) -> int:
    """Compute the supply chain security score (0-100).

    Combines finding-based deductions with overall pinning coverage.
    A project with 0% pinning starts at 50 max. A project with 100% pinning
    and no findings scores 100.

    Args:
        findings:    All findings across all dependency files.
        pinning_pct: Percentage of dependencies that are pinned (0.0-100.0).

    Returns:
        Integer score between 0 and 100.
    """
    # Base score from pinning coverage (contributes up to 50 points)
    pinning_score = pinning_pct * 0.5

    # Finding-based deductions from the remaining 50 points
    finding_base = 50.0
    for f in findings:
        deduction = SCORE_DEDUCTIONS.get(f.get("severity", "INFO"), 0)
        finding_base -= deduction
    finding_score = max(0.0, finding_base)

    total = pinning_score + finding_score
    return max(0, min(100, round(total)))


# ---------------------------------------------------------------------------
# Aggregation helpers
# ---------------------------------------------------------------------------

def aggregate_by_severity(findings: list[dict]) -> dict[str, int]:
    """Count findings per severity level."""
    counts: dict[str, int] = {sev: 0 for sev in config.SEVERITY}
    for f in findings:
        sev = f.get("severity", "INFO")
        if sev in counts:
            counts[sev] += 1
    return counts


def aggregate_by_pattern(findings: list[dict]) -> dict[str, int]:
    """Count findings per pattern type."""
    counts: dict[str, int] = {}
    for f in findings:
        pattern = f.get("pattern", "unknown")
        counts[pattern] = counts.get(pattern, 0) + 1
    return counts


# ---------------------------------------------------------------------------
# Report formatters
# ---------------------------------------------------------------------------

def format_text_report(
    target: str,
    dep_files: list[str],
    total_deps: int,
    total_pinned: int,
    pinning_pct: float,
    findings: list[dict],
    severity_counts: dict[str, int],
    pattern_counts: dict[str, int],
    score: int,
    verdict: dict,
    elapsed: float,
) -> str:
    """Build a human-readable text report."""
    lines: list[str] = []

    lines.append("=" * 72)
    lines.append("  007 DEPENDENCY SCANNER -- SUPPLY CHAIN REPORT")
    lines.append("=" * 72)
    lines.append("")

    # Metadata
    lines.append(f"  Target:            {target}")
    lines.append(f"  Timestamp:         {config.get_timestamp()}")
    lines.append(f"  Duration:          {elapsed:.2f}s")
    lines.append(f"  Dep files found:   {len(dep_files)}")
    lines.append(f"  Total deps:        {total_deps}")
    lines.append(f"  Pinned deps:       {total_pinned}")
    lines.append(f"  Pinning coverage:  {pinning_pct:.1f}%")
    lines.append(f"  Total findings:    {len(findings)}")
    lines.append("")

    # Dependency files list
    if dep_files:
        lines.append("-" * 72)
        lines.append("  DEPENDENCY FILES DETECTED")
        lines.append("-" * 72)
        for df in sorted(dep_files):
            lines.append(f"    {df}")
        lines.append("")

    # Severity breakdown
    lines.append("-" * 72)
    lines.append("  FINDINGS BY SEVERITY")
    lines.append("-" * 72)
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"):
        count = severity_counts.get(sev, 0)
        bar = "#" * min(count, 40)
        lines.append(f"    {sev:<10} {count:>5}  {bar}")
    lines.append("")

    # Pattern breakdown
    if pattern_counts:
        lines.append("-" * 72)
        lines.append("  FINDINGS BY TYPE")
        lines.append("-" * 72)
        sorted_patterns = sorted(pattern_counts.items(), key=lambda x: x[1], reverse=True)
        for pname, count in sorted_patterns[:20]:
            lines.append(f"    {pname:<35} {count:>5}")
        lines.append("")

    # Detail findings grouped by severity
    displayed = [f for f in findings if config.SEVERITY.get(f.get("severity", "INFO"), 0) >= config.SEVERITY["MEDIUM"]]

    if displayed:
        by_severity: dict[str, list[dict]] = {}
        for f in displayed:
            sev = f.get("severity", "INFO")
            by_severity.setdefault(sev, []).append(f)

        for sev in ("CRITICAL", "HIGH", "MEDIUM"):
            sev_findings = by_severity.get(sev, [])
            if not sev_findings:
                continue

            lines.append("-" * 72)
            lines.append(f"  [{sev}] FINDINGS ({len(sev_findings)})")
            lines.append("-" * 72)

            by_file: dict[str, list[dict]] = {}
            for f in sev_findings:
                by_file.setdefault(f["file"], []).append(f)

            for fpath, file_findings in sorted(by_file.items()):
                lines.append(f"  {fpath}")
                for f in sorted(file_findings, key=lambda x: x.get("line", 0)):
                    loc = f"L{f['line']}" if f.get("line") else "    "
                    lines.append(f"    {loc:>6}  {f['description']}")
                    lines.append(f"            -> {f['recommendation']}")
                lines.append("")
    else:
        lines.append("  No findings at MEDIUM severity or above.")
        lines.append("")

    # Score and verdict
    lines.append("=" * 72)
    lines.append(f"  SUPPLY CHAIN SCORE:  {score} / 100")
    lines.append(f"  VERDICT:             {verdict['emoji']} {verdict['label']}")
    lines.append(f"                       {verdict['description']}")
    lines.append("=" * 72)
    lines.append("")

    return "\n".join(lines)


def build_json_report(
    target: str,
    dep_files: list[str],
    total_deps: int,
    total_pinned: int,
    pinning_pct: float,
    findings: list[dict],
    severity_counts: dict[str, int],
    pattern_counts: dict[str, int],
    score: int,
    verdict: dict,
    elapsed: float,
) -> dict:
    """Build a structured JSON-serializable report dict."""
    return {
        "scan": "dependency_scanner",
        "target": target,
        "timestamp": config.get_timestamp(),
        "duration_seconds": round(elapsed, 3),
        "dependency_files": dep_files,
        "total_dependencies": total_deps,
        "total_pinned": total_pinned,
        "pinning_coverage_pct": round(pinning_pct, 1),
        "total_findings": len(findings),
        "severity_counts": severity_counts,
        "pattern_counts": pattern_counts,
        "score": score,
        "verdict": {
            "label": verdict["label"],
            "description": verdict["description"],
            "emoji": verdict["emoji"],
        },
        "findings": findings,
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def run_scan(
    target_path: str,
    output_format: str = "text",
    verbose: bool = False,
) -> dict:
    """Execute the dependency scan and return the report dict.

    Also prints the report to stdout in the requested format.

    Args:
        target_path:   Path to the directory to scan.
        output_format: 'text' or 'json'.
        verbose:       Enable debug-level logging.

    Returns:
        JSON-compatible report dict.
    """
    if verbose:
        logger.setLevel("DEBUG")

    config.ensure_directories()

    target = Path(target_path).resolve()
    if not target.exists():
        logger.error("Target path does not exist: %s", target)
        sys.exit(1)
    if not target.is_dir():
        logger.error("Target is not a directory: %s", target)
        sys.exit(1)

    logger.info("Starting dependency scan of %s", target)
    start_time = time.time()

    # Discover dependency files
    dep_file_paths = discover_dependency_files(target)
    dep_files = [str(p) for p in dep_file_paths]
    logger.info("Found %d dependency files", len(dep_files))

    # Analyze each dependency file
    all_findings: list[dict] = []
    total_deps = 0
    total_pinned = 0

    for fpath in dep_file_paths:
        if verbose:
            logger.debug("Analyzing: %s", fpath)

        result = scan_dependency_file(fpath, verbose=verbose)
        all_findings.extend(result.get("findings", []))
        total_deps += result.get("deps_total", 0)
        total_pinned += result.get("deps_pinned", 0)

    # Truncate findings if over limit
    max_report = config.LIMITS["max_report_findings"]
    if len(all_findings) > max_report:
        logger.warning("Truncating findings from %d to %d", len(all_findings), max_report)
        all_findings = all_findings[:max_report]

    elapsed = time.time() - start_time

    # Calculate pinning percentage
    pinning_pct = (total_pinned / total_deps * 100.0) if total_deps > 0 else 100.0

    # Aggregation
    severity_counts = aggregate_by_severity(all_findings)
    pattern_counts = aggregate_by_pattern(all_findings)
    score = compute_supply_chain_score(all_findings, pinning_pct)
    verdict = config.get_verdict(score)

    logger.info(
        "Dependency scan complete: %d files, %d deps, %d findings, "
        "pinning=%.1f%%, score=%d in %.2fs",
        len(dep_files), total_deps, len(all_findings),
        pinning_pct, score, elapsed,
    )

    # Audit log
    config.log_audit_event(
        action="dependency_scan",
        target=str(target),
        result=f"score={score}, findings={len(all_findings)}, verdict={verdict['label']}",
        details={
            "dependency_files": len(dep_files),
            "total_dependencies": total_deps,
            "total_pinned": total_pinned,
            "pinning_coverage_pct": round(pinning_pct, 1),
            "severity_counts": severity_counts,
            "pattern_counts": pattern_counts,
            "duration_seconds": round(elapsed, 3),
        },
    )

    # Build report
    report = build_json_report(
        target=str(target),
        dep_files=dep_files,
        total_deps=total_deps,
        total_pinned=total_pinned,
        pinning_pct=pinning_pct,
        findings=all_findings,
        severity_counts=severity_counts,
        pattern_counts=pattern_counts,
        score=score,
        verdict=verdict,
        elapsed=elapsed,
    )

    # Output
    if output_format == "json":
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(format_text_report(
            target=str(target),
            dep_files=dep_files,
            total_deps=total_deps,
            total_pinned=total_pinned,
            pinning_pct=pinning_pct,
            findings=all_findings,
            severity_counts=severity_counts,
            pattern_counts=pattern_counts,
            score=score,
            verdict=verdict,
            elapsed=elapsed,
        ))

    return report


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="007 Dependency Scanner -- Supply chain and dependency security analyzer.",
        epilog=(
            "Examples:\n"
            "  python dependency_scanner.py --target ./my-project\n"
            "  python dependency_scanner.py --target ./my-project --output json\n"
            "  python dependency_scanner.py --target ./my-project --verbose"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--target",
        required=True,
        help="Path to the directory to scan (required).",
    )
    parser.add_argument(
        "--output",
        choices=["text", "json"],
        default="text",
        help="Output format: 'text' (default) or 'json'.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        default=False,
        help="Enable verbose/debug logging.",
    )

    args = parser.parse_args()
    run_scan(
        target_path=args.target,
        output_format=args.output,
        verbose=args.verbose,
    )
