from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Callable

import click

from . import __version__
from .config import ConfigError, load_config
from .docs import reference_markdown, resolved_example, sample_keys, starter_yaml
from .manifest import build_manifest, manifest_json
from .plugins.languages import GenerateRequest, Unsupported, plugin_for
from .registry import OPTIONS_BY_KEY
from .routing import route
from .templating import FragmentError

FALLBACK_EXIT = 20


def config_options(func: Callable[..., Any]) -> Callable[..., Any]:
    """Attach the shared configuration flags to a command."""
    options = [
        click.option("--config", "config_path", type=click.Path(dir_okay=False), default=None, help="Project configuration file to load instead of dockerfile.yaml."),
        click.option("--no-config", is_flag=True, default=False, help="Ignore all configuration files and use registry defaults."),
        click.option("--validate-config", "validate_config", is_flag=True, default=False, help="Validate configuration and stop before any generation."),
        click.option("--print-config", "print_config", is_flag=True, default=False, help="Print the resolved configuration as JSON and stop without writing files."),
        click.option("--explain", "explain_key", default=None, metavar="KEY", help="Explain one resolved option and stop."),
    ]
    for option in reversed(options):
        func = option(func)
    return func


def _load(project: str | Path | None, config_path: str | None, no_config: bool) -> Any:
    root = Path(project) if project else Path.cwd()
    return load_config(root, config_path, no_config=no_config)


def _explain(config: Any, key: str) -> None:
    if key not in OPTIONS_BY_KEY:
        raise click.ClickException(f"unknown option: {key}")
    entry = config.explanation(key)
    # The key itself is part of the answer: a user pastes this JSON into a bug
    # report and it has to say which option it describes.
    entry["key"] = key
    click.echo(json.dumps(entry, indent=2, sort_keys=True))


@click.group()
@click.version_option(__version__)
def cli() -> None:
    """Generate production Dockerfiles with explainable configuration."""


@cli.command()
@click.argument("path", required=False, type=click.Path(file_okay=False))
@click.option("--dry-run", is_flag=True, default=False, help="Detect and print without writing files.")
@click.option("--check", "check_mode", is_flag=True, default=False, help="Verify generated output matches detection.")
@click.option("--no-dockerfile-2", is_flag=True, default=False, help="Skip the GitHub Release download variant.")
@click.option("--init", "init_mode", is_flag=True, default=False, help="Write a starter configuration file.")
@click.option("--compose", is_flag=True, default=False, help="Also write compose.yaml.")
@click.option("--fast", is_flag=True, default=False, help="Skip docker/hadolint checks.")
@click.option("--all", "all_apps", is_flag=True, default=False, help="Monorepo: one Dockerfile-1 per app.")
@config_options
def generate(path: str | None, dry_run: bool, check_mode: bool, no_dockerfile_2: bool, init_mode: bool, compose: bool, fast: bool, all_apps: bool, config_path: str | None, no_config: bool, validate_config: bool, print_config: bool, explain_key: str | None) -> None:
    """Generate Dockerfiles for a project."""
    root = Path(path) if path else Path.cwd()
    try:
        config = _load(root, config_path, no_config)
        if explain_key:
            _explain(config, explain_key)
            return
        if print_config:
            click.echo(manifest_json(build_manifest(config)), nl=False)
            return
        if validate_config:
            click.echo("configuration is valid")
            return
    except (ConfigError, FragmentError) as exc:
        raise click.ClickException(str(exc)) from exc

    decision = route(root)
    if decision.renderer != "python":
        click.echo(f"[INFO] {decision.reason}; using the Bash renderer", err=True)
        raise SystemExit(FALLBACK_EXIT)
    # Only a layer the user actually wrote counts as an explicit pin. The
    # resolved config always carries defaults.port=8080 (that IS the registry
    # default), so compare the SOURCE, not the value: PORT=8080 in the
    # environment is a deliberate pin and must reach the renderer, while the
    # untouched default must stay out of the way so detection wins.
    EXPLICIT_LAYERS = {"environment", "project config", "CLI", "legacy dockerfile.conf"}

    def pinned(key: str) -> str:
        if config.source(key).layer not in EXPLICIT_LAYERS:
            return ""
        value = config.get(key)
        return "" if value is None else str(value)

    # Only user-written layers count as overrides; registry/global defaults stay
    # out of the way so detection keeps winning.
    def overrides(prefix: str) -> dict[str, str]:
        result = {}
        for item in OPTIONS_BY_KEY.values():
            if not item.key.startswith(prefix):
                continue
            if config.source(item.key).layer in EXPLICIT_LAYERS:
                value = config.get(item.key)
                if value not in (None, ""):
                    result[item.key] = str(value)
        return result

    request = GenerateRequest(
        project_dir=root,
        port=pinned("defaults.port"),
        health=pinned("defaults.health"),
        stopsignal=pinned("defaults.stopsignal"),
        health_start=str(config.get("defaults.health_start")),
        extra_copy=os.environ.get("EXTRA_COPY", ""),
        extra_run=os.environ.get("EXTRA_RUN", ""),
        extra_directives=os.environ.get("EXTRA_DIRECTIVES", ""),
        fast=fast,
        dry_run=dry_run,
        write_dockerfile_2=not no_dockerfile_2,
        compose=compose,
        check=check_mode,
        init=init_mode,
        all_apps=all_apps,
        images=overrides("images."),
        backing=overrides("backing_services."),
    )
    plugin = plugin_for(decision.language)
    if plugin is None:
        click.echo(f"[INFO] no plugin for {decision.language}; using the Bash renderer", err=True)
        raise SystemExit(FALLBACK_EXIT)
    if not plugin.detects(root):
        click.echo(f"[INFO] {decision.language} plugin does not claim this project; using the Bash renderer", err=True)
        raise SystemExit(FALLBACK_EXIT)
    try:
        plugin.run(request)
    except Unsupported as exc:
        click.echo(f"[INFO] python plugin cannot serve this run ({exc}); using the Bash renderer", err=True)
        raise SystemExit(FALLBACK_EXIT)
    except Exception as exc:  # a plugin bug must never break generation
        click.echo(f"[WARN] python plugin failed ({exc}); falling back to the Bash renderer", err=True)
        raise SystemExit(FALLBACK_EXIT)
    for line in request.emit:
        click.echo(line)


