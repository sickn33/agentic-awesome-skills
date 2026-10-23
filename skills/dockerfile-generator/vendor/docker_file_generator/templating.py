from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, StrictUndefined, TemplateNotFound
from jinja2 import TemplateError as JinjaError

TEMPLATE_DIR = Path(__file__).resolve().parent / "templates" / "fragments"
FORBIDDEN = (
    ("{%", "template logic blocks are not allowed in static fragments"),
    ("{#", "template comments are not allowed in static fragments"),
)
WHITESPACE_CONTROL = re.compile(r"\{[%{#][-+]|[-+][%#}]\}")


class FragmentError(ValueError):
    pass


def lint_fragment(text: str, name: str = "<fragment>") -> None:
    if "\r" in text:
        raise FragmentError(f"{name}: fragments must use LF line endings only")
    match = WHITESPACE_CONTROL.search(text)
    if match:
        raise FragmentError(f"{name}: whitespace-control markers are not allowed (found {match.group(0)!r})")
    for token, message in FORBIDDEN:
        if token in text:
            raise FragmentError(f"{name}: {message}")
    if text.count("{{") != text.count("}}"):
        raise FragmentError(f"{name}: unbalanced expression delimiters")


def build_environment(template_dir: str | Path | None = None) -> Environment:
    root = Path(template_dir) if template_dir else TEMPLATE_DIR
    env = Environment(
        loader=FileSystemLoader(str(root)),
        undefined=StrictUndefined,
        autoescape=False,
        keep_trailing_newline=True,
        trim_blocks=False,
        lstrip_blocks=False,
        newline_sequence="\n",
    )
    env.globals.clear()
    return env


def render_fragment(name: str, template_dir: str | Path | None = None, **context: Any) -> str:
    env = build_environment(template_dir)
    try:
        source, filename, _ = env.loader.get_source(env, name)
    except TemplateNotFound as exc:
        raise FragmentError(f"unknown fragment: {name}") from exc
    lint_fragment(source, filename or name)
    try:
        return env.from_string(source, globals={}).render(**context)
    except JinjaError as exc:
        raise FragmentError(f"{name}: {exc}") from exc


def list_fragments(template_dir: str | Path | None = None) -> list[str]:
    root = Path(template_dir) if template_dir else TEMPLATE_DIR
    if not root.is_dir():
        return []
    return sorted(path.name for path in root.glob("*.j2"))