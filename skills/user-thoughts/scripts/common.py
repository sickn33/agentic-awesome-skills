"""user-thoughts 共享工具函数。

所有脚本共用的目录查找、配置读写、维度验证等函数。
"""
import re
from pathlib import Path


def find_ustht() -> Path | None:
    """在当前目录或父目录中查找 .ustht/ 目录。"""
    cwd = Path.cwd()
    for d in [cwd, *cwd.parents]:
        ustht = d / ".ustht"
        if ustht.is_dir():
            return ustht
    return None


def find_skill_dir() -> Path | None:
    """查找 user-thoughts 技能目录（SKILL.md 所在目录）。"""
    script_dir = Path(__file__).resolve().parent
    skill_dir = script_dir.parent
    if (skill_dir / "SKILL.md").exists():
        return skill_dir
    return None


def read_define_ini(ustht: Path) -> dict:
    """读取 define.ini 并返回键值对。"""
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
    """整文件覆写 define.ini。"""
    ini = ustht / "define.ini"
    lines = [f"{k}={v}" for k, v in cfg.items()]
    ini.write_text("\n".join(lines) + "\n", encoding="utf-8")


def is_processed(filepath: Path) -> bool:
    """检查 raw 文件第一行是否为 processed 标记。"""
    first_line = filepath.read_text(encoding="utf-8").split("\n", 1)[0].strip()
    return first_line == "<!-- processed -->"


def validate_dim_name(dim: str) -> bool:
    """验证维度名：每段须匹配 [a-z0-9][a-z0-9-]*[a-z0-9] 或单字符 [a-z0-9]。

    拒绝 ..、\\ 等路径遍历字符。
    """
    for part in dim.split("/"):
        if not part or not re.match(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$", part):
            return False
        if ".." in part or "\\" in part:
            return False
    return True
