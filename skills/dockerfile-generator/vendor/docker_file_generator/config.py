from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

import yaml

from .registry import OPTIONS, OPTIONS_BY_KEY, Option

GLOBAL_CONFIG = Path(__file__).resolve().parent.parent / "config" / "defaults.yaml"
REFERENCE_SECTION = "dockerfile_instruction_reference"
LEGACY_KEYS = {
    "PORT": "defaults.port",
    "HEALTH": "defaults.health",
    "STOPSIGNAL": "defaults.stopsignal",
    "D2_ASSET_URL": "release_assets.asset_url",
    "D2_ASSET_SHA_URL": "release_assets.asset_sha_url",
}


class ConfigError(ValueError):
    def __init__(self, message: str, path: Path | None = None, line: int | None = None) -> None:
        self.path = path
        self.line = line
        location = ""
        if path is not None:
            location = f"{path}:{line or 1}"
        super().__init__(f"{location}: {message}" if location else message)


@dataclass(frozen=True)
class Source:
    layer: str
    path: str | None = None
    line: int | None = None


@dataclass
class ResolvedConfig:
    values: dict[str, Any]
    sources: dict[str, Source]
    conditions: dict[str, str]
    warnings: list[str]

    def get(self, key: str) -> Any:
        return self.values[key]

    def source(self, key: str) -> Source:
        return self.sources[key]

    def explanation(self, key: str) -> dict[str, Any]:
        item = OPTIONS_BY_KEY[key]
        return {
            "value": self.values[key],
            "source": self.sources[key].layer,
            "source_path": self.sources[key].path,
            "source_line": self.sources[key].line,
            "condition": self.conditions[key],
            "explanation": item.description,
            "affects": list(item.affects),
            "result": f"{key} affects {', '.join(item.affects)}",
        }


def _node_value(node: yaml.Node) -> Any:
    if isinstance(node, yaml.ScalarNode):
        tag = node.tag
        if tag == "tag:yaml.org,2002:str":
            return node.value
        if tag == "tag:yaml.org,2002:null":
            return None
        if tag == "tag:yaml.org,2002:bool":
            return node.value.lower() in {"true", "yes", "on", "1"}
        if tag == "tag:yaml.org,2002:int":
            return int(node.value, 0)
        if tag == "tag:yaml.org,2002:float":
            return float(node.value)
        return yaml.safe_load(node.value)
    if isinstance(node, yaml.SequenceNode):
        return [_node_value(item) for item in node.value]
    return {}


def _flatten(node: yaml.Node, path: str, line_map: dict[str, int], source: Path) -> dict[str, Any]:
    result: dict[str, Any] = {}
    if not isinstance(node, yaml.MappingNode):
        raise ConfigError("configuration root must be a mapping", source)
    seen: set[str] = set()
    for key_node, value_node in node.value:
        key = str(key_node.value)
        current = f"{path}.{key}" if path else key
        if key in seen:
            raise ConfigError(f"duplicate key: {current}", source, key_node.start_mark.line + 1)
        seen.add(key)
        line_map[current] = key_node.start_mark.line + 1
        if isinstance(value_node, yaml.MappingNode):
            result.update(_flatten(value_node, current, line_map, source))
        else:
            result[current] = _node_value(value_node)
    return result


def _read_yaml(path: Path) -> tuple[dict[str, Any], dict[str, int]]:
    try:
        text = path.read_text(encoding="utf-8")
        node = yaml.compose(text, Loader=yaml.SafeLoader)
    except FileNotFoundError:
        return {}, {}
    except yaml.YAMLError as exc:
        mark = getattr(exc, "problem_mark", None)
        raise ConfigError(f"invalid YAML: {exc}", path, mark.line + 1 if mark else None) from exc
    if node is None:
        return {}, {}
    lines: dict[str, int] = {}
    flat = _flatten(node, "", lines, path)
    return flat, lines


def _validate_reference_section(flat: dict[str, Any], lines: dict[str, int], path: Path) -> None:
    for key, value in flat.items():
        if not key.startswith(REFERENCE_SECTION + "."):
            continue
        if not isinstance(value, str):
            raise ConfigError("instruction reference descriptions must be strings", path, lines.get(key))


