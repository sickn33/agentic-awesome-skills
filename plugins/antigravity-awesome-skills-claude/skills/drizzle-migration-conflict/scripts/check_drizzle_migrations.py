#!/usr/bin/env python3
"""Read-only structural checks for Drizzle migration outputs.

This helper never connects to a database, never imports project code, and never writes
files. It only reads migration directories, parses `_journal.json`/snapshot JSON, and
reports structural inconsistencies.

Exit codes:
    0  All checked migration directories are clean (no errors or warnings).
    1  At least one error or warning issue was found.
    2  No migration directories were discovered (pass --config or --migrations-dir).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable

CONFIG_NAME_PATTERN = re.compile(r"^drizzle(?:[.-].+)?\.config\.(?:ts|js|mjs|cjs|mts|cts)$")
COMMON_DIRS = (
    "drizzle",
    "migrations",
    "src/db/migrations",
    "db/migrations",
)
SKIP_DIR_NAMES = {
    ".git",
    ".hg",
    ".svn",
    "node_modules",
    ".next",
    ".nuxt",
    "dist",
    "build",
    "coverage",
    "target",
    "vendor",
    "__pycache__",
}
CONFLICT_MARKERS = ("<<<<<<<", "=======", ">>>>>>>")
TEXT_SUFFIXES = {".sql", ".json", ".ts", ".js", ".mts", ".mjs", ".cts", ".cjs"}


@dataclass
class Issue:
    severity: str
    code: str
    path: str
    message: str


@dataclass
class DirectoryReport:
    path: str
    structure: str
    issues: list[Issue]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check Drizzle migration directories for read-only structural conflicts."
    )
    parser.add_argument("--root", default=".", help="Repository root or package root. Default: .")
    parser.add_argument(
        "--config",
        action="append",
        default=[],
        help="Drizzle config file to inspect for an out directory. May be passed more than once.",
    )
    parser.add_argument(
        "--migrations-dir",
        action="append",
        default=[],
        help="Migration output directory. May be passed more than once.",
    )
    parser.add_argument(
        "--allow-outside-root",
        action="store_true",
        help=(
            "Allow explicit config/out or migration directories outside --root. "
            "Only use when the user has named the exact path and you have confirmed it "
            "contains no sensitive content; the script will still skip known vendored "
            "directories but cannot guarantee what lives under an arbitrary root."
        ),
    )
    parser.add_argument("--json", action="store_true", help="Print JSON output.")
    return parser.parse_args()


def strip_json_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"(^|\s)//.*$", r"\1", text, flags=re.M)
    return text


def read_json(path: Path) -> tuple[Any | None, str | None]:
    try:
        return json.loads(strip_json_comments(path.read_text(encoding="utf-8"))), None
    except Exception as exc:  # noqa: BLE001 - error text is reported to the caller.
        return None, str(exc)


def path_in_root(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def normalize_dir(root: Path, value: str) -> Path:
    candidate = Path(value.strip())
    if not candidate.is_absolute():
        candidate = root / candidate
    return candidate.resolve()


def relative(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def make_issue(severity: str, code: str, path: Path | str, root: Path, message: str) -> Issue:
    if isinstance(path, Path):
        issue_path = relative(path, root)
    else:
        issue_path = path
    return Issue(severity=severity, code=code, path=issue_path, message=message)


def add_issue(issues: list[Issue], severity: str, code: str, path: Path, root: Path, message: str) -> None:
    issues.append(make_issue(severity, code, path, root, message))


def iter_config_files(
    root: Path, explicit_configs: Iterable[str], allow_outside_root: bool
) -> tuple[list[Path], list[Issue]]:
    issues: list[Issue] = []
    configs: list[Path] = []
    seen: set[Path] = set()

    for value in explicit_configs:
        path = normalize_dir(root, value)
        if not allow_outside_root and not path_in_root(path, root):
            issues.append(
                make_issue(
                    "error",
                    "config-outside-root",
                    path,
                    root,
                    "Config path is outside --root. Pass --allow-outside-root only after verifying it is intended.",
                )
            )
            continue
        if not path.exists():
            issues.append(make_issue("error", "missing-config", path, root, "Config file does not exist."))
            continue
        if path not in seen:
            seen.add(path)
            configs.append(path)
    if explicit_configs:
        return configs, issues

    for current_root, dirnames, filenames in os.walk(root):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIR_NAMES]
        base = Path(current_root)
        for filename in filenames:
            if CONFIG_NAME_PATTERN.match(filename):
                path = (base / filename).resolve()
                if path not in seen:
                    seen.add(path)
                    configs.append(path)
    return configs, issues


def parse_config_out_dirs(root: Path, configs: list[Path], allow_outside_root: bool) -> tuple[list[Path], list[Issue]]:
    dirs: list[Path] = []
    issues: list[Issue] = []
    seen: set[Path] = set()

    for config in configs:
        try:
            text = config.read_text(encoding="utf-8")
        except UnicodeDecodeError as exc:
            issues.append(make_issue("warning", "unreadable-config", config, root, f"Cannot read config as UTF-8: {exc}"))
            continue
        matches = list(re.finditer(r'''\bout\s*:\s*['"`]([^'"`]+)['"`]''', text))
        if not matches:
            issues.append(
                make_issue(
                    "warning",
                    "config-out-not-found",
                    config,
                    root,
                    "No literal out directory found in config. If `out` is computed "
                    "(e.g. process.env.MIGRATIONS_DIR), pass --migrations-dir explicitly "
                    "so the migration directory is not missed.",
                )
            )
            continue
        for match in matches:
            path = normalize_dir(config.parent, match.group(1))
            if not allow_outside_root and not path_in_root(path, root):
                issues.append(
                    make_issue(
                        "error",
                        "migrations-dir-outside-root",
                        path,
                        root,
                        "Config out directory is outside --root; refusing to scan it by default.",
                    )
                )
                continue
            if path not in seen:
                seen.add(path)
                dirs.append(path)
    return dirs, issues


def discover_dirs(args: argparse.Namespace, root: Path) -> tuple[list[Path], list[Issue]]:
    issues: list[Issue] = []
    dirs: list[Path] = []
    seen: set[Path] = set()

    for value in args.migrations_dir:
        path = normalize_dir(root, value)
        if not args.allow_outside_root and not path_in_root(path, root):
            issues.append(
                make_issue(
                    "error",
                    "migrations-dir-outside-root",
                    path,
                    root,
                    "Migration directory is outside --root; refusing to scan it by default.",
                )
            )
            continue
        if path not in seen:
            seen.add(path)
            dirs.append(path)

    configs, config_issues = iter_config_files(root, args.config, args.allow_outside_root)
    issues.extend(config_issues)
    if not args.migrations_dir and configs:
        if not args.config and len(configs) > 1:
            issue_paths = ", ".join(relative(config, root) for config in configs)
            issues.append(
                make_issue(
                    "error",
                    "multiple-drizzle-configs",
                    root,
                    root,
                    f"Multiple Drizzle config files found ({issue_paths}); pass --config or --migrations-dir explicitly.",
                )
            )
            return [], issues
        config_dirs, out_issues = parse_config_out_dirs(root, configs, args.allow_outside_root)
        issues.extend(out_issues)
        for path in config_dirs:
            if path.exists() and path not in seen:
                seen.add(path)
                dirs.append(path)

    if dirs or issues:
        return dirs, issues

    # Only use common fallbacks when there are no Drizzle configs to disambiguate the output.
    for value in COMMON_DIRS:
        path = normalize_dir(root, value)
        if path.exists() and path not in seen:
            seen.add(path)
            dirs.append(path)

    return dirs, issues


def iter_text_files(directory: Path) -> Iterable[Path]:
    for current_root, dirnames, filenames in os.walk(directory):
        dirnames[:] = [name for name in dirnames if name not in SKIP_DIR_NAMES]
        base = Path(current_root)
        for filename in filenames:
            path = base / filename
            if path.suffix in TEXT_SUFFIXES:
                yield path


def has_conflict_markers(path: Path) -> bool:
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.startswith(CONFLICT_MARKERS):
                return True
    except OSError:
        return False
    return False


def scan_conflict_markers(directory: Path, root: Path, issues: list[Issue]) -> None:
    for path in iter_text_files(directory):
        if has_conflict_markers(path):
            add_issue(
                issues,
                "error",
                "conflict-marker",
                path,
                root,
                "File contains Git conflict markers.",
            )


def structure_signals(directory: Path) -> tuple[bool, bool, list[Path]]:
    journal = (directory / "meta" / "_journal.json").exists()
    root_sql = any(path.is_file() for path in directory.glob("*.sql"))
    meta_snapshots = any(path.is_file() for path in (directory / "meta").glob("*_snapshot.json"))
    child_dirs = [path for path in directory.iterdir() if path.is_dir() and path.name != "meta"]
    child_migration_files = any(
        (child / "migration.sql").exists() or (child / "snapshot.json").exists() for child in child_dirs
    )
    legacy_signal = journal or root_sql or meta_snapshots
    folder_signal = child_migration_files or (bool(child_dirs) and not legacy_signal)
    return legacy_signal, folder_signal, child_dirs


def detect_structure(directory: Path) -> str:
    if not directory.exists():
        return "missing"
    legacy_signal, folder_signal, _ = structure_signals(directory)
    if legacy_signal and folder_signal:
        return "mixed"
    if legacy_signal:
        return "legacy"
    if folder_signal:
        return "folder-based"
    return "unknown"


def migration_number(stem: str) -> str | None:
    match = re.match(r"^(\d+)(?:[_-].*)?$", stem)
    return match.group(1) if match else None


def snapshot_names_for_entry(entry: dict[str, Any]) -> set[str]:
    names: set[str] = set()
    idx = entry.get("idx")
    tag = entry.get("tag")
    if isinstance(idx, int):
        names.add(f"{idx:04d}_snapshot.json")
    elif isinstance(idx, str) and idx.isdigit():
        names.add(f"{int(idx):04d}_snapshot.json")
    if isinstance(tag, str):
        prefix = tag.split("_", 1)[0].split("-", 1)[0]
        if prefix.isdigit():
            names.add(f"{int(prefix):04d}_snapshot.json")
            names.add(f"{prefix}_snapshot.json")
    return names


def check_duplicate_values(
    entries: list[dict[str, Any]], key: str, journal: Path, root: Path, issues: list[Issue]
) -> None:
    values: dict[Any, int] = {}
    for entry in entries:
        value = entry.get(key)
        if value is None:
            continue
        values[value] = values.get(value, 0) + 1
    for value, count in values.items():
        if count > 1:
            add_issue(
                issues,
                "error",
                f"duplicate-{key}",
                journal,
                root,
                f"_journal.json contains duplicate {key} value {value!r} ({count} entries).",
            )


def check_idx_gap(entries: list[dict[str, Any]], journal: Path, root: Path, issues: list[Issue]) -> None:
    """Warn when journal `idx` values are not contiguous starting from 0."""
    idx_values: list[int] = []
    for entry in entries:
        idx = entry.get("idx")
        if isinstance(idx, bool):
            continue
        if isinstance(idx, int):
            idx_values.append(idx)
        elif isinstance(idx, str) and idx.isdigit():
            idx_values.append(int(idx))
    if not idx_values:
        return
    sorted_idx = sorted(set(idx_values))
    expected = list(range(sorted_idx[0], sorted_idx[0] + len(sorted_idx)))
    if sorted_idx != expected or sorted_idx[0] != 0:
        missing = sorted(set(expected) - set(sorted_idx))
        gap_text = f"missing indices {missing}" if missing else f"starts at {sorted_idx[0]} instead of 0"
        add_issue(
            issues,
            "warning",
            "idx-gap",
            journal,
            root,
            f"_journal.json idx sequence is not contiguous from 0 ({gap_text}). This can indicate a "
            "conflict or a manually deleted migration.",
        )


def check_snapshot_chain(
    snapshots: list[tuple[Path, Any]], directory: Path, root: Path, issues: list[Issue]
) -> None:
    """Validate that snapshot `prevId` links form a chain over known snapshot `id` values."""
    id_to_paths: dict[str, list[Path]] = {}
    parsed: list[tuple[Path, str | None, str | None]] = []
    for path, data in snapshots:
        if not isinstance(data, dict):
            continue
        snap_id = data.get("id")
        prev_id = data.get("prevId")
        if isinstance(snap_id, str) and snap_id:
            id_to_paths.setdefault(snap_id, []).append(path)
            parsed.append((path, snap_id, prev_id if isinstance(prev_id, str) else None))
        else:
            parsed.append((path, None, prev_id if isinstance(prev_id, str) else None))

    for snap_id, paths in id_to_paths.items():
        if len(paths) > 1:
            joined = ", ".join(relative(path, root) for path in paths)
            add_issue(
                issues,
                "error",
                "duplicate-snapshot-id",
                paths[0],
                root,
                f"Multiple snapshot files share id {snap_id!r}: {joined}. Drizzle uses snapshot ids to "
                "chain migrations; duplicates usually mean a generated file was copied instead of regenerated.",
            )

    known_ids = set(id_to_paths.keys())
    for path, snap_id, prev_id in parsed:
        if prev_id is None or prev_id == "":
            continue
        if prev_id not in known_ids:
            add_issue(
                issues,
                "warning",
                "broken-snapshot-chain",
                path,
                root,
                f"Snapshot prevId {prev_id!r} does not match any snapshot id in {relative(directory, root)}. "
                "The migration chain may be broken by a conflict or a partial repair.",
            )


def validate_snapshot_json(path: Path, root: Path, issues: list[Issue]) -> Any | None:
    data, error = read_json(path)
    if error:
        add_issue(issues, "error", "invalid-snapshot-json", path, root, f"Cannot parse snapshot JSON: {error}")
        return None
    return data


def check_legacy(directory: Path, root: Path) -> DirectoryReport:
    issues: list[Issue] = []
    journal = directory / "meta" / "_journal.json"
    data, error = read_json(journal)
    if error:
        add_issue(issues, "error", "invalid-journal", journal, root, f"Cannot parse _journal.json: {error}")
        scan_conflict_markers(directory, root, issues)
        return DirectoryReport(str(relative(directory, root)), "legacy", issues)

    if not isinstance(data, dict) or not isinstance(data.get("entries"), list):
        add_issue(
            issues,
            "error",
            "invalid-journal-shape",
            journal,
            root,
            "_journal.json must be an object with an entries array.",
        )
        entries: list[dict[str, Any]] = []
    else:
        entries = [entry for entry in data["entries"] if isinstance(entry, dict)]
    check_duplicate_values(entries, "idx", journal, root, issues)
    check_duplicate_values(entries, "tag", journal, root, issues)
    check_idx_gap(entries, journal, root, issues)

    expected_sql: set[str] = set()
    expected_snapshots: set[str] = set()
    for entry in entries:
        tag = entry.get("tag")
        if isinstance(tag, str) and tag:
            expected_sql.add(f"{tag}.sql")
            sql_path = directory / f"{tag}.sql"
            if not sql_path.exists():
                add_issue(
                    issues,
                    "error",
                    "missing-sql",
                    sql_path,
                    root,
                    f"Journal entry tag {tag!r} does not have a matching SQL file.",
                )
        snapshots = snapshot_names_for_entry(entry)
        expected_snapshots.update(snapshots)
        if snapshots and not any((directory / "meta" / name).exists() for name in snapshots):
            add_issue(
                issues,
                "error",
                "missing-snapshot",
                directory / "meta" / sorted(snapshots)[0],
                root,
                f"Journal entry {entry!r} does not have a matching snapshot file.",
            )

    sql_files = sorted(path for path in directory.glob("*.sql") if path.is_file())
    by_number: dict[str, list[Path]] = {}
    for path in sql_files:
        number = migration_number(path.stem)
        if number:
            by_number.setdefault(number, []).append(path)
        if path.name not in expected_sql:
            add_issue(
                issues,
                "warning",
                "orphan-sql",
                path,
                root,
                "SQL migration is not referenced by _journal.json.",
            )

    for number, paths in by_number.items():
        if len(paths) > 1:
            joined = ", ".join(relative(path, root) for path in paths)
            add_issue(
                issues,
                "error",
                "duplicate-migration-number",
                paths[0],
                root,
                f"Multiple SQL migrations share number {number}: {joined}.",
            )

    snapshot_files = sorted((directory / "meta").glob("*_snapshot.json"))
    parsed_snapshots: list[tuple[Path, Any | None]] = []
    for path in snapshot_files:
        data = validate_snapshot_json(path, root, issues)
        parsed_snapshots.append((path, data))
        if path.name not in expected_snapshots:
            add_issue(
                issues,
                "warning",
                "orphan-snapshot",
                path,
                root,
                "Snapshot file is not referenced by _journal.json.",
            )

    check_snapshot_chain(parsed_snapshots, directory, root, issues)

    scan_conflict_markers(directory, root, issues)
    return DirectoryReport(str(relative(directory, root)), "legacy", issues)


def check_folder_based(directory: Path, root: Path) -> DirectoryReport:
    issues: list[Issue] = []
    names: dict[str, list[Path]] = {}
    child_dirs = [path for path in directory.iterdir() if path.is_dir() and path.name != "meta"]
    for child in sorted(child_dirs):
        names.setdefault(child.name.lower(), []).append(child)
        migration_sql = child / "migration.sql"
        snapshot_json = child / "snapshot.json"
        if not migration_sql.exists():
            add_issue(
                issues,
                "error",
                "missing-migration-sql",
                migration_sql,
                root,
                "Folder-based migration is missing migration.sql.",
            )
        if not snapshot_json.exists():
            add_issue(
                issues,
                "error",
                "missing-snapshot-json",
                snapshot_json,
                root,
                "Folder-based migration is missing snapshot.json.",
            )
        else:
            validate_snapshot_json(snapshot_json, root, issues)

    for lower_name, paths in names.items():
        if len(paths) > 1:
            joined = ", ".join(relative(path, root) for path in paths)
            add_issue(
                issues,
                "error",
                "duplicate-migration-directory",
                paths[0],
                root,
                f"Migration directory name differs only by case for {lower_name!r}: {joined}.",
            )

    scan_conflict_markers(directory, root, issues)
    return DirectoryReport(str(relative(directory, root)), "folder-based", issues)


def check_mixed(directory: Path, root: Path) -> DirectoryReport:
    issues: list[Issue] = []
    add_issue(
        issues,
        "error",
        "mixed-structure",
        directory,
        root,
        "Legacy journal/root SQL signals and folder-based migration signals coexist; choose the intended migration structure before repair.",
    )
    scan_conflict_markers(directory, root, issues)
    return DirectoryReport(str(relative(directory, root)), "mixed", issues)


def check_directory(directory: Path, root: Path) -> DirectoryReport:
    if not directory.exists():
        return DirectoryReport(
            str(relative(directory, root)),
            "missing",
            [
                Issue(
                    severity="error",
                    code="missing-migrations-dir",
                    path=relative(directory, root),
                    message="Migration directory does not exist.",
                )
            ],
        )

    structure = detect_structure(directory)
    if structure == "mixed":
        return check_mixed(directory, root)
    if structure == "legacy":
        return check_legacy(directory, root)
    if structure == "folder-based":
        return check_folder_based(directory, root)

    issues: list[Issue] = []
    add_issue(
        issues,
        "warning",
        "unknown-structure",
        directory,
        root,
        "Could not identify a legacy or folder-based Drizzle migration structure; skipping recursive scan.",
    )
    return DirectoryReport(str(relative(directory, root)), "unknown", issues)


def report_as_json(root: Path, reports: list[DirectoryReport]) -> str:
    return json.dumps(
        {
            "root": str(root),
            "checked_dirs": [asdict(report) for report in reports],
            "issue_count": sum(len(report.issues) for report in reports),
            "note": "This helper is structural only and does not replace drizzle-kit check.",
        },
        indent=2,
        sort_keys=True,
    )


def report_as_text(root: Path, reports: list[DirectoryReport]) -> str:
    lines = [f"Drizzle migration check root: {root}"]
    lines.append("Note: this helper is structural only and does not replace drizzle-kit check.")
    if not reports:
        lines.append("No migration directories found. Pass --config or --migrations-dir if detection missed one.")
        return "\n".join(lines)

    for report in reports:
        lines.append(f"\nDirectory: {report.path}")
        lines.append(f"Structure: {report.structure}")
        if not report.issues:
            lines.append("Issues: none")
            continue
        lines.append("Issues:")
        for issue in report.issues:
            lines.append(f"- [{issue.severity}] {issue.code}: {issue.path} - {issue.message}")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    root = Path(args.root).resolve()
    dirs, discovery_issues = discover_dirs(args, root)
    reports: list[DirectoryReport] = []
    if discovery_issues:
        reports.append(DirectoryReport(".", "discovery", discovery_issues))
    reports.extend(check_directory(path, root) for path in dirs)

    if args.json:
        print(report_as_json(root, reports))
    else:
        print(report_as_text(root, reports))

    if not reports:
        return 2
    if any(issue.severity == "error" for report in reports for issue in report.issues):
        return 1
    if any(issue.severity == "warning" for report in reports for issue in report.issues):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
