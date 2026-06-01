"""user-thoughts status — 显示当前 SKILL 运行状态。

用法:
    python status.py [--help]

输出: SKILL_STATUS、INSTANT_STATUS、LAST_SORTIN、未处理 raw 数、mdbase 维度数。
"""
import sys
from pathlib import Path

from common import find_ustht, read_define_ini

HELP = """用法: python status.py [--help]

显示当前 user-thoughts 运行状态。

输出格式:
  SKILL_STATUS=... | INSTANT_STATUS=... | LAST_SORTIN=... | raw: N | dims: N

字段说明:
  SKILL_STATUS    技能启用状态 (on/off)
  INSTANT_STATUS  即时计划启用状态 (on/off)
  LAST_SORTIN     上次软维护时间
  raw             未处理的 raw 文件数
  dims            mdbase 维度文件数"""


def count_raw_files(ustht: Path) -> tuple[int, int]:
    """统计 raw 文件总数和未处理数。"""
    raw_dir = ustht / "raw"
    if not raw_dir.exists():
        return 0, 0
    total = 0
    unprocessed = 0
    for f in sorted(raw_dir.glob("*.md")):
        total += 1
        first_line = f.read_text(encoding="utf-8").split("\n", 1)[0].strip()
        if first_line != "<!-- processed -->":
            unprocessed += 1
    return total, unprocessed


def count_mdbase_dims(ustht: Path) -> int:
    """统计 mdbase/details/ 下的维度文件数。"""
    details = ustht / "mdbase" / "details"
    if not details.exists():
        return 0
    count = 0
    for f in details.rglob("*.md"):
        if f.name != "README.ai.md":
            count += 1
    return count


def main():
    if "--help" in sys.argv or "-h" in sys.argv:
        print(HELP)
        sys.exit(0)

    ustht = find_ustht()
    if ustht is None:
        print("错误：未找到 .ustht/ 目录。请先执行 /ustht init 初始化。")
        sys.exit(1)

    cfg = read_define_ini(ustht)
    skill_status = cfg.get("SKILL_STATUS", "未知")
    instant_status = cfg.get("INSTANT_STATUS", "未知")
    last_sortin = cfg.get("LAST_SORTIN", "从未")

    raw_total, raw_unprocessed = count_raw_files(ustht)
    dim_count = count_mdbase_dims(ustht)

    print(f"SKILL_STATUS={skill_status} | INSTANT_STATUS={instant_status} | "
          f"LAST_SORTIN={last_sortin} | raw: {raw_unprocessed} | dims: {dim_count}")


if __name__ == "__main__":
    main()
