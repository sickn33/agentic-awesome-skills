"""Shared helpers for user-thoughts scripts."""
import re
from pathlib import Path


def find_ustht() -> Path | None:
    """Find .ustht/ in the current directory or one of its parents."""
    cwd = Path.cwd()
    for d in [cwd, *cwd.parents]:
        ustht = d / ".ustht"
        if ustht.is_dir():
            return ustht
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
    for line in ini.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            result[k.strip()] = v.strip()
    return result


def write_define_ini(ustht: Path, cfg: dict):
    """Replace define.ini with the provided key/value pairs."""
    ini = ustht / "define.ini"
    lines = [f"{k}={v}" for k, v in cfg.items()]
    ini.write_text("\n".join(lines) + "\n", encoding="utf-8")


def is_processed(filepath: Path) -> bool:
    """Return true when the first raw-file line is the processed marker."""
    first_line = filepath.read_text(encoding="utf-8").split("\n", 1)[0].strip()
    return first_line == "<!-- processed -->"


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