@cli.command("reference")
@click.option("--output", "output_path", type=click.Path(dir_okay=False), default=None, help="Write the reference to this file instead of stdout.")
def reference_command(output_path: str | None) -> None:
    """Print the generated configuration reference."""
    text = reference_markdown()
    if output_path:
        Path(output_path).write_text(text, encoding="utf-8")
        click.echo(f"Wrote {output_path}")
        return
    click.echo(text, nl=False)


@cli.command("route")
@click.argument("path", required=False, type=click.Path(file_okay=False))
def route_command(path: str | None) -> None:
    """Print the renderer that would handle a project (python or legacy)."""
    click.echo(str(route(Path(path) if path else Path.cwd())))


@cli.command()
@click.argument("path", required=False, type=click.Path(file_okay=False))
@config_options
def validate(path: str | None, config_path: str | None, no_config: bool, validate_config: bool, print_config: bool, explain_key: str | None) -> None:
    """Validate project and global configuration."""
    try:
        config = _load(path, config_path, no_config)
        if explain_key:
            _explain(config, explain_key)
            return
        if print_config:
            click.echo(manifest_json(build_manifest(config)), nl=False)
            return
    except (ConfigError, FragmentError) as exc:
        raise click.ClickException(str(exc)) from exc
    if print_config:
        click.echo(manifest_json(build_manifest(config)), nl=False)
        return
    click.echo("configuration is valid")


@cli.command()
@click.argument("path", required=False, type=click.Path(file_okay=False))
@click.option("--force", is_flag=True, default=False, help="Overwrite an existing dockerfile.yaml.")
def init(path: str | None, force: bool) -> None:
    """Create a starter project configuration."""
    root = Path(path) if path else Path.cwd()
    target = root / "dockerfile.yaml"
    if target.exists() and not force:
        raise click.ClickException(f"{target} already exists (use --force to overwrite)")
    text = starter_yaml()
    target.write_text(text, encoding="utf-8")
    click.echo(f"Wrote {target}")


@cli.group()
def config() -> None:
    """Inspect resolved configuration."""


@config.command("show")
@click.argument("path", required=False, type=click.Path(file_okay=False))
@config_options
def config_show(path: str | None, config_path: str | None, no_config: bool, validate_config: bool, print_config: bool, explain_key: str | None) -> None:
    """Print the effective configuration and provenance."""
    try:
        resolved = _load(path, config_path, no_config)
        if explain_key:
            _explain(resolved, explain_key)
            return
        click.echo(manifest_json(build_manifest(resolved)), nl=False)
    except (ConfigError, FragmentError) as exc:
        raise click.ClickException(str(exc)) from exc


@config.command("example")
@click.argument("path", required=False, type=click.Path(file_okay=False))
@click.option("--config", "config_path", type=click.Path(dir_okay=False), default=None, help="Project configuration file to load.")
@click.option("--no-config", is_flag=True, default=False, help="Ignore all configuration files and use registry defaults.")
@click.option("--all-options", is_flag=True, default=False, help="Include every option instead of one per section.")
def config_example(path: str | None, config_path: str | None, no_config: bool, all_options: bool) -> None:
    """Print a resolved-configuration JSON example."""
    root = Path(path) if path else Path.cwd()
    try:
        config = _load(root, config_path, no_config)
    except (ConfigError, FragmentError) as exc:
        raise click.ClickException(str(exc)) from exc
    keys = () if all_options else sample_keys()
    click.echo(resolved_example(config, keys, portable=True), nl=False)


@config.command("explain")
@click.argument("key")
@click.argument("path", required=False, type=click.Path(file_okay=False))
@config_options
def config_explain(key: str, path: str | None, config_path: str | None, no_config: bool, validate_config: bool, print_config: bool, explain_key: str | None) -> None:
    """Explain one configuration option and its effect."""
    try:
        _explain(_load(path, config_path, no_config), key)
    except (ConfigError, FragmentError) as exc:
        raise click.ClickException(str(exc)) from exc


@cli.command()
@click.argument("key")
@click.argument("path", required=False, type=click.Path(file_okay=False))
@config_options
def explain(key: str, path: str | None, config_path: str | None, no_config: bool, validate_config: bool, print_config: bool, explain_key: str | None) -> None:
    """Explain one configuration option and its effect."""
    try:
        _explain(_load(path, config_path, no_config), key)
    except (ConfigError, FragmentError) as exc:
        raise click.ClickException(str(exc)) from exc


def main() -> None:
    cli()


if __name__ == "__main__":
    main()