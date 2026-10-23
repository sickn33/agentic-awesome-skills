from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

LEGACY = "legacy"
FALLBACK = "generic"
PYTHON = "python"


class LanguagePlugin(Protocol):
    """A migrated language renderer."""

    name: str

    def detects(self, project_dir: Path) -> bool: ...


@dataclass(frozen=True)
class Route:
    renderer: str
    language: str
    reason: str

    def __str__(self) -> str:
        return self.renderer


PLUGINS: dict[str, LanguagePlugin] = {}


def register(plugin: LanguagePlugin) -> None:
    PLUGINS[plugin.name] = plugin


def migrated_languages() -> tuple[str, ...]:
    return tuple(sorted(PLUGINS))


_LOADED = False


def load_plugins() -> None:
    """Register the built-in plugins once."""
    global _LOADED
    if _LOADED:
        return
    _LOADED = True
    from .plugins import languages

    for plugin in languages.PLUGINS:
        register(plugin())


def route(project_dir: str | Path = ".") -> Route:
    """Pick the renderer for a project.

    Only registered plugins can claim a project. Anything else - and any
    detection error - stays on the Bash renderer, which is still the source
    of truth for every language until its plugin is migrated and certified.
    """
    root = Path(project_dir)
    load_plugins()
    if not PLUGINS:
        return Route(LEGACY, "unknown", "no migrated language plugins registered")
    # Deterministic order, with the generic fallback always last so every real
    # language gets first refusal.
    order = [name for name in sorted(PLUGINS) if name != FALLBACK] + ([FALLBACK] if FALLBACK in PLUGINS else [])
    for name in order:
        plugin = PLUGINS[name]
        try:
            claimed = plugin.detects(root)
        except Exception as exc:  # detection must never break generation
            return Route(LEGACY, name, f"plugin detection failed: {exc}")
        if claimed:
            return Route(PYTHON, name, f"{name} plugin claims the project")
    return Route(LEGACY, "unknown", "no migrated plugin matched this project")


def route_cli(project_dir: str | Path = ".") -> str:
    return str(route(project_dir))