def _coerce(item: Option, value: Any, path: Path, line: int | None, label: str) -> Any:
    try:
        if item.type in {"integer"}:
            try:
                value = int(value, 0) if isinstance(value, str) else int(value)
            except (TypeError, ValueError) as exc:
                raise ValueError("must be an integer") from exc
        elif item.type in {"multiline", "list"}:
            if isinstance(value, list):
                value = "\n".join(str(part) for part in value)
            else:
                value = str(value)
        elif item.type == "duration":
            value = str(value)
            if not re.fullmatch(r"[0-9]+(ms|s|m)", value):
                raise ValueError("duration must look like 10s, 500ms, or 2m")
        elif item.type == "path":
            value = str(value)
            if not value.startswith("/") or not re.fullmatch(r"/[A-Za-z0-9/_-]*", value):
                raise ValueError("path must start with / and contain only safe characters")
        elif item.type == "enum":
            value = str(value)
            if item.allowed and value not in item.allowed:
                raise ValueError(f"must be one of: {', '.join(item.allowed)}")
        elif item.type == "signal":
            value = str(value)
            if value and not re.fullmatch(r"SIG[A-Z0-9]+|[0-9]+", value):
                raise ValueError("signal must look like SIGTERM or a number")
        elif item.type == "url":
            value = str(value)
            if value and not re.fullmatch(r"https?://[^\s;|]+", value):
                raise ValueError("URL must use http:// or https:// and contain no spaces")
        elif item.type in {"image", "image_version", "version", "command", "string"}:
            value = str(value)
            if item.type in {"image", "image_version"} and (not value or any(char.isspace() for char in value)):
                raise ValueError("image value must not be empty or contain whitespace")
        else:
            value = str(value)
    except (TypeError, ValueError) as exc:
        raise ConfigError(f"{label} for {item.key}: {exc}", path, line) from exc
    if item.type == "integer" and item.key.endswith(("port", "major", "version")):
        if value < 1:
            raise ConfigError(f"{label} for {item.key} must be positive", path, line)
    if item.key.endswith(".port") and value > 65535:
        raise ConfigError(f"{label} for {item.key} must be <= 65535", path, line)
    return value


def _set_value(values: dict[str, Any], sources: dict[str, Source], conditions: dict[str, str], key: str, value: Any, source: Source, condition: str, path: Path | None, line: int | None) -> None:
    item = OPTIONS_BY_KEY[key]
    values[key] = _coerce(item, value, path or Path("<env>"), line, source.layer)
    sources[key] = source
    conditions[key] = condition


def _apply_file(path: Path, layer: str, values: dict[str, Any], sources: dict[str, Source], conditions: dict[str, str]) -> None:
    flat, lines = _read_yaml(path)
    _validate_reference_section(flat, lines, path)
    for key, value in flat.items():
        if key == "schema.version":
            if value != 1:
                raise ConfigError("unsupported schema version", path, lines.get(key))
            continue
        if key.startswith(REFERENCE_SECTION):
            continue
        if key not in OPTIONS_BY_KEY:
            raise ConfigError(f"unknown configuration key: {key}", path, lines.get(key))
        _set_value(values, sources, conditions, key, value, Source(layer, str(path), lines.get(key)), f"{layer} value from {path.name}", path, lines.get(key))


def _apply_legacy(path: Path, values: dict[str, Any], sources: dict[str, Source], conditions: dict[str, str], warnings: list[str]) -> None:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        return
    for number, raw in enumerate(lines, 1):
        text = raw.strip()
        if not text or text.startswith("#"):
            continue
        if "=" not in text:
            warnings.append(f"ignored legacy line {number}: {text}")
            continue
        name, value = text.split("=", 1)
        name = name.strip()
        key = LEGACY_KEYS.get(name)
        if key is None:
            warnings.append(f"ignored unknown legacy key: {name}")
            continue
        _set_value(values, sources, conditions, key, value.strip(), Source("legacy dockerfile.conf", str(path), number), "legacy dockerfile.conf value", path, number)


def load_config(project_dir: str | Path = ".", config_path: str | Path | None = None, *, no_config: bool = False, cli_overrides: Mapping[str, Any] | None = None, environ: Mapping[str, str] | None = None) -> ResolvedConfig:
    project = Path(project_dir).resolve()
    env = os.environ if environ is None else environ
    values = {item.key: item.default for item in OPTIONS}
    sources = {item.key: Source("registry default") for item in OPTIONS}
    conditions = {item.key: "built-in registry default" for item in OPTIONS}
    warnings: list[str] = []

    if not no_config:
        if GLOBAL_CONFIG.exists():
            _apply_file(GLOBAL_CONFIG, "global config", values, sources, conditions)
        explicit = Path(config_path).resolve() if config_path else None
        project_file = explicit
        if project_file is None:
            for candidate in (project / "dockerfile.yaml", project / "dockerfile.yml"):
                if candidate.exists():
                    project_file = candidate
                    break
        if project_file is not None:
            if not project_file.exists():
                raise ConfigError("configuration file does not exist", project_file)
            _apply_file(project_file, "project config", values, sources, conditions)
        elif (project / "dockerfile.conf").exists():
            _apply_legacy(project / "dockerfile.conf", values, sources, conditions, warnings)

    for item in OPTIONS:
        if not item.env or item.env not in env or env[item.env] == "":
            continue
        _set_value(values, sources, conditions, item.key, env[item.env], Source("environment", item.env), f"environment variable {item.env} is set", None, None)
    for key, value in (cli_overrides or {}).items():
        if key not in OPTIONS_BY_KEY:
            raise ConfigError(f"unknown CLI configuration key: {key}")
        _set_value(values, sources, conditions, key, value, Source("CLI"), "CLI option", None, None)
    return ResolvedConfig(values, sources, conditions, warnings)