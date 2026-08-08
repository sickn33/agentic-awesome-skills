"""Shared helpers for user-thoughts scripts."""
import re
from pathlib import Path


class UsthtSafetyError(RuntimeError):
    """Raised when a runtime path would escape .ustht/."""


def find_ustht() -> Path | None:
    """Find .ustht/ in the current directory or one of its parents."""
    cwd = Path.cwd()
    for d in [cwd, *cwd.parents]:
        ustht = d / ".ustht"
        if ustht.exists():
            if ustht.is_symlink():
                raise UsthtSafetyError(f"Refusing symlinked runtime directory: {ustht}")
            if ustht.is_dir():
                return ustht.resolve()
    return None


def find_skill_dir() -> Path | None:
    """Find the installed user-thoughts skill directory."""
    script_dir = Path(__file__).resolve().parent
    skill_dir = script_dir.parent
    if (skill_dir / "SKILL.md").exists():
        return skill_dir
    return None


def read_define_ini(ustht: Path) -> dict:
    """Read define.ini and return key/value pairs."""
    ini = ustht / "define.ini"
    if not ini.exists():
        return {}
    result = {}
    for line in safe_read_text(ustht, ini).splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            result[k.strip()] = v.strip()
    return result


def write_define_ini(ustht: Path, cfg: dict):
    """Replace define.ini with the provided key/value pairs."""
    ini = ustht / "define.ini"
    lines = [f"{k}={v}" for k, v in cfg.items()]
    safe_write_text(ustht, ini, "\n".join(lines) + "\n")


def is_processed(filepath: Path, ustht: Path | None = None) -> bool:
    """Return true when the first raw-file line is the processed marker."""
    content = safe_read_text(ustht, filepath) if ustht else filepath.read_text(encoding="utf-8")
    first_line = content.split("\n", 1)[0].strip()
    return first_line == "<!-- processed -->"


def ensure_runtime_path(ustht: Path, path: Path, *, must_exist: bool = False) -> Path:
    """Return a path only if its real location stays inside .ustht/."""
    base = Path(ustht)
    if base.is_symlink():
        raise UsthtSafetyError(f"Refusing symlinked runtime directory: {base}")
    base_real = base.resolve(strict=True)
    target = Path(path)
    if not target.is_absolute():
        target = base_real / target

    if target.exists() and target.is_symlink():
        raise UsthtSafetyError(f"Refusing symlinked runtime path: {target}")
    if must_exist and not target.exists():
        raise UsthtSafetyError(f"Runtime path does not exist: {target}")

    target_real = target.resolve(strict=must_exist)
    try:
        target_real.relative_to(base_real)
    except ValueError as exc:
        raise UsthtSafetyError(f"Runtime path escapes .ustht/: {target}") from exc

    rel = target.relative_to(base_real)
    current = base_real
    for part in rel.parts:
        current = current / part
        if current.exists() and current.is_symlink():
            raise UsthtSafetyError(f"Refusing symlinked runtime path: {current}")
    return target


def ensure_runtime_dir(ustht: Path, path: Path, *, create: bool = False) -> Path:
    """Return a safe runtime directory, creating it when requested."""
    directory = ensure_runtime_path(ustht, path, must_exist=False)
    if create:
        directory.mkdir(parents=True, exist_ok=True)
    if directory.exists() and not directory.is_dir():
        raise UsthtSafetyError(f"Runtime path is not a directory: {directory}")
    return directory


def safe_read_text(ustht: Path | None, path: Path) -> str:
    """Read a runtime file after symlink and containment checks."""
    safe_path = ensure_runtime_path(ustht, path, must_exist=True) if ustht else path
    return safe_path.read_text(encoding="utf-8")


def safe_write_text(ustht: Path, path: Path, content: str):
    """Write a runtime file after symlink and containment checks."""
    safe_path = ensure_runtime_path(ustht, path, must_exist=False)
    ensure_runtime_dir(ustht, safe_path.parent, create=True)
    safe_path.write_text(content, encoding="utf-8")


def safe_markdown_files(ustht: Path, directory: Path, *, reverse: bool = False) -> list[Path]:
    """List safe markdown files under one runtime directory."""
    safe_dir = ensure_runtime_dir(ustht, directory)
    if not safe_dir.exists():
        return []
    files = []
    for file_path in safe_dir.glob("*.md"):
        safe_path = ensure_runtime_path(ustht, file_path, must_exist=True)
        if safe_path.is_file():
            files.append(safe_path)
    return sorted(files, reverse=reverse)


def safe_markdown_tree(ustht: Path, directory: Path) -> list[Path]:
    """List safe markdown files recursively under one runtime directory."""
    safe_dir = ensure_runtime_dir(ustht, directory)
    if not safe_dir.exists():
        return []
    files = []
    for file_path in safe_dir.rglob("*.md"):
        safe_path = ensure_runtime_path(ustht, file_path, must_exist=True)
        if safe_path.is_file():
            files.append(safe_path)
    return sorted(files)


def validate_dim_name(dim: str) -> bool:
    """Validate a dimension path made of safe kebab-case segments."""
    reserved = {"raw", "ignored", "export", "define", "readme-ai"}
    if not dim or len(dim) > 64 or ".." in dim or "\\" in dim or " " in dim:
        return False
    for part in dim.split("/"):
        if part in reserved:
            return False
        if not part or not re.match(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", part):
            return False
    return True